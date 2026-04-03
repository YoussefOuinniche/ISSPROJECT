const { supabase } = require('../config/database');
const { appendChatMessage, getChatHistory } = require('./LocalAiFallbackStore');

let hasWarnedAboutMissingChatHistoryTable = false;

function isMissingChatHistoryTableError(error) {
  if (!error || typeof error !== 'object') return false;

  return (
    error.code === 'PGRST205' &&
    typeof error.message === 'string' &&
    error.message.includes('chat_history')
  );
}

function warnMissingChatHistoryTable(error) {
  if (hasWarnedAboutMissingChatHistoryTable) {
    return;
  }

  hasWarnedAboutMissingChatHistoryTable = true;
  console.warn(
    '[ChatHistory] chat_history table is missing or not exposed yet. Returning an empty history until the migration is applied.',
    error.message
  );
}

class ChatHistory {
  static async findByUserId(userId, limit = 100) {
    const safeLimit = Number.isFinite(limit)
      ? Math.max(1, Math.min(200, Number(limit)))
      : 100;

    const { data, error } = await supabase
      .from('chat_history')
      .select('id, role, message, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(safeLimit);

    if (error) {
      if (isMissingChatHistoryTableError(error)) {
        warnMissingChatHistoryTable(error);
        return getChatHistory(userId).slice(-safeLimit);
      }
      throw error;
    }
    return data || [];
  }

  static async create(userId, role, message) {
    const payload = {
      user_id: userId,
      role,
      message,
    };

    const { data, error } = await supabase
      .from('chat_history')
      .insert(payload)
      .select('id, role, message, created_at')
      .single();

    if (error) {
      if (isMissingChatHistoryTableError(error)) {
        warnMissingChatHistoryTable(error);
        return appendChatMessage(userId, {
          role,
          message,
        });
      }
      throw error;
    }

    return data;
  }
}

module.exports = ChatHistory;
