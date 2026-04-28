const { supabaseAdmin } = require('../config/database');

class Subscription {
  // Get all subscriptions
  static async findAll(filters = {}) {
    let query = supabaseAdmin
      .from('subscriptions')
      .select('*');
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.plan_id) {
      query = query.eq('plan_id', filters.plan_id);
    }
    
    if (filters.profile_id) {
      query = query.eq('profile_id', filters.profile_id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data;
  }
  
  // Get subscription by ID
  static async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        profiles!inner (full_name, email, experience_level),
        plans!inner (*)
      `)
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    return {
      ...data,
      user_name: data.profiles.full_name,
      user_email: data.profiles.email,
      user_experience_level: data.profiles.experience_level,
      plan: data.plans
    };
  }
  
  // Get active subscriptions for a user
  static async getActiveByUser(profileId) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        plans!inner (*)
      `)
      .eq('profile_id', profileId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(sub => ({
      ...sub,
      plan: sub.plans
    }));
  }
  
  // Create subscription
  static async create(subscriptionData) {
    const { 
      profile_id, 
      plan_id, 
      status, 
      stripe_subscription_id, 
      current_period_start, 
      current_period_end 
    } = subscriptionData;
    
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .insert([{
        profile_id,
        plan_id,
        status: status || 'active',
        stripe_subscription_id,
        current_period_start: current_period_start || new Date(),
        current_period_end: current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Update subscription
  static async update(id, subscriptionData) {
    const { status, stripe_subscription_id, current_period_start, current_period_end, cancelled_at } = subscriptionData;
    
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (stripe_subscription_id !== undefined) updateData.stripe_subscription_id = stripe_subscription_id;
    if (current_period_start !== undefined) updateData.current_period_start = current_period_start;
    if (current_period_end !== undefined) updateData.current_period_end = current_period_end;
    if (cancelled_at !== undefined) updateData.cancelled_at = cancelled_at;
    updateData.updated_at = new Date();
    
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Cancel subscription
  static async cancel(id) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({ 
        status: 'cancelled', 
        cancelled_at: new Date(),
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Get subscription statistics
  static async getStatistics() {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('status, plan_id, plans!inner(price_usd)');
    
    if (error) throw error;
    
    const total = data.length;
    const active = data.filter(s => s.status === 'active').length;
    const trialing = data.filter(s => s.status === 'trialing').length;
    const cancelled = data.filter(s => s.status === 'cancelled').length;
    
    // Calculate monthly recurring revenue (MRR)
    const mrr = data
      .filter(s => s.status === 'active')
      .reduce((sum, sub) => {
        const price = sub.plans?.price_usd || 0;
        return sum + price;
      }, 0);
    
    return {
      total_subscriptions: total,
      active_subscriptions: active,
      trialing_subscriptions: trialing,
      cancelled_subscriptions: cancelled,
      monthly_recurring_revenue: mrr
    };
  }
  
  // Get expiring subscriptions (next 7 days)
  static async getExpiringSoon() {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        profiles!inner (full_name, email),
        plans!inner (name)
      `)
      .eq('status', 'active')
      .lte('current_period_end', sevenDaysFromNow.toISOString())
      .gte('current_period_end', new Date().toISOString())
      .order('current_period_end', { ascending: true });
    
    if (error) throw error;
    
    return data.map(sub => ({
      id: sub.id,
      user_name: sub.profiles.full_name,
      user_email: sub.profiles.email,
      plan_name: sub.plans.name,
      expires_at: sub.current_period_end
    }));
  }
}

module.exports = Subscription;