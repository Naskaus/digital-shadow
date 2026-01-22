"""
Import routes for data ingestion.
"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import ImportRun, ImportError as ImportErrorModel, FactRow
from app.schemas import (
    ImportErrorResponse,
    ImportRunRequest,
    ImportRunResponse,
    MismatchResponse,
)
from app.services.import_service import run_import as execute_import

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/run", response_model=list[ImportRunResponse], status_code=status.HTTP_202_ACCEPTED)
async def run_import(
    db: DbSession,
    current_user: CurrentUser,
    request: ImportRunRequest,
) -> list[ImportRun]:
    """
    Trigger import runs for specified data sources.
    
    - sources: List of years to import (e.g., [2025, 2026])
    - mode: "full" or "incremental"
    - window_days: For incremental mode, only process recent N days
    - dry_run: If true (default), stages data for review. If false, commits immediately.
    """
    try:
        import_runs = await execute_import(
            db=db,
            source_years=request.sources,
            mode=request.mode.value,
            window_days=request.window_days,
            dry_run=request.dry_run,
        )
        return import_runs
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}",
        )


@router.post("/runs/{run_id}/commit", response_model=ImportRunResponse)
async def commit_import_run(
    db: DbSession,
    current_user: CurrentUser,
    run_id: int,
) -> ImportRun:
    """
    Commit a staged import run.
    Moves data from raw_rows to fact_rows and marks run as COMPLETED.
    """
    try:
        from app.services.import_service import commit_import
        import_run = await commit_import(db, run_id)
        return import_run
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Commit failed: {str(e)}",
        )


@router.delete("/runs/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_import_run(
    db: DbSession,
    current_user: CurrentUser,
    run_id: int,
) -> None:
    """
    Delete an import run and all associated data (raw rows, fact rows, errors).
    """
    from sqlalchemy import delete
    
    # Check if run exists
    result = await db.execute(select(ImportRun).where(ImportRun.id == run_id))
    import_run = result.scalar_one_or_none()
    
    if not import_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import run not found",
        )
        
    try:
        # Manually delete fact rows first (FK constraint)
        await db.execute(delete(FactRow).where(FactRow.last_import_run_id == run_id))
        
        # Delete import run (cascades to errors/raw_rows via model cascade, 
        # but FactRow doesn't have cascade in model def)
        await db.execute(delete(ImportRun).where(ImportRun.id == run_id))
        await db.commit()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {str(e)}",
        )


@router.get("/runs", response_model=list[ImportRunResponse])
async def list_import_runs(
    db: DbSession,
    current_user: CurrentUser,
    limit: int = 50,
    offset: int = 0,
) -> list[ImportRun]:
    """List all import runs."""
    result = await db.execute(
        select(ImportRun)
        .order_by(ImportRun.started_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


@router.get("/runs/{run_id}", response_model=ImportRunResponse)
async def get_import_run(
    db: DbSession,
    current_user: CurrentUser,
    run_id: int,
) -> ImportRun:
    """Get a specific import run."""
    result = await db.execute(
        select(ImportRun).where(ImportRun.id == run_id)
    )
    import_run = result.scalar_one_or_none()
    
    if not import_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import run not found",
        )
    
    return import_run


@router.get("/runs/{run_id}/errors", response_model=list[ImportErrorResponse])
async def get_import_errors(
    db: DbSession,
    current_user: CurrentUser,
    run_id: int,
    limit: int = 100,
    offset: int = 0,
) -> list[ImportErrorModel]:
    """Get errors for a specific import run."""
    result = await db.execute(
        select(ImportErrorModel)
        .where(ImportErrorModel.import_run_id == run_id)
        .order_by(ImportErrorModel.sheet_row_number)
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


@router.get("/runs/{run_id}/mismatches", response_model=list[MismatchResponse])
async def get_import_mismatches(
    db: DbSession,
    current_user: CurrentUser,
    run_id: int,
    limit: int = 100,
    offset: int = 0,
) -> list[FactRow]:
    """
    Get fact rows with agent mismatch for a specific import run.
    
    A mismatch occurs when the AGENT label from the sheet disagrees
    with agent_id_derived (computed from staff_num_prefix via agent_range_rules).
    """
    result = await db.execute(
        select(FactRow)
        .where(FactRow.last_import_run_id == run_id)
        .where(FactRow.agent_mismatch == True)
        .order_by(FactRow.date, FactRow.staff_id)
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())
