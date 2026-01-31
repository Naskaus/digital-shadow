# AI Memory - DIGITAL-SHADOW v0.5

> **Purpose**: Concise handover document for Claude Code. Full session history: `OLD/AI_Memory_FULL_HISTORY.md`

---

## Current System State

| Item | Value |
|------|-------|
| **Version** | v0.5 (local), v0.3 (production) |
| **Status** | ✅ Fully functional locally |
| **Production URL** | https://staff.naskaus.com |
| **Git Branch** | `opus-repair-2026-01-31` (pushed to GitHub) |
| **Database** | PostgreSQL 17 (local), 34,545 fact_rows |

---

## Environment Setup

### Prerequisites
- PostgreSQL 17 running
- Python 3.13+
- Node.js 20+

### Start PostgreSQL
```powershell
pg_ctl -D "C:\Program Files\PostgreSQL\17\data" start
```

### Backend (Port 8001)
```powershell
cd "C:\Users\User\CODING\Rasberry Projects\Digital-Shadow-Debug\repo\backend"
python -m uvicorn app.main:app --reload --port 8001
```

### Frontend (Port 5173)
```powershell
cd "C:\Users\User\CODING\Rasberry Projects\Digital-Shadow-Debug\repo\frontend"
npm run dev
```

### Login
- **Username**: `seb`
- **Password**: `seb12170`

---

## Key Technical Facts

### Staff ID Rule (CRITICAL)
`STAFF_ID` is **atomic**: `"NNN - NICKNAME"` (e.g., `"046 - MAPRANG"`)
- Never split for identity
- `staff_num_prefix` extracted for agent derivation only

### Agent Logic
- Agents are **BAR-SCOPED**: Agent #5 (MANDARIN) ≠ Agent #5 (SHARK)
- Derived via `agent_range_rules` table + `staff_num_prefix`
- If mismatch with sheet's AGENT column → `agent_mismatch = true` (never auto-fix)

### Import Pipeline
- Source: Google Sheets API (read-only)
- Idempotent: `business_key = SHA256(bar|date|staff_id)`
- Two-phase: STAGED → COMMITTED

---

## Features Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Auth + Login | ✅ | JWT cookies, admin/viewer roles |
| Data Import | ✅ | 2025 + 2026 sheets |
| Data Table | ✅ | Infinite scroll, filters, KPIs |
| Analytics Leaderboards | ✅ | Staff + Agent views |
| Payroll Engine | ✅ | Bonus A/B/C calculations |
| User Management | ✅ | Admin CRUD |
| **AI Analyst** | ✅ | Claude API, all users access |

---

## AI Analyst Feature (v0.5)

### Backend
- **Route**: `backend/app/api/routes/ai_analyst.py`
- **Service**: `backend/app/services/claude_analyst.py`
- **Model**: `AIAnalystQuery` in `models/base.py`
- **Schemas**: `AnalystQueryRequest/Response` in `schemas/__init__.py`

### Frontend
- **Component**: `frontend/src/pages/staff/AIAnalystTab.tsx`
- **API Client**: `aiAnalystApi` in `frontend/src/api/client.ts`
- **Access**: All authenticated users (not just seb)

### Security
- Rate limit: 10/min, 100/day per user
- Audit logging: `ai_analyst_queries` table
- Data sent to Claude: **aggregated only** (no raw rows)

### API Key
```env
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Files Reference

### Documentation
| File | Purpose |
|------|---------|
| `PRD.md` | Product requirements (core spec) |
| `ai-analyst-decision.md` | AI implementation options |
| `ai-analyst-setup.md` | AI Analyst setup guide |

### Key Code Paths
| Component | Path |
|-----------|------|
| Backend main | `backend/app/main.py` |
| Models | `backend/app/models/base.py` |
| API Routes | `backend/app/api/routes/` |
| Frontend App | `frontend/src/pages/staff/StaffApp.tsx` |

---

## Known Issues

1. **"Manage Rules" button** in Settings does nothing (rules managed via scripts)
2. **Production deployment** still at v0.3 - v0.5 not deployed yet

---

## Quick Commands

### Check agent rules
```powershell
cd backend
python check_agent_rules.py
```

### Update agent IDs in fact_rows
```powershell
cd backend
python update_agent_ids.py
```

### Run database migration
```powershell
cd backend
alembic upgrade head
```

---

*Last updated: 2026-01-31*
