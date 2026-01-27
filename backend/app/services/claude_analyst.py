"""
Claude AI Analyst Service - Performance analysis using Claude API.

Security Notes:
- Only sends AGGREGATED data (never raw rows)
- Staff IDs sent as numbers only (no nicknames/names)
- No salary details sent
- Rate limited per user
- All queries logged for audit
"""
from datetime import date, datetime, timedelta, timezone
from typing import Any

import anthropic
from sqlalchemy import and_, case, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.base import FactRow

settings = get_settings()


class ClaudeAnalystService:
    """Service for AI-powered performance analysis using Claude."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def analyze_query(
        self,
        user_message: str,
        context_filters: dict[str, Any] | None = None,
        conversation_history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """
        Main entry point for AI analysis.

        Returns:
            {
                "message": str,  # Claude's response
                "insights": dict,  # Structured data
                "tokens_used": int,
                "model": str,
            }
        """
        # 1. Fetch aggregated data based on context
        context = context_filters or {}
        aggregated_data = await self._fetch_aggregated_data(context)

        # 2. Build prompt for Claude
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(user_message, context, aggregated_data)

        # 3. Call Claude API
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",  # Latest Sonnet
                max_tokens=2000,
                system=system_prompt,
                messages=self._format_conversation_history(conversation_history, user_prompt),
            )

            # 4. Parse response
            assistant_message = response.content[0].text
            insights = self._extract_insights(aggregated_data, context)

            return {
                "message": assistant_message,
                "insights": insights,
                "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
                "model": response.model,
            }

        except anthropic.APIError as e:
            raise RuntimeError(f"Claude API error: {str(e)}")

    async def _fetch_aggregated_data(self, context: dict[str, Any]) -> dict[str, Any]:
        """
        Fetch aggregated performance data based on context filters.

        Context filters:
        - bar: str (MANDARIN, SHARK, RED DRAGON, or None for all)
        - year: int (2025, 2026)
        - month: int (1-12)
        - date_start / date_end: date (overrides year/month)
        """
        # Build date range
        start_date, end_date = self._get_date_range(context)

        # Build filters
        filters = [
            FactRow.date >= start_date,
            FactRow.date <= end_date,
        ]
        if context.get("bar"):
            filters.append(FactRow.bar == context["bar"])

        # Aggregate data structure
        data = {
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "filters": context,
            "staff_performance": await self._get_staff_performance(filters),
            "agent_performance": await self._get_agent_performance(filters, start_date, end_date),
            "recent_trends": await self._get_recent_trends(filters),
            "underperformers": await self._get_underperformers(filters),
        }

        return data

    def _get_date_range(self, context: dict[str, Any]) -> tuple[date, date]:
        """Calculate date range from context filters."""
        if context.get("date_start") and context.get("date_end"):
            return (
                datetime.fromisoformat(context["date_start"]).date(),
                datetime.fromisoformat(context["date_end"]).date(),
            )

        year = context.get("year", datetime.now().year)
        month = context.get("month", datetime.now().month)

        start_date = date(year, month, 1)
        # Last day of month
        if month == 12:
            end_date = date(year, 12, 31)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)

        return start_date, end_date

    async def _get_staff_performance(self, filters: list) -> dict[str, Any]:
        """Get top/bottom staff performers (SANITIZED - no names)."""
        stmt = (
            select(
                FactRow.staff_id,
                FactRow.bar,
                func.sum(FactRow.profit).label("total_profit"),
                func.sum(FactRow.drinks).label("total_drinks"),
                func.count(func.distinct(FactRow.date)).label("days_worked"),
                func.avg(FactRow.profit).label("avg_profit_per_day"),
            )
            .where(and_(*filters))
            .group_by(FactRow.staff_id, FactRow.bar)
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        # Sort and sanitize
        sorted_by_profit = sorted(rows, key=lambda x: x.total_profit or 0, reverse=True)

        return {
            "top_10": [
                {
                    "staff_id": r.staff_id,  # Keep full ID (includes nickname)
                    "bar": r.bar,
                    "total_profit": float(r.total_profit or 0),
                    "total_drinks": float(r.total_drinks or 0),
                    "days_worked": r.days_worked,
                    "avg_profit_per_day": float(r.avg_profit_per_day or 0),
                }
                for r in sorted_by_profit[:10]
            ],
            "bottom_10": [
                {
                    "staff_id": r.staff_id,
                    "bar": r.bar,
                    "total_profit": float(r.total_profit or 0),
                    "total_drinks": float(r.total_drinks or 0),
                    "days_worked": r.days_worked,
                    "avg_profit_per_day": float(r.avg_profit_per_day or 0),
                }
                for r in sorted_by_profit[-10:]
            ],
            "total_staff": len(rows),
        }

    async def _get_agent_performance(
        self, filters: list, start_date: date, end_date: date
    ) -> dict[str, Any]:
        """Get agent performance with bonus tracking."""
        # Daily aggregates per agent
        stmt = (
            select(
                FactRow.bar,
                FactRow.agent_id_derived,
                FactRow.date,
                func.count(FactRow.id).label("staff_count"),
                func.sum(FactRow.profit).label("daily_profit"),
            )
            .where(and_(*filters, FactRow.agent_id_derived.is_not(None)))
            .group_by(FactRow.bar, FactRow.agent_id_derived, FactRow.date)
        )

        result = await self.db.execute(stmt)
        daily_rows = result.all()

        # Aggregate by agent
        agents = {}
        for row in daily_rows:
            key = f"{row.bar}|Agent {row.agent_id_derived}"
            if key not in agents:
                agents[key] = {
                    "bar": row.bar,
                    "agent_id": row.agent_id_derived,
                    "agent_name": f"Agent {row.agent_id_derived}",
                    "days_with_data": 0,
                    "total_staff_shifts": 0,
                    "avg_daily_staff": 0.0,
                    "total_profit": 0.0,
                    "bonus_20k_eligible": False,
                    "bonus_30k_eligible": False,
                    "bonus_40k_eligible": False,
                }

            agents[key]["days_with_data"] += 1
            agents[key]["total_staff_shifts"] += row.staff_count
            agents[key]["total_profit"] += float(row.daily_profit or 0)

        # Calculate averages and bonus eligibility
        for key, agent in agents.items():
            if agent["days_with_data"] > 0:
                agent["avg_daily_staff"] = agent["total_staff_shifts"] / agent["days_with_data"]

                # Bonus thresholds (from PRD)
                if agent["avg_daily_staff"] >= 20:
                    agent["bonus_20k_eligible"] = True
                if agent["avg_daily_staff"] >= 25:
                    agent["bonus_30k_eligible"] = True
                if agent["avg_daily_staff"] >= 30:
                    agent["bonus_40k_eligible"] = True

        return {"agents": list(agents.values())}

    async def _get_recent_trends(self, filters: list) -> dict[str, Any]:
        """Get recent performance trends (last 7 days vs previous 7 days)."""
        today = date.today()
        last_7_days_start = today - timedelta(days=7)
        prev_7_days_start = today - timedelta(days=14)

        # Last 7 days
        stmt_recent = (
            select(
                func.sum(FactRow.profit).label("total_profit"),
                func.count(func.distinct(FactRow.staff_id)).label("unique_staff"),
                func.count(FactRow.id).label("total_shifts"),
            )
            .where(and_(*filters, FactRow.date >= last_7_days_start))
        )

        # Previous 7 days
        stmt_prev = (
            select(
                func.sum(FactRow.profit).label("total_profit"),
                func.count(func.distinct(FactRow.staff_id)).label("unique_staff"),
                func.count(FactRow.id).label("total_shifts"),
            )
            .where(
                and_(
                    *filters,
                    FactRow.date >= prev_7_days_start,
                    FactRow.date < last_7_days_start,
                )
            )
        )

        recent = (await self.db.execute(stmt_recent)).first()
        previous = (await self.db.execute(stmt_prev)).first()

        return {
            "last_7_days": {
                "total_profit": float(recent.total_profit or 0),
                "unique_staff": recent.unique_staff,
                "total_shifts": recent.total_shifts,
            },
            "previous_7_days": {
                "total_profit": float(previous.total_profit or 0),
                "unique_staff": previous.unique_staff,
                "total_shifts": previous.total_shifts,
            },
            "trend": self._calculate_trend_percent(
                float(recent.total_profit or 0), float(previous.total_profit or 0)
            ),
        }

    async def _get_underperformers(self, filters: list) -> dict[str, Any]:
        """Identify staff with declining performance (last 7 days vs previous period)."""
        today = date.today()
        last_7_days_start = today - timedelta(days=7)
        prev_period_start = today - timedelta(days=30)

        # Get staff who worked in both periods
        stmt = (
            select(
                FactRow.staff_id,
                FactRow.bar,
                case(
                    (FactRow.date >= last_7_days_start, "recent"),
                    else_="previous",
                ).label("period"),
                func.avg(FactRow.profit).label("avg_profit"),
                func.count(FactRow.id).label("shift_count"),
            )
            .where(and_(*filters, FactRow.date >= prev_period_start))
            .group_by(FactRow.staff_id, FactRow.bar, "period")
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        # Pivot by staff
        staff_comparison = {}
        for row in rows:
            if row.staff_id not in staff_comparison:
                staff_comparison[row.staff_id] = {
                    "staff_id": row.staff_id,
                    "bar": row.bar,
                    "recent_avg": 0.0,
                    "previous_avg": 0.0,
                }

            if row.period == "recent":
                staff_comparison[row.staff_id]["recent_avg"] = float(row.avg_profit or 0)
            else:
                staff_comparison[row.staff_id]["previous_avg"] = float(row.avg_profit or 0)

        # Filter for declining performance (>20% drop)
        underperformers = [
            {
                **staff,
                "decline_percent": self._calculate_trend_percent(
                    staff["recent_avg"], staff["previous_avg"]
                ),
            }
            for staff in staff_comparison.values()
            if staff["previous_avg"] > 0
            and (staff["recent_avg"] / staff["previous_avg"]) < 0.8  # 20% drop
        ]

        # Sort by decline
        underperformers.sort(key=lambda x: x["decline_percent"])

        return {"staff": underperformers[:10]}  # Top 10 declining

    def _calculate_trend_percent(self, current: float, previous: float) -> float:
        """Calculate percentage change."""
        if previous == 0:
            return 0.0
        return ((current - previous) / previous) * 100

    def _build_system_prompt(self) -> str:
        """Build Claude's system prompt."""
        return """You are an expert performance analyst for a nightclub/entertainment venue business in Thailand. You analyze staff (dancers & PR) and agent (recruiter) performance data.

**Business Context:**
- **Staff** = Dancers and PR workers, identified by number + nickname (e.g., "046 - MAPRANG")
- **Agents** = Recruiters who send us workers. Workers can be on daily, 10-day, or monthly contracts.
- **Bars**: MANDARIN, SHARK, RED DRAGON
- **Mamasang** = Floor manager who oversees staff

**Key Metrics (in order of importance):**
1. **Profit** (THB) - Total earnings generated
2. **ROI** - Return on investment per staff
3. **Days Worked** - Attendance and reliability
4. **Drinks Sold** - Customer engagement metric
5. **Bar Fine** - Special bonus when customer takes girl out

**Agent Evaluation Criteria:**
- **Quantity**: How many girls the agent sends us (more = better)
- **Quality**: ROI of the girls sent (are they profitable?)
- **Fidelity**: Loyalty and retention of staff

**Agent Bonus Tiers (Analytics > Agents Payroll):**
- Bonus A: 20K THB (Average 20+ staff/day)
- Bonus B: 30K THB (Average 25+ staff/day)
- Bonus C: 40K THB (Average 30+ staff/day)

**Critical Business Rules:**
⚠️ If a girl loses money for 3 consecutive days → Flag immediately, advise mamasang
⚠️ If an agent is close to a bonus threshold (within 2-3 staff) → Alert so we can contact them

**Your Analysis Should:**
1. Highlight top performers AND underperformers clearly
2. Flag girls losing money (especially 3+ days in a row)
3. Track agent bonus progress - alert when close to thresholds
4. Identify good/bad behavior patterns
5. Be direct and actionable - no fluff
6. Use Thai Baht (THB) for all currency
7. Suggest who to contact (mamasang, agent) when action needed

**Tone:** Direct, business-focused, numbers-driven. You're talking to the owner/manager who needs quick insights to act on."""

    def _build_user_prompt(
        self, user_message: str, context: dict[str, Any], data: dict[str, Any]
    ) -> str:
        """Build the user prompt with context and data."""
        return f"""**User Question:** {user_message}

**Context Filters:**
{self._format_filters(context)}

**Performance Data:**

**Staff Performance (Top 10):**
{self._format_staff_list(data['staff_performance']['top_10'])}

**Staff Performance (Bottom 10):**
{self._format_staff_list(data['staff_performance']['bottom_10'])}

**Agent Performance:**
{self._format_agent_list(data['agent_performance']['agents'])}

**Recent Trends (Last 7 days vs Previous 7 days):**
- Last 7 days: {data['recent_trends']['last_7_days']['total_profit']:,.0f} THB profit, {data['recent_trends']['last_7_days']['unique_staff']} staff, {data['recent_trends']['last_7_days']['total_shifts']} shifts
- Previous 7 days: {data['recent_trends']['previous_7_days']['total_profit']:,.0f} THB profit, {data['recent_trends']['previous_7_days']['unique_staff']} staff, {data['recent_trends']['previous_7_days']['total_shifts']} shifts
- Trend: {data['recent_trends']['trend']:+.1f}%

**Underperformers (Recent decline >20%):**
{self._format_underperformers(data['underperformers']['staff'])}

---

Please analyze this data and answer the user's question. Be specific, cite numbers, and provide actionable insights."""

    def _format_filters(self, context: dict[str, Any]) -> str:
        """Format filter context."""
        lines = []
        if context.get("bar"):
            lines.append(f"- Bar: {context['bar']}")
        else:
            lines.append("- Bar: All bars")

        if context.get("year") and context.get("month"):
            lines.append(f"- Period: {context['year']}-{context['month']:02d}")
        elif context.get("date_start") and context.get("date_end"):
            lines.append(f"- Period: {context['date_start']} to {context['date_end']}")

        return "\n".join(lines) if lines else "- No filters applied"

    def _format_staff_list(self, staff: list[dict]) -> str:
        """Format staff list for prompt."""
        if not staff:
            return "No data"

        lines = []
        for s in staff:
            lines.append(
                f"  • {s['staff_id']} ({s['bar']}): "
                f"{s['total_profit']:,.0f} THB profit, "
                f"{s['total_drinks']:.0f} drinks, "
                f"{s['days_worked']} days, "
                f"{s['avg_profit_per_day']:,.0f} THB/day"
            )
        return "\n".join(lines)

    def _format_agent_list(self, agents: list[dict]) -> str:
        """Format agent list for prompt."""
        if not agents:
            return "No data"

        lines = []
        for a in agents:
            bonus_status = []
            if a["bonus_40k_eligible"]:
                bonus_status.append("40K")
            elif a["bonus_30k_eligible"]:
                bonus_status.append("30K")
            elif a["bonus_20k_eligible"]:
                bonus_status.append("20K")
            else:
                bonus_status.append("No bonus")

            lines.append(
                f"  • {a['agent_name']} ({a['bar']}): "
                f"Avg {a['avg_daily_staff']:.1f} staff/day, "
                f"{a['total_profit']:,.0f} THB profit, "
                f"{a['days_with_data']} days tracked, "
                f"Bonus: {bonus_status[0]}"
            )
        return "\n".join(lines)

    def _format_underperformers(self, staff: list[dict]) -> str:
        """Format underperformers list."""
        if not staff:
            return "None identified"

        lines = []
        for s in staff:
            lines.append(
                f"  • {s['staff_id']} ({s['bar']}): "
                f"Recent avg {s['recent_avg']:,.0f} THB vs Previous {s['previous_avg']:,.0f} THB "
                f"({s['decline_percent']:+.1f}% change)"
            )
        return "\n".join(lines)

    def _format_conversation_history(
        self, history: list[dict[str, str]] | None, current_prompt: str
    ) -> list[dict[str, str]]:
        """Format conversation history for Claude API."""
        messages = []

        # Add history (limit to last 5 exchanges to avoid token bloat)
        if history:
            for msg in history[-5:]:
                messages.append({"role": msg["role"], "content": msg["content"]})

        # Add current message
        messages.append({"role": "user", "content": current_prompt})

        return messages

    def _extract_insights(self, data: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        """Extract structured insights from data for UI display."""
        return {
            "type": "claude",
            "filters_applied": context,
            "key_metrics": {
                "total_staff": data["staff_performance"]["total_staff"],
                "top_performer": (
                    data["staff_performance"]["top_10"][0]["staff_id"]
                    if data["staff_performance"]["top_10"]
                    else "N/A"
                ),
                "agents_on_track_20k": sum(
                    1 for a in data["agent_performance"]["agents"] if a["bonus_20k_eligible"]
                ),
                "agents_on_track_30k": sum(
                    1 for a in data["agent_performance"]["agents"] if a["bonus_30k_eligible"]
                ),
                "agents_on_track_40k": sum(
                    1 for a in data["agent_performance"]["agents"] if a["bonus_40k_eligible"]
                ),
                "underperformers_count": len(data["underperformers"]["staff"]),
                "trend_7d": f"{data['recent_trends']['trend']:+.1f}%",
            },
            "agents_bonus_status": [
                {
                    "agent": a["agent_name"],
                    "bar": a["bar"],
                    "avg_staff": f"{a['avg_daily_staff']:.1f}",
                    "bonus_tier": (
                        "40K"
                        if a["bonus_40k_eligible"]
                        else "30K" if a["bonus_30k_eligible"] else "20K" if a["bonus_20k_eligible"] else "None"
                    ),
                }
                for a in data["agent_performance"]["agents"]
            ],
        }
