const jwt = require('jsonwebtoken');

// Protect routes - require authentication
exports.protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id, role: decoded.role || 'user' };
      next();
    } catch {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

// Admin-only gate — must be used AFTER protect
exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied: admin only' });
  }
  next();
};

// Optional auth - attach user if token exists
exports.optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id, role: decoded.role || 'user' };
      } catch {
        req.user = null;
      }
    }
    next();
  } catch {
    req.user = null;
    next();
  }
};
