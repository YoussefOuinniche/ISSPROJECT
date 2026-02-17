module.exports = function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  const status = err && err.status ? err.status : 500;
  res.status(status).json({
    success: false,
    message: err && err.message ? err.message : 'Internal Server Error'
  });
};
