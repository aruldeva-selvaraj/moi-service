from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from decimal import Decimal

from app.database import get_db
from app.models import Wedding, MoiEntry
from app.schemas import WeddingCreate, WeddingUpdate, WeddingResponse, WeddingListResponse, WeddingReport

router = APIRouter(prefix="/api/weddings", tags=["Weddings"])


@router.get("/", response_model=List[WeddingListResponse])
async def list_weddings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Wedding,
            func.coalesce(func.sum(MoiEntry.amount), 0).label("total_moi"),
            func.count(MoiEntry.id).label("moi_count"),
        )
        .outerjoin(MoiEntry, Wedding.id == MoiEntry.wedding_id)
        .group_by(Wedding.id)
        .order_by(desc(Wedding.wedding_date))
    )
    rows = result.all()
    weddings = []
    for row in rows:
        wedding = row[0]
        w_dict = {
            "id": wedding.id,
            "groom_name": wedding.groom_name,
            "bride_name": wedding.bride_name,
            "family_name": wedding.family_name,
            "wedding_date": wedding.wedding_date,
            "venue": wedding.venue,
            "city": wedding.city,
            "total_moi": row[1],
            "moi_count": row[2],
            "created_at": wedding.created_at,
        }
        weddings.append(WeddingListResponse(**w_dict))
    return weddings


@router.post("/", response_model=WeddingResponse, status_code=status.HTTP_201_CREATED)
async def create_wedding(data: WeddingCreate, db: AsyncSession = Depends(get_db)):
    wedding = Wedding(**data.model_dump())
    db.add(wedding)
    await db.flush()
    await db.refresh(wedding)
    result = {**wedding.__dict__, "total_moi": Decimal("0"), "moi_count": 0}
    return WeddingResponse(**result)


@router.get("/{wedding_id}", response_model=WeddingResponse)
async def get_wedding(wedding_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Wedding,
            func.coalesce(func.sum(MoiEntry.amount), 0).label("total_moi"),
            func.count(MoiEntry.id).label("moi_count"),
        )
        .outerjoin(MoiEntry, Wedding.id == MoiEntry.wedding_id)
        .where(Wedding.id == wedding_id)
        .group_by(Wedding.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Wedding not found")
    wedding = row[0]
    result_dict = {**wedding.__dict__, "total_moi": row[1], "moi_count": row[2]}
    return WeddingResponse(**result_dict)


@router.put("/{wedding_id}", response_model=WeddingResponse)
async def update_wedding(wedding_id: int, data: WeddingUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wedding).where(Wedding.id == wedding_id))
    wedding = result.scalar_one_or_none()
    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(wedding, field, value)

    await db.flush()
    await db.refresh(wedding)

    moi_result = await db.execute(
        select(func.coalesce(func.sum(MoiEntry.amount), 0), func.count(MoiEntry.id))
        .where(MoiEntry.wedding_id == wedding_id)
    )
    moi_row = moi_result.first()
    result_dict = {**wedding.__dict__, "total_moi": moi_row[0], "moi_count": moi_row[1]}
    return WeddingResponse(**result_dict)


@router.delete("/{wedding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wedding(wedding_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wedding).where(Wedding.id == wedding_id))
    wedding = result.scalar_one_or_none()
    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found")
    await db.delete(wedding)


@router.get("/{wedding_id}/report", response_model=WeddingReport)
async def get_wedding_report(wedding_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wedding).where(Wedding.id == wedding_id))
    wedding = result.scalar_one_or_none()
    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found")

    moi_result = await db.execute(
        select(
            func.coalesce(func.sum(MoiEntry.amount), 0).label("total"),
            func.count(MoiEntry.id).label("count"),
            func.coalesce(
                func.sum(MoiEntry.amount).filter(MoiEntry.side == "bride_side"), 0
            ).label("bride_total"),
            func.coalesce(
                func.sum(MoiEntry.amount).filter(MoiEntry.side == "groom_side"), 0
            ).label("groom_total"),
            func.coalesce(
                func.sum(MoiEntry.amount).filter(MoiEntry.payment_mode == "cash"), 0
            ).label("cash_total"),
            func.coalesce(
                func.sum(MoiEntry.amount).filter(MoiEntry.payment_mode == "cheque"), 0
            ).label("cheque_total"),
            func.coalesce(
                func.sum(MoiEntry.amount).filter(MoiEntry.payment_mode == "online"), 0
            ).label("online_total"),
        ).where(MoiEntry.wedding_id == wedding_id)
    )
    row = moi_result.first()

    return WeddingReport(
        wedding_id=wedding.id,
        groom_name=wedding.groom_name,
        bride_name=wedding.bride_name,
        wedding_date=wedding.wedding_date,
        total_amount=row[0],
        moi_count=row[1],
        bride_side_amount=row[2],
        groom_side_amount=row[3],
        cash_amount=row[4],
        cheque_amount=row[5],
        online_amount=row[6],
    )
