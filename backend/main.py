import logging
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import init_db, get_async_session
from models import (
    VIPCustomer,
    AssessmentLog,
    AnalyzeRequest,
    AnalyzeResponse,
    VIPCustomerRead,
    ReportResponse,
    AssessmentLogRead
)
from graph import CognitiveRiskGraph, CognitiveRiskState

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mind_anchor.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 구동 시 DB 테이블 생성 및 시드 데이터 셋업
    logger.info("Mind-Anchor 백엔드 초기화 중...")
    await init_db()
    yield
    logger.info("Mind-Anchor 백엔드 종료 중...")


app = FastAPI(
    title="Mind-Anchor API",
    description="고령 VIP 고객 인지 건강 리스크 관제 시스템 백엔드",
    version="1.0.0",
    lifespan=lifespan
)

# Next.js 프론트엔드 연동을 위한 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발용 전체 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "status": "online",
        "system": "Mind-Anchor Senior VIP Cognitive Health Risk Monitoring System",
        "version": "1.0.0",
        "docs_url": "http://localhost:8000/docs "
    }


# ==========================================
# API 1: GET /api/customers
# VIP 고객 3명 정보 조회
# ==========================================
@app.get("/api/customers", response_model=List[VIPCustomerRead], summary="VIP 고객 목록 조회")
async def get_vip_customers(session: AsyncSession = Depends(get_async_session)):
    statement = select(VIPCustomer)
    result = await session.execute(statement)
    customers = result.scalars().all()
    return customers


# ==========================================
# API 2: POST /api/analyze
# 실시간 대화/타임스탬프 데이터 수신 -> LangGraph 실행 -> 분석 결과 반환 및 AssessmentLog 저장
# ==========================================
@app.post("/api/analyze", response_model=AnalyzeResponse, summary="실시간 발화 인지 리스크 분석")
async def analyze_cognitive_risk(
    req: AnalyzeRequest,
    session: AsyncSession = Depends(get_async_session)
):
    # 고객 정보 확인
    statement = select(VIPCustomer).where(VIPCustomer.customer_id == req.customer_id)
    result = await session.execute(statement)
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"고객 ID {req.customer_id}를 찾을 수 없습니다."
        )

    # 히스토리 및 현재 메시지 준비
    history_messages = req.history if req.history else []
    full_messages = history_messages + [req.message]

    # LangGraph Initial State 구성
    initial_state: CognitiveRiskState = {
        "messages": full_messages,
        "turn_count": req.turn_count,
        "latency_records": [req.latency_seconds],
        "masked_transcript": "",
        "unique_word_ratio": 0.0,
        "avg_response_delay": 0.0,
        "risk_score": 0.0,
        "emergency_flag": False
    }

    # LangGraph 워크플로우 동기/비동기 실행
    final_state = CognitiveRiskGraph.invoke(initial_state)

    emergency_flag = final_state.get("emergency_flag", False)
    risk_score = final_state.get("risk_score", 0.0)
    masked_transcript = final_state.get("masked_transcript", "")
    avg_delay = final_state.get("avg_response_delay", 0.0)
    uwr = final_state.get("unique_word_ratio", 0.0)

    # 평가 상태 결정
    if emergency_flag:
        assessment_status = "EMERGENCY"
    elif risk_score >= 50.0:
        assessment_status = "ALERT"
    else:
        assessment_status = "NORMAL"

    # DB에 진단 로그 저장
    log_entry = AssessmentLog(
        customer_id=req.customer_id,
        duration_sec=req.latency_seconds,
        avg_response_delay=avg_delay,
        unique_word_ratio=uwr,
        masked_transcript=masked_transcript,
        status=assessment_status
    )
    session.add(log_entry)

    # 리스크 점수에 따른 고객 상태 업데이트
    if emergency_flag or risk_score >= 70.0:
        customer.risk_level = "HIGH"
    elif risk_score >= 40.0:
        customer.risk_level = "MEDIUM"
    else:
        customer.risk_level = "LOW"

    session.add(customer)
    await session.commit()

    return AnalyzeResponse(
        customer_id=req.customer_id,
        masked_message=masked_transcript,
        turn_count=req.turn_count,
        avg_response_delay=avg_delay,
        unique_word_ratio=uwr,
        risk_score=risk_score,
        emergency_flag=emergency_flag,
        status=assessment_status
    )


