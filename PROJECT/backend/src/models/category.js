const { supabaseAdmin } = require('../config/database');

class Category {
  // Get all categories
  static async findAll(filters = {}) {
    let query = supabaseAdmin
      .from('categories')
      .select(`
        *,
        skills!left (count),
        courses!left (count),
        job_roles!left (count)
      `);

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Get category by ID
  static async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select(`
        *,
        skills!left (*),
        courses!left (*),
        job_roles!left (*)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Get category by slug
  static async findBySlug(slug) {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Create category
  static async create(categoryData) {
    const { name, slug, description, icon } = categoryData;

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([{
        name,
        slug,
        description,
        icon
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update category
  static async update(id, categoryData) {
    const { name, slug, description, icon } = categoryData;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    updateData.updated_at = new Date();

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete category
  static async delete(id) {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get category statistics
  static async getStatistics(id) {
    const { data: skills } = await supabaseAdmin
      .from('skills')
      .select('id')
      .eq('category_id', id);

    const { data: courses } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('category_id', id);

    const { data: roles } = await supabaseAdmin
      .from('job_roles')
      .select('id')
      .eq('category_id', id);

    return {
      total_skills: skills?.length || 0,
      total_courses: courses?.length || 0,
      total_job_roles: roles?.length || 0
    };
  }
}

module.exports = Category;
