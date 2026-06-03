import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
import { Plus, Pencil, Trash2, Loader2, Tags, Check, X } from "lucide-react";
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

interface Skill {
  id: string;
  name: string;
  percentage: number;
  category: string;
  display_order: number;
  is_active: boolean;
}

const defaultCategories = ["Development", "Design", "Tools", "Other"];

const SkillsManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [customCategory, setCustomCategory] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    percentage: 80,
    category: "Development",
    is_active: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: skills, isLoading } = useQuery({
    queryKey: ["admin-skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Skill[];
    },
  });

  // Build dynamic category list from defaults + any custom ones in DB
  const categories = Array.from(new Set([
    ...defaultCategories,
    ...(skills?.map(s => s.category).filter(Boolean) || []),
  ]));

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Skill, "id">) => {
      const { error } = await supabase.from("skills").insert([data]);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-skills"] });
      queryClient.invalidateQueries({ queryKey: ["skills-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Skill created successfully!");
      logActivity({
        actionType: "skill_created",
        entityType: "skill",
        entityName: variables.name,
      });
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Skill) => {
      const { error } = await supabase.from("skills").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-skills"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Skill updated successfully!");
      logActivity({
        actionType: "skill_updated",
        entityType: "skill",
        entityId: variables.id,
        entityName: variables.name,
      });
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("skills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, skillId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-skills"] });
      queryClient.invalidateQueries({ queryKey: ["skills-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Skill deleted successfully!");
      logActivity({
        actionType: "skill_deleted",
        entityType: "skill",
        entityId: skillId,
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("skills")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-skills"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Order updated!");
      logActivity({
        actionType: "skill_reordered",
        entityType: "skill",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const [showCategories, setShowCategories] = useState(false);
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const categorySkillCounts = categories.reduce((acc, cat) => {
    acc[cat] = skills?.filter(s => s.category === cat).length || 0;
    return acc;
  }, {} as Record<string, number>);

  const renameCategoryMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const skillsToUpdate = skills?.filter(s => s.category === oldName) || [];
      for (const skill of skillsToUpdate) {
        const { error } = await supabase
          .from("skills")
          .update({ category: newName })
          .eq("id", skill.id);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-skills"] });
      toast.success(`Category renamed to "${vars.newName}"`);
      logActivity({ actionType: "category_renamed", entityType: "skill", entityName: `${vars.oldName} → ${vars.newName}` });
      setRenamingCat(null);
      setRenameValue("");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async ({ category, reassignTo }: { category: string; reassignTo: string }) => {
      const skillsToUpdate = skills?.filter(s => s.category === category) || [];
      for (const skill of skillsToUpdate) {
        const { error } = await supabase
          .from("skills")
          .update({ category: reassignTo })
          .eq("id", skill.id);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-skills"] });
      toast.success(`Category "${vars.category}" deleted, skills moved to "${vars.reassignTo}"`);
      logActivity({ actionType: "category_deleted", entityType: "skill", entityName: vars.category });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !skills) return;

    const oldIndex = skills.findIndex((s) => s.id === active.id);
    const newIndex = skills.findIndex((s) => s.id === over.id);
    const newSkills = arrayMove(skills, oldIndex, newIndex);

    const updates = newSkills.map((skill, index) => ({
      id: skill.id,
      display_order: index,
    }));

    queryClient.setQueryData(["admin-skills"], newSkills);
    reorderMutation.mutate(updates);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      percentage: 80,
      category: "Development",
      is_active: true,
    });
    setEditingSkill(null);
    setIsCustom(false);
    setCustomCategory("");
    setIsDialogOpen(false);
  };

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill);
    const knownCat = categories.includes(skill.category);
    setIsCustom(!knownCat);
    setCustomCategory(!knownCat ? skill.category : "");
    setFormData({
      name: skill.name,
      percentage: skill.percentage,
      category: skill.category,
      is_active: skill.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustom ? customCategory.trim() || "Other" : formData.category;
    const skillData = {
      name: formData.name,
      percentage: formData.percentage,
      category: finalCategory,
      display_order: editingSkill?.display_order || (skills?.length || 0),
      is_active: formData.is_active,
    };

    if (editingSkill) {
      updateMutation.mutate({ id: editingSkill.id, ...skillData });
    } else {
      createMutation.mutate(skillData);
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
          <h1 className="font-heading text-3xl font-bold text-foreground">Skills</h1>
          <p className="text-muted-foreground mt-1">Manage your skills and expertise (drag to reorder)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Skill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSkill ? "Edit Skill" : "Add New Skill"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Skill Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., React.js"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={isCustom ? "__custom__" : formData.category}
                  onValueChange={(value) => {
                    if (value === "__custom__") {
                      setIsCustom(true);
                      setCustomCategory("");
                    } else {
                      setIsCustom(false);
                      setCustomCategory("");
                      setFormData({ ...formData, category: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {isCustom && (
                  <Input
                    placeholder="Enter custom category name"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-2"
                    autoFocus
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Proficiency: {formData.percentage}%</Label>
                <Slider
                  value={[formData.percentage]}
                  onValueChange={(value) => setFormData({ ...formData, percentage: value[0] })}
                  max={100}
                  min={0}
                  step={5}
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
                  {editingSkill ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Management */}
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCategories(!showCategories)}
          className="mb-3"
        >
          <Tags className="w-4 h-4 mr-2" />
          Manage Categories ({categories.length})
        </Button>

        {showCategories && (
          <Card className="glass-card">
            <CardContent className="pt-4 space-y-2">
              {categories.map((cat) => (
                <div key={cat} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-secondary/50">
                  {renamingCat === cat ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && renameValue.trim() && renameValue !== cat) {
                            renameCategoryMutation.mutate({ oldName: cat, newName: renameValue.trim() });
                          }
                          if (e.key === "Escape") { setRenamingCat(null); setRenameValue(""); }
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={!renameValue.trim() || renameValue === cat || renameCategoryMutation.isPending}
                        onClick={() => renameCategoryMutation.mutate({ oldName: cat, newName: renameValue.trim() })}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setRenamingCat(null); setRenameValue(""); }}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">{cat}</span>
                        <span className="text-xs text-muted-foreground">({categorySkillCounts[cat]} skills)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => { setRenamingCat(cat); setRenameValue(cat); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {categories.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              const reassignTo = categories.find(c => c !== cat) || "Other";
                              if (categorySkillCounts[cat] > 0) {
                                if (confirm(`Move ${categorySkillCounts[cat]} skill(s) from "${cat}" to "${reassignTo}" and delete this category?`)) {
                                  deleteCategoryMutation.mutate({ category: cat, reassignTo });
                                }
                              } else {
                                toast.success(`Category "${cat}" removed (no skills to reassign)`);
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {skills?.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No skills yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Skill
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
            items={skills?.map((s) => s.id) || []}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills?.map((skill) => (
                <SortableItem key={skill.id} id={skill.id}>
                  <Card className={`glass-card ${!skill.is_active ? "opacity-60" : ""}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-base font-medium">
                        {skill.name}
                        {!skill.is_active && (
                          <span className="text-xs bg-secondary px-2 py-1 rounded ml-2">Inactive</span>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(skill)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(skill.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-2">{skill.category}</p>
                      <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                          style={{ width: `${skill.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-right">{skill.percentage}%</p>
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

export default SkillsManager;
