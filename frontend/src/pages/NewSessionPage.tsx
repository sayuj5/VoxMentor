import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sessionService } from '../services/apiServices';
import { getErrorMessage } from '../services/api';

const MODES = [
  { value: 'technical_interview', label: 'Technical Interview', icon: '💻', description: 'Coding, algorithms, system design' },
  { value: 'hr_interview', label: 'HR Interview', icon: '🤝', description: 'Behavioral & situational' },
  { value: 'learning_mentor', label: 'Learning Mentor', icon: '📚', description: 'Explore concepts interactively' },
  { value: 'communication_coach', label: 'Communication Coach', icon: '🎤', description: 'Clarity, fluency & structure' },
];

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const DURATIONS = [
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
  { value: 1200, label: '20 min' },
];

export default function NewSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultMode = searchParams.get('mode') || 'technical_interview';

  const [mode, setMode] = useState(defaultMode);
  const [topic, setTopic] = useState('General');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [duration, setDuration] = useState(600);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const session = await sessionService.create(mode, topic, difficulty, duration);
      navigate(`/session/${session.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl animate-slide-up">
      <div className="mb-6">
        <h1 className="page-title">Configure Your Session</h1>
        <p className="text-surface-muted mt-1">Set up your AI mentor session below.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mode */}
        <div>
          <label className="label">Session Mode</label>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`p-4 rounded-xl border text-left transition-all duration-150 ${
                  mode === m.value
                    ? 'border-brand-500 bg-brand-600/20 text-white'
                    : 'border-surface-border bg-surface-card text-surface-muted hover:border-surface-muted'
                }`}
              >
                <span className="text-2xl block mb-1">{m.icon}</span>
                <p className="font-semibold text-sm">{m.label}</p>
                <p className="text-xs mt-0.5 opacity-70">{m.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div>
          <label className="label" htmlFor="topic">Topic</label>
          <input
            id="topic"
            type="text"
            className="input"
            placeholder="e.g. Python, System Design, REST APIs, Leadership..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />
        </div>

        {/* Difficulty */}
        <div>
          <label className="label">Difficulty</label>
          <div className="flex gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDifficulty(d.value)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 ${
                  difficulty === d.value
                    ? 'border-brand-500 bg-brand-600/20 text-brand-400'
                    : 'border-surface-border text-surface-muted hover:border-surface-muted'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="label">Duration</label>
          <div className="flex gap-3">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDuration(d.value)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 ${
                  duration === d.value
                    ? 'border-brand-500 bg-brand-600/20 text-brand-400'
                    : 'border-surface-border text-surface-muted hover:border-surface-muted'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <button id="start-session-btn" type="submit" className="btn-primary w-full py-3 text-base" disabled={isLoading}>
          {isLoading ? 'Creating session...' : '▶ Start Session'}
        </button>
      </form>
    </div>
  );
}
