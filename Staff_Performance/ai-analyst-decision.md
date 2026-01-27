# AI Analyst Feature - Implementation Decision

**Status**: Experimental (Seb-only)
**Created**: 2026-01-27
**Current State**: UI + Access Control + Stub Implementation Complete

---

## Overview

The AI Analyst feature provides a conversational interface for analyzing staff and agent performance data. This document outlines two implementation approaches for the AI component.

**Current Implementation**: Stub responses (template-based) - fully functional UI with placeholder logic.

---

## Option A: Local Rules + Template Analyst

### Description
A deterministic, rule-based system that uses predefined heuristics, SQL queries, and response templates. No external AI services.

### How It Works
1. **Keyword Detection**: Parse user query for keywords (e.g., "top", "profit", "compare", "trend")
2. **Query Builder**: Map keywords + context filters → SQL queries against `fact_rows` table
3. **Data Processing**: Execute queries, compute aggregations (SUM, AVG, GROUP BY)
4. **Template Response**: Format results using predefined templates
5. **Insights Panel**: Display structured metrics (KPIs, tables, charts)

### Example Flow
```
User: "Who are the top 5 performers this month?"
↓
System detects: keyword="top", count=5, period=current_month
↓
SQL: SELECT staff_id, SUM(profit) as total_profit
     FROM fact_rows
     WHERE date >= '2026-01-01' AND date < '2026-02-01'
     GROUP BY staff_id
     ORDER BY total_profit DESC
     LIMIT 5
↓
Response template: "Here are the top 5 performers for January 2026:
1. 046 - MAPRANG (Profit: 45,200 THB)
2. ..."
```

### Pros
- ✅ **Zero cost**: No API fees
- ✅ **Fast**: Sub-second responses (pure SQL)
- ✅ **Predictable**: Deterministic output, no hallucinations
- ✅ **Private**: All data stays in-house
- ✅ **No rate limits**: Unlimited queries
- ✅ **Easy to debug**: Traceable logic

### Cons
- ❌ **Limited flexibility**: Only handles predefined query patterns
- ❌ **Manual maintenance**: Adding new questions requires code changes
- ❌ **No natural language understanding**: Strict keyword matching
- ❌ **Can't handle complex/novel queries**: Falls back to generic responses

### Implementation Effort
- **Backend**: ~2-3 days
  - Keyword parser (regex + fuzzy matching)
  - Query templates (10-15 common patterns)
  - Aggregation logic (reuse analytics code)
  - Response formatters
- **Frontend**: Already complete

### Best For
- Repeatable questions (e.g., "top performers", "monthly trends")
- Production stability
- Cost-sensitive environments
- When data privacy is critical

---

## Option B: LLM-Backed Analyst

### Description
Integrate with an external LLM API (OpenAI, Claude, etc.) to provide natural language understanding and flexible query generation.

### How It Works
1. **Context Preparation**: Serialize relevant data + filters → JSON payload
2. **LLM Prompt**: Send structured prompt with:
   - User question
   - Database schema summary
   - Sanitized performance metrics (aggregated, no PII)
   - Conversation history (last 5 messages)
3. **Response Parsing**: Extract LLM response → format for UI
4. **Insights Extraction**: Parse structured data from LLM (JSON mode)

### Example Prompt
```
You are a staff performance analyst. User asks: "Compare January vs December profit trends"

Context:
- Bar: MANDARIN
- Data available: 2025-01-01 to 2026-01-27
- Aggregated metrics:
  • January 2026: Total profit 1,250,000 THB (42 staff, avg 29,762 THB/staff)
  • December 2025: Total profit 1,180,000 THB (38 staff, avg 31,053 THB/staff)

Provide insights in JSON format:
{
  "message": "...",
  "insights": {
    "trend": "...",
    "metrics": {...}
  }
}
```

### Pros
- ✅ **Natural language**: Handles any phrasing, typos, follow-ups
- ✅ **Flexible**: Can answer novel questions without code changes
- ✅ **Contextual**: Understands conversation history
- ✅ **Smart insights**: Can detect patterns, suggest follow-ups
- ✅ **Low maintenance**: No need to code new query types

