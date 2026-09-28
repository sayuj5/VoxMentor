import { apiClient } from './api';
import type {
  User,
  Session,
  SessionListResponse,
  SessionStartResponse,
  Evaluation,
  DashboardSummary,
  AgoraTokenResponse,
  AgentConfig,
} from '../types';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authService = {
  async register(email: string, password: string, name: string): Promise<{ access_token: string }> {
    const res = await apiClient.post('/auth/register', { email, password, name });
    return res.data;
  },

  async login(email: string, password: string): Promise<{ access_token: string }> {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessionService = {
  async create(mode: string, topic: string, difficulty: string, duration?: number): Promise<Session> {
    const res = await apiClient.post('/sessions', { mode, topic, difficulty, duration });
    return res.data;
  },

  async list(page = 1, pageSize = 10): Promise<SessionListResponse> {
    const res = await apiClient.get('/sessions', { params: { page, page_size: pageSize } });
    return res.data;
  },

  async get(sessionId: string): Promise<Session> {
    const res = await apiClient.get(`/sessions/${sessionId}`);
    return res.data;
  },

  async start(sessionId: string): Promise<SessionStartResponse> {
    const res = await apiClient.post(`/sessions/${sessionId}/start`);
    return res.data;
  },

  async end(sessionId: string): Promise<Session> {
    const res = await apiClient.post(`/sessions/${sessionId}/end`);
    return res.data;
  },

  async addMessage(sessionId: string, role: string, content: string) {
    const res = await apiClient.post(`/sessions/${sessionId}/messages`, { role, content });
    return res.data;
  },
};

// ─── Agora ────────────────────────────────────────────────────────────────────

export const agoraService = {
  async getToken(sessionId: string): Promise<AgoraTokenResponse> {
    const res = await apiClient.post('/agora/token', null, { params: { session_id: sessionId } });
    return res.data;
  },

  async getAgentConfig(sessionId: string): Promise<AgentConfig> {
    const res = await apiClient.get(`/agora/agent-config/${sessionId}`);
    return res.data;
  },
};

// ─── Evaluation ───────────────────────────────────────────────────────────────

export const evaluationService = {
  async trigger(sessionId: string) {
    const res = await apiClient.post(`/sessions/${sessionId}/evaluate`);
    return res.data;
  },

  async get(sessionId: string): Promise<Evaluation> {
    const res = await apiClient.get(`/sessions/${sessionId}/evaluation`);
    return res.data;
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const res = await apiClient.get('/dashboard/summary');
    return res.data;
  },
};
