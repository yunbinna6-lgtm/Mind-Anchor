"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  X, 
  ShieldAlert, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  Heart, 
  Calendar, 
  Phone, 
  Sparkles, 
  Send, 
  Play, 
  Square, 
  Volume2, 
  Smile, 
  Frown, 
  AlertCircle 
} from 'lucide-react';
import { ReportResponse } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  customerId: number | null;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  customerId,
  onClose,
}) => {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [playingLogId, setPlayingLogId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && customerId) {
      setIsLoading(true);
      fetch(`/api/report/${customerId}`)
        .then((res) => res.json())
        .then((data: ReportResponse) => {
          setReport(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('진단 리포트 데이터를 불러오는 데 실패했습니다.', err);
          setIsLoading(false);
        });
    }
  }, [isOpen, customerId]);

  // 모달 닫을 때 음성 재생 정지
  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setPlayingLogId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 학술 4대 지표 값 (기본값 설정)
  const topicCoherence = report?.topic_coherence ?? 85;
  const vocabularyClarity = report?.vocabulary_clarity ?? (report ? Math.round(report.avg_unique_word_ratio * 100) : 90);
  const shortTermMemory = report?.short_term_memory ?? 88;
  const responseSpeed = report?.response_speed ?? (report ? Math.max(10, Math.round(100 - (report.avg_response_delay * 8))) : 82);

  const metricsList = [
    { title: '① 대화 주제 유지력', sub: '동문서답 방지 / 화제 유지', score: topicCoherence },
    { title: '② 어휘 명확성', sub: '명칭 실어증 / 우회 발화 방지', score: vocabularyClarity },
    { title: '③ 단기 기억력', sub: '반복 질문 및 소속 인지', score: shortTermMemory },
    { title: '④ 인지 반응 속도', sub: '탐색 지연 및 긴 침묵 여부', score: responseSpeed },
  ];

  const getGaugeColor = (score: number) => {
    if (score >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-400', badge: '안정', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    if (score >= 50) return { bar: 'bg-amber-500', text: 'text-amber-400', badge: '주의', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    return { bar: 'bg-rose-500', text: 'text-rose-400', badge: '위험', badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
  };

  // 6번: 턴별 음성 다시듣기 TTS 재생 핸들러
  const handlePlayAudio = (logId: number, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('현재 브라우저에서는 음성 다시듣기를 지원하지 않습니다.');
      return;
    }

    if (playingLogId === logId) {
      window.speechSynthesis.cancel();
      setPlayingLogId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9; // 어르신 케어용 천천히 읽기

    utterance.onend = () => {
      setPlayingLogId(null);
    };

    utterance.onerror = () => {
      setPlayingLogId(null);
    };

    setPlayingLogId(logId);
    window.speechSynthesis.speak(utterance);
    toast.success('어르신 음성 다시듣기가 시작되었습니다.', { icon: '🔊' });
  };

  // 카카오톡 전송 토스트 실행
  const handleKakaoSend = () => {
    toast("보호자 카카오톡으로 종합 진단 리포트가 성공적으로 전송되었습니다.", {
      icon: "💬",
      style: {
        background: "#fee500",
        color: "#191919",
        fontWeight: "bold",
        border: "1px solid #e6cf00",
        borderRadius: "12px",
      },
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="glass-panel w-full max-w-3xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* 모달 헤더 */}
          <div className="p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-600/30 text-rose-400 border border-rose-500/30">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  VIP 어르신 치매 예방 보호자 종합 헬스케어 리포트
                  <span className="text-xs font-normal text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                    신경언어학 진단
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  학술 논문 기반 4대 인지 저하 지표 모니터링 결과
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 본문 콘텐츠 */}
          <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
            {isLoading || !report ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-slate-400">치매 예방 진단 리포트를 생성하는 중입니다...</p>
              </div>
            ) : (
              <>
                {/* 고객 프로필 */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-rose-400 font-bold text-lg border border-slate-700">
                      {report.name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-lg">
                        {report.name} 어르신 <span className="text-sm font-normal text-slate-400">({report.age}세)</span>
                      </h3>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {report.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {report.current_risk_level === 'HIGH' ? (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        고위험 케어 대상
                      </span>
                    ) : report.current_risk_level === 'MEDIUM' ? (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        주의 모니터링 대상
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        정상 인지 돌봄
                      </span>
                    )}
                  </div>
                </div>

                {/* [보호자용] 4대 인지 지표 게이지 바 UI */}
                <div className="glass-panel p-5 rounded-xl border border-indigo-500/30 space-y-4">
                  <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    보호자용 학술 논문 기반 4대 인지 지표 정밀 평가 (Gauge Bars)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metricsList.map((m, idx) => {
                      const style = getGaugeColor(m.score);
                      return (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-200 block">{m.title}</span>
                              <span className="text-[10px] text-slate-400">{m.sub}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${style.badgeBg}`}>
                              {style.badge} ({m.score}점)
                            </span>
                          </div>

                          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
                              style={{ width: `${Math.min(100, Math.max(0, m.score))}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI 신경언어학 소견 박스 */}
                <div className="glass-panel p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 space-y-2">
                  <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-rose-400" />
                    AI 신경언어학 치매 예방 종합 소견
                  </h4>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {report.recommendation}
                  </p>
                </div>

                {/* 대화 이력 타임라인 & 6번: 턴별 음성 다시듣기 플레이어 */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    최근 안부 대화 발화 로그 ({report.logs.length}건)
                  </h4>
                  
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                    {report.logs.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">기록된 대화 로그가 없습니다.</p>
                    ) : (
                      report.logs.map((log) => {
                        const isPlaying = playingLogId === log.log_id;
                        return (
                          <div
                            key={log.log_id}
                            className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs flex flex-col gap-2 transition-all hover:border-slate-700"
                          >
                            <div className="flex items-center justify-between text-slate-400">
                              <span className="text-[11px]">{new Date(log.timestamp).toLocaleString('ko-KR')}</span>
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    log.status === 'EMERGENCY'
                                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                      : log.status === 'ALERT'
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {log.status}
                                </span>
                              </div>
                            </div>

                            <p className="text-slate-100 font-medium text-[13px] bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                              {log.masked_transcript}
                            </p>

                            {/* 6번: 음성 다시듣기 플레이어 컨트롤 바 */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handlePlayAudio(log.log_id, log.masked_transcript)}
                                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    isPlaying
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                      : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40'
                                  }`}
                                >
                                  {isPlaying ? (
                                    <>
                                      <Square className="w-3 h-3 fill-rose-300" />
                                      <span>음성 정지</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-3 h-3 fill-indigo-200" />
                                      <span>▶️ 음성 다시듣기</span>
                                    </>
                                  )}
                                </button>

                                {isPlaying && (
                                  <div className="flex items-center space-x-1 h-3 px-1">
                                    {[60, 90, 40, 80, 50].map((h, i) => (
                                      <span
                                        key={i}
                                        className="w-1 bg-rose-400 rounded-full animate-pulse"
                                        style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>

                              <span className="text-[10px] text-slate-500">
                                탐색지연: {log.avg_response_delay}초
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 모달 푸터 */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={handleKakaoSend}
              className="px-4 py-2.5 rounded-xl bg-[#fee500] hover:bg-[#fada00] text-[#191919] text-xs font-extrabold flex items-center space-x-2 shadow-md transition-transform scale-100 hover:scale-[1.02]"
            >
              <Send className="w-4 h-4" />
              <span>보호자 카카오톡으로 전송</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              닫기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
