import { supabase } from '../lib/supabase';

/**
 * Service for authorizing, securing, and managing MedConnect video consultations.
 */

/**
 * Returns the configured Jitsi domain from environment variables, defaulting to meet.jit.si
 */
export const getJitsiDomain = () => {
  return import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si';
};

/**
 * Generates a deterministic, collision-free, non-PII room name for a specific appointment.
 * Guarantees that both doctor and patient connect to the identical room,
 * while preventing leaks of patient/doctor names or clinical diagnosis.
 */
export const generateDeterministicRoomName = (appointmentId) => {
  if (!appointmentId) throw new Error('Appointment ID is required to generate room name');
  // Normalize UUID / alphanumeric identifier: medconnect-consult-<appointmentId>
  const sanitizedId = String(appointmentId).replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
  return `medconnect-consult-${sanitizedId}`;
};

/**
 * Checks if the appointment is eligible for online video consultation.
 */
export const validateAppointmentEligibility = (appointment) => {
  if (!appointment) {
    return { eligible: false, reason: 'Appointment does not exist.' };
  }

  // 1. Mode check
  if (appointment.mode !== 'online') {
    return {
      eligible: false,
      reason: 'This appointment is scheduled for an In-Person clinic visit, not a video telehealth call.'
    };
  }

  // 2. Status checks
  if (appointment.status === 'cancelled') {
    return {
      eligible: false,
      reason: 'This appointment has been cancelled and cannot be joined.'
    };
  }

  if (appointment.status === 'completed') {
    return {
      eligible: false,
      reason: 'This consultation has already concluded and marked as completed.'
    };
  }

  if (appointment.status === 'pending') {
    return {
      eligible: false,
      reason: 'This appointment is pending doctor confirmation. You will be able to join once confirmed.'
    };
  }

  if (appointment.status !== 'confirmed') {
    return {
      eligible: false,
      reason: `This appointment is not active (current status: ${appointment.status}).`
    };
  }

  // 3. Time window check
  // Telehealth calls are typically joinable on the appointment date, starting 30 minutes before start_time
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const aptDateStr = appointment.appointment_date;
    
    // If appointment is not today, check if date has passed or is in future
    if (aptDateStr && aptDateStr !== todayStr) {
      const today = new Date(todayStr);
      const aptDate = new Date(aptDateStr);
      
      if (aptDate < today) {
        return {
          eligible: false,
          reason: `This appointment was scheduled for ${aptDateStr} and has already passed.`
        };
      } else if (aptDate > today) {
        return {
          eligible: false,
          reason: `This consultation is scheduled for ${aptDateStr}. You can join once the date arrives.`
        };
      }
    }
  } catch (timeErr) {
    console.warn('Date validation warning:', timeErr);
  }

  return { eligible: true };
};

/**
 * Validates the current user session against the appointment and retrieves authorized details.
 */
export const authorizeAndFetchAppointment = async (appointmentId, currentProfile) => {
  if (!currentProfile) {
    return {
      authorized: false,
      error: 'You must be signed in to access this video consultation.'
    };
  }

  if (!appointmentId) {
    return {
      authorized: false,
      error: 'Invalid consultation request: Missing appointment identifier.'
    };
  }

  try {
    // Fetch appointment with doctor and patient profiles
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctors (
          id,
          qualification,
          license_number,
          profiles ( id, first_name, last_name, email, phone, profile_image ),
          specializations ( name )
        ),
        patients (
          id,
          profile_id,
          blood_group,
          allergies,
          profiles ( id, first_name, last_name, email, phone, profile_image )
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (error || !appointment) {
      console.error('Error fetching appointment:', error);
      return {
        authorized: false,
        error: 'Appointment not found or you do not have permission to view it.'
      };
    }

    // Role and ownership resolution
    const patientProfileId = appointment.patients?.profiles?.id;
    const doctorProfileId = appointment.doctors?.profiles?.id;

    const isPatient = currentProfile.id === patientProfileId;
    const isDoctor = currentProfile.id === doctorProfileId;
    const isAdmin = currentProfile.role === 'admin';

    if (!isPatient && !isDoctor && !isAdmin) {
      return {
        authorized: false,
        error: 'Access Denied: You are not assigned as the patient or doctor for this consultation.'
      };
    }

    // Eligibility validation (mode, status, date)
    const eligibility = validateAppointmentEligibility(appointment);
    if (!eligibility.eligible) {
      return {
        authorized: false,
        error: eligibility.reason,
        appointment
      };
    }

    const roomName = generateDeterministicRoomName(appointment.id);
    const domain = getJitsiDomain();

    // Determine current user's display name and role for Jitsi
    let displayName = 'Participant';
    if (isDoctor) {
      displayName = `Dr. ${currentProfile.first_name || ''} ${currentProfile.last_name || ''}`.trim();
    } else if (isPatient) {
      displayName = `${currentProfile.first_name || ''} ${currentProfile.last_name || ''}`.trim() || 'Patient';
    } else if (isAdmin) {
      displayName = `Admin ${currentProfile.first_name || ''}`.trim();
    }

    return {
      authorized: true,
      appointment,
      roomName,
      domain,
      userRole: isDoctor ? 'doctor' : (isPatient ? 'patient' : 'admin'),
      displayName,
      email: currentProfile.email || ''
    };
  } catch (err) {
    console.error('Unexpected error during consultation authorization:', err);
    return {
      authorized: false,
      error: 'An unexpected system error occurred while verifying consultation access.'
    };
  }
};

/**
 * Retrieves or registers a video_sessions record in Supabase.
 * Uses defensive fallback if session table access fails, ensuring call is not abruptly blocked.
 */
export const getOrCreateVideoSession = async (appointmentId, roomName, domain) => {
  try {
    // 1. Check if video session already exists
    const { data: existingSession, error: fetchErr } = await supabase
      .from('video_sessions')
      .select('*')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (existingSession) {
      return { session: existingSession, error: null };
    }

    // 2. If not found, attempt to insert session metadata
    const meetingUrl = `https://${domain}/${roomName}`;
    const { data: newSession, error: insertErr } = await supabase
      .from('video_sessions')
      .insert({
        appointment_id: appointmentId,
        meeting_id: roomName,
        meeting_url: meetingUrl,
        status: 'scheduled'
      })
      .select()
      .maybeSingle();

    if (insertErr) {
      console.warn('Could not record video_session in database (may be handled by existing or restricted policy):', insertErr.message);
      return { session: null, error: insertErr };
    }

    // Link back to appointments.video_session_id if possible
    if (newSession?.id) {
      await supabase
        .from('appointments')
        .update({ video_session_id: newSession.id })
        .eq('id', appointmentId)
        .catch(() => {});
    }

    return { session: newSession, error: null };
  } catch (err) {
    console.warn('Non-blocking error accessing video_sessions table:', err);
    return { session: null, error: err };
  }
};

/**
 * Updates video session status (e.g. marked in_progress when call connects).
 * Note: One participant leaving does NOT mark session completed.
 */
export const markVideoSessionInProgress = async (appointmentId) => {
  try {
    await supabase
      .from('video_sessions')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('appointment_id', appointmentId)
      .eq('status', 'scheduled');
  } catch (err) {
    console.warn('Unable to update session status to in_progress:', err);
  }
};
