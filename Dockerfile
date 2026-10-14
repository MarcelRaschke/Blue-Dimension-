# Multi-stage Dockerfile for Blue Dimension PHP application
# Stage 1: Validator - Run code quality checks
# Stage 2: Runtime - Production-ready PHP-FPM container

FROM php:8.3-fpm-alpine AS validator

RUN apk add --no-cache git

WORKDIR /app

COPY . .

RUN echo "Running PHP syntax validation..." && \
    find . -name "*.php" -type f \
      ! -path "./vendor/*" \
      ! -path "./.git/*" \
      -exec php -l {} \;

# Stage 2: Runtime image
FROM php:8.3-fpm-alpine AS runtime

# Install production dependencies
RUN apk add --no-cache \
    nginx \
    redis-cli \
    mysql-client \
    tzdata \
    curl

# Create required directories
RUN mkdir -p /var/log/php /var/run/nginx /var/cache/nginx

# Copy PHP configuration files
COPY docker/php/php.ini /usr/local/etc/php/php.ini
COPY docker/php/php-fpm.conf /usr/local/etc/php-fpm.conf

# Copy Nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/conf.d/ /etc/nginx/conf.d/

# Copy application files
COPY --chown=www-data:www-data . /var/www/html

# Set working directory
WORKDIR /var/www/html

# Ensure proper permissions
RUN chmod -R 755 /var/www/html && \
    chown -R www-data:www-data /var/www/html /var/log/php /var/run/nginx /var/cache/nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health.php || exit 1

EXPOSE 9000 80 443

# Start PHP-FPM and Nginx
CMD ["sh", "-c", "php-fpm & nginx -g 'daemon off;'"]
