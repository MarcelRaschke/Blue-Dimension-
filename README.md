# Blue Dimension

Production-ready live DJ performance system for streaming, real-time monitoring, and synchronized control. Built for the Radio LoRa *Blue Dimension* broadcast (Do 00:00–06:00, Zürich).

## System Overview

Complete cloud-native architecture for live DJ performances with:
- Real-time audio streaming via Icecast
- CDJ device synchronization via OSC
- Performance analytics and metadata tracking
- Modern web dashboard for monitoring
- Containerized microservices with Docker Compose

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Blue Dimension System                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │  CDJ Devices │      │ Audio Source │      │ Ableton Live │  │
│  │              │      │   (XDJ/DJM)  │      │              │  │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘  │
│         │                     │                     │           │
│         ▼                     ▼                     ▼           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Docker Compose Stack                         │  │
│  │                                                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │  │
│  │  │  Icecast │  │  OSC     │  │   Stream Engine      │   │  │
│  │  │ (Mux)    │  │  Bridge  │  │  (FFmpeg MP3)        │   │  │
│  │  │ :8000    │  │  :7700   │  │  :5001               │   │  │
│  │  └──────┬───┘  └────┬─────┘  └──────┬───────────────┘   │  │
│  │         │           │               │                    │  │
│  │         └─────┬─────┴───────────────┘                    │  │
│  │               │                                          │  │
│  │         ┌─────▼──────────┐         ┌──────────────┐     │  │
│  │         │  API Server    │         │  SQLite DB   │     │  │
│  │         │  :5000         │         │              │     │  │
│  │         │  (Express)     │─────────│ Metadata     │     │  │
│  │         │                │         │ Sessions     │     │  │
│  │         └─────┬──────────┘         │ Analytics    │     │  │
│  │               │                    └──────────────┘     │  │
│  │         ┌─────▼──────────┐                              │  │
│  │         │  Web Dashboard │                              │  │
│  │         │  :3000         │                              │  │
│  │         │  (React)       │                              │  │
│  │         └────────────────┘                              │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         │                                       │
         ▼                                       ▼
    Listeners (HTTP)                  Monitoring Dashboard
```

## Services

### Icecast
MP3 streaming server for broadcasting audio to listeners.
- Port: 8000
- Format: MP3 (configurable bitrate)
- Mount Point: `/blue-dimension`
- See: [Icecast Config](./config/icecast.xml)

### Stream Engine
FFmpeg-based audio processing and streaming integration.
- Port: 5001 (REST API)
- Captures audio from CDJ/audio interface (ALSA)
- Encodes MP3 and streams to Icecast
- See: [Stream Engine](./performance-system/stream-engine/README.md)

### OSC Bridge
Open Sound Control (OSC) bridge for CDJ device synchronization.
- Port: 7700 (UDP)
- Receives messages from Pioneer CDJ devices
- Forwards to Ableton Live for synchronized performance
- See: [OSC Bridge](./performance-system/osc-bridge/README.md)

### API Server
Central API for metadata, metrics, and stream control.
- Port: 5000 (REST API)
- SQLite database for persistent storage
- Connects to Stream Engine and Icecast
- See: [API Server](./performance-system/api-server/README.md)

### Web Dashboard
React-based monitoring and control interface.
- Port: 3000 (HTTP)
- Real-time stream status monitoring
- Track metadata display
- System health checks
- See: [Web Dashboard](./performance-system/web-dashboard/README.md)

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 1.29+
- Linux system with ALSA audio support (for CDJ/audio input)

### Local Development

```bash
# Clone repository
git clone https://github.com/MarcelRaschke/Blue-Dimension-.git
cd Blue-Dimension-

# Copy environment template
cp .env.example .env

# Edit configuration as needed
nano .env

# Start full stack
docker-compose up -d

# View logs
docker-compose logs -f

# Verify services are healthy
docker-compose ps
```

### Verify System

```bash
# Health check API Server
curl http://localhost:5000/health

# Check stream status
curl http://localhost:5000/status

# View web dashboard
# Open http://localhost:3000 in browser

# Verify Icecast
curl http://localhost:8000/status.xsl
```

## Environment Configuration

Copy `.env.example` to `.env` and adjust settings:

```env
# Audio Input
AUDIO_INPUT=hw:0                    # ALSA device for CDJ/audio

# Audio Encoding
BITRATE=256k                        # MP3 bitrate (128k-320k)
SAMPLE_RATE=44100                   # Audio sample rate

# Icecast
ICECAST_HOST=icecast                # Icecast hostname
ICECAST_PORT=8000                   # Icecast port
ICECAST_SOURCE_PASSWORD=changeme    # Source auth password
ICECAST_ADMIN_PASSWORD=changeme     # Admin auth password

# OSC Bridge
ABLETON_OSC_ADDR=host.docker.internal:11000  # Ableton Live OSC

# Performance
LOG_LEVEL=info                      # Logging level
NODE_ENV=production                 # Environment mode
```

See [Deployment Guide](./DOCKER_COMPOSE.md) for advanced configuration.

## API Endpoints

### Health & Status
- `GET /health` - API Server health check
- `GET /status` - Full system status with stream info

### Metadata Management
- `GET /metadata` - Current track metadata
- `POST /metadata` - Update track metadata
- `GET /history` - Track play history

### Performance Analytics
- `GET /metrics` - Performance metrics (CPU, memory, listeners)
- `POST /metrics` - Record new metrics
- `GET /analytics` - Session analytics and stats

### Session Management
- `POST /session/start` - Begin streaming session
- `POST /session/end` - End session with stats

### Configuration
- `GET /config` - Current service configuration

See individual service READMEs for detailed endpoint documentation.

## Monitoring

### Docker Compose Health Checks

All services include health checks:
```bash
# View health status
docker-compose ps

