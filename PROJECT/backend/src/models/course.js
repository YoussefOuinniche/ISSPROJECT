const { supabaseAdmin } = require('../config/database');

class Course {
  // Get all courses
  static async findAll(filters = {}) {
    let query = supabaseAdmin
      .from('courses')
      .select(`
        id,
        title,
        slug,
        description,
        provider,
        url,
        thumbnail_url,
        duration_hours,
        difficulty,
        category_id,
        is_active,
        created_at,
        updated_at
      `);
    
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active === 'true');
    }
    
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data;
  }
  
  // Get course by ID
  static async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('courses')
      .select(`
        *,
        categories!left (id, name, slug, description, icon),
        skills!left (id, name, slug, description, skill_type)
      `)
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    
    // Get completion statistics
    const { count: totalEnrollments, error: enrollError } = await supabaseAdmin
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id);
    
    if (enrollError) throw enrollError;
    
    const { count: completions, error: compError } = await supabaseAdmin
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id)
      .eq('status', 'completed');
    
    if (compError) throw compError;
    
    return {
      ...data,
      category: data.categories,
      skill: data.skills,
      statistics: {
        total_enrollments: totalEnrollments || 0,
        completions: completions || 0,
        completion_rate: totalEnrollments > 0 ? (completions / totalEnrollments) * 100 : 0
      }
    };
  }
  
  // Get course by slug
  static async findBySlug(slug) {
    const { data, error } = await supabaseAdmin
      .from('courses')
      .select(`
        *,
        categories!left (id, name, slug),
        skills!left (id, name, slug)
      `)
      .eq('slug', slug)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
  
  // Get courses by category
  static async getByCategory(categoryId, limit = 20) {
    const { data, error } = await supabaseAdmin
      .from('courses')
      .select(`
        *,
        skills!left (name)
      `)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return data.map(course => ({
      ...course,
      skill_name: course.skills?.name
    }));
  }
  
  // Get courses by skill
  static async getBySkill(skillId, limit = 20) {
    const { data, error } = await supabaseAdmin
      .from('courses')
      .select(`
        *,
        categories!left (name)
      `)
      .eq('skill_id', skillId)
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return data.map(course => ({
      ...course,
      category_name: course.categories?.name
    }));
  }
  
  // Get recommended courses for a user based on their skills and target job
  static async getRecommendedForUser(profileId, limit = 10) {
    // Get user's target job and skills
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('target_job_id')
      .eq('id', profileId)
      .single();
    
    if (profileError) throw profileError;
    
    // Get user's existing skills
    const { data: userSkills, error: skillsError } = await supabaseAdmin
      .from('user_skills')
      .select('skill_id, proficiency_level')
      .eq('profile_id', profileId);
    
    if (skillsError) throw skillsError;
    
    const userSkillIds = userSkills.map(us => us.skill_id);
    
    // Get courses that match either:
    // 1. Skills needed for target job that user doesn't have
    // 2. Popular courses in user's skill gaps
    let query = supabaseAdmin
      .from('courses')
      .select(`
        *,
        categories!left (name),
        skills!left (name)
      `)
      .eq('is_active', true);
    
    if (profile.target_job_id) {
      // Get skills required for target job
      const { data: jobSkills, error: jobError } = await supabaseAdmin
        .from('job_skills')
        .select('skill_id')
        .eq('job_role_id', profile.target_job_id);
      
      if (!jobError && jobSkills) {
        const requiredSkillIds = jobSkills.map(js => js.skill_id);
        const missingSkillIds = requiredSkillIds.filter(id => !userSkillIds.includes(id));
        
        if (missingSkillIds.length > 0) {
          query = query.in('skill_id', missingSkillIds);
        }
      }
    }
    
    const { data, error } = await query
      .order('rating', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return data.map(course => ({
      ...course,
      category_name: course.categories?.name,
      skill_name: course.skills?.name,
      recommendation_reason: userSkillIds.includes(course.skill_id) 
        ? 'Skill improvement' 
        : 'New skill needed for your career path'
    }));
  }
  
  // Create course
  static async create(courseData) {
    const { 
      title, slug, description, provider, url, 
      difficulty_level, duration_hours, is_free, 
      rating, is_active, category_id, skill_id 
    } = courseData;
    
    const { data, error } = await supabaseAdmin
      .from('courses')
      .insert([{
        title,
        slug,
        description,
        provider,
        url,
        difficulty_level,
        duration_hours,
        is_free: is_free !== undefined ? is_free : false,
        rating: rating || null,
        is_active: is_active !== undefined ? is_active : true,
        category_id,
        skill_id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Update course
  static async update(id, courseData) {
    const { 
      title, slug, description, provider, url, 
      difficulty_level, duration_hours, is_free, 
      rating, is_active, category_id, skill_id 
    } = courseData;
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (provider !== undefined) updateData.provider = provider;
    if (url !== undefined) updateData.url = url;
    if (difficulty_level !== undefined) updateData.difficulty_level = difficulty_level;
    if (duration_hours !== undefined) updateData.duration_hours = duration_hours;
    if (is_free !== undefined) updateData.is_free = is_free;
    if (rating !== undefined) updateData.rating = rating;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (skill_id !== undefined) updateData.skill_id = skill_id;
    updateData.updated_at = new Date();
    
    const { data, error } = await supabaseAdmin
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Delete course
  static async delete(id) {
    // Check if course has user progress
    const { count, error: countError } = await supabaseAdmin
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id);
    
    if (countError) throw countError;
    
    if (count > 0) {
      throw new Error('Cannot delete course that has user progress records');
    }
    
    const { data, error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Get course statistics
  static async getStatistics() {
    const { data, error } = await supabaseAdmin
      .from('courses')
      .select(`
        difficulty_level,
        is_free,
        provider,
        rating
      `);
    
    if (error) throw error;
    
    const total = data.length;
    const free = data.filter(c => c.is_free).length;
    const paid = total - free;
    
    const byDifficulty = {
      beginner: data.filter(c => c.difficulty_level === 'beginner').length,
      intermediate: data.filter(c => c.difficulty_level === 'intermediate').length,
      advanced: data.filter(c => c.difficulty_level === 'advanced').length
    };
    
    const byProvider = {};
    data.forEach(course => {
      if (course.provider) {
        byProvider[course.provider] = (byProvider[course.provider] || 0) + 1;
      }
    });
    
    const avgRating = data.reduce((sum, c) => sum + (c.rating || 0), 0) / total;
    
    return {
      total_courses: total,
      free_courses: free,
      paid_courses: paid,
      by_difficulty: byDifficulty,
      by_provider: byProvider,
      average_rating: avgRating.toFixed(2)
    };
  }
}

module.exports = Course;