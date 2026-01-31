#!/usr/bin/env python
"""
Auto-migration script: Populate profiles from fact_rows data.
Run once after Commit 1 migration to seed initial profile data.

Usage:
    cd backend
    python scripts/migrate_profiles.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func, distinct
from app.core.db import async_session_factory
from app.models import (
    FactRow, Profile, ProfileBar, ProfileType, AgentRangeRule,
)


def extract_name_from_staff_id(staff_id: str) -> str:
    """
    Extract name from staff_id format "NNN - NICKNAME".
    Examples:
        "046 - MAPRANG" -> "MAPRANG"
        "123 - JANE DOE" -> "JANE DOE"
        "MAPRANG" -> "MAPRANG" (fallback if no dash)
    """
    if " - " in staff_id:
        return staff_id.split(" - ", 1)[1].strip()
    return staff_id.strip()


def build_agent_key(bar: str, agent_id: int) -> str:
    """Build agent_key in format 'BAR|AGENT_ID' e.g. 'MANDARIN|5'."""
    return f"{bar}|{agent_id}"


async def migrate_staff_profiles(session) -> dict:
    """
    Create STAFF profiles from unique staff_id in fact_rows.
    Returns: {staff_id: profile_id} mapping
    """
    print("\n--- Migrating STAFF profiles...")

    # Get unique staff_ids with their bars and agents
    query = (
        select(
            FactRow.staff_id,
            FactRow.bar,
            FactRow.agent_id_derived,
            func.count().label("days_worked"),
        )
        .where(FactRow.staff_id.isnot(None))
        .group_by(FactRow.staff_id, FactRow.bar, FactRow.agent_id_derived)
        .order_by(FactRow.staff_id)
    )

    result = await session.execute(query)
    rows = result.all()

    # Group by staff_id to collect all bars per staff
    staff_data: dict[str, dict] = {}
    for row in rows:
        sid = row.staff_id
        if sid not in staff_data:
            staff_data[sid] = {
                "bars": [],
                "name": extract_name_from_staff_id(sid),
            }
        staff_data[sid]["bars"].append(
            {
                "bar": row.bar,
                "agent_id": row.agent_id_derived,
                "days": row.days_worked,
            }
        )

    print(f"   Found {len(staff_data)} unique staff members")

    # Create profiles
    staff_id_to_profile_id = {}
    created = 0

    for sid, data in staff_data.items():
        # Check if profile already exists
        existing = await session.execute(
            select(Profile).where(Profile.staff_id == sid)
        )
        if existing.scalar_one_or_none():
            continue

        # Create profile
        profile = Profile(
            profile_type=ProfileType.STAFF,
            staff_id=sid,
            name=data["name"],
        )
        session.add(profile)
        await session.flush()  # Get the ID

        staff_id_to_profile_id[sid] = profile.id

        # Create profile_bars entries
        for bar_info in data["bars"]:
            agent_key = None
            if bar_info["agent_id"] is not None:
                agent_key = build_agent_key(bar_info["bar"], bar_info["agent_id"])

            profile_bar = ProfileBar(
                profile_id=profile.id,
                bar=bar_info["bar"],
                agent_key=agent_key,
            )
            session.add(profile_bar)

        created += 1
        if created % 100 == 0:
            print(f"   Created {created} staff profiles...")

    await session.commit()
    print(f"   Created {created} STAFF profiles")
    return staff_id_to_profile_id


async def migrate_agent_profiles(session) -> dict:
    """
    Create AGENT profiles from unique (bar, agent_id_derived) in fact_rows.
    Returns: {agent_key: profile_id} mapping
    """
    print("\n--- Migrating AGENT profiles...")

    # Get unique (bar, agent_id) combinations with agent labels
    query = (
        select(
            FactRow.bar,
            FactRow.agent_id_derived,
            FactRow.agent_label,
            func.count(distinct(FactRow.staff_id)).label("staff_count"),
            func.count().label("total_days"),
        )
        .where(FactRow.agent_id_derived.isnot(None))
        .group_by(FactRow.bar, FactRow.agent_id_derived, FactRow.agent_label)
        .order_by(FactRow.bar, FactRow.agent_id_derived)
    )

    result = await session.execute(query)
    rows = result.all()

    # Dedupe by (bar, agent_id) - take first label if multiple
    agent_data: dict[tuple, dict] = {}
    for row in rows:
        key = (row.bar, row.agent_id_derived)
        if key not in agent_data:
            label = row.agent_label or f"Agent {row.agent_id_derived}"
            agent_data[key] = {
                "bar": row.bar,
                "agent_id": row.agent_id_derived,
                "name": label,
                "agent_key": build_agent_key(row.bar, row.agent_id_derived),
            }

    print(f"   Found {len(agent_data)} unique agents across all bars")

    # Create profiles
    agent_key_to_profile_id = {}
    created = 0

    for (bar, agent_id), data in agent_data.items():
        agent_key = data["agent_key"]

        # Check if profile already exists
        existing = await session.execute(
            select(Profile).where(Profile.agent_key == agent_key)
        )
        if existing.scalar_one_or_none():
            continue

        # Create profile
        profile = Profile(
            profile_type=ProfileType.AGENT,
            agent_key=agent_key,
            name=data["name"],
        )
        session.add(profile)
        await session.flush()

        agent_key_to_profile_id[agent_key] = profile.id

        # Create profile_bar entry (agent works at this bar)
        profile_bar = ProfileBar(
            profile_id=profile.id,
            bar=bar,
            agent_key=None,  # Agents don't have a managing agent
        )
        session.add(profile_bar)

        created += 1

    await session.commit()
    print(f"   Created {created} AGENT profiles")
    return agent_key_to_profile_id


async def print_summary(session):
    """Print migration summary."""
    print("\n" + "=" * 50)
    print("MIGRATION SUMMARY")
    print("=" * 50)

    staff_count = await session.scalar(
        select(func.count())
        .select_from(Profile)
        .where(Profile.profile_type == ProfileType.STAFF)
    )
    agent_count = await session.scalar(
        select(func.count())
        .select_from(Profile)
        .where(Profile.profile_type == ProfileType.AGENT)
    )
    bar_links = await session.scalar(
        select(func.count()).select_from(ProfileBar)
    )

    print(f"   STAFF profiles: {staff_count}")
    print(f"   AGENT profiles: {agent_count}")
    print(f"   Profile-Bar links: {bar_links}")
    print("=" * 50)


async def main():
    """Main migration entry point."""
    print("Starting Profile Auto-Migration")
    print("=" * 50)

    async with async_session_factory() as session:
        staff_map = await migrate_staff_profiles(session)
        agent_map = await migrate_agent_profiles(session)
        await print_summary(session)

    print("\nMigration complete!")


if __name__ == "__main__":
    asyncio.run(main())
