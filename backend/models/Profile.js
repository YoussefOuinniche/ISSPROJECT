

const { supabase } = require('../config/database');

class Profile {
  // Create a new profile
  static async create(userId, profileData) {
    const { domain, title, experienceLevel, bio } = profileData;
    const { data, error } = await supabase
      .from('profiles')
      .insert({ user_id: userId, domain, title, experience_level: experienceLevel, bio })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Find profile by user ID
  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Find profile by ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Update profile
  static async update(userId, updates) {
    const dbUpdates = {};
    Object.keys(updates).forEach(key => {
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

  // Update last analysis timestamp
  static async updateLastAnalysis(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ last_analysis_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Delete profile
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

  // Get profile with user information (PostgREST embedded join)
  static async getFullProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, users(email, full_name, created_at)')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { users: user, ...profile } = data;
    return { ...profile, email: user?.email, full_name: user?.full_name, user_created_at: user?.created_at };
  }

  // Get all profiles (admin)
  static async findAll(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, users(email, full_name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data || []).map(row => {
      const { users: user, ...profile } = row;
      return { ...profile, email: user?.email, full_name: user?.full_name };
    });
  }
}

module.exports = Profile;