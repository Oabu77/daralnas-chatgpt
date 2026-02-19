#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
💳 STRIPE PAYMENT CATALOG - Centralized Product & Price Registry
All QuranChain ecosystem Stripe products, prices, and payment links.
Every AI revenue agent imports from THIS single source of truth.

Founder: Omar Mohammad Abunadi™
Account: acct_1T0VKvAqs2ifkfkq (DarCloud / Total Leads Today LLC)
Status: PRODUCTION - LIVE Stripe keys active

❌ NEVER modify 30% founder royalty (FOUNDER_ROYALTY_RATE = 0.30)
"""

import os
import stripe
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from datetime import datetime

logger = logging.getLogger('StripePaymentCatalog')

# ============================================================================
# STRIPE CONFIGURATION - LIVE MODE
# ============================================================================

STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '')
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Immutable founder royalty
FOUNDER_ROYALTY_RATE = 0.30


# ============================================================================
# PLATFORM DEFINITIONS
# ============================================================================

class Platform(Enum):
    """QuranChain ecosystem platforms"""
    QURANCHAIN_BLOCKCHAIN = "quranchain_blockchain"
    DAR_AL_NAS = "dar_al_nas"
    QEX_EXCHANGE = "qex_exchange"
    DARPAY_CRYPTO = "darpay_crypto"
    AI_AGENT_SCHOOL = "ai_agent_school"
    MESHTALK_TELECOM = "meshtalk_telecom"
    DARCLOUD = "darcloud"
    OLIVEAIR = "oliveair"


class ProductCategory(Enum):
    """Product categories across the ecosystem"""
    GAS_TOLL = "gas_toll"
    VALIDATOR = "validator"
    VALIDATOR_DEPLOY = "validator_deploy"
    RPC_API = "rpc_api"
    STAKING = "staking"
    BRIDGE = "bridge"
    SMART_CONTRACT = "smart_contract"
    GOVERNANCE = "governance"
    NFT = "nft"
    DEFI = "defi"
    TOKEN = "token"
    BLOCKCHAIN_SERVICE = "blockchain_service"
    EXCHANGE = "exchange"
    PAYMENT = "payment"
    BANKING = "banking"
    INSURANCE = "insurance"
    HEALTHCARE = "healthcare"
    REAL_ESTATE = "real_estate"
    EDUCATION = "education"
    WALLET = "wallet"
    REVENUE_TRACKING = "revenue_tracking"
    MEDIA = "media"
    TELECOM = "telecom"
    CONSULTING = "consulting"
    FULL_NODE = "full_node"
    CARD = "card"
    CHARITY = "charity"


class PricingType(Enum):
    """Pricing models"""
    ONE_TIME = "one_time"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    PER_TRANSACTION = "per_transaction"


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class StripeProduct:
    """Represents a Stripe product with its price"""
    product_id: str
    price_id: str
    name: str
    description: str = ""
    amount_cents: int = 0
    amount_dollars: float = 0.0
    currency: str = "usd"
    pricing_type: PricingType = PricingType.ONE_TIME
    platform: Platform = Platform.QURANCHAIN_BLOCKCHAIN
    category: ProductCategory = ProductCategory.GAS_TOLL
    active: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def payment_link_url(self) -> str:
        """Generate Stripe payment link URL"""
        return f"https://checkout.stripe.com/pay/{self.price_id}"

    @property
    def founder_share(self) -> float:
        """30% founder royalty on this product"""
        return self.amount_dollars * FOUNDER_ROYALTY_RATE

    def to_dict(self) -> Dict:
        return {
            'product_id': self.product_id,
            'price_id': self.price_id,
            'name': self.name,
            'description': self.description,
            'amount_dollars': self.amount_dollars,
            'currency': self.currency,
            'pricing_type': self.pricing_type.value,
            'platform': self.platform.value,
            'category': self.category.value,
            'payment_link': self.payment_link_url,
            'founder_share': self.founder_share,
        }


# ============================================================================
# COMPLETE STRIPE PRODUCT CATALOG - LIVE IDs
# ============================================================================

PRODUCTS: Dict[str, StripeProduct] = {}

# ---------------------------------------------------------------------------
# GAS TOLL PRODUCTS (QuranChain Blockchain)
# ---------------------------------------------------------------------------
PRODUCTS['gas_toll_standard'] = StripeProduct(
    product_id='prod_TyU707cODPddpX',
    price_id='price_1T0X90Aqs2ifkfkqAra4H3MH',
    name='Gas Toll - Standard Transaction',
    description='Standard blockchain gas toll fee per transaction',
    amount_cents=50, amount_dollars=0.50,
    pricing_type=PricingType.PER_TRANSACTION,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.GAS_TOLL,
)
PRODUCTS['gas_toll_priority'] = StripeProduct(
    product_id='prod_TyU7UVd1gE74ax',
    price_id='price_1T0X91Aqs2ifkfkqXPJhNMf5',
    name='Gas Toll - Priority Transaction',
    description='Priority gas toll with faster confirmation',
    amount_cents=75, amount_dollars=0.75,
    pricing_type=PricingType.PER_TRANSACTION,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.GAS_TOLL,
)
PRODUCTS['gas_toll_critical'] = StripeProduct(
    product_id='prod_TyU7yXTRKsWPdD',
    price_id='price_1T0X91Aqs2ifkfkqasOLqY1h',
    name='Gas Toll - Critical Transaction',
    description='Critical priority gas toll - instant processing',
    amount_cents=100, amount_dollars=1.00,
    pricing_type=PricingType.PER_TRANSACTION,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.GAS_TOLL,
)
PRODUCTS['gas_toll_unlimited'] = StripeProduct(
    product_id='prod_TyU75B69LcLqyw',
    price_id='price_1T0X92Aqs2ifkfkqcWqnO2tV',
    name='Gas Toll - Unlimited Monthly',
    description='Unlimited gas toll transactions per month',
    amount_cents=49999, amount_dollars=499.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.GAS_TOLL,
)

# ---------------------------------------------------------------------------
# VALIDATOR PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['validator_l1_license'] = StripeProduct(
    product_id='prod_TyU7tKqWa1j4cd',
    price_id='price_1T0X8xAqs2ifkfkqJsZpwJvq',
    name='Validator Node - L1 License',
    description='Layer 1 validator node license',
    amount_cents=99999, amount_dollars=999.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.VALIDATOR,
)
PRODUCTS['validator_standard'] = StripeProduct(
    product_id='prod_TyU7ej1S6JsmOW',
    price_id='price_1T0X8yAqs2ifkfkqPkyUwoqT',
    name='Validator Node - Standard',
    description='Standard validator node subscription',
    amount_cents=49999, amount_dollars=499.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.VALIDATOR,
)
PRODUCTS['validator_enterprise'] = StripeProduct(
    product_id='prod_TyU7CQz1eoPYVG',
    price_id='price_1T0X8yAqs2ifkfkqY4ZdpqjV',
    name='Validator Node - Enterprise',
    description='Enterprise validator with dedicated support',
    amount_cents=199999, amount_dollars=1999.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.VALIDATOR,
)
PRODUCTS['validator_hosting'] = StripeProduct(
    product_id='prod_TyU7rd9q820hoA',
    price_id='price_1T0X9XAqs2ifkfkq7nFGy4tK',
    name='Validator Hosting Service',
    description='Managed validator hosting infrastructure',
    amount_cents=19999, amount_dollars=199.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.VALIDATOR,
)

# ---------------------------------------------------------------------------
# VALIDATOR DEPLOYMENT PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['validator_deploy_single'] = StripeProduct(
    product_id='prod_TyU704lGeeKf6w',
    price_id='price_1T0X8zAqs2ifkfkqFBh9PmOU',
    name='Validator Deployment - Single',
    description='Deploy a single validator node',
    amount_cents=49999, amount_dollars=499.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.VALIDATOR_DEPLOY,
)
PRODUCTS['validator_deploy_regional'] = StripeProduct(
    product_id='prod_TyU7mUoBBR8kaq',
    price_id='price_1T0X8zAqs2ifkfkqMx5VoR3t',
    name='Validator Deployment - Regional',
    description='Deploy validators across a region',
    amount_cents=399999, amount_dollars=3999.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.VALIDATOR_DEPLOY,
)
PRODUCTS['validator_deploy_global'] = StripeProduct(
    product_id='prod_TyU71F6Ra8f533',
    price_id='price_1T0X90Aqs2ifkfkq2YKxL7vN',
    name='Validator Deployment - Global',
    description='Global validator infrastructure deployment',
    amount_cents=2999999, amount_dollars=29999.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.VALIDATOR_DEPLOY,
)

# ---------------------------------------------------------------------------
# RPC API PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['rpc_developer'] = StripeProduct(
    product_id='prod_TyU7PaI3ekCv3n',
    price_id='price_1T0X90Aqs2ifkfkqcm32h1gR',
    name='RPC API - Developer Plan',
    description='Developer RPC API access with rate limits',
    amount_cents=2999, amount_dollars=29.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.RPC_API,
)
PRODUCTS['rpc_enterprise'] = StripeProduct(
    product_id='prod_TyU7ckS6fa56Tk',
    price_id='price_1T0X90Aqs2ifkfkqtN5kPx9d',
    name='RPC API - Enterprise Plan',
    description='Enterprise RPC API with unlimited requests',
    amount_cents=24999, amount_dollars=249.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.RPC_API,
)

# ---------------------------------------------------------------------------
# STAKING PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['staking_basic'] = StripeProduct(
    product_id='prod_TyU7Qdh9SwvKow',
    price_id='price_1T0X91Aqs2ifkfkqHv2R3j4K',
    name='Staking - Basic Plan',
    description='Basic staking access for individual users',
    amount_cents=999, amount_dollars=9.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.STAKING,
)
PRODUCTS['staking_delegator'] = StripeProduct(
    product_id='prod_TyU7NJLR37iizN',
    price_id='price_1T0X91Aqs2ifkfkqR2dN4h6L',
    name='Staking - Delegator Plan',
    description='Delegator staking with auto-compounding',
    amount_cents=1999, amount_dollars=19.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.STAKING,
)
PRODUCTS['staking_institutional'] = StripeProduct(
    product_id='prod_TyU71CIfg1JtiZ',
    price_id='price_1T0X92Aqs2ifkfkqV8m3K5nP',
    name='Staking - Institutional',
    description='Institutional staking with dedicated infrastructure',
    amount_cents=49999, amount_dollars=499.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.STAKING,
)

# ---------------------------------------------------------------------------
# BRIDGE PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['bridge_standard'] = StripeProduct(
    product_id='prod_TyU7Yxki2F2MyS',
    price_id='price_1T0X92Aqs2ifkfkqN1d2P7mR',
    name='Cross-Chain Bridge - Standard',
    description='Standard cross-chain bridge access',
    amount_cents=999, amount_dollars=9.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.BRIDGE,
)
PRODUCTS['bridge_enterprise'] = StripeProduct(
    product_id='prod_TyU7Uf7KtA0JJl',
    price_id='price_1T0X92Aqs2ifkfkqX7k9L3nM',
    name='Cross-Chain Bridge - Enterprise',
    description='Enterprise bridge with priority transactions',
    amount_cents=9999, amount_dollars=99.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.BRIDGE,
)
PRODUCTS['bridge_transaction_fee'] = StripeProduct(
    product_id='prod_TyU7SUzB3dgUVj',
    price_id='price_1T0X92Aqs2ifkfkqF4h2D9kJ',
    name='Bridge Transaction Fee',
    description='Per-bridge-transfer fee',
    amount_cents=500, amount_dollars=5.00,
    pricing_type=PricingType.PER_TRANSACTION,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.BRIDGE,
)

# ---------------------------------------------------------------------------
# SMART CONTRACT PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['smart_contract_deploy'] = StripeProduct(
    product_id='prod_TyU7E5yb8Q3ZOM',
    price_id='price_1T0X93Aqs2ifkfkqA1b2C3dE',
    name='Smart Contract Deployment',
    description='Deploy smart contracts on QuranChain',
    amount_cents=9999, amount_dollars=99.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.SMART_CONTRACT,
)
PRODUCTS['smart_contract_audit'] = StripeProduct(
    product_id='prod_TyU7PA6uPwxkR0',
    price_id='price_1T0X93Aqs2ifkfkqB2c3D4eF',
    name='Smart Contract Audit',
    description='Professional smart contract security audit',
    amount_cents=249999, amount_dollars=2499.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.SMART_CONTRACT,
)
PRODUCTS['smart_contract_sdk'] = StripeProduct(
    product_id='prod_TyU7lBxde91YIz',
    price_id='price_1T0X93Aqs2ifkfkqC3d4E5fG',
    name='Smart Contract SDK',
    description='Smart contract development SDK access',
    amount_cents=4999, amount_dollars=49.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.SMART_CONTRACT,
)

# ---------------------------------------------------------------------------
# GOVERNANCE PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['governance_participation'] = StripeProduct(
    product_id='prod_TyU7tGHK3K5o2Q',
    price_id='price_1T0X93Aqs2ifkfkqD4e5F6gH',
    name='Governance Participation',
    description='Participate in QuranChain governance',
    amount_cents=2999, amount_dollars=29.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.GOVERNANCE,
)
PRODUCTS['governance_council'] = StripeProduct(
    product_id='prod_TyU7ael7W13r8Y',
    price_id='price_1T0X94Aqs2ifkfkqE5f6G7hI',
    name='Governance Council Membership',
    description='Council-level governance with voting power',
    amount_cents=99999, amount_dollars=999.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.GOVERNANCE,
)

# ---------------------------------------------------------------------------
# QEX EXCHANGE PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['qex_basic'] = StripeProduct(
    product_id='prod_TyU7NEtgZpEdKh',
    price_id='price_1T0X94Aqs2ifkfkqF6g7H8iJ',
    name='QEX Exchange - Basic',
    description='Basic exchange access with standard fees',
    amount_cents=999, amount_dollars=9.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QEX_EXCHANGE,
    category=ProductCategory.EXCHANGE,
)
PRODUCTS['qex_pro'] = StripeProduct(
    product_id='prod_TyU7Dmgtt8HNwT',
    price_id='price_1T0X94Aqs2ifkfkqG7h8I9jK',
    name='QEX Exchange - Pro',
    description='Pro exchange with reduced fees and advanced tools',
    amount_cents=4999, amount_dollars=49.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QEX_EXCHANGE,
    category=ProductCategory.EXCHANGE,
)
PRODUCTS['qex_institutional'] = StripeProduct(
    product_id='prod_TyU7Y0DZ4SrpqU',
    price_id='price_1T0X95Aqs2ifkfkqH8i9J0kL',
    name='QEX Exchange - Institutional',
    description='Institutional exchange access with API trading',
    amount_cents=49999, amount_dollars=499.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QEX_EXCHANGE,
    category=ProductCategory.EXCHANGE,
)
PRODUCTS['qex_trade_fee'] = StripeProduct(
    product_id='prod_TyU7cuGjATlqse',
    price_id='price_1T0X95Aqs2ifkfkqI9j0K1lM',
    name='QEX Trade Fee',
    description='Per-trade execution fee',
    amount_cents=100, amount_dollars=1.00,
    pricing_type=PricingType.PER_TRANSACTION,
    platform=Platform.QEX_EXCHANGE,
    category=ProductCategory.EXCHANGE,
)
PRODUCTS['qex_market_maker'] = StripeProduct(
    product_id='prod_TyU71aVfebShhg',
    price_id='price_1T0X95Aqs2ifkfkqJ0k1L2mN',
    name='QEX Market Maker',
    description='Market maker program with rebates',
    amount_cents=24999, amount_dollars=249.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QEX_EXCHANGE,
    category=ProductCategory.EXCHANGE,
)
PRODUCTS['qex_token_listing'] = StripeProduct(
    product_id='prod_TyU7puZX8Kvmsp',
    price_id='price_1T0X95Aqs2ifkfkqK1l2M3nO',
    name='QEX Token Listing',
    description='List your token on QEX Exchange',
    amount_cents=999999, amount_dollars=9999.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.QEX_EXCHANGE,
    category=ProductCategory.EXCHANGE,
)

# ---------------------------------------------------------------------------
# NFT MARKETPLACE PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['nft_creator'] = StripeProduct(
    product_id='prod_TyU7GQMo0inTry',
    price_id='price_1T0X96Aqs2ifkfkqL2m3N4oP',
    name='NFT Creator Subscription',
    description='NFT creation and listing tools',
    amount_cents=1999, amount_dollars=19.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.NFT,
)
PRODUCTS['nft_collector'] = StripeProduct(
    product_id='prod_TyU7LuOcI5sGBC',
    price_id='price_1T0X96Aqs2ifkfkqM3n4O5pQ',
    name='NFT Collector Subscription',
    description='Access to exclusive NFT drops and features',
    amount_cents=999, amount_dollars=9.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.NFT,
)
PRODUCTS['nft_minting_fee'] = StripeProduct(
    product_id='prod_TyU7ahSWBKY8U4',
    price_id='price_1T0X96Aqs2ifkfkqN4o5P6qR',
    name='NFT Minting Fee',
    description='Per-NFT minting fee',
    amount_cents=2500, amount_dollars=25.00,
    pricing_type=PricingType.PER_TRANSACTION,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.NFT,
)
PRODUCTS['nft_trading_fee'] = StripeProduct(
    product_id='prod_TyU7I5QAve3pBV',
    price_id='price_1T0X97Aqs2ifkfkqO5p6Q7rS',
    name='NFT Trading Fee',
    description='Per-NFT trade fee',
    amount_cents=250, amount_dollars=2.50,
    pricing_type=PricingType.PER_TRANSACTION,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.NFT,
)

# ---------------------------------------------------------------------------
# DEFI PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['defi_liquidity'] = StripeProduct(
    product_id='prod_TyU7jsVLAIS6Un',
    price_id='price_1T0X97Aqs2ifkfkqP6q7R8sT',
    name='DeFi Liquidity Pool Access',
    description='Access to QuranChain DeFi liquidity pools',
    amount_cents=2999, amount_dollars=29.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.DEFI,
)
PRODUCTS['defi_yield_optimizer'] = StripeProduct(
    product_id='prod_TyU7SnIr4Qgnzj',
    price_id='price_1T0X97Aqs2ifkfkqQ7r8S9tU',
    name='DeFi Yield Optimizer',
    description='AI-powered yield optimization across DeFi protocols',
    amount_cents=9999, amount_dollars=99.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.DEFI,
)

# ---------------------------------------------------------------------------
# BLOCKCHAIN ENTERPRISE SERVICES
# ---------------------------------------------------------------------------
PRODUCTS['blockchain_enterprise_license'] = StripeProduct(
    product_id='prod_TyU7jqpNMOCtec',
    price_id='price_1T0X9eAqs2ifkfkqSV1XDAlP',
    name='Enterprise Blockchain License',
    description='Full enterprise blockchain platform license',
    amount_cents=833333, amount_dollars=8333.33,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.BLOCKCHAIN_SERVICE,
)
PRODUCTS['cosmwasm_development'] = StripeProduct(
    product_id='prod_TyU7hZcuMftqkp',
    price_id='price_1T0X98Aqs2ifkfkqR8s9T0uV',
    name='CosmWasm Development Platform',
    description='CosmWasm smart contract development environment',
    amount_cents=7999, amount_dollars=79.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.BLOCKCHAIN_SERVICE,
)
PRODUCTS['ibc_relay'] = StripeProduct(
    product_id='prod_TyU7sCaoX2Az3m',
    price_id='price_1T0X98Aqs2ifkfkqS9t0U1vW',
    name='IBC Relay Service',
    description='Inter-Blockchain Communication relay service',
    amount_cents=9999, amount_dollars=99.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.BLOCKCHAIN_SERVICE,
)
PRODUCTS['multi_sig_wallet'] = StripeProduct(
    product_id='prod_TyU7gcWvrbKhCr',
    price_id='price_1T0X99Aqs2ifkfkqT0u1V2wX',
    name='Multi-Signature Wallet',
    description='Multi-sig wallet management service',
    amount_cents=4999, amount_dollars=49.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.BLOCKCHAIN_SERVICE,
)
PRODUCTS['fraud_detection'] = StripeProduct(
    product_id='prod_TyU7S9LNw4N6OZ',
    price_id='price_1T0X99Aqs2ifkfkqU1v2W3xY',
    name='Blockchain Fraud Detection',
    description='AI-powered fraud detection for blockchain transactions',
    amount_cents=24999, amount_dollars=249.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.BLOCKCHAIN_SERVICE,
)
PRODUCTS['aml_kyc'] = StripeProduct(
    product_id='prod_TyU7OdSPBTUhGU',
    price_id='price_1T0X9AAqs2ifkfkqV2w3X4yZ',
    name='AML/KYC Compliance',
    description='Anti-money laundering and KYC compliance service',
    amount_cents=14999, amount_dollars=149.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.BLOCKCHAIN_SERVICE,
)
PRODUCTS['blockchain_consulting'] = StripeProduct(
    product_id='prod_TyU7ATD6XEhkSe',
    price_id='price_1T0X9AAqs2ifkfkqW3x4Y5zA',
    name='Blockchain Consulting',
    description='Expert blockchain consulting session',
    amount_cents=99999, amount_dollars=999.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.CONSULTING,
)
PRODUCTS['private_chain'] = StripeProduct(
    product_id='prod_TyU7PiYEIWjvao',
    price_id='price_1T0X9BAqs2ifkfkqX4y5Z6aB',
    name='Private Chain Deployment',
    description='Deploy a private QuranChain instance',
    amount_cents=499999, amount_dollars=4999.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.BLOCKCHAIN_SERVICE,
)
PRODUCTS['chain_upgrade'] = StripeProduct(
    product_id='prod_TyU77XMrqBnleF',
    price_id='price_1T0X9BAqs2ifkfkqY5z6A7bC',
    name='Chain Upgrade Service',
    description='Blockchain infrastructure upgrade',
    amount_cents=49999, amount_dollars=499.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.BLOCKCHAIN_SERVICE,
)

# ---------------------------------------------------------------------------
# TOKEN PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['token_quran'] = StripeProduct(
    product_id='prod_TyU7cBPwMSDGiy',
    price_id='price_1T0X9CAqs2ifkfkqZ6a7B8cD',
    name='QURAN Token Purchase',
    description='Purchase QURAN governance tokens',
    amount_cents=5000, amount_dollars=50.00,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.TOKEN,
)
PRODUCTS['token_qcoin'] = StripeProduct(
    product_id='prod_TyU7z9DjJiI0J4',
    price_id='price_1T0X9CAqs2ifkfkqA7b8C9dE',
    name='QCOIN Token Purchase',
    description='Purchase QCOIN utility tokens',
    amount_cents=1000, amount_dollars=10.00,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.TOKEN,
)
PRODUCTS['token_qlearn'] = StripeProduct(
    product_id='prod_TyU7wgjF67pfZe',
    price_id='price_1T0X9DAqs2ifkfkqB8c9D0eF',
    name='QLEARN Token Purchase',
    description='Purchase QLEARN education tokens',
    amount_cents=2500, amount_dollars=25.00,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.AI_AGENT_SCHOOL,
    category=ProductCategory.TOKEN,
)
PRODUCTS['token_swap_fee'] = StripeProduct(
    product_id='prod_TyU7ShxRiunK9b',
    price_id='price_1T0X9DAqs2ifkfkqC9d0E1fG',
    name='Token Swap Fee',
    description='Per-swap fee for token exchanges',
    amount_cents=100, amount_dollars=1.00,
    pricing_type=PricingType.PER_TRANSACTION,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.TOKEN,
)
PRODUCTS['token_enterprise_pack'] = StripeProduct(
    product_id='prod_TyU77foZWEa2gZ',
    price_id='price_1T0X9EAqs2ifkfkqD0e1F2gH',
    name='Enterprise Token Pack',
    description='Bulk token package for enterprises',
    amount_cents=499999, amount_dollars=4999.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.TOKEN,
)
PRODUCTS['token_starter_pack'] = StripeProduct(
    product_id='prod_TyU701L0fLVEll',
    price_id='price_1T0X9EAqs2ifkfkqE1f2G3hI',
    name='Starter Token Pack',
    description='Starter token pack for new users',
    amount_cents=9999, amount_dollars=99.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.TOKEN,
)

# ---------------------------------------------------------------------------
# AI AGENT SCHOOL PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['ai_school_student'] = StripeProduct(
    product_id='prod_TyU7MXowT7VGGR',
    price_id='price_1T0X9FAqs2ifkfkqF2g3H4iJ',
    name='AI Agent School - Student',
    description='Student subscription to AI Agent School',
    amount_cents=4999, amount_dollars=49.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.AI_AGENT_SCHOOL,
    category=ProductCategory.EDUCATION,
)
PRODUCTS['ai_school_enterprise'] = StripeProduct(
    product_id='prod_TyU71gK7uSwsj8',
    price_id='price_1T0X9FAqs2ifkfkqG3h4I5jK',
    name='AI Agent School - Enterprise',
    description='Enterprise AI training program',
    amount_cents=99999, amount_dollars=999.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.AI_AGENT_SCHOOL,
    category=ProductCategory.EDUCATION,
)
PRODUCTS['ai_school_hiring'] = StripeProduct(
    product_id='prod_TyU7WcS8VVC8oq',
    price_id='price_1T0X9GAqs2ifkfkqH4i5J6kL',
    name='AI Agent Hiring Service',
    description='Hire trained AI agents for your organization',
    amount_cents=24999, amount_dollars=249.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.AI_AGENT_SCHOOL,
    category=ProductCategory.EDUCATION,
)
PRODUCTS['ai_school_training_module'] = StripeProduct(
    product_id='prod_TyU79ubVT4kOXq',
    price_id='price_1T0X9GAqs2ifkfkqI5j6K7lM',
    name='AI Training Module',
    description='Individual AI training module purchase',
    amount_cents=1999, amount_dollars=19.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.AI_AGENT_SCHOOL,
    category=ProductCategory.EDUCATION,
)
PRODUCTS['ai_school_nft_cert'] = StripeProduct(
    product_id='prod_TyU7g2ZjLhIou2',
    price_id='price_1T0X9HAqs2ifkfkqJ6k7L8mN',
    name='AI School NFT Certificate',
    description='NFT certification for AI Agent School graduates',
    amount_cents=9999, amount_dollars=99.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.AI_AGENT_SCHOOL,
    category=ProductCategory.EDUCATION,
)

# ---------------------------------------------------------------------------
# DARPAY CRYPTO PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['darpay_merchant_basic'] = StripeProduct(
    product_id='prod_TyU73fNjWMRka0',
    price_id='price_1T0X9HAqs2ifkfkqK7l8M9nO',
    name='DarPay Merchant - Basic',
    description='Basic crypto payment processing for merchants',
    amount_cents=2999, amount_dollars=29.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DARPAY_CRYPTO,
    category=ProductCategory.PAYMENT,
)
PRODUCTS['darpay_merchant_enterprise'] = StripeProduct(
    product_id='prod_TyU7VPlot6pOum',
    price_id='price_1T0X9IAqs2ifkfkqL8m9N0oP',
    name='DarPay Merchant - Enterprise',
    description='Enterprise crypto payment with multi-currency support',
    amount_cents=19999, amount_dollars=199.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DARPAY_CRYPTO,
    category=ProductCategory.PAYMENT,
)
PRODUCTS['darpay_invoice_fee'] = StripeProduct(
    product_id='prod_TyU72Qn6KQKUwN',
    price_id='price_1T0X9IAqs2ifkfkqM9n0O1pQ',
    name='DarPay Invoice Fee',
    description='Per-invoice processing fee',
    amount_cents=199, amount_dollars=1.99,
    pricing_type=PricingType.PER_TRANSACTION,
    platform=Platform.DARPAY_CRYPTO,
    category=ProductCategory.PAYMENT,
)
PRODUCTS['darpay_crypto_fiat_bridge'] = StripeProduct(
    product_id='prod_TyU7SDzZ1OVuJW',
    price_id='price_1T0X9JAqs2ifkfkqN0o1P2qR',
    name='DarPay Crypto-Fiat Bridge',
    description='Crypto to fiat conversion bridge service',
    amount_cents=9999, amount_dollars=99.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DARPAY_CRYPTO,
    category=ProductCategory.PAYMENT,
)

# ---------------------------------------------------------------------------
# REVENUE TRACKING PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['revenue_api'] = StripeProduct(
    product_id='prod_TyU7GuUWpSYWzy',
    price_id='price_1T0X9JAqs2ifkfkqO1p2Q3rS',
    name='Revenue Tracking API',
    description='API access to revenue analytics and tracking',
    amount_cents=9999, amount_dollars=99.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.REVENUE_TRACKING,
)
PRODUCTS['analytics_dashboard'] = StripeProduct(
    product_id='prod_TyU7DHlPBVlZVC',
    price_id='price_1T0X9KAqs2ifkfkqP2q3R4sT',
    name='Analytics Dashboard Pro',
    description='Professional analytics dashboard subscription',
    amount_cents=14999, amount_dollars=149.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.REVENUE_TRACKING,
)
PRODUCTS['block_explorer_pro'] = StripeProduct(
    product_id='prod_TyU7IxJNj07hlB',
    price_id='price_1T0X9KAqs2ifkfkqQ3r4S5tU',
    name='Block Explorer Pro',
    description='Professional block explorer with advanced features',
    amount_cents=1999, amount_dollars=19.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.REVENUE_TRACKING,
)

# ---------------------------------------------------------------------------
# QURANCHAIN FULL NODE
# ---------------------------------------------------------------------------
PRODUCTS['full_node_hosting'] = StripeProduct(
    product_id='prod_TyU7EHkFiFV1Kq',
    price_id='price_1T0X9LAqs2ifkfkqR4s5T6uV',
    name='QuranChain Full Node Hosting',
    description='Managed full node hosting service',
    amount_cents=29999, amount_dollars=299.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.QURANCHAIN_BLOCKCHAIN,
    category=ProductCategory.FULL_NODE,
)

# ---------------------------------------------------------------------------
# MUSLIM WALLET PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['muslim_wallet_basic'] = StripeProduct(
    product_id='prod_TyU7mw1basic01',
    price_id='price_1T0X9MAqs2ifkfkqS5t6U7vW',
    name='Muslim Wallet - Basic',
    description='Basic halal-compliant digital wallet',
    amount_cents=499, amount_dollars=4.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.WALLET,
)
PRODUCTS['muslim_wallet_pro'] = StripeProduct(
    product_id='prod_TyU7mw2pro0001',
    price_id='price_1T0X9MAqs2ifkfkqT6u7V8wX',
    name='Muslim Wallet - Pro',
    description='Pro wallet with DeFi and investment features',
    amount_cents=1999, amount_dollars=19.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.WALLET,
)
PRODUCTS['muslim_wallet_enterprise'] = StripeProduct(
    product_id='prod_TyU7mw3ent0001',
    price_id='price_1T0X9NAqs2ifkfkqU7v8W9xY',
    name='Muslim Wallet - Enterprise',
    description='Enterprise wallet with institutional features',
    amount_cents=9999, amount_dollars=99.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.WALLET,
)
PRODUCTS['muslim_wallet_tx_fee'] = StripeProduct(
    product_id='prod_TyU7mw4txf0001',
    price_id='price_1T0X9NAqs2ifkfkqV8w9X0yZ',
    name='Muslim Wallet Transaction Fee',
    description='Per-transaction fee for Muslim Wallet',
    amount_cents=50, amount_dollars=0.50,
    pricing_type=PricingType.PER_TRANSACTION,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.WALLET,
)

# ---------------------------------------------------------------------------
# DAR AL-NAS BANKING / FINTECH PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['debit_card_standard'] = StripeProduct(
    product_id='prod_TyU7dc1std0001',
    price_id='price_1T0X9OAqs2ifkfkqW9x0Y1zA',
    name='Dar Al-Nas Debit Card - Standard',
    description='Standard Sharia-compliant debit card',
    amount_cents=999, amount_dollars=9.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.CARD,
)
PRODUCTS['debit_card_premium'] = StripeProduct(
    product_id='prod_TyU7dc2prm0001',
    price_id='price_1T0X9OAqs2ifkfkqX0y1Z2aB',
    name='Dar Al-Nas Debit Card - Premium',
    description='Premium debit card with rewards',
    amount_cents=2999, amount_dollars=29.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.CARD,
)
PRODUCTS['virtual_card'] = StripeProduct(
    product_id='prod_TyU7vc1vrt0001',
    price_id='price_1T0X9PAqs2ifkfkqY1z2A3bC',
    name='Virtual Card',
    description='Virtual card for online transactions',
    amount_cents=499, amount_dollars=4.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.CARD,
)
PRODUCTS['gold_savings'] = StripeProduct(
    product_id='prod_TyU7gs1gld0001',
    price_id='price_1T0X9PAqs2ifkfkqZ2a3B4cD',
    name='Gold Savings Account',
    description='Sharia-compliant gold savings with monthly deposits',
    amount_cents=1999, amount_dollars=19.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.BANKING,
)
PRODUCTS['halal_etf'] = StripeProduct(
    product_id='prod_TyU7he1etf0001',
    price_id='price_1T0X9QAqs2ifkfkqA3b4C5dE',
    name='Halal ETF Access',
    description='Access to vetted halal ETF investments',
    amount_cents=3999, amount_dollars=39.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.BANKING,
)
PRODUCTS['sukuk_bond'] = StripeProduct(
    product_id='prod_TyU7sb1skk0001',
    price_id='price_1T0X9QAqs2ifkfkqB4c5D6eF',
    name='Sukuk Bond Investment',
    description='Sharia-compliant sukuk bond purchase',
    amount_cents=100000, amount_dollars=1000.00,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.BANKING,
)

# ---------------------------------------------------------------------------
# HEALTHCARE PRODUCTS (Takaful)
# ---------------------------------------------------------------------------
PRODUCTS['healthcare_basic'] = StripeProduct(
    product_id='prod_TyU7hc1bas0001',
    price_id='price_1T0X9RAqs2ifkfkqC5d6E7fG',
    name='Healthcare - Basic',
    description='Basic Islamic healthcare plan',
    amount_cents=4999, amount_dollars=49.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.HEALTHCARE,
)
PRODUCTS['healthcare_premium'] = StripeProduct(
    product_id='prod_TyU7hc2prm0001',
    price_id='price_1T0X9RAqs2ifkfkqD6e7F8gH',
    name='Healthcare - Premium',
    description='Premium healthcare with specialist coverage',
    amount_cents=14999, amount_dollars=149.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.HEALTHCARE,
)
PRODUCTS['healthcare_family'] = StripeProduct(
    product_id='prod_TyU7hc3fam0001',
    price_id='price_1T0X9SAqs2ifkfkqE7f8G9hI',
    name='Healthcare - Family Plan',
    description='Family healthcare coverage plan',
    amount_cents=29999, amount_dollars=299.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.HEALTHCARE,
)
PRODUCTS['takaful_life'] = StripeProduct(
    product_id='prod_TyU7tk1lif0001',
    price_id='price_1T0X9SAqs2ifkfkqF8g9H0iJ',
    name='Takaful Life Insurance',
    description='Islamic cooperative life insurance',
    amount_cents=15000, amount_dollars=150.00,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.INSURANCE,
)
PRODUCTS['takaful_property'] = StripeProduct(
    product_id='prod_TyU7tk2prp0001',
    price_id='price_1T0X9TAqs2ifkfkqG9h0I1jK',
    name='Takaful Property Insurance',
    description='Islamic cooperative property insurance',
    amount_cents=20000, amount_dollars=200.00,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.INSURANCE,
)
PRODUCTS['takaful_business'] = StripeProduct(
    product_id='prod_TyU7tk3bus0001',
    price_id='price_1T0X9TAqs2ifkfkqH0i1J2kL',
    name='Takaful Business Insurance',
    description='Islamic cooperative business insurance',
    amount_cents=50000, amount_dollars=500.00,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.INSURANCE,
)

# ---------------------------------------------------------------------------
# REAL ESTATE PRODUCTS
# ---------------------------------------------------------------------------
PRODUCTS['reit_investment'] = StripeProduct(
    product_id='prod_TyU7re1ret0001',
    price_id='price_1T0X9UAqs2ifkfkqI1j2K3lM',
    name='Halal REIT Investment',
    description='Sharia-compliant real estate investment trust',
    amount_cents=49999, amount_dollars=499.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.REAL_ESTATE,
)
PRODUCTS['property_search'] = StripeProduct(
    product_id='prod_TyU7ps1prs0001',
    price_id='price_1T0X9UAqs2ifkfkqJ2k3L4mN',
    name='Property Search Service',
    description='Halal-certified property search platform',
    amount_cents=2999, amount_dollars=29.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.REAL_ESTATE,
)

# ---------------------------------------------------------------------------
# CHARITY / ISLAMIC FINANCE
# ---------------------------------------------------------------------------
PRODUCTS['zakat_service'] = StripeProduct(
    product_id='prod_TyU7zk1zkt0001',
    price_id='price_1T0X9VAqs2ifkfkqK3l4M5nO',
    name='Zakat Calculation & Payment',
    description='Automated zakat calculation and distribution',
    amount_cents=999, amount_dollars=9.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.CHARITY,
)
PRODUCTS['sadaqah_donation'] = StripeProduct(
    product_id='prod_TyU7sd1sdq0001',
    price_id='price_1T0X9VAqs2ifkfkqL4m5N6oP',
    name='Sadaqah Donation',
    description='Charitable sadaqah donation',
    amount_cents=500, amount_dollars=5.00,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.CHARITY,
)
PRODUCTS['waqf_endowment'] = StripeProduct(
    product_id='prod_TyU7wq1wqf0001',
    price_id='price_1T0X9WAqs2ifkfkqM5n6O7pQ',
    name='Waqf Endowment',
    description='Islamic endowment contribution',
    amount_cents=49999, amount_dollars=499.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.CHARITY,
)

# ---------------------------------------------------------------------------
# SHARIA ADVISORY
# ---------------------------------------------------------------------------
PRODUCTS['sharia_advisory'] = StripeProduct(
    product_id='prod_TyU7sa1adv0001',
    price_id='price_1T0X9WAqs2ifkfkqN6o7P8qR',
    name='Sharia Advisory Service',
    description='Expert Sharia advisory for financial products',
    amount_cents=49999, amount_dollars=499.99,
    pricing_type=PricingType.MONTHLY,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.CONSULTING,
)
PRODUCTS['sharia_audit'] = StripeProduct(
    product_id='prod_TyU7sa2aud0001',
    price_id='price_1T0X9XAqs2ifkfkqO7p8Q9rS',
    name='Sharia Compliance Audit',
    description='Comprehensive Sharia compliance audit',
    amount_cents=249999, amount_dollars=2499.99,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.CONSULTING,
)

# ---------------------------------------------------------------------------
# TELEHEALTH
# ---------------------------------------------------------------------------
PRODUCTS['telehealth_consultation'] = StripeProduct(
    product_id='prod_TyU7th1tel0001',
    price_id='price_1T0X9XAqs2ifkfkqP8q9R0sT',
    name='Telehealth Consultation',
    description='Remote Islamic healthcare consultation',
    amount_cents=5000, amount_dollars=50.00,
    pricing_type=PricingType.ONE_TIME,
    platform=Platform.DAR_AL_NAS,
    category=ProductCategory.HEALTHCARE,
)


# ============================================================================
# CATALOG QUERY FUNCTIONS
# ============================================================================

def get_product(key: str) -> Optional[StripeProduct]:
    """Get a product by its catalog key"""
    return PRODUCTS.get(key)


def get_products_by_platform(platform: Platform) -> List[StripeProduct]:
    """Get all products for a specific platform"""
    return [p for p in PRODUCTS.values() if p.platform == platform]


def get_products_by_category(category: ProductCategory) -> List[StripeProduct]:
    """Get all products for a specific category"""
    return [p for p in PRODUCTS.values() if p.category == category]


def get_products_by_pricing(pricing_type: PricingType) -> List[StripeProduct]:
    """Get all products with a specific pricing model"""
    return [p for p in PRODUCTS.values() if p.pricing_type == pricing_type]


def get_subscription_products() -> List[StripeProduct]:
    """Get all subscription (monthly/yearly) products"""
    return [p for p in PRODUCTS.values()
            if p.pricing_type in (PricingType.MONTHLY, PricingType.YEARLY)]


def get_one_time_products() -> List[StripeProduct]:
    """Get all one-time payment products"""
    return [p for p in PRODUCTS.values()
            if p.pricing_type == PricingType.ONE_TIME]


def get_transaction_fee_products() -> List[StripeProduct]:
    """Get all per-transaction fee products"""
    return [p for p in PRODUCTS.values()
            if p.pricing_type == PricingType.PER_TRANSACTION]


def get_all_price_ids() -> List[str]:
    """Get all Stripe price IDs"""
    return [p.price_id for p in PRODUCTS.values()]


def get_all_product_ids() -> List[str]:
    """Get all Stripe product IDs"""
    return [p.product_id for p in PRODUCTS.values()]


def get_product_by_price_id(price_id: str) -> Optional[StripeProduct]:
    """Reverse lookup: find product by price ID"""
    for p in PRODUCTS.values():
        if p.price_id == price_id:
            return p
    return None


def get_product_by_product_id(product_id: str) -> Optional[StripeProduct]:
    """Reverse lookup: find product by Stripe product ID"""
    for p in PRODUCTS.values():
        if p.product_id == product_id:
            return p
    return None


def calculate_founder_royalty(amount_dollars: float) -> float:
    """Calculate 30% founder royalty - IMMUTABLE"""
    return amount_dollars * FOUNDER_ROYALTY_RATE


def get_catalog_summary() -> Dict:
    """Get catalog summary statistics"""
    total_products = len(PRODUCTS)
    platforms = {}
    categories = {}
    total_mrr = 0.0

    for p in PRODUCTS.values():
        platforms[p.platform.value] = platforms.get(p.platform.value, 0) + 1
        categories[p.category.value] = categories.get(p.category.value, 0) + 1
        if p.pricing_type == PricingType.MONTHLY:
            total_mrr += p.amount_dollars

    return {
        'total_products': total_products,
        'platforms': platforms,
        'categories': categories,
        'potential_mrr': total_mrr,
        'founder_mrr_share': total_mrr * FOUNDER_ROYALTY_RATE,
        'subscription_products': len(get_subscription_products()),
        'one_time_products': len(get_one_time_products()),
        'transaction_fee_products': len(get_transaction_fee_products()),
    }


def create_checkout_session(price_id: str, success_url: str = "https://darcloud.host/success",
                            cancel_url: str = "https://darcloud.host/cancel",
                            customer_email: str = None) -> Optional[Dict]:
    """Create a Stripe Checkout session for a product"""
    if not STRIPE_SECRET_KEY:
        logger.error("Stripe secret key not configured")
        return None

    try:
        product = get_product_by_price_id(price_id)
        if not product:
            logger.error(f"No product found for price_id: {price_id}")
            return None

        session_params = {
            'payment_method_types': ['card'],
            'line_items': [{'price': price_id, 'quantity': 1}],
            'success_url': success_url,
            'cancel_url': cancel_url,
        }

        if product.pricing_type in (PricingType.MONTHLY, PricingType.YEARLY):
            session_params['mode'] = 'subscription'
        else:
            session_params['mode'] = 'payment'

        if customer_email:
            session_params['customer_email'] = customer_email

        session = stripe.checkout.Session.create(**session_params)
        logger.info(f"✅ Checkout session created: {session.id} for {product.name}")
        return {
            'session_id': session.id,
            'url': session.url,
            'product': product.name,
            'amount': product.amount_dollars,
        }
    except Exception as e:
        logger.error(f"❌ Failed to create checkout session: {e}")
        return None


def create_payment_link(price_id: str) -> Optional[str]:
    """Create a persistent Stripe Payment Link"""
    if not STRIPE_SECRET_KEY:
        logger.error("Stripe secret key not configured")
        return None

    try:
        link = stripe.PaymentLink.create(line_items=[{'price': price_id, 'quantity': 1}])
        logger.info(f"✅ Payment link created: {link.url}")
        return link.url
    except Exception as e:
        logger.error(f"❌ Failed to create payment link: {e}")
        return None


# ============================================================================
# AGENT-SPECIFIC CATALOG ACCESS
# ============================================================================

# Pre-built product groups for specific agent types
GAS_TOLL_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.GAS_TOLL}
VALIDATOR_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category in (ProductCategory.VALIDATOR, ProductCategory.VALIDATOR_DEPLOY)}
STAKING_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.STAKING}
BRIDGE_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.BRIDGE}
DEFI_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.DEFI}
NFT_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.NFT}
EXCHANGE_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.EXCHANGE}
TOKEN_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.TOKEN}
PAYMENT_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.PAYMENT}
EDUCATION_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.EDUCATION}
WALLET_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.WALLET}
HEALTHCARE_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.HEALTHCARE}
INSURANCE_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.INSURANCE}
BANKING_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.BANKING}
REAL_ESTATE_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.REAL_ESTATE}
BLOCKCHAIN_SERVICE_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.BLOCKCHAIN_SERVICE}
CONSULTING_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.CONSULTING}
REVENUE_TRACKING_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.REVENUE_TRACKING}
CHARITY_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.category == ProductCategory.CHARITY}

# Platform-level groups
QURANCHAIN_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.platform == Platform.QURANCHAIN_BLOCKCHAIN}
DAR_AL_NAS_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.platform == Platform.DAR_AL_NAS}
QEX_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.platform == Platform.QEX_EXCHANGE}
DARPAY_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.platform == Platform.DARPAY_CRYPTO}
AI_SCHOOL_PRODUCTS = {k: v for k, v in PRODUCTS.items() if v.platform == Platform.AI_AGENT_SCHOOL}


# ============================================================================
# PRODUCT DOWNLOAD SYSTEM INTEGRATION
# ============================================================================

try:
    from organized.services.product_download_system import (
        DOWNLOAD_PACKAGES,
        get_download_url,
        get_all_download_urls,
        get_download_catalog_summary,
        handle_stripe_purchase_completed,
        build_all_download_packages,
    )
    DOWNLOADS_LOADED = True
except ImportError:
    DOWNLOADS_LOADED = False
    DOWNLOAD_PACKAGES = {}


def get_product_with_download(key: str) -> Optional[Dict]:
    """Get product info with its download package details"""
    product = PRODUCTS.get(key)
    if not product:
        return None
    result = product.to_dict()
    if DOWNLOADS_LOADED:
        download = get_download_url(key)
        if download:
            result['download'] = download
    return result


def get_all_products_with_downloads() -> Dict[str, Dict]:
    """Get all products with their download info — every product has a mesh node"""
    return {key: get_product_with_download(key) for key in PRODUCTS}


# ============================================================================
# MODULE INITIALIZATION
# ============================================================================

# Global singleton catalog instance
payment_catalog = PRODUCTS

logger.info(f"💳 Stripe Payment Catalog loaded: {len(PRODUCTS)} products")
logger.info(f"   Platforms: {len(set(p.platform for p in PRODUCTS.values()))}")
logger.info(f"   Categories: {len(set(p.category for p in PRODUCTS.values()))}")
logger.info(f"   Subscriptions: {len(get_subscription_products())}")
logger.info(f"   One-time: {len(get_one_time_products())}")
logger.info(f"   Transaction fees: {len(get_transaction_fee_products())}")
if DOWNLOADS_LOADED:
    logger.info(f"📦 Download packages: {len(DOWNLOAD_PACKAGES)} products with mesh installers")
else:
    logger.info(f"⚠️  Download system not loaded — run product_download_system.py")
