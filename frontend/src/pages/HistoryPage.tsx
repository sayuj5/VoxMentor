import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { sessionService } from '../services/apiServices';
import type { Session } from '../types';

const MODE_LABELS: Record<string, string> = {
  technical_interview: 'Technical Interview',
  hr_interview: 'HR Interview',
  learning_mentor: 'Learning Mentor',
  communication_coach: 'Communication Coach',
};

const MODE_ICONS: Record<string, string> = {
  technical_interview: '💻',
  hr_interview: '🤝',
  learning_mentor: '📚',
  communication_coach: '🎤',
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function SessionRow({ session }: { session: Session }) {
  const statusColors: Record<string, string> = {
    completed: 'badge-success',
    active: 'badge-info',
    created: 'badge-warning',
    failed: 'badge-error',
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-surface-border hover:border-surface-muted transition-all duration-150 group">
      <div className="flex items-center gap-4">
        <span className="text-2xl">{MODE_ICONS[session.mode] || '🎙️'}</span>
        <div>
          <p className="font-medium text-sm">{MODE_LABELS[session.mode]}</p>
          <p className="text-xs text-surface-muted mt-0.5">{session.topic} · {new Date(session.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-surface-muted">{formatDuration(session.duration)}</span>
        <span className={`badge ${statusColors[session.status] || 'badge-muted'}`}>{session.status}</span>
        {session.status === 'completed' && (
          <Link
            to={`/session/${session.id}/report`}
            className="text-brand-400 hover:text-brand-300 text-sm font-medium"
          >
            View Report →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', page],
    queryFn: () => sessionService.list(page, 10),
  });

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Session History</h1>
          <p className="text-surface-muted mt-1">
            {data ? `${data.total} sessions total` : 'Loading...'}
          </p>
        </div>
        <Link to="/session/new" className="btn-primary">+ New Session</Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-surface-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data?.sessions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-lg font-semibold">No sessions yet</p>
          <p className="text-surface-muted text-sm mt-1">Start your first session to see it here.</p>
          <Link to="/session/new" className="btn-primary inline-block mt-4">Start a Session</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.sessions.map(s => <SessionRow key={s.id} session={s} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-4 py-2 text-sm"
          >
            ← Prev
          </button>
          <span className="text-surface-muted text-sm">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
