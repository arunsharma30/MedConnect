import React, { useEffect, useState } from 'react';
import DoctorLayout from '../components/DoctorLayout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// REAL Patient Records page for Doctors
// ─────────────────────────────────────────────────────────────
export const DoctorPatientRecords = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [patientMedicalRecords, setPatientMedicalRecords] = useState([]);
  const [patientReportFiles, setPatientReportFiles] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile) fetchPatients();
  }, [profile]);

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: get this doctor's ID
      const { data: docData, error: docErr } = await supabase
        .from('doctors')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (docErr || !docData) throw new Error(docErr?.message || 'Doctor profile not found.');

      // Step 2: fetch all appointments for this doctor with patient profile info
      const { data: apts, error: aptsErr } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          status,
          mode,
          reason,
          appointment_number,
          patient_id,
          patients(
            id,
            profiles(first_name, last_name, gender, dob, phone, profile_image, city, state)
          )
        `)
        .eq('doctor_id', docData.id)
        .order('appointment_date', { ascending: false });

      if (aptsErr) throw new Error(aptsErr.message);

      // Step 3: deduplicate by patient_id — keep latest appointment info
      const patientMap = new Map();
      (apts || []).forEach(apt => {
        if (!apt.patients) return;
        if (!patientMap.has(apt.patient_id)) {
          patientMap.set(apt.patient_id, {
            patientId: apt.patient_id,
            patientTableId: apt.patients.id,
            profile: apt.patients.profiles,
            latestApt: apt,
            totalApts: 1,
          });
        } else {
          patientMap.get(apt.patient_id).totalApts += 1;
        }
      });

      setPatients(Array.from(patientMap.values()));
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setLoadingDetail(true);
    setPatientAppointments([]);
    setPatientMedicalRecords([]);
    setPatientReportFiles([]);

    try {
      const { data: docData } = await supabase
        .from('doctors')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!docData) return;

      // All appointments between this doctor and this patient
      const { data: apts } = await supabase
        .from('appointments')
        .select('id, appointment_date, start_time, status, mode, reason, appointment_number, reviews(id, rating, review, created_at)')
        .eq('doctor_id', docData.id)
        .eq('patient_id', patient.patientId)
        .order('appointment_date', { ascending: false });

      if (apts) setPatientAppointments(apts);

      // Medical records this doctor created for this patient
      const { data: records } = await supabase
        .from('medical_records')
        .select('id, diagnosis, blood_pressure, temperature, weight, heart_rate, remarks, created_at')
        .eq('doctor_id', docData.id)
        .eq('patient_id', patient.patientTableId)
        .order('created_at', { ascending: false });

      if (records) setPatientMedicalRecords(records);

      // Report files uploaded by this patient
      const { data: reportFiles } = await supabase
        .from('report_files')
        .select('id, file_name, file_url, file_type, created_at')
        .eq('patient_id', patient.patientTableId)
        .order('created_at', { ascending: false });

      if (reportFiles) setPatientReportFiles(reportFiles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getAge = (dob) => {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const d = new Date();
    d.setHours(+h, +m);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getStatusCls = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'completed': return 'bg-primary/10 text-primary border-primary/20';
      case 'cancelled':  return 'bg-error/10 text-error border-error/20';
      case 'pending':    return 'bg-amber-50 text-amber-800 border-amber-200';
      default: return 'bg-surface-container text-on-surface-variant border-outline-variant';
    }
  };

  const filteredPatients = patients.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${p.profile?.first_name ?? ''} ${p.profile?.last_name ?? ''}`.toLowerCase();
    const phone = (p.profile?.phone || '').toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  return (
    <DoctorLayout pageTitle="Patient Records">
      <div className="flex flex-col lg:flex-row gap-6 min-h-[60vh]">

        {/* ── LEFT: Patient List ── */}
        <div className="lg:w-80 xl:w-96 shrink-0 bg-white border border-[#E5E7EB] rounded-xl shadow-sm flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[#E5E7EB]">
            <h2 className="text-headline-sm font-headline-sm font-bold text-on-surface mb-3">My Patients</h2>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant pointer-events-none">
                <span className="material-symbols-outlined text-[18px]">search</span>
              </span>
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E5E7EB] bg-[#F7F8FC] text-body-sm text-on-surface focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Patient List Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB]">
            {loading ? (
              <div className="p-6 space-y-3 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-[#F7F8FC] rounded-lg" />)}
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-body-sm text-error mb-3">{error}</p>
                <button
                  onClick={fetchPatients}
                  className="px-4 py-2 bg-primary-container text-on-primary text-label-md rounded-lg hover:bg-[#5249EC] transition-colors"
                >Try Again</button>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2 block">person_off</span>
                <p className="text-body-sm text-on-surface-variant">
                  {patients.length === 0
                    ? 'No patients yet. Accept consultations to see patient records here.'
                    : 'No patients match your search.'}
                </p>
              </div>
            ) : (
              filteredPatients.map(patient => {
                const isSelected = selectedPatient?.patientId === patient.patientId;
                const age = getAge(patient.profile?.dob);
                return (
                  <button
                    key={patient.patientId}
                    onClick={() => handleSelectPatient(patient)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#F7F8FC] transition-colors ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary-container' : ''}`}
                  >
                    {patient.profile?.profile_image ? (
                      <img src={patient.profile.profile_image} alt="Patient" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary-container flex items-center justify-center font-bold text-label-md shrink-0">
                        {patient.profile?.first_name?.[0]}{patient.profile?.last_name?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-body-md font-semibold text-on-surface truncate">
                        {patient.profile?.first_name} {patient.profile?.last_name}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {age ? `${age}y` : ''}
                        {age && patient.profile?.gender ? ' · ' : ''}
                        {patient.profile?.gender || ''}
                        {' · '}<span className="text-primary-container">{patient.totalApts} visit{patient.totalApts !== 1 ? 's' : ''}</span>
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {!loading && !error && (
            <div className="px-4 py-2 border-t border-[#E5E7EB] bg-[#F7F8FC]">
              <p className="text-label-sm text-on-surface-variant">
                {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} total
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Patient Detail Panel ── */}
        <div className="flex-1 min-w-0">
          {!selectedPatient ? (
            <div className="h-full flex items-center justify-center bg-white border border-[#E5E7EB] rounded-xl shadow-sm py-20">
              <div className="text-center px-6">
                <div className="w-16 h-16 bg-[#F7F8FC] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-2xl text-on-surface-variant">person_search</span>
                </div>
                <h3 className="text-headline-sm font-headline-sm font-semibold text-on-surface mb-1">Select a Patient</h3>
                <p className="text-body-sm text-on-surface-variant max-w-xs mx-auto">
                  Choose a patient from the list on the left to view their appointment history and medical records.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">

              {/* Patient Overview Card */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-5">
                <div className="flex items-start gap-4">
                  {selectedPatient.profile?.profile_image ? (
                    <img src={selectedPatient.profile.profile_image} alt="Patient" className="w-16 h-16 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary-container flex items-center justify-center font-bold text-headline-sm shrink-0">
                      {selectedPatient.profile?.first_name?.[0]}{selectedPatient.profile?.last_name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-headline-sm font-headline-sm font-bold text-on-surface">
                      {selectedPatient.profile?.first_name} {selectedPatient.profile?.last_name}
                    </h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      {getAge(selectedPatient.profile?.dob) && (
                        <span className="text-body-sm text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">cake</span>
                          {getAge(selectedPatient.profile?.dob)} years old
                        </span>
                      )}
                      {selectedPatient.profile?.gender && (
                        <span className="text-body-sm text-on-surface-variant flex items-center gap-1 capitalize">
                          <span className="material-symbols-outlined text-[14px]">wc</span>
                          {selectedPatient.profile.gender}
                        </span>
                      )}
                      {selectedPatient.profile?.phone && (
                        <span className="text-body-sm text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">phone</span>
                          {selectedPatient.profile.phone}
                        </span>
                      )}
                      {(selectedPatient.profile?.city || selectedPatient.profile?.state) && (
                        <span className="text-body-sm text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          {[selectedPatient.profile?.city, selectedPatient.profile?.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full bg-primary/10 text-primary-container text-label-sm font-label-sm">
                    {selectedPatient.totalApts} Visit{selectedPatient.totalApts !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {loadingDetail ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-48 bg-white border border-[#E5E7EB] rounded-xl" />
                  <div className="h-48 bg-white border border-[#E5E7EB] rounded-xl" />
                </div>
              ) : (
                <>
                  {/* Appointment History */}
                  <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary-container text-[20px]">calendar_month</span>
                      <h3 className="text-headline-sm font-headline-sm font-semibold text-on-surface">Appointment History</h3>
                      <span className="ml-auto text-label-sm text-on-surface-variant">{patientAppointments.length} total</span>
                    </div>

                    {patientAppointments.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-body-sm text-on-surface-variant">No appointment records found.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#E5E7EB]">
                        {patientAppointments.map(apt => (
                          <div key={apt.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="shrink-0 sm:w-24">
                              <p className="text-label-sm font-label-sm text-on-surface-variant">{formatDate(apt.appointment_date)}</p>
                              <p className="text-body-md font-semibold text-on-surface">{formatTime(apt.start_time)}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              {apt.reason && (
                                <p className="text-body-sm text-on-surface truncate mb-1">{apt.reason}</p>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-full text-label-sm font-label-sm border ${getStatusCls(apt.status)}`}>
                                  {apt.status}
                                </span>
                                <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                                  <span className="material-symbols-outlined text-[13px]">
                                    {apt.mode === 'online' ? 'videocam' : 'home_health'}
                                  </span>
                                  {apt.mode === 'online' ? 'Telehealth' : 'In-Person'}
                                </span>
                                <span className="text-label-sm text-outline">#{apt.appointment_number}</span>
                              </div>
                              {apt.reviews && apt.reviews.length > 0 && (
                                <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/70 text-body-xs">
                                  <div className="flex items-center gap-1 text-amber-700 font-semibold mb-0.5">
                                    <span className="material-symbols-outlined text-[15px] text-amber-500" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                    <span>Patient Rating: {apt.reviews[0].rating}/5</span>
                                  </div>
                                  {apt.reviews[0].review && (
                                    <p className="text-on-surface-variant italic">"{apt.reviews[0].review}"</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Medical Records */}
                  <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary-container text-[20px]">medical_information</span>
                      <h3 className="text-headline-sm font-headline-sm font-semibold text-on-surface">Medical Records</h3>
                      <span className="ml-auto text-label-sm text-on-surface-variant">
                        {patientMedicalRecords.length} record{patientMedicalRecords.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {patientMedicalRecords.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-body-sm text-on-surface-variant">
                          No medical records have been created for this patient yet.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#E5E7EB]">
                        {patientMedicalRecords.map(record => (
                          <div key={record.id} className="px-5 py-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-body-md font-semibold text-on-surface">
                                {record.diagnosis || 'General Consultation'}
                              </h4>
                              <p className="text-label-sm text-on-surface-variant shrink-0 ml-2">{formatDate(record.created_at)}</p>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-1 p-3 bg-[#F7F8FC] rounded-lg border border-[#E5E7EB] mb-2">
                              {record.blood_pressure && (
                                <div className="text-body-sm">
                                  <span className="text-on-surface-variant">BP: </span>
                                  <span className="font-medium text-on-surface">{record.blood_pressure}</span>
                                </div>
                              )}
                              {record.heart_rate && (
                                <div className="text-body-sm">
                                  <span className="text-on-surface-variant">HR: </span>
                                  <span className="font-medium text-on-surface">{record.heart_rate} bpm</span>
                                </div>
                              )}
                              {record.temperature && (
                                <div className="text-body-sm">
                                  <span className="text-on-surface-variant">Temp: </span>
                                  <span className="font-medium text-on-surface">{record.temperature}°</span>
                                </div>
                              )}
                              {record.weight && (
                                <div className="text-body-sm">
                                  <span className="text-on-surface-variant">Weight: </span>
                                  <span className="font-medium text-on-surface">{record.weight} kg</span>
                                </div>
                              )}
                              {!record.blood_pressure && !record.heart_rate && !record.temperature && !record.weight && (
                                <span className="text-body-sm text-on-surface-variant">No vitals recorded.</span>
                              )}
                            </div>
                            {record.remarks && (
                              <p className="text-body-sm text-on-surface-variant italic">"{record.remarks}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Patient Uploaded Documents */}
                  <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary-container text-[20px]">folder_open</span>
                      <h3 className="text-headline-sm font-headline-sm font-semibold text-on-surface">Patient Documents</h3>
                      <span className="ml-auto text-label-sm text-on-surface-variant">
                        {patientReportFiles.length} file{patientReportFiles.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {patientReportFiles.length === 0 ? (
                      <div className="p-8 text-center">
                        <span className="material-symbols-outlined text-2xl text-on-surface-variant mb-2 block">upload_file</span>
                        <p className="text-body-sm text-on-surface-variant">
                          This patient has not uploaded any documents yet.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#E5E7EB]">
                        {patientReportFiles.map(file => {
                          const isPdf = file.file_type?.includes('pdf');
                          const isImage = file.file_type?.includes('image');
                          const fileIcon = isPdf ? 'picture_as_pdf' : isImage ? 'image' : 'description';
                          const fileIconColor = isPdf ? 'text-red-500' : isImage ? 'text-sky-500' : 'text-on-surface-variant';

                          return (
                            <div key={file.id} className="px-5 py-4 flex items-center gap-4 hover:bg-[#F7F8FC] transition-colors">
                              {/* File Type Icon */}
                              <div className="w-10 h-10 rounded-lg bg-[#F7F8FC] border border-[#E5E7EB] flex items-center justify-center shrink-0">
                                <span className={`material-symbols-outlined text-[22px] ${fileIconColor}`}>{fileIcon}</span>
                              </div>

                              {/* File Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-body-md font-semibold text-on-surface truncate">{file.file_name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-label-sm text-on-surface-variant">
                                    {isPdf ? 'PDF' : isImage ? 'Image' : 'Document'}
                                  </span>
                                  <span className="text-outline text-label-sm">·</span>
                                  <span className="text-label-sm text-on-surface-variant">
                                    Uploaded {formatDate(file.created_at)}
                                  </span>
                                </div>
                              </div>

                              {/* View Button */}
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E5E7EB] text-primary-container text-label-md font-label-md hover:bg-primary/5 hover:border-primary/30 transition-colors"
                                title="Open document in new tab"
                              >
                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                <span>View</span>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </DoctorLayout>
  );
};

// ─────────────────────────────────────────────────────────────
// Stub pages — unchanged functionality
// ─────────────────────────────────────────────────────────────
const ComingSoonPage = ({ title, icon, description }) => {
  const navigate = useNavigate();
  return (
    <DoctorLayout pageTitle={title}>
      <div className="flex items-center justify-center py-20">
        <div className="text-center p-10 bg-white rounded-xl border border-[#E5E7EB] shadow-sm max-w-md w-full">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-primary-container text-3xl">{icon}</span>
          </div>
          <h2 className="text-headline-sm font-headline-sm font-bold text-on-surface mb-2">{title}</h2>
          <p className="text-body-md text-on-surface-variant mb-6">{description}</p>
          <button
            onClick={() => navigate('/doctor/dashboard')}
            className="px-5 py-2 border border-[#E5E7EB] rounded-lg text-label-md font-label-md text-on-surface hover:bg-[#F7F8FC] transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </DoctorLayout>
  );
};

export { default as DoctorPrescriptions } from './DoctorPrescriptions';

export const DoctorDiagnostics = () => (
  <ComingSoonPage
    title="Diagnostics & Labs"
    icon="biotech"
    description="Review lab results and diagnostic reports submitted by patients or ordered during consultations."
  />
);

export { default as DoctorBilling } from './DoctorBillingPage';
