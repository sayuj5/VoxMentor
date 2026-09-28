import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Mic, MicOff, Square, AlertCircle, RefreshCw,
  Briefcase, GraduationCap, Brain, MessageSquare, WifiOff,
} from 'lucide-react';
import { sessionService, evaluationService } from '../services/apiServices';
import {
  joinAgoraChannel,
  leaveAgoraChannel,
  setMicrophoneMuted,
  retryMicrophone,
  type ConnectionStatus,
} from '../services/agora/agoraRTC';
import { getErrorMessage } from '../services/api';
import { AiOrb, type OrbState } from '../components/ui/ai-orb';
import { ShinyButton } from '../components/ui/shiny-button';
import type { AgoraTokenResponse } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL STATE — survives React component remounts and Strict Mode cycles
// ─────────────────────────────────────────────────────────────────────────────
const pendingStartPromises = new Map<string, Promise<AgoraTokenResponse>>();
const connectionCache      = new Map<string, AgoraTokenResponse>();

// ─────────────────────────────────────────────────────────────────────────────
// Mode config
// ─────────────────────────────────────────────────────────────────────────────
const MODE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  technical_interview:  { label: 'Technical Interview',  icon: <Briefcase  className="w-5 h-5" />, color: '#4d6ef5' },
  hr_interview:         { label: 'HR Interview',         icon: <Brain      className="w-5 h-5" />, color: '#a855f7' },
  learning_mentor:      { label: 'Learning Mentor',      icon: <GraduationCap className="w-5 h-5" />, color: '#10b981' },
  communication_coach:  { label: 'Communication Coach',  icon: <MessageSquare className="w-5 h-5" />, color: '#f59e0b' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Status display helpers
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_TEXT: Record<ConnectionStatus, string> = {
  idle:         'Ready to connect',
  connecting:   'Connecting to VoxMentor...',
  connected:    'Voice session active',
  disconnected: 'Voice session disconnected',
  recovering:   'Recovering your voice session...',
  failed:       'Connection failed',
};

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  idle:         '#8892b0',
  connecting:   '#eab308',
  connected:    '#22c55e',
  disconnected: '#f97316',
  recovering:   '#f97316',
  failed:       '#ef4444',
};

