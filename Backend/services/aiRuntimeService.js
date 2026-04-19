const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { logAI, logError, logWarn } = require('../utils/logger');

const BACKEND_DIR = path.join(__dirname, '..');
const REPO_ROOT = path.join(BACKEND_DIR, '..');
const AI_DIR = path.join(BACKEND_DIR, 'ai');
const AI_ENTRYPOINT = path.join(AI_DIR, 'backend.py');
const AI_STDOUT_LOG = path.join(AI_DIR, 'ai-runtime.out.log');
const AI_STDERR_LOG = path.join(AI_DIR, 'ai-runtime.err.log');
const LOCAL_AI_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const START_FAILURE_COOLDOWN_MS = 15_000;

let aiProcess = null;
let aiStartPromise = null;
let lastStartFailureAt = 0;
let lastStartFailureMessage = '';

function parseBooleanEnv(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

function getAiBaseUrl() {
  return String(process.env.AI_SERVICE_URL || '').trim().replace(/\/$/, '');
}

function getAiHealthTimeoutMs() {
  const value = Number(process.env.AI_HEALTH_TIMEOUT_MS || 2500);
  return Number.isFinite(value) ? value : 2500;
}

function isLocalAiUrl(baseUrl) {
  if (!baseUrl) {
    return false;
  }

  try {
    const parsed = new URL(baseUrl);
    return LOCAL_AI_HOSTS.has(parsed.hostname);
  } catch (_) {
    return false;
  }
}

function shouldAutoStartLocalAi(baseUrl = getAiBaseUrl()) {
  const autoStartEnabled = parseBooleanEnv(
    'AI_AUTO_START',
    process.env.NODE_ENV !== 'production'
  );

  return autoStartEnabled && isLocalAiUrl(baseUrl);
}

function resolvePythonCommand() {
  const configured = String(process.env.AI_PYTHON_PATH || '').trim();
  if (configured) {
    return configured;
  }

  const candidates =
    process.platform === 'win32'
      ? [
          path.join(REPO_ROOT, '.venv', 'Scripts', 'python.exe'),
          path.join(BACKEND_DIR, '.venv', 'Scripts', 'python.exe'),
          'python',
        ]
      : [
          path.join(REPO_ROOT, '.venv', 'bin', 'python'),
          path.join(BACKEND_DIR, '.venv', 'bin', 'python'),
          'python3',
          'python',
        ];

  return candidates.find((candidate) => (candidate.includes(path.sep) ? fs.existsSync(candidate) : true));
}

async function isAiRuntimeHealthy(baseUrl = getAiBaseUrl()) {
  if (!baseUrl) {
    return false;
  }

  try {
    const response = await axios.get(`${baseUrl}/health`, {
      timeout: getAiHealthTimeoutMs(),
      validateStatus: () => true,
    });
    return response.status >= 200 && response.status < 500;
  } catch (_) {
    return false;
  }
}

async function waitForAiRuntime(baseUrl, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isAiRuntimeHealthy(baseUrl)) {
      return true;
    }

    if (aiProcess && aiProcess.exitCode != null) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  return isAiRuntimeHealthy(baseUrl);
}

function attachChildLogs(child) {
  const stdoutStream = fs.createWriteStream(AI_STDOUT_LOG, { flags: 'a' });
  const stderrStream = fs.createWriteStream(AI_STDERR_LOG, { flags: 'a' });

  child.stdout?.pipe(stdoutStream);
  child.stderr?.pipe(stderrStream);

  const closeStreams = () => {
    stdoutStream.end();
    stderrStream.end();
  };

  child.once('exit', closeStreams);
  child.once('error', closeStreams);
}

