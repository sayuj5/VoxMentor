/**
 * AiOrb — Animated AI avatar orb for the VoxMentor session screen.
 * Pure CSS animations. No canvas/WebGL. States control animation intensity.
 */
import { type ReactNode } from 'react';

export type OrbState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'speaking'
  | 'listening'
  | 'recovering'
  | 'failed'
  | 'ending';

interface AiOrbProps {
  state: OrbState;
  icon?: ReactNode;
  size?: number; // px, default 96
}

const STATE_CONFIG: Record<OrbState, {
  rings: number;
  ringColor: string;
  coreGlow: string;
  coreBg: string;
  ringSpeed: string[];
  label: string;
}> = {
  idle: {
    rings: 0,
    ringColor: 'rgba(77,110,245,0.08)',
    coreGlow: '',
    coreBg: 'linear-gradient(135deg, #1e2540, #131829)',
    ringSpeed: [],
    label: 'Idle',
  },
  connecting: {
    rings: 2,
    ringColor: 'rgba(234,179,8,0.18)',
    coreGlow: '0 0 20px 4px rgba(234,179,8,0.25)',
    coreBg: 'linear-gradient(135deg, #1a1d2e, #242030)',
    ringSpeed: ['2.2s', '2.8s'],
    label: 'Connecting',
  },
  connected: {
    rings: 2,
    ringColor: 'rgba(77,110,245,0.2)',
    coreGlow: '0 0 24px 6px rgba(77,110,245,0.35)',
    coreBg: 'linear-gradient(135deg, #3a52ea, #2f3fd4)',
    ringSpeed: ['1.8s', '2.6s'],
    label: 'Connected',
  },
  speaking: {
    rings: 3,
    ringColor: 'rgba(77,110,245,0.3)',
    coreGlow: '0 0 36px 10px rgba(77,110,245,0.55)',
    coreBg: 'linear-gradient(135deg, #4d6ef5, #3a52ea)',
    ringSpeed: ['1.0s', '1.5s', '2.1s'],
    label: 'Speaking',
  },
  listening: {
    rings: 2,
    ringColor: 'rgba(34,211,238,0.2)',
    coreGlow: '0 0 28px 8px rgba(34,211,238,0.3)',
    coreBg: 'linear-gradient(135deg, #0891b2, #3a52ea)',
    ringSpeed: ['2.0s', '3.0s'],
    label: 'Listening',
  },
  recovering: {
    rings: 1,
    ringColor: 'rgba(251,146,60,0.2)',
    coreGlow: '0 0 20px 4px rgba(251,146,60,0.25)',
    coreBg: 'linear-gradient(135deg, #1a1d2e, #241f15)',
    ringSpeed: ['3s'],
    label: 'Recovering',
  },
  failed: {
    rings: 0,
    ringColor: 'rgba(239,68,68,0.1)',
    coreGlow: '0 0 12px 2px rgba(239,68,68,0.2)',
    coreBg: 'linear-gradient(135deg, #1a0f0f, #1a1d2e)',
    ringSpeed: [],
    label: 'Failed',
  },
  ending: {
    rings: 1,
    ringColor: 'rgba(77,110,245,0.1)',
    coreGlow: '0 0 12px 2px rgba(77,110,245,0.15)',
    coreBg: 'linear-gradient(135deg, #1e2540, #131829)',
    ringSpeed: ['3.5s'],
    label: 'Ending',
  },
};

export function AiOrb({ state, icon, size = 96 }: AiOrbProps) {
  const cfg = STATE_CONFIG[state];
  const half = size / 2;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size + 80, height: size + 80 }}
      role="img"
      aria-label={`VoxMentor AI — ${cfg.label}`}
    >
      {/* Pulse rings */}
      {cfg.rings > 0 &&
        Array.from({ length: cfg.rings }).map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute rounded-full"
            style={{
              width: size + 24 + i * 22,
              height: size + 24 + i * 22,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: cfg.ringColor,
              border: `1px solid ${cfg.ringColor}`,
              animation: `pulse-ring ${cfg.ringSpeed[i] ?? '2s'} ease-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}

      {/* Core orb */}
      <div
        className="relative z-10 rounded-full flex items-center justify-center select-none transition-all duration-500"
        style={{
          width: size,
          height: size,
          background: cfg.coreBg,
          boxShadow: cfg.coreGlow || 'none',
        }}
      >
        {/* Rotating highlight ring */}
        {state !== 'idle' && state !== 'failed' && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 70%, rgba(255,255,255,0.12) 85%, transparent 100%)',
              animation: `orb-spin ${state === 'speaking' ? '3s' : '8s'} linear infinite`,
            }}
          />
        )}

        {/* Inner content */}
        <span
          className="relative z-10 text-white"
          style={{ fontSize: half * 0.65 }}
        >
          {icon ?? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: half * 0.75, height: half * 0.75 }}
              aria-hidden="true"
            >
              <path d="M12 2a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
              <path d="M19 10a7 7 0 0 1-14 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="9" y1="22" x2="15" y2="22" />
            </svg>
          )}
        </span>
      </div>
    </div>
  );
}
