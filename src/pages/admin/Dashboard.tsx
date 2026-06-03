import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FolderKanban, Sparkles, MessageSquare, Briefcase, Mail,
  TrendingUp, DollarSign, TrendingDown, Wallet, CheckCircle2,
  Clock, AlertCircle, Users, Receipt, CalendarRange, ArrowUpRight,
  ArrowDownRight, Activity, Globe, Bell, MessageCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Legend,
  LineChart, Line,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { useEffect, useMemo, useState } from "react";

const PIE_COLORS = [
  "hsl(174, 72%, 45%)",
  "hsl(220, 70%, 60%)",
  "hsl(340, 75%, 60%)",
  "hsl(40, 85%, 60%)",
  "hsl(280, 65%, 65%)",
];

const BASE_CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "INR", "AUD", "CAD", "AED", "SGD", "JPY"];
const BASE_CURRENCY_KEY = "dashboard.baseCurrency";

type CurrencyTotals = Record<string, number>;

const sumByCurrency = (rows: any[], amountKey = "amount"): CurrencyTotals => {
  const m: CurrencyTotals = {};
  rows.forEach((r) => {
    const c = (r.currency || "USD").toUpperCase();
    m[c] = (m[c] || 0) + (Number(r[amountKey]) || 0);
  });
  return m;
};

