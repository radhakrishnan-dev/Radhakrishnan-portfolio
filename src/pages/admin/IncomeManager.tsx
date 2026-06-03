import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  Plus, Pencil, Trash2, TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  Wallet, FileDown, Search, Zap, Target, Calculator, FileText, ChevronUp, ChevronDown,
  CalendarRange,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import InvoiceFormDialog from "@/components/admin/InvoiceFormDialog";
import { ymKey, sumInMonth, sumInYear } from "@/lib/income";


type Inv = {
  id: string;
  invoice_number: string | null;
  client_id: string | null;
  project_id: string | null;
  amount: number;
  currency: string;
  status: string;
  income_type: string;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
};

const STATUSES = ["unpaid", "paid", "overdue", "cancelled"];
const CURRENCIES = ["USD", "INR", "EUR", "GBP", "AUD", "CAD"];
const INCOME_TYPES = [
  { value: "web_development", label: "Web Development" },
  { value: "graphic_design", label: "Graphic Design" },
  { value: "other", label: "Other" },
];
const PIE_COLORS = ["hsl(174, 72%, 45%)", "hsl(220, 70%, 60%)", "hsl(280, 65%, 65%)", "hsl(35, 90%, 55%)"];

const empty: Partial<Inv> = {
  amount: 0, currency: "INR", status: "unpaid",
  income_type: "web_development", issue_date: new Date().toISOString().slice(0, 10),
};


const autoInvoiceNumber = (existing: { invoice_number: string | null }[]) => {
  const year = new Date().getFullYear();
  const prefix = `KT-${year}-`;
  const max = existing
    .map((i) => i.invoice_number || "")
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
};


const isOverdue = (i: Inv) =>
  i.status === "overdue" ||
  (i.status === "unpaid" && i.due_date && new Date(i.due_date) < new Date());

const effectiveStatus = (i: Inv): "paid" | "overdue" | "unpaid" | "cancelled" => {
  if (i.status === "paid") return "paid";
  if (i.status === "cancelled") return "cancelled";
  if (isOverdue(i)) return "overdue";
  return "unpaid";
};

