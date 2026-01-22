# AI Memory - DIGITAL-SHADOW v0.2

## Session: 2026-01-22 (11:08 - 14:48 ICT) - Mobile UI Optimization & Data Rendering Fix

### Summary
Fixed critical mobile UI issues and data table rendering bugs. System now displays data correctly on all screen sizes (mobile 412x915, laptop 15", desktop 27"). Implemented collapsible filter panel for mobile. **CRITICAL ISSUE IDENTIFIED**: Filter panel is now unusable on both mobile and desktop due to space constraints.

### Issues Fixed

#### 1. Data Rows Not Rendering on Mobile (Samsung Galaxy S20: 412x915)
**Problem**: Data rows visible on 15" and 27" screens but not on mobile viewports.
**Root Cause**: Virtualizer container had insufficient height. With filters and KPIs taking vertical space, the table container had no room for the virtualizer to calculate visible items.
**Fix**:
- Added `min-h-[600px]` to table container (line 334 in `DataTableTab.tsx`)
- Increased virtualizer `estimateSize` from 48px → 115px to match actual mobile card height (112px measured)
- **Files Modified**: `frontend/src/pages/staff/DataTableTab.tsx`

#### 2. Mobile Card Layout Optimization
**Problem**: User reported information overlapping ("informations wroten on each others").
**Root Cause**: Mobile cards were 112px tall but virtualizer was using 60px `estimateSize`, causing severe vertical overlap.
**Fix**:
- Redesigned mobile card layout:
  - **Left (compact)**: Bar name (10px), Date (9px), Staff ID (10px) - stacked vertically in 80px column
  - **Center**: Agent badge using previously empty "yellow space"
  - **Right**: Profit (bold, 16px) + Drinks (10px) in 85px column
- Set `estimateSize: 115px` to prevent overlap
- **Files Modified**: `frontend/src/pages/staff/DataTableTab.tsx` (lines 362-384)

#### 3. Collapsible Filter Panel for Mobile
**Problem**: Filters took too much vertical space on mobile, leaving no room for data.
**Implementation**:
- Added `filtersOpen` state (boolean, default: false)
- Created "Filters ▼/▲" toggle button (visible only on mobile with `md:hidden`)
- Filters hidden by default on mobile (`hidden md:flex`)
- Click to expand/collapse filter panel
- **Files Modified**: `frontend/src/pages/staff/DataTableTab.tsx` (lines 13, 91-107)

#### 4. Column Reordering (Completed in Previous Session)
**Changes**:
- Moved "Profit" column to rightmost position
- Removed "POS" and "SALARY" columns
- Desktop grid changed from 9 columns to 6 columns
- Order: Date, Bar, Staff ID, Agent, Drinks, **Profit**

#### 5. PostgreSQL Connection Issue (Not a Code Bug)
**Problem**: Backend failed to start with `[Errno 10061] Connect call failed ('127.0.0.1', 5432)`
**Root Cause**: PostgreSQL 17 service was stopped (not a login bug as user initially thought)
**Fix**: Started PostgreSQL using `pg_ctl -D "C:\Program Files\PostgreSQL\17\data" start`
**Important**: This was NOT an authentication issue - no login code was modified

### Files Modified

