"""
Digital Shadow - FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import auth_router, import_router, rows_router, settings_router, users_router
from app.core.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    lifespan=lifespan,
)

# CORS middleware for development
if settings.is_development:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# API routes
app.include_router(auth_router, prefix="/api")
app.include_router(import_router, prefix="/api")
app.include_router(rows_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(users_router, prefix="/api")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.app_version}


# Serve frontend static files in production
# Serve frontend static files in production
# Check for deployment structure (frontend_build at root, backend at root)
# Current file: .../backend/app/main.py
project_root = Path(__file__).parent.parent.parent
frontend_build = project_root / "frontend_build"

# Fallback for local dev or different structure
if not frontend_build.exists():
    frontend_build = project_root / "frontend" / "dist"

if frontend_build.exists():
    from fastapi.responses import FileResponse
    
    @app.get("/{path_name:path}")
    async def catch_all(path_name: str):
         # If path is a file in build, serve it; otherwise index.html
         file_path = frontend_build / path_name
         if file_path.is_file():
             return FileResponse(file_path)
         return FileResponse(frontend_build / "index.html")
