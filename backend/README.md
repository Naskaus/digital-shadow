# Digital Shadow Backend

FastAPI backend for the Digital Shadow staff performance management system.

## Tech Stack

- **Framework:** FastAPI 0.109+
- **Database:** PostgreSQL 17 (async via asyncpg)
- **ORM:** SQLAlchemy 2.0 with async support
- **Migrations:** Alembic
- **Authentication:** JWT (HttpOnly cookies + refresh token rotation)
- **APIs:** Google Sheets API v4, Anthropic Claude API

## Local Development Setup

### Prerequisites

- Python 3.11 or higher
- PostgreSQL 15+ (or use Docker Compose)
- Google Cloud Service Account (for Sheets API)
- Anthropic API key (for AI Analyst feature)

### Step 1: Clone and Install Dependencies

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables

**IMPORTANT: Never commit secrets to Git!**

```bash
# Copy the example environment file
cp .env.local.example .env

# Edit .env with your actual credentials
# (See detailed instructions below)
```

#### 2.1 Database Configuration

If using Docker Compose:

```bash
# Start PostgreSQL in Docker
docker-compose up -d postgres
```

Your `DATABASE_URL` in `.env` should be:
```
DATABASE_URL=postgresql+asyncpg://postgres:sEb@dB1217@localhost:5432/digital_shadow
```

If using a local PostgreSQL installation, update the connection string accordingly.

#### 2.2 JWT Secret Key

Generate a secure random string for JWT token signing:

**On Linux/Mac:**
```bash
openssl rand -hex 32
```

**On Windows (PowerShell):**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

Copy the output and set it in `.env`:
```
JWT_SECRET_KEY=your-generated-random-string-here
```

#### 2.3 Anthropic API Key (for AI Analyst)

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create Key**
5. Copy the key (format: `sk-ant-api03-...`)
6. Add to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   ```

#### 2.4 Google Sheets API Setup

1. **Create a Google Cloud Project:**
   - Go to https://console.cloud.google.com/
   - Create a new project or select an existing one

2. **Enable Google Sheets API:**
   - In the project, go to **APIs & Services** > **Library**
   - Search for "Google Sheets API"
   - Click **Enable**

3. **Create a Service Account:**
   - Go to **IAM & Admin** > **Service Accounts**
   - Click **Create Service Account**
   - Name: `digital-shadow-sheets-reader`
   - Role: **Editor** (or **Viewer** for read-only access)
   - Click **Done**

4. **Generate JSON Credentials:**
   - Click on the newly created service account
   - Go to **Keys** tab
   - Click **Add Key** > **Create new key**
   - Select **JSON** format
   - Click **Create** (downloads `your-project-xxxxx.json`)

5. **Save Credentials:**
   - Rename the downloaded file to `credentials.json`
   - Move it to the `backend/` directory
   - **VERIFY** it's in `.gitignore` (it is by default)

6. **Share Google Sheets with Service Account:**
   - Open your Google Sheet (2025 and 2026 data sources)
   - Click **Share**
   - Copy the email from `credentials.json` → `client_email` field
     (format: `xxx@xxx.iam.gserviceaccount.com`)
   - Paste it as a collaborator (Viewer or Editor access)
   - Click **Share**

### Step 3: Database Migrations

Run Alembic migrations to create database tables:

```bash
# Apply all migrations
alembic upgrade head

# (Optional) Create a new migration after model changes
alembic revision --autogenerate -m "description"
```

### Step 4: Run Development Server

```bash
# Start FastAPI with hot reload
uvicorn app.main:app --reload --port 8001
```

The API will be available at:
- **API:** http://localhost:8001/api
- **Docs:** http://localhost:8001/docs (Swagger UI)
- **ReDoc:** http://localhost:8001/redoc

## Project Structure

```
backend/
├── alembic/                    # Database migrations
│   └── versions/               # Migration scripts
├── app/
│   ├── api/
│   │   ├── routes/             # API endpoints
│   │   │   ├── auth.py         # Authentication (login/logout)
│   │   │   ├── contracts.py    # Contract types CRUD
│   │   │   ├── import_.py      # Google Sheets import
│   │   │   ├── rows.py         # Data table queries
│   │   │   ├── settings.py     # Data sources & agent rules
│   │   │   ├── users.py        # User management
│   │   │   ├── analytics.py    # Leaderboards & payroll
│   │   │   └── ai_analyst.py   # AI analyst chat
│   │   └── deps.py             # Dependency injection (auth, DB)
│   ├── core/
│   │   ├── config.py           # Pydantic settings (env vars)
│   │   ├── db.py               # Async SQLAlchemy engine
│   │   └── security.py         # JWT & password hashing
│   ├── models/
│   │   └── base.py             # All ORM models
│   ├── schemas/
│   │   └── __init__.py         # Pydantic request/response schemas
│   ├── services/
│   │   ├── import_service.py   # Google Sheets import logic
│   │   └── claude_analyst.py   # AI analyst service
│   └── main.py                 # FastAPI app entry point
├── .env.local.example          # Environment template (safe to commit)
├── .env                        # Your secrets (NEVER commit!)
├── credentials.json            # Google API credentials (NEVER commit!)
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

## Security Best Practices

### ✅ DO:
- Keep `.env` and `credentials.json` in `.gitignore`
- Use strong, unique passwords and API keys
- Rotate secrets if they are ever exposed
- Use service accounts with minimal permissions
- Enable 2FA on your Google and Anthropic accounts
- Review API usage regularly for anomalies

### ❌ DON'T:
- Commit `.env` or `credentials.json` to Git
- Share your `.env` file via email/Slack/Discord
- Use production credentials in development
- Hardcode secrets in source code
- Use example/default secrets in production
- Store secrets in plaintext on your desktop

## Common Development Tasks

### Run Tests
Currently, the project uses manual testing. Run the test script:
```bash
python test_contracts_api.py
```

### Lint Code
```bash
# Backend uses black and flake8 (optional)
black app/
flake8 app/
```

### Create a Migration
```bash
# After modifying models in app/models/base.py
alembic revision --autogenerate -m "add new field to contract_types"
alembic upgrade head
```

### Reset Database (Development Only)
```bash
# Drop all tables and re-run migrations
alembic downgrade base
alembic upgrade head
```

## Troubleshooting

### PostgreSQL Connection Issues

**Error:** `ConnectionRefusedError: [WinError 1225]`

**Solution:**
- Ensure PostgreSQL is running: `pg_ctl status` or `docker-compose ps`
- Check `DATABASE_URL` in `.env` matches your database configuration

### Google Sheets Import Fails

**Error:** `403 Forbidden` or `Insufficient Permission`

**Solution:**
- Verify `credentials.json` is in the `backend/` directory
- Check that the service account email has been added as a collaborator on the Google Sheet
- Ensure "Google Sheets API" is enabled in Google Cloud Console

### Alembic Migration Issues

**Error:** `Target database is not up to date`

**Solution:**
```bash
alembic upgrade head
```

**Error:** `Can't locate revision identified by 'xxxxx'`

**Solution:** Check if you're on the correct branch or if migration files are missing.

## API Documentation

Once the server is running, visit:
- **Swagger UI:** http://localhost:8001/docs
- **ReDoc:** http://localhost:8001/redoc

## Production Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) in the project root for comprehensive deployment instructions.

## Support

For issues or questions:
- Check the main project [README.md](../README.md)
- Review [CLAUDE.md](../CLAUDE.md) for development guidelines
- See [Staff_Performance/PRD.md](../Staff_Performance/PRD.md) for product requirements
