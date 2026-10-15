import React, { useRef, useState, useEffect, useCallback } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';

/**
 * Reusable Jitsi meeting component for MedConnect consultations.
 * Solves iframe height collapse, handles the complete meeting lifecycle,
 * guarantees camera/mic visibility, and cleans up resources reliably.
 */
const JitsiMeetingPanel = ({
  domain = 'meet.jit.si',
  roomName,
  displayName = 'MedConnect User',
  email = '',
  userRole = 'patient',
  appointment,
  onMeetingJoined,
  onMeetingLeft,
  onStateChange
}) => {
  const apiRef = useRef(null);
  const containerRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Meeting Lifecycle State: 'initializing' | 'loading' | 'ready_to_join' | 'connected' | 'error' | 'left'
  const [meetingState, setMeetingState] = useState('initializing');
  const [participantCount, setParticipantCount] = useState(1);
  const [permissionError, setPermissionError] = useState(null);
  const [networkWarning, setNetworkWarning] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [connectionTimeout, setConnectionTimeout] = useState(false);

  // Notify parent of state transitions
  const updateMeetingState = useCallback((newState) => {
    setMeetingState(newState);
    if (typeof onStateChange === 'function') {
      onStateChange(newState);
    }
  }, [onStateChange]);

  // Clean up Jitsi API instance on unmount or retry
  const cleanupApiInstance = useCallback(() => {
    if (apiRef.current) {
      try {
        apiRef.current.dispose();
      } catch (err) {
        console.warn('Error during Jitsi API disposal:', err);
      }
      apiRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupApiInstance();
    };
  }, [cleanupApiInstance]);

  // Enforce full-height iframe styling directly into DOM
  const applyIframeDimensions = useCallback((element) => {
    if (!element) return;
    try {
      element.style.position = 'absolute';
      element.style.inset = '0';
      element.style.width = '100%';
      element.style.height = '100%';
      element.style.minHeight = '100%';

      const iframe = element.tagName === 'IFRAME' ? element : element.querySelector('iframe');
      if (iframe) {
        iframe.style.position = 'absolute';
        iframe.style.inset = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.minHeight = '100%';
        iframe.style.border = 'none';

        // Ensure permissions policy is explicitly set on iframe
        iframe.setAttribute(
          'allow',
          'camera; microphone; display-capture; autoplay; clipboard-write; encrypted-media; fullscreen; speaker-selection; screen-wake-lock'
        );
      }
    } catch (e) {
      console.warn('Non-blocking error styling Jitsi iframe:', e);
    }
  }, []);

  // Monitor loading timeout
  useEffect(() => {
    setConnectionTimeout(false);
    updateMeetingState('loading');

    // If after 25 seconds the user hasn't reached ready_to_join or connected, show helpful retry guidance
    retryTimeoutRef.current = setTimeout(() => {
      setConnectionTimeout((prev) => {
        if (meetingState !== 'connected' && meetingState !== 'ready_to_join') {
          return true;
        }
        return prev;
      });
    }, 25000);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [retryKey, updateMeetingState]);

  const handleApiReady = useCallback((externalApi) => {
    apiRef.current = externalApi;

    // Immediately enforce iframe dimensions
    try {
      const iframe = externalApi.getIFrame();
      if (iframe) {
        applyIframeDimensions(iframe);
        if (iframe.parentElement) {
          applyIframeDimensions(iframe.parentElement);
        }
      }
    } catch (err) {
      console.warn('Could not immediately style externalApi iframe:', err);
    }

    // Jitsi prejoin screen loaded
    externalApi.on('prejoinScreenLoaded', () => {
      updateMeetingState('ready_to_join');
      setConnectionTimeout(false);
    });

    // Fallback: If prejoin event does not fire within 3s but API is loaded, mark ready_to_join
    setTimeout(() => {
      setMeetingState((current) => {
        if (current === 'loading' || current === 'initializing') {
          if (typeof onStateChange === 'function') onStateChange('ready_to_join');
          return 'ready_to_join';
        }
        return current;
      });
    }, 3000);

    // Conference joined (user clicked "Join meeting" or entered directly)
    externalApi.on('videoConferenceJoined', (event) => {
      updateMeetingState('connected');
      setPermissionError(null);
      setConnectionTimeout(false);
      if (typeof onMeetingJoined === 'function') {
        onMeetingJoined(event);
      }
    });

    // Participant events
    externalApi.on('participantJoined', () => {
      setParticipantCount((prev) => prev + 1);
    });

    externalApi.on('participantLeft', () => {
      setParticipantCount((prev) => Math.max(1, prev - 1));
    });

    // User left call
    externalApi.on('videoConferenceLeft', () => {
      updateMeetingState('left');
      if (typeof onMeetingLeft === 'function') {
        onMeetingLeft();
      }
    });

    externalApi.on('readyToClose', () => {
      updateMeetingState('left');
      if (typeof onMeetingLeft === 'function') {
        onMeetingLeft();
      }
    });

    // Device / Media Permission Errors
    externalApi.on('cameraError', (error) => {
      console.warn('Jitsi camera error event:', error);
      setPermissionError(
        'Camera access was denied or the camera is in use by another app. Please grant camera permission in your browser address bar (lock icon) and click Retry.'
      );
      updateMeetingState('error');
    });

    externalApi.on('micError', (error) => {
      console.warn('Jitsi microphone error event:', error);
      setPermissionError(
        'Microphone access was denied or the microphone is unavailable. Please check your browser audio permissions in the address bar.'
      );
    });

    // Network disconnection events
    externalApi.on('connectionFailed', () => {
      setNetworkWarning(true);
      updateMeetingState('error');
    });

    externalApi.on('suspendDetected', () => {
      setNetworkWarning(true);
    });
  }, [applyIframeDimensions, onMeetingJoined, onMeetingLeft, onStateChange, updateMeetingState]);

  // Safe manual retry
  const handleRetry = () => {
    cleanupApiInstance();
    setPermissionError(null);
    setNetworkWarning(false);
    setConnectionTimeout(false);
    updateMeetingState('initializing');
    setRetryKey((prev) => prev + 1);
  };

  // Custom loading component matching MedConnect design system (#635BFF, #8B5CF6, #F7F8FC)
  const CustomLoadingSpinner = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F172A] text-white z-20 p-6">
      <div className="relative w-16 h-16 mb-5">
        <div className="absolute inset-0 rounded-full border-4 border-[#635BFF]/20 animate-ping"></div>
        <div className="absolute inset-0 rounded-full border-4 border-t-[#635BFF] border-r-[#8B5CF6] border-b-transparent border-l-transparent animate-spin"></div>
        <div className="absolute inset-2 rounded-full bg-[#1E293B] flex items-center justify-center">
          <span className="material-symbols-outlined text-[24px] text-[#8B5CF6]">videocam</span>
        </div>
      </div>
      <h3 className="text-lg font-bold tracking-tight text-white mb-1">
        Initializing Video Consultation
      </h3>
      <p className="text-sm text-slate-400 max-w-sm text-center mb-4">
        Connecting to room <code className="text-purple-300 font-mono font-semibold">{roomName}</code>. Setting up media streams and pre-join preview...
      </p>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Secure Peer Connection Initializing</span>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col h-full relative" ref={containerRef}>
      {/* Device Permission Error Banner */}
      {permissionError && (
        <div className="mb-3 p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-100 flex items-start justify-between gap-3 text-sm shadow-md">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[22px] text-amber-400 shrink-0 mt-0.5">videocam_off</span>
            <div>
              <span className="font-semibold block text-amber-300 mb-0.5">Camera / Microphone Access Required</span>
              <p className="text-amber-200/90 text-xs leading-relaxed">{permissionError}</p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold shrink-0 transition-colors border border-amber-500/30 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Retry Device
          </button>
        </div>
      )}

      {/* Network Warning Banner */}
      {networkWarning && (
        <div className="mb-3 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-100 flex items-start justify-between gap-3 text-sm shadow-md">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[20px] text-rose-400 shrink-0 mt-0.5">signal_disconnected</span>
            <div className="text-xs">
              <span className="font-semibold block text-rose-300 mb-0.5">Unstable Network Connection</span>
              Experiencing packet loss with conference bridge. Video resolution automatically downgraded to prioritize audio clarity.
            </div>
          </div>
          <button
            onClick={() => setNetworkWarning(false)}
            className="text-rose-400 hover:text-rose-200 text-xs underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Slow Connection / Timeout Prompt */}
      {connectionTimeout && meetingState !== 'connected' && (
        <div className="mb-3 p-3.5 rounded-xl bg-purple-900/40 border border-purple-500/40 text-purple-200 flex items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-purple-400">info</span>
            <span>Taking longer than expected to connect to public conference bridge.</span>
          </div>
          <button
            onClick={handleRetry}
            className="px-3 py-1 rounded-lg bg-primary hover:bg-secondary text-white text-xs font-medium transition-colors flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Reload Meeting
          </button>
        </div>
      )}

      {/* Main Jitsi Meeting Viewport Container */}
      <div
        className="jitsi-meeting-viewport w-full h-[660px] sm:h-[700px] md:h-[740px] rounded-2xl bg-[#0A0E1A] shadow-2xl border border-slate-800 relative overflow-hidden"
        style={{ position: 'relative' }}
      >
        <JitsiMeeting
          key={`jitsi-instance-${retryKey}`}
          domain={domain}
          roomName={roomName}
          spinner={CustomLoadingSpinner}
          onApiReady={handleApiReady}
          userInfo={{
            displayName: displayName,
            email: email
          }}
          configOverwrite={{
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            prejoinConfig: {
              enabled: true
            },
            prejoinPageEnabled: true,
            enableWelcomePage: false,
            enableClosePage: false,
            disableInviteFunctions: true,
            hideConferenceSubject: true,
            toolbarButtons: [
              'microphone',
              'camera',
              'closedcaptions',
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'hangup',
              'chat',
              'raisehand',
              'videoquality',
              'filmstrip',
              'tileview',
              'select-background',
              'settings'
            ]
          }}
          interfaceConfigOverwrite={{
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            TOOLBAR_ALWAYS_VISIBLE: false,
            DEFAULT_REMOTE_DISPLAY_NAME: 'Consultation Participant'
          }}
          getIFrameRef={(wrapperElement) => {
            if (wrapperElement) {
              applyIframeDimensions(wrapperElement);
            }
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="mt-3 py-2.5 px-4 rounded-xl bg-surface-container-low border border-outline-variant/40 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              meetingState === 'connected'
                ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                : meetingState === 'ready_to_join'
                ? 'bg-amber-400 animate-pulse'
                : meetingState === 'error'
                ? 'bg-rose-500'
                : 'bg-indigo-400 animate-pulse'
            }`}
          ></span>

          <span className="font-semibold text-on-surface">
            {meetingState === 'connected' && 'Live Telehealth Session Active'}
            {meetingState === 'ready_to_join' && 'Waiting Room • Click "Join meeting" in conference frame to enter'}
            {meetingState === 'loading' && 'Establishing Encrypted Media Streams...'}
            {meetingState === 'initializing' && 'Preparing Room...'}
            {meetingState === 'error' && 'Connection / Device Issue'}
            {meetingState === 'left' && 'Call Concluded'}
          </span>

          <span className="text-outline">·</span>
          <span>{participantCount} {participantCount === 1 ? 'participant' : 'participants'} in room</span>
        </div>

        <div className="flex items-center gap-2">
          {meetingState === 'ready_to_join' && (
            <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">touch_app</span>
              Click Join inside video box
            </span>
          )}

          <button
            onClick={handleRetry}
            className="p-1 rounded text-outline hover:text-primary transition-colors text-xs flex items-center gap-1"
            title="Reload Video Session"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            <span className="hidden sm:inline">Reload</span>
          </button>

          <span className="text-outline font-mono text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded">
            {roomName}
          </span>
        </div>
      </div>
    </div>
  );
};

export default JitsiMeetingPanel;
