import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import DoctorLayout from '../components/DoctorLayout';

const COMMON_DIAGNOSES = [
  'Upper Respiratory Tract Infection',
  'Acute Viral Pharyngitis',
  'Hypertension Stage 1',
  'Type 2 Diabetes Mellitus',
  'Acute Gastroenteritis',
  'Seasonal Allergic Rhinitis',
  'Migraine without Aura',
  'General Wellness / Routine Checkup'
];

const COMMON_MEDICATIONS = [
  { name: 'Paracetamol 650mg', dosage: '1 Tablet', frequency: 'Three times daily (TDS) after food', duration: '5 days', qty: 15 },
  { name: 'Amoxicillin 500mg', dosage: '1 Capsule', frequency: 'Three times daily (TDS)', duration: '7 days', qty: 21 },
  { name: 'Azithromycin 500mg', dosage: '1 Tablet', frequency: 'Once daily (OD) before food', duration: '3 days', qty: 3 },
  { name: 'Cetirizine 10mg', dosage: '1 Tablet', frequency: 'Once daily at bedtime (HS)', duration: '5 days', qty: 5 },
  { name: 'Pantoprazole 40mg', dosage: '1 Tablet', frequency: 'Once daily 30m before breakfast', duration: '14 days', qty: 14 },
  { name: 'Metformin 500mg', dosage: '1 Tablet', frequency: 'Twice daily with meals (BD)', duration: '30 days', qty: 60 },
  { name: 'Ibuprofen 400mg', dosage: '1 Tablet', frequency: 'Twice daily after food (SOS/as needed)', duration: '3 days', qty: 6 },
  { name: 'ORS Sachet (Electrolyte)', dosage: '1 Sachet in 1L water', frequency: 'Sip throughout the day', duration: '3 days', qty: 6 }
];

