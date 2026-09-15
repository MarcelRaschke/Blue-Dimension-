# CI/CD Quick Start Guide

Fast setup for Blue Dimension CI/CD pipeline.

## 5-Minute Setup

### 1. GitHub Secrets (Required for Production)

```bash
# Copy SSH key to clipboard
cat ~/.ssh/id_rsa | pbcopy  # macOS
cat ~/.ssh/id_rsa | xclip   # Linux

# Add to GitHub
gh secret set DEPLOY_KEY --body "$(cat ~/.ssh/deploy_key)"
gh secret set DEPLOY_HOST --body "server.djjessejay.ch"
gh secret set DEPLOY_USER --body "deploy"
```

### 2. Local Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Verify Workflows

```bash
# List workflows
gh workflow list

# Expected output:
# PHP Lint & Code Quality     php-lint.yml
# Security Scanning           security.yml
# PR Validation               pr-validation.yml
# Deploy to Production        deploy.yml
```

---

## Common Tasks

### Run Validation Locally

```bash
# PHP syntax
find . -name "*.php" -exec php -l {} \;

# Code quality
php-cs-fixer fix --dry-run --diff
phpstan analyse --level=5 .
```

### Merge & Deploy

```bash
# Merge PR (triggers deploy)
gh pr merge <number> --squash

# Or manual deploy
gh workflow run deploy.yml
```

### Check Deployment Status

```bash
# View production environment
gh deployment list

# View latest run
gh run list --workflow=deploy.yml --limit 1
```

---

## Workflow Status Badges

Add to README.md:

```markdown
[![PHP Lint](https://github.com/MarcelRaschke/blue-dimension/actions/workflows/php-lint.yml/badge.svg)](https://github.com/MarcelRaschke/blue-dimension/actions)
[![Security](https://github.com/MarcelRaschke/blue-dimension/actions/workflows/security.yml/badge.svg)](https://github.com/MarcelRaschke/blue-dimension/actions)
[![Deploy](https://github.com/MarcelRaschke/blue-dimension/actions/workflows/deploy.yml/badge.svg)](https://github.com/MarcelRaschke/blue-dimension/actions)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Workflow won't run | Check branch protection settings |
| PHP syntax fails | Run `php -l *.php` locally first |
| Secrets not found | Verify in Settings → Secrets |
| Deploy fails | Check DEPLOY_KEY has correct permissions |

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed guide.
