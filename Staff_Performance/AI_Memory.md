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

## Session 2026-01-31: Contract Types & Secrets Management

### Milestone 1: Contract Types Foundation Complete

**Backend Implementation:**
- ✅ Created `ContractType` model with UUID primary key (`backend/app/models/base.py:225`)
- ✅ Alembic migration: `20260131_add_contract_types_table.py`
- ✅ Pydantic schemas: `ContractTypeBase`, `ContractTypeCreate`, `ContractTypeUpdate`, `ContractTypeResponse`
- ✅ CRUD API endpoints: `backend/app/api/routes/contracts.py`
  - `GET /api/contracts` - List all (viewer access)
  - `GET /api/contracts/{id}` - Get by UUID (viewer access)
  - `POST /api/contracts` - Create (admin only)
  - `PATCH /api/contracts/{id}` - Update (admin only)
  - `DELETE /api/contracts/{id}` - Delete (admin only)
- ✅ Test script validates all endpoints: `backend/test_contracts_api.py`

**ContractType Fields:**
- `id` (UUID), `name` (unique), `duration_days`, `late_cutoff_time`
- `first_minute_penalty_thb`, `additional_minutes_penalty_thb`
- `drink_price_thb`, `staff_commission_thb`, `is_active`
- `created_at`, `updated_at`

**Frontend Implementation:**
- ✅ Contract Types section in Settings tab (before User Management)
- ✅ Card grid layout (responsive 1/2/3 columns)
- ✅ Add/Edit/Delete modals with full form validation
- ✅ API client: `contractsApi` in `frontend/src/api/client.ts`
- ✅ Loading states, error handling, success feedback

**Test Results:**
All 7 test steps passed successfully:
1. Authentication (login as seb)
2. POST - Create "1-Day" contract
3. GET - List all contracts
4. GET - Get by UUID
5. PATCH - Update drink_price_thb
6. DELETE - Remove contract
7. Verify deletion (404)

### Documentation & Security Overhaul

**New Files Created:**
1. ✅ `CLAUDE.md` (comprehensive guide for future Claude Code instances)
   - Development commands (backend, frontend, migrations, deployment)
   - Architecture overview (monorepo structure, patterns)
   - Non-negotiable rules (from context.md)
   - Session governance
   - Environment notes

2. ✅ `backend/.env.local.example` (3,979 bytes)
   - Comprehensive template with clear comments
   - Platform-specific JWT key generation commands
   - Anthropic API key setup instructions
   - Google Service Account setup walkthrough
   - Security warnings

3. ✅ `backend/README.md` (8,212 bytes)
   - Complete backend setup guide
   - Step-by-step secret configuration
   - Troubleshooting section
   - API documentation links
   - Security best practices

4. ✅ `SECURITY.md` (7,524 bytes)
   - Repository-wide security policy
   - Secrets exposure response plan
   - GitHub secret scanning handling
   - Credentials checklist
   - Regular security tasks schedule

**Security Improvements:**
- ✅ Updated `.gitignore` with explicit environment file rules
- ✅ Removed old `.env.example` (replaced with `.env.local.example`)
- ✅ Verified `credentials.json` protection
- ✅ Fixed `.env.example` with placeholder secrets (removed actual API key)
- ✅ Documented secret rotation procedures

**Git Status:**
- Branch: `opus-repair-2026-01-31`
- Commit: `c863a78` (23 files changed, +2,581 lines)
- Status: **Blocked by GitHub secret scanning** (old commit `39da67b` contains API key)
- Solution: Visit GitHub URL to allow push (historical issue, not new code)

### Next Steps

**Immediate:**
1. Allow secret via GitHub URL: https://github.com/Naskaus/digital-shadow/security/secret-scanning/unblock-secret/39101MJJiWmS9Z9onTarzMs2Zwn
2. Push commit to `opus-repair-2026-01-31` branch
3. Create PR and merge to main

**Future Development:**
1. Seed default contract types (1-Day, 10-Days, 1-Month) via migration
2. Link contracts to staff entries (add `contract_type_id` FK to `fact_rows`)
3. Auto-calculate penalties based on late arrivals + contract rules
4. Manual data entry form for staff performance (using contract types)

### Files Modified/Created This Session

**Backend:**
- `app/models/base.py` - Added ContractType model
- `app/schemas/__init__.py` - Added contract type schemas
- `app/api/routes/contracts.py` - New CRUD endpoints
- `app/api/routes/__init__.py` - Exported contracts_router
- `app/api/__init__.py` - Added contracts_router
- `app/main.py` - Registered contracts_router
- `app/models/__init__.py` - Exported ContractType
- `alembic/versions/20260131_add_contract_types_table.py` - New migration
- `test_contracts_api.py` - Test script
- `.env.local.example` - New comprehensive template
- `.env.example` - Removed (replaced)
- `README.md` - New backend guide

