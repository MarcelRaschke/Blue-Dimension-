# Blue Dimension Docker Compose Stack

Complete production-ready Docker Compose stack for Blue Dimension live DJ performance system.

## Components

- **Icecast** - Streaming media server (port 8000)
- **Stream Engine** - FFmpeg audio processing (port 5001)
- **OSC Bridge** - CDJ/Ableton synchronization (port 7700 UDP)
- **API Server** - Express REST/WebSocket API (port 5000)
- **Web Dashboard** - React monitoring interface (port 3000)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- Audio input device for streaming

## Quick Start

### 1. Setup

```bash
# Copy environment configuration
cp .env.example .env

# Update .env with your settings
nano .env  # or your preferred editor
```

**Critical Settings:**
```env
# Change these from defaults!
ICECAST_SOURCE_PASSWORD=your-strong-password
ICECAST_RELAY_PASSWORD=your-strong-password
ICECAST_ADMIN_PASSWORD=your-strong-password

# Audio device (verify with: arecord -l)
AUDIO_INPUT=hw:0

# For local Ableton on same machine
ABLETON_OSC_ADDR=host.docker.internal:11000
```

### 2. Build & Launch

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 3. Verify Services

```bash
# Icecast admin interface
open http://localhost:8000/admin/

# API health check
curl http://localhost:5000/health

# Stream Engine status
curl http://localhost:5001/status

# Web Dashboard
open http://localhost:3000
```

## Service Details

### Icecast (8000)

Media server for MP3 streaming.

**Admin Interface:** http://localhost:8000/admin/
- Default user: `admin`
- Default password: See ICECAST_ADMIN_PASSWORD in .env

**Stream URL:** `icecast://source:password@localhost:8000/blue-dimension`

**Listener URL (public):** `http://localhost:8000/blue-dimension`

### Stream Engine (5001)

FFmpeg audio processing pipeline.

**API Endpoints:**
- `GET /status` - Stream status
- `GET /health` - Service health
- `POST /start` - Start streaming
- `POST /stop` - Stop streaming
- `POST /metadata` - Update track metadata

**Configuration:**
- Audio input: hw:0 (default)
- Bitrate: 256k (default)
- Sample rate: 44100 (default)

### OSC Bridge (7700 UDP)

CDJ/XDJ synchronization via OSC protocol.

**Listens on:** UDP port 7700
**Forwards to:** Ableton Live at ABLETON_OSC_ADDR

**Messages:**
```
/cdj/play
/cdj/stop
/cdj/bpm <float>
/cdj/position <int>
/cdj/track <string>
```

### API Server (5000)

REST API + WebSocket server for show management.

**REST Endpoints:**
- `GET /health` - Service health
- `GET /shows/current` - Current show info
- `POST /shows/start` - Start new show
- `POST /shows/{id}/end` - End show
- `POST /shows/{id}/track` - Update track
- `GET /shows/{id}/tracks` - Show tracks

**WebSocket:** `ws://localhost:5000/ws`
- Real-time stream status updates
- CDJ metadata streaming
- System health monitoring
- Session analytics

### Web Dashboard (3000)

React-based monitoring interface.

**URL:** http://localhost:3000
**Features:**
- Live stream status
- Current track display
- System health monitoring
- Session analytics
- Show controls

## Common Tasks

### Start Fresh Streaming Session

```bash
# 1. Verify all services are running
docker-compose ps

# 2. Start new show via API
curl -X POST http://localhost:5000/shows/start \
  -H "Content-Type: application/json" \
  -d '{"name":"Blue Dimension","startTime":"2026-09-15T00:00:00Z"}'

# 3. Start streaming
curl -X POST http://localhost:5001/start

# 4. Open dashboard
open http://localhost:3000
```

### Monitor Stream Quality

```bash
# Check stream bitrate and listeners
curl http://localhost:8000/status.xsl | grep bitrate

# Monitor API server performance
docker-compose logs api-server | tail -20

# Check audio input device
arecord -l  # List devices
arecord -D hw:0 -f cd test.wav  # Test recording
```

### Restart Individual Service

```bash
# Restart API server
docker-compose restart api-server

# Restart Stream Engine
docker-compose restart stream-engine

# Restart all services
docker-compose restart
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f stream-engine
docker-compose logs -f api-server

# Last 100 lines
docker-compose logs --tail=100 api-server
```

### Update Configuration

```bash
# Edit .env
nano .env

# Rebuild affected services
docker-compose build

# Restart services
docker-compose restart
```

## Production Deployment

### Pre-deployment Checklist

- [ ] Change all default passwords in .env
- [ ] Configure SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Configure log rotation
- [ ] Set up monitoring/alerting
- [ ] Test failover procedures
- [ ] Configure automated backups
- [ ] Set up CDN for dashboard

### SSL/TLS Configuration

