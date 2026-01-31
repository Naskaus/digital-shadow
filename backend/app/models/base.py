"""
SQLAlchemy models for Digital Shadow.
"""
import enum
import uuid
from datetime import date, datetime, time
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    LargeBinary,
    Numeric,
    String,
    Text,
    Time,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


class UserRole(str, enum.Enum):
    """User role enumeration."""
    ADMIN = "admin"
    VIEWER = "viewer"


class ImportMode(str, enum.Enum):
    """Import mode enumeration."""
    FULL = "FULL"
    INCREMENTAL = "INCREMENTAL"


class ImportStatus(str, enum.Enum):
    """Import run status."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    STAGED = "STAGED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


# --- User & Auth Models ---

class AppUser(Base):
    """Application user model."""
    __tablename__ = "app_users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.VIEWER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    """Refresh token for JWT rotation."""
    __tablename__ = "refresh_tokens"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    user: Mapped["AppUser"] = relationship(back_populates="refresh_tokens")


# --- Import Models ---

class ImportRun(Base):
    """Import run audit log."""
    __tablename__ = "import_runs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[ImportStatus] = mapped_column(Enum(ImportStatus), default=ImportStatus.PENDING)
    mode: Mapped[ImportMode] = mapped_column(Enum(ImportMode), default=ImportMode.FULL)
    source_year: Mapped[int] = mapped_column(Integer, nullable=False)
    source_sheet_id: Mapped[str] = mapped_column(String(255), nullable=False)
    rows_fetched: Mapped[int] = mapped_column(Integer, default=0)
    rows_inserted: Mapped[int] = mapped_column(Integer, default=0)
    rows_updated: Mapped[int] = mapped_column(Integer, default=0)
    rows_unchanged: Mapped[int] = mapped_column(Integer, default=0)
    rows_errored: Mapped[int] = mapped_column(Integer, default=0)
    checksum: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Relationships
    errors: Mapped[list["ImportError"]] = relationship(back_populates="import_run", cascade="all, delete-orphan")


class RawRow(Base):
    """Immutable staging table for raw sheet data."""
    __tablename__ = "raw_rows"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    import_run_id: Mapped[int] = mapped_column(ForeignKey("import_runs.id", ondelete="CASCADE"), nullable=False)
    sheet_row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    row_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)  # A->Q columns
    row_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA256 of normalized row
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class FactRow(Base):
    """Business fact table with derived fields."""
    __tablename__ = "fact_rows"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    business_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)  # sha256(bar|date|staff_id)
    
    # Source tracking
    source_year: Mapped[int] = mapped_column(Integer, nullable=False)
    last_import_run_id: Mapped[int] = mapped_column(ForeignKey("import_runs.id"), nullable=False)
    row_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    
    # Core fields from sheet (A->Q)
    bar: Mapped[str] = mapped_column(String(50), nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    agent_label: Mapped[str | None] = mapped_column(String(50), nullable=True)  # From sheet AGENT column
    staff_id: Mapped[str] = mapped_column(String(100), nullable=False)  # Atomic: "NNN - NICKNAME"
    position: Mapped[str | None] = mapped_column(String(50), nullable=True)
    salary: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    start_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    late: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    drinks: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    off: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    cut_late: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    cut_drink: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    cut_other: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    total: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    sale: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    profit: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    contract: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    # Derived fields
    staff_num_prefix: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Extracted from staff_id
    agent_id_derived: Mapped[int | None] = mapped_column(Integer, nullable=True)  # From agent_range_rules
    agent_mismatch: Mapped[bool] = mapped_column(Boolean, default=False)  # agent_label != derived
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class ImportError(Base):
    """Import error log."""
    __tablename__ = "import_errors"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    import_run_id: Mapped[int] = mapped_column(ForeignKey("import_runs.id", ondelete="CASCADE"), nullable=False)
    sheet_row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    error_type: Mapped[str] = mapped_column(String(50), nullable=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    row_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    # Relationships
    import_run: Mapped["ImportRun"] = relationship(back_populates="errors")


# --- Configuration Models ---

class AgentRangeRule(Base):
    """Agent assignment rules per bar."""
    __tablename__ = "agent_range_rules"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bar: Mapped[str] = mapped_column(String(50), nullable=False)
    agent_id: Mapped[int] = mapped_column(Integer, nullable=False)
    range_start: Mapped[int] = mapped_column(Integer, nullable=False)
    range_end: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class DataSource(Base):
    """Google Sheets data source configuration."""
    __tablename__ = "data_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    year: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    sheet_id: Mapped[str] = mapped_column(String(255), nullable=False)
    tab_name: Mapped[str] = mapped_column(String(100), nullable=False)
    range_spec: Mapped[str] = mapped_column(String(50), default="A:Q")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


# --- AI Analyst Models ---

class AIAnalystQuery(Base):
    """Audit log for AI Analyst queries."""
    __tablename__ = "ai_analyst_queries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app_users.id"), nullable=False)
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    context_filters: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    response_text: Mapped[str] = mapped_column(Text, nullable=False)
    model_used: Mapped[str] = mapped_column(String(50), nullable=False)
    tokens_used: Mapped[int] = mapped_column(Integer, nullable=False)
    response_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# --- Contract Models ---

class ContractType(Base):
    """Contract type configuration with penalty and commission rules."""
    __tablename__ = "contract_types"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    late_cutoff_time: Mapped[time] = mapped_column(Time, nullable=False)
    first_minute_penalty_thb: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    additional_minutes_penalty_thb: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    drink_price_thb: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    staff_commission_thb: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


# --- Profile Models ---

class ProfileType(str, enum.Enum):
    """Profile type: staff member or agent."""
    STAFF = "STAFF"
    AGENT = "AGENT"


class StaffPosition(str, enum.Enum):
    """Staff position type."""
    DANCER = "DANCER"
    PR = "PR"


class Profile(Base):
    """Staff member or agent profile."""
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    profile_type: Mapped[ProfileType] = mapped_column(Enum(ProfileType), nullable=False)

    # Identity (mutually exclusive based on profile_type)
    staff_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)  # "046 - MAPRANG"
    agent_key: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)  # "MANDARIN|5"

    # Common fields
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    picture: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)  # BYTEA, <5MB enforced in API
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    line_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    instagram: Mapped[str | None] = mapped_column(String(100), nullable=True)
    facebook: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tiktok: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Staff-only fields (NULL for agents)
    position: Mapped[StaffPosition | None] = mapped_column(Enum(StaffPosition), nullable=True)
    size: Mapped[str | None] = mapped_column(String(20), nullable=True)
    weight: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    bars: Mapped[list["ProfileBar"]] = relationship(back_populates="profile", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(
            "(profile_type = 'STAFF' AND staff_id IS NOT NULL AND agent_key IS NULL) OR "
            "(profile_type = 'AGENT' AND agent_key IS NOT NULL AND staff_id IS NULL)",
            name="ck_profile_type_identity",
        ),
        CheckConstraint(
            "(profile_type = 'AGENT' AND position IS NULL AND size IS NULL AND weight IS NULL) OR "
            "(profile_type = 'STAFF')",
            name="ck_agent_no_staff_fields",
        ),
        Index("ix_profiles_staff_id", "staff_id", postgresql_where=text("staff_id IS NOT NULL")),
        Index("ix_profiles_agent_key", "agent_key", postgresql_where=text("agent_key IS NOT NULL")),
    )


class ProfileBar(Base):
    """Junction table: which bars a profile is associated with."""
    __tablename__ = "profile_bars"

    profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True
    )
    bar: Mapped[str] = mapped_column(String(50), primary_key=True)  # "MANDARIN", "SHARK", etc.
    agent_key: Mapped[str | None] = mapped_column(String(100), nullable=True)  # For STAFF: managing agent at this bar

    # Relationships
    profile: Mapped["Profile"] = relationship(back_populates="bars")
