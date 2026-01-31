# Security Policy

## Secrets Management

This project uses sensitive credentials that must **never** be committed to version control.

### Protected Files

The following files are in `.gitignore` and must remain secret:

- ✅ **`.env`** - Local environment variables with actual secrets
- ✅ **`.env.production`** - Production environment variables (server only)
- ✅ **`credentials.json`** - Google Cloud Service Account credentials
- ✅ **`backend/.env`** - Backend-specific environment variables
- ✅ **`backend/credentials.json`** - Backend Google API credentials

### Safe Template Files

These files are **safe to commit** as they contain no real secrets:

- ✅ **`backend/.env.local.example`** - Template for local development setup

### Setup for New Developers

1. Copy the template:
   ```bash
   cd backend
   cp .env.local.example .env
   ```

2. Fill in actual credentials in `.env` (see `backend/README.md` for details)

3. Obtain `credentials.json` from Google Cloud Console

4. **NEVER commit `.env` or `credentials.json` to Git**

### What to Do If Secrets Are Exposed

If any secrets are accidentally committed or exposed:

1. **Immediately rotate the compromised credentials:**
   - JWT_SECRET_KEY: Generate a new random string
   - ANTHROPIC_API_KEY: Revoke and create new at https://console.anthropic.com/
   - DATABASE_URL: Change database password
   - Google credentials: Revoke service account key and create new one

2. **Remove from Git history** (if committed):
   ```bash
   # DO NOT do this lightly - coordinate with team first
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/secret/file" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Notify the team** if working in a shared repository

4. **Review GitHub secret scanning alerts** at:
   https://github.com/Naskaus/digital-shadow/security

### GitHub Secret Scanning

This repository has GitHub's secret scanning enabled, which will block pushes containing secrets. If you encounter:

```
remote: error: GH013: Repository rule violations found
remote: - Push cannot contain secrets
```

**Do NOT bypass it unless you're certain it's a false positive.** Instead:

1. Remove the secret from your commit
2. Use the template files (`.env.local.example`)
3. Ensure `.gitignore` is properly configured

### Best Practices

#### ✅ DO:

- Store secrets in `.env` files (which are in `.gitignore`)
- Use different credentials for development vs. production
- Rotate secrets regularly (every 90 days recommended)
- Use strong, unique passwords (20+ characters)
- Enable 2FA on all service accounts (Google, Anthropic, GitHub)
- Use service accounts with minimal required permissions
- Review API usage logs monthly for anomalies
- Keep `.env.local.example` updated when adding new secrets

#### ❌ DON'T:

- Commit `.env`, `credentials.json`, or any file with real secrets
- Share secrets via email, Slack, Discord, or other messaging
- Hardcode secrets in source code files
- Use production credentials in development environments
- Store secrets in plaintext files on your desktop
- Use example/placeholder secrets in production
- Share your `.env` file with teammates (they should create their own)
- Take screenshots of `.env` or `credentials.json` files

### Environment Variables

All sensitive environment variables must be:

1. Defined in `backend/.env.local.example` with placeholder values
2. Documented with instructions on how to obtain the real values
3. Listed in `.gitignore` to prevent accidental commits
4. Encrypted at rest on production servers

### Credentials Checklist

Before deploying or sharing code, verify:

- [ ] No actual secrets in `.env.local.example`
- [ ] `.env` is in `.gitignore`
- [ ] `credentials.json` is in `.gitignore`
- [ ] No API keys hardcoded in source files
- [ ] Production secrets are different from development
- [ ] All team members have created their own `.env` files
- [ ] Service account permissions are minimal (least privilege)

### Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT open a public GitHub issue**
2. Email the maintainer privately
3. Include details about the vulnerability
4. Allow time for a fix before public disclosure

## Authentication & Authorization

### JWT Tokens

- Access tokens expire after 30 minutes
- Refresh tokens expire after 7 days
- Tokens are stored in HttpOnly secure cookies
- Refresh token rotation is enabled

### User Roles

- **ADMIN**: Full access (manage users, settings, contracts, data)
- **VIEWER**: Read-only access (view data, analytics)

### Password Requirements

- Minimum 8 characters
- Hashed with bcrypt before storage
- Passwords are never logged or displayed

## Data Protection

### Database

- PostgreSQL connection uses async encrypted connections
- Database credentials stored in `.env` (never in code)
- Production database has restricted network access
- Regular backups configured (see DEPLOYMENT.md)

### API Keys

- Anthropic API key required for AI Analyst feature
- Google Sheets API uses service account (not OAuth)
- API keys are environment-specific (dev vs. prod)

## Production Security

See [DEPLOYMENT.md](DEPLOYMENT.md) for:

- Cloudflare Tunnel configuration
- Nginx reverse proxy setup
- SSL/TLS certificate management
- Systemd service hardening
- Backup and recovery procedures

## Compliance

This application handles staff performance data. Ensure:

- Data is encrypted in transit (HTTPS)
- Access is logged (audit trail)
- User permissions are enforced
- Data retention policies are documented
- GDPR/privacy requirements are met (if applicable)

## Regular Security Tasks

- [ ] **Weekly:** Review API usage logs
- [ ] **Monthly:** Check for dependency vulnerabilities (`pip-audit`)
- [ ] **Quarterly:** Rotate API keys and database passwords
- [ ] **Quarterly:** Review user access and permissions
- [ ] **Annually:** Security audit and penetration testing

## Dependencies

Keep dependencies updated for security patches:

```bash
# Check for vulnerabilities
pip-audit

# Update dependencies
pip install --upgrade -r requirements.txt
```

## Contact

For security concerns, contact the project maintainer or review:
- [DEPLOYMENT.md](DEPLOYMENT.md) for production security
- [backend/README.md](backend/README.md) for development security
- [CLAUDE.md](CLAUDE.md) for code security guidelines
