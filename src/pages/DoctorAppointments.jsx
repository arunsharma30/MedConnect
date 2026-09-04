import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const DoctorAppointments = () => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchAppointments();
    
    // Set up Realtime subscription
    const channel = supabase.channel('doctor_appointments')
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
    // get doctor id
    const { data: docData } = await supabase.from('doctors').select('id').eq('profile_id', profile.id).single();
    if (!docData) return;

    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        patients ( profiles ( first_name, last_name, phone, gender, dob ) )
      `)
      .eq('doctor_id', docData.id)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

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

  const updateStatus = async (id, newStatus) => {
    await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
  };

  return (
    <DashboardLayout>
      <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/50 p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-headline-md text-on-surface">Consultations</h1>
          <p className="text-body-md text-on-surface-variant">Manage your patient appointments and schedules.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 bg-surface-container-lowest rounded-xl border border-outline-variant/50">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">event_busy</span>
            <h3 className="text-title-md text-on-surface">No appointments</h3>
            <p className="text-body-sm text-on-surface-variant">You don't have any appointments scheduled.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map(apt => (
              <div key={apt.id} className="border border-outline-variant/50 rounded-xl p-5 hover:shadow-md transition-shadow bg-surface-container-lowest flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-medium uppercase ${getStatusColor(apt.status)}`}>
                      {apt.status}
                    </span>
                    <span className="text-label-sm text-on-surface-variant">{apt.appointment_number}</span>
                  </div>
                  <h3 className="text-title-md text-on-surface font-bold">
                    {apt.patients?.profiles?.first_name} {apt.patients?.profiles?.last_name}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant mb-2">
                    {apt.patients?.profiles?.gender} • {apt.patients?.profiles?.phone || 'No phone'}
                  </p>
                  
                  <div className="flex items-center gap-4 text-body-sm text-on-surface-variant mb-3 border-t border-outline-variant/50 pt-2">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      {new Date(apt.appointment_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      {apt.start_time.substring(0,5)}
                    </div>
                    <div className="flex items-center gap-1 capitalize">
                      <span className="material-symbols-outlined text-[16px]">{apt.mode === 'online' ? 'videocam' : 'local_hospital'}</span>
                      {apt.mode}
                    </div>
                  </div>
                  
                  {apt.reason && (
                    <div className="bg-surface-variant p-3 rounded-lg text-body-sm text-on-surface">
                      <span className="font-bold">Reason:</span> {apt.reason}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 shrink-0 lg:w-40 border-t lg:border-t-0 lg:border-l border-outline-variant/50 pt-4 lg:pt-0 lg:pl-4">
                  {apt.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(apt.id, 'confirmed')} className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-label-md font-medium transition-colors w-full">
                        Confirm
                      </button>
                      <button onClick={() => updateStatus(apt.id, 'cancelled')} className="px-4 py-2 bg-error/10 text-error hover:bg-error hover:text-on-error rounded-lg text-label-md font-medium transition-colors w-full">
                        Reject
                      </button>
                    </>
                  )}
                  {apt.status === 'confirmed' && (
                    <>
                      <button onClick={() => updateStatus(apt.id, 'completed')} className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg text-label-md font-medium transition-colors w-full">
                        Mark Complete
                      </button>
                      <button onClick={() => updateStatus(apt.id, 'cancelled')} className="px-4 py-2 bg-surface-variant text-on-surface hover:bg-outline-variant rounded-lg text-label-md font-medium transition-colors w-full">
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DoctorAppointments;
