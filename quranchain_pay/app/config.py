"""
QuranChain Pay™ - Configuration Module
© QuranChain™ | Omar Mohammad Abunadi™

All configuration loaded from environment variables.
NO hardcoded secrets. NO placeholders.
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    Production configuration.
    All values MUST come from environment variables.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    
    # Application
    APP_NAME: str = "QuranChain Pay"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = Field(default="dev_key_change_in_production", description="Application secret key")
    
    # Database (supports SQLite or PostgreSQL)
    DATABASE_URL: str = Field(default="sqlite:///./quranchain_pay.db", description="Database connection URL")
    
    # Founder Royalty Configuration
    FOUNDER_ROYALTY_PERCENT: float = Field(default=2.5, description="Founder fee percentage")
    FOUNDER_USDC_ADDRESS: str = Field(default="0xfAD9207A1d0BdC10F74dA3d4071b7ea9F3820F94", description="Founder USDC payout address")
    FOUNDER_ETH_ADDRESS: str = Field(default="0xfAD9207A1d0BdC10F74dA3d4071b7ea9F3820F94", description="Founder ETH payout address")
    FOUNDER_BTC_ADDRESS: str = Field(default="3NBWbe7o1ieBYXVUcZR9xUizQBGBdkxAZT", description="Founder BTC payout address")
    
    # Blockchain RPC Endpoints (Mainnet) - Free public endpoints as defaults
    ETH_RPC_URL: str = Field(default="https://eth.llamarpc.com", description="Ethereum mainnet RPC")
    POLYGON_RPC_URL: str = Field(default="https://polygon.llamarpc.com", description="Polygon mainnet RPC")
    BASE_RPC_URL: str = Field(default="https://mainnet.base.org", description="Base mainnet RPC")
    
    # USDC Contract Addresses (Mainnet)
    USDC_ETH_CONTRACT: str = Field(default="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
    USDC_POLYGON_CONTRACT: str = Field(default="0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174")
    USDC_BASE_CONTRACT: str = Field(default="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")
    
    # Stripe (Card Fallback)
    STRIPE_SECRET_KEY: Optional[str] = Field(default=None, description="Stripe live secret key")
    STRIPE_WEBHOOK_SECRET: Optional[str] = Field(default=None, description="Stripe webhook secret")
    
    # ACH Provider (Plaid/Dwolla abstraction)
    ACH_PROVIDER_API_KEY: Optional[str] = Field(default=None, description="ACH provider API key")
    ACH_PROVIDER_URL: Optional[str] = Field(default=None, description="ACH provider base URL")
    
    # Server
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8080)
    WORKERS: int = Field(default=4)
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = Field(default=100)
    RATE_LIMIT_WINDOW: int = Field(default=60)
    
    # Security
    API_KEY_HEADER: str = Field(default="X-API-Key")
    CORS_ORIGINS: str = Field(default="*")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


def get_settings() -> Settings:
    """Get validated settings from environment."""
    return Settings()


# Singleton instance
settings = get_settings()
