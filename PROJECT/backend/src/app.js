const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Existing routes
const authRoutes         = require('./routes/authRoutes');
const categoryRoutes     = require('./routes/categoryRoutes');
const skillRoutes        = require('./routes/skillRoutes');
const courseRoutes       = require('./routes/courseRoutes');
const jobRoleRoutes      = require('./routes/jobRoleRoutes');
const progressRoutes     = require('./routes/progressRoutes');
const chatRoutes         = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const roadmapRoutes      = require('./routes/roadmaproutes');
const planRoutes         = require('./routes/planroutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const jobMarketTrendRoutes = require('./routes/jobMarketTrendRoutes');
const userRoutes         = require('./routes/userroutes');
const userSkillsRoutes   = require('./routes/userSkillsRoutes');
const userProfileRoutes  = require('./routes/userProfileRoutes');
const userAiRoutes       = require('./routes/userAiRoutes');
const userHomeRoutes     = require('./routes/userHomeRoutes');
const adminRoutes        = require('./routes/adminroutes');

// SkillPulse aggregation routes
const jobsRoutes = require('./routes/jobs.routes');
// Qwen 2.5 AI proxy
const qwenRoutes = require('./routes/qwen');

const app = express();

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet());

const isDev = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (isDev) return callback(null, true);
    const allowed = [process.env.FRONTEND_URL].filter(Boolean);
    if (allowed.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ───────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/health',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use(globalLimiter);

// ── General middleware ──────────────────────────────────────────────────────
app.use(morgan(isDev ? 'dev' : 'combined'));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running', env: process.env.NODE_ENV });
});

// ── API routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',         authLimiter, authRoutes);
app.use('/api/categories',   categoryRoutes);
app.use('/api/skills',       skillRoutes);
app.use('/api/courses',      courseRoutes);
app.use('/api/job-roles',    jobRoleRoutes);
app.use('/api/progress',     progressRoutes);
app.use('/api/chat',         chatRoutes);
app.use('/api/notifications',notificationRoutes);
app.use('/api/roadmaps',     roadmapRoutes);
app.use('/api/plans',        planRoutes);
app.use('/api/subscriptions',subscriptionRoutes);
app.use('/api/market-trends',jobMarketTrendRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/user/skills',  userSkillsRoutes);
app.use('/api/user/profile', userProfileRoutes);
app.use('/api/user/ai',      userAiRoutes);
app.use('/api/user/home',    userHomeRoutes);
app.use('/api/admin',        adminRoutes);

// SkillPulse aggregation API
app.use('/api/v1', jobsRoutes);
// Qwen 2.5 AI proxy
app.use('/api/qwen', qwenRoutes);

// ── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.path });
});

// ── Error handler ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (isDev) console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: isDev ? err.message : 'Internal server error',
  });
});

module.exports = app;
