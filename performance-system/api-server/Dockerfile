# Build stage: Compile and prepare dependencies
FROM node:18-alpine AS builder

WORKDIR /app

# Only install build dependencies in builder stage
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  curl

COPY package*.json ./
RUN npm ci --only=production

# Runtime stage: Minimal production image
FROM node:18-alpine AS runtime

WORKDIR /app

# Only install runtime dependencies (curl for healthcheck)
RUN apk add --no-cache curl

# Copy production dependencies and source from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

COPY src ./src

RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

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
