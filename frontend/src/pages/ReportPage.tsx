import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { evaluationService, sessionService } from '../services/apiServices';
import type { Evaluation, Session } from '../types';

const SCORE_COLOR = (score: number) =>
  score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';

const SCORE_BG = (score: number) =>
  score >= 80 ? 'bg-green-400' : score >= 60 ? 'bg-yellow-400' : 'bg-red-400';

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  if (score == null) return null;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-surface-muted">{label}</span>
        <span className={`font-semibold ${SCORE_COLOR(score)}`}>{score}</span>
      </div>
      <div className="h-2 bg-surface-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${SCORE_BG(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

const MODE_SCORE_LABELS: Record<string, Record<string, string>> = {
  technical_interview: { technical_score: 'Technical Knowledge', communication_score: 'Communication', relevance_score: 'Answer Relevance', confidence_score: 'Confidence' },
  hr_interview: { communication_score: 'Communication', relevance_score: 'Relevance', confidence_score: 'Confidence' },
  learning_mentor: { technical_score: 'Understanding', communication_score: 'Engagement', relevance_score: 'Concept Accuracy' },
  communication_coach: { communication_score: 'Clarity & Fluency', relevance_score: 'Structure', confidence_score: 'Conciseness' },
};

export default function ReportPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    sessionService.get(sessionId).then(setSession).catch(() => {});

    // Poll for evaluation (it's generated async)
    const poll = async () => {
      for (let i = 0; i < 20; i++) {
        try {
          const ev = await evaluationService.get(sessionId!);
          setEvaluation(ev);
          setIsLoading(false);
          return;
        } catch (error: any) {
          if (error.response && error.response.status !== 404) {
            // Not a simple "not found yet" error
            setIsLoading(false);
            setNotReady(true);
            return;
          }
          await new Promise(r => setTimeout(r, 3000));
        }
      }
      setIsLoading(false);
      setNotReady(true);
    };
    poll();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white font-medium">Generating your assessment...</p>
      </div>
    );
  }

  if (notReady && !evaluation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-4xl">⏳</p>
        <p className="text-xl font-semibold">Report not ready yet</p>
        <p className="text-surface-muted max-w-sm">Your evaluation is still being generated or is temporarily unavailable. Please check back in a moment.</p>
        <div className="flex gap-3">
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
          <Link to="/dashboard" className="btn-secondary">Back to History</Link>
        </div>
      </div>
    );
  }

  if (evaluation?.status === 'failed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-4xl">⚠️</p>
        <p className="text-xl font-semibold">Assessment unavailable</p>
        <p className="text-surface-muted max-w-sm">Something went wrong while generating your assessment.</p>
        <div className="flex gap-3 mt-4">
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
          <Link to="/dashboard" className="btn-secondary">Back to History</Link>
        </div>
      </div>
    );
  }

  if (evaluation?.status === 'incomplete') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-4xl">📋</p>
        <p className="text-xl font-semibold">Session Incomplete</p>
        <p className="text-surface-muted max-w-md">
          Your session ended before enough user responses were recorded to generate a reliable assessment.
        </p>
        <p className="text-surface-muted max-w-md text-sm mt-2">
          This does not mean you scored 0. VoxMentor simply did not have enough conversation data to evaluate your performance.
        </p>
        <div className="flex gap-3 mt-6">
          <Link to="/session/new" className="btn-primary">Start New Session</Link>
          <Link to="/history" className="btn-secondary">Back to History</Link>
        </div>
      </div>
    );
  }

  if (!evaluation) return null;

  const modeKey = session?.mode || 'technical_interview';
  const scoreLabels = MODE_SCORE_LABELS[modeKey] || MODE_SCORE_LABELS.technical_interview;

  return (
    <div className="max-w-2xl animate-slide-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Session Report</h1>
          <p className="text-surface-muted text-sm mt-0.5">{session?.topic} · {session?.mode.replace(/_/g, ' ')}</p>
        </div>
        <Link to="/history" className="btn-ghost text-sm">← All Sessions</Link>
      </div>

      {/* Overall Score */}
      <div className="card text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-transparent pointer-events-none" />
        <p className="text-surface-muted text-sm mb-2 uppercase tracking-wider">Overall Score</p>
        <p className={`text-7xl font-black ${SCORE_COLOR(evaluation.overall_score || 0)}`}>{evaluation.overall_score}</p>
        <p className="text-surface-muted mt-1">/100</p>
        <div className="mt-4 h-2 bg-surface-border rounded-full overflow-hidden mx-8">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${SCORE_BG(evaluation.overall_score || 0)}`}
            style={{ width: `${evaluation.overall_score || 0}%` }}
          />
        </div>
      </div>

      {/* Category Scores */}
      <div className="card space-y-4">
        <h2 className="section-title">Category Breakdown</h2>
        {Object.entries(scoreLabels).map(([key, label]) => (
          <ScoreBar
            key={key}
            label={label}
            score={evaluation[key as keyof Evaluation] as number | null}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="card">
        <h2 className="section-title mb-3">AI Mentor Summary</h2>
        <p className="text-surface-muted leading-relaxed">{evaluation.summary}</p>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h2 className="section-title mb-3 text-green-400">✓ Strengths</h2>
          <ul className="space-y-2">
            {evaluation.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-green-400 mt-0.5">✓</span>
                <span className="text-surface-muted">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="section-title mb-3 text-orange-400">△ Areas to Improve</h2>
          <ul className="space-y-2">
            {evaluation.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-orange-400 mt-0.5">•</span>
                <span className="text-surface-muted">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card">
        <h2 className="section-title mb-3">📌 Actionable Recommendations</h2>
        <ol className="space-y-2 list-decimal list-inside">
          {evaluation.recommendations.map((r, i) => (
            <li key={i} className="text-sm text-surface-muted">{r}</li>
          ))}
        </ol>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link to="/session/new" className="btn-primary flex-1 text-center">Practice Again</Link>
        <Link to="/history" className="btn-secondary flex-1 text-center">View History</Link>
      </div>
    </div>
  );
}
