"""
API dependencies for authentication and database access.
"""
from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import decode_token
from app.models import AppUser, UserRole


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    access_token: Annotated[str | None, Cookie()] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> AppUser:
    """Get the current authenticated user from JWT cookie or Authorization header."""
    token = None
    
    # Try cookie first
    if access_token:
        token = access_token
    # Then try Authorization header (Bearer token)
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    result = await db.execute(
        select(AppUser).where(AppUser.id == int(user_id), AppUser.is_active == True)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    
    return user


async def get_current_admin(
    current_user: Annotated[AppUser, Depends(get_current_user)],
) -> AppUser:
    """Require admin role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# Type aliases for dependency injection
CurrentUser = Annotated[AppUser, Depends(get_current_user)]
CurrentAdmin = Annotated[AppUser, Depends(get_current_admin)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
