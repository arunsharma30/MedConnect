import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  authorizeAndFetchAppointment,
  getOrCreateVideoSession,
  markVideoSessionInProgress
} from '../services/videoConsultationService';
import JitsiMeetingPanel from '../components/video/JitsiMeetingPanel';

/**
 * Dedicated Video Consultation Page for MedConnect.
 * Gated by Supabase authentication and appointment authorization.
 */
const VideoConsultationPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();

  const [authData, setAuthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [showSecurityNotice, setShowSecurityNotice] = useState(true);
  const [meetingState, setMeetingState] = useState('initializing');

  // Authorize user and retrieve appointment data
  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      if (authLoading) return;

      if (!profile) {
        setError('Authentication required: Please sign in to access your consultation.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await authorizeAndFetchAppointment(appointmentId, profile);

      if (!isMounted) return;

      if (!result.authorized) {
        setError(result.error || 'Access Denied: You are not authorized to view this consultation.');
        setLoading(false);
        return;
      }

      setAuthData(result);

      // Register or fetch video_sessions record
      const sessionResult = await getOrCreateVideoSession(
        result.appointment.id,
        result.roomName,
        result.domain
      );
      if (isMounted && sessionResult?.session) {
        setSessionInfo(sessionResult.session);
      }

      setLoading(false);
    };

    verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [appointmentId, profile, authLoading]);

  // Handle meeting join confirmation
  const handleMeetingJoined = () => {
    if (appointmentId) {
      markVideoSessionInProgress(appointmentId);
    }
  };

  // Handle user leaving the consultation
  const handleLeaveCall = () => {
    // Return to the corresponding dashboard or appointment list based on role
    if (authData?.userRole === 'doctor') {
      navigate('/doctor/dashboard');
    } else {
      navigate('/patient/appointments');
    }
  };

  // Loading View
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FC] flex flex-col items-center justify-center p-6 text-on-surface">
        <div className="max-w-md w-full bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/60 shadow-lg flex flex-col items-center text-center space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-secondary border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[28px]">verified_user</span>
            </div>
          </div>
          <div>
            <h2 className="text-headline-sm font-headline-sm font-bold text-on-surface">
              Verifying Consultation Access
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Checking cryptographic identity, doctor/patient assignment, and appointment status...
            </p>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-secondary h-full w-2/3 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error / Unauthorized View
  if (error || !authData) {
    return (
      <div className="min-h-screen bg-[#F7F8FC] flex flex-col items-center justify-center p-6 text-on-surface">
        <div className="max-w-md w-full bg-surface-container-lowest p-8 rounded-2xl border border-error/30 shadow-lg flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-error mb-1">
            <span className="material-symbols-outlined text-[32px]">no_meeting_room</span>
          </div>
          <div>
            <h2 className="text-headline-sm font-headline-sm font-bold text-on-surface">
              Consultation Unavailable
            </h2>
            <p className="text-body-sm text-error/90 mt-2 p-3 rounded-xl bg-error/5 border border-error/10 text-left">
              {error}
            </p>
          </div>
          <p className="text-body-xs text-on-surface-variant">
            If you believe this is a technical error, please verify that your appointment has been confirmed and that you are logged into the correct MedConnect account.
          </p>
          <button
            onClick={() => {
              if (profile?.role === 'doctor') {
                navigate('/doctor/dashboard');
              } else {
                navigate('/patient/appointments');
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-secondary text-on-primary font-medium text-label-md transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Return to Appointments
          </button>
        </div>
      </div>
    );
  }

  const { appointment, roomName, domain, userRole, displayName, email } = authData;
  const isDoctor = userRole === 'doctor';
  const otherPartyName = isDoctor
    ? `${appointment.patients?.profiles?.first_name || ''} ${appointment.patients?.profiles?.last_name || ''}`.trim() || 'Patient'
    : `Dr. ${appointment.doctors?.profiles?.first_name || ''} ${appointment.doctors?.profiles?.last_name || ''}`.trim() || 'Physician';

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col">
      {/* Top Consultation Navigation Header */}
      <header className="h-16 px-4 md:px-8 bg-[#111827]/90 border-b border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#635BFF] to-[#8B5CF6] flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-[20px] text-white">videocam</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <span>Telehealth Consultation with {otherPartyName}</span>
                {meetingState === 'connected' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Call
                  </span>
                )}
                {meetingState === 'ready_to_join' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Waiting Room
                  </span>
                )}
                {(meetingState === 'loading' || meetingState === 'initializing') && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                    Connecting
                  </span>
                )}
                {meetingState === 'error' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    Alert
                  </span>
                )}
              </h1>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>Appointment #{appointment.appointment_number}</span>
              <span>•</span>
              <span>{appointment.appointment_date}</span>
              <span>•</span>
              <span className="text-purple-300 capitalize">{appointment.mode} HD Video</span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSecurityNotice(!showSecurityNotice)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs hidden sm:flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Toggle Privacy & Security Details"
          >
            <span className="material-symbols-outlined text-[16px] text-purple-400">shield</span>
            <span>Security Info</span>
          </button>

          <button
            onClick={handleLeaveCall}
            className="py-1.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs md:text-sm transition-all shadow-md flex items-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">call_end</span>
            <span>Leave Call</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-3 md:p-6 flex flex-col max-w-7xl w-full mx-auto">
        {/* Waiting Room Action Banner */}
        {meetingState === 'ready_to_join' && (
          <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-primary/20 via-secondary/15 to-transparent border border-primary/40 text-xs text-slate-200 flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">meeting_room</span>
              </div>
              <div>
                <span className="font-semibold text-white block">You are in the Consultation Waiting Room</span>
                <span>Verify your camera and microphone preview below, then click the blue <strong className="text-purple-300">"Join meeting"</strong> button inside the video screen to begin.</span>
              </div>
            </div>
          </div>
        )}

        {/* Security and Room Boundary Notice */}
        {showSecurityNotice && (
          <div className="mb-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-[#8B5CF6] shrink-0 mt-0.5">lock</span>
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-100 block">
                  Encrypted Clinical Telehealth Session (Deterministic Room ID)
                </span>
                <p className="text-slate-400 leading-relaxed">
                  MedConnect application-level authorization verifies that only the designated patient and doctor can access this consultation link.
                  No recording is active. Room identifier: <code className="text-purple-300 font-mono">{roomName}</code>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSecurityNotice(false)}
              className="text-slate-400 hover:text-slate-200 text-xs shrink-0"
              title="Close notice"
            >
              ✕
            </button>
          </div>
        )}

        {/* Video Meeting Panel Container */}
        <div className="flex-grow flex flex-col w-full">
          <JitsiMeetingPanel
            domain={domain}
            roomName={roomName}
            displayName={displayName}
            email={email}
            userRole={userRole}
            appointment={appointment}
            onMeetingJoined={handleMeetingJoined}
            onMeetingLeft={handleLeaveCall}
            onStateChange={setMeetingState}
          />
        </div>
      </main>
    </div>
  );
};

export default VideoConsultationPage;
