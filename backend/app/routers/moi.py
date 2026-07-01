from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
from decimal import Decimal
import math

from app.database import get_db
from app.models import Event, MoiEntry
from app.schemas import (
    MoiEntryCreate, MoiEntryUpdate, MoiEntryResponse,
    PaginatedMoiResponse, SummaryStats, RelationshipReport
)

router = APIRouter(prefix="/api/moi", tags=["Moi Entries"])


@router.get("/", response_model=PaginatedMoiResponse)
async def list_moi_entries(
    event_id: Optional[int] = Query(None),
    side: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    query = select(MoiEntry)

    if event_id:
        query = query.where(MoiEntry.event_id == event_id)
    if side:
        query = query.where(MoiEntry.side == side)
    if payment_mode:
        query = query.where(MoiEntry.payment_mode == payment_mode)
    if search:
        query = query.where(MoiEntry.guest_name.ilike(f"%{search}%"))

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(desc(MoiEntry.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    return PaginatedMoiResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.post("/", response_model=MoiEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_moi_entry(data: MoiEntryCreate, db: AsyncSession = Depends(get_db)):
    event_result = await db.execute(select(Event).where(Event.id == data.event_id))
    if not event_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    entry = MoiEntry(**data.model_dump())
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


@router.get("/summary", response_model=SummaryStats)
async def get_summary_stats(
    event_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    event_count_q = select(func.count(Event.id))
    moi_query = select(
        func.count(MoiEntry.id),
        func.coalesce(func.sum(MoiEntry.amount), 0),
        func.coalesce(func.avg(MoiEntry.amount), 0),
    )

    if event_id:
        moi_query = moi_query.where(MoiEntry.event_id == event_id)

    event_count = (await db.execute(event_count_q)).scalar()
    moi_row = (await db.execute(moi_query)).first()

    return SummaryStats(
        total_events=event_count,
        total_moi_entries=moi_row[0],
        total_amount=moi_row[1],
        avg_amount=moi_row[2],
    )


@router.get("/by-relationship", response_model=List[RelationshipReport])
async def get_by_relationship(
    event_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(
            MoiEntry.relationship,
            func.count(MoiEntry.id).label("count"),
            func.sum(MoiEntry.amount).label("total_amount"),
        )
        .where(MoiEntry.relationship.isnot(None))
        .group_by(MoiEntry.relationship)
        .order_by(desc("total_amount"))
    )
    if event_id:
        query = query.where(MoiEntry.event_id == event_id)

    result = await db.execute(query)
    rows = result.all()
    return [
        RelationshipReport(relationship=r[0], count=r[1], total_amount=r[2])
        for r in rows
    ]


@router.get("/{entry_id}", response_model=MoiEntryResponse)
async def get_moi_entry(entry_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MoiEntry).where(MoiEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Moi entry not found")
    return entry


@router.put("/{entry_id}", response_model=MoiEntryResponse)
async def update_moi_entry(entry_id: int, data: MoiEntryUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MoiEntry).where(MoiEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Moi entry not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(entry, field, value)

    await db.flush()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_moi_entry(entry_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MoiEntry).where(MoiEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Moi entry not found")
    await db.delete(entry)
