// ─── String helpers ────────────────────────────────────────────────────────────

/** Return 1-2 uppercase initials from a full name. */
export function initials(name: string | null | undefined): string {
  return (name || "U")
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Number helpers ────────────────────────────────────────────────────────────

/** Format a number as USD currency. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compact large numbers: 1500 → "1.5K". */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/**
 * Groups an array of items by their month (last 6 months).
 * @param items   Array of objects with a date field.
 * @param dateKey The key that holds the ISO date string.
 * @returns Array of { month: "Jan", count: number } for the last 6 months.
 */
export function groupByMonth(
  items: Record<string, any>[],
  dateKey: string
): { month: string; count: number }[] {
  const now = new Date();
  const counts: Record<string, number> = {};

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    counts[`${d.getFullYear()}-${d.getMonth()}`] = 0;
  }

  for (const item of items) {
    const d = new Date(item[dateKey]);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key in counts) counts[key]++;
  }

  return Object.entries(counts).map(([key, count]) => ({
    month: MONTHS[Number(key.split("-")[1])],
    count,
  }));
}

/** Format an ISO date string to a readable short date: "Apr 12, 2025". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
