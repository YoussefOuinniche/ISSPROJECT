const { supabaseAdmin } = require('../config/database');

class JobRole {
  // Get all job roles
  static async findAll(filters = {}) {
    let query = supabaseAdmin
      .from('job_roles')
      .select('*');

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters.seniority_level) {
      query = query.eq('seniority_level', filters.seniority_level);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query.order('title', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Get job role by ID
  static async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('job_roles')
      .select(`
        *,
        categories!inner (id, name, slug),
        job_market_trends!left (*),
        ai_roadmaps!left (count)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return {
      ...data,
      category: data.categories,
      market_trends: data.job_market_trends,
      total_roadmaps: data.ai_roadmaps?.length || 0
    };
  }

  // Get job role by slug
  static async findBySlug(slug) {
    const { data, error } = await supabaseAdmin
      .from('job_roles')
      .select(`
        *,
        categories!inner (name)
      `)
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Get roles by category
  static async getByCategory(categoryId) {
    const { data, error } = await supabaseAdmin
      .from('job_roles')
      .select(`
        *,
        job_market_trends!left (growth_percentage, demand_index)
      `)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('title', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Get trending roles
  static async getTrendingRoles(limit = 10) {
    const { data, error } = await supabaseAdmin
      .from('job_roles')
      .select(`
        *,
        categories!inner (name),
        job_market_trends!left (growth_percentage, demand_index)
      `)
      .eq('is_active', true)
      .order('avg_salary_usd', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Create job role
  static async create(roleData) {
    const { title, slug, description, category_id, seniority_level, avg_salary_usd } = roleData;

    const { data, error } = await supabaseAdmin
      .from('job_roles')
      .insert([{
        title,
        slug,
        description,
        category_id,
        seniority_level,
        avg_salary_usd,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update job role
  static async update(id, roleData) {
    const { title, slug, description, seniority_level, avg_salary_usd, is_active } = roleData;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (seniority_level !== undefined) updateData.seniority_level = seniority_level;
    if (avg_salary_usd !== undefined) updateData.avg_salary_usd = avg_salary_usd;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date();

    const { data, error } = await supabaseAdmin
      .from('job_roles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete job role
  static async delete(id) {
    const { data, error } = await supabaseAdmin
      .from('job_roles')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get job role with skills
  static async getRoleWithSkills(id) {
    const { data: role, error: roleError } = await supabaseAdmin
      .from('job_roles')
      .select('*')
      .eq('id', id)
      .single();

    if (roleError) throw roleError;

    // Get required skills (note: no job_skills table in schema, need to add or use alternative)
    // For now, we'll get roadmaps and their skills
    const { data: roadmaps } = await supabaseAdmin
      .from('ai_roadmaps')
      .select(`
        id,
        ai_roadmap_steps!inner (
          skill_id,
          skills!inner (id, name, slug)
        )
      `)
      .eq('job_role_id', id);

    return {
      ...role,
      roadmaps: roadmaps || []
    };
  }
}

module.exports = JobRole;
