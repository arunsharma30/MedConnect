-- MedConnect Database Migration: Video Sessions RLS Policies & Enhancements
-- Generated: 2026-10-14
-- Purpose: Grant least-privilege INSERT and UPDATE access on video_sessions to involved patients and doctors

-- 1. Ensure RLS is enabled on video_sessions
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Drop policies if they exist to allow idempotent migration application
DROP POLICY IF EXISTS "Involved parties can insert video sessions." ON public.video_sessions;
DROP POLICY IF EXISTS "Involved parties can update video sessions." ON public.video_sessions;

-- 3. Policy: Involved parties can insert video sessions for their eligible appointments
CREATE POLICY "Involved parties can insert video sessions." ON public.video_sessions 
FOR INSERT 
WITH CHECK (
  public.is_admin() OR
  appointment_id IN (
    SELECT a.id FROM public.appointments a
    WHERE (
      a.patient_id IN (
        SELECT p.id FROM public.patients p 
        JOIN public.profiles pr ON p.profile_id = pr.id 
        WHERE pr.auth_id = auth.uid()
      ) OR
      a.doctor_id IN (
        SELECT d.id FROM public.doctors d 
        JOIN public.profiles pr ON d.profile_id = pr.id 
        WHERE pr.auth_id = auth.uid()
      )
    )
    AND a.status NOT IN ('cancelled', 'no_show')
  )
);

-- 4. Policy: Involved parties can update video sessions for their assigned appointments
CREATE POLICY "Involved parties can update video sessions." ON public.video_sessions 
FOR UPDATE 
USING (
  public.is_admin() OR
  appointment_id IN (
    SELECT a.id FROM public.appointments a
    WHERE (
      a.patient_id IN (
        SELECT p.id FROM public.patients p 
        JOIN public.profiles pr ON p.profile_id = pr.id 
        WHERE pr.auth_id = auth.uid()
      ) OR
      a.doctor_id IN (
        SELECT d.id FROM public.doctors d 
        JOIN public.profiles pr ON d.profile_id = pr.id 
        WHERE pr.auth_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  public.is_admin() OR
  appointment_id IN (
    SELECT a.id FROM public.appointments a
    WHERE (
      a.patient_id IN (
        SELECT p.id FROM public.patients p 
        JOIN public.profiles pr ON p.profile_id = pr.id 
        WHERE pr.auth_id = auth.uid()
      ) OR
      a.doctor_id IN (
        SELECT d.id FROM public.doctors d 
        JOIN public.profiles pr ON d.profile_id = pr.id 
        WHERE pr.auth_id = auth.uid()
      )
    )
  )
);
