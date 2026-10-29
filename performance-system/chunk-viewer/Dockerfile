FROM node:18-bullseye AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3001
ENV NODE_ENV=production

# Nicht-root: PID-Datei nach /tmp, Port 3001 liegt über 1024
USER nginx
CMD ["nginx", "-g", "pid /tmp/nginx.pid; daemon off;"]
