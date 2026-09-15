import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class Database {
  constructor(dbPath, logger) {
    this.dbPath = dbPath;
    this.logger = logger;
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          this.logger.error({ err }, 'Failed to open database');
          reject(err);
        } else {
          this.logger.info(`Database initialized at ${this.dbPath}`);
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  async createTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        track TEXT NOT NULL,
        artist TEXT NOT NULL,
        bpm INTEGER,
        key TEXT,
        duration INTEGER,
        position INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS session_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration INTEGER,
        total_listeners INTEGER DEFAULT 0,
        peak_listeners INTEGER DEFAULT 0,
        tracks_played INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME NOT NULL,
        cpu_usage REAL,
        memory_usage INTEGER,
        active_listeners INTEGER,
        bitrate TEXT,
        sample_rate INTEGER,
        uptime INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS track_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        track TEXT NOT NULL,
        artist TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const query of queries) {
      await this.run(query);
    }

    this.logger.info('Database tables initialized');
  }

  run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async updateMetadata(metadata) {
    const query = `
      INSERT OR REPLACE INTO metadata (track, artist, bpm, key, duration, position, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    await this.run(query, [
      metadata.track,
      metadata.artist,
      metadata.bpm || null,
      metadata.key || null,
      metadata.duration || null,
      metadata.position || 0
    ]);
  }

  async getMetadata() {
    return this.get('SELECT * FROM metadata ORDER BY updated_at DESC LIMIT 1');
  }

  async startSession() {
    const result = await this.run(
      'INSERT INTO session_history (start_time, duration, total_listeners) VALUES (CURRENT_TIMESTAMP, 0, 0)'
    );
    return result.id;
  }

  async endSession(sessionId, totalListeners, peakListeners, tracksPlayed) {
    const query = `
      UPDATE session_history
      SET end_time = CURRENT_TIMESTAMP,
          duration = CAST((julianday(CURRENT_TIMESTAMP) - julianday(start_time)) * 86400 AS INTEGER),
          total_listeners = ?,
          peak_listeners = ?,
          tracks_played = ?
      WHERE id = ?
    `;
    await this.run(query, [totalListeners, peakListeners, tracksPlayed, sessionId]);
  }

  async recordMetric(metric) {
    const query = `
      INSERT INTO performance_metrics
      (timestamp, cpu_usage, memory_usage, active_listeners, bitrate, sample_rate, uptime)
      VALUES (CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
    `;
    await this.run(query, [
      metric.cpuUsage || null,
      metric.memoryUsage || null,
      metric.activeListeners || 0,
      metric.bitrate || null,
      metric.sampleRate || null,
      metric.uptime || 0
    ]);
  }

  async getMetrics(hours = 1) {
    const query = `
      SELECT * FROM performance_metrics
      WHERE timestamp > datetime('now', '-' || ? || ' hours')
      ORDER BY timestamp DESC
    `;
    return this.all(query, [hours]);
  }

  async logTrack(track, artist, duration) {
    const query = `
      INSERT INTO track_log (track, artist, start_time, end_time, duration)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
    `;
    await this.run(query, [track, artist, duration]);
  }

  async getTrackHistory(limit = 50) {
    const query = `
      SELECT * FROM track_log
      ORDER BY start_time DESC
      LIMIT ?
    `;
    return this.all(query, [limit]);
  }

  async getSessionStats() {
    const query = `
      SELECT
        COUNT(*) as total_sessions,
        SUM(duration) as total_duration,
        AVG(peak_listeners) as avg_peak_listeners,
        MAX(peak_listeners) as max_peak_listeners,
        SUM(tracks_played) as total_tracks_played
      FROM session_history
      WHERE end_time IS NOT NULL
    `;
    return this.get(query);
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.logger.info('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}
