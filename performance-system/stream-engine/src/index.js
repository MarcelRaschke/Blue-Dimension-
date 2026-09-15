import express from 'express';
import { createLogger } from 'pino';
import { AudioEngine } from './audioEngine.js';
import { icecastConfig } from './icecast.js';

const app = express();
const port = process.env.PORT || 5001;
const logLevel = process.env.LOG_LEVEL || 'info';

const logger = createLogger({ level: logLevel });

app.use(express.json());

const audioEngine = new AudioEngine({
  audioInput: process.env.AUDIO_INPUT || 'hw:0',
  bitrate: process.env.BITRATE || '256k',
  sampleRate: process.env.SAMPLE_RATE || '44100',
  icecastUrl: process.env.ICECAST_URL || 'icecast://source:changeme@localhost:8000/blue-dimension',
  logger
});

let streamActive = false;
let currentMetadata = {
  track: 'Initializing...',
  artist: 'Blue Dimension',
  bpm: 120,
  position: 0,
  duration: 0
};

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    streamActive
  });
});

app.get('/status', async (req, res) => {
  try {
    const icecastStatus = await icecastConfig.getStreamStatus();
    res.json({
      active: streamActive,
      bitrate: process.env.BITRATE || '256k',
      sampleRate: process.env.SAMPLE_RATE || '44100',
      listeners: icecastStatus?.listeners || 0,
      uptime: process.uptime(),
      metadata: currentMetadata,
      audioInput: process.env.AUDIO_INPUT || 'hw:0'
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get stream status');
    res.status(500).json({ error: 'Failed to get stream status' });
  }
});

app.post('/start', async (req, res) => {
  if (streamActive) {
    return res.status(400).json({ error: 'Stream already active' });
  }

  try {
    logger.info('Starting audio stream...');
    await audioEngine.start();
    streamActive = true;
    res.json({ status: 'started', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error({ error }, 'Failed to start stream');
    res.status(500).json({ error: error.message });
  }
});

app.post('/stop', async (req, res) => {
  if (!streamActive) {
    return res.status(400).json({ error: 'Stream not active' });
  }

  try {
    logger.info('Stopping audio stream...');
    await audioEngine.stop();
    streamActive = false;
    res.json({ status: 'stopped', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error({ error }, 'Failed to stop stream');
    res.status(500).json({ error: error.message });
  }
});

app.post('/metadata', express.json(), (req, res) => {
  const { track, artist, bpm, position, duration } = req.body;

  currentMetadata = {
    track: track || currentMetadata.track,
    artist: artist || currentMetadata.artist,
    bpm: bpm || currentMetadata.bpm,
    position: position || currentMetadata.position,
    duration: duration || currentMetadata.duration
  };

  try {
    icecastConfig.updateMetadata({
      track: currentMetadata.track,
      artist: currentMetadata.artist
    });
    logger.info({ metadata: currentMetadata }, 'Updated stream metadata');
    res.json({ status: 'updated', metadata: currentMetadata });
  } catch (error) {
    logger.error({ error }, 'Failed to update metadata');
    res.status(500).json({ error: error.message });
  }
});

app.get('/metrics', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    streamActive,
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  });
});

app.get('/config', (req, res) => {
  res.json({
    audioInput: process.env.AUDIO_INPUT || 'hw:0',
    bitrate: process.env.BITRATE || '256k',
    sampleRate: process.env.SAMPLE_RATE || '44100',
    icecastHost: process.env.ICECAST_HOST || 'icecast',
    icecastPort: process.env.ICECAST_PORT || '8000',
    port: process.env.PORT || 5001
  });
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, gracefully shutting down...');
  if (streamActive) {
    await audioEngine.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, gracefully shutting down...');
  if (streamActive) {
    await audioEngine.stop();
  }
  process.exit(0);
});

app.listen(port, () => {
  logger.info({ port }, 'Stream Engine server started');
});