const formatCurrencyAmount = (currency: string, value: number) =>
  `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const Dashboard = () => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(todayStr);
  const [activePreset, setActivePreset] = useState("This month");

  // Base currency (persisted)
  const [baseCurrency, setBaseCurrency] = useState<string>(() => {
    if (typeof window === "undefined") return "USD";
    return localStorage.getItem(BASE_CURRENCY_KEY) || "USD";
  });
  useEffect(() => {
    try { localStorage.setItem(BASE_CURRENCY_KEY, baseCurrency); } catch {}
  }, [baseCurrency]);

  // Exchange rates: rates relative to USD. Free, no key.
  const { data: ratesData, isLoading: ratesLoading, isError: ratesError } = useQuery({
    queryKey: ["fx-rates-usd"],
    queryFn: async () => {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!res.ok) throw new Error("FX fetch failed");
      const json = await res.json();
      if (json.result !== "success") throw new Error("FX provider error");
      return { rates: json.rates as Record<string, number>, updatedAt: json.time_last_update_utc as string };
    },
    staleTime: 12 * 60 * 60 * 1000, // 12h
    retry: 1,
  });

  // Convert amount from `currency` into `baseCurrency` using USD as pivot.
  const convert = useMemo(() => {
    const rates = ratesData?.rates;
    return (amount: number, currency: string): number => {
      const cur = (currency || "USD").toUpperCase();
      if (cur === baseCurrency) return amount;
      if (!rates) return amount; // fallback: treat same currency
      const rFrom = rates[cur];          // USD -> from
      const rBase = rates[baseCurrency]; // USD -> base
      if (!rFrom || !rBase) return amount;
      // amount in 'cur' -> USD = amount / rFrom; then -> base = * rBase
      return (amount / rFrom) * rBase;
    };
  }, [ratesData, baseCurrency]);

  const normalize = (rows: any[], dateKey?: string) =>
    rows.reduce((s, r) => s + convert(Number(r.amount) || 0, r.currency || "USD"), 0);

  const presets = [
    { label: "This month", from: monthStart, to: todayStr },
    { label: "Last 30 days", from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), to: todayStr },
    { label: "This year", from: `${today.getFullYear()}-01-01`, to: todayStr },
    { label: "All time", from: "1970-01-01", to: todayStr },
  ];

  const { data: counts } = useQuery({
    queryKey: ["dash-counts"],
    queryFn: async () => {
      const [pj, sk, sv, ts, cl] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("skills").select("*", { count: "exact", head: true }),
        supabase.from("services").select("*", { count: "exact", head: true }),
        supabase.from("testimonials").select("*", { count: "exact", head: true }),
        (supabase as any).from("clients").select("*", { count: "exact", head: true }),
      ]);
      return { projects: pj.count || 0, skills: sk.count || 0, services: sv.count || 0, testimonials: ts.count || 0, clients: cl.count || 0 };
    },
  });

  const { data: clientProjects = [] } = useQuery({
    queryKey: ["dash-client-projects"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("client_projects").select("id, title, status, progress, deadline, currency, budget");
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["dash-invoices"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("invoices").select("id, invoice_number, client_id, amount, status, currency, income_type, issue_date, paid_date, due_date");
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["dash-expenses"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("project_expenses").select("amount, currency, category, expense_date");
      return data || [];
    },
  });

  const { data: messagesData } = useQuery({
    queryKey: ["messages-stats"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("contact_messages").select("is_read, created_at");
      const messages = data || [];
      return { total: messages.length, unread: messages.filter((m: any) => !m.is_read).length };
    },
  });

  const { data: recentLogs } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const res = await (supabase as any).from("admin_activity_logs").select("action_type, entity_type, entity_name, created_at, admin_email").order("created_at", { ascending: false }).limit(6);
      return res.data || [];
    },
  });

  const stats = useMemo(() => {
    const now = new Date();
    const inRange = (d?: string | null) => !!d && d >= fromDate && d <= toDate;

    // Previous period (same length, immediately before)
    const fromD = new Date(fromDate);
    const toD = new Date(toDate);
    const periodMs = toD.getTime() - fromD.getTime();
    const prevToD = new Date(fromD.getTime() - 86400000);
    const prevFromD = new Date(prevToD.getTime() - periodMs);
    const prevFrom = prevFromD.toISOString().slice(0, 10);
    const prevTo = prevToD.toISOString().slice(0, 10);
    const inPrev = (d?: string | null) => !!d && d >= prevFrom && d <= prevTo;

    const paidAll = invoices.filter((i: any) => i.status === "paid");
    const rangePaid = paidAll.filter((i: any) => inRange(i.paid_date || i.issue_date));
    const rangeExpenses = expenses.filter((e: any) => inRange(e.expense_date));
    const prevPaid = paidAll.filter((i: any) => inPrev(i.paid_date || i.issue_date));
    const prevExpenses = expenses.filter((e: any) => inPrev(e.expense_date));
    const outstanding = invoices.filter((i: any) => i.status !== "paid" && i.status !== "cancelled");

    // Per-currency breakdown (kept for chips / transparency)
    const incomeByCurrency = sumByCurrency(rangePaid);
    const expenseByCurrency = sumByCurrency(rangeExpenses);
    const outstandingByCurrency = sumByCurrency(outstanding);

    // Normalized (single base-currency totals)
    const incomeNorm = normalize(rangePaid);
    const expenseNorm = normalize(rangeExpenses);
    const outstandingNorm = normalize(outstanding);
    const profitNorm = incomeNorm - expenseNorm;
    const incomePrevNorm = normalize(prevPaid);
    const expensePrevNorm = normalize(prevExpenses);
    const profitPrevNorm = incomePrevNorm - expensePrevNorm;

    const pct = (n: number, p: number) => {
      if (!p) return n > 0 ? 100 : 0;
      return ((n - p) / Math.abs(p)) * 100;
    };

    const overdueCount = invoices.filter((i: any) =>
      i.status === "overdue" || (i.status !== "paid" && i.status !== "cancelled" && i.due_date && new Date(i.due_date) < now)
    ).length;

    const completed = clientProjects.filter((p: any) => p.status === "done").length;
    const current = clientProjects.filter((p: any) => ["in_progress", "review", "lead"].includes(p.status)).length;
    const onHold = clientProjects.filter((p: any) => p.status === "on_hold").length;

    // 6-month trend (normalized to base currency)
    const months: { month: string; income: number; expense: number; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString("en", { month: "short" });
      const incRows = paidAll.filter((x: any) => (x.paid_date || x.issue_date)?.startsWith(key));
      const expRows = expenses.filter((x: any) => x.expense_date?.startsWith(key));
      const inc = normalize(incRows);
      const exp = normalize(expRows);
      months.push({ month: label, income: inc, expense: exp, profit: inc - exp });
    }

    const outstandingSpark = months.map((m, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = d.toISOString().slice(0, 7);
      const rows = invoices.filter((x: any) => x.status !== "paid" && x.status !== "cancelled" && x.issue_date?.startsWith(key));
      return { month: m.month, value: normalize(rows) };
    });

    // Income by type (normalized)
    const byType: Record<string, number> = {};
    rangePaid.forEach((i: any) => {
      const k = (i.income_type || "other").replace("_", " ");
      byType[k] = (byType[k] || 0) + convert(Number(i.amount), i.currency || "USD");
    });
    const incomeByType = Object.entries(byType).map(([name, value]) => ({ name, value }));
    const incomeByTypeTotal = incomeByType.reduce((s, x) => s + x.value, 0);

    // Recent transactions: last 6 paid invoices + expenses combined
    const txInvoices = rangePaid.map((i: any) => ({
      kind: "income" as const,
      label: i.invoice_number || "Invoice",
      amount: Number(i.amount),
      currency: i.currency || "USD",
      normalized: convert(Number(i.amount), i.currency || "USD"),
      date: i.paid_date || i.issue_date,
      sub: (i.income_type || "").replace("_", " "),
    }));
    const txExpenses = rangeExpenses.map((e: any) => ({
      kind: "expense" as const,
      label: e.category || "Expense",
      amount: Number(e.amount),
      currency: e.currency || "USD",
      normalized: convert(Number(e.amount), e.currency || "USD"),
      date: e.expense_date,
      sub: "Expense",
    }));
    const recentTx = [...txInvoices, ...txExpenses]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 6);

    return {
      incomeByCurrency, expenseByCurrency, outstandingByCurrency,
      incomeNorm, expenseNorm, outstandingNorm, profitNorm,
      overdueCount, completed, current, onHold, months, incomeByType, incomeByTypeTotal,
      outstandingSpark, recentTx,
      changes: {
        income: pct(incomeNorm, incomePrevNorm),
        expense: pct(expenseNorm, expensePrevNorm),
        profit: pct(profitNorm, profitPrevNorm),
      },
    };
  }, [invoices, expenses, clientProjects, fromDate, toDate, convert]);

  const { data: followUpClients = [] } = useQuery({
    queryKey: ["dash-follow-ups"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("clients")
        .select("id, name, company, phone, whatsapp, notes, follow_up_date")
        .not("follow_up_date", "is", null)
        .order("follow_up_date", { ascending: true });
      return data || [];
    },
  });

  const followUps = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const horizon = new Date(today.getTime() + 30 * 86400000);
    return (followUpClients as any[])
      .filter((c) => {
        const d = new Date(c.follow_up_date);
        return d <= horizon;
      })
      .slice(0, 8);
  }, [followUpClients]);

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    return clientProjects
      .filter((p: any) => p.deadline && p.status !== "done" && new Date(p.deadline) >= now)
      .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);
  }, [clientProjects]);

  type HeroStat = {
    title: string;
    normalized: number;
    breakdown: CurrencyTotals;
    icon: typeof TrendingUp;
    accent: string;
    tint: string;
    iconBg: string;
    iconColor: string;
    change?: number;
    sparkData: { v: number }[];
    sub?: string;
    isProfit?: boolean;
  };

  // Profit breakdown across currencies (for chips on profit card)
  const profitBreakdown: CurrencyTotals = useMemo(() => {
    const out: CurrencyTotals = {};
    new Set([...Object.keys(stats.incomeByCurrency), ...Object.keys(stats.expenseByCurrency)]).forEach((c) => {
      out[c] = (stats.incomeByCurrency[c] || 0) - (stats.expenseByCurrency[c] || 0);
    });
    return out;
  }, [stats.incomeByCurrency, stats.expenseByCurrency]);

  const heroStats: HeroStat[] = [
    {
      title: "Income",
      normalized: stats.incomeNorm,
      breakdown: stats.incomeByCurrency,
      icon: TrendingUp,
      accent: "hsl(174, 72%, 45%)",
      tint: "from-primary/15 via-primary/5 to-transparent",
      iconBg: "bg-primary/15",
      iconColor: "text-primary",
      change: stats.changes.income,
      sparkData: stats.months.map((m) => ({ v: m.income })),
    },
    {
      title: "Expense",
      normalized: stats.expenseNorm,
      breakdown: stats.expenseByCurrency,
      icon: TrendingDown,
      accent: "hsl(0, 75%, 60%)",
      tint: "from-rose-500/15 via-rose-500/5 to-transparent",
      iconBg: "bg-rose-500/15",
      iconColor: "text-rose-400",
      change: stats.changes.expense,
      sparkData: stats.months.map((m) => ({ v: m.expense })),
    },
    {
      title: "Net Profit",
      normalized: stats.profitNorm,
      breakdown: profitBreakdown,
      icon: Wallet,
      accent: "hsl(142, 70%, 50%)",
      tint: "from-emerald-500/15 via-emerald-500/5 to-transparent",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
      change: stats.changes.profit,
      sparkData: stats.months.map((m) => ({ v: m.profit })),
      isProfit: true,
    },
    {
      title: "Outstanding",
      normalized: stats.outstandingNorm,
      breakdown: stats.outstandingByCurrency,
      icon: AlertCircle,
      accent: "hsl(35, 90%, 55%)",
      tint: "from-amber-500/15 via-amber-500/5 to-transparent",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-400",
      sparkData: stats.outstandingSpark.map((x) => ({ v: x.value })),
      sub: stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : undefined,
    },
  ];

  const projStats = [
    { title: "Current Projects", value: stats.current, icon: Clock, accent: "hsl(220 70% 60%)" },
    { title: "Completed", value: stats.completed, icon: CheckCircle2, accent: "hsl(142 70% 50%)" },
    { title: "Clients", value: counts?.clients ?? 0, icon: Users, accent: "hsl(280 65% 65%)" },
    { title: "Portfolio Projects", value: counts?.projects ?? 0, icon: FolderKanban, accent: "hsl(190 80% 55%)" },
    { title: "Services", value: counts?.services ?? 0, icon: Briefcase, accent: "hsl(25 90% 60%)" },
    { title: "Skills", value: counts?.skills ?? 0, icon: Sparkles, accent: "hsl(330 75% 65%)" },
    { title: "Testimonials", value: counts?.testimonials ?? 0, icon: MessageSquare, accent: "hsl(250 70% 65%)" },
    { title: "Messages", value: messagesData?.total ?? 0, icon: Mail, accent: "hsl(174 72% 45%)", sub: (messagesData?.unread ?? 0) > 0 ? `${messagesData?.unread} unread` : undefined },
  ];

  const ratesUpdated = ratesData?.updatedAt
    ? new Date(ratesData.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })
    : null;

  return (
    <div className="space-y-8">
      {/* Header + filters */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live overview · all amounts normalized to <span className="text-primary font-semibold">{baseCurrency}</span>
            {ratesUpdated && <span className="opacity-60"> · rates as of {ratesUpdated}</span>}
            {ratesError && <span className="text-destructive"> · rates unavailable, showing raw amounts</span>}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {/* Base currency selector */}
            <div className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-secondary/60 border border-border/60 backdrop-blur">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Base</span>
              <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                <SelectTrigger className="h-7 w-[78px] text-xs font-semibold border-0 bg-transparent focus:ring-0 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BASE_CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date presets pill */}
            <div className="inline-flex p-1 rounded-full bg-secondary/60 border border-border/60 backdrop-blur">
              {presets.map((p) => {
                const isActive = activePreset === p.label;
                return (
                  <button
                    key={p.label}
                    onClick={() => { setFromDate(p.from); setToDate(p.to); setActivePreset(p.label); }}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[0_0_18px_-4px_hsl(var(--primary))]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CalendarRange className="w-3.5 h-3.5 text-primary" />
            <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setActivePreset(""); }} className="w-[130px] h-7 text-[11px] px-2" />
            <span>→</span>
            <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setActivePreset(""); }} className="w-[130px] h-7 text-[11px] px-2" />
          </div>
        </div>
      </div>

      {/* Hero finance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {heroStats.map((s) => {
          const breakdownEntries = Object.entries(s.breakdown)
            .filter(([, v]) => v !== 0)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
          const negative = s.isProfit && s.normalized < 0;
          const change = s.change;
          const isUp = (change ?? 0) >= 0;
          const mixed = breakdownEntries.length > 1;
          return (
            <Card
              key={s.title}
              className="group relative overflow-hidden rounded-2xl border-border/60 bg-card/70 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_50px_-20px_hsl(var(--primary)/0.45)]"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${s.tint} pointer-events-none`} />
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-30 blur-3xl" style={{ background: s.accent }} />
              <CardContent className="relative p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{s.title}</p>
                      {mixed && (
                        <span title="Converted from multiple currencies" className="text-[9px] font-semibold text-primary/80 uppercase tracking-wider">
                          ≈
                        </span>
                      )}
                    </div>
                    <p className={`mt-2 text-2xl md:text-[1.7rem] font-bold tracking-tight tabular-nums ${negative ? "text-destructive" : ""}`}>
                      {formatCurrencyAmount(baseCurrency, s.normalized)}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${s.iconBg} ${s.iconColor} flex items-center justify-center ring-1 ring-inset ring-white/5`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    {change !== undefined && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold w-fit ${
                          isUp ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                        }`}
                      >
                        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(change).toFixed(0)}% vs prev
                      </span>
                    )}
                    {mixed && (
                      <div className="flex flex-wrap gap-1">
                        {breakdownEntries.slice(0, 3).map(([c, v]) => (
                          <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-full bg-background/60 text-foreground/70 font-medium tabular-nums">
                            {formatCurrencyAmount(c, v)}
                          </span>
                        ))}
                      </div>
                    )}
                    {s.sub && <span className="text-[10px] text-destructive font-medium">{s.sub}</span>}
                  </div>

                  <div className="w-24 h-10 -mr-1 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={s.sparkData}>
                        <Line type="monotone" dataKey="v" stroke={s.accent} strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick stats */}
      <div className="-mx-1">
        <div className="flex gap-3 overflow-x-auto pb-2 px-1 snap-x">
          {projStats.map((s) => (
            <div
              key={s.title}
              className="snap-start shrink-0 w-[170px] rounded-xl border border-border/60 bg-card/60 backdrop-blur p-4 hover:border-primary/40 hover:shadow-[0_0_25px_-10px_hsl(var(--primary)/0.5)] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: s.accent.replace(")", " / 0.15)"), color: s.accent }}
                >
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-bold tabular-nums leading-none">{s.value}</div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-1">{s.title}</div>
                </div>
              </div>
              {s.sub && <div className="text-[10px] text-primary mt-2 font-medium">{s.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-border/60 bg-card/70 backdrop-blur lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="w-4 h-4 text-primary" /> Income vs Expenses
              </CardTitle>
              <Badge variant="outline" className="text-[10px] border-border/60">Last 6 months · {baseCurrency}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">All values converted to {baseCurrency} using live FX rates.</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.months} margin={{ left: -10, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(174, 72%, 45%)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="hsl(174, 72%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 75%, 62%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(0, 75%, 62%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v: number) => formatCurrencyAmount(baseCurrency, v)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="income" stroke="hsl(174, 72%, 45%)" fill="url(#inc)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="expense" stroke="hsl(0, 75%, 62%)" fill="url(#exp)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-card/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="w-4 h-4 text-primary" /> Income by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            {stats.incomeByType.length > 0 ? (
              <>
                <div className="relative w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.incomeByType}
                        cx="50%" cy="50%"
                        innerRadius={62} outerRadius={92}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      >
                        {stats.incomeByType.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrencyAmount(baseCurrency, v)} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</span>
                    <span className="text-xl font-bold tabular-nums">
                      {formatCurrencyAmount(baseCurrency, stats.incomeByTypeTotal)}
                    </span>
                  </div>
                </div>
                <div className="w-full mt-3 space-y-1.5">
                  {stats.incomeByType.map((t, i) => (
                    <div key={t.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 capitalize">
                        <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        {t.name}
                      </div>
                      <span className="font-semibold tabular-nums">
                        {formatCurrencyAmount(baseCurrency, t.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm py-12">No income in selected period</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card className="rounded-2xl border-border/60 bg-card/70 backdrop-blur">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-primary" /> Recent Transactions
          </CardTitle>
          <Badge variant="outline" className="text-[10px] border-border/60">In selected period</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentTx.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">No transactions in the selected period.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {stats.recentTx.map((tx, i) => {
                const isIncome = tx.kind === "income";
                const isConverted = tx.currency.toUpperCase() !== baseCurrency;
                return (
                  <div key={i} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isIncome ? "bg-primary/15 text-primary" : "bg-rose-500/15 text-rose-400"
                        }`}
                      >
                        {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{tx.label}</p>
                        <p className="text-[11px] text-muted-foreground capitalize truncate">{tx.sub} · {tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold tabular-nums ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
                        {isIncome ? "+" : "−"}{formatCurrencyAmount(tx.currency, tx.amount)}
                      </div>
                      {isConverted && (
                        <div className="text-[10px] text-muted-foreground tabular-nums">
                          ≈ {formatCurrencyAmount(baseCurrency, tx.normalized)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Follow-Up Reminders */}
      <Card className="rounded-2xl border-border/60 bg-card/70 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-amber-400" /> Follow-Up Reminders
            {followUps.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-2 text-[10px]">{followUps.length}</Badge>
            )}
          </CardTitle>
          <Link to="/admin/clients" className="text-xs text-muted-foreground hover:text-primary">View all</Link>
        </CardHeader>
        <CardContent>
          {followUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No follow-ups scheduled in the next 30 days.</p>
          ) : (
            <div className="space-y-2">
              {followUps.map((c: any) => {
                const due = new Date(c.follow_up_date);
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
                const overdue = days < 0;
                const isToday = days === 0;
                const tone = overdue
                  ? "border-rose-500/40 bg-rose-500/10"
                  : isToday
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-border/60 bg-secondary/30";
                const label = overdue
                  ? `Overdue · ${Math.abs(days)}d`
                  : isToday
                  ? "Today"
                  : `In ${days}d`;
                const labelTone = overdue ? "text-rose-400" : isToday ? "text-amber-400" : "text-muted-foreground";
                const wa = (c.whatsapp || c.phone || "").replace(/\D/g, "");
                return (
                  <div key={c.id} className={`flex items-start gap-3 p-3 rounded-xl border ${tone}`}>
                    <Bell className={`w-4 h-4 mt-0.5 shrink-0 ${labelTone}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/admin/clients/${c.id}`} className="text-sm font-semibold truncate hover:text-primary">
                          {c.name}
                        </Link>
                        {c.company && <span className="text-xs text-muted-foreground truncate">· {c.company}</span>}
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${labelTone}`}>{label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {due.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {c.notes && (
                        <p className="text-xs text-foreground/80 mt-1 line-clamp-2">{c.notes}</p>
                      )}
                    </div>
                    {wa && (
                      <a
                        href={`https://wa.me/${wa}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deadlines + Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-border/60 bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4 text-amber-400" /> Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((p: any) => {
                  const days = Math.ceil((new Date(p.deadline).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <Progress value={p.progress || 0} className="h-1.5 mt-1.5" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{p.deadline}</p>
                        <p className={`text-xs font-semibold ${days < 7 ? "text-destructive" : days < 14 ? "text-amber-400" : "text-muted-foreground"}`}>{days}d left</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {(recentLogs?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground text-sm">No recent activity</p>
            ) : (
              <div className="space-y-2.5">
                {recentLogs?.map((log: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">
                        <span className="font-medium capitalize">{log.action_type.replace(/_/g, " ")}</span>
                        {log.entity_name && <span className="text-muted-foreground"> — {log.entity_name}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{log.admin_email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
