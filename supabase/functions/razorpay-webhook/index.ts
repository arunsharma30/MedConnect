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
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';
    if (!webhookSecret) {
      console.error('Missing RAZORPAY_WEBHOOK_SECRET in environment');
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Read raw body as text for cryptographic signature check
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing x-razorpay-signature header' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Cryptographic signature verification against raw body
    const expectedSignature = await computeHmacSha256(webhookSecret, rawBody);
    if (expectedSignature.toLowerCase() !== signature.toLowerCase()) {
      console.error('Webhook signature verification failed');
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Parse JSON safely only after signature verification
    const eventPayload = JSON.parse(rawBody);
    const eventType = eventPayload.event;
    const providerEventId = eventPayload.event_id || req.headers.get('x-razorpay-event-id') || `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const supabase = getSupabaseAdmin();

    // 4. Idempotency check in payment_webhook_events
    const { data: existingEvent } = await supabase
      .from('payment_webhook_events')
      .select('id, processing_status')
      .eq('provider_event_id', providerEventId)
      .maybeSingle();

    if (existingEvent && existingEvent.processing_status === 'processed') {
      return new Response(JSON.stringify({ status: 'duplicate_ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const providerEntityId = eventPayload.payload?.payment?.entity?.id ||
                             eventPayload.payload?.order?.entity?.id ||
                             eventPayload.payload?.transfer?.entity?.id || null;

    // Record event as received
    if (!existingEvent) {
      await supabase.from('payment_webhook_events').insert({
        provider_event_id: providerEventId,
        event_type: eventType,
        provider_entity_id: providerEntityId,
        processing_status: 'received',
      });
    }

    const nowIso = new Date().toISOString();

    // 5. Handle supported event types
    switch (eventType) {
      case 'payment.captured':
      case 'order.paid': {
        const paymentEntity = eventPayload.payload?.payment?.entity;
        const orderId = paymentEntity?.order_id || eventPayload.payload?.order?.entity?.id;
        const paymentId = paymentEntity?.id;

        if (orderId) {
          const { data: paymentRecord } = await supabase
            .from('payments')
            .select('id, appointment_id, doctor_id, amount_paise, amount, status')
            .eq('gateway_order_id', orderId)
            .maybeSingle();

          if (paymentRecord) {
            // Update payment record to completed if not already completed
            if (paymentRecord.status !== 'completed') {
              await supabase
                .from('payments')
                .update({
                  status: 'completed',
                  gateway_payment_id: paymentId || paymentRecord.gateway_payment_id,
                  gateway_signature_verified: true,
                  paid_at: nowIso,
                  payment_method: 'razorpay',
                  updated_at: nowIso,
                })
                .eq('id', paymentRecord.id);

              await supabase
                .from('appointments')
                .update({
                  payment_status: 'completed',
                  updated_at: nowIso,
                })
                .eq('id', paymentRecord.appointment_id);

              // Ensure transfer hold record is created
              const grossAmountPaise = paymentRecord.amount_paise || Math.round(Number(paymentRecord.amount) * 100);
              const platformCommissionPaise = Math.round(grossAmountPaise * 0.10);
              const doctorAmountPaise = grossAmountPaise - platformCommissionPaise;

              const { data: transferExists } = await supabase
                .from('payment_transfers')
                .select('id')
                .eq('payment_id', paymentRecord.id)
                .maybeSingle();

              if (!transferExists) {
                await supabase.from('payment_transfers').insert({
                  payment_id: paymentRecord.id,
                  appointment_id: paymentRecord.appointment_id,
                  doctor_id: paymentRecord.doctor_id,
                  gross_amount_paise: grossAmountPaise,
                  platform_commission_paise: platformCommissionPaise,
                  doctor_amount_paise: doctorAmountPaise,
                  currency: 'INR',
                  transfer_status: 'pending',
                  settlement_status: 'on_hold',
                  on_hold: true,
                  is_simulated: true,
                });
              }
            }
          }
        }
        break;
      }

      case 'payment.failed': {
        const paymentEntity = eventPayload.payload?.payment?.entity;
        const orderId = paymentEntity?.order_id;
        if (orderId) {
          await supabase
            .from('payments')
            .update({
              status: 'failed',
              updated_at: nowIso,
            })
            .eq('gateway_order_id', orderId)
            .neq('status', 'completed'); // Never downgrade an already completed payment
        }
        break;
      }

      case 'transfer.processed': {
        const transferEntity = eventPayload.payload?.transfer?.entity;
        if (transferEntity?.id) {
          await supabase
            .from('payment_transfers')
            .update({
              transfer_status: 'processed',
              updated_at: nowIso,
            })
            .eq('gateway_transfer_id', transferEntity.id);
        }
        break;
      }

      case 'transfer.settled': {
        const transferEntity = eventPayload.payload?.transfer?.entity;
        if (transferEntity?.id) {
          await supabase
            .from('payment_transfers')
            .update({
              settlement_status: 'settled',
              settled_at: nowIso,
              updated_at: nowIso,
            })
            .eq('gateway_transfer_id', transferEntity.id);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
        break;
    }

    // Mark event as processed
    await supabase
      .from('payment_webhook_events')
      .update({
        processing_status: 'processed',
        processed_at: nowIso,
      })
      .eq('provider_event_id', providerEventId);

    return new Response(JSON.stringify({ status: 'ok', event: eventType }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error handling Razorpay webhook:', err);
    return new Response(JSON.stringify({ error: 'Internal server error processing webhook' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
