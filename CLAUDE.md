# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Digital Shadow v0.5 — Staff performance management system for nightclub operations. Monorepo with FastAPI backend and React frontend, deployed on a Raspberry Pi 5 via Cloudflare Tunnel at staff.naskaus.com.

## Development Commands

### Backend
```bash
cd backend
# Activate venv first (Windows: venv\Scripts\activate, Linux/Mac: source venv/bin/activate)
uvicorn app.main:app --reload --port 8001
```

### Frontend
```bash
cd frontend
npm run dev          # Dev server on port 5173
npm run build        # Production build (tsc -b && vite build) → dist/
npm run lint         # ESLint
```

### Database Migrations
```bash
cd backend
alembic upgrade head              # Apply all migrations
alembic revision --autogenerate -m "description"  # Create new migration
```

### Deployment
```powershell
.\deploy_v05.ps1    # Packages, uploads, deploys to Raspberry Pi
```
Never deploy file-by-file with scp. Always use the deploy script.

### Docker (PostgreSQL only)
```bash
docker-compose up -d postgres     # PostgreSQL 17 on localhost:5432
```

## Recent Changes

### Session 2026-02-01: Analytics Enhancements + PDF Exports

**Milestone 2 Complete**: Profile System with photos, job history, rankings

**Features Added**:
- 🥇 Medal system in Analytics (top 3 staff per context)
- 📊 Bonus column in all leaderboards (CRITICAL - never remove)
- 📱 Mobile-first Analytics with card layout
- 📄 PDF exports (leaderboard + individual profiles)
- 🔴 Negative numbers in RED everywhere
- 🎯 Smart filters (month disabled when "All Years")
- 👆 Clickable staff names → Profile modal

**Key Files**:
- `frontend/src/pages/staff/AnalyticsTab.tsx` (major rewrite)
- `frontend/src/components/ProfileModal.tsx` (added PDF export)
- `backend/app/api/routes/analytics.py` (bonus column)

**Deployment Notes**:
- Bundle size optimized: 348KB (jsPDF lazy-loaded)
- Profile photos stored in database as BYTEA (<5MB)
- 1,456 profiles auto-migrated (1,429 staff + 27 agents)

## Architecture

```
Digital-Shadow/
├── backend/          # FastAPI (Python 3.11+, async, port 8001)
│   ├── app/
│   │   ├── api/routes/    # Thin route handlers (auth, import, rows, settings, users, analytics, ai_analyst, contracts, profiles)
│   │   ├── core/          # config.py (Pydantic settings), db.py (async engine), security.py (JWT)
│   │   ├── models/base.py # All SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── services/      # Business logic (import_service.py, claude_analyst.py)
│   │   └── main.py        # FastAPI app entry point, serves frontend static files
│   ├── alembic/           # Database migration scripts
│   └── scripts/           # One-time migration scripts (migrate_profiles.py)
├── frontend/         # React 18 + Vite + TypeScript
│   └── src/
│       ├── api/client.ts       # Typed API client (authApi, rowsApi, importApi, contractsApi, profilesApi, etc.)
│       ├── pages/staff/        # Tab components (ImportTab, DataTableTab, AnalyticsTab, SettingsTab, AIAnalystTab)
│       └── App.tsx             # React Router (Login → Landing → Staff tabs)
└── Staff_Performance/ # Project governance docs
    ├── context.md     # READ ONLY — business rules, non-negotiable constraints
    ├── PRD.md         # Product requirements (source of truth for features)
    └── AI_Memory.md   # Append-only session summaries
```

### Backend Patterns
- **Fully async**: asyncpg + SQLAlchemy AsyncSession throughout. All route handlers and services are async.
- **Dependency injection**: `get_db()` yields DB sessions, `get_current_user()` extracts JWT from HttpOnly cookies. Use `CurrentUser`/`CurrentAdmin` type hints on route parameters.
- **Service layer**: Routes stay thin, business logic lives in `services/`. ImportService handles Google Sheets import; ClaudeAnalystService handles AI analysis.
- **Auth**: JWT in HttpOnly secure cookies with refresh token rotation. Roles: ADMIN, VIEWER.

### Frontend Patterns
- **TanStack ecosystem**: React Query for data fetching (5min stale time), React Table for virtualized tables, React Virtual for infinite scroll.
- **API client**: Centralized in `api/client.ts` with typed request/response interfaces. Credentials included for cookie auth.
- **Styling**: Tailwind CSS only (no component library). lucide-react for icons.
- **AI Analyst**: Uses Anthropic Claude API for natural language analytics. Chat history stored in localStorage (client-side only). Rate limits: 10/min, 100/day per user. Audit log in `ai_analyst_queries` table.
- **Shared Components**: Modal components (ProfileModal) in `src/components/`. Modals should handle Escape key and backdrop clicks for closing.

