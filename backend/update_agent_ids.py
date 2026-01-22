"""
Update existing fact_rows with agent_id_derived based on agent_range_rules.
"""
import asyncio
from sqlalchemy import select, update
from app.core.db import async_session_factory
from app.models import AgentRangeRule, FactRow
from app.services.import_service import extract_staff_num_prefix, derive_agent_id

async def update_agent_ids():
    async with async_session_factory() as db:
        # Get all fact_rows
        result = await db.execute(select(FactRow))
        rows = list(result.scalars().all())
        
        print(f"\n=== Updating {len(rows)} fact_rows with agent_id_derived ===")
        
        updated_count = 0
        for row in rows:
            # Extract staff num prefix
            staff_num_prefix = extract_staff_num_prefix(row.staff_id)
            
            # Derive agent_id
            agent_id = await derive_agent_id(db, row.bar, staff_num_prefix)
            
            # Update if changed
            if row.agent_id_derived != agent_id or row.staff_num_prefix != staff_num_prefix:
                row.agent_id_derived = agent_id
                row.staff_num_prefix = staff_num_prefix
                updated_count += 1
                
                if updated_count % 1000 == 0:
                    print(f"Updated {updated_count} rows...")
        
        await db.commit()
        print(f"\n✅ Updated {updated_count} rows successfully!")
        
        # Show distribution
        result = await db.execute(
            select(FactRow.bar, FactRow.agent_id_derived, FactRow.count())
            .group_by(FactRow.bar, FactRow.agent_id_derived)
            .order_by(FactRow.bar, FactRow.agent_id_derived)
        )
        print(f"\n=== Agent Distribution After Update ===")
        from sqlalchemy import func
        result = await db.execute(
            select(FactRow.bar, FactRow.agent_id_derived, func.count(FactRow.id))
            .group_by(FactRow.bar, FactRow.agent_id_derived)
            .order_by(FactRow.bar, FactRow.agent_id_derived)
        )
        for bar, agent_id, count in result.all():
            print(f"{bar} | Agent {agent_id}: {count} rows")

if __name__ == "__main__":
    asyncio.run(update_agent_ids())
