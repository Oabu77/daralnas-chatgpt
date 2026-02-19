"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
QuranChain Pay™ - Test Suite
© QuranChain™ | Omar Mohammad Abunadi™
"""

import pytest
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.security import APIKeyManager
from app.rail_selector import RailSelector, PaymentRail

client = TestClient(app)


class TestHealthEndpoint:
    """Test health check endpoint."""
    
    def test_health_check(self):
        """Test health endpoint returns 200."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "rails" in data


class TestMerchantOnboarding:
    """Test merchant onboarding."""
    
    def test_onboard_merchant(self):
        """Test successful merchant onboarding."""
        response = client.post(
            "/merchant/onboard",
            json={
                "business_name": "Test Company",
                "email": f"test{os.urandom(4).hex()}@example.com",
                "accepts_usdc": True,
                "accepts_card": True,
                "payout_usdc_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "api_key" in data
        assert data["api_key"].startswith("qcp_live_")
        assert "usdc" in data["accepted_rails"]
    
    def test_onboard_duplicate_email(self):
        """Test duplicate email rejection."""
        email = f"duplicate{os.urandom(4).hex()}@example.com"
        
        # First registration
        response1 = client.post(
            "/merchant/onboard",
            json={
                "business_name": "Test Company",
                "email": email,
            }
        )
        assert response1.status_code == 200
        
        # Duplicate attempt
        response2 = client.post(
            "/merchant/onboard",
            json={
                "business_name": "Another Company",
                "email": email,
            }
        )
        assert response2.status_code == 400


class TestAPIKeyValidation:
    """Test API key validation."""
    
    def test_api_key_format_validation(self):
        """Test API key format validation."""
        assert APIKeyManager.validate_format("qcp_live_" + "a" * 64) == True
        assert APIKeyManager.validate_format("invalid_key") == False
        assert APIKeyManager.validate_format("") == False
    
    def test_api_key_generation(self):
        """Test API key generation."""
        key, hash_, prefix = APIKeyManager.generate_api_key()
        assert key.startswith("qcp_live_")
        assert len(hash_) == 64
        assert len(prefix) == 12


class TestRailSelector:
    """Test rail selection logic."""
    
    def setup_method(self):
        """Setup test instance."""
        self.selector = RailSelector()
    
    def test_select_cheapest_rail(self):
        """Test cheapest rail selection."""
        selection = self.selector.select_rail(
            amount_cents=10000,  # $100
            merchant_accepts={
                PaymentRail.USDC: True,
                PaymentRail.ACH: True,
                PaymentRail.CARD: True,
            },
            customer_has_wallet=True,
            customer_has_bank=True,
        )
        
        # USDC should be cheapest
        assert selection.selected_rail == PaymentRail.USDC
    
    def test_fallback_when_usdc_unavailable(self):
        """Test fallback to card when USDC unavailable."""
        selection = self.selector.select_rail(
            amount_cents=10000,
            merchant_accepts={
                PaymentRail.USDC: False,
                PaymentRail.ACH: False,
                PaymentRail.CARD: True,
            },
            customer_has_wallet=False,
            customer_has_bank=False,
        )
        
        assert selection.selected_rail == PaymentRail.CARD
    
    def test_fee_calculation(self):
        """Test fee calculations."""
        usdc_fee = self.selector.calculate_fee(PaymentRail.USDC, 10000)
        card_fee = self.selector.calculate_fee(PaymentRail.CARD, 10000)
        
        # USDC: 0.1% = 10 cents
        assert usdc_fee == 10
        
        # Card: 2.9% + 30 cents = 290 + 30 = 320 cents
        assert card_fee == 320


class TestPaymentIntents:
    """Test payment intent creation."""
    
    def setup_method(self):
        """Create a merchant for testing."""
        email = f"merchant{os.urandom(4).hex()}@example.com"
        response = client.post(
            "/merchant/onboard",
            json={
                "business_name": "Test Merchant",
                "email": email,
                "accepts_usdc": True,
                "accepts_card": True,
                "payout_usdc_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3"
            }
        )
        data = response.json()
        self.api_key = data["api_key"]
        self.merchant_id = data["id"]
    
    def test_create_payment_intent(self):
        """Test payment intent creation."""
        response = client.post(
            "/payment_intents",
            headers={"X-API-Key": self.api_key},
            json={
                "amount": 10000,
                "currency": "usd",
                "customer_email": "customer@example.com",
                "description": "Test payment"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"].startswith("pi_")
        assert data["amount"] == 10000
        assert data["status"] == "requires_payment"
        assert data["selected_rail"] is not None
    
    def test_create_payment_intent_without_auth(self):
        """Test payment intent without API key fails."""
        response = client.post(
            "/payment_intents",
            json={"amount": 10000}
        )
        assert response.status_code == 422  # Missing header
    
    def test_idempotency(self):
        """Test idempotency key."""
        idempotency_key = f"idem_{os.urandom(8).hex()}"
        
        # First request
        response1 = client.post(
            "/payment_intents",
            headers={"X-API-Key": self.api_key},
            json={
                "amount": 5000,
                "idempotency_key": idempotency_key
            }
        )
        assert response1.status_code == 200
        id1 = response1.json()["id"]
        
        # Same idempotency key returns same result
        response2 = client.post(
            "/payment_intents",
            headers={"X-API-Key": self.api_key},
            json={
                "amount": 5000,
                "idempotency_key": idempotency_key
            }
        )
        assert response2.status_code == 200
        id2 = response2.json()["id"]
        
        assert id1 == id2


class TestRailFees:
    """Test rail fees endpoint."""
    
    def test_get_rail_fees(self):
        """Test getting rail fee comparison."""
        response = client.get("/rails/fees?amount=10000")
        assert response.status_code == 200
        data = response.json()
        
        assert data["amount"] == 10000
        assert "usdc" in data["fees"]
        assert "card" in data["fees"]
        assert "total_fee_cents" in data["fees"]["usdc"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
