import express from 'express';
import pinoHttp from 'pino-http';
import pino from 'pino';
import axios from 'axios';
import { Database } from './database.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 5000;
const DB_PATH = process.env.DB_PATH || '/app/data/database.sqlite';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'production';
const STREAM_ENGINE_URL = process.env.STREAM_ENGINE_URL || 'http://stream-engine:5001';
const ICECAST_URL = process.env.ICECAST_URL || 'http://icecast:8000';

const logger = pino({ level: LOG_LEVEL });
const app = express();

const httpLogger = pinoHttp({ logger });

app.use(httpLogger);
app.use(express.json());

const db = new Database(DB_PATH, logger);

let isRunning = false;
let currentSession = null;
let startTime = null;

async function initializeDatabase() {
  try {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    await db.initialize();
    logger.info('Database initialization complete');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize database');
    throw error;
  }
}

async function getStreamStatus() {
  try {
    const response = await axios.get(`${STREAM_ENGINE_URL}/status`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    logger.warn({ error: error.message }, 'Failed to fetch stream status from Stream Engine');
    return null;
  }
}

async function getIcecastStatus() {
  try {
    const response = await axios.get(`${ICECAST_URL}/status.xsl`, { timeout: 5000 });
    return { status: 'connected', url: ICECAST_URL };
  } catch (error) {
    logger.warn({ error: error.message }, 'Failed to connect to Icecast');
    return { status: 'disconnected' };
  }
}

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

app.get('/status', async (req, res) => {
  try {
    const streamStatus = await getStreamStatus();
    const icecastStatus = await getIcecastStatus();
    const metadata = await db.getMetadata();

    res.status(200).json({
      active: streamStatus?.running || false,
      stream: streamStatus,
      icecast: icecastStatus,
      currentMetadata: metadata,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get status');
    res.status(500).json({ error: 'Failed to get status' });
  }
});

app.post('/metadata', async (req, res) => {
  try {
    const { track, artist, bpm, key, duration, position } = req.body;

    if (!track || !artist) {
      return res.status(400).json({ error: 'track and artist are required' });
    }

    await db.updateMetadata({
      track,
      artist,
      bpm,
      key,
      duration,
      position: position || 0
    });

    if (track && artist) {
      await db.logTrack(track, artist, duration);
    }

    const metadata = await db.getMetadata();
    res.status(200).json({
      status: 'updated',
      metadata
    });
  } catch (error) {
    logger.error({ error }, 'Failed to update metadata');
    res.status(500).json({ error: 'Failed to update metadata' });
  }
});

app.get('/metadata', async (req, res) => {
  try {
    const metadata = await db.getMetadata();
    res.status(200).json(metadata || { track: 'N/A', artist: 'N/A' });
  } catch (error) {
    logger.error({ error }, 'Failed to get metadata');
    res.status(500).json({ error: 'Failed to get metadata' });
  }
});

app.get('/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const history = await db.getTrackHistory(limit);
    res.status(200).json({ tracks: history, total: history.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get track history');
    res.status(500).json({ error: 'Failed to get track history' });
  }
});

app.get('/metrics', async (req, res) => {
  try {
    const hours = Math.min(parseInt(req.query.hours) || 1, 24);
    const metrics = await db.getMetrics(hours);
    res.status(200).json({ metrics, total: metrics.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get metrics');
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

app.post('/metrics', async (req, res) => {
  try {
    const metric = {
      cpuUsage: req.body.cpuUsage,
      memoryUsage: req.body.memoryUsage,
      activeListeners: req.body.activeListeners,
      bitrate: req.body.bitrate,
      sampleRate: req.body.sampleRate,
      uptime: req.body.uptime
    };

    await db.recordMetric(metric);
    res.status(201).json({ status: 'recorded', metric });
  } catch (error) {
    logger.error({ error }, 'Failed to record metric');
    res.status(500).json({ error: 'Failed to record metric' });
  }
});

app.get('/analytics', async (req, res) => {
  try {
    // Parallelize database queries for improved response time
    const [stats, recentMetrics] = await Promise.all([
      db.getSessionStats(),
      db.getMetrics(24)
    ]);

    res.status(200).json({
      stats,
      recentMetrics: {
        count: recentMetrics.length,
        data: recentMetrics
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get analytics');
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

app.post('/session/start', async (req, res) => {
  try {
    if (currentSession) {
      return res.status(400).json({ error: 'Session already active' });
    }

    currentSession = await db.startSession();
    isRunning = true;
    startTime = Date.now();

    logger.info({ sessionId: currentSession }, 'Session started');

    res.status(200).json({
      status: 'started',
      sessionId: currentSession,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start session');
    res.status(500).json({ error: 'Failed to start session' });
  }
});

app.post('/session/end', async (req, res) => {
  try {
    if (!currentSession) {
      return res.status(400).json({ error: 'No active session' });
    }

    const { totalListeners = 0, peakListeners = 0, tracksPlayed = 0 } = req.body;

    await db.endSession(currentSession, totalListeners, peakListeners, tracksPlayed);

    const sessionId = currentSession;
    currentSession = null;
    isRunning = false;

    logger.info({ sessionId }, 'Session ended');

    res.status(200).json({
      status: 'ended',
      sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ error }, 'Failed to end session');
    res.status(500).json({ error: 'Failed to end session' });
  }
});

app.get('/config', (req, res) => {
  res.status(200).json({
    port: PORT,
    streamEngine: STREAM_ENGINE_URL,
    icecast: ICECAST_URL,
    database: DB_PATH,
    environment: NODE_ENV,
    logLevel: LOG_LEVEL
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  logger.error({ error: err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await initializeDatabase();

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`API Server listening on port ${PORT}`);
      logger.info({
        streamEngine: STREAM_ENGINE_URL,
        icecast: ICECAST_URL,
        database: DB_PATH,
        environment: NODE_ENV
      }, 'Configuration');
    });

    const gracefulShutdown = async (signal) => {
      logger.info({ signal }, 'Received shutdown signal');

      if (currentSession) {
        await db.endSession(currentSession, 0, 0, 0);
      }

      server.close(async () => {
        await db.close();
        logger.info('API Server stopped');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error({ error }, 'Failed to start API Server');
    process.exit(1);
  }
}

start();
