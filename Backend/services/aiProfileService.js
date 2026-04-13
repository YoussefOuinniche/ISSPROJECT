function uniqueStrings(values) {
  if (!Array.isArray(values)) return [];

  const seen = new Set();
  const normalized = [];

  for (const value of values) {
    const text = String(value || '').trim();
    if (!text) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push(text);
  }

  return normalized;
}

function asTrimmedString(value) {
  return String(value || '').trim();
}

function normalizeSkillLevel(value) {
  const level = String(value || '').trim().toLowerCase();
  if (['beginner', 'intermediate', 'advanced', 'expert'].includes(level)) {
    return level;
  }
  return 'intermediate';
}

function normalizePriority(value) {
  const priority = String(value || '').trim().toLowerCase();
  if (['high', 'medium', 'low'].includes(priority)) {
    return priority;
  }
  return 'medium';
}

function normalizeGapSeverity(value) {
  const severity = String(value || '').trim().toLowerCase();
  if (['critical', 'moderate', 'minor'].includes(severity)) {
    return severity;
  }
  return 'moderate';
}

function normalizeConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;

  if (numeric > 1 && numeric <= 100) {
    return Number((numeric / 100).toFixed(4));
  }

  if (numeric < 0) return 0;
  if (numeric > 1) return 1;
  return Number(numeric.toFixed(4));
}

function normalizeExperienceYears(value) {
  if (value === null || value === undefined || value === '') return null;

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Number(numeric.toFixed(1));
}

function normalizeAiSkills(skills) {
  if (!Array.isArray(skills)) return [];

  const byName = new Map();
  for (const skill of skills) {
    if (!skill || typeof skill !== 'object') continue;

    const name = String(skill.name || skill.skill_name || '').trim();
    if (!name) continue;

    const key = name.toLowerCase();
    const level = normalizeSkillLevel(skill.level || skill.proficiency_level);
    const previous = byName.get(key);

    if (!previous) {
      byName.set(key, {
        name,
        level,
        skill_name: name,
        proficiency_level: level,
      });
      continue;
    }

    const rank = ['beginner', 'intermediate', 'advanced', 'expert'];
    if (rank.indexOf(level) > rank.indexOf(previous.level)) {
      byName.set(key, {
        name: previous.name,
        level,
        skill_name: previous.skill_name,
        proficiency_level: level,
      });
    }
  }

  return Array.from(byName.values());
}

function normalizeExplicitSkills(skills) {
  if (!Array.isArray(skills)) return [];

  const byName = new Map();
  for (const skill of skills) {
    if (!skill || typeof skill !== 'object') continue;

    const name = asTrimmedString(skill.name || skill.skill_name);
    if (!name) continue;

    const key = name.toLowerCase();
    const level = normalizeSkillLevel(skill.level || skill.proficiency_level);
    const previous = byName.get(key);
    const rank = ['beginner', 'intermediate', 'advanced', 'expert'];

    if (!previous || rank.indexOf(level) > rank.indexOf(previous.level)) {
      byName.set(key, {
        name,
        level,
        skill_name: name,
        proficiency_level: level,
      });
    }
  }

  return Array.from(byName.values());
}

function normalizeSkillGaps(skillGaps) {
  if (!Array.isArray(skillGaps)) return [];

  return skillGaps
    .map((gap) => {
      if (!gap || typeof gap !== 'object') return null;

      const skillName = String(gap.skill_full_name || gap.skill_name || '').trim();
      if (!skillName) return null;

      const gapLevel = Number(gap.gap_level);
      const safeGapLevel = Number.isFinite(gapLevel) ? Math.max(1, Math.min(5, gapLevel)) : 3;
      const priority =
        safeGapLevel >= 4 ? 'high' : safeGapLevel >= 3 ? 'medium' : 'low';

      return {
        id: gap.id || null,
        skill_name: skillName,
        domain: String(gap.domain || 'General').trim() || 'General',
        gap_level: safeGapLevel,
        reason: String(gap.reason || '').trim(),
        importance: priority,
      };
    })
    .filter(Boolean);
}

function normalizeRecommendations(recommendations) {
  if (!Array.isArray(recommendations)) return [];

  return recommendations
    .map((recommendation) => {
      if (!recommendation || typeof recommendation !== 'object') return null;

      const title = String(recommendation.title || '').trim();
      const content = String(recommendation.content || '').trim();
      if (!title && !content) return null;

      return {
        id: recommendation.id || null,
        type: String(recommendation.type || 'career').trim() || 'career',
        title: title || content,
        content,
        priority: normalizePriority(recommendation.priority),
      };
    })
    .filter(Boolean);
}

