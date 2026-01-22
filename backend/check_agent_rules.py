"""
Check and seed agent_range_rules table.
"""
import asyncio
from sqlalchemy import select, func
from app.core.db import async_session_factory
from app.models import AgentRangeRule, FactRow

async def check_and_seed():
    async with async_session_factory() as db:
        # Check current rules
        result = await db.execute(select(AgentRangeRule).order_by(AgentRangeRule.bar, AgentRangeRule.agent_id))
        rules = list(result.scalars().all())
        
        print(f"\n=== Current Agent Range Rules: {len(rules)} ===")
        for rule in rules:
            print(f"{rule.bar} | Agent {rule.agent_id}: {rule.range_start}-{rule.range_end}")
        
        # Check distinct bars in fact_rows
        result = await db.execute(select(FactRow.bar).distinct().order_by(FactRow.bar))
        bars = [row[0] for row in result.all()]
        print(f"\n=== Distinct Bars in fact_rows: {bars} ===")
        
        # Check agent_id_derived distribution
        result = await db.execute(
            select(FactRow.agent_id_derived, FactRow.bar, func.count(FactRow.id))
            .group_by(FactRow.agent_id_derived, FactRow.bar)
            .order_by(FactRow.bar, FactRow.agent_id_derived)
        )
        print(f"\n=== Agent Distribution (agent_id_derived) ===")
        for agent_id, bar, count in result.all():
            print(f"{bar} | Agent {agent_id}: {count} rows")
        
        # If no rules exist, seed default rules
        if not rules:
            print("\n=== No rules found. Seeding default rules for all bars ===")
            default_bars = bars if bars else ["MANDARIN", "SHARK", "RED DRAGON"]
            
            for bar in default_bars:
                for agent_id in range(1, 11):  # Agents 1-10
                    rule = AgentRangeRule(
                        bar=bar,
                        agent_id=agent_id,
                        range_start=agent_id * 100,
                        range_end=agent_id * 100 + 99
                    )
                    db.add(rule)
                    print(f"Added: {bar} | Agent {agent_id}: {agent_id * 100}-{agent_id * 100 + 99}")
            
            await db.commit()
            print("\n✅ Default rules seeded successfully!")

if __name__ == "__main__":
    asyncio.run(check_and_seed())
