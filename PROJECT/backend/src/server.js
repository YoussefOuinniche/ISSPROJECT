const app = require('./app');
require('dotenv').config();

const PORT     = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Init Redis ───────────────────────────────────────────────────────────────
const cache = require('./services/cache.service');
cache.connect().catch(() => {});

// ── Init cron jobs ───────────────────────────────────────────────────────────
require('./jobs/aggregator.cron');

// ── Start HTTP server ────────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
    ╔═══════════════════════════════════════╗
    ║   NexaPath API Server Starting       ║
    ║━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━║
    ║   🚀 Server running on port ${PORT}           ║
    ║   📌 Environment: ${NODE_ENV}              ║
    ║   🔗 URL: http://localhost:${PORT}       ║
    ║   🏠 Health: http://localhost:${PORT}/health ║
    ╚═══════════════════════════════════════╝
  `);
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`${signal} received: shutting down gracefully`);
  server.close(async () => {
    await cache.disconnect();
    console.log('HTTP server + Redis closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = server;
