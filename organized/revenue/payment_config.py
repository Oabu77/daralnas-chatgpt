# payment_config.py
# © QuranChain™ | Omar Mohammad Abunadi™
# Production Revenue Collection Configuration
# Status: LIVE & EARNING AGGRESSIVELY

PAYMENT_ADDRESSES = {
    "BTC": "3NBWbe7o1ieBYXVUcZR9xUizQBGBdkxAZT",
    "USDC": "0xfAD9207A1d0BdC10F74dA3d4071b7ea9F3820F94",
    "ETH": "0xfAD9207A1d0BdC10F74dA3d4071b7ea9F3820F94"  # Same as USDC
}

FOUNDER_INFO = {
    "name": "Omar Mohammad Abunadi™",
    "authority": "QuranChain™ Sovereign",
    "revenue_share": 0.30,  # 30% immutable
    "status": "ACTIVE"
}

AGGRESSIVE_CONFIG = {
    "gas_toll_multiplier": 2.0,  # 2x AGGRESSIVE
    "priority_level": "CRITICAL",
    "settlement_mode": "REAL_TIME",
    "collection_mode": "CONTINUOUS",
    "target_monthly_revenue": 238500,  # $238,500+ USD
}

def get_address(asset):
    """Get payment address for specific asset"""
    return PAYMENT_ADDRESSES.get(asset.upper())

def get_btc_address():
    """Get Bitcoin address"""
    return PAYMENT_ADDRESSES["BTC"]

def get_eth_address():
    """Get Ethereum address"""
    return PAYMENT_ADDRESSES["ETH"]

def get_usdc_address():
    """Get USDC address"""
    return PAYMENT_ADDRESSES["USDC"]

def get_usdt_address():
    """Get USDT address (same as ETH)"""
    return PAYMENT_ADDRESSES["ETH"]

def validate_addresses():
    """Validate all addresses are configured"""
    required = ["BTC", "ETH", "USDC"]
    for addr_type in required:
        if not PAYMENT_ADDRESSES.get(addr_type):
            return False, f"Missing {addr_type} address"
    return True, "All addresses configured"

# Export for use in revenue collection
__all__ = [
    'PAYMENT_ADDRESSES',
    'FOUNDER_INFO',
    'AGGRESSIVE_CONFIG',
    'get_address',
    'get_btc_address',
    'get_eth_address',
    'get_usdc_address',
    'get_usdt_address',
    'validate_addresses'
]