function normalizeSkillGapStrengths(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const skill = asTrimmedString(item.skill || item.skill_name || item.name);
      if (!skill) return null;

      return {
        skill,
        current_level: normalizeSkillLevel(item.current_level || item.currentLevel || item.level),
        target_level: normalizeSkillLevel(item.target_level || item.targetLevel || 'intermediate'),
        why_it_matters: asTrimmedString(item.why_it_matters || item.reason),
        category: asTrimmedString(item.category) || 'General',
      };
    })
    .filter(Boolean);
}

function normalizeStructuredGapItems(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const skill = asTrimmedString(item.skill || item.skill_name || item.name);
      if (!skill) return null;

      return {
        skill,
        current_level: item.current_level || item.currentLevel
          ? normalizeSkillLevel(item.current_level || item.currentLevel)
          : null,
        target_level: normalizeSkillLevel(item.target_level || item.targetLevel || 'intermediate'),
        priority: normalizePriority(item.priority || item.importance),
        gap_severity: normalizeGapSeverity(item.gap_severity || item.gapSeverity),
        why_it_matters: asTrimmedString(item.why_it_matters || item.reason),
        category: asTrimmedString(item.category) || 'General',
      };
    })
    .filter(Boolean);
}

function normalizeSkillGapAnalysisRecommendations(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const title = asTrimmedString(item.title);
      const action = asTrimmedString(item.action || item.content);
      const reason = asTrimmedString(item.reason);
      if (!title && !action) return null;

      return {
        title: title || action,
        priority: normalizePriority(item.priority),
        action,
        reason,
      };
    })
    .filter(Boolean);
}

function normalizeSkillGapAnalysis(value) {
  if (!value || typeof value !== 'object') {
    return {
      target_role: null,
      strengths: [],
      missing_skills: [],
      partial_gaps: [],
      recommendations: [],
      meta: {
        matched_role_key: null,
        current_skill_count: 0,
        explicit_skill_count: 0,
        ai_skill_count: 0,
        source: 'role_taxonomy',
      },
    };
  }

  const strengths = normalizeSkillGapStrengths(value.strengths);
  const missing_skills = normalizeStructuredGapItems(value.missing_skills);
  const partial_gaps = normalizeStructuredGapItems(value.partial_gaps);
  const recommendations = normalizeSkillGapAnalysisRecommendations(value.recommendations);
  const meta = value.meta && typeof value.meta === 'object' ? value.meta : {};

  return {
    target_role: asTrimmedString(value.target_role) || null,
    strengths,
    missing_skills,
    partial_gaps,
    recommendations,
    meta: {
      matched_role_key: asTrimmedString(meta.matched_role_key) || null,
      current_skill_count: Number.isFinite(Number(meta.current_skill_count))
        ? Number(meta.current_skill_count)
        : 0,
      explicit_skill_count: Number.isFinite(Number(meta.explicit_skill_count))
        ? Number(meta.explicit_skill_count)
        : 0,
      ai_skill_count: Number.isFinite(Number(meta.ai_skill_count))
        ? Number(meta.ai_skill_count)
        : 0,
      source: asTrimmedString(meta.source) || 'role_taxonomy',
    },
  };
}

function normalizeRoadmapTextList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return asTrimmedString(item);
      }

      if (item && typeof item === 'object') {
        return asTrimmedString(
          item.title ||
            item.description ||
            item.name ||
            item.action ||
            item.label
        );
      }

      return '';
    })
    .filter(Boolean);
}

function normalizeRoadmapStages(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const title = asTrimmedString(item.title || item.phase);
      if (!title) return null;

      return {
        title,
        items: normalizeRoadmapTextList(item.items || item.skills || item.tasks),
        projects: normalizeRoadmapTextList(item.projects || item.resources),
      };
    })
    .filter(Boolean);
}