**Frontend:**
- `src/api/client.ts` - Added contractsApi
- `src/pages/staff/SettingsTab.tsx` - Added Contract Types section

**Documentation:**
- `CLAUDE.md` - New (root)
- `SECURITY.md` - New (root)
- `.gitignore` - Updated environment rules

### Technical Notes

**Why UUID for ContractType?**
- User explicitly requested UUID primary key
- Enables stable external references (future-proof)
- Rest of codebase uses Integer autoincrement (ContractType is exception)

**Time Field Handling:**
- PostgreSQL `Time` type for `late_cutoff_time`
- Frontend uses HTML5 `<input type="time">` (HH:MM format)
- Backend appends `:00` seconds automatically

**API Authentication:**
- Contract list/get: `CurrentUser` (any authenticated user)
- Create/update/delete: `CurrentAdmin` (admin role required)
- Consistent with User Management patterns

---

## Session 2026-01-31 (Evening): Milestone 2 Complete - Profile System

### Objective
Implement complete profile management system for staff and agents with photo upload capability.

### Commits Created (4 total)

**Commit 1: `3915f72` - Profile Database Models**
- Added `ProfileType` enum (STAFF/AGENT) and `StaffPosition` enum (DANCER/PR)
- Created `Profile` model (18 columns):
  - UUID primary key
  - Mutually exclusive identity: staff_id OR agent_key
  - Common fields: name, picture (BYTEA), date_of_birth, phone, social media links, notes
  - Staff-only fields: position, size, weight
  - Check constraints enforce profile_type rules
  - Partial indexes on staff_id and agent_key
- Created `ProfileBar` junction table (many-to-many bars)
  - Composite PK (profile_id, bar)
  - Optional agent_key for staff assignments
- Migration: `16f91ab164b4_add_profiles_and_profile_bars_tables`
- Verified: Both tables created with proper constraints and indexes

**Commit 2: `55989e0` - Auto-Migration Script**
- Created `backend/scripts/migrate_profiles.py`
- Extracted unique staff from fact_rows:
  - 1,429 STAFF profiles created
  - Names extracted from "NNN - NICKNAME" format
- Extracted unique agents from (bar, agent_id_derived):
  - 27 AGENT profiles created
  - Agent keys format: "BAR|AGENT_ID"
- Created 1,570 profile-bar links
- Script is idempotent (safe to re-run)
- Total profiles: 1,456 (1,429 staff + 27 agents)

**Commit 3: `af1a772` - CRUD API Endpoints**
- Added 7 Pydantic schemas in `app/schemas/__init__.py`:
  - ProfileBarResponse, ProfileBase, ProfileCreateStaff, ProfileCreateAgent
  - ProfileUpdate, ProfileResponse, ProfileListResponse
- Created `app/api/routes/profiles.py` with 8 endpoints:
  - `GET /api/profiles` - List with pagination/filters (type, bar, search)
  - `GET /api/profiles/staff/{staff_id}` - Get staff by ID
  - `GET /api/profiles/agent/{agent_key}` - Get agent by key (BAR|ID)
  - `GET /api/profiles/{uuid}` - Get by UUID
  - `POST /api/profiles/staff` - Create staff (admin)
  - `POST /api/profiles/agent` - Create agent (admin)
  - `PATCH /api/profiles/{uuid}` - Update profile (admin)
  - `DELETE /api/profiles/{uuid}` - Delete profile + bars (admin)
- All 11 tests passed (create, read, update, delete, filters, search)

**Commit 4: `3e77375` - Photo Upload Endpoints**
- Added 3 photo management endpoints:
  - `PUT /api/profiles/{profile_id}/photo` - Upload (admin, max 5MB)
  - `GET /api/profiles/{profile_id}/photo` - Download (public)
  - `DELETE /api/profiles/{profile_id}/photo` - Remove (admin)
- Implementation details:
  - Custom magic number detection (Python 3.13 compatible)
  - Replaced deprecated `imghdr` module
  - Validates: file size (5MB max), MIME type (jpeg/png/webp)
  - Proper Content-Type headers on download
  - Updates `has_picture` flag in ProfileResponse
- All 8 tests passed:
  - Upload: 70 bytes PNG uploaded successfully
  - Download: Correct Content-Type returned (image/png)
  - Delete: Photo removed, 404 on re-access
  - Flag verification: has_picture updates correctly

