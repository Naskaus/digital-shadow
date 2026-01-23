"""
Authentication routes.
"""
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import DbSession, get_current_user
from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from app.models import AppUser
from app.schemas import LoginRequest, TokenResponse, UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse)
async def login(
    db: DbSession,
    response: Response,
    request: LoginRequest,
) -> TokenResponse:
    """Authenticate user and set JWT cookies."""
    result = await db.execute(
        select(AppUser).where(
            (AppUser.username == request.username) | (AppUser.email == request.username),
            AppUser.is_active == True,
        )
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    
    # Create tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Set HttpOnly cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=not settings.is_development,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=not settings.is_development,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    )
    
    return TokenResponse(access_token=access_token)


@router.post("/logout")
async def logout(response: Response) -> dict:
    """Clear authentication cookies."""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    db: DbSession,
    request: UserCreate,
) -> AppUser:
    """Register a new user (first user becomes admin)."""
    # Check if username or email exists
    result = await db.execute(
        select(AppUser).where(
            (AppUser.username == request.username) | (AppUser.email == request.email)
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already registered",
        )
    
    # Check if this is the first user (make admin)
    count_result = await db.execute(select(AppUser))
    is_first_user = count_result.first() is None
    
    user = AppUser(
        username=request.username,
        email=request.email,
        hashed_password=get_password_hash(request.password),
        role="admin" if is_first_user else "viewer",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    
    return user


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[AppUser, Depends(get_current_user)],
) -> AppUser:
    """Get current user info."""
    return current_user
