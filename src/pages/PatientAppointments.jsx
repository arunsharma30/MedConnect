import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PatientLayout from '../components/PatientLayout';
import { useAuth } from '../context/AuthContext';
import ReviewModal from '../components/ReviewModal';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';
import PaymentModal from '../components/PaymentModal';

const PatientAppointments = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState(null);
  const [selectedAptForReview, setSelectedAptForReview] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedAptForDetails, setSelectedAptForDetails] = useState(null);
  const [selectedAptForPayment, setSelectedAptForPayment] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    if (profile) fetchAppointments();
    
    // Set up Realtime subscription for appointments, prescriptions, and payments
    const channel = supabase.channel('patient_appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => {
        fetchAppointments();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchAppointments = async () => {
    setLoading(true);
    // get patient id
    const { data: patient } = await supabase.from('patients').select('id').eq('profile_id', profile.id).single();
    if (!patient) return;
    setPatientId(patient.id);

    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        doctors (
          id,
          qualification,
          hospitals!doctors_hospital_id_fkey ( name, address, city, state, phone ),
          profiles ( first_name, last_name, phone, email, profile_image ),
          specializations ( name )
        ),
        reviews ( id, rating, review, created_at ),
        prescriptions (
          id,
          diagnosis,
          instructions,
          next_visit,
          pdf_url,
          created_at,
          prescription_items (
            id,
            dosage,
            frequency,
            duration,
            quantity,
            medicines ( name, type, manufacturer )
          )
        ),
        medical_records (
          id,
          diagnosis,
          blood_pressure,
          temperature,
          weight,
          heart_rate,
          remarks,
          created_at
        )
      `)
      .eq('patient_id', patient.id)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (data) setAppointments(data);
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-primary bg-primary/10';
      case 'cancelled': return 'text-error bg-error/10';
      case 'pending': return 'text-amber-600 bg-amber-100';
      default: return 'text-on-surface-variant bg-surface-variant';
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    // Realtime subscription will refresh the list
  };

  return (
    <PatientLayout>
      <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/50 p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-headline-md text-on-surface">My Appointments</h1>
          <p className="text-body-md text-on-surface-variant">View and manage your upcoming and past consultations.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 bg-surface-container-lowest rounded-xl border border-outline-variant/50">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">calendar_month</span>
            <h3 className="text-title-md text-on-surface">No appointments found</h3>
            <p className="text-body-sm text-on-surface-variant">You don't have any appointments booked yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map(apt => {
              const hasPrescription = apt.prescriptions && (Array.isArray(apt.prescriptions) ? apt.prescriptions.length > 0 : !!apt.prescriptions);

              return (
                <div key={apt.id} className="border border-outline-variant/50 rounded-xl p-5 hover:shadow-md transition-shadow bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div 
                    onClick={() => setSelectedAptForDetails(apt)}
                    className="cursor-pointer group flex-1"
                  >
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-medium uppercase ${getStatusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                      <span className="text-label-sm text-on-surface-variant font-mono">{apt.appointment_number}</span>
                      
                      {/* Payment Status Badge */}
                      {apt.payment_status === 'completed' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-label-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Paid (₹{apt.doctors?.consultation_fee || 500})
                        </span>
                      ) : apt.status !== 'cancelled' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-label-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                          Payment Pending (₹{apt.doctors?.consultation_fee || 500})
                        </span>
                      ) : null}

                      {hasPrescription && (
                        <span className="px-2.5 py-0.5 rounded-full text-label-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">prescriptions</span>
                          Prescription Available
                        </span>
                      )}
                    </div>
                    <h3 className="text-title-md text-on-surface font-bold group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <span>Dr. {apt.doctors?.profiles?.first_name} {apt.doctors?.profiles?.last_name}</span>
                      <span className="material-symbols-outlined text-[18px] opacity-0 group-hover:opacity-100 transition-opacity text-primary">arrow_forward</span>
                    </h3>
                    <p className="text-body-sm text-primary mb-2">{apt.doctors?.specializations?.name || 'General Practice'}</p>
                    
                    <div className="flex items-center gap-4 text-body-sm text-on-surface-variant flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        {new Date(apt.appointment_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        {apt.start_time.substring(0,5)} - {apt.end_time.substring(0,5)}
                      </div>
                      <div className="flex items-center gap-1 capitalize">
                        <span className="material-symbols-outlined text-[16px]">{apt.mode === 'online' ? 'videocam' : 'local_hospital'}</span>
                        {apt.mode === 'online' ? 'Video Visit' : 'In-Person'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row md:flex-col gap-2 shrink-0 md:min-w-[150px]">
                    {/* Pay Now Button (if payment pending) */}
                    {apt.payment_status !== 'completed' && apt.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          setSelectedAptForPayment(apt);
                          setIsPaymentModalOpen(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-on-primary rounded-lg text-label-md font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 w-full active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                        Pay Now (₹{apt.doctors?.consultation_fee || 500})
                      </button>
                    )}

                    {/* View Details / Prescription Action */}
                    <button
                      onClick={() => setSelectedAptForDetails(apt)}
                      className={`px-4 py-2 rounded-lg text-label-md font-semibold transition-all flex items-center justify-center gap-1.5 w-full shadow-2xs ${
                        hasPrescription
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/20'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {hasPrescription ? 'prescriptions' : 'visibility'}
                      </span>
                      <span>{hasPrescription ? 'View Prescription' : 'View Details'}</span>
                    </button>

                    {apt.status === 'pending' || apt.status === 'confirmed' ? (
                      <button onClick={() => handleCancel(apt.id)} className="px-4 py-2 bg-error/10 text-error hover:bg-error hover:text-on-error rounded-lg text-label-md font-medium transition-colors border border-error/20 w-full">
                        Cancel
                      </button>
                    ) : null}
                    {apt.mode === 'online' && apt.status === 'confirmed' && (
                      <button 
                        onClick={() => navigate(`/consultations/${apt.id}/video`)}
                        className="px-4 py-2 bg-primary hover:bg-secondary text-on-primary rounded-lg text-label-md font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 w-full active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[18px]">videocam</span>
                        Join Video Call
                      </button>
                    )}
                    {/* Review Consultation Action */}
                    {apt.status !== 'cancelled' && (
                      apt.reviews && apt.reviews.length > 0 ? (
                        <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-label-sm font-medium flex items-center justify-center gap-1.5 w-full">
                          <span className="material-symbols-outlined text-[16px] text-amber-500" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                          <span>Rated {apt.reviews[0]?.rating}/5</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedAptForReview(apt);
                            setIsReviewModalOpen(true);
                          }}
                          className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-label-md font-medium transition-colors flex items-center justify-center gap-1.5 w-full shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[18px] text-amber-600">rate_review</span>
                          Rate & Review
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Review Modal */}
        {selectedAptForReview && (
          <ReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => {
              setIsReviewModalOpen(false);
              setSelectedAptForReview(null);
            }}
            doctor={selectedAptForReview.doctors}
            patientId={patientId}
            appointments={[selectedAptForReview]}
            selectedAppointmentId={selectedAptForReview.id}
            onSuccess={() => {
              fetchAppointments();
            }}
          />
        )}

        {/* Consultation & Prescription Details Modal */}
        <AppointmentDetailsModal
          isOpen={!!selectedAptForDetails}
          onClose={() => setSelectedAptForDetails(null)}
          appointment={selectedAptForDetails}
          onOpenReview={(apt) => {
            setSelectedAptForReview(apt);
            setIsReviewModalOpen(true);
          }}
          onOpenPayment={(apt) => {
            setSelectedAptForPayment(apt);
            setIsPaymentModalOpen(true);
          }}
        />

        {/* Razorpay Payment Modal */}
        {selectedAptForPayment && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => {
              setIsPaymentModalOpen(false);
              setSelectedAptForPayment(null);
            }}
            appointment={selectedAptForPayment}
            patientProfile={profile}
            onPaymentSuccess={() => {
              fetchAppointments();
            }}
          />
        )}
      </div>
    </PatientLayout>
  );
};

export default PatientAppointments;