### Cons
- ❌ **Cost**: ~$0.01-0.10 per query (varies by model/length)
- ❌ **Latency**: 1-5 seconds per response
- ❌ **Unpredictable**: May hallucinate or misinterpret
- ❌ **Rate limits**: 60-500 requests/min (depending on tier)
- ❌ **External dependency**: Requires internet + API key
- ❌ **Privacy concerns**: Data leaves your infrastructure

### Security & Privacy Measures

**Critical Safeguards**:
1. **Data Sanitization**:
   - ❌ Never send raw `fact_rows` data
   - ✅ Only send aggregated metrics (SUM, AVG, COUNT)
   - ✅ Redact staff names → send only IDs (e.g., "046" instead of "046 - MAPRANG")
   - ✅ No salary details unless explicitly requested

2. **Rate Limiting**:
   - Max 10 queries/minute per user
   - Max 100 queries/day per user
   - Reject queries if tokens exceed 4000

3. **Audit Logging**:
   - Log every LLM request/response to database
   - Include: user_id, timestamp, query, tokens_used, cost
   - Retention: 90 days

4. **API Key Management**:
   - Store in `.env` (never commit)
   - Rotate monthly
   - Use read-only service account

5. **Error Handling**:
   - Fallback to "Unable to process query" on API failure
   - Never expose raw error messages (stack traces, SQL)

### Data Sent to LLM (Example)
```json
{
  "user_query": "Who are the top 5 performers?",
  "context": {
    "filters": {
      "bar": "MANDARIN",
      "year": 2026,
      "month": 1
    },
    "aggregated_data": {
      "top_staff": [
        {"id": "046", "profit": 45200, "drinks": 1200, "days": 20},
        {"id": "089", "profit": 42800, "drinks": 1150, "days": 22}
      ]
    }
  }
}
```

**What is NOT sent**:
- Raw row-level data
- Staff nicknames/names
- Exact timestamps
- User email/password

### Implementation Effort
- **Backend**: ~3-5 days
  - LLM API client (OpenAI SDK or Claude SDK)
  - Prompt engineering (iterative refinement)
  - Data sanitization layer
  - Rate limiting middleware
  - Audit log table + migration
  - Error handling + fallbacks
- **Frontend**: Already complete

### Recommended LLM Providers

| Provider | Model | Cost (per 1M tokens) | Latency | Notes |
|----------|-------|---------------------|---------|-------|
| **OpenAI** | GPT-4o | $2.50 input / $10 output | 2-4s | Best general performance |
| **Anthropic** | Claude Sonnet 3.5 | $3 input / $15 output | 1-3s | Best for structured data |
| **OpenAI** | GPT-4o-mini | $0.15 input / $0.60 output | 1-2s | Budget option (good enough) |

**Recommended**: Start with GPT-4o-mini for cost efficiency (~$0.01/query).

### Best For
- Exploratory analysis
- Power users who ask varied questions
- When flexibility > cost
- Prototyping insights before hardcoding in Option A

---

## Comparison Matrix

| Criterion | Option A (Local Rules) | Option B (LLM) |
|-----------|------------------------|----------------|
| **Cost** | $0/month | ~$10-50/month (assuming 500 queries) |
| **Response Time** | <500ms | 1-5s |
| **Flexibility** | Low (10-15 patterns) | High (unlimited) |
| **Accuracy** | 100% (for known queries) | 90-95% (may hallucinate) |
| **Privacy** | Full control | Data sent to 3rd party |
| **Maintenance** | Medium (add patterns manually) | Low (self-improving) |
| **Scalability** | Unlimited queries | Rate-limited (60-500 req/min) |
| **Failure Mode** | Graceful (fallback message) | Unpredictable (API outage) |

---

## Hybrid Approach (Recommended)

**Best of both worlds**: Start with Option A, add Option B for unhandled queries.

### Flow
```
User query → Keyword matcher (Option A)
  ├─ Match found? → Execute SQL template → Return response
  └─ No match? → Send to LLM (Option B) → Return response
```

### Benefits
- Fast & free for common queries (80% of use cases)
- LLM handles edge cases (20% of use cases)
- Cost-effective: ~$5-10/month
- Fallback safety: If LLM API is down, Option A still works

