const { supabase } = require('../config/database');
const { getSkillGaps, setSkillGaps } = require('./LocalAiFallbackStore');

let hasWarnedAboutMissingSkillGapsTable = false;

function isMissingSkillGapsTableError(error) {
  if (!error || typeof error !== 'object') return false;

  return (
    error.code === 'PGRST205' &&
    typeof error.message === 'string' &&
    error.message.includes('skill_gaps')
  );
}

function warnMissingSkillGapsTable(error) {
  if (hasWarnedAboutMissingSkillGapsTable) {
    return;
  }

  hasWarnedAboutMissingSkillGapsTable = true;
  console.warn(
    '[SkillGap] skill_gaps table is missing or not exposed yet. Falling back to local storage.',
    error.message
  );
}

function normalizeFallbackGap(row, index = 0) {
  if (!row || typeof row !== 'object') return null;

  return {
    id: row.id || `gap-${index}`,
    user_id: row.user_id || null,
    domain: row.domain || 'General',
    skill_name: row.skill_name || row.skillName || '',
    skill_id: row.skill_id || row.skillId || null,
    gap_level: Number.isFinite(Number(row.gap_level || row.gapLevel))
      ? Number(row.gap_level || row.gapLevel)
      : 3,
    reason: row.reason || '',
    priority: row.priority || null,
    gap_severity: row.gap_severity || row.gapSeverity || null,
    current_level: row.current_level || row.currentLevel || null,
    target_level: row.target_level || row.targetLevel || null,
    created_at: row.created_at || new Date().toISOString(),
    skill_full_name: row.skill_full_name || row.skill_name || row.skillName || '',
    skill_category: row.skill_category || row.domain || 'General',
  };
}

class SkillGap {
  // Create a new skill gap
  static async create(userId, gapData) {
    const { domain, skillName, skillId, gapLevel, reason } = gapData;
    const { data, error } = await supabase
      .from('skill_gaps')
      .insert({ user_id: userId, domain, skill_name: skillName, skill_id: skillId || null, gap_level: gapLevel, reason })
      .select()
      .single();
    if (error) {
      if (isMissingSkillGapsTableError(error)) {
        warnMissingSkillGapsTable(error);
        const existing = getSkillGaps(userId);
        const next = normalizeFallbackGap({ user_id: userId, ...gapData }, existing.length);
        setSkillGaps(userId, [...existing, next]);
        return next;
      }
      throw error;
    }
    return data;
  }

  // Get all skill gaps for a user
  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('skill_gaps')
      .select('*, skills(name, category)')
      .eq('user_id', userId)
      .order('gap_level', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingSkillGapsTableError(error)) {
        warnMissingSkillGapsTable(error);
        return getSkillGaps(userId).map(normalizeFallbackGap).filter(Boolean);
      }
      throw error;
    }
    return (data || []).map(row => {
      const { skills: skill, ...sg } = row;
      return { ...sg, skill_full_name: skill?.name, skill_category: skill?.category };
    });
  }

  // Get skill gaps by domain
  static async findByUserAndDomain(userId, domain) {
    const { data, error } = await supabase
      .from('skill_gaps')
      .select('*, skills(name, category)')
      .eq('user_id', userId)
      .eq('domain', domain)
      .order('gap_level', { ascending: false });
    if (error) {
      if (isMissingSkillGapsTableError(error)) {
        warnMissingSkillGapsTable(error);
        return getSkillGaps(userId)
          .map(normalizeFallbackGap)
          .filter((row) => row && row.domain === domain);
      }
      throw error;
    }
    return (data || []).map(row => {
      const { skills: skill, ...sg } = row;
      return { ...sg, skill_full_name: skill?.name, skill_category: skill?.category };
    });
  }

  // Find skill gap by ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('skill_gaps')
      .select('*, skills(name, category)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { skills: skill, ...sg } = data;
    return { ...sg, skill_full_name: skill?.name, skill_category: skill?.category };
  }

  // Update skill gap
  static async update(id, updates) {
    const dbUpdates = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        dbUpdates[dbKey] = updates[key];
      }
    });
    if (Object.keys(dbUpdates).length === 0) throw new Error('No fields to update');
    const { data, error } = await supabase
      .from('skill_gaps')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Delete skill gap
  static async delete(id) {
    const { data, error } = await supabase
      .from('skill_gaps')
      .delete()
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Delete all skill gaps for a user
  static async deleteAllByUserId(userId) {
    const { error, count } = await supabase
      .from('skill_gaps')
      .delete()
      .eq('user_id', userId);
    if (error) {
      if (isMissingSkillGapsTableError(error)) {
        warnMissingSkillGapsTable(error);
        setSkillGaps(userId, []);
        return 0;
      }
      throw error;
    }
    return count;
  }

  // Get high priority gaps (gap_level >= 4)
  static async getHighPriorityGaps(userId) {
    const { data, error } = await supabase
      .from('skill_gaps')
      .select('*, skills(name, category)')
      .eq('user_id', userId)
      .gte('gap_level', 4)
      .order('gap_level', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => {
      const { skills: skill, ...sg } = row;
      return { ...sg, skill_full_name: skill?.name, skill_category: skill?.category };
    });
  }

  // Get gap statistics for a user (computed in JS)
  static async getUserGapStats(userId) {
    const { data, error } = await supabase
      .from('skill_gaps')
      .select('gap_level, domain')
      .eq('user_id', userId);
    if (error) {
      if (isMissingSkillGapsTableError(error)) {
        warnMissingSkillGapsTable(error);
        const rows = getSkillGaps(userId).map(normalizeFallbackGap).filter(Boolean);
        const total = rows.length;
        const avgLevel = total > 0 ? rows.reduce((s, r) => s + (r.gap_level || 0), 0) / total : 0;
        const highPriority = rows.filter(r => r.gap_level >= 4).length;
        const domains = new Set(rows.map(r => r.domain).filter(Boolean)).size;
        return { total_gaps: total, avg_gap_level: avgLevel, high_priority_count: highPriority, domains_with_gaps: domains };
      }
      throw error;
    }
    const rows = data || [];
    const total = rows.length;
    const avgLevel = total > 0 ? rows.reduce((s, r) => s + (r.gap_level || 0), 0) / total : 0;
    const highPriority = rows.filter(r => r.gap_level >= 4).length;
    const domains = new Set(rows.map(r => r.domain).filter(Boolean)).size;
    return { total_gaps: total, avg_gap_level: avgLevel, high_priority_count: highPriority, domains_with_gaps: domains };
  }

  // Bulk create skill gaps
  static async bulkCreate(userId, gaps) {
    const { data, error } = await supabase
      .from('skill_gaps')
      .insert(gaps.map(gap => ({
        user_id: userId,
        domain: gap.domain,
        skill_name: gap.skillName,
        skill_id: gap.skillId || null,
        gap_level: gap.gapLevel || 3,
        reason: gap.reason,
      })))
      .select();
    if (error) {
      if (isMissingSkillGapsTableError(error)) {
        warnMissingSkillGapsTable(error);
        return setSkillGaps(userId, gaps.map((gap, index) => normalizeFallbackGap({
          user_id: userId,
          ...gap,
        }, index)).filter(Boolean));
      }
      throw error;
    }
    return data || [];
  }

  static async replaceForUser(userId, gaps) {
    const safeGaps = Array.isArray(gaps) ? gaps : [];
    await SkillGap.deleteAllByUserId(userId);
    if (safeGaps.length === 0) {
      return [];
    }
    return SkillGap.bulkCreate(userId, safeGaps);
  }
}

module.exports = SkillGap;
