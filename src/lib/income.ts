// Pure helpers for income/invoice aggregation. Kept framework-free so they
// can be unit tested in isolation.

export type InvoiceLike = {
  status: string;
  amount: number | string;
  paid_date?: string | null;
  issue_date?: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Local-time YYYY-MM key for a Date. Avoids UTC drift from toISOString(). */
export const ymKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** Local-time YYYY key for a Date. */
export const yKey = (d: Date) => String(d.getFullYear());

/**
 * The date on which an invoice counts as income.
 * Prefer paid_date; only fall back to issue_date when paid_date is missing.
 * The returned string is the raw YYYY-MM-DD prefix — comparisons stay in
 * the invoice's stored calendar date and are not shifted by the viewer's
 * timezone.
 */
export const incomeDate = (i: InvoiceLike): string =>
  ((i.paid_date || i.issue_date) ?? "").slice(0, 10);

/** Sum of paid invoices whose income date falls in the given YYYY-MM key. */
export const sumInMonth = (invoices: InvoiceLike[], monthKey: string): number =>
  invoices
    .filter((i) => i.status === "paid" && incomeDate(i).slice(0, 7) === monthKey)
    .reduce((s, i) => s + Number(i.amount), 0);

/** Sum of paid invoices whose income date falls in the given YYYY key. */
export const sumInYear = (invoices: InvoiceLike[], yearKey: string): number =>
  invoices
    .filter((i) => i.status === "paid" && incomeDate(i).slice(0, 4) === yearKey)
    .reduce((s, i) => s + Number(i.amount), 0);
