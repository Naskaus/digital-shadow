"""Profile management API routes."""
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentAdmin, CurrentUser, DbSession
from app.models import AppUser, FactRow, Profile, ProfileBar, ProfileType, StaffPosition
from app.schemas import (
    FactRowResponse,
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


# NOTE: Job history endpoint MUST come before get_staff_profile
# because FastAPI matches routes in order, and :path is greedy
@router.get("/staff/{staff_id:path}/history")
async def get_staff_history(
    staff_id: str,
    db: DbSession,
    current_user: CurrentUser,
    bar: list[str] | None = Query(None),
    year: int | None = Query(None),
    month: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Get job history for a staff member (paginated, filterable)."""
    # Build base query
    query = select(FactRow).where(FactRow.staff_id == staff_id)
    count_query = select(func.count()).select_from(FactRow).where(FactRow.staff_id == staff_id)

    # Apply filters
    if bar:
        query = query.where(FactRow.bar.in_(bar))
        count_query = count_query.where(FactRow.bar.in_(bar))

    if year is not None:
        query = query.where(func.extract("year", FactRow.date) == year)
        count_query = count_query.where(func.extract("year", FactRow.date) == year)

    if month is not None:
        query = query.where(func.extract("month", FactRow.date) == month)
        count_query = count_query.where(func.extract("month", FactRow.date) == month)

    # Get total count
    total = await db.scalar(count_query) or 0

    # Calculate statistics WITH SAME FILTERS as history query
    stats_query = select(
        func.count(FactRow.id).label('days_worked'),
        func.sum(FactRow.profit).label('total_profit'),
        func.avg(FactRow.profit).label('avg_profit'),
        func.sum(FactRow.drinks).label('total_drinks'),
        func.avg(FactRow.drinks).label('avg_drinks'),
        func.sum(FactRow.off).label('total_bonus'),
        func.avg(FactRow.off).label('avg_bonus'),
    ).where(FactRow.staff_id == staff_id)

    # Apply SAME filters as history query
    if bar:
        stats_query = stats_query.where(FactRow.bar.in_(bar))

    if year is not None:
        stats_query = stats_query.where(func.extract("year", FactRow.date) == year)

    if month is not None:
        stats_query = stats_query.where(func.extract("month", FactRow.date) == month)

    stats_result = await db.execute(stats_query)
    stats_row = stats_result.one()

    stats = {
        "days_worked": int(stats_row.days_worked or 0),
        "total_profit": float(stats_row.total_profit or 0),
        "avg_profit": float(stats_row.avg_profit or 0),
        "total_drinks": int(stats_row.total_drinks or 0),
        "avg_drinks": float(stats_row.avg_drinks or 0),
        "total_bonus": float(stats_row.total_bonus or 0),
        "avg_bonus": float(stats_row.avg_bonus or 0),
    }

    # Apply ordering and pagination
    query = (
        query.order_by(FactRow.date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(query)
    rows = result.scalars().all()

    # Convert to response format
    items = [
        FactRowResponse(
            id=row.id,
            business_key=row.business_key,
            source_year=row.source_year,
            bar=row.bar,
            date=row.date,
            agent_label=row.agent_label,
            staff_id=row.staff_id,
            position=row.position,
            salary=float(row.salary) if row.salary else None,
            start_time=str(row.start_time) if row.start_time else None,
            late=float(row.late) if row.late else None,
            drinks=float(row.drinks) if row.drinks else None,
            off=float(row.off) if row.off else None,
            cut_late=float(row.cut_late) if row.cut_late else None,
            cut_drink=float(row.cut_drink) if row.cut_drink else None,
            cut_other=float(row.cut_other) if row.cut_other else None,
            total=float(row.total) if row.total else None,
            sale=float(row.sale) if row.sale else None,
            profit=float(row.profit) if row.profit else None,
            contract=row.contract,
            staff_num_prefix=row.staff_num_prefix,
            agent_id_derived=row.agent_id_derived,
            agent_mismatch=row.agent_mismatch,
        )
        for row in rows
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "stats": stats,
    }


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


# --- Photo Management Endpoints ---


@router.put("/{profile_id}/photo")
async def upload_photo(
    profile_id: UUID,
    file: UploadFile,
    db: DbSession,
    current_user: CurrentAdmin,
):
    """Upload profile photo (admin only, max 5MB, jpg/png/webp)."""
    MAX_SIZE = 5 * 1024 * 1024  # 5MB
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Allowed: jpeg, png, webp",
        )

    # Read file bytes
    contents = await file.read()

    # Validate file size
    if len(contents) > MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {len(contents)} bytes. Max: {MAX_SIZE} bytes (5MB)",
        )

    # Verify it's actually an image using magic numbers
    def detect_image_type(data: bytes) -> str | None:
        """Detect image type from magic numbers."""
        if data.startswith(b'\xff\xd8\xff'):
            return "jpeg"
        elif data.startswith(b'\x89PNG\r\n\x1a\n'):
            return "png"
        elif data.startswith(b'RIFF') and data[8:12] == b'WEBP':
            return "webp"
        return None

    img_type = detect_image_type(contents)
    if img_type not in {"jpeg", "png", "webp"}:
        raise HTTPException(
            status_code=415,
            detail="File is not a valid image (jpeg/png/webp)",
        )

    # Update profile
    profile = await db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile.picture = contents
    await db.commit()

    return {
        "message": "Photo uploaded successfully",
        "size": len(contents),
        "type": file.content_type,
    }


@router.get("/{profile_id}/photo")
async def get_photo(
    profile_id: UUID,
    db: DbSession,
):
    """Download profile photo (public access, returns image with proper Content-Type)."""
    profile = await db.get(Profile, profile_id)

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if not profile.picture:
        raise HTTPException(status_code=404, detail="Profile has no photo")

    # Detect MIME type from image bytes using magic numbers
    def detect_mime_type(data: bytes) -> str:
        """Detect MIME type from magic numbers."""
        if data.startswith(b'\xff\xd8\xff'):
            return "image/jpeg"
        elif data.startswith(b'\x89PNG\r\n\x1a\n'):
            return "image/png"
        elif data.startswith(b'RIFF') and data[8:12] == b'WEBP':
            return "image/webp"
        return "application/octet-stream"

    mime_type = detect_mime_type(profile.picture)

    return Response(content=profile.picture, media_type=mime_type)


@router.delete("/{profile_id}/photo", status_code=204)
async def delete_photo(
    profile_id: UUID,
    db: DbSession,
    current_user: CurrentAdmin,
):
    """Remove profile photo (admin only)."""
    profile = await db.get(Profile, profile_id)

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if not profile.picture:
        raise HTTPException(status_code=404, detail="Profile has no photo")

    profile.picture = None
    await db.commit()

    return None
