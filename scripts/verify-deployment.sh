#!/bin/bash
#
# Post-deployment verification script
# Verifies that the deployment was successful by checking health endpoints
#

set -e

DEPLOY_URL="${1:-https://djjessejay.ch}"
MAX_RETRIES=5
RETRY_DELAY=1  # seconds - faster retry with optimized health endpoints (<50ms target)
TIMEOUT=10
HEALTH_ENDPOINT="${DEPLOY_URL}/health.php"
DETAILED_ENDPOINT="${DEPLOY_URL}/public/health/check.json.php"

echo "Starting post-deployment verification..."
echo "Target: $DEPLOY_URL"
echo "Health endpoint: $HEALTH_ENDPOINT"

# Function to check if endpoint is accessible
check_health() {
    local endpoint=$1
    local name=$2

    echo -n "Checking $name... "

    for attempt in $(seq 1 $MAX_RETRIES); do
        response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$endpoint" 2>/dev/null || echo "error")
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | head -n-1)

        if [ "$http_code" = "200" ]; then
            echo "✓ OK (HTTP $http_code)"
            return 0
        fi

        if [ $attempt -lt $MAX_RETRIES ]; then
            echo "retry ($attempt/$MAX_RETRIES)..."
            sleep $RETRY_DELAY
        fi
    done

    echo "✗ FAILED (HTTP $http_code after $MAX_RETRIES attempts)"
    return 1
}

# Main verification
echo ""
check_health "$HEALTH_ENDPOINT" "Simple health check" || exit 1
echo ""
check_health "$DETAILED_ENDPOINT" "Detailed health check" || exit 1

echo ""
echo "✓ Deployment verification successful!"
exit 0
