const { query } = require('../config/database');

class UserSkill {
  // Add a skill to user
  static async create(userId, skillId, proficiencyLevel, yearsOfExperience) {
    const text = `
      INSERT INTO user_skills (user_id, skill_id, proficiency_level, years_of_experience)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, skill_id) 
      DO UPDATE SET 
        proficiency_level = EXCLUDED.proficiency_level,
        years_of_experience = EXCLUDED.years_of_experience,
        updated_at = NOW()
      RETURNING *
    `;
    const values = [userId, skillId, proficiencyLevel, yearsOfExperience];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Get all skills for a user
  static async getUserSkills(userId) {
    const text = `
      SELECT 
        us.*,
        s.name as skill_name,
        s.category as skill_category
      FROM user_skills us
      JOIN skills s ON us.skill_id = s.id
      WHERE us.user_id = $1
      ORDER BY us.created_at DESC
    `;
    const result = await query(text, [userId]);
    return result.rows;
  }

  // Get users with a specific skill
  static async getUsersWithSkill(skillId) {
    const text = `
      SELECT 
        us.*,
        u.email,
        u.full_name,
        p.title,
        p.experience_level
      FROM user_skills us
      JOIN users u ON us.user_id = u.id
      LEFT JOIN profiles p ON us.user_id = p.user_id
      WHERE us.skill_id = $1
      ORDER BY us.years_of_experience DESC
    `;
    const result = await query(text, [skillId]);
    return result.rows;
  }

  // Update user skill
  static async update(userId, skillId, updates) {
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

    values.push(userId, skillId);
    const text = `
      UPDATE user_skills 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount} AND skill_id = $${paramCount + 1}
      RETURNING *
    `;
    
    const result = await query(text, values);
    return result.rows[0];
  }

  // Delete user skill
  static async delete(userId, skillId) {
    const text = 'DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2 RETURNING *';
    const result = await query(text, [userId, skillId]);
    return result.rows[0];
  }

  // Delete all skills for a user
  static async deleteAllUserSkills(userId) {
    const text = 'DELETE FROM user_skills WHERE user_id = $1';
    const result = await query(text, [userId]);
    return result.rowCount;
  }

  // Get skill proficiency statistics
  static async getSkillStats(skillId) {
    const text = `
      SELECT 
        COUNT(*) as total_users,
        AVG(years_of_experience) as avg_experience,
        COUNT(CASE WHEN proficiency_level = 'beginner' THEN 1 END) as beginners,
        COUNT(CASE WHEN proficiency_level = 'intermediate' THEN 1 END) as intermediate,
        COUNT(CASE WHEN proficiency_level = 'advanced' THEN 1 END) as advanced,
        COUNT(CASE WHEN proficiency_level = 'expert' THEN 1 END) as experts
      FROM user_skills
      WHERE skill_id = $1
    `;
    const result = await query(text, [skillId]);
    return result.rows[0];
  }

  // Bulk add skills to user
  static async bulkCreate(userId, skills) {
    const values = [];
    const placeholders = [];
    
    skills.forEach((skill, index) => {
      const offset = index * 4;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
      values.push(
        userId, 
        skill.skillId, 
        skill.proficiencyLevel || 'beginner', 
        skill.yearsOfExperience || 0
      );
    });

    const text = `
      INSERT INTO user_skills (user_id, skill_id, proficiency_level, years_of_experience)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (user_id, skill_id) 
      DO UPDATE SET 
        proficiency_level = EXCLUDED.proficiency_level,
        years_of_experience = EXCLUDED.years_of_experience,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await query(text, values);
    return result.rows;
  }
}

module.exports = UserSkill;