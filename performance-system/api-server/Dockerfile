FROM node:18-bullseye

WORKDIR /app

RUN apt-get update && apt-get install -y \
  curl \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000
ENV DB_PATH=/app/data/database.sqlite
ENV LOG_LEVEL=info
ENV STREAM_ENGINE_URL=http://stream-engine:5001
ENV ICECAST_URL=http://icecast:8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["npm", "start"]
