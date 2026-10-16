-- Migration: Prevent double booking of appointment slots
-- Prevents race conditions where two patients attempt to book the same doctor, date, and start time simultaneously.

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_no_double_booking 
ON public.appointments (doctor_id, appointment_date, start_time) 
WHERE status NOT IN ('cancelled', 'no_show');
