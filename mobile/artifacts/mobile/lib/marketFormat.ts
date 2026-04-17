import type { CountryCatalogItem, RoleMarketRow } from "@/lib/api/mobileApi";

export function formatCurrencyValue(value: number | null | undefined, currency?: string | null) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
    return "Unavailable";
  }

  const amount = Number(value);
  const resolvedCurrency = String(currency || "").trim().toUpperCase() || "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: resolvedCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${resolvedCurrency} ${Math.round(amount).toLocaleString("en-US")}`;
  }
}

export function formatJobCount(value: number | null | undefined) {
  if (!Number.isFinite(Number(value)) || Number(value) < 0) {
    return "Unavailable";
  }

  return Number(value).toLocaleString("en-US");
}

export function formatCollectedAt(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function buildMarketSummary(
  roleName: string,
  country: CountryCatalogItem | null | undefined,
  market: RoleMarketRow | null | undefined
) {
  if (!market) {
    return null;
  }

  const countryLabel = country?.name || market.country_name || market.country_code;
  const salaryText = formatCurrencyValue(market.avg_salary, market.currency);
  const demandText = formatJobCount(market.job_count);

  if (salaryText !== "Unavailable" && demandText !== "Unavailable") {
    return `${roleName} in ${countryLabel} currently averages ${salaryText} across ${demandText} live openings.`;
  }

  if (salaryText !== "Unavailable") {
    return `${roleName} in ${countryLabel} currently averages ${salaryText}.`;
  }

  if (demandText !== "Unavailable") {
    return `${roleName} in ${countryLabel} currently shows ${demandText} live openings.`;
  }

  return null;
}

export function resolveFreshnessLabel(market: RoleMarketRow | null | undefined) {
  if (!market?.collected_at) {
    return null;
  }

  return `Updated ${formatCollectedAt(market.collected_at)}`;
}
