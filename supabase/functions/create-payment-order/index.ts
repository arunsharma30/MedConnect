import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';

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
    const { appointment_id } = await req.json();
    if (!appointment_id) {
      return new Response(JSON.stringify({ error: 'appointment_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Retrieve appointment and verify ownership
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_number,
        appointment_date,
        status,
        payment_status,
        patient_id,
        doctor_id,
        patients (
          id,
          profile_id,
          profiles ( id, auth_id, first_name, last_name, email, phone )
        ),
        doctors (
          id,
          consultation_fee,
          profiles ( id, first_name, last_name )
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

    // Verify caller is the assigned patient or admin
    const patientAuthId = appointment.patients?.profiles?.auth_id;
    if (patientAuthId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden: You are not authorized to pay for this appointment' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify appointment eligibility
    if (appointment.status === 'cancelled') {
      return new Response(JSON.stringify({ error: 'Cannot pay for a cancelled appointment' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (appointment.payment_status === 'completed') {
      return new Response(JSON.stringify({ error: 'This appointment has already been paid for' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Calculate amount in integer paise from trusted database data
    const feeInRupees = Number(appointment.doctors?.consultation_fee || 0);
    if (feeInRupees <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid consultation fee configured for doctor' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountPaise = Math.round(feeInRupees * 100);

    // 5. Check if an active pending Razorpay order already exists for this appointment
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, gateway_order_id, amount_paise, status')
      .eq('appointment_id', appointment.id)
      .eq('status', 'pending')
      .not('gateway_order_id', 'is', null)
      .maybeSingle();

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') || '';
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration: Razorpay credentials missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let orderId = existingPayment?.gateway_order_id;

    // 6. If no active order exists, create one via Razorpay Orders API
    if (!orderId) {
      const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const orderPayload = {
        amount: amountPaise,
        currency: 'INR',
        receipt: `rcpt_${appointment.appointment_number}`,
        notes: {
          appointment_id: appointment.id,
          appointment_number: appointment.appointment_number,
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
        },
      };

      const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!razorpayRes.ok) {
        const errorData = await razorpayRes.text();
        console.error('Razorpay Order API error:', errorData);
        return new Response(JSON.stringify({ error: 'Failed to create payment order with provider' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const orderData = await razorpayRes.json();
      orderId = orderData.id;

      // Upsert local pending payment attempt
      await supabase.from('payments').upsert({
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        amount: feeInRupees,
        amount_paise: amountPaise,
        currency: 'INR',
        gateway: 'razorpay',
        gateway_order_id: orderId,
        status: 'pending',
      }, { onConflict: 'gateway_order_id' });
    }

    const doctorProfile = appointment.doctors?.profiles;
    const doctorName = doctorProfile ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}` : 'Doctor';

    return new Response(JSON.stringify({
      order_id: orderId,
      amount: amountPaise,
      currency: 'INR',
      key_id: razorpayKeyId,
      doctor_name: doctorName,
      consultation_fee: feeInRupees,
      appointment_number: appointment.appointment_number,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error in create-payment-order:', err);
    return new Response(JSON.stringify({ error: 'Internal server error while processing order' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
