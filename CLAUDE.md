# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Digital Shadow v0.5 — Staff performance management system for nightclub operations. Monorepo with FastAPI backend and React frontend, deployed on a Raspberry Pi 5 via Cloudflare Tunnel at staff.naskaus.com.

## Development Commands

### Backend
```bash
cd backend
..\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8001
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

## Architecture

```
Digital-Shadow/
├── backend/          # FastAPI (Python 3.11+, async, port 8001)
│   ├── app/
│   │   ├── api/routes/    # Thin route handlers (auth, import, rows, settings, users, analytics, ai_analyst)
│   │   ├── core/          # config.py (Pydantic settings), db.py (async engine), security.py (JWT)
│   │   ├── models/base.py # All SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── services/      # Business logic (import_service.py, claude_analyst.py)
│   │   └── main.py        # FastAPI app entry point, serves frontend static files
│   └── alembic/           # Database migration scripts
├── frontend/         # React 18 + Vite + TypeScript
│   └── src/
│       ├── api/client.ts       # Typed API client (authApi, rowsApi, importApi, etc.)
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

### Database Schema (PostgreSQL 17)
- **fact_rows**: Central business table. `business_key = sha256(bar|date|staff_id)` ensures uniqueness. `row_hash` enables idempotent upserts.
- **raw_rows**: Immutable staging of Google Sheets data (JSON). Never modified after insert.
- **import_runs / import_errors**: Full audit trail for every import.
- **agent_range_rules**: Per-bar staff ID prefix → agent mapping (e.g., 100-199 → Agent 1 in MANDARIN).
- **data_sources**: Google Sheets configuration per year.
- **ai_analyst_queries**: Audit log for all Claude API calls.
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

## Session Governance

- `Staff_Performance/context.md` → READ ONLY, never modify
- `Staff_Performance/AI_Memory.md` → Append-only, add summary only when user says "fin de session"
- `Staff_Performance/PRD.md` → Source of truth for feature requirements

## Environment Notes

- PostgreSQL password contains `@`, encoded as `%40` in connection strings
- Production server: Raspberry Pi 5, SSH at seb@100.119.245.18, app at `/var/www/digital-shadow-v2`
- Backend serves the built frontend from static files in production (single port 8001)
- No automated test suite currently exists; testing is manual
