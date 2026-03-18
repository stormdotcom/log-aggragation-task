# Solutions (Old vs New)

This repo implements **“count unique active users in last N minutes”**.

## Old approach (array of logs + scan per query)

### Data structure
- **`entries: Array<{ userId, timestamp }>`** kept in memory
- Append new logs and periodically remove old ones

### Visual data flow

```text
Incoming log
   { userId, timestamp }
          |
          v
   +------------------------+
   | entries[] (array)      |
   | [                     ]|
   +------------------------+
          |
          |  GET /active-users?minutes=N
          v
   1) now - N => cutoffTime
   2) binary search in entries[] to find first index >= cutoffTime
   3) scan from index..end, put userId into Set
   4) result = Set.size
```

### Write path (`POST /logs`)
- Append a log to `entries`
- Prune old logs outside the max window
  - Find the cutoff index (via binary search)
  - Drop older logs by slicing the array

### Read path (`GET /active-users?minutes=N`)
- Compute `cutoffTime = now - N minutes`
- Binary search to find the first index with `timestamp >= cutoffTime`
- Scan from that index to end:
  - Insert `userId` into a `Set`
- Return **unique count** (or list, depending on implementation)

### Complexity & high-volume issues
- **Write**:
  - Binary search is \(O(\log n)\), but `slice()` is **\(O(n)\)** because it copies the remaining array.
  - If you prune on every write, this can become expensive and create GC pressure.
- **Read**:
  - Binary search is \(O(\log n)\), but scanning the window is **\(O(w)\)** where \(w\) = number of logs inside the last N minutes.
  - With frequent reads and high ingest (millions/min), CPU cost becomes the bottleneck.
- **Correctness risk**:
  - Binary search requires `entries` to be sorted by timestamp. If out-of-order timestamps are allowed, results can be wrong unless you insert in order.

## New approach (latest-per-user + min-heap pruning)

### Data structures
- **`latestTimestampByUserId: Map<number, number>`**
  - Stores each user’s **latest** activity timestamp (within the window)
- **`minHeap: MinHeap<{ userId, timestamp }>`**
  - Allows efficient pruning of users whose latest activity becomes older than the cutoff
  - Heap can contain stale entries; we ignore them by checking against the map

### Write path (`POST /logs`)
- Validate inputs (`userId`, `timestamp`)
- Update `latestTimestampByUserId[userId] = max(existing, timestamp)`
- Push `{ userId, latestTimestamp }` into the min-heap
- Prune:
  - While heap top timestamp is older than cutoff:
    - Pop it
    - If it still matches the user’s current latest timestamp in the map, delete that user from the map
  - Occasionally rebuild the heap if too many stale entries accumulate

### Read path (`GET /active-users?minutes=N`)
- Prune based on requested N (clamped to max window)
- Return **`{ count: latestTimestampByUserId.size }`**

### Visual data flow

```text
Incoming log
   { userId, timestamp }
          |
          v
   +-------------------------------+
   | latestTimestampByUserId (Map) |
   |  userId -> latestTimestamp    |
   +-------------------------------+
          ^
          |
          +-------------------+
                              |
   +---------------------+    |
   |     minHeap         |----+
   | [ (ts, userId), ... ]    |
   +---------------------+
          |
          |  prune step (on write or read)
          v
   1) while heap.top.timestamp < cutoffTime:
   2)   pop top (ts, userId)
   3)   if Map[userId] === ts -> delete userId from Map
```

### Complexity & high-volume behavior
- **Write**: \(O(\log u)\) for heap push + amortized pruning, where \(u\) is active unique users
- **Read**: typically **\(O(1)\)** (just return map size), plus any pending pruning work
- **Memory**:
  - Bounded mainly by **unique active users** in the window (map size)
  - Heap overhead exists, but stale entries are bounded with periodic compaction

## Interview notes (what to say)
- **Why old approach struggles at scale**: reads scan the window; writes may copy arrays; both become expensive under high QPS.
- **Why new approach is better**: pre-aggregation makes reads constant-time; pruning is incremental; memory stays bounded.
- **Production scaling** (if asked “millions/min”):
  - Decouple ingestion (Kafka/Redis Streams), aggregate in workers, store results in Redis.
  - For approximate uniques: Redis HyperLogLog per minute + merge for N minutes.

