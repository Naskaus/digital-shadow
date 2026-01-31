# 📘 WORKING PROFESSIONALLY WITH CLAUDE PROJECTS

## What You've Set Up (Excellent!)

You've created a **Claude Project** with attached documentation files. This is the professional way to work with Claude on long-term projects.

---

## ✅ CURRENT SETUP (What You Have)

### Project Files Attached
1. `Staff_Performance/PRD.md` - Product requirements
2. `Staff_Performance/context.md` - Business rules (READ ONLY)
3. `Staff_Performance/AI_Memory.md` - Session summaries
4. `Staff_Performance/protocols.md` - Development protocols
5. `CLAUDE.md` - Architecture and commands
6. `SECURITY.md` - Security policy
7. `README.md` - Project overview
8. `_SYSTEM_MANIFESTO_NASKAUS_ECOSYSTEM_v2_1.pdf` - Raspberry Pi deployment
9. **HANDOVER_2026-01-31.md** - This session's summary (NEW)
10. **NEXT_SESSION_PROMPT.md** - Quick start prompt (NEW)

### Benefits of This Approach
✅ Claude automatically loads context from these files  
✅ No need to re-explain the project each time  
✅ Consistent understanding across sessions  
✅ Easy to share with other developers  
✅ Version-controlled documentation  

---

## 🎯 RECOMMENDED WORKFLOW (Going Forward)

### 1. Start Each Session

**Copy-paste** the prompt from `NEXT_SESSION_PROMPT.md`:

```
You are a senior full-stack developer continuing work on the Digital Shadow...
[rest of prompt]
```

**Why**: This gives Claude instant context and asks for the milestone choice.

### 2. During Development

**Small Commits**:
```bash
# After each stable feature
git add .
git commit -m "feat: specific thing you added"
git push origin opus-repair-2026-01-31
```

**Test Locally**:
- Backend: http://localhost:8001/docs (Swagger)
- Frontend: http://localhost:5173
- Mobile: Chrome DevTools → Device Toolbar → Galaxy S20 (412×915)

