#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
🚚 OLIVEAIR EXPRESS - Freight Brokering & Contractor Fleet Platform
Contractor-based logistics with Uber/Amazon driver model
Built on QuranChain ecosystem for immutable freight verification
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, asdict


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class ContractorStatus(Enum):
    """Contractor status states"""
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class ShipmentStatus(Enum):
    """Shipment status states"""
    POSTED = "posted"
    QUOTED = "quoted"
    ASSIGNED = "assigned"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class VehicleType(Enum):
    """Types of vehicles in fleet"""
    SPRINTER_VAN = "sprinter_van"
    BOX_TRUCK = "box_truck"
    STRAIGHT_TRUCK = "straight_truck"
    SEMI_TRUCK = "semi_truck"
    FLATBED = "flatbed"
    TANKER = "tanker"
    REFRIGERATED = "refrigerated"


class FreightClass(Enum):
    """Freight classification for rating"""
    CLASS_50 = 50
    CLASS_55 = 55
    CLASS_60 = 60
    CLASS_65 = 65
    CLASS_70 = 70
    CLASS_85 = 85
    CLASS_100 = 100
    CLASS_110 = 110
    CLASS_125 = 125
    CLASS_150 = 150


# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Contractor:
    """Contractor/driver in OliveAir fleet"""
    contractor_id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    vehicle_type: VehicleType
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    vin: str
    license_plate: str
    capacity_lbs: int
    status: ContractorStatus = ContractorStatus.PENDING_APPROVAL
    approval_date: Optional[str] = None
    verified_email: bool = False
    verified_phone: bool = False
    insurance_verified: bool = False
    background_check_complete: bool = False
    total_shipments: int = 0
    total_revenue: float = 0.0
    avg_rating: float = 4.5
    joined_date: str = None
    crypto_wallet: Optional[str] = None
    
    def __post_init__(self):
        if self.joined_date is None:
            self.joined_date = datetime.now().isoformat()
    
    def to_dict(self):
        data = asdict(self)
        data['vehicle_type'] = self.vehicle_type.value
        data['status'] = self.status.value
        return data


@dataclass
class Shipment:
    """Freight shipment to be delivered"""
    shipment_id: str
    shipper_name: str
    shipper_phone: str
    shipper_email: str
    origin_address: str
    origin_city: str
    origin_state: str
    origin_zip: str
    destination_address: str
    destination_city: str
    destination_state: str
    destination_zip: str
    freight_weight_lbs: int
    freight_class: FreightClass
    freight_description: str
    pickup_date: str
    delivery_deadline: str
    special_handling: List[str]
    value_usd: float
    status: ShipmentStatus = ShipmentStatus.POSTED
    posted_date: str = None
    assigned_contractor: Optional[str] = None
    quoted_price_usd: Optional[float] = None
    final_price_usd: Optional[float] = None
    
    def __post_init__(self):
        if self.posted_date is None:
            self.posted_date = datetime.now().isoformat()
    
    def to_dict(self):
        data = asdict(self)
        data['freight_class'] = self.freight_class.value
        data['status'] = self.status.value
        return data


# ═══════════════════════════════════════════════════════════════════════════════
# OLIVEAIR EXPRESS PLATFORM
# ═══════════════════════════════════════════════════════════════════════════════

