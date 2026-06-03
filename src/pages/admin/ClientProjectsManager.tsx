import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Calendar, FileText, AlertCircle, CheckCircle2, Receipt } from "lucide-react";
import { toast } from "sonner";

type Invoice = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  invoice_number: string | null;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_date: string | null;
};

type Expense = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  invoice_id: string | null;
  description: string;
  amount: number;
  currency: string;
  category: string;
  expense_date: string;
  notes: string | null;
};

type CP = {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  deadline: string | null;
  budget: number | null;
  currency: string;
  income_type: string;
  notes: string | null;
};

const STATUSES = ["lead", "in_progress", "review", "done", "on_hold"];
const CURRENCIES = ["USD", "INR", "EUR", "GBP", "AUD", "CAD"];
const INCOME_TYPES = [
  { value: "web_development", label: "Web Development" },
  { value: "graphic_design", label: "Graphic Design" },
  { value: "other", label: "Other" },
];
const EXPENSE_CATEGORIES = ["software", "hardware", "subcontractor", "hosting", "marketing", "travel", "other"];
const empty: Partial<CP> = { title: "", description: "", status: "lead", progress: 0, currency: "USD", income_type: "web_development", client_id: null };

const ClientProjectsManager = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<CP>>(empty);

  // Expense dialog state
  const [expOpen, setExpOpen] = useState(false);
  const [expProject, setExpProject] = useState<CP | null>(null);
  const emptyExp = (p: CP | null): Partial<Expense> => ({
    project_id: p?.id || null,
    client_id: p?.client_id || null,
    invoice_id: null,
    description: "",
    amount: 0,
    currency: p?.currency || "USD",
    category: "other",
    expense_date: new Date().toISOString().slice(0, 10),
  });
  const [expForm, setExpForm] = useState<Partial<Expense>>(emptyExp(null));

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["admin-client-projects"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("client_projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as CP[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["admin-clients-lite"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("clients").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["admin-invoices-for-tracker"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("invoices").select("id, project_id, client_id, invoice_number, amount, currency, status, due_date, paid_date");
      if (error) throw error;
      return (data || []) as Invoice[];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["admin-project-expenses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("project_expenses").select("*").order("expense_date", { ascending: false });
      if (error) throw error;
      return (data || []) as Expense[];
    },
  });

  const projectExpenses = useMemo(() => {
    const map: Record<string, { total: number; count: number; items: Expense[] }> = {};
    expenses.forEach((e) => {
      if (!e.project_id) return;
      const f = map[e.project_id] || { total: 0, count: 0, items: [] };
      f.total += Number(e.amount) || 0;
      f.count += 1;
      f.items.push(e);
      map[e.project_id] = f;
    });
    return map;
  }, [expenses]);

  const projectFinance = useMemo(() => {
    const now = new Date();
    const map: Record<string, { paid: number; outstanding: number; overdueCount: number; paidCount: number; total: number; invoiceCount: number }> = {};
    invoices.forEach((i) => {
      if (!i.project_id) return;
      const f = map[i.project_id] || { paid: 0, outstanding: 0, overdueCount: 0, paidCount: 0, total: 0, invoiceCount: 0 };
      const amt = Number(i.amount) || 0;
      f.total += amt;
      f.invoiceCount += 1;
      if (i.status === "paid") { f.paid += amt; f.paidCount += 1; }
      else if (i.status !== "cancelled") {
        f.outstanding += amt;
        const isOverdue = i.status === "overdue" || (i.due_date && new Date(i.due_date) < now);
        if (isOverdue) f.overdueCount += 1;
      }
      map[i.project_id] = f;
    });
    return map;
  }, [invoices]);

  const projectInvoices = (pid: string) => invoices.filter((i) => i.project_id === pid);
  const clientName = (id: string | null) => clients.find((c: any) => c.id === id)?.name || "—";

  const save = async () => {
    if (!form.title?.trim()) return toast.error("Title required");
    const payload: any = { ...form, progress: Number(form.progress) || 0, budget: form.budget ? Number(form.budget) : null };
    if (payload.client_id === "none") payload.client_id = null;
    const { error } = form.id
      ? await (supabase as any).from("client_projects").update(payload).eq("id", form.id)
      : await (supabase as any).from("client_projects").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-client-projects"] });
    setOpen(false);
    setForm(empty);
  };

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await (supabase as any).from("client_projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-client-projects"] });
  };

  const saveExpense = async () => {
    if (!expForm.description?.trim()) return toast.error("Description required");
    if (!expForm.project_id) return toast.error("Project required");
    const payload: any = {
      project_id: expForm.project_id,
      client_id: expForm.client_id || null,
      invoice_id: expForm.invoice_id && expForm.invoice_id !== "none" ? expForm.invoice_id : null,
      description: expForm.description,
      amount: Number(expForm.amount) || 0,
      currency: expForm.currency || "USD",
      category: expForm.category || "other",
      expense_date: expForm.expense_date,
      notes: expForm.notes || null,
    };
    const { error } = expForm.id
      ? await (supabase as any).from("project_expenses").update(payload).eq("id", expForm.id)
      : await (supabase as any).from("project_expenses").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Expense saved");
    qc.invalidateQueries({ queryKey: ["admin-project-expenses"] });
    setExpForm(emptyExp(expProject));
  };

  const delExpense = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const { error } = await (supabase as any).from("project_expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-project-expenses"] });
  };

  const openExpenses = (p: CP) => {
    setExpProject(p);
    setExpForm(emptyExp(p));
    setExpOpen(true);
  };

  const statusColor = (s: string) => ({
    lead: "bg-blue-500/20 text-blue-500",
    in_progress: "bg-yellow-500/20 text-yellow-500",
    review: "bg-purple-500/20 text-purple-500",
    done: "bg-green-500/20 text-green-500",
    on_hold: "bg-muted text-muted-foreground",
  } as any)[s] || "bg-muted";

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold">Project Tracker</h1>
          <p className="text-muted-foreground mt-1">Track client work and progress</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(empty)}><Plus className="w-4 h-4 mr-2" />New Project</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Project</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title *" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Select value={form.client_id || "none"} onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
              <div>
                <label className="text-xs text-muted-foreground">Progress: {form.progress}%</label>
                <Input type="range" min={0} max={100} value={form.progress || 0} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} />
              </div>
              <Select value={form.income_type} onValueChange={(v) => setForm({ ...form, income_type: v })}>
                <SelectTrigger><SelectValue placeholder="Income type" /></SelectTrigger>
                <SelectContent>{INCOME_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" placeholder="Deadline" value={form.deadline || ""} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              <div className="flex gap-2">
                <Input type="number" placeholder="Budget" value={form.budget ?? ""} onChange={(e) => setForm({ ...form, budget: e.target.value as any })} />
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expense management dialog */}
      <Dialog open={expOpen} onOpenChange={(o) => { setExpOpen(o); if (!o) { setExpProject(null); setExpForm(emptyExp(null)); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>Expenses · {expProject?.title}</DialogTitle>
          </DialogHeader>
          {expProject && (
            <div className="space-y-4">
              {/* Form */}
              <Card className="p-3 space-y-2 bg-secondary/30">
                <div className="text-xs font-medium text-muted-foreground">{expForm.id ? "Edit expense" : "Add new expense"}</div>
                <Input placeholder="Description *" value={expForm.description || ""} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Amount" value={expForm.amount ?? ""} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value as any })} />
                  <Select value={expForm.currency} onValueChange={(v) => setExpForm({ ...expForm, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={expForm.category} onValueChange={(v) => setExpForm({ ...expForm, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="date" value={expForm.expense_date || ""} onChange={(e) => setExpForm({ ...expForm, expense_date: e.target.value })} />
                </div>
                <Select
                  value={expForm.invoice_id || "none"}
                  onValueChange={(v) => {
                    if (v === "none") {
                      setExpForm({ ...expForm, invoice_id: null });
                      return;
                    }
                    const inv = invoices.find((i) => i.id === v);
                    setExpForm({
                      ...expForm,
                      invoice_id: v,
                      // Auto-fill project + client + currency from the invoice
                      project_id: inv?.project_id || expForm.project_id,
                      client_id: inv?.client_id || expForm.client_id,
                      currency: inv?.currency || expForm.currency,
                    });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Link invoice (auto-fills project)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No invoice</SelectItem>
                    {invoices.map((i) => {
                      const projTitle = projects.find((p) => p.id === i.project_id)?.title;
                      return (
                        <SelectItem key={i.id} value={i.id}>
                          {i.invoice_number || i.id.slice(0, 8)} · {i.currency} {Number(i.amount).toLocaleString()} · {i.status}
                          {projTitle ? ` · ${projTitle}` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Textarea placeholder="Notes" value={expForm.notes || ""} onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })} />
                <div className="flex gap-2">
                  <Button onClick={saveExpense} className="flex-1">{expForm.id ? "Update" : "Add"} Expense</Button>
                  {expForm.id && <Button variant="outline" onClick={() => setExpForm(emptyExp(expProject))}>Cancel</Button>}
                </div>
              </Card>

              {/* List */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  {projectExpenses[expProject.id]?.count || 0} expense(s) · Total: {expProject.currency} {(projectExpenses[expProject.id]?.total || 0).toLocaleString()}
                </div>
                {(projectExpenses[expProject.id]?.items || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No expenses yet.</p>
                ) : (
                  projectExpenses[expProject.id].items.map((e) => {
                    const linkedInv = invoices.find((i) => i.id === e.invoice_id);
                    return (
                      <Card key={e.id} className="p-3 flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{e.description}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{e.category}</span>
                            {linkedInv && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary flex items-center gap-1">
                                <FileText className="w-2.5 h-2.5" />{linkedInv.invoice_number || linkedInv.id.slice(0, 6)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {e.currency} {Number(e.amount).toLocaleString()} · {e.expense_date}
                          </div>
                          {e.notes && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.notes}</div>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => setExpForm(e)}><Pencil className="w-3 h-3" /></Button>
                          <Button size="sm" variant="outline" onClick={() => delExpense(e.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : projects.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No projects yet.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((p) => {
            const fin = projectFinance[p.id];
            const exp = projectExpenses[p.id];
            const expenseTotal = exp?.total || 0;
            const paid = fin?.paid || 0;
            const outstanding = fin?.outstanding || 0;
            const budget = Number(p.budget) || 0;
            const balance = budget > 0 ? budget - paid - expenseTotal : paid - expenseTotal - outstanding;
            const profit = paid - expenseTotal;
            return (
            <Card key={p.id} className="p-4 glass-card">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{p.title}</h3>
                  <p className="text-xs text-muted-foreground">{clientName(p.client_id)}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${statusColor(p.status)}`}>{p.status.replace("_", " ")}</span>
              </div>
              {p.description && <p className="text-xs mt-2 text-muted-foreground line-clamp-2">{p.description}</p>}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1"><span>Progress</span><span>{p.progress}%</span></div>
                <Progress value={p.progress} className="h-2" />
              </div>

              {(fin || exp) ? (
                <div className="mt-3 p-2.5 rounded-lg bg-secondary/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                    <span className="flex items-center gap-1 text-muted-foreground"><FileText className="w-3 h-3" />{fin?.invoiceCount || 0} invoice{(fin?.invoiceCount || 0) !== 1 ? "s" : ""} · {exp?.count || 0} expense{(exp?.count || 0) !== 1 ? "s" : ""}</span>
                    <div className="flex items-center gap-1.5">
                      {fin && fin.paidCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-500 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" />{fin.paidCount} paid</span>
                      )}
                      {fin && fin.overdueCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" />{fin.overdueCount} overdue</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div><div className="text-muted-foreground">Paid</div><div className="font-semibold text-green-500">{p.currency} {paid.toLocaleString()}</div></div>
                    <div><div className="text-muted-foreground">Outstanding</div><div className="font-semibold text-yellow-500">{p.currency} {outstanding.toLocaleString()}</div></div>
                    <div><div className="text-muted-foreground">Expenses</div><div className="font-semibold text-orange-500">{p.currency} {expenseTotal.toLocaleString()}</div></div>
                    <div>
                      <div className="text-muted-foreground">{budget > 0 ? "Balance" : "Profit"}</div>
                      <div className={`font-semibold ${(budget > 0 ? balance : profit) >= 0 ? "text-foreground" : "text-destructive"}`}>{p.currency} {(budget > 0 ? balance : profit).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-[11px] text-muted-foreground italic">No invoices or expenses linked yet</div>
              )}

              <div className="flex justify-between text-xs mt-3 text-muted-foreground">
                {p.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{p.deadline}</span>}
                {p.budget && <span>Budget: {p.currency} {Number(p.budget).toLocaleString()}</span>}
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => openExpenses(p)}>
                  <Receipt className="w-3 h-3 mr-1" />Expenses
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setForm(p); setOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => del(p.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
              </div>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientProjectsManager;
