"""
Import service for Google Sheets data ingestion.

Implements audit-proof import pipeline:
- Google Sheets is single source of truth
- Never infer missing data, never recompute totals/profit/cuts
- STAFF ID stored as-is (trim only), never split for identity
- Agents are BAR-SCOPED
- agent_id_derived computed from staff_num_prefix via agent_range_rules
- If AGENT label disagrees with derived: flag mismatch, never auto-correct
"""
import hashlib
import re
from datetime import datetime
from typing import Any

import httplib2
from google.oauth2 import service_account
from google_auth_httplib2 import AuthorizedHttp
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import (
    AgentRangeRule,
    DataSource,
    FactRow,
    ImportError as ImportErrorModel,
    ImportRun,
    ImportStatus,
    ImportMode,
    RawRow,
)

# Column mapping A->Q (0-indexed)
COLUMN_MAP = {
    0: "bar",
    1: "date",
    2: "agent",
    3: "staff",
    4: "position",
    5: "salary",
    6: "start",
    7: "late",
    8: "drinks",
    9: "off",
    10: "cut_late",
    11: "cut_drink",
    12: "cut_other",
    13: "total",
    14: "sale",
    15: "profit",
    16: "contract",
}

# Error types for import_errors
class ErrorType:
    MISSING_BAR = "MISSING_BAR"
    MISSING_DATE = "MISSING_DATE"
    MISSING_STAFF = "MISSING_STAFF"
    INVALID_DATE = "INVALID_DATE"
    INVALID_NUMERIC = "INVALID_NUMERIC"
    EMPTY_ROW = "EMPTY_ROW"

def _get_sheets_service():
    """Initialize Google Sheets API service."""
    settings = get_settings()
    credentials = service_account.Credentials.from_service_account_file(
        settings.google_credentials_path,
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
    )
    # Increase timeout to 10 minutes (600s) to avoid read timeouts on large sheets
    http = httplib2.Http(timeout=600)
    authorized_http = AuthorizedHttp(credentials, http=http)
    return build("sheets", "v4", http=authorized_http)


def normalize_row(row: list[str]) -> dict[str, str | None]:
    """
    Normalize a sheet row to a dictionary.
    Applies: trim whitespace, map columns A->Q.
    Returns None for empty cells.
    """
    normalized = {}
    for idx, col_name in COLUMN_MAP.items():
        value = row[idx].strip() if idx < len(row) and row[idx] else None
        normalized[col_name] = value if value else None
    return normalized


def compute_row_hash(normalized: dict[str, str | None]) -> str:
    """
    Compute SHA256 hash of normalized row data (A:Q only).
    Deterministic ordering ensures same data = same hash.
    """
    # Build a stable string representation
    parts = []
    for idx in sorted(COLUMN_MAP.keys()):
        col_name = COLUMN_MAP[idx]
        value = normalized.get(col_name) or ""
        parts.append(f"{col_name}:{value}")
    row_str = "|".join(parts)
    return hashlib.sha256(row_str.encode("utf-8")).hexdigest()


def compute_business_key(bar: str, date_str: str, staff_id: str, row_num: int) -> str:
    """
    Compute SHA256 business key = sha256(bar|date|staff_id|row_num).
    This includes row_num to support duplicate entries (same staff/date/bar) 
    appearing on different lines in the sheet.
    """
    key_str = f"{bar}|{date_str}|{staff_id}|{row_num}"
    return hashlib.sha256(key_str.encode("utf-8")).hexdigest()


def extract_staff_num_prefix(staff_id: str) -> int | None:
    """
    Extract numeric prefix from staff_id "NNN - NICKNAME".
    Returns None if no valid prefix found.
    """
    if not staff_id:
        return None
    # Match leading digits before " - "
    match = re.match(r"^(\d+)\s*-", staff_id)
    if match:
        return int(match.group(1))
    # Try just leading digits
    match = re.match(r"^(\d+)", staff_id)
    return int(match.group(1)) if match else None


