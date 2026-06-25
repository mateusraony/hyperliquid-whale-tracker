from pydantic import BaseModel
from typing import Optional


class AddWhaleRequest(BaseModel):
    address: str
    nickname: Optional[str] = None


class TelegramConfigRequest(BaseModel):
    token: Optional[str] = None
    chat_id: Optional[str] = None
    enabled: Optional[bool] = None
