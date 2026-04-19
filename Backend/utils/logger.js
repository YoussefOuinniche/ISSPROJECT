const chalk = require('chalk');
const util = require('util');

const environment = String(process.env.NODE_ENV || 'development').trim().toLowerCase() || 'development';
const isProduction = environment === 'production';

const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const configuredLevel = String(process.env.LOG_LEVEL || '').trim().toLowerCase();
const activeLevel = Object.prototype.hasOwnProperty.call(LEVELS, configuredLevel)
  ? configuredLevel
  : isProduction
    ? 'warn'
    : 'info';

function shouldLog(level, force = false) {
  if (force) {
    return true;
  }

  return LEVELS[level] <= LEVELS[activeLevel];
}

function formatMessage(args) {
  return args
    .map((value) => {
      if (typeof value === 'string') {
        return value;
      }

      return util.inspect(value, {
        colors: false,
        depth: 6,
        breakLength: 120,
      });
    })
    .join(' ');
}

function baseWrite(stream, line) {
  stream.write(`${line}\n`);
}

function buildLine(label, colorize, message, includeTimestamp = true) {
  const parts = [];

  if (includeTimestamp) {
    parts.push(chalk.gray(new Date().toISOString()));
  }

  parts.push(colorize(`[${label}]`));
  parts.push(message);
  return parts.join(' ');
}

function write(level, label, colorize, args, options = {}) {
  const { force = false, includeTimestamp = true } = options;
  if (!shouldLog(level, force)) {
    return;
  }

  const message = formatMessage(args);
  const stream = level === 'error' ? process.stderr : process.stdout;
  baseWrite(stream, buildLine(label, colorize, message, includeTimestamp));
}

function logServer(...args) {
  write('info', 'SERVER', chalk.blue, args, { force: true });
}

function logEnv(...args) {
  write('info', 'ENV', chalk.white, args, { force: true });
}

function logDB(message, options = {}) {
  write(options.success === false ? 'error' : 'info', 'DB', options.success === false ? chalk.red : chalk.green, [message], {
    force: true,
  });
}

function logAI(message, options = {}) {
  write(options.success === false ? 'error' : 'info', 'AI', options.success === false ? chalk.red : chalk.cyan, [message], {
    force: true,
  });
}

function logHealth(message, options = {}) {
  write(options.success === false ? 'error' : 'info', 'HEALTH', options.success === false ? chalk.red : chalk.green, [message], {
    force: true,
  });
}

function logStatus(...args) {
  write('info', 'STATUS', chalk.green, args, { force: true });
}

function logWarn(...args) {
  write('warn', 'WARN', chalk.yellow, args);
}

function logError(...args) {
  write('error', 'ERROR', chalk.red, args, { force: true });
}

function logInfo(...args) {
  write('info', 'INFO', chalk.white, args);
}

function logDebug(...args) {
  write('debug', 'DEBUG', chalk.gray, args);
}

function installConsoleBridge() {
  console.log = (...args) => logDebug(...args);
  console.info = (...args) => logDebug(...args);
  console.warn = (...args) => logWarn(...args);
  console.error = (...args) => logError(...args);
}

module.exports = {
  environment,
  isProduction,
  activeLevel,
  installConsoleBridge,
  logServer,
  logEnv,
  logDB,
  logAI,
  logHealth,
  logStatus,
  logWarn,
  logError,
  logInfo,
  logDebug,
};
