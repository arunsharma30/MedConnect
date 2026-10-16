import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PatientLayout from '../components/PatientLayout';
import { useAuth } from '../context/AuthContext';
import ReviewModal from '../components/ReviewModal';

const DoctorProfile = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth(); // Patient profile

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking state
  const [selectedVisitType, setSelectedVisitType] = useState('online');
  const [selectedDateObj, setSelectedDateObj] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('Annual Wellness Exam / General Consultation');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Review states
  const [patientRecord, setPatientRecord] = useState(null);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [patientReviews, setPatientReviews] = useState([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [noAppointmentNoticeOpen, setNoAppointmentNoticeOpen] = useState(false);

  useEffect(() => {
    if (doctorId) {
      fetchDoctor();
    }
  }, [doctorId]);

  useEffect(() => {
    if (profile && doctorId) {
      fetchPatientConsultations();
    }
  }, [profile, doctorId]);

  const fetchPatientConsultations = async () => {
    if (!profile) return;
    try {
      // 1. Get patient record
      const { data: pData } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!pData) return;
      setPatientRecord(pData);

      // 2. Get appointments with this doctor (all non-cancelled appointments qualify)
      const { data: apts, error: aptErr } = await supabase
        .from('appointments')
        .select('id, appointment_number, appointment_date, start_time, end_time, mode, status, doctor_id')
        .eq('patient_id', pData.id)
        .eq('doctor_id', doctorId)
        .not('status', 'eq', 'cancelled')
        .order('appointment_date', { ascending: false });

      if (aptErr) console.error('Error fetching appointments:', aptErr);
      if (apts) setPatientAppointments(apts);

      // 3. Get reviews from this patient for this doctor
      const { data: revs, error: revErr } = await supabase
        .from('reviews')
        .select('id, appointment_id, rating, review, created_at')
        .eq('patient_id', pData.id)
        .eq('doctor_id', doctorId);

      if (revErr) console.error('Error fetching reviews:', revErr);
      if (revs) setPatientReviews(revs);
    } catch (err) {
      console.error('Error checking patient consultations:', err);
    }
  };

  useEffect(() => {
    if (selectedDateObj && doctorId) {
      fetchBookedSlots(selectedDateObj.date);
    }
  }, [selectedDateObj, doctorId]);

  const fetchDoctor = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          bio,
          languages,
          years_experience,
          qualification,
          experience,
          verification_status,
          consultation_fee,
          rating,
          total_reviews,
          profiles!inner(first_name, last_name, profile_image, city, state),
          specializations(name, description),
          hospitals!doctors_hospital_id_fkey(name, address, city, state, phone),
          doctor_availability(day, start_time, end_time, is_available),
          reviews(id, rating, review, created_at, appointment_id, patient_id, patients(profiles(first_name, last_name)))
        `)
        .eq('id', doctorId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Doctor not found');

      setDoctor(data);
      
      // Auto-select initial visit type based on hospital presence
      if (data.hospitals) {
         setSelectedVisitType('online'); // Default to online, user can switch to offline
      } else {
         setSelectedVisitType('online');
      }

    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load doctor profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookedSlots = async (date) => {
    setLoadingSlots(true);
    try {
      const { data } = await supabase
        .from('appointments')
        .select('start_time')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', date)
        .not('status', 'in', '(cancelled,no_show)');
      
      if (data) {
        setBookedSlots(data.map(b => b.start_time.substring(0, 5)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Calendar logic
  const availableDates = useMemo(() => {
    if (!doctor || !doctor.doctor_availability) return [];
    
    const dates = [];
    const today = new Date();
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    for (let i = 0; i < 21; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayName = daysOfWeek[d.getDay()];
      
      const dayRules = doctor.doctor_availability.filter(a => a.day === dayName && a.is_available);
      
      if (dayRules.length > 0) {
        dates.push({
          date: d.toISOString().split('T')[0],
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNum: d.getDate(),
          month: d.toLocaleDateString('en-US', { month: 'short' }),
          year: d.getFullYear(),
          rules: dayRules
        });
      }
    }
    return dates;
  }, [doctor]);

  // Auto-select first date
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDateObj) {
      setSelectedDateObj(availableDates[0]);
    }
  }, [availableDates]);

  // Slots generation for the selected date
  const timeSlots = useMemo(() => {
    if (!selectedDateObj) return [];
    
    const slots = [];
    selectedDateObj.rules.forEach(rule => {
      let current = new Date(`${selectedDateObj.date}T${rule.start_time}`);
      const end = new Date(`${selectedDateObj.date}T${rule.end_time}`);
      
      while (current < end) {
        const timeString24 = current.toTimeString().substring(0, 5); // "HH:MM"
        
        // Skip if booked
        if (!bookedSlots.includes(timeString24)) {
           // Format to AM/PM
           const h = current.getHours();
           const m = current.getMinutes();
           const period = h >= 12 ? 'PM' : 'AM';
           const displayH = h % 12 === 0 ? 12 : h % 12;
           const displayM = m.toString().padStart(2, '0');
           const label = `${displayH.toString().padStart(2, '0')}:${displayM} ${period}`;
           
           slots.push({
             time24: timeString24,
             label: label,
             isMorning: h < 12
           });
        }
        
        // 30 min duration
        current.setMinutes(current.getMinutes() + 30);
      }
    });
    
    // Auto-clear selected time if it's no longer available in the new slots
    if (selectedTime && !slots.some(s => s.time24 === selectedTime)) {
       setSelectedTime('');
    }

    return slots.sort((a, b) => a.time24.localeCompare(b.time24));
  }, [selectedDateObj, bookedSlots, selectedTime]);

  const morningSlots = timeSlots.filter(s => s.isMorning);
  const afternoonSlots = timeSlots.filter(s => !s.isMorning);

  const handleBooking = () => {
    if (!selectedDateObj || !selectedTime) {
      alert("Please select a date and time slot.");
      return;
    }
    
    const url = `/patient/book-appointment?doctor_id=${doctorId}&date=${selectedDateObj.date}&time=${selectedTime}&mode=${selectedVisitType}&reason=${encodeURIComponent(reason)}`;
    navigate(url);
  };

  // Unreviewed appointments for this patient with this doctor
  const unreviewedAppointments = useMemo(() => {
    const reviewedIds = new Set(patientReviews.map(r => r.appointment_id));
    return patientAppointments.filter(a => !reviewedIds.has(a.id));
  }, [patientAppointments, patientReviews]);

  if (loading) {
    return (
      <PatientLayout>
        <div className="flex-1 w-full py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-pulse">
            <section className="lg:col-span-8 flex flex-col gap-6">
              <div className="h-64 bg-surface-container-low rounded-xl border border-outline-variant/60"></div>
              <div className="h-48 bg-surface-container-low rounded-xl border border-outline-variant/60"></div>
              <div className="h-64 bg-surface-container-low rounded-xl border border-outline-variant/60"></div>
            </section>
            <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
              <div className="h-96 bg-surface-container-low rounded-xl border border-outline-variant/60"></div>
            </aside>
          </div>
        </div>
      </PatientLayout>
    );
  }

  if (error || !doctor) {
    return (
      <PatientLayout>
        <div className="flex-1 w-full py-16 flex items-center justify-center">
          <div className="text-center p-8 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm max-w-md w-full">
             <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-4">
               <span className="material-symbols-outlined text-3xl">error</span>
             </div>
             <h3 className="text-headline-md text-on-surface font-semibold mb-2">Unable to load doctor profile</h3>
             <p className="text-body-md text-on-surface-variant mb-6">{error}</p>
             <div className="flex gap-3 justify-center">
               <button 
                  onClick={() => navigate('/patient/doctors')}
                  className="px-6 py-2 border border-outline-variant text-on-surface rounded-lg font-label-md hover:bg-surface-container-low transition-colors"
               >
                 Back to Find a Doctor
               </button>
               <button 
                  onClick={fetchDoctor} 
                  className="px-6 py-2 bg-primary-container text-on-primary rounded-lg font-label-md hover:bg-[#5249EC] transition-colors"
               >
                 Try Again
               </button>
             </div>
          </div>
        </div>
      </PatientLayout>
    );
  }

  const supportsInPerson = !!doctor.hospitals;

  const hasUnreviewedAppointment = unreviewedAppointments.length > 0;
  const hasReviewedDoctor = patientReviews.length > 0;
  const hasAnyAppointment = patientAppointments.length > 0;

  // Calculate rating distribution
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (doctor.reviews && doctor.reviews.length > 0) {
    doctor.reviews.forEach(r => {
       if (r.rating >= 1 && r.rating <= 5) {
         ratingDistribution[Math.floor(r.rating)]++;
       }
    });
  }
  const totalReviews = doctor.reviews ? doctor.reviews.length : 0;

  // Dynamic average rating from actual reviews, or fallback to doctor.rating if present
  const avgRating = totalReviews > 0
    ? (doctor.reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / totalReviews).toFixed(1)
    : (doctor.rating && Number(doctor.rating) > 0 ? Number(doctor.rating).toFixed(1) : '5.0');

  return (
    <PatientLayout>
      <div className="flex-1 w-full">
        {/* Breadcrumbs Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant mb-6">
          <button onClick={() => navigate('/')} className="hover:text-primary transition-colors">Home</button>
          <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
          <button onClick={() => navigate('/patient/doctors')} className="hover:text-primary transition-colors">Find a Doctor</button>
          <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
          <span className="text-on-surface font-headline-sm text-body-sm font-medium">Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}</span>
        </nav>

        {/* Two-Column Clinical Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Clinical Profile */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            
            {/* 1. Doctor Overview Header Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                
                {/* Photo Container */}
                <div className="relative w-[160px] h-[160px] rounded-[10px] overflow-hidden shrink-0 border border-outline-variant bg-surface-container flex items-center justify-center">
                  {doctor.profiles?.profile_image ? (
                     <img alt={`Dr. ${doctor.profiles?.last_name}`} className="w-full h-full object-cover" src={doctor.profiles.profile_image} />
                  ) : (
                     <span className="text-display-lg text-primary/50 font-bold">
                       {doctor.profiles?.first_name?.[0]}{doctor.profiles?.last_name?.[0]}
                     </span>
                  )}
                  {doctor.doctor_availability && doctor.doctor_availability.some(a => a.day === new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() && a.is_available) && (
                    <div className="absolute bottom-2 left-2 bg-surface-container-lowest/90 backdrop-blur-xs px-2 py-0.5 rounded-full flex items-center gap-1 border border-outline-variant">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      <span className="font-label-sm text-[10px] text-on-surface font-medium">Available Today</span>
                    </div>
                  )}
                </div>

                {/* Profile Info Header */}
                <div className="flex-1 space-y-3">
                  {/* Badges Cluster */}
                  <div className="flex flex-wrap items-center gap-2">
                    {doctor.verification_status === 'verified' && (
                      <span className="h-6 px-2.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-label-sm text-label-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        Verified
                      </span>
                    )}
                    {doctor.qualification && (
                       <span className="h-6 px-2.5 rounded-full bg-surface-container-low text-on-surface-variant border border-outline-variant font-label-sm text-label-sm">
                         {doctor.qualification}
                       </span>
                    )}
                  </div>

                  {/* Name & Title */}
                  <div>
                    <h1 className="text-headline-lg font-headline-lg text-on-surface font-bold tracking-tight">
                      Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}
                    </h1>
                    <p className="text-body-md font-body-md text-on-surface-variant font-medium mt-0.5">
                      {doctor.specializations?.name || 'General Practice'}
                    </p>
                  </div>

                  {/* Practice & Experience */}
                  {(doctor.hospitals || doctor.years_experience > 0) && (
                    <div className="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px] text-primary">domain</span>
                      <span>
                        {doctor.hospitals ? doctor.hospitals.name : 'Independent Practice'} 
                        {doctor.years_experience > 0 ? ` (${doctor.years_experience}+ Years Experience)` : ''}
                      </span>
                    </div>
                  )}

                  {/* Rating Score & Reviews */}
                  {totalReviews > 0 && (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex items-center gap-1 text-amber-600 font-headline-sm text-body-md font-bold">
                        <span className="material-symbols-outlined text-[18px] text-amber-500" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                        <span>{avgRating}</span>
                      </div>
                      <span className="text-outline-variant font-body-sm">|</span>
                      <a className="text-primary font-body-sm hover:underline font-medium" href="#patient-reviews">{totalReviews} {totalReviews === 1 ? 'verified patient review' : 'verified patient reviews'}</a>
                    </div>
                  )}

                  {/* Quick Meta Tags */}
                  <div className="pt-2 border-t border-outline-variant flex flex-wrap items-center gap-y-2 gap-x-4 text-body-sm font-body-sm text-on-surface-variant">
                    {doctor.languages && doctor.languages.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-outline">translate</span>
                        {doctor.languages.join(', ')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-outline">videocam</span>
                      {supportsInPerson ? 'Video Visit & In-Person' : 'Video Telehealth Only'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. About & Clinical Philosophy */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="material-symbols-outlined text-primary text-[22px]">medical_services</span>
                <h2 className="text-headline-md font-headline-md font-bold text-on-surface">About</h2>
              </div>
              <div className="text-body-md font-body-md text-on-surface-variant space-y-3 leading-relaxed">
                {doctor.bio ? (
                  <p className="whitespace-pre-wrap">{doctor.bio}</p>
                ) : (
                  <p>Doctor biography is not available.</p>
                )}
              </div>
            </div>

            {/* 3. Education, Credentials & Affiliations */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="material-symbols-outlined text-primary text-[22px]">verified_user</span>
                <h2 className="text-headline-md font-headline-md font-bold text-on-surface">Education, Credentials & Affiliations</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctor.qualification && (
                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-surface-container-low border border-outline-variant">
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">school</span>
                    <div>
                      <p className="text-body-sm font-body-sm text-on-surface-variant font-medium">Qualification</p>
                      <p className="text-body-md font-headline-sm font-semibold text-on-surface">{doctor.qualification}</p>
                    </div>
                  </div>
                )}
                
                {doctor.experience && (
                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-surface-container-low border border-outline-variant">
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">work</span>
                    <div>
                      <p className="text-body-sm font-body-sm text-on-surface-variant font-medium">Experience Background</p>
                      <p className="text-body-md font-headline-sm font-semibold text-on-surface">{doctor.experience}</p>
                    </div>
                  </div>
                )}

                {doctor.hospitals && (
                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-surface-container-low border border-outline-variant">
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">domain_add</span>
                    <div>
                      <p className="text-body-sm font-body-sm text-on-surface-variant font-medium">Hospital Affiliation</p>
                      <p className="text-body-md font-headline-sm font-semibold text-on-surface">{doctor.hospitals.name}</p>
                      {doctor.hospitals.city && <p className="text-label-sm font-label-sm text-outline">{doctor.hospitals.city}, {doctor.hospitals.state}</p>}
                    </div>
                  </div>
                )}
                
                {doctor.license_number && (
                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-surface-container-low border border-outline-variant">
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">badge</span>
                    <div>
                      <p className="text-body-sm font-body-sm text-on-surface-variant font-medium">License / Registration</p>
                      <p className="text-body-md font-headline-sm font-semibold text-on-surface">{doctor.license_number}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {!doctor.qualification && !doctor.experience && !doctor.hospitals && !doctor.license_number && (
                 <p className="text-body-md text-on-surface-variant">No credentials available.</p>
              )}
            </div>

            {/* 4. Patient Reviews & Verified Feedback */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] p-6 shadow-sm" id="patient-reviews">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[22px]">reviews</span>
                  <div>
                    <h2 className="text-headline-md font-headline-md font-bold text-on-surface">Patient Reviews & Verified Feedback</h2>
                    <p className="text-body-xs text-on-surface-variant">Real experiences from verified consultations</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {totalReviews > 0 && (
                    <span className="text-label-sm font-label-sm text-on-surface-variant font-medium">
                      {totalReviews} {totalReviews === 1 ? 'Review' : 'Total Reviews'}
                    </span>
                  )}
                  {profile?.role === 'patient' && (
                    hasUnreviewedAppointment ? (
                      <button
                        onClick={() => setIsReviewModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-label-md font-medium transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">rate_review</span>
                        Write a Review
                      </button>
                    ) : hasReviewedDoctor ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-label-sm font-medium">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                        Reviewed
                      </span>
                    ) : (
                      <button
                        onClick={() => setNoAppointmentNoticeOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary rounded-lg text-label-md font-medium transition-colors"
                        title="Consultation required to leave a verified review"
                      >
                        <span className="material-symbols-outlined text-[18px]">rate_review</span>
                        Write a Review
                      </button>
                    )
                  )}
                </div>
              </div>

              {totalReviews > 0 ? (
                <>
                  {/* Rating Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4 rounded-lg bg-surface-container-low border border-outline-variant mb-6 items-center">
                    <div className="md:col-span-4 text-center md:border-r md:border-outline-variant md:pr-4">
                      <div className="text-display-sm font-display-sm font-bold text-on-surface">{avgRating}</div>
                      <div className="flex justify-center items-center gap-1 text-amber-500 my-1">
                        {[1,2,3,4,5].map(i => (
                           <span key={i} className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: i <= Math.round(Number(avgRating)) ? "'FILL' 1" : "'FILL' 0"}}>star</span>
                        ))}
                      </div>
                      <p className="text-label-sm font-label-sm text-on-surface-variant font-medium">Overall Clinical Experience</p>
                    </div>
                    
                    <div className="md:col-span-8 space-y-1.5">
                      {[5, 4, 3, 2, 1].map(star => {
                         const pct = totalReviews > 0 ? Math.round((ratingDistribution[star] / totalReviews) * 100) : 0;
                         return (
                           <div key={star} className="flex items-center gap-2 text-label-sm font-label-sm">
                             <span className="w-10 text-on-surface-variant">{star} Star</span>
                             <div className="flex-1 h-2 rounded-full bg-outline-variant/40 overflow-hidden">
                               <div className="h-full bg-primary-container rounded-full" style={{ width: `${pct}%` }}></div>
                             </div>
                             <span className="w-8 text-right font-medium text-on-surface">{pct}%</span>
                           </div>
                         );
                      })}
                    </div>
                  </div>

                  {/* Individual Reviews */}
                  <div className="space-y-4">
                    {doctor.reviews.map((r, idx) => {
                      const isOwnReview = patientRecord && r.patient_id === patientRecord.id;
                      const reviewerName = r.patients?.profiles?.first_name
                        ? `${r.patients.profiles.first_name} ${r.patients.profiles.last_name ? r.patients.profiles.last_name[0] + '.' : ''}`
                        : 'Verified Patient';

                      return (
                        <div key={r.id || idx} className={`p-4 rounded-lg border ${isOwnReview ? 'border-primary/40 bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-headline-sm text-body-md font-semibold text-on-surface">
                                {reviewerName}
                              </span>
                              {isOwnReview && (
                                <span className="h-5 px-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-label-xs font-semibold flex items-center">
                                  Your Review
                                </span>
                              )}
                              <span className="h-5 px-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-label-sm font-label-sm flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[12px]">verified</span>
                                Verified Patient
                              </span>
                            </div>
                            <span className="text-body-sm font-body-sm text-on-surface-variant">
                               {r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-amber-500 mb-2">
                            {[1,2,3,4,5].map(i => (
                               <span key={i} className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: i <= r.rating ? "'FILL' 1" : "'FILL' 0"}}>star</span>
                            ))}
                          </div>
                          <p className="text-body-md font-body-md text-on-surface-variant leading-relaxed">
                            "{r.review}"
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-10 px-4 bg-surface-container-low/40 rounded-xl border border-dashed border-outline-variant/60">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-2xl">rate_review</span>
                  </div>
                  <p className="text-body-md font-medium text-on-surface mb-1">No reviews yet</p>
                  <p className="text-body-sm text-on-surface-variant max-w-md mx-auto mb-4">
                    Be the first verified patient to share your consultation experience with Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}.
                  </p>
                  {profile?.role === 'patient' && (
                    hasUnreviewedAppointment ? (
                      <button
                        onClick={() => setIsReviewModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-label-md font-medium transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">star</span>
                        Rate & Review Consultation
                      </button>
                    ) : !hasAnyAppointment ? (
                      <button
                        onClick={() => setNoAppointmentNoticeOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary rounded-lg text-label-sm font-medium transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">info</span>
                        How to leave a review
                      </button>
                    ) : null
                  )}
                </div>
              )}
            </div>

          </section>

          {/* RIGHT COLUMN: Interactive Booking Widget */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] p-6 shadow-md" id="schedule-widget">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
                <div>
                  <h2 className="text-headline-sm font-headline-sm font-bold text-on-surface">Schedule an Appointment</h2>
                  <p className="text-label-sm font-label-sm text-on-surface-variant">Instant booking · Verified clinical calendar</p>
                </div>
                <span className="material-symbols-outlined text-primary text-[24px]">calendar_month</span>
              </div>

              {/* Visit Type Switcher */}
              <div className="mt-4">
                <label className="block text-label-md font-label-md text-on-surface mb-2 font-medium">Select Visit Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-low rounded-lg border border-outline-variant">
                  <button 
                    onClick={() => setSelectedVisitType('online')}
                    className={`py-2 px-2.5 rounded-md font-body-sm text-body-sm flex items-center justify-center gap-1.5 transition-colors ${
                      selectedVisitType === 'online' 
                        ? 'bg-surface-container-lowest text-primary font-semibold shadow-xs border border-outline-variant'
                        : 'text-on-surface-variant hover:text-on-surface font-medium'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">videocam</span>
                    <span>Video Visit</span>
                  </button>
                  
                  {supportsInPerson && (
                    <button 
                      onClick={() => setSelectedVisitType('offline')}
                      className={`py-2 px-2.5 rounded-md font-body-sm text-body-sm flex items-center justify-center gap-1.5 transition-colors ${
                        selectedVisitType === 'offline' 
                          ? 'bg-surface-container-lowest text-primary font-semibold shadow-xs border border-outline-variant'
                          : 'text-on-surface-variant hover:text-on-surface font-medium'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">home_health</span>
                      <span>In-Person</span>
                    </button>
                  )}
                </div>
                {!supportsInPerson && (
                  <p className="text-label-sm text-outline mt-1 text-center">In-person visits unavailable.</p>
                )}
              </div>

              {/* Date Strip */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-label-md font-label-md text-on-surface font-medium">Select Date</label>
                  {selectedDateObj && (
                    <span className="text-label-sm font-label-sm text-primary font-semibold">{selectedDateObj.month} {selectedDateObj.year}</span>
                  )}
                </div>
                
                {availableDates.length > 0 ? (
                  <div className="flex gap-1.5 overflow-x-auto pb-2 snap-x hide-scrollbar">
                    {availableDates.map((dateObj, idx) => {
                      const isSelected = selectedDateObj?.date === dateObj.date;
                      return (
                        <button 
                          key={idx}
                          onClick={() => setSelectedDateObj(dateObj)}
                          className={`flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-lg border transition-all snap-start ${
                            isSelected
                              ? 'bg-primary text-on-primary border-primary shadow-xs'
                              : 'bg-surface-container-lowest border-outline-variant hover:border-primary text-on-surface'
                          }`}
                        >
                          <span className={`text-[10px] font-label-sm ${isSelected ? 'opacity-90' : 'text-on-surface-variant'}`}>{dateObj.dayName}</span>
                          <span className="text-headline-sm font-headline-sm font-bold">{dateObj.dayNum}</span>
                          <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-on-primary' : 'bg-emerald-500'}`}></span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-surface-container-low rounded border border-outline-variant text-center">
                    <p className="text-label-sm text-on-surface-variant">No available appointments in the next 14 days.</p>
                  </div>
                )}
              </div>

              {/* Available Time Slots */}
              {selectedDateObj && (
                <div className="mt-5 space-y-3 min-h-[100px] relative">
                  <label className="block text-label-md font-label-md text-on-surface font-medium">Available Time Slots</label>
                  
                  {loadingSlots ? (
                    <div className="absolute inset-0 bg-surface-container-lowest/50 backdrop-blur-sm flex items-center justify-center z-10">
                      <span className="material-symbols-outlined animate-spin text-primary">autorenew</span>
                    </div>
                  ) : null}

                  {timeSlots.length === 0 && !loadingSlots ? (
                     <p className="text-label-sm text-on-surface-variant text-center py-2">No slots available for this date.</p>
                  ) : (
                    <>
                      {morningSlots.length > 0 && (
                        <div>
                          <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">wb_twilight</span>
                            Morning
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {morningSlots.map(slot => (
                               <button 
                                 key={slot.time24}
                                 onClick={() => setSelectedTime(slot.time24)}
                                 className={`py-1.5 px-1 rounded-lg font-body-sm text-body-sm transition-colors border ${
                                   selectedTime === slot.time24 
                                     ? 'bg-primary-container text-on-primary-container border-primary-container font-semibold shadow-xs'
                                     : 'bg-surface-container-lowest text-on-surface border-outline-variant hover:border-primary hover:bg-surface-container-low'
                                 }`}
                               >
                                 {slot.label}
                               </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {afternoonSlots.length > 0 && (
                        <div className="mt-3">
                          <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">wb_sunny</span>
                            Afternoon / Evening
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {afternoonSlots.map(slot => (
                               <button 
                                 key={slot.time24}
                                 onClick={() => setSelectedTime(slot.time24)}
                                 className={`py-1.5 px-1 rounded-lg font-body-sm text-body-sm transition-colors border ${
                                   selectedTime === slot.time24 
                                     ? 'bg-primary-container text-on-primary-container border-primary-container font-semibold shadow-xs'
                                     : 'bg-surface-container-lowest text-on-surface border-outline-variant hover:border-primary hover:bg-surface-container-low'
                                 }`}
                               >
                                 {slot.label}
                               </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Reason for Visit */}
              <div className="mt-4">
                <label className="block text-label-md font-label-md text-on-surface mb-1.5 font-medium">Reason for Visit</label>
                <div className="relative">
                  <select 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full h-[42px] px-3 pr-8 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface appearance-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="Annual Wellness Exam / General Consultation">Annual Wellness Exam / General Consultation</option>
                    <option value="Prescription Renewal & Lab Review">Prescription Renewal & Lab Review</option>
                    <option value="Follow-Up Consultation">Follow-Up Consultation</option>
                    <option value="Specific Symptom Review">Specific Symptom Review</option>
                    <option value="Other">Other</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">expand_more</span>
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="mt-5 p-3.5 rounded-lg bg-surface-container-low border border-outline-variant space-y-2">
                <div className="flex items-center justify-between text-body-sm font-body-sm">
                  <span className="text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-primary">payments</span>
                    Consultation Fee
                  </span>
                  <span className="font-headline-sm font-semibold text-on-surface">₹{Number(doctor.consultation_fee).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-label-sm font-label-sm text-emerald-800 pt-2 border-t border-outline-variant">
                  <span className="material-symbols-outlined text-[14px]">lock_clock</span>
                  <span>No charge until appointment confirmation</span>
                </div>
              </div>

              {/* Primary Action Button */}
              <button 
                onClick={handleBooking}
                disabled={!selectedDateObj || !selectedTime || availableDates.length === 0}
                className="mt-5 w-full h-11 rounded-lg bg-primary-container hover:bg-[#5249EC] active:bg-[#443CC7] disabled:bg-surface-variant disabled:text-outline text-on-primary font-headline-sm text-body-md font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <span>Confirm & Book Appointment</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
            
            {/* Practice Location Mini-Card */}
            {doctor.hospitals && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] p-4 shadow-sm flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">location_on</span>
                <div>
                  <p className="font-headline-sm text-body-sm font-semibold text-on-surface">{doctor.hospitals.name}</p>
                  <p className="text-body-sm font-body-sm text-on-surface-variant whitespace-pre-wrap">{doctor.hospitals.address}</p>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">{doctor.hospitals.city}, {doctor.hospitals.state}</p>
                </div>
              </div>
            )}
          </aside>
          
        </div>
      </div>
      
      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        doctor={doctor}
        patientId={patientRecord?.id}
        appointments={unreviewedAppointments}
        onSuccess={() => {
          fetchDoctor();
          fetchPatientConsultations();
        }}
      />

      {/* Notice Modal for patients without consultation */}
      {noAppointmentNoticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl border border-outline-variant/60">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <h3 className="text-title-lg font-bold text-on-surface text-center mb-2">Verified Patient Reviews</h3>
            <p className="text-body-sm text-on-surface-variant text-center mb-6 leading-relaxed">
              To keep MedConnect trusted and authentic, ratings and reviews can only be submitted by patients who have scheduled or completed a consultation with Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setNoAppointmentNoticeOpen(false);
                  const el = document.getElementById('schedule-widget');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-label-md font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                Book an Appointment First
              </button>
              <button
                onClick={() => setNoAppointmentNoticeOpen(false)}
                className="w-full py-2 text-on-surface-variant hover:text-on-surface text-label-md font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hide Scrollbar Style Helper */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </PatientLayout>
  );
};

export default DoctorProfile;
