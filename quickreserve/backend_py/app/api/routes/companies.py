import uuid

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Organization, Category, CompanyProfile
from app.db.session import get_db
from app.schemas.companies import CompanyCreateIn, CompanyCreateOut, CompanySlotsPatchIn
from app.services.live_status import set_live_status

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post("", response_model=CompanyCreateOut)
async def create_company(payload: CompanyCreateIn, db: AsyncSession = Depends(get_db)):
    org = Organization(
        gis_id=f"manual-{uuid.uuid4()}",
        owner_id=None,
        name=payload.name,
        city=payload.city,
        category=Category(payload.category),
        lat=payload.lat,
        lng=payload.lng,
        is_verified=False,
    )
    db.add(org)
    await db.flush()

    profile = CompanyProfile(
        company_id=org.id,
        address=payload.address,
        phone=payload.phone,
        work_start=payload.work_start,
        work_end=payload.work_end,
        slot_duration_minutes=payload.slot_duration_minutes,
        services=[service.model_dump() for service in payload.services],
        occupied_slots=[],
    )
    db.add(profile)
    await db.commit()
    await set_live_status(org.gis_id, "free", payload.city)

    return CompanyCreateOut(id=str(org.id))


@router.patch("/{company_id}")
async def patch_company_slots(company_id: str, payload: CompanySlotsPatchIn, db: AsyncSession = Depends(get_db)):
    try:
        company_uuid = uuid.UUID(company_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid company id")

    result = await db.execute(select(CompanyProfile).where(CompanyProfile.company_id == company_uuid))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Company not found")

    profile.occupied_slots = payload.occupiedSlots
    org_result = await db.execute(select(Organization).where(Organization.id == company_uuid))
    org = org_result.scalar_one_or_none()
    await db.commit()
    if org:
        next_status = "busy" if len(payload.occupiedSlots) > 0 else "free"
        await set_live_status(org.gis_id, next_status, org.city)
    return {"status": "success", "id": company_id}
