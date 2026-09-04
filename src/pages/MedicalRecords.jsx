import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import PatientLayout from '../components/PatientLayout';
import { useAuth } from '../context/AuthContext';

const MedicalRecords = () => {
  const { profile } = useAuth();
  const [records, setRecords] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    // Get patient id
    const { data: patient } = await supabase.from('patients').select('id').eq('profile_id', profile.id).single();
    if (!patient) return;
    
    setPatientId(patient.id);

    // Fetch clinical records
    const { data: medicalData } = await supabase
      .from('medical_records')
      .select('*, doctors(profiles(first_name, last_name))')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });
    
    if (medicalData) setRecords(medicalData);

    // Fetch report files
    const { data: fileData } = await supabase
      .from('report_files')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });
      
    if (fileData) setFiles(fileData);
    
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !patientId) return;

    // Ask user for document name
    let docName = window.prompt("Enter a name for this document:", file.name);
    
    // If they cancel, abort the upload
    if (docName === null) {
      e.target.value = ''; // Reset input
      return;
    }
    
    if (docName.trim() === '') {
      docName = file.name;
    }

    setUploading(true);
    setNotice(null);

    const fileExt = file.name.split('.').pop();
    const fileName = `${patientId}/${Date.now()}.${fileExt}`;

    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('medical_files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('medical_files')
        .getPublicUrl(fileName);

      // Insert into report_files table
      const { error: dbError } = await supabase.from('report_files').insert({
        patient_id: patientId,
        file_name: docName,
        file_url: publicUrl,
        file_type: file.type,
        uploaded_by: profile.id
      });

      if (dbError) throw dbError;

      setNotice({ type: 'success', text: 'File uploaded successfully!' });
      fetchData(); // Refresh list
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Error uploading file. Make sure the medical_files bucket exists and is accessible.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId, fileUrl) => {
    if (!window.confirm('Delete this file?')) return;
    
    try {
      // Extract path from url
      const path = fileUrl.split('/medical_files/')[1];
      if (path) {
        const { error: storageError } = await supabase.storage.from('medical_files').remove([path]);
        if (storageError) console.error("Storage delete error:", storageError);
      }
      
      const { error: dbError } = await supabase.from('report_files').delete().eq('id', fileId);
      if (dbError) throw dbError;

      setFiles(files.filter(f => f.id !== fileId));
      setNotice({ type: 'success', text: 'File deleted successfully.' });
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', text: 'Failed to delete file: ' + error.message });
    }
  };

  return (
    <PatientLayout>
      <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/50 p-6 md:p-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-headline-md text-on-surface">Medical Records</h1>
            <p className="text-body-md text-on-surface-variant">View your clinical history and upload reports.</p>
          </div>
          
          <div>
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              onChange={handleFileUpload}
              accept=".pdf,.png,.jpg,.jpeg"
            />
            <label 
              htmlFor="file-upload" 
              className={`flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-medium cursor-pointer shadow hover:shadow-md transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <span className="material-symbols-outlined">{uploading ? 'sync' : 'upload_file'}</span>
              {uploading ? 'Uploading...' : 'Upload Document'}
            </label>
          </div>
        </div>

        {notice && (
          <div className={`p-4 rounded-lg mb-6 flex items-center space-x-2 ${notice.type === 'error' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
            <span className="material-symbols-outlined">{notice.type === 'error' ? 'error' : 'check_circle'}</span>
            <span>{notice.text}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Uploaded Files */}
            <div>
              <h3 className="text-title-md text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">folder</span>
                My Documents
              </h3>
              
              {files.length === 0 ? (
                <div className="p-8 bg-surface-container-lowest rounded-xl border border-outline-variant/50 border-dashed text-center">
                  <p className="text-body-sm text-on-surface-variant">No documents uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/50 hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="material-symbols-outlined text-on-surface-variant shrink-0">
                          {file.file_type?.includes('pdf') ? 'picture_as_pdf' : 'image'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-label-md text-on-surface truncate font-medium">{file.file_name}</p>
                          <p className="text-label-sm text-on-surface-variant">{new Date(file.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a href={file.file_url} target="_blank" rel="noreferrer" className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </a>
                        <button onClick={() => handleDeleteFile(file.id, file.file_url)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clinical Records */}
            <div>
              <h3 className="text-title-md text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">medical_information</span>
                Clinical Records
              </h3>
              
              {records.length === 0 ? (
                <div className="p-8 bg-surface-container-lowest rounded-xl border border-outline-variant/50 border-dashed text-center">
                  <p className="text-body-sm text-on-surface-variant">No clinical records found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {records.map(record => (
                    <div key={record.id} className="p-5 bg-surface-container-lowest rounded-xl border border-outline-variant/50 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-title-sm font-bold text-on-surface">{record.diagnosis || 'General Consultation'}</h4>
                          <p className="text-label-sm text-primary">
                            Dr. {record.doctors?.profiles?.first_name} {record.doctors?.profiles?.last_name}
                          </p>
                        </div>
                        <span className="text-label-sm text-on-surface-variant bg-surface-variant px-2 py-1 rounded">
                          {new Date(record.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3 text-body-sm bg-white p-3 rounded-lg border border-outline-variant/30">
                        {record.blood_pressure && <div><span className="text-on-surface-variant">BP:</span> {record.blood_pressure}</div>}
                        {record.heart_rate && <div><span className="text-on-surface-variant">HR:</span> {record.heart_rate} bpm</div>}
                        {record.temperature && <div><span className="text-on-surface-variant">Temp:</span> {record.temperature}°</div>}
                        {record.weight && <div><span className="text-on-surface-variant">Weight:</span> {record.weight}kg</div>}
                      </div>
                      
                      {record.remarks && (
                        <p className="text-body-sm text-on-surface mt-2 italic">
                          "{record.remarks}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        )}
      </div>
    </PatientLayout>
  );
};

export default MedicalRecords;
