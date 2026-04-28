/**
 * Centralised error-response helpers.
 * Usage: res.status(404).json(notFound('User'))
 */

const notFound  = (resource = 'Resource') => ({ success: false, error: `${resource} not found` });
const badRequest = (msg)                   => ({ success: false, error: msg });
const serverError = (msg = 'Internal server error') => ({ success: false, error: msg });
const unauthorized = (msg = 'Unauthorized') => ({ success: false, error: msg });

/**
 * Wraps an async controller so unhandled errors are caught and returned
 * as a standardised 500 response instead of crashing Express.
 *
 * Usage:
 *   router.get('/', asyncHandler(myController.getAll));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(err);
    res.status(500).json(serverError(err.message));
  });
};

module.exports = { notFound, badRequest, serverError, unauthorized, asyncHandler };
