const { supabaseAdmin } = require('../config/database');

class Chat {
  // Get all chat sessions for a user
  static async getUserSessions(profileId, filters = {}) {
    let query = supabaseAdmin
      .from('chat_sessions')
      .select(`
        *,
        chat_messages!left (count)
      `)
      .eq('profile_id', profileId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get chat session by ID
  static async getSessionById(id) {
    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Create chat session
  static async createSession(profileId, title = null) {
    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert([{
        profile_id: profileId,
        title: title || `Chat ${new Date().toLocaleDateString()}`,
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update session
  static async updateSession(id, updateData) {
    const { title, status } = updateData;

    const data = {};
    if (title !== undefined) data.title = title;
    if (status !== undefined) data.status = status;
    data.updated_at = new Date();

    const { data: result, error } = await supabaseAdmin
      .from('chat_sessions')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // Get session messages
  static async getSessionMessages(sessionId) {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Add message to session
  static async addMessage(sessionId, role, content, metadata = {}) {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert([{
        session_id: sessionId,
        role,
        content,
        metadata
      }])
      .select()
      .single();

    if (error) throw error;

    // Update session's updated_at
    await this.updateSession(sessionId, {});

    return data;
  }

  // Get message by ID
  static async getMessageById(id) {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Delete chat session (and its messages via cascade)
  static async deleteSession(id) {
    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Archive session
  static async archiveSession(id) {
    return this.updateSession(id, { status: 'archived' });
  }

  // Get latest session for user
  static async getLatestSession(profileId) {
    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Search messages
  static async searchMessages(sessionId, query) {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .or(`content.ilike.%${query}%`);

    if (error) throw error;
    return data;
  }

  // Get session statistics
  static async getSessionStatistics(sessionId) {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('role')
      .eq('session_id', sessionId);

    if (error) throw error;

    const stats = {
      total_messages: data.length,
      user_messages: 0,
      assistant_messages: 0,
      system_messages: 0
    };

    data.forEach(msg => {
      if (msg.role === 'user') stats.user_messages++;
      else if (msg.role === 'assistant') stats.assistant_messages++;
      else if (msg.role === 'system') stats.system_messages++;
    });

    return stats;
  }
}

module.exports = Chat;
