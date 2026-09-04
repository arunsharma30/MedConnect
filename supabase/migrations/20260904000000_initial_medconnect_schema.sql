-- MedConnect Database Migration: Initial Schema
-- Generated: 2026-09-04
-- Target: Supabase / PostgreSQL

-- ============================================================
-- 1. ENUMS & CUSTOM TYPES
-- ============================================================

CREATE TYPE public.user_role AS ENUM ('patient', 'doctor', 'admin');
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE public.appointment_mode AS ENUM ('online', 'offline');
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show');
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE public.day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
CREATE TYPE public.video_session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.notification_type AS ENUM ('info', 'alert', 'reminder', 'success', 'warning');

-- ============================================================
-- 2. CORE TABLES
-- ============================================================

-- 01. profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    gender TEXT,
    dob DATE,
    profile_image TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    pincode TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 02. patients
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blood_group TEXT,
    height DECIMAL,
    weight DECIMAL,
    allergies TEXT,
    emergency_contact TEXT,
    insurance_number TEXT,
    insurance_provider TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 05. specializations (Must exist before doctors)
CREATE TABLE public.specializations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT
);

-- 06. hospitals (Must exist before doctors)
CREATE TABLE public.hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    logo TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 03. doctors
CREATE TABLE public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    specialization_id UUID REFERENCES public.specializations(id) ON DELETE SET NULL,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    experience TEXT,
    qualification TEXT,
    license_number TEXT UNIQUE,
    consultation_fee DECIMAL NOT NULL CHECK (consultation_fee >= 0),
    bio TEXT,
    languages TEXT[],
    rating DECIMAL DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    verification_status public.verification_status DEFAULT 'pending',
    years_experience INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 04. admins
CREATE TABLE public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    designation TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 07. doctor_hospital
CREATE TABLE public.doctor_hospital (
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
    department TEXT,
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (doctor_id, hospital_id)
);

-- 08. doctor_availability
CREATE TABLE public.doctor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    day public.day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER NOT NULL DEFAULT 30,
    is_available BOOLEAN DEFAULT true,
    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- 09. appointments
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_number TEXT UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    mode public.appointment_mode NOT NULL,
    status public.appointment_status DEFAULT 'pending',
    reason TEXT,
    symptoms TEXT,
    payment_status public.payment_status DEFAULT 'pending',
    video_session_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_appointment_time CHECK (start_time < end_time)
);

-- 10. video_sessions
CREATE TABLE public.video_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID UNIQUE NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    meeting_url TEXT,
    meeting_id TEXT,
    meeting_password TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    recording_url TEXT,
    status public.video_session_status DEFAULT 'scheduled'
);

-- Add fk back to appointments for video_session_id
ALTER TABLE public.appointments 
ADD CONSTRAINT fk_video_session 
FOREIGN KEY (video_session_id) REFERENCES public.video_sessions(id) ON DELETE SET NULL;

-- 11. medical_records
CREATE TABLE public.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    diagnosis TEXT,
    blood_pressure TEXT,
    temperature DECIMAL,
    weight DECIMAL,
    heart_rate INTEGER,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. prescriptions
CREATE TABLE public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID UNIQUE NOT NULL REFERENCES public.appointments(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    diagnosis TEXT,
    instructions TEXT,
    next_visit DATE,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. medicines (Must exist before prescription_items)
CREATE TABLE public.medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    manufacturer TEXT,
    type TEXT,
    description TEXT
);

-- 13. prescription_items
CREATE TABLE public.prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE RESTRICT,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- 15. payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    amount DECIMAL NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_method TEXT,
    gateway TEXT,
    transaction_id TEXT UNIQUE,
    status public.payment_status DEFAULT 'pending',
    invoice_url TEXT,
    paid_at TIMESTAMPTZ
);

-- 16. notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type public.notification_type DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. reviews
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    appointment_id UUID UNIQUE NOT NULL REFERENCES public.appointments(id) ON DELETE RESTRICT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. messages
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    message TEXT,
    attachment TEXT,
    is_seen BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. report_files