def parse_date(date_str: str | None) -> datetime | None:
    """
    Parse date string to datetime.
    Supports multiple formats found in sheets.
    """
    if not date_str:
        return None
    
    # Common date formats
    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d-%m-%Y",
        "%Y/%m/%d",
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    # Try parsing as Excel serial date
    try:
        serial = float(date_str)
        if 40000 < serial < 50000:  # Reasonable range for 2009-2036
            # Excel serial to Python datetime
            from datetime import timedelta
            return datetime(1899, 12, 30) + timedelta(days=serial)
    except ValueError:
        pass
    
    return None


def parse_numeric(value: str | None) -> float | None:
    """
    Parse numeric value, return None if invalid or empty.
    Handles:
    - Currency prefixes like 'THB', '-THB', 'THB  -'
    - Thousands separators (commas)
    - Decimal points and commas as decimal separators
    """
    if not value:
        return None
    
    # Try to clean up and parse
    try:
        cleaned = value.strip()
        if not cleaned:
            return None
        
        # Check for negative indicator
        is_negative = False
        if cleaned.startswith('-') or 'THB  -' in cleaned or 'THB -' in cleaned:
            is_negative = True
            
        # Remove currency prefixes, unicode spaces, and normal spaces
        # Handle \u202f (narrow no-break space) commonly used in these sheets
        cleaned = cleaned.replace('THB', '').replace('-', '')
        cleaned = cleaned.replace('\u202f', '').replace(' ', '')
        
        # Handle decimal separator
        # The sheet uses comma as decimal separator (e.g. "1 000,00")
        # We must remove dots (if used as thousands sep) and replace comma with dot
        cleaned = cleaned.replace('.', '') 
        cleaned = cleaned.replace(',', '.')
        
        if not cleaned:
            return None
        
        result = float(cleaned)
        return -result if is_negative else result
    except ValueError:
        return None


def validate_row(normalized: dict[str, str | None], row_number: int) -> list[tuple[str, str]]:
    """
    Validate a normalized row.
    Returns list of (error_type, message) tuples. Empty if valid.
    """
    errors = []
    
    # Check if entire row is empty
    if all(v is None for v in normalized.values()):
        # We silently skip empty rows now, but if one sneaks in:
        errors.append((ErrorType.EMPTY_ROW, f"Row {row_number} is empty"))
        return errors
    
    # Required fields
    if not normalized.get("bar"):
        errors.append((ErrorType.MISSING_BAR, f"Row {row_number}: Missing BAR value"))
    
    if not normalized.get("date"):
        errors.append((ErrorType.MISSING_DATE, f"Row {row_number}: Missing DATE value"))
    elif parse_date(normalized["date"]) is None:
        errors.append((ErrorType.INVALID_DATE, f"Row {row_number}: Invalid DATE format '{normalized['date']}'"))
    
    if not normalized.get("staff"):
        errors.append((ErrorType.MISSING_STAFF, f"Row {row_number}: Missing STAFF value"))
    
    # Numeric field validation (optional fields, but validate format if present)
    numeric_fields = ["salary", "late", "drinks", "off", "cut_late", "cut_drink", 
                      "cut_other", "total", "sale", "profit"]
    for field in numeric_fields:
        value = normalized.get(field)
        if value and parse_numeric(value) is None:
            errors.append((
                ErrorType.INVALID_NUMERIC, 
                f"Row {row_number}: Invalid numeric value for {field.upper()}: '{value}'"
            ))
    
    return errors


async def derive_agent_id(db: AsyncSession, bar: str, staff_num_prefix: int | None) -> int | None:
    """
    Derive agent_id from staff_num_prefix using agent_range_rules for the given bar.
    Returns None if no matching rule found or prefix is None.
    """
    if staff_num_prefix is None:
        return None
    
    result = await db.execute(
        select(AgentRangeRule)
        .where(AgentRangeRule.bar == bar)
        .where(AgentRangeRule.range_start <= staff_num_prefix)
        .where(AgentRangeRule.range_end >= staff_num_prefix)
    )
    rule = result.scalar_one_or_none()
    return rule.agent_id if rule else None


