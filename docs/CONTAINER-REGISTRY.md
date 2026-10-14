# GitHub Container Registry (GHCR) Integration

Blue Dimension Docker images are automatically built and published to GitHub Container Registry (GHCR) on each push to main branch.

## Overview

The `build-and-push-image.yml` workflow automatically:
- Builds Docker images on code changes
- Publishes to GHCR at `ghcr.io/MarcelRaschke/Blue-Dimension-`
- Tags images with commit SHA, branch name, and latest
- Sends Slack notifications on success/failure
- Uses GitHub Actions cache for faster builds

## Registry URL

```
ghcr.io/MarcelRaschke/Blue-Dimension-
```

## Image Tags

Each push generates multiple tags:

| Tag | Description |
|-----|-------------|
| `latest` | Latest image from main branch |
| `main-<commit-sha>` | Commit-specific tag (e.g., `main-abc1234`) |
| `<commit-sha>` | Short commit hash (e.g., `abc1234`) |

Example:
```
ghcr.io/MarcelRaschke/Blue-Dimension-:latest
ghcr.io/MarcelRaschke/Blue-Dimension-:main-abc123def456
ghcr.io/MarcelRaschke/Blue-Dimension-:abc123def456
```

## Authentication

### Pull Images (Public)

```bash
docker pull ghcr.io/MarcelRaschke/Blue-Dimension-:latest
```

### Pull Images (Authenticated)

Create Personal Access Token (PAT) with `read:packages` scope:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin

docker pull ghcr.io/MarcelRaschke/Blue-Dimension-:latest
```

### GitHub Actions (Automatic)

The workflow uses `secrets.GITHUB_TOKEN` automatically for authentication.

## Build Triggers

The workflow runs when:
- Dockerfile changes
- Files in `docker/` directory change
- Workflow configuration changes
- Manual trigger via `workflow_dispatch`

Override with `.github/workflows/build-and-push-image.yml`:

```yaml
paths:
  - 'Dockerfile'
  - 'docker/**'
  - '.github/workflows/build-and-push-image.yml'
```

## Docker Compose Integration

Pull images for local development:

```bash
# Use GHCR image instead of local build
docker run --rm -it ghcr.io/MarcelRaschke/Blue-Dimension-:latest php -v

# Or pull before starting stack
docker pull ghcr.io/MarcelRaschke/Blue-Dimension-:latest
docker-compose -f docker-compose.dev.yml up -d
```

## CI/CD Pipeline Integration

Build pipeline automatically:

1. **Validator Stage** - PHP linting & validation
2. **Runtime Stage** - Production-ready image
3. **Registry Push** - Publish to GHCR
4. **Notifications** - Slack alerts on completion

## Image Caching

GitHub Actions cache accelerates builds:
- Multi-layer caching (gha mode)
- Reuses layers from previous builds
- Significantly faster rebuilds

Example: First build ~2-3 min, subsequent builds ~30-45 sec.

## Security Considerations

### Image Scanning

Implement vulnerability scanning (optional):

```bash
# Trivy scanning
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image ghcr.io/MarcelRaschke/Blue-Dimension-:latest
```

### Private Registry

Make repository private in GitHub:
1. Go to Settings → Packages
2. Change visibility to "Private"
3. Configure access tokens for authorized users

## Kubernetes Deployment

For future Kubernetes deployments:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: blue-dimension
spec:
  containers:
  - name: app
    image: ghcr.io/MarcelRaschke/Blue-Dimension-:latest
    imagePullPolicy: IfNotPresent
  imagePullSecrets:
  - name: ghcr-secret
```

Create secret:

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=$GITHUB_ACTOR \
  --docker-password=$GITHUB_TOKEN \
  --docker-email=$GITHUB_EMAIL
```

## Troubleshooting

### Push Fails

Check GitHub Actions permissions:
1. Settings → Actions → General
2. Ensure "Read and write permissions" enabled
3. Verify GITHUB_TOKEN secret available

### Authentication Errors

```bash
# Re-authenticate
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin

# Verify login
docker logout ghcr.io
docker login ghcr.io
```

### Image Not Found

Verify image exists:

```bash
# List available tags
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://ghcr.io/v2/MarcelRaschke/Blue-Dimension-/tags/list
```

## Maintenance

### Cleanup Old Images

Remove images older than 30 days:

```bash
# Via GitHub CLI
gh api repos/MarcelRaschke/Blue-Dimension-/package-versions \
  --jq '.[] | select(.name != "latest")' \
  -H 'Accept: application/vnd.github+json'
```

### Image Size Optimization

Current multi-stage build reduces image size:
- Validator stage: ~500MB (discarded)
- Runtime stage: ~300-400MB (published)

Optimize further by reducing dependencies in `Dockerfile`.

## References

- [GitHub Container Registry Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [GitHub Metadata Action](https://github.com/docker/metadata-action)