CREATE TABLE public.report_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 20. audit_logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    ip_address INET,
    device TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 21. system_settings
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX idx_profiles_auth_id ON public.profiles(auth_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);

CREATE INDEX idx_patients_profile_id ON public.patients(profile_id);

CREATE INDEX idx_doctors_profile_id ON public.doctors(profile_id);
CREATE INDEX idx_doctors_specialization_id ON public.doctors(specialization_id);
CREATE INDEX idx_doctors_hospital_id ON public.doctors(hospital_id);
CREATE INDEX idx_doctors_verification_status ON public.doctors(verification_status);

CREATE INDEX idx_doctor_availability_doctor_id ON public.doctor_availability(doctor_id);
CREATE INDEX idx_doctor_availability_day ON public.doctor_availability(day);

CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX idx_appointments_hospital_id ON public.appointments(hospital_id);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);

CREATE INDEX idx_video_sessions_appointment_id ON public.video_sessions(appointment_id);

CREATE INDEX idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX idx_medical_records_doctor_id ON public.medical_records(doctor_id);
CREATE INDEX idx_medical_records_appointment_id ON public.medical_records(appointment_id);

CREATE INDEX idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor_id ON public.prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_appointment_id ON public.prescriptions(appointment_id);

CREATE INDEX idx_prescription_items_prescription_id ON public.prescription_items(prescription_id);
CREATE INDEX idx_prescription_items_medicine_id ON public.prescription_items(medicine_id);

CREATE INDEX idx_payments_appointment_id ON public.payments(appointment_id);
CREATE INDEX idx_payments_patient_id ON public.payments(patient_id);
CREATE INDEX idx_payments_transaction_id ON public.payments(transaction_id);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

CREATE INDEX idx_reviews_patient_id ON public.reviews(patient_id);
CREATE INDEX idx_reviews_doctor_id ON public.reviews(doctor_id);
CREATE INDEX idx_reviews_appointment_id ON public.reviews(appointment_id);

CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX idx_messages_appointment_id ON public.messages(appointment_id);

CREATE INDEX idx_report_files_patient_id ON public.report_files(patient_id);
CREATE INDEX idx_report_files_medical_record_id ON public.report_files(medical_record_id);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);

-- ============================================================
-- 4. FUNCTIONS AND TRIGGERS
-- ============================================================

-- Reusable updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Auto-create profile on Supabase Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_id, role, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'patient'::public.user_role),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger in auth schema (Requires superuser / permissions)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ============================================================
-- 5. STORAGE BUCKETS (Metadata)
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('public_assets', 'public_assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('medical_files', 'medical_files', false) ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_hospital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Base Policy Functions for convenience
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_doctor() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'doctor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_patient() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'patient'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = auth_id);

-- 2. patients
CREATE POLICY "Patients viewable by doctors, admins, and self." ON public.patients FOR SELECT
  USING (
    public.is_admin() OR 
    public.is_doctor() OR 
    profile_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid())
  );
CREATE POLICY "Patients can update own record." ON public.patients FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can insert own record." ON public.patients FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

-- 3. doctors
CREATE POLICY "Doctors are publicly viewable." ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Doctors can update own record." ON public.doctors FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
CREATE POLICY "Doctors can insert own record." ON public.doctors FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

-- 4. admins
CREATE POLICY "Admins can view admins." ON public.admins FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update own record." ON public.admins FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

-- 5. specializations
CREATE POLICY "Specializations are publicly viewable." ON public.specializations FOR SELECT USING (true);

-- 6. hospitals
CREATE POLICY "Hospitals are publicly viewable." ON public.hospitals FOR SELECT USING (true);

-- 7. doctor_hospital
CREATE POLICY "Doctor hospital links are publicly viewable." ON public.doctor_hospital FOR SELECT USING (true);

