const { supabase } = require('../config/database');
const {
  getAiProfile,
  setAiProfile,
  getExplicitProfile,
  setExplicitProfile,
} = require('./LocalAiFallbackStore');

let hasWarnedAboutMissingAiProfileTable = false;

function parseProfileJson(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

function isMissingAiProfileTableError(error) {
  if (!error || typeof error !== 'object') return false;

  return (
    error.code === 'PGRST205' &&
    typeof error.message === 'string' &&
    error.message.includes('user_ai_profile')
  );
}

function isMissingExplicitProfileColumnError(error) {
  if (!error || typeof error !== 'object') return false;

  const message = typeof error.message === 'string' ? error.message : '';
  return (
    (error.code === 'PGRST204' || error.code === '42703') &&
    /explicit_(skills|target_role|education|experience|preferences)/i.test(message)
  );
}

function warnMissingAiProfileTable(error) {
  if (hasWarnedAboutMissingAiProfileTable) {
    return;
  }

  hasWarnedAboutMissingAiProfileTable = true;
  console.warn(
    '[Profile] user_ai_profile table is missing or not exposed yet. Falling back to an empty AI profile until the migration is applied.',
    error.message
  );
}

class Profile {
  static async create(userId, profileData) {
    const {
      domain,
      title,
      experienceLevel,
      bio,
      explicitSkills,
      explicitTargetRole,
      explicitEducation,
      explicitExperience,
      explicitPreferences,
    } = profileData;
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        domain,
        title,
        experience_level: experienceLevel,
        bio,
        explicit_skills: explicitSkills,
        explicit_target_role: explicitTargetRole,
        explicit_education: explicitEducation,
        explicit_experience: explicitExperience,
        explicit_preferences: explicitPreferences,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async update(userId, updates) {
    const dbUpdates = {};
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        dbUpdates[dbKey] = updates[key];
      }
    });

    if (Object.keys(dbUpdates).length === 0) throw new Error('No fields to update');

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateLastAnalysis(userId) {
    const timestamp = new Date().toISOString();
    const { data: updatedRow, error: updateError } = await supabase
      .from('profiles')
      .update({ last_analysis_at: timestamp })
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    if (updateError) throw updateError;
    if (updatedRow) return updatedRow;

    const { data: insertedRow, error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        last_analysis_at: timestamp,
      })
      .select()
      .single();
    if (insertError) throw insertError;
    return insertedRow;
  }

  static async getStoredAiProfile(userId) {
    const { data, error } = await supabase
      .from('user_ai_profile')
      .select('profile_json')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (isMissingAiProfileTableError(error)) {
        warnMissingAiProfileTable(error);
        return getAiProfile(userId);
      }
      throw error;
    }
    return parseProfileJson(data?.profile_json);
  }

  static async upsertExplicitProfile(userId, explicitProfile) {
    const normalized = Profile.normalizeExplicitProfile(explicitProfile);
    const payload = {
      explicit_skills: normalized.explicit_skills,
      explicit_target_role: normalized.explicit_target_role,
      explicit_education: normalized.explicit_education,
      explicit_experience: normalized.explicit_experience,
      explicit_preferences: normalized.explicit_preferences,
    };

    const { data: updatedRow, error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (updateError) {
      if (isMissingExplicitProfileColumnError(updateError)) {
        return setExplicitProfile(userId, normalized);
      }
      throw updateError;
    }

    if (updatedRow) {
      return normalized;
    }

    const { data: insertedRow, error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        ...payload,
      })
      .select()
      .maybeSingle();

    if (insertError) {
      if (isMissingExplicitProfileColumnError(insertError)) {
        return setExplicitProfile(userId, normalized);
      }
      throw insertError;
    }

    return normalized;
  }

  static async upsertStoredAiProfile(userId, profileJson) {
    const normalized = parseProfileJson(profileJson);
    const { data, error } = await supabase
      .from('user_ai_profile')
      .upsert(
        {
          user_id: userId,
          profile_json: normalized,
        },
        { onConflict: 'user_id' }
      )
      .select('profile_json')
      .single();

    if (error) {
      if (isMissingAiProfileTableError(error)) {
        warnMissingAiProfileTable(error);
        return setAiProfile(userId, normalized);
      }
      throw error;
    }

    return parseProfileJson(data?.profile_json);
  }

  static async delete(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getFullProfile(userId) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, full_name, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (userError) throw userError;
    if (profileError) throw profileError;

    if (!profile) {
      const fallbackExplicit = Profile.normalizeExplicitProfile(getExplicitProfile(userId));
      const hasFallbackExplicit =
        fallbackExplicit.explicit_skills.length > 0 ||
        Boolean(fallbackExplicit.explicit_target_role) ||
        Boolean(fallbackExplicit.explicit_education) ||
        Boolean(fallbackExplicit.explicit_experience) ||
        Boolean(fallbackExplicit.explicit_preferences.domain) ||
        Boolean(fallbackExplicit.explicit_preferences.stack);

      if (!hasFallbackExplicit) {
        return null;
      }

      return {
        user_id: userId,
        domain: null,
        title: null,
        experience_level: null,
        bio: null,
        last_analysis_at: null,
        created_at: null,
        updated_at: null,
        email: user?.email,
        full_name: user?.full_name,
        user_created_at: user?.created_at,
        ...fallbackExplicit,
      };
    }

    const dbExplicit = Profile.normalizeExplicitProfile({
      explicit_skills: profile?.explicit_skills,
      explicit_target_role: profile?.explicit_target_role,
      explicit_education: profile?.explicit_education,
      explicit_experience: profile?.explicit_experience,
      explicit_preferences: profile?.explicit_preferences,
    });
    const fallbackExplicit = Profile.normalizeExplicitProfile(getExplicitProfile(userId));

    return {
      ...profile,
      email: user?.email,
      full_name: user?.full_name,
      user_created_at: user?.created_at,
      explicit_skills:
        dbExplicit.explicit_skills.length > 0
          ? dbExplicit.explicit_skills
          : fallbackExplicit.explicit_skills,
      explicit_target_role:
        dbExplicit.explicit_target_role || fallbackExplicit.explicit_target_role,
      explicit_education:
        dbExplicit.explicit_education || fallbackExplicit.explicit_education,
      explicit_experience:
        dbExplicit.explicit_experience || fallbackExplicit.explicit_experience,
      explicit_preferences: {
        domain:
          dbExplicit.explicit_preferences.domain || fallbackExplicit.explicit_preferences.domain,
        stack:
          dbExplicit.explicit_preferences.stack || fallbackExplicit.explicit_preferences.stack,
      },
    };
  }

  static async findAll(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, users(email, full_name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return (data || []).map((row) => {
      const { users: user, ...profile } = row;
      return { ...profile, email: user?.email, full_name: user?.full_name };
    });
  }

  static normalizeExplicitProfile(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    let parsedExplicitSkills = [];
    const rawExplicitSkills = source.explicit_skills ?? source.explicitSkills;
    if (Array.isArray(rawExplicitSkills)) {
      parsedExplicitSkills = rawExplicitSkills;
    } else if (typeof rawExplicitSkills === 'string') {
      try {
        const parsed = JSON.parse(rawExplicitSkills);
        parsedExplicitSkills = Array.isArray(parsed) ? parsed : [];
      } catch {
        parsedExplicitSkills = [];
      }
    }

    const normalizedSkills = parsedExplicitSkills
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const name = String(item.name || '').trim();
        const level = String(item.level || '').trim().toLowerCase();
        if (!name) return null;

        return {
          name,
          level: ['beginner', 'intermediate', 'advanced'].includes(level)
            ? level
            : 'intermediate',
        };
      })
      .filter(Boolean);

    const preferencesSource =
      parseProfileJson(source.explicit_preferences) ||
      parseProfileJson(source.explicitPreferences);

    const explicitPreferences = {
      domain: String(preferencesSource.domain || source.domainPreference || '').trim(),
      stack: String(preferencesSource.stack || source.stackPreference || '').trim(),
    };

    return {
      explicit_skills: normalizedSkills,
      explicit_target_role: String(
        source.explicit_target_role ?? source.explicitTargetRole ?? ''
      ).trim() || null,
      explicit_education: String(
        source.explicit_education ?? source.explicitEducation ?? ''
      ).trim() || null,
      explicit_experience: String(
        source.explicit_experience ?? source.explicitExperience ?? ''
      ).trim() || null,
      explicit_preferences: explicitPreferences,
    };
  }
}

module.exports = Profile;
