import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import PatientLayout from '../components/PatientLayout';

const ProfileSettings = () => {
  const { profile, role, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [errorNotice, setErrorNotice] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const Layout = role === 'patient' ? PatientLayout : DashboardLayout;

  // Common Profile Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Patient Specific Fields
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Doctor Specific Fields
  const [experience, setExperience] = useState('');
  const [qualification, setQualification] = useState('');
  const [bio, setBio] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [languages, setLanguages] = useState('');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
      setGender(profile.gender || '');
      setDob(profile.dob || '');
      setAddress(profile.address || '');
      setCity(profile.city || '');
      setState(profile.state || '');
      fetchRoleSpecificData();
    }
  }, [profile]);

  const fetchRoleSpecificData = async () => {
    if (!profile) return;
    
    if (role === 'patient') {
      const { data, error } = await supabase.from('patients').select('*').eq('profile_id', profile.id).single();
      if (data) {
        setBloodGroup(data.blood_group || '');
        setAllergies(data.allergies || '');
        setEmergencyContact(data.emergency_contact || '');
      }
    } else if (role === 'doctor') {
      const { data, error } = await supabase.from('doctors').select('*').eq('profile_id', profile.id).single();
      if (data) {
        setExperience(data.experience || '');
        setQualification(data.qualification || '');
        setBio(data.bio || '');
        setConsultationFee(data.consultation_fee || '');
        setLanguages(data.languages ? data.languages.join(', ') : '');
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    setErrorNotice(null);

    try {
      // 1. Update public.profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          gender,
          dob: dob || null,
          address,
          city,
          state
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // 2. Upsert role specific table (Upsert because it might not exist yet)
      if (role === 'patient') {
        const { error: patientError } = await supabase
          .from('patients')
          .upsert({
            profile_id: profile.id,
            blood_group: bloodGroup,
            allergies,
            emergency_contact: emergencyContact
          }, { onConflict: 'profile_id' });
        
        if (patientError) throw patientError;
      } else if (role === 'doctor') {
        const { error: doctorError } = await supabase
          .from('doctors')
          .upsert({
            profile_id: profile.id,
            experience,
            qualification,
            bio,
            consultation_fee: consultationFee || 0,
            languages: languages.split(',').map(l => l.trim()).filter(Boolean)
          }, { onConflict: 'profile_id' });

        if (doctorError) throw doctorError;
      }

      setNotice("Profile updated successfully!");
      setIsEditing(false); // Switch back to view mode on success
    } catch (err) {
      setErrorNotice(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    // Reset fields to current profile data
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
      setGender(profile.gender || '');
      setDob(profile.dob || '');
      setAddress(profile.address || '');
      setCity(profile.city || '');
      setState(profile.state || '');
      fetchRoleSpecificData();
    }
    setIsEditing(false);
    setNotice(null);
    setErrorNotice(null);
  };

  const InfoRow = ({ label, value }) => (
    <div className="py-3 border-b border-outline-variant/50 flex flex-col md:flex-row md:justify-between md:items-center">
      <span className="text-on-surface-variant text-label-md mb-1 md:mb-0">{label}</span>
      <span className="text-on-surface text-body-md font-medium text-right">{value || '-'}</span>
    </div>
  );

  return (
    <Layout>
      <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/50 p-6 md:p-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline-md text-on-surface">My Profile</h1>
            <p className="text-body-md text-on-surface-variant">View and manage your personal details.</p>
          </div>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-4 py-2 rounded-xl transition-colors font-medium text-label-md shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
              Edit Profile
            </button>
          )}
        </div>

        {notice && (
          <div className="bg-primary/10 text-primary p-4 rounded-lg mb-6 flex items-center space-x-2">
            <span className="material-symbols-outlined">check_circle</span>
            <span>{notice}</span>
          </div>
        )}
        {errorNotice && (
          <div className="bg-error/10 text-error p-4 rounded-lg mb-6 flex items-center space-x-2">
            <span className="material-symbols-outlined">error</span>
            <span>{errorNotice}</span>
          </div>
        )}

        {!isEditing ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* View Mode */}
            <section>
              <h3 className="text-title-md text-on-surface border-b border-outline-variant pb-2 mb-4">General Information</h3>
              <div className="space-y-1">
                <InfoRow label="First Name" value={firstName} />
                <InfoRow label="Last Name" value={lastName} />
                <InfoRow label="Email" value={session?.user?.email} />
                <InfoRow label="Phone" value={phone} />
                <InfoRow label="Gender" value={gender} />
                <InfoRow label="Date of Birth" value={dob} />
              </div>
            </section>

            <section>
              <h3 className="text-title-md text-on-surface border-b border-outline-variant pb-2 mb-4">Location</h3>
              <div className="space-y-1">
                <InfoRow label="Address" value={address} />
                <InfoRow label="City" value={city} />
                <InfoRow label="State" value={state} />
              </div>
            </section>

            {role === 'patient' && (
              <section>
                <h3 className="text-title-md text-on-surface border-b border-outline-variant pb-2 mb-4">Patient Information</h3>
                <div className="space-y-1">
                  <InfoRow label="Blood Group" value={bloodGroup} />
                  <InfoRow label="Emergency Contact" value={emergencyContact} />
                  <div className="py-3 flex flex-col">
                    <span className="text-on-surface-variant text-label-md mb-2">Known Allergies</span>
                    <span className="text-on-surface text-body-md font-medium">{allergies || 'None listed'}</span>
                  </div>
                </div>
              </section>
            )}

            {role === 'doctor' && (
              <section>
                <h3 className="text-title-md text-on-surface border-b border-outline-variant pb-2 mb-4">Professional Information</h3>
                <div className="space-y-1">
                  <InfoRow label="Experience" value={experience} />
                  <InfoRow label="Consultation Fee" value={`$${consultationFee}`} />
                  <InfoRow label="Qualifications" value={qualification} />
                  <InfoRow label="Languages" value={languages} />
                  <div className="py-3 flex flex-col">
                    <span className="text-on-surface-variant text-label-md mb-2">Professional Bio</span>
                    <span className="text-on-surface text-body-md font-medium whitespace-pre-wrap">{bio || 'No bio provided'}</span>
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-8 animate-in fade-in duration-300">
            {/* Edit Mode */}
            <section>
              <h3 className="text-title-md text-on-surface border-b border-outline-variant/50 pb-2 mb-4">General Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">First Name</label>
                  <input required className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">Last Name</label>
                  <input required className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">Email</label>
                  <input disabled className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface-variant outline-none" value={session?.user?.email || ''} />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">Phone</label>
                  <input className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">Gender</label>
                  <select className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">Date of Birth</label>
                  <input type="date" className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-title-md text-on-surface border-b border-outline-variant/50 pb-2 mb-4">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-label-md text-on-surface mb-1.5">Address</label>
                  <input className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">City</label>
                  <input className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">State</label>
                  <input className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" value={state} onChange={e => setState(e.target.value)} />
                </div>
              </div>
            </section>

            {role === 'patient' && (
              <section>
                <h3 className="text-title-md text-on-surface border-b border-outline-variant/50 pb-2 mb-4">Patient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-label-md text-on-surface mb-1.5">Blood Group</label>
                    <input className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" placeholder="e.g. O+" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface mb-1.5">Emergency Contact</label>
                    <input className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" placeholder="Name & Phone" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-label-md text-on-surface mb-1.5">Known Allergies</label>
                    <textarea className="w-full p-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none min-h-[100px]" placeholder="List any allergies..." value={allergies} onChange={e => setAllergies(e.target.value)} />
                  </div>
                </div>
              </section>
            )}

            {role === 'doctor' && (
              <section>
                <h3 className="text-title-md text-on-surface border-b border-outline-variant/50 pb-2 mb-4">Professional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-label-md text-on-surface mb-1.5">Experience (Years/Description)</label>
                    <input className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" placeholder="e.g. 10 Years" value={experience} onChange={e => setExperience(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface mb-1.5">Consultation Fee ($)</label>
                    <input type="number" min="0" step="0.01" className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" placeholder="e.g. 150.00" value={consultationFee} onChange={e => setConsultationFee(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface mb-1.5">Qualifications</label>
                    <input className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" placeholder="e.g. MD, FACS" value={qualification} onChange={e => setQualification(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface mb-1.5">Languages Spoken (comma separated)</label>
                    <input className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" placeholder="e.g. English, Spanish" value={languages} onChange={e => setLanguages(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-label-md text-on-surface mb-1.5">Professional Bio</label>
                    <textarea className="w-full p-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none min-h-[120px]" placeholder="Tell patients about your background..." value={bio} onChange={e => setBio(e.target.value)} />
                  </div>
                </div>
              </section>
            )}

            <div className="pt-4 flex justify-end gap-3 border-t border-outline-variant/50 mt-6">
              <button 
                type="button" 
                onClick={cancelEdit}
                disabled={loading}
                className="bg-surface-container-lowest hover:bg-surface-container-low text-on-surface border border-outline-variant px-6 py-2.5 rounded-xl font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-on-primary px-8 py-2.5 rounded-xl font-medium shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : <span className="material-symbols-outlined text-[20px]">save</span>}
                {loading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default ProfileSettings;
