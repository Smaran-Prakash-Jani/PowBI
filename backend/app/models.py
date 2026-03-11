from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any


# ── Auth Models ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "analyst"  # analyst | admin


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]


# ── Data Models ──────────────────────────────────────────────
class FilterConfig(BaseModel):
    column: str
    operator: str  # '=', '!=', '>', '<', '>=', '<=', 'IN', 'LIKE'
    value: Any


class StructuredQuery(BaseModel):
    select: List[str]
    where: Optional[List[FilterConfig]] = []
    group_by: Optional[List[str]] = []
    order_by: Optional[str] = None
    order_direction: Optional[str] = "ASC"  # "ASC" or "DESC"
    limit: Optional[int] = 100
    explanation: Optional[str] = "SQL query generated successfully based on user request."


class QueryRequest(BaseModel):
    query: str
    history: Optional[List[Dict[str, str]]] = []


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []


class UploadResponse(BaseModel):
    message: str
    columns: List[str]
    row_count: int
    summary: Dict[str, Any]


class ChartConfig(BaseModel):
    chart_type: str
    x_key: str
    y_key: str
    summary: str
