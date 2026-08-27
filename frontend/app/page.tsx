"use client";

import React, { useState, useEffect } from 'react';
import { CustomerList } from '../components/CustomerList';
import { VapiControlPanel } from '../components/VapiControlPanel';
import { MetricsDashboard } from '../components/MetricsDashboard';
import { ReportModal } from '../components/ReportModal';
import { VIPCustomer, AnalyzeResponse } from '../types';
import { Heart, HeartHandshake, Cpu, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Home() {
  const [customers, setCustomers] = useState<VIPCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<VIPCustomer | null>(null);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [analysisHistory, setAnalysisHistory] = useState<AnalyzeResponse[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalyzeResponse | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCustomerId, setReportCustomerId] = useState<number | null>(null);

  // VIP 어르신 목록 불러오기
  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const res = await fetch('/api/customers');
      if (!res.ok) throw new Error('어르신 목록 조회 실패');
      const data: VIPCustomer[] = await res.json();
      setCustomers(data);
      if (data.length > 0) {
        setSelectedCustomer(data[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error('백엔드 관제 서버와 연결할 수 없습니다. (http://localhost:8000 )');
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // 분석 결과 수신 시 히스토리 및 현재 분석 업데이트
  const handleAnalysisResult = (result: AnalyzeResponse) => {
    setCurrentAnalysis(result);
    setAnalysisHistory((prev) => [...prev, result]);
    
    if (selectedCustomer) {
      const updatedRiskLevel: VIPCustomer['risk_level'] = 
        result.emergency_flag || result.risk_score >= 70 ? 'HIGH' : result.risk_score >= 40 ? 'MEDIUM' : 'LOW';
      
      setCustomers((prev) =>
        prev.map((c) =>
          c.customer_id === selectedCustomer.customer_id
            ? { ...c, risk_level: updatedRiskLevel }
            : c
        )
      );
      setSelectedCustomer((prev) => prev ? { ...prev, risk_level: updatedRiskLevel } : null);
    }
  };

  // 리포트 모달 열기
  const handleOpenReport = (customerId: number) => {
    setReportCustomerId(customerId);
    setReportModalOpen(true);
  };

  return (
    <main className="min-h-screen bg-background text-slate-100 flex flex-col font-sans selection:bg-rose-500">
      {/* 1. 상단 글로벌 네비게이션 헤더 */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white shadow-lg shadow-rose-500/30">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-lg text-slate-100 tracking-tight">
                Mind-Anchor <span className="text-rose-400 font-normal text-xs ml-1">Care System</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                치매 예방 특화 인지 건강 돌봄 솔루션
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              어르신 실시간 안부 대화 & 신경인지 반응 지연 관제 헬스케어 플랫폼
            </p>
          </div>
        </div>

        {/* 상태 관제 뱃지 및 새로고침 */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <Cpu className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="text-slate-300 font-medium">FastAPI + LangGraph 인지 헬스케어 가동중</span>
          </div>

          <button
            onClick={fetchCustomers}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="어르신 목록 새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. 대시보드 3컬럼 메인 본문 */}
      <div className="flex-1 p-6 max-w-[1600px] w-full mx-auto grid grid-cols-12 gap-6">
        {/* Left Column: 안부 돌봄 대상 어르신 카드 목록 (3/12) */}
        <section className="col-span-12 md:col-span-3">
          <CustomerList
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={(c) => {
              setSelectedCustomer(c);
              setAnalysisHistory([]);
              setCurrentAnalysis(null);
            }}
            isLoading={isLoadingCustomers}
          />
        </section>

        {/* Middle Column: Vapi AI 치매 예방 음성 안부 대화 패널 (5/12) */}
        <section className="col-span-12 md:col-span-5">
          <VapiControlPanel
            customer={selectedCustomer}
            onAnalysisResult={handleAnalysisResult}
            onOpenReport={handleOpenReport}
          />
        </section>

        {/* Right Column: 인지 건강 리스크 대시보드 (4/12) */}
        <section className="col-span-12 md:col-span-4">
          <MetricsDashboard
            analysisHistory={analysisHistory}
            currentAnalysis={currentAnalysis}
          />
        </section>
      </div>

      {/* 3. 종합 진단 리포트 팝업 모달 */}
      <ReportModal
        isOpen={reportModalOpen}
        customerId={reportCustomerId}
        onClose={() => setReportModalOpen(false)}
      />
    </main>
  );
}
