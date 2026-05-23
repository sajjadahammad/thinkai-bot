from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, get_current_user
from app.models.chat import InferenceLog, Conversation, User

router = APIRouter()

@router.get("/metrics")
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Computes dashboard analytics from stored inference logs.
    Includes average latency, total token volume, throughput rates,
    error counts, and chronological logs list.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin credentials required."
        )

    # 1. Basic Stats (Average Latency, Total Tokens, Total Requests)
    stats_query = await db.execute(
        select(
            func.avg(InferenceLog.latency_ms).label("avg_latency"),
            func.sum(InferenceLog.total_tokens).label("total_tokens"),
            func.count(InferenceLog.id).label("total_requests"),
            func.sum(InferenceLog.prompt_tokens).label("prompt_tokens"),
            func.sum(InferenceLog.completion_tokens).label("completion_tokens")
        )
    )
    stats_row = stats_query.first()
    
    avg_latency = float(stats_row[0] or 0.0)
    total_tokens = int(stats_row[1] or 0)
    total_requests = int(stats_row[2] or 0)
    prompt_tokens = int(stats_row[3] or 0)
    completion_tokens = int(stats_row[4] or 0)

    # 2. Error Rate calculation
    errors_query = await db.execute(
        select(func.count(InferenceLog.id)).where(InferenceLog.status_code != 200)
    )
    error_count = errors_query.scalar() or 0
    error_rate = (error_count / total_requests * 100.0) if total_requests > 0 else 0.0

    # 3. Throughput & Latency Trend (Last 24h)
    time_limit = datetime.utcnow() - timedelta(days=1)
    trend_query = await db.execute(
        select(
            func.date_trunc('hour', InferenceLog.timestamp).label("hour"),
            func.count(InferenceLog.id).label("count"),
            func.avg(InferenceLog.latency_ms).label("avg_latency"),
            func.sum(InferenceLog.total_tokens).label("tokens")
        )
        .where(InferenceLog.timestamp >= time_limit)
        .group_by("hour")
        .order_by("hour")
    )
    trend_rows = trend_query.all()
    
    trend_data = []
    for r in trend_rows:
        trend_data.append({
            "time": r[0].strftime("%H:%M"),
            "requests": r[1],
            "latency": int(r[2] or 0),
            "tokens": int(r[3] or 0)
        })

    # Fallback to dummy hours if trend is empty, to make the dashboard look gorgeous instantly
    if not trend_data:
        now = datetime.utcnow()
        for i in range(12):
            t = now - timedelta(hours=11-i)
            trend_data.append({
                "time": t.strftime("%H:%M"),
                "requests": 0,
                "latency": 0,
                "tokens": 0
            })

    # 4. Model distribution
    model_query = await db.execute(
        select(InferenceLog.model, func.count(InferenceLog.id))
        .group_by(InferenceLog.model)
    )
    models_data = [{"name": r[0], "value": r[1]} for r in model_query.all()]

    # 5. Provider distribution
    provider_query = await db.execute(
        select(InferenceLog.provider, func.count(InferenceLog.id))
        .group_by(InferenceLog.provider)
    )
    providers_data = [{"name": r[0], "value": r[1]} for r in provider_query.all()]

    # 6. Retrieve recent logs (with PII-redacted preview)
    recent_logs_query = await db.execute(
        select(InferenceLog)
        .order_by(desc(InferenceLog.timestamp))
        .limit(20)
    )
    recent_logs = []
    for log in recent_logs_query.scalars().all():
        recent_logs.append({
            "id": str(log.id),
            "model": log.model,
            "provider": log.provider,
            "latency_ms": log.latency_ms,
            "total_tokens": log.total_tokens,
            "status_code": log.status_code,
            "error_message": log.error_message,
            "input_preview": log.input_preview,
            "output_preview": log.output_preview,
            "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        })

    return {
        "summary": {
            "avg_latency_ms": int(avg_latency),
            "total_requests": total_requests,
            "total_tokens": total_tokens,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "error_rate": round(error_rate, 2),
            "error_count": error_count
        },
        "trends": trend_data,
        "models": models_data,
        "providers": providers_data,
        "logs": recent_logs
    }
