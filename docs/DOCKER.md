# Docker Development Environment

Blue Dimension now supports Docker containerization for local development. This guide walks through setup, usage, and best practices.

## Quick Start

Prerequisites: Docker and Docker Compose installed.

```bash
# Navigate to project root
cd Blue-Dimension-

# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to initialize (30 seconds)
sleep 30

# Verify health
docker-compose -f docker-compose.dev.yml ps

# Access application
open http://localhost:8000
```

## Architecture

### Services

**app** (PHP-FPM)
- Base image: php:8.3-fpm-alpine
- Runs PHP application code
- Port 9000 (internal FPM, not exposed)
- Volumes: Project code (mounted read-write for development)

**web** (Nginx)
- Image: nginx:latest
- HTTP reverse proxy and static file serving
- Port 8000 (accessible at http://localhost:8000)
- Routing: PHP requests → FPM, static files served directly

**db** (MySQL)
- Image: mysql:8.0
- Database persistence
- Port 3306 (exposed for local client tools)
- Automatic schema initialization via `/docker-entrypoint-initdb.d/`

**cache** (Redis)
- Image: redis:7-alpine
- Optional in-memory cache/session store
- Port 6379 (exposed for CLI tools)

### Network

Services communicate via internal Docker network `blue-dimension-dev` (subnet 172.21.0.0/16):
- app ↔ db: hostname "db"
- app ↔ cache: hostname "cache"
- web → app: hostname "app"

## Configuration

### Environment Variables

Development defaults are in `docker/.env.dev`:
- `APP_ENV=development`
- `APP_DEBUG=true`
- `DB_HOST=db` (Docker hostname, not localhost)
- `DB_PASSWORD=docker_dev_password`
- `REDIS_HOST=cache`

Override in docker-compose.dev.yml or create `.env.dev.local` for sensitive values.

### Database Access

**From within container:**
```bash
# From app container
docker-compose -f docker-compose.dev.yml exec app mysql -h db -u app -pdocker_dev_password jessejay
```

**From host machine:**
```bash
# MySQL CLI on host (if installed)
mysql -h 127.0.0.1 -P 3306 -u app -pdocker_dev_password jessejay

# Or via Docker:
docker-compose -f docker-compose.dev.yml exec db mysql -u app -pdocker_dev_password jessejay
```

**Database initialization:**
- Automatic on first start via `docker/mysql/init/01-init-databases.sql`
- Creates database `jessejay` with tables: guestbook, links, news, imageTable, soundTable
- Creates user `app` with full jessejay.* privileges

## Common Operations

### Start Services
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Stop Services
```bash
docker-compose -f docker-compose.dev.yml down
```

### Full Cleanup (including volumes)
```bash
docker-compose -f docker-compose.dev.yml down -v
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f app
docker-compose -f docker-compose.dev.yml logs -f web
docker-compose -f docker-compose.dev.yml logs -f db
```

### Execute Commands in Container
```bash
# PHP CLI
docker-compose -f docker-compose.dev.yml exec app php --version

# MySQL client
docker-compose -f docker-compose.dev.yml exec db mysql -u app -pdocker_dev_password jessejay

# Bash shell
docker-compose -f docker-compose.dev.yml exec app sh
```

### Database Backup
```bash
docker-compose -f docker-compose.dev.yml exec db mysqldump -u app -pdocker_dev_password jessejay > backup.sql
```

### Database Restore
```bash
docker-compose -f docker-compose.dev.yml exec -T db mysql -u app -pdocker_dev_password jessejay < backup.sql
```

## Development Workflow

### Editing Code
All project files are mounted into the container (read-write):
- Edit locally in your IDE
- Changes are reflected immediately in container
- No rebuild required (except PHP extensions or system packages)

### PHP Configuration
- `docker/php/php.ini` - PHP settings (memory_limit, upload_max_filesize, etc.)
- `docker/php/php-fpm.conf` - FPM pool configuration
- Edit, then restart: `docker-compose -f docker-compose.dev.yml restart app`

### Nginx Configuration
- `docker/nginx/nginx.conf` - Main Nginx configuration
- `docker/nginx/conf.d/app.conf` - Application routing rules
- Edit, then restart: `docker-compose -f docker-compose.dev.yml restart web`

### Health Checks

All services include health checks:

```bash
# View health status
docker-compose -f docker-compose.dev.yml ps

# Manually verify endpoints
curl http://localhost:8000/health.php
curl http://localhost:8000/health/check.json.php
```

Expected response (health.php):
```json
{
  "status": "healthy",
  "timestamp": "2026-09-22T10:00:00+00:00",
  "php_version": "8.3.x",
  "memory_usage": 2097152,
  "peak_memory": 2097152
}
```

## Performance Optimization

### Memory Limits
Current defaults:
- PHP: 256MB (php.ini)
- MySQL: 100 connections (docker-compose.dev.yml)
- Redis: Unbounded (development only)

Adjust in `docker-compose.dev.yml` environment section:
```yaml
app:
  environment:
    - PHP_MEMORY_LIMIT=512M
```

### Volume Mounts
For faster file access on macOS/Windows, consider:
- Cached mounts (slower writes): `./:/var/www/html:cached`
- Delegated mounts (slower reads): `./:/var/www/html:delegated`

Default (consistent) is recommended for development.

## Troubleshooting

### "Port 8000 already in use"
```bash
# Stop existing container
docker-compose -f docker-compose.dev.yml down

# Or use different port
docker-compose -f docker-compose.dev.yml up -d -p 8080:80
```

### Database connection fails
```bash
# Check db health
docker-compose -f docker-compose.dev.yml ps db

# View initialization logs
docker-compose -f docker-compose.dev.yml logs db | head -50

# Restart db
docker-compose -f docker-compose.dev.yml restart db
```

### PHP code changes not reflected
```bash
# Restart app container (reloads PHP)
docker-compose -f docker-compose.dev.yml restart app

# Check app logs
docker-compose -f docker-compose.dev.yml logs app
```

### High disk usage
```bash
# Clean up unused volumes
docker volume prune

# Or specific volumes
docker-compose -f docker-compose.dev.yml down -v
```

## Production Considerations

This docker-compose.dev.yml is for **local development only**.

For production, use:
- Single Dockerfile (no docker-compose)
- Environment-specific overrides (secrets, resource limits)
- Persistent volume management (external storage)
- Reverse proxy with SSL/TLS termination
- Container orchestration (Kubernetes, Docker Swarm)

Deployment continues via GitHub Actions → SSH/SFTP (existing pipeline).

## Advanced Topics

### Custom Database Initialization

To load existing SQL dumps:
1. Copy `.sql` file to `docker/mysql/init/`
2. Name it with numeric prefix (e.g., `02-load-data.sql`)
3. Restart: `docker-compose -f docker-compose.dev.yml restart db`

### Container Shell Access

For debugging:
```bash
# App container (Alpine - limited tools)
docker-compose -f docker-compose.dev.yml exec app sh

# Web container (Nginx)
docker-compose -f docker-compose.dev.yml exec web sh

# DB container (MySQL)
docker-compose -f docker-compose.dev.yml exec db bash
```

### Inspecting Network

```bash
# List network interfaces
docker network ls

# Inspect network
docker network inspect blue-dimension-dev_blue-dimension-dev

# From within container, test DNS
docker-compose -f docker-compose.dev.yml exec app nslookup db
```

### Building Custom Image

```bash
# Rebuild app image (e.g., after Dockerfile changes)
docker-compose -f docker-compose.dev.yml build --no-cache app

# Bring up with new image
docker-compose -f docker-compose.dev.yml up -d
```

## References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [PHP-FPM Configuration](https://www.php.net/manual/en/install.fpm.configuration.php)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [MySQL 8.0 Reference](https://dev.mysql.com/doc/refman/8.0/en/)
