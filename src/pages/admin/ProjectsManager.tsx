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
import { Plus, Pencil, Trash2, ExternalLink, Github, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
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

interface Project {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  tech_stack: string[];
  live_url: string | null;
  github_url: string | null;
  display_order: number;
  is_active: boolean;
}

const ProjectsManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    tech_stack: "",
    live_url: "",
    github_url: "",
    is_active: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: projects, isLoading } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Project[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Project, "id">) => {
      const { error } = await supabase.from("projects").insert([data]);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Project created successfully!");
      logActivity({
        actionType: "project_created",
        entityType: "project",
        entityName: variables.title,
      });
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Project) => {
      const { error } = await supabase.from("projects").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Project updated successfully!");
      logActivity({
        actionType: "project_updated",
        entityType: "project",
        entityId: variables.id,
        entityName: variables.title,
      });
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Project deleted successfully!");
      logActivity({
        actionType: "project_deleted",
        entityType: "project",
        entityId: projectId,
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("projects")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Order updated!");
      logActivity({
        actionType: "project_reordered",
        entityType: "project",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !projects) return;

    const oldIndex = projects.findIndex((p) => p.id === active.id);
    const newIndex = projects.findIndex((p) => p.id === over.id);
    const newProjects = arrayMove(projects, oldIndex, newIndex);

    const updates = newProjects.map((project, index) => ({
      id: project.id,
      display_order: index,
    }));

    queryClient.setQueryData(["admin-projects"], newProjects);
    reorderMutation.mutate(updates);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      image_url: "",
      tech_stack: "",
      live_url: "",
      github_url: "",
      is_active: true,
    });
    setEditingProject(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description,
      image_url: project.image_url || "",
      tech_stack: project.tech_stack.join(", "),
      live_url: project.live_url || "",
      github_url: project.github_url || "",
      is_active: project.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projectData = {
      title: formData.title,
      description: formData.description,
      image_url: formData.image_url || null,
      tech_stack: formData.tech_stack.split(",").map((t) => t.trim()).filter(Boolean),
      live_url: formData.live_url || null,
      github_url: formData.github_url || null,
      display_order: editingProject?.display_order || (projects?.length || 0),
      is_active: formData.is_active,
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, ...projectData });
    } else {
      createMutation.mutate(projectData);
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
          <h1 className="font-heading text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your portfolio projects (drag to reorder)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProject ? "Edit Project" : "Add New Project"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Project Image</Label>
                {formData.image_url ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img src={formData.image_url} alt="Preview" className="w-full h-40 object-cover" />
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
                        <p className="text-sm text-muted-foreground">Click to upload image</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP up to 5MB</p>
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
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Image must be under 5MB");
                      return;
                    }
                    setIsUploading(true);
                    try {
                      const ext = file.name.split(".").pop();
                      const fileName = `projects/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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
                      e.target.value = "";
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tech_stack">Tech Stack (comma separated)</Label>
                <Input
                  id="tech_stack"
                  value={formData.tech_stack}
                  onChange={(e) => setFormData({ ...formData, tech_stack: e.target.value })}
                  placeholder="React, TypeScript, Tailwind"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="live_url">Live URL</Label>
                <Input
                  id="live_url"
                  value={formData.live_url}
                  onChange={(e) => setFormData({ ...formData, live_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github_url">GitHub URL</Label>
                <Input
                  id="github_url"
                  value={formData.github_url}
                  onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                  placeholder="https://github.com/..."
                />
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
                  {editingProject ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {projects?.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No projects yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Project
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
            items={projects?.map((p) => p.id) || []}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-4">
              {projects?.map((project) => (
                <SortableItem key={project.id} id={project.id}>
                  <Card className={`glass-card ${!project.is_active ? "opacity-60" : ""}`}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0">
                      <div className="flex gap-4 flex-1">
                        {project.image_url && (
                          <img src={project.image_url} alt={project.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {project.title}
                            {!project.is_active && (
                              <span className="text-xs bg-secondary px-2 py-1 rounded">Inactive</span>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {project.live_url && (
                          <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        {project.github_url && (
                          <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon">
                              <Github className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(project)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(project.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {project.tech_stack.map((tech) => (
                          <span key={tech} className="text-xs bg-secondary px-2 py-1 rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
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

export default ProjectsManager;
