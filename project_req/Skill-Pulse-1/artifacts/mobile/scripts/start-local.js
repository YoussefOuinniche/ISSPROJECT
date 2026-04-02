const path = require("path");
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

const expoArgs = [
  "exec",
  "expo",
  "start",
  hostFlags[rawHostMode],
  "--port",
  String(port),
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
