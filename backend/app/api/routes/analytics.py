from datetime import date, timedelta, datetime
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, distinct, desc, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api.deps import get_db
from app.models.base import FactRow, AgentRangeRule

router = APIRouter(prefix="/analytics", tags=["analytics"])

# --- Schemas ---

class DailyStat(BaseModel):
    date: date
    staff_count: int
    high_perf_count: int  # profit >= 1500
    bonus_a: int
    bonus_b: int

class AgentPayroll(BaseModel):
    agent_id: str  # "BAR|ID" or similar key
    agent_name: str
    bar: str
    
    # Pools
    pool_active: int
    pool_total: int
    
    # Bonus A (Volume)
    bonus_a_total: int
    
    # Bonus B (Quality)
    bonus_b_total: int
    
    # Bonus C (Consistency)
    avg_daily_staff: float
    days_counted: int
    days_remaining: int # In month
    current_tier: int # 0, 20000, 30000, 40000
    next_tier_target: Optional[int]
    bonus_c_amount: int
    
    total_estimate: int
    
class PayrollResponse(BaseModel):
    agents: List[AgentPayroll]
    period_start: date
    period_end: date

class LeaderboardEntry(BaseModel):
    rank: int
    id: str  # staff_id or agent_key
    name: str # staff_id or "Agent X (Bar)"
    bar: Optional[str] = None
    agent_id: Optional[int] = None
    profit: float
    drinks: float
    days: int
    rentability: float # profit/day



class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]

# --- Endpoints ---

