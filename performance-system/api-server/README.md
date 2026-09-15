# Blue Dimension API Server

Central API server for stream control, metadata management, performance tracking, and analytics. Provides REST endpoints for coordinating the Blue Dimension live DJ performance system components.

## Features

- Stream status monitoring and control
- Track metadata management (title, artist, BPM, key)
- Session tracking and history
- Performance metrics collection
- Icecast integration for listener stats
- SQLite database for persistent storage
- Health checks and status endpoints
- Graceful shutdown handling
- Comprehensive logging with Pino

## Tech Stack

- **Node.js 18+** - Runtime
- **Express** - REST API framework
- **SQLite3** - Persistent database
- **Pino** - Structured logging
- **Axios** - HTTP client

## Development

### Setup

```bash
npm install
```

### Development Server

```bash
npm run dev
# Server runs on http://localhost:5000
```

### Build

No build step required. Deploy files directly.

### Lint

```bash
npm run lint
```

## Environment Variables

See `.env.example` for complete configuration options.

**Critical settings:**
```env
PORT=5000                                    # Server port
DB_PATH=/app/data/database.sqlite           # SQLite database path
NODE_ENV=production                         # Environment
LOG_LEVEL=info                              # Logging level
STREAM_ENGINE_URL=http://stream-engine:5001 # Stream Engine connection
ICECAST_URL=http://icecast:8000             # Icecast connection
```

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-09-15T14:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0"
}
```

### Stream Status

```bash
GET /status
```

Response:
```json
{
  "active": true,
  "stream": {
    "running": true,
    "bitrate": "256k",
    "sampleRate": "44100",
    "audioInput": "hw:0",
    "uptime": 3600.5
  },
  "icecast": {
    "status": "connected",
    "url": "http://icecast:8000"
  },
  "currentMetadata": {
    "track": "Unison 7",
    "artist": "Sasha",
    "bpm": 128,
    "key": "D Major",
    "duration": 300000,
    "position": 120000
  },
  "uptime": 3600.5,
  "timestamp": "2026-09-15T14:30:00.000Z"
}
```

### Current Metadata

```bash
GET /metadata
```

Response:
```json
{
  "id": 1,
  "track": "Untitled",
  "artist": "DJ Jesse Jay",
  "bpm": 120,
  "key": "A Minor",
  "duration": 300000,
  "position": 120000,
  "updated_at": "2026-09-15T14:30:00.000Z"
}
```

### Update Metadata

```bash
POST /metadata
Content-Type: application/json

{
  "track": "Unison 7",
  "artist": "Sasha",
  "bpm": 128,
  "key": "D Major",
  "duration": 300000,
  "position": 120000
}
```

Response:
```json
{
  "status": "updated",
  "metadata": {
    "id": 1,
    "track": "Unison 7",
    "artist": "Sasha",
    "bpm": 128,
    "key": "D Major",
    "duration": 300000,
    "position": 120000,
    "updated_at": "2026-09-15T14:30:00.000Z"
  }
}
```

### Track History

```bash
GET /history?limit=50
```

Response:
```json
{
  "tracks": [
    {
      "id": 1,
      "track": "Unison 7",
      "artist": "Sasha",
      "start_time": "2026-09-15T14:00:00.000Z",
      "end_time": "2026-09-15T14:05:00.000Z",
      "duration": 300000,
      "created_at": "2026-09-15T14:00:00.000Z"
    }
  ],
  "total": 1
}
```

### Performance Metrics

```bash
GET /metrics?hours=1
```

Response:
```json
{
  "metrics": [
    {
      "id": 1,
      "timestamp": "2026-09-15T14:30:00.000Z",
      "cpu_usage": 15.2,
      "memory_usage": 52428800,
      "active_listeners": 42,
      "bitrate": "256k",
      "sample_rate": 44100,
      "uptime": 3600,
      "created_at": "2026-09-15T14:30:00.000Z"
    }
  ],
  "total": 1
}
```

### Record Metric

```bash
POST /metrics
Content-Type: application/json

{
  "cpuUsage": 15.2,
  "memoryUsage": 52428800,
  "activeListeners": 42,
  "bitrate": "256k",
  "sampleRate": 44100,
  "uptime": 3600
}
```

Response:
```json
{
  "status": "recorded",
  "metric": { ... }
}
```

### Analytics

```bash
GET /analytics
```

Response:
```json
{
  "stats": {
    "total_sessions": 5,
    "total_duration": 18000,
    "avg_peak_listeners": 38.2,
    "max_peak_listeners": 52,
    "total_tracks_played": 125
  },
  "recentMetrics": {
    "count": 12,
    "data": [ ... ]
  }
}
```

### Session Management

#### Start Session

```bash
POST /session/start
```

Response:
```json
{
  "status": "started",
  "sessionId": 1,
  "timestamp": "2026-09-15T14:30:00.000Z"
}
```

#### End Session

```bash
POST /session/end
Content-Type: application/json

