const { supabase } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Create a new user (role defaults to 'user' at DB level)
  static async create(email, password, fullName) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert({ email, password_hash: hashedPassword, full_name: fullName })
      .select('id, email, full_name, role, created_at')
      .single();
    if (error) throw error;
    return data;
  }

  // Find user by email
  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Find user by ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Find user by email (case-insensitive)
  User.findByEmail = async function (email) {
    return await this.findOne({ where: { email } });
  };

  // Update user
  static async update(id, updates) {
    const dbUpdates = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) dbUpdates[key] = updates[key];
    });
    if (Object.keys(dbUpdates).length === 0) throw new Error('No fields to update');
    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select('id, email, full_name, updated_at')
      .single();
    if (error) throw error;
    return data;
  }

  // Delete user
  static async delete(id) {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .select('id')
      .single();
    if (error) throw error;
    return data;
  }

  // Update refresh token
  static async updateRefreshToken(userId, refreshToken) {
    const { error } = await supabase
      .from('users')
      .update({ refresh_token: refreshToken })
      .eq('id', userId);
    if (error) throw error;
  }

  // Set password reset token
  static async setPasswordResetToken(email, token, expires) {
    const { data, error } = await supabase
      .from('users')
      .update({ reset_password_token: token, reset_password_expires: expires })
      .eq('email', email)
      .select('id, email')
      .single();
    if (error) throw error;
    return data;
  }

  // Verify reset token (must not be expired)
  static async verifyResetToken(token) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('reset_password_token', token)
      .gt('reset_password_expires', new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Reset password
  static async resetPassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { data, error } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        reset_password_token: null,
        reset_password_expires: null,
      })
      .eq('id', userId)
      .select('id, email')
      .single();
    if (error) throw error;
    return data;
  }

  // Get all users (admin)
  static async findAll(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  }
}

module.exports = User;
