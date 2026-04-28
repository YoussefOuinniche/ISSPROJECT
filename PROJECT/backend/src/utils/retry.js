const logger = require('./logger');

/**
 * Retries an async function with exponential backoff.
 * Only retries on HTTP 429 or 5xx responses (axios errors with response.status).
 */
async function retryWithBackoff(fn, maxAttempts = 3, baseDelayMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const status = err.response?.status;
      const isRetryable = status === 429 || (status >= 500 && status < 600);

      if (!isRetryable || attempt === maxAttempts) {
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn({
        message: 'Retrying after error',
        attempt,
        maxAttempts,
        status,
        delayMs: delay,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

module.exports = { retryWithBackoff };
