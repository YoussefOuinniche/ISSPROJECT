const Redis = require('ioredis');
const logger = require('../utils/logger');

let client = null;

function getClient() {
    if (!client) {
      if (process.env.USE_REDIS !== 'true') {
    return null;
  }

  client = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    });

    client.on('error', (err) => {
      logger.warn('[cache] Redis error', { error: err.message });
    });

    client.on('connect', () => {
      logger.info('[cache] Redis connected');
    });
  }
  return client;
}

async function get(key) {
  try {
    const raw = await getClient().get(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (err) {
    logger.warn('[cache] get failed', { key, error: err.message });
    return null;
  }
}

async function set(key, value, ttlSeconds = 300) {
  try {
    await getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn('[cache] set failed', { key, error: err.message });
  }
}

async function del(key) {
  try {
    await getClient().del(key);
  } catch (err) {
    logger.warn('[cache] del failed', { key, error: err.message });
  }
}

async function flush(pattern) {
  try {
    const keys = await getClient().keys(pattern);
    if (keys.length > 0) {
      await getClient().del(...keys);
      logger.info('[cache] flushed keys', { pattern, count: keys.length });
    }
  } catch (err) {
    logger.warn('[cache] flush failed', { pattern, error: err.message });
  }
}

async function connect() {
  const redis = getClient();

  if (!redis) return;

  try {
    await redis.connect();
  } catch (err) {
    logger.warn('[cache] initial connect failed — continuing without Redis', { error: err.message });
  }
}

async function disconnect() {
  if (client) {
    try {
      await client.quit();
    } catch (_) {}
    client = null;
  }
}

module.exports = { get, set, del, flush, connect, disconnect };
