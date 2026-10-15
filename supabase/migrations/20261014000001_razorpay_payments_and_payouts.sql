-- MedConnect Database Migration: Razorpay Payments, Split Payouts & Webhook Events
-- Generated: 2026-10-14
-- Purpose: Support Razorpay orders, doctor shares, settlement holds, and webhooks in integer paise

-- 1. Enhance public.payments table
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_paise BIGINT,
  ADD COLUMN IF NOT EXISTS gateway_order_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS gateway_signature_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure currency defaults to INR
ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'INR';

-- Populate amount_paise for any existing rows if empty
UPDATE public.payments 
SET amount_paise = ROUND(amount * 100) 
WHERE amount_paise IS NULL AND amount IS NOT NULL;

-- 2. Create public.payment_transfers table (tracks doctor shares and settlement holds)
CREATE TABLE IF NOT EXISTS public.payment_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    linked_account_id TEXT,
    gross_amount_paise BIGINT NOT NULL,
    platform_commission_paise BIGINT NOT NULL,
    doctor_amount_paise BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    gateway_transfer_id TEXT,
    transfer_status TEXT NOT NULL DEFAULT 'pending',
    settlement_status TEXT NOT NULL DEFAULT 'pending',
    on_hold BOOLEAN NOT NULL DEFAULT true,
    released_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    is_simulated BOOLEAN NOT NULL DEFAULT false,
    last_error_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_payment_transfer UNIQUE (payment_id)
);

-- 3. Create public.payment_webhook_events table (idempotent event ledger)
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_event_id TEXT UNIQUE,
    event_type TEXT NOT NULL,
    provider_entity_id TEXT,
    payload_hash TEXT,
    processed_at TIMESTAMPTZ,
    processing_status TEXT NOT NULL DEFAULT 'received',
    error_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Seed default platform commission in public.system_settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
    'platform_commission', 
    '{"percentage": 10, "bps": 1000}'::jsonb, 
    'Platform commission fee configuration for online consultations (10%)'
)
ON CONFLICT (setting_key) DO NOTHING;

-- 5. Indexes for fast lookup and reconciliation
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON public.payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_doctor_id ON public.payments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order_id ON public.payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON public.payments(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE INDEX IF NOT EXISTS idx_transfers_appointment_id ON public.payment_transfers(appointment_id);
CREATE INDEX IF NOT EXISTS idx_transfers_doctor_id ON public.payment_transfers(doctor_id);
CREATE INDEX IF NOT EXISTS idx_transfers_transfer_status ON public.payment_transfers(transfer_status);
CREATE INDEX IF NOT EXISTS idx_transfers_settlement_status ON public.payment_transfers(settlement_status);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_id ON public.payment_webhook_events(provider_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON public.payment_webhook_events(event_type);

-- 6. Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop previous policies to enable idempotent migration
DROP POLICY IF EXISTS "Patients and admins view payments." ON public.payments;
DROP POLICY IF EXISTS "Involved parties and admins view payments." ON public.payments;
DROP POLICY IF EXISTS "Doctors and admins view payment transfers." ON public.payment_transfers;
DROP POLICY IF EXISTS "Admins view payment webhook events." ON public.payment_webhook_events;

-- Policy: Patients, Doctors, and Admins can view relevant payments
CREATE POLICY "Involved parties and admins view payments." ON public.payments
FOR SELECT
USING (
  public.is_admin() OR
  patient_id IN (
    SELECT p.id FROM public.patients p 
    JOIN public.profiles pr ON p.profile_id = pr.id 
    WHERE pr.auth_id = auth.uid()
  ) OR
  doctor_id IN (
    SELECT d.id FROM public.doctors d 
    JOIN public.profiles pr ON d.profile_id = pr.id 
    WHERE pr.auth_id = auth.uid()
  ) OR
  appointment_id IN (
    SELECT a.id FROM public.appointments a
    WHERE a.doctor_id IN (
      SELECT d.id FROM public.doctors d 
      JOIN public.profiles pr ON d.profile_id = pr.id 
      WHERE pr.auth_id = auth.uid()
    )
  )
);

-- Policy: Doctors can view only their own transfers; Admins can view all
CREATE POLICY "Doctors and admins view payment transfers." ON public.payment_transfers
FOR SELECT
USING (
  public.is_admin() OR
  doctor_id IN (
    SELECT d.id FROM public.doctors d 
    JOIN public.profiles pr ON d.profile_id = pr.id 
    WHERE pr.auth_id = auth.uid()
  )
);

-- Policy: Webhook events viewable only by Admins
CREATE POLICY "Admins view payment webhook events." ON public.payment_webhook_events
FOR SELECT
USING (public.is_admin());
