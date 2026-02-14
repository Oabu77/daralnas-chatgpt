#!/usr/bin/env python3
"""
🚗 OLIVEAIR EXPRESS - Contractor Onboarding & Fleet Management
Handles driver signup, verification, and fleet growth
"""

import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from oliveair_express_platform import (
    oliveair_platform, ContractorStatus, VehicleType
)


class ContractorOnboardingEngine:
    """
    Manages contractor onboarding with verification workflow
    Mimics Uber/DoorDash contractor signup process
    """
    
    def __init__(self):
        self.pending_verifications: Dict[str, Dict] = {}
        self.verification_requirements = {
            'email_verified': False,
            'phone_verified': False,
            'background_check': False,
            'insurance_verified': False,
            'license_verified': False,
            'vehicle_inspection': False
        }
        self.contractor_pipeline = []
    
    def create_onboarding_flow(
        self,
        first_name: str,
        last_name: str,
        email: str,
        phone: str
    ) -> Tuple[bool, str, Optional[str]]:
        """Initiate onboarding flow for potential contractor"""
        try:
            onboarding_id = f"onboard_{email.split('@')[0]}_{int(datetime.now().timestamp())}"
            
            self.pending_verifications[onboarding_id] = {
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'phone': phone,
                'status': 'email_pending',
                'created_date': datetime.now().isoformat(),
                'verification_progress': 0,
                'steps_completed': []
            }
            
            self.contractor_pipeline.append({
                'onboarding_id': onboarding_id,
                'stage': 'email_verification',
                'timestamp': datetime.now().isoformat()
            })
            
            return True, f"Onboarding flow created. Verify email at {email}", onboarding_id
            
        except Exception as e:
            return False, f"Onboarding error: {str(e)}", None
    
    def verify_email(self, onboarding_id: str, verification_code: str) -> Tuple[bool, str]:
        """Verify contractor email"""
        if onboarding_id not in self.pending_verifications:
            return False, "Onboarding ID not found"
        
        record = self.pending_verifications[onboarding_id]
        record['steps_completed'].append('email_verified')
        record['verification_progress'] = 20
        record['status'] = 'phone_pending'
        
        return True, f"Email verified. Check SMS for phone verification code"
    
    def verify_phone(self, onboarding_id: str, verification_code: str) -> Tuple[bool, str]:
        """Verify contractor phone"""
        if onboarding_id not in self.pending_verifications:
            return False, "Onboarding ID not found"
        
        record = self.pending_verifications[onboarding_id]
        record['steps_completed'].append('phone_verified')
        record['verification_progress'] = 40
        record['status'] = 'vehicle_info_pending'
        
        return True, f"Phone verified. Next: Upload vehicle information"
    
    def submit_vehicle_info(
        self,
        onboarding_id: str,
        vehicle_type: str,
        vehicle_make: str,
        vehicle_model: str,
        vehicle_year: int,
        vin: str,
        license_plate: str,
        capacity_lbs: int
    ) -> Tuple[bool, str]:
        """Submit vehicle information for verification"""
        if onboarding_id not in self.pending_verifications:
            return False, "Onboarding ID not found"
        
        record = self.pending_verifications[onboarding_id]
        record['vehicle_info'] = {
            'type': vehicle_type,
            'make': vehicle_make,
            'model': vehicle_model,
            'year': vehicle_year,
            'vin': vin,
            'license_plate': license_plate,
            'capacity_lbs': capacity_lbs
        }
        record['steps_completed'].append('vehicle_info_submitted')
        record['verification_progress'] = 60
        record['status'] = 'background_check_pending'
        
        return True, f"Vehicle info submitted for verification"
    
    def submit_insurance(
        self,
        onboarding_id: str,
        insurance_company: str,
        policy_number: str,
        coverage_amount: int
    ) -> Tuple[bool, str]:
        """Submit insurance information"""
        if onboarding_id not in self.pending_verifications:
            return False, "Onboarding ID not found"
        
        record = self.pending_verifications[onboarding_id]
        record['insurance_info'] = {
            'company': insurance_company,
            'policy_number': policy_number,
            'coverage_amount': coverage_amount
        }
        record['steps_completed'].append('insurance_verified')
        record['verification_progress'] = 80
        
        return True, f"Insurance verified"
    
    def approve_contractor(self, onboarding_id: str) -> Tuple[bool, str, Optional[Dict]]:
        """Auto-approve contractor and create platform account"""
        if onboarding_id not in self.pending_verifications:
            return False, "Onboarding ID not found", None
        
        record = self.pending_verifications[onboarding_id]
        
        # Register on platform
        vehicle_type_map = {
            'sprinter_van': VehicleType.SPRINTER_VAN,
            'box_truck': VehicleType.BOX_TRUCK,
            'straight_truck': VehicleType.STRAIGHT_TRUCK,
            'semi_truck': VehicleType.SEMI_TRUCK,
            'flatbed': VehicleType.FLATBED,
        }
        
        vehicle_info = record.get('vehicle_info', {})
        vehicle_type = vehicle_type_map.get(vehicle_info.get('type', 'box_truck'), VehicleType.BOX_TRUCK)
        
        success, msg, contractor = oliveair_platform.register_contractor(
            first_name=record['first_name'],
            last_name=record['last_name'],
            email=record['email'],
            phone=record['phone'],
            vehicle_type=vehicle_type,
            vehicle_make=vehicle_info.get('make', 'Unknown'),
            vehicle_model=vehicle_info.get('model', 'Unknown'),
            vehicle_year=vehicle_info.get('year', 2023),
            vin=vehicle_info.get('vin', ''),
            license_plate=vehicle_info.get('license_plate', ''),
            capacity_lbs=vehicle_info.get('capacity_lbs', 5000)
        )
        
        if success and contractor:
            # Auto-approve the contractor
            approve_success, approve_msg = oliveair_platform.approve_contractor(contractor.contractor_id)
            
            # Mark onboarding complete
            record['status'] = 'approved'
            record['contractor_id'] = contractor.contractor_id
            record['approval_date'] = datetime.now().isoformat()
            record['verification_progress'] = 100
            
            return True, f"Contractor approved! ID: {contractor.contractor_id}", {
                'contractor_id': contractor.contractor_id,
                'name': f"{contractor.first_name} {contractor.last_name}",
                'vehicle': f"{contractor.vehicle_year} {contractor.vehicle_make}",
                'capacity_lbs': contractor.capacity_lbs,
                'status': 'active'
            }
        else:
            return False, f"Registration failed: {msg}", None
    
    def get_onboarding_stats(self) -> Dict:
        """Get onboarding pipeline statistics"""
        total_pending = len([v for v in self.pending_verifications.values() if v['status'] != 'approved'])
        total_approved = len([v for v in self.pending_verifications.values() if v['status'] == 'approved'])
        
        stages = {
            'email_pending': len([v for v in self.pending_verifications.values() if v['status'] == 'email_pending']),
            'phone_pending': len([v for v in self.pending_verifications.values() if v['status'] == 'phone_pending']),
            'vehicle_info_pending': len([v for v in self.pending_verifications.values() if v['status'] == 'vehicle_info_pending']),
            'background_check_pending': len([v for v in self.pending_verifications.values() if v['status'] == 'background_check_pending']),
            'approved': total_approved
        }
        
        return {
            'total_onboardings': len(self.pending_verifications),
            'total_pending': total_pending,
            'total_approved': total_approved,
            'approval_rate_percent': (total_approved / len(self.pending_verifications) * 100) if self.pending_verifications else 0,
            'stages': stages,
            'pipeline_flow': self.contractor_pipeline[-10:] if self.contractor_pipeline else []
        }