**Frontend**:
- [`frontend/src/pages/staff/DataTableTab.tsx`](file:///C:/Users/User/CODING/Rasberry%20Projects/Digital-Shadow/frontend/src/pages/staff/DataTableTab.tsx)
  - Line 13: Added `filtersOpen` state
  - Lines 54-59: Changed `estimateSize` from 48px → 60px → 115px (final)
  - Lines 91-107: Added collapsible filter toggle button
  - Lines 334: Added `min-h-[600px]` to table container
  - Lines 362-384: Redesigned mobile card layout (compact left, centered agent, bold profit right)

**No Backend Changes**: All fixes were frontend-only CSS/layout adjustments

### Current System State

**✅ Working**:
- Data table renders on ALL screen sizes (mobile 412x915, laptop 15", desktop 27")
- Mobile card layout: clean, no overlap, readable
- Collapsible filters on mobile (toggle button works)
- Desktop layout: 6-column grid with Profit rightmost
- KPIs display correctly (32,877 rows, ฿23.7M profit, 285K drinks, 1,371 staff)
- All filters functional (Bar, Year, Month, Agent, Search)
- Login/Auth working (seb/seb12170)

**🔴 CRITICAL ISSUE - HANDOVER PRIORITY**:
- **Filter Panel Unusable**: User reports filters are now "inutilisable (fenetre trop petite)" on BOTH mobile AND desktop
- **Impact**: Users cannot effectively filter data despite filters being technically functional
- **User Request for Next Session**:
  - **Mobile**: Create new modal/popup window with Apply, Cancel, Reset All buttons
  - **Desktop**: Revert to previous version which was "parfaite" (perfect)
  - **Requirement**: Surgical repair only - do NOT break existing functionality

### Technical Decisions

1. **Virtualizer estimateSize**: Set to 115px based on measured mobile card height (112px)
   - Desktop rows are ~48px but virtualizer uses same value for both
   - This is acceptable as virtualizer auto-adjusts based on actual rendered height
   
2. **Filter Collapse Default**: Filters hidden by default on mobile (`filtersOpen: false`)
   - Maximizes vertical space for data on initial load
   - User can expand when needed

3. **Min-height Strategy**: Used `min-h-[600px]` instead of fixed height
   - Ensures virtualizer always has minimum space to render
   - Allows table to grow on larger screens with `flex-1`

### Verification Screenshots

- `mobile_final_layout_check_1769063066927.png`: Shows clean mobile layout with no overlap
- `successful_login_and_data_load_1769060245873.png`: Desktop view with 32,877 rows loaded
- `mobile_data_table_verified_1769057088547.png`: Mobile view with collapsible filters

### Important Notes for Next LLM

⚠️ **CRITICAL HANDOVER NOTES**:

1. **DO NOT MODIFY**:
   - Login/Auth code (user was frustrated when PostgreSQL issue was mistaken for login bug)
   - Data fetching logic (backend APIs work correctly)
   - Mobile card layout (user approved current design)
   - Column order (Profit rightmost is correct)

2. **MUST FIX**:
   - **Filter Panel on Mobile**: Replace collapsible panel with modal popup
     - Include: Apply, Cancel, Reset All buttons
     - Should open as overlay, not inline
   - **Filter Panel on Desktop**: Revert to previous horizontal layout
     - User said previous version was "parfaite" (perfect)
     - Current version has space issues

3. **AUDIT FIRST**:
   - User requests "audit complet" (complete audit) before making changes
   - Verify current functionality works before modifying filters
   - Test on multiple screen sizes (412x915 mobile, 1366x768 laptop, 1920x1080 desktop)

4. **SURGICAL REPAIRS ONLY**:
   - User emphasized "UNIQUEMENT CHIRUGICAL REPAIRS" (surgical repairs only)
   - Do NOT create test data
   - Do NOT modify login
   - Do NOT break existing data display

5. **Mobile Card Layout** (DO NOT CHANGE):
   ```
   [Bar name (10px)]     [Agent Badge]     [฿1,200 (16px bold)]
   [Date (9px)    ]      [centered    ]    [🍹 5 (10px)        ]
   [Staff ID (10px)]     [             ]    [                    ]
   ```

6. **Virtualizer Settings** (Current, Working):
   - `estimateSize: 115px` (matches mobile card height)
   - `min-h-[600px]` on table container
   - These values are correct - do NOT change

### Session Timeline

- **11:08**: User reported data rows not visible on mobile (Samsung Galaxy S20)
- **11:31**: User discovered issue: data visible on 27" but not 15" screens
- **11:40**: Fixed viewport height issue with `min-h-[400px]` (insufficient)
- **12:33**: PostgreSQL connection issue (service stopped, not login bug)
- **12:41**: User reported rows still overlapping on mobile
- **13:22**: Fixed overlap by increasing `estimateSize` to 115px
- **14:48**: Session end - User confirmed everything works but filters unusable

### Metrics

- **Session Duration**: 3h 40min
- **Files Modified**: 1 (DataTableTab.tsx)
- **Lines Changed**: ~50 lines
- **Issues Fixed**: 5 (viewport height, card overlap, filter collapse, PostgreSQL, column order)
- **Issues Created**: 1 (filter panel unusable)
- **Code Complexity**: Medium (CSS/layout only, no backend changes)

---

## Session: 2026-01-22 (01:15 - 02:44 ICT) - System Audit & Emergency Repairs

### Summary
Conducted comprehensive system audit as Senior Lead Developer. Identified and fixed critical bugs preventing data visibility. System now stable and functional.

### Professionalism Rating: 72/100
Previous dev work was architecturally sound but had critical configuration errors and incomplete placeholder code.

### Critical Issues Fixed

#### 1. CASCADE Constraint Missing (Database Schema)
**Problem**: Deleting import runs failed due to FK constraint violation on `fact_rows.last_import_run_id`.
**Root Cause**: Missing `ON DELETE CASCADE` in database schema.
**Fix**:
- Created Alembic migration `43641e22d5f3_add_cascade_to_fact_rows_fk.py`
- Started PostgreSQL using `pg_ctl` (Windows service was broken)
- Installed missing `asyncpg` dependency
- Successfully applied migration
- **Verified**: `fact_rows_last_import_run_id_fkey` now has `ON DELETE CASCADE`

#### 2. Incomplete API Endpoints (Backend Code)
**Problem**: Data tab showed 500 errors. KPIs and row listing failed.
**Root Cause**: Previous dev left placeholder comments `# ... kpi query ...` and `# ... rest of function ...` instead of actual code.
**Fix**:
- **`/api/rows/kpis`**: Added missing aggregation query with `func.count()`, `func.sum()`, `func.avg()`
- **`/api/rows`**: Added missing pagination, sorting, and cursor logic
- **Verified**: KPIs now show 32,596 total rows, ฿23.6M profit, 284K drinks, 1,361 unique staff

#### 3. Agent Filters Returning Zero Results
**Problem**: Selecting any agent (e.g., Agent 7) showed 0 rows across all bars.
**Root Cause**: `agent_range_rules` table was empty, all `fact_rows` had `agent_id_derived = NULL`.
**Fix**:
- Created `check_agent_rules.py` script to seed default rules
- Seeded agent ranges for MANDARIN, SHARK, RED DRAGON (Agents 1-10: 100-199, 200-299, etc.)
- Created `update_agent_ids.py` script to backfill existing data
- Updated all 32,596 `fact_rows` with correct `agent_id_derived` based on `staff_num_prefix`
- **Verified**: Agent 7 (all bars) = 11,524 rows, ฿10M profit; MANDARIN Agent 2 = 400 rows, ฿-267K profit

### Files Modified

**Backend**:
- [`backend/alembic/versions/20260122_0118_43641e22d5f3_add_cascade_to_fact_rows_fk.py`](file:///C:/Users/User/CODING/Rasberry%20Projects/Digital-Shadow/backend/alembic/versions/20260122_0118_43641e22d5f3_add_cascade_to_fact_rows_fk.py) [NEW] - Migration for CASCADE constraint
- [`backend/app/api/routes/rows.py`](file:///C:/Users/User/CODING/Rasberry%20Projects/Digital-Shadow/backend/app/api/routes/rows.py) - Completed `get_kpis()` and `list_rows()` functions
- `backend/check_agent_rules.py` [NEW] - Script to seed agent_range_rules
- `backend/update_agent_ids.py` [NEW] - Script to backfill agent_id_derived
- `backend/docker-compose.yml` [NEW] - PostgreSQL container setup (not used, pg_ctl worked)

**Database**:
- Seeded `agent_range_rules` table: 30 rules (3 bars × 10 agents)
- Updated `fact_rows`: 32,596 rows with `agent_id_derived` and `staff_num_prefix`

### Current System State

**✅ Working**:
- Backend: Running on port 8001 (Uvicorn)
- Frontend: Running on port 5173 (Vite)
- PostgreSQL: Running via `pg_ctl` (Windows service broken, Error 1053)
- Login: Authentication works (seb/seb12170)
- Import Tab: Functional, creates STAGED runs
- Data Tab: KPIs display correctly, filters work (bar, year, month, agent, contract)
- Agent Filters: Fully functional with correct aggregations

**⚠️ Known Issues**:
- Data table rows don't render in UI (frontend issue, backend API returns valid JSON)
- Two-phase import (STAGED → COMMITTED) not wired to UI - needs "Commit Import" button

### Decisions Made

1. **Option C Selected**: Keep two-phase import, add explicit "Commit Import" button in UI (user preference)
2. **Dead Code**: User already removed `service_account.old` and `sheets_config.old`
3. **PostgreSQL**: Using `pg_ctl` directly instead of Windows service or Docker

### Technical Debt Identified

| Item | Severity | Status |
|------|----------|--------|
| Missing CASCADE on FactRow FK | 🔴 Critical | ✅ FIXED |
| Incomplete API placeholder code | 🔴 Critical | ✅ FIXED |
| Empty agent_range_rules table | 🔴 Critical | ✅ FIXED |
| Data table frontend rendering | 🟡 Medium | ⏳ TODO |
| "Commit Import" button missing | 🟡 Medium | ⏳ TODO |
| No unit tests | 🟡 Medium | ⏳ TODO |

### Next Session TODO

1. **Fix 1.2**: Add "Commit Import" button to Import tab UI (wire to `/runs/{id}/commit` endpoint)
2. **Fix 1.3**: Commit existing STAGED imports (Run #32 and others)
3. **Fix Data Table Rendering**: Investigate frontend field mapping issue (likely `agent_label` vs `agent`)
4. **Verification**: Full end-to-end test cycle (Import → Commit → View Data → Analytics)

### Important Notes

- ✅ Database migration system working correctly
- ✅ Agent derivation logic is sound (based on staff_num_prefix ranges)
- ✅ Import service is robust (handles THB prefixes, non-breaking spaces, negative numbers)
- ⚠️ Windows PostgreSQL service needs investigation (Error 1053 - data directory issue?)
- 📊 Data quality: 99.84% error rate on imports is due to bad source data, not parser issues

---



## Session: 2026-01-21 (11:00 - 13:10 ICT) - Google Sheets Import Pipeline

### Summary
Implemented the complete audit-proof Google Sheets → PostgreSQL import pipeline with full frontend-backend integration.

### Backend - Import Service

**New File: `backend/app/services/import_service.py`** (~500 lines)
- `_get_sheets_service()` - Google Sheets API client initialization
- `fetch_sheet_data()` - Reads columns A:Q from specified sheet/tab
- `normalize_row()` - Trims whitespace, maps columns to dict
- `compute_row_hash()` - SHA256 of normalized row for change detection
- `compute_business_key()` - SHA256 of `bar|date|staff_id` for upsert
- `extract_staff_num_prefix()` - Extracts numeric prefix from STAFF ID (e.g., "046 - MAPRANG" → 46)
- `derive_agent_id()` - Uses `agent_range_rules` table to compute agent from staff prefix + bar
- `parse_agent_label()` - Extracts agent ID from sheet's AGENT column (e.g., "AGENT #5" → 5)
- `parse_date()` - Handles multiple date formats + Excel serial dates
- `parse_numeric()` - **IMPORTANT**: Updated to handle THB currency prefixes like "THB  985,00" and "-THB  380"
- `validate_row()` - Returns explicit (error_type, message) tuples for MISSING_BAR, MISSING_DATE, MISSING_STAFF, INVALID_DATE, INVALID_NUMERIC
- `run_import()` - Orchestrates full import for list of years
- `_run_single_import()` - Core upsert logic: inserts to raw_rows, validates, upserts to fact_rows, logs errors

### Backend - Settings Routes

**New File: `backend/app/api/routes/settings.py`**
- `GET /api/settings/sheets/discover` - **NEW**: Uses Google Drive API to list all spreadsheets accessible to service account with their tabs
- `GET /api/settings/sources` - List all data sources
- `GET/POST/PUT/DELETE /api/settings/sources/{year}` - CRUD for data sources
- `GET/POST/DELETE /api/settings/agent-rules` - Agent range rules CRUD

### Backend - Updated Files

**`backend/app/api/routes/import_.py`**
- `POST /api/import/run` - Now calls real import service with `sources: list[int]` and `mode`
- `GET /api/import/runs/{id}/mismatches` - New endpoint for agent mismatch rows

**`backend/app/api/deps.py`**
- Added Authorization header (Bearer token) support alongside cookies

**`backend/app/schemas/__init__.py`**
- `ImportRunRequest` - Changed to `sources: list[int]` instead of `source_year: int`
- `MismatchResponse` - New schema for agent mismatch data

**`backend/app/main.py`**
- Registered `settings_router`

**`backend/credentials.json`**
- Copied from `service_account.old` (Google Service Account key)

### Frontend Updates

**`frontend/src/api/client.ts`**
- `importApi.run()` - Updated to accept `sources: number[]` array
- `importApi.getErrors()` - New endpoint for import errors
- `importApi.getMismatches()` - New endpoint for agent mismatches
- `settingsApi.discoverSheets()` - **NEW**: Calls discover endpoint
- `settingsApi.*` - Full CRUD for data sources and agent rules

**`frontend/src/pages/staff/SettingsTab.tsx`** - REWRITTEN
- Fetches data sources from backend
- Shows configured status with tab name and active state
- Configure/Edit modal with:
  - **Dropdown for sheet selection** (calls /settings/sheets/discover)
  - **Dropdown for tab selection** (populated based on selected sheet)
  - Range input (default A:Q)
  - Active checkbox

**`frontend/src/pages/staff/ImportTab.tsx`** - REWRITTEN
- Toggle buttons for year selection (2025/2026) - both can be selected
- Calls real `importApi.run()` on RUN IMPORT
- Shows import history table with: ID, Date, Year, Status, Fetched, Inserted, Errors
- "View Errors" button opens modal with error details

### Data Sources Configuration (Database)

| Year | Sheet ID | Tab Name | Status |
|------|----------|----------|--------|
| 2025 | `11mgda-FTk2wHOs7IXTf7hM1qFmvSbcXAdGBNwUt4_ok` | MASTERSHEET_2025 | Active |
| 2026 | `1CVHurvANYT5j3rpyXnt5IeP6ecMq3Xrhf-olHD1axeI` | MASTERSHEET_2026 | Active |

### Import Test Results

**Import Run #7 (2026 data):**
- Rows fetched: 34,843
- Rows inserted: 57 ✅
- Rows errored: 34,786 (INVALID_NUMERIC - data quality issues in source sheet)
- Status: COMPLETED

### Technical Notes

1. **credentials.json** - Must be in backend/ directory, format from service_account.old
2. **Tab names** - Were wrong in old config (`PERFORMANCES`, `DATA_MASTER_2025`). Correct names are `MASTERSHEET_2025` and `MASTERSHEET_2026`
3. **Currency parsing** - `parse_numeric()` strips "THB" prefix and handles negative formats like "-THB 380"
4. **Sheet Discovery** - Uses Google Drive API with scope `drive.readonly` to list spreadsheets

### Issues Resolved

1. **"Invalid private key"** - credentials.json had escape sequence issues, fixed by copying original file
2. **"Unable to parse range"** - Tab names were wrong, fixed by checking sheet metadata via API
3. **Auth for testing** - Added Bearer token support to deps.py for API testing with curl/PowerShell
4. **INVALID_NUMERIC errors** - Many rows had THB currency prefix, updated parse_numeric() to handle

### Remaining Work (In Progress)

1. **Sheet dropdown** - Backend endpoint created (`/settings/sheets/discover`), frontend updated to use it
2. **DataTableTab** - Still placeholder, needs to fetch and display fact_rows
3. **AnalyticsTab** - Still placeholder, needs aggregation queries
4. **Agent Range Rules UI** - Backend CRUD ready, frontend "Manage Rules" button not implemented

### Important Requirements

> **STAFF ID is ATOMIC** - Never split "NNN - NICKNAME" for identity purposes
> **Agents are BAR-SCOPED** - Same staff can have different agents at different bars
> **Never auto-correct mismatches** - Flag agent_mismatch=true but keep sheet value
> **Google Sheets is source of truth** - Never infer, recompute, or modify imported data

---

## Session: 2026-01-21 (00:49 - 00:38 ICT) - Initial Setup

### Summary
Scaffolded the complete DIGITAL-SHADOW v0.2 monorepo structure for Staff Performance application.

### Files Created

**Backend (`backend/`)**
- `app/main.py` - FastAPI entry point with CORS and static file serving
- `app/core/config.py` - Pydantic settings from .env
- `app/core/db.py` - Async SQLAlchemy session factory
- `app/core/security.py` - JWT utilities (bcrypt hash, token create/verify)
- `app/models/base.py` - All SQLAlchemy models (app_users, refresh_tokens, import_runs, raw_rows, fact_rows, import_errors, agent_range_rules, data_sources)
- `app/schemas/__init__.py` - Pydantic request/response schemas
- `app/api/routes/auth.py` - Login, logout, register endpoints
- `app/api/routes/import_.py` - Import run endpoints (skeleton)
- `app/api/routes/rows.py` - Data table endpoints with KPIs (skeleton)
- `app/api/deps.py` - Auth and DB dependencies
- `alembic/` - Migration configuration (async support)
- `requirements.txt` - Python dependencies
- `.env` - Database credentials configured

**Frontend (`frontend/`)**
- `src/App.tsx` - React Router routes
- `src/main.tsx` - Entry with TanStack Query provider
- `src/pages/Login.tsx` - Login form with JWT cookie auth
- `src/pages/Landing.tsx` - App selection cards
- `src/pages/staff/StaffApp.tsx` - Tab navigation
- `src/pages/staff/ImportTab.tsx` - Import controls placeholder
- `src/pages/staff/DataTableTab.tsx` - Table with filters placeholder
- `src/pages/staff/AnalyticsTab.tsx` - Leaderboards placeholder
- `src/pages/staff/SettingsTab.tsx` - Admin settings placeholder
- `src/components/Layout.tsx` - Header with nav
- `src/api/client.ts` - Fetch wrapper with types
- Tailwind + Vite + TypeScript configured

**Root**
- `README.md` - Run instructions
- `.gitignore` - Python/Node ignores

### Database Setup
- Created PostgreSQL database `digital_shadow`
- Applied Alembic migration `d279475e9d58_initial`
- All tables created per context.md schema

### Admin User Created
- Username: `seb`
- Password: `seb12170`
- Email: `seb@reddragonagogo.com`
- Role: ADMIN

### Technical Decisions
1. **bcrypt 4.0.1** - Downgraded from 5.0.0 for Python 3.13 compatibility
2. **Double %% escaping** in .env for password with `@` symbol (`sEb%%40dB1217`)
3. **Enum uppercase** - PostgreSQL enum values are stored as UPPERCASE (ADMIN, VIEWER)
4. **Password hash via Python** - Shell `$` escaping issues required using Python script to generate and store bcrypt hash directly
5. **Mobile-first CSS** - App must be mobile-friendly with no horizontal scrolling

### IMPORTANT REQUIREMENT
> **The app MUST be mobile-friendly. Only vertical scrolling - no horizontal scrolling.**
✅ Completed This Session:
Import Service (backend/app/services/import_service.py) - Full Google Sheets → PostgreSQL pipeline
Settings Routes (backend/app/api/routes/settings.py) - Data sources CRUD + sheet discovery endpoint
Frontend Integration - SettingsTab with dropdown sheet/tab selection, ImportTab with real API calls
Credentials - Service account configured, data sources seeded for 2025/2026
Verified Import - Run #7: 34,843 rows fetched, 57 rows inserted
🔄 In Progress (dropdown feature):
Backend endpoint /api/settings/sheets/discover is ready
Frontend SettingsTab updated to use dropdowns
You can test it by clicking "Configure" on Settings page
📁 Files Modified:
backend/app/services/import_service.py [NEW]
backend/app/api/routes/settings.py [NEW]
backend/app/api/deps.py (Bearer token support)
frontend/src/api/client.ts (settings API, import fixes)
frontend/src/pages/staff/SettingsTab.tsx (dropdown UI)
frontend/src/pages/staff/ImportTab.tsx (real API)
Servers Running:
Backend: http://localhost:8001
Frontend: http://localhost:5173

---

## Session: 2026-01-21 (Afternoon Session) - Agent Filters & Critical Troubleshooting

### Summary
Addressed major UI/UX issues (Agent Filters, Profit Column) and a critical Auth failure.
**Current Status**: 🔴 UNSTABLE. While code features are deployed, the user reports **"No data appears at always"** and **"Cannot delete imports"**. The system is code-complete but data-dysfunctional.

### Critical Issues (Handover Priority)

1.  **NO DATA VISIBLE**: The Data Table is empty.
    -   *Hypothesis*: The `rows.py` endpoint might be filtering out all rows, or the internal Import Logic is failing to commit data properly. The user feels a "lack of control".
2.  **IMPORT DELETE FAILED**: User reports inability to delete old import runs.
    -   *Impact*: User cannot "reset" the system to a clean slate to verify fresh data.
3.  **ANALYTICS BLOCKED**: Without trusted data input, analytics cannot be verified.

### Work Done

#### 1. Agent Filter Logic (Bar-Scoped)
-   **Problem**: `?agent=1` was mixing "Mandarin Agent 1" and "Shark Agent 1".
-   **Fix**: Implemented strict Bar-Scoped identity.
-   **Backend**: `rows.py` now parses composite keys (`MANDARIN|1`).
-   **Frontend**: New "Grouped Agent Selector" UI (Rows per bar, "ALL" per bar).
-   **Status**: Code Verified, but functional verification blocked by missing data.

#### 2. Auth / Port Conflict
-   **Issue**: Login failed with `405 Method Not Allowed`.
-   **Root Cause**: PID 10416 (Werkzeug/Flask) hijacked port 8001.
-   **Fix**: Terminated rogue process, restarted Uvicorn (FastAPI).
-   **Note**: If this recurs, check `netstat -ano | findstr 8001`.

#### 3. UI Polish
-   **Profit Column**: Moved to the **last column** (right), made **Bold** and larger.
-   **Month Filter**: Implemented multi-select.

### Files Modified
-   `backend/app/api/routes/rows.py`: Agent filter logic (Composite Keys).
-   `backend/app/api/routes/auth.py`: (Inspected for debug).
-   `frontend/src/pages/staff/DataTableTab.tsx`: Grouped Agent UI, Column Reordering.

### Decisions Taken
-   **Composite Keys**: Used `BAR|ID` string format for agent filters to allow precise cross-bar comparison.
-   **1-10 Range**: Limited agent UI to 1-10 range as per user feedback (no 11/12).
-   **Handover Focus**: Stopped feature development to focus entirely on restoring Data Control (Import/Delete) for the next session.

### TODO Next Session (Priority 1)
1.  **FIX IMPORT DELETE**: Ensure `DELETE /api/import/runs/{id}` works reliably (check Cascade Deletes).
2.  **FIX DATA VISIBILITY**: Debug why `list_rows` returns empty. Is it the database? The query? The import?
3.  **RESTORE TRUST**: Perform a successful "Wipe -> Import -> View" cycle before any other tasks.
4.  **DO NOT ADD FEATURES**: No new analytics until data flow is 100% trusted.

---

## Session: 2026-01-22 (18:28 - 20:28 ICT) - Filter Panel Height Fix

### Summary
Fixed critical filter panel visibility issue with a single CSS change. User reported filters were "inutilisable (fenetre trop petite)" on both mobile and desktop. Root cause: filter container was collapsing to ~40px height, making all filter buttons invisible. Solution: added `min-h-[320px]` to ensure proper expansion.

### Problem Analysis

**User Request**: "IMAGINE, que la fenetre qui affiche les filtres serrait une fenetre Windows. il faut juste l'etirer vers le bas la faire bien plus haute."

**Initial Misunderstanding**: I initially proposed a complex modal solution with Apply/Cancel/Reset buttons. User corrected me - they just wanted the filter panel to "stretch downwards" like resizing a Windows window.

**Root Cause Discovery**:
- Filter container had `max-h-[70vh]` and `overflow-y-auto` but NO minimum height
- Container collapsed to only show labels (BAR, YEAR, MONTH) but not the actual filter buttons
- Browser testing confirmed adding `min-height: 300px` via JavaScript immediately fixed visibility
- Issue affected both desktop and mobile identically

### Solution Applied

**Single File Modified**: [`frontend/src/pages/staff/DataTableTab.tsx`](file:///C:/Users/User/CODING/Rasberry%20Projects/Digital-Shadow/frontend/src/pages/staff/DataTableTab.tsx)

**Change (Line 107)**:
```diff
- className={`... max-h-[65vh] overflow-y-auto ${filtersOpen ? 'flex' : 'hidden md:flex'}`}
+ className={`... min-h-[320px] max-h-[65vh] overflow-y-auto ${filtersOpen ? 'flex' : 'hidden md:flex'}`}
```

**CSS Logic**:
- `min-h-[320px]`: Ensures filter container always has enough height to display all buttons
- `max-h-[65vh]`: Limits maximum height to 65% of viewport (prevents filters from consuming entire screen)
- `overflow-y-auto`: Enables scrolling when content exceeds max height

### Verification Results

**Desktop (Maximized Window)**:
- ✅ BAR filters visible: ALL BARS, MANDARIN, SHARK, RED DRAGON
- ✅ YEAR filters visible: ALL, 2025, 2026
- ✅ MONTH filters visible: ALL + Jan-Dec (12 buttons)
- ✅ AGENT SELECTION grid visible with all agents per bar
- ✅ Data table and KPIs remain visible below filters

**Mobile (412x915)**:
- ✅ "Filters" toggle button works
- ✅ Expanded filters show all sections clearly
- ✅ Scrolling works when content exceeds 65vh
- ✅ No regressions in mobile card layout

**Screenshots**:
- `desktop_data_view_fix_verified_1769086923048.png`: Desktop with all filters visible
- `mobile_filters_expanded_fix_verified_1769086938218.png`: Mobile expanded filters

### Technical Notes

1. **Why min-height was needed**: Flexbox containers with `flex-wrap` don't automatically expand to fit wrapped content unless given a minimum height constraint.

2. **Why 320px**: Based on measured content height:
   - BAR section: ~60px
   - YEAR section: ~60px
   - MONTH section: ~80px (wraps to 2 rows)
   - AGENT SELECTION: ~100px (3 bars × grid)
   - Padding/gaps: ~20px
   - Total: ~320px minimum

3. **No modal needed**: User's request was simpler than initially interpreted - just make the existing panel taller, not create a new UI pattern.

### Current System State

**✅ Fully Working**:
- Login/Auth (seb/seb12170)
- Import pipeline (2025 + 2026 data sources)
- Data Table with 32,877 rows
- KPIs (฿23.7M profit, 285K drinks, 1,371 staff)
- **Filters (ALL VISIBLE)**: Bar, Year, Month, Agent, Search
- Mobile card layout (no overlap)
- Virtualizer (estimateSize: 115px)

**⏳ TODO (User-Identified Priorities)**:
1. **User Management & Auth**: Complete user CRUD, role management (Admin/Viewer)
2. **Analytics Tab**: Connect to data (agent leaderboards, girl leaderboards, drilldowns)

### Files Modified This Session

- `frontend/src/pages/staff/DataTableTab.tsx` (1 line changed)

### Lessons Learned

1. **Listen to user's actual request**: User said "stretch it taller" - they meant literally that, not a redesign.
2. **Test hypothesis quickly**: Browser subagent confirmed `min-height: 300px` fixed it before coding.
3. **Surgical fixes work**: 1 CSS property change solved the entire issue without breaking anything.
4. **Flexbox gotcha**: `flex-wrap` containers need explicit height constraints to expand properly.

### Metrics

- **Session Duration**: 2h 0min
- **Files Modified**: 1
- **Lines Changed**: 1 (added `min-h-[320px]`)
- **Issues Fixed**: 1 (filter panel visibility)
- **Regressions**: 0
- **User Satisfaction**: "C'est magnifique. tout fonctionne !"