const DoctorPrescriptions = () => {
  const { profile } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [doctorData, setDoctorData] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all | recent | follow_up

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRxForSlip, setSelectedRxForSlip] = useState(null);

  // Create Form State
  const [eligibleAppointments, setEligibleAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [instructions, setInstructions] = useState('');
  const [nextVisit, setNextVisit] = useState('');
  const [medicationsList, setMedicationsList] = useState([
    { medicineName: 'Paracetamol 650mg', dosage: '1 Tablet', frequency: 'Three times daily after food', duration: '5 days', quantity: '15' }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    if (profile) {
      fetchDoctorAndPrescriptions();
    }
  }, [profile]);

  // Realtime subscription for prescriptions
  useEffect(() => {
    const channel = supabase.channel('doctor_prescriptions_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => {
        if (doctorData?.id) {
          fetchPrescriptions(doctorData.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorData]);

  const fetchDoctorAndPrescriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: doc, error: docErr } = await supabase
        .from('doctors')
        .select(`
          id,
          qualification,
          consultation_fee,
          specializations ( name ),
          hospitals!doctors_hospital_id_fkey ( name, address, city, state, phone ),
          profiles ( first_name, last_name, email, phone )
        `)
        .eq('profile_id', profile.id)
        .single();

      if (docErr || !doc) {
        throw new Error(docErr?.message || 'Doctor profile not found.');
      }

      setDoctorData(doc);
      await fetchPrescriptions(doc.id);
    } catch (err) {
      console.error('Error fetching doctor details:', err);
      setError(err.message || 'Unable to load prescriptions.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptions = async (docId) => {
    try {
      const { data, error: rxErr } = await supabase
        .from('prescriptions')
        .select(`
          id,
          appointment_id,
          patient_id,
          doctor_id,
          diagnosis,
          instructions,
          next_visit,
          pdf_url,
          created_at,
          appointments (
            id,
            appointment_number,
            appointment_date,
            start_time,
            end_time,
            mode,
            reason,
            status
          ),
          patients (
            id,
            profiles (
              first_name,
              last_name,
              gender,
              dob,
              phone,
              profile_image,
              city,
              state
            )
          ),
          prescription_items (
            id,
            dosage,
            frequency,
            duration,
            quantity,
            medicines (
              name,
              type,
              manufacturer
            )
          )
        `)
        .eq('doctor_id', docId)
        .order('created_at', { ascending: false });

      if (rxErr) throw rxErr;
      setPrescriptions(data || []);
    } catch (err) {
      console.error('Error loading prescriptions:', err);
      setError(err.message);
    }
  };

  const openCreateModal = async () => {
    setFormError('');
    setIsCreateModalOpen(true);
    setLoadingAppointments(true);

    try {
      if (!doctorData?.id) return;
      // Fetch all non-cancelled appointments for this doctor
      const { data: apts, error: aptsErr } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_number,
          appointment_date,
          start_time,
          mode,
          reason,
          status,
          patient_id,
          patients (
            id,
            profiles (
              first_name,
              last_name,
              gender,
              dob,
              phone
            )
          )
        `)
        .eq('doctor_id', doctorData.id)
        .not('status', 'eq', 'cancelled')
        .order('appointment_date', { ascending: false });

      if (aptsErr) throw aptsErr;

      const validApts = (apts || []).filter(a => a.patients);
      setEligibleAppointments(validApts);

      // Find an appointment that doesn't have a prescription yet
      const existingAptIds = new Set(prescriptions.map(p => p.appointment_id));
      const firstUnprescribed = validApts.find(a => !existingAptIds.has(a.id));

      if (firstUnprescribed) {
        setSelectedAppointmentId(firstUnprescribed.id);
        if (firstUnprescribed.reason) {
          setDiagnosis(firstUnprescribed.reason);
        }
      } else if (validApts.length > 0) {
        setSelectedAppointmentId(validApts[0].id);
      }
    } catch (err) {
      console.error('Error loading appointments for prescription:', err);
      setFormError('Failed to load consultation list. Please try again.');
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleAddMedicationRow = () => {
    setMedicationsList(prev => [
      ...prev,
      { medicineName: '', dosage: '1 Tablet', frequency: 'Twice daily after food', duration: '5 days', quantity: '10' }
    ]);
  };

  const handleRemoveMedicationRow = (index) => {
    if (medicationsList.length === 1) return;
    setMedicationsList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMedicationChange = (index, field, value) => {
    setMedicationsList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSelectPredefinedMed = (med) => {
    setMedicationsList(prev => {
      // If only one row and it's empty, replace it
      if (prev.length === 1 && !prev[0].medicineName) {
        return [{ medicineName: med.name, dosage: med.dosage, frequency: med.frequency, duration: med.duration, quantity: String(med.qty) }];
      }
      return [...prev, { medicineName: med.name, dosage: med.dosage, frequency: med.frequency, duration: med.duration, quantity: String(med.qty) }];
    });
  };

  const handleSubmitPrescription = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedAppointmentId) {
      setFormError('Please select a consultation for this prescription.');
      return;
    }

    if (!diagnosis.trim()) {
      setFormError('Please enter a clinical diagnosis or reason.');
      return;
    }

    const filledMeds = medicationsList.filter(m => m.medicineName.trim());
    if (filledMeds.length === 0) {
      setFormError('Please add at least one medication to the prescription.');
      return;
    }

    const selectedApt = eligibleAppointments.find(a => a.id === selectedAppointmentId);
    if (!selectedApt) {
      setFormError('Selected appointment not found.');
      return;
    }

    setSubmitting(true);
    try {
      // Format structured prescription text
      const medsFormatted = filledMeds.map((m, i) => {
        return `${i + 1}. ${m.medicineName.trim()} — ${m.dosage || '1 unit'} — ${m.frequency || 'As directed'} — ${m.duration || '5 days'} (Qty: ${m.quantity || '1'})`;
      }).join('\n');

      let fullInstructions = `Rx MEDICATIONS:\n${medsFormatted}`;
      if (instructions.trim()) {
        fullInstructions += `\n\nDOCTOR'S ADVICE & SPECIAL INSTRUCTIONS:\n${instructions.trim()}`;
      }

      // Check if prescription already exists for this appointment
      const existingRx = prescriptions.find(p => p.appointment_id === selectedAppointmentId);
      if (existingRx) {
        throw new Error('A prescription has already been issued for this consultation (#APT-' + selectedApt.appointment_number + '). Each consultation can only have one formal prescription.');
      }

      const { data: newRx, error: rxErr } = await supabase
        .from('prescriptions')
        .insert({
          appointment_id: selectedApt.id,
          patient_id: selectedApt.patient_id,
          doctor_id: doctorData.id,
          diagnosis: diagnosis.trim(),
          instructions: fullInstructions,
          next_visit: nextVisit || null
        })
        .select(`
          id,
          appointment_id,
          patient_id,
          doctor_id,
          diagnosis,
          instructions,
          next_visit,
          created_at,
          appointments ( id, appointment_number, appointment_date, start_time, mode, reason, status ),
          patients ( id, profiles ( first_name, last_name, gender, dob, phone ) )
        `)
        .single();

      if (rxErr) {
        if (rxErr.code === '23505') {
          throw new Error('A prescription already exists for this consultation.');
        }
        throw rxErr;
      }

      // Reset form
      setIsCreateModalOpen(false);
      setDiagnosis('');
      setInstructions('');
      setNextVisit('');
      setMedicationsList([{ medicineName: 'Paracetamol 650mg', dosage: '1 Tablet', frequency: 'Three times daily after food', duration: '5 days', quantity: '15' }]);

      // Refresh list
      await fetchPrescriptions(doctorData.id);

      setSuccessToast(`Prescription successfully issued for ${selectedApt.patients?.profiles?.first_name} ${selectedApt.patients?.profiles?.last_name}!`);
      setTimeout(() => setSuccessToast(''), 5000);

      // Open printable slip automatically for convenience
      if (newRx) {
        setSelectedRxForSlip(newRx);
      }
    } catch (err) {
      console.error('Error saving prescription:', err);
      setFormError(err.message || 'Failed to save prescription. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered prescriptions list
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(p => {
      const patientName = `${p.patients?.profiles?.first_name || ''} ${p.patients?.profiles?.last_name || ''}`.toLowerCase();
      const diag = (p.diagnosis || '').toLowerCase();
      const inst = (p.instructions || '').toLowerCase();
      const aptNum = (p.appointments?.appointment_number || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || 
        patientName.includes(query) || 
        diag.includes(query) || 
        inst.includes(query) || 
        aptNum.includes(query);

      if (!matchesSearch) return false;

      if (filterType === 'recent') {
        const d = new Date(p.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return d >= thirtyDaysAgo;
      }

      if (filterType === 'follow_up') {
        return !!p.next_visit && new Date(p.next_visit) >= new Date();
      }

      return true;
    });
  }, [prescriptions, searchQuery, filterType]);

  // Statistics
  const stats = useMemo(() => {
    const total = prescriptions.length;
    const uniquePatients = new Set(prescriptions.map(p => p.patient_id)).size;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const thisMonthCount = prescriptions.filter(p => {
      const d = new Date(p.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const followUpsCount = prescriptions.filter(p => p.next_visit && new Date(p.next_visit) >= now).length;

    return { total, uniquePatients, thisMonthCount, followUpsCount };
  }, [prescriptions]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getPatientAge = (dob) => {
    if (!dob) return '';
    try {
      const birth = new Date(dob);
      const diff = Date.now() - birth.getTime();
      const ageDate = new Date(diff);
      return `${Math.abs(ageDate.getUTCFullYear() - 1970)} yrs`;
    } catch {
      return '';
    }
  };

  return (
    <DoctorLayout pageTitle="Prescriptions">
      <div className="space-y-6">

        {/* Success Alert */}
        {successToast && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-emerald-600 text-[22px]">check_circle</span>
              <span className="text-body-sm font-medium">{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast('')} className="text-emerald-700 hover:text-emerald-900">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Page Top Header with Title and Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[24px]">prescriptions</span>
              <h1 className="text-headline-sm font-headline-sm font-bold text-on-surface">Clinical Prescriptions</h1>
            </div>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Create, review, and issue verified Rx slips linked directly to your consultations
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-[#5249EC] active:scale-95 text-on-primary font-medium text-label-md shadow-sm transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Issue New Prescription
          </button>
        </div>

        {/* KPI / Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Issued</span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">prescriptions</span>
              </div>
            </div>
            <div className="text-headline-md font-bold text-on-surface">{stats.total}</div>
            <span className="text-label-xs text-on-surface-variant">Lifetime prescriptions</span>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-xs font-semibold uppercase tracking-wider text-on-surface-variant">Patients</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">group</span>
              </div>
            </div>
            <div className="text-headline-md font-bold text-on-surface">{stats.uniquePatients}</div>
            <span className="text-label-xs text-emerald-700 font-medium">Distinct patients</span>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-xs font-semibold uppercase tracking-wider text-on-surface-variant">This Month</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              </div>
            </div>
            <div className="text-headline-md font-bold text-on-surface">{stats.thisMonthCount}</div>
            <span className="text-label-xs text-on-surface-variant">Issued in current month</span>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-xs font-semibold uppercase tracking-wider text-on-surface-variant">Follow-ups</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">event_repeat</span>
              </div>
            </div>
            <div className="text-headline-md font-bold text-on-surface">{stats.followUpsCount}</div>
            <span className="text-label-xs text-amber-700 font-medium">Active follow-ups scheduled</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search by patient, diagnosis, medicine, or apt #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-[#E5E7EB] bg-surface-container-lowest text-on-surface text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-label-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All ({prescriptions.length})
            </button>
            <button
              onClick={() => setFilterType('recent')}
              className={`px-3 py-1.5 rounded-lg text-label-sm font-medium transition-colors ${
                filterType === 'recent'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setFilterType('follow_up')}
              className={`px-3 py-1.5 rounded-lg text-label-sm font-medium transition-colors ${
                filterType === 'follow_up'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Follow-ups Due
            </button>
          </div>
        </div>

        {/* Content Section: Table / Cards */}
        {loading ? (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-12 text-center shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-body-sm text-on-surface-variant">Loading clinical prescriptions...</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-error/30 rounded-xl p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">error</span>
            </div>
            <h3 className="text-title-md font-bold text-on-surface mb-1">Unable to Load Prescriptions</h3>
            <p className="text-body-sm text-on-surface-variant mb-4">{error}</p>
            <button
              onClick={fetchDoctorAndPrescriptions}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-medium hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">prescriptions</span>
            </div>
            <h3 className="text-title-md font-bold text-on-surface mb-1">
              {searchQuery ? 'No Prescriptions Match Your Search' : 'No Prescriptions Issued Yet'}
            </h3>
            <p className="text-body-sm text-on-surface-variant max-w-md mx-auto mb-6">
              {searchQuery
                ? 'Try searching with a different patient name, medicine keyword, or clear your query.'
                : 'Issue formal prescriptions with dosages, schedules, and instructions for your consultation patients.'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 border border-[#E5E7EB] text-on-surface rounded-lg text-label-md hover:bg-surface-container-low font-medium"
              >
                Clear Search Filter
              </button>
            ) : (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-[#5249EC] text-on-primary rounded-lg text-label-md font-medium shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Issue First Prescription
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-label-xs font-semibold uppercase text-on-surface-variant tracking-wider">
                    <th className="px-5 py-3.5">Date Issued</th>
                    <th className="px-5 py-3.5">Patient Details</th>
                    <th className="px-5 py-3.5">Consultation</th>
                    <th className="px-5 py-3.5">Diagnosis</th>
                    <th className="px-5 py-3.5">Prescribed Medicines</th>
                    <th className="px-5 py-3.5">Follow-Up</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredPrescriptions.map((rx) => {
                    const patient = rx.patients?.profiles;
                    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Patient';
                    const age = getPatientAge(patient?.dob);
                    const appointment = rx.appointments;

                    // Extract brief list of medicines from instructions
                    const lines = (rx.instructions || '').split('\n').filter(l => l.trim().startsWith('1.') || l.trim().startsWith('2.') || l.trim().startsWith('3.') || l.trim().startsWith('4.'));
                    
                    return (
                      <tr key={rx.id} className="hover:bg-[#F9FAFB]/70 transition-colors">
                        {/* Date */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-semibold text-on-surface">{formatDate(rx.created_at)}</div>
                          <span className="text-label-xs text-outline font-mono">
                            {new Date(rx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        {/* Patient */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-label-sm">
                              {patient?.first_name?.[0]}{patient?.last_name?.[0]}
                            </div>
                            <div>
                              <div className="font-semibold text-on-surface hover:text-primary transition-colors">
                                {patientName}
                              </div>
                              <div className="text-label-xs text-on-surface-variant">
                                {patient?.gender ? `${patient.gender}` : ''}
                                {patient?.gender && age ? ' · ' : ''}
                                {age}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Consultation */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {appointment ? (
                            <div>
                              <div className="flex items-center gap-1 text-label-sm font-semibold text-on-surface">
                                <span className="material-symbols-outlined text-[15px] text-primary">
                                  {appointment.mode === 'online' ? 'videocam' : 'home_health'}
                                </span>
                                #{appointment.appointment_number}
                              </div>
                              <div className="text-label-xs text-on-surface-variant">
                                {formatDate(appointment.appointment_date)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-outline text-label-xs">—</span>
                          )}
                        </td>

                        {/* Diagnosis */}
                        <td className="px-5 py-4">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-label-xs font-semibold max-w-[200px] truncate" title={rx.diagnosis}>
                            {rx.diagnosis || 'Clinical Diagnosis'}
                          </span>
                        </td>

                        {/* Prescribed Medicines Preview */}
                        <td className="px-5 py-4 max-w-[280px]">
                          {lines.length > 0 ? (
                            <div className="space-y-1">
                              {lines.slice(0, 2).map((medLine, i) => (
                                <p key={i} className="text-body-xs text-on-surface truncate font-medium">
                                  {medLine}
                                </p>
                              ))}
                              {lines.length > 2 && (
                                <span className="text-label-xs text-primary font-semibold">
                                  +{lines.length - 2} more medications
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-body-xs text-on-surface-variant line-clamp-2">
                              {rx.instructions || 'Standard medication regimen'}
                            </p>
                          )}
                        </td>

                        {/* Follow-up */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {rx.next_visit ? (
                            <div className="flex items-center gap-1.5 text-amber-700 text-label-xs font-semibold bg-amber-50 border border-amber-200/70 px-2 py-1 rounded-md w-fit">
                              <span className="material-symbols-outlined text-[14px]">event_repeat</span>
                              {formatDate(rx.next_visit)}
                            </div>
                          ) : (
                            <span className="text-label-xs text-outline">None</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedRxForSlip(rx)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] hover:border-primary text-on-surface hover:text-primary rounded-lg text-label-xs font-semibold hover:bg-surface-container-low transition-colors shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[15px]">print</span>
                            View Rx Slip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
            <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between text-label-sm text-on-surface-variant">
              <span>Showing {filteredPrescriptions.length} of {prescriptions.length} prescriptions</span>
              <span>MedConnect Digital Health System</span>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ISSUE NEW PRESCRIPTION                                           */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between shrink-0 bg-surface-container-low/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">prescriptions</span>
                </div>
                <div>
                  <h3 className="text-title-md font-bold text-on-surface">Issue Clinical Prescription</h3>
                  <p className="text-label-sm text-on-surface-variant">Formal Rx slip linked to consultation record</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitPrescription} className="overflow-y-auto p-6 space-y-6 flex-1">
              {/* Form Error */}
              {formError && (
                <div className="p-3.5 bg-error/10 border border-error/30 text-error rounded-xl text-body-sm flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  <span>{formError}</span>
                </div>
              )}

              {/* Consultation Selector */}
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1.5">
                  Select Patient Consultation <span className="text-error">*</span>
                </label>
                {loadingAppointments ? (
                  <div className="p-3 bg-surface-container-low rounded-lg text-body-sm text-on-surface-variant animate-pulse">
                    Loading consultations...
                  </div>
                ) : eligibleAppointments.length === 0 ? (
                  <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-body-sm">
                    No active consultations found. You can only issue prescriptions for consultations booked with you.
                  </div>
                ) : (
                  <select
                    value={selectedAppointmentId}
                    onChange={(e) => {
                      setSelectedAppointmentId(e.target.value);
                      const apt = eligibleAppointments.find(a => a.id === e.target.value);
                      if (apt?.reason && !diagnosis) {
                        setDiagnosis(apt.reason);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-on-surface text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {eligibleAppointments.map((apt) => {
                      const p = apt.patients?.profiles;
                      const hasRx = prescriptions.some(rx => rx.appointment_id === apt.id);
                      return (
                        <option key={apt.id} value={apt.id} disabled={hasRx}>
                          {p?.first_name} {p?.last_name} — {formatDate(apt.appointment_date)} ({apt.mode === 'online' ? 'Video' : 'In-Person'}) #{apt.appointment_number} {hasRx ? '(Rx Already Issued)' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Clinical Diagnosis */}
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1.5">
                  Clinical Diagnosis / Primary Indication <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acute Viral Pharyngitis, Type 2 Diabetes, Hypertension..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#E5E7EB] bg-white text-on-surface text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary mb-2"
                />
                {/* Diagnosis suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_DIAGNOSES.map((diag) => (
                    <button
                      key={diag}
                      type="button"
                      onClick={() => setDiagnosis(diag)}
                      className="px-2.5 py-0.5 rounded-full text-label-xs bg-surface-container-low text-on-surface-variant hover:border-primary hover:text-primary border border-transparent transition-colors"
                    >
                      + {diag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Medication Builder */}
              <div className="space-y-3 pt-2 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
                      <span className="font-serif italic font-bold text-primary">℞</span>
                      Prescribed Medications
                    </h4>
                    <p className="text-label-xs text-on-surface-variant">Specify medicines, dosages, and administration frequency</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMedicationRow}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-primary text-primary hover:bg-primary/5 text-label-xs font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Medicine
                  </button>
                </div>

                {/* Quick Add Pills */}
                <div>
                  <span className="text-label-xs text-outline mb-1.5 block">Quick add standard formulas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_MEDICATIONS.map((med) => (
                      <button
                        key={med.name}
                        type="button"
                        onClick={() => handleSelectPredefinedMed(med)}
                        className="px-2.5 py-1 rounded-md text-label-xs bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 transition-colors"
                      >
                        + {med.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Medication Rows */}
                <div className="space-y-2.5 mt-2">
                  {medicationsList.map((row, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-[#E5E7EB] bg-surface-container-lowest shadow-2xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-label-xs font-bold text-primary">Medication #{idx + 1}</span>
                        {medicationsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicationRow(idx)}
                            className="text-error/80 hover:text-error text-label-xs flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-6">
                          <input
                            type="text"
                            placeholder="Medicine Name (e.g. Paracetamol 650mg)"
                            value={row.medicineName}
                            onChange={(e) => handleMedicationChange(idx, 'medicineName', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-body-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            placeholder="Dosage (1 Tab)"
                            value={row.dosage}
                            onChange={(e) => handleMedicationChange(idx, 'dosage', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-body-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            placeholder="Duration (5 days)"
                            value={row.duration}
                            onChange={(e) => handleMedicationChange(idx, 'duration', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-body-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-8">
                          <input
                            type="text"
                            placeholder="Frequency & Instructions (e.g. Twice daily after meals)"
                            value={row.frequency}
                            onChange={(e) => handleMedicationChange(idx, 'frequency', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-body-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            placeholder="Quantity (e.g. 10)"
                            value={row.quantity}
                            onChange={(e) => handleMedicationChange(idx, 'quantity', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-body-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions / Advice */}
              <div className="pt-2 border-t border-[#E5E7EB]">
                <label className="block text-label-md font-semibold text-on-surface mb-1.5">
                  Doctor's Lifestyle & Dietary Advice (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Drink plenty of warm fluids. Complete the full antibiotic course. Avoid oily or cold items..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full p-3 rounded-lg border border-[#E5E7EB] bg-white text-on-surface text-body-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Next Visit Date */}
              <div className="pt-2 border-t border-[#E5E7EB]">
                <label className="block text-label-md font-semibold text-on-surface mb-1.5">
                  Next Follow-up Visit (Optional)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={nextVisit}
                    onChange={(e) => setNextVisit(e.target.value)}
                    className="px-3.5 py-2 rounded-lg border border-[#E5E7EB] bg-white text-on-surface text-body-sm focus:outline-none focus:border-primary"
                  />
                  {/* Shortcut chips */}
                  {[3, 7, 14, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + days);
                        setNextVisit(d.toISOString().split('T')[0]);
                      }}
                      className="px-2.5 py-1 rounded-md text-label-xs bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors border border-outline-variant/60"
                    >
                      +{days} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg border border-[#E5E7EB] text-on-surface hover:bg-surface-container-low text-label-md font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedAppointmentId || !diagnosis.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-[#5249EC] text-on-primary text-label-md font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent"></div>
                      <span>Issuing Prescription...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Issue Prescription</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PRINTABLE CLINICAL PRESCRIPTION SLIP (Rx PAD)                     */}
      {/* ========================================================================= */}
      {selectedRxForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with Print and Close */}
            <div className="px-6 py-3.5 border-b border-[#E5E7EB] bg-surface-container-low/50 flex items-center justify-between shrink-0 no-print">
              <span className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">prescriptions</span>
                Prescription Slip
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-label-sm font-semibold shadow-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Print Rx Slip
                </button>
                <button
                  onClick={() => setSelectedRxForSlip(null)}
                  className="w-8 h-8 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Printable Prescription Pad Paper */}
            <div className="p-8 overflow-y-auto flex-1 font-sans" id="printable-rx-slip">
              {/* Doctor / Clinic Letterhead */}
              <div className="border-b-2 border-primary/30 pb-5 mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="text-headline-sm font-bold text-primary">
                    Dr. {doctorData?.profiles?.first_name} {doctorData?.profiles?.last_name}
                  </h2>
                  <p className="text-body-sm font-medium text-on-surface">
                    {doctorData?.qualification || 'MBBS'} — {doctorData?.specializations?.name || 'General Practitioner'}
                  </p>
                  {doctorData?.hospitals && (
                    <p className="text-body-xs text-on-surface-variant mt-1">
                      {doctorData.hospitals.name}, {doctorData.hospitals.address}, {doctorData.hospitals.city}
                    </p>
                  )}
                  {doctorData?.profiles?.phone && (
                    <p className="text-body-xs text-outline">Contact: {doctorData.profiles.phone}</p>
                  )}
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <div className="flex items-center gap-1.5 sm:justify-end text-primary font-bold text-title-md">
                    <span className="material-symbols-outlined text-[22px]">medical_services</span>
                    MedConnect
                  </div>
                  <span className="text-label-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold inline-block mt-1">
                    Verified Digital Rx
                  </span>
                  <p className="text-body-xs text-outline mt-1 font-mono">
                    Rx #{selectedRxForSlip.id.substring(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Patient & Consultation Meta Box */}
              <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB] grid grid-cols-2 sm:grid-cols-4 gap-4 text-body-sm mb-6">
                <div>
                  <span className="text-label-xs text-outline uppercase font-semibold block">Patient Name</span>
                  <span className="font-bold text-on-surface">
                    {selectedRxForSlip.patients?.profiles?.first_name} {selectedRxForSlip.patients?.profiles?.last_name}
                  </span>
                </div>
                <div>
                  <span className="text-label-xs text-outline uppercase font-semibold block">Gender / Age</span>
                  <span className="font-medium text-on-surface">
                    {selectedRxForSlip.patients?.profiles?.gender || '—'} {getPatientAge(selectedRxForSlip.patients?.profiles?.dob) ? `(${getPatientAge(selectedRxForSlip.patients?.profiles?.dob)})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-label-xs text-outline uppercase font-semibold block">Date Prescribed</span>
                  <span className="font-medium text-on-surface">{formatDate(selectedRxForSlip.created_at)}</span>
                </div>
                <div>
                  <span className="text-label-xs text-outline uppercase font-semibold block">Consultation Ref</span>
                  <span className="font-medium text-on-surface font-mono">
                    #{selectedRxForSlip.appointments?.appointment_number || 'APT'}
                  </span>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="mb-6">
                <h4 className="text-label-xs uppercase font-bold text-outline tracking-wider mb-1">Diagnosis</h4>
                <div className="text-body-md font-bold text-on-surface bg-purple-50/50 p-2.5 rounded-lg border border-purple-200/50">
                  {selectedRxForSlip.diagnosis}
                </div>
              </div>

              {/* Rx Symbol & Medication Body */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-display-xs font-serif italic font-extrabold text-primary leading-none">℞</span>
                  <h3 className="text-title-sm font-bold text-on-surface">Prescription & Dosage Details</h3>
                </div>

                <div className="whitespace-pre-wrap font-sans text-body-sm text-on-surface leading-relaxed p-4 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA]">
                  {selectedRxForSlip.instructions}
                </div>
              </div>

              {/* Follow-up Note */}
              {selectedRxForSlip.next_visit && (
                <div className="mb-8 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-body-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber-700">event_repeat</span>
                  <span><strong>Next Follow-up Visit:</strong> {formatDate(selectedRxForSlip.next_visit)}</span>
                </div>
              )}

              {/* Doctor Seal & Signature Line */}
              <div className="pt-8 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                <div className="text-label-xs text-outline">
                  <p>Electronically generated and authenticated via MedConnect Telehealth.</p>
                  <p>Valid without physical stamp per Digital Healthcare Act.</p>
                </div>

                <div className="text-center sm:text-right shrink-0">
                  <div className="w-36 border-b border-on-surface/40 mx-auto sm:ml-auto mb-1"></div>
                  <p className="font-bold text-body-sm text-on-surface">
                    Dr. {doctorData?.profiles?.first_name} {doctorData?.profiles?.last_name}
                  </p>
                  <p className="text-label-xs text-outline">{doctorData?.specializations?.name || 'Practitioner'}</p>
                </div>
              </div>
            </div>

            {/* Modal Bottom Close */}
            <div className="p-4 border-t border-[#E5E7EB] bg-surface-container-low/40 flex justify-end no-print">
              <button
                onClick={() => setSelectedRxForSlip(null)}
                className="px-5 py-2 border border-[#E5E7EB] hover:bg-surface-container-low text-on-surface rounded-lg text-label-md font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Helper CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-rx-slip, #printable-rx-slip * {
            visibility: visible !important;
          }
          #printable-rx-slip {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            z-index: 99999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </DoctorLayout>
  );
};

export default DoctorPrescriptions;
