const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/database');

// Simple admin authentication for development
const adminAuth = async (req, res, next) => {
  // For development, allow requests with admin API key
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;
  
  // Check API key
  if (apiKey && apiKey === process.env.ADMIN_API_KEY) {
    return next();
  }
  
  // Check JWT token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      
      // Verify user is admin
      if (decoded.email === process.env.ADMIN_EMAIL) {
        return next();
      }
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  
  // In development, allow access without auth for testing
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Warning: Running in development mode with auto-auth');
    return next();
  }
  
  res.status(401).json({ error: 'Unauthorized - Admin access required' });
};

const generateAdminToken = (adminData) => {
  return jwt.sign(
    { ...(adminData.id ? { userId: adminData.id } : {}), email: adminData.email, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

module.exports = { adminAuth, generateAdminToken };