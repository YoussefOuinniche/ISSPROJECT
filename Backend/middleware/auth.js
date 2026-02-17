// Minimal auth middleware for local development and frontend integration
// `protect` will attach a demo user if no real auth is present.
exports.protect = (req, res, next) => {
  // If a real auth token were present, verify here.
  // For integration/demo, attach a default user so protected routes work.
  if (!req.user) {
    req.user = { id: 'demo-user', email: 'demo@local' };
  }
  next();
};

exports.optionalAuth = (req, res, next) => {
  // If Authorization header exists, pretend user is authenticated
  if (req.headers.authorization) {
    req.user = { id: 'demo-user', email: 'demo@local' };
  }
  next();
};
