import asyncio
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import update

from app.db.models import Slot, SlotStatus
from app.db.session import AsyncSessionLocal
from app.services.redis_client import redis_call
from app.workers.celery_app import celery_app


async def _release_expired_pending_impl() -> int:
    async with AsyncSessionLocal() as db:
        stmt = (
            update(Slot)
            .where(Slot.status == SlotStatus.pending)
            .where(Slot.pending_until < datetime.now(timezone.utc))
            .values(status=SlotStatus.available, pending_until=None)
            .execution_options(synchronize_session=False)
        )
        result = await db.execute(stmt)
        await db.commit()
        return int(result.rowcount or 0)


@celery_app.task(name="app.workers.tasks.release_expired_pending")
def release_expired_pending() -> int:
    return asyncio.run(_release_expired_pending_impl())


async def _reset_stale_live_status_impl() -> int:
    keys = []
    iterator = await redis_call("scan_iter", match="live:status:*")
    async for key in iterator:
        keys.append(key)

    changed = 0
    threshold = datetime.now(timezone.utc) - timedelta(hours=2)
    for key in keys:
        payload = await redis_call("get", key)
        if not payload:
            continue
        parsed = json.loads(payload)
        value = parsed.get("updated_at")
        if not value:
            continue
        try:
            updated_at = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            continue
        if updated_at < threshold and parsed.get("status") == "free":
            parsed["status"] = "unknown"
            parsed["updated_at"] = datetime.now(timezone.utc).isoformat()
            await redis_call("set", key, json.dumps(parsed))
            changed += 1
    return changed


@celery_app.task(name="app.workers.tasks.reset_stale_live_status")
def reset_stale_live_status() -> int:
    return asyncio.run(_reset_stale_live_status_impl())
