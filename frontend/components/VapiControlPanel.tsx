"use client";

import React, { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import toast from 'react-hot-toast';
import { 
  Mic, 
  MicOff, 
  PhoneCall, 
  PhoneOff, 
  Activity, 
  FileText, 
  Heart, 
  Volume2, 
  Sparkles, 
  Send, 
  Square, 
  Smile, 
  Frown, 
  AlertCircle, 
  Gauge, 
  VolumeX 
} from 'lucide-react';
import { VIPCustomer, AnalyzeResponse, EmotionType } from '../types';

interface VapiControlPanelProps {
  customer: VIPCustomer | null;
  onAnalysisResult: (result: AnalyzeResponse) => void;
  onOpenReport: (customerId: number) => void;
}

interface TranscriptItem {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  maskedText?: string;
  timestamp: string;
  latencySec?: number;
  emotion?: EmotionType;
}

interface VoiceProfile {
  id: string;
  name: string;
  provider: 'azure' | 'openai';
  voiceId: string;
}

const VOICE_OPTIONS: VoiceProfile[] = [
  { id: 'azure-sunhi', name: 'Azure SunHi (선희 - 따뜻한 여성 헬스케어)', provider: 'azure', voiceId: 'ko-KR-SunHiNeural' },
  { id: 'azure-injoon', name: 'Azure InJoon (인준 - 다정한 남성 헬스케어)', provider: 'azure', voiceId: 'ko-KR-InJoonNeural' },
  { id: 'openai-nova', name: 'OpenAI Nova (노바 - 밝은 여성)', provider: 'openai', voiceId: 'nova' },
  { id: 'openai-shimmer', name: 'OpenAI Shimmer (시머 - 포근한 여성)', provider: 'openai', voiceId: 'shimmer' },
  { id: 'openai-onyx', name: 'OpenAI Onyx (오닉스 - 차분한 남성)', provider: 'openai', voiceId: 'onyx' },
];

const SPEED_OPTIONS = [
  { value: 0.8, label: '0.8x (천천히 🐢)' },
  { value: 0.9, label: '0.9x (어르신 권장 👵)' },
  { value: 1.0, label: '1.0x (보통 ⚡)' },
  { value: 1.1, label: '1.1x (약간 빠르게)' },
];

// 발화 문장 기반 정서/감정 자동 감지 함수
const detectEmotion = (text: string): EmotionType => {
  if (/우울|슬프|외롭|죽고|눈물|적적|쓸쓸/.test(text)) return 'DEPRESSED';
  if (/불안|걱정|무서|두려|아파|어지러|혼자|깜빡/.test(text)) return 'ANXIOUS';
  if (/좋아|감사|고마|행복|즐거|반가|다행|네/.test(text)) return 'HAPPY';
  return 'CALM';
};

export const VapiControlPanel: React.FC<VapiControlPanelProps> = ({
  customer,
  onAnalysisResult,
  onOpenReport,
}) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReportReady, setIsReportReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState<number>(0.9); // 어르신 케어용 0.9x 기본
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile>(VOICE_OPTIONS[0]);
  const [turnCount, setTurnCount] = useState(1);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  
  // 실시간 음성 스트리밍 자막 상태
  const [liveUserText, setLiveUserText] = useState<string>('');
  const [liveAssistantText, setLiveAssistantText] = useState<string>('');

  // Direct Text Fallback 입력창 상태
  const [textInput, setTextInput] = useState<string>('');
  
  // 정밀 탐색 지연 시간 타임스탬프 계산용 Ref
  const lastAssistantSpeechEndRef = useRef<number>(Date.now());
  const vapiRef = useRef<Vapi | null>(null);

  const customerRef = useRef<VIPCustomer | null>(customer);
  const selectedVoiceRef = useRef<VoiceProfile>(selectedVoice);
  const turnCountRef = useRef<number>(turnCount);

  useEffect(() => {
    customerRef.current = customer;
  }, [customer]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  useEffect(() => {
    turnCountRef.current = turnCount;
  }, [turnCount]);

  // Vapi SDK 초기화
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (apiKey && !vapiRef.current) {
      const vapiInstance = new Vapi(apiKey);
      vapiRef.current = vapiInstance;

      vapiInstance.on('call-start', () => {
        setIsConnecting(false);
        setIsCallActive(true);
        setIsReportReady(false);
        setIsMuted(false);
        setLiveUserText('');
        setLiveAssistantText('');
        toast.success(`${customerRef.current?.name || 'VIP'} 어르신과의 실시간 스트리밍 안부 통화가 시작되었습니다.`);
      });

      vapiInstance.on('call-end', () => {
        setIsCallActive(false);
        setIsSpeaking(false);
        setIsReportReady(true);
        setIsMuted(false);
        setLiveUserText('');
        setLiveAssistantText('');
      });

      vapiInstance.on('speech-start', () => {
        setIsSpeaking(true);
      });

      vapiInstance.on('speech-end', () => {
        setIsSpeaking(false);
        lastAssistantSpeechEndRef.current = Date.now();

        if (turnCountRef.current >= 4) {
          setTimeout(() => {
            handleNormalEnd();
          }, 1500);
        }
      });

      vapiInstance.on('message', (message: any) => {
        if (message.type === 'tool-calls') {
          for (const call of message.toolCalls) {
            if (call.function.name === 'emergency_alert') {
              handleEmergencyAlert("Vapi AI 이상 반응 / 비상 키워드 감지");
            } else if (call.function.name === 'end_call') {
              handleNormalEnd();
            }
          }
        }

        if (message.type === 'transcript') {
          if (message.role === 'user') {
            if (message.transcriptType === 'partial') {
              setLiveUserText(message.transcript);
            } else {
              setLiveUserText('');
              if (message.transcript && message.transcript.trim()) {
                handleUserUtterance(message.transcript);
              }
            }
          } else if (message.role === 'assistant') {
            if (message.transcriptType === 'partial') {
              setLiveAssistantText(message.transcript);
            } else {
              setLiveAssistantText('');
              if (message.transcript && message.transcript.trim()) {
                const emotion = detectEmotion(message.transcript);
                const assistantItem: TranscriptItem = {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  text: message.transcript,
                  timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                  emotion: emotion,
                };
                setTranscripts(prev => {
                  if (prev.some(item => item.text === message.transcript)) return prev;
                  return [...prev, assistantItem];
                });
                lastAssistantSpeechEndRef.current = Date.now();
              }
            }
          }
        }
      });
    }

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current = null;
      }
    };
  }, []);

  // 유저 발화 수신 시 분석 전송
  const handleUserUtterance = async (userText: string) => {
    if (!customerRef.current || !userText.trim()) return;

    const now = Date.now();
    const delayMs = Math.max(0, now - lastAssistantSpeechEndRef.current);
    const latencySec = parseFloat((delayMs / 1000.0).toFixed(2));
    const emotion = detectEmotion(userText);

    const historyTexts = transcripts.map(t => t.text);

    const userItem: TranscriptItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      latencySec: latencySec,
      emotion: emotion,
    };

    setTranscripts(prev => [...prev, userItem]);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerRef.current.customer_id,
          message: userText,
          turn_count: turnCount,
          latency_seconds: latencySec,
          history: historyTexts,
        }),
      });

      if (!res.ok) throw new Error('인지 건강 리스크 분석 실패');
      const data: AnalyzeResponse = await res.json();

      const topicCoherence = Math.max(20, Math.min(100, Math.round(100 - (data.risk_score * 0.4))));
      const vocabularyClarity = Math.max(20, Math.min(100, Math.round(data.unique_word_ratio * 100)));
      const shortTermMem = Math.max(20, Math.min(100, Math.round(95 - (turnCount * 2) - (data.risk_score * 0.3))));
      const respSpeed = Math.max(10, Math.min(100, Math.round(100 - (latencySec * 8))));

      const enrichedData: AnalyzeResponse = {
        ...data,
        emotion: emotion,
        topic_coherence: topicCoherence,
        vocabulary_clarity: vocabularyClarity,
        short_term_memory: shortTermMem,
        response_speed: respSpeed,
      };

      onAnalysisResult(enrichedData);

      setTranscripts(prev =>
        prev.map(item => (item.id === userItem.id ? { ...item, maskedText: data.masked_message || userText } : item))
      );

      if (data.emergency_flag) {
        handleEmergencyAlert(`고위험 이상 반응 및 긴급 상황 감지 (점수: ${data.risk_score}점)`);
      }

      setTurnCount(prev => prev + 1);
    } catch (err) {
      console.error(err);
      toast.error('백엔드 관제 서버 연동 중 오류가 발생했습니다.');
    }
  };

  const handleEmergencyAlert = (reason: string) => {
    toast.error(`[긴급 인지 돌봄 경보] ${reason}`, {
      duration: 8000,
      icon: '🚨',
      style: {
        background: '#450a0a',
        color: '#fca5a5',
        border: '1px solid #ef4444',
      },
    });
  };

  const handleNormalEnd = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setIsCallActive(false);
    setIsSpeaking(false);
    setIsReportReady(true);
    setIsMuted(false);
    setLiveUserText('');
    setLiveAssistantText('');

    toast.success('어르신과의 안부 대화가 성료되었습니다. 신경언어학 진단 리포트가 준비되었습니다.');
    if (customerRef.current) {
      onOpenReport(customerRef.current.customer_id);
    }
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      const nextState = !isMuted;
      try {
        vapiRef.current.setMuted(nextState);
      } catch (e) {
        console.log('Mute toggled:', nextState);
      }
      setIsMuted(nextState);
      toast(nextState ? '마이크가 음소거 되었습니다.' : '마이크 음소거가 해제되었습니다.', {
        icon: nextState ? '🔇' : '🎙️',
      });
    }
  };

  const interruptSpeech = () => {
    if (vapiRef.current && isSpeaking) {
      try {
        vapiRef.current.say('', false);
      } catch (e) {}
      setIsSpeaking(false);
      toast('AI 상담사 음성을 일시정지했습니다.', { icon: '✋' });
    }
  };

  const handleSendTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const textToSend = textInput.trim();
    setTextInput('');
    handleUserUtterance(textToSend);
  };

  // 통화 시작
  const startCall = () => {
    if (!customerRef.current) {
      toast.error('먼저 돌봄 관제할 어르신을 선택해주세요.');
      return;
    }

    setTranscripts([]);
    setTurnCount(1);
    setIsConnecting(true);
    setIsReportReady(false);
    setIsMuted(false);
    setLiveUserText('');
    setLiveAssistantText('');

    const customerName = customerRef.current.name;
    const firstGreeting = `안녕하세요, 마인드 앵커 AI 케어 상담사입니다, ${customerName} 어르신! 오늘 하루는 어떻게 보내셨나요?`;

    const systemPrompt = `당신은 단순한 상담원이 아니라, 신경언어학적(Neurolinguistic) 지식을 바탕으로 치매 초기 증상을 판별하는 '치매 예방 전담 AI 케어 상담사'입니다. 어르신(${customerName})과의 대화를 따뜻하고 부드럽게 나누며 뇌 인지 활성화를 도우세요.
말하기 속도는 어르신이 알아듣기 쉽도록 편안하고 따뜻하게 억양을 전달하세요.

[언어 절대 규정 - 최우선 순위]
- 모든 대화와 응답은 100% 한국어(Korean)로만 진행하세요. 절대로 영어나 타 외국어를 사용하지 마세요.

[대화 진행 및 4턴 정중한 종료 규칙]
1. **1~3턴**: 어르신이 대답하시면 공감해 주신 뒤, 대화 문맥에 맞추어 따뜻하게 **꼬리 질문 딱 1개**만 물어보세요.
2. **4턴 (마지막 작별 인사)**: 어르신의 4번째 대답을 들은 후에는 더 이상 질문을 하지 마시고, "오늘 말씀 나눠주셔서 정말 감사합니다, ${customerName} 어르신! 늘 건강하시고 따뜻한 하루 보내세요. 이만 안부 전화 마치겠습니다~" 와 같이 인사를 전하고 대화를 정리하세요.`;

    if (vapiRef.current && process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY) {
      vapiRef.current.start({
        firstMessage: firstGreeting,
        voice: {
          provider: selectedVoice.provider,
          voiceId: selectedVoice.voiceId,
        },
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'ko',
          smartFormat: true,
        },
        stopSpeakingPlan: {
          numWords: 2,
          voiceSeconds: 0.4,
        },
        firstMessageInterruptionsEnabled: false,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
          ],
        },
      });
    } else {
      setTimeout(() => {
        setIsConnecting(false);
        setIsCallActive(true);
        lastAssistantSpeechEndRef.current = Date.now();
        toast.success(`[AI 케어 세션] ${customerRef.current?.name || 'VIP'} 어르신과의 안부 대화가 시작되었습니다.`);
        
        const firstEmotion = detectEmotion(firstGreeting);
        const welcomeItem: TranscriptItem = {
          id: `assistant-1`,
          role: 'assistant',
          text: firstGreeting,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          emotion: firstEmotion,
        };
        setTranscripts([welcomeItem]);
      }, 800);
    }
  };

  const getEmotionBadge = (em?: EmotionType) => {
    switch (em) {
      case 'HAPPY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Smile className="w-3 h-3 mr-1" />
            감정: 기쁨/안정 😊
          </span>
        );
      case 'ANXIOUS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            감정: 불안/걱정 🟡
          </span>
        );
      case 'DEPRESSED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <Frown className="w-3 h-3 mr-1" />
            감정: 우울/외로움 🔵
          </span>
        );
      case 'CALM':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700/60 text-slate-300 border border-slate-600/40">
            <Sparkles className="w-3 h-3 mr-1 text-slate-400" />
            감정: 평온 🟢
          </span>
        );
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col h-[650px] justify-between border border-slate-800 shadow-2xl relative">
      {/* 헤더 영역 */}
      <div className="pb-3 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${isCallActive ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-base md:text-lg flex items-center gap-2">
                치매 예방 AI 안부 대화 세션
                {isCallActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-ping"></span>
                    실시간 스트리밍 중
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {customer ? `${customer.name} 어르신 (${selectedVoice.name.split('(')[1]?.replace(')', '') || '선희 음성'})` : '어르신을 선택하여 통화를 시작하세요'}
              </p>
            </div>
          </div>

          {/* 음성 및 리포트 버튼 */}
          <div className="flex items-center space-x-2">
            {isReportReady && customer && (
              <button
                onClick={() => onOpenReport(customer.customer_id)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 border border-indigo-400/40 transition-all animate-pulse"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>진단 리포트</span>
              </button>
            )}
          </div>
        </div>

        {/* AI 보이스 & 음성 속도 튜닝 옵션바 */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-xs">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <select
              value={selectedVoice.id}
              onChange={(e) => {
                const found = VOICE_OPTIONS.find(v => v.id === e.target.value);
                if (found) setSelectedVoice(found);
              }}
              disabled={isCallActive}
              className="bg-slate-950 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {VOICE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3번: 어르신 맞춤 음성 속도 조절 */}
          <div className="flex items-center space-x-1.5">
            <Gauge className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-[11px] text-slate-400">속도:</span>
            <select
              value={speechSpeed}
              onChange={(e) => {
                const sp = parseFloat(e.target.value);
                setSpeechSpeed(sp);
                toast(`AI 음성 속도가 ${sp}x 로 설정되었습니다.`, { icon: '⏱️' });
              }}
              disabled={isCallActive}
              className="bg-slate-950 text-indigo-300 border border-indigo-500/30 rounded-lg px-2 py-1 text-xs focus:outline-none cursor-pointer font-semibold"
            >
              {SPEED_OPTIONS.map((s) => (
                <option key={s.value} value={s.value} className="bg-slate-900 text-slate-200">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1번: 실시간 오디오 파형 비주얼라이저 (Waveform Spectrum Visualizer) */}
      {isCallActive && (
        <div className="my-2 p-2.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            {isSpeaking ? (
              <span className="text-rose-400 flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                AI 발화 음성 출력 중
              </span>
            ) : liveUserText ? (
              <span className="text-emerald-400 flex items-center gap-1.5 animate-pulse">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                어르신 음성 감지 중
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                실시간 오디오 수신 중
              </span>
            )}
          </div>

          {/* 파형 바 이퀄라이저 애니메이션 */}
          <div className="flex items-center space-x-1 h-5 px-2">
            {[40, 70, 30, 90, 50, 80, 45, 95, 60, 35, 75, 40].map((height, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isSpeaking
                    ? 'bg-rose-400 animate-pulse'
                    : liveUserText
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-indigo-500/40'
                }`}
                style={{
                  height: (isSpeaking || liveUserText || isCallActive)
                    ? `${Math.max(20, (height * (isSpeaking ? 1 : 0.6)) % 100)}%`
                    : '25%',
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 실시간 음성 트랜스크립트 뷰어 */}
      <div className="flex-1 my-2 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
        {transcripts.length === 0 && !liveAssistantText && !liveUserText ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center text-rose-400/70 mb-1 border border-slate-700">
              <Heart className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-slate-300">치매 예방 안부 대화 대기 중</p>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              [안부 통화 시작]을 누르면 말씀하시는 단어와 AI 음성이 말하는 순간 실시간 자막으로 표출됩니다.
            </p>
          </div>
        ) : (
          <>
            {/* 1) 확정 트랜스크립트 목록 */}
            {transcripts.map((t) => (
              <div
                key={t.id}
                className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md ${
                    t.role === 'user'
                      ? 'bg-indigo-600/40 text-slate-100 border border-indigo-500/30 rounded-tr-none'
                      : 'bg-slate-800/80 text-slate-200 border border-slate-700 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] opacity-80 mb-1 gap-3">
                    <span className="font-semibold">{t.role === 'user' ? '어르신 발화' : `AI 케어 상담사 (${selectedVoice.name.split(' ')[1] || '선희'})`}</span>
                    {/* 4번: 실시간 감정 뱃지 표출 */}
                    <div className="flex items-center space-x-2">
                      {getEmotionBadge(t.emotion)}
                      <span>{t.timestamp}</span>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {t.maskedText ? t.maskedText : t.text}
                  </p>
                  {t.latencySec !== undefined && (
                    <div className="mt-1.5 pt-1 border-t border-indigo-400/20 text-[10px] text-indigo-300 flex items-center justify-end">
                      <span>인지 탐색 지연시간: <strong className="text-amber-300">{t.latencySec}초</strong></span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 2) AI 음성 말하는 동시 실시간 자막 스트리밍 */}
            {liveAssistantText && (
              <div className="flex flex-col items-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md bg-slate-800/90 text-slate-100 border border-indigo-500/50 rounded-tl-none animate-pulse">
                  <div className="flex items-center space-x-2 text-[11px] text-indigo-300 mb-1 font-semibold">
                    <Sparkles className="w-3 h-3 animate-spin text-indigo-400" />
                    <span>AI 케어 상담사 실시간 발화중...</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{liveAssistantText}</p>
                </div>
              </div>
            )}

            {/* 3) 사용자 마이크 입력 동시 실시간 자막 스트리밍 */}
            {liveUserText && (
              <div className="flex flex-col items-end">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md bg-indigo-600/60 text-slate-100 border border-indigo-400/60 rounded-tr-none animate-pulse">
                  <div className="flex items-center space-x-2 text-[11px] text-indigo-200 mb-1 font-semibold">
                    <Mic className="w-3 h-3 text-rose-300 animate-ping" />
                    <span>어르신 음성 인식중...</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{liveUserText}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 2번: 통화 제어 툴바 & 텍스트 Direct Fallback 입력창 */}
      <div className="pt-3 border-t border-slate-800 space-y-2.5">
        {/* 통화 보조 툴바 (Mute / Interrupt) */}
        {isCallActive && (
          <div className="flex items-center justify-between bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-semibold transition-colors ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isMuted ? '음소거 해제' : '마이크 음소거'}</span>
              </button>

              {isSpeaking && (
                <button
                  onClick={interruptSpeech}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold"
                >
                  <Square className="w-3 h-3 fill-amber-300" />
                  <span>AI 말 끊기</span>
                </button>
              )}
            </div>

            <span className="text-[11px] text-slate-400">
              {isMuted ? '🔇 음소거 활성화됨' : '🎙️ 음성 감지 중'}
            </span>
          </div>
        )}

        {/* 텍스트 Fallback Direct Input 폼 */}
        <form onSubmit={handleSendTextSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={isCallActive ? "어르신 응답 텍스트 직접 입력 (Fallback Chat)..." : "통화 전 대화 메시지 테스트 입력..."}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || !customer}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold flex items-center space-x-1 shadow-md transition-all shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>전송</span>
          </button>
        </form>

        {/* 통화 시작/종료 메인 버튼 */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-400 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            <span>관제 엔진: FastAPI + LangGraph V3</span>
          </div>

          <div>
            {!isCallActive ? (
              <button
                onClick={startCall}
                disabled={isConnecting || !customer}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-rose-900/40 transition-all scale-100 hover:scale-[1.02]"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{isConnecting ? '안부 전화 연결 중...' : '안부 통화 시작'}</span>
              </button>
            ) : (
              <button
                onClick={handleNormalEnd}
                className="px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center space-x-2 border border-slate-600 transition-all"
              >
                <PhoneOff className="w-4 h-4" />
                <span>통화 완료</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