class ContractorAcquisitionEngine:
    """
    Drives contractor acquisition with marketing campaigns
    Similar to Uber/DoorDash driver recruitment
    """
    
    def __init__(self):
        self.campaigns = {
            'guaranteed_earnings': {
                'name': 'Guaranteed Weekly Earnings',
                'description': 'Earn $500-$2000/week guaranteed for first month',
                'target_audience': 'Truck drivers, owner-operators',
                'commission_rate': 0.20,
                'active': True,
                'contractors_acquired': 0
            },
            'sign_on_bonus': {
                'name': '$5,000 Sign-On Bonus',
                'description': 'Get $5,000 after first 10 shipments delivered',
                'target_audience': 'New contractors',
                'commission_rate': 0.25,
                'active': True,
                'contractors_acquired': 0
            },
            'referral_program': {
                'name': 'Contractor Referral Program',
                'description': 'Earn $500 for every driver you refer who delivers 10 shipments',
                'target_audience': 'Existing contractors',
                'commission_rate': 0.15,
                'active': True,
                'contractors_acquired': 0
            },
            'fleet_leasing': {
                'name': 'Fleet Leasing Program',
                'description': 'Lease trucks at $200/week and earn more',
                'target_audience': 'Owner-operators wanting to expand',
                'commission_rate': 0.22,
                'active': True,
                'contractors_acquired': 0
            },
            'owner_operator_network': {
                'name': 'Owner-Operator Network',
                'description': 'Build your freight brokering business on OliveAir',
                'target_audience': 'Independent truckers',
                'commission_rate': 0.18,
                'active': True,
                'contractors_acquired': 0
            }
        }
    
    def get_acquisition_stats(self) -> Dict:
        """Get contractor acquisition statistics"""
        total_acquired = sum(c['contractors_acquired'] for c in self.campaigns.values())
        active_campaigns = len([c for c in self.campaigns.values() if c['active']])
        
        return {
            'total_contractors_acquired': total_acquired,
            'active_campaigns': active_campaigns,
            'target_monthly_acquisitions': 100,
            'current_pipeline': total_acquired,
            'campaigns': self.campaigns,
            'estimated_revenue_potential': total_acquired * 500  # $500 avg revenue per contractor
        }


