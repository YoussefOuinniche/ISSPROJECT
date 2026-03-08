const { supabase } = require('../config/database');

class Trend {
  // Create a new trend
  static async create(trendData) {
    const { domain, title, description, source } = trendData;
    const { data, error } = await supabase
      .from('trends')
      .insert({ domain, title, description, source })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Find trend by ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Get all trends
  static async findAll(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  }

  // Get trends by domain
  static async findByDomain(domain, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .eq('domain', domain)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  }

  // Search trends
  static async search(searchTerm, limit = 20) {
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  // Update trend
  static async update(id, updates) {
    const dbUpdates = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) dbUpdates[key] = updates[key];
    });
    if (Object.keys(dbUpdates).length === 0) throw new Error('No fields to update');
    const { data, error } = await supabase
      .from('trends')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Delete trend
  static async delete(id) {
    const { data, error } = await supabase
      .from('trends')
      .delete()
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Get all unique domains
  static async getDomains() {
    const { data, error } = await supabase
      .from('trends')
      .select('domain')
      .not('domain', 'is', null)
      .order('domain', { ascending: true });
    if (error) throw error;
    return [...new Set((data || []).map(r => r.domain))];
  }

  // Get trend with related skills (via trend_skills junction)
  static async getTrendWithSkills(trendId) {
    const { data, error } = await supabase
      .from('trends')
      .select('*, trend_skills(relevance_score, skills(id, name, category))')
      .eq('id', trendId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    // Reshape to match the original JSON structure
    const { trend_skills, ...trend } = data;
    trend.skills = (trend_skills || []).map(ts => ({
      skill_id: ts.skills?.id,
      skill_name: ts.skills?.name,
      skill_category: ts.skills?.category,
      relevance_score: ts.relevance_score,
    }));
    return trend;
  }

  // Get recent trends (last 30 days)
  static async getRecentTrends(limit = 20) {
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  // Bulk create trends
  static async bulkCreate(trends) {
    const { data, error } = await supabase
      .from('trends')
      .insert(trends.map(t => ({ domain: t.domain, title: t.title, description: t.description, source: t.source })))
      .select();
    if (error) throw error;
    return data || [];
  }
}

  Trend.getDomains = async function () {
    const rows = await this.findAll({
      attributes: [
        [this.sequelize.fn('DISTINCT', this.sequelize.col('domain')), 'domain'],
      ],
    });
    return rows.map((r) => r.get('domain'));
  };

  Trend.getRecentTrends = async function (limit = 20) {
    return await this.findAll({
      order: [['created_at', 'DESC']],
      limit,
    });
  };

  // override create to accept object
  const origCreate = Trend.create.bind(Trend);
  Trend.create = async function (data) {
    return origCreate(data);
  };

  Trend.update = async function (id, updates) {
    const [count] = await this.update(updates, { where: { id } });
    if (!count) return null;
    return this.findByPk(id);
  };

  Trend.delete = async function (id) {
    return await this.destroy({ where: { id } });
  };

  Trend.bulkCreate = async function (arr) {
    return await this.bulkCreate(arr);
  };

  return Trend;
};