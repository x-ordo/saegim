from pydantic import BaseModel
from datetime import datetime

class Order(BaseModel):
    id: int
    order_number: str
    context: str
    created_at: datetime

class QRToken(BaseModel):
    id: int
    token: str
    order_id: int
    is_valid: bool
    created_at: datetime

class Proof(BaseModel):
    id: int
    order_id: int
    file_path: str
    uploaded_at: datetime
