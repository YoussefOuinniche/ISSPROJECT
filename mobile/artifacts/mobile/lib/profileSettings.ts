export type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";
export type ExperienceLevel = "student" | "junior" | "mid" | "senior";

export type StructuredProfileFields = {
  bio: string;
  location: string;
  targetRole: string;
  learningGoals: string;
  portfolioUrl: string;
};

const FIELD_PATTERNS = {
  location: /Location:\s*(.+)/i,
  targetRole: /Target Role:\s*(.+)/i,
  learningGoals: /Learning Goals:\s*(.+)/i,
  portfolioUrl: /Portfolio:\s*(.+)/i,
} as const;

const META_PREFIXES = ["Location:", "Target Role:", "Learning Goals:", "Portfolio:"];

export function parseStructuredProfileFields(rawBio: string | null | undefined): StructuredProfileFields {
  const source = String(rawBio ?? "");
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const bio = lines
    .filter((line) => !META_PREFIXES.some((prefix) => line.startsWith(prefix)))
    .join("\n")
    .trim();

  return {
    bio,
    location: source.match(FIELD_PATTERNS.location)?.[1]?.trim() ?? "",
    targetRole: source.match(FIELD_PATTERNS.targetRole)?.[1]?.trim() ?? "",
    learningGoals: source.match(FIELD_PATTERNS.learningGoals)?.[1]?.trim() ?? "",
    portfolioUrl: source.match(FIELD_PATTERNS.portfolioUrl)?.[1]?.trim() ?? "",
  };
}

export function buildStructuredProfileBio(fields: StructuredProfileFields) {
  const lines: string[] = [];

  if (fields.bio.trim()) lines.push(fields.bio.trim());
  if (fields.location.trim()) lines.push(`Location: ${fields.location.trim()}`);
  if (fields.targetRole.trim()) lines.push(`Target Role: ${fields.targetRole.trim()}`);
  if (fields.learningGoals.trim()) lines.push(`Learning Goals: ${fields.learningGoals.trim()}`);
  if (fields.portfolioUrl.trim()) lines.push(`Portfolio: ${fields.portfolioUrl.trim()}`);

  return lines.join("\n");
}

export function normalizeExperienceLevel(value: string | null | undefined): ExperienceLevel {
  const normalized = String(value ?? "junior").trim().toLowerCase();
  if (normalized === "student" || normalized === "junior" || normalized === "mid" || normalized === "senior") {
    return normalized;
  }
  return "junior";
}

export function getExperienceLabel(value: string | null | undefined) {
  const normalized = normalizeExperienceLevel(value);
  return normalized === "mid" ? "Mid-level" : normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
