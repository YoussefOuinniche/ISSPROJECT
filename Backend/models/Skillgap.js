const { query } = require('../config/database');

class SkillGap {
  // Create a new skill gap
  static async create(userId, gapData) {
    const { domain, skillName, skillId, gapLevel, reason } = gapData;
    const text = `
      INSERT INTO skill_gaps (user_id, domain, skill_name, skill_id, gap_level, reason)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [userId, domain, skillName, skillId || null, gapLevel, reason];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Get all skill gaps for a user
  static async findByUserId(userId) {
    const text = `
      SELECT 
        sg.*,
        s.name as skill_full_name,
        s.category as skill_category
      FROM skill_gaps sg
      LEFT JOIN skills s ON sg.skill_id = s.id
      WHERE sg.user_id = $1
      ORDER BY sg.gap_level DESC, sg.created_at DESC
    `;
    const result = await query(text, [userId]);
    return result.rows;
  }

  // Get skill gaps by domain
  static async findByUserAndDomain(userId, domain) {
    const text = `
      SELECT 
        sg.*,
        s.name as skill_full_name,
        s.category as skill_category
      FROM skill_gaps sg
      LEFT JOIN skills s ON sg.skill_id = s.id
      WHERE sg.user_id = $1 AND sg.domain = $2
      ORDER BY sg.gap_level DESC
    `;
    const result = await query(text, [userId, domain]);
    return result.rows;
  }

  // Find skill gap by ID
  static async findById(id) {
    const text = `
      SELECT 
        sg.*,
        s.name as skill_full_name,
        s.category as skill_category
      FROM skill_gaps sg
      LEFT JOIN skills s ON sg.skill_id = s.id
      WHERE sg.id = $1
    `;
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Update skill gap
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
      UPDATE skill_gaps 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await query(text, values);
    return result.rows[0];
  }

  // Delete skill gap
  static async delete(id) {
    const text = 'DELETE FROM skill_gaps WHERE id = $1 RETURNING *';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Delete all skill gaps for a user
  static async deleteAllByUserId(userId) {
    const text = 'DELETE FROM skill_gaps WHERE user_id = $1';
    const result = await query(text, [userId]);
    return result.rowCount;
  }

  // Get high priority gaps (gap_level >= 4)
  static async getHighPriorityGaps(userId) {
    const text = `
      SELECT 
        sg.*,
        s.name as skill_full_name,
        s.category as skill_category
      FROM skill_gaps sg
      LEFT JOIN skills s ON sg.skill_id = s.id
      WHERE sg.user_id = $1 AND sg.gap_level >= 4
      ORDER BY sg.gap_level DESC
    `;
    const result = await query(text, [userId]);
    return result.rows;
  }

  // Get gap statistics for a user
  static async getUserGapStats(userId) {
    const text = `
      SELECT 
        COUNT(*) as total_gaps,
        AVG(gap_level) as avg_gap_level,
        COUNT(CASE WHEN gap_level >= 4 THEN 1 END) as high_priority_count,
        COUNT(DISTINCT domain) as domains_with_gaps
      FROM skill_gaps
      WHERE user_id = $1
    `;
    const result = await query(text, [userId]);
    return result.rows[0];
  }

  // Bulk create skill gaps
  static async bulkCreate(userId, gaps) {
    const values = [];
    const placeholders = [];
    
    gaps.forEach((gap, index) => {
      const offset = index * 6;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
      values.push(
        userId,
        gap.domain,
        gap.skillName,
        gap.skillId || null,
        gap.gapLevel || 3,
        gap.reason
      );
    });

    const text = `
      INSERT INTO skill_gaps (user_id, domain, skill_name, skill_id, gap_level, reason)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;
    
    const result = await query(text, values);
    return result.rows;
  }
}

module.exports = SkillGap;