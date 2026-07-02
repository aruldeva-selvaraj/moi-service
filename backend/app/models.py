from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(30), nullable=False, default="wedding")
    primary_name = Column(String(100), nullable=False)
    secondary_name = Column(String(100))
    family_name = Column(String(100))
    event_date = Column(Date, nullable=False)
    venue = Column(String(300))
    city = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    moi_entries = relationship("MoiEntry", back_populates="event", cascade="all, delete-orphan")


class MoiEntry(Base):
    __tablename__ = "moi_entries"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    guest_name = Column(String(150), nullable=False)
    guest_relationship = Column(String(100))
    side = Column(String(20), default="groom")   # groom, bride, both
    amount = Column(Numeric(10, 2), nullable=False)
    payment_mode = Column(String(30), default="cash")
    cheque_number = Column(String(50))
    transaction_ref = Column(String(100))
    city = Column(String(100))
    phone = Column(String(20))
    notes = Column(Text)
    received_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event = relationship("Event", back_populates="moi_entries")
