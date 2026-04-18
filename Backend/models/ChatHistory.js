const { supabase } = require('../config/database');

class ChatHistory {
  // --- Sessions ---
  static async getSessions(userId) {
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      // Graceful fallback for local development if table isn't migrated
      console.warn("Could not load sessions", error.message);
      return [];
    }
    return data || [];
  }

  static async createSession(userId, title = 'New Conversation') {
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({ user_id: userId, title })
      .select('id, title, created_at, updated_at')
      .single();

    if (error) throw error;
    return data;
  }

  static async updateSessionTitle(sessionId, title) {
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select('id, title')
      .single();

    if (error) throw error;
    return data;
  }

  // --- Messages ---
  static async findSessionMessages(sessionId, userId, limit = 100) {
    if (!sessionId) return [];
    
    const safeLimit = Number.isFinite(limit)
      ? Math.max(1, Math.min(200, Number(limit)))
      : 100;

    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('id, role, content, created_at, session_id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(safeLimit);

    if (error) throw error;

    // Map `content` -> `message` to minimize breaking changes downstream
    return (data || []).map(row => ({
      ...row,
      message: row.content
    }));
  }

  // Keep `findByUserId` strictly as a fallback or return empty since chat_history is deprecated
  static async findByUserId(userId, limit = 100) {
    // If a generic history call is made without a session, return empty
    // since we strictly use ai_chat_sessions now.
    return [];
  }

  static async create(userId, role, message, sessionId = null) {
    if (!sessionId) {
      const newSession = await this.createSession(userId, message.substring(0, 32));
      sessionId = newSession.id;
    }

    const payload = {
      session_id: sessionId,
      role,
      content: message, // mapped to the new schema
    };

    const { data, error } = await supabase
      .from('ai_chat_messages')
      .insert(payload)
      .select('id, role, content, created_at, session_id')
      .single();

    if (error) {
      throw error;
    }

    await supabase
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    // Map `content` -> `message` to minimize breaking changes
    return {
      ...data,
      message: data.content
    };
  }
}

module.exports = ChatHistory;
