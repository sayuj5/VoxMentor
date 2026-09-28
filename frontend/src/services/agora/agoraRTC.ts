import AgoraRTC from 'agora-rtc-sdk-ng';
import type {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
  ConnectionState,
} from 'agora-rtc-sdk-ng';

let client: IAgoraRTCClient | null = null;
let micTrack: IMicrophoneAudioTrack | null = null;

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'recovering' | 'failed';

export interface AgoraSessionConfig {
  appId: string;
  token: string;
  channelName: string;
  uid: number;
  onConnectionStateChange?: (state: ConnectionStatus) => void;
  onError?: (error: string) => void;
}

export interface AgoraConnectionResult {
  connected: boolean;
  microphoneAvailable: boolean;
  microphoneError?: string;
}

// Safe SDK version log — helps diagnose compatibility issues
try {
  // AgoraRTC.VERSION is available on most SDK builds
  console.info('[AgoraRTC] SDK version:', (AgoraRTC as unknown as { VERSION?: string }).VERSION ?? 'unknown');
} catch { /* ignore */ }

export async function joinAgoraChannel(config: AgoraSessionConfig): Promise<AgoraConnectionResult> {
  // ── PRE-JOIN DIAGNOSTICS ──
  const appIdStr = String(config.appId || '');
  console.info('[AgoraRTC] joinAgoraChannel called.', {
    hasAppId: Boolean(config.appId),
    appIdLength: appIdStr.length,
    appIdPrefix: appIdStr.slice(0, 4) + '...',
    appIdSuffix: '...' + appIdStr.slice(-4),
    hasWhitespace: /\s/.test(appIdStr),
    hasQuotes: /['"]/.test(appIdStr),
    channelName: config.channelName,
    uid: config.uid,
    hasToken: Boolean(config.token),
    tokenLength: config.token?.length ?? 0,
  });

  if (!config.appId) {
    const msg = 'Agora App ID is missing. Cannot join channel.';
    console.error('[AgoraRTC]', msg);
    config.onConnectionStateChange?.('failed');
    config.onError?.(msg);
    throw new Error(msg);
  }

  if (!config.token) {
    const msg = 'RTC token is missing. Cannot join channel.';
    console.error('[AgoraRTC]', msg);
    config.onConnectionStateChange?.('failed');
    config.onError?.(msg);
    throw new Error(msg);
  }

  try {
    config.onConnectionStateChange?.('connecting');

    // Use 'rtc' mode with 'vp8' codec — compatible with Agora Conversation AI
    console.info('[AgoraRTC] Creating RTC client (mode=rtc, codec=vp8)...');
    client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    // ── Connection state changes ──
    client.on('connection-state-change', (curState: ConnectionState, reason?: string) => {
      console.info('[AgoraRTC] connection-state-change:', curState, reason ? `reason=${reason}` : '');
      if (curState === 'CONNECTED') config.onConnectionStateChange?.('connected');
      else if (curState === 'DISCONNECTED') config.onConnectionStateChange?.('disconnected');
      else if (curState === 'DISCONNECTING') config.onConnectionStateChange?.('disconnected');
      else if (curState === 'CONNECTING' || curState === 'RECONNECTING')
        config.onConnectionStateChange?.('connecting');
    });

    client.on('exception', (event) => {
      console.error('[AgoraRTC] exception event:', event);
      config.onError?.(`Voice session error: ${event.msg}`);
    });

    // ── Subscribe to remote users (AI agent audio) ──
    client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType) => {
      console.info('[AgoraRTC] user-published: uid=', user.uid, 'mediaType=', mediaType);
      if (mediaType === 'audio') {
        try {
          await client!.subscribe(user, 'audio');
          user.audioTrack?.play();
          console.info('[AgoraRTC] AI agent audio subscribed and playing. uid=', user.uid);
        } catch (subErr) {
          console.error('[AgoraRTC] Failed to subscribe to AI audio:', subErr);
        }
      }
    });

    client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType) => {
      console.info('[AgoraRTC] user-unpublished: uid=', user.uid, 'mediaType=', mediaType);
    });

    client.on('user-joined', (user: IAgoraRTCRemoteUser) => {
      console.info('[AgoraRTC] remote user joined: uid=', user.uid);
    });

    client.on('user-left', (user: IAgoraRTCRemoteUser, reason) => {
      console.info('[AgoraRTC] remote user left: uid=', user.uid, 'reason=', reason);
    });

    // ── Join the channel ──
    const appIdStr = String(config.appId || '');
    const tokenStr = String(config.token || '');
    
    console.info('[AgoraRTC] Calling client.join()... Diagnostics:', {
      appId: `${appIdStr.length} chars, starts with ${appIdStr.slice(0, 6)}`,
      channel: config.channelName,
      uid: config.uid,
      token: {
        exists: Boolean(config.token),
        length: tokenStr.length,
        prefix: tokenStr.slice(0, 3),
        suffix: tokenStr.slice(-6)
      }
    });

    await client.join(config.appId, config.channelName, config.token, config.uid);
    console.info('[AgoraRTC] client.join() succeeded. Channel:', config.channelName, 'UID:', config.uid);

    // ── Create and publish microphone track ──
    let micAvailable = false;
    let micErrorMsg: string | undefined;

    try {
      console.info('[AgoraRTC] microphone diagnostics: checking devices...');
      const devices = await AgoraRTC.getDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      console.info('[AgoraRTC] microphone diagnostics:', {
        deviceCount: devices.length,
        audioInputCount: audioInputs.length,
        hasLabels: audioInputs.some(d => Boolean(d.label)),
      });

      if (audioInputs.length === 0) {
        throw Object.assign(new Error('DEVICE_NOT_FOUND'), { code: 'DEVICE_NOT_FOUND' });
      }

      console.info('[AgoraRTC] Creating microphone audio track...');
      micTrack = await AgoraRTC.createMicrophoneAudioTrack();
      console.info('[AgoraRTC] Microphone track created. Publishing...');
      await client.publish([micTrack]);
      console.info('[AgoraRTC] Microphone track published successfully.');
      micAvailable = true;
    } catch (micError) {
      const me = micError as { code?: string; message?: string; name?: string };
      const code = me?.code ?? me?.name ?? 'UNKNOWN';
      const msg = me?.message ?? String(micError);
      console.error('[AgoraRTC] Microphone error — code:', code, 'message:', msg);
      micErrorMsg = code;
      // Do NOT throw. The connection is still valid.
      // AI audio can still be heard.
    }

    config.onConnectionStateChange?.('connected');
    
    return {
      connected: true,
      microphoneAvailable: micAvailable,
      microphoneError: micErrorMsg
    };
  } catch (error: unknown) {
    const agoraError = error as { code?: string; message?: string; name?: string };
    const code = agoraError?.code ?? agoraError?.name ?? 'UNKNOWN';
    const msg = agoraError?.message ?? String(error);

    console.error('[AgoraRTC] joinAgoraChannel FAILED.', {
      errorCode: code,
      errorMessage: msg,
      channelName: config.channelName,
      uid: config.uid,
      hasAppId: Boolean(config.appId),
      hasToken: Boolean(config.token),
    });

    // ── CAN_NOT_GET_GATEWAY_SERVER diagnosis ──
    if (code === 'CAN_NOT_GET_GATEWAY_SERVER') {
      console.error(
        '[AgoraRTC] CAN_NOT_GET_GATEWAY_SERVER — possible causes:',
        '1) Invalid or expired RTC token',
        '2) App ID does not match the token',
        '3) UID in token does not match uid passed to join()',
        '4) Network/WebSocket blocked (firewall, proxy)',
        '5) Agora gateway unavailable in this region',
        'Diagnostics:',
        {
          channelName: config.channelName,
          uid: config.uid,
          tokenLength: config.token?.length ?? 0,
          appIdPrefix: config.appId?.slice(0, 6) + '...',
        }
      );
    }

    // Categorise the error for the user
    let userMsg = `Voice connection failed (${code}).`;
    if (code === 'PERMISSION_DENIED' || msg.toLowerCase().includes('permission')) {
      userMsg = 'Microphone permission is required to start a voice session.';
    } else if (code === 'CAN_NOT_GET_GATEWAY_SERVER') {
      userMsg =
        'Cannot connect to voice server (CAN_NOT_GET_GATEWAY_SERVER). ' +
        'This usually means the session token has expired or the App ID is misconfigured. ' +
        'Please try again.';
    } else if (code === 'INVALID_TOKEN' || msg.toLowerCase().includes('token')) {
      userMsg = 'Voice session token is invalid or expired. Please try again.';
    } else if (code === 'UID_CONFLICT') {
      userMsg = 'Session conflict detected. Please end the session and try again.';
    } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('timeout')) {
      userMsg = 'Network error connecting to voice session. Check your connection.';
    }

    config.onConnectionStateChange?.('failed');
    config.onError?.(userMsg);
    throw error;
  }
}

