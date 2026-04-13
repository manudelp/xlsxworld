const { execSync } = require("node:child_process");

const ports = [3000, 8000];

function run(command) {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return "";
  }
}

function killWindowsPorts(targetPorts) {
  const output = run("netstat -ano -p tcp");
  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(
      /\bTCP\s+\S+:(\d+)\s+\S+:(\d+)\s+LISTENING\s+(\d+)\b/i,
    );
    if (!match) {
      continue;
    }

    const localPort = Number(match[1]);
    if (targetPorts.includes(localPort)) {
      pids.add(match[3]);
    }
  }

  for (const pid of pids) {
    run(`taskkill /PID ${pid} /F`);
  }
}

function killUnixPorts(targetPorts) {
  const portList = targetPorts.join(",");
  run(`lsof -ti:${portList} | xargs kill -9`);
}

if (process.platform === "win32") {
  killWindowsPorts(ports);
} else {
  killUnixPorts(ports);
}
