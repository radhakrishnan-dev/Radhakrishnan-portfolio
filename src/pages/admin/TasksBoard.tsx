import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, KanbanSquare, Calendar, Flag } from "lucide-react";
import { toast } from "sonner";

const COLUMNS = [
  { id: "todo", title: "To Do", accent: "border-muted-foreground/40" },
  { id: "in_progress", title: "In Progress", accent: "border-primary/40" },
  { id: "done", title: "Done", accent: "border-emerald-500/40" },
];
const PRIORITIES = [
  { value: "low", label: "Low", color: "text-muted-foreground" },
  { value: "medium", label: "Medium", color: "text-amber-400" },
  { value: "high", label: "High", color: "text-rose-400" },
];

const TasksBoard = () => {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: "", priority: "medium", status: "todo" });

  const { data: projects = [] } = useQuery({
    queryKey: ["admin-client-projects"],
    queryFn: async () => (await (supabase as any).from("client_projects").select("id, title")).data || [],
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["project-tasks", projectId],
    enabled: !!projectId,
    queryFn: async () => (await (supabase as any).from("project_tasks").select("*").eq("project_id", projectId).order("display_order")).data || [],
  });

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = { todo: [], in_progress: [], done: [] };
    tasks.forEach((t: any) => g[t.status]?.push(t));
    return g;
  }, [tasks]);

  const save = async () => {
    if (!projectId) return toast.error("Pick a project");
    if (!form.title?.trim()) return toast.error("Title required");
    const { error } = await (supabase as any).from("project_tasks").insert({ ...form, project_id: projectId });
    if (error) return toast.error(error.message);
    setOpen(false);
    setForm({ title: "", priority: "medium", status: "todo" });
    qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
  };

  const move = async (id: string, status: string) => {
    await (supabase as any).from("project_tasks").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
  };

  const del = async (id: string) => {
    await (supabase as any).from("project_tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight flex items-center gap-2"><KanbanSquare className="w-7 h-7 text-primary" />Task Board</h1>
          <p className="text-muted-foreground text-sm mt-1">Per-project Kanban</p>
        </div>
        <div className="flex gap-2">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select project" /></SelectTrigger>
            <SelectContent>
              {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2" disabled={!projectId}><Plus className="w-4 h-4" />New Task</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="date" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                <Button onClick={save} className="w-full">Add</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!projectId ? (
        <Card className="p-10 text-center text-muted-foreground">Pick a project to see its board.</Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <Card key={col.id} className={`p-3 border-t-2 ${col.accent} border-border/60`}>
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-semibold text-sm">{col.title}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/60 font-semibold">{grouped[col.id].length}</span>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {grouped[col.id].map((t: any) => {
                  const p = PRIORITIES.find(x => x.value === t.priority);
                  return (
                    <Card key={t.id} className="p-3 bg-secondary/40 border-border/40 hover:border-primary/30 group">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-medium leading-snug">{t.title}</p>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => del(t.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-[10px]">
                        <span className={`flex items-center gap-0.5 ${p?.color}`}><Flag className="w-3 h-3" />{p?.label}</span>
                        {t.due_date && <span className="text-muted-foreground flex items-center gap-0.5"><Calendar className="w-3 h-3" />{t.due_date}</span>}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {COLUMNS.filter(c => c.id !== t.status).map(c => (
                          <Button key={c.id} size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => move(t.id, c.id)}>→ {c.title}</Button>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TasksBoard;
