type RecordLike = Record<string, unknown>;

type SkillLike = {
  proficiency_level?: unknown;
  years_of_experience?: unknown;
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function computeProfileCompleteness(profileInput: unknown, skillsInput: unknown) {
  const profile: RecordLike =
    typeof profileInput === "object" && profileInput !== null ? (profileInput as RecordLike) : {};

  const skills = Array.isArray(skillsInput)
    ? skillsInput.filter((item): item is SkillLike => typeof item === "object" && item !== null)
    : [];

  let score = 0;
  if (hasText(profile.full_name)) score += 15;
  if (hasText(profile.domain)) score += 15;
  if (hasText(profile.title)) score += 15;
  if (hasText(profile.experience_level)) score += 10;
  if (hasText(profile.bio)) score += 15;

  if (skills.length > 0) {
    score += Math.min(20, skills.length * 4);
  }

  const richSkills = skills.filter((skill) => hasText(skill.proficiency_level));
  const experienceCovered = skills.filter((skill) => toNumber(skill.years_of_experience) > 0);

  if (richSkills.length > 0) score += 5;
  if (experienceCovered.length > 0) score += 5;

  return Math.max(0, Math.min(100, score));
}

export function requiresOnboarding(profileInput: unknown, skillsInput: unknown) {
  const completeness = computeProfileCompleteness(profileInput, skillsInput);
  return completeness < 45;
}