def parse_agent_label(agent_str: str | None) -> int | None:
    """
    Parse agent label from sheet (e.g., "AGENT #5" -> 5, "5" -> 5).
    Returns None if not parseable.
    """
    if not agent_str:
        return None
    # Try to extract number from "AGENT #N" or just "N"
    match = re.search(r"#?\s*(\d+)", agent_str)
    return int(match.group(1)) if match else None


async def fetch_sheet_data(source: DataSource) -> list[list[str]]:
    """
    Fetch data from Google Sheets.
    Reads only columns A:Q as specified.
    """
    service = _get_sheets_service()
    range_spec = f"{source.tab_name}!{source.range_spec}"
    
    result = service.spreadsheets().values().get(
        spreadsheetId=source.sheet_id,
        range=range_spec,
    ).execute()
    
    original_rows = result.get("values", [])
    rows = []
    
    # Skip header row if present
    start_idx = 0
    if original_rows and original_rows[0] and any(h.upper() in ["BAR", "DATE", "STAFF", "AGENT"] 
                                 for h in original_rows[0] if isinstance(h, str)):
        start_idx = 1
        
    # Filter empty rows and ghost rows (formulas without data)
    for row in original_rows[start_idx:]:
        # Must have BAR (col 0) and STAFF (col 3) to be valid
        # Row must also be long enough to contain these
        if (len(row) > 0 and row[0].strip() and 
            len(row) > 3 and row[3].strip()):
            rows.append(row)
    
    return rows


async def run_import(
    db: AsyncSession,
    source_years: list[int],
    mode: str = "full",
    window_days: int | None = None,
    dry_run: bool = True,
) -> list[ImportRun]:
    """
    Run import for specified data sources.
    
    Args:
        db: Database session
        source_years: List of years to import (e.g., [2025, 2026])
        mode: "full" or "incremental"
        window_days: For incremental mode, only process recent N days
        dry_run: If True, only fetch and validate (STAGED). If False, also commit to fact_rows (COMPLETED).
    
    Returns:
        List of ImportRun records with stats
    """
    import_runs = []
    
    # Get data sources
    result = await db.execute(
        select(DataSource).where(DataSource.year.in_(source_years)).where(DataSource.is_active == True)
    )
    sources = list(result.scalars().all())
    
    if not sources:
        raise ValueError(f"No active data sources found for years: {source_years}")
    
    for source in sources:
        import_run = await _run_single_import(db, source, mode, window_days, dry_run)
        import_runs.append(import_run)
    
    return import_runs


