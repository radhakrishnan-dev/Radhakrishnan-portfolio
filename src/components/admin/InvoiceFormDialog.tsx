import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Eye, MessageCircle, FileDown, Save, Mail, Phone } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD"];
const STATUSES = ["unpaid", "paid", "overdue", "cancelled"];
const INCOME_TYPES = [
  { value: "web_development", label: "Web Development" },
  { value: "graphic_design", label: "Graphic Design" },
  { value: "other", label: "Other" },
];
const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Other"];

export type LineItem = { description: string; qty: number; rate: number };

export type InvoiceMeta = {
  lineItems: LineItem[];
  discount: number;
  gstEnabled: boolean;
  gstPct: number;
  paymentMethod: string;
  notes: string;
};

export type InvoiceFormValue = {
  id?: string;
  invoice_number?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  amount?: number;
  currency?: string;
  status?: string;
  income_type?: string;
  issue_date?: string;
  due_date?: string | null;
  paid_date?: string | null;
  notes?: string | null;
};

type Client = { id: string; name: string; email?: string | null; phone?: string | null; whatsapp?: string | null };
type Project = { id: string; title: string; budget?: number | null; currency?: string | null; client_id?: string | null };

const META_TAG = "<!--INV_META:";
const META_END = ":INV_META-->";

export const buildAutoInvoiceNumber = (existing: { invoice_number: string | null }[]) => {
  const year = new Date().getFullYear();
  const prefix = `KT-${year}-`;
  const max = existing
    .map((i) => i.invoice_number || "")
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
};

export const encodeMeta = (meta: InvoiceMeta): string => {
  return `${meta.notes || ""}\n${META_TAG}${JSON.stringify(meta)}${META_END}`.trim();
};

export const decodeMeta = (notes: string | null | undefined): { meta: InvoiceMeta | null; cleanNotes: string } => {
  if (!notes) return { meta: null, cleanNotes: "" };
  const start = notes.indexOf(META_TAG);
  if (start === -1) return { meta: null, cleanNotes: notes };
  const end = notes.indexOf(META_END, start);
  if (end === -1) return { meta: null, cleanNotes: notes };
  const json = notes.slice(start + META_TAG.length, end);
  try {
    const meta = JSON.parse(json) as InvoiceMeta;
    const cleanNotes = (notes.slice(0, start) + notes.slice(end + META_END.length)).trim();
    return { meta: { ...meta, notes: cleanNotes }, cleanNotes };
  } catch {
    return { meta: null, cleanNotes: notes };
  }
};

const computeTotals = (items: LineItem[], discount: number, gstEnabled: boolean, gstPct: number) => {
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const afterDiscount = Math.max(0, subtotal - (Number(discount) || 0));
  const gst = gstEnabled ? (afterDiscount * gstPct) / 100 : 0;
  const total = afterDiscount + gst;
  return { subtotal, afterDiscount, gst, total };
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: InvoiceFormValue;
  clients: Client[];
  projects: Project[];
  existingInvoices: { invoice_number: string | null }[];
  brandName: string;
  brandEmail?: string;
  brandPhone?: string;
  defaultGstPct: number;
  onSave: (payload: InvoiceFormValue) => Promise<void> | void;
};