-- 8. doctor_availability
CREATE POLICY "Availability is publicly viewable." ON public.doctor_availability FOR SELECT USING (true);
CREATE POLICY "Doctors can manage own availability." ON public.doctor_availability FOR ALL
  USING (doctor_id IN (SELECT d.id FROM public.doctors d JOIN public.profiles p ON d.profile_id = p.id WHERE p.auth_id = auth.uid()));

-- 9. appointments
CREATE POLICY "Users can view own appointments." ON public.appointments FOR SELECT
  USING (
    public.is_admin() OR
    patient_id IN (SELECT p.id FROM public.patients p JOIN public.profiles pr ON p.profile_id = pr.id WHERE pr.auth_id = auth.uid()) OR
    doctor_id IN (SELECT d.id FROM public.doctors d JOIN public.profiles pr ON d.profile_id = pr.id WHERE pr.auth_id = auth.uid())
  );
CREATE POLICY "Patients can insert appointments." ON public.appointments FOR INSERT
  WITH CHECK (patient_id IN (SELECT p.id FROM public.patients p JOIN public.profiles pr ON p.profile_id = pr.id WHERE pr.auth_id = auth.uid()));
CREATE POLICY "Involved parties can update appointments." ON public.appointments FOR UPDATE
  USING (
    public.is_admin() OR
    patient_id IN (SELECT p.id FROM public.patients p JOIN public.profiles pr ON p.profile_id = pr.id WHERE pr.auth_id = auth.uid()) OR
    doctor_id IN (SELECT d.id FROM public.doctors d JOIN public.profiles pr ON d.profile_id = pr.id WHERE pr.auth_id = auth.uid())
  );

-- 10. video_sessions
CREATE POLICY "Involved parties can view video sessions." ON public.video_sessions FOR SELECT
  USING (
    appointment_id IN (
      SELECT id FROM public.appointments WHERE 
      patient_id IN (SELECT p.id FROM public.patients p JOIN public.profiles pr ON p.profile_id = pr.id WHERE pr.auth_id = auth.uid()) OR
      doctor_id IN (SELECT d.id FROM public.doctors d JOIN public.profiles pr ON d.profile_id = pr.id WHERE pr.auth_id = auth.uid())
    ) OR public.is_admin()
  );

-- 11. medical_records
CREATE POLICY "Involved parties can view medical records." ON public.medical_records FOR SELECT
  USING (
    patient_id IN (SELECT p.id FROM public.patients p JOIN public.profiles pr ON p.profile_id = pr.id WHERE pr.auth_id = auth.uid()) OR
    doctor_id IN (SELECT d.id FROM public.doctors d JOIN public.profiles pr ON d.profile_id = pr.id WHERE pr.auth_id = auth.uid()) OR
    public.is_admin()
  );
CREATE POLICY "Doctors can insert medical records." ON public.medical_records FOR INSERT
  WITH CHECK (doctor_id IN (SELECT d.id FROM public.doctors d JOIN public.profiles pr ON d.profile_id = pr.id WHERE pr.auth_id = auth.uid()));
CREATE POLICY "Doctors can update own medical records." ON public.medical_records FOR UPDATE
  USING (doctor_id IN (SELECT d.id FROM public.doctors d JOIN public.profiles pr ON d.profile_id = pr.id WHERE pr.auth_id = auth.uid()));

-- 12. prescriptions
CREATE POLICY "Involved parties can view prescriptions." ON public.prescriptions FOR SELECT
  USING (
    patient_id IN (SELECT p.id FROM public.patients p JOIN public.profiles pr ON p.profile_id = pr.id WHERE pr.auth_id = auth.uid()) OR
    doctor_id IN (SELECT d.id FROM public.doctors d JOIN public.profiles pr ON d.profile_id = pr.id WHERE pr.auth_id = auth.uid()) OR
    public.is_admin()
  );
CREATE POLICY "Doctors can insert prescriptions." ON public.prescriptions FOR INSERT
  WITH CHECK (doctor_id IN (SELECT d.id FROM public.doctors d JOIN public.profiles pr ON d.profile_id = pr.id WHERE pr.auth_id = auth.uid()));