function normalizeRoadmapVisualization(value, fallbackRole, fallbackStages) {
  if (!value || typeof value !== 'object') {
    if (!fallbackStages.length) {
      return null;
    }

    return {
      type: 'roadmap',
      title: `${fallbackRole || 'Role'} roadmap`,
      data: fallbackStages.map((stage) => ({
        label: stage.title,
        value: stage.items.length,
        items: stage.items.slice(0, 4),
        color: null,
      })),
      stages: fallbackStages.map((stage) => ({
        title: stage.title,
        items: stage.items,
      })),
    };
  }

  const safeType = ['roadmap', 'bar_chart', 'radar'].includes(asTrimmedString(value.type))
    ? asTrimmedString(value.type)
    : 'roadmap';
  const stages = Array.isArray(value.stages)
    ? value.stages
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const title = asTrimmedString(item.title);
          if (!title) return null;
          return {
            title,
            items: normalizeRoadmapTextList(item.items),
          };
        })
        .filter(Boolean)
    : fallbackStages.map((stage) => ({
        title: stage.title,
        items: stage.items,
      }));

  return {
    type: safeType,
    title: asTrimmedString(value.title) || `${fallbackRole || 'Role'} roadmap`,
    data: Array.isArray(value.data)
      ? value.data
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const label = asTrimmedString(item.label || item.title);
            if (!label) return null;
            const numericValue = Number(item.value);
            return {
              label,
              value: Number.isFinite(numericValue) ? numericValue : null,
              items: normalizeRoadmapTextList(item.items),
              color: asTrimmedString(item.color) || null,
            };
          })
          .filter(Boolean)
      : [],
    stages,
  };
}

function normalizeLearningRoadmap(value) {
  if (!value || typeof value !== 'object') return null;

  const nested = value.data && typeof value.data === 'object' ? value.data : value;
  const role = asTrimmedString(nested.role || nested.roadmap_title) || null;
  const stages = normalizeRoadmapStages(nested.stages || nested.phases);
  const tools = normalizeRoadmapTextList(nested.tools);
  const final_projects = normalizeRoadmapTextList(nested.final_projects || nested.milestones);

  if (!role && !stages.length && !tools.length && !final_projects.length) {
    return null;
  }

  return {
    role,
    stages,
    tools,
    final_projects,
    visualization: normalizeRoadmapVisualization(nested.visualization, role, stages),
  };
}

function flattenSkillGapAnalysis(analysis) {
  if (!analysis || typeof analysis !== 'object') return [];

  const toGap = (item) => ({
    id: null,
    skill_name: item.skill,
    domain: item.category || 'General',
    gap_level:
      item.priority === 'high' ? 5 : item.priority === 'medium' ? 3 : 2,
    reason: item.why_it_matters,
    importance: item.priority,
    gap_severity: item.gap_severity,
    current_level: item.current_level || null,
    target_level: item.target_level || null,
  });

  return [
    ...(Array.isArray(analysis.missing_skills) ? analysis.missing_skills.map(toGap) : []),
    ...(Array.isArray(analysis.partial_gaps) ? analysis.partial_gaps.map(toGap) : []),
  ];
}

function mergeRecommendations(primary, secondary) {
  const merged = [];
  const seen = new Set();

  for (const recommendation of [...primary, ...secondary]) {
    if (!recommendation || typeof recommendation !== 'object') continue;
    const title = asTrimmedString(recommendation.title);
    const content = asTrimmedString(recommendation.content || recommendation.action);
    const key = `${title.toLowerCase()}::${content.toLowerCase()}`;
    if (!title && !content) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      id: recommendation.id || null,
      type: asTrimmedString(recommendation.type) || 'skill_gap',
      title: title || content,
      content,
      priority: normalizePriority(recommendation.priority),
    });
  }

  return merged;
}

function normalizeExplicitProfile(profile) {
  const source = profile && typeof profile === 'object' ? profile : {};
  const preferences =
    source.explicit_preferences && typeof source.explicit_preferences === 'object'
      ? source.explicit_preferences
      : source.explicitPreferences && typeof source.explicitPreferences === 'object'
        ? source.explicitPreferences
        : {};

  return {
    skills: normalizeExplicitSkills(source.explicit_skills || source.explicitSkills || source.skills),
    target_role:
      asTrimmedString(source.explicit_target_role || source.explicitTargetRole || source.target_role) || null,
    education:
      asTrimmedString(source.explicit_education || source.explicitEducation || source.education) || null,
    experience:
      asTrimmedString(source.explicit_experience || source.explicitExperience || source.experience) || null,
    preferences: {
      domain: asTrimmedString(preferences.domain || source.preferences?.domain) || null,
      stack: asTrimmedString(preferences.stack || source.preferences?.stack) || null,
    },
  };
}