### Database Schema (PostgreSQL 17)
- **fact_rows**: Central business table. `business_key = sha256(bar|date|staff_id)` ensures uniqueness. `row_hash` enables idempotent upserts.
- **raw_rows**: Immutable staging of Google Sheets data (JSON). Never modified after insert.
- **import_runs / import_errors**: Full audit trail for every import.
- **agent_range_rules**: Per-bar staff ID prefix → agent mapping (e.g., 100-199 → Agent 1 in MANDARIN).
- **data_sources**: Google Sheets configuration per year.
- **ai_analyst_queries**: Audit log for all Claude API calls.
- **contract_types**: Contract configurations (UUID PK, duration_days, late_cutoff_time, penalties). CRUD endpoints available. Foundation for future manual data entry feature (not yet implemented). Current Google Sheets import doesn't use this.
- **profiles**: Staff and agent profiles (UUID PK, 1,456 total: 1,429 staff + 27 agents). Stores photos as BYTEA (<5MB). Check constraints enforce profile_type rules (STAFF has staff_id, AGENT has agent_key). Supports photo upload/download/delete endpoints.
- **profile_bars**: Many-to-many junction table linking profiles to bars (1,570 links). Includes agent_key for staff-agent assignments.
- **app_users / refresh_tokens**: Authentication.

## Non-Negotiable Rules

These come from `Staff_Performance/context.md` (READ ONLY — never modify that file):

1. **STAFF ID is atomic**: Format "NNN - NICKNAME" (e.g., "046 - MAPRANG"). Store as-is, trim only, never split.
2. **Agents are bar-scoped**: Agent #5 in MANDARIN ≠ Agent #5 in SHARK. Always scope by bar.
3. **Never infer or recompute data**: Google Sheets is the single source of truth. Never recompute totals/profit/cuts.
4. **Flag mismatches, never auto-correct**: If sheet AGENT label ≠ derived agent_id from rules, set `agent_mismatch=true`.
5. **Idempotent imports**: Same import re-run = same result. Hash-based deduplication (business_key + row_hash).
6. **No dead code**: No leftover test scripts, no temporary files, no phantom root directories.
7. **Mobile-first UI**: Test all UI changes at 412×915 (Samsung S20). No horizontal scroll. Do not change DataTableTab `estimateSize: 115px` without testing on mobile.
8. **Production .env is sacred**: Never overwrite the server's `.env`. The deploy script handles this.
9. **Monorepo discipline**: Backend code in `./backend`, frontend in `./frontend`. Never create root-level app directories.
10. **FastAPI route ordering**: More specific routes MUST come before generic ones. Example: `/staff/{id}/history` before `/staff/{id}`.
11. **Filter-aware statistics**: When calculating aggregates (totals, averages), always apply the same filters as the data query to maintain consistency.

## Session Governance

- `Staff_Performance/context.md` → READ ONLY, never modify
- `Staff_Performance/AI_Memory.md` → Append-only session summaries. ONLY append when user explicitly says "fin de session". DO NOT modify otherwise.
- `Staff_Performance/PRD.md` → Source of truth for feature requirements

## Environment Notes

- PostgreSQL password contains `@`, encoded as `%40` in connection strings
- Production server: Raspberry Pi 5, SSH at seb@100.119.245.18, app at `/var/www/digital-shadow-v2`
- Backend serves the built frontend from static files in production (single port 8001)
- No automated test suite currently exists; testing is manual
- Test scripts available (run with `cd backend && python <script>`):
  - `test_contracts_api.py` - Validates contract CRUD endpoints
  - `test_photo_endpoints.py` - Validates profile photo upload/download/delete
  - `test_profile_modal.py` - Validates profile retrieval and job history
  - `test_history_stats.py` - Validates KPI statistics calculations

## Secrets Management

**CRITICAL:** Never commit secrets to Git. See `SECURITY.md` and `backend/README.md` for details.

**Protected Files (in .gitignore):**
- `.env` - All environment files with actual secrets
- `credentials.json` - Google Service Account credentials

**Safe Template Files (can commit):**
- `backend/.env.local.example` - Comprehensive template with setup instructions

**Setup for Development:**
```bash
cd backend
cp .env.local.example .env
# Edit .env with actual credentials (see backend/README.md)
```

**Required Secrets:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET_KEY` - Random 32+ char string (generate with openssl/PowerShell)
- `ANTHROPIC_API_KEY` - From console.anthropic.com (for AI Analyst)
- `GOOGLE_CREDENTIALS_PATH` - Path to credentials.json (Google Sheets API)

See `backend/.env.local.example` for detailed instructions on obtaining each secret.

## Common Pitfalls

### FastAPI Route Ordering
Routes are matched in order. More specific patterns must come before generic ones:

```python
# CORRECT ORDER
@router.get("/staff/{staff_id:path}/history")  # Specific - FIRST
@router.get("/staff/{staff_id:path}")          # Generic - SECOND

# WRONG ORDER (would never match /history)
@router.get("/staff/{staff_id:path}")          # Generic catches everything
@router.get("/staff/{staff_id:path}/history")  # Never reached
```

### Photo Upload Validation (Python 3.13)
The `imghdr` module was removed in Python 3.13. Use custom magic number detection:

```python
def detect_image_type(data: bytes) -> str | None:
    """Detect image type from magic numbers."""
    if data.startswith(b'\xff\xd8\xff'):
        return 'jpeg'
    elif data.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png'
    elif data[0:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'webp'
    return None
```

### Filter-Aware Statistics
When displaying KPIs alongside filtered data, ensure statistics respect the same filters:

```python
# BAD: Stats show all-time totals while table shows filtered data
stats_query = select(...).where(Model.id == id)

# GOOD: Stats respect filters
stats_query = select(...).where(Model.id == id)
if filters:
    stats_query = stats_query.where(Model.bar.in_(filters))
```
