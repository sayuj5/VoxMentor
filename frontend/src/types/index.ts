export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export type SessionMode =
  | 'technical_interview'
  | 'hr_interview'
  | 'learning_mentor'
  | 'communication_coach';

export type SessionStatus = 'created' | 'starting' | 'active' | 'recovering' | 'ending' | 'completed' | 'failed';
export type SessionDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Session {
  id: string;
  user_id: string;
  mode: SessionMode;
  topic: string;
  difficulty: SessionDifficulty;
  status: SessionStatus;
  started_at: string | null;
  ended_at: string | null;
  duration: number | null;
  created_at: string;
}

export interface Evaluation {
  id: string;
  session_id: string;
  status: string;
  overall_score: number | null;
  technical_score: number | null;
  communication_score: number | null;
  relevance_score: number | null;
  confidence_score: number | null;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  created_at: string;
}

export interface DashboardSummary {
  total_sessions: number;
  completed_sessions: number;
  average_score: number | null;
  recent_sessions: Session[];
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
  page: number;
  page_size: number;
}

export interface AgoraTokenResponse {
  token: string;
  app_id: string;
  channel_name: string;
  uid: number;
}

export interface SessionStartResponse {
  session: Session;
  connection: AgoraTokenResponse | null;
  recovering: boolean;
  message?: string;
}

export interface AgentConfig {
  session_id: string;
  agent_config: {
    system_prompt: string;
    voice: string;
    language: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
