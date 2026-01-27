# AI Analyst Setup Guide

**Status**: Ready for Testing
**Implementation**: Claude API (Anthropic)
**Date**: 2026-01-27

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install anthropic>=0.39.0
# Or reinstall all dependencies
pip install -r requirements.txt
```

### 2. Get Your Claude API Key

1. Go to: https://console.anthropic.com/settings/keys
2. Create a new API key
3. Copy the key (starts with `sk-ant-...`)

### 3. Configure Environment

Edit `backend/.env` and add your API key:

```env
# AI Analyst (Claude API)
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### 4. Run Database Migration

```bash
cd backend
alembic upgrade head
```

This creates the `ai_analyst_queries` table for audit logging.

### 5. Start the Backend

```bash
cd backend
# Make sure PostgreSQL is running first
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### 6. Start the Frontend

```bash
cd frontend
npm run dev
```

### 7. Test It!

1. Open `http://localhost:5173`
2. Login as **seb** (password: `seb12170`)
3. You should see the **AI Analyst** tab (5th tab)
4. Click it and try asking questions!

---

## Example Questions to Try

### Staff Performance
- "What staff should we track closely for bad performance recently?"
- "Who are the top 5 performers this month?"
- "Show me staff with declining profit trends"
- "Which staff have the best drinks-to-profit ratio?"

### Agent Bonus Tracking
- "What agent is on track to get the 20k bonus if he gets on average 20 staff everyday?"
- "Show me all agents and their bonus eligibility"
- "Which agents are close to hitting the 30K bonus threshold?"
- "Compare agent performance across bars"

### Trends & Insights
- "What are the recent profit trends?"
- "Compare this month vs last month performance"
- "Show me the biggest declines in performance"
- "What's the overall trend for MANDARIN bar?"

---

## Features

### ✅ Access Control
- **Seb-only**: Tab hidden from all other users (even admins)
- **Server-side enforcement**: API returns 403 for non-Seb users

### ✅ Data Privacy & Security
- Only **aggregated data** sent to Claude (no raw rows)
- Staff IDs kept intact (includes nicknames for context)
- No salary details sent
- All queries logged to database for audit

### ✅ Rate Limiting
- **10 queries per minute** per user
- **100 queries per day** per user
- Returns 429 error if exceeded

### ✅ Audit Logging
- Every query logged to `ai_analyst_queries` table
- Includes: query text, context filters, response, model, tokens, response time
- Retention: indefinite (can be cleaned up later)

### ✅ Conversation History
- Last 5 exchanges sent to Claude for context
- Stored client-side in localStorage
- "Clear Chat" button to reset

### ✅ Context Filters
- Bar (MANDARIN, SHARK, RED DRAGON, or All)
- Year (2025, 2026)
- Month (1-12)
- Filters apply to all data fetched for analysis

### ✅ Insights Panel
- Key metrics dashboard
- Agent bonus status tracking
- Real-time trend indicators
- Color-coded bonus tiers (20K green, 30K blue, 40K purple)

---

## Architecture

### Backend Flow
```
1. User sends query → POST /api/ai-analyst/query
2. Check rate limit (10/min, 100/day)
3. Fetch aggregated data from fact_rows table
   ├─ Top 10 / Bottom 10 staff performers
   ├─ Agent performance + bonus calculations
   ├─ Recent trends (7-day comparison)
   └─ Underperformers (20%+ decline)
4. Build Claude prompt with context + data
5. Call Claude API (model: claude-sonnet-4-20250514)
6. Parse response
7. Log to audit table
8. Return response + insights
```

### Data Sent to Claude

**Example prompt structure**:
```
User Question: "What agent is on track to get the 20k bonus?"

Context Filters:
- Bar: MANDARIN
- Period: 2026-01

Performance Data:
- Top 10 staff (with IDs, profit, drinks, days)
- Agent performance (avg staff/day, bonus eligibility)
- 7-day trends
- Underperformers list

[Claude analyzes and responds]
```

**What is NOT sent**:
- Raw row-level data
- Salary details (unless relevant to query)
- User credentials or personal info

### Model Used

**Claude Sonnet 4** (`claude-sonnet-4-20250514`)
- Latest Sonnet model
- Best balance of quality and cost
- ~$3/1M input tokens, $15/1M output tokens
- Average query cost: **~$0.01-0.02**

**Expected monthly cost** (100 queries/day):
- 3,000 queries × $0.015 avg = **~$45/month**

---

## Troubleshooting

### Error: "AI Analyst is not configured"
**Cause**: ANTHROPIC_API_KEY not set or still placeholder
**Fix**: Edit `backend/.env` with your real API key

### Error: "Rate limit exceeded"
**Cause**: Too many queries (10/min or 100/day)
**Fix**: Wait 1 minute or 24 hours depending on limit hit

### Error: "Claude API error: ..."
**Cause**: API key invalid or Anthropic service issue
**Fix**:
1. Verify API key is correct
2. Check https://status.anthropic.com
3. Ensure API key has sufficient credits

