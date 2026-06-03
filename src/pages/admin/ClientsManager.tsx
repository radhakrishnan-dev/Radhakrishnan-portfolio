import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  Plus, Pencil, Trash2, Mail, Phone, Building2, Search, LayoutGrid, Rows,
  MessageCircle, FileText, FolderKanban, CalendarClock, Cake, Activity, Save,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  company: string | null;
  status: string;
  notes: string | null;
  follow_up_date: string | null;
  birthday: string | null;
  created_at: string;
};

const empty: Partial<Client> = { name: "", status: "active" };

const initialsOf = (name: string) =>
  name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const colorFor = (name: string) => {
  const hues = [174, 220, 280, 35, 340, 142, 25, 250];
  const sum = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return `hsl(${hues[sum % hues.length]}, 65%, 45%)`;
};

const ClientsManager = () => {
  const navigate = useNavigate();

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Client>>(empty);
  const [view, setView] = useState<"table" | "card">("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detail, setDetail] = useState<Client | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => (await (supabase as any).from("invoices").select("*")).data || [],
  });

  const { data: cprojects = [] } = useQuery({
    queryKey: ["admin-client-projects"],
    queryFn: async () => (await (supabase as any).from("client_projects").select("*")).data || [],
  });

  const enriched = useMemo(() => {
    return clients.map((c) => {
      const cInvoices = invoices.filter((i: any) => i.client_id === c.id);
      const totalPaid = cInvoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.amount), 0);
      const lastInvoice = cInvoices.map((i: any) => i.paid_date || i.issue_date).sort().pop();
      const projCount = cprojects.filter((p: any) => p.client_id === c.id).length;
      // Health: red if any overdue/unpaid past due_date, yellow if paid > 7d after due, else green
      const now = new Date();
      let health: "green" | "yellow" | "red" = "green";
      cInvoices.forEach((i: any) => {
        if (i.status !== "paid" && i.status !== "cancelled" && i.due_date && new Date(i.due_date) < now) health = "red";
        else if (i.status === "paid" && i.due_date && i.paid_date) {
          const diff = (new Date(i.paid_date).getTime() - new Date(i.due_date).getTime()) / 86400000;
          if (diff > 7 && health !== "red") health = "yellow";
        }
      });
      return { ...c, totalPaid, lastInvoice, projCount, health };
    });
  }, [clients, invoices, cprojects]);

  const filtered = useMemo(() => {
    return enriched.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !(c.email || "").toLowerCase().includes(q) && !(c.company || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [enriched, statusFilter, search]);

  const save = async () => {
    if (!form.name?.trim()) return toast.error("Name required");
    const payload: any = { ...form };
    Object.keys(payload).forEach((k) => payload[k] === "" && (payload[k] = null));
    const { error } = form.id
      ? await (supabase as any).from("clients").update(payload).eq("id", form.id)
      : await (supabase as any).from("clients").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Updated" : "Added");
    qc.invalidateQueries({ queryKey: ["admin-clients"] });
    setOpen(false);
    setForm(empty);
  };

  const del = async (id: string) => {
    if (!confirm("Delete client?")) return;
    const { error } = await (supabase as any).from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-clients"] });
  };

  const saveNotes = async (id: string, notes: string) => {
    const { error } = await (supabase as any).from("clients").update({ notes }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Notes saved");
    qc.invalidateQueries({ queryKey: ["admin-clients"] });
  };

  const HealthDot = ({ h }: { h: "green" | "yellow" | "red" }) => {
    const color = h === "green" ? "bg-emerald-500" : h === "yellow" ? "bg-amber-500" : "bg-rose-500";
    return <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={`Health: ${h}`} />;
  };

  const Avatar = ({ name }: { name: string }) => (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: colorFor(name) }}>
      {initialsOf(name)}
    </div>
  );

  const waLink = (c: any) =>
    `https://wa.me/${(c.whatsapp || c.phone || "").replace(/\D/g, "")}`;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Clients</h1>
          <p className="text-muted-foreground mt-1 text-sm">{filtered.length} of {clients.length} clients</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="inline-flex p-0.5 rounded-md border border-border/60 bg-secondary/40">
            <Button size="sm" variant={view === "table" ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => setView("table")}><Rows className="w-4 h-4" /></Button>
            <Button size="sm" variant={view === "card" ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => setView("card")}><LayoutGrid className="w-4 h-4" /></Button>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setForm(empty)} className="gap-2"><Plus className="w-4 h-4" />Add Client</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Client</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Name *" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Company" value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                <Input placeholder="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <Input placeholder="WhatsApp" value={form.whatsapp || ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground">Follow up</label><Input type="date" value={form.follow_up_date || ""} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Birthday</label><Input type="date" value={form.birthday || ""} onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></div>
                </div>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Notes" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <Button onClick={save} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, email, company…" className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="lead">Leads</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Body */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No clients match.</Card>
      ) : view === "table" ? (
        <Card className="border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Total Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-secondary/40" onClick={() => navigate(`/admin/clients/${c.id}`)}>
                  <TableCell><Avatar name={c.name} /></TableCell>
                  <TableCell className="font-semibold flex items-center gap-2"><HealthDot h={c.health} />{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.company || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.phone || "—"}</TableCell>
                  <TableCell className="font-semibold text-emerald-400">{c.totalPaid > 0 ? c.totalPaid.toLocaleString() : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{c.status}</Badge></TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      {(c.whatsapp || c.phone) && (
                        <a href={waLink(c)} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="ghost"><MessageCircle className="w-4 h-4 text-emerald-400" /></Button></a>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { setForm(c as any); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="p-4 border-border/60 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate(`/admin/clients/${c.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} />
                  <div>
                    <div className="flex items-center gap-2"><HealthDot h={c.health} /><h3 className="font-semibold">{c.name}</h3></div>
                    {c.company && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" />{c.company}</p>}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize text-[10px]">{c.status}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="p-2 rounded bg-secondary/40 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase">Revenue</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">{c.totalPaid > 0 ? c.totalPaid.toLocaleString() : "—"}</div>
                </div>
                <div className="p-2 rounded bg-secondary/40 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase">Projects</div>
                  <div className="text-sm font-bold mt-0.5">{c.projCount}</div>
                </div>
                <div className="p-2 rounded bg-secondary/40 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase">Last Inv</div>
                  <div className="text-[10px] font-medium mt-1">{c.lastInvoice || "—"}</div>
                </div>
              </div>
              <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                {c.email && <a href={`mailto:${c.email}`} className="flex-1"><Button size="sm" variant="outline" className="w-full h-7 text-[11px] gap-1"><Mail className="w-3 h-3" />Email</Button></a>}
                {(c.whatsapp || c.phone) && <a href={waLink(c)} target="_blank" rel="noopener noreferrer" className="flex-1"><Button size="sm" variant="outline" className="w-full h-7 text-[11px] gap-1"><MessageCircle className="w-3 h-3 text-emerald-400" />WhatsApp</Button></a>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detail && <ClientDetail client={detail as any} invoices={invoices.filter((i: any) => i.client_id === detail.id)} projects={cprojects.filter((p: any) => p.client_id === detail.id)} onSaveNotes={saveNotes} />}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const ClientDetail = ({ client, invoices, projects, onSaveNotes }: any) => {
  const [notes, setNotes] = useState(client.notes || "");
  const total = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.amount), 0);
  const wa = `https://wa.me/${(client.whatsapp || client.phone || "").replace(/\D/g, "")}`;
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: colorFor(client.name) }}>{initialsOf(client.name)}</div>
          <div>
            <div>{client.name}</div>
            {client.company && <div className="text-xs text-muted-foreground font-normal">{client.company}</div>}
          </div>
        </SheetTitle>
      </SheetHeader>

      <div className="space-y-5 mt-5">
        {/* Contact */}
        <div className="space-y-2 text-sm">
          {client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-2 hover:text-primary"><Mail className="w-4 h-4" />{client.email}</a>}
          {client.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" />{client.phone}</div>}
          {(client.whatsapp || client.phone) && <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-emerald-400 hover:underline"><MessageCircle className="w-4 h-4" />WhatsApp message</a>}
          {client.follow_up_date && <div className="flex items-center gap-2 text-amber-400"><CalendarClock className="w-4 h-4" />Follow up: {client.follow_up_date}</div>}
          {client.birthday && <div className="flex items-center gap-2 text-pink-400"><Cake className="w-4 h-4" />Birthday: {client.birthday}</div>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center"><div className="text-[10px] uppercase text-muted-foreground">Total Paid</div><div className="font-bold text-emerald-400 mt-1">{total.toLocaleString()}</div></Card>
          <Card className="p-3 text-center"><div className="text-[10px] uppercase text-muted-foreground">Invoices</div><div className="font-bold mt-1">{invoices.length}</div></Card>
          <Card className="p-3 text-center"><div className="text-[10px] uppercase text-muted-foreground">Projects</div><div className="font-bold mt-1">{projects.length}</div></Card>
        </div>

        {/* Invoices */}
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5"><FileText className="w-3 h-3" />Invoices</h4>
          {invoices.length === 0 ? <p className="text-xs text-muted-foreground">No invoices</p> : (
            <div className="space-y-1.5">
              {invoices.slice(0, 8).map((i: any) => (
                <div key={i.id} className="flex justify-between text-xs p-2 rounded bg-secondary/40">
                  <span className="font-medium">{i.invoice_number || "—"}</span>
                  <span className={i.status === "paid" ? "text-emerald-400" : "text-amber-400"}>{i.currency} {Number(i.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5"><FolderKanban className="w-3 h-3" />Projects</h4>
          {projects.length === 0 ? <p className="text-xs text-muted-foreground">No projects</p> : (
            <div className="space-y-1.5">
              {projects.map((p: any) => (
                <div key={p.id} className="flex justify-between text-xs p-2 rounded bg-secondary/40">
                  <span>{p.title}</span>
                  <span className="text-muted-foreground capitalize">{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Notes</h4>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes…" rows={4} />
          <Button size="sm" className="mt-2 gap-1.5" onClick={() => onSaveNotes(client.id, notes)}><Save className="w-3.5 h-3.5" />Save Notes</Button>
        </div>
      </div>
    </>
  );
};

export default ClientsManager;
