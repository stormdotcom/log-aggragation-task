

const MAX_WINDOW_MINUTES = 5;
const MAX_WINDOW_MILLISECONDS = MAX_WINDOW_MINUTES * 60 * 1000;

class MinHeap {
  constructor() {
    this.data = [];
  }

  size() {
    return this.data.length;
  }

  peek() {
    return this.data.length ? this.data[0] : null;
  }

  push(item) {
    this.data.push(item);
    this.#bubbleUp(this.data.length - 1);
  }

  pop() {
    if (this.data.length === 0) return null;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length && last) {
      this.data[0] = last;
      this.#bubbleDown(0);
    }
    return top;
  }

  #bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.data[parent].timestamp <= this.data[index].timestamp) break;
      [this.data[parent], this.data[index]] = [this.data[index], this.data[parent]];
      index = parent;
    }
  }

  #bubbleDown(index) {
    const n = this.data.length;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;

      if (left < n && this.data[left].timestamp < this.data[smallest].timestamp) {
        smallest = left;
      }
      if (right < n && this.data[right].timestamp < this.data[smallest].timestamp) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.data[smallest], this.data[index]] = [this.data[index], this.data[smallest]];
      index = smallest;
    }
  }
}

class LogStore {
  constructor({ maxWindowMilliseconds = MAX_WINDOW_MILLISECONDS } = {}) {
    this.maxWindowMilliseconds = maxWindowMilliseconds;
    this.latestTimestampByUserId = new Map(); // userId -> latest timestamp (ms)
    this.minHeap = new MinHeap(); // { timestamp, userId }
  }

  addEntry({ userId, timestamp }) {
    const now = Date.now();
    const ts = typeof timestamp === "number" ? timestamp : now;

    // Reject extremely future timestamps (clock skew / bad clients)
    if (ts > now + 60 * 1000) {
      const err = new Error("timestamp is too far in the future");
      err.statusCode = 400;
      throw err;
    }

    const prev = this.latestTimestampByUserId.get(userId);
    const next = prev == null ? ts : Math.max(prev, ts);
    this.latestTimestampByUserId.set(userId, next);
    this.minHeap.push({ timestamp: next, userId });

    this.pruneOldEntries(now);
  }

  getActiveUsersCount(minutes = MAX_WINDOW_MINUTES) {
    const now = Date.now();
    const windowMs = Math.min(minutes * 60 * 1000, this.maxWindowMilliseconds);
    this.pruneOldEntries(now, windowMs);
    return this.latestTimestampByUserId.size;
  }

  pruneOldEntries(now = Date.now(), windowMs = this.maxWindowMilliseconds) {
    const cutoffTime = now - windowMs;

    while (true) {
      const top = this.minHeap.peek();
      if (!top || top.timestamp >= cutoffTime) break;

      const popped = this.minHeap.pop();
      if (!popped) break;

      const latest = this.latestTimestampByUserId.get(popped.userId);
      if (latest === popped.timestamp) {
        this.latestTimestampByUserId.delete(popped.userId);
      }
    }

    // Occasional heap compaction to avoid excessive stale entries
    if (this.minHeap.size() > this.latestTimestampByUserId.size * 5 + 1000) {
      const rebuilt = new MinHeap();
      for (const [userId, timestamp] of this.latestTimestampByUserId.entries()) {
        if (timestamp >= cutoffTime) rebuilt.push({ userId, timestamp });
      }
      this.minHeap = rebuilt;
    }
  }

  size() {
    return this.latestTimestampByUserId.size;
  }
}

module.exports = new LogStore();
