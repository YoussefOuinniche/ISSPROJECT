const { supabaseAdmin } = require('../config/database');

class Plan {
  // Get all plans
  static async findAll() {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .order('price_usd', { ascending: true });
    
    if (error) throw error;
    return data;
  }
  
  // Get plan by ID
  static async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
  
  // Get plan by slug
  static async findBySlug(slug) {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
  
  // Create plan
  static async create(planData) {
    const { name, slug, price_usd, billing_period, max_roadmaps, features, is_active } = planData;
    
    const { data, error } = await supabaseAdmin
      .from('plans')
      .insert([{
        name,
        slug,
        price_usd,
        billing_period,
        max_roadmaps,
        features: features || {},
        is_active: is_active !== undefined ? is_active : true
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Update plan
  static async update(id, planData) {
    const { name, slug, price_usd, billing_period, max_roadmaps, features, is_active } = planData;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (price_usd !== undefined) updateData.price_usd = price_usd;
    if (billing_period !== undefined) updateData.billing_period = billing_period;
    if (max_roadmaps !== undefined) updateData.max_roadmaps = max_roadmaps;
    if (features !== undefined) updateData.features = features;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date();
    
    const { data, error } = await supabaseAdmin
      .from('plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Delete plan
  static async delete(id) {
    // Check if plan has active subscriptions
    const { count, error: countError } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', id)
      .in('status', ['active', 'trialing']);
    
    if (countError) throw countError;
    
    if (count > 0) {
      throw new Error('Cannot delete plan with active subscriptions');
    }
    
    const { data, error } = await supabaseAdmin
      .from('plans')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Get plan subscriptions count
  static async getSubscriptionsCount(planId) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('status')
      .eq('plan_id', planId);
    
    if (error) throw error;
    
    const counts = {};
    data.forEach(sub => {
      counts[sub.status] = (counts[sub.status] || 0) + 1;
    });
    
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }
}

module.exports = Plan;