# Watch health in real-time
watch -n 5 'docker-compose ps'
```

### Metrics Endpoint

Stream performance metrics via API:
```bash
curl http://localhost:5000/metrics?hours=24
```

### Log Aggregation

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f stream-engine

# Recent logs only
docker-compose logs --tail=100 api-server
```

## Deployment

### Production Deployment

See [Deployment Guide](./DOCKER_COMPOSE.md) for:
- SSL/TLS configuration
- Load balancing setup
- Docker Swarm deployment
- Kubernetes integration (Helm charts)
- Reverse proxy configuration

### CI/CD Pipeline

GitHub Actions workflow included:
- Automated tests on push/PR
- Docker image building
- Security scanning (Semgrep, CodeQL, Trivy)
- DCO (Developer Certificate of Origin) check

See [GitHub Actions](./.github/workflows/) for configuration.

## Audio Device Configuration

### Find Available Devices

```bash
arecord -l
```

Example output:
```
**** List of CAPTURE Hardware Devices ****
card 0: Generic [Generic USB Audio], device 0: USB Audio [USB Audio]
  Subdevices: 1/1
  Subdevice #0: subdevice #0
```

### Configure AUDIO_INPUT

Update `.env` with device reference:

```env
# Default card, device 0
AUDIO_INPUT=hw:0

# Specific card (1) and device (0)
AUDIO_INPUT=hw:1,0
```

### Test Recording

```bash
# Record 5 seconds from device hw:0
arecord -D hw:0 -f cd -d 5 test.wav
```

## Performance Tuning

### Low Latency

```env
BITRATE=128k
SAMPLE_RATE=44100
```

### High Quality

```env
BITRATE=320k
SAMPLE_RATE=48000
```

### Resource-Constrained

```env
BITRATE=128k
SAMPLE_RATE=22050
```

## Troubleshooting

### Stream Engine Fails to Start

**Check audio device:**
```bash
arecord -l
```

**Verify device is accessible:**
```bash
arecord -D hw:0 -f cd -d 5 test.wav
```

### Connection Refused to Icecast

**Verify Icecast is running:**
```bash
docker-compose logs icecast
curl http://localhost:8000/status.xsl
```

### API Server Database Error

**Check database directory:**
```bash
ls -la /var/lib/blue-dimension/data/
```

**Verify permissions:**
```bash
docker-compose exec api-server ls -la /app/data/
```

### High CPU/Memory Usage

**Check individual service metrics:**
```bash
docker stats --no-stream blue-dimension-stream-engine
docker stats --no-stream blue-dimension-api-server
```

**Reduce bitrate or sample rate in `.env`**

## Architecture Decisions

### Microservices Design
- Independent service failures don't cascade
- Services can be scaled independently
- Clear separation of concerns

### SQLite for Metadata
- Single-node suitability
- Easy backup and migration
- No external database required

### Docker Compose for Local/Dev
- Simple multi-service orchestration
- Works on any platform with Docker
- Easy to understand and debug

### Express.js for API
- Lightweight and well-established
- Good performance for metadata APIs
- Rich ecosystem of middleware

### Go for OSC Bridge
- Low-latency UDP processing
- Minimal overhead for message forwarding
- Simple deployment (single binary)

### React Dashboard
- Real-time updates via WebSocket/polling
- Modern UX with Tailwind CSS
- Responsive design

## Security Considerations

### Network
- Services communicate over internal Docker network (172.20.0.0/16)
- Audio input restricted to local ALSA devices
- Reverse proxy recommended for public access

### Authentication
- Icecast source/admin passwords (changeable)
- Consider adding API key authentication for production

### Data
- SQLite database on persistent volume
- Regular backups recommended
- No sensitive data in logs (audit logging)

## Development

### Project Structure

```
blue-dimension-/
├── docker-compose.yml              # Service orchestration
├── DOCKER_COMPOSE.md               # Deployment documentation
├── config/
│   └── icecast.xml                # Icecast configuration
├── performance-system/
│   ├── stream-engine/             # FFmpeg audio processing
│   ├── osc-bridge/                # CDJ synchronization
│   ├── api-server/                # Metadata and analytics API
│   └── web-dashboard/             # React monitoring interface
├── .github/workflows/             # CI/CD pipeline
└── README.md                       # This file
```

### Adding a New Service

1. Create service directory: `performance-system/service-name/`
2. Add `Dockerfile` with health check
3. Update `docker-compose.yml` with service definition
4. Create comprehensive `README.md`
5. Add to CI/CD pipeline in `.github/workflows/`

## Contributing

Contributions welcome! Follow these guidelines:

1. Fork repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit with DCO sign-off: `git commit -s -m "Description"`
4. Push to branch: `git push origin feature/my-feature`
5. Create Pull Request with detailed description

### Commit Message Style

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: feat, fix, docs, style, refactor, perf, test, chore

## License

MIT License - See LICENSE file for details

## Support

For issues, documentation, or questions:

- **Issues**: [GitHub Issues](https://github.com/MarcelRaschke/Blue-Dimension-/issues)
- **Discussions**: [GitHub Discussions](https://github.com/MarcelRaschke/Blue-Dimension-/discussions)
- **Radio LoRa**: [https://www.lora.ch/](https://www.lora.ch/)

## Acknowledgments

- DJ Jesse Jay - Project vision and performance direction
- Radio LoRa - Broadcasting platform
- Open source community - Docker, Express, React, Go, and many others

## Related Projects

- **djjessejay.ch** - Artist website and portfolio
- **Radio LoRa** - Community radio station
- **Blue Dimension Radio Show** - Live broadcasts

---

Built for Radio LoRa *Blue Dimension* broadcast (Do 00:00–06:00, Zürich)
