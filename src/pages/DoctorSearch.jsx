import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import PatientLayout from '../components/PatientLayout';

const DoctorSearch = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [specialties, setSpecialties] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');

  useEffect(() => {
    fetchDoctors();
    fetchSpecialties();
  }, [selectedSpecialty]);

  const fetchSpecialties = async () => {
    const { data } = await supabase.from('specializations').select('id, name');
    if (data) setSpecialties(data);
  };

  const fetchDoctors = async () => {
    setLoading(true);
    let query = supabase
      .from('doctors')
      .select(`
        id,
        consultation_fee,
        experience,
        rating,
        total_reviews,
        profiles!inner ( first_name, last_name, profile_image, city, state ),
        specializations ( name ),
        hospitals ( name )
      `);

    if (selectedSpecialty) {
      query = query.eq('specialization_id', selectedSpecialty);
    }

    const { data, error } = await query;
    if (data) {
      setDoctors(data);
    }
    setLoading(false);
  };

  const filteredDoctors = doctors.filter(doc => {
    const fullName = `${doc.profiles?.first_name} ${doc.profiles?.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  return (
    <PatientLayout>
      <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/50 p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-headline-md text-on-surface">Find a Doctor</h1>
          <p className="text-body-md text-on-surface-variant">Search and book appointments with top-rated specialists.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-4 top-3 text-on-surface-variant">search</span>
            <input 
              type="text" 
              placeholder="Search by doctor name..." 
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 focus:border-primary outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <select 
              className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest/50 focus:border-primary outline-none"
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
            >
              <option value="">All Specialties</option>
              {specialties.map(spec => (
                <option key={spec.id} value={spec.id}>{spec.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center py-12 bg-surface-container-lowest rounded-xl border border-outline-variant/50">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">search_off</span>
            <h3 className="text-title-md text-on-surface">No doctors found</h3>
            <p className="text-body-sm text-on-surface-variant">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDoctors.map(doctor => (
              <div key={doctor.id} className="border border-outline-variant/50 rounded-xl p-6 hover:shadow-md transition-shadow bg-surface-container-lowest">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold overflow-hidden shrink-0">
                    {doctor.profiles?.profile_image ? (
                      <img src={doctor.profiles.profile_image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      `${doctor.profiles?.first_name?.[0]}${doctor.profiles?.last_name?.[0]}`
                    )}
                  </div>
                  <div>
                    <h3 className="text-title-md text-on-surface font-bold">Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}</h3>
                    <p className="text-body-sm text-primary font-medium">{doctor.specializations?.name || 'General'}</p>
                    <p className="text-body-sm text-on-surface-variant">{doctor.experience || 'Experienced'}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-3 border-y border-outline-variant/50 mb-4">
                  <div className="text-center">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wide">Rating</p>
                    <p className="text-title-sm text-on-surface flex items-center gap-1 justify-center">
                      <span className="material-symbols-outlined text-[16px] text-amber-400 filled">star</span>
                      {doctor.rating}
                    </p>
                  </div>
                  <div className="text-center border-l border-outline-variant/50 pl-4">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wide">Patients</p>
                    <p className="text-title-sm text-on-surface">{doctor.total_reviews * 3}+</p>
                  </div>
                  <div className="text-center border-l border-outline-variant/50 pl-4">
                    <p className="text-label-sm text-on-surface-variant uppercase tracking-wide">Fee</p>
                    <p className="text-title-sm text-on-surface">${doctor.consultation_fee}</p>
                  </div>
                </div>

                <button 
                  onClick={() => window.location.href = `/patient/book-appointment?doctor_id=${doctor.id}`}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors"
                >
                  Book Appointment
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PatientLayout>
  );
};

export default DoctorSearch;
