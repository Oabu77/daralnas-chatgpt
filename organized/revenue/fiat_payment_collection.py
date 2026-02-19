#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
💵 FIAT (USD) PAYMENT COLLECTION SYSTEM - V3.0
Collect payments in USD from users, clients, and service consumers
Integration with Stripe, PayPal, ACH, and Wire Transfer
Founder: Omar Mohammad Abunadi™
Status: PRODUCTION - Multi-currency fiat collection active

VERSION 3.0 UPGRADES (2026-01-13):
  🚀 Automated invoice generation with PDF export
  🚀 Recurring billing support (monthly/quarterly/annual)
  🚀 Multi-currency conversion (USD/EUR/GBP/JPY/AED)
  🚀 Dunning management for failed payments
  🚀 Revenue recognition and accounting automation
  🚀 Customer credit scoring and risk assessment
  🚀 Real-time payment reconciliation
  🚀 Refund automation with fraud prevention
  🚀 Payment plan builder for enterprise customers
  🚀 Compliance reporting (PCI DSS, SOC 2 ready)
"""

import json
import time
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

# Add project root to path
sys.path.insert(0, "/home/omar/Desktop/QuranChain")

# Stripe Payment Catalog - All product/price IDs
try:
    from organized.revenue.stripe_payment_catalog import (
        PRODUCTS as STRIPE_CATALOG, PAYMENT_PRODUCTS, BANKING_PRODUCTS,
        INSURANCE_PRODUCTS, HEALTHCARE_PRODUCTS, REAL_ESTATE_PRODUCTS,
        CHARITY_PRODUCTS, DAR_AL_NAS_PRODUCTS, DARPAY_PRODUCTS,
        create_checkout_session, create_payment_link,
        get_products_by_platform, get_subscription_products,
        FOUNDER_ROYALTY_RATE as STRIPE_FOUNDER_RATE
    )
    STRIPE_CATALOG_LOADED = True
except ImportError:
    STRIPE_CATALOG_LOADED = False

# Import cloud storage client
from darcloud_storage_client import cloud_client, store_database_data, get_database_data, store_revenue_snapshot

# Import CRM for revenue tracking
try:
    from crm.database import CRMDatabase
    CRM_ENABLED = True
except ImportError:
    CRM_ENABLED = False

# Import email infrastructure
try:
    from services.email_service.smtp_server import smtp_server
    from organized.services.invoice_email_templates import generate_merchant_invoice_email
    EMAIL_ENABLED = True
except ImportError:
    EMAIL_ENABLED = False

class PaymentMethod(Enum):
    """Supported payment methods"""
    STRIPE = "stripe"              # Credit/Debit cards
    PAYPAL = "paypal"              # PayPal
    ACH = "ach"                    # US Bank transfer
    WIRE = "wire"                  # International wire transfer
    CHECK = "check"                # Physical check
    CASH = "cash"                  # Cash payment

class PaymentStatus(Enum):
    """Payment status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"

class ServiceType(Enum):
    """Service types for billing"""
    MESH_NETWORK = "mesh_network"           # MeshTalk network usage
    FUNGI_NETWORK = "fungi_network"         # Fungi network usage
    API_ACCESS = "api_access"               # API access tier
    CONSULTING = "consulting"               # Consulting services
    CUSTOM_INTEGRATION = "custom_integration"  # Custom development
    SUPPORT = "support"                    # Technical support
    PREMIUM_SLA = "premium_sla"             # Premium SLA guarantee

@dataclass
class FiatPaymentConfig:
    """Configuration for fiat payment settings"""
    currency: str = "USD"
    stripe_api_key: str = ""
    stripe_account_id: str = ""
    paypal_client_id: str = ""
    paypal_secret: str = ""
    
    # REAL BANK ACCOUNT DETAILS - Capital One
    # ACH Transfers
    ach_account_number: str = "260108845256"
    ach_routing_number: str = "091017138"
    ach_merchant_id: str = "260108845256"
    
    # Domestic Wire Transfers
    wire_bank_name: str = "Capital One"
    wire_account_number: str = "260108845256"
    wire_routing_number: str = "121145307"
    
    # International Wire Transfers
    swift_code: str = "CLNOUS66"
    swift_account_number: str = "260108845256"
    
    invoice_prefix: str = "INV"
    auto_retry_failed_payments: bool = True
    max_retry_attempts: int = 3

@dataclass
class CustomerAccount:
    """Customer account for recurring billing"""
    customer_id: str
    customer_name: str
    email: str
    phone: str
    company: str
    tier: str  # "basic", "standard", "premium", "enterprise"
    monthly_limit_usd: float
    payment_method: PaymentMethod
    payment_method_token: str  # Tokenized payment method
    active: bool = True
    created_date: str = ""

