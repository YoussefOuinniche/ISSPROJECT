const { supabaseAdmin } = require('../config/database');

class Roadmap {
  // Get all roadmaps (with step counts)
  static async findAll(filters = {}) {
    let query = supabaseAdmin
      .from('ai_roadmaps')
      .select('*');

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.user_id) {
      query = query.eq('profile_id', filters.user_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    if (!data.length) return [];

    // Fetch all step counts in 2 queries (instead of 2N queries)
    const roadmapIds = data.map(r => r.id);

    const [{ data: allSteps }, { data: completedSteps }] = await Promise.all([
      supabaseAdmin
        .from('ai_roadmap_steps')
        .select('roadmap_id')
        .in('roadmap_id', roadmapIds),
      supabaseAdmin
        .from('ai_roadmap_steps')
        .select('roadmap_id')
        .in('roadmap_id', roadmapIds)
        .eq('status', 'completed'),
    ]);

    // Build count maps in JS — O(n), no extra DB round-trips
    const totalMap = {};
    const completedMap = {};
    for (const s of allSteps || [])      totalMap[s.roadmap_id]     = (totalMap[s.roadmap_id]     || 0) + 1;
    for (const s of completedSteps || []) completedMap[s.roadmap_id] = (completedMap[s.roadmap_id] || 0) + 1;

    return data.map(roadmap => ({
      ...roadmap,
      total_steps:     totalMap[roadmap.id]     || 0,
      completed_steps: completedMap[roadmap.id] || 0,
    }));
  }
  
  // Get roadmap by ID with steps
  static async findById(id) {
    // Get roadmap
    const { data: roadmap, error: roadmapError } = await supabaseAdmin
      .from('ai_roadmaps')
      .select('*')
      .eq('id', id)
      .single();
    
    if (roadmapError) throw roadmapError;
    if (!roadmap) return null;
    
    // Get steps
    const { data: steps, error: stepsError } = await supabaseAdmin
      .from('ai_roadmap_steps')
      .select('*')
      .eq('roadmap_id', id)
      .order('step_order', { ascending: true });
    
    if (stepsError) throw stepsError;
    
    return {
      ...roadmap,
      steps: steps
    };
  }
  
  // Update roadmap status
  static async updateStatus(id, status) {
    const { data, error } = await supabaseAdmin
      .from('ai_roadmaps')
      .update({ status, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Delete roadmap
  static async delete(id) {
    const { data, error } = await supabaseAdmin
      .from('ai_roadmaps')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Get roadmap statistics
  static async getStatistics() {
    const { data, error } = await supabaseAdmin
      .from('ai_roadmaps')
      .select('status, estimated_weeks, profile_id');
    
    if (error) throw error;
    
    const total = data.length;
    const active = data.filter(r => r.status === 'active').length;
    const completed = data.filter(r => r.status === 'completed').length;
    const avgWeeks = data.reduce((sum, r) => sum + (r.estimated_weeks || 0), 0) / total;
    const uniqueUsers = new Set(data.map(r => r.profile_id)).size;
    
    return {
      total_roadmaps: total,
      active_roadmaps: active,
      completed_roadmaps: completed,
      avg_estimated_weeks: avgWeeks,
      unique_users: uniqueUsers
    };
  }
}

module.exports = Roadmap;