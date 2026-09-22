#!/bin/bash
#
# Pre-deployment backup script
# Creates a timestamped backup of production files before deployment
#

set -e

DEPLOY_HOST="${1:-${DEPLOY_HOST}}"
DEPLOY_USER="${2:-${DEPLOY_USER}}"
BACKUP_DIR="/var/backups/deployments"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${TIMESTAMP}.tar.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
LATEST_BACKUP="${BACKUP_DIR}/latest.tar.gz"

if [ -z "$DEPLOY_HOST" ] || [ -z "$DEPLOY_USER" ]; then
    echo "Error: DEPLOY_HOST and DEPLOY_USER environment variables must be set"
    exit 1
fi

echo "Creating pre-deployment backup..."
echo "Target: ${DEPLOY_USER}@${DEPLOY_HOST}"
echo "Backup path: ${BACKUP_PATH}"

# Create backup via SSH
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" << EOF
    set -e

    # Ensure backup directory exists
    mkdir -p ${BACKUP_DIR}
    cd /home/${DEPLOY_USER}/public_html

    # Create tarball of current deployment
    tar -czf ${BACKUP_PATH} \
        --exclude='.git' \
        --exclude='.github' \
        --exclude='node_modules' \
        --exclude='vendor' \
        --exclude='*.swp' \
        --exclude='*.swo' \
        .

    # Create symlink to latest backup
    ln -sf ${BACKUP_NAME} ${LATEST_BACKUP}

    # Clean old backups (keep last 5)
    cd ${BACKUP_DIR}
    ls -t backup_*.tar.gz | tail -n +6 | xargs -r rm -f

    echo "Backup created: ${BACKUP_NAME}"
    ls -lh ${BACKUP_PATH}
EOF

if [ $? -eq 0 ]; then
    echo "✓ Backup created successfully"
    echo "Latest backup: ${LATEST_BACKUP}"
    exit 0
else
    echo "✗ Backup creation failed"
    exit 1
fi
