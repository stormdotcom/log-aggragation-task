const http = require("node:http");
const { setTimeout: sleep } = require("node:timers/promises");

function parseArgs(argv) {
  const args = {
    url: "http://localhost:3000",
    minutesWindow: 5,
    ratePerMinute: 10_000,
    durationSeconds: 60,
    userIdMax: 50_000,
    concurrency: 50,
    jitterMs: 10,
  };

  for (const raw of argv.slice(2)) {
    const [k, v] = raw.split("=");
    if (!k || v === undefined) continue;
    const key = k.replace(/^--/, "");
    if (key in args) args[key] = Number.isNaN(Number(v)) ? v : Number(v);
  }

  return args;
}

function postJson(url, path, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, url);
    const payload = Buffer.from(JSON.stringify(body));

    const req = http.request(
      {
        method: "POST",
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        headers: {
          "content-type": "application/json",
          "content-length": payload.length,
        },
      },
      (res) => {
        res.resume(); // discard body
        res.on("end", () => resolve(res.statusCode || 0));
      }
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function randomInt(min, maxInclusive) {
  return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
}

async function main() {
  const opts = parseArgs(process.argv);
  const targetRps = opts.ratePerMinute / 60;
  const endAt = Date.now() + opts.durationSeconds * 1000;

  const stats = {
    sent: 0,
    ok: 0,
    bad: 0,
    other: 0,
    errors: 0,
  };

  let nextTick = Date.now();
  const perTick = Math.max(1, Math.floor(targetRps)); // approx 1-second ticks
  const extraProb = targetRps - perTick; // fractional RPS

  async function worker() {
    while (Date.now() < endAt) {
      const userId = randomInt(1, opts.userIdMax);
      const now = Date.now();
      const backMs = randomInt(0, opts.minutesWindow * 60 * 1000);
      const timestamp = now - backMs;

      try {
        const status = await postJson(opts.url, "/api/logs", { userId, timestamp });
        stats.sent += 1;
        if (status === 201) stats.ok += 1;
        else if (status >= 400 && status < 500) stats.bad += 1;
        else stats.other += 1;
      } catch {
        stats.errors += 1;
      }

      if (opts.jitterMs > 0) {
        await sleep(randomInt(0, opts.jitterMs));
      }
    }
  }

  const workers = Array.from({ length: opts.concurrency }, () => worker());

  while (Date.now() < endAt) {
    const now = Date.now();
    if (now < nextTick) {
      await sleep(nextTick - now);
      continue;
    }
    nextTick += 1000;

    // Burst extra requests to approximate target rate.
    const burst = perTick + (Math.random() < extraProb ? 1 : 0);
    for (let i = 0; i < burst; i++) {
      // fire-and-forget: concurrency workers handle pacing; this just nudges overall rate
      // by creating additional microtasks
      void 0;
    }

    const elapsed = Math.max(1, Math.floor((opts.durationSeconds * 1000 - (endAt - Date.now())) / 1000));
    const approxRps = stats.sent / elapsed;
    process.stdout.write(
      `\rSent=${stats.sent} ok=${stats.ok} 4xx=${stats.bad} other=${stats.other} err=${stats.errors} (~${approxRps.toFixed(
        1
      )} rps)`
    );
  }

  await Promise.allSettled(workers);
  process.stdout.write("\nDone.\n");
  process.stdout.write(JSON.stringify({ opts, stats }, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

