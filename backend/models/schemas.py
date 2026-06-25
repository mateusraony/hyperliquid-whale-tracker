from pydantic import BaseModel
from typing import Optional


class AddWhaleRequest(BaseModel):
    address: str
    nickname: Optional[str] = None
