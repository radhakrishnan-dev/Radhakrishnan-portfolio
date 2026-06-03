import { useState, useRef } from "react";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Upload, X, Images } from "lucide-react";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface Design {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

const SortableDesignCard = ({
  design,
  onEdit,
  onDelete,
}: {
  design: Design;
  onEdit: (d: Design) => void;
  onDelete: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: design.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`glass-card overflow-hidden ${!design.is_active ? "opacity-60" : ""}`}>
        <div className="relative aspect-video overflow-hidden bg-muted">
          <img src={design.image_url} alt={design.title} className="w-full h-full object-cover" />
          <button
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-md cursor-grab active:cursor-grabbing hover:bg-background transition-colors"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-foreground" />
          </button>
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-primary">
                {design.category}
              </span>
              <CardTitle className="text-base truncate">{design.title}</CardTitle>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => onEdit(design)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(design.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {design.description && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground line-clamp-2">{design.description}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

const DesignsManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editing, setEditing] = useState<Design | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkCategory, setBulkCategory] = useState("General");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "General",
    image_url: "",
    is_active: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: designs, isLoading } = useQuery({
    queryKey: ["admin-designs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("designs")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Design[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Design, "id">) => {
      const { error } = await (supabase as any).from("designs").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-designs"] });
      queryClient.invalidateQueries({ queryKey: ["featured-designs"] });
      toast.success("Design added!");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Design) => {
      const { error } = await (supabase as any).from("designs").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-designs"] });
      queryClient.invalidateQueries({ queryKey: ["featured-designs"] });
      toast.success("Design updated!");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("designs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-designs"] });
      queryClient.invalidateQueries({ queryKey: ["featured-designs"] });
      toast.success("Design deleted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      for (const u of updates) {
        const { error } = await (supabase as any)
          .from("designs")
          .update({ display_order: u.display_order })
          .eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-designs"] });
      queryClient.invalidateQueries({ queryKey: ["featured-designs"] });
      toast.success("Order updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !designs) return;
    const oldIndex = designs.findIndex((d) => d.id === active.id);
    const newIndex = designs.findIndex((d) => d.id === over.id);
    const reordered = arrayMove(designs, oldIndex, newIndex);
    const updates = reordered.map((d, i) => ({ id: d.id, display_order: i }));
    queryClient.setQueryData(["admin-designs"], reordered);
    reorderMutation.mutate(updates);
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", category: "General", image_url: "", is_active: true });
    setEditing(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (design: Design) => {
    setEditing(design);
    setFormData({
      title: design.title,
      description: design.description,
      category: design.category,
      image_url: design.image_url,
      is_active: design.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image_url) {
      toast.error("Please upload an image");
      return;
    }
    const payload = {
      ...formData,
      display_order: editing?.display_order ?? (designs?.length || 0),
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `designs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
      setFormData((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBulkUpload = async (files: FileList) => {
    const valid = Array.from(files).filter((f) => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} skipped (over 5MB)`);
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;

    setBulkProgress({ done: 0, total: valid.length });
    let baseOrder = designs?.length || 0;
    let success = 0;

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      try {
        const ext = file.name.split(".").pop();
        const fileName = `designs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);

        const title = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        const { error: insertError } = await (supabase as any).from("designs").insert([
          {
            title,
            description: "",
            category: bulkCategory || "General",
            image_url: urlData.publicUrl,
            display_order: baseOrder + i,
            is_active: true,
          },
        ]);
        if (insertError) throw insertError;
        success++;
      } catch (err: any) {
        console.error(`Failed: ${file.name}`, err);
        toast.error(`Failed: ${file.name}`);
      }
      setBulkProgress({ done: i + 1, total: valid.length });
    }

    queryClient.invalidateQueries({ queryKey: ["admin-designs"] });
    queryClient.invalidateQueries({ queryKey: ["featured-designs"] });
    toast.success(`Uploaded ${success} of ${valid.length} designs`);
    setBulkProgress({ done: 0, total: 0 });
    setIsBulkOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isBulkUploading = bulkProgress.total > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Designs</h1>
          <p className="text-muted-foreground mt-1">
            Manage your graphic design portfolio (drag to reorder)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Images className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bulk Upload Designs</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-category">Category for all</Label>
                  <Input
                    id="bulk-category"
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    placeholder="Poster, Social, Thumbnail..."
                    disabled={isBulkUploading}
                  />
                </div>
                <div
                  onClick={() => !isBulkUploading && bulkInputRef.current?.click()}
                  className={`border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors ${
                    isBulkUploading ? "opacity-60" : "cursor-pointer hover:border-primary/50"
                  }`}
                >
                  {isBulkUploading ? (
                    <>
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
                      <p className="text-sm font-medium">
                        Uploading {bulkProgress.done} of {bulkProgress.total}...
                      </p>
                      <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{
                            width: `${(bulkProgress.done / bulkProgress.total) * 100}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <Images className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Click to select multiple images</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Title is auto-set from filename. Up to 5MB each.
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={bulkInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) await handleBulkUpload(files);
                    e.target.value = "";
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Design
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Design" : "Add New Design"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Image</Label>
                  {formData.image_url ? (
                    <div className="relative rounded-lg overflow-hidden border border-border">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 w-7 h-7"
                        onClick={() => setFormData({ ...formData, image_url: "" })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload design</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, WebP up to 5MB
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await handleFileUpload(file);
                      e.target.value = "";
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Poster, Social, Thumbnail, Logo..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this design"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="is_active">Active (visible on website)</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editing ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {designs?.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No designs yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Design
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
            items={designs?.map((d) => d.id) || []}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {designs?.map((design) => (
                <SortableDesignCard
                  key={design.id}
                  design={design}
                  onEdit={handleEdit}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default DesignsManager;