async function startLocalAiRuntime() {
  const baseUrl = getAiBaseUrl();
  if (!baseUrl || !shouldAutoStartLocalAi(baseUrl)) {
    return {
      enabled: false,
      ready: false,
      url: baseUrl || null,
      message: 'Local AI runtime auto-start disabled',
    };
  }

  if (!fs.existsSync(AI_ENTRYPOINT)) {
    throw new Error(`AI entrypoint not found: ${AI_ENTRYPOINT}`);
  }

  if (aiProcess && aiProcess.exitCode == null) {
    const ready = await waitForAiRuntime(baseUrl);
    return {
      enabled: true,
      ready,
      url: baseUrl,
      message: ready ? `Runtime ready at ${baseUrl}` : `Runtime unavailable at ${baseUrl}`,
    };
  }

  const pythonCommand = resolvePythonCommand();
  if (!pythonCommand) {
    throw new Error('Unable to resolve a Python executable for the local AI runtime.');
  }

  const child = spawn(pythonCommand, ['backend.py'], {
    cwd: AI_DIR,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      AI_RELOAD: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  aiProcess = child;
  attachChildLogs(child);

  child.once('error', (error) => {
    lastStartFailureAt = Date.now();
    lastStartFailureMessage = error.message;
    logError('Local AI runtime failed to start:', error.message);
  });

  child.once('exit', (code, signal) => {
    if (aiProcess === child) {
      aiProcess = null;
    }

    if (code !== 0 && signal !== 'SIGTERM') {
      lastStartFailureAt = Date.now();
      lastStartFailureMessage = `exit code ${code ?? 'unknown'} signal ${signal ?? 'none'}`;
      logError(
        `Local AI runtime exited unexpectedly (${lastStartFailureMessage}). See ${AI_STDERR_LOG}.`
      );
    }
  });

  const healthy = await waitForAiRuntime(baseUrl);
  if (!healthy) {
    throw new Error(`Local AI runtime did not become healthy at ${baseUrl}. See ${AI_STDERR_LOG}.`);
  }

  return {
    enabled: true,
    ready: true,
    url: baseUrl,
    message: `Runtime ready at ${baseUrl}`,
  };
}

async function ensureLocalAiRuntime() {
  const baseUrl = getAiBaseUrl();
  if (!baseUrl || !shouldAutoStartLocalAi(baseUrl)) {
    return {
      enabled: false,
      ready: false,
      url: baseUrl || null,
      message: 'Auto-start disabled',
    };
  }

  if (await isAiRuntimeHealthy(baseUrl)) {
    return {
      enabled: true,
      ready: true,
      url: baseUrl,
      message: `Runtime ready at ${baseUrl}`,
    };
  }

  const recentlyFailed =
    lastStartFailureAt > 0 && Date.now() - lastStartFailureAt < START_FAILURE_COOLDOWN_MS;
  if (recentlyFailed) {
    const retryDelaySeconds = Math.ceil(
      (START_FAILURE_COOLDOWN_MS - (Date.now() - lastStartFailureAt)) / 1000
    );
    const message = `Skipping retry for ${retryDelaySeconds}s after failure: ${lastStartFailureMessage || 'unknown error'}`;
    logWarn(message);
    return {
      enabled: true,
      ready: false,
      url: baseUrl,
      message,
    };
  }

  if (aiStartPromise) {
    return aiStartPromise;
  }

  aiStartPromise = startLocalAiRuntime()
    .catch((error) => {
      lastStartFailureAt = Date.now();
      lastStartFailureMessage = error.message;
      logError('AI auto-start failed:', error.message);
      return {
        enabled: true,
        ready: false,
        url: baseUrl,
        message: error.message,
      };
    })
    .finally(() => {
      aiStartPromise = null;
    });

  return aiStartPromise;
}

async function shutdownLocalAiRuntime() {
  if (!aiProcess || aiProcess.exitCode != null) {
    aiProcess = null;
    return;
  }

  const child = aiProcess;
  aiProcess = null;

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (child.exitCode == null) {
        child.kill('SIGKILL');
      }
    }, 5_000);

    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });

    child.kill('SIGTERM');
  });
}

module.exports = {
  ensureLocalAiRuntime,
  getAiBaseUrl,
  isAiRuntimeHealthy,
  shutdownLocalAiRuntime,
  shouldAutoStartLocalAi,
};