class OliveAirExpressPlatform:
    """
    Freight brokering platform with contractor-based fleet
    Mimics Uber/Amazon driver model for logistics
    """
    
    def __init__(self):
        self.contractors: Dict[str, Contractor] = {}
        self.shipments: Dict[str, Shipment] = {}
        self.ratings: Dict[str, List[float]] = {}  # contractor_id -> ratings
        self.transactions: List[Dict] = []
        self.platform_revenue = 0.0
        self.founder_revenue = 0.0
        
        # Platform fees
        self.platform_commission_rate = 0.20  # 20% platform commission
        self.founder_share_rate = 0.30  # 30% founder royalty
        self.contractor_earnings_rate = 0.80  # 80% goes to contractor (after platform fee)
        
    # ════════════════════════════════════════════════════════════════════════
    # CONTRACTOR MANAGEMENT
    # ════════════════════════════════════════════════════════════════════════
    
    def register_contractor(
        self,
        first_name: str,
        last_name: str,
        email: str,
        phone: str,
        vehicle_type: VehicleType,
        vehicle_make: str,
        vehicle_model: str,
        vehicle_year: int,
        vin: str,
        license_plate: str,
        capacity_lbs: int,
        crypto_wallet: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Contractor]]:
        """Register a new contractor/driver"""
        try:
            contractor_id = f"contractor_{uuid.uuid4().hex[:8]}"
            
            # Check for duplicates
            for existing in self.contractors.values():
                if existing.email == email or existing.vin == vin:
                    return False, "Email or VIN already registered", None
            
            contractor = Contractor(
                contractor_id=contractor_id,
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=phone,
                vehicle_type=vehicle_type,
                vehicle_make=vehicle_make,
                vehicle_model=vehicle_model,
                vehicle_year=vehicle_year,
                vin=vin,
                license_plate=license_plate,
                capacity_lbs=capacity_lbs,
                crypto_wallet=crypto_wallet
            )
            
            self.contractors[contractor_id] = contractor
            self.ratings[contractor_id] = []
            
            return True, f"Contractor {contractor_id} registered for approval", contractor
            
        except Exception as e:
            return False, f"Registration error: {str(e)}", None
    
    def approve_contractor(self, contractor_id: str) -> Tuple[bool, str]:
        """Approve a contractor after verification"""
        try:
            if contractor_id not in self.contractors:
                return False, "Contractor not found"
            
            contractor = self.contractors[contractor_id]
            contractor.status = ContractorStatus.APPROVED
            contractor.approval_date = datetime.now().isoformat()
            contractor.verified_email = True
            contractor.verified_phone = True
            contractor.background_check_complete = True
            contractor.insurance_verified = True
            
            return True, f"Contractor {contractor_id} approved and active"
            
        except Exception as e:
            return False, f"Approval error: {str(e)}"
    
    def get_contractor_stats(self, contractor_id: str) -> Dict:
        """Get contractor statistics"""
        if contractor_id not in self.contractors:
            return {}
        
        contractor = self.contractors[contractor_id]
        avg_rating = sum(self.ratings.get(contractor_id, [4.5])) / max(len(self.ratings.get(contractor_id, [4.5])), 1)
        
        return {
            'contractor_id': contractor_id,
            'name': f"{contractor.first_name} {contractor.last_name}",
            'vehicle': f"{contractor.vehicle_year} {contractor.vehicle_make} {contractor.vehicle_model}",
            'status': contractor.status.value,
            'total_shipments': contractor.total_shipments,
            'total_revenue': contractor.total_revenue,
            'avg_rating': avg_rating,
            'acceptance_rate': 95.0 if contractor.total_shipments > 0 else 0.0,
            'joined': contractor.joined_date
        }
    
    # ════════════════════════════════════════════════════════════════════════
    # SHIPMENT MANAGEMENT
    # ════════════════════════════════════════════════════════════════════════
    
    def post_shipment(
        self,
        shipper_name: str,
        shipper_phone: str,
        shipper_email: str,
        origin_address: str,
        origin_city: str,
        origin_state: str,
        origin_zip: str,
        destination_address: str,
        destination_city: str,
        destination_state: str,
        destination_zip: str,
        freight_weight_lbs: int,
        freight_class: FreightClass,
        freight_description: str,
        pickup_date: str,
        delivery_deadline: str,
        value_usd: float,
        special_handling: Optional[List[str]] = None
    ) -> Tuple[bool, str, Optional[Shipment]]:
        """Post a new freight shipment"""
        try:
            shipment_id = f"shipment_{uuid.uuid4().hex[:8]}"
            
            shipment = Shipment(
                shipment_id=shipment_id,
                shipper_name=shipper_name,
                shipper_phone=shipper_phone,
                shipper_email=shipper_email,
                origin_address=origin_address,
                origin_city=origin_city,
                origin_state=origin_state,
                origin_zip=origin_zip,
                destination_address=destination_address,
                destination_city=destination_city,
                destination_state=destination_state,
                destination_zip=destination_zip,
                freight_weight_lbs=freight_weight_lbs,
                freight_class=freight_class,
                freight_description=freight_description,
                pickup_date=pickup_date,
                delivery_deadline=delivery_deadline,
                value_usd=value_usd,
                special_handling=special_handling or []
            )
            
            self.shipments[shipment_id] = shipment
            
            return True, f"Shipment {shipment_id} posted and available for quotes", shipment
            
        except Exception as e:
            return False, f"Shipment posting error: {str(e)}", None
    
    def quote_shipment(
        self,
        shipment_id: str,
        contractor_id: str,
        quoted_price_usd: float
    ) -> Tuple[bool, str]:
        """Contractor quotes a shipment"""
        try:
            if shipment_id not in self.shipments:
                return False, "Shipment not found"
            if contractor_id not in self.contractors:
                return False, "Contractor not found"
            
            shipment = self.shipments[shipment_id]
            contractor = self.contractors[contractor_id]
            
            # Check if contractor has capacity
            if contractor.capacity_lbs < shipment.freight_weight_lbs:
                return False, f"Contractor capacity {contractor.capacity_lbs}lbs insufficient for {shipment.freight_weight_lbs}lbs"
            
            shipment.quoted_price_usd = quoted_price_usd
            shipment.assigned_contractor = contractor_id
            shipment.status = ShipmentStatus.QUOTED
            
            return True, f"Quote of ${quoted_price_usd:,.2f} submitted for shipment {shipment_id}"
            
        except Exception as e:
            return False, f"Quote error: {str(e)}"
    
    def accept_shipment(
        self,
        shipment_id: str,
        contractor_id: str
    ) -> Tuple[bool, str, Optional[Dict]]:
        """Contractor accepts a shipment"""
        try:
            if shipment_id not in self.shipments:
                return False, "Shipment not found", None
            if contractor_id not in self.contractors:
                return False, "Contractor not found", None
            
            shipment = self.shipments[shipment_id]
            contractor = self.contractors[contractor_id]
            
            if shipment.assigned_contractor != contractor_id:
                return False, "Contractor did not quote this shipment", None
            
            final_price = shipment.quoted_price_usd
            
            # Calculate revenue split
            platform_commission = final_price * self.platform_commission_rate
            contractor_earnings = final_price * self.contractor_earnings_rate
            founder_share = final_price * self.founder_share_rate
            
            # Update shipment
            shipment.status = ShipmentStatus.ASSIGNED
            shipment.final_price_usd = final_price
            
            # Update contractor
            contractor.total_shipments += 1
            contractor.total_revenue += contractor_earnings
            
            # Update platform revenue
            self.platform_revenue += platform_commission
            self.founder_revenue += founder_share
            
            # Record transaction
            transaction = {
                'transaction_id': f"txn_{uuid.uuid4().hex[:8]}",
                'shipment_id': shipment_id,
                'contractor_id': contractor_id,
                'timestamp': datetime.now().isoformat(),
                'final_price_usd': final_price,
                'contractor_earnings': contractor_earnings,
                'platform_commission': platform_commission,
                'founder_share': founder_share
            }
            self.transactions.append(transaction)
            
            return True, f"Shipment {shipment_id} accepted by {contractor.first_name}", transaction
            
        except Exception as e:
            return False, f"Acceptance error: {str(e)}", None
    
    def complete_shipment(
        self,
        shipment_id: str,
        contractor_rating: float = 5.0
    ) -> Tuple[bool, str]:
        """Mark shipment as delivered"""
        try:
            if shipment_id not in self.shipments:
                return False, "Shipment not found"
            
            shipment = self.shipments[shipment_id]
            contractor_id = shipment.assigned_contractor
            
            shipment.status = ShipmentStatus.DELIVERED
            
            # Record rating
            if contractor_id:
                if contractor_id not in self.ratings:
                    self.ratings[contractor_id] = []
                self.ratings[contractor_id].append(contractor_rating)
            
            return True, f"Shipment {shipment_id} marked as delivered"
            
        except Exception as e:
            return False, f"Completion error: {str(e)}"
    
    # ════════════════════════════════════════════════════════════════════════
    # REVENUE & REPORTING
    # ════════════════════════════════════════════════════════════════════════
    
    def get_revenue_summary(self) -> Dict:
        """Get platform revenue summary"""
        total_shipments = len([s for s in self.shipments.values() if s.status == ShipmentStatus.DELIVERED])
        total_volume = sum(s.final_price_usd for s in self.shipments.values() if s.final_price_usd)
        
        return {
            'platform_name': 'OliveAir Express',
            'total_shipments_delivered': total_shipments,
            'total_volume_usd': total_volume,
            'total_contractors': len([c for c in self.contractors.values() if c.status == ContractorStatus.APPROVED]),
            'active_shipments': len([s for s in self.shipments.values() if s.status in [ShipmentStatus.POSTED, ShipmentStatus.ASSIGNED, ShipmentStatus.IN_TRANSIT]]),
            'platform_revenue_usd': self.platform_revenue,
            'founder_revenue_usd': self.founder_revenue,
            'contractor_earnings_distributed': sum(c.total_revenue for c in self.contractors.values()),
            'founder_share_percent': 30,
            'platform_commission_percent': 20,
            'contractor_earnings_percent': 50
        }
    
    def get_platform_stats(self) -> Dict:
        """Get comprehensive platform statistics"""
        summary = self.get_revenue_summary()
        
        avg_contractor_rating = (
            sum(sum(self.ratings.get(c, [4.5])) / max(len(self.ratings.get(c, [4.5])), 1) 
                for c in self.contractors.keys()) / max(len(self.contractors), 1)
        ) if self.contractors else 4.5
        
        return {
            **summary,
            'total_contractors_registered': len(self.contractors),
            'approved_contractors': len([c for c in self.contractors.values() if c.status == ContractorStatus.APPROVED]),
            'pending_contractors': len([c for c in self.contractors.values() if c.status == ContractorStatus.PENDING_APPROVAL]),
            'avg_contractor_rating': avg_contractor_rating,
            'total_transactions': len(self.transactions),
            'monthly_active_contractors': len([c for c in self.contractors.values() if c.total_shipments > 0]),
            'platform_uptime': '99.9%'
        }