async def commit_import(db: AsyncSession, run_id: int) -> ImportRun:
    """
    Commit a STAGED import run:
    1. Verify run exists and is STAGED
    2. Read all RawRows for this run
    3. Insert valid rows into FactRows
    4. Update run status to COMPLETED
    """
    # Get the run
    result = await db.execute(select(ImportRun).where(ImportRun.id == run_id))
    import_run = result.scalar_one_or_none()
    
    if not import_run:
        raise ValueError("Import run not found")
    
    if import_run.status != ImportStatus.STAGED:
        raise ValueError(f"Run must be STAGED to commit (current: {import_run.status})")
    
    # Re-run the processing logic "as if" it was a live import, BUT using saved RawRows
    # Actually, simpler: we just need to re-run the "FactRow creation" part of the loop.
    # To keep code DRY, we can refactor `_run_single_import` or just duplicate the "Raw -> Fact" logic here.
    # Given the complexity of `_run_single_import` (fetching, normalizing), let's duplicate the Logic Part only.
    
    # Reset stats for the commit phase
    stats = {
        "rows_inserted": 0,
        "rows_updated": 0,
        "rows_unchanged": 0,
    }
    
    try:
        # Fetch all raw rows
        result = await db.execute(
            select(RawRow).where(RawRow.import_run_id == run_id).order_by(RawRow.sheet_row_number)
        )
        raw_rows = result.scalars().all()
        
        for raw_row in raw_rows:
            normalized = raw_row.row_data
            row_hash = raw_row.row_hash
            row_idx = raw_row.sheet_row_number
            
            # Validation was already done and logged to ImportErrors.
            # We assume if it's in RawRows, we want to try to process it. 
            # However, if it had CRITICAL validation errors? 
            # In `_run_single_import`, we skipped rows with validation errors mostly.
            # But we saved RawRow BEFORE validation check in the original loop? 
            # WAIT: In `_run_single_import`, we add RawRow even if invalid?
            # Looking at code: `db.add(raw_row)` -> `validate_row` -> if errors continue.
            # So RawRows contains INVALID rows too.
            # We must re-validate or filter out invalid rows.
            
            # Re-validate to filter out bad rows
            errors = validate_row(normalized, row_idx)
            if errors:
                continue
            
            # Parse and prepare fact row logic (Re-used)
            bar = normalized["bar"]
            date_str = normalized["date"]
            staff_id = normalized["staff"]
            parsed_date = parse_date(date_str)
            if not parsed_date: continue # Should be caught by validation, but safety
            
            business_key = compute_business_key(bar, date_str, staff_id, row_idx)
            
            staff_num_prefix = extract_staff_num_prefix(staff_id)
            agent_id_derived = await derive_agent_id(db, bar, staff_num_prefix)
            agent_label_parsed = parse_agent_label(normalized.get("agent"))
            agent_mismatch = (
                agent_label_parsed is not None and 
                agent_id_derived is not None and 
                agent_label_parsed != agent_id_derived
            )
            
            # Upsert logic
            existing = await db.execute(
                select(FactRow).where(FactRow.business_key == business_key)
            )
            existing_row = existing.scalar_one_or_none()
            
            if existing_row:
                if existing_row.row_hash == row_hash:
                    stats["rows_unchanged"] += 1
                else:
                    existing_row.row_hash = row_hash
                    existing_row.last_import_run_id = import_run.id
                    existing_row.agent_label = normalized.get("agent")
                    existing_row.position = normalized.get("position")
                    existing_row.salary = parse_numeric(normalized.get("salary"))
                    existing_row.start_time = normalized.get("start")
                    existing_row.late = parse_numeric(normalized.get("late"))
                    existing_row.drinks = parse_numeric(normalized.get("drinks"))
                    existing_row.off = parse_numeric(normalized.get("off"))
                    existing_row.cut_late = parse_numeric(normalized.get("cut_late"))
                    existing_row.cut_drink = parse_numeric(normalized.get("cut_drink"))
                    existing_row.cut_other = parse_numeric(normalized.get("cut_other"))
                    existing_row.total = parse_numeric(normalized.get("total"))
                    existing_row.sale = parse_numeric(normalized.get("sale"))
                    existing_row.profit = parse_numeric(normalized.get("profit"))
                    existing_row.contract = normalized.get("contract")
                    existing_row.staff_num_prefix = staff_num_prefix
                    existing_row.agent_id_derived = agent_id_derived
                    existing_row.agent_mismatch = agent_mismatch
                    stats["rows_updated"] += 1
            else:
                fact_row = FactRow(
                    business_key=business_key,
                    source_year=import_run.source_year,
                    last_import_run_id=import_run.id,
                    row_hash=row_hash,
                    bar=bar,
                    date=parsed_date,
                    agent_label=normalized.get("agent"),
                    staff_id=staff_id,
                    position=normalized.get("position"),
                    salary=parse_numeric(normalized.get("salary")),
                    start_time=normalized.get("start"),
                    late=parse_numeric(normalized.get("late")),
                    drinks=parse_numeric(normalized.get("drinks")),
                    off=parse_numeric(normalized.get("off")),
                    cut_late=parse_numeric(normalized.get("cut_late")),
                    cut_drink=parse_numeric(normalized.get("cut_drink")),
                    cut_other=parse_numeric(normalized.get("cut_other")),
                    total=parse_numeric(normalized.get("total")),
                    sale=parse_numeric(normalized.get("sale")),
                    profit=parse_numeric(normalized.get("profit")),
                    contract=normalized.get("contract"),
                    staff_num_prefix=staff_num_prefix,
                    agent_id_derived=agent_id_derived,
                    agent_mismatch=agent_mismatch,
                )
                db.add(fact_row)
                stats["rows_inserted"] += 1

        # Update run stats
        import_run.status = ImportStatus.COMPLETED
        import_run.completed_at = datetime.utcnow()
        import_run.rows_inserted = stats["rows_inserted"]
        import_run.rows_updated = stats["rows_updated"]
        import_run.rows_unchanged = stats["rows_unchanged"]
        # rows_errored and rows_fetched remains same from STAGED phase
        
        await db.commit()
        await db.refresh(import_run)
        return import_run
        
    except Exception as e:
        import_run.status = ImportStatus.FAILED
        import_run.error_message = f"Commit failed: {str(e)}"
        await db.commit()
        raise