export async function leaveAgoraChannel(): Promise<void> {
  try {
    if (micTrack) {
      micTrack.stop();
      micTrack.close();
      micTrack = null;
    }
    if (client) {
      await client.leave();
      client = null;
    }
    console.info('[AgoraRTC] leaveAgoraChannel complete.');
  } catch (error) {
    console.error('[AgoraRTC] leaveAgoraChannel error:', error);
  }
}

export function setMicrophoneMuted(muted: boolean): void {
  if (micTrack) {
    micTrack.setEnabled(!muted);
  }
}

export function isMicrophoneEnabled(): boolean {
  return micTrack?.enabled ?? false;
}

export function getConnectionState(): string {
  return client?.connectionState ?? 'DISCONNECTED';
}

export async function retryMicrophone(): Promise<boolean> {
  if (!client) {
    console.error('[AgoraRTC] retryMicrophone: No active Agora client.');
    return false;
  }
  if (micTrack) {
    return true; // Already exists
  }

  try {
    const devices = await AgoraRTC.getDevices();
    const audioInputs = devices.filter(d => d.kind === 'audioinput');
    if (audioInputs.length === 0) {
      console.error('[AgoraRTC] retryMicrophone: No audio input devices found.');
      return false;
    }

    console.info('[AgoraRTC] retryMicrophone: Creating microphone audio track...');
    micTrack = await AgoraRTC.createMicrophoneAudioTrack();
    await client.publish([micTrack]);
    console.info('[AgoraRTC] retryMicrophone: Microphone track published successfully.');
    return true;
  } catch (err) {
    const me = err as { code?: string; message?: string; name?: string };
    const code = me?.code ?? me?.name ?? 'UNKNOWN';
    console.error('[AgoraRTC] retryMicrophone failed:', code, me?.message);
    return false;
  }
}
