const path = require("path");
const net = require("net");
const { spawn } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const rawPort = process.env.MOBILE_PORT || process.env.PORT || "8081";
const port = Number.parseInt(rawPort, 10);
const rawHostMode = (process.env.MOBILE_HOST || "lan").toLowerCase();
const hostFlags = {
  localhost: "--localhost",
  lan: "--lan",
  tunnel: "--tunnel",
};

if (!Number.isInteger(port) || port <= 0) {
  console.error(`Invalid Expo port: ${rawPort}`);
  process.exit(1);
}

if (!hostFlags[rawHostMode]) {
  console.error(
    `Invalid Expo host mode: ${rawHostMode}. Use localhost, lan, or tunnel.`,
  );
  process.exit(1);
}

function canUsePort(candidatePort) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.unref();

    server.on("error", () => {
      resolve(false);
    });

    server.listen(candidatePort, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort, attempts = 20) {
  for (let candidatePort = startPort; candidatePort < startPort + attempts; candidatePort += 1) {
    // Probe localhost to avoid Expo prompting for a new port in non-interactive shells.
    if (await canUsePort(candidatePort)) {
      return candidatePort;
    }
  }

  return null;
}

async function main() {
  const availablePort = await findAvailablePort(port);

  if (availablePort == null) {
    console.error(`No available Expo port found between ${port} and ${port + 19}.`);
    process.exit(1);
  }

  if (availablePort !== port) {
    console.warn(`Expo port ${port} is busy, using ${availablePort} instead.`);
  }

  const expoArgs = [
    "exec",
    "expo",
    "start",
    hostFlags[rawHostMode],
    "--port",
    String(availablePort),
  ];

  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", `pnpm ${expoArgs.join(" ")}`], {
          cwd: projectRoot,
          env: process.env,
          stdio: "inherit",
        })
      : spawn("pnpm", expoArgs, {
          cwd: projectRoot,
          env: process.env,
          stdio: "inherit",
        });

  child.on("error", (error) => {
    console.error(`Failed to start Expo: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(`Failed to prepare Expo startup: ${error.message}`);
  process.exit(1);
});
