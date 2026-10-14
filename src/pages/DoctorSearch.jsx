import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import PatientLayout from '../components/PatientLayout';

const DoctorSearch = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [selectedAvailability, setSelectedAvailability] = useState('Anytime');
  const [sortBy, setSortBy] = useState('Recommended');
  const [visitType, setVisitType] = useState('All Visits');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [specRes, docsRes] = await Promise.all([
        supabase.from('specializations').select('id, name'),
        supabase
          .from('doctors')
          .select(`
            id,
            consultation_fee,
            experience,
            rating,
            total_reviews,
            reviews ( rating ),
            hospital_id,
            profiles!inner ( first_name, last_name, profile_image, city, state ),
            specializations ( name ),
            hospitals!doctors_hospital_id_fkey ( name ),
            doctor_availability ( day, start_time, end_time, is_available )
          `)
      ]);

      if (specRes.error) throw specRes.error;
      if (docsRes.error) throw docsRes.error;

      if (specRes.data) setSpecialties(specRes.data);
      if (docsRes.data) setDoctors(docsRes.data);
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setError(err.message || 'Something went wrong while loading doctor information.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('All Specialties');
    setSelectedAvailability('Anytime');
    setSortBy('Recommended');
    setVisitType('All Visits');
  };

  // Helper to determine next slot
  const getNextSlotInfo = (availability) => {
    if (!availability || availability.length === 0) return null;
    
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const currentDayIdx = today.getDay();
    const currentTime = today.getHours() * 60 + today.getMinutes();

    let nextSlot = null;
    let minDaysAhead = 7;

    availability.filter(a => a.is_available).forEach(slot => {
      const slotDayIdx = daysOfWeek.indexOf(slot.day);
      if (slotDayIdx === -1) return;
      
      let daysAhead = (slotDayIdx - currentDayIdx + 7) % 7;
      
      // If it's today, check if the slot is in the future
      if (daysAhead === 0) {
        const [hours, minutes] = slot.start_time.split(':').map(Number);
        const slotTime = hours * 60 + minutes;
        if (slotTime <= currentTime) {
          daysAhead = 7; // Next week
        }
      }

      if (daysAhead < minDaysAhead) {
        minDaysAhead = daysAhead;
        nextSlot = { ...slot, daysAhead };
      } else if (daysAhead === minDaysAhead && nextSlot) {
         // Break tie by earlier time
         const [h1, m1] = slot.start_time.split(':').map(Number);
         const [h2, m2] = nextSlot.start_time.split(':').map(Number);
         if ((h1 * 60 + m1) < (h2 * 60 + m2)) {
             nextSlot = { ...slot, daysAhead };
         }
      }
    });

    if (!nextSlot) return null;

    let dayStr = '';
    if (nextSlot.daysAhead === 0) dayStr = 'Today';
    else if (nextSlot.daysAhead === 1) dayStr = 'Tomorrow';
    else {
      const slotDate = new Date(today);
      slotDate.setDate(today.getDate() + nextSlot.daysAhead);
      dayStr = slotDate.toLocaleDateString('en-US', { weekday: 'long' });
    }

    // Format time
    const [hours, minutes] = nextSlot.start_time.split(':');
    const d = new Date();
    d.setHours(hours, minutes);
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return `${dayStr}, ${timeStr}`;
  };

  const getConsultationType = (doc) => {
    // Basic heuristic: if hospital exists, In-Person & Video. Otherwise Video only.
    if (doc.hospital_id) return 'In-Person & Video';
    return 'Video Telehealth';
  };

  // Filter and Sort Logic
  const filteredAndSortedDoctors = useMemo(() => {
    let result = [...doctors];

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(doc => {
        const fullName = `Dr. ${doc.profiles?.first_name} ${doc.profiles?.last_name}`.toLowerCase();
        const specialty = (doc.specializations?.name || '').toLowerCase();
        const hospital = (doc.hospitals?.name || '').toLowerCase();
        return fullName.includes(q) || specialty.includes(q) || hospital.includes(q);
      });
    }

    // Specialty Filter
    if (selectedSpecialty !== 'All Specialties') {
      result = result.filter(doc => doc.specializations?.name === selectedSpecialty);
    }

    // Visit Type Filter
    if (visitType === 'Video Telehealth') {
      // Assuming everyone can do video
      // result = result; 
    } else if (visitType === 'In-Person Clinic') {
      result = result.filter(doc => doc.hospital_id != null);
    }

    // Availability Filter
    if (selectedAvailability === 'Today') {
       result = result.filter(doc => {
           const slot = getNextSlotInfo(doc.doctor_availability);
           return slot && slot.startsWith('Today');
       });
    } else if (selectedAvailability === 'This Week') {
        result = result.filter(doc => {
            const slot = getNextSlotInfo(doc.doctor_availability);
            return slot !== null; // Just requires some availability
        });
    }

    // Sorting
    if (sortBy === 'Highest Rated') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'Lowest Fee') {
      result.sort((a, b) => (a.consultation_fee || 0) - (b.consultation_fee || 0));
    } else if (sortBy === 'Earliest Available') {
       // Advanced sort by availability could go here, for now it's heuristic
    }

    return result;
  }, [doctors, searchQuery, selectedSpecialty, selectedAvailability, visitType, sortBy]);

  return (
    <PatientLayout fullWidth={true}>
      <div className="flex-grow">
        
        {/* Top Hero Section & Search Console */}
        <section className="bg-surface-container-low/70 border-b border-outline-variant/40 pt-10 pb-8 px-4 sm:px-6 md:px-12">
          <div className="max-w-[72rem] mx-auto">
            {/* Title & Subtitle */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm mb-3 border border-primary-fixed-dim/60">
                <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span>
                Credentialed Provider Network
              </div>
              <h1 className="font-display-sm md:font-display-lg text-display-sm md:text-display-lg font-bold text-on-surface tracking-tight mb-2">Find a Doctor</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                Search, filter, and book appointments with verified board-certified physicians.
              </p>
            </div>

            {/* Primary Filter & Search Bar Bento Box */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4 sm:p-5 shadow-sm space-y-4">
              
              {/* Row 1: Search, Specialty, Availability, Sort */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Search Input */}
                <div className="md:col-span-4 relative">
                  <label htmlFor="doctor-query" className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Doctor Name or Condition</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                      <span className="material-symbols-outlined text-[20px]">search</span>
                    </span>
                    <input 
                      id="doctor-query" 
                      type="text" 
                      className="w-full h-[42px] pl-10 pr-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/15 transition-all" 
                      placeholder="Search by doctor name or specialty..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Specialty Dropdown */}
                <div className="md:col-span-3 relative">
                  <label htmlFor="specialty-select" className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Specialty</label>
                  <div className="relative">
                    <select 
                      id="specialty-select" 
                      className="w-full h-[42px] pl-3 pr-8 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface font-body-md appearance-none focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/15 cursor-pointer"
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                    >
                      <option value="All Specialties">All Specialties</option>
                      {specialties.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                    <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-outline">
                      <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </span>
                  </div>
                </div>

                {/* Availability Dropdown */}
                <div className="md:col-span-2 sm:col-span-6 relative">
                  <label htmlFor="avail-select" className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Availability</label>
                  <div className="relative">
                    <select 
                      id="avail-select" 
                      className="w-full h-[42px] pl-3 pr-8 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface font-body-md appearance-none focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/15 cursor-pointer"
                      value={selectedAvailability}
                      onChange={(e) => setSelectedAvailability(e.target.value)}
                    >
                      <option value="Anytime">Anytime</option>
                      <option value="Today">Today</option>
                      <option value="This Week">This Week</option>
                    </select>
                    <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-outline">
                      <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                    </span>
                  </div>
                </div>

                {/* Sorting Dropdown */}
                <div className="md:col-span-3 sm:col-span-6 relative">
                  <label htmlFor="sort-select" className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Sort Results</label>
                  <div className="relative">
                    <select 
                      id="sort-select" 
                      className="w-full h-[42px] pl-3 pr-8 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface font-body-md appearance-none focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/15 cursor-pointer"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="Recommended">Recommended</option>
                      <option value="Earliest Available">Earliest Available</option>
                      <option value="Highest Rated">Highest Rated</option>
                      <option value="Lowest Fee">Lowest Fee</option>
                    </select>
                    <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-outline">
                      <span className="material-symbols-outlined text-[20px]">swap_vert</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Visit Type Pill Tabs & Active Applied Filter Count */}
              <div className="pt-3 border-t border-outline-variant/40 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant mr-1">Visit Type:</span>
                  
                  {['All Visits', 'Video Telehealth', 'In-Person Clinic'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setVisitType(type)}
                      type="button" 
                      className={`px-3.5 py-1.5 rounded-full text-label-sm font-label-sm transition-colors border ${
                        visitType === type 
                          ? 'bg-primary-container text-on-primary shadow-xs border-primary-container' 
                          : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-outline-variant/50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                
                {/* Quick Stats & Filter Reset */}
                <div className="flex items-center gap-3">
                  {!loading && !error && doctors.length > 0 && (
                    <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>{filteredAndSortedDoctors.length} Doctors Available</span>
                    </span>
                  )}
                  <button onClick={handleResetFilters} type="button" className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                    Reset Filters
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Physician Cards Grid Section */}
        <section className="max-w-[72rem] mx-auto px-4 sm:px-6 md:px-12 py-10">
          
          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
               {[1, 2, 3].map(i => (
                 <div key={i} className="bg-surface-container-lowest h-[400px] rounded-[10px] border border-outline-variant/60"></div>
               ))}
             </div>
          ) : error ? (
             <div className="text-center py-16 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm max-w-2xl mx-auto">
               <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-4">
                 <span className="material-symbols-outlined text-3xl">error</span>
               </div>
               <h3 className="text-headline-md text-on-surface font-semibold mb-2">Unable to load doctors</h3>
               <p className="text-body-md text-on-surface-variant mb-6">{error}</p>
               <button 
                  onClick={fetchInitialData} 
                  className="px-6 py-2 bg-primary-container text-on-primary rounded-lg font-label-md hover:bg-[#5249EC] transition-colors"
               >
                 Try Again
               </button>
             </div>
          ) : doctors.length === 0 ? (
             <div className="text-center py-16 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm max-w-2xl mx-auto">
               <div className="w-16 h-16 bg-surface-container-high text-on-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
                 <span className="material-symbols-outlined text-3xl">group_off</span>
               </div>
               <h3 className="text-headline-md text-on-surface font-semibold mb-2">No doctors currently registered</h3>
               <p className="text-body-md text-on-surface-variant mb-6">There are no doctors currently available in the platform.</p>
             </div>
          ) : filteredAndSortedDoctors.length === 0 ? (
             <div className="text-center py-16 bg-surface-container-lowest rounded-xl border border-outline-variant/50 shadow-sm max-w-2xl mx-auto">
               <div className="w-16 h-16 bg-surface-container-high text-on-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
                 <span className="material-symbols-outlined text-3xl">search_off</span>
               </div>
               <h3 className="text-headline-md text-on-surface font-semibold mb-2">No doctors found</h3>
               <p className="text-body-md text-on-surface-variant mb-6">Try adjusting your search or filters to find what you're looking for.</p>
               <button 
                  onClick={handleResetFilters} 
                  className="px-6 py-2 border border-outline-variant text-on-surface rounded-lg font-label-md hover:bg-surface-container-low transition-colors"
               >
                 Reset Filters
               </button>
             </div>
          ) : (
             <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
                <div>
                  <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">Available Physicians</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Showing {filteredAndSortedDoctors.length} available doctors</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedDoctors.map(doctor => {
                  const nextSlot = getNextSlotInfo(doctor.doctor_availability);
                  const consultationType = getConsultationType(doctor);
                  const isTelehealthOnly = consultationType === 'Video Telehealth';

                  return (
                    <article key={doctor.id} className="bg-surface-container-lowest rounded-[10px] border border-outline-variant/60 shadow-sm hover:shadow-md hover:border-secondary transition-all duration-150 flex flex-col overflow-hidden group">
                      
                      {/* Card Header & Doctor Details */}
                      <div className="p-5 flex-grow">
                        {/* Top Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="material-symbols-outlined text-[13px]" style={{fontVariationSettings: "'FILL' 1"}}>check</span>
                            Accepting New Patients
                          </span>
                        </div>

                        {/* Profile Overview Row */}
                        <div className="flex items-start gap-4">
                          <div className="relative shrink-0">
                            {doctor.profiles?.profile_image ? (
                               <img src={doctor.profiles.profile_image} alt={`Dr. ${doctor.profiles.last_name}`} className="w-16 h-16 rounded-full object-cover ring-2 ring-surface-container-high" />
                            ) : (
                               <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xl font-bold ring-2 ring-surface-container-high">
                                 {doctor.profiles?.first_name?.[0]}{doctor.profiles?.last_name?.[0]}
                               </div>
                            )}
                            {nextSlot && nextSlot.startsWith('Today') && (
                              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-surface-container-lowest rounded-full" title="Available today"></span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface group-hover:text-primary-container transition-colors">
                              Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}
                            </h3>
                            <p className="font-body-sm text-body-sm text-on-surface-variant font-medium">
                              {doctor.specializations?.name || 'General Practice'}
                            </p>
                            
                            {/* Rating */}
                            {(() => {
                              const revCount = (doctor.reviews && doctor.reviews.length > 0) ? doctor.reviews.length : (doctor.total_reviews || 0);
                              const avgRating = (doctor.reviews && doctor.reviews.length > 0)
                                ? (doctor.reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / doctor.reviews.length).toFixed(1)
                                : (doctor.rating && Number(doctor.rating) > 0 ? Number(doctor.rating).toFixed(1) : '5.0');
                              return (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <div className="flex items-center text-amber-500">
                                    <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                  </div>
                                  <span className="font-label-md text-label-md font-semibold text-on-surface">{avgRating}</span>
                                  <span className="font-body-sm text-body-sm text-outline">({revCount} {revCount === 1 ? 'review' : 'reviews'})</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Hospital Affiliation & Details */}
                        <div className="mt-4 pt-3 border-t border-outline-variant/40 space-y-2.5">
                          {doctor.hospitals?.name && (
                            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                              <span className="material-symbols-outlined text-[18px] text-outline">local_hospital</span>
                              <span className="truncate">{doctor.hospitals.name}</span>
                            </div>
                          )}

                          {/* Next Available Slot Badge */}
                          {nextSlot && (
                            <div className="p-2.5 rounded-lg bg-surface-container-low flex flex-wrap items-center justify-between gap-2 border border-outline-variant/30">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary-container text-[18px]">event_available</span>
                                <div>
                                  <span className="block font-label-sm text-label-sm text-outline">Next Slot</span>
                                  <span className="font-label-md text-label-md font-semibold text-on-surface">{nextSlot}</span>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-label-sm font-label-sm font-medium flex items-center gap-1 ${
                                isTelehealthOnly ? 'bg-primary/10 text-primary' : 'bg-purple-50 text-secondary border border-purple-200'
                              }`}>
                                {isTelehealthOnly && <span className="material-symbols-outlined text-[14px]">videocam</span>}
                                {consultationType}
                              </span>
                            </div>
                          )}

                          {/* Estimated Fee */}
                          <div className="flex items-baseline justify-between text-body-sm pt-1">
                            <span className="text-on-surface-variant font-label-sm text-label-sm">Estimated Fee:</span>
                            <span className="font-medium text-on-surface text-right text-body-sm font-body-sm">
                              <span className="font-bold text-primary-container">₹{Number(doctor.consultation_fee).toLocaleString('en-IN')}</span> / visit
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="p-4 bg-surface-container-low/60 border-t border-outline-variant/40 grid grid-cols-2 gap-2.5">
                        <button 
                          onClick={() => { window.location.href = `/patient/doctors/${doctor.id}`; }}
                          className="h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low hover:border-outline font-label-md text-label-md font-medium transition-all active:scale-95 text-center" 
                          type="button"
                        >
                          View Profile
                        </button>
                        <button 
                          onClick={() => { window.location.href = `/patient/book-appointment?doctor_id=${doctor.id}`; }}
                          className="h-10 px-3 rounded-lg bg-primary-container text-on-primary hover:bg-[#5249EC] active:bg-[#443CC7] font-label-md text-label-md font-medium transition-all active:scale-95 shadow-sm text-center flex items-center justify-center gap-1.5" 
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                          Book Visit
                        </button>
                      </div>
                    </article>
                  );
                })}

                {/* Additional Clinical Banners */}
                <article className="bg-gradient-to-br from-surface-container to-surface-container-lowest rounded-[10px] border border-primary-fixed-dim p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[22px]">bolt</span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded text-label-sm font-label-sm bg-primary/10 text-primary font-semibold mb-2">Immediate Consultation</span>
                    <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Need to see a doctor right now?</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                      Connect with an on-call physician via on-demand video telehealth in under 15 minutes for acute minor illnesses and prescriptions.
                    </p>
                  </div>
                  <div className="pt-6">
                    <button className="w-full h-10 px-4 rounded-lg bg-primary-container text-on-primary hover:bg-[#5249EC] font-label-md text-label-md font-medium transition-all flex items-center justify-center gap-2 shadow-sm" type="button">
                      <span className="material-symbols-outlined text-[18px]">video_chat</span>
                      Join On-Demand Queue
                    </button>
                  </div>
                </article>
              </div>
             </>
          )}

        </section>
      </div>
    </PatientLayout>
  );
};

export default DoctorSearch;