const InvoiceFormDialog = ({
  open, onOpenChange, initial, clients, projects, existingInvoices,
  brandName, brandEmail, brandPhone, defaultGstPct, onSave,
}: Props) => {
  const isEdit = !!initial.id;
  const decoded = decodeMeta(initial.notes);

  const [invoiceNumber, setInvoiceNumber] = useState(initial.invoice_number || "");
  const [clientId, setClientId] = useState<string | null>(initial.client_id ?? null);
  const [projectId, setProjectId] = useState<string | null>(initial.project_id ?? null);
  const [currency, setCurrency] = useState(initial.currency || "INR");
  const [status, setStatus] = useState(initial.status || "unpaid");
  const [incomeType, setIncomeType] = useState(initial.income_type || "web_development");
  const [issueDate, setIssueDate] = useState(initial.issue_date || new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(initial.due_date || "");
  const [notes, setNotes] = useState(decoded.meta?.notes ?? decoded.cleanNotes);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    decoded.meta?.lineItems?.length
      ? decoded.meta.lineItems
      : initial.amount && !isEdit === false
        ? [{ description: "Professional services", qty: 1, rate: Number(initial.amount) || 0 }]
        : [{ description: "", qty: 1, rate: 0 }],
  );
  const [discount, setDiscount] = useState<number>(decoded.meta?.discount ?? 0);
  const [gstEnabled, setGstEnabled] = useState<boolean>(decoded.meta?.gstEnabled ?? false);
  const [gstPct, setGstPct] = useState<number>(decoded.meta?.gstPct ?? defaultGstPct);
  const [paymentMethod, setPaymentMethod] = useState<string>(decoded.meta?.paymentMethod ?? "UPI");
  const [previewOpen, setPreviewOpen] = useState(false);

  // Reset when initial changes
  useEffect(() => {
    if (!open) return;
    const d = decodeMeta(initial.notes);
    setInvoiceNumber(initial.invoice_number || (isEdit ? "" : buildAutoInvoiceNumber(existingInvoices)));
    setClientId(initial.client_id ?? null);
    setProjectId(initial.project_id ?? null);
    setCurrency(initial.currency || "INR");
    setStatus(initial.status || "unpaid");
    setIncomeType(initial.income_type || "web_development");
    setIssueDate(initial.issue_date || new Date().toISOString().slice(0, 10));
    setDueDate(initial.due_date || "");
    setNotes(d.meta?.notes ?? d.cleanNotes);
    setLineItems(
      d.meta?.lineItems?.length
        ? d.meta.lineItems
        : [{ description: isEdit ? "Professional services" : "", qty: 1, rate: isEdit ? Number(initial.amount) || 0 : 0 }],
    );
    setDiscount(d.meta?.discount ?? 0);
    setGstEnabled(d.meta?.gstEnabled ?? false);
    setGstPct(d.meta?.gstPct ?? defaultGstPct);
    setPaymentMethod(d.meta?.paymentMethod ?? "UPI");
  }, [open, initial.id]); // eslint-disable-line

  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId) || null, [clients, clientId]);
  const clientProjects = useMemo(
    () => projects.filter((p) => !clientId || !p.client_id || p.client_id === clientId),
    [projects, clientId],
  );
  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId) || null, [projects, projectId]);

  // Auto-fill amount from project budget when project changes (only if first row empty)
  useEffect(() => {
    if (!selectedProject) return;
    if (selectedProject.currency) setCurrency(selectedProject.currency);
    if (selectedProject.budget && selectedProject.budget > 0) {
      setLineItems((prev) => {
        const isEmpty = prev.length === 1 && !prev[0].description && !prev[0].rate;
        if (isEmpty || (prev.length === 1 && prev[0].rate === 0)) {
          return [{ description: selectedProject.title || "Project work", qty: 1, rate: Number(selectedProject.budget) }];
        }
        return prev;
      });
    }
  }, [projectId]); // eslint-disable-line

  const totals = useMemo(() => computeTotals(lineItems, discount, gstEnabled, gstPct), [lineItems, discount, gstEnabled, gstPct]);

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setLineItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => setLineItems((prev) => [...prev, { description: "", qty: 1, rate: 0 }]);
  const removeItem = (idx: number) => setLineItems((prev) => prev.filter((_, i) => i !== idx));

  const fmtMoney = (n: number) => `${currency} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const buildPayload = (): InvoiceFormValue => {
    const meta: InvoiceMeta = { lineItems, discount, gstEnabled, gstPct, paymentMethod, notes };
    return {
      ...initial,
      invoice_number: invoiceNumber || buildAutoInvoiceNumber(existingInvoices),
      client_id: clientId,
      project_id: projectId,
      amount: Number(totals.total.toFixed(2)),
      currency,
      status,
      income_type: incomeType,
      issue_date: issueDate,
      due_date: dueDate || null,
      notes: encodeMeta(meta),
    };
  };

  const generatePDF = (download: boolean) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    // Header
    doc.setFontSize(22);
    doc.setTextColor(20, 184, 166);
    doc.text(brandName, 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(120);
    if (brandEmail) doc.text(brandEmail, 14, 26);
    if (brandPhone) doc.text(brandPhone, 14, 31);

    doc.setFontSize(24);
    doc.setTextColor(40);
    doc.text("INVOICE", pw - 14, 20, { align: "right" });
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`#${invoiceNumber || "—"}`, pw - 14, 27, { align: "right" });
    doc.text(`Issued: ${issueDate}`, pw - 14, 32, { align: "right" });
    if (dueDate) doc.text(`Due: ${dueDate}`, pw - 14, 37, { align: "right" });

    // Bill to
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("BILL TO", 14, 50);
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(selectedClient?.name || "—", 14, 57);
    doc.setFontSize(9);
    doc.setTextColor(100);
    let y = 62;
    if (selectedClient?.email) { doc.text(selectedClient.email, 14, y); y += 5; }
    if (selectedClient?.phone) { doc.text(selectedClient.phone, 14, y); y += 5; }

    autoTable(doc, {
      startY: Math.max(y + 5, 78),
      head: [["Description", "Qty", "Rate", "Total"]],
      body: lineItems.map((it) => [
        it.description || "—",
        String(it.qty),
        Number(it.rate).toLocaleString(),
        Number((it.qty || 0) * (it.rate || 0)).toLocaleString(),
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [20, 184, 166] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    });

    let ty = (doc as any).lastAutoTable.finalY + 8;
    const labelX = pw - 70;
    const valX = pw - 14;
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text("Subtotal:", labelX, ty); doc.text(fmtMoney(totals.subtotal), valX, ty, { align: "right" }); ty += 6;
    if (discount > 0) { doc.text("Discount:", labelX, ty); doc.text(`- ${fmtMoney(discount)}`, valX, ty, { align: "right" }); ty += 6; }
    if (gstEnabled) { doc.text(`GST (${gstPct}%):`, labelX, ty); doc.text(fmtMoney(totals.gst), valX, ty, { align: "right" }); ty += 6; }
    doc.setFontSize(13);
    doc.setTextColor(20, 184, 166);
    doc.text("TOTAL:", labelX, ty + 2);
    doc.text(fmtMoney(totals.total), valX, ty + 2, { align: "right" });

    ty += 16;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Payment method: ${paymentMethod}`, 14, ty);
    doc.text(`Status: ${status.toUpperCase()}`, 14, ty + 5);
    if (notes) {
      doc.text("Notes:", 14, ty + 14);
      doc.text(doc.splitTextToSize(notes, pw - 28), 14, ty + 19);
    }

    if (download) {
      doc.save(`${invoiceNumber || "invoice"}.pdf`);
    } else {
      return doc.output("dataurlstring");
    }
  };

  const sendWhatsApp = () => {
    const phone = (selectedClient?.whatsapp || selectedClient?.phone || "").replace(/\D/g, "");
    const lines = [
      `Hi ${selectedClient?.name || ""},`,
      ``,
      `Here is your invoice ${invoiceNumber} from ${brandName}.`,
      ``,
      ...lineItems.map((it) => `• ${it.description} — ${it.qty} × ${currency} ${it.rate} = ${currency} ${(it.qty * it.rate).toLocaleString()}`),
      ``,
      `Subtotal: ${fmtMoney(totals.subtotal)}`,
      discount > 0 ? `Discount: -${fmtMoney(discount)}` : "",
      gstEnabled ? `GST (${gstPct}%): ${fmtMoney(totals.gst)}` : "",
      `*Total: ${fmtMoney(totals.total)}*`,
      ``,
      `Payment method: ${paymentMethod}`,
      dueDate ? `Due date: ${dueDate}` : "",
      ``,
      `Thank you!`,
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank");
  };

  const handleSave = async () => {
    if (totals.total <= 0) return;
    await onSave(buildPayload());
  };

  const handleSaveAndDownload = async () => {
    if (totals.total <= 0) return;
    generatePDF(true);
    await onSave(buildPayload());
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{isEdit ? "Edit" : "New"} Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Top row: Invoice # + dates + currency */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Invoice #</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="KT-2026-001"
                  className="font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Client + Project */}
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Client</Label>
                <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedClient && (selectedClient.email || selectedClient.phone) && (
                  <div className="mt-2 p-2 rounded-md bg-secondary/40 border border-border/50 text-xs space-y-1">
                    {selectedClient.email && <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="w-3 h-3" />{selectedClient.email}</div>}
                    {selectedClient.phone && <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="w-3 h-3" />{selectedClient.phone}</div>}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs">Project</Label>
                <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {clientProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedProject?.budget ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">Budget: {selectedProject.currency || currency} {Number(selectedProject.budget).toLocaleString()}</p>
                ) : null}
              </div>
            </div>

            {/* Dates + type */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Issue date</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Income type</Label>
                <Select value={incomeType} onValueChange={setIncomeType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INCOME_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Line Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1.5 h-8">
                  <Plus className="w-3.5 h-3.5" />Add row
                </Button>
              </div>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-secondary/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-1 text-right">Qty</div>
                  <div className="col-span-2 text-right">Rate</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1" />
                </div>
                {lineItems.map((it, idx) => {
                  const rowTotal = (Number(it.qty) || 0) * (Number(it.rate) || 0);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center border-t border-border/40">
                      <Input
                        className="col-span-6 h-9"
                        placeholder="Item description"
                        value={it.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                      />
                      <Input
                        className="col-span-1 h-9 text-right"
                        type="number"
                        min={0}
                        value={it.qty}
                        onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                      />
                      <Input
                        className="col-span-2 h-9 text-right"
                        type="number"
                        min={0}
                        value={it.rate}
                        onChange={(e) => updateItem(idx, { rate: Number(e.target.value) })}
                      />
                      <div className="col-span-2 text-right text-sm font-medium">{rowTotal.toLocaleString()}</div>
                      <div className="col-span-1 text-right">
                        <Button
                          type="button" size="icon" variant="ghost"
                          onClick={() => removeItem(idx)}
                          disabled={lineItems.length === 1}
                          className="h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals + payment */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Payment method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea placeholder="Notes / terms" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-secondary/30 p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{fmtMoney(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm gap-2">
                  <span className="text-muted-foreground">Discount</span>
                  <Input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="h-8 w-28 text-right"
                  />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
                    <span className="text-muted-foreground">GST</span>
                    <Input
                      type="number"
                      value={gstPct}
                      onChange={(e) => setGstPct(Number(e.target.value))}
                      className="h-7 w-14 text-xs text-right"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <span className="font-medium">{fmtMoney(totals.gst)}</span>
                </div>
                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">{fmtMoney(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-wrap sm:justify-between">
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)} className="gap-1.5">
                <Eye className="w-4 h-4" />Preview
              </Button>
              <Button
                type="button" variant="outline"
                onClick={sendWhatsApp}
                disabled={!selectedClient?.whatsapp && !selectedClient?.phone}
                className="gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />WhatsApp
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" onClick={handleSaveAndDownload} className="gap-1.5">
                <FileDown className="w-4 h-4" />Save & PDF
              </Button>
              <Button type="button" onClick={handleSave} className="gap-1.5">
                <Save className="w-4 h-4" />Save Invoice
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="sr-only">Invoice preview</DialogTitle>
          </DialogHeader>
          <div className="p-2">
            <div className="flex justify-between items-start pb-6 border-b border-zinc-200">
              <div>
                <div className="text-2xl font-bold text-teal-600">{brandName}</div>
                {brandEmail && <div className="text-xs text-zinc-500 mt-0.5">{brandEmail}</div>}
                {brandPhone && <div className="text-xs text-zinc-500">{brandPhone}</div>}
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold tracking-tight">INVOICE</div>
                <div className="text-sm text-zinc-500 mt-1 font-mono">{invoiceNumber || "—"}</div>
                <div className="text-xs text-zinc-500 mt-1">Issued: {issueDate}</div>
                {dueDate && <div className="text-xs text-zinc-500">Due: {dueDate}</div>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 py-6">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">Bill to</div>
                <div className="font-semibold">{selectedClient?.name || "—"}</div>
                {selectedClient?.email && <div className="text-xs text-zinc-600">{selectedClient.email}</div>}
                {selectedClient?.phone && <div className="text-xs text-zinc-600">{selectedClient.phone}</div>}
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">Status</div>
                <div className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-teal-50 text-teal-700 border border-teal-200">{status}</div>
                <div className="text-xs text-zinc-500 mt-2">Payment: {paymentMethod}</div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="text-left p-2.5 font-semibold">Description</th>
                  <th className="text-right p-2.5 font-semibold w-16">Qty</th>
                  <th className="text-right p-2.5 font-semibold w-28">Rate</th>
                  <th className="text-right p-2.5 font-semibold w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((it, i) => (
                  <tr key={i} className="border-b border-zinc-200">
                    <td className="p-2.5">{it.description || "—"}</td>
                    <td className="p-2.5 text-right">{it.qty}</td>
                    <td className="p-2.5 text-right">{Number(it.rate).toLocaleString()}</td>
                    <td className="p-2.5 text-right">{Number((it.qty || 0) * (it.rate || 0)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mt-4">
              <div className="w-72 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-zinc-500">Subtotal</span><span>{fmtMoney(totals.subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between"><span className="text-zinc-500">Discount</span><span>- {fmtMoney(discount)}</span></div>}
                {gstEnabled && <div className="flex justify-between"><span className="text-zinc-500">GST ({gstPct}%)</span><span>{fmtMoney(totals.gst)}</span></div>}
                <div className="flex justify-between border-t border-zinc-300 pt-2 font-bold text-lg">
                  <span>Total</span><span className="text-teal-600">{fmtMoney(totals.total)}</span>
                </div>
              </div>
            </div>

            {notes && (
              <div className="mt-6 pt-4 border-t border-zinc-200">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">Notes</div>
                <div className="text-xs text-zinc-600 whitespace-pre-wrap">{notes}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button onClick={() => generatePDF(true)} className="gap-1.5"><FileDown className="w-4 h-4" />Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoiceFormDialog;
