# CI/CD Pipeline Documentation

Blue Dimension (djjessejay.ch) uses GitHub Actions for automated testing, quality checks, security scanning, and deployment.

## Workflows Overview

### 1. **PHP Lint & Code Quality** (`php-lint.yml`)
Runs on every push and PR affecting PHP files.

**Actions:**
- PHP syntax validation (8.2, 8.3)
- PHP-CS-Fixer formatting checks
- PHPStan static analysis (level 5)
- Psalm security scanning
- OWASP Dependency Check

**Triggers:**
- Push to `main` and `claude/**` branches
- Pull requests to `main`
- File paths: `**.php` and workflow changes

**Status:** ✓ Production-ready

---

### 2. **Security Scanning** (`security.yml`)
Comprehensive security analysis suite.

**Actions:**
- CodeQL analysis (JavaScript, Python)
- Dependency review
- Semgrep SAST scanning (OWASP Top 10, CWE-25)
- Trivy vulnerability scanning

**Triggers:**
- Push to `main`
- Pull requests to `main`
- Weekly schedule (Sunday midnight)

**Status:** ✓ Production-ready

---

### 3. **PR Validation** (`pr-validation.yml`)
Validates pull requests before merge.

**Actions:**
- Commit message validation (conventional commits)
- PHP syntax checks
- Large file detection (>100MB)
- Automated PR comments with validation status

**Triggers:**
- PR opened, synchronized, or reopened against `main`

**Status:** ✓ Production-ready

---

### 4. **Deployment to Production** (`deploy.yml`)
Automated deployment to djjessejay.ch.

**Actions:**
- PHP syntax validation
- Asset preparation
- GitHub Deployment tracking
- Status updates (in_progress → success/failure)

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch (`workflow_dispatch`)

**Environment:**
- Name: `production`
- URL: https://djjessejay.ch

**Status:** ⚠️ Requires configuration

---

## Dependency Management

### Dependabot Configuration (`dependabot.yml`)

**Package Ecosystems:**
1. **Composer (PHP dependencies)**
   - Weekly updates (Monday, 03:00 UTC)
   - Auto-rebase enabled
   - Security-focused labels
   - Max 5 open PRs

2. **NPM (JavaScript dependencies)**
   - Weekly updates (Monday, 03:00 UTC)
   - Auto-rebase enabled
   - Security-focused labels
   - Max 5 open PRs

3. **GitHub Actions**
   - Weekly updates (Monday, 04:00 UTC)
   - Infrastructure-focused labels

---

## Configuration Files

### `.php-cs-fixer.dist.php`
PHP code style configuration (PSR-12 + extras).

**Rules:**
- PSR-12 compliance
- Strict comparison & parameters
- Array short syntax
- Ordered imports
- Trailing commas in multiline

**Usage:**
```bash
php-cs-fixer fix --config=.php-cs-fixer.dist.php
php-cs-fixer fix --dry-run --diff --config=.php-cs-fixer.dist.php
```

---

### `.env.example`
Environment variables template.

**Key Sections:**
- App configuration
- Radio/program info
- IPFS setup (optional)
- Web3/NFT integration (optional)
- Mail configuration
- Analytics
- Security settings

**Setup:**
```bash
cp .env.example .env
# Edit .env with actual values
```

---

## Local Development

### Prerequisites
- PHP 8.2+ (8.3 recommended)
- Composer
- Node.js 18+ (optional, for JavaScript)
- Git

### Setup
```bash
# Clone repository
git clone https://github.com/MarcelRaschke/blue-dimension.git
cd blue-dimension

# Create environment file
cp .env.example .env

# Install Composer dependencies (if any)
composer install

# Install Node dependencies (if any)
npm install
```

### Pre-Commit Validation
```bash
# PHP syntax check
find . -name "*.php" -exec php -l {} \;

# Code formatting
php-cs-fixer fix --dry-run --diff

# Static analysis
phpstan analyse --level=5 .
```

