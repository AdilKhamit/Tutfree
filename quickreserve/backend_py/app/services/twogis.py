import json
from typing import Any

import httpx

from app.core.config import settings
from app.services.redis_client import redis_call


async def _allow_twogis_call() -> bool:
    key = "ratelimit:2gis:minute"
    current = await redis_call("incr", key)
    if current == 1:
        await redis_call("expire", key, 60)
    return current <= settings.TWOGIS_RPM_LIMIT


async def search_nearby(city: str, lat: float, lng: float, radius_km: float, category: str | None) -> list[dict[str, Any]]:
    if not settings.TWOGIS_API_KEY:
        return []

    cache_key = f"2gis:nearby:{city}:{lat:.4f}:{lng:.4f}:{radius_km}:{category or 'all'}"
    cached = await redis_call("get", cache_key)
    if cached:
        return json.loads(cached)

    if not await _allow_twogis_call():
        return []

    params = {
        "q": category or "service",
        "city": city,
        "point": f"{lng},{lat}",
        "radius": int(radius_km * 1000),
        "fields": "items.point,items.address_name,items.reviews,items.rubrics,items.schedule",
        "key": settings.TWOGIS_API_KEY,
        "page_size": 50,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(settings.TWOGIS_BASE_URL, params=params)
        response.raise_for_status()
        payload = response.json()

    items = payload.get("result", {}).get("items", [])
    normalized = []
    for item in items:
        point = item.get("point") or {}
        if not point.get("lat") or not point.get("lon"):
            continue
        normalized.append(
            {
                "gis_id": str(item.get("id", "")),
                "name": item.get("name", "Unknown"),
                "address": item.get("address_name"),
                "lat": point["lat"],
                "lng": point["lon"],
                "rating": ((item.get("reviews") or {}).get("general_rating")),
            }
        )

    await redis_call("setex", cache_key, 120, json.dumps(normalized))
    return normalized
