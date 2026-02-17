// Lightweight validate middleware placeholder
// Routes already apply express-validator; this middleware is a no-op placeholder
module.exports = function validate(req, res, next) {
  next();
};
