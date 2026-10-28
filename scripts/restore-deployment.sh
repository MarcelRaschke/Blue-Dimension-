#!/bin/bash
#
# Restore deployment from backup
# Restores production files from the latest backup on failure
#

set -e

DEPLOY_HOST="${1:-${DEPLOY_HOST}}"
DEPLOY_USER="${2:-${DEPLOY_USER}}"
BACKUP_DIR="/var/backups/deployments"
LATEST_BACKUP="${BACKUP_DIR}/latest.tar.gz"
RESTORE_TIMEOUT=60

if [ -z "$DEPLOY_HOST" ] || [ -z "$DEPLOY_USER" ]; then
    echo "Error: DEPLOY_HOST and DEPLOY_USER environment variables must be set"
    exit 1
fi

echo "Attempting to restore from latest backup..."
echo "Target: ${DEPLOY_USER}@${DEPLOY_HOST}"
echo "Source: ${LATEST_BACKUP}"

# Restore via SSH with timeout
timeout $RESTORE_TIMEOUT ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
    set -e

    if [ ! -f ${LATEST_BACKUP} ]; then
        echo "Error: No backup found at ${LATEST_BACKUP}"
        exit 1
    fi

    echo "Backup file info:"
    ls -lh ${LATEST_BACKUP}

    # Create restore directory to verify extraction first
    RESTORE_TEST_DIR="/tmp/deployment_restore_test_$$"
    mkdir -p ${RESTORE_TEST_DIR}

    # Test extraction
    echo "Verifying backup integrity..."
    tar -tzf ${LATEST_BACKUP} > /dev/null || {
        rm -rf ${RESTORE_TEST_DIR}
        echo "Error: Backup file is corrupted"
        exit 1
    }

    rm -rf ${RESTORE_TEST_DIR}

    # Stop services if needed
    echo "Preparing to restore..."

    # Backup current broken deployment
    BACKUP_BROKEN_DIR="/tmp/deployment_broken_$$"
    mkdir -p ${BACKUP_BROKEN_DIR}

    # Move current deployment aside
    echo "Backing up broken deployment..."
    cd /home/${DEPLOY_USER}/public_html
    find . -maxdepth 1 -type f -newer ${LATEST_BACKUP} -exec mv {} ${BACKUP_BROKEN_DIR}/ \; 2>/dev/null || true

    # Extract backup
    echo "Extracting backup..."
    tar -xzf ${LATEST_BACKUP} -C /home/${DEPLOY_USER}/public_html/

    # Verify restoration
    if [ -f /home/${DEPLOY_USER}/public_html/public/index.html ]; then
        echo "✓ Restoration successful"
        echo "Broken deployment backed up to: ${BACKUP_BROKEN_DIR}"
        exit 0
    else
        echo "Error: Critical file missing after restoration"
        exit 1
    fi
EOF

if [ $? -eq 0 ]; then
    echo "✓ Deployment restored from backup"
    exit 0
else
    echo "✗ Restoration failed"
    exit 1
fi
