import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import DoctorLayout from '../components/DoctorLayout';

const DoctorDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Core State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [doctorData, setDoctorData] = useState(null);

  // Today's Schedule
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [scheduleFilter, setScheduleFilter] = useState('all');
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  // KPI Counts
  const [kpi, setKpi] = useState({
    todayTotal: 0,
    todayCompleted: 0,
    todayRemaining: 0,
    todayVideo: 0,
    todayInPerson: 0,
    activePatients: 0,
    pendingPrescriptions: 0,
  });

  useEffect(() => {
    if (profile) {
      initializeDashboard();
    }
  }, [profile]);

  const initializeDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get doctor record from profile
      const { data: docData, error: docErr } = await supabase
        .from('doctors')
        .select('id, bio, qualification, years_experience, consultation_fee, rating, total_reviews, verification_status, specializations(name), hospitals!doctors_hospital_id_fkey(name), reviews(rating)')
        .eq('profile_id', profile.id)
        .single();

      if (docErr || !docData) throw new Error(docErr?.message || 'Doctor profile not found.');
      setDoctorData(docData);
      setDoctorId(docData.id);

      // Fire all parallel queries
      await Promise.all([
        fetchTodayAppointments(docData.id),
        fetchKPIs(docData.id),
      ]);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAppointments = async (docId) => {
    setLoadingAppointments(true);
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_number,
        appointment_date,
        start_time,
        end_time,
        status,
        mode,
        reason,
        patients(
          id,
          profiles(first_name, last_name, gender, dob, phone, profile_image)
        )
      `)
      .eq('doctor_id', docId)
      .eq('appointment_date', today)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching today appointments:', error.message);
    }
    if (data) setTodayAppointments(data);
    setLoadingAppointments(false);
  };

  const fetchKPIs = async (docId) => {
    const today = new Date().toISOString().split('T')[0];

    // Today's appointments aggregation
    const { data: todayApts } = await supabase
      .from('appointments')
      .select('id, status, mode')
      .eq('doctor_id', docId)
      .eq('appointment_date', today);

    // Unique patient count
    const { data: patientApts } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', docId)
      .not('status', 'in', '("cancelled","no_show")');

    // Pending prescriptions
    const { count: prescCount } = await supabase
      .from('prescriptions')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', docId);

    if (todayApts) {
      const completed = todayApts.filter(a => a.status === 'completed').length;
      const remaining = todayApts.filter(a => ['pending', 'confirmed'].includes(a.status)).length;
      const video = todayApts.filter(a => a.mode === 'online').length;
      const inPerson = todayApts.filter(a => a.mode === 'offline').length;

      // Unique patients
      const uniquePatients = patientApts ? new Set(patientApts.map(a => a.patient_id)).size : 0;

      setKpi({
        todayTotal: todayApts.length,
        todayCompleted: completed,
        todayRemaining: remaining,
        todayVideo: video,
        todayInPerson: inPerson,
        activePatients: uniquePatients,
        pendingPrescriptions: prescCount || 0,
      });
    }
  };

  // Supabase Realtime for appointment changes today
  useEffect(() => {
    if (!doctorId) return;
    const channel = supabase
      .channel('doctor-dash-apts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchTodayAppointments(doctorId);
        fetchKPIs(doctorId);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [doctorId]);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    if (scheduleFilter === 'video') return todayAppointments.filter(a => a.mode === 'online');
    if (scheduleFilter === 'clinic') return todayAppointments.filter(a => a.mode === 'offline');
    return todayAppointments;
  }, [todayAppointments, scheduleFilter]);

  // Helpers
  const getStatusConfig = (status) => {
    switch (status) {
      case 'confirmed': return { label: 'Confirmed', cls: 'bg-emerald-50 text-emerald-800 border border-emerald-200' };
      case 'completed': return { label: 'Completed', cls: 'bg-primary/10 text-primary-container border border-primary/20' };
      case 'cancelled': return { label: 'Cancelled', cls: 'bg-error/10 text-error border border-error/20' };
      case 'pending': return { label: 'Pending', cls: 'bg-amber-50 text-amber-800 border border-amber-200' };
      default: return { label: status, cls: 'bg-surface-container text-on-surface-variant border border-outline-variant' };
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(Number(h), Number(m));
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getPatientAge = (dob) => {
    if (!dob) return null;
    const age = Math.floor((new Date() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25));
    return age;
  };

  const updateStatus = async (id, newStatus) => {
    await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
  };

  // Date display
  const todayDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <DoctorLayout pageTitle="Dashboard">
        <div className="animate-pulse space-y-6">
          {/* Welcome Skeleton */}
          <div className="h-36 bg-white border border-[#E5E7EB] rounded-xl"></div>
          {/* KPI Skeleton */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-white border border-[#E5E7EB] rounded-xl"></div>
            ))}
          </div>
          {/* Schedule Skeleton */}
          <div className="h-64 bg-white border border-[#E5E7EB] rounded-xl"></div>
        </div>
      </DoctorLayout>
    );
  }

  if (error) {
    return (
      <DoctorLayout pageTitle="Dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="text-center p-8 bg-white rounded-xl border border-[#E5E7EB] shadow-sm max-w-md">
            <div className="w-14 h-14 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-2xl">error</span>
            </div>
            <h3 className="text-headline-sm font-headline-sm font-bold text-on-surface mb-2">Unable to load dashboard</h3>
            <p className="text-body-md text-on-surface-variant mb-5">Something went wrong while loading your clinical data.</p>
            <button onClick={initializeDashboard} className="px-5 py-2 bg-primary-container text-on-primary rounded-lg text-label-md font-label-md hover:bg-[#5249EC] transition-colors">
              Try Again
            </button>
          </div>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout pageTitle="Dashboard">
      <div className="space-y-6">

        {/* Welcome Banner */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="text-headline-lg font-headline-lg font-bold text-on-surface tracking-tight">
                  Welcome back, Dr. {profile?.first_name} {profile?.last_name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-label-sm font-label-sm font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  On Shift
                </span>
              </div>
              <p className="text-body-md text-on-surface-variant">Today is {todayDisplay}.</p>
              <p className="text-body-md text-on-surface-variant mt-1">
                {kpi.todayTotal === 0 ? (
                  'No consultations scheduled for today.'
                ) : (
                  <>
                    You have <strong className="text-on-surface">{kpi.todayTotal} consultation{kpi.todayTotal !== 1 ? 's' : ''}</strong> scheduled today
                    {kpi.todayVideo > 0 && kpi.todayInPerson > 0 && (
                      <> ({kpi.todayVideo} Video · {kpi.todayInPerson} In-Person)</>
                    )}
                    {kpi.todayVideo > 0 && kpi.todayInPerson === 0 && <> ({kpi.todayVideo} Video)</>}
                    {kpi.todayInPerson > 0 && kpi.todayVideo === 0 && <> ({kpi.todayInPerson} In-Person)</>}.
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigate('/doctor/availability')}
                className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#E5E7EB] bg-white text-on-surface hover:bg-[#F7F8FC] text-label-md font-label-md transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">event_available</span>
                <span>Manage Availability</span>
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {/* KPI 1: Today's Consultations */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Today's Consults</span>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-container text-[20px]">calendar_month</span>
              </div>
            </div>
            <div className="text-display-sm font-display-sm font-bold text-on-surface">{kpi.todayTotal}</div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-label-sm font-label-sm text-emerald-700">{kpi.todayCompleted} Completed</span>
              <span className="text-outline">·</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">{kpi.todayRemaining} Remaining</span>
            </div>
          </div>

          {/* KPI 2: Active Patients */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Active Patients</span>
              <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-[20px]">group</span>
              </div>
            </div>
            <div className="text-display-sm font-display-sm font-bold text-on-surface">{kpi.activePatients}</div>
            <p className="text-label-sm font-label-sm text-on-surface-variant mt-2">Unique patient panel</p>
          </div>

          {/* KPI 3: Prescription Records */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Prescriptions</span>
              <div className="w-9 h-9 rounded-lg bg-tertiary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-[20px]">prescriptions</span>
              </div>
            </div>
            <div className="text-display-sm font-display-sm font-bold text-on-surface">{kpi.pendingPrescriptions}</div>
            <p className="text-label-sm font-label-sm text-on-surface-variant mt-2">Total prescriptions issued</p>
          </div>

          {/* KPI 4: Rating */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Patient Rating</span>
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
            </div>
            {(() => {
              const count = doctorData?.reviews?.length ?? doctorData?.total_reviews ?? 0;
              const avg = doctorData?.reviews?.length > 0
                ? (doctorData.reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / doctorData.reviews.length).toFixed(1)
                : (Number(doctorData?.rating) > 0 ? Number(doctorData.rating).toFixed(1) : null);
              return (
                <>
                  <div className="text-display-sm font-display-sm font-bold text-on-surface">
                    {count > 0 && avg ? avg : '—'}
                  </div>
                  <p className="text-label-sm font-label-sm text-on-surface-variant mt-2">
                    {count > 0 ? `${count} ${count === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}
                  </p>
                </>
              );
            })()}
          </div>
        </div>

        {/* Today's Clinical Schedule */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-[#E5E7EB]">
            <div>
              <h2 className="text-headline-sm font-headline-sm font-bold text-on-surface">Today's Clinical Schedule</h2>
              <p className="text-body-sm font-body-sm text-on-surface-variant">Real-time consultation flow & patient status</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#F7F8FC] rounded-lg border border-[#E5E7EB]">
              {[
                { key: 'all', label: 'All', count: todayAppointments.length },
                { key: 'video', label: 'Video', count: todayAppointments.filter(a => a.mode === 'online').length },
                { key: 'clinic', label: 'Clinic', count: todayAppointments.filter(a => a.mode === 'offline').length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setScheduleFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-label-sm font-label-sm transition-colors ${
                    scheduleFilter === tab.key
                      ? 'bg-white text-on-surface font-semibold shadow-sm border border-[#E5E7EB]'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {/* Appointment List */}
          <div className="divide-y divide-[#E5E7EB]">
            {loadingAppointments ? (
              <div className="p-8 space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-[#F7F8FC] rounded-lg"></div>
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="py-14 text-center px-6">
                <div className="w-14 h-14 bg-[#F7F8FC] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-2xl text-on-surface-variant">event_busy</span>
                </div>
                <h3 className="text-headline-sm font-headline-sm font-semibold text-on-surface mb-1">No consultations scheduled for today</h3>
                <p className="text-body-sm text-on-surface-variant mb-4">
                  {scheduleFilter !== 'all' ? 'Try changing the filter above.' : 'Manage your availability to accept new appointments.'}
                </p>
                <button
                  onClick={() => navigate('/doctor/availability')}
                  className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-label-md font-label-md text-on-surface hover:bg-[#F7F8FC] transition-colors"
                >
                  Manage Availability
                </button>
              </div>
            ) : (
              filteredAppointments.map((apt, idx) => {
                const patient = apt.patients;
                const patientProfile = patient?.profiles;
                const statusConfig = getStatusConfig(apt.status);
                const age = getPatientAge(patientProfile?.dob);
                const isNext = idx === 0 && ['pending', 'confirmed'].includes(apt.status);
                const isVideo = apt.mode === 'online';

                return (
                  <div
                    key={apt.id}
                    className={`p-5 hover:bg-[#F7F8FC] transition-colors ${isNext ? 'border-l-4 border-l-primary-container' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Time Block */}
                      <div className="shrink-0 text-center w-16">
                        <div className="text-headline-sm font-headline-sm font-bold text-on-surface">{formatTime(apt.start_time)}</div>
                        {isNext && (
                          <div className="mt-1 text-label-sm font-label-sm text-primary-container font-semibold">Up Next</div>
                        )}
                      </div>

                      {/* Patient Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Avatar */}
                        {patientProfile?.profile_image ? (
                          <img src={patientProfile.profile_image} alt="Patient" className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-container flex items-center justify-center font-bold text-label-md shrink-0">
                            {patientProfile?.first_name?.[0]}{patientProfile?.last_name?.[0]}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className="text-body-md font-body-md font-semibold text-on-surface">
                              {patientProfile?.first_name} {patientProfile?.last_name}
                            </span>
                            {age && <span className="text-body-sm text-on-surface-variant">{age}y/o</span>}
                            {patientProfile?.gender && <span className="text-body-sm text-on-surface-variant capitalize">{patientProfile.gender}</span>}
                          </div>
                          {apt.reason && (
                            <p className="text-body-sm text-on-surface-variant truncate">{apt.reason}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-label-sm font-label-sm ${statusConfig.cls}`}>
                              {statusConfig.label}
                            </span>
                            <span className={`flex items-center gap-1 text-label-sm font-label-sm ${isVideo ? 'text-primary-container' : 'text-on-surface-variant'}`}>
                              <span className="material-symbols-outlined text-[14px]">{isVideo ? 'videocam' : 'home_health'}</span>
                              {isVideo ? 'Telehealth' : 'Clinic Visit'}
                            </span>
                            <span className="text-label-sm text-outline">#{apt.appointment_number}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {apt.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateStatus(apt.id, 'confirmed')}
                              className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-label-md font-label-md hover:bg-emerald-700 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => updateStatus(apt.id, 'cancelled')}
                              className="h-8 px-3 rounded-lg border border-[#E5E7EB] text-error text-label-md font-label-md hover:bg-error/5 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {apt.status === 'confirmed' && (
                          <>
                            {isVideo && (
                              <button className="h-8 px-3 rounded-lg bg-primary-container text-on-primary text-label-md font-label-md hover:bg-[#5249EC] transition-colors flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px]">videocam</span>
                                Start Video
                              </button>
                            )}
                            <button
                              onClick={() => updateStatus(apt.id, 'completed')}
                              className="h-8 px-3 rounded-lg border border-[#E5E7EB] text-on-surface text-label-md font-label-md hover:bg-[#F7F8FC] transition-colors"
                            >
                              Mark Done
                            </button>
                          </>
                        )}
                        {apt.status === 'completed' && (
                          <span className="text-label-sm text-emerald-700 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            Done
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer: Link to full consultation page */}
          {todayAppointments.length > 0 && (
            <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F7F8FC]">
              <button
                onClick={() => navigate('/doctor/appointments')}
                className="text-body-sm text-primary-container font-medium hover:underline flex items-center gap-1"
              >
                View full schedule & past appointments
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions Row */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
          <h2 className="text-headline-sm font-headline-sm font-bold text-on-surface mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { icon: 'event_available', label: 'Manage Availability', path: '/doctor/availability' },
              { icon: 'calendar_month', label: 'All Consultations', path: '/doctor/appointments' },
              { icon: 'manage_accounts', label: 'My Profile', path: '/doctor/profile' },
              { icon: 'folder_shared', label: 'Patient Records', path: '/doctor/patients' },
            ].map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#E5E7EB] hover:border-primary/30 hover:bg-primary/5 transition-all group text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">{action.icon}</span>
                </div>
                <span className="text-label-md font-label-md text-on-surface font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </DoctorLayout>
  );
};

export default DoctorDashboard;
