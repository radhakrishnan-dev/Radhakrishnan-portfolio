import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { logActivity } from "@/hooks/useActivityLog";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  User,
  Building2,
  ShoppingCart,
  RefreshCw,
  LayoutDashboard,
  Wrench,
  Image,
  Video,
  Youtube,
  Globe,
  Code,
  Palette,
  Smartphone,
  Mail,
  MessageSquare,
  Settings,
  Zap,
  Star,
  Heart,
  Briefcase,
  LucideIcon
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "@/components/admin/SortableItem";

interface Service {
  id: string;
  title: string;
  description: string;
  highlight: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  User,
  Building2,
  ShoppingCart,
  RefreshCw,
  LayoutDashboard,
  Wrench,
  Image,
  Video,
  Youtube,
  Globe,
  Code,
  Palette,
  Smartphone,
  Mail,
  MessageSquare,
  Settings,
  Zap,
  Star,
  Heart,
  Briefcase,
};

const iconOptions = Object.keys(iconMap);

const ServicesManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    highlight: "",
    icon: "Wrench",
    display_order: 0,
    is_active: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: services, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as Service[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newService: Omit<Service, "id">) => {
      const { error } = await supabase.from("services").insert(newService);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({ queryKey: ["services-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Service created successfully");
      logActivity({
        actionType: "service_created",
        entityType: "service",
        entityName: variables.title,
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Service> & { id: string }) => {
      const { error } = await supabase.from("services").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Service updated successfully");
      logActivity({
        actionType: "service_updated",
        entityType: "service",
        entityId: variables.id,
        entityName: variables.title,
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, serviceId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({ queryKey: ["services-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Service deleted successfully");
      logActivity({
        actionType: "service_deleted",
        entityType: "service",
        entityId: serviceId,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("services")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Order updated!");
      logActivity({
        actionType: "service_reordered",
        entityType: "service",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !services) return;

    const oldIndex = services.findIndex((s) => s.id === active.id);
    const newIndex = services.findIndex((s) => s.id === over.id);
    const newServices = arrayMove(services, oldIndex, newIndex);

    const updates = newServices.map((service, index) => ({
      id: service.id,
      display_order: index,
    }));

    queryClient.setQueryData(["admin-services"], newServices);
    reorderMutation.mutate(updates);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      highlight: "",
      icon: "Wrench",
      display_order: 0,
      is_active: true,
    });
    setEditingService(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description,
      highlight: service.highlight,
      icon: service.icon,
      display_order: service.display_order,
      is_active: service.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getIconComponent = (iconName: string): LucideIcon => {
    return iconMap[iconName] || Wrench;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground mt-1">Manage your service offerings (drag to reorder)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Service" : "Add New Service"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="highlight">Highlight Badge</Label>
                <Input
                  id="highlight"
                  value={formData.highlight}
                  onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
                  placeholder="e.g., Perfect for freelancers"
                />
              </div>
              <div>
                <Label htmlFor="icon">Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData({ ...formData, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((icon) => {
                      const IconComp = getIconComponent(icon);
                      return (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            <IconComp className="w-4 h-4" />
                            {icon}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingService ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!services || services.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No services yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={services.map((s) => s.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => {
                const IconComponent = getIconComponent(service.icon);
                return (
                  <SortableItem key={service.id} id={service.id}>
                    <Card
                      className={`glass-card ${!service.is_active ? "opacity-60" : ""}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <IconComponent className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(service)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(service.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <h3 className="font-semibold text-lg text-foreground mb-2">
                          {service.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {service.description}
                        </p>
                        {service.highlight && (
                          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                            {service.highlight}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              service.is_active
                                ? "bg-green-500/10 text-green-500"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {service.is_active ? "Active" : "Inactive"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Order: {service.display_order}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default ServicesManager;
