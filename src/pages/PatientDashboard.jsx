import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import PatientLayout from '../components/PatientLayout';

const PatientDashboard = () => {
  const { profile } = useAuth();
  
  const [upcomingVisit, setUpcomingVisit] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [careTeam, setCareTeam] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    // 1. Get patient ID
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('profile_id', profile.id)
      .single();
      
    if (!patient) {
      setLoading(false);
      return;
    }
    const patientId = patient.id;

    // 2. Fetch Upcoming Visit (Confirmed, >= today)
    const now = new Date().toISOString();
    const { data: visitData } = await supabase
      .from('appointments')
      .select('*, doctors(profiles(first_name, last_name), specializations(name))')
      .eq('patient_id', patientId)
      .in('status', ['confirmed', 'pending'])
      .gte('appointment_date', now)
      .order('appointment_date', { ascending: true })
      .limit(1);
    
    if (visitData && visitData.length > 0) {
      setUpcomingVisit(visitData[0]);
    }

    // 4. Fetch Active Prescriptions
    const { data: prescriptionData } = await supabase
      .from('prescriptions')
      .select('*, prescription_items(dosage, frequency, duration, medicine_id, quantity), doctors(profiles(first_name, last_name))')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (prescriptionData) {
      setPrescriptions(prescriptionData);
    }

    // 5. Fetch Care Team (distinct doctors from appointments)
    const { data: teamData } = await supabase
      .from('appointments')
      .select('doctors(id, profiles(first_name, last_name), specializations(name))')
      .eq('patient_id', patientId)
      .limit(10);
      
    if (teamData) {
      // deduplicate doctors
      const uniqueDocs = [];
      const map = new Map();
      for (const item of teamData) {
        if (!map.has(item.doctors.id)) {
          map.set(item.doctors.id, true);
          uniqueDocs.push(item.doctors);
        }
      }
      setCareTeam(uniqueDocs.slice(0, 3)); // Show top 3
    }

    // 6. Fetch Clinical Documents
    const { data: docsData } = await supabase
      .from('report_files')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(2);
      
    if (docsData) {
      setDocuments(docsData);
    }

    setLoading(false);
  };

  const getDaysUntil = (dateString) => {
    const today = new Date();
    const date = new Date(dateString);
    const diffTime = Math.abs(date - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
  };

  const getGreeting = () => {
    const options = { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false };
    const hour = parseInt(new Intl.DateTimeFormat('en-US', options).format(new Date()), 10);
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <PatientLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout>
      {/* Hero Greeting & Metric Quick Ticker */}
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low text-primary text-label-sm font-label-sm">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            HIPAA Secure Clinical Portal
          </div>
          <h1 className="text-display-sm font-display-sm text-on-surface font-bold tracking-tight">
            {getGreeting()}, {profile?.first_name || 'Patient'}.
          </h1>
          <p className="text-body-md font-body-md text-on-surface-variant max-w-2xl">
            Here is your personal health overview. Your latest comprehensive labs have been reviewed by your care team.
          </p>
          
          {/* Quick Status Chips Row */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            {upcomingVisit && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-label-sm font-label-sm">
                <span className="material-symbols-outlined text-[15px]">event_upcoming</span>
                Next Visit in {getDaysUntil(upcomingVisit.appointment_date)} days
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-on-surface text-label-sm font-label-sm border border-outline-variant">
              <span className="material-symbols-outlined text-[15px]">medication</span>
              {prescriptions.length} Active Prescriptions
            </div>
            {documents.length > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-secondary border border-purple-200 text-label-sm font-label-sm">
                <span className="material-symbols-outlined text-[15px]">assignment_turned_in</span>
                Lab Results Ready
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Action Callouts */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 z-10">
          <Link to="/patient/book-appointment" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-secondary active:scale-95 text-on-primary text-label-md font-label-md font-medium shadow-sm transition-all duration-150">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Book New Consultation
          </Link>
          <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low text-label-md font-label-md font-medium transition-colors">
            <span className="material-symbols-outlined text-[18px] text-primary">send</span>
            Message Care Team
          </button>
        </div>
        
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-surface-container rounded-full filter blur-3xl opacity-50 pointer-events-none"></div>
      </section>

      {/* Main Grid Dashboard: 12 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column / Primary Clinical Stream (8 Cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Prominent Upcoming Consultation Card */}
          {upcomingVisit ? (
            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                  <h2 className="text-headline-md font-headline-md text-on-surface">Upcoming Telehealth Visit</h2>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-label-sm font-label-sm border flex items-center gap-1 ${upcomingVisit.status === 'confirmed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {upcomingVisit.status === 'confirmed' ? 'check_circle' : 'pending_actions'}
                  </span>
                  {upcomingVisit.status === 'confirmed' ? 'Confirmed' : 'Pending Approval'}
                </span>
              </div>
              
              {/* Doctor Feature Box */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center text-primary text-headline-lg font-bold shadow-sm">
                  {upcomingVisit.doctors?.profiles?.first_name?.[0]}{upcomingVisit.doctors?.profiles?.last_name?.[0]}
                </div>
                <div className="flex-grow space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-headline-sm font-headline-sm text-on-surface font-semibold">
                      Dr. {upcomingVisit.doctors?.profiles?.first_name} {upcomingVisit.doctors?.profiles?.last_name}
                    </h3>
                    <span className="text-body-sm font-body-sm text-on-surface-variant">· {upcomingVisit.doctors?.specializations?.name || 'General Practice'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-body-sm font-body-sm text-on-surface-variant">
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <span className="material-symbols-outlined text-[16px]">videocam</span>
                      HD Video Telehealth
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      {new Date(upcomingVisit.appointment_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      {upcomingVisit.start_time} - {upcomingVisit.end_time}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons Bar */}
              <div className="mt-5 flex flex-wrap items-center gap-3 justify-between border-t border-outline-variant/70 pt-4">
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-secondary active:scale-95 text-on-primary text-label-md font-label-md font-medium transition-all shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">meeting_room</span>
                    Join Waiting Room
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low text-label-md font-label-md font-medium transition-colors">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">edit_calendar</span>
                    Reschedule
                  </button>
                </div>
                <button className="inline-flex items-center gap-1 text-label-md font-label-md text-primary hover:text-secondary font-medium transition-colors">
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Add to Calendar (.ics)
                </button>
              </div>
            </section>
          ) : (
            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <span className="material-symbols-outlined text-[48px] text-outline-variant">event_busy</span>
              <div>
                <h2 className="text-headline-md font-headline-md text-on-surface">No Upcoming Visits</h2>
                <p className="text-body-md text-on-surface-variant">You don't have any telehealth visits scheduled.</p>
              </div>
              <Link to="/patient/book-appointment" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary font-medium hover:bg-secondary transition-colors">
                Book a Consultation
              </Link>
            </section>
          )}
          
          {/* Active Prescriptions Tracker */}
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-headline-md font-headline-md text-on-surface">Active Medications & Refills</h2>
                <p className="text-body-sm font-body-sm text-on-surface-variant">Managed through MedConnect Partner Pharmacy</p>
              </div>
            </div>
            
            {prescriptions.length === 0 ? (
              <div className="py-8 text-center text-on-surface-variant border-t border-outline-variant">
                No active prescriptions on file.
              </div>
            ) : (
              <div className="divide-y divide-outline-variant">
                {prescriptions.map((prescription) => (
                  <div key={prescription.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary mt-0.5 shrink-0">
                        <span className="material-symbols-outlined text-[22px]">pill</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-headline-sm font-headline-sm text-on-surface">{prescription.diagnosis || 'Prescription'}</h3>
                          <span className="text-label-sm font-label-sm bg-surface-container px-2 py-0.5 rounded text-primary font-medium">Active</span>
                        </div>
                        <p className="text-body-sm font-body-sm text-on-surface-variant">{prescription.instructions}</p>
                        <p className="text-label-sm font-label-sm text-on-surface-variant mt-1">
                          Prescribed by Dr. {prescription.doctors?.profiles?.first_name} {prescription.doctors?.profiles?.last_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button className="px-3.5 py-1.5 rounded-lg border border-outline-variant text-label-md font-label-md font-medium text-on-surface hover:bg-surface-container-low transition-colors">
                        Dosage Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        
        {/* Right Column / Care Team & Document Center (4 Cols) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* My Dedicated Care Team */}
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-md font-headline-md text-on-surface">My Care Team</h2>
              <button className="text-label-sm font-label-sm text-primary hover:underline">Manage Team</button>
            </div>
            
            <div className="space-y-3">
              {careTeam.length === 0 ? (
                <div className="p-4 text-center text-on-surface-variant text-body-sm">
                  You haven't visited any doctors yet.
                </div>
              ) : (
                careTeam.map((doc, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-outline-variant hover:border-primary transition-all flex items-center justify-between gap-3 bg-surface-container-lowest">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center text-primary font-semibold text-label-md">
                        {doc.profiles?.first_name?.[0]}{doc.profiles?.last_name?.[0]}
                      </div>
                      <div>
                        <h4 className="text-label-md font-label-md font-semibold text-on-surface">Dr. {doc.profiles?.first_name} {doc.profiles?.last_name}</h4>
                        <p className="text-label-sm font-label-sm text-on-surface-variant truncate max-w-[150px]">{doc.specializations?.name || 'Physician'}</p>
                      </div>
                    </div>
                    <button className="p-2 text-primary hover:bg-surface-container rounded-lg transition-colors" title="Send direct message">
                      <span className="material-symbols-outlined text-[20px]">chat</span>
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <Link to="/patient/doctors" className="w-full py-2 border border-dashed border-outline-variant rounded-lg text-label-md font-label-md text-on-surface-variant hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              Add Care Provider to Circle
            </Link>
          </section>

          {/* Lab Results & Diagnostic Documents */}
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-md font-headline-md text-on-surface">Clinical Documents</h2>
              <Link to="/patient/records" className="text-label-sm font-label-sm text-primary hover:underline">View All</Link>
            </div>
            
            <div className="space-y-3">
              {documents.length === 0 ? (
                <div className="p-4 text-center text-on-surface-variant text-body-sm">
                  No documents found.
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/60 hover:border-primary transition-all flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-surface-container-lowest text-primary shadow-xs">
                      <span className="material-symbols-outlined text-[22px]">{doc.file_type?.includes('pdf') ? 'picture_as_pdf' : 'medical_information'}</span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="text-label-md font-label-md font-semibold text-on-surface truncate">{doc.file_name}</h4>
                      <p className="text-label-sm font-label-sm text-on-surface-variant">{new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-primary p-1" title="Download Document">
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </a>
                  </div>
                ))
              )}
            </div>
            
            <div className="pt-2">
              <Link to="/patient/records" className="w-full py-2.5 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-label-md font-label-md font-medium flex items-center justify-center gap-2 transition-colors">
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Upload External Health Record
              </Link>
            </div>
          </section>

          {/* Care Concierge */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-surface-container-low to-surface border border-outline-variant/70 space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[20px]">shield</span>
              <h4 className="text-headline-sm font-headline-sm font-semibold">Care Concierge 24/7</h4>
            </div>
            <p className="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
              Need urgent clinical advice before your appointment? A registered MedConnect nurse is available 24 hours a day for triage assistance.
            </p>
            <button className="inline-flex items-center gap-1 text-label-md font-label-md text-primary font-medium hover:underline pt-1">
              <span>Call Nurse Hotline</span>
              <span className="material-symbols-outlined text-[14px]">phone_in_talk</span>
            </button>
          </div>
          
        </div>
      </div>
    </PatientLayout>
  );
};

export default PatientDashboard;
