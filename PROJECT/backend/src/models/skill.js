const { supabaseAdmin } = require('../config/database');

class Skill {
  // Get all skills
  static async findAll(filters = {}) {
    let query = supabaseAdmin
      .from('skills')
      .select('*');
    
    if (filters.skill_type) {
      query = query.eq('skill_type', filters.skill_type);
    }
    
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    
    const { data, error } = await query.order('name', { ascending: true });
    
    if (error) throw error;
    
    return data;
  }
  
  // Get skill by ID
  static async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('skills')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    return data;
  }
  
  // Get skill by slug
  static async findBySlug(slug) {
    const { data, error } = await supabaseAdmin
      .from('skills')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
  
  // Get skills by job role
  static async getSkillsByJobRole(jobRoleId) {
    const { data, error } = await supabaseAdmin
      .from('job_skills')
      .select(`
        importance_level,
        proficiency_min,
        skills!inner (
          id,
          name,
          slug,
          description,
          skill_type,
          category_id
        )
      `)
      .eq('job_role_id', jobRoleId)
      .order('importance_level', { ascending: true });
    
    if (error) throw error;
    
    return data.map(item => ({
      ...item.skills,
      importance_level: item.importance_level,
      proficiency_min: item.proficiency_min
    }));
  }
  
  // Get skills by user
  static async getSkillsByUser(profileId) {
    const { data, error } = await supabaseAdmin
      .from('user_skills')
      .select(`
        proficiency_level,
        self_assessed,
        skills!inner (
          id,
          name,
          slug,
          description,
          skill_type,
          category_id
        )
      `)
      .eq('profile_id', profileId);
    
    if (error) throw error;
    
    return data.map(item => ({
      ...item.skills,
      proficiency_level: item.proficiency_level,
      self_assessed: item.self_assessed
    }));
  }
  
  // Create skill
  static async create(skillData) {
    const { name, slug, description, skill_type, category_id } = skillData;
    
    const { data, error } = await supabaseAdmin
      .from('skills')
      .insert([{
        name,
        slug,
        description,
        skill_type,
        category_id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Update skill
  static async update(id, skillData) {
    const { name, slug, description, skill_type, category_id } = skillData;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (skill_type !== undefined) updateData.skill_type = skill_type;
    if (category_id !== undefined) updateData.category_id = category_id;
    updateData.updated_at = new Date();
    
    const { data, error } = await supabaseAdmin
      .from('skills')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Delete skill
  static async delete(id) {
    // Check if skill is used in job_skills or user_skills
    const { count: jobSkillsCount, error: jobError } = await supabaseAdmin
      .from('job_skills')
      .select('*', { count: 'exact', head: true })
      .eq('skill_id', id);
    
    if (jobError) throw jobError;
    
    if (jobSkillsCount > 0) {
      throw new Error('Cannot delete skill that is linked to job roles');
    }
    
    const { count: userSkillsCount, error: userError } = await supabaseAdmin
      .from('user_skills')
      .select('*', { count: 'exact', head: true })
      .eq('skill_id', id);
    
    if (userError) throw userError;
    
    if (userSkillsCount > 0) {
      throw new Error('Cannot delete skill that is linked to users');
    }
    
    const { data, error } = await supabaseAdmin
      .from('skills')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Get skill demand trends
  static async getTrendingSkills(limit = 10) {
    const { data, error } = await supabaseAdmin
      .from('ai_skill_insights')
      .select(`
        trend_score,
        demand_level,
        market_summary,
        skills!inner (id, name, slug, skill_type)
      `)
      .order('trend_score', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return data.map(item => ({
      ...item.skills,
      trend_score: item.trend_score,
      demand_level: item.demand_level,
      market_summary: item.market_summary
    }));
  }
}

module.exports = Skill;