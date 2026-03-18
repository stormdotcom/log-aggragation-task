# Log Aggregation: Unique Active Users (Sliding Window)

Store incoming user activity logs and return the **count of unique users active in the last N minutes**.

## Tech
- Node.js
- Express
- In-memory store (bounded time window)

## Requirements (from prompt)
- Avoid unbounded memory growth
- Efficient for frequent queries
- Handle invalid inputs

## Getting started

### Prerequisites
- Node.js (LTS recommended)

### Install
```bash
npm install
```

### Run
```bash
npm run dev
```
or
```bash
npm start
```

Server starts on `PORT` (default `3000`).

## API

Base path: `/api`

### Health check
`GET /health`

### Store log entry
`POST /api/logs`

Body:
```json
{ "userId": 123, "timestamp": 1710000000000 }
```

Responses:
- `201`: `{ "message": "Log entry added" }`
- `400`: invalid payload (missing/invalid `userId` or `timestamp`)

### Get active users count
`GET /api/active-users?minutes=N`

Response:
```json
{ "count": 42 }
```

Validation:
- `minutes` must be a positive integer
- `minutes` is clamped to the max in-memory window (default **5 minutes**)

## Assumptions
- **Server time** is the source of truth for “current time”.
- Payload `timestamp` is **milliseconds since epoch**.
- `userId` is a **positive integer**.
- Logs older than the max window are pruned; this is an in-memory solution (not durable across restarts).

## Notes for high volume (interview)
See `solutions.md` for **old vs new** approach and scaling discussion (millions/minute, streaming, Redis/Kafka, approximate unique counting).