const { supabase } = require('../config/database');

class SkillGap {
  // Create a new skill gap
  static async create(userId, gapData) {
    const { domain, skillName, skillId, gapLevel, reason } = gapData;
    const { data, error } = await supabase
      .from('skill_gaps')
      .insert({ user_id: userId, domain, skill_name: skillName, skill_id: skillId || null, gap_level: gapLevel, reason })
      .select()
      .single();
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
    return data || [];
  }
}

module.exports = SkillGap;
