const { query } = require('../config/database');

class Recommendation {
  // Create a new recommendation
  static async create(userId, recommendationData) {
    const { type, title, content, skillName, skillId, trendTitle, trendId } = recommendationData;
    const text = `
      INSERT INTO recommendations (user_id, type, title, content, skill_name, skill_id, trend_title, trend_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [userId, type, title, content, skillName || null, skillId || null, trendTitle || null, trendId || null];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Get all recommendations for a user
  static async findByUserId(userId, limit = 50, offset = 0) {
    const text = `
      SELECT 
        r.*,
        s.name as skill_full_name,
        s.category as skill_category,
        t.title as trend_full_title,
        t.domain as trend_domain
      FROM recommendations r
      LEFT JOIN skills s ON r.skill_id = s.id
      LEFT JOIN trends t ON r.trend_id = t.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await query(text, [userId, limit, offset]);
    return result.rows;
  }

  // Get recommendations by type
  static async findByUserAndType(userId, type, limit = 20) {
    const text = `
      SELECT 
        r.*,
        s.name as skill_full_name,
        s.category as skill_category,
        t.title as trend_full_title,
        t.domain as trend_domain
      FROM recommendations r
      LEFT JOIN skills s ON r.skill_id = s.id
      LEFT JOIN trends t ON r.trend_id = t.id
      WHERE r.user_id = $1 AND r.type = $2
      ORDER BY r.created_at DESC
      LIMIT $3
    `;
    const result = await query(text, [userId, type, limit]);
    return result.rows;
  }

  // Find recommendation by ID
  static async findById(id) {
    const text = `
      SELECT 
        r.*,
        s.name as skill_full_name,
        s.category as skill_category,
        t.title as trend_full_title,
        t.domain as trend_domain
      FROM recommendations r
      LEFT JOIN skills s ON r.skill_id = s.id
      LEFT JOIN trends t ON r.trend_id = t.id
      WHERE r.id = $1
    `;
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Update recommendation
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const text = `
      UPDATE recommendations 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await query(text, values);
    return result.rows[0];
  }

  // Delete recommendation
  static async delete(id) {
    const text = 'DELETE FROM recommendations WHERE id = $1 RETURNING *';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Delete all recommendations for a user
  static async deleteAllByUserId(userId) {
    const text = 'DELETE FROM recommendations WHERE user_id = $1';
    const result = await query(text, [userId]);
    return result.rowCount;
  }

  // Delete recommendations by type
  static async deleteByUserAndType(userId, type) {
    const text = 'DELETE FROM recommendations WHERE user_id = $1 AND type = $2';
    const result = await query(text, [userId, type]);
    return result.rowCount;
  }

  // Get recommendation counts by type
  static async getRecommendationStats(userId) {
    const text = `
      SELECT 
        type,
        COUNT(*) as count
      FROM recommendations
      WHERE user_id = $1
      GROUP BY type
      ORDER BY count DESC
    `;
    const result = await query(text, [userId]);
    return result.rows;
  }

  // Get recent recommendations
  static async getRecentRecommendations(userId, days = 7, limit = 10) {
    const text = `
      SELECT 
        r.*,
        s.name as skill_full_name,
        t.title as trend_full_title
      FROM recommendations r
      LEFT JOIN skills s ON r.skill_id = s.id
      LEFT JOIN trends t ON r.trend_id = t.id
      WHERE r.user_id = $1 
      AND r.created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY r.created_at DESC
      LIMIT $2
    `;
    const result = await query(text, [userId, limit]);
    return result.rows;
  }

  // Bulk create recommendations
  static async bulkCreate(userId, recommendations) {
    const values = [];
    const placeholders = [];
    
    recommendations.forEach((rec, index) => {
      const offset = index * 8;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
      values.push(
        userId,
        rec.type,
        rec.title,
        rec.content,
        rec.skillName || null,
        rec.skillId || null,
        rec.trendTitle || null,
        rec.trendId || null
      );
    });

    const text = `
      INSERT INTO recommendations (user_id, type, title, content, skill_name, skill_id, trend_title, trend_id)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;
    
    const result = await query(text, values);
    return result.rows;
  }
}

module.exports = Recommendation;