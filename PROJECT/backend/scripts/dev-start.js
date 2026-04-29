const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const aiDir = path.resolve(rootDir, '..', 'ai');

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

const state = {
  backendReady: false,
  dbReady: false,
  aiReady: false,
  aiModel: process.env.OLLAMA_MODEL_CHAT || process.env.OLLAMA_MODEL || 'qwen2.5:7b',
  panelShown: false,
};

const children = [];

function color(value, code) {
  return `${code}${value}${colors.reset}`;
}

function padRight(value, width) {
  const text = String(value);
  return text + ' '.repeat(Math.max(0, width - text.length));
}

function drawPanel() {
  if (state.panelShown || !state.backendReady || !state.dbReady || !state.aiReady) {
    return;
  }

  state.panelShown = true;

  const width = 39;
  const top = `┌${'─'.repeat(width)}┐`;
  const mid = `├${'─'.repeat(width)}┤`;
  const bottom = `└${'─'.repeat(width)}┘`;
  const row = (label, value, valueColor = colors.reset) => {
    const labelText = padRight(label, 9);
    const plain = `${labelText} ${value}`;
    return `│ ${color(labelText, colors.cyan)} ${color(value, valueColor)}${' '.repeat(Math.max(0, width - plain.length - 1))}│`;
  };

  console.log(color(top, colors.cyan));
  console.log(`│ ${color(padRight('NexaPath Development Server', width - 2), colors.bold)} │`);
  console.log(color(mid, colors.cyan));
  console.log(row('Backend', 'http://localhost:5000', colors.green));
  console.log(row('AI Model', state.aiModel, colors.yellow));
  console.log(row('AI API', 'http://localhost:8000', colors.green));
  console.log(row('Database', 'Supabase connected', colors.green));
  console.log(color(bottom, colors.cyan));
}

function handleOutput(name, chunk) {
  const text = chunk.toString();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.includes('Connected to Supabase successfully')) {
      state.backendReady = true;
      state.dbReady = true;
      drawPanel();
      continue;
    }

    const modelMatch = line.match(/AI model running:\s*(.+)$/);
    if (modelMatch) {
      state.aiReady = true;
      state.aiModel = modelMatch[1].trim();
      drawPanel();
      continue;
    }

    if (/error|failed|unavailable|traceback/i.test(line)) {
      console.error(color(`[${name}] ${line}`, colors.red));
    }
  }
}

function start(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    shell: false,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  children.push(child);
  child.stdout.on('data', (chunk) => handleOutput(name, chunk));
  child.stderr.on('data', (chunk) => handleOutput(name, chunk));

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const reason = signal || `code ${code}`;
    console.error(color(`[${name}] exited with ${reason}`, colors.red));
    shutdown(1);
  });

  return child;
}

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (child.killed) {
      continue;
    }

    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      child.kill();
    }
  }

  setTimeout(() => process.exit(exitCode), 100);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('backend', 'node', ['src/server.js'], rootDir);
start('ai', 'python', ['-m', 'uvicorn', 'backend:app', '--reload', '--port', '8000', '--log-level', 'warning'], aiDir);