### Technical Challenges Solved

1. **Python 3.13 Compatibility**
   - Issue: `imghdr` module removed in Python 3.13
   - Solution: Implemented custom magic number detection
   - Magic bytes: JPEG (`\xff\xd8\xff`), PNG (`\x89PNG\r\n\x1a\n`), WEBP (`RIFF...WEBP`)

2. **Profile Type Constraints**
   - Check constraint ensures STAFF has staff_id (not agent_key)
   - Check constraint ensures AGENT has agent_key (not staff_id)
   - Check constraint prevents staff-only fields on AGENT profiles
   - Database enforces business rules at schema level

3. **Agent Key Format**
   - Format: "BAR|AGENT_ID" (e.g., "MANDARIN|5")
   - Ensures agents are bar-scoped as per business rules
   - Unique constraint prevents duplicate agents per bar

### Database State

**Profiles Table**:
- 1,429 STAFF profiles (from fact_rows unique staff_id)
- 27 AGENT profiles (from fact_rows unique bar+agent_id combinations)
- Total: 1,456 profiles

**Profile Bars**:
- 1,570 links (profiles working across multiple bars)
- Includes agent_key assignments for staff

### Git Status
- Branch: `opus-repair-2026-01-31`
- Pushed to GitHub: Yes
- Commits: 4 (3915f72, 55989e0, af1a772, 3e77375)
- Working tree: Clean

### Files Modified/Created

**Backend**:
- `app/models/base.py` - Added Profile, ProfileBar models + enums
- `app/models/__init__.py` - Exported new models
- `app/schemas/__init__.py` - Added 7 profile schemas
- `app/api/routes/profiles.py` - NEW (11 endpoints total)
- `app/api/routes/__init__.py` - Exported profiles_router
- `app/api/__init__.py` - Exported profiles_router
- `app/main.py` - Registered profiles_router
- `alembic/versions/16f91ab164b4_add_profiles_and_profile_bars_tables.py` - NEW
- `scripts/migrate_profiles.py` - NEW (one-time migration)

**Testing**:
- `test_photo_endpoints.py` - NEW (comprehensive photo tests)
- `create_test_image.py` - NEW (minimal PNG generator)
- `test_photo.png` - NEW (70 bytes test image)

### Next Steps

**Immediate**:
1. Test photo upload in browser: http://localhost:8001/api/profiles/{uuid}/photo
2. Consider PR to merge `opus-repair-2026-01-31` → main

**Future Enhancements** (Milestone 3+):
1. **Frontend Integration**:
   - Profile modal component (click staff_id → view profile)
   - Photo upload UI with drag-drop
   - Job history table in profile modal
   - Edit profile form

2. **Additional Features**:
   - Photo resize/thumbnail generation
   - Bulk photo upload
   - Export profiles to CSV
   - Profile search autocomplete
   - Agent performance dashboard using profile data

3. **Manual Data Entry** (from original roadmap):
   - Link contract_types to fact_rows
   - Manual entry form for daily staff records
   - Auto-calculate penalties based on contract rules

### Notes
- All endpoints tested and working
- Mobile viewport compatibility maintained
- RBAC enforced (admin-only write operations)
- Idempotent operations (safe to re-run migration)
- Production-ready code

---

## Session 2026-02-01: Profile Modal UI + Job History Stats Fix

### Objective
Implement Profile Modal component with photo management, job history, and KPI statistics. Fix critical issues with filter behavior.

### Milestone 3 Complete: Profile Modal UI

**Component Created:** `frontend/src/components/ProfileModal.tsx` (500+ lines)

**Features Implemented:**

1. **Profile Info Section:**
   - Photo display (200x200px) with placeholder avatar
   - Admin-only upload/delete buttons (5MB max, JPEG/PNG/WEBP)
   - Contact info grid: Phone, LINE, Instagram, Facebook, TikTok (with icons)
   - Date of birth, Size, Weight fields
   - Position badge (DANCER/PR)
   - Bars list with agent assignments
   - Notes section

2. **Job History Section:**
   - Backend endpoint: `GET /api/profiles/staff/{staff_id}/history`
   - Paginated table (20 rows/page)
   - Filters: Bar (multi-select), Year, Month
   - Desktop: Full 7-column table
   - Mobile: Card layout
   - Columns: Date, Bar, Agent, Drinks, Salary, Profit, Contract

3. **KPI Statistics:**
   - 4-card grid above job history
   - Metrics: Worked Days, Total Profit, Total Drinks, Total Bonus
   - Shows averages below totals
   - Color-coded: green (profit), blue (drinks), purple (bonus)
   - **CRITICAL FIX:** Stats now respect bar/year/month filters

