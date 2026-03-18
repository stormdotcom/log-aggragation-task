const { setTimeout: sleep } = require("node:timers/promises");
const v8 = require("node:v8");

function mb(bytes) {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

function formatNum(n) {
  return new Intl.NumberFormat("en-US").format(n);
}

async function main() {
  const pid = Number(process.argv[2]);
  if (!Number.isInteger(pid) || pid <= 0) {
    console.error("Usage: node scripts/monitorProcess.js <pid>");
    process.exit(1);
  }

  process.stdout.write(`Monitoring PID ${pid} (Ctrl+C to stop)\n`);

  // This script runs in its own process, so we can’t read another Node process heap directly.
  // We *can* still monitor OS-level memory by sampling tasklist output via PowerShell,
  // but we keep this script cross-platform by printing *this* process heap stats too.
  //
  // For accurate server heap + GC, run server with --inspect and use Chrome DevTools,
  // or run with --trace-gc to see GC events in logs.

  while (true) {
    const mu = process.memoryUsage();
    const hs = v8.getHeapStatistics();
    process.stdout.write(
      [
        new Date().toISOString(),
        `rss=${mb(mu.rss)}MB`,
        `heapUsed=${mb(mu.heapUsed)}MB`,
        `heapTotal=${mb(mu.heapTotal)}MB`,
        `heapLimit=${mb(hs.heap_size_limit)}MB`,
        `malloced=${mb(hs.malloced_memory)}MB`,
        `external=${mb(mu.external)}MB`,
        `handles=${formatNum((process)._getActiveHandles?.().length ?? 0)}`,
      ].join(" | ") + "\n"
    );
    await sleep(1000);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

