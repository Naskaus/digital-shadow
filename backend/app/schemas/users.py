"""Pydantic schemas for User Management API."""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    """User role enumeration."""
    ADMIN = "admin"
    VIEWER = "viewer"


class UserCreate(BaseModel):
    """Schema for creating a new user."""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    role: UserRole = UserRole.VIEWER


class UserUpdate(BaseModel):
    """Schema for updating an existing user."""
    email: EmailStr | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class UserPasswordUpdate(BaseModel):
    """Schema for admin password reset."""
    password: str = Field(..., min_length=8, description="New password must be at least 8 characters")


class UserResponse(BaseModel):
    """Schema for user response (NO password exposed)."""
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
