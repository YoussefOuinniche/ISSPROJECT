const { supabase } = require('../config/database');

class Skill {
  // Create a new skill
  static async create(name, category) {
    const { data, error } = await supabase
      .from('skills')
      .insert({ name, category })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Find skill by ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Find skill by name
  static async findByName(name) {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('name', name)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Get all skills
  static async findAll(limit = 100, offset = 0) {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  }

  // Get skills by category
  static async findByCategory(category, limit = 100, offset = 0) {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  }

  // Search skills by name
  static async search(searchTerm, limit = 20) {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .order('name', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  // Update skill
  static async update(id, updates) {
    const dbUpdates = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) dbUpdates[key] = updates[key];
    });
    if (Object.keys(dbUpdates).length === 0) throw new Error('No fields to update');
    const { data, error } = await supabase
      .from('skills')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Delete skill
  static async delete(id) {
    const { data, error } = await supabase
      .from('skills')
      .delete()
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Get all unique categories
  static async getCategories() {
    const { data, error } = await supabase
      .from('skills')
      .select('category')
      .not('category', 'is', null)
      .order('category', { ascending: true });
    if (error) throw error;
    return [...new Set((data || []).map(r => r.category))];
  }

  // Bulk create skills (ignore duplicates)
  static async bulkCreate(skills) {
    const { data, error } = await supabase
      .from('skills')
      .upsert(
        skills.map(s => ({ name: s.name, category: s.category })),
        { onConflict: 'name', ignoreDuplicates: true }
      )
      .select();
    if (error) throw error;
    return data || [];
  }
}

module.exports = Skill;