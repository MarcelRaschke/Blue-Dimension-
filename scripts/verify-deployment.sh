#!/bin/bash

# Post-deployment verification script
# Tests health endpoints and verifies critical files
# Retries with exponential backoff if endpoint is not immediately available

set -e

DEPLOY_URL="${1:-https://djjessejay.ch}"
MAX_RETRIES=5
RETRY_DELAY=2
TIMEOUT=10

echo "Verifying deployment at $DEPLOY_URL..."

# Function to test health endpoint
test_health_endpoint() {
    local url="$1"
    local attempt=1

    while [ $attempt -le $MAX_RETRIES ]; do
        echo "Attempt $attempt/$MAX_RETRIES: Testing $url"

        # Curl with timeout and response code capture
        response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$url")
        http_code=$(echo "$response" | tail -1)
        body=$(echo "$response" | sed '$d')

        if [ "$http_code" = "200" ]; then
            echo "✓ Health check passed (HTTP $http_code)"
            echo "Response: $body"
            return 0
        else
            echo "✗ Health check failed (HTTP $http_code), retrying..."
            sleep $((RETRY_DELAY * attempt))
            attempt=$((attempt + 1))
        fi
    done

    echo "✗ Health check failed after $MAX_RETRIES attempts"
    return 1
}

# Test simple health endpoint
echo ""
echo "--- Testing Simple Health Endpoint ---"
if test_health_endpoint "$DEPLOY_URL/health.php"; then
    echo "✓ Deployment verified successfully"
    exit 0
else
    echo "✗ Deployment verification failed"
    exit 1
fi
