from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List
from decimal import Decimal

from app.database import get_db
from app.models import Event, MoiEntry
from app.schemas import EventCreate, EventUpdate, EventResponse, EventListResponse, EventReport

router = APIRouter(prefix="/api/events", tags=["Events"])


@router.get("/", response_model=List[EventListResponse])
async def list_events(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Event,
            func.coalesce(func.sum(MoiEntry.amount), 0).label("total_moi"),
            func.count(MoiEntry.id).label("moi_count"),
        )
        .outerjoin(MoiEntry, Event.id == MoiEntry.event_id)
        .group_by(Event.id)
        .order_by(desc(Event.event_date))
    )
    rows = result.all()
    events = []
    for row in rows:
        event = row[0]
        e_dict = {
            "id": event.id,
            "event_type": event.event_type,
            "primary_name": event.primary_name,
            "secondary_name": event.secondary_name,
            "family_name": event.family_name,
            "event_date": event.event_date,
            "venue": event.venue,
            "city": event.city,
            "total_moi": row[1],
            "moi_count": row[2],
            "created_at": event.created_at,
        }
        events.append(EventListResponse(**e_dict))
    return events


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(data: EventCreate, db: AsyncSession = Depends(get_db)):
    event = Event(**data.model_dump())
    db.add(event)
    await db.flush()
    await db.refresh(event)
    result = {**event.__dict__, "total_moi": Decimal("0"), "moi_count": 0}
    return EventResponse(**result)


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Event,
            func.coalesce(func.sum(MoiEntry.amount), 0).label("total_moi"),
            func.count(MoiEntry.id).label("moi_count"),
        )
        .outerjoin(MoiEntry, Event.id == MoiEntry.event_id)
        .where(Event.id == event_id)
        .group_by(Event.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Event not found")
    event = row[0]
    result_dict = {**event.__dict__, "total_moi": row[1], "moi_count": row[2]}
    return EventResponse(**result_dict)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(event_id: int, data: EventUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(event, field, value)

    await db.flush()
    await db.refresh(event)

    moi_result = await db.execute(
        select(func.coalesce(func.sum(MoiEntry.amount), 0), func.count(MoiEntry.id))
        .where(MoiEntry.event_id == event_id)
    )
    moi_row = moi_result.first()
    result_dict = {**event.__dict__, "total_moi": moi_row[0], "moi_count": moi_row[1]}
    return EventResponse(**result_dict)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(event_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.delete(event)


@router.get("/{event_id}/report", response_model=EventReport)
async def get_event_report(event_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    moi_result = await db.execute(
        select(
            func.coalesce(func.sum(MoiEntry.amount), 0).label("total"),
            func.count(MoiEntry.id).label("count"),
            func.coalesce(
                func.sum(MoiEntry.amount).filter(MoiEntry.side == "groom"), 0
            ).label("groom_total"),
            func.coalesce(
                func.sum(MoiEntry.amount).filter(MoiEntry.side == "bride"), 0
            ).label("bride_total"),
            func.coalesce(
                func.sum(MoiEntry.amount).filter(MoiEntry.payment_mode == "cash"), 0
            ).label("cash_total"),
            func.coalesce(
                func.sum(MoiEntry.amount).filter(MoiEntry.payment_mode == "cheque"), 0
            ).label("cheque_total"),
            func.coalesce(
                func.sum(MoiEntry.amount).filter(MoiEntry.payment_mode == "online"), 0
            ).label("online_total"),
        ).where(MoiEntry.event_id == event_id)
    )
    row = moi_result.first()

    return EventReport(
        event_id=event.id,
        event_type=event.event_type,
        primary_name=event.primary_name,
        secondary_name=event.secondary_name,
        event_date=event.event_date,
        total_amount=row[0],
        moi_count=row[1],
        groom_amount=row[2],
        bride_amount=row[3],
        cash_amount=row[4],
        cheque_amount=row[5],
        online_amount=row[6],
    )
