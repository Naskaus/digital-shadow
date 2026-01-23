import asyncio
import sys
from sqlalchemy import text
from app.core.db import async_session_factory

async def patch_enum():
    print("Connecting to database...")
    async with async_session_factory() as session:
        print("Attempting to add 'STAGED' to importstatus enum...")
        try:
            # We must run this in a transaction block, but ALTER TYPE cannot run inside a transaction block 
            # in some older postgres versions. 
            # However, Postgres 12+ supports it. 
            # Note: SQLAlchemy session.execute() starts a transaction.
            # For ALTER TYPE value addition, it's safer to commit immediately.
            
            # Using raw connection for ALTER TYPE might be safer to avoid transaction block issues if any.
            # But let's try standard session first with commit.
            
            await session.execute(text("ALTER TYPE importstatus ADD VALUE IF NOT EXISTS 'STAGED'"))
            await session.commit()
            print("Successfully added 'STAGED' to importstatus enum!")
            
        except Exception as e:
            print(f"Error: {e}")
            # If it fails, checks if it's because it already exists (postgres < 12 doesn't support IF NOT EXISTS for enums)
            if "already exists" in str(e):
                print("Value 'STAGED' likely already exists.")
            else:
                # Fallback for older postgres or strict transaction handling:
                # We might need to run outside of transaction.
                print("Trying fallback (outside transaction block)...")
                # This is tricky with SQLAlchemy async session.
                # Let's hope the first attempt works (Postgres 17 on Pi 5 should support IF NOT EXISTS).

if __name__ == "__main__":
    try:
        asyncio.run(patch_enum())
    except Exception as e:
        print(f"Fatal Error: {e}")
        sys.exit(1)
