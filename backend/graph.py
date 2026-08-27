import re
from typing import List, TypedDict, Annotated
from langgraph.graph import StateGraph, END


# ==========================================
# 1. LangGraph State 정의
# ==========================================

class CognitiveRiskState(TypedDict):
    messages: List[str]
    turn_count: int
    latency_records: List[float]
    masked_transcript: str
    unique_word_ratio: float
    avg_response_delay: float
    risk_score: float
    emergency_flag: bool


# ==========================================
# 2. Nodes 구현
# ==========================================

def masking_node(state: CognitiveRiskState) -> CognitiveRiskState:
    """
    Node 1: 정규식을 통한 개인정보(이름, 전화번호, 금액) 마스킹 처리 (***)
    """
    messages = state.get("messages", [])
    latest_text = messages[-1] if messages else ""

    # 1) 전화번호 마스킹 (010-XXXX-XXXX, 02-XXX-XXXX 등)
    phone_pattern = r"(01[016789]|02|0[3-9][0-9])[-.\s]?(\d{3,4})[-.\s]?(\d{4})"
    masked_text = re.sub(phone_pattern, "***-****-****", latest_text)

    # 2) 금액 마스킹 (예: 500만원, 100,000원, 10억, $500 등)
    money_pattern = r"\b\d{1,3}(,\d{3})*(\s?원|\s?만원|\s?억원|\s?달러|\s?엔)\b|\b\d+(\s?원|\s?만원|\s?억)\b"
    masked_text = re.sub(money_pattern, "***원", masked_text)

    # 3) 성함 마스킹 (김순자, 박종수, 이영희 등 고객명 및 한글 성함 패턴)
    name_patterns = [
        r"(김순자|박종수|이영희)",  # 시드 고객명
        r"([가-힣]{1,2})\s?(고객님|어르신|님|씨|대표님)"
    ]
    for pattern in name_patterns:
        masked_text = re.sub(pattern, "***님", masked_text)

    state["masked_transcript"] = masked_text
    return state


def metrics_node(state: CognitiveRiskState) -> CognitiveRiskState:
    """
    Node 2: 어휘 의미밀도 (Unique Word Ratio) 및 탐색지연(Response Latency) 기반
            인지 건강 리스크 점수 합산 (Random 함수 사용 금지)
    """
    text = state.get("masked_transcript", "")
    latency_records = state.get("latency_records", [0.0])

    # 어휘 분절 (단어 추출)
    words = re.findall(r"\b[가-힣a-zA-Z0-9]+\b", text)
    if words:
        unique_words = set(words)
        unique_word_ratio = len(unique_words) / len(words)
    else:
        unique_word_ratio = 1.0

    # 평균 탐색 지연 시간 (초)
    if latency_records:
        avg_delay = sum(latency_records) / len(latency_records)
    else:
        avg_delay = 0.0

    # 결정론적 (Deterministic) 리스크 점수 산출 로직 (0 ~ 100)
    # 어휘 단순화(낮은 의미밀도) 리스크: 최대 50점
    density_risk = (1.0 - unique_word_ratio) * 50.0
    
    # 반응 지연 리스크: 초당 10점 (최대 50점, 5초 이상시 50점 만점)
    latency_risk = min(avg_delay * 10.0, 50.0)

    total_risk = min(100.0, max(0.0, density_risk + latency_risk))

    state["unique_word_ratio"] = round(unique_word_ratio, 3)
    state["avg_response_delay"] = round(avg_delay, 2)
    state["risk_score"] = round(total_risk, 2)

    return state


def eval_node(state: CognitiveRiskState) -> CognitiveRiskState:
    """
    Node 3: 위급 키워드 / 이상 반응 감지 시 emergency_flag=True 전환
    """
    text = state.get("masked_transcript", "")
    risk_score = state.get("risk_score", 0.0)
    avg_delay = state.get("avg_response_delay", 0.0)

    # 긴급 키워드 목록
    emergency_keywords = [
        "살려줘", "도와줘", "억류", "보이스피싱", "사기", "협박", 
        "비밀번호 잊", "계좌 이체", "기억이 안나", "긴급", "신고", "112", "119"
    ]

    emergency = False
    for kw in emergency_keywords:
        if kw in text:
            emergency = True
            break

    # 고위험 리스크 점수 (80점 이상) 또는 과도한 반응 지연 (12초 이상) 시 긴급 전환
    if risk_score >= 80.0 or avg_delay >= 12.0:
        emergency = True

    state["emergency_flag"] = emergency
    return state


# ==========================================
# 3. LangGraph 워크플로우 구성 및 컴파일
# ==========================================

workflow = StateGraph(CognitiveRiskState)

# 노드 추가
workflow.add_node("masking_node", masking_node)
workflow.add_node("metrics_node", metrics_node)
workflow.add_node("eval_node", eval_node)

# 에지 추가
workflow.set_entry_point("masking_node")
workflow.add_edge("masking_node", "metrics_node")
workflow.add_edge("metrics_node", "eval_node")
workflow.add_edge("eval_node", END)

# 그래프 컴파일
CognitiveRiskGraph = workflow.compile()
