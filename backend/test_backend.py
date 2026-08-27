import asyncio
import sys
from fastapi.testclient import TestClient

from main import app

def test_all_endpoints():
    with TestClient(app) as client:
        print("=== 1. Root Endpoint Test ===")
        res_root = client.get("/")
        assert res_root.status_code == 200
        print("Root Response:", res_root.json())

        print("\n=== 2. GET /api/customers Test ===")
        res_cust = client.get("/api/customers")
        assert res_cust.status_code == 200
        customers = res_cust.json()
        print("Customers:", customers)
        assert len(customers) >= 3

        print("\n=== 3. POST /api/analyze Normal Case Test ===")
        payload_normal = {
            "customer_id": 1,
            "message": "안녕하세요 김순자 고객입니다. 오늘 계좌 관련 문의가 있습니다. 제 번호는 010-3849-2041 입니다.",
            "turn_count": 1,
            "latency_seconds": 1.5,
            "history": []
        }
        res_analyze1 = client.post("/api/analyze", json=payload_normal)
        assert res_analyze1.status_code == 200
        print("Analyze Normal Response:", res_analyze1.json())
        assert "***" in res_analyze1.json()["masked_message"]

        print("\n=== 4. POST /api/analyze Emergency Case Test ===")
        payload_emergency = {
            "customer_id": 1,
            "message": "도와주세요! 지금 보이스피싱 사기 당하고 있는 것 같아요. 비밀번호 잊어버렸어요.",
            "turn_count": 2,
            "latency_seconds": 5.2,
            "history": ["안녕하세요"]
        }
        res_analyze2 = client.post("/api/analyze", json=payload_emergency)
        assert res_analyze2.status_code == 200
        print("Analyze Emergency Response:", res_analyze2.json())
        assert res_analyze2.json()["emergency_flag"] == True
        assert res_analyze2.json()["status"] == "EMERGENCY"

        print("\n=== 5. GET /api/report/1 Test ===")
        res_report = client.get("/api/report/1")
        assert res_report.status_code == 200
        report = res_report.json()
        print("Report Response:", report)
        assert report["customer_id"] == 1
        assert len(report["logs"]) >= 2
        print("\n>>> 모든 백엔드 API 및 LangGraph 워크플로우 검증 성공! <<<")

if __name__ == "__main__":
    test_all_endpoints()

