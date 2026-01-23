"""User management API routes - Admin only."""
from typing import Annotated

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentAdmin, DbSession
from app.core.security import get_password_hash
from app.models import AppUser, UserRole
from app.schemas.users import (
    UserCreate,
    UserPasswordUpdate,
    UserResponse,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    db: DbSession,
    current_user: CurrentAdmin,
):
    """List all users. Admin only."""
    result = await db.execute(select(AppUser).order_by(AppUser.created_at.desc()))
    users = result.scalars().all()
    return users


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    db: DbSession,
    current_user: CurrentAdmin,
    user_data: UserCreate,
):
    """Create a new user. Admin only."""
    # Hash the password before storing
    hashed_password = get_password_hash(user_data.password)
    
    # Generate username from email (before @)
    username = user_data.email.split("@")[0]
    
    # Create the new user
    new_user = AppUser(
        username=username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=UserRole(user_data.role.value),
        is_active=True,
    )
    
    try:
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists",
        )


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    db: DbSession,
    current_user: CurrentAdmin,
    user_id: int,
    user_data: UserUpdate,
):
    """Update user details (email, role, is_active). Admin only.
    
    Self-protection: Cannot deactivate yourself.
    """
    result = await db.execute(select(AppUser).where(AppUser.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Self-protection: prevent admin from deactivating themselves
    if user_id == current_user.id and user_data.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot deactivate your own account",
        )
    
    # Update fields if provided
    if user_data.email is not None:
        user.email = user_data.email
        # Update username based on new email
        user.username = user_data.email.split("@")[0]
    
    if user_data.role is not None:
        user.role = UserRole(user_data.role.value)
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    try:
        await db.commit()
        await db.refresh(user)
        return user
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists",
        )


@router.put("/{user_id}/password", response_model=UserResponse)
async def reset_user_password(
    db: DbSession,
    current_user: CurrentAdmin,
    user_id: int,
    password_data: UserPasswordUpdate,
):
    """Force reset a user's password. Admin only."""
    result = await db.execute(select(AppUser).where(AppUser.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Hash the new password
    user.hashed_password = get_password_hash(password_data.password)
    
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    db: DbSession,
    current_user: CurrentAdmin,
    user_id: int,
):
    """Delete a user permanently. Admin only.
    
    Self-protection: Cannot delete yourself.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete your own account",
        )
    
    result = await db.execute(select(AppUser).where(AppUser.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    await db.delete(user)
    await db.commit()
    return None
