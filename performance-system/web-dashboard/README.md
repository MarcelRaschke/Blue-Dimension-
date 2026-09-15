# Blue Dimension Web Dashboard

React-based real-time performance monitoring dashboard for Blue Dimension live DJ system.

## Features

- **Real-Time Monitoring**: Live stream status, listeners, bitrate via WebSocket
- **CDJ Integration**: Track metadata, BPM, playback position from Pioneer CDJ
- **System Health**: CPU, memory, disk usage, latency monitoring
- **Session Analytics**: Listener trends, session duration, connection quality
- **Show Management**: Start/stop shows, view history, export analytics
- **Dark Neon UI**: Synthwave-inspired interface with Tailwind CSS

## Tech Stack

- **React 18** - UI framework
- **Vite** - Fast build tool & dev server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **WebSocket** - Real-time updates
- **Nginx** - Production server

## Development

### Setup

```bash
npm install
```

### Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### Build

```bash
npm run build
# Output: ./build/
```

### Lint

```bash
npm run lint
```

## Environment Variables

See `.env.example`:

```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000/ws
```

## Architecture

```
App (WebSocket connection, state management)
├── Header (Connection status, current show, time)
├── StreamStatus (Bitrate, listeners, uptime, stream controls)
├── CDJMetadata (Current track, BPM, position, playback)
├── SystemHealth (CPU/mem/disk/latency gauges)
├── Analytics (Peak listeners, sessions, avg bitrate)
└── ShowControls (Start/stop show, history, export)
```

## Component Structure

- **Header** - Navigation bar with connection indicator
- **StreamStatus** - Icecast stream metrics and controls
- **CDJMetadata** - Track info, progress bar, playback state
- **SystemHealth** - System resource gauges
- **Analytics** - Session analytics and trends
- **ShowControls** - Show lifecycle management

## WebSocket Message Types

```javascript
{
  type: 'stream-status',
  payload: { active, bitrate, listeners, uptime }
}

{
  type: 'cdj-metadata',
  payload: { connected, track, bpm, position, playing }
}

{
  type: 'system-health',
  payload: { cpu, memory, disk, latency }
}

{
  type: 'analytics',
  payload: { peakListeners, totalSessions, avgBitrate }
}
```

## Docker

Build:
```bash
docker build -t blue-dimension-dashboard .
```

Run:
```bash
docker run -p 3000:3000 -e API_HOST=api-server:5000 blue-dimension-dashboard
```

See `../docker-compose.yml` for full stack deployment.

## Production Deployment

- Nginx handles routing, caching, compression
- Static assets cached 1 year (fingerprinted)
- API/WebSocket proxied through Nginx
- Security headers included (HSTS, CSP)
- GZIP compression enabled

## Troubleshooting

**Dashboard not loading**: Check API connection in browser console
**WebSocket timeout**: Ensure API server is running and accessible
**Stats not updating**: Verify WebSocket messages in Network tab
