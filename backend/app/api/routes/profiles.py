"""Profile management API routes."""
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentAdmin, CurrentUser, DbSession
from app.models import AppUser, Profile, ProfileBar, ProfileType, StaffPosition
from app.schemas import (
    ProfileBarResponse,
    ProfileCreateAgent,
    ProfileCreateStaff,
    ProfileListResponse,
    ProfileResponse,
    ProfileUpdate,
)

router = APIRouter(prefix="/profiles", tags=["profiles"])


def profile_to_response(profile: Profile) -> ProfileResponse:
    """Convert Profile model to response schema."""
    return ProfileResponse(
        id=profile.id,
        profile_type=profile.profile_type.value,
        staff_id=profile.staff_id,
        agent_key=profile.agent_key,
        name=profile.name,
        has_picture=profile.picture is not None,
        date_of_birth=profile.date_of_birth,
        phone=profile.phone,
        line_id=profile.line_id,
        instagram=profile.instagram,
        facebook=profile.facebook,
        tiktok=profile.tiktok,
        notes=profile.notes,
        position=profile.position.value if profile.position else None,
        size=profile.size,
        weight=float(profile.weight) if profile.weight else None,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        bars=[
            ProfileBarResponse(bar=pb.bar, agent_key=pb.agent_key)
            for pb in profile.bars
        ],
    )


