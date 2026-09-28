import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Briefcase, Brain, GraduationCap, MessageSquare,
  TrendingUp, CheckCircle, Activity, ArrowRight, Mic,
} from 'lucide-react';
import { useAuth } from '../stores/AuthContext';
import { dashboardService } from '../services/apiServices';
import type { Session } from '../types';

const MODE_CONFIG: Record<string, {
  label: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  glow: string;
}> = {
  technical_interview: {
    label:       'Technical Interview',
    description: 'Practice coding & system design questions',
    icon:        <Briefcase className="w-6 h-6" />,
    gradient:    'linear-gradient(135deg, #3a52ea, #4d6ef5)',
    glow:        'rgba(77,110,245,0.3)',
  },
  hr_interview: {
    label:       'HR Interview',
    description: 'Behavioral & situational questions',
    icon:        <Brain className="w-6 h-6" />,
    gradient:    'linear-gradient(135deg, #7c3aed, #a855f7)',
    glow:        'rgba(168,85,247,0.3)',
  },
  learning_mentor: {
    label:       'Learning Mentor',
    description: 'Explore and deeply understand concepts',
    icon:        <GraduationCap className="w-6 h-6" />,
    gradient:    'linear-gradient(135deg, #059669, #10b981)',
    glow:        'rgba(16,185,129,0.3)',
  },
  communication_coach: {
    label:       'Communication Coach',
    description: 'Improve clarity, fluency, and confidence',
    icon:        <MessageSquare className="w-6 h-6" />,
    gradient:    'linear-gradient(135deg, #d97706, #f59e0b)',
    glow:        'rgba(245,158,11,0.3)',
  },
};

const SESSION_MODES = Object.entries(MODE_CONFIG).map(([mode, cfg]) => ({ mode, ...cfg }));

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  completed: { bg: 'rgba(34,197,94,0.1)',  color: '#4ade80', label: 'Completed' },
  active:    { bg: 'rgba(77,110,245,0.1)', color: '#7090fa', label: 'Active' },
  created:   { bg: 'rgba(234,179,8,0.1)', color: '#facc15', label: 'Created' },
  starting:  { bg: 'rgba(234,179,8,0.1)', color: '#facc15', label: 'Starting' },
  recovering:{ bg: 'rgba(249,115,22,0.1)', color: '#fb923c', label: 'Recovering' },
  failed:    { bg: 'rgba(239,68,68,0.1)', color: '#f87171', label: 'Failed' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { bg: 'rgba(137,146,176,0.1)', color: '#8892b0', label: status };
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-medium capitalize"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function SessionCard({ session }: { session: Session }) {
  const modeCfg = MODE_CONFIG[session.mode];
  return (
    <Link
      to={session.status === 'completed' ? `/session/${session.id}/report` : `/session/${session.id}`}
      className="flex items-center justify-between p-4 rounded-xl transition-all duration-200 group"
      style={{
        background: 'rgba(14,20,36,0.6)',
        border: '1px solid rgba(30,37,64,0.8)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(77,110,245,0.3)';
        (e.currentTarget as HTMLElement).style.background = 'rgba(14,20,36,0.8)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(30,37,64,0.8)';
        (e.currentTarget as HTMLElement).style.background = 'rgba(14,20,36,0.6)';
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ background: modeCfg?.gradient ?? '#3a52ea' }}
        >
          <span className="w-5 h-5">{modeCfg?.icon}</span>
        </div>
        <div>
          <p className="font-medium text-sm text-white">{modeCfg?.label ?? session.mode}</p>
          <p className="text-xs text-surface-muted">
            {session.topic} · {new Date(session.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={session.status} />
        <ArrowRight className="w-4 h-4 text-surface-muted group-hover:text-brand-400 transition-colors" aria-hidden="true" />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn:  dashboardService.getSummary,
  });

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-surface-muted mt-1 text-sm">Ready to practice? Choose a session below.</p>
      </div>

      {/* Stats row */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-24 rounded-xl animate-pulse"
              style={{ background: 'rgba(14,20,36,0.7)', border: '1px solid rgba(30,37,64,0.6)' }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              value: summary?.total_sessions ?? 0,
              label: 'Total Sessions',
              icon: <Activity className="w-5 h-5" />,
              color: '#7090fa',
            },
            {
              value: summary?.completed_sessions ?? 0,
              label: 'Completed',
              icon: <CheckCircle className="w-5 h-5" />,
              color: '#4ade80',
            },
            {
              value: summary?.average_score != null ? `${summary.average_score}%` : '—',
              label: 'Avg Score',
              icon: <TrendingUp className="w-5 h-5" />,
              color: '#34d399',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-5 rounded-xl text-center"
              style={{
                background: 'rgba(14,20,36,0.7)',
                border: '1px solid rgba(30,37,64,0.6)',
              }}
            >
              <div className="flex justify-center mb-2" style={{ color: stat.color }} aria-hidden="true">
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-surface-muted text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Start Session */}
      <div>
        <h2 className="section-title mb-4">Start a New Session</h2>
        <div className="grid grid-cols-2 gap-4">
          {SESSION_MODES.map((m) => (
            <Link
              key={m.mode}
              to={`/session/new?mode=${m.mode}`}
              className="p-5 rounded-xl transition-all duration-200 group block"
              style={{
                background: 'rgba(14,20,36,0.7)',
                border: '1px solid rgba(30,37,64,0.6)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(77,110,245,0.35)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px -8px ${m.glow}`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(30,37,64,0.6)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: m.gradient, boxShadow: `0 4px 16px ${m.glow}` }}
                >
                  {m.icon}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm group-hover:text-brand-300 transition-colors">
                    {m.label}
                  </p>
                  <p className="text-surface-muted text-xs mt-0.5">{m.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Start session →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Sessions</h2>
          <Link to="/history" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-16 rounded-xl animate-pulse"
                style={{ background: 'rgba(14,20,36,0.6)', border: '1px solid rgba(30,37,64,0.6)' }}
              />
            ))}
          </div>
        ) : summary?.recent_sessions.length === 0 ? (
          <div
            className="rounded-xl py-12 text-center"
            style={{ background: 'rgba(14,20,36,0.7)', border: '1px solid rgba(30,37,64,0.6)' }}
          >
            <Mic className="w-10 h-10 text-surface-muted mx-auto mb-3 opacity-40" aria-hidden="true" />
            <p className="text-surface-muted text-sm">No sessions yet. Start your first one above!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {summary?.recent_sessions.map(s => <SessionCard key={s.id} session={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
