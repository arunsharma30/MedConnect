import React, { useState } from 'react';

const AppointmentDetailsModal = ({
  isOpen,
  onClose,
  appointment,
  onOpenReview
}) => {
  const [activeTab, setActiveTab] = useState('rx'); // 'rx' | 'overview'

  if (!isOpen || !appointment) return null;

  const doctor = appointment.doctors;
  const doctorName = doctor?.profiles
    ? `Dr. ${doctor.profiles.first_name} ${doctor.profiles.last_name}`
    : 'Doctor';
  const specialty = doctor?.specializations?.name || 'General Practice';
  const hospital = doctor?.hospitals;

  // Prescriptions can be an array or single object
  const prescription = Array.isArray(appointment.prescriptions)
    ? appointment.prescriptions[0]
    : appointment.prescriptions;

  // Medical records
  const medicalRecord = Array.isArray(appointment.medical_records)
    ? appointment.medical_records[0]
    : appointment.medical_records;

  // Review
  const review = Array.isArray(appointment.reviews)
    ? appointment.reviews[0]
    : appointment.reviews;

  // Parse prescription text
  const parseMedications = () => {
    if (!prescription) return [];

    // 1. If prescription_items table has rows
    if (prescription.prescription_items && prescription.prescription_items.length > 0) {
      return prescription.prescription_items.map(item => ({
        name: item.medicines?.name || 'Prescribed Medicine',
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        quantity: item.quantity
      }));
    }

    // 2. Parse from structured instructions text
    const text = prescription.instructions || '';
    const meds = [];
    const lines = text.split('\n');

    let inMedsSection = false;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.includes('Rx MEDICATIONS:') || line.startsWith('Rx:')) {
        inMedsSection = true;
        continue;
      }
      if (line.includes("DOCTOR'S ADVICE") || line.includes("SPECIAL INSTRUCTIONS")) {
        inMedsSection = false;
        break;
      }

      // Match numbered line e.g. "1. Paracetamol 650mg — 1 Tablet — Three times daily — 5 days (Qty: 15)"
      if (/^\d+\./.test(line)) {
        const withoutNumber = line.replace(/^\d+\.\s*/, '');
        const parts = withoutNumber.split(/[—–-]/).map(p => p.trim());
        const name = parts[0] || 'Medicine';
        const dosage = parts[1] || 'As directed';
        const frequency = parts[2] || 'As directed';
        
        let duration = parts[3] || '';
        let quantity = '';
        if (duration.includes('(Qty:')) {
          const qtyMatch = duration.match(/\(Qty:\s*([^)]+)\)/);
          if (qtyMatch) quantity = qtyMatch[1];
          duration = duration.replace(/\(Qty:[^)]+\)/, '').trim();
        }

        meds.push({ name, dosage, frequency, duration, quantity });
      }
    }

    return meds;
  };

  const parseDoctorAdvice = () => {
    if (!prescription) return '';
    const text = prescription.instructions || '';
    if (text.includes("DOCTOR'S ADVICE & SPECIAL INSTRUCTIONS:")) {
      const parts = text.split("DOCTOR'S ADVICE & SPECIAL INSTRUCTIONS:");
      return parts[1]?.trim() || '';
    }
    if (text.includes("SPECIAL INSTRUCTIONS:")) {
      const parts = text.split("SPECIAL INSTRUCTIONS:");
      return parts[1]?.trim() || '';
    }
    // If not in structured format, return full text if no numbered meds were found
    if (!text.includes('1.')) {
      return text.trim();
    }
    return '';
  };

  const parsedMeds = parseMedications();
  const doctorAdvice = parseDoctorAdvice();

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const getStatusBadgeCls = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-700 bg-green-100 border-green-200';
      case 'completed': return 'text-primary bg-primary/10 border-primary/20';
      case 'cancelled': return 'text-error bg-error/10 border-error/20';
      case 'pending': return 'text-amber-700 bg-amber-100 border-amber-200';
      default: return 'text-on-surface-variant bg-surface-variant border-outline-variant';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-5 border-b border-outline-variant/50 flex items-center justify-between shrink-0 bg-surface-container-low/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <span className="material-symbols-outlined text-[24px]">
                {prescription ? 'prescriptions' : 'calendar_month'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-title-md font-bold text-on-surface">Consultation #{appointment.appointment_number}</h3>
                <span className={`px-2 py-0.5 rounded-full text-label-xs font-semibold uppercase border ${getStatusBadgeCls(appointment.status)}`}>
                  {appointment.status}
                </span>
              </div>
              <p className="text-body-xs text-on-surface-variant">
                {formatDate(appointment.appointment_date)} • {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-outline-variant/40 flex items-center gap-2 shrink-0 bg-surface-container-lowest">
          <button
            onClick={() => setActiveTab('rx')}
            className={`pb-3 px-3 text-label-md font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'rx'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">prescriptions</span>
            <span>Prescription & Medicines</span>
            {prescription && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-3 text-label-md font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">info</span>
            <span>Consultation Overview</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* TAB 1: PRESCRIPTION & MEDICINES */}
          {activeTab === 'rx' && (
            <div className="space-y-6">
              {prescription ? (
                <>
                  {/* Doctor & Prescription Banner */}
                  <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-body-md border border-primary/20 shrink-0">
                        {doctor?.profiles?.first_name?.[0] || 'D'}{doctor?.profiles?.last_name?.[0] || 'R'}
                      </div>
                      <div>
                        <h4 className="text-title-sm font-bold text-on-surface">{doctorName}</h4>
                        <p className="text-body-xs text-primary font-medium">{specialty} • {doctor?.qualification || 'MBBS'}</p>
                        {hospital?.name && (
                          <p className="text-label-xs text-on-surface-variant mt-0.5">{hospital.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-label-xs font-semibold">
                        <span className="material-symbols-outlined text-[13px]">verified</span>
                        Verified Prescription
                      </span>
                      <p className="text-label-xs text-outline mt-1">Issued: {formatDate(prescription.created_at)}</p>
                    </div>
                  </div>

                  {/* Primary Diagnosis */}
                  <div>
                    <span className="text-label-xs font-bold uppercase tracking-wider text-outline block mb-1.5">
                      Diagnosed Condition / Clinical Indication
                    </span>
                    <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/50 text-on-surface font-semibold text-body-md flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">stethoscope</span>
                      <span>{prescription.diagnosis || 'Clinical Diagnosis'}</span>
                    </div>
                  </div>

                  {/* Diagnosed Medicines (Rx) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-title-md font-serif italic font-extrabold text-primary">℞</span>
                        <h4 className="text-title-sm font-bold text-on-surface">Prescribed Medicines</h4>
                      </div>
                      <span className="text-label-xs text-on-surface-variant">
                        {parsedMeds.length > 0 ? `${parsedMeds.length} Medication${parsedMeds.length > 1 ? 's' : ''}` : ''}
                      </span>
                    </div>

                    {parsedMeds.length > 0 ? (
                      <div className="space-y-3">
                        {parsedMeds.map((med, idx) => (
                          <div 
                            key={idx} 
                            className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-lowest hover:border-primary/40 transition-colors shadow-2xs"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                  <span className="material-symbols-outlined text-[18px]">medication</span>
                                </div>
                                <div>
                                  <h5 className="font-bold text-body-md text-on-surface">{med.name}</h5>
                                  <span className="text-label-xs text-primary font-semibold">{med.dosage}</span>
                                </div>
                              </div>
                              {med.quantity && (
                                <span className="text-label-xs font-semibold px-2 py-0.5 rounded bg-surface-container-low text-on-surface-variant w-fit">
                                  Qty: {med.quantity}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-body-xs pt-2 border-t border-outline-variant/30 text-on-surface-variant">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[15px] text-outline">schedule</span>
                                <span><strong>Frequency:</strong> {med.frequency}</span>
                              </div>
                              {med.duration && (
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[15px] text-outline">timer</span>
                                  <span><strong>Duration:</strong> {med.duration}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/50 text-body-sm text-on-surface whitespace-pre-wrap leading-relaxed">
                        {prescription.instructions}
                      </div>
                    )}
                  </div>

                  {/* Doctor's Advice & Lifestyle Guidance */}
                  {doctorAdvice && (
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-body-sm text-amber-950">
                      <div className="flex items-center gap-1.5 font-bold mb-1.5 text-amber-900">
                        <span className="material-symbols-outlined text-[18px] text-amber-700">lightbulb</span>
                        Doctor's Instructions & Care Advice
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{doctorAdvice}</p>
                    </div>
                  )}

                  {/* Next Visit / Follow-up */}
                  {prescription.next_visit && (
                    <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-950 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-700 text-[20px]">event_repeat</span>
                        <div>
                          <p className="text-label-xs font-semibold text-blue-700 uppercase">Recommended Next Visit</p>
                          <p className="text-body-sm font-bold">{formatDate(prescription.next_visit)}</p>
                        </div>
                      </div>
                      <span className="text-label-xs px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium">Follow-up</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 px-4 bg-surface-container-low/50 rounded-xl border border-dashed border-outline-variant/60">
                  <div className="w-14 h-14 rounded-full bg-outline-variant/30 text-outline flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-3xl">prescriptions</span>
                  </div>
                  <h4 className="text-title-sm font-bold text-on-surface mb-1">No Prescription Issued</h4>
                  <p className="text-body-sm text-on-surface-variant max-w-sm mx-auto mb-4">
                    {appointment.status === 'completed'
                      ? 'The doctor completed this consultation without issuing a digital prescription.'
                      : 'Prescriptions are issued after or during your consultation with the physician.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('overview')}
                    className="text-label-sm font-semibold text-primary hover:underline"
                  >
                    View consultation overview →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONSULTATION OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Doctor Info Card */}
              <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-lowest flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-body-lg border border-primary/20 shrink-0">
                  {doctor?.profiles?.first_name?.[0] || 'D'}{doctor?.profiles?.last_name?.[0] || 'R'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-title-sm font-bold text-on-surface">{doctorName}</h4>
                  <p className="text-body-xs text-primary font-semibold">{specialty} • {doctor?.qualification || 'MBBS'}</p>
                  {hospital && (
                    <div className="mt-2 pt-2 border-t border-outline-variant/30 text-body-xs text-on-surface-variant space-y-0.5">
                      <p className="font-semibold text-on-surface">{hospital.name}</p>
                      <p>{hospital.address}, {hospital.city}, {hospital.state}</p>
                      {hospital.phone && <p>Tel: {hospital.phone}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Consultation Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-1">
                  <span className="text-label-xs text-outline font-semibold uppercase block">Date & Time</span>
                  <div className="text-body-md font-bold text-on-surface">{formatDate(appointment.appointment_date)}</div>
                  <div className="text-body-xs text-on-surface-variant font-medium">
                    {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-1">
                  <span className="text-label-xs text-outline font-semibold uppercase block">Consultation Mode</span>
                  <div className="text-body-md font-bold text-on-surface flex items-center gap-1.5 capitalize">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      {appointment.mode === 'online' ? 'videocam' : 'home_health'}
                    </span>
                    {appointment.mode === 'online' ? 'Telehealth Video Consultation' : 'In-Person Clinic Visit'}
                  </div>
                  <div className="text-body-xs text-on-surface-variant">
                    {appointment.mode === 'online' ? 'Encrypted Video Session' : 'Physical Clinic Examination'}
                  </div>
                </div>
              </div>

              {/* Reason for Consultation */}
              {appointment.reason && (
                <div>
                  <span className="text-label-xs font-bold uppercase tracking-wider text-outline block mb-1">
                    Reason for Consultation / Symptoms
                  </span>
                  <div className="p-3.5 rounded-xl border border-outline-variant/50 bg-surface-container-lowest text-body-sm text-on-surface">
                    {appointment.reason}
                  </div>
                </div>
              )}

              {/* Clinical Notes / Vitals (if available from medical_records) */}
              {medicalRecord && (
                <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-lowest space-y-3">
                  <h4 className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">vital_signs</span>
                    Recorded Vitals & Examination
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    {medicalRecord.blood_pressure && (
                      <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30">
                        <span className="text-label-xs text-outline block">BP</span>
                        <span className="font-bold text-body-sm text-on-surface">{medicalRecord.blood_pressure}</span>
                      </div>
                    )}
                    {medicalRecord.temperature && (
                      <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30">
                        <span className="text-label-xs text-outline block">Temp</span>
                        <span className="font-bold text-body-sm text-on-surface">{medicalRecord.temperature}°F</span>
                      </div>
                    )}
                    {medicalRecord.heart_rate && (
                      <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30">
                        <span className="text-label-xs text-outline block">Heart Rate</span>
                        <span className="font-bold text-body-sm text-on-surface">{medicalRecord.heart_rate} bpm</span>
                      </div>
                    )}
                    {medicalRecord.weight && (
                      <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30">
                        <span className="text-label-xs text-outline block">Weight</span>
                        <span className="font-bold text-body-sm text-on-surface">{medicalRecord.weight} kg</span>
                      </div>
                    )}
                  </div>

                  {medicalRecord.remarks && (
                    <div className="pt-2 border-t border-outline-variant/30 text-body-xs text-on-surface-variant">
                      <strong>Doctor's Notes:</strong> {medicalRecord.remarks}
                    </div>
                  )}
                </div>
              )}

              {/* Patient Review & Rating */}
              {review ? (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-label-xs font-bold text-amber-900 uppercase">Your Review</span>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map(star => (
                        <span 
                          key={star} 
                          className="material-symbols-outlined text-[16px]"
                          style={{ fontVariationSettings: star <= review.rating ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                  {review.review && (
                    <p className="text-body-sm text-on-surface italic">"{review.review}"</p>
                  )}
                </div>
              ) : appointment.status === 'completed' && onOpenReview ? (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-body-sm text-on-surface">Share Consultation Feedback</h5>
                    <p className="text-body-xs text-on-surface-variant">Rate your consultation experience with Dr. {doctor?.profiles?.first_name}</p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenReview(appointment);
                    }}
                    className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg text-label-sm font-semibold transition-colors shrink-0"
                  >
                    Rate & Review
                  </button>
                </div>
              ) : null}
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t border-outline-variant/50 flex items-center justify-between gap-3 bg-surface-container-low/30 shrink-0">
          <div className="text-label-xs text-outline hidden sm:block">
            MedConnect Verified Digital Consultation
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {prescription && (
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-outline-variant hover:border-primary text-on-surface hover:text-primary rounded-lg text-label-md font-semibold hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Print Prescription
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-lg text-label-md font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AppointmentDetailsModal;
