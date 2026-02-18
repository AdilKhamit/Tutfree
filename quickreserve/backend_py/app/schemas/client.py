from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class NearbyQuery(BaseModel):
    lat: float
    lng: float
    radius_km: float = 5
    category: str | None = None
    city: str = "almaty"


class ReserveIn(BaseModel):
    slot_id: UUID


class SlotOut(BaseModel):
    id: UUID
    start_time: datetime
    end_time: datetime
    status: str


class PlaceNearbyOut(BaseModel):
    gis_id: str
    name: str
    address: str | None = None
    lat: float
    lng: float
    rating: float | None = None
    live_status: str
