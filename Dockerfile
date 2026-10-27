# Static site: Nginx serves the pre-rendered HTML in public/. No PHP runtime.
# Regenerate the HTML with `php scripts/render-static.php` before building.

# Build check, used by the CI job "Test Docker Build": the config must parse
# and the docroot must not contain PHP files.
FROM nginx:1.27-alpine AS validator

COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/conf.d/ /etc/nginx/conf.d/
COPY public/ /var/www/html/public/

RUN nginx -t && \
    if find /var/www/html/public -name '*.php' | grep -q .; then \
        echo "PHP file found in docroot"; exit 1; \
    fi

FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache curl

COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/conf.d/ /etc/nginx/conf.d/
COPY public/ /var/www/html/public/

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

EXPOSE 80
