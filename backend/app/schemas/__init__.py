"""Pydantic schemas for API request/response."""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field


# --- Auth Schemas ---

class UserRole(str, Enum):
    ADMIN = "admin"
    VIEWER = "viewer"


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Import Schemas ---

class ImportMode(str, Enum):
    FULL = "FULL"
    INCREMENTAL = "INCREMENTAL"


class ImportStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    STAGED = "STAGED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ImportRunRequest(BaseModel):
    sources: list[int]  # List of years to import (e.g., [2025, 2026])
    mode: ImportMode = ImportMode.FULL
    window_days: int | None = None  # For incremental mode
    dry_run: bool = True  # If true, runs in staging mode


class ImportRunResponse(BaseModel):
    id: int
    started_at: datetime
    completed_at: datetime | None
    status: ImportStatus
    mode: ImportMode
    source_year: int
    rows_fetched: int
    rows_inserted: int
    rows_updated: int
    rows_unchanged: int
    rows_errored: int
    checksum: str | None
    error_message: str | None

    class Config:
        from_attributes = True


class ImportErrorResponse(BaseModel):
    id: int
    sheet_row_number: int
    error_type: str
    error_message: str
    row_data: dict | None
    created_at: datetime

    class Config:
        from_attributes = True


class MismatchResponse(BaseModel):
    """Response for agent mismatch rows."""
    id: int
    bar: str
    date: datetime
    staff_id: str
    agent_label: str | None
    agent_id_derived: int | None

    class Config:
        from_attributes = True


# --- Row Schemas ---

class FactRowResponse(BaseModel):
    id: int
    business_key: str
    source_year: int
    bar: str
    date: datetime
    agent_label: str | None
    staff_id: str
    position: str | None
    salary: float | None
    start_time: str | None
    late: float | None
    drinks: float | None
    off: float | None
    cut_late: float | None
    cut_drink: float | None
    cut_other: float | None
    total: float | None
    sale: float | None
    profit: float | None
    contract: str | None
    staff_num_prefix: int | None
    agent_id_derived: int | None
    agent_mismatch: bool

    class Config:
        from_attributes = True


class RowsKPIResponse(BaseModel):
    total_rows: int
    total_profit: float
    total_drinks: float
    avg_profit: float
    unique_staff: int


# --- Settings Schemas ---

class DataSourceBase(BaseModel):
    year: int
    sheet_id: str
    tab_name: str
    range_spec: str = "A:Q"
    is_active: bool = True


class DataSourceCreate(DataSourceBase):
    pass


class DataSourceResponse(DataSourceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgentRangeRuleBase(BaseModel):
    bar: str
    agent_id: int
    range_start: int
    range_end: int


class AgentRangeRuleCreate(AgentRangeRuleBase):
    pass


class AgentRangeRuleResponse(AgentRangeRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
