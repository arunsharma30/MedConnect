import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import PatientLayout from '../components/PatientLayout';
import { useAuth } from '../context/AuthContext';

const PatientAppointments = () => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchAppointments();
    
    // Set up Realtime subscription
    const channel = supabase.channel('patient_appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, payload => {
        // Simple reload on any change
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

    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        doctors ( profiles ( first_name, last_name ), specializations ( name ) )
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
            {appointments.map(apt => (
              <div key={apt.id} className="border border-outline-variant/50 rounded-xl p-5 hover:shadow-md transition-shadow bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-medium uppercase ${getStatusColor(apt.status)}`}>
                      {apt.status}
                    </span>
                    <span className="text-label-sm text-on-surface-variant">{apt.appointment_number}</span>
                  </div>
                  <h3 className="text-title-md text-on-surface font-bold">
                    Dr. {apt.doctors?.profiles?.first_name} {apt.doctors?.profiles?.last_name}
                  </h3>
                  <p className="text-body-sm text-primary mb-2">{apt.doctors?.specializations?.name || 'General'}</p>
                  
                  <div className="flex items-center gap-4 text-body-sm text-on-surface-variant">
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
                      {apt.mode}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-row md:flex-col gap-2 shrink-0">
                  {apt.status === 'pending' || apt.status === 'confirmed' ? (
                    <button onClick={() => handleCancel(apt.id)} className="px-4 py-2 bg-error/10 text-error hover:bg-error hover:text-on-error rounded-lg text-label-md font-medium transition-colors border border-error/20 w-full">
                      Cancel
                    </button>
                  ) : null}
                  {apt.mode === 'online' && apt.status === 'confirmed' && (
                    <button className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg text-label-md font-medium transition-colors w-full">
                      Join Call
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PatientLayout>
  );
};

export default PatientAppointments;
