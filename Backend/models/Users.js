const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Create a new user
  static async create(email, password, fullName) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const text = `
      INSERT INTO users (email, password_hash, full_name)
      VALUES ($1, $2, $3)
      RETURNING id, email, full_name, created_at
    `;
    const values = [email, hashedPassword, fullName];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const text = 'SELECT * FROM users WHERE email = $1';
    const result = await query(text, [email]);
    return result.rows[0];
  }

  // Find user by ID
  static async findById(id) {
    const text = 'SELECT id, email, full_name, created_at, updated_at FROM users WHERE id = $1';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update user
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const text = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, full_name, updated_at
    `;
    
    const result = await query(text, values);
    return result.rows[0];
  }

  // Delete user
  static async delete(id) {
    const text = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Update refresh token
  static async updateRefreshToken(userId, refreshToken) {
    const text = 'UPDATE users SET refresh_token = $1 WHERE id = $2';
    await query(text, [refreshToken, userId]);
  }

  // Set password reset token
  static async setPasswordResetToken(email, token, expires) {
    const text = `
      UPDATE users 
      SET reset_password_token = $1, reset_password_expires = $2
      WHERE email = $3
      RETURNING id, email
    `;
    const result = await query(text, [token, expires, email]);
    return result.rows[0];
  }

  // Verify reset token
  static async verifyResetToken(token) {
    const text = `
      SELECT * FROM users 
      WHERE reset_password_token = $1 
      AND reset_password_expires > NOW()
    `;
    const result = await query(text, [token]);
    return result.rows[0];
  }

  // Reset password
  static async resetPassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const text = `
      UPDATE users 
      SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL
      WHERE id = $2
      RETURNING id, email
    `;
    const result = await query(text, [hashedPassword, userId]);
    return result.rows[0];
  }

  // Get all users (admin function)
  static async findAll(limit = 50, offset = 0) {
    const text = `
      SELECT id, email, full_name, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await query(text, [limit, offset]);
    return result.rows;
  }
}

module.exports = User;