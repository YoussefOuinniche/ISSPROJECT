const { supabaseAdmin } = require('../config/database');

class User {
  // Get all users with their profiles
  static async findAll(filters = {}) {
    let query = supabaseAdmin
      .from('profiles')
      .select(`
        id,
        full_name,
        bio,
        avatar_url,
        role,
        created_at,
        subscriptions!left (
          status,
          plans!left (name)
        )
      `);

    if (filters.search) {
      query = query.ilike('full_name', `%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to match expected format
    return data.map(user => ({
      id: user.id,
      full_name: user.full_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      role: user.role,
      created_at: user.created_at,
      subscription_status: user.subscriptions?.[0]?.status,
      plan_name: user.subscriptions?.[0]?.plans?.name
    }));
  }
  
  // Get user by ID
  static async findById(id) {
    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        full_name,
        bio,
        avatar_url,
        role,
        created_at
      `)
      .eq('id', id)
      .single();
    
    if (profileError) throw profileError;
    if (!profile) return null;
    
    // Get user skills
    const { data: skills, error: skillsError } = await supabaseAdmin
      .from('user_skills')
      .select(`
        skill_id,
        proficiency_level,
        skills!inner (name)
      `)
      .eq('profile_id', id);
    
    if (skillsError) throw skillsError;
    
    return {
      ...profile,
      skills: skills.map(s => ({
        skill_id: s.skill_id,
        skill_name: s.skills.name,
        proficiency: s.proficiency_level
      }))
    };
  }
  
  // Create user
  static async create(userData) {
    const { full_name, bio, avatar_url, user_id } = userData;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert([{
        full_name,
        bio,
        avatar_url,
        user_id: user_id || `admin_${Date.now()}`
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Update user
  static async update(id, userData) {
    const { full_name, bio, avatar_url } = userData;

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Delete user
  static async delete(id) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Get user progress
  static async getUserProgress(profileId) {
    const { data, error } = await supabaseAdmin
      .from('user_progress')
      .select(`
        status,
        progress_pct,
        started_at,
        completed_at,
        courses!inner (title, slug)
      `)
      .eq('profile_id', profileId)
      .order('started_at', { ascending: false, nullsFirst: false });
    
    if (error) throw error;
    
    return data.map(progress => ({
      title: progress.courses.title,
      slug: progress.courses.slug,
      status: progress.status,
      progress_pct: progress.progress_pct,
      started_at: progress.started_at,
      completed_at: progress.completed_at,
      days_in_progress: progress.started_at ? 
        Math.floor((new Date() - new Date(progress.started_at)) / (1000 * 60 * 60 * 24)) : null
    }));
  }
  
  // Get user roadmaps
  static async getUserRoadmaps(profileId) {
    const { data, error } = await supabaseAdmin
      .from('ai_roadmaps')
      .select(`
        id,
        title,
        summary,
        estimated_weeks,
        status,
        created_at,
        ai_roadmap_steps (count)
      `)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Get completed steps count for each roadmap
    const roadmapsWithSteps = await Promise.all(data.map(async (roadmap) => {
      const { count: completedSteps, error: stepsError } = await supabaseAdmin
        .from('ai_roadmap_steps')
        .select('*', { count: 'exact', head: true })
        .eq('roadmap_id', roadmap.id)
        .eq('status', 'completed');
      
      if (stepsError) throw stepsError;
      
      return {
        ...roadmap,
        total_steps: roadmap.ai_roadmap_steps?.[0]?.count || 0,
        completed_steps: completedSteps || 0
      };
    }));
    
    return roadmapsWithSteps;
  }
}

module.exports = User;