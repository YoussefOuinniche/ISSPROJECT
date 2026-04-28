const { supabaseAdmin } = require('../config/database');

class Progress {
  // Get all user progress
  static async findAll(filters = {}) {
    let query = supabaseAdmin
      .from('user_progress')
      .select('*');

    if (filters.profile_id) {
      query = query.eq('profile_id', filters.profile_id);
    }

    if (filters.course_id) {
      query = query.eq('course_id', filters.course_id);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get progress by ID
  static async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('user_progress')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Get user's course progress
  static async getUserCourseProgress(profileId, courseId) {
    const { data, error } = await supabaseAdmin
      .from('user_progress')
      .select('*')
      .eq('profile_id', profileId)
      .eq('course_id', courseId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Get user's all course progress
  static async getUserProgress(profileId, filters = {}) {
    let query = supabaseAdmin
      .from('user_progress')
      .select(`
        *,
        courses!inner (id, title, slug, difficulty, duration_hours)
      `)
      .eq('profile_id', profileId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(progress => ({
      ...progress,
      course: progress.courses
    }));
  }

  // Create progress entry
  static async create(progressData) {
    const { profile_id, course_id, status, progress_pct, started_at } = progressData;

    const { data, error } = await supabaseAdmin
      .from('user_progress')
      .insert([{
        profile_id,
        course_id,
        status: status || 'not_started',
        progress_pct: progress_pct || 0,
        started_at: started_at || null
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update progress
  static async update(id, progressData) {
    const { status, progress_pct, completed_at } = progressData;

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (progress_pct !== undefined) updateData.progress_pct = progress_pct;
    if (completed_at !== undefined) updateData.completed_at = completed_at;
    updateData.updated_at = new Date();

    // Auto-mark as completed if progress is 100%
    if (progress_pct === 100 && status !== 'completed') {
      updateData.status = 'completed';
      updateData.completed_at = new Date();
    }

    const { data, error } = await supabaseAdmin
      .from('user_progress')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Start course
  static async startCourse(profileId, courseId) {
    const existing = await this.getUserCourseProgress(profileId, courseId);

    if (existing) {
      return this.update(existing.id, { status: 'in_progress', started_at: new Date() });
    }

    return this.create({
      profile_id: profileId,
      course_id: courseId,
      status: 'in_progress',
      progress_pct: 0,
      started_at: new Date()
    });
  }

  // Complete course
  static async completeCourse(profileId, courseId) {
    const existing = await this.getUserCourseProgress(profileId, courseId);

    if (!existing) {
      return this.create({
        profile_id: profileId,
        course_id: courseId,
        status: 'completed',
        progress_pct: 100,
        started_at: new Date(),
        completed_at: new Date()
      });
    }

    return this.update(existing.id, {
      status: 'completed',
      progress_pct: 100,
      completed_at: new Date()
    });
  }

  // Get user statistics
  static async getUserStatistics(profileId) {
    const { data, error } = await supabaseAdmin
      .from('user_progress')
      .select('status, progress_pct')
      .eq('profile_id', profileId);

    if (error) throw error;

    const stats = {
      total_courses: data.length,
      completed: 0,
      in_progress: 0,
      not_started: 0,
      dropped: 0,
      average_progress: 0,
      total_progress: 0
    };

    data.forEach(progress => {
      stats[progress.status] = (stats[progress.status] || 0) + 1;
      stats.total_progress += progress.progress_pct;
    });

    stats.average_progress = stats.total_courses > 0 
      ? Math.round(stats.total_progress / stats.total_courses) 
      : 0;

    return stats;
  }

  // Delete progress entry
  static async delete(id) {
    const { data, error } = await supabaseAdmin
      .from('user_progress')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = Progress;