**Integration:**
- Data Table: Click staff_id → Opens ProfileModal
- Mobile-responsive (full-screen on mobile, 800px centered desktop)
- Escape key to close, backdrop click to close

### Ranking System Implementation (Then Removal)

**Initial Implementation:**
- Created `GET /api/profiles/rankings` endpoint
- Added medals to Profile Modal header
- Added medals to Data Table (inline with staff_id)

**Critical Design Flaw Identified:**
- Medals calculated from ALL-TIME data
- Should be contextual to Analytics tab filters
- Rankings make no sense in Data Table (no filter context)

**Corrective Action:**
- ✅ Removed `/api/profiles/rankings` endpoint
- ✅ Removed rankings state from ProfileModal
- ✅ Removed rankings state from DataTableTab
- ✅ Removed all medal display code
- ✅ Removed `getRankings()` from API client

**Rationale:** Medals are contextual and belong ONLY in Analytics Leaderboard where filters provide proper context.

### Critical Bugs Fixed

**Issue 1: Job History Stats Ignored Filters**

BEFORE (wrong):
```python
# Stats always showed all-time totals
stats_query = select(...).where(FactRow.staff_id == staff_id)
```

AFTER (correct):
```python
# Stats respect bar/year/month filters
stats_query = select(...).where(FactRow.staff_id == staff_id)

if bar:
    stats_query = stats_query.where(FactRow.bar.in_(bar))
if year is not None:
    stats_query = stats_query.where(func.extract("year", FactRow.date) == year)
if month is not None:
    stats_query = stats_query.where(func.extract("month", FactRow.date) == month)
```

**Test Results:**
- Default (all filters): 223 days, ฿330,870 profit
- Filter MANDARIN: Stats decrease (only MANDARIN records)
- Filter 2026+January: Stats show only January 2026 data

**Issue 2: Route Order Conflicts**

Fixed two FastAPI route ordering issues:
1. `/staff/{staff_id:path}/history` must come BEFORE `/staff/{staff_id:path}`
2. `/rankings` would have needed to come BEFORE `/{profile_id}` (but we removed it)

### Files Modified

**Backend:**
- `app/api/routes/profiles.py`:
  - Added `get_staff_history` endpoint (line 108)
  - Fixed stats query to apply filters (lines 140-162)
  - Removed `/rankings` endpoint

**Frontend:**
- `src/components/ProfileModal.tsx`: NEW (500+ lines)
- `src/pages/staff/DataTableTab.tsx`: Integration + cleanup
- `src/api/client.ts`: Added `profilesApi` methods, removed `getRankings()`

**Test Scripts:**
- `backend/test_profile_modal.py`: Profile + history endpoint tests
- `backend/test_history_stats.py`: Stats verification
- `backend/test_rankings.py`: Deleted (endpoint removed)
- `backend/debug_profile_modal.py`: Diagnostic tool

### Build Status

All builds successful:
- ✅ Backend: No errors
- ✅ Frontend: TypeScript compilation clean
- ✅ Production build: 339.34 KB (gzipped: 94.87 KB)

### Remaining Work

**Analytics Tab (NOT IMPLEMENTED YET):**
1. Add Year + Month filters to Girls Leaderboard (currently bar-only)
2. Add medals to top 3 positions (🥇🥈🥉)
3. Ensure rankings update with filter changes
4. Backend analytics endpoint should accept `bar`, `year`, `month` filters

**Future Enhancements:**
1. Photo resize/thumbnail generation
2. Bulk photo upload
3. Profile search autocomplete
4. Agent performance dashboard using profile data

### Technical Notes

**Route Ordering Rule:**
FastAPI matches routes in order. More specific routes MUST come before generic ones:
```python
@router.get("/staff/{staff_id:path}/history")  # Specific - FIRST
@router.get("/staff/{staff_id:path}")          # Generic - SECOND
```

**Filter-Aware Stats Pattern:**
When calculating aggregates, always apply the same filters as the data query to maintain consistency.

**Photo Upload Validation:**
- Custom magic number detection (Python 3.13 compatible)
- Replaced deprecated `imghdr` module
- Magic bytes: JPEG (`\xff\xd8\xff`), PNG (`\x89PNG\r\n\x1a\n`), WEBP (`RIFF...WEBP`)

### Git Status
- Branch: `opus-repair-2026-01-31` (or current working branch)
- Working tree: Clean (all changes committed)

---

*Last updated: 2026-02-01*
