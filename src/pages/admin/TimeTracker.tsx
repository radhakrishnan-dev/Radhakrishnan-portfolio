import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Square, Clock, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const fmtDur = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const TimeTracker = () => {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string>("");
  const [desc, setDesc] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Manual entry
  const [manualMins, setManualMins] = useState<number>(0);

  useEffect(() => {
    if (!runningId) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [runningId]);

  const { data: projects = [] } = useQuery({
    queryKey: ["admin-client-projects"],
    queryFn: async () => (await (supabase as any).from("client_projects").select("id, title")).data || [],
  });

  const { data: entries = [], refetch } = useQuery({
    queryKey: ["time-entries"],
    queryFn: async () => (await (supabase as any).from("time_entries").select("*").order("started_at", { ascending: false })).data || [],
  });

  useEffect(() => {
    const open = entries.find((e: any) => !e.ended_at);
    if (open) setRunningId(open.id);
  }, [entries]);

  const startTimer = async () => {
    if (!projectId) return toast.error("Pick a project");
    const { data, error } = await (supabase as any).from("time_entries").insert({
      project_id: projectId, description: desc, started_at: new Date().toISOString(),
    }).select().maybeSingle();
    if (error) return toast.error(error.message);
    setRunningId(data.id);
    qc.invalidateQueries({ queryKey: ["time-entries"] });
  };

  const stopTimer = async () => {
    if (!runningId) return;
    const entry = entries.find((e: any) => e.id === runningId);
    if (!entry) return;
    const start = new Date(entry.started_at).getTime();
    const mins = Math.max(1, Math.round((Date.now() - start) / 60000));
    const { error } = await (supabase as any).from("time_entries").update({
      ended_at: new Date().toISOString(), duration_minutes: mins,
    }).eq("id", runningId);
    if (error) return toast.error(error.message);
    setRunningId(null);
    setDesc("");
    qc.invalidateQueries({ queryKey: ["time-entries"] });
  };

  const logManual = async () => {
    if (!projectId || !manualMins) return toast.error("Pick project + minutes");
    const now = new Date();
    const { error } = await (supabase as any).from("time_entries").insert({
      project_id: projectId, description: desc, started_at: now.toISOString(), ended_at: now.toISOString(), duration_minutes: manualMins,
    });
    if (error) return toast.error(error.message);
    toast.success("Logged");
    setManualMins(0);
    setDesc("");
    qc.invalidateQueries({ queryKey: ["time-entries"] });
  };

  const toggleBilled = async (id: string, billed: boolean) => {
    await (supabase as any).from("time_entries").update({ billed: !billed }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["time-entries"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete entry?")) return;
    await (supabase as any).from("time_entries").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["time-entries"] });
  };

  const projectTitle = (id: string) => projects.find((p: any) => p.id === id)?.title || "—";

  const totals = useMemo(() => {
    const billed = entries.filter((e: any) => e.billed).reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0);
    const unbilled = entries.filter((e: any) => !e.billed && e.ended_at).reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0);
    return { billed, unbilled };
  }, [entries]);

  const running = entries.find((e: any) => e.id === runningId);
  const liveMins = running ? Math.floor((Date.now() - new Date(running.started_at).getTime()) / 60000) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight flex items-center gap-2"><Clock className="w-7 h-7 text-primary" />Time Tracker</h1>
        <p className="text-muted-foreground text-sm mt-1">Track time across projects · billed vs unbilled</p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="p-4 bg-gradient-to-br from-primary/15 to-transparent border-border/60">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold">Currently Running</div>
          <div className="text-2xl font-bold mt-1 text-primary">{running ? fmtDur(liveMins) : "—"}</div>
          {running && <div className="text-xs text-muted-foreground mt-0.5">{projectTitle(running.project_id)}</div>}
        </Card>
        <Card className="p-4 border-border/60">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold">Billed</div>
          <div className="text-2xl font-bold mt-1 text-emerald-400">{fmtDur(totals.billed)}</div>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold">Unbilled</div>
          <div className="text-2xl font-bold mt-1 text-amber-400">{fmtDur(totals.unbilled)}</div>
        </Card>
      </div>

      <Card className="p-4 border-border/60">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select project" /></SelectTrigger>
            <SelectContent>
              {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="What are you working on?" value={desc} onChange={(e) => setDesc(e.target.value)} className="flex-1 min-w-[200px]" />
          {!runningId ? (
            <Button onClick={startTimer} className="gap-2"><Play className="w-4 h-4" />Start</Button>
          ) : (
            <Button onClick={stopTimer} variant="destructive" className="gap-2"><Square className="w-4 h-4" />Stop</Button>
          )}
          <div className="flex gap-2 items-center">
            <Input type="number" placeholder="Min" value={manualMins || ""} onChange={(e) => setManualMins(Number(e.target.value))} className="w-20" />
            <Button onClick={logManual} variant="outline" className="gap-2"><Plus className="w-4 h-4" />Log Manual</Button>
          </div>
        </div>
      </Card>

      <Card className="border-border/60">
        <div className="p-4 border-b border-border/60 font-semibold text-sm">Recent entries</div>
        {entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No entries yet</div>
        ) : (
          <div className="divide-y divide-border/60">
            {entries.slice(0, 30).map((e: any) => (
              <div key={e.id} className="p-3 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{projectTitle(e.project_id)}</div>
                  <div className="text-xs text-muted-foreground truncate">{e.description || "—"} · {new Date(e.started_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-mono text-xs">{e.ended_at ? fmtDur(e.duration_minutes) : "running…"}</span>
                  {e.ended_at && (
                    <Button size="sm" variant="ghost" onClick={() => toggleBilled(e.id, e.billed)} title="Toggle billed">
                      <CheckCircle2 className={`w-4 h-4 ${e.billed ? "text-emerald-400" : "text-muted-foreground"}`} />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => del(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TimeTracker;
