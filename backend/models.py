from datetime import datetime
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship

# ==========================================
# 1. Database SQLModel Schemas
# ==========================================

class VIPCustomer(SQLModel, table=True):
    __tablename__ = "vip_customer"
    
    customer_id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    age: int
    risk_level: str  # 예: "LOW", "MEDIUM", "HIGH"
    phone: str

    logs: List["AssessmentLog"] = Relationship(back_populates="customer")


class AssessmentLog(SQLModel, table=True):
    __tablename__ = "assessment_log"
    
    log_id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="vip_customer.customer_id", index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    duration_sec: float = Field(default=0.0)
    avg_response_delay: float = Field(default=0.0)
    unique_word_ratio: float = Field(default=0.0)
    masked_transcript: str
    status: str  # 예: "NORMAL", "ALERT", "EMERGENCY"

    customer: Optional[VIPCustomer] = Relationship(back_populates="logs")


# ==========================================
# 2. API DTO / Pydantic Schemas
# ==========================================

class AnalyzeRequest(SQLModel):
    customer_id: int
    message: str
    turn_count: int = 1
    latency_seconds: float = 0.0
    history: Optional[List[str]] = None


class AnalyzeResponse(SQLModel):
    customer_id: int
    masked_message: str
    turn_count: int
    avg_response_delay: float
    unique_word_ratio: float
    risk_score: float
    emergency_flag: bool
    status: str


class VIPCustomerRead(SQLModel):
    customer_id: int
    name: str
    age: int
    risk_level: str
    phone: str


class AssessmentLogRead(SQLModel):
    log_id: int
    customer_id: int
    timestamp: datetime
    duration_sec: float
    avg_response_delay: float
    unique_word_ratio: float
    masked_transcript: str
    status: str


class ReportResponse(SQLModel):
    customer_id: int
    name: str
    age: int
    phone: str
    current_risk_level: str
    total_assessments: int
    latest_risk_score: float
    avg_response_delay: float
    avg_unique_word_ratio: float
    emergency_count: int
    recommendation: str
    logs: List[AssessmentLogRead]
    topic_coherence: Optional[int] = 85
    vocabulary_clarity: Optional[int] = 90
    short_term_memory: Optional[int] = 88
    response_speed: Optional[int] = 82

