from __future__ import annotations

from pydantic import BaseModel


class UsageResponse(BaseModel):
    plan: str  # 'anon' | 'free' | 'pro'
    jobs_today: int
    jobs_today_limit: int
    jobs_percent: float  # 0..100, for progress bars
    max_upload_bytes: int
