from __future__ import annotations

import hashlib
import json
import time


class Cache:
    """Simple in-memory cache with TTL expiration."""

    def __init__(self, ttl_seconds: int = 3600):
        self._store: dict[str, tuple[float, dict]] = {}
        self._ttl = ttl_seconds

    def compute_key(self, prefix: str, data: dict) -> str:
        serialized = json.dumps(data, sort_keys=True, default=str)
        digest = hashlib.sha256(serialized.encode()).hexdigest()[:16]
        return f"{prefix}:{digest}"

    def get(self, key: str) -> dict | None:
        if key in self._store:
            timestamp, value = self._store[key]
            if time.time() - timestamp < self._ttl:
                return value
            del self._store[key]
        return None

    def set(self, key: str, value: dict) -> None:
        self._store[key] = (time.time(), value)

    def clear(self) -> None:
        self._store.clear()
