from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import update, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Slot, SlotStatus, Booking, BookingStatus


async def reserve_slot_atomic(db: AsyncSession, slot_id: UUID, client_id: UUID) -> Booking | None:
    pending_until = datetime.now(timezone.utc) + timedelta(minutes=5)

    stmt = (
        update(Slot)
        .where(Slot.id == slot_id, Slot.status == SlotStatus.available)
        .values(status=SlotStatus.pending, pending_until=pending_until)
        .execution_options(synchronize_session=False)
    )
    result = await db.execute(stmt)
    if result.rowcount != 1:
        await db.rollback()
        return None

    booking = Booking(
        slot_id=slot_id,
        client_id=client_id,
        status=BookingStatus.pending,
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return booking


async def get_place_slots(db: AsyncSession, place_id: UUID) -> list[Slot]:
    result = await db.execute(
        select(Slot)
        .where(Slot.place_id == place_id, Slot.start_time >= datetime.now(timezone.utc))
        .order_by(Slot.start_time.asc())
    )
    return list(result.scalars().all())