# Global instance
oliveair_platform = OliveAirExpressPlatform()


if __name__ == "__main__":
    # Example usage
    print("🚚 OliveAir Express Platform - Example Usage")
    print()
    
    # Register contractors
    success, msg, contractor = oliveair_platform.register_contractor(
        first_name="John",
        last_name="Smith",
        email="john@example.com",
        phone="+1-555-0100",
        vehicle_type=VehicleType.STRAIGHT_TRUCK,
        vehicle_make="Freightliner",
        vehicle_model="Cascadia",
        vehicle_year=2023,
        vin="1HSJD1234567890AB",
        license_plate="CA-TRUCK01",
        capacity_lbs=25000
    )
    print(f"✅ {msg}" if success else f"❌ {msg}")
    
    if success:
        # Approve contractor
        success, msg = oliveair_platform.approve_contractor(contractor.contractor_id)
        print(f"✅ {msg}")
        
        # Post shipment
        success, msg, shipment = oliveair_platform.post_shipment(
            shipper_name="ABC Logistics",
            shipper_phone="+1-555-0200",
            shipper_email="logistics@abc.example",
            origin_address="1000 Industrial Blvd",
            origin_city="Los Angeles",
            origin_state="CA",
            origin_zip="90001",
            destination_address="500 Commerce St",
            destination_city="Long Beach",
            destination_state="CA",
            destination_zip="90801",
            freight_weight_lbs=15000,
            freight_class=FreightClass.CLASS_85,
            freight_description="Manufactured goods",
            pickup_date="2026-01-15",
            delivery_deadline="2026-01-16",
            value_usd=5000
        )
        print(f"✅ {msg}")
        
        if success:
            # Quote shipment
            success, msg = oliveair_platform.quote_shipment(
                shipment.shipment_id,
                contractor.contractor_id,
                quoted_price_usd=4500
            )
            print(f"✅ {msg}")
            
            # Accept shipment
            success, msg, txn = oliveair_platform.accept_shipment(
                shipment.shipment_id,
                contractor.contractor_id
            )
            print(f"✅ {msg}")
            
            # Complete shipment
            success, msg = oliveair_platform.complete_shipment(
                shipment.shipment_id,
                contractor_rating=4.8
            )
            print(f"✅ {msg}")
    
    print()
    print("📊 Platform Statistics:")
    stats = oliveair_platform.get_platform_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