function normalizeAiProfile(storedAiProfile, context = {}, explicitProfile = null) {
  const source = storedAiProfile && typeof storedAiProfile === 'object' ? storedAiProfile : {};
  const explicit = normalizeExplicitProfile(explicitProfile || {});
  const aiSkills = normalizeAiSkills(source.skills);
  const learningRoadmap = normalizeLearningRoadmap(source.learning_roadmap || source.roadmap);
  const explicitGoal = explicit.target_role;
  const explicitEducation = explicit.education ? [explicit.education] : [];
  const structuredAnalysis = normalizeSkillGapAnalysis(source.skill_gap_analysis);
  const contextSkillGaps = normalizeSkillGaps(context.skillGaps);
  const structuredSkillGaps = flattenSkillGapAnalysis(structuredAnalysis);
  const contextRecommendations = normalizeRecommendations(context.recommendations);
  const structuredRecommendations = structuredAnalysis.recommendations.map((recommendation) => ({
    type: 'skill_gap',
    title: recommendation.title,
    content: [recommendation.action, recommendation.reason].filter(Boolean).join(' '),
    priority: recommendation.priority,
  }));
  const fallbackGoal =
    structuredAnalysis.target_role ||
    learningRoadmap?.role ||
    uniqueStrings(source.goals)[0] ||
    null;

  return {
    skills: explicit.skills.length ? explicit.skills : aiSkills,
    goals: uniqueStrings(
      explicitGoal
        ? [explicitGoal, ...uniqueStrings(source.goals)]
        : fallbackGoal
          ? [fallbackGoal, ...uniqueStrings(source.goals)]
          : source.goals
    ),
    interests: uniqueStrings(source.interests),
    education: uniqueStrings([...explicitEducation, ...uniqueStrings(source.education)]),
    experience_years: normalizeExperienceYears(source.experience_years),
    confidence: normalizeConfidence(source.confidence),
    skill_gaps: contextSkillGaps.length ? contextSkillGaps : structuredSkillGaps,
    recommendations: mergeRecommendations(contextRecommendations, structuredRecommendations),
    target_role: explicitGoal || fallbackGoal,
    preferences: explicit.preferences,
    skill_gap_analysis: structuredAnalysis,
    learning_roadmap: learningRoadmap,
  };
}

function buildProfileCompletionHint(aiProfile, explicitProfile = null) {
  const explicit = normalizeExplicitProfile(explicitProfile || {});

  if (!explicit.target_role && !aiProfile.goals.length) {
    return 'Tell the AI assistant about the role you want next so it can sharpen your roadmap.';
  }

  if (!explicit.skills.length && !aiProfile.skills.length) {
    return 'Tell the AI assistant which tools and technologies you use most often.';
  }

  if (aiProfile.experience_years === null) {
    return 'Share how many years of hands-on experience you have so the guidance can be calibrated.';
  }

  if (!explicit.education && !aiProfile.education.length) {
    return 'Mention your education or certifications so the AI can refine its recommendations.';
  }

  return 'Tell the AI assistant more about your projects and experience to deepen the profile.';
}

function buildAiSummary(aiProfile, explicitProfile = null) {
  const explicit = normalizeExplicitProfile(explicitProfile || {});
  const structuredAnalysis =
    aiProfile && typeof aiProfile === 'object' ? aiProfile.skill_gap_analysis || {} : {};
  const strengths = uniqueStrings([
    ...(Array.isArray(structuredAnalysis.strengths)
      ? structuredAnalysis.strengths.map((item) => item.skill)
      : []),
    ...(Array.isArray(aiProfile.skills) ? aiProfile.skills.map((skill) => skill.name) : []),
  ]).slice(0, 3);
  const urgentGapPool = [
    ...(Array.isArray(structuredAnalysis.missing_skills)
      ? structuredAnalysis.missing_skills.filter(
          (item) => item.priority === 'high' || item.gap_severity === 'critical'
        )
      : []),
    ...(Array.isArray(structuredAnalysis.partial_gaps)
      ? structuredAnalysis.partial_gaps.filter(
          (item) => item.priority === 'high' || item.gap_severity === 'critical'
        )
      : []),
    ...(Array.isArray(structuredAnalysis.missing_skills) ? structuredAnalysis.missing_skills : []),
    ...(Array.isArray(structuredAnalysis.partial_gaps) ? structuredAnalysis.partial_gaps : []),
  ];
  const urgentGaps = uniqueStrings(urgentGapPool.map((item) => item.skill)).slice(0, 3);
  const roadmapStages =
    aiProfile && aiProfile.learning_roadmap && Array.isArray(aiProfile.learning_roadmap.stages)
      ? aiProfile.learning_roadmap.stages
      : [];
  const roadmapNextStep = roadmapStages.find((stage) => stage.items.length || stage.projects.length);
  const topRecommendation = Array.isArray(structuredAnalysis.recommendations)
    ? structuredAnalysis.recommendations.find((item) => item.priority === 'high') ||
      structuredAnalysis.recommendations[0]
    : null;
  const fallbackRecommendation = Array.isArray(aiProfile.recommendations)
    ? aiProfile.recommendations.find((item) => item.priority === 'high') || aiProfile.recommendations[0]
    : null;
  const targetRole =
    explicit.target_role || aiProfile.target_role || aiProfile.goals[0] || null;
  const nextStep =
    (roadmapNextStep && (roadmapNextStep.items[0] || roadmapNextStep.projects[0])) ||
    topRecommendation?.action ||
    fallbackRecommendation?.content ||
    null;

  return {
    top_skills: aiProfile.skills.slice(0, 3).map((skill) => skill.name),
    top_goal: targetRole,
    target_role: targetRole,
    strengths,
    urgent_gaps: urgentGaps,
    next_step: nextStep,
    profile_completion_hint: buildProfileCompletionHint(aiProfile, explicit),
  };
}

