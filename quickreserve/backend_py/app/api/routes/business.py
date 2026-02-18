from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.sockets import emit_live_status_changed, emit_new_place_added
from app.db.models import UserRole, Organization, Category, Slot, Booking, BookingStatus
from app.db.session import get_db
from app.schemas.business import BusinessRegisterIn, BusinessStatusIn
from app.services.live_status import set_live_status

router = APIRouter(prefix="/business", tags=["business"])


@router.post("/register")
async def register_business(
    payload: BusinessRegisterIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != UserRole.business:
        raise HTTPException(status_code=403, detail="Business role required")

    exists = await db.execute(select(Organization).where(Organization.gis_id == payload.gis_id))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Organization already exists")

    org = Organization(
        gis_id=payload.gis_id,
        owner_id=current_user.id,
        name=payload.name,
        city=payload.city,
        category=Category(payload.category),
        lat=payload.lat,
        lng=payload.lng,
        is_verified=True,
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)

    await set_live_status(payload.gis_id, "free", payload.city)
    await emit_new_place_added(
        payload.city,
        {
            "gis_id": payload.gis_id,
            "name": payload.name,
            "lat": payload.lat,
            "lng": payload.lng,
            "status": "free",
        },
    )
    return {"id": str(org.id), "gis_id": org.gis_id}


@router.patch("/status")
async def patch_status(
    payload: BusinessStatusIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != UserRole.business:
        raise HTTPException(status_code=403, detail="Business role required")

    result = await db.execute(
        select(Organization).where(Organization.gis_id == payload.gis_id, Organization.owner_id == current_user.id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    await set_live_status(payload.gis_id, payload.status, payload.city)
    await emit_live_status_changed(payload.city, {"gis_id": payload.gis_id, "status": payload.status})
    return {"ok": True}


@router.get("/my-bookings")
async def my_bookings(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != UserRole.business:
        raise HTTPException(status_code=403, detail="Business role required")

    result = await db.execute(
        select(Booking, Slot)
        .join(Slot, Booking.slot_id == Slot.id)
        .join(Organization, Slot.place_id == Organization.id)
        .where(Organization.owner_id == current_user.id)
        .where(Booking.status.in_([BookingStatus.pending, BookingStatus.confirmed]))
        .order_by(Slot.start_time.asc())
    )

    items = []
    for booking, slot in result.all():
        items.append(
            {
                "booking_id": str(booking.id),
                "slot_id": str(slot.id),
                "status": booking.status.value,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
            }
        )
    return {"items": items}