# ==========================================
# API 3: GET /api/report/{customer_id}
# 고객별 인지 건강 종합 진단 리포트 반환
# ==========================================
@app.get("/api/report/{customer_id}", response_model=ReportResponse, summary="고객 종합 진단 리포트 조회")
async def get_customer_report(
    customer_id: int,
    session: AsyncSession = Depends(get_async_session)
):
    # 고객 조회
    cust_stmt = select(VIPCustomer).where(VIPCustomer.customer_id == customer_id)
    cust_res = await session.execute(cust_stmt)
    customer = cust_res.scalar_one_or_none()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"고객 ID {customer_id}를 찾을 수 없습니다."
        )

    # 진단 로그 목록 조회
    log_stmt = select(AssessmentLog).where(AssessmentLog.customer_id == customer_id).order_by(AssessmentLog.timestamp.desc())
    log_res = await session.execute(log_stmt)
    logs = log_res.scalars().all()

    total_assessments = len(logs)
    if total_assessments > 0:
        avg_delay = sum(l.avg_response_delay for l in logs) / total_assessments
        avg_uwr = sum(l.unique_word_ratio for l in logs) / total_assessments
        emergency_count = sum(1 for l in logs if l.status == "EMERGENCY")
        
        # 최근 점수 및 4대 인지 지표 실시간 동적 산출
        latest_log = logs[0]
        latest_score = min(100.0, (1.0 - latest_log.unique_word_ratio) * 50.0 + min(latest_log.avg_response_delay * 10.0, 50.0))

        vocab_clarity = int(max(20, min(100, round(avg_uwr * 100))))
        resp_speed = int(max(10, min(100, round(100 - (avg_delay * 8)))))
        topic_coh = int(max(20, min(100, round(100 - (latest_score * 0.45)))))
        short_mem = int(max(20, min(100, round(95 - (latest_score * 0.35)))))
    else:
        avg_delay = 0.0
        avg_uwr = 1.0
        emergency_count = 0
        latest_score = 15.0
        vocab_clarity = 90
        resp_speed = 85
        topic_coh = 88
        short_mem = 90
        latest_log = None

    # 동적 AI 소견 리포트 생성 (실시간 대화 발화 텍스트 포함)
    if latest_log and total_assessments > 0:
        recent_text = latest_log.masked_transcript
        if latest_score >= 60.0 or emergency_count > 0:
            recommendation = f"고위험 인지 장애 감지: 최근 대화 발화('{recent_text}') 시 어휘 밀도 저하 및 탐색 지연이 관찰되었습니다. 대화 주제 유지력({topic_coh}점) 및 어휘 명확성({vocab_clarity}점)이 지속 감소하고 있어 신경언어학적 정밀 진단 및 보호자 통보를 권장합니다."
        elif latest_score >= 35.0:
            recommendation = f"주의 모니터링 필요: 최근 대화 발화('{recent_text}') 시 반응 지연 및 우회적 발화 가능성이 감지되었습니다. (주제 유지력 {topic_coh}점, 반응 속도 {resp_speed}점) 주기적인 인지 안부 관제를 권장합니다."
        else:
            recommendation = f"정상 인지 뇌 건강: 최근 대화 발화('{recent_text}') 분석 결과 동문서답이나 우회적 발화 없이 명확하고 자연스럽게 안부 대화를 나누셨습니다. (주제 유지력 {topic_coh}점, 어휘 명확성 {vocab_clarity}점)"
    else:
        recommendation = "정상 인지 뇌 건강: 아직 분석된 대화 기록이 없거나 안정적인 상태입니다."

    formatted_logs = [
        AssessmentLogRead(
            log_id=l.log_id,
            customer_id=l.customer_id,
            timestamp=l.timestamp,
            duration_sec=l.duration_sec,
            avg_response_delay=l.avg_response_delay,
            unique_word_ratio=l.unique_word_ratio,
            masked_transcript=l.masked_transcript,
            status=l.status
        )
        for l in logs
    ]

    return ReportResponse(
        customer_id=customer.customer_id,
        name=customer.name,
        age=customer.age,
        phone=customer.phone,
        current_risk_level=customer.risk_level,
        total_assessments=total_assessments,
        latest_risk_score=round(latest_score, 2),
        avg_response_delay=round(avg_delay, 2),
        avg_unique_word_ratio=round(avg_uwr, 3),
        emergency_count=emergency_count,
        recommendation=recommendation,
        logs=formatted_logs,
        topic_coherence=topic_coh,
        vocabulary_clarity=vocab_clarity,
        short_term_memory=short_mem,
        response_speed=resp_speed,
    )