function statusToOrbState(s: ConnectionStatus): OrbState {
  switch (s) {
    case 'connected':    return 'connected';
    case 'connecting':   return 'connecting';
    case 'recovering':   return 'recovering';
    case 'failed':       return 'failed';
    case 'disconnected': return 'ending';
    default:             return 'idle';
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// getOrStartSession — issues POST /start at most ONCE per sessionId.
// Handles STARTING/RECOVERING server states without calling /start again.
// ─────────────────────────────────────────────────────────────────────────────
async function getOrStartSession(sessionId: string): Promise<AgoraTokenResponse> {
  // 1. Already have connection data?
  if (connectionCache.has(sessionId)) {
    console.info('[SessionInit] CACHE_HIT', { sessionId });
    return connectionCache.get(sessionId)!;
  }

  // 2. /start already in-flight (Strict Mode race guard)?
  if (pendingStartPromises.has(sessionId)) {
    console.info('[SessionInit] AWAIT_EXISTING_PROMISE', { sessionId });
    return pendingStartPromises.get(sessionId)!;
  }

  // 3. First call — preflight check server status, then call /start once.
  const startPromise = (async (): Promise<AgoraTokenResponse> => {
    const serverSession = await sessionService.get(sessionId);
    console.info('[SessionInit]', { sessionId, serverStatus: serverSession.status });

    // Terminal states — cannot start
    if (serverSession.status === 'completed' || serverSession.status === 'ending') {
      throw new Error(`Cannot start a session that is already ${serverSession.status}. Please create a new session.`);
    }
    if (serverSession.status === 'failed') {
      throw new Error('This session has failed. Please create a new session.');
    }

    // STARTING or RECOVERING — do NOT call /start again; enter recovery flow
    if (serverSession.status === 'starting' || serverSession.status === 'recovering') {
      throw Object.assign(
        new Error('Connecting to VoxMentor is taking longer than expected.'),
        { code: 'RECOVERING' }
      );
    }

    // ACTIVE — call /start for recovery (returns existing connection on backend)
    // CREATED — call /start normally
    console.info('[SessionInit] CALLING_START_ENDPOINT', { sessionId });
    const startData = await sessionService.start(sessionId);

    // Handle RECOVERING response from backend (Agora timeout)
    if (startData.recovering || !startData.connection) {
      throw Object.assign(
        new Error(startData.message ?? 'Connecting to VoxMentor is taking longer than expected.'),
        { code: 'RECOVERING' }
      );
    }

    const { connection } = startData;
    connectionCache.set(sessionId, connection);

    console.info('[SessionInit] START_SUCCESS', {
      sessionId,
      channel: connection.channel_name,
      uid: connection.uid,
      hasToken: Boolean(connection.token),
      appIdPrefix: connection.app_id?.slice(0, 6) + '...',
    });

    return connection;
  })();

  // Store BEFORE await — this is the Strict Mode guard
  pendingStartPromises.set(sessionId, startPromise);
  return startPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function SessionPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [isMuted,          setIsMuted]          = useState(false);
  const [isMicAvailable,   setIsMicAvailable]   = useState(true);
  const [errorMsg,         setErrorMsg]          = useState('');
  const [elapsed,          setElapsed]           = useState(0);
  const [isEnding,         setIsEnding]          = useState(false);
  const [confirmEnd,       setConfirmEnd]        = useState(false);

  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const agoraJoinedRef = useRef(false);
  const recoveryRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn:  () => sessionService.get(sessionId!),
    enabled:  !!sessionId,
    refetchOnWindowFocus: false,
    refetchOnMount:       false,
    staleTime: Infinity,
  });

  const modeConfig = session ? (MODE_CONFIG[session.mode] ?? MODE_CONFIG.technical_interview) : null;

  // ── joinWithConnection ──────────────────────────────────────────────────────
  const joinWithConnection = useCallback(async (connection: AgoraTokenResponse) => {
    if (agoraJoinedRef.current) {
      console.info('[SessionPage] Already joined, skipping duplicate Agora join.');
      return;
    }
    agoraJoinedRef.current = true;

    try {
      setConnectionStatus('connecting');
      const result = await joinAgoraChannel({
        appId:       connection.app_id,
        token:       connection.token,
        channelName: connection.channel_name,
        uid:         connection.uid,
        onConnectionStateChange: (s) => {
          console.info('[SessionPage] Agora connection state →', s);
          setConnectionStatus(s);
        },
        onError: (msg) => {
          console.error('[SessionPage] Agora onError:', msg);
          setErrorMsg(msg);
        },
      });

      setIsMicAvailable(result.microphoneAvailable);
      if (result.microphoneError) {
        console.warn('[SessionPage] Mic failed after join:', result.microphoneError);
      }

      if (!timerRef.current) {
        timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
      }
    } catch (err) {
      console.error('[SessionPage] Agora join threw:', err);
      agoraJoinedRef.current = false;
      setErrorMsg(getErrorMessage(err));
      setConnectionStatus('failed');
    }
  }, []);

  // ── Recovery polling — poll every 3s up to 30s for ACTIVE status ───────────
  const startRecoveryPolling = useCallback((sid: string) => {
    if (recoveryRef.current) return; // already polling
    setConnectionStatus('recovering');
    let attempts = 0;
    const MAX = 10;

    recoveryRef.current = setInterval(async () => {
      attempts++;
      try {
        const serverSession = await sessionService.get(sid);
        console.info('[AGORA_RECOVERY] poll', { status: serverSession.status, attempt: attempts });

        if (serverSession.status === 'active') {
          clearInterval(recoveryRef.current!);
          recoveryRef.current = null;
          // Call /start again — backend will return existing connection (recovery path)
          const startData = await sessionService.start(sid);
          if (startData.connection) {
            connectionCache.set(sid, startData.connection);
            await joinWithConnection(startData.connection);
          }
          return;
        }

        if (serverSession.status === 'failed' || attempts >= MAX) {
          clearInterval(recoveryRef.current!);
          recoveryRef.current = null;
          setConnectionStatus('failed');
          setErrorMsg(
            serverSession.status === 'failed'
              ? 'VoxMentor could not connect. Please end this session and try again.'
              : 'Connecting to VoxMentor is taking longer than expected. Please try again.'
          );
        }
      } catch (err) {
        console.error('[AGORA_RECOVERY] poll error:', err);
      }
    }, 3000);
  }, [joinWithConnection]);

  // ── initSession ─────────────────────────────────────────────────────────────
  const initSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const connection = await getOrStartSession(sessionId);
      await joinWithConnection(connection);
    } catch (err) {
      const errObj = err as { code?: string; message?: string };
      if (errObj?.code === 'RECOVERING') {
        console.warn('[SessionPage] Entering recovery mode:', errObj.message);
        startRecoveryPolling(sessionId);
      } else {
        const msg = getErrorMessage(err);
        console.error('[SessionPage] initSession error:', msg);
        setErrorMsg((prev) => prev || msg);
        setConnectionStatus('failed');
      }
    }
  }, [sessionId, joinWithConnection, startRecoveryPolling]);

  useEffect(() => {
    initSession();
    return () => {
      if (timerRef.current)   clearInterval(timerRef.current);
      if (recoveryRef.current) clearInterval(recoveryRef.current);
      leaveAgoraChannel();
    };
  }, [initSession]);

  // ── Retry Agora join (uses cached credentials only) ─────────────────────────
  const handleRetry = useCallback(() => {
    if (!sessionId) return;
    setErrorMsg('');
    setConnectionStatus('idle');
    agoraJoinedRef.current = false;
    if (recoveryRef.current) {
      clearInterval(recoveryRef.current);
      recoveryRef.current = null;
    }

    const cached = connectionCache.get(sessionId);
    if (cached) {
      joinWithConnection(cached);
    } else {
      // Remove stale promise so next initSession can re-query server status
      pendingStartPromises.delete(sessionId);
      initSession();
    }
  }, [sessionId, joinWithConnection, initSession]);

  // ── Retry microphone only ────────────────────────────────────────────────────
  const handleMicRetry = useCallback(async () => {
    const success = await retryMicrophone();
    if (success) {
      setIsMicAvailable(true);
    } else {
      setErrorMsg('Still cannot access the microphone. Check your browser permissions.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  }, []);

  // ── End session ─────────────────────────────────────────────────────────────
  const endMutation = useMutation({
    mutationFn: async () => {
      await leaveAgoraChannel();
      if (timerRef.current)    clearInterval(timerRef.current);
      if (recoveryRef.current) clearInterval(recoveryRef.current);
      await sessionService.end(sessionId!);
      await evaluationService.trigger(sessionId!);
    },
    onSuccess: () => {
      if (sessionId) {
        pendingStartPromises.delete(sessionId);
        connectionCache.delete(sessionId);
      }
      navigate(`/session/${sessionId}/report`);
    },
    onError: (err) => {
      setErrorMsg(getErrorMessage(err));
      setIsEnding(false);
    },
  });

  const handleEndSession = () => {
    if (!confirmEnd) { setConfirmEnd(true); return; }
    setIsEnding(true);
    endMutation.mutate();
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setMicrophoneMuted(next);
  };

  const isConnected = connectionStatus === 'connected';
  const isRecovering = connectionStatus === 'recovering';
  const orbState = statusToOrbState(connectionStatus);

  // User-friendly error messages per state
  const friendlyError = (() => {
    if (!errorMsg) return '';
    if (errorMsg.toLowerCase().includes('another tab')) return 'This practice session is already active in another tab.';
    if (errorMsg.toLowerCase().includes('gateway') || errorMsg.toLowerCase().includes('appid')) return 'VoxMentor could not connect. Please check your network and try again.';
    if (errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('timeout')) return 'Your network connection appears unstable. Please try again.';
    return errorMsg;
  })();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(58,82,234,0.08) 0%, transparent 60%), var(--color-surface)',
      }}
    >
      <div className="w-full max-w-lg animate-fade-in">

        {/* Session header */}
        <div className="text-center mb-6">
          {modeConfig && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <span style={{ color: modeConfig.color }}>{modeConfig.icon}</span>
              <span className="text-sm font-medium" style={{ color: modeConfig.color }}>
                {modeConfig.label}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-white">VoxMentor AI</h1>
          {session?.topic && (
            <p className="text-surface-muted text-sm mt-1">{session.topic}</p>
          )}
        </div>

        {/* Main card */}
        <div
          className="relative overflow-hidden p-8 text-center"
          style={{
            background: isConnected
              ? 'linear-gradient(180deg, rgba(58,82,234,0.06) 0%, rgba(14,20,36,0.98) 60%), rgba(14,20,36,0.98)'
              : 'rgba(14,20,36,0.98)',
            border: `1px solid ${isConnected ? 'rgba(77,110,245,0.25)' : 'rgba(30,37,64,0.8)'}`,
            borderRadius: 24,
            boxShadow: isConnected
              ? '0 0 0 1px rgba(77,110,245,0.1), 0 24px 48px -8px rgba(0,0,0,0.6)'
              : '0 24px 48px -8px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
            transition: 'border-color 0.5s, box-shadow 0.5s',
          }}
        >
          {/* AI Orb */}
          <div className="flex justify-center mb-4">
            <AiOrb state={orbState} size={88} />
          </div>

          {/* AI Name */}
          <p className="font-semibold text-lg text-white mb-1">VoxMentor AI</p>

          {/* Connection badge */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: STATUS_COLOR[connectionStatus],
                boxShadow: isConnected || isRecovering
                  ? `0 0 6px 1px ${STATUS_COLOR[connectionStatus]}`
                  : 'none',
                animation: (isConnected || connectionStatus === 'connecting' || isRecovering)
                  ? 'pulse 1.8s cubic-bezier(0.4,0,0.6,1) infinite'
                  : 'none',
              }}
            />
            <span className="text-sm font-medium" style={{ color: STATUS_COLOR[connectionStatus] }}>
              {STATUS_TEXT[connectionStatus]}
            </span>
          </div>

          {/* Timer */}
          <div
            className="text-4xl font-mono font-bold mb-6"
            style={{ color: isConnected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}
            aria-live="polite"
            aria-label={`Session duration: ${formatTime(elapsed)}`}
          >
            {formatTime(elapsed)}
          </div>

          {/* Connection error */}
          {friendlyError && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl text-sm flex items-start gap-2 text-left"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <span>{friendlyError}</span>
                {connectionStatus === 'failed' && (
                  <button
                    onClick={handleRetry}
                    className="ml-2 underline font-medium hover:text-red-300 transition-colors"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Recovering indicator */}
          {isRecovering && !friendlyError && (
            <div
              className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#fb923c' }}
            >
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
              <span>Recovering your voice session — please wait...</span>
            </div>
          )}

          {/* Mic unavailable */}
          {!isMicAvailable && isConnected && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl text-sm text-left"
              style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', color: '#fbbf24' }}
            >
              <p className="font-semibold mb-0.5 flex items-center gap-1.5">
                <WifiOff className="w-4 h-4" aria-hidden="true" />
                Microphone not found
              </p>
              <p className="text-xs opacity-80 mb-2">
                VoxMentor is connected, but no microphone was detected. Check your connection and browser permissions.
              </p>
              <button
                onClick={handleMicRetry}
                className="text-xs underline font-semibold hover:text-yellow-300 transition-colors"
              >
                Retry Microphone
              </button>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-2">
            {/* Mute button */}
            <button
              id="mute-btn"
              onClick={toggleMute}
              disabled={!isConnected || !isMicAvailable}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              aria-pressed={isMuted}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isMuted ? 'rgba(239,68,68,0.15)' : 'rgba(30,37,64,0.8)',
                borderColor: isMuted ? 'rgba(239,68,68,0.4)' : 'rgba(30,37,64,0.8)',
                color: isMuted ? '#f87171' : 'white',
              }}
            >
              {isMuted
                ? <MicOff className="w-5 h-5" aria-hidden="true" />
                : <Mic    className="w-5 h-5" aria-hidden="true" />}
            </button>

            {/* End session */}
            <ShinyButton
              id="end-session-btn"
              variant="danger"
              onClick={handleEndSession}
              disabled={isEnding}
              isLoading={isEnding}
              aria-label="End practice session"
            >
              <Square className="w-4 h-4" aria-hidden="true" />
              <span>{isEnding ? 'Ending...' : confirmEnd ? 'Confirm End' : 'End Session'}</span>
            </ShinyButton>
          </div>

          {confirmEnd && !isEnding && (
            <p className="text-surface-muted text-xs mt-3">
              Click again to confirm. Your session will be evaluated by AI.
            </p>
          )}
        </div>

        {/* Tips — shown when connected */}
        {isConnected && (
          <div
            className="mt-4 p-4 rounded-xl text-sm text-surface-muted animate-fade-in"
            style={{
              background: 'rgba(14,20,36,0.7)',
              border: '1px solid rgba(30,37,64,0.6)',
            }}
          >
            <p className="font-medium text-white mb-2 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-brand-400" aria-hidden="true" />
              Tips for a great session
            </p>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>Speak clearly after the AI finishes — there's a short pause</li>
              <li>Answer thoroughly — the AI adapts to your responses in real-time</li>
              <li>End the session when you're ready for your AI evaluation</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
