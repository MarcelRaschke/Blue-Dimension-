import ffmpeg from 'fluent-ffmpeg';
import { spawn } from 'child_process';
import { parse } from 'url';

export class AudioEngine {
  constructor(config) {
    this.config = config;
    this.logger = config.logger;
    this.ffmpegProcess = null;
    this.isRunning = false;
    this.startTime = null;
    this.archiveStream = null;
  }

  async start() {
    if (this.isRunning) {
      throw new Error('Audio engine already running');
    }

    return new Promise((resolve, reject) => {
      try {
        const parsedIcecastUrl = parse(this.config.icecastUrl);
        const icecastHost = process.env.ICECAST_HOST || 'icecast';
        const icecastPort = process.env.ICECAST_PORT || '8000';
        const mountPoint = parsedIcecastUrl.pathname || '/blue-dimension';
        const password = parsedIcecastUrl.password || 'changeme';

        this.logger.info({
          audioInput: this.config.audioInput,
          bitrate: this.config.bitrate,
          sampleRate: this.config.sampleRate,
          icecastHost,
          icecastPort,
          mountPoint
        }, 'Starting FFmpeg process');

        const command = ffmpeg()
          .input(`hw:${this.config.audioInput.split(':')[1] || '0'}`)
          .inputOptions([
            '-f', 'alsa',
            '-ar', this.config.sampleRate,
            '-ac', '2'
          ])
          .outputOptions([
            '-f', 'mp3',
            '-b:a', this.config.bitrate,
            '-q:a', '5',
            '-metadata', 'title=Blue Dimension',
            '-metadata', 'artist=DJ Jesse Jay',
            '-metadata', 'genre=Electronic'
          ])
          .output(`icecast://source:${password}@${icecastHost}:${icecastPort}${mountPoint}`)
          .on('start', (commandLine) => {
            this.logger.info({ commandLine }, 'FFmpeg process started');
            this.isRunning = true;
            this.startTime = Date.now();
            resolve();
          })
          .on('error', (error) => {
            this.logger.error({ error }, 'FFmpeg process error');
            this.isRunning = false;
            reject(error);
          })
          .on('end', () => {
            this.logger.info('FFmpeg process ended');
            this.isRunning = false;
          });

        this.ffmpegProcess = command;
        command.run();

        setTimeout(() => {
          if (!this.isRunning) {
            reject(new Error('FFmpeg process failed to start'));
          }
        }, 5000);
      } catch (error) {
        this.logger.error({ error }, 'Failed to start FFmpeg');
        reject(error);
      }
    });
  }

  async stop() {
    if (!this.isRunning) {
      throw new Error('Audio engine not running');
    }

    return new Promise((resolve, reject) => {
      try {
        if (this.ffmpegProcess) {
          this.ffmpegProcess.kill('SIGTERM');
          this.isRunning = false;

          setTimeout(() => {
            resolve();
          }, 1000);
        } else {
          reject(new Error('No FFmpeg process to stop'));
        }
      } catch (error) {
        this.logger.error({ error }, 'Failed to stop FFmpeg');
        reject(error);
      }
    });
  }

  getStatus() {
    return {
      running: this.isRunning,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      audioInput: this.config.audioInput,
      bitrate: this.config.bitrate,
      sampleRate: this.config.sampleRate
    };
  }

  updateConfig(newConfig) {
    if (this.isRunning) {
      throw new Error('Cannot update config while streaming');
    }
    this.config = { ...this.config, ...newConfig };
  }
}