const StatusBadge = ({ s }: { s: string }) => {
  const map: Record<string, string> = {
    paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    unpaid: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    overdue: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    cancelled: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${map[s] || map.unpaid}`}>
      {s}
    </span>
  );
};

const IncomeManager = () => {
  const qc = useQueryClient();
  const { settings } = useSiteSettings();
  const updateSetting = async (key: string, value: string) => {
    const { error } = await (supabase as any)
      .from("site_settings")
      .upsert({ key, value }, { onConflict: "key" });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["site-settings"] });
  };
  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [detailInv, setDetailInv] = useState<Inv | null>(null);
  const [form, setForm] = useState<Partial<Inv>>(empty);
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid" | "overdue">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [chartView, setChartView] = useState<"monthly" | "weekly">("monthly");

  const goal = Number(settings.income_monthly_goal || 0);
  const gstPct = Number(settings.tax_gst_pct || 18);
  const incomeTaxPct = Number(settings.tax_income_pct || 30);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("invoices").select("*").order("issue_date", { ascending: false });
      if (error) throw error;
      return data as Inv[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["admin-clients-lite"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("clients").select("id, name, email, phone, whatsapp").order("name");
      return data || [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["admin-client-projects-lite"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("client_projects").select("id, title, budget, currency, client_id");
      return data || [];
    },
  });


  const clientName = (id: string | null) => clients.find((c: any) => c.id === id)?.name || "—";

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = ymKey(now);
    const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = ymKey(prevD);

    const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
    const unpaid = invoices.filter((i) => effectiveStatus(i) === "unpaid").reduce((s, i) => s + Number(i.amount), 0);
    const overdue = invoices.filter((i) => effectiveStatus(i) === "overdue").reduce((s, i) => s + Number(i.amount), 0);

    const inMonth = (key: string) => sumInMonth(invoices as any, key);
    const thisMonthIncome = inMonth(thisMonth);
    const lastMonthIncome = inMonth(prevMonth);
    const thisYear = String(now.getFullYear());
    const lastYear = String(now.getFullYear() - 1);
    const thisYearIncome = sumInYear(invoices as any, thisYear);
    const lastYearIncome = sumInYear(invoices as any, lastYear);
    const balance = paid - unpaid - overdue;

    const pct = (a: number, b: number) => (b ? ((a - b) / Math.abs(b)) * 100 : a > 0 ? 100 : 0);

    // Build a continuous monthly series (last 6 months, filled with zero)
    const monthlySeries: { label: string; key: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = ymKey(d);
      monthlySeries.push({
        key,
        label: d.toLocaleDateString("en", { month: "short" }),
        amount: inMonth(key),
      });
    }

    // Weekly series (last 8 weeks)
    const weekly: { label: string; amount: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const end = new Date(now);
      end.setDate(end.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const s = start.toISOString().slice(0, 10);
      const e = end.toISOString().slice(0, 10);
      const amount = invoices
        .filter((i) => i.status === "paid")
        .filter((i) => {
          const d = i.paid_date || i.issue_date;
          return d >= s && d <= e;
        })
        .reduce((acc, i) => acc + Number(i.amount), 0);
      weekly.push({ label: `${start.getDate()}/${start.getMonth() + 1}`, amount });
    }

    const byType: Record<string, number> = {};
    invoices.filter((i) => i.status === "paid").forEach((i) => {
      const t = i.income_type || "other";
      byType[t] = (byType[t] || 0) + Number(i.amount);
    });
    const typeData = INCOME_TYPES.map((t) => ({
      name: t.label,
      value: byType[t.value] || 0,
    })).filter((x) => x.value > 0);
    const typeTotal = typeData.reduce((s, x) => s + x.value, 0);

    return {
      paid, unpaid, overdue, balance, thisMonthIncome, lastMonthIncome,
      thisYearIncome, lastYearIncome,
      monthlySeries, weekly, typeData, typeTotal,
      changes: {
        balance: pct(balance, 0),
        thisMonth: pct(thisMonthIncome, lastMonthIncome),
        thisYear: pct(thisYearIncome, lastYearIncome),
        paid: pct(paid, paid - thisMonthIncome),
        outstanding: pct(unpaid, unpaid + 1),
        overdue: pct(overdue, overdue + 1),
      },
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      if (filter !== "all" && effectiveStatus(i) !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = clientName(i.client_id).toLowerCase();
        const num = (i.invoice_number || "").toLowerCase();
        if (!name.includes(q) && !num.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, filter, search, clients]);

  const save = async (override?: Partial<Inv>) => {
    const src = override || form;
    if (!src.amount || Number(src.amount) <= 0) return toast.error("Amount required");
    const payload: any = { ...src, amount: Number(src.amount) };
    if (payload.client_id === "none") payload.client_id = null;
    if (payload.project_id === "none") payload.project_id = null;
    if (payload.status === "paid" && !payload.paid_date) payload.paid_date = new Date().toISOString().slice(0, 10);
    if (!payload.invoice_number) payload.invoice_number = autoInvoiceNumber(invoices);
    const { error } = src.id
      ? await (supabase as any).from("invoices").update(payload).eq("id", src.id)
      : await (supabase as any).from("invoices").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-invoices"] });
    setOpen(false);
    setQuickOpen(false);
    setForm(empty);
  };


  const del = async (id: string) => {
    if (!confirm("Delete invoice?")) return;
    const { error } = await (supabase as any).from("invoices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-invoices"] });
  };

  const markPaid = async (ids: string[]) => {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await (supabase as any)
      .from("invoices")
      .update({ status: "paid", paid_date: today })
      .in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${ids.length} as paid`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["admin-invoices"] });
  };

  const exportCSV = () => {
    const headers = ["Invoice", "Client", "Date", "Due", "Paid Date", "Amount", "Currency", "Status", "Type", "Notes"];
    const rows = filtered.map((i) => [
      i.invoice_number || "",
      clientName(i.client_id),
      i.issue_date,
      i.due_date || "",
      i.paid_date || "",
      i.amount,
      i.currency,
      effectiveStatus(i),
      i.income_type,
      (i.notes || "").replace(/\n/g, " "),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadInvoicePDF = (i: Inv) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("INVOICE", 14, 20);
    doc.setFontSize(10);
    doc.text(`#${i.invoice_number || "—"}`, 14, 27);

    doc.setFontSize(11);
    doc.text(`Bill To: ${clientName(i.client_id)}`, 14, 45);
    doc.text(`Issue Date: ${i.issue_date}`, 14, 52);
    if (i.due_date) doc.text(`Due Date: ${i.due_date}`, 14, 59);
    doc.text(`Status: ${effectiveStatus(i).toUpperCase()}`, 140, 45);
    if (i.paid_date) doc.text(`Paid: ${i.paid_date}`, 140, 52);

    autoTable(doc, {
      startY: 75,
      head: [["Description", "Type", "Amount"]],
      body: [[
        i.notes || "Professional services",
        (i.income_type || "").replace("_", " "),
        `${i.currency} ${Number(i.amount).toLocaleString()}`,
      ]],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [20, 184, 166] },
    });

    const y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(13);
    doc.text(`Total: ${i.currency} ${Number(i.amount).toLocaleString()}`, 140, y);
    doc.save(`${i.invoice_number || "invoice"}.pdf`);
  };

  const monthGoalProgress = goal > 0 ? Math.min(100, (stats.thisMonthIncome / goal) * 100) : 0;
  const estGST = (stats.paid * gstPct) / 100;
  const estIncomeTax = (stats.paid * incomeTaxPct) / 100;

  const statCards = [
    { title: "Balance", value: stats.balance, change: stats.changes.balance, icon: Wallet, accent: "text-primary", grad: "from-primary/20 via-primary/5" },
    { title: "This Month", value: stats.thisMonthIncome, change: stats.changes.thisMonth, icon: TrendingUp, accent: "text-emerald-400", grad: "from-emerald-500/20 via-emerald-500/5" },
    { title: "This Year", value: stats.thisYearIncome, change: stats.changes.thisYear, icon: CalendarRange, accent: "text-cyan-400", grad: "from-cyan-500/20 via-cyan-500/5" },
    { title: "Total Paid", value: stats.paid, change: stats.changes.paid, icon: CheckCircle2, accent: "text-emerald-400", grad: "from-emerald-500/15 via-emerald-500/5" },
    { title: "Outstanding", value: stats.unpaid, change: -stats.changes.outstanding, icon: AlertCircle, accent: "text-amber-400", grad: "from-amber-500/20 via-amber-500/5" },
    { title: "Overdue", value: stats.overdue, change: stats.changes.overdue, icon: AlertCircle, accent: "text-rose-400", grad: "from-rose-500/20 via-rose-500/5" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Income</h1>
          <p className="text-muted-foreground mt-1 text-sm">Invoices, payments and revenue insights</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2"><FileDown className="w-4 h-4" />Export CSV</Button>
          <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-primary/40 text-primary hover:bg-primary/10">
                <Zap className="w-4 h-4" />Quick Invoice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-primary" />Quick Invoice Generator</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Invoice number will be auto-generated as <code className="text-primary">{autoInvoiceNumber(invoices)}</code></p>
                <Select value={form.client_id || "none"} onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Amount *" value={form.amount ?? ""} onChange={(e) => setForm({ ...form, amount: e.target.value as any })} />
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Select value={form.income_type} onValueChange={(v) => setForm({ ...form, income_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INCOME_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
                <Textarea placeholder="Description / notes" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <Button onClick={() => save()} className="w-full">Create Invoice</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" onClick={() => { setForm(empty); setOpen(true); }} className="gap-2"><Plus className="w-4 h-4" />New Invoice</Button>
          <InvoiceFormDialog
            open={open}
            onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}
            initial={form as any}
            clients={clients as any}
            projects={projects as any}
            existingInvoices={invoices}
            brandName={settings.brand_name || "Radhakrishnan"}
            brandEmail={settings.contact_email}
            brandPhone={settings.contact_phone}
            defaultGstPct={gstPct}
            onSave={async (payload) => { await save(payload as any); }}
          />

        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card key={s.title} className={`relative overflow-hidden p-4 border-border/60 bg-gradient-to-br ${s.grad} to-transparent`}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{s.title}</div>
              <s.icon className={`w-4 h-4 ${s.accent}`} />
            </div>
            <div className={`text-2xl font-bold mt-2 ${s.accent}`}>{s.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            {Number.isFinite(s.change) && s.change !== 0 && (
              <div className={`mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold ${s.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {s.change >= 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {Math.abs(s.change).toFixed(1)}% vs last month
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Goal + Tax row */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="p-4 border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Monthly Income Goal</h3>
            </div>
            <Input
              type="number"
              className="h-7 w-28 text-xs"
              placeholder="Goal"
              defaultValue={goal || ""}
              onBlur={(e) => updateSetting("income_monthly_goal", e.target.value)}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{stats.thisMonthIncome.toLocaleString()} earned</span>
            <span>{goal > 0 ? `${monthGoalProgress.toFixed(0)}% of ${goal.toLocaleString()}` : "Set a goal"}</span>
          </div>
          <Progress value={monthGoalProgress} className="h-2" />
        </Card>

        <Card className="p-4 border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Tax Estimator</h3>
            </div>
            <div className="flex gap-1.5 items-center">
              <Input type="number" className="h-7 w-14 text-xs" defaultValue={gstPct} onBlur={(e) => updateSetting("tax_gst_pct", e.target.value)} />
              <span className="text-[10px] text-muted-foreground">GST%</span>
              <Input type="number" className="h-7 w-14 text-xs" defaultValue={incomeTaxPct} onBlur={(e) => updateSetting("tax_income_pct", e.target.value)} />
              <span className="text-[10px] text-muted-foreground">Inc%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg bg-secondary/40">
              <div className="text-[10px] uppercase text-muted-foreground">Est. GST ({gstPct}%)</div>
              <div className="font-bold text-amber-400 mt-0.5">{estGST.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-secondary/40">
              <div className="text-[10px] uppercase text-muted-foreground">Est. Income Tax ({incomeTaxPct}%)</div>
              <div className="font-bold text-rose-400 mt-0.5">{estIncomeTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2 p-4 border-border/60">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Revenue</h3>
            <Tabs value={chartView} onValueChange={(v: any) => setChartView(v)}>
              <TabsList className="h-8">
                <TabsTrigger value="monthly" className="h-6 text-xs px-3">Monthly</TabsTrigger>
                <TabsTrigger value="weekly" className="h-6 text-xs px-3">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartView === "monthly" ? stats.monthlySeries.map((m) => ({ label: m.label, amount: m.amount })) : stats.weekly}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(174,72%,45%)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(174,72%,45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(222,30%,18%)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(215,20%,60%)" fontSize={11} />
              <YAxis stroke="hsl(215,20%,60%)" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(222,47%,8%)", border: "1px solid hsl(222,30%,18%)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="amount" stroke="hsl(174,72%,45%)" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 border-border/60">
          <h3 className="font-semibold text-sm mb-3">Income by Type</h3>
          {stats.typeData.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-12">No paid invoices yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={stats.typeData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {stats.typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(222,47%,8%)", border: "1px solid hsl(222,30%,18%)", borderRadius: 8 }}
                  formatter={(v: any) => `${Number(v).toLocaleString()} (${((Number(v) / stats.typeTotal) * 100).toFixed(0)}%)`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Invoice table */}
      <Card className="border-border/60">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60">
          <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client or invoice…" className="pl-8 h-9" />
            </div>
            {selected.size > 0 && (
              <Button size="sm" onClick={() => markPaid(Array.from(selected))} className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" />Mark {selected.size} Paid
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No invoices match.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && filtered.every((i) => selected.has(i.id))}
                    onCheckedChange={(v) => {
                      const next = new Set(selected);
                      filtered.forEach((i) => (v ? next.add(i.id) : next.delete(i.id)));
                      setSelected(next);
                    }}
                  />
                </TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => (
                <TableRow key={i.id} className="cursor-pointer hover:bg-secondary/40" onClick={() => setDetailInv(i)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(i.id)}
                      onCheckedChange={(v) => {
                        const next = new Set(selected);
                        if (v) next.add(i.id); else next.delete(i.id);
                        setSelected(next);
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{i.invoice_number || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{clientName(i.client_id)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{i.issue_date}</TableCell>
                  <TableCell className="font-semibold">{i.currency} {Number(i.amount).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge s={effectiveStatus(i)} /></TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => downloadInvoicePDF(i)} title="Download PDF"><FileText className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { setForm(i); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => del(i.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailInv} onOpenChange={(o) => !o && setDetailInv(null)}>
        <DialogContent>
          {detailInv && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Invoice {detailInv.invoice_number || "—"}
                  <StatusBadge s={effectiveStatus(detailInv)} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="text-xs text-muted-foreground">Client</div><div className="font-medium">{clientName(detailInv.client_id)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Type</div><div className="font-medium capitalize">{detailInv.income_type.replace("_", " ")}</div></div>
                  <div><div className="text-xs text-muted-foreground">Issue date</div><div>{detailInv.issue_date}</div></div>
                  <div><div className="text-xs text-muted-foreground">Due date</div><div>{detailInv.due_date || "—"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Paid date</div><div>{detailInv.paid_date || "—"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Amount</div><div className="font-bold text-primary">{detailInv.currency} {Number(detailInv.amount).toLocaleString()}</div></div>
                </div>
                {detailInv.notes && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Notes</div>
                    <div className="p-3 rounded-lg bg-secondary/40 text-xs whitespace-pre-wrap">{detailInv.notes}</div>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => downloadInvoicePDF(detailInv)} className="gap-2"><FileText className="w-4 h-4" />PDF</Button>
                {detailInv.status !== "paid" && (
                  <Button onClick={() => { markPaid([detailInv.id]); setDetailInv(null); }} className="gap-2"><CheckCircle2 className="w-4 h-4" />Mark Paid</Button>
                )}
                <Button variant="ghost" onClick={() => { setForm(detailInv); setDetailInv(null); setOpen(true); }}>Edit</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncomeManager;
