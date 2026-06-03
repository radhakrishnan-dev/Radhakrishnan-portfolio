import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Mail, Phone, MessageCircle, Upload, Trash2, FileText, Image as ImageIcon, FileArchive,
  CalendarClock, Plus, FolderOpen, Receipt, NotebookPen, Activity, DollarSign, Download, Pencil, Save,
} from "lucide-react";

type Client = {
  id: string; name: string; company?: string | null; email?: string | null;
  phone?: string | null; whatsapp?: string | null; status: string;
  notes?: string | null; follow_up_date?: string | null; birthday?: string | null;
  last_contacted_at?: string | null;
};

const CATEGORIES = ["Contract", "Design", "Brief", "Invoice", "Reference", "Other"];

const fmtBytes = (n: number) => {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
};

const fileIcon = (type: string) => {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.includes("pdf")) return FileText;
  if (type.includes("zip") || type.includes("rar")) return FileArchive;
  return FileText;
};

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";

const ClientHub = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadCategory, setUploadCategory] = useState("Other");
  const [newNote, setNewNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [editClient, setEditClient] = useState<Partial<Client>>({});

  const { data: client } = useQuery({
    queryKey: ["client-hub", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("clients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Client | null;
    },
    enabled: !!id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["client-hub-invoices", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("invoices").select("*").eq("client_id", id).order("issue_date", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["client-hub-projects", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("client_projects").select("*").eq("client_id", id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: files = [] } = useQuery({
    queryKey: ["client-hub-files", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("client_files").select("*").eq("client_id", id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["client-hub-notes", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("client_notes").select("*").eq("client_id", id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const totals = useMemo(() => {
    const paid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.amount), 0);
    const outstanding = invoices.filter((i: any) => i.status !== "paid" && i.status !== "cancelled")
      .reduce((s: number, i: any) => s + Number(i.amount), 0);
    const overdue = invoices.some((i: any) => i.status === "overdue" || (i.status === "unpaid" && i.due_date && new Date(i.due_date) < new Date()));
    const health: "green" | "yellow" | "red" = overdue ? "red" : outstanding > 0 ? "yellow" : "green";
    const storage = files.reduce((s: number, f: any) => s + Number(f.file_size || 0), 0);
    return { paid, outstanding, overdue, health, storage };
  }, [invoices, files]);

  const healthColor = { green: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30", yellow: "text-amber-400 bg-amber-500/15 border-amber-500/30", red: "text-rose-400 bg-rose-500/15 border-rose-500/30" }[totals.health];

  const touchLastContact = async () => {
    await (supabase as any).from("clients").update({ last_contacted_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["client-hub", id] });
  };

  const sendWhatsApp = () => {
    if (!client) return;
    const phone = (client.whatsapp || client.phone || "").replace(/\D/g, "");
    if (!phone) return toast.error("No WhatsApp / phone number on file");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${client.name},`)}`, "_blank");
    touchLastContact();
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { error } = await (supabase as any).from("client_notes").insert({ client_id: id, content: newNote.trim() });
    if (error) return toast.error(error.message);
    setNewNote("");
    qc.invalidateQueries({ queryKey: ["client-hub-notes", id] });
    touchLastContact();
    toast.success("Note added");
  };

  const deleteNote = async (noteId: string) => {
    await (supabase as any).from("client_notes").delete().eq("id", noteId);
    qc.invalidateQueries({ queryKey: ["client-hub-notes", id] });
  };

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || !id) return;
    for (const f of Array.from(fileList)) {
      const path = `${id}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("client-files").upload(path, f, { cacheControl: "3600" });
      if (upErr) { toast.error(`${f.name}: ${upErr.message}`); continue; }
      const { error: insErr } = await (supabase as any).from("client_files").insert({
        client_id: id, file_name: f.name, storage_path: path,
        file_size: f.size, file_type: f.type || "application/octet-stream", category: uploadCategory,
      });
      if (insErr) toast.error(insErr.message);
    }
    qc.invalidateQueries({ queryKey: ["client-hub-files", id] });
    toast.success("Files uploaded");
  };

  const downloadFile = async (f: any) => {
    const { data, error } = await supabase.storage.from("client-files").createSignedUrl(f.storage_path, 60);
    if (error || !data) return toast.error(error?.message || "Failed");
    window.open(data.signedUrl, "_blank");
  };

  const deleteFile = async (f: any) => {
    if (!confirm(`Delete ${f.file_name}?`)) return;
    await supabase.storage.from("client-files").remove([f.storage_path]);
    await (supabase as any).from("client_files").delete().eq("id", f.id);
    qc.invalidateQueries({ queryKey: ["client-hub-files", id] });
  };

  const saveProfile = async () => {
    const { error } = await (supabase as any).from("clients").update(editClient).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["client-hub", id] });
    setEditing(false);
    toast.success("Profile updated");
  };

  const setFollowUp = async (date: string) => {
    const { error } = await (supabase as any).from("clients").update({ follow_up_date: date || null }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["client-hub", id] });
    toast.success("Follow-up updated");
  };

  if (!client) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/clients")} className="gap-2"><ArrowLeft className="w-4 h-4" />Back</Button>
        <Card className="p-8 text-center text-muted-foreground">Loading client…</Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/clients")} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" />All clients
      </Button>

      {/* Header */}
      <Card className="p-5 md:p-6 border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-2xl md:text-3xl font-bold text-primary-foreground shadow-lg shrink-0">
            {initials(client.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{client.name}</h1>
              <Badge variant="outline" className="capitalize">{client.status}</Badge>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${healthColor}`}>
                {totals.health === "green" ? "Healthy" : totals.health === "yellow" ? "Outstanding" : "Overdue"}
              </span>
            </div>
            {client.company && <p className="text-muted-foreground mt-0.5">{client.company}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
              {client.email && <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{client.email}</span>}
              {client.phone && <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{client.phone}</span>}
              {client.last_contacted_at && <span className="inline-flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />Last contact: {new Date(client.last_contacted_at).toLocaleDateString()}</span>}
            </div>
          </div>
          <div className="grid grid-cols-3 md:flex md:flex-row gap-3 md:gap-5">
            <div className="text-center md:text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Revenue</div>
              <div className="text-lg md:text-xl font-bold text-emerald-400">{totals.paid.toLocaleString()}</div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Outstanding</div>
              <div className="text-lg md:text-xl font-bold text-amber-400">{totals.outstanding.toLocaleString()}</div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Projects</div>
              <div className="text-lg md:text-xl font-bold text-primary">{projects.length}</div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-border/40">
          <Button size="sm" variant="outline" className="gap-1.5" asChild>
            <Link to={`/admin/income`}><Receipt className="w-4 h-4" />+ Invoice</Link>
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" asChild>
            <Link to={`/admin/tracker`}><FolderOpen className="w-4 h-4" />+ Project</Link>
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { (document.getElementById("notes-tab-trigger") as HTMLElement)?.click(); }}>
            <NotebookPen className="w-4 h-4" />+ Note
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10" onClick={sendWhatsApp}>
            <MessageCircle className="w-4 h-4" />WhatsApp
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" />Upload File
          </Button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
          <TabsTrigger value="notes" id="notes-tab-trigger">Notes ({notes.length})</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 grid md:grid-cols-2 gap-4">
          <Card className="p-5 border-border/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Contact details</h3>
              {!editing ? (
                <Button size="sm" variant="ghost" onClick={() => { setEditClient(client); setEditing(true); }}><Pencil className="w-4 h-4" /></Button>
              ) : (
                <Button size="sm" onClick={saveProfile} className="gap-1.5"><Save className="w-4 h-4" />Save</Button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2.5">
                <Input value={editClient.name || ""} onChange={(e) => setEditClient({ ...editClient, name: e.target.value })} placeholder="Name" />
                <Input value={editClient.company || ""} onChange={(e) => setEditClient({ ...editClient, company: e.target.value })} placeholder="Company" />
                <Input value={editClient.email || ""} onChange={(e) => setEditClient({ ...editClient, email: e.target.value })} placeholder="Email" />
                <Input value={editClient.phone || ""} onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })} placeholder="Phone" />
                <Input value={editClient.whatsapp || ""} onChange={(e) => setEditClient({ ...editClient, whatsapp: e.target.value })} placeholder="WhatsApp" />
                <Select value={editClient.status} onValueChange={(v) => setEditClient({ ...editClient, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2.5 text-sm">
                <Row label="Email" value={client.email} />
                <Row label="Phone" value={client.phone} />
                <Row label="WhatsApp" value={client.whatsapp} />
                <Row label="Company" value={client.company} />
                <Row label="Birthday" value={client.birthday} />
              </div>
            )}
          </Card>

          <Card className="p-5 border-border/60">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">Follow-up reminder</h3>
            </div>
            <Input type="date" value={client.follow_up_date || ""} onChange={(e) => setFollowUp(e.target.value)} />
            {client.follow_up_date && (
              <p className="text-xs text-muted-foreground mt-2">
                Reminder set for {new Date(client.follow_up_date).toLocaleDateString()}
              </p>
            )}

            <div className="mt-5 pt-4 border-t border-border/40">
              <h4 className="text-sm font-semibold mb-2">General notes</h4>
              <Textarea
                rows={4}
                value={editClient.notes ?? client.notes ?? ""}
                onChange={(e) => setEditClient({ ...client, ...editClient, notes: e.target.value })}
              />
              <Button size="sm" className="mt-2 gap-1.5" onClick={async () => {
                const { error } = await (supabase as any).from("clients").update({ notes: editClient.notes ?? client.notes }).eq("id", id);
                if (error) return toast.error(error.message);
                qc.invalidateQueries({ queryKey: ["client-hub", id] });
                toast.success("Saved");
              }}>
                <Save className="w-4 h-4" />Save notes
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* INVOICES */}
        <TabsContent value="invoices" className="mt-4">
          <Card className="border-border/60 divide-y divide-border/40">
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No invoices yet.</div>
            ) : invoices.map((i: any) => (
              <div key={i.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{i.invoice_number || "—"}</div>
                  <div className="text-xs text-muted-foreground">{i.issue_date}{i.due_date ? ` • Due ${i.due_date}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{i.currency} {Number(i.amount).toLocaleString()}</div>
                  <Badge variant="outline" className="text-[10px] capitalize">{i.status}</Badge>
                </div>
              </div>
            ))}
            {invoices.length > 0 && (
              <div className="p-4 grid grid-cols-2 gap-4 bg-secondary/30">
                <div><div className="text-xs text-muted-foreground">Total paid</div><div className="font-bold text-emerald-400">{totals.paid.toLocaleString()}</div></div>
                <div><div className="text-xs text-muted-foreground">Outstanding</div><div className="font-bold text-amber-400">{totals.outstanding.toLocaleString()}</div></div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* PROJECTS */}
        <TabsContent value="projects" className="mt-4">
          <Card className="border-border/60 divide-y divide-border/40">
            {projects.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No projects linked.</div>
            ) : projects.map((p: any) => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.deadline ? `Due ${p.deadline}` : "No deadline"} • {p.progress}%</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{p.status}</Badge>
                  {p.budget ? <span className="text-sm font-semibold">{p.currency} {Number(p.budget).toLocaleString()}</span> : null}
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>

        {/* FILES */}
        <TabsContent value="files" className="mt-4 space-y-3">
          <Card className="p-4 border-border/60 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
                <Upload className="w-4 h-4" />Upload files
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">Total used: <span className="font-semibold text-foreground">{fmtBytes(totals.storage)}</span></div>
          </Card>

          {files.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground text-sm border-dashed border-border/60">
              No files uploaded. Drag a contract, brief, or design above.
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {files.map((f: any) => {
                const Icon = fileIcon(f.file_type);
                return (
                  <Card key={f.id} className="p-4 border-border/60 hover:border-primary/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate" title={f.file_name}>{f.file_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {fmtBytes(f.file_size)} • {new Date(f.created_at).toLocaleDateString()}
                        </div>
                        <Badge variant="outline" className="mt-1.5 text-[10px]">{f.category}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-3 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => downloadFile(f)}><Download className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteFile(f)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* NOTES */}
        <TabsContent value="notes" className="mt-4 space-y-3">
          <Card className="p-4 border-border/60 space-y-2">
            <Textarea rows={3} value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add an activity note, call summary, or update…" />
            <div className="flex justify-end">
              <Button size="sm" onClick={addNote} className="gap-1.5"><Plus className="w-4 h-4" />Add note</Button>
            </div>
          </Card>

          {notes.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">No notes yet.</Card>
          ) : (
            <div className="relative pl-5 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-border/60">
              {notes.map((n: any) => (
                <div key={n.id} className="relative">
                  <span className="absolute -left-[18px] top-2 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  <Card className="p-3 border-border/60">
                    <div className="flex justify-between items-start gap-2">
                      <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteNote(n.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="text-sm mt-1 whitespace-pre-wrap">{n.content}</div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex justify-between gap-3">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right truncate">{value || "—"}</span>
  </div>
);

export default ClientHub;
