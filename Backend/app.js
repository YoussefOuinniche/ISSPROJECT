const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const logger = require('./utils/logger');
logger.installConsoleBridge();

const { supabase, testDatabaseConnection, isDatabaseConfigured } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { ensureLocalAiRuntime, shutdownLocalAiRuntime } = require('./services/aiRuntimeService');

const authRoutes = require('./routes/Auth');
const userRoutes = require('./routes/User');
const userAiRoutes = require('./routes/UserAi');
const skillRoutes = require('./routes/Skills');
const trendRoutes = require('./routes/Trends');
const marketRoutes = require('./routes/Market');
const publicRoutes = require('./routes/Public');
const { startRoleMarketScheduler, stopRoleMarketScheduler } = require('./services/roleMarketSchedulerService');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 4000;
const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';
const enableHttpLogs = String(process.env.LOG_HTTP || '').trim().toLowerCase() === 'true';

app.use(helmet());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    hint: 'If this happens during development, check polling frequency or restart after cooldown.',
  },
  skip: (req) => req.path === '/health',
});
app.use(globalLimiter);

const defaultDevOrigins = 'http://localhost:3000,http://127.0.0.1:3000';
const configuredOrigins =
  process.env.FRONTEND_URL || (isProduction ? '' : defaultDevOrigins);

const allowedOrigins = configuredOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

if (enableHttpLogs) {
  app.use(morgan(isProduction ? 'combined' : 'dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', async (req, res) => {
  const timestamp = new Date().toISOString();
  const dbConfigured = isDatabaseConfigured();

  const health = {
    success: true,
    message: 'Server is healthy',
    timestamp,
    environment,
    app: {
      status: 'up',
    },
    database: {
      enabled: dbConfigured,
      status: dbConfigured ? 'unknown' : 'disabled',
    },
  };

  if (!dbConfigured) {
    return res.status(200).json(health);
  }

  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      throw error;
    }

    health.database.status = 'up';
    return res.status(200).json(health);
  } catch (error) {
    health.success = false;
    health.message = 'Server is degraded';
    health.database.status = 'down';

    if (!isProduction) {
      health.database.error = error.message;
    }

    return res.status(503).json(health);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/user/ai', userAiRoutes);
app.use('/api/user', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/trends', trendRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/public', publicRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

app.use(errorHandler);

async function runStartupHealthCheck(port) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const endpoints = ['/health', '/api/user/countries', '/api/user/roles'];

  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`);
        return {
          endpoint,
          ok: response.ok,
          status: response.status,
        };
      } catch (error) {
        return {
          endpoint,
          ok: false,
          status: null,
          error: error.message,
        };
      }
    })
  );

  const failures = results.filter((result) => !result.ok);
  if (failures.length === 0) {
    return {
      ok: true,
      message: 'OK',
    };
  }

  return {
    ok: false,
    message: failures
      .map((result) => `${result.endpoint} (${result.status || result.error || 'failed'})`)
      .join(', '),
  };
}

async function closeDatabaseResources() {
  if (!supabase || typeof supabase.removeAllChannels !== 'function') {
    return;
  }

  try {
    await supabase.removeAllChannels();
  } catch (error) {
    logger.logError('Database cleanup failed:', error.message);
  }
}

async function bootstrapStartup() {
  logger.logServer(`SkillPulse Backend running on port ${PORT}`);
  logger.logEnv(environment);

  const dbStatus = await testDatabaseConnection();
  logger.logDB(dbStatus.message, { success: dbStatus.connected });

  const aiStatus = await ensureLocalAiRuntime();
  if (!aiStatus.enabled) {
    logger.logAI(aiStatus.message);
  } else {
    logger.logAI(aiStatus.message, { success: aiStatus.ready });
  }

  const healthStatus = await runStartupHealthCheck(PORT);
  logger.logHealth(healthStatus.message, { success: healthStatus.ok });

  logger.logStatus('Server running');
  startRoleMarketScheduler();
}

const server = app.listen(PORT, () => {
  void bootstrapStartup();
});

function shutdown(signal) {
  logger.logWarn(`${signal} received. Shutting down gracefully.`);

  server.close(async () => {
    await stopRoleMarketScheduler();
    await closeDatabaseResources();
    await shutdownLocalAiRuntime();
    process.exit(0);
  });

  setTimeout(() => {
    logger.logError('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.logError('Unhandled Promise Rejection:', reason);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.logError('Uncaught Exception:', error);
  shutdown('uncaughtException');
});

module.exports = app;
