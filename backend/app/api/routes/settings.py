"""
Settings routes for data source and agent range configuration.
"""
from fastapi import APIRouter, HTTPException, status
from google.oauth2 import service_account
from googleapiclient.discovery import build
from sqlalchemy import select

from app.api.deps import CurrentAdmin, CurrentUser, DbSession
from app.core.config import get_settings
from app.models import AgentRangeRule, DataSource
from app.schemas import (
    AgentRangeRuleCreate,
    AgentRangeRuleResponse,
    DataSourceCreate,
    DataSourceResponse,
)

router = APIRouter(prefix="/settings", tags=["settings"])


# --- Sheet Discovery ---

def _get_drive_service():
    """Initialize Google Drive API service to list files."""
    settings = get_settings()
    credentials = service_account.Credentials.from_service_account_file(
        settings.google_credentials_path,
        scopes=[
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/spreadsheets.readonly",
        ],
    )
    return build("drive", "v3", credentials=credentials)


def _get_sheets_service():
    """Initialize Google Sheets API service."""
    settings = get_settings()
    credentials = service_account.Credentials.from_service_account_file(
        settings.google_credentials_path,
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
    )
    return build("sheets", "v4", credentials=credentials)


@router.get("/sheets/discover")
async def discover_sheets(
    current_user: CurrentUser,
) -> list[dict]:
    """
    Discover Google Sheets accessible to the service account.
    Returns list of sheets with their IDs, titles, and available tabs.
    """
    try:
        # List spreadsheets from Drive
        drive_service = _get_drive_service()
        results = drive_service.files().list(
            q="mimeType='application/vnd.google-apps.spreadsheet'",
            spaces="drive",
            fields="files(id, name)",
            orderBy="name",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
        ).execute()
        
        files = results.get("files", [])
        sheets_service = _get_sheets_service()
        
        discovered = []
        for file in files:
            try:
                # Get sheet tabs
                sheet_meta = sheets_service.spreadsheets().get(
                    spreadsheetId=file["id"],
                    fields="sheets.properties.title",
                ).execute()
                
                tabs = [
                    s["properties"]["title"] 
                    for s in sheet_meta.get("sheets", [])
                ]
                
                discovered.append({
                    "id": file["id"],
                    "name": file["name"],
                    "tabs": tabs,
                })
            except Exception:
                # Skip sheets we can't access
                continue
        
        return discovered
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to discover sheets: {str(e)}",
        )


# --- Data Sources ---

@router.get("/sources", response_model=list[DataSourceResponse])
async def list_data_sources(
    db: DbSession,
    current_user: CurrentUser,
) -> list[DataSource]:
    """List all data sources."""
    result = await db.execute(
        select(DataSource).order_by(DataSource.year)
    )
    return list(result.scalars().all())


@router.get("/sources/{year}", response_model=DataSourceResponse)
async def get_data_source(
    db: DbSession,
    current_user: CurrentUser,
    year: int,
) -> DataSource:
    """Get a specific data source by year."""
    result = await db.execute(
        select(DataSource).where(DataSource.year == year)
    )
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Data source for year {year} not found",
        )
    
    return source


@router.post("/sources", response_model=DataSourceResponse)
async def create_data_source(
    db: DbSession,
    current_user: CurrentUser,
    data: DataSourceCreate,
) -> DataSource:
    """Create a new data source."""
    # Check if already exists
    result = await db.execute(
        select(DataSource).where(DataSource.year == data.year)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Data source for year {data.year} already exists",
        )
    
    source = DataSource(**data.model_dump())
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


@router.put("/sources/{year}", response_model=DataSourceResponse)
async def update_data_source(
    db: DbSession,
    current_user: CurrentUser,
    year: int,
    data: DataSourceCreate,
) -> DataSource:
    """Update an existing data source."""
    result = await db.execute(
        select(DataSource).where(DataSource.year == year)
    )
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Data source for year {year} not found",
        )
    
    source.sheet_id = data.sheet_id
    source.tab_name = data.tab_name
    source.range_spec = data.range_spec
    source.is_active = data.is_active
    
    await db.commit()
    await db.refresh(source)
    return source


@router.delete("/sources/{year}")
async def delete_data_source(
    db: DbSession,
    current_user: CurrentUser,
    year: int,
) -> dict:
    """Delete a data source."""
    result = await db.execute(
        select(DataSource).where(DataSource.year == year)
    )
    source = result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Data source for year {year} not found",
        )
    
    await db.delete(source)
    await db.commit()
    return {"status": "deleted", "year": year}


# --- Agent Range Rules ---

@router.get("/agent-rules", response_model=list[AgentRangeRuleResponse])
async def list_agent_rules(
    db: DbSession,
    current_user: CurrentUser,
    bar: str | None = None,
) -> list[AgentRangeRule]:
    """List agent range rules, optionally filtered by bar."""
    query = select(AgentRangeRule).order_by(AgentRangeRule.bar, AgentRangeRule.agent_id)
    if bar:
        query = query.where(AgentRangeRule.bar == bar)
    
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/agent-rules", response_model=AgentRangeRuleResponse)
async def create_agent_rule(
    db: DbSession,
    current_user: CurrentUser,
    data: AgentRangeRuleCreate,
) -> AgentRangeRule:
    """Create a new agent range rule."""
    rule = AgentRangeRule(**data.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/agent-rules/{rule_id}")
async def delete_agent_rule(
    db: DbSession,
    current_user: CurrentUser,
    rule_id: int,
) -> dict:
    """Delete an agent range rule."""
    result = await db.execute(
        select(AgentRangeRule).where(AgentRangeRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent rule not found",
        )
    
    await db.delete(rule)
    await db.commit()
    return {"status": "deleted", "id": rule_id}
