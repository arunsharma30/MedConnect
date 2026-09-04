import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const DoctorAvailability = () => {
  const { profile } = useAuth();
  const [doctorId, setDoctorId] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New availability form
  const [dayOfWeek, setDayOfWeek] = useState('monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [duration, setDuration] = useState('30');
  
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (profile) {
      fetchDoctorIdAndAvailability();
    }
  }, [profile]);

  const fetchDoctorIdAndAvailability = async () => {
    setLoading(true);
    // Get doctor id
    const { data: docData } = await supabase.from('doctors').select('id').eq('profile_id', profile.id).single();
    if (docData) {
      setDoctorId(docData.id);
      
      // Get availability
      const { data: availData } = await supabase.from('doctor_availability')
        .select('*')
        .eq('doctor_id', docData.id)
        .order('day');
        
      if (availData) {
        setAvailability(availData);
      }
    }
    setLoading(false);
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!doctorId) return;
    setSaving(true);
    setNotice(null);

    const { data, error } = await supabase.from('doctor_availability').insert({
      doctor_id: doctorId,
      day: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      slot_duration: parseInt(duration),
      is_available: true
    }).select();

    if (error) {
      setNotice({ type: 'error', text: error.message });
    } else {
      setNotice({ type: 'success', text: 'Availability slot added.' });
      setAvailability([...availability, data[0]]);
    }
    setSaving(false);
  };

  const handleDeleteSlot = async (id) => {
    await supabase.from('doctor_availability').delete().eq('id', id);
    setAvailability(availability.filter(a => a.id !== id));
  };

  return (
    <DashboardLayout>
      <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/50 p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-headline-md text-on-surface">Manage Availability</h1>
          <p className="text-body-md text-on-surface-variant">Set the days and times you are available for appointments.</p>
        </div>

        {notice && (
          <div className={`p-4 rounded-lg mb-6 flex items-center space-x-2 ${notice.type === 'error' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
            <span className="material-symbols-outlined">{notice.type === 'error' ? 'error' : 'check_circle'}</span>
            <span>{notice.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add New Slot Form */}
          <div className="lg:col-span-1 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/50 h-fit">
            <h3 className="text-title-md text-on-surface mb-4">Add Time Slot</h3>
            <form onSubmit={handleAddSlot} className="space-y-4">
              <div>
                <label className="block text-label-md text-on-surface mb-1.5">Day of Week</label>
                <select className="w-full h-11 px-4 rounded-xl border border-outline-variant focus:border-primary outline-none" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}>
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">Start Time</label>
                  <input type="time" required className="w-full h-11 px-4 rounded-xl border border-outline-variant focus:border-primary outline-none" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">End Time</label>
                  <input type="time" required className="w-full h-11 px-4 rounded-xl border border-outline-variant focus:border-primary outline-none" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-label-md text-on-surface mb-1.5">Slot Duration (mins)</label>
                <select className="w-full h-11 px-4 rounded-xl border border-outline-variant focus:border-primary outline-none" value={duration} onChange={e => setDuration(e.target.value)}>
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
              </div>
              <button type="submit" disabled={saving || !doctorId} className="w-full h-11 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-medium shadow-md transition-colors disabled:opacity-50 mt-2">
                {saving ? 'Adding...' : 'Add Availability'}
              </button>
            </form>
          </div>

          {/* Current Schedule */}
          <div className="lg:col-span-2">
            <h3 className="text-title-md text-on-surface mb-4">Your Schedule</h3>
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            ) : availability.length === 0 ? (
              <div className="text-center py-12 bg-surface-container-lowest rounded-xl border border-outline-variant/50 border-dashed">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">event_busy</span>
                <p className="text-body-md text-on-surface-variant">You haven't set any availability yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                  const daySlots = availability.filter(a => a.day === day);
                  if (daySlots.length === 0) return null;
                  return (
                    <div key={day} className="border border-outline-variant/50 rounded-xl overflow-hidden">
                      <div className="bg-surface-container-lowest px-4 py-2 border-b border-outline-variant/50">
                        <h4 className="text-label-lg font-medium text-on-surface capitalize">{day}</h4>
                      </div>
                      <div className="divide-y divide-outline-variant/50 bg-white">
                        {daySlots.map(slot => (
                          <div key={slot.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <span className="material-symbols-outlined text-primary">schedule</span>
                              <div>
                                <p className="text-body-md text-on-surface font-medium">{slot.start_time.substring(0,5)} - {slot.end_time.substring(0,5)}</p>
                                <p className="text-body-sm text-on-surface-variant">{slot.slot_duration} min slots</p>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteSlot(slot.id)} className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors">
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorAvailability;