@router.get("", response_model=ProfileListResponse)
async def list_profiles(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    profile_type: str | None = Query(None, description="Filter by STAFF or AGENT"),
    bar: str | None = Query(None, description="Filter by bar"),
    search: str | None = Query(None, description="Search by name or staff_id"),
):
    """List all profiles with pagination and filters."""
    query = select(Profile).options(selectinload(Profile.bars))
    count_query = select(func.count()).select_from(Profile)

    # Apply filters
    if profile_type:
        ptype = ProfileType(profile_type.upper())
        query = query.where(Profile.profile_type == ptype)
        count_query = count_query.where(Profile.profile_type == ptype)

    if bar:
        query = query.join(Profile.bars).where(ProfileBar.bar == bar)
        count_query = count_query.join(Profile.bars).where(ProfileBar.bar == bar)

    if search:
        search_filter = or_(
            Profile.name.ilike(f"%{search}%"),
            Profile.staff_id.ilike(f"%{search}%"),
            Profile.agent_key.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # Get total count
    total = await db.scalar(count_query)

    # Apply pagination and ordering
    query = (
        query.order_by(Profile.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(query)
    profiles = result.scalars().unique().all()

    return ProfileListResponse(
        items=[profile_to_response(p) for p in profiles],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/staff/{staff_id:path}", response_model=ProfileResponse)
async def get_staff_profile(
    staff_id: str,
    db: DbSession,
    current_user: CurrentUser,
):
    """Get a staff profile by staff_id."""
    query = (
        select(Profile)
        .options(selectinload(Profile.bars))
        .where(Profile.staff_id == staff_id)
    )
    result = await db.execute(query)
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=404, detail=f"Staff profile not found: {staff_id}"
        )

    return profile_to_response(profile)


@router.get("/agent/{agent_key:path}", response_model=ProfileResponse)
async def get_agent_profile(
    agent_key: str,
    db: DbSession,
    current_user: CurrentUser,
):
    """Get an agent profile by agent_key (format: BAR|AGENT_ID, e.g., MANDARIN|5)."""
    query = (
        select(Profile)
        .options(selectinload(Profile.bars))
        .where(Profile.agent_key == agent_key)
    )
    result = await db.execute(query)
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=404, detail=f"Agent profile not found: {agent_key}"
        )

    return profile_to_response(profile)


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile_by_id(
    profile_id: UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    """Get a profile by UUID."""
    query = (
        select(Profile)
        .options(selectinload(Profile.bars))
        .where(Profile.id == profile_id)
    )
    result = await db.execute(query)
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return profile_to_response(profile)


@router.post("/staff", response_model=ProfileResponse, status_code=201)
async def create_staff_profile(
    data: ProfileCreateStaff,
    db: DbSession,
    current_user: CurrentAdmin,
):
    """Create a new staff profile (admin only)."""
    # Check if staff_id already exists
    existing = await db.scalar(
        select(Profile).where(Profile.staff_id == data.staff_id)
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Staff profile already exists: {data.staff_id}",
        )

    # Parse position
    position = None
    if data.position:
        try:
            position = StaffPosition(data.position.upper())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid position: {data.position}. Must be DANCER or PR",
            )

    # Create profile
    profile = Profile(
        profile_type=ProfileType.STAFF,
        staff_id=data.staff_id,
        name=data.name,
        date_of_birth=data.date_of_birth,
        phone=data.phone,
        line_id=data.line_id,
        instagram=data.instagram,
        facebook=data.facebook,
        tiktok=data.tiktok,
        notes=data.notes,
        position=position,
        size=data.size,
        weight=data.weight,
    )
    db.add(profile)
    await db.flush()

    # Add bar associations
    for bar_name in data.bars:
        profile_bar = ProfileBar(profile_id=profile.id, bar=bar_name)
        db.add(profile_bar)

    await db.commit()

    # Reload with bars
    query = (
        select(Profile)
        .options(selectinload(Profile.bars))
        .where(Profile.id == profile.id)
    )
    result = await db.execute(query)
    profile = result.scalar_one()

    return profile_to_response(profile)


@router.post("/agent", response_model=ProfileResponse, status_code=201)
async def create_agent_profile(
    data: ProfileCreateAgent,
    db: DbSession,
    current_user: CurrentAdmin,
):
    """Create a new agent profile (admin only)."""
    agent_key = f"{data.bar}|{data.agent_id}"

    # Check if agent_key already exists
    existing = await db.scalar(
        select(Profile).where(Profile.agent_key == agent_key)
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Agent profile already exists: {agent_key}",
        )

    # Create profile
    profile = Profile(
        profile_type=ProfileType.AGENT,
        agent_key=agent_key,
        name=data.name,
    )
    db.add(profile)
    await db.flush()

    # Add bar association
    profile_bar = ProfileBar(profile_id=profile.id, bar=data.bar)
    db.add(profile_bar)

    await db.commit()

    # Reload with bars
    query = (
        select(Profile)
        .options(selectinload(Profile.bars))
        .where(Profile.id == profile.id)
    )
    result = await db.execute(query)
    profile = result.scalar_one()

    return profile_to_response(profile)


@router.patch("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: UUID,
    data: ProfileUpdate,
    db: DbSession,
    current_user: CurrentAdmin,
):
    """Update a profile (admin only)."""
    query = (
        select(Profile)
        .options(selectinload(Profile.bars))
        .where(Profile.id == profile_id)
    )
    result = await db.execute(query)
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Update fields
    update_data = data.model_dump(exclude_unset=True)

    # Handle position enum for staff
    if "position" in update_data and update_data["position"] is not None:
        if profile.profile_type != ProfileType.STAFF:
            raise HTTPException(
                status_code=400,
                detail="Cannot set position on agent profile",
            )
        try:
            update_data["position"] = StaffPosition(
                update_data["position"].upper()
            )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid position. Must be DANCER or PR",
            )

    # Block staff-only fields on agents
    if profile.profile_type == ProfileType.AGENT:
        for field in ["position", "size", "weight"]:
            if field in update_data and update_data[field] is not None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot set {field} on agent profile",
                )

    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)

    return profile_to_response(profile)


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(
    profile_id: UUID,
    db: DbSession,
    current_user: CurrentAdmin,
):
    """Delete a profile (admin only). Also deletes associated profile_bars."""
    profile = await db.get(Profile, profile_id)

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    await db.delete(profile)
    await db.commit()

    return None