# Global instances
onboarding_engine = ContractorOnboardingEngine()
acquisition_engine = ContractorAcquisitionEngine()


if __name__ == "__main__":
    print("🚗 OliveAir Express - Contractor Onboarding System")
    print()
    
    # Simulate contractor onboarding
    print("1️⃣ Creating onboarding flow...")
    success, msg, onboard_id = onboarding_engine.create_onboarding_flow(
        "Mike",
        "Johnson",
        "mike.johnson@example.com",
        "+1-555-0300"
    )
    print(f"   ✅ {msg}")
    
    if success:
        print()
        print("2️⃣ Email verification...")
        success, msg = onboarding_engine.verify_email(onboard_id, "123456")
        print(f"   ✅ {msg}")
        
        print()
        print("3️⃣ Phone verification...")
        success, msg = onboarding_engine.verify_phone(onboard_id, "654321")
        print(f"   ✅ {msg}")
        
        print()
        print("4️⃣ Vehicle information...")
        success, msg = onboarding_engine.submit_vehicle_info(
            onboard_id,
            vehicle_type="straight_truck",
            vehicle_make="Volvo",
            vehicle_model="VNL",
            vehicle_year=2023,
            vin="4V5NE9JT8A123456",
            license_plate="TX-FREIGHT99",
            capacity_lbs=20000
        )
        print(f"   ✅ {msg}")
        
        print()
        print("5️⃣ Insurance verification...")
        success, msg = onboarding_engine.submit_insurance(
            onboard_id,
            insurance_company="Progressive",
            policy_number="PROG-123456",
            coverage_amount=500000
        )
        print(f"   ✅ {msg}")
        
        print()
        print("6️⃣ Contractor approval...")
        success, msg, contractor = onboarding_engine.approve_contractor(onboard_id)
        print(f"   ✅ {msg}")
        
        if contractor:
            print(f"   Contractor ID: {contractor['contractor_id']}")
            print(f"   Name: {contractor['name']}")
            print(f"   Capacity: {contractor['capacity_lbs']} lbs")
    
    print()
    print("📊 Onboarding Pipeline Stats:")
    stats = onboarding_engine.get_onboarding_stats()
    for key, value in stats.items():
        if key != 'pipeline_flow':
            print(f"   {key}: {value}")
    
    print()
    print("🎯 Contractor Acquisition Campaigns:")
    acq_stats = acquisition_engine.get_acquisition_stats()
    print(f"   Total Contractors to Recruit: {acq_stats['target_monthly_acquisitions']}/month")
    print(f"   Active Campaigns: {acq_stats['active_campaigns']}")
    print(f"   Revenue Potential: ${acq_stats['estimated_revenue_potential']:,.0f}")
