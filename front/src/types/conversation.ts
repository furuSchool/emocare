export interface EmotionRef {
  id: string | null;
  emotion_name: string | null; // Japanese name
  emotion_key: string | null; // English key (plutchik mapping)
}

export interface ConversationSession {
  id: string;
  patient: string; // UUID
  patient_name?: string;
  started_at: string; // ISO8601
  ended_at: string | null;
  patient_text: string | null;
  ai_response_text: string | null;
  emotion: string | null; // emotion id
  emotion_name: string | null;
  emotion_key: string | null;
  emotion_reason: string | null;
  duration?: number | null;
  // Optional: 0..1 intensity score for visualization
  emotion_score?: number | null;
}

export interface EmotionsQuery {
  from?: string; // ISO8601
  to?: string; // ISO8601
  limit?: number; // 1..500
  order?: 'asc' | 'desc';
}
