import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, FileSignature, ArrowRightCircle } from "lucide-react";
import { toast } from "sonner";

const STATUSES = [
  { value: "draft", label: "Draft", color: "bg-muted text-muted-foreground" },
  { value: "sent", label: "Sent", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { value: "accepted", label: "Accepted", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { value: "rejected", label: "Rejected", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
];
const CURRENCIES = ["USD", "INR", "EUR", "GBP"];
const empty: any = { title: "", scope: "", timeline: "", price: 0, currency: "USD", status: "draft" };

const ProposalsManager = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals"],
    queryFn: async () => (await (supabase as any).from("proposals").select("*").order("created_at", { ascending: false })).data || [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["admin-clients-lite"],
    queryFn: async () => (await (supabase as any).from("clients").select("id, name").order("name")).data || [],
  });

  const clientName = (id: string | null) => clients.find((c: any) => c.id === id)?.name || "—";

  const save = async () => {
    if (!form.title?.trim()) return toast.error("Title required");
    const payload: any = { ...form, price: Number(form.price) || 0 };
    if (payload.client_id === "none") payload.client_id = null;
    const { error } = form.id
      ? await (supabase as any).from("proposals").update(payload).eq("id", form.id)
      : await (supabase as any).from("proposals").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["proposals"] });
    setOpen(false);
    setForm(empty);
  };

  const del = async (id: string) => {
    if (!confirm("Delete proposal?")) return;
    await (supabase as any).from("proposals").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["proposals"] });
  };

  const convertToProject = async (p: any) => {
    if (!p.client_id) return toast.error("Attach a client first");
    const { error } = await (supabase as any).from("client_projects").insert({
      client_id: p.client_id,
      title: p.title,
      description: p.scope,
      budget: p.price,
      currency: p.currency,
      status: "lead",
    });
    if (error) return toast.error(error.message);
    await (supabase as any).from("proposals").update({ status: "accepted", accepted_date: new Date().toISOString().slice(0, 10) }).eq("id", p.id);
    toast.success("Converted to project");
    qc.invalidateQueries({ queryKey: ["proposals"] });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight flex items-center gap-2"><FileSignature className="w-7 h-7 text-primary" />Proposals</h1>
          <p className="text-muted-foreground text-sm mt-1">Send project proposals and convert accepted ones into projects</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />New Proposal</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Proposal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Select value={form.client_id || "none"} onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea placeholder="Scope of work" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} rows={4} />
              <Input placeholder="Timeline (e.g. 4 weeks)" value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} />
              <div className="flex gap-2">
                <Input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
              <Textarea placeholder="Notes" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {proposals.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No proposals yet. Create your first one.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {proposals.map((p: any) => {
            const s = STATUSES.find(x => x.value === p.status) || STATUSES[0];
            return (
              <Card key={p.id} className="p-4 border-border/60 hover:border-primary/40 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    <p className="text-xs text-muted-foreground">{clientName(p.client_id)}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase border ${s.color}`}>{s.label}</span>
                </div>
                {p.scope && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{p.scope}</p>}
                <div className="flex justify-between items-center text-xs mt-3">
                  <div className="text-muted-foreground">{p.timeline || "—"}</div>
                  <div className="font-bold text-primary">{p.currency} {Number(p.price).toLocaleString()}</div>
                </div>
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-border/60">
                  {p.status === "accepted" && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-7 border-primary/40 text-primary" onClick={() => convertToProject(p)}><ArrowRightCircle className="w-3 h-3" />Convert</Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => { setForm(p); setOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => del(p.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProposalsManager;
