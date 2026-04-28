const { supabaseAdmin } = require('../config/database');

class JobMarketTrend {
  // Get all job market trends
  static async findAll(filters = {}) {
    let query = supabaseAdmin
      .from('job_market_trends')
      .select(`
        *,
        job_roles!inner (title, slug, category_id)
      `);

    if (filters.job_role_id) {
      query = query.eq('job_role_id', filters.job_role_id);
    }

    if (filters.demand_index) {
      query = query.eq('demand_index', filters.demand_index);
    }

    const { data, error } = await query.order('last_analyzed_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get trend by ID
  static async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('job_market_trends')
      .select(`
        *,
        job_roles!inner (*)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Get trend by job role ID
  static async getByJobRoleId(jobRoleId) {
    const { data, error } = await supabaseAdmin
      .from('job_market_trends')
      .select('*')
      .eq('job_role_id', jobRoleId)
      .order('last_analyzed_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Create or update trend
  static async upsert(trendData) {
    const { job_role_id, growth_percentage, openings_count, demand_index } = trendData;

    const existing = await this.getByJobRoleId(job_role_id);

    if (existing) {
      return this.update(existing.id, trendData);
    }

    const { data, error } = await supabaseAdmin
      .from('job_market_trends')
      .insert([{
        job_role_id,
        growth_percentage,
        openings_count,
        demand_index,
        last_analyzed_at: new Date()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update trend
  static async update(id, trendData) {
    const { growth_percentage, openings_count, demand_index } = trendData;

    const updateData = {};
    if (growth_percentage !== undefined) updateData.growth_percentage = growth_percentage;
    if (openings_count !== undefined) updateData.openings_count = openings_count;
    if (demand_index !== undefined) updateData.demand_index = demand_index;
    updateData.last_analyzed_at = new Date();
    updateData.updated_at = new Date();

    const { data, error } = await supabaseAdmin
      .from('job_market_trends')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get trending roles
  static async getTrendingRoles(limit = 10) {
    const { data, error } = await supabaseAdmin
      .from('job_market_trends')
      .select(`
        *,
        job_roles!inner (title, slug)
      `)
      .eq('demand_index', 'surging')
      .order('growth_percentage', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Get declining roles
  static async getDecliningRoles(limit = 10) {
    const { data, error } = await supabaseAdmin
      .from('job_market_trends')
      .select(`
        *,
        job_roles!inner (title, slug)
      `)
      .eq('demand_index', 'declining')
      .order('growth_percentage', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Get stable roles
  static async getStableRoles(limit = 10) {
    const { data, error } = await supabaseAdmin
      .from('job_market_trends')
      .select(`
        *,
        job_roles!inner (title, slug)
      `)
      .eq('demand_index', 'stable')
      .order('openings_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Get market statistics
  static async getMarketStatistics() {
    const { data, error } = await supabaseAdmin
      .from('job_market_trends')
      .select('growth_percentage, openings_count, demand_index');

    if (error) throw error;

    let stats = {
      total_roles_analyzed: data.length,
      avg_growth_percentage: 0,
      total_openings: 0,
      surging_count: 0,
      stable_count: 0,
      declining_count: 0
    };

    if (data.length === 0) return stats;

    let totalGrowth = 0;
    data.forEach(trend => {
      totalGrowth += trend.growth_percentage || 0;
      stats.total_openings += trend.openings_count || 0;

      if (trend.demand_index === 'surging') stats.surging_count++;
      else if (trend.demand_index === 'stable') stats.stable_count++;
      else if (trend.demand_index === 'declining') stats.declining_count++;
    });

    stats.avg_growth_percentage = Math.round(totalGrowth / data.length * 100) / 100;

    return stats;
  }

  // Delete trend
  static async delete(id) {
    const { data, error } = await supabaseAdmin
      .from('job_market_trends')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = JobMarketTrend;