**Update Docs**:
- Add notes to `AI_Memory.md` during session
- Update `CLAUDE.md` if architecture changes
- Never modify `context.md` (it's READ ONLY)

### 3. End Each Session

**When you say** "fin de session":

1. Claude creates a new HANDOVER file:
   - `HANDOVER_2026-02-01.md` (tomorrow's date)
   - Summary of what was done
   - Next steps
   
2. Claude appends to `AI_Memory.md`:
   - Session date and duration
   - Files modified
   - Decisions made
   - TODO for next session

3. You attach new HANDOVER to the project:
   - Go to Claude Projects
   - Attach `HANDOVER_2026-02-01.md`
   - Remove previous handover (keep latest only)

**Why**: Each session builds on the last with clear continuity.

---

## 📂 FILE ORGANIZATION IN PROJECT

### Core Governance (Never Delete)
- `Staff_Performance/context.md` - Business rules
- `Staff_Performance/PRD.md` - Feature specs
- `CLAUDE.md` - Dev guide
- `SECURITY.md` - Security policy

### Living Documents (Update Each Session)
- `Staff_Performance/AI_Memory.md` - Append new sessions
- `HANDOVER_YYYY-MM-DD.md` - Replace with latest

### Reference (Keep for Context)
- `README.md` - Project overview
- `_SYSTEM_MANIFESTO_*.pdf` - Deployment guide
- `NEXT_SESSION_PROMPT.md` - Quick start template

---

## 💡 PRO TIPS

### 1. Use Multiple Conversations

**Different Chats for Different Tasks**:

| Task | Chat Name | Model | Purpose |
|------|-----------|-------|---------|
| Main Development | "Digital Shadow - Dev" | Opus | Critical backend/database |
| UI Iteration | "Digital Shadow - UI" | Sonnet | Frontend components |
| Quick Questions | "Digital Shadow - Help" | Haiku | Documentation lookup |

**Why**: Keeps context windows clean, saves money.

### 2. Version Your Handovers

Instead of overwriting, rename old ones:

```
HANDOVER_2026-01-31_Milestone1_ContractTypes.md
HANDOVER_2026-02-01_Milestone2_Profiles.md
HANDOVER_2026-02-05_Milestone3_ManualEntry.md
```

**Why**: You can review past decisions.

### 3. Create Mini Checklists

Before each session, create `CHECKLIST.md`:

```markdown
# Session Checklist - 2026-02-01

## Before Starting
- [ ] Read HANDOVER_2026-01-31.md
- [ ] Backend running (port 8001)
- [ ] Frontend running (port 5173)
- [ ] Git status clean

## Goals Today
- [ ] Create Profile model
- [ ] Auto-migrate 1,371 staff
- [ ] Profile modal UI

## Definition of Done
- [ ] Tests pass
- [ ] Mobile UI tested (412×915)
- [ ] Committed and pushed
- [ ] HANDOVER updated
```

**Why**: Keeps you focused and organized.

### 4. Use Git Branches Strategically

**Pattern**:
```
main (production)
├── opus-repair-2026-01-31 (Milestone 1: Contract Types) ✅
├── opus-profiles-2026-02-01 (Milestone 2: Profiles) ⏳
├── opus-manual-entry-2026-02-05 (Milestone 3: Manual Entry) ⏳
└── opus-settings-2026-02-10 (Milestone 4: Versioning) ⏳
```

**Why**: Easy to isolate features, review PRs, rollback if needed.

---

## 🔄 EXAMPLE: Perfect Session Flow

### Day 1: Milestone 2 - Profiles

**1. Start** (9:00 AM)
```
You: [Paste NEXT_SESSION_PROMPT.md content]
Claude: I've read the handover. Ready to start Milestone 2 (Profiles)?
You: Yes, let's do it
Claude: [Proposes plan with commit points]
```

**2. Work** (9:15 AM - 11:30 AM)
- Create Profile model
- Write migration
- Test database
- Commit: "feat: add Profile model and migration"

**3. Lunch Break** (11:30 AM - 1:00 PM)
- Backend still running in terminal
- Frontend still running

**4. Resume** (1:00 PM - 3:30 PM)
- Auto-migrate 1,371 staff
- Create API endpoints
- Test with curl
- Commit: "feat: auto-migrate staff to profiles + API"

**5. Finish** (3:30 PM - 5:00 PM)
- Build profile modal UI
- Test on mobile viewport
- Commit: "feat: profile modal UI with job history"

**6. Session End** (5:00 PM)
```
You: fin de session
Claude: [Creates HANDOVER_2026-02-01.md]
Claude: [Appends to AI_Memory.md]
You: [Attaches HANDOVER to project]
You: [Removes old HANDOVER_2026-01-31.md]
```

**Result**: Clean handoff, ready to continue tomorrow.

---

## 🚨 COMMON MISTAKES TO AVOID

### ❌ Don't Do This

1. **Starting from scratch each time**
   - ❌ "I have a FastAPI app, help me add profiles"
   - ✅ Use NEXT_SESSION_PROMPT.md

2. **Forgetting to attach handovers**
   - ❌ Relying on conversation memory only
   - ✅ Attach HANDOVER files to project

3. **Mixing unrelated work in one branch**
   - ❌ Add profiles + manual entry + settings in one PR
   - ✅ One milestone per branch

4. **Not testing before committing**
   - ❌ Code → Commit → "Oh no, it's broken"
   - ✅ Code → Test → Commit

5. **Overwriting production .env**
   - ❌ Copy local .env to Raspberry Pi
   - ✅ Use deploy script (handles .env safely)

---

## 📊 METRICS (How to Measure Progress)

### After Each Session, Track:

| Metric | Target | How to Check |
|--------|--------|--------------|
| **Commits** | 3-5 per session | `git log --oneline` |
| **Tests Pass** | 100% | `pytest` (when you add tests) |
| **Mobile UI** | No horizontal scroll | Chrome DevTools → 412×915 |
| **Git Status** | Clean | `git status` |
| **Documentation** | Updated | AI_Memory.md has new entry |

### Milestone Progress:

```
Milestone 1: Contract Types       ████████████ 100% ✅
Milestone 2: Profiles             ░░░░░░░░░░░░   0% ⏳
Milestone 3: Manual Entry         ░░░░░░░░░░░░   0% ⏳
Milestone 4: Settings Versioning  ░░░░░░░░░░░░   0% ⏳
```

---

## 🎓 LEARNING RESOURCES

### For You (Next Steps)

1. **Practice Claude Code**
   - Follow the French guide: `to do list how to use claude (french).docx`
   - Key commands: `/init`, `/context`, `/compact`, `/clear`

2. **Git Best Practices**
   - Read: https://www.conventionalcommits.org/
   - Pattern: `feat:`, `fix:`, `docs:`, `refactor:`

3. **FastAPI Async Patterns**
   - Your code already uses async correctly
   - Reference: `backend/app/api/routes/*.py`

4. **React + TanStack Query**
   - Your code uses best practices
   - Reference: `frontend/src/pages/staff/*.tsx`

### For Claude (AI Colleagues)

When another AI takes over this project:

1. **Read** HANDOVER first (complete context)
2. **Read** context.md (business rules)
3. **Read** CLAUDE.md (architecture)
4. **Ask** for milestone choice before coding
5. **Follow** commit discipline (small, tested, pushed)

---

## ✅ FINAL RECOMMENDATIONS

### What You Should Do

**Daily**:
- [ ] Start with NEXT_SESSION_PROMPT.md
- [ ] Commit after each stable feature
- [ ] Test on mobile if UI changed

**Weekly**:
- [ ] Review AI_Memory.md (what was done)
- [ ] Update CLAUDE.md if architecture changed
- [ ] Backup database (`pg_dump`)

**Per Milestone**:
- [ ] Create new branch (e.g., `opus-profiles-2026-02-01`)
- [ ] Write tests for new features
- [ ] Create HANDOVER file at session end
- [ ] Deploy to staging/production

### What Claude Should Do

**Every Response**:
- Reference HANDOVER for context
- Propose plan before coding
- Explain decisions clearly
- Provide rollback steps

**After Major Changes**:
- Create commit with clear message
- Update documentation
- Suggest testing steps
- Flag breaking changes

---

## 🏁 YOU'RE READY!

### Your Current Status

✅ **Project Setup**: Complete  
✅ **Documentation**: Comprehensive  
✅ **Milestone 1**: Done (Contract Types)  
✅ **Security**: Hardened  
✅ **Git**: Clean and pushed  
✅ **Workflow**: Professional  

### Next Action

1. **Tomorrow**: Open Claude Projects
2. **Attach**: `HANDOVER_2026-01-31.md`
3. **Paste**: Prompt from `NEXT_SESSION_PROMPT.md`
4. **Choose**: Milestone 2 (Profiles) or deploy Milestone 1
5. **Code**: Follow Claude's plan step-by-step

---

**You've Got This!** 🚀

Remember: Small commits, test locally, ask questions, enjoy the process.

---

## 📞 Quick Reference

| Need | File | Location |
|------|------|----------|
| **Start prompt** | NEXT_SESSION_PROMPT.md | Project root |
| **Last session** | HANDOVER_2026-01-31.md | Project root |
| **Business rules** | context.md | Staff_Performance/ |
| **Features** | PRD.md | Staff_Performance/ |
| **Commands** | CLAUDE.md | Project root |
| **Security** | SECURITY.md | Project root |
| **Session history** | AI_Memory.md | Staff_Performance/ |

---

**END OF GUIDE**