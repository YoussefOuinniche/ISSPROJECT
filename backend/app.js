const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { supabase } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/Auth');
const userRoutes = require('./routes/User');
const skillRoutes = require('./routes/Skills');
const trendRoutes = require('./routes/Trends');
const publicRoutes = require('./routes/Public');

// Initialize express app
const app = express();

// ─────────────────────────────────────────
//  Security Middleware
// ─────────────────────────────────────────

app.use(helmet());

// Global rate limiter – 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

// ─────────────────────────────────────────
//  CORS
// ─────────────────────────────────────────

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
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

// ─────────────────────────────────────────
//  Health Check
// ─────────────────────────────────────────

app.get('/health', async (req, res) => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      timestamp: result.rows[0].now,
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Server is unhealthy',
      database: 'disconnected',
      error: process.env.NODE_ENV === 'production' ? 'Internal error' : error.message,
    });
  }
});

// ─────────────────────────────────────────
//  API Routes
// ─────────────────────────────────────────

app.use('/api/auth',    authLimiter, authRoutes);
app.use('/api/user',    userRoutes);
app.use('/api/skills',  skillRoutes);
app.use('/api/trends',  trendRoutes);
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

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Skill Pulse Backend Server           
║   Port: ${PORT}                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}           ║
║   Status: Running ✓                    ║
╚════════════════════════════════════════╝
  `);
});

// ─────────────────────────────────────────
//  Graceful Shutdown
// ─────────────────────────────────────────

const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await pool.end();
      console.log('Database pool closed.');
    } catch (err) {
      console.error('Error closing database pool:', err.message);
    } finally {
      process.exit(0);
    }
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