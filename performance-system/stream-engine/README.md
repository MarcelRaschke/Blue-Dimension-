# Blue Dimension Stream Engine

FFmpeg-based audio processing and Icecast streaming engine for Blue Dimension live DJ performance system.

## Features

- Real-time audio input capture from CDJ or audio device
- FFmpeg MP3 encoding with configurable bitrate and sample rate
- Icecast streaming integration
- REST API for stream control (start/stop)
- Metadata update support
- Health checks and status monitoring
- Graceful shutdown on SIGTERM/SIGINT
- Comprehensive logging with Pino

## Tech Stack

- **Node.js 18+** - Runtime
- **Express** - REST API framework
- **FFmpeg** - Audio encoding and streaming
- **fluent-ffmpeg** - FFmpeg Node.js wrapper
- **Pino** - Structured logging
- **Axios** - HTTP client for Icecast integration

## Development

### Setup

```bash
npm install
```

### Development Server

```bash
npm run dev
# Server runs on http://localhost:5001
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
AUDIO_INPUT=hw:0                    # ALSA device (verify with: arecord -l)
BITRATE=256k                        # Encoding bitrate (128k-320k recommended)
SAMPLE_RATE=44100                   # Sample rate (44100 or 48000)
ICECAST_URL=icecast://source:pass@icecast:8000/blue-dimension
ICECAST_HOST=icecast                # Icecast hostname
ICECAST_PORT=8000                   # Icecast port
ICECAST_ADMIN_PASSWORD=changeme     # Icecast admin password
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
  "timestamp": "2026-09-15T12:00:00.000Z",
  "uptime": 3600.5,
  "streamActive": true
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
  "bitrate": "256k",
  "sampleRate": "44100",
  "listeners": 42,
  "uptime": 3600.5,
  "metadata": {
    "track": "Untitled",
    "artist": "DJ Jesse Jay",
    "bpm": 120,
    "position": 120000,
    "duration": 300000
  },
  "audioInput": "hw:0"
}
```

### Start Stream

```bash
POST /start
```

Response:
```json
{
  "status": "started",
  "timestamp": "2026-09-15T12:00:00.000Z"
}
```

### Stop Stream

```bash
POST /stop
```

Response:
```json
{
  "status": "stopped",
  "timestamp": "2026-09-15T12:00:00.000Z"
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
  "position": 120000,
  "duration": 300000
}
```

Response:
```json
{
  "status": "updated",
  "metadata": {
    "track": "Unison 7",
    "artist": "Sasha",
    "bpm": 128,
    "position": 120000,
    "duration": 300000
  }
}
```

### Metrics

```bash
GET /metrics
```

Response:
```json
{
  "timestamp": "2026-09-15T12:00:00.000Z",
  "uptime": 3600.5,
  "streamActive": true,
  "memoryUsage": {
    "rss": 52428800,
    "heapTotal": 31457280,
    "heapUsed": 18874368
  },
  "cpuUsage": {
    "user": 1000,
    "system": 500
  }
}
```

### Configuration

```bash
GET /config
```

Response:
```json
{
  "audioInput": "hw:0",
  "bitrate": "256k",
  "sampleRate": "44100",
  "icecastHost": "icecast",
  "icecastPort": "8000",
  "port": 5001
}
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
docker build -t blue-dimension-stream-engine .

# Run container
docker run -d \
  --name stream-engine \
  -e AUDIO_INPUT=hw:0 \
  -e BITRATE=256k \
  -e ICECAST_URL=icecast://source:pass@icecast:8000/blue-dimension \
  -p 5001:5001 \
  --device /dev/snd:/dev/snd \
  blue-dimension-stream-engine
```

### Docker Compose

See parent directory `docker-compose.yml` for full stack deployment.

## Audio Device Configuration

### Find Available Devices

```bash
arecord -l
```

Output:
```
**** List of CAPTURE Hardware Devices ****
card 0: Generic [Generic USB Audio], device 0: USB Audio [USB Audio]
  Subdevices: 1/1
  Subdevice #0: subdevice #0
```

### Use Device

```bash
# Default (hw:0)
AUDIO_INPUT=hw:0

# Specific card and device (card:device)
AUDIO_INPUT=hw:1,0
```

### Test Recording

```bash
arecord -D hw:0 -f cd test.wav
```

## Performance Tuning

### Low Latency Setup

```env
BITRATE=128k
SAMPLE_RATE=44100
```

### High Quality Setup

```env
BITRATE=320k
SAMPLE_RATE=48000
```

### Memory-Constrained Systems

```env
BITRATE=128k
SAMPLE_RATE=22050
```

## Troubleshooting

### FFmpeg Fails to Start

**Check audio device:**
```bash
arecord -l
```

**Verify device is accessible:**
```bash
arecord -D hw:0 -f cd test.wav
```

**Update AUDIO_INPUT in .env:**
```env
AUDIO_INPUT=hw:1
```

### Connection Refused to Icecast

**Verify Icecast is running:**
```bash
curl http://localhost:8000/status.xsl
```

**Check ICECAST_URL format:**
```env
ICECAST_URL=icecast://source:password@icecast:8000/blue-dimension
```

**Verify credentials:**
```env
ICECAST_SOURCE_PASSWORD=your-password
```

### High CPU Usage

**Reduce bitrate:**
```env
BITRATE=128k
```

**Reduce sample rate:**
```env
SAMPLE_RATE=44100
```

**Monitor FFmpeg process:**
```bash
docker stats blue-dimension-stream-engine
```

### No Audio Input

**List devices:**
```bash
arecord -l
```

**Test device:**
```bash
arecord -D hw:0 -f cd -d 5 test.wav
```

**Check permissions:**
```bash
ls -la /dev/snd/
```

## Logging

Stream Engine uses Pino for structured logging.

### Log Levels

Set via `LOG_LEVEL` environment variable:
- `debug` - Detailed debugging information
- `info` - General informational messages (default)
- `warn` - Warning messages
- `error` - Error messages
- `fatal` - Fatal errors

### View Logs

```bash
docker logs blue-dimension-stream-engine
```

### Follow Logs

```bash
docker logs -f blue-dimension-stream-engine
```

## Monitoring

### Health Check

The Docker container includes a health check that verifies the API is responding:

```bash
docker inspect --format='{{.State.Health.Status}}' blue-dimension-stream-engine
```

### Uptime Monitoring

Use the `/metrics` endpoint to track uptime and resource usage:

```bash
curl http://localhost:5001/metrics
```

## Architecture

```
Audio Input (hw:0)
  ↓
[FFmpeg Process]
  ↓
MP3 Encoding (256k, 44100Hz)
  ↓
[Express API Server]
  ↓
Icecast Streaming (icecast://source:pass@localhost/blue-dimension)
  ↓
Listeners
```

## Notes

- FFmpeg must be installed on the host (included in Docker image)
- ALSA audio system required for audio input
- Icecast server must be running and accessible
- Network connectivity required for Icecast communication
- Audio device must have read permissions for the container user

## Support & Documentation

- **Main Project**: See `../../README.md`
- **Docker Compose**: See `../DOCKER_COMPOSE.md`
- **API Server**: See `../api-server/README.md`

## License

MIT License - See LICENSE file
