from uuid import UUID
from math import radians, sin, cos, asin, sqrt

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import Organization, SlotStatus
from app.db.session import get_db
from app.schemas.client import ReserveIn
from app.services.booking import get_place_slots, reserve_slot_atomic
from app.services.live_status import get_live_statuses
from app.services.twogis import search_nearby

router = APIRouter(prefix="/client", tags=["client"])


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    return 2 * 6371 * asin(sqrt(a))


@router.get("/map/nearby")
async def map_nearby(
    db: AsyncSession = Depends(get_db),
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(5, ge=0.1, le=20),
    city: str = Query("almaty"),
    category: str | None = Query(default=None),
):
    twogis_items = await search_nearby(city=city, lat=lat, lng=lng, radius_km=radius_km, category=category)
    org_query = select(Organization).where(Organization.city == city)
    if category:
        org_query = org_query.where(Organization.category == category)
    org_result = await db.execute(org_query)
    local_orgs = list(org_result.scalars().all())

    filtered_local = []
    for org in local_orgs:
        distance = haversine_km(lat, lng, org.lat, org.lng)
        if distance <= radius_km:
            filtered_local.append((org, distance))

    gis_ids = [item["gis_id"] for item in twogis_items] + [org.gis_id for org, _ in filtered_local]
    statuses = await get_live_statuses(gis_ids)

    merged: list[dict] = []
    for item in twogis_items:
        merged.append(
            {
                "id": f"2gis:{item['gis_id']}",
                **item,
                "live_status": statuses.get(item["gis_id"], "offline"),
                "source": "2gis",
                "can_book": False,
            }
        )

    for org, distance in filtered_local:
        merged.append(
            {
                "id": str(org.id),
                "gis_id": org.gis_id,
                "name": org.name,
                "address": None,
                "lat": org.lat,
                "lng": org.lng,
                "rating": None,
                "distance_km": round(distance, 3),
                "live_status": statuses.get(org.gis_id, "offline"),
                "source": "local",
                "can_book": True,
            }
        )

    merged.sort(key=lambda item: item.get("distance_km", 999999))
    return {"items": merged}


@router.get("/place/{place_id}/slots")
async def place_slots(place_id: UUID, db: AsyncSession = Depends(get_db)):
    org = await db.execute(select(Organization).where(Organization.id == place_id))
    if not org.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Place not found")

    slots = await get_place_slots(db, place_id)
    return {
        "items": [
            {
                "id": str(slot.id),
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "status": slot.status.value,
            }
            for slot in slots
            if slot.status in (SlotStatus.available, SlotStatus.pending)
        ]
    }


@router.post("/booking/reserve")
async def reserve_booking(payload: ReserveIn, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    booking = await reserve_slot_atomic(db, slot_id=payload.slot_id, client_id=current_user.id)
    if not booking:
        raise HTTPException(status_code=409, detail="Slot is not available")

    return {
        "booking_id": str(booking.id),
        "slot_id": str(payload.slot_id),
        "status": booking.status.value,
        "pending_for_seconds": 300,
    }
