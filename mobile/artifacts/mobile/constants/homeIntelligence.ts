import { IT_TARGET_ROLES } from "@/constants/profileOptions";

export type HomeRoleOption = {
  id: string;
  label: string;
  icon: string;
};

export type HomeCountryOption = {
  code: string;
  label: string;
  shortLabel: string;
};

export const HOME_ROLE_OPTIONS: HomeRoleOption[] = [
  { id: "backend-engineer", label: "Backend Engineer", icon: "server" },
  { id: "frontend-engineer", label: "Frontend Engineer", icon: "layout" },
  { id: "ai-engineer", label: "AI Engineer", icon: "cpu" },
  { id: "data-analyst", label: "Data Analyst", icon: "bar-chart-2" },
  { id: "devops-engineer", label: "DevOps Engineer", icon: "cloud-lightning" },
  { id: "data-engineer", label: "Data Engineer", icon: "database" },
];

export const HOME_COUNTRY_OPTIONS: HomeCountryOption[] = [
  { code: "US", label: "United States", shortLabel: "US" },
  { code: "DE", label: "Germany", shortLabel: "Germany" },
  { code: "FR", label: "France", shortLabel: "France" },
  { code: "GB", label: "United Kingdom", shortLabel: "UK" },
  { code: "NL", label: "Netherlands", shortLabel: "Netherlands" },
  { code: "CA", label: "Canada", shortLabel: "Canada" },
  { code: "SG", label: "Singapore", shortLabel: "Singapore" },
  { code: "AE", label: "United Arab Emirates", shortLabel: "UAE" },
];

export const DEFAULT_HOME_COUNTRY_CODES = ["FR", "DE", "GB", "NL"] as const;
export const MIN_HOME_COUNTRIES = 4;
export const MAX_HOME_COUNTRIES = 8;

const SUPPORTED_ROLE_LABELS = new Set(HOME_ROLE_OPTIONS.map((role) => role.label));

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function sortCountryCodes(codes: string[]) {
  const order = new Map(HOME_COUNTRY_OPTIONS.map((country, index) => [country.code, index]));
  return [...codes].sort((left, right) => (order.get(left) ?? 999) - (order.get(right) ?? 999));
}

export function getCountryNameByCode(code: string) {
  return HOME_COUNTRY_OPTIONS.find((country) => country.code === code)?.label ?? code;
}

export function getCountryNames(codes: string[]) {
  return sortCountryCodes(codes).map((code) => getCountryNameByCode(code));
}

export function resolveInitialHomeRole(candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (!normalized) continue;

    if (SUPPORTED_ROLE_LABELS.has(normalized)) {
      return normalized;
    }

    const lower = normalized.toLowerCase();
    if (lower.includes("backend")) return "Backend Engineer";
    if (lower.includes("frontend") || lower.includes("front-end")) return "Frontend Engineer";
    if (lower.includes("devops")) return "DevOps Engineer";
    if (lower.includes("data analyst")) return "Data Analyst";
    if (lower.includes("data engineer")) return "Data Engineer";
    if (lower.includes("ai") || lower.includes("machine learning") || lower.includes("ml")) {
      return "AI Engineer";
    }
  }

  const preferredFromProfile = IT_TARGET_ROLES.find((role) => SUPPORTED_ROLE_LABELS.has(role));
  return preferredFromProfile || HOME_ROLE_OPTIONS[0]?.label || "Backend Engineer";
}
