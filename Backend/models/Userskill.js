const { supabase } = require('../config/database');

class UserSkill {
  // Add a skill to user (upsert on conflict)
  static async create(userId, skillId, proficiencyLevel, yearsOfExperience) {
    const { data, error } = await supabase
      .from('user_skills')
      .upsert(
        { user_id: userId, skill_id: skillId, proficiency_level: proficiencyLevel, years_of_experience: yearsOfExperience },
        { onConflict: 'user_id,skill_id' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Get all skills for a user
  static async getUserSkills(userId) {
    const { data, error } = await supabase
      .from('user_skills')
      .select('*, skills(name, category)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => {
      const { skills: skill, ...us } = row;
      return { ...us, skill_name: skill?.name, skill_category: skill?.category };
    });
  }

  // Get users with a specific skill
  static async getUsersWithSkill(skillId) {
    const { data: userSkills, error } = await supabase
      .from('user_skills')
      .select('*, users(email, full_name)')
      .eq('skill_id', skillId)
      .order('years_of_experience', { ascending: false });
    if (error) throw error;
    const userIds = (userSkills || []).map(us => us.user_id);
    let profileMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, title, experience_level')
        .in('user_id', userIds);
      profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
    }
    return (userSkills || []).map(us => ({
      ...us,
      email: us.users?.email,
      full_name: us.users?.full_name,
      title: profileMap[us.user_id]?.title,
      experience_level: profileMap[us.user_id]?.experience_level,
    }));
  }

  // Update user skill
  static async update(userId, skillId, updates) {
    const dbUpdates = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        dbUpdates[dbKey] = updates[key];
      }
    });
    if (Object.keys(dbUpdates).length === 0) throw new Error('No fields to update');
    const { data, error } = await supabase
      .from('user_skills')
      .update(dbUpdates)
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  // Delete user skill
  static async delete(userId, skillId) {
    const { data, error } = await supabase
      .from('user_skills')
      .delete()
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  // Delete all skills for a user
  static async deleteAllUserSkills(userId) {
    const { error, count } = await supabase
      .from('user_skills')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
    return count;
  }

  // Get skill proficiency statistics
  static async getSkillStats(skillId) {
    const { data, error } = await supabase
      .from('user_skills')
      .select('years_of_experience, proficiency_level')
      .eq('skill_id', skillId);
    if (error) throw error;
    const rows = data || [];
    const total = rows.length;
    const avgExp = total > 0 ? rows.reduce((s, r) => s + Number(r.years_of_experience || 0), 0) / total : 0;
    const counts = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
    rows.forEach(r => { if (counts[r.proficiency_level] !== undefined) counts[r.proficiency_level]++; });
    return {
      total_users: total,
      avg_experience: avgExp,
      beginners: counts.beginner,
      intermediate: counts.intermediate,
      advanced: counts.advanced,
      experts: counts.expert,
    };
  }

  // Bulk add skills to user
  static async bulkCreate(userId, skills) {
    const rows = skills.map(skill => ({
      user_id: userId,
      skill_id: skill.skillId,
      proficiency_level: skill.proficiencyLevel || 'beginner',
      years_of_experience: skill.yearsOfExperience || 0,
    }));
    const { data, error } = await supabase
      .from('user_skills')
      .upsert(rows, { onConflict: 'user_id,skill_id' })
      .select();
    if (error) throw error;
    return data || [];
  }
}

module.exports = UserSkill;