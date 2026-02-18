from uuid import UUID

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


@router.get("/map/nearby")
async def map_nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(5, ge=0.1, le=20),
    city: str = Query("almaty"),
    category: str | None = Query(default=None),
):
    twogis_items = await search_nearby(city=city, lat=lat, lng=lng, radius_km=radius_km, category=category)
    gis_ids = [item["gis_id"] for item in twogis_items]
    statuses = await get_live_statuses(gis_ids)

    merged = []
    for item in twogis_items:
        merged.append(
            {
                **item,
                "live_status": statuses.get(item["gis_id"], "offline"),
            }
        )
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