---

## Branching Strategy

### Main Branch (`main`)
- Protected branch
- Requires PR reviews
- Triggers: deployment, security scans
- No direct pushes allowed

### Feature Branches
- Naming: `feature/description` or `claude/description`
- Prefix for Claude Code sessions: `claude/blue-dimension-repo-*`
- Create PR against `main` for code review
- All workflows run before merge

### Commit Message Format
Follow conventional commits:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

**Example:**
```
feat(radio): add Blue Dimension schedule endpoint
docs: update CI/CD pipeline documentation
fix: resolve PHP 8.3 compatibility issues
chore: update dependencies
```

---

## Secrets & Environment Variables

### GitHub Secrets (Settings → Secrets and variables → Actions)

| Secret | Usage | Required |
|--------|-------|----------|
| `DEPLOY_KEY` | SSH key for deployments | Yes (for production) |
| `DEPLOY_HOST` | Deployment server hostname | Yes (for production) |
| `DEPLOY_USER` | SSH user for deployments | Yes (for production) |
| `IPFS_API_TOKEN` | Pinata/IPFS API token | Optional |
| `WEB3_PRIVATE_KEY` | Ethereum private key | Optional (for NFT) |
| `INFURA_API_KEY` | Infura provider key | Optional (for NFT) |

### Local `.env` File
Never commit `.env` to Git. Add to `.gitignore`:
```
.env
.env.local
.env.*.local
```

---

## Monitoring & Alerts

### GitHub Actions Dashboard
- Actions tab: View workflow runs and logs
- Status badges in README
- Email notifications for failures

### Deployment Status
- Production environment tracking
- Deployment history in Repository → Environments
- Automatic rollback indicators

---

## Troubleshooting

### Workflow Failures

**PHP Syntax Errors:**
```bash
php -l filename.php
php-cs-fixer fix --diff
```

**Dependency Issues:**
```bash
composer update
composer audit
npm audit
```

**CodeQL False Positives:**
- Review in Security tab
- Dismiss findings if not applicable
- Update query packs if needed

### Re-Running Workflows
- GitHub UI: Click "Re-run" on failed workflow
- CLI: `gh workflow run <workflow-name>`

---

## Next Steps

1. **Configure Production Deployment**
   - Add `DEPLOY_KEY`, `DEPLOY_HOST`, `DEPLOY_USER` secrets
   - Update deployment script in `deploy.yml`

2. **Set Up IPFS + NFT Gating** (if applicable)
   - Add `IPFS_API_TOKEN`, `WEB3_PRIVATE_KEY` secrets
   - Configure smart contract address in `.env`

3. **Enable Branch Protection**
   - Settings → Branches → Add rule for `main`
   - Require status checks to pass
   - Require PR reviews

4. **Configure Notifications**
   - Settings → Code security and analysis
   - Enable Dependabot alerts & security updates

5. **Add Status Badge** (README.md)
```markdown
[![PHP Lint](https://github.com/MarcelRaschke/blue-dimension/actions/workflows/php-lint.yml/badge.svg)](https://github.com/MarcelRaschke/blue-dimension/actions)
[![Security](https://github.com/MarcelRaschke/blue-dimension/actions/workflows/security.yml/badge.svg)](https://github.com/MarcelRaschke/blue-dimension/actions)
[![Deploy](https://github.com/MarcelRaschke/blue-dimension/actions/workflows/deploy.yml/badge.svg)](https://github.com/MarcelRaschke/blue-dimension/actions)
```

---

## Support

For issues or questions about the CI/CD setup:
1. Check GitHub Actions logs: Actions tab → failed workflow → logs
2. Review this documentation
3. Consult `.github/workflows/` files for detailed configurations
4. Contact repository maintainers

---

**Last Updated:** 2026-09-15  
**Maintained By:** Claude Code / DJ Jesse Jay  
**Repository:** https://github.com/MarcelRaschke/blue-dimension
