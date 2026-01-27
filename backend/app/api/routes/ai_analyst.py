"""
AI Analyst routes - Experimental feature for performance analysis.

Access: Seb only
"""
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import and_, func, select

from app.api.deps import CurrentSeb, DbSession
from app.core.config import get_settings
from app.models.base import AIAnalystQuery
from app.schemas import AnalystQueryRequest, AnalystQueryResponse
from app.services.claude_analyst import ClaudeAnalystService

router = APIRouter(prefix="/ai-analyst", tags=["ai-analyst"])
settings = get_settings()

# Rate limiting: Max queries per minute and per day
RATE_LIMIT_PER_MINUTE = 10
RATE_LIMIT_PER_DAY = 100


async def check_rate_limit(db: DbSession, user_id: int) -> None:
    """Check if user has exceeded rate limits."""
    now = datetime.now()  # Use timezone-naive datetime to match database
    one_minute_ago = now - timedelta(minutes=1)
    one_day_ago = now - timedelta(days=1)

    # Check last minute
    stmt_minute = (
        select(func.count(AIAnalystQuery.id))
        .where(
            and_(
                AIAnalystQuery.user_id == user_id,
                AIAnalystQuery.created_at >= one_minute_ago,
            )
        )
    )
    minute_count = (await db.execute(stmt_minute)).scalar() or 0

    if minute_count >= RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: max {RATE_LIMIT_PER_MINUTE} queries per minute",
        )

    # Check last 24 hours
    stmt_day = (
        select(func.count(AIAnalystQuery.id))
        .where(
            and_(
                AIAnalystQuery.user_id == user_id,
                AIAnalystQuery.created_at >= one_day_ago,
            )
        )
    )
    day_count = (await db.execute(stmt_day)).scalar() or 0

    if day_count >= RATE_LIMIT_PER_DAY:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: max {RATE_LIMIT_PER_DAY} queries per day",
        )


@router.post("/query", response_model=AnalystQueryResponse)
async def query_analyst(
    db: DbSession,
    current_user: CurrentSeb,
    request: AnalystQueryRequest,
) -> AnalystQueryResponse:
    """
    Process an AI Analyst query using Claude API.

    Rate limits:
    - 10 queries per minute
    - 100 queries per day

    All queries are logged for audit purposes.
    """
    # Check API key is configured
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Analyst is not configured. Please set ANTHROPIC_API_KEY in .env",
        )

    # Rate limiting
    await check_rate_limit(db, current_user.id)

    # Initialize service
    service = ClaudeAnalystService(db)

    # Measure response time
    start_time = time.time()

    try:
        # Call Claude API
        result = await service.analyze_query(
            user_message=request.message,
            context_filters=request.context_filters,
            conversation_history=[
                {"role": msg.role, "content": msg.content}
                for msg in (request.conversation_history or [])
            ],
        )

        response_time_ms = int((time.time() - start_time) * 1000)

        # Log query for audit
        audit_log = AIAnalystQuery(
            user_id=current_user.id,
            query_text=request.message,
            context_filters=request.context_filters,
            response_text=result["message"],
            model_used=result["model"],
            tokens_used=result["tokens_used"],
            response_time_ms=response_time_ms,
        )
        db.add(audit_log)
        await db.commit()

        return AnalystQueryResponse(
            message=result["message"],
            insights=result["insights"],
            timestamp=datetime.now(),
        )

    except RuntimeError as e:
        # Claude API error
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        # Unexpected error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process query: {str(e)}",
        )
