"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
QuranChain Pay™ - Security Module
© QuranChain™ | Omar Mohammad Abunadi™

API key management, rate limiting, and authentication.
"""

import hashlib
import secrets
import time
import logging
from typing import Dict, Optional, Tuple
from datetime import datetime
from collections import defaultdict

logger = logging.getLogger(__name__)

# API Key prefix
API_KEY_PREFIX = "qcp_live_"


class APIKeyManager:
    """
    API Key generation and validation.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    
    @staticmethod
    def generate_api_key() -> Tuple[str, str, str]:
        """
        Generate new API key.
        Returns: (full_key, key_hash, key_prefix)
        """
        key_body = secrets.token_hex(32)
        full_key = f"{API_KEY_PREFIX}{key_body}"
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()
        key_prefix = full_key[:12]
        
        return full_key, key_hash, key_prefix
    
    @staticmethod
    def hash_api_key(api_key: str) -> str:
        """Hash an API key for storage/comparison."""
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    @staticmethod
    def validate_format(api_key: str) -> bool:
        """Validate API key format."""
        if not api_key:
            return False
        if not api_key.startswith(API_KEY_PREFIX):
            return False
        if len(api_key) != len(API_KEY_PREFIX) + 64:
            return False
        return True


class RateLimiter:
    """
    In-memory rate limiter.
    © QuranChain™ | Omar Mohammad Abunadi™
    
    For production, use Redis for distributed rate limiting.
    """
    
    def __init__(
        self,
        requests_per_window: int = 100,
        window_seconds: int = 60,
    ):
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds
        self._requests: Dict[str, list] = defaultdict(list)
    
    def is_allowed(self, identifier: str) -> Tuple[bool, Dict]:
        """
        Check if request is allowed.
        Returns: (allowed, rate_limit_info)
        """
        now = time.time()
        window_start = now - self.window_seconds
        
        # Clean old entries
        self._requests[identifier] = [
            ts for ts in self._requests[identifier]
            if ts > window_start
        ]
        
        current_count = len(self._requests[identifier])
        
        info = {
            "limit": self.requests_per_window,
            "remaining": max(0, self.requests_per_window - current_count),
            "reset": int(window_start + self.window_seconds),
        }
        
        if current_count >= self.requests_per_window:
            return False, info
        
        self._requests[identifier].append(now)
        info["remaining"] -= 1
        
        return True, info
    
    def get_headers(self, identifier: str) -> Dict[str, str]:
        """Get rate limit headers for response."""
        _, info = self.is_allowed(identifier)
        # Undo the increment from is_allowed
        if info["remaining"] < self.requests_per_window:
            self._requests[identifier].pop()
            info["remaining"] += 1
        
        return {
            "X-RateLimit-Limit": str(info["limit"]),
            "X-RateLimit-Remaining": str(info["remaining"]),
            "X-RateLimit-Reset": str(info["reset"]),
        }


class ReplayProtection:
    """
    Idempotency and replay protection.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    
    def __init__(self, ttl_seconds: int = 3600):
        self.ttl_seconds = ttl_seconds
        self._seen: Dict[str, Tuple[float, str]] = {}
    
    def check_and_record(
        self,
        idempotency_key: str,
        merchant_id: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if request is a replay.
        Returns: (is_new, existing_response_id)
        """
        now = time.time()
        
        # Clean expired entries
        expired = [
            k for k, (ts, _) in self._seen.items()
            if now - ts > self.ttl_seconds
        ]
        for k in expired:
            del self._seen[k]
        
        key = f"{merchant_id}:{idempotency_key}"
        
        if key in self._seen:
            _, response_id = self._seen[key]
            return False, response_id
        
        return True, None
    
    def record(
        self,
        idempotency_key: str,
        merchant_id: str,
        response_id: str,
    ):
        """Record a processed request."""
        key = f"{merchant_id}:{idempotency_key}"
        self._seen[key] = (time.time(), response_id)


# Singleton instances
rate_limiter = RateLimiter()
replay_protection = ReplayProtection()
