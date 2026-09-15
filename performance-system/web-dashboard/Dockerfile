FROM node:18-bullseye AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY .env.example /etc/nginx/.env

EXPOSE 3000
ENV NODE_ENV=production
CMD ["nginx", "-g", "daemon off;"]