@router.get("/payroll", response_model=PayrollResponse)
async def get_payroll(
    start_date: date,
    end_date: date,
    bar: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    # current_user = Depends(deps.get_current_active_user) # Assuming auth needed
):
    """
    Calculate payroll bonuses (A, B, C) for the given period.
    """
    
    # 1. Fetch Daily Stats per Agent
    # We group by bar, agent_id_derived, and date
    
    filters = [
        FactRow.date >= start_date,
        FactRow.date <= end_date,
        FactRow.agent_id_derived.is_not(None)
    ]
    if bar:
        filters.append(FactRow.bar == bar)

    # Subquery for functionality
    # First, get the raw daily aggregates
    
    stmt = (
        select(
            FactRow.bar,
            FactRow.agent_id_derived,
            FactRow.date,
            func.count(FactRow.id).label("staff_count"),
            func.count(case((FactRow.profit >= 1500, 1), else_=None)).label("high_perf_count")
        )
        .where(and_(*filters))
        .group_by(FactRow.bar, FactRow.agent_id_derived, FactRow.date)
    )
    
    result = await db.execute(stmt)
    daily_rows = result.all()
    
    # Process in Python to build agent maps
    agents_data = {} # Key: "BAR|ID"
    
    # Helper to clean keys
    def get_key(r_bar, r_agent_id):
        return f"{r_bar}|{r_agent_id}"

    # Track days in period for "Days Counted"
    # Actually "Days Counted" usually means days with data.
    # "Days Remaining" depends on if the period is a full month. 
    # Logic: Days Remaining = (End of Month of EndDate) - Today. 
    # If period end date is in past, remaining is 0.
    
    today = date.today()
    days_counted = (end_date - start_date).days + 1 # simplistic view of selected range
    
    # Better "Days Counted" logic: Count of distinct dates in the result set for that agent?
    # PRD says: "Days Counted" vs "Days Remaining".
    # Usually relative to the month of the report.
    # Let's use the selected period as the "Counted" and remaining days in that month (if current month) as "Remaining".
    
    # Calculate days remaining in the month of the end_date
    # If end_date month != today month, assume 0 remaining (historical report)
    # If end_date month == today month, remaining = (last_day_of_month - today).days
    
    is_current_month = (today.year == end_date.year) and (today.month == end_date.month)
    if is_current_month:
        # get last day of month
        next_month = end_date.replace(day=28) + timedelta(days=4)
        last_day_month = next_month - timedelta(days=next_month.day)
        days_remaining = max(0, (last_day_month - today).days)
    else:
        days_remaining = 0

    # 2. Iterate daily records
    for row in daily_rows:
        key = get_key(row.bar, row.agent_id_derived)
        if key not in agents_data:
            agents_data[key] = {
                "bar": row.bar,
                "agent_id": str(row.agent_id_derived),
                "daily_stats": [],
                "staff_ids": set() # We assume we need staff ids for pool? 
                # Wait, pool is Active vs Dormant.
                # Active Pool: Query: distinct staff_id where date >= today - 31 days
            }
        
        # Bonus A Logic: 
        # IF daily_staff_count >= 10 THEN 50 * daily_staff_count. Else 0.
        bonus_a = 50 * row.staff_count if row.staff_count >= 10 else 0
        
        # Bonus B Logic:
        # +50 THB for each staff with profit >= 1500
        bonus_b = 50 * row.high_perf_count
        
        agents_data[key]["daily_stats"].append({
            "date": row.date,
            "staff_count": row.staff_count,
            "bonus_a": bonus_a,
            "bonus_b": bonus_b
        })

    # 3. Calculate Pools (Active & Total)
    # Active: Worked in last 31 days (relative to TODAY)
    # Total: All time
    
    # We need to query this separately per key (Agent in Bar)
    # This might be heavy if done one by one. Let's do a single agg query.
    
    # Active Pool (last 31 days)
    active_cutoff = today - timedelta(days=31)
    
    stmt_active = (
        select(
            FactRow.bar,
            FactRow.agent_id_derived,
            func.count(distinct(FactRow.staff_id))
        )
        .where(
            FactRow.date >= active_cutoff,
            FactRow.agent_id_derived.is_not(None)
        )
        .group_by(FactRow.bar, FactRow.agent_id_derived)
    )
    
    result_active = await db.execute(stmt_active)
    active_counts = {get_key(r.bar, r.agent_id_derived): r[2] for r in result_active.all()}
    
    # Total Pool (All time)
    stmt_total = (
        select(
            FactRow.bar,
            FactRow.agent_id_derived,
            func.count(distinct(FactRow.staff_id))
        )
        .where(FactRow.agent_id_derived.is_not(None))
        .group_by(FactRow.bar, FactRow.agent_id_derived)
    )
    
    result_total = await db.execute(stmt_total)
    total_counts = {get_key(r.bar, r.agent_id_derived): r[2] for r in result_total.all()}

    # 4. Final Assembly
    final_agents = []
    
    for key, data in agents_data.items():
        daily = data["daily_stats"]
        
        # Bonus A Total
        bonus_a_total = sum(d["bonus_a"] for d in daily)
        
        # Bonus B Total
        bonus_b_total = sum(d["bonus_b"] for d in daily)
        
        # Bonus C Logic (Consistency)
        # Avg Daily Staff over selected period
        # Count distinct dates with data in this period? Or all days in period?
        # Specification: "Based on Avg Daily Staff over the selected period"
        # Usually avg = Sum(staff_count) / Count(days_with_data) OR Count(total_days_in_period)
        # "Display Logic: Show 'Current Avg', 'Days Counted' vs 'Days Remaining'." implies we use "Days Counted" (days with activity or days passed).
        # Let's use days with activity (len(daily)) as denominator for now, or the passed variable if we want strictly time-based.
        # "Days Counted" likely means days played.
        
        count_days_played = len(daily)
        sum_staff = sum(d["staff_count"] for d in daily)
        avg_staff = sum_staff / count_days_played if count_days_played > 0 else 0
        
        # Tiers
        bonus_c = 0
        current_tier = 0
        next_tier_target = 20
        
        if avg_staff >= 40:
            bonus_c = 40000
            current_tier = 40000
            next_tier_target = None
        elif avg_staff >= 30:
            bonus_c = 30000
            current_tier = 30000
            next_tier_target = 40
        elif avg_staff >= 20:
            bonus_c = 20000
            current_tier = 20000
            next_tier_target = 30
        
        # Pool stats
        pool_active = active_counts.get(key, 0)
        pool_total_all_time = total_counts.get(key, 0)
        # Dormant not strictly asked in response model but asked in logic: "Dormant: Total distinct staff found in history minus Active Pool"
        # We can just return active and total, frontend can show dormant if needed or we calc it.
        # "Pool Stats" in return
        
        agent_resp = AgentPayroll(
            agent_id=key,
            agent_name=f"Agent {data['agent_id']} ({data['bar']})",
            bar=data["bar"],
            pool_active=pool_active,
            pool_total=pool_total_all_time,
            bonus_a_total=bonus_a_total,
            bonus_b_total=bonus_b_total,
            avg_daily_staff=round(avg_staff, 1),
            days_counted=count_days_played,
            days_remaining=days_remaining,
            current_tier=current_tier,
            next_tier_target=next_tier_target,
            bonus_c_amount=bonus_c,
            total_estimate=bonus_a_total + bonus_b_total + bonus_c
        )
        final_agents.append(agent_resp)
        
    return PayrollResponse(
        agents=final_agents,
        period_start=start_date,
        period_end=end_date
    )

