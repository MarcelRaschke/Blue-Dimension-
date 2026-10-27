FROM node:18-bullseye

WORKDIR /app

RUN apt-get update && apt-get install -y \
  ffmpeg \
  alsa-utils \
  curl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

RUN usermod -aG audio node

USER node

EXPOSE 5001

ENV NODE_ENV=production
ENV AUDIO_INPUT=hw:0
ENV BITRATE=256k
ENV SAMPLE_RATE=44100
ENV PORT=5001
ENV LOG_LEVEL=info

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD curl -f http://localhost:5001/health || exit 1

CMD ["npm", "start"]
