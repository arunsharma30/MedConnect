import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import PatientLayout from '../components/PatientLayout';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import PaymentModal from '../components/PaymentModal';

const AppointmentBooking = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Parse URL search parameters
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialDoctorId = searchParams.get('doctor_id') || '';
  const initialDate = searchParams.get('date') || '';
  const initialTime = searchParams.get('time') || '';
  const initialMode = searchParams.get('mode') || 'online';
  const initialReason = searchParams.get('reason') || '';

  // Core State
  const [patientRecord, setPatientRecord] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId);
  const [doctor, setDoctor] = useState(null);
  const [allDoctors, setAllDoctors] = useState([]);
  const [loadingDoctor, setLoadingDoctor] = useState(false);
  const [doctorError, setDoctorError] = useState(null);

  // Booking Form State
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [mode, setMode] = useState(initialMode); // 'online' | 'offline'
  const [reason, setReason] = useState(initialReason);
  const [symptoms, setSymptoms] = useState('');

  // Slots State
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Submission & Feedback
  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState(null);

  // Payment Integration
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // 1. Fetch Patient Record from profiles
  const fetchPatientRecord = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, profile_id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPatientRecord(data);
      } else if (profile.role === 'patient') {
        // Fallback auto-provision if record is missing
        const { data: newPatient, error: insErr } = await supabase
          .from('patients')
          .insert({ profile_id: profile.id })
          .select('id, profile_id')
          .single();
        if (!insErr && newPatient) {
          setPatientRecord(newPatient);
        }
      }
    } catch (err) {
      console.error('Error fetching patient record:', err);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchPatientRecord();
    }
  }, [profile?.id]);

  // 2. Fetch All Doctors for directory selector
  const fetchAllDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          consultation_fee,
          rating,
          total_reviews,
          hospital_id,
          profiles!inner(first_name, last_name, profile_image, city, state),
          specializations(name),
          hospitals!doctors_hospital_id_fkey(name)
        `)
        .order('rating', { ascending: false });

      if (!error && data) {
        setAllDoctors(data);
      }
    } catch (err) {
      console.error('Error fetching doctors list:', err);
    }
  };

  useEffect(() => {
    fetchAllDoctors();
  }, []);

  // 3. Keep selectedDoctorId in sync with URL
  useEffect(() => {
    const docId = searchParams.get('doctor_id');
    if (docId && docId !== selectedDoctorId) {
      setSelectedDoctorId(docId);
    }
  }, [searchParams, selectedDoctorId]);

  // 4. Fetch Selected Doctor Details when selectedDoctorId changes
  const fetchDoctorDetails = async (id) => {
    setLoadingDoctor(true);
    setDoctorError(null);
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          bio,
          qualification,
          experience,
          years_experience,
          verification_status,
          consultation_fee,
          rating,
          total_reviews,
          hospital_id,
          profiles!inner(first_name, last_name, profile_image, city, state, phone, email),
          specializations(name, description),
          hospitals!doctors_hospital_id_fkey(id, name, address, city, state),
          doctor_availability(day, start_time, end_time, slot_duration, is_available)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setDoctorError('The requested doctor was not found in the directory.');
        setDoctor(null);
      } else {
        setDoctor(data);
        if (!initialMode) {
          setMode(data.hospital_id ? 'online' : 'online');
        }
      }
    } catch (err) {
      console.error('Error fetching doctor details:', err);
      setDoctorError(err.message || 'Unable to load doctor information.');
    } finally {
      setLoadingDoctor(false);
    }
  };

  useEffect(() => {
    if (selectedDoctorId) {
      fetchDoctorDetails(selectedDoctorId);
    } else {
      setDoctor(null);
      setDoctorError(null);
    }
  }, [selectedDoctorId]);

  // 5. Generate Available Dates for Selected Doctor (Next 21 days)
  const availableDates = useMemo(() => {
    if (!doctor || !doctor.doctor_availability || doctor.doctor_availability.length === 0) {
      return [];
    }

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const activeRules = doctor.doctor_availability.filter(r => r.is_available);
    if (activeRules.length === 0) return [];

    const dates = [];
    const today = new Date();

    for (let i = 0; i < 21; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);

      const dayName = daysOfWeek[targetDate.getDay()];
      const matchingRules = activeRules.filter(r => r.day === dayName);

      if (matchingRules.length > 0) {
        const isoDate = targetDate.toISOString().split('T')[0];
        let label = '';
        if (i === 0) label = 'Today';
        else if (i === 1) label = 'Tomorrow';
        else label = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

        dates.push({
          date: isoDate,
          label,
          weekday: targetDate.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNum: targetDate.getDate(),
          month: targetDate.toLocaleDateString('en-US', { month: 'short' }),
          rules: matchingRules,
        });
      }
    }

    return dates;
  }, [doctor]);

  // Auto-select first date if none selected or if selected date is invalid
  useEffect(() => {
    if (availableDates.length > 0) {
      const isDateValid = availableDates.some(d => d.date === selectedDate);
      if (!selectedDate || !isDateValid) {
        setSelectedDate(availableDates[0].date);
      }
    }
  }, [availableDates, selectedDate]);

  // 6. Fetch Booked Slots when Date or Doctor changes
  const fetchBookedSlots = async (docId, date) => {
    setLoadingSlots(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('start_time')
        .eq('doctor_id', docId)
        .eq('appointment_date', date)
        .not('status', 'in', '(cancelled,no_show)');

      if (error) throw error;
      if (data) {
        setBookedSlots(data.map(item => item.start_time.substring(0, 5)));
      }
    } catch (err) {
      console.error('Error fetching booked slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      fetchBookedSlots(selectedDoctorId, selectedDate);
    } else {
      setBookedSlots([]);
    }
  }, [selectedDoctorId, selectedDate]);

  // 7. Calculate Available Time Slots for Selected Date
  const timeSlots = useMemo(() => {
    if (!doctor || !selectedDate) return [];

    const selectedDateObj = availableDates.find(d => d.date === selectedDate);
    if (!selectedDateObj) return [];

    const now = new Date();
    const isToday = selectedDate === now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const slots = [];
    const seenTimes = new Set();

    selectedDateObj.rules.forEach(rule => {
      const duration = Number(rule.slot_duration) || 30;
      let current = new Date(`${selectedDate}T${rule.start_time}`);
      const end = new Date(`${selectedDate}T${rule.end_time}`);

      while (current < end) {
        const timeString24 = current.toTimeString().substring(0, 5); // "HH:MM"
        const [hours, minutes] = timeString24.split(':').map(Number);
        const slotMinutes = hours * 60 + minutes;

        // Prevent past slots if date is today
        const isPast = isToday && (slotMinutes <= currentMinutes + 10); // 10 min buffer
        const isAlreadyBooked = bookedSlots.includes(timeString24);

        if (!seenTimes.has(timeString24) && !isPast && !isAlreadyBooked) {
          seenTimes.add(timeString24);

          const period = hours >= 12 ? 'PM' : 'AM';
          const displayH = hours % 12 === 0 ? 12 : hours % 12;
          const displayM = minutes.toString().padStart(2, '0');
          const label = `${displayH}:${displayM} ${period}`;

          slots.push({
            time24: timeString24,
            label,
            isMorning: hours < 12,
            isAfternoon: hours >= 12 && hours < 17,
            isEvening: hours >= 17,
          });
        }

        current.setMinutes(current.getMinutes() + duration);
      }
    });

    return slots.sort((a, b) => a.time24.localeCompare(b.time24));
  }, [doctor, selectedDate, availableDates, bookedSlots]);

  // Keep selectedTime valid
  useEffect(() => {
    if (selectedTime && timeSlots.length > 0) {
      const exists = timeSlots.some(s => s.time24 === selectedTime);
      if (!exists && !initialTime) {
        setSelectedTime('');
      }
    }
  }, [timeSlots, selectedTime, initialTime]);

  // 8. Handle Booking Submission
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setErrorNotice(null);

    if (!patientRecord?.id) {
      setErrorNotice('Patient account record is missing. Please re-authenticate as a patient.');
      return;
    }
    if (!doctor?.id) {
      setErrorNotice('Please select a doctor to book with.');
      return;
    }
    if (!selectedDate) {
      setErrorNotice('Please select an appointment date.');
      return;
    }
    if (!selectedTime) {
      setErrorNotice('Please choose an available appointment time slot.');
      return;
    }

    setSubmitting(true);

    try {
      // Step A: Real-time conflict safeguard
      const { data: conflict, error: conflictErr } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctor.id)
        .eq('appointment_date', selectedDate)
        .eq('start_time', selectedTime.length === 5 ? `${selectedTime}:00` : selectedTime)
        .not('status', 'in', '(cancelled,no_show)')
        .maybeSingle();

      if (conflictErr) throw conflictErr;
      if (conflict) {
        throw new Error('This time slot was just booked by another patient. Please choose another time.');
      }

      // Step B: Calculate end_time based on doctor's slot_duration
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const slotDuration = doctor.doctor_availability?.[0]?.slot_duration || 30;
      const endDateTime = new Date(0, 0, 0, hours, minutes + slotDuration);
      const endTime = `${endDateTime.toTimeString().substring(0, 5)}:00`;
      const startTime = selectedTime.length === 5 ? `${selectedTime}:00` : selectedTime;

      // Unique appointment number
      const aptNumber = `APT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // Step C: Insert Appointment into Supabase
      const { data: newAppointment, error: insertError } = await supabase
        .from('appointments')
        .insert({
          appointment_number: aptNumber,
          patient_id: patientRecord.id,
          doctor_id: doctor.id,
          hospital_id: mode === 'offline' ? doctor.hospital_id : null,
          appointment_date: selectedDate,
          start_time: startTime,
          end_time: endTime,
          mode: mode,
          status: 'pending',
          payment_status: 'pending',
          reason: reason.trim() || 'General Consultation',
          symptoms: symptoms.trim() || null,
        })
        .select(`
          id,
          appointment_number,
          appointment_date,
          start_time,
          end_time,
          mode,
          status,
          payment_status,
          reason,
          symptoms,
          created_at,
          doctors:doctor_id (
            id,
            consultation_fee,
            profiles ( first_name, last_name, profile_image ),
            specializations ( name )
          )
        `)
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('This appointment slot is already reserved. Please select a different time.');
        }
        throw insertError;
      }

      setConfirmedAppointment(newAppointment);
    } catch (err) {
      console.error('Booking submission failed:', err);
      setErrorNotice(err.message || 'Failed to book appointment. Please try again.');
      // Refresh booked slots in case of collision
      if (doctor?.id && selectedDate) {
        fetchBookedSlots(doctor.id, selectedDate);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Helper formatting functions
  const formatDoctorName = (doc) => {
    if (!doc?.profiles) return 'Doctor';
    const first = doc.profiles.first_name || '';
    const last = doc.profiles.last_name || '';
    const cleanFirst = first.replace(/^dr\.?\s+/i, '');
    return `Dr. ${cleanFirst} ${last}`.trim();
  };

  const formatDisplayDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const formatSlotTime = (time24) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <PatientLayout>
      <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4 space-y-6">
        
        {/* Top Navigation & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/40 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                onClick={() => navigate('/patient/doctors')}
                className="inline-flex items-center gap-1 text-label-md text-primary hover:text-secondary font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back to Find a Doctor</span>
              </button>
            </div>
            <h1 className="text-headline-md font-bold text-on-surface">Book an Appointment</h1>
            <p className="text-body-sm text-on-surface-variant">
              Schedule a video consultation or clinic visit with verified medical specialists.
            </p>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-2">
            <Link
              to="/patient/appointments"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low text-label-md font-medium transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>My Appointments</span>
            </Link>
          </div>
        </div>

        {/* Global Error Notice */}
        {errorNotice && (
          <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error flex items-start gap-3 animate-fade-in shadow-xs">
            <span className="material-symbols-outlined text-[22px] shrink-0">error</span>
            <div className="flex-1 text-body-sm">
              <p className="font-semibold">Unable to Complete Booking</p>
              <p className="mt-0.5">{errorNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorNotice(null)}
              className="text-error/70 hover:text-error"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* SUCCESS CONFIRMATION MODAL / SCREEN */}
        {confirmedAppointment ? (
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 sm:p-10 shadow-lg max-w-2xl mx-auto text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 ring-8 ring-primary/5">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>

            <span className="px-3 py-1 rounded-full text-label-sm font-semibold bg-primary/10 text-primary uppercase tracking-wider inline-block mb-2">
              Appointment Scheduled
            </span>
            <h2 className="text-headline-md font-bold text-on-surface">
              Your consultation has been booked!
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Reference Number:{' '}
              <span className="font-mono font-bold text-primary">
                {confirmedAppointment.appointment_number}
              </span>
            </p>

            {/* Appointment Summary Box */}
            <div className="mt-6 bg-surface-container-low/60 rounded-xl p-5 text-left border border-outline-variant/40 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary text-on-primary font-bold flex items-center justify-center text-title-md shrink-0">
                    {doctor?.profiles?.first_name?.[0] || 'D'}
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">{formatDoctorName(doctor)}</h4>
                    <p className="text-body-xs text-on-surface-variant">
                      {doctor?.specializations?.name || 'General Practice'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-label-sm text-on-surface-variant block">Consultation Fee</span>
                  <span className="font-bold text-title-md text-primary">
                    ₹{Number(doctor?.consultation_fee || 500).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm">
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
                  <span>{formatDisplayDate(confirmedAppointment.appointment_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
                  <span>
                    {formatSlotTime(confirmedAppointment.start_time)} -{' '}
                    {formatSlotTime(confirmedAppointment.end_time)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    {confirmedAppointment.mode === 'online' ? 'videocam' : 'local_hospital'}
                  </span>
                  <span>
                    {confirmedAppointment.mode === 'online'
                      ? 'Secure Video Telehealth (Jitsi)'
                      : `In-Person (${doctor?.hospitals?.name || 'Clinic'})`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
                  <span>
                    Payment Status:{' '}
                    <span className="font-semibold text-secondary capitalize">
                      {paymentSuccessData ? 'Paid' : confirmedAppointment.payment_status}
                    </span>
                  </span>
                </div>
              </div>

              {paymentSuccessData && (
                <div className="mt-3 p-3 bg-secondary/10 border border-secondary/20 rounded-lg text-body-xs text-secondary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Payment verified via Razorpay! ID: {paymentSuccessData.payment_id}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {!paymentSuccessData && (
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-on-primary font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                  <span>Pay Now (₹{Number(doctor?.consultation_fee || 500).toLocaleString('en-IN')})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/patient/appointments')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-semibold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">event_note</span>
                <span>Go to My Appointments</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmedAppointment(null);
                  setPaymentSuccessData(null);
                  setSelectedTime('');
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl text-on-surface-variant hover:text-on-surface text-label-md font-medium transition-all"
              >
                Book Another Visit
              </button>
            </div>
          </div>
        ) : (
          /* MAIN BOOKING FORM GRID */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Doctor Card & Slot Selection (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* 1. Doctor Information Card (Requirement 6A) */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-5 sm:p-6 shadow-xs relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/40">
                  <span className="text-label-sm font-semibold uppercase tracking-wider text-primary">
                    Selected Physician
                  </span>
                  {allDoctors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDoctorId('');
                        navigate('/patient/book-appointment');
                      }}
                      className="text-label-sm font-medium text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
                    >
                      <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                      <span>Change Physician</span>
                    </button>
                  )}
                </div>

                {loadingDoctor ? (
                  <div className="py-8 flex items-center justify-center gap-3 text-on-surface-variant">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-body-md">Loading doctor profile & schedule...</span>
                  </div>
                ) : doctorError ? (
                  <div className="py-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-[24px]">person_off</span>
                    </div>
                    <h3 className="font-bold text-title-md text-on-surface">Physician Not Found</h3>
                    <p className="text-body-sm text-on-surface-variant max-w-md mx-auto">{doctorError}</p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => navigate('/patient/doctors')}
                        className="px-4 py-2 bg-primary text-on-primary rounded-xl font-medium text-label-md shadow-xs hover:bg-[#5249EC] transition-all"
                      >
                        Browse Available Doctors
                      </button>
                    </div>
                  </div>
                ) : !doctor ? (
                  /* Doctor Directory Dropdown / Selector if no doctor in URL */
                  <div className="py-4 space-y-3">
                    <label className="block text-label-md font-semibold text-on-surface">
                      Choose a Doctor from our Network:
                    </label>
                    <select
                      className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-body-md transition-all"
                      value={selectedDoctorId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSelectedDoctorId(newId);
                        if (newId) navigate(`/patient/book-appointment?doctor_id=${newId}`);
                      }}
                    >
                      <option value="">-- Select a Physician --</option>
                      {allDoctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {formatDoctorName(d)} — {d.specializations?.name || 'General Practice'} (₹{d.consultation_fee}/visit)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  /* Doctor Details Display */
                  <div className="pt-4 flex flex-col sm:flex-row gap-5 items-start">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-outline-variant/60 flex items-center justify-center text-primary font-bold text-headline-sm overflow-hidden shrink-0 shadow-inner">
                      {doctor.profiles?.profile_image ? (
                        <img
                          src={doctor.profiles.profile_image}
                          alt={formatDoctorName(doctor)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{doctor.profiles?.first_name?.[0] || 'D'}</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-title-lg font-bold text-on-surface">
                          {formatDoctorName(doctor)}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-label-sm font-semibold bg-primary/10 text-primary border border-primary/20">
                          {doctor.specializations?.name || 'Specialist'}
                        </span>
                        {doctor.verification_status === 'verified' && (
                          <span className="inline-flex items-center gap-1 text-label-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <span className="material-symbols-outlined text-[14px]">verified</span>
                            <span>Verified</span>
                          </span>
                        )}
                      </div>

                      <p className="text-body-sm text-on-surface-variant">
                        {doctor.qualification ? `${doctor.qualification} • ` : ''}
                        {doctor.years_experience ? `${doctor.years_experience}+ Years Experience` : 'Accredited Physician'}
                      </p>

                      {doctor.hospitals && (
                        <p className="text-body-xs text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-primary">local_hospital</span>
                          <span>{doctor.hospitals.name}, {doctor.hospitals.city || doctor.profiles?.city}</span>
                        </p>
                      )}

                      <div className="flex items-center gap-4 pt-1 text-body-sm">
                        <div className="flex items-center gap-1 text-amber-500 font-semibold">
                          <span className="material-symbols-outlined text-[18px]">star</span>
                          <span>{doctor.rating ? Number(doctor.rating).toFixed(1) : '5.0'}</span>
                          <span className="text-on-surface-variant font-normal">
                            ({doctor.total_reviews || 1} {doctor.total_reviews === 1 ? 'review' : 'reviews'})
                          </span>
                        </div>
                        <div className="text-on-surface-variant">
                          Fee:{' '}
                          <span className="font-bold text-primary">
                            ₹{Number(doctor.consultation_fee).toLocaleString('en-IN')}
                          </span>{' '}
                          / consultation
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Date Selection (Requirement 6B) */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-title-md text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">calendar_month</span>
                    <span>1. Select Appointment Date</span>
                  </h3>
                  {selectedDate && (
                    <span className="text-label-sm font-medium text-on-surface-variant">
                      {formatDisplayDate(selectedDate)}
                    </span>
                  )}
                </div>

                {availableDates.length === 0 ? (
                  <div className="p-6 bg-surface-container-low/50 rounded-xl border border-outline-variant/50 text-center space-y-2">
                    <span className="material-symbols-outlined text-outline text-[32px]">event_busy</span>
                    <p className="text-body-md font-semibold text-on-surface">No Schedule Available</p>
                    <p className="text-body-sm text-on-surface-variant max-w-md mx-auto">
                      This doctor does not have available consultation hours configured for the upcoming days.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/patient/doctors')}
                      className="mt-2 text-primary font-medium hover:underline text-body-sm inline-block"
                    >
                      Browse other verified physicians →
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                    {availableDates.map((item) => {
                      const isSelected = selectedDate === item.date;
                      return (
                        <button
                          key={item.date}
                          type="button"
                          onClick={() => setSelectedDate(item.date)}
                          className={`flex-shrink-0 flex flex-col items-center justify-center w-[84px] py-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? 'bg-primary border-primary text-on-primary shadow-sm scale-102'
                              : 'bg-surface-container-low/60 border-outline-variant/50 text-on-surface hover:border-primary/50 hover:bg-surface-container-lowest'
                          }`}
                        >
                          <span className={`text-label-xs font-semibold ${isSelected ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
                            {item.label}
                          </span>
                          <span className="text-title-lg font-bold my-0.5 leading-none">
                            {item.dayNum}
                          </span>
                          <span className={`text-label-xs ${isSelected ? 'text-on-primary/90' : 'text-outline'}`}>
                            {item.month}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Time Slots Selection (Requirement 6B) */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-title-md text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">schedule</span>
                    <span>2. Choose Time Slot</span>
                  </h3>
                  {selectedTime && (
                    <span className="text-label-sm font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                      Selected: {formatSlotTime(selectedTime)}
                    </span>
                  )}
                </div>

                {loadingSlots ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-on-surface-variant text-body-sm">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span>Checking real-time doctor availability...</span>
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div className="p-6 bg-surface-container-low/50 rounded-xl border border-outline-variant/50 text-center space-y-1">
                    <span className="material-symbols-outlined text-outline text-[28px]">schedule</span>
                    <p className="text-body-md font-semibold text-on-surface">No Slots Available on this Date</p>
                    <p className="text-body-sm text-on-surface-variant">
                      All consultation slots for {formatDisplayDate(selectedDate)} are either booked or outside clinical hours.
                    </p>
                    <p className="text-body-xs text-primary font-medium pt-1">
                      Please pick another available date above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Morning Slots */}
                    {timeSlots.some((s) => s.isMorning) && (
                      <div>
                        <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-amber-500">wb_sunny</span>
                          <span>Morning Slots</span>
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                          {timeSlots
                            .filter((s) => s.isMorning)
                            .map((slot) => {
                              const isSelected = selectedTime === slot.time24;
                              return (
                                <button
                                  key={slot.time24}
                                  type="button"
                                  onClick={() => setSelectedTime(slot.time24)}
                                  className={`py-2 px-3 rounded-xl text-body-sm font-semibold transition-all border text-center ${
                                    isSelected
                                      ? 'bg-primary border-primary text-on-primary shadow-xs ring-2 ring-primary/20'
                                      : 'bg-surface-container-low/60 border-outline-variant/60 text-on-surface hover:border-primary/50 hover:bg-surface-container-lowest'
                                  }`}
                                >
                                  {slot.label}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Afternoon & Evening Slots */}
                    {timeSlots.some((s) => !s.isMorning) && (
                      <div className="pt-2">
                        <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-indigo-500">wb_twilight</span>
                          <span>Afternoon & Evening Slots</span>
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                          {timeSlots
                            .filter((s) => !s.isMorning)
                            .map((slot) => {
                              const isSelected = selectedTime === slot.time24;
                              return (
                                <button
                                  key={slot.time24}
                                  type="button"
                                  onClick={() => setSelectedTime(slot.time24)}
                                  className={`py-2 px-3 rounded-xl text-body-sm font-semibold transition-all border text-center ${
                                    isSelected
                                      ? 'bg-primary border-primary text-on-primary shadow-xs ring-2 ring-primary/20'
                                      : 'bg-surface-container-low/60 border-outline-variant/60 text-on-surface hover:border-primary/50 hover:bg-surface-container-lowest'
                                  }`}
                                >
                                  {slot.label}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Consultation Mode & Clinical Notes */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-5 sm:p-6 shadow-xs space-y-5">
                <h3 className="font-bold text-title-md text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">medical_services</span>
                  <span>3. Consultation Details</span>
                </h3>

                {/* Mode Selector */}
                <div>
                  <label className="block text-label-md font-semibold text-on-surface mb-2">
                    Consultation Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMode('online')}
                      className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        mode === 'online'
                          ? 'bg-primary/5 border-primary ring-2 ring-primary/10'
                          : 'bg-surface-container-low/40 border-outline-variant/60 hover:border-outline'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${mode === 'online' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined text-[20px]">videocam</span>
                      </div>
                      <div>
                        <span className="font-bold text-body-md text-on-surface block">Video Telehealth</span>
                        <span className="text-body-xs text-on-surface-variant">
                          Encrypted HD consultation via MedConnect Jitsi Meet.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('offline')}
                      className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        mode === 'offline'
                          ? 'bg-secondary/5 border-secondary ring-2 ring-secondary/10'
                          : 'bg-surface-container-low/40 border-outline-variant/60 hover:border-outline'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${mode === 'offline' ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined text-[20px]">local_hospital</span>
                      </div>
                      <div>
                        <span className="font-bold text-body-md text-on-surface block">In-Person Clinic Visit</span>
                        <span className="text-body-xs text-on-surface-variant">
                          {doctor?.hospitals?.name || 'In-hospital clinical consultation'}.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Reason for Visit */}
                <div>
                  <label className="block text-label-md font-semibold text-on-surface mb-1.5" htmlFor="apt-reason">
                    Reason for Consultation <span className="text-primary">*</span>
                  </label>
                  <input
                    id="apt-reason"
                    type="text"
                    required
                    placeholder="e.g. Follow-up consultation, Seasonal flu symptoms, Medication review"
                    className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-body-md transition-all"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  {/* Quick Reason Suggestions */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['Routine Checkup', 'Follow-up Visit', 'Fever & Cold', 'Prescription Renewal', 'Lab Report Review'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setReason(chip)}
                        className="text-label-xs px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-primary/10 hover:text-primary text-on-surface-variant border border-outline-variant/40 transition-colors"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Symptoms / Medical Notes (Optional) */}
                <div>
                  <label className="block text-label-md font-semibold text-on-surface mb-1.5" htmlFor="apt-symptoms">
                    Symptoms or Questions for the Doctor <span className="text-outline font-normal">(Optional)</span>
                  </label>
                  <textarea
                    id="apt-symptoms"
                    rows={3}
                    placeholder="Describe any symptoms, duration, or questions you would like addressed during your visit..."
                    className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-body-md transition-all resize-none"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  ></textarea>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Booking Summary & Confirm Action (4 cols) (Requirement 6C) */}
            <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-5 sm:p-6 shadow-md space-y-5">
                <h3 className="font-bold text-title-md text-on-surface pb-3 border-b border-outline-variant/40 flex items-center justify-between">
                  <span>Booking Summary</span>
                  <span className="text-label-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {mode === 'online' ? 'Video Telehealth' : 'Clinic Visit'}
                  </span>
                </h3>

                {/* Doctor Brief */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-title-md">
                    {doctor?.profiles?.first_name?.[0] || 'D'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-body-md text-on-surface truncate">
                      {doctor ? formatDoctorName(doctor) : 'Choose a doctor'}
                    </h4>
                    <p className="text-body-xs text-on-surface-variant truncate">
                      {doctor?.specializations?.name || 'Specialist'}
                    </p>
                  </div>
                </div>

                {/* Date & Time Highlights */}
                <div className="p-3.5 bg-surface-container-low/70 rounded-xl border border-outline-variant/40 space-y-2 text-body-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
                      <span>Date:</span>
                    </span>
                    <span className="font-semibold text-on-surface">
                      {selectedDate ? formatDisplayDate(selectedDate) : 'Not selected'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                      <span>Time:</span>
                    </span>
                    <span className="font-semibold text-on-surface">
                      {selectedTime ? formatSlotTime(selectedTime) : 'Not selected'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        {mode === 'online' ? 'videocam' : 'local_hospital'}
                      </span>
                      <span>Visit Mode:</span>
                    </span>
                    <span className="font-semibold text-on-surface capitalize">
                      {mode === 'online' ? 'Video Telehealth' : 'In-Person'}
                    </span>
                  </div>
                </div>

                {/* Fee Breakdown */}
                <div className="space-y-2 pt-2 border-t border-outline-variant/40 text-body-sm">
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <span>Consultation Fee:</span>
                    <span className="font-semibold text-on-surface">
                      ₹{doctor ? Number(doctor.consultation_fee).toLocaleString('en-IN') : '0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <span>Platform Telemedicine Fee:</span>
                    <span className="text-emerald-600 font-medium">Free</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-title-md font-bold text-on-surface">
                    <span>Total Amount:</span>
                    <span className="text-primary font-bold">
                      ₹{doctor ? Number(doctor.consultation_fee).toLocaleString('en-IN') : '0'}
                    </span>
                  </div>
                </div>

                {/* Submit Action */}
                <form onSubmit={handleBookingSubmit} className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !doctor || !selectedDate || !selectedTime}
                    className="w-full h-12 bg-primary hover:bg-[#5249EC] active:bg-[#443CC7] text-on-primary rounded-xl font-semibold text-label-lg transition-all shadow-md active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Confirming Slot...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        <span>Confirm Appointment</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/patient/doctors')}
                    className="w-full h-10 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container-low text-label-md font-medium transition-colors text-center"
                  >
                    Cancel & Browse Doctors
                  </button>
                </form>

                {/* Trust badge */}
                <div className="pt-2 text-center text-body-xs text-outline space-y-1">
                  <p className="flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-emerald-600">lock</span>
                    <span>100% Secure & Confidential Telemedicine</span>
                  </p>
                  <p>Free rescheduling up to 2 hours before visit.</p>
                </div>
              </div>
            </aside>
          </div>
        )}

      </div>

      {/* RAZORPAY PAYMENT MODAL INTEGRATION */}
      {confirmedAppointment && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          appointment={confirmedAppointment}
          patientProfile={profile}
          onPaymentSuccess={(verifiedData) => {
            setPaymentSuccessData(verifiedData);
            setIsPaymentModalOpen(false);
          }}
        />
      )}
    </PatientLayout>
  );
};

export default AppointmentBooking;
