

const { query } = require('../config/database');

class Profile {
  // Create a new profile
  static async create(userId, profileData) {
    const { domain, title, experienceLevel, bio } = profileData;
    const text = `
      INSERT INTO profiles (user_id, domain, title, experience_level, bio)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [userId, domain, title, experienceLevel, bio];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Find profile by user ID
  static async findByUserId(userId) {
    const text = 'SELECT * FROM profiles WHERE user_id = $1';
    const result = await query(text, [userId]);
    return result.rows[0];
  }

  // Find profile by ID
  static async findById(id) {
    const text = 'SELECT * FROM profiles WHERE id = $1';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Update profile
  static async update(userId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        // Convert camelCase to snake_case for database columns
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(userId);
    const text = `
      UPDATE profiles 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;
    
    const result = await query(text, values);
    return result.rows[0];
  }

  // Update last analysis timestamp
  static async updateLastAnalysis(userId) {
    const text = `
      UPDATE profiles 
      SET last_analysis_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `;
    const result = await query(text, [userId]);
    return result.rows[0];
  }

  // Delete profile
  static async delete(userId) {
    const text = 'DELETE FROM profiles WHERE user_id = $1 RETURNING *';
    const result = await query(text, [userId]);
    return result.rows[0];
  }

  // Get profile with user information
  static async getFullProfile(userId) {
    const text = `
      SELECT 
        p.*,
        u.email,
        u.full_name,
        u.created_at as user_created_at
      FROM profiles p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
    `;
    const result = await query(text, [userId]);
    return result.rows[0];
  }

  // Get all profiles (admin function)
  static async findAll(limit = 50, offset = 0) {
    const text = `
      SELECT p.*, u.email, u.full_name
      FROM profiles p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await query(text, [limit, offset]);
    return result.rows;
  }
}

module.exports = Profile;