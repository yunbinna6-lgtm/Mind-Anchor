"use client";

import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Activity, Clock, FileText, Heart, ShieldAlert, Sparkles } from 'lucide-react';
import { AnalyzeResponse } from '../types';

interface MetricsDashboardProps {
  analysisHistory: AnalyzeResponse[];
  currentAnalysis: AnalyzeResponse | null;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  analysisHistory,
  currentAnalysis,
}) => {
  // 학술 기반 4대 지표 값 추출 (기본값 제공)
  const topicCoherence = currentAnalysis?.topic_coherence ?? 85;
  const vocabularyClarity = currentAnalysis?.vocabulary_clarity ?? (currentAnalysis ? Math.round(currentAnalysis.unique_word_ratio * 100) : 90);
  const shortTermMemory = currentAnalysis?.short_term_memory ?? 88;
  const responseSpeed = currentAnalysis?.response_speed ?? (currentAnalysis ? Math.max(10, Math.round(100 - (currentAnalysis.avg_response_delay * 8))) : 82);

  // 1) Radar Chart (방사형 차트) 4대 축 데이터
  const radarData = [
    { subject: '주제 유지력', score: topicCoherence, fullMark: 100 },
    { subject: '어휘 명확성', score: vocabularyClarity, fullMark: 100 },
    { subject: '단기 기억력', score: shortTermMemory, fullMark: 100 },
    { subject: '반응 속도', score: responseSpeed, fullMark: 100 },
  ];

  // 2) Dual Y-Axis (이중 Y축) 대화 턴별 추이 데이터
  const dualAxisData = analysisHistory.map((item, idx) => ({
    turn: `${idx + 1}턴`,
    density: Math.round(item.unique_word_ratio * 100), // 왼쪽 Y축: 어휘 밀도 (%) 0 ~ 100
    latency: item.avg_response_delay,                 // 오른쪽 Y축: 탐색 지연 (초) 0 ~ 20
  }));

  const defaultDualData = dualAxisData.length > 0 ? dualAxisData : [
    { turn: '1턴', density: 92, latency: 1.5 },
    { turn: '2턴', density: 85, latency: 2.1 },
  ];

  const latestScore = currentAnalysis ? currentAnalysis.risk_score : 15;
  const latestLatency = currentAnalysis ? currentAnalysis.avg_response_delay : 1.2;
  const status = currentAnalysis ? currentAnalysis.status : 'NORMAL';

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'EMERGENCY':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">EMERGENCY 비상</span>;
      case 'ALERT':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">ALERT 주의</span>;
      case 'NORMAL':
      default:
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">NORMAL 정상</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. 상단 인지 리스크 및 상태 헤더 */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">실시간 인지 헬스케어 위험도</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-extrabold text-slate-100">{latestScore}점</span>
              <span className="text-[11px] text-slate-400">/ 100점</span>
            </div>
          </div>
        </div>
        {getStatusBadge(status)}
      </div>

      {/* 2. [학술 기반] 4대 인지 저하 지표 방사형 차트 (Radar Chart) */}
      <div className="glass-panel p-4 rounded-xl border border-indigo-500/30 bg-slate-900/60">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            학술 논문 기반 4대 인지 저하 밸런스 (Radar Chart)
          </h3>
          <span className="text-[10px] text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
            신경언어학 지표
          </span>
        </div>

        <div className="h-52 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
              <Radar
                name="어르신 인지 밸런스"
                dataKey="score"
                stroke="#818cf8"
                fill="#6366f1"
                fillOpacity={0.5}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#818cf8' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. [이중 Y축] 어휘 밀도(왼쪽 Y축) vs 탐색 지연(오른쪽 Y축) Dual Y-Axis 차트 */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800">
        <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          대화 턴별 어휘 밀도(%) & 탐색 지연(초) 이중 Y축 추이
        </h3>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={defaultDualData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="turn" stroke="#64748b" fontSize={11} />

              {/* 왼쪽 Y축: 어휘 밀도 (%) 0 ~ 100 */}
              <YAxis
                yAxisId="left"
                orientation="left"
                domain={[0, 100]}
                stroke="#10b981"
                fontSize={10}
                unit="%"
              />

              {/* 오른쪽 Y축: 탐색 지연 (초) 0 ~ 20 */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 20]}
                stroke="#f59e0b"
                fontSize={10}
                unit="초"
              />

              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />

              {/* 어휘 밀도 바 (왼쪽 Y축) */}
              <Bar yAxisId="left" dataKey="density" name="어휘 밀도 (%)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />

              {/* 탐색 지연 라인 (오른쪽 Y축) */}
              <Line yAxisId="right" type="monotone" dataKey="latency" name="탐색 지연 (초)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