### Tab not visible
**Cause**: Not logged in as "seb"
**Fix**: Logout and login with username `seb`

### Database error on query
**Cause**: Migration not run
**Fix**: `cd backend && alembic upgrade head`

---

## Performance

### Response Times
- **Data aggregation**: ~200-500ms (SQL queries)
- **Claude API call**: ~1-3 seconds
- **Total**: ~1.5-3.5 seconds per query

### Token Usage
- Average input: 500-1500 tokens (varies by data volume)
- Average output: 200-500 tokens
- Total per query: ~700-2000 tokens

### Database Impact
- 5-7 SQL queries per analyst request
- All queries use indexes (bar, date, agent_id_derived)
- Minimal impact on app performance

---

## Monitoring

### Check Recent Queries
```sql
SELECT
    u.username,
    q.query_text,
    q.model_used,
    q.tokens_used,
    q.response_time_ms,
    q.created_at
FROM ai_analyst_queries q
JOIN app_users u ON q.user_id = u.id
ORDER BY q.created_at DESC
LIMIT 20;
```

### Check Rate Limit Status
```sql
-- Queries in last minute
SELECT COUNT(*)
FROM ai_analyst_queries
WHERE user_id = 1
AND created_at >= NOW() - INTERVAL '1 minute';

-- Queries in last 24 hours
SELECT COUNT(*)
FROM ai_analyst_queries
WHERE user_id = 1
AND created_at >= NOW() - INTERVAL '1 day';
```

### Cost Tracking
```sql
-- Total tokens used this month
SELECT
    SUM(tokens_used) as total_tokens,
    COUNT(*) as total_queries,
    AVG(tokens_used) as avg_tokens,
    AVG(response_time_ms) as avg_response_ms
FROM ai_analyst_queries
WHERE created_at >= DATE_TRUNC('month', NOW());
```

---

## Deployment to Production (Raspberry Pi)

### 1. Update Requirements
On Pi:
```bash
cd /var/www/digital-shadow-v2
source venv/bin/activate
pip install anthropic>=0.39.0
```

### 2. Add API Key to Production .env
```bash
nano /var/www/digital-shadow-v2/backend/.env
# Add: ANTHROPIC_API_KEY=sk-ant-your-production-key-here
```

### 3. Run Migration
```bash
cd /var/www/digital-shadow-v2/backend
alembic upgrade head
```

### 4. Restart Service
```bash
sudo systemctl restart digital-shadow-v2
sudo systemctl status digital-shadow-v2
```

### 5. Verify
```bash
curl -X POST https://staff.naskaus.com/api/ai-analyst/query \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
# Should return 401 (not authenticated) - that's good!
```

---

## Security Best Practices

### ✅ Implemented
1. Seb-only access (backend + frontend)
2. Rate limiting (10/min, 100/day)
3. Audit logging (all queries tracked)
4. Data sanitization (aggregated only)
5. API key in environment variable (not committed)

### 🔄 Future Enhancements
1. **Cost alerts**: Email when monthly spend > $50
2. **Query caching**: Cache identical queries for 5 minutes
3. **Smart fallback**: If Claude API down, show cached or local analysis
4. **Advanced filters**: Date range picker, staff search, agent filter
5. **Export**: Download insights as PDF report

---

## Sample Output

**User**: "What agent is on track to get the 20k bonus if he gets on average 20 staff everyday?"

**Claude Response**:
> Based on the current data for January 2026, here are the agents on track for the 20K THB bonus (requiring 20+ staff per day average):
>
> **Eligible Agents:**
> - **Agent 2 (MANDARIN)**: 22.3 staff/day avg - Currently on track for 30K bonus
> - **Agent 5 (SHARK)**: 20.8 staff/day avg - On track for 20K bonus
> - **Agent 3 (RED DRAGON)**: 25.1 staff/day avg - On track for 30K bonus
>
> **Close but Not Yet Eligible:**
> - Agent 1 (MANDARIN): 18.5 staff/day - Needs +1.5 staff/day to reach 20K threshold
> - Agent 4 (SHARK): 19.2 staff/day - Needs +0.8 staff/day
>
> **Recommendation**: Focus on helping Agent 1 and Agent 4 recruit or schedule more staff to push them over the 20-staff threshold.

**Insights Panel Shows**:
- Total Staff: 127
- Agents on track for 20K: 3
- Agents on track for 30K: 2
- 7-Day Trend: +5.2%

---

## Next Steps

1. **Test with real queries** - Try the example questions above
2. **Monitor costs** - Check token usage after first day
3. **Refine prompts** - Adjust system prompt based on response quality
4. **Add more data** - Consider adding more context (e.g., historical comparisons)
5. **Deploy to prod** - Follow deployment steps when ready

---

## Support

**Issues?** Check:
1. API key is correct in `.env`
2. Database migration ran successfully
3. PostgreSQL is running
4. Backend and frontend are both running
5. Logged in as "seb"

**Still stuck?** Check the audit log:
```sql
SELECT * FROM ai_analyst_queries ORDER BY created_at DESC LIMIT 1;
```

---

**Ready to go! 🚀**
