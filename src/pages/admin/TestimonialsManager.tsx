import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { logActivity } from "@/hooks/useActivityLog";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "@/components/admin/SortableItem";

interface Testimonial {
  id: string;
  client_name: string;
  client_role: string;
  company: string;
  content: string;
  rating: number;
  display_order: number;
  is_active: boolean;
}

const TestimonialsManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState({
    client_name: "",
    client_role: "",
    company: "",
    content: "",
    rating: 5,
    is_active: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Testimonial, "id">) => {
      const { error } = await supabase.from("testimonials").insert([data]);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Testimonial created successfully!");
      logActivity({
        actionType: "testimonial_created",
        entityType: "testimonial",
        entityName: variables.client_name,
      });
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Testimonial) => {
      const { error } = await supabase.from("testimonials").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Testimonial updated successfully!");
      logActivity({
        actionType: "testimonial_updated",
        entityType: "testimonial",
        entityId: variables.id,
        entityName: variables.client_name,
      });
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, testimonialId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Testimonial deleted successfully!");
      logActivity({
        actionType: "testimonial_deleted",
        entityType: "testimonial",
        entityId: testimonialId,
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("testimonials")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Order updated!");
      logActivity({
        actionType: "testimonial_reordered",
        entityType: "testimonial",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !testimonials) return;

    const oldIndex = testimonials.findIndex((t) => t.id === active.id);
    const newIndex = testimonials.findIndex((t) => t.id === over.id);
    const newTestimonials = arrayMove(testimonials, oldIndex, newIndex);

    const updates = newTestimonials.map((testimonial, index) => ({
      id: testimonial.id,
      display_order: index,
    }));

    queryClient.setQueryData(["admin-testimonials"], newTestimonials);
    reorderMutation.mutate(updates);
  };

  const resetForm = () => {
    setFormData({
      client_name: "",
      client_role: "",
      company: "",
      content: "",
      rating: 5,
      is_active: true,
    });
    setEditingTestimonial(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setFormData({
      client_name: testimonial.client_name,
      client_role: testimonial.client_role,
      company: testimonial.company,
      content: testimonial.content,
      rating: testimonial.rating,
      is_active: testimonial.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const testimonialData = {
      client_name: formData.client_name,
      client_role: formData.client_role,
      company: formData.company,
      content: formData.content,
      rating: formData.rating,
      display_order: editingTestimonial?.display_order || (testimonials?.length || 0),
      is_active: formData.is_active,
    };

    if (editingTestimonial) {
      updateMutation.mutate({ id: editingTestimonial.id, ...testimonialData });
    } else {
      createMutation.mutate(testimonialData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Testimonials</h1>
          <p className="text-muted-foreground mt-1">Manage client reviews and feedback (drag to reorder)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Testimonial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTestimonial ? "Edit Testimonial" : "Add New Testimonial"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_role">Role/Position</Label>
                  <Input
                    id="client_role"
                    value={formData.client_role}
                    onChange={(e) => setFormData({ ...formData, client_role: e.target.value })}
                    placeholder="e.g., CEO"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Testimonial Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Rating</Label>
                <Select
                  value={formData.rating.toString()}
                  onValueChange={(value) => setFormData({ ...formData, rating: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating} Star{rating !== 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active (visible on website)</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingTestimonial ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {testimonials?.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No testimonials yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Testimonial
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
            items={testimonials?.map((t) => t.id) || []}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-4">
              {testimonials?.map((testimonial) => (
                <SortableItem key={testimonial.id} id={testimonial.id}>
                  <Card className={`glass-card ${!testimonial.is_active ? "opacity-60" : ""}`}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {testimonial.client_name}
                          {!testimonial.is_active && (
                            <span className="text-xs bg-secondary px-2 py-1 rounded">Inactive</span>
                          )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.client_role}, {testimonial.company}
                        </p>
                        <div className="flex gap-0.5 mt-2">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(testimonial)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(testimonial.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                    </CardContent>
                  </Card>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default TestimonialsManager;
