import json
from datetime import datetime, timezone

from app.services.redis_client import redis_call


async def set_live_status(gis_id: str, status: str, city: str) -> None:
    key = f"live:status:{gis_id}"
    value = {
        "status": status,
        "city": city,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await redis_call("set", key, json.dumps(value))


async def get_live_statuses(gis_ids: list[str]) -> dict[str, str]:
    if not gis_ids:
        return {}

    keys = [f"live:status:{gis_id}" for gis_id in gis_ids]
    raw = await redis_call("mget", keys)
    result: dict[str, str] = {}
    for gis_id, payload in zip(gis_ids, raw, strict=True):
        if not payload:
            continue
        result[gis_id] = json.loads(payload).get("status", "unknown")
    return result
