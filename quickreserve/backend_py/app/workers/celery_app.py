from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "tutfree",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery_app.conf.timezone = "UTC"
celery_app.conf.beat_schedule = {
    "release-expired-pending-every-10-min": {
        "task": "app.workers.tasks.release_expired_pending",
        "schedule": 600,
    },
    "reset-stale-live-status-every-2h": {
        "task": "app.workers.tasks.reset_stale_live_status",
        "schedule": 7200,
    },
}
