const { supabase } = require('../config/database');

class Recommendation {
  // Create a new recommendation
  static async create(userId, recommendationData) {
    const { type, title, content, skillName, skillId, trendTitle, trendId } = recommendationData;
    const { data, error } = await supabase
      .from('recommendations')
      .insert({
        user_id: userId, type, title, content,
        skill_name: skillName || null, skill_id: skillId || null,
        trend_title: trendTitle || null, trend_id: trendId || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Get all recommendations for a user
  static async findByUserId(userId, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('recommendations')
      .select('*, skills(name, category), trends(title, domain)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data || []).map(r => _flattenRec(r));
  }

  // Get recommendations by type
  static async findByUserAndType(userId, type, limit = 20) {
    const { data, error } = await supabase
      .from('recommendations')
      .select('*, skills(name, category), trends(title, domain)')
      .eq('user_id', userId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(r => _flattenRec(r));
  }

  // Find recommendation by ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('recommendations')
      .select('*, skills(name, category), trends(title, domain)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? _flattenRec(data) : null;
  }

  // Update recommendation
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
      .from('recommendations')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Delete recommendation
  static async delete(id) {
    const { data, error } = await supabase
      .from('recommendations')
      .delete()
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Delete all recommendations for a user
  static async deleteAllByUserId(userId) {
    const { error, count } = await supabase
      .from('recommendations')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
    return count;
  }

  // Delete recommendations by type
  static async deleteByUserAndType(userId, type) {
    const { error, count } = await supabase
      .from('recommendations')
      .delete()
      .eq('user_id', userId)
      .eq('type', type);
    if (error) throw error;
    return count;
  }

  // Get recommendation counts by type (computed in JS)
  static async getRecommendationStats(userId) {
    const { data, error } = await supabase
      .from('recommendations')
      .select('type')
      .eq('user_id', userId);
    if (error) throw error;
    const counts = {};
    (data || []).forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Get recent recommendations
  static async getRecentRecommendations(userId, days = 7, limit = 10) {
    const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('recommendations')
      .select('*, skills(name), trends(title)')
      .eq('user_id', userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(r => ({
      ...r,
      skill_full_name: r.skills?.name,
      trend_full_title: r.trends?.title,
      skills: undefined,
      trends: undefined,
    }));
  }

  // Bulk create recommendations
  static async bulkCreate(userId, recommendations) {
    const { data, error } = await supabase
      .from('recommendations')
      .insert(recommendations.map(rec => ({
        user_id: userId,
        type: rec.type,
        title: rec.title,
        content: rec.content,
        skill_name: rec.skillName || null,
        skill_id: rec.skillId || null,
        trend_title: rec.trendTitle || null,
        trend_id: rec.trendId || null,
      })))
      .select();
    if (error) throw error;
    return data || [];
  }
}

// Helper: flatten embedded join fields onto the recommendation row
function _flattenRec(r) {
  return {
    ...r,
    skill_full_name: r.skills?.name,
    skill_category: r.skills?.category,
    trend_full_title: r.trends?.title,
    trend_domain: r.trends?.domain,
    skills: undefined,
    trends: undefined,
  };
}

module.exports = Recommendation;