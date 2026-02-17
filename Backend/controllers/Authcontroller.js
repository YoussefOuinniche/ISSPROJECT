const User = require('../models/Users');
const Profile = require('../models/Profile');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE
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
      const token = generateToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Save refresh token
      await User.updateRefreshToken(user.id, refreshToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name
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

      // Verify password
      const isPasswordValid = await User.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate tokens
      const token = generateToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Save refresh token
      await User.updateRefreshToken(user.id, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name
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
        error: error.message
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
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // Generate new tokens
      const newToken = generateToken(decoded.id);
      const newRefreshToken = generateRefreshToken(decoded.id);

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
