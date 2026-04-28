const { supabaseAdmin } = require('../config/database');

class Notification {
  // Get all notifications for a user
  static async getUserNotifications(profileId, filters = {}) {
    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('profile_id', profileId);

    if (filters.is_read !== undefined) {
      query = query.eq('is_read', filters.is_read);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get notification by ID
  static async getById(id) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Create notification
  static async create(notificationData) {
    const { profile_id, type, title, body, sent_at } = notificationData;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert([{
        profile_id,
        type,
        title,
        body,
        is_read: false,
        sent_at: sent_at || new Date()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Mark as read
  static async markAsRead(id) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Mark all as read for user
  static async markAllAsRead(profileId) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('profile_id', profileId)
      .eq('is_read', false)
      .select();

    if (error) throw error;
    return data;
  }

  // Get unread count
  static async getUnreadCount(profileId) {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  }

  // Delete notification
  static async delete(id) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete all read notifications for user
  static async deleteAllRead(profileId) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('profile_id', profileId)
      .eq('is_read', true)
      .select();

    if (error) throw error;
    return data;
  }

  // Send reminder notification
  static async sendReminder(profileId, title, body) {
    return this.create({
      profile_id: profileId,
      type: 'reminder',
      title,
      body
    });
  }

  // Send achievement notification
  static async sendAchievement(profileId, title, body) {
    return this.create({
      profile_id: profileId,
      type: 'achievement',
      title,
      body
    });
  }

  // Send system notification
  static async sendSystemNotification(profileId, title, body) {
    return this.create({
      profile_id: profileId,
      type: 'system',
      title,
      body
    });
  }

  // Send roadmap update notification
  static async sendRoadmapUpdate(profileId, title, body) {
    return this.create({
      profile_id: profileId,
      type: 'roadmap_update',
      title,
      body
    });
  }

  // Get statistics
  static async getUserNotificationStats(profileId) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('type, is_read')
      .eq('profile_id', profileId);

    if (error) throw error;

    const stats = {
      total: data.length,
      unread: 0,
      read: 0,
      by_type: {
        reminder: 0,
        achievement: 0,
        system: 0,
        roadmap_update: 0
      }
    };

    data.forEach(notif => {
      if (notif.is_read) stats.read++;
      else stats.unread++;

      stats.by_type[notif.type] = (stats.by_type[notif.type] || 0) + 1;
    });

    return stats;
  }
}

module.exports = Notification;
