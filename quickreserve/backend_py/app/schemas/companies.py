from pydantic import BaseModel, Field


class ServiceItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price: float = Field(ge=0)


class CompanyCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str = Field(pattern="^(sto|barbershop|carwash|tire_service)$")
    address: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=5, max_length=64)
    work_start: str = Field(pattern="^\\d{2}:\\d{2}$")
    work_end: str = Field(pattern="^\\d{2}:\\d{2}$")
    slot_duration_minutes: int = Field(ge=15, le=180, default=60)
    services: list[ServiceItemIn] = Field(default_factory=list)
    city: str = "almaty"
    lat: float = 43.238949
    lng: float = 76.889709


class CompanyCreateOut(BaseModel):
    id: str
    status: str = "success"


class CompanySlotsPatchIn(BaseModel):
    occupiedSlots: list[str] = Field(default_factory=list)