{
  "totalListeners": 100,
  "peakListeners": 52,
  "tracksPlayed": 25
}
```

Response:
```json
{
  "status": "ended",
  "sessionId": 1,
  "timestamp": "2026-09-15T14:35:00.000Z"
}
```

### Configuration

```bash
GET /config
```

Response:
```json
{
  "port": 5000,
  "streamEngine": "http://stream-engine:5001",
  "icecast": "http://icecast:8000",
  "database": "/app/data/database.sqlite",
  "environment": "production",
  "logLevel": "info"
}
```

## Database Schema

### metadata
Stores current track metadata

```sql
CREATE TABLE metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track TEXT NOT NULL,
  artist TEXT NOT NULL,
  bpm INTEGER,
  key TEXT,
  duration INTEGER,
  position INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### session_history
Tracks streaming sessions

```sql
CREATE TABLE session_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration INTEGER,
  total_listeners INTEGER DEFAULT 0,
  peak_listeners INTEGER DEFAULT 0,
  tracks_played INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### performance_metrics
Records system performance data

```sql
CREATE TABLE performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL,
  cpu_usage REAL,
  memory_usage INTEGER,
  active_listeners INTEGER,
  bitrate TEXT,
  sample_rate INTEGER,
  uptime INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### track_log
Historical log of played tracks

```sql
CREATE TABLE track_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track TEXT NOT NULL,
  artist TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## Usage

### Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your settings
nano .env

# Start development server with auto-reload
npm run dev
```

### Docker

```bash
# Build image
docker build -t blue-dimension-api-server .

# Run container
docker run -d \
  --name api-server \
  -e PORT=5000 \
  -e DB_PATH=/app/data/database.sqlite \
  -e STREAM_ENGINE_URL=http://stream-engine:5001 \
  -e ICECAST_URL=http://icecast:8000 \
  -p 5000:5000 \
  -v api-data:/app/data \
  blue-dimension-api-server
```

### Docker Compose

See parent directory `docker-compose.yml` for full stack deployment.

## Integration

- Part of docker-compose.yml orchestration
- Depends on stream-engine service (healthy condition)
- Upstream dependency for web-dashboard service
- Connects to icecast for listener metrics
- Uses SQLite for persistent data storage

## Logging

API Server uses Pino for structured logging.

### Log Levels

Set via `LOG_LEVEL` environment variable:
- `debug` - Detailed debugging information
- `info` - General informational messages (default)
- `warn` - Warning messages
- `error` - Error messages
- `fatal` - Fatal errors

### View Logs

```bash
docker logs blue-dimension-api-server
```

### Follow Logs

```bash
docker logs -f blue-dimension-api-server
```

## Architecture

```
[Express API Server] (port 5000)
  ↓
[SQLite Database] (database.sqlite)
  ↓
[Stream Engine] (port 5001)
↓
[Icecast] (port 8000)
  ↓
[Web Dashboard] (port 3000)
```

## Performance Considerations

### Database

- SQLite is suitable for single-node deployments
- Consider connection pooling for high-throughput scenarios
- Regular backup recommended for production

### Metrics

- Metrics retention: 24 hours by default (configurable)
- Track history: last 500 entries available
- Consider archiving old metrics periodically

### API Response Times

Typical latencies:
- `/health` - <1ms
- `/status` - 50-200ms (includes upstream calls)
- `/metadata` - 5-10ms
- `/history` - 20-50ms (depends on query limit)
- `/metrics` - 50-100ms (depends on time range)

## Troubleshooting

### Database Connection Failed

**Check database path:**
```bash
ls -la /app/data/
```

**Ensure write permissions:**
```bash
chmod 755 /app/data/
```

### Stream Engine Connection Refused

**Verify Stream Engine is running:**
```bash
curl http://stream-engine:5001/health
```

**Check STREAM_ENGINE_URL environment variable:**
```bash
echo $STREAM_ENGINE_URL
```

### Icecast Connection Failed

**Verify Icecast is running:**
```bash
curl http://icecast:8000/status.xsl
```

**Check ICECAST_URL environment variable:**
```bash
echo $ICECAST_URL
```

### High API Latency

**Monitor metrics endpoint:**
```bash
curl http://localhost:5000/metrics
```

**Check database size:**
```bash
sqlite3 /app/data/database.sqlite ".tables"
sqlite3 /app/data/database.sqlite "SELECT COUNT(*) FROM track_log;"
```

**Consider cleaning old data:**
```bash
sqlite3 /app/data/database.sqlite "DELETE FROM track_log WHERE created_at < datetime('now', '-30 days');"
```

## Notes

- Database is initialized automatically on first run
- Session tracking requires explicit start/end calls
- Metadata updates are logged as track plays
- All timestamps are stored in UTC

## Support & Documentation

- **Main Project**: See `../../README.md`
- **Docker Compose**: See `../DOCKER_COMPOSE.md`
- **Stream Engine**: See `../stream-engine/README.md`
- **Web Dashboard**: See `../web-dashboard/README.md`

## License

MIT License - See LICENSE file
