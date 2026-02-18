from __future__ import annotations

import fnmatch
import inspect
from datetime import datetime, timedelta, timezone

import redis.asyncio as redis

from app.core.config import settings


class InMemoryRedis:
    def __init__(self) -> None:
        self._data: dict[str, str] = {}
        self._ttl: dict[str, datetime] = {}

    def _purge_expired(self, key: str) -> None:
        exp = self._ttl.get(key)
        if exp and datetime.now(timezone.utc) >= exp:
            self._ttl.pop(key, None)
            self._data.pop(key, None)

    async def get(self, key: str):
        self._purge_expired(key)
        return self._data.get(key)

    async def set(self, key: str, value: str):
        self._data[key] = value
        self._ttl.pop(key, None)
        return True

    async def setex(self, key: str, seconds: int, value: str):
        self._data[key] = value
        self._ttl[key] = datetime.now(timezone.utc) + timedelta(seconds=seconds)
        return True

    async def mget(self, keys: list[str]):
        return [await self.get(key) for key in keys]

    async def incr(self, key: str):
        current = await self.get(key)
        value = int(current or "0") + 1
        await self.set(key, str(value))
        return value

    async def expire(self, key: str, seconds: int):
        if key in self._data:
            self._ttl[key] = datetime.now(timezone.utc) + timedelta(seconds=seconds)
        return True

    async def scan_iter(self, match: str = "*"):
        for key in list(self._data.keys()):
            self._purge_expired(key)
            if key in self._data and fnmatch.fnmatch(key, match):
                yield key


redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
fallback_redis = InMemoryRedis()


async def redis_call(method: str, *args, **kwargs):
    try:
        fn = getattr(redis_client, method)
        result = fn(*args, **kwargs)
        if inspect.isawaitable(result):
            return await result
        return result
    except Exception:
        fn = getattr(fallback_redis, method)
        result = fn(*args, **kwargs)
        if inspect.isawaitable(result):
            return await result
        return result