```bash
# Get Let's Encrypt certificate
sudo certbot certonly --standalone -d djjessejay.ch

# Update .env
HTTPS_ENABLED=true
SSL_CERT_PATH=/etc/letsencrypt/live/djjessejay.ch/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/djjessejay.ch/privkey.pem

# Copy certificates to config
sudo cp /etc/letsencrypt/live/djjessejay.ch/fullchain.pem ./config/
sudo cp /etc/letsencrypt/live/djjessejay.ch/privkey.pem ./config/
sudo chown $USER:$USER ./config/*.pem

# Rebuild and restart
docker-compose build
docker-compose restart
```

### Systemd Service (Linux)

Create `/etc/systemd/system/blue-dimension.service`:

```ini
[Unit]
Description=Blue Dimension Live Performance System
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/home/deploy/blue-dimension
ExecStart=/usr/bin/docker-compose up
ExecStop=/usr/bin/docker-compose down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable blue-dimension
sudo systemctl start blue-dimension
```

### Docker Swarm Deployment

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml blue-dimension

# View stack
docker stack ps blue-dimension

# Update service
docker service update --image stream-engine:v2 blue-dimension_stream-engine
```

## Troubleshooting

### Services Won't Start

```bash
# Check Docker daemon
docker ps

# Rebuild images
docker-compose build --no-cache

# Remove old containers
docker-compose down -v

# Start fresh
docker-compose up -d
```

### No Audio Input

```bash
# List audio devices
arecord -l

# Update AUDIO_INPUT in .env
AUDIO_INPUT=hw:1  # Example: second device

# Restart stream-engine
docker-compose restart stream-engine
```

### WebSocket Connection Failed

```bash
# Check API server is running
docker-compose ps api-server

# Check API logs
docker-compose logs api-server

# Verify WebSocket endpoint
curl http://localhost:5000/health

# Test from container
docker-compose exec web-dashboard curl http://api-server:5000/health
```

### High CPU Usage

```bash
# Monitor resource usage
docker stats

# Check FFmpeg process
docker-compose exec stream-engine ps aux | grep ffmpeg

# Reduce bitrate in .env
BITRATE=128k

# Restart stream-engine
docker-compose restart stream-engine
```

### Disk Space Issues

```bash
# Check disk usage
docker system df

# Clean up volumes
docker volume prune

# Limit archive retention in .env
ARCHIVE_RETENTION_DAYS=7

# Restart api-server
docker-compose restart api-server
```

## Performance Tuning

### Optimize for Low Latency

```env
# In .env
BITRATE=128k
SAMPLE_RATE=44100
```

In `osc-bridge/main.go`, lower UDP buffer size:
```go
const udpBufferSize = 512  // Smaller buffer for lower latency
```

### Optimize for Quality

```env
# In .env
BITRATE=320k
SAMPLE_RATE=48000
```

### Memory-Constrained Systems

```env
# In .env
BITRATE=128k
SAMPLE_RATE=22050
```

## Monitoring & Logging

### Log Aggregation

```bash
# Export all logs
docker-compose logs > all-services.log

# Follow real-time
docker-compose logs -f --tail=50
```

### Metrics Export

Enable Prometheus metrics in api-server:

```javascript
// api-server/src/metrics.js
const prometheus = require('prom-client');

const streamBitrate = new prometheus.Gauge({
  name: 'stream_bitrate',
  help: 'Current stream bitrate in kbps'
});
```

## Health Checks

All services have built-in health checks:

```bash
# Check service health
docker-compose ps

# Manual health checks
curl http://localhost:8000/status.xsl  # Icecast
curl http://localhost:5001/status      # Stream Engine
curl http://localhost:5000/health      # API Server
curl http://localhost:3000              # Dashboard
```

## Backup & Recovery

### Backup Strategy

```bash
# Backup database
docker-compose exec api-server sqlite3 /app/data/database.sqlite ".dump" > backup.sql

# Backup configuration
tar -czf config-backup.tar.gz config/ .env

# Backup archives
tar -czf archive-$(date +%Y%m%d).tar.gz performance-system/archive/
```

### Recovery Procedure

```bash
# Stop services
docker-compose down

# Restore database
docker-compose exec api-server sqlite3 /app/data/database.sqlite < backup.sql

# Restore configuration
tar -xzf config-backup.tar.gz

# Start services
docker-compose up -d
```

## Security Considerations

1. **Change Default Passwords** - Update all passwords in .env
2. **Network Isolation** - Use internal networks for inter-service communication
3. **SSL/TLS** - Enable HTTPS for web dashboard and API
4. **Firewall Rules** - Restrict access to necessary ports
5. **Regular Updates** - Keep Docker images updated
6. **Secrets Management** - Use Docker secrets for sensitive data in production
7. **API Rate Limiting** - Enabled by default
8. **CORS** - Configure allowed origins

## Support & Documentation

- **Architecture:** See `performance-system/ARCHITECTURE.md`
- **Stream Engine:** See `performance-system/stream-engine/README.md`
- **OSC Bridge:** See `performance-system/osc-bridge/README.md`
- **API Server:** See `performance-system/api-server/README.md`
- **Web Dashboard:** See `performance-system/web-dashboard/README.md`

## License

MIT License - See LICENSE file

---

**Last Updated:** 2026-09-15
**Version:** 1.0.0
