"""
Data rows routes for table display.
"""
from fastapi import APIRouter, Query
from sqlalchemy import func, select, extract, and_, or_

from app.api.deps import CurrentUser, DbSession
from app.models import FactRow
from app.schemas import FactRowResponse, RowsKPIResponse

router = APIRouter(prefix="/rows", tags=["rows"])

@router.get("", response_model=list[FactRowResponse])
async def list_rows(
    db: DbSession,
    current_user: CurrentUser,
    # Filters
    bar: list[str] | None = Query(None),
    year: list[int] | None = Query(None),
    month: list[int] | None = Query(None),
    contract: list[str] | None = Query(None),
    agent: list[str] | None = Query(None), # Changed to list[str] for composite keys
    staff_search: str | None = None,
    # Pagination ...
    cursor: int | None = None,
    limit: int = 50,
    # Sorting
    sort_by: str = "date",
    sort_order: str = "desc",
) -> list[FactRow]:
    """
    List fact rows with server-side filtering and pagination.
    Uses cursor-based pagination for infinite scroll.
    """
    query = select(FactRow)
    
    # Apply filters
    if bar:
        query = query.where(FactRow.bar.in_(bar))
    if year:
        query = query.where(FactRow.source_year.in_(year))
    if month:
        query = query.where(extract('month', FactRow.date).in_(month))
    if contract:
        query = query.where(FactRow.contract.in_(contract))
    if agent:
        # Parse composite keys: "BAR|ID"
        agent_filters = []
        for key in agent:
            try:
                if "|" not in key:
                    continue # Skip invalid format
                    
                target_bar, target_id_str = key.split("|")
                
                if target_id_str == "0" or target_id_str == "NULL":
                     # Handle "House Agent" (No Agent)
                     agent_filters.append(and_(
                         FactRow.bar == target_bar,
                         FactRow.agent_id_derived.is_(None)
                     ))
                else:
                    agent_filters.append(and_(
                        FactRow.bar == target_bar,
                        FactRow.agent_id_derived == int(target_id_str)
                    ))
            except ValueError:
                continue
                
        if agent_filters:
            query = query.where(or_(*agent_filters))
            
    if staff_search:
        query = query.where(FactRow.staff_id.ilike(f"%{staff_search}%"))
    
    # Cursor-based pagination
    if cursor:
        query = query.where(FactRow.id > cursor)
    
    # Sorting
    if sort_order == "asc":
        query = query.order_by(getattr(FactRow, sort_by).asc())
    else:
        query = query.order_by(getattr(FactRow, sort_by).desc())
    
    # Limit
    query = query.limit(limit)
    
    # Execute
    result = await db.execute(query)
    rows = list(result.scalars().all())
    
    return rows


@router.get("/kpis", response_model=RowsKPIResponse)
async def get_kpis(
    db: DbSession,
    current_user: CurrentUser,
    # Same filters as list_rows
    bar: list[str] | None = Query(None),
    year: list[int] | None = Query(None),
    month: list[int] | None = Query(None),
    contract: list[str] | None = Query(None),
    agent: list[str] | None = Query(None),
    staff_search: str | None = None,
) -> RowsKPIResponse:
    """Get KPIs for filtered fact rows."""
    # Build aggregation query
    query = select(
        func.count(FactRow.id).label('total_rows'),
        func.sum(FactRow.profit).label('total_profit'),
        func.sum(FactRow.drinks).label('total_drinks'),
        func.avg(FactRow.profit).label('avg_profit'),
        func.count(func.distinct(FactRow.staff_id)).label('unique_staff'),
    )
    
    # Apply same filters
    if bar:
        query = query.where(FactRow.bar.in_(bar))
    if year:
        query = query.where(FactRow.source_year.in_(year))
    if month:
        query = query.where(extract('month', FactRow.date).in_(month))
    if contract:
         query = query.where(FactRow.contract.in_(contract))
    if agent:
        # Parse composite keys: "BAR|ID"
        agent_filters = []
        for key in agent:
            try:
                if "|" not in key:
                    continue
                    
                target_bar, target_id_str = key.split("|")
                
                if target_id_str == "0" or target_id_str == "NULL":
                     agent_filters.append(and_(
                         FactRow.bar == target_bar,
                         FactRow.agent_id_derived.is_(None)
                     ))
                else:
                    agent_filters.append(and_(
                        FactRow.bar == target_bar,
                        FactRow.agent_id_derived == int(target_id_str)
                    ))
            except ValueError:
                continue
                
        if agent_filters:
            query = query.where(or_(*agent_filters))
            
    if staff_search:
        query = query.where(FactRow.staff_id.ilike(f"%{staff_search}%"))
    
    result = await db.execute(query)
    row = result.one()
    
    return RowsKPIResponse(
        total_rows=row.total_rows or 0,
        total_profit=float(row.total_profit or 0),
        total_drinks=float(row.total_drinks or 0),
        avg_profit=float(row.avg_profit or 0),
        unique_staff=row.unique_staff or 0,
    )


@router.get("/{row_id}", response_model=FactRowResponse)
async def get_row(
    db: DbSession,
    current_user: CurrentUser,
    row_id: int,
) -> FactRow:
    """Get a single row by ID."""
    result = await db.execute(
        select(FactRow).where(FactRow.id == row_id)
    )
    row = result.scalar_one_or_none()
    
    if not row:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Row not found",
        )
    
    return row