-- 13. prescription_items
CREATE POLICY "Involved parties can view prescription items." ON public.prescription_items FOR SELECT
  USING (
    prescription_id IN (
      SELECT id FROM public.prescriptions WHERE 
      patient_id IN (SELECT p.id FROM public.patients p JOIN public.profiles pr ON p.profile_id = pr.id WHERE pr.auth_id = auth.uid()) OR
      doctor_id IN (SELECT d.id FROM public.doctors d JOIN public.profiles pr ON d.profile_id = pr.id WHERE pr.auth_id = auth.uid())
    ) OR public.is_admin()
  );
CREATE POLICY "Doctors can insert prescription items." ON public.prescription_items FOR INSERT
  WITH CHECK (
    prescription_id IN (
      SELECT id FROM public.prescriptions WHERE 
      doctor_id IN (SELECT d.id FROM public.doctors d JOIN public.profiles pr ON d.profile_id = pr.id WHERE pr.auth_id = auth.uid())
    )
  );

-- 14. medicines
CREATE POLICY "Medicines are publicly viewable." ON public.medicines FOR SELECT USING (true);

-- 15. payments
CREATE POLICY "Patients and admins view payments." ON public.payments FOR SELECT
  USING (
    patient_id IN (SELECT p.id FROM public.patients p JOIN public.profiles pr ON p.profile_id = pr.id WHERE pr.auth_id = auth.uid()) OR
    public.is_admin()
  );

-- 16. notifications
CREATE POLICY "Users can view own notifications." ON public.notifications FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
CREATE POLICY "Users can update own notifications." ON public.notifications FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

-- 17. reviews
CREATE POLICY "Reviews are publicly viewable." ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Patients can insert reviews." ON public.reviews FOR INSERT
  WITH CHECK (patient_id IN (SELECT p.id FROM public.patients p JOIN public.profiles pr ON p.profile_id = pr.id WHERE pr.auth_id = auth.uid()));

-- 18. messages
CREATE POLICY "Users can view their messages." ON public.messages FOR SELECT
  USING (
    sender_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid())
  );
CREATE POLICY "Users can send messages." ON public.messages FOR INSERT
  WITH CHECK (sender_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

-- 19. report_files
CREATE POLICY "Involved parties can view report files." ON public.report_files FOR SELECT
  USING (
    patient_id IN (SELECT p.id FROM public.patients p JOIN public.profiles pr ON p.profile_id = pr.id WHERE pr.auth_id = auth.uid()) OR
    public.is_doctor() OR
    public.is_admin()
  );
CREATE POLICY "Patients can upload report files." ON public.report_files FOR INSERT
  WITH CHECK (patient_id IN (SELECT p.id FROM public.patients p JOIN public.profiles pr ON p.profile_id = pr.id WHERE pr.auth_id = auth.uid()));

-- 20. audit_logs
CREATE POLICY "Admins can view audit logs." ON public.audit_logs FOR SELECT USING (public.is_admin());

-- 21. system_settings
CREATE POLICY "System settings are viewable by everyone." ON public.system_settings FOR SELECT USING (true);

-- STORAGE POLICIES (Assuming pg_catalog storage functions exist)
CREATE POLICY "Public Assets are viewable by everyone." 
ON storage.objects FOR SELECT 
USING (bucket_id = 'public_assets');

CREATE POLICY "Medical files accessible by patients, doctors, admins" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'medical_files' AND (
    (auth.uid() IS NOT NULL AND public.is_patient()) OR
    (auth.uid() IS NOT NULL AND public.is_doctor()) OR
    (auth.uid() IS NOT NULL AND public.is_admin())
  )
);

CREATE POLICY "Patients and doctors can upload medical files" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'medical_files' AND (
    (auth.uid() IS NOT NULL AND public.is_patient()) OR
    (auth.uid() IS NOT NULL AND public.is_doctor())
  )
);
