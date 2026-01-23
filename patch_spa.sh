#!/bin/bash
set -e

APP_DIR="/var/www/digital-shadow-v2"
MAIN_PY="$APP_DIR/backend/app/main.py"

echo ">>> Patching main.py for SPA Support..."

# Create a temporary python script to locate main.py
cat > "$APP_DIR/patch_main.py" <<EOF
import os

main_py_path = "$MAIN_PY"
frontend_build_path = "$APP_DIR/frontend_build"

new_code = r'''
# Serve frontend static files in production
# Check for deployment structure (frontend_build at root, backend at root)
project_root = Path(__file__).parent.parent.parent
frontend_build = project_root / "frontend_build"

# Fallback for local dev or different structure
if not frontend_build.exists():
    frontend_build = project_root / "frontend" / "dist"

if frontend_build.exists():
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles

    # Mount assets specifically
    assets_path = frontend_build / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

    # Catch-all for SPA
    @app.get("/{path_name:path}")
    async def catch_all(path_name: str):
         # Do not interfere with API routes (they are checked first by FastAPI order)
         if path_name.startswith("api") or path_name.startswith("docs") or path_name.startswith("openapi"):
             from fastapi import HTTPException
             raise HTTPException(status_code=404, detail="Not Found")
             
         file_path = frontend_build / path_name
         if file_path.is_file():
             return FileResponse(file_path)
             
         # Default to index.html for SPA routing
         return FileResponse(frontend_build / "index.html")
'''

with open(main_py_path, 'r') as f:
    content = f.read()

# Remove the old static files block
old_block_start = 'frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"'
if old_block_start in content:
    parts = content.split(old_block_start)
    # Reassemble with new code
    # We find the part before the old block, and strip trailing newlines
    pre_content = parts[0].rstrip()
    
    # Write the new content
    with open(main_py_path, 'w') as f:
        f.write(pre_content + "\n\n" + new_code)
    print("Successfully patched main.py")
else:
    print("Could not find invalid static files block. Overwriting end of file...")
    # Fallback: Just look for @app.get("/api/health") and append
    if '@app.get("/api/health")' in content:
         # Rough heuristic: Read until the end of the health function
         lines = content.splitlines()
         # Find where health check ends (it is currently the last function)
         # We will just rewrite the file up to the end of health check + new code
         # This is risky doing via bash/python string manipulation without parsing.
         # Safer: Just replace the file content completely since we know the source.
         pass

EOF

# Actually, replacing the file is safer since I have the source.
cat > "$MAIN_PY" <<EOF
"""
Digital Shadow - FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api import auth_router, import_router, rows_router, settings_router
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


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.app_version}


# Serve frontend static files in production
# Check for deployment structure (frontend_build at root, backend at root)
project_root = Path(__file__).parent.parent.parent
frontend_build = project_root / "frontend_build"

# Fallback for local dev or different structure
if not frontend_build.exists():
    frontend_build = project_root / "frontend" / "dist"

if frontend_build.exists():
    # Mount assets specifically
    assets_path = frontend_build / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

    # Catch-all for SPA
    @app.get("/{path_name:path}")
    async def catch_all(path_name: str):
         # Do not interfere with API routes
         if path_name.startswith("api") or path_name.startswith("docs") or path_name.startswith("openapi"):
             from fastapi import HTTPException
             raise HTTPException(status_code=404, detail="Not Found")
             
         file_path = frontend_build / path_name
         if file_path.is_file():
             return FileResponse(file_path)
             
         # Default to index.html for SPA routing
         return FileResponse(frontend_build / "index.html")
EOF

echo "File overwritten. Restarting service..."
sudo systemctl restart digital-shadow-v2
sudo systemctl status digital-shadow-v2 --no-pager