async def _run_single_import(
    db: AsyncSession,
    source: DataSource,
    mode: str,
    window_days: int | None,
    dry_run: bool,
) -> ImportRun:
    """Run import for a single data source."""
    
    # Create import run record
    import_run = ImportRun(
        source_year=source.year,
        source_sheet_id=source.sheet_id,
        mode=ImportMode(mode.upper()),
        status=ImportStatus.RUNNING if not dry_run else ImportStatus.STAGED,
    )
    db.add(import_run)
    await db.flush()
    await db.refresh(import_run)
    
    stats = {
        "rows_fetched": 0,
        "rows_inserted": 0,
        "rows_updated": 0,
        "rows_unchanged": 0,
        "rows_errored": 0,
    }
    
    try:
        # Fetch data from Google Sheets
        rows = await fetch_sheet_data(source)
        stats["rows_fetched"] = len(rows)
        
        all_row_hashes = []
        
        for row_idx, row in enumerate(rows, start=2):  # Start at 2 (1-indexed, skip header)
            # Normalize
            normalized = normalize_row(row)
            row_hash = compute_row_hash(normalized)
            all_row_hashes.append(row_hash)
            
            # Write to raw_rows (immutable staging)
            raw_row = RawRow(
                import_run_id=import_run.id,
                sheet_row_number=row_idx,
                row_data=normalized,
                row_hash=row_hash,
            )
            db.add(raw_row)
            
            # Validate
            errors = validate_row(normalized, row_idx)
            if errors:
                stats["rows_errored"] += 1
                for error_type, error_msg in errors:
                    import_error = ImportErrorModel(
                        import_run_id=import_run.id,
                        sheet_row_number=row_idx,
                        error_type=error_type,
                        error_message=error_msg,
                        row_data=normalized,
                    )
                    db.add(import_error)
                
                continue  # Skip to next row
            
            # Parse and prepare fact row
            bar = normalized["bar"]
            date_str = normalized["date"]
            staff_id = normalized["staff"]
            parsed_date = parse_date(date_str)
            
            # Skip if we couldn't parse date (should have been caught in validation)
            if not parsed_date:
                continue
            
            # Use row_idx in business key to allow duplicates from different rows
            business_key = compute_business_key(bar, date_str, staff_id, row_idx)
            
            # If dry_run, we stop here for this row (staged only)
            if dry_run:
                continue

            # Derive fields
            staff_num_prefix = extract_staff_num_prefix(staff_id)
            agent_id_derived = await derive_agent_id(db, bar, staff_num_prefix)
            agent_label_parsed = parse_agent_label(normalized.get("agent"))
            agent_mismatch = (
                agent_label_parsed is not None and 
                agent_id_derived is not None and 
                agent_label_parsed != agent_id_derived
            )
            
            # Check if fact row exists
            existing = await db.execute(
                select(FactRow).where(FactRow.business_key == business_key)
            )
            existing_row = existing.scalar_one_or_none()
            
            if existing_row:
                if existing_row.row_hash == row_hash:
                    # Unchanged
                    stats["rows_unchanged"] += 1
                else:
                    # Update existing row
                    existing_row.row_hash = row_hash
                    existing_row.last_import_run_id = import_run.id
                    existing_row.agent_label = normalized.get("agent")
                    existing_row.position = normalized.get("position")
                    existing_row.salary = parse_numeric(normalized.get("salary"))
                    existing_row.start_time = normalized.get("start")
                    existing_row.late = parse_numeric(normalized.get("late"))
                    existing_row.drinks = parse_numeric(normalized.get("drinks"))
                    existing_row.off = parse_numeric(normalized.get("off"))
                    existing_row.cut_late = parse_numeric(normalized.get("cut_late"))
                    existing_row.cut_drink = parse_numeric(normalized.get("cut_drink"))
                    existing_row.cut_other = parse_numeric(normalized.get("cut_other"))
                    existing_row.total = parse_numeric(normalized.get("total"))
                    existing_row.sale = parse_numeric(normalized.get("sale"))
                    existing_row.profit = parse_numeric(normalized.get("profit"))
                    existing_row.contract = normalized.get("contract")
                    existing_row.staff_num_prefix = staff_num_prefix
                    existing_row.agent_id_derived = agent_id_derived
                    existing_row.agent_mismatch = agent_mismatch
                    stats["rows_updated"] += 1
            else:
                # Insert new fact row
                fact_row = FactRow(
                    business_key=business_key,
                    source_year=source.year,
                    last_import_run_id=import_run.id,
                    row_hash=row_hash,
                    bar=bar,
                    date=parsed_date,
                    agent_label=normalized.get("agent"),
                    staff_id=staff_id,
                    position=normalized.get("position"),
                    salary=parse_numeric(normalized.get("salary")),
                    start_time=normalized.get("start"),
                    late=parse_numeric(normalized.get("late")),
                    drinks=parse_numeric(normalized.get("drinks")),
                    off=parse_numeric(normalized.get("off")),
                    cut_late=parse_numeric(normalized.get("cut_late")),
                    cut_drink=parse_numeric(normalized.get("cut_drink")),
                    cut_other=parse_numeric(normalized.get("cut_other")),
                    total=parse_numeric(normalized.get("total")),
                    sale=parse_numeric(normalized.get("sale")),
                    profit=parse_numeric(normalized.get("profit")),
                    contract=normalized.get("contract"),
                    staff_num_prefix=staff_num_prefix,
                    agent_id_derived=agent_id_derived,
                    agent_mismatch=agent_mismatch,
                )
                db.add(fact_row)
                stats["rows_inserted"] += 1
        
        # Compute overall checksum (hash of all row hashes)
        checksum_str = "|".join(sorted(all_row_hashes))
        checksum = hashlib.sha256(checksum_str.encode("utf-8")).hexdigest()
        
        # Update import run with stats
        if not dry_run:
            import_run.status = ImportStatus.COMPLETED
        import_run.completed_at = datetime.utcnow()
        import_run.rows_fetched = stats["rows_fetched"]
        import_run.rows_inserted = stats["rows_inserted"]
        import_run.rows_updated = stats["rows_updated"]
        import_run.rows_unchanged = stats["rows_unchanged"]
        import_run.rows_errored = stats["rows_errored"]
        import_run.checksum = checksum
        
        await db.commit()
        await db.refresh(import_run)
        
    except Exception as e:
        import_run.status = ImportStatus.FAILED
        import_run.completed_at = datetime.utcnow()
        import_run.error_message = str(e)
        await db.commit()
        await db.refresh(import_run)
        raise
    
    return import_run
