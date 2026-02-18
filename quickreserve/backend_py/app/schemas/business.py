from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class BusinessRegisterIn(BaseModel):
    gis_id: str
    name: str
    city: str
    category: str
    lat: float
    lng: float


class BusinessStatusIn(BaseModel):
    gis_id: str
    city: str
    status: str = Field(pattern="^(free|busy|unknown)$")


class BusinessBookingOut(BaseModel):
    booking_id: UUID
    slot_id: UUID
    status: str
    start_time: datetime
    end_time: datetime
