import asyncio
import sys
from app.core.db import async_session_factory
from app.core.security import get_password_hash
from app.models import AppUser
from sqlalchemy import select

async def create_admin():
    print("Connecting to database...")
    async with async_session_factory() as session:
        print("Checking for existing 'seb' user...")
        result = await session.execute(select(AppUser).where(AppUser.username == "seb"))
        user = result.scalars().first()
        
        password_hash = get_password_hash("seb12170")
        
        if user:
            print("User 'seb' exists. Updating password...")
            user.hashed_password = password_hash
            user.is_superuser = True
            user.is_active = True
        else:
            print("User 'seb' not found. Creating...")
            user = AppUser(
                username="seb",
                email="seb@naskaus.com", # Placeholder if needed
                hashed_password=password_hash,
                # is_superuser=True, # AppUser might not have is_superuser based on my read of base.py, check Role
                role="admin", 
                is_active=True,
            )
            session.add(user)
        
        await session.commit()
        print("Admin user 'seb' configured successfully!")

if __name__ == "__main__":
    # Ensure strict PYTHONPATH handling in case of issues
    try:
        asyncio.run(create_admin())
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