### Implementation
1. Deploy Option A first (1-2 weeks)
2. Collect unhandled query logs
3. Evaluate if LLM is needed based on:
   - Frequency of unhandled queries
   - User feedback
   - Budget approval
4. Add Option B as fallback layer (1 week)

---

## Current Status & Next Steps

### ✅ Completed (v0.5)
- Backend route with Seb-only authorization (`/api/ai-analyst/query`)
- Frontend chat UI with filters, history, insights panel
- Stub implementation (template responses)
- Local storage for chat history
- Mobile-responsive design

### 📋 Next Steps (Choose One)

**Path 1: Option A (Local Rules)**
1. Define top 10-15 query patterns from expected use cases
2. Implement keyword parser + SQL query builder
3. Create response templates
4. Test with real data
5. Deploy to production

**Path 2: Option B (LLM)**
1. Choose LLM provider (recommend GPT-4o-mini)
2. Set up API keys + environment variables
3. Implement data sanitization layer
4. Add rate limiting + audit logs
5. Prompt engineering + testing
6. Deploy with monitoring

**Path 3: Hybrid**
1. Start with Option A (2 weeks)
2. Monitor usage patterns
3. Add Option B selectively (1 week)

---

## Recommendation

**For production stability + cost control**: Start with **Option A (Local Rules)**.

- Low risk, zero ongoing cost
- Predictable performance
- Easy to debug and maintain
- Can always add LLM later if needed

**For maximum flexibility + innovation**: Go with **Option B (LLM)**, but:
- Implement all security safeguards
- Start with budget tier (GPT-4o-mini)
- Set strict rate limits
- Monitor costs daily

**For pragmatism**: **Hybrid** approach - deploy Option A now, evaluate LLM in 1 month based on user requests.

---

## Cost Estimates (Option B)

### Assumptions
- Average query: 500 input tokens + 200 output tokens
- GPT-4o-mini pricing: $0.15/1M input, $0.60/1M output
- Usage: 20 queries/day × 30 days = 600 queries/month

### Monthly Cost
```
Input:  600 queries × 500 tokens × $0.15/1M = $0.045
Output: 600 queries × 200 tokens × $0.60/1M = $0.072
Total:  ~$0.12/month (negligible)
```

Even with heavy usage (5000 queries/month), cost would be ~$1/month.

**Conclusion**: Cost is not a blocker for Option B if using budget tier.

---

## Appendix: Sample Query Patterns (Option A)

**Pattern 1: Top Performers**
- Keywords: "top", "best", "highest"
- SQL: `SELECT staff_id, SUM(profit) FROM fact_rows WHERE ... GROUP BY staff_id ORDER BY SUM(profit) DESC LIMIT N`

**Pattern 2: Bottom Performers**
- Keywords: "worst", "lowest", "bottom"
- SQL: Similar to top, but `ORDER BY ASC`

**Pattern 3: Agent Comparison**
- Keywords: "compare agents", "agent vs agent"
- SQL: `SELECT bar, agent_id_derived, SUM(profit), AVG(profit) FROM fact_rows WHERE ... GROUP BY bar, agent_id_derived`

**Pattern 4: Trend Analysis**
- Keywords: "trend", "over time", "monthly"
- SQL: `SELECT DATE_TRUNC('month', date), SUM(profit) FROM fact_rows WHERE ... GROUP BY DATE_TRUNC('month', date) ORDER BY month`

**Pattern 5: Staff Profile**
- Keywords: "tell me about", "performance of", "stats for"
- SQL: `SELECT * FROM fact_rows WHERE staff_id LIKE '%046%'` (aggregate stats)

---

## Questions for Seb

Before proceeding, please decide:

1. **Implementation choice**: Option A, B, or Hybrid?
2. **Timeline**: How quickly do you need this functional?
3. **Budget**: Is $5-10/month acceptable for Option B?
4. **Priority queries**: What are the top 5 questions you'd ask the analyst?
5. **Privacy stance**: OK to send aggregated data to LLM, or must stay local?

---

**Next**: Once decided, I can implement the chosen approach with full backend logic + testing.
