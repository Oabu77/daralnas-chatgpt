"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
QuranChain Pay™ - Database Models
© QuranChain™ | Omar Mohammad Abunadi™

Production database schema using SQLAlchemy.
Persistent storage for merchants, payments, and ledger.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional, List

from sqlalchemy import (
    Column, String, Integer, Numeric, DateTime, Boolean, 
    ForeignKey, Enum, Text, Index, JSON, create_engine
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.dialects.postgresql import UUID

Base = declarative_base()


class PaymentRail(PyEnum):
    """
    Supported payment rails in order of preference (cheapest first).
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    USDC = "usdc"
    ACH = "ach"
    BTC = "btc"
    CARD = "card"


class PaymentIntentStatus(PyEnum):
    """
    Payment intent lifecycle states.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    REQUIRES_PAYMENT = "requires_payment"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"


class Merchant(Base):
    """
    Merchant account model.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    __tablename__ = "merchants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    api_key_hash = Column(String(64), nullable=False, unique=True)
    api_key_prefix = Column(String(12), nullable=False)  # For identification
    
    # Accepted payment rails
    accepts_usdc = Column(Boolean, default=True)
    accepts_ach = Column(Boolean, default=True)
    accepts_btc = Column(Boolean, default=True)
    accepts_card = Column(Boolean, default=True)
    
    # Payout destinations
    payout_usdc_address = Column(String(42), nullable=True)
    payout_ach_routing = Column(String(9), nullable=True)
    payout_ach_account = Column(String(17), nullable=True)
    payout_btc_address = Column(String(62), nullable=True)
    payout_bank_name = Column(String(255), nullable=True)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    payment_intents = relationship("PaymentIntent", back_populates="merchant")
    
    __table_args__ = (
        Index("idx_merchant_email", "email"),
        Index("idx_merchant_api_key_prefix", "api_key_prefix"),
    )


class PaymentIntent(Base):
    """
    Payment intent - Stripe-style abstraction.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    __tablename__ = "payment_intents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False)
    
    # Amount in smallest currency unit (cents for USD)
    amount = Column(Numeric(20, 8), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    
    # Customer info
    customer_email = Column(String(255), nullable=True)
    customer_wallet = Column(String(42), nullable=True)
    description = Column(Text, nullable=True)
    
    # Status
    status = Column(Enum(PaymentIntentStatus), default=PaymentIntentStatus.REQUIRES_PAYMENT)
    
    # Rail selection
    selected_rail = Column(Enum(PaymentRail), nullable=True)
    rail_selection_reason = Column(Text, nullable=True)
    
    # External references
    external_tx_id = Column(String(255), nullable=True)  # Blockchain tx hash or provider ID
    
    # Idempotency
    idempotency_key = Column(String(64), nullable=True, unique=True)
    
    # Metadata
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)
    
    # Relationships
    merchant = relationship("Merchant", back_populates="payment_intents")
    ledger_entry = relationship("LedgerEntry", back_populates="payment_intent", uselist=False)
    
    __table_args__ = (
        Index("idx_payment_intent_merchant", "merchant_id"),
        Index("idx_payment_intent_status", "status"),
        Index("idx_payment_intent_created", "created_at"),
    )


class LedgerEntry(Base):
    """
    Immutable ledger entry for every completed payment.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    __tablename__ = "ledger_entries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_intent_id = Column(UUID(as_uuid=True), ForeignKey("payment_intents.id"), nullable=False, unique=True)
    
    # Amounts
    gross_amount = Column(Numeric(20, 8), nullable=False)
    founder_fee = Column(Numeric(20, 8), nullable=False)
    merchant_net = Column(Numeric(20, 8), nullable=False)
    
    # Currency
    currency = Column(String(3), nullable=False)
    
    # Rail used
    rail = Column(Enum(PaymentRail), nullable=False)
    
    # Transaction references
    settlement_tx_hash = Column(String(66), nullable=True)  # Blockchain tx hash
    founder_payout_tx = Column(String(66), nullable=True)
    merchant_payout_tx = Column(String(66), nullable=True)
    
    # Addresses
    founder_payout_address = Column(String(62), nullable=False)
    merchant_payout_address = Column(String(62), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    settled_at = Column(DateTime, nullable=True)
    
    # Relationships
    payment_intent = relationship("PaymentIntent", back_populates="ledger_entry")
    
    __table_args__ = (
        Index("idx_ledger_created", "created_at"),
        Index("idx_ledger_rail", "rail"),
    )


class RailFee(Base):
    """
    Current fee configuration for each rail.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    __tablename__ = "rail_fees"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    rail = Column(Enum(PaymentRail), nullable=False, unique=True)
    
    # Fee as percentage (e.g., 0.1 = 0.1%)
    percentage_fee = Column(Numeric(5, 4), nullable=False)
    # Fixed fee in cents
    fixed_fee_cents = Column(Integer, nullable=False)
    
    # Availability
    is_available = Column(Boolean, default=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def init_database(database_url: str):
    """
    Initialize database connection and create tables.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    engine = create_engine(database_url, pool_pre_ping=True)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return engine, Session


def get_session(database_url: str):
    """Get database session."""
    engine = create_engine(database_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    return Session()
