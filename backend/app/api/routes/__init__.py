"""Routes module - API endpoints."""
from app.api.routes.auth import router as auth_router
from app.api.routes.import_ import router as import_router
from app.api.routes.rows import router as rows_router
from app.api.routes.settings import router as settings_router
from app.api.routes.users import router as users_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.ai_analyst import router as ai_analyst_router
from app.api.routes.contracts import router as contracts_router
from app.api.routes.profiles import router as profiles_router

__all__ = ["auth_router", "import_router", "rows_router", "settings_router", "users_router", "analytics_router", "ai_analyst_router", "contracts_router", "profiles_router"]

