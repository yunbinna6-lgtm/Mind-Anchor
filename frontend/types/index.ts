export interface VIPCustomer {
  customer_id: number;
  name: string;
  age: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  phone: string;
  guardian_phone?: string;
}

export type EmotionType = 'CALM' | 'HAPPY' | 'ANXIOUS' | 'DEPRESSED';

export interface AssessmentLog {
  log_id: number;
  customer_id: number;
  timestamp: string;
  duration_sec: number;
  avg_response_delay: number;
  unique_word_ratio: number;
  masked_transcript: string;
  status: 'NORMAL' | 'ALERT' | 'EMERGENCY';
  emotion?: EmotionType;
  topic_coherence?: number;
  vocabulary_clarity?: number;
  short_term_memory?: number;
  response_speed?: number;
}

export interface AnalyzeResponse {
  customer_id: number;
  masked_message: string;
  turn_count: number;
  avg_response_delay: number;
  unique_word_ratio: number;
  risk_score: number;
  emergency_flag: boolean;
  status: 'NORMAL' | 'ALERT' | 'EMERGENCY';
  emotion?: EmotionType;
  topic_coherence?: number;
  vocabulary_clarity?: number;
  short_term_memory?: number;
  response_speed?: number;
}

export interface ReportResponse {
  customer_id: number;
  name: string;
  age: number;
  phone: string;
  guardian_phone?: string;
  current_risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  total_assessments: number;
  latest_risk_score: number;
  avg_response_delay: number;
  avg_unique_word_ratio: number;
  emergency_count: number;
  recommendation: string;
  logs: AssessmentLog[];
  topic_coherence?: number;
  vocabulary_clarity?: number;
  short_term_memory?: number;
  response_speed?: number;
}

