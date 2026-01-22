# Audit-Proof Import Pipeline Implementation

Implement a Google Sheets → PostgreSQL import pipeline for Staff Performance data (2025/2026 sheets).

## User Review Required

> [!IMPORTANT]
> **Google credentials.json is missing.** I could not find credentials at `backend/credentials.json`. Please provide the Google Service Account JSON file before I can run end-to-end tests.

> [!IMPORTANT]
> **Data Source Configuration.** Before first import, you'll need to add entries to `data_sources` table with the actual Google Sheet IDs and tab names for 2025/2026.

---

## Proposed Changes

### Import Service

#### [NEW] [import_service.py](file:///c:/Users/User/CODING/Rasberry%20Projects/Digital-Shadow/backend/app/services/import_service.py)

Core import logic implementing:

```python
class ImportService:
    # Google Sheets API client
    async def fetch_sheet_data(source: DataSource) -> list[list[str]]
    
    # Deterministic normalization: trim whitespace, normalize A:Q
    def normalize_row(row: list[str]) -> dict[str, str | None]
    
    # SHA256 hash of normalized row for change detection
    def compute_row_hash(normalized: dict) -> str
    
    # SHA256 of (bar|date|staff_id) for business key
    def compute_business_key(bar: str, date: str, staff_id: str) -> str
    
    # Extract numeric prefix from staff_id "NNN - NICKNAME"
    def extract_staff_num_prefix(staff_id: str) -> int | None
    
    # Derive agent_id from prefix using agent_range_rules
    async def derive_agent_id(db, bar: str, prefix: int) -> int | None
    
    # Validate row, return list of errors (empty if valid)
    def validate_row(normalized: dict) -> list[tuple[str, str]]  # (error_type, message)
    
    # Main orchestrator
    async def run_import(db, sources: list[int], mode: str, window_days: int | None) -> ImportRun
```

**Data Rules Enforced** (per context.md):
- Google Sheets is single source of truth
- Never infer missing data, never recompute totals/profit/cuts
- STAFF ID stored as-is (trim only), no splitting
- Agents are BAR-SCOPED (bar|agent_id is unique identity)
- `agent_id_derived` computed from `staff_num_prefix` via `agent_range_rules`
- If sheet AGENT disagrees with derived: flag `agent_mismatch=True`, never auto-correct

---

### API Routes

#### [MODIFY] [import_.py](file:///c:/Users/User/CODING/Rasberry%20Projects/Digital-Shadow/backend/app/api/routes/import_.py)

Update existing skeleton routes:

1. **`POST /api/import/run`** - Connect to real import service
   - Accept `sources` (list of year IDs), `mode`, optional `window_days`
   - Trigger synchronous import (can be made async later)
   - Return full [ImportRunResponse](file:///c:/Users/User/CODING/Rasberry%20Projects/Digital-Shadow/backend/app/schemas/__init__.py#63-80)

2. **Add `GET /api/import/runs/{id}/mismatches`** - New endpoint
   - Return fact_rows where `agent_mismatch=True` for the given import run

---

### Updated Schemas

#### [MODIFY] [__init__.py](file:///c:/Users/User/CODING/Rasberry%20Projects/Digital-Shadow/backend/app/schemas/__init__.py)

Update [ImportRunRequest](file:///c:/Users/User/CODING/Rasberry%20Projects/Digital-Shadow/backend/app/schemas/__init__.py#58-61) to match API spec:
```python
class ImportRunRequest(BaseModel):
    sources: list[int]  # List of DataSource.year values
    mode: ImportMode = ImportMode.FULL
    window_days: int | None = None  # For incremental mode
```

Add `MismatchResponse`:
```python
class MismatchResponse(BaseModel):
    id: int
    bar: str
    date: datetime
    staff_id: str
    agent_label: str | None
    agent_id_derived: int | None
```

---

## Verification Plan

### Automated Tests

**Prerequisites:**
1. Place `credentials.json` at `backend/credentials.json`
2. Ensure PostgreSQL `digital_shadow` database is running
3. Add test data sources via API or direct DB insert

**End-to-End Test Commands:**
```bash
cd backend

# 1. Verify migrations apply cleanly
alembic upgrade head

# 2. Start the server
uvicorn app.main:app --reload --port 8001

# 3. Login to get token (in another terminal)
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "seb", "password": "seb12170"}'

# 4. Trigger import run (use cookie from login response)
curl -X POST http://localhost:8001/api/import/run \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=<TOKEN>" \
  -d '{"sources": [2025, 2026], "mode": "full"}'

# 5. Check import run status
curl http://localhost:8001/api/import/runs \
  -H "Cookie: access_token=<TOKEN>"

# 6. Check for errors on a specific run
curl http://localhost:8001/api/import/runs/1/errors \
  -H "Cookie: access_token=<TOKEN>"

# 7. Check for agent mismatches
curl http://localhost:8001/api/import/runs/1/mismatches \
  -H "Cookie: access_token=<TOKEN>"
```

### Manual Verification

1. **Import completes without crash** - Check `status: "completed"` in response
2. **Row counts match** - Verify `rows_fetched` matches Google Sheet row count
3. **No data pollution** - Verify totals/profit/cuts are stored exactly as-is from sheet
4. **Mismatch flagging** - Verify rows with AGENT label mismatch show `agent_mismatch: true`
5. **Idempotency** - Run import twice; second run should show `rows_unchanged` > 0

---

## Open Questions for Sebastien

1. **Sheet IDs & Tab Names**: What are the actual Google Sheet IDs and tab names for 2025/2026 data?
2. **Agent Range Rules**: What are the initial agent_range_rules per bar? (e.g., Agent 1: 100-199, Agent 2: 200-299)
3. **Credentials**: Can you provide the `credentials.json` file for Google Sheets API access?
