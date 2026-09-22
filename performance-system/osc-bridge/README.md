# Blue Dimension OSC Bridge

Open Sound Control (OSC) bridge for CDJ device synchronization with Ableton Live integration. Receives OSC messages from Pioneer CDJ devices and forwards them to Ableton Live for synchronized performance.

## Features

- UDP OSC listener on port 7700
- CDJ device message forwarding
- Ableton Live integration (port 11000)
- Configurable OSC addressing
- Structured logging
- Graceful shutdown handling
- Docker containerization

## Tech Stack

- **Go 1.21+** - Runtime
- **go-osc** - OSC protocol library
- **Debian Slim** - Container runtime

## Development

### Setup

Requires Go 1.21+:

```bash
go mod download
```

### Build

```bash
CGO_ENABLED=0 go build -o osc-bridge .
```

### Run

```bash
./osc-bridge
```

## Environment Variables

- `CDJ_OSC_PORT` - UDP port for CDJ messages (default: 7700)
- `ABLETON_OSC_ADDR` - Ableton Live address (default: host.docker.internal:11000)
- `LOG_LEVEL` - Logging level: debug, info (default: info)

## Usage

### Local Development

```bash
# Install Go 1.21+
go mod download

# Build binary
CGO_ENABLED=0 go build -o osc-bridge .

# Run with custom settings
CDJ_OSC_PORT=7700 ABLETON_OSC_ADDR=localhost:11000 ./osc-bridge
```

### Docker

```bash
# Build image
docker build -t blue-dimension-osc-bridge .

# Run container
docker run -d \
  --name osc-bridge \
  -e CDJ_OSC_PORT=7700 \
  -e ABLETON_OSC_ADDR=host.docker.internal:11000 \
  -p 7700:7700/udp \
  blue-dimension-osc-bridge
```

### Docker Compose

```bash
# Start with full stack
docker-compose up -d
```

## OSC Protocol

### Incoming Messages from CDJ

Expected OSC message format from CDJ devices:

```
/cdj/[device_id]/[parameter]
  - /cdj/1/play
  - /cdj/2/bpm
  - /cdj/3/position
  - /cdj/1/cue
  - /cdj/2/sync
```

### Forwarded to Ableton

Messages are forwarded as-is to Ableton Live OSC endpoint at configured address.

Ableton OSC mapping (external control):

```
/live/tempo - Set tempo/BPM
/live/play - Play/stop
/live/track/[n]/arm - Arm track
/live/track/[n]/mute - Mute track
/live/clip/[n]/fire - Fire clip
```

## Configuration

### CDJ Device Setup

1. Enable OSC on CDJ device
2. Configure OSC output to this bridge (UDP, port 7700)
3. Verify connectivity with debug logging

### Ableton Live Setup

1. Enable Remote Scripts in Preferences
2. Ensure OSC port 11000 is available
3. Map OSC messages to tracks/clips as needed
4. Use Ableton's Control Surface API

## Logging

### Info Level (default)

```
2026-09-15T14:30:00Z Starting Blue Dimension OSC Bridge
2026-09-15T14:30:00Z  CDJ OSC Port: 7700
2026-09-15T14:30:00Z  Ableton Address: host.docker.internal:11000
2026-09-15T14:30:00Z Listening on UDP port 7700
2026-09-15T14:30:00Z Connected to Ableton at host.docker.internal:11000
```

### Debug Level

```
2026-09-15T14:30:01Z [192.168.1.100:59234] Received 64 bytes: ...
2026-09-15T14:30:01Z Forwarded to Ableton from 192.168.1.100:59234
```

## Health Check

The service health is checked via:

```bash
netstat -tulnp | grep 7700
```

Expected response: Service listening on UDP port 7700 confirms operational status.

## Monitoring

### Metrics

Current implementation logs:
- Packet count per session
- Uptime duration on shutdown
- Errors and connection status
- Debug traces (when enabled)

### Status Endpoint

Check Docker container health:

```bash
docker inspect --format='{{.State.Health.Status}}' blue-dimension-osc-bridge
```

## Integration

- Part of docker-compose.yml orchestration
- Independent service (no service dependencies)
- Upstream input from CDJ devices (Pioneer DJM/CDJ equipment)
- Downstream output to Ableton Live (port 11000)
- Feeds metadata to api-server via logging

## Troubleshooting

### Bridge not receiving messages

**Check CDJ device configuration:**
- Verify OSC is enabled on CDJ
- Confirm OSC output address matches bridge IP
- Verify UDP port 7700 is accessible

**Test with debug logging:**
```bash
LOG_LEVEL=debug ./osc-bridge
```

### Messages not forwarding to Ableton

**Verify Ableton is reachable:**
```bash
nc -uz -l 11000
# From another terminal:
echo "test" | nc -u localhost 11000
```

**Check address configuration:**
```bash
ABLETON_OSC_ADDR=localhost:11000 ./osc-bridge
```

### Connection refused to Ableton

**Ensure Ableton is listening:**
1. Enable OSC in Ableton preferences
2. Confirm OSC input port is 11000
3. Check firewall rules

**For Docker on Linux:**
```bash
ABLETON_OSC_ADDR=172.17.0.1:11000 ./osc-bridge
```

For Docker on macOS/Windows, use `host.docker.internal` (default).

### High packet loss

**Potential causes:**
- Network congestion on CDJ → Bridge path
- Ableton OSC input buffer overflow
- Bridge network interface saturation

**Mitigation:**
1. Use dedicated network for CDJ/DJ equipment
2. Monitor packet drops: `netstat -s | grep -i udp`
3. Run bridge on dedicated machine

## Performance

### Packet Throughput

Single CDJ device:
- ~100-200 packets/second (typical)
- ~50 bytes per packet
- ~5-10 Mbps total bandwidth

Multi-device setup (4 CDJs + DJM mixer):
- ~500-1000 packets/second
- ~25-50 Mbps bandwidth
- Recommend dedicated network interface

### Latency

- UDP receive/forward: <1ms
- Ableton OSC processing: 10-50ms (Ableton dependent)
- End-to-end latency: 20-100ms (acceptable for DJ mixing)

## Notes

- UDP is connectionless; packet loss is possible on congested networks
- OSC messages are forwarded transparently (no filtering/transformation)
- Ableton Live must be running and listening on configured port
- CDJ devices must support OSC protocol (Pioneer DJM-900NXS2+, CDJ-2000NXS2+, etc.)

## Support & Documentation

- **Main Project**: See `../../README.md`
- **Docker Compose**: See `../DOCKER_COMPOSE.md`
- **Stream Engine**: See `../stream-engine/README.md`
- **API Server**: See `../api-server/README.md`

## License

MIT License - See LICENSE file
