from pydantic import BaseModel, Field
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from enum import Enum


class EventTypeEnum(str, Enum):
    wedding = "wedding"
    birthday = "birthday"
    baby_shower = "baby_shower"
    engagement = "engagement"
    anniversary = "anniversary"
    other = "other"


class SideEnum(str, Enum):
    groom = "groom"
    bride = "bride"
    both = "both"


class PaymentModeEnum(str, Enum):
    cash = "cash"
    cheque = "cheque"
    online = "online"
    dd = "dd"


# Event Schemas
class EventBase(BaseModel):
    event_type: EventTypeEnum = EventTypeEnum.wedding
    primary_name: str = Field(..., min_length=1, max_length=100)
    secondary_name: Optional[str] = None
    family_name: Optional[str] = None
    event_date: date
    venue: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    event_type: Optional[EventTypeEnum] = None
    primary_name: Optional[str] = None
    secondary_name: Optional[str] = None
    family_name: Optional[str] = None
    event_date: Optional[date] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None


class EventResponse(EventBase):
    id: int
    created_at: datetime
    updated_at: datetime
    total_moi: Optional[Decimal] = 0
    moi_count: Optional[int] = 0

    model_config = {"from_attributes": True}


class EventListResponse(BaseModel):
    id: int
    event_type: str
    primary_name: str
    secondary_name: Optional[str]
    family_name: Optional[str]
    event_date: date
    venue: Optional[str]
    city: Optional[str]
    total_moi: Optional[Decimal] = 0
    moi_count: Optional[int] = 0
    created_at: datetime

    model_config = {"from_attributes": True}


# Moi Entry Schemas
class MoiEntryBase(BaseModel):
    guest_name: str = Field(..., min_length=1, max_length=150)
    relationship: Optional[str] = Field(None, alias="guest_relationship")
    side: SideEnum = SideEnum.groom
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    payment_mode: PaymentModeEnum = PaymentModeEnum.cash
    cheque_number: Optional[str] = None
    transaction_ref: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    received_by: Optional[str] = None

    model_config = {"populate_by_name": True}


class MoiEntryCreate(MoiEntryBase):
    event_id: int


class MoiEntryUpdate(BaseModel):
    guest_name: Optional[str] = None
    relationship: Optional[str] = Field(None, alias="guest_relationship")
    side: Optional[SideEnum] = None
    amount: Optional[Decimal] = None
    payment_mode: Optional[PaymentModeEnum] = None
    cheque_number: Optional[str] = None
    transaction_ref: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    received_by: Optional[str] = None


class MoiEntryResponse(MoiEntryBase):
    id: int
    event_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


# Report Schemas
class SummaryStats(BaseModel):
    total_events: int
    total_moi_entries: int
    total_amount: Decimal
    avg_amount: Decimal


class EventReport(BaseModel):
    event_id: int
    event_type: str
    primary_name: str
    secondary_name: Optional[str] = None
    event_date: date
    total_amount: Decimal
    moi_count: int
    groom_count: int
    bride_count: int
    groom_amount: Decimal
    bride_amount: Decimal
    cash_amount: Decimal
    cheque_amount: Decimal
    online_amount: Decimal


class RelationshipReport(BaseModel):
    relationship: str
    count: int
    total_amount: Decimal


class PaginatedMoiResponse(BaseModel):
    items: List[MoiEntryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
