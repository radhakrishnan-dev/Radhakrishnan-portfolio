import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ymKey, incomeDate, sumInMonth, sumInYear, type InvoiceLike } from "./income";

/**
 * Build a Date that represents the given local-time wall clock.
 * The Date itself is a UTC instant; what we control here is what
 * getFullYear/getMonth/getDate return in the current process timezone.
 */
const localDate = (y: number, m: number, d: number, h = 12) =>
  new Date(y, m - 1, d, h);

describe("incomeDate", () => {
  it("prefers paid_date over issue_date", () => {
    expect(
      incomeDate({ status: "paid", amount: 1, issue_date: "2026-04-28", paid_date: "2026-05-03" }),
    ).toBe("2026-05-03");
  });

  it("falls back to issue_date when paid_date is missing", () => {
    expect(
      incomeDate({ status: "paid", amount: 1, issue_date: "2026-05-10", paid_date: null }),
    ).toBe("2026-05-10");
  });

  it("returns the raw YYYY-MM-DD prefix without timezone shifting", () => {
    // A date stored as 2026-05-31 must never become 2026-06-01 just
    // because the viewer is in a forward timezone (e.g. Asia/Kolkata).
    expect(incomeDate({ status: "paid", amount: 1, paid_date: "2026-05-31" })).toBe("2026-05-31");
    expect(incomeDate({ status: "paid", amount: 1, paid_date: "2026-06-01" })).toBe("2026-06-01");
  });
});

describe("sumInMonth — current month filter never bleeds in previous-month invoices", () => {
  const invoices: InvoiceLike[] = [
    { status: "paid", amount: 100, paid_date: "2026-04-30" }, // previous month
    { status: "paid", amount: 200, paid_date: "2026-05-01" }, // current month boundary
    { status: "paid", amount: 300, paid_date: "2026-05-15" }, // current month
    { status: "paid", amount: 400, paid_date: "2026-05-31" }, // current month boundary
    { status: "paid", amount: 500, paid_date: "2026-06-01" }, // next month
    { status: "unpaid", amount: 999, paid_date: "2026-05-15" }, // ignored: unpaid
    { status: "paid", amount: 50, issue_date: "2026-04-20", paid_date: null }, // unpaid-but-status-paid edge: counted by issue_date in prev month
  ];

  it("includes only invoices whose paid_date is in the current month", () => {
    expect(sumInMonth(invoices, "2026-05")).toBe(200 + 300 + 400);
  });

  it("excludes the last day of the previous month", () => {
    const may = sumInMonth(invoices, "2026-05");
    expect(may).not.toContain;
    expect(may).toBe(900);
    // explicitly: the April 30 invoice must not appear in May totals
    expect(may).toBeLessThan(900 + 100);
  });

  it("excludes the first day of the next month", () => {
    expect(sumInMonth(invoices, "2026-05")).toBe(900);
    expect(sumInMonth(invoices, "2026-06")).toBe(500);
  });

  it("ignores invoices that are not marked paid", () => {
    const allPaid = sumInMonth(invoices, "2026-05");
    // the unpaid 999 row is in May but must not be counted
    expect(allPaid).toBe(900);
  });
});

describe("ymKey — local-time month key, not UTC", () => {
  const realTZ = process.env.TZ;
  afterEach(() => {
    process.env.TZ = realTZ;
    vi.useRealTimers();
  });

  it("returns the local month even when UTC has already rolled over (IST midnight edge)", () => {
    // 2026-06-01 00:30 IST  ==  2026-05-31 19:00 UTC
    // toISOString().slice(0,7) would return "2026-05" — wrong for an IST user.
    // ymKey must return "2026-06".
    process.env.TZ = "Asia/Kolkata";
    const istJustAfterMidnight = new Date("2026-05-31T19:00:00Z");
    expect(ymKey(istJustAfterMidnight)).toBe("2026-06");
  });

  it("returns the local month for a viewer behind UTC (Los Angeles late evening)", () => {
    // 2026-05-31 22:00 PDT == 2026-06-01 05:00 UTC
    // toISOString would say June; ymKey must stay in May for the LA user.
    process.env.TZ = "America/Los_Angeles";
    const laLateMay = new Date("2026-06-01T05:00:00Z");
    expect(ymKey(laLateMay)).toBe("2026-05");
  });

  it("agrees with a paid_date stored as the local calendar date", () => {
    // Regression: an invoice paid on 2026-05-31 in IST must land in the
    // May bucket no matter how close to midnight UTC the dashboard is loaded.
    process.env.TZ = "Asia/Kolkata";
    const now = new Date("2026-05-31T20:00:00Z"); // 2026-06-01 01:30 IST
    const currentMonth = ymKey(now); // "2026-06" locally
    const prevMonth = ymKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const invoices: InvoiceLike[] = [
      { status: "paid", amount: 1000, paid_date: "2026-05-31" },
      { status: "paid", amount: 2000, paid_date: "2026-06-01" },
    ];
    // The May 31 invoice belongs to last month, not current.
    expect(sumInMonth(invoices, currentMonth)).toBe(2000);
    expect(sumInMonth(invoices, prevMonth)).toBe(1000);
  });
});

describe("sumInYear", () => {
  const invoices: InvoiceLike[] = [
    { status: "paid", amount: 100, paid_date: "2025-12-31" },
    { status: "paid", amount: 200, paid_date: "2026-01-01" },
    { status: "paid", amount: 300, paid_date: "2026-11-15" },
  ];
  it("groups by the paid_date year, not the issue_date year", () => {
    expect(sumInYear(invoices, "2025")).toBe(100);
    expect(sumInYear(invoices, "2026")).toBe(500);
  });
});
