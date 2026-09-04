import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import PatientLayout from '../components/PatientLayout';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const AppointmentBooking = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialDoctorId = searchParams.get('doctor_id');

  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState(null);
  
  // Selection
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId || '');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState('online');

  // Options
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    fetchDoctors();
    if (profile) fetchPatientId();
  }, [profile]);

  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
      setSelectedTime('');
    }
  }, [selectedDoctorId, selectedDate]);

  const fetchPatientId = async () => {
    const { data } = await supabase.from('patients').select('id').eq('profile_id', profile.id).single();
    if (data) setPatientId(data.id);
  };

  const fetchDoctors = async () => {
    const { data } = await supabase
      .from('doctors')
      .select('id, profiles!inner(first_name, last_name)');
    if (data) setDoctors(data);
  };

  const fetchAvailableSlots = async () => {
    // Determine day of week for selected date
    const dateObj = new Date(selectedDate);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dateObj.getDay()];

    const { data: availability } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', selectedDoctorId)
      .eq('day', dayName)
      .eq('is_available', true);

    if (!availability || availability.length === 0) {
      setAvailableSlots([]);
      return;
    }

    // Generate slots
    const slots = [];
    availability.forEach(avail => {
      // Very simplified slot generation
      let current = new Date(`${selectedDate}T${avail.start_time}`);
      const end = new Date(`${selectedDate}T${avail.end_time}`);
      
      while (current < end) {
        slots.push(current.toTimeString().substring(0, 5));
        current.setMinutes(current.getMinutes() + avail.slot_duration);
      }
    });

    // Check existing appointments to filter out booked slots
    const { data: booked } = await supabase
      .from('appointments')
      .select('start_time')
      .eq('doctor_id', selectedDoctorId)
      .eq('appointment_date', selectedDate)
      .not('status', 'in', '("cancelled", "no_show")');

    const bookedTimes = booked ? booked.map(b => b.start_time.substring(0, 5)) : [];
    
    setAvailableSlots(slots.filter(slot => !bookedTimes.includes(slot)));
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!patientId || !selectedDoctorId || !selectedDate || !selectedTime) return;
    
    setLoading(true);
    setNotice(null);

    // Get end time based on slot duration (assume 30 mins for simplicity or fetch it)
    // For now, we will add 30 mins to selectedTime
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const endDate = new Date(0, 0, 0, hours, minutes + 30);
    const endTime = endDate.toTimeString().substring(0, 5) + ':00';
    
    // Generate Appointment Number
    const appointmentNumber = `APT-${Date.now().toString().slice(-6)}`;

    const { data, error } = await supabase.from('appointments').insert({
      appointment_number: appointmentNumber,
      patient_id: patientId,
      doctor_id: selectedDoctorId,
      appointment_date: selectedDate,
      start_time: selectedTime + ':00',
      end_time: endTime,
      mode: mode,
      status: 'pending',
      reason: reason
    });

    if (error) {
      setNotice({ type: 'error', text: error.message });
    } else {
      setNotice({ type: 'success', text: 'Appointment booked successfully!' });
      setTimeout(() => navigate('/patient/dashboard'), 2000);
    }
    setLoading(false);
  };

  return (
    <PatientLayout>
      <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/50 p-6 md:p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-headline-md text-on-surface">Book an Appointment</h1>
          <p className="text-body-md text-on-surface-variant">Schedule a consultation with a doctor.</p>
        </div>

        {notice && (
          <div className={`p-4 rounded-lg mb-6 flex items-center space-x-2 ${notice.type === 'error' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
            <span className="material-symbols-outlined">{notice.type === 'error' ? 'error' : 'check_circle'}</span>
            <span>{notice.text}</span>
          </div>
        )}

        <form onSubmit={handleBook} className="space-y-6">
          <div>
            <label className="block text-label-md text-on-surface mb-1.5">Select Doctor</label>
            <select required className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}>
              <option value="">-- Choose a Doctor --</option>
              {doctors.map(doc => (
                <option key={doc.id} value={doc.id}>Dr. {doc.profiles.first_name} {doc.profiles.last_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-label-md text-on-surface mb-1.5">Select Date</label>
              <input type="date" required min={new Date().toISOString().split('T')[0]} className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-label-md text-on-surface mb-1.5">Consultation Mode</label>
              <select className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" value={mode} onChange={e => setMode(e.target.value)}>
                <option value="online">Online (Video Call)</option>
                <option value="offline">In-Person (Hospital)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-label-md text-on-surface mb-1.5">Available Time Slots</label>
            {!selectedDoctorId || !selectedDate ? (
              <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/50 text-center text-on-surface-variant text-body-sm">
                Please select a doctor and date to view availability.
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/50 text-center text-on-surface-variant text-body-sm">
                No slots available on this date.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`py-2 px-3 rounded-lg text-body-sm font-medium transition-colors border ${
                      selectedTime === slot
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container-lowest text-on-surface border-outline-variant/50 hover:border-primary/50'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-label-md text-on-surface mb-1.5">Reason for Visit</label>
            <textarea required className="w-full p-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none min-h-[100px]" placeholder="Briefly describe your symptoms or reason for consultation..." value={reason} onChange={e => setReason(e.target.value)}></textarea>
          </div>

          <button type="submit" disabled={loading || !selectedTime} className="w-full h-12 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-medium shadow-md transition-colors disabled:opacity-50">
            {loading ? 'Booking...' : 'Confirm Appointment'}
          </button>
        </form>
      </div>
    </PatientLayout>
  );
};

export default AppointmentBooking;