function buildAiContextProfile({ profile, storedAiProfile, skillGaps = [], recommendations = [], userSkills = [] }) {
  const explicit_profile = normalizeExplicitProfile(profile);
  const ai_profile = normalizeAiProfile(
    storedAiProfile,
    { skillGaps, recommendations },
    explicit_profile
  );

  return {
    domain: profile?.domain || null,
    title: profile?.title || null,
    experience_level: profile?.experience_level || null,
    bio: profile?.bio || null,
    current_skills: Array.isArray(userSkills)
      ? userSkills
          .map((skill) => ({
            name: asTrimmedString(skill.skill_name || skill.name),
            level: normalizeSkillLevel(skill.proficiency_level || skill.level),
            years_of_experience: Number.isFinite(Number(skill.years_of_experience))
              ? Number(skill.years_of_experience)
              : 0,
          }))
          .filter((skill) => skill.name)
      : [],
    explicit_profile,
    ai_profile,
  };
}

function buildProfileEnvelope({
  user,
  profile,
  storedAiProfile,
  skillGaps = [],
  recommendations = [],
}) {
  const normalizedProfile = profile && typeof profile === 'object' ? profile : {};
  const normalizedUser = user && typeof user === 'object' ? user : {};
  const explicit_profile = normalizeExplicitProfile(normalizedProfile);

  const ai_profile = normalizeAiProfile(storedAiProfile, {
    skillGaps,
    recommendations,
  }, explicit_profile);
  const ai_summary = buildAiSummary(ai_profile, explicit_profile);

  const nestedProfile = {
    id: normalizedProfile.id || null,
    user_id: normalizedProfile.user_id || normalizedUser.id || null,
    domain: normalizedProfile.domain || null,
    title: normalizedProfile.title || null,
    experience_level: normalizedProfile.experience_level || null,
    bio: normalizedProfile.bio || null,
    last_analysis_at: normalizedProfile.last_analysis_at || null,
    created_at: normalizedProfile.created_at || null,
    updated_at: normalizedProfile.updated_at || null,
    full_name: normalizedProfile.full_name || normalizedUser.full_name || null,
    email: normalizedProfile.email || normalizedUser.email || null,
    user_created_at: normalizedProfile.user_created_at || normalizedUser.created_at || null,
    explicit_skills: explicit_profile.skills,
    explicit_target_role: explicit_profile.target_role,
    explicit_education: explicit_profile.education,
    explicit_experience: explicit_profile.experience,
    explicit_preferences: explicit_profile.preferences,
  };

  return {
    ...nestedProfile,
    user: {
      id: normalizedUser.id || nestedProfile.user_id,
      email: normalizedUser.email || nestedProfile.email,
      full_name: normalizedUser.full_name || nestedProfile.full_name,
      role: normalizedUser.role || 'user',
      created_at: normalizedUser.created_at || nestedProfile.user_created_at,
      updated_at: normalizedUser.updated_at || nestedProfile.updated_at,
    },
    profile: nestedProfile,
    explicit_profile,
    ai_profile,
    ai_summary,
  };
}

module.exports = {
  buildAiContextProfile,
  buildAiSummary,
  buildProfileEnvelope,
  normalizeExplicitProfile,
  normalizeAiProfile,
};
