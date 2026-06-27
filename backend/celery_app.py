"""
Celery Application — TDS Bab 1/7: Async Task Queue
Falls back gracefully when Redis is not available (Railway/Vercel mode uses APScheduler).
"""
import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "quant",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Jakarta",
    enable_utc=False,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)


@celery_app.task(name="tasks.run_pipeline")
def run_pipeline_task(session: str = "morning"):
    """Celery task wrapping the scheduler pipeline."""
    from scheduler import _run_pipeline
    _run_pipeline(session)
    return {"status": "ok", "session": session}
