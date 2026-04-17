const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { supabase } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { ensureLocalAiRuntime, shutdownLocalAiRuntime } = require('./services/aiRuntimeService');

// Import routes
const authRoutes = require('./routes/Auth');
const userRoutes = require('./routes/User');
const userAiRoutes = require('./routes/UserAi');
const skillRoutes = require('./routes/Skills');
const trendRoutes = require('./routes/Trends');
const marketRoutes = require('./routes/Market');
const publicRoutes = require('./routes/Public');
const { startRoleMarketScheduler, stopRoleMarketScheduler } = require('./services/roleMarketSchedulerService');

// Initialize express app
const app = express();

// ─────────────────────────────────────────
//  Security Middleware
// ─────────────────────────────────────────

app.use(helmet());

// Global rate limiter – 100 requests per 15 minutes per IP
const isProduction = process.env.NODE_ENV === 'production';
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    hint: 'If this happens during development, check polling frequency or restart after cooldown.'
  },
  skip: (req) => req.path === '/health',
});
app.use(globalLimiter);

// ─────────────────────────────────────────
//  CORS
// ─────────────────────────────────────────

const defaultDevOrigins = 'http://localhost:3000,http://127.0.0.1:3000';
const configuredOrigins =
  process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? '' : defaultDevOrigins);

const allowedOrigins = configuredOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);

      // In production, FRONTEND_URL should be explicitly set.
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─────────────────────────────────────────
//  General Middleware
// ─────────────────────────────────────────

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Temporary request logs for mobile Home page data endpoints.
app.use((req, res, next) => {
  const isUserCatalogRequest =
    req.method === 'GET' &&
    (req.path === '/api/user/countries' || req.path === '/api/user/roles');

  if (isUserCatalogRequest) {
    console.log(`[app] Incoming ${req.method} ${req.originalUrl}`);
  }

  next();
});

// ─────────────────────────────────────────
//  Health Check
// ─────────────────────────────────────────

app.get('/health', async (req, res) => {
  const timestamp = new Date().toISOString();
  const dbConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  const health = {
    success: true,
    message: 'Server is healthy',
    timestamp,
    environment: process.env.NODE_ENV || 'development',
    app: {
      status: 'up',
    },
    database: {
      enabled: dbConfigured,
      status: 'disabled',
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

    if (process.env.NODE_ENV !== 'production') {
      health.database.error = error.message;
    }

    return res.status(503).json(health);
  }
});

// ─────────────────────────────────────────
//  API Routes
// ─────────────────────────────────────────

app.use('/api/auth',    authRoutes);
app.use('/api/user/ai', userAiRoutes);
console.log('[app] Mounting /api/user routes');
app.use('/api/user',    userRoutes);
console.log('[app] Mounted /api/user routes');
app.use('/api/skills',  skillRoutes);
app.use('/api/trends',  trendRoutes);
app.use('/api/market',  marketRoutes);
app.use('/api/public',  publicRoutes);

// ─────────────────────────────────────────
//  404 & Error Handlers
// ─────────────────────────────────────────

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Centralized error handler (must be last)
app.use(errorHandler);

// ─────────────────────────────────────────
//  Server Initialization
// ─────────────────────────────────────────

const PORT = parseInt(process.env.PORT, 10) || 4000;

const closeDatabaseResources = async () => {
  // Supabase JS is primarily an HTTP client (no pg pool to close).
  // Cleanup is only needed if realtime resources were created.
  if (!supabase) {
    console.log('Database client unavailable. Skipping database cleanup.');
    return;
  }

  if (typeof supabase.removeAllChannels === 'function') {
    try {
      await supabase.removeAllChannels();
      console.log('Supabase realtime channels closed.');
    } catch (err) {
      console.error('Error closing Supabase realtime channels:', err.message);
    }
    return;
  }

  console.log('No closable database resources found. Skipping database cleanup.');
};

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Skill Pulse Backend Server           
║   Port: ${PORT}                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}           ║
║   Status: Running ✓                    ║
╚════════════════════════════════════════╝
  `);
  console.log('[app] Startup check: /api/user/countries and /api/user/roles should resolve.');
  void ensureLocalAiRuntime();
  startRoleMarketScheduler();
});

// ─────────────────────────────────────────
//  Graceful Shutdown
// ─────────────────────────────────────────

const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');

    await stopRoleMarketScheduler();
    await closeDatabaseResources();
    await shutdownLocalAiRuntime();
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});

module.exports = app;
