# 🚀 NEXT SESSION - Quick Start Prompt

**Copy-paste this to start your next Claude session:**

---

## Prompt for Claude

```
You are a senior full-stack developer continuing work on the Digital Shadow Staff Performance app (FastAPI + React, deployed on Raspberry Pi 5).

CRITICAL CONTEXT FILES (attached to this project):
1. HANDOVER_2026-01-31.md - Read this FIRST (complete session summary)
2. Staff_Performance/context.md - Business rules (READ ONLY, never modify)
3. Staff_Performance/PRD.md - Feature requirements
4. CLAUDE.md - Development commands and architecture
5. SECURITY.md - Secrets management policy

CURRENT STATE:
- ✅ Milestone 1 COMPLETE: Contract Types CRUD (database + API + UI)
- ✅ Security remediation complete (API key rotated, docs created)
- ✅ Branch: opus-repair-2026-01-31 (pushed to GitHub)
- ✅ App running locally: Backend port 8001, Frontend port 5173
- ✅ Database: 32,877 fact_rows, 3 contract_types

NEXT MILESTONES (in order):
A) Staff/Agent Profiles (photos, contact info, job history modal)
B) Manual Data Entry (create job entries in-app)
C) Settings Versioning (effective-dated settings, no retroactive impact)
D) Deploy to Production (Raspberry Pi)

RULES:
- STAFF ID is atomic: "NNN - NICKNAME" (never split)
- Agents are bar-scoped (Agent #5 MANDARIN ≠ Agent #5 SHARK)
- Never infer/recompute data from Google Sheets
- Small commits, test locally before pushing
- User is new to Claude Code, guide step-by-step in French when requested
- Update Staff_Performance/AI_Memory.md only when user says "fin de session"

FIRST ACTION:
1. Confirm you've read HANDOVER_2026-01-31.md
2. Ask me which milestone (A/B/C/D) to work on next
3. Propose a detailed plan with commit points before coding
```

---

## User's Options for Next Session

### Option A: Profiles (Recommended Next)
**What**: Add detailed profiles for staff/agents with photos and job history.  
**Time**: 2-3 hours  
**Benefit**: Unlocks manual data entry (Milestone 3)

### Option B: Manual Entry
**What**: Create job entries directly in app (not just imports).  
**Time**: 3-4 hours  
**Requirement**: Profiles must exist first (do A then B)

### Option C: Settings Versioning
**What**: Make settings effective-dated to avoid retroactive changes.  
**Time**: 2-3 hours  
**Can do**: Independently (doesn't block other milestones)

### Option D: Deploy to Production
**What**: Push current changes (Contract Types) to Raspberry Pi.  
**Time**: 30-60 minutes  
**Risk**: Low (only additions, no breaking changes)

---

## Quick Verification Commands

```bash
# Check current state
git status
git branch  # Should be: opus-repair-2026-01-31

# Start backend
cd backend
source venv/bin/activate  # or .venv\Scripts\activate (Windows)
uvicorn app.main:app --reload --port 8001

# Start frontend
cd frontend
npm run dev

# Access app
# Backend API: http://localhost:8001/docs
# Frontend: http://localhost:5173
```

---

## File Locations Reference

**Backend**:
- Models: `backend/app/models/base.py`
- Routes: `backend/app/api/routes/`
- Migrations: `backend/alembic/versions/`
- Tests: `backend/test_*.py`

**Frontend**:
- Pages: `frontend/src/pages/staff/`
- API Client: `frontend/src/api/client.ts`

**Docs**:
- Context: `Staff_Performance/context.md` (READ ONLY)
- PRD: `Staff_Performance/PRD.md`
- Memory: `Staff_Performance/AI_Memory.md` (append only)
- Security: `SECURITY.md`
- Dev Guide: `CLAUDE.md`

---

## Success Criteria (How You Know It's Working)

✅ Backend runs without errors  
✅ Frontend loads at http://localhost:5173  
✅ Login works (seb / seb12170)  
✅ Settings → Contract Types shows 3 contracts  
✅ Data Table shows 32,877 rows  
✅ No security warnings in git

---

**Ready to Continue!** 🎯