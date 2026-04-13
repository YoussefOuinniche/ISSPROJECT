// Models come from models/index.js and use Supabase-backed model helpers.
const { User, Profile } = require('../models');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const normalizeExpiresIn = (rawValue, fallbackValue) => {
  if (typeof rawValue !== 'string') return fallbackValue;

  const value = rawValue.trim();
  if (!value) return fallbackValue;

  if (/^\d+$/.test(value)) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return fallbackValue;
    if (numeric >= 1000000) return Math.max(1, Math.floor(numeric / 1000));
    return numeric;
  }

  if (/^\d+\s*(ms|s|m|h|d|w|y)$/i.test(value)) {
    return value.replace(/\s+/g, '');
  }

  return fallbackValue;
};

const ACCESS_TOKEN_EXPIRES_IN = normalizeExpiresIn(process.env.JWT_EXPIRE, '1h');
const REFRESH_TOKEN_EXPIRES_IN = normalizeExpiresIn(process.env.JWT_REFRESH_EXPIRE, '7d');
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET?.trim() || 'dev_access_secret_change_me';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET?.trim() || ACCESS_TOKEN_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || '';
const HAS_ADMIN_ENV_LOGIN = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);

// Generate JWT token — embeds role so middleware can enforce admin-only routes
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN
  });
};

// Generate refresh token
const generateRefreshToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN
  });
};

class AuthController {
  // Register new user
  static async register(req, res) {
    try {
      const { email, password, fullName, profile } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide email and password'
        });
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Create user
      const user = await User.create(email, password, fullName);

      // Create profile if provided
      if (profile) {
        await Profile.create(user.id, profile);
      }

      // Generate tokens
      const token = generateToken(user.id, user.role || 'user');
      const refreshToken = generateRefreshToken(user.id, user.role || 'user');

      // Save refresh token
      await User.updateRefreshToken(user.id, refreshToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role || 'user'
          },
          token,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Error registering user',
        error: error.message
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const normalizedEmail = String(email || '').trim().toLowerCase();

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide email and password'
        });
      }

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const isAdminUser = (user.role || 'user') === 'admin';
      const matchesAdminEnvIdentity = HAS_ADMIN_ENV_LOGIN && normalizedEmail === ADMIN_EMAIL.toLowerCase();
      const matchesAdminEnvPassword = HAS_ADMIN_ENV_LOGIN && password === ADMIN_PASSWORD;

      // Verify password. If the configured admin env credentials match an existing admin user,
      // allow login even if the stored hash has drifted, then resync the hash for future logins.
      let isPasswordValid = await User.verifyPassword(password, user.password_hash);

      if (!isPasswordValid && isAdminUser && matchesAdminEnvIdentity && matchesAdminEnvPassword) {
        isPasswordValid = true;

        try {
          await User.resetPassword(user.id, ADMIN_PASSWORD);
        } catch (syncError) {
          console.warn('Admin password hash sync failed:', syncError.message);
        }
      }

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Optional extra protection for admin accounts only: if env credentials are configured,
      // admin login must also match them.
      if (isAdminUser && HAS_ADMIN_ENV_LOGIN) {
        if (!matchesAdminEnvIdentity || !matchesAdminEnvPassword) {
          return res.status(401).json({
            success: false,
            message: 'Invalid admin credentials'
          });
        }
      }

      // Generate tokens
      const token = generateToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id, user.role);

      // Save refresh token
      await User.updateRefreshToken(user.id, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role
          },
          token,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Error logging in',
        error: error.message || 'internal error'
      });
    }
  }

  // Refresh token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
      
      // Fetch the user so we can re-embed the current role
      const user = await User.findById(decoded.id);
      if (!user) throw new Error('User not found');

      // Generate new tokens
      const newToken = generateToken(decoded.id, user.role || 'user');
      const newRefreshToken = generateRefreshToken(decoded.id, user.role || 'user');

      // Update refresh token in database
      await User.updateRefreshToken(decoded.id, newRefreshToken);

      res.status(200).json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
  }

  // Forgot password
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Please provide email'
        });
      }

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not
        return res.status(200).json({
          success: true,
          message: 'If the email exists, a reset link will be sent'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + parseInt(process.env.RESET_PASSWORD_EXPIRE || 3600000));

      // Save reset token
      await User.setPasswordResetToken(email, resetToken, resetExpires);

      // TODO: Send email with reset token
      // For now, return the token (remove this in production)
      res.status(200).json({
        success: true,
        message: 'Password reset token generated',
        data: { resetToken } // Remove this in production
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing password reset',
        error: error.message
      });
    }
  }

  // Reset password
  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Please provide token and new password'
        });
      }

      // Verify reset token
      const user = await User.verifyResetToken(token);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Reset password
      await User.resetPassword(user.id, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Error resetting password',
        error: error.message
      });
    }
  }

  // Change password for authenticated user
  static async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      const user = await User.findById(userId);
      if (!user?.email) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const userWithPassword = await User.findByEmail(user.email);
      const isCurrentPasswordValid = await User.verifyPassword(currentPassword, userWithPassword?.password_hash);

      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      await User.resetPassword(userId, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Error changing password',
        error: error.message
      });
    }
  }

  // Get current user
  static async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user.id);
      const profile = await Profile.findByUserId(req.user.id);

      res.status(200).json({
        success: true,
        data: {
          user,
          profile
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user data',
        error: error.message
      });
    }
  }

  // Logout (optional - mainly for clearing refresh token)
  static async logout(req, res) {
    try {
      // Clear refresh token
      await User.updateRefreshToken(req.user.id, null);

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Error logging out',
        error: error.message
      });
    }
  }
}

module.exports = AuthController;
