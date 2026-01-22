# DIGITAL-SHADOW v0.2 — CONTEXT (READ ONLY)

## RULES (NON-NEGOTIABLE)
- This file is READ ONLY. Do not modify.
- Google Sheets is the single source of truth.
- Never infer missing data. Never recompute totals/profit/cuts.
- STAFF ID is atomic: "NNN - NICKNAME" (e.g., "046 - MAPRANG"). Store as-is (trim only). Never split for identity.
- Agents are BAR-SCOPED. "AGENT #5" in MANDARIN is not equal to "AGENT #5" in SHARK.
- Agent assignment is stable and determined by staff numeric prefix ranges (configurable per bar):
  - Agent 1: 100–199, Agent 2: 200–299, etc (default). Use agent_range_rules table.
- If sheet AGENT label disagrees with derived agent_id: flag mismatch; never auto-correct.
- No dead code. No leftover test scripts. Keep files small and modular.
- At end of session ONLY when Sebastien says "fin de session": append a summary in AI_Memory.md.

---

## PRODUCT SCOPE
Login/Auth -> Landing -> Staff Performance app (v0.2).
Accounting app is visible as placeholder only.

Staff Performance must include:
1) Import & QA (RUN IMPORT button; idempotent; audit logs)
2) Data table (Google-like: infinite scroll, virtualization, server-side filters/sort)
3) Analytics (agent/girl leaderboards + drilldowns)
4) Settings (admin only): sources + agent ranges + users

---

## DATA SOURCES
Two Google Sheets, same A->Q structure:
- Year 2025 sheet: (configured via settings)
- Year 2026 sheet: (configured via settings)

Columns A->Q:
A BAR
B DATE
C AGENT
D STAFF (atomic staff_id)
E POSITION
F SALARY
G START
H LATE
I DRINKS
J OFF
K CUT LATE
L CUT DRINK
M CUT OTHER
N TOTAL
O SALE
P PROFIT
Q CONTRACT

---

## DATABASE (PostgreSQL)
Tables:
- import_runs
- raw_rows (immutable staging; stores A->Q json + row_hash)
- fact_rows (business_key unique; derived fields; flags)
- import_errors
- app_users
- refresh_tokens/auth_sessions
- agent_range_rules (per bar)

business_key:
sha256(bar|date|staff_id)

Upsert logic:
- if row_hash unchanged: do nothing
- else update fact_rows and keep audit trail

---

## TECH STACK
Backend:
- FastAPI
- SQLAlchemy 2.0 + Alembic
- JWT cookies HttpOnly + refresh rotation
- Google Sheets API v4 client

Frontend:
- React + Vite + TypeScript
- Tailwind
- TanStack Table + TanStack Query + react-virtual

Deployment:
- Raspberry Pi 5
- Single service on port 8001 (staff.naskaus.com via cloudflared)
- FastAPI serves /api and the built frontend static files.

---

## KPIs
Agent leaderboard metrics:
- Volume: girls_count, staff_days
- Performance: profit_sum, profit_per_day, profit_avg_per_girl
- Constance: days_active, avg_days_per_girl
Agents are always bar-scoped: agent_key = bar|agent_id_derived.

Girl leaderboard metrics:
- profit_total, avg, best, low
- drinks_total, avg, best, low
- days_worked
- ROI proxies: profit_per_day, profit/salary if salary reliable

All aggregates MUST match current filters exactly.

---

## UI FLOW (CLICK BY CLICK)
Login -> Landing -> Staff Performance (tabs):
- Import&QA: select sources/mode/window -> RUN IMPORT -> view stats/errors
- Data Table: filters/search -> KPI strip -> virtualized table -> row detail drawer
- Analytics: agent leaderboard -> agent drilldown; girls leaderboard -> girl drilldown
- Settings (admin): sources config; agent ranges CRUD; users management
