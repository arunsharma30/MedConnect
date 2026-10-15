import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';

// Helper to compute HMAC-SHA256 in Web Crypto
async function computeHmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();

    // 1. Authenticate user from Bearer JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid user session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request body
    const body = await req.json();
    const {
      appointment_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (!appointment_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing required payment verification fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Fetch appointment and verify user ownership
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_number,
        doctor_id,
        patient_id,
        status,
        payment_status,
        patients (
          id,
          profiles ( id, auth_id, first_name, last_name )
        ),
        doctors (
          id,
          consultation_fee,
          profiles ( id, auth_id, first_name, last_name )
        )
      `)
      .eq('id', appointment_id)
      .single();

    if (aptError || !appointment) {
      return new Response(JSON.stringify({ error: 'Appointment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const patientAuthId = appointment.patients?.profiles?.auth_id;
    if (patientAuthId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden: You do not own this appointment' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Verify payment record matches the expected order ID
    const { data: paymentRecord, error: payError } = await supabase
      .from('payments')
      .select('id, amount, amount_paise, status, gateway_order_id')
      .eq('appointment_id', appointment.id)
      .eq('gateway_order_id', razorpay_order_id)
      .maybeSingle();

    if (payError || !paymentRecord) {
      return new Response(JSON.stringify({ error: 'No matching payment order found for this appointment' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Server-side HMAC-SHA256 signature verification
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || '';
    if (!razorpayKeySecret) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration: missing Razorpay secret' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = await computeHmacSha256(razorpayKeySecret, payload);

    if (expectedSignature.toLowerCase() !== razorpay_signature.toLowerCase()) {
      console.error('Signature mismatch for order:', razorpay_order_id);
      return new Response(JSON.stringify({ error: 'Invalid payment signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nowIso = new Date().toISOString();
    const grossAmountPaise = paymentRecord.amount_paise || Math.round(Number(paymentRecord.amount) * 100);

    // 6. Idempotently update payment record
    const { error: updatePayError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        gateway_payment_id: razorpay_payment_id,
        gateway_signature_verified: true,
        paid_at: nowIso,
        payment_method: 'razorpay',
        updated_at: nowIso,
      })
      .eq('id', paymentRecord.id);

    if (updatePayError) {
      console.error('Error updating payment record:', updatePayError);
      return new Response(JSON.stringify({ error: 'Failed to record payment verification' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 7. Update appointment payment status
    await supabase
      .from('appointments')
      .update({
        payment_status: 'completed',
        updated_at: nowIso,
      })
      .eq('id', appointment.id);

    // 8. Calculate platform commission and doctor share
    // Fetch platform commission rate from system_settings or default to 10%
    let commissionPercentage = 10;
    const { data: settingData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'platform_commission')
      .maybeSingle();

    if (settingData?.setting_value?.percentage) {
      commissionPercentage = Number(settingData.setting_value.percentage);
    }

    const platformCommissionPaise = Math.round((grossAmountPaise * commissionPercentage) / 100);
    const doctorAmountPaise = grossAmountPaise - platformCommissionPaise;

    // 9. Create or update payment_transfers record (doctor payout held until completion)
    const { data: existingTransfer } = await supabase
      .from('payment_transfers')
      .select('id, transfer_status, settlement_status')
      .eq('payment_id', paymentRecord.id)
      .maybeSingle();

    if (!existingTransfer) {
      await supabase.from('payment_transfers').insert({
        payment_id: paymentRecord.id,
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id,
        gross_amount_paise: grossAmountPaise,
        platform_commission_paise: platformCommissionPaise,
        doctor_amount_paise: doctorAmountPaise,
        currency: 'INR',
        transfer_status: 'pending',
        settlement_status: 'on_hold',
        on_hold: true,
        is_simulated: true, // Marked as simulated payout for college demo / test mode
      });
    }

    // 10. Audit / Notification records
    try {
      const doctorProfile = appointment.doctors?.profiles;
      const patientProfile = appointment.patients?.profiles;

      // Notification for Doctor
      if (doctorProfile?.id) {
        await supabase.from('notifications').insert({
          user_id: doctorProfile.id,
          title: 'Consultation Fee Paid',
          message: `Patient ${patientProfile?.first_name || ''} has paid ₹${(grossAmountPaise / 100).toFixed(2)} for appointment #${appointment.appointment_number}. Payout (₹${(doctorAmountPaise / 100).toFixed(2)}) is held until consultation is marked completed.`,
          type: 'payment',
        });
      }

      // Notification for Patient
      if (patientProfile?.id) {
        await supabase.from('notifications').insert({
          user_id: patientProfile.id,
          title: 'Payment Successful',
          message: `Your payment of ₹${(grossAmountPaise / 100).toFixed(2)} for appointment #${appointment.appointment_number} with Dr. ${doctorProfile?.first_name || ''} was successful.`,
          type: 'payment',
        });
      }
    } catch (notifErr) {
      console.warn('Non-fatal error creating notifications:', notifErr);
    }

    return new Response(JSON.stringify({
      verified: true,
      payment_id: paymentRecord.id,
      appointment_id: appointment.id,
      amount_paise: grossAmountPaise,
      doctor_amount_paise: doctorAmountPaise,
      status: 'completed',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error in verify-payment:', err);
    return new Response(JSON.stringify({ error: 'Internal server error while verifying payment' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
