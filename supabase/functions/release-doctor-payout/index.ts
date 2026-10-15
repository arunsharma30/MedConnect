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

    // 3. Fetch appointment and verify completion & authorization
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_number,
        status,
        payment_status,
        doctor_id,
        doctors (
          id,
          profile_id,
          profiles ( id, auth_id, first_name, last_name, role )
        ),
        patients (
          id,
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

    // Check caller role (Doctor assigned to this appointment OR Admin)
    const doctorAuthId = appointment.doctors?.profiles?.auth_id;
    const isDoctor = doctorAuthId === user.id;

    // Check if user is an admin
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_id', user.id)
      .maybeSingle();

    const isAdmin = callerProfile?.role === 'admin';

    if (!isDoctor && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only the assigned doctor or an administrator can release payout' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Verify consultation completion rule: Cannot release payout before consultation is marked completed!
    if (appointment.status !== 'completed') {
      return new Response(JSON.stringify({
        error: 'Payout hold rule violation: Consultation must be confirmed completed before payout release',
        appointment_status: appointment.status,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (appointment.payment_status !== 'completed') {
      return new Response(JSON.stringify({
        error: 'Cannot release payout: Patient payment has not been completed',
        payment_status: appointment.payment_status,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Fetch payment_transfers row
    const { data: transfer, error: transferError } = await supabase
      .from('payment_transfers')
      .select('*')
      .eq('appointment_id', appointment.id)
      .maybeSingle();

    if (transferError || !transfer) {
      return new Response(JSON.stringify({ error: 'No payment transfer record found for this appointment' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotent: If already released, return existing record
    if (!transfer.on_hold && transfer.settlement_status === 'released') {
      return new Response(JSON.stringify({
        message: 'Payout has already been released',
        transfer_id: transfer.id,
        doctor_amount_paise: transfer.doctor_amount_paise,
        released_at: transfer.released_at,
        is_simulated: transfer.is_simulated,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nowIso = new Date().toISOString();

    // 6. Release the hold
    const { data: updatedTransfer, error: updateError } = await supabase
      .from('payment_transfers')
      .update({
        on_hold: false,
        settlement_status: 'released',
        transfer_status: 'completed',
        released_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', transfer.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error releasing transfer hold:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to release payout in database' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 7. Notify Doctor
    try {
      const doctorProfileId = appointment.doctors?.profiles?.id;
      if (doctorProfileId) {
        await supabase.from('notifications').insert({
          user_id: doctorProfileId,
          title: 'Consultation Payout Released',
          message: `Consultation #${appointment.appointment_number} completed. Your payout of ₹${(updatedTransfer.doctor_amount_paise / 100).toFixed(2)} has been released to your billing balance.`,
          type: 'payout',
        });
      }
    } catch (notifErr) {
      console.warn('Non-fatal notification error:', notifErr);
    }

    return new Response(JSON.stringify({
      success: true,
      released: true,
      transfer_id: updatedTransfer.id,
      doctor_amount_paise: updatedTransfer.doctor_amount_paise,
      released_at: updatedTransfer.released_at,
      settlement_status: updatedTransfer.settlement_status,
      is_simulated: updatedTransfer.is_simulated,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error in release-doctor-payout:', err);
    return new Response(JSON.stringify({ error: 'Internal server error while releasing doctor payout' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