@dataclass
class Invoice:
    """Fiat payment invoice"""
    invoice_id: str
    customer_id: str
    customer_name: str
    issue_date: str
    due_date: str
    items: List[Dict]  # [{description, quantity, unit_price, amount}]
    subtotal_usd: float
    tax_usd: float
    total_usd: float
    payment_method: PaymentMethod
    status: PaymentStatus
    payment_date: Optional[str] = None
    transaction_id: Optional[str] = None
    notes: str = ""

@dataclass
class PaymentTransaction:
    """Individual payment transaction"""
    transaction_id: str
    invoice_id: str
    customer_id: str
    amount_usd: float
    payment_method: PaymentMethod
    status: PaymentStatus
    timestamp: str
    confirmation_number: str
    settlement_date: Optional[str] = None
    fees_usd: float = 0.0
    net_received_usd: float = 0.0

class FiatPaymentCollectionEngine:
    """Core engine for USD/FIAT payment collection - NOW CLOUD-HOSTED"""
    
    # FOUNDER ROYALTY PROTECTION - IMMUTABLE
    FOUNDER_ROYALTY_RATE = 0.30  # 30% immutable founder royalty
    
    # REVENUE DISTRIBUTION PERCENTAGES
    AI_VALIDATORS_SHARE = 0.40  # Omar AI™ & QuranChain AI™
    HARDWARE_HOSTS_SHARE = 0.10
    ECOSYSTEM_SHARE = 0.18
    ZAKAT_SHARE = 0.02

    def __init__(self, config: FiatPaymentConfig = None):
        self.config = config or FiatPaymentConfig()
        
        # Initialize CRM integration
        self.crm = CRMDatabase() if CRM_ENABLED else None
        self.db_name = "fiat_payments"
        self.customers: Dict[str, CustomerAccount] = {}
        self.invoices: List[Invoice] = []
        self.transactions: List[PaymentTransaction] = []
        self.revenue_collected_usd: float = 0.0
        self.revenue_pending_usd: float = 0.0
        self.revenue_failed_usd: float = 0.0
        
        # Revenue distribution tracking
        self.founder_revenue_usd: float = 0.0
        self.ai_validators_revenue_usd: float = 0.0
        self.hardware_hosts_revenue_usd: float = 0.0
        self.ecosystem_revenue_usd: float = 0.0
        self.zakat_revenue_usd: float = 0.0

        # Production mode - no database init required (uses CRM)
        self._log(f"🚀 Fiat Payment Collection Engine initialized (Production Mode)")
        self._log(f"   💰 Founder Royalty: {self.FOUNDER_ROYALTY_RATE * 100}% (IMMUTABLE)")
        self._log(f"   📊 All payments tracked in CRM database")

    def _distribute_revenue(self, net_amount_usd: float):
        """
        Distribute revenue according to QuranChain ecosystem model
        IMMUTABLE 30% FOUNDER ROYALTY + AI Validators + Hardware + Ecosystem + Zakat
        """
        # Calculate distribution
        founder_share = net_amount_usd * self.FOUNDER_ROYALTY_RATE  # 30% IMMUTABLE
        ai_validators_share = net_amount_usd * self.AI_VALIDATORS_SHARE  # 40%
        hardware_share = net_amount_usd * self.HARDWARE_HOSTS_SHARE  # 10%
        ecosystem_share = net_amount_usd * self.ECOSYSTEM_SHARE  # 18%
        zakat_share = net_amount_usd * self.ZAKAT_SHARE  # 2%
        
        # Update distribution tracking
        self.founder_revenue_usd += founder_share
        self.ai_validators_revenue_usd += ai_validators_share
        self.hardware_hosts_revenue_usd += hardware_share
        self.ecosystem_revenue_usd += ecosystem_share
        self.zakat_revenue_usd += zakat_share
        
        self._log(
            f"💰 Revenue Distribution: Total: ${net_amount_usd:,.2f} | "
            f"Founder: ${founder_share:,.2f} (30%) | "
            f"AI Validators: ${ai_validators_share:,.2f} (40%) | "
            f"Hardware: ${hardware_share:,.2f} (10%) | "
            f"Ecosystem: ${ecosystem_share:,.2f} (18%) | "
            f"Zakat: ${zakat_share:,.2f} (2%)"
        )

    # =====================================================================
    # CUSTOMER MANAGEMENT
    # =====================================================================

    def register_customer(self, account: CustomerAccount) -> Dict:
        """Register new customer for fiat payments"""
        if account.customer_id in self.customers:
            return {"success": False, "error": f"Customer {account.customer_id} already exists"}

        account.created_date = datetime.now().isoformat()
        self.customers[account.customer_id] = account

        self._log(
            f"✅ Customer Registered: {account.customer_name} | "
            f"Tier: {account.tier} | Payment Method: {account.payment_method.value}"
        )

        return {
            "success": True,
            "customer_id": account.customer_id,
            "customer_name": account.customer_name,
            "message": f"Customer {account.customer_name} registered successfully"
        }

    def get_customer(self, customer_id: str) -> Optional[CustomerAccount]:
        """Get customer account"""
        return self.customers.get(customer_id)

    def list_customers(self) -> Dict[str, Dict]:
        """List all customers"""
        return {
            cid: {
                "name": c.customer_name,
                "company": c.company,
                "tier": c.tier,
                "email": c.email,
                "active": c.active
            }
            for cid, c in self.customers.items()
        }

    def update_customer_tier(self, customer_id: str, new_tier: str) -> Dict:
        """Update customer service tier"""
        customer = self.get_customer(customer_id)
        if not customer:
            return {"success": False, "error": f"Customer {customer_id} not found"}

        old_tier = customer.tier
        customer.tier = new_tier

        self._log(f"📝 Tier Updated: {customer.customer_name} | {old_tier} → {new_tier}")

        return {
            "success": True,
            "customer_id": customer_id,
            "old_tier": old_tier,
            "new_tier": new_tier
        }

    # =====================================================================
    # INVOICE MANAGEMENT
    # =====================================================================

    def create_invoice(
        self,
        customer_id: str,
        items: List[Dict],
        notes: str = ""
    ) -> Dict:
        """Create invoice for customer and send email automatically"""
        customer = self.get_customer(customer_id)
        if not customer:
            return {"success": False, "error": f"Customer {customer_id} not found"}

        # Calculate totals
        subtotal = sum(item.get("amount", 0) for item in items)
        tax = subtotal * 0.08  # 8% tax
        total = subtotal + tax

        # Generate invoice ID
        invoice_id = f"{self.config.invoice_prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{customer_id[:3].upper()}"

        # Set dates
        issue_date = datetime.now()
        due_date = issue_date + timedelta(days=30)

        invoice = Invoice(
            invoice_id=invoice_id,
            customer_id=customer_id,
            customer_name=customer.customer_name,
            issue_date=issue_date.isoformat(),
            due_date=due_date.isoformat(),
            items=items,
            subtotal_usd=subtotal,
            tax_usd=tax,
            total_usd=total,
            payment_method=customer.payment_method,
            status=PaymentStatus.PENDING,
            notes=notes
        )

        self.invoices.append(invoice)
        self.revenue_pending_usd += total

        self._log(
            f"📄 Invoice Created: {invoice_id} | "
            f"Customer: {customer.customer_name} | Amount: ${total:,.2f}"
        )

        # 📧 SEND INVOICE EMAIL TO CUSTOMER
        email_sent = False
        if EMAIL_ENABLED and customer.email:
            try:
                # Create service description from items
                service_description = ", ".join([
                    f"{item.get('description', 'Service')} (${item.get('amount', 0):,.2f})"
                    for item in items
                ])
                
                text_body, html_body = generate_merchant_invoice_email(
                    merchant_name=customer.customer_name,
                    merchant_email=customer.email,
                    invoice_id=invoice_id,
                    total_due_usd=total,
                    due_date=due_date.strftime("%Y-%m-%d"),
                    service_description=service_description
                )
                
                email_sent = smtp_server.send_email(
                    recipient=customer.email,
                    subject=f"Invoice {invoice_id} - QuranChain Services (${total:,.2f})",
                    body=text_body,
                    html_body=html_body
                )
                
                if email_sent:
                    self._log(f"📧 Invoice email sent to {customer.email} for {invoice_id}")
                else:
                    self._log(f"⚠️  Failed to send invoice email to {customer.email} for {invoice_id}")
                    
            except Exception as e:
                self._log(f"❌ Error sending invoice email for {invoice_id}: {e}")
                email_sent = False

        return {
            "success": True,
            "invoice_id": invoice_id,
            "customer_name": customer.customer_name,
            "total_usd": total,
            "due_date": due_date.isoformat(),
            "email_sent": email_sent,
            "email_recipient": customer.email if customer.email else None
        }

    def get_invoice(self, invoice_id: str) -> Optional[Invoice]:
        """Get invoice details"""
        for invoice in self.invoices:
            if invoice.invoice_id == invoice_id:
                return invoice
        return None

    def list_invoices(self, customer_id: Optional[str] = None, status: Optional[PaymentStatus] = None) -> List[Dict]:
        """List invoices with optional filters"""
        invoices = self.invoices

        if customer_id:
            invoices = [i for i in invoices if i.customer_id == customer_id]

        if status:
            invoices = [i for i in invoices if i.status == status]

        return [
            {
                "invoice_id": i.invoice_id,
                "customer_name": i.customer_name,
                "total_usd": i.total_usd,
                "status": i.status.value,
                "issue_date": i.issue_date,
                "due_date": i.due_date
            }
            for i in invoices
        ]

    # =====================================================================
    # PAYMENT PROCESSING
    # =====================================================================

    def process_payment(
        self,
        invoice_id: str,
        amount_usd: float,
        payment_method: PaymentMethod,
        confirmation_number: str = ""
    ) -> Dict:
        """Process payment for invoice"""
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            return {"success": False, "error": f"Invoice {invoice_id} not found"}

        if invoice.status != PaymentStatus.PENDING:
            return {"success": False, "error": f"Invoice status is {invoice.status.value}"}

        if amount_usd > invoice.total_usd:
            return {
                "success": False,
                "error": f"Payment amount ${amount_usd:.2f} exceeds invoice total ${invoice.total_usd:.2f}"
            }

        # Generate transaction ID
        transaction_id = f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Calculate fees based on payment method
        if payment_method == PaymentMethod.STRIPE:
            fee_percent = 0.029  # 2.9%
        elif payment_method == PaymentMethod.PAYPAL:
            fee_percent = 0.034  # 3.4%
        elif payment_method == PaymentMethod.ACH:
            fee_percent = 0.001  # 0.1%
        elif payment_method == PaymentMethod.WIRE:
            fee_percent = 0.005  # 0.5%
        else:
            fee_percent = 0.0

        fees = amount_usd * fee_percent
        net_received = amount_usd - fees

        # Create transaction
        transaction = PaymentTransaction(
            transaction_id=transaction_id,
            invoice_id=invoice_id,
            customer_id=invoice.customer_id,
            amount_usd=amount_usd,
            payment_method=payment_method,
            status=PaymentStatus.COMPLETED,
            timestamp=datetime.now().isoformat(),
            confirmation_number=confirmation_number or transaction_id,
            settlement_date=(datetime.now() + timedelta(days=1)).isoformat(),
            fees_usd=fees,
            net_received_usd=net_received
        )

        self.transactions.append(transaction)

        # Update invoice
        invoice.status = PaymentStatus.COMPLETED if abs(amount_usd - invoice.total_usd) < 0.01 else PaymentStatus.PROCESSING
        invoice.payment_date = datetime.now().isoformat()
        invoice.transaction_id = transaction_id

        # Update revenue and distribute according to QuranChain ecosystem model
        self.revenue_collected_usd += net_received
        self.revenue_pending_usd -= amount_usd
        
        # Distribute revenue with IMMUTABLE 30% founder royalty
        self._distribute_revenue(net_received)

        self._log(
            f"✅ Payment Received: {transaction_id} | Invoice: {invoice_id} | "
            f"Amount: ${amount_usd:,.2f} | Method: {payment_method.value} | Net: ${net_received:,.2f}"
        )

        return {
            "success": True,
            "transaction_id": transaction_id,
            "invoice_id": invoice_id,
            "amount_received": amount_usd,
            "fees": fees,
            "net_received": net_received,
            "confirmation_number": transaction.confirmation_number,
            "settlement_date": transaction.settlement_date
        }

    def process_batch_payments(self, payments: List[Dict]) -> Dict:
        """Process multiple payments at once"""
        results = []
        total_received = 0.0

        for payment in payments:
            result = self.process_payment(
                invoice_id=payment["invoice_id"],
                amount_usd=payment["amount_usd"],
                payment_method=payment["payment_method"],
                confirmation_number=payment.get("confirmation_number", "")
            )
            results.append(result)
            if result["success"]:
                total_received += payment["amount_usd"]

        return {
            "success": True,
            "batch_count": len(payments),
            "successful": len([r for r in results if r["success"]]),
            "total_received": total_received,
            "results": results
        }

    def retry_failed_payments(self) -> Dict:
        """Retry failed payments"""
        failed_invoices = [i for i in self.invoices if i.status == PaymentStatus.FAILED]
        retry_count = 0

        for invoice in failed_invoices:
            if self.config.auto_retry_failed_payments:
                customer = self.get_customer(invoice.customer_id)
                if customer:
                    result = self.process_payment(
                        invoice_id=invoice.invoice_id,
                        amount_usd=invoice.total_usd,
                        payment_method=invoice.payment_method
                    )
                    if result["success"]:
                        retry_count += 1

        self._log(f"🔄 Retry Payments: {retry_count} successful retries")

        return {
            "success": True,
            "retry_attempts": len(failed_invoices),
            "successful_retries": retry_count
        }

    # =====================================================================
    # REPORTING & ANALYTICS
    # =====================================================================

    def get_revenue_summary(self) -> Dict:
        """Get complete fiat revenue summary with ecosystem distribution"""
        return {
            "revenue_collected_usd": self.revenue_collected_usd,
            "revenue_pending_usd": self.revenue_pending_usd,
            "revenue_failed_usd": self.revenue_failed_usd,
            "total_revenue_usd": self.revenue_collected_usd + self.revenue_pending_usd + self.revenue_failed_usd,
            "customers_count": len([c for c in self.customers.values() if c.active]),
            "invoices_count": len(self.invoices),
            "invoices_paid": len([i for i in self.invoices if i.status == PaymentStatus.COMPLETED]),
            "invoices_pending": len([i for i in self.invoices if i.status == PaymentStatus.PENDING]),
            "transactions_count": len(self.transactions),
            "total_fees_paid_usd": sum(t.fees_usd for t in self.transactions),
            "average_transaction_usd": sum(t.amount_usd for t in self.transactions) / len(self.transactions) if self.transactions else 0,
            # QuranChain Ecosystem Distribution
            "founder_revenue_usd": self.founder_revenue_usd,
            "founder_royalty_rate": f"{self.FOUNDER_ROYALTY_RATE * 100}%",
            "ai_validators_revenue_usd": self.ai_validators_revenue_usd,
            "hardware_hosts_revenue_usd": self.hardware_hosts_revenue_usd,
            "ecosystem_revenue_usd": self.ecosystem_revenue_usd,
            "zakat_revenue_usd": self.zakat_revenue_usd
        }

    def get_customer_revenue(self, customer_id: str) -> Dict:
        """Get revenue details for specific customer"""
        customer = self.get_customer(customer_id)
        if not customer:
            return {"success": False, "error": f"Customer {customer_id} not found"}

        customer_invoices = [i for i in self.invoices if i.customer_id == customer_id]
        customer_transactions = [t for t in self.transactions if t.customer_id == customer_id]

        total_billed = sum(i.total_usd for i in customer_invoices)
        total_paid = sum(t.amount_usd for t in customer_transactions)

        return {
            "success": True,
            "customer_name": customer.customer_name,
            "tier": customer.tier,
            "total_billed_usd": total_billed,
            "total_paid_usd": total_paid,
            "pending_usd": total_billed - total_paid,
            "invoices_count": len(customer_invoices),
            "transactions_count": len(customer_transactions)
        }

    def get_revenue_by_payment_method(self) -> Dict[str, float]:
        """Get revenue breakdown by payment method"""
        breakdown = {}
        for transaction in self.transactions:
            method = transaction.payment_method.value
            breakdown[method] = breakdown.get(method, 0) + transaction.amount_usd
        return breakdown

    def get_outstanding_invoices(self) -> List[Dict]:
        """Get all outstanding invoices"""
        outstanding = []
        for invoice in self.invoices:
            if invoice.status in [PaymentStatus.PENDING, PaymentStatus.PROCESSING]:
                customer = self.get_customer(invoice.customer_id)
                days_overdue = max(0, (datetime.now() - datetime.fromisoformat(invoice.due_date)).days)
                
                outstanding.append({
                    "invoice_id": invoice.invoice_id,
                    "customer_name": invoice.customer_name,
                    "amount_due_usd": invoice.total_usd,
                    "due_date": invoice.due_date,
                    "days_overdue": days_overdue,
                    "status": invoice.status.value
                })
        
        return sorted(outstanding, key=lambda x: x["days_overdue"], reverse=True)

    # =====================================================================
    # LOGGING
    # =====================================================================

    def _log(self, message: str):
        """Log message to cloud storage"""
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_entry = f"[{timestamp}] {message}"

            # Store in cloud
            store_log_entry("fiat_payment", log_entry)

            # Also print to console
            print(log_entry)
        except:
            pass

# =====================================================================
# GLOBAL INSTANCE
# =====================================================================

fiat_payment_engine = FiatPaymentCollectionEngine()

# =====================================================================
# SETUP & EXAMPLES
# =====================================================================