@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    type: Literal["STAFF", "AGENT"],
    mode: Literal["ALL", "TOP10", "FLOP10"] = "ALL",
    sort_by: Literal["PROFIT", "DRINKS", "DAYS"] = "PROFIT",
    search: Optional[str] = None,
    bar: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    filters = []
    if bar:
        filters.append(FactRow.bar == bar)
    if year:
        filters.append(FactRow.source_year == year)
    # for month we might need to extract from date or use generated column logic if trustworthy. 
    # FactRow model has 'date' (DateTime).
    if month:
        filters.append(func.extract('month', FactRow.date) == month)
        
    if search:
        # Search staff_id or agent
        if type == "STAFF":
            filters.append(FactRow.staff_id.ilike(f"%{search}%"))
        else:
            # For agent search, it's a bit harder since we construct the name.
            # But we can search bar or agent_label?
            pass

    # Grouping
    if type == "STAFF":
        group_cols = [FactRow.bar, FactRow.agent_id_derived, FactRow.staff_id]
        select_cols = [
            FactRow.staff_id.label("id"),
            FactRow.staff_id.label("name"),
            FactRow.bar.label("bar"),
            FactRow.agent_id_derived.label("agent_id"),
            func.sum(FactRow.profit).label("profit"),
            func.sum(FactRow.drinks).label("drinks"),
            func.count(distinct(FactRow.date)).label("days")
        ]
    else: # AGENT
        group_cols = [FactRow.bar, FactRow.agent_id_derived]
        select_cols = [
            func.concat(FactRow.bar, '|', FactRow.agent_id_derived).label("id"),
            func.concat('Agent ', FactRow.agent_id_derived, ' (', FactRow.bar, ')').label("name"),
            FactRow.bar.label("bar"),
            FactRow.agent_id_derived.label("agent_id"),
            func.sum(FactRow.profit).label("profit"),
            func.sum(FactRow.drinks).label("drinks"),
            func.count(distinct(FactRow.date)).label("days")
        ]
        filters.append(FactRow.agent_id_derived.is_not(None))

    stmt = (
        select(*select_cols)
        .where(and_(*filters))
        .group_by(*group_cols)
    )

    # Sorting
    if sort_by == "PROFIT":
        order = desc("profit")
    elif sort_by == "DRINKS":
        order = desc("drinks")
    elif sort_by == "DAYS":
        order = desc("days")
    
    # Mode (Asc/Desc for Flop/Top)
    # Actually "FLOP10" usually means lowest.
    if mode == "FLOP10":
        # Invert sort
        if sort_by == "PROFIT": order = "profit"
        elif sort_by == "DRINKS": order = "drinks"
        elif sort_by == "DAYS": order = "days"
    
    stmt = stmt.order_by(order)
    
    if mode in ["TOP10", "FLOP10"]:
        stmt = stmt.limit(10)
        
    result = await db.execute(stmt)
    rows = result.all()
    
    entries = []
    for i, row in enumerate(rows):
        profit = row.profit or 0
        days = row.days or 1
        rentability = profit / days if days > 0 else 0
        
        # Handle agent_id safely
        agent_id_val = None
        if hasattr(row, 'agent_id'):
             agent_id_val = row.agent_id

        entries.append(LeaderboardEntry(
            rank=i + 1,
            id=str(row.id),
            name=str(row.name),
            bar=row.bar,
            agent_id=agent_id_val,
            profit=float(profit),
            drinks=float(row.drinks or 0),
            days=int(days),
            rentability=float(rentability)
        ))
        
    return LeaderboardResponse(entries=entries)
