"use client";

import React, { useState } from 'react';
import { User, Phone, AlertTriangle, ShieldCheck, ShieldAlert, Heart, Search, Siren, PhoneCall, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { VIPCustomer } from '../types';

interface CustomerListProps {
  customers: VIPCustomer[];
  selectedCustomer: VIPCustomer | null;
  onSelectCustomer: (customer: VIPCustomer) => void;
  isLoading: boolean;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyType, setEmergencyType] = useState<'119' | 'GUARDIAN' | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-400" />
          안부 돌봄 대상 어르신
        </h2>
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl glass-panel animate-pulse space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 bg-slate-700/60 rounded"></div>
              <div className="h-6 w-16 bg-slate-700/60 rounded-full"></div>
            </div>
            <div className="h-4 w-32 bg-slate-700/40 rounded"></div>
            <div className="h-4 w-28 bg-slate-700/40 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // 필터링 적용
  const filteredCustomers = customers.filter((cust) => {
    const matchesQuery = cust.name.includes(searchQuery) || cust.phone.includes(searchQuery);
    const matchesRisk = riskFilter === 'ALL' || cust.risk_level === riskFilter;
    return matchesQuery && matchesRisk;
  });

  const getRiskBadge = (level: VIPCustomer['risk_level']) => {
    switch (level) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            고위험 케어
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ShieldAlert className="w-3 h-3 mr-1" />
            주의 모니터링
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3 mr-1" />
            정상 돌봄
          </span>
        );
    }
  };

  const handle119EmergencyCall = () => {
    if (!selectedCustomer) return;
    toast.error(`[🚨 119 구급대 긴급 출동 요청] ${selectedCustomer.name} 어르신 댁으로 119 및 지역 돌봄 센터 비상 알림이 자동 전송되었습니다.`, {
      duration: 6000,
      icon: '🚨',
      style: {
        background: '#450a0a',
        color: '#fca5a5',
        border: '1px solid #ef4444',
        fontWeight: 'bold',
      },
    });
    setEmergencyModalOpen(false);
  };

  const handleGuardianCall = () => {
    if (!selectedCustomer) return;
    toast.success(`[📞 보호자 직통 비상 통화] ${selectedCustomer.name} 어르신의 보호자 (010-9876-5432) 비상 연결을 가동합니다.`, {
      duration: 5000,
      icon: '📞',
      style: {
        background: '#064e3b',
        color: '#a7f3d0',
        border: '1px solid #10b981',
      },
    });
    setEmergencyModalOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-400" />
          안부 돌봄 대상 어르신 ({customers.length}명)
        </h2>
        <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
          실시간 연동중
        </span>
      </div>

      {/* 5번: 어르신 성함 검색창 */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="어르신 성함 또는 전화번호 검색..."
          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* 5번: 위험도 필터 탭 */}
      <div className="flex items-center space-x-1.5 pb-1 border-b border-slate-800/80 text-[11px]">
        {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setRiskFilter(filter)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              riskFilter === filter
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {filter === 'ALL' && '전체'}
            {filter === 'HIGH' && '고위험 🔴'}
            {filter === 'MEDIUM' && '주의 🟡'}
            {filter === 'LOW' && '정상 🟢'}
          </button>
        ))}
      </div>

      {/* 어르신 목록 카드 */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            검색 결과와 일치하는 어르신이 없습니다.
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const isSelected = selectedCustomer?.customer_id === cust.customer_id;
            return (
              <div
                key={cust.customer_id}
                onClick={() => onSelectCustomer(cust)}
                className={`w-full text-left p-3.5 rounded-xl transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'glass-panel-active ring-2 ring-indigo-500/50 scale-[1.01]'
                    : 'glass-panel hover:bg-slate-800/60 hover:border-slate-600/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600/30 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">
                        {cust.name} 어르신 <span className="text-xs font-normal text-slate-400">({cust.age}세)</span>
                      </h3>
                    </div>
                  </div>
                  {getRiskBadge(cust.risk_level)}
                </div>

                <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-700/40">
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>{cust.phone}</span>
                  </div>
                  <span className="text-[11px] text-indigo-300/80 font-medium">
                    {isSelected ? '선택됨' : '안부 통화 준비 완료'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5번: 🚨 선택된 어르신 비상 긴급 대응 액션 패널 */}
      {selectedCustomer && (
        <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-rose-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-rose-300">
            <span className="flex items-center gap-1.5">
              <Siren className="w-4 h-4 text-rose-400 animate-pulse" />
              {selectedCustomer.name} 어르신 비상 관제 패널
            </span>
            <span className="text-[10px] text-slate-400">즉시 비상 조치</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setEmergencyType('119');
                setEmergencyModalOpen(true);
              }}
              className="px-2.5 py-2 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center space-x-1 shadow-md transition-all border border-rose-400/40"
            >
              <Siren className="w-3.5 h-3.5" />
              <span>🚨 119 긴급 신고</span>
            </button>

            <button
              onClick={() => {
                setEmergencyType('GUARDIAN');
                setEmergencyModalOpen(true);
              }}
              className="px-2.5 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center space-x-1 shadow-md transition-all border border-emerald-400/40"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>📞 보호자 비상 연결</span>
            </button>
          </div>
        </div>
      )}

      {/* 비상 대응 확인 모달 */}
      {emergencyModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400 font-bold text-base">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
              <h3>비상 핫라인 조치 확인</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {emergencyType === '119' ? (
                <>
                  <strong className="text-rose-400">{selectedCustomer.name} 어르신</strong> 댁 관할 소방서 및 돌봄 지자체 센터에 <strong>119 긴급 출동 요청</strong>을 전달하시겠습니까?
                </>
              ) : (
                <>
                  <strong className="text-emerald-400">{selectedCustomer.name} 어르신</strong>의 등록 보호자 통화 비상 핫라인으로 직통 전화를 연결하시겠습니까?
                </>
              )}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEmergencyModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                취소
              </button>
              {emergencyType === '119' ? (
                <button
                  onClick={handle119EmergencyCall}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/40"
                >
                  119 즉시 요청
                </button>
              ) : (
                <button
                  onClick={handleGuardianCall}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40"
                >
                  보호자 비상 연결
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
