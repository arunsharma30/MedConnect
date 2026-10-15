# Razorpay Guideline
## Complete Step-by-Step Payment Gateway Integration Guide for MedConnect

**Purpose:** This document is the implementation specification for integrating Razorpay into the existing MedConnect project. A patient pays online, MedConnect retains its configured platform commission, and the doctor's share is released only after the consultation is confirmed completed.

**Project context**
- Frontend: React + Vite
- Backend services: Supabase Auth, PostgreSQL, Edge Functions, Realtime, and Row Level Security (RLS)
- Currency: INR
- Current stage: college project/demo using Razorpay test mode
- Preferred product: Razorpay Route, subject to account eligibility and approval
- Payout rule: do not release the doctor's payout before a trusted server-side process confirms consultation completion

> This is a technical implementation guide, not proof that Razorpay Route is enabled or that any code has already been implemented. Inspect the current repository and Supabase migrations first. Reuse existing tables, routes, components, and conventions. Do not create duplicate schema or replace working features.

---

## 1. Required end-to-end behaviour

1. A patient signs in to MedConnect.
2. The patient opens an eligible appointment and sees the amount in INR.
3. The frontend asks a protected Supabase Edge Function to create a payment order.
4. The Edge Function authenticates the patient, verifies appointment ownership and eligibility, calculates the amount from trusted database data, and creates a Razorpay order using server-side credentials.
5. The frontend opens Razorpay Checkout using the public Key ID and returned order ID.
6. The Checkout response is sent to a server-side verification function. The frontend callback alone must never mark an appointment as paid.
7. Razorpay webhooks independently confirm payment events. The webhook handler verifies the signature against the **raw request body** before trusting the event.
8. A verified successful payment updates the local payment record idempotently.
9. The doctor's share is calculated according to the configured commission policy. If Route is enabled and the chosen flow supports settlement holds, create/record the linked-account transfer with settlement on hold.
10. When the appointment is genuinely completed, a protected server-side operation verifies the appointment state and releases the held settlement according to the supported Route API.
11. Webhook events and provider status reconciliation update local records. The UI shows actual recorded state, not assumed success.
12. Cancellation, refund, duplicate events, failed payments, failed transfers, and incomplete consultations are handled without duplicate charges or payouts.

**Keep these concepts separate:**
- **Payment:** Did the patient successfully pay?
- **Transfer:** Was the doctor's share allocated/transferred to the linked account?
- **Settlement:** Has Razorpay settled the transferred amount according to the linked account's settlement schedule?
- **Consultation completion:** Has MedConnect's trusted workflow marked the appointment completed?

A successful patient payment does not automatically mean the doctor has received a bank settlement.

---

## 2. Before coding: inspect the current project

### 2.1 Inspect the repository

From the project root, inspect:
- `package.json` and lockfile to identify the actual React/Vite setup and package manager.
- Existing Supabase client setup and environment-variable naming.
- Patient appointment details and booking pages.
- Doctor appointment and consultation-completion workflow.
- Existing payment, billing, payout, or checkout components.
- Existing Supabase Edge Functions.
- `supabase/migrations/` and schema documentation.
- RLS policies for profiles, appointments, doctors, and payments.
- Existing role checks and route guards.
- Notification and audit-log patterns.
- Git status and uncommitted changes.

### 2.2 Inspect the database before designing changes

MedConnect has previously been planned around tables such as `profiles`, `patients`, `doctors`, `appointments`, `payments`, `notifications`, and `audit_logs`. Treat this as a starting point only: verify the actual deployed schema and migrations.

Determine:
- How the authenticated Supabase user maps to a patient, doctor, and profile.
- Which table stores appointment status, patient ID, doctor ID, and consultation fee.
- Whether `payments` already stores provider IDs and payment states.
- Whether a doctor profile has a Razorpay Route linked-account ID.
- How consultations are marked completed and who is allowed to do so.
- Whether refund, cancellation, and audit workflows already exist.
- Which RLS policies apply.

Do not assume column names. Do not use fake records to make the payment screen look functional. Do not drop, rename, or recreate existing tables as a shortcut.

### 2.3 Confirm Route eligibility first

In the Razorpay Dashboard, verify:
- The account is eligible for the intended business model.
- Razorpay Route is enabled/approved.
- Linked Accounts can be onboarded in the relevant environment.
- The desired transfer and settlement-hold operations are available for the account and test/live mode.
- The current API documentation supports the exact flow selected.

Route supports marketplace-style transfers to linked accounts and settlement controls, but product access and feature availability can depend on account configuration. If the demo account cannot use Route transfers in test mode, implement a clearly labelled **simulated payout** for the college demo. Never claim a simulated payout is a real bank transfer.

---

## 3. Razorpay setup

### 3.1 Create or access the account

1. Sign in to the Razorpay Dashboard.
2. Use **Test Mode** for development.
3. Locate the API Keys section and generate test credentials.
4. Keep the Key ID and Key Secret private. The Key Secret is server-only.
5. Locate the Route product section and confirm whether it is enabled.
6. Read the current official Route documentation before implementing linked accounts, transfers, holds, releases, or reversals.

Official references:
- Razorpay Route overview: https://razorpay.com/route/
- Route API documentation: https://d6xcmfyh68wv8.cloudfront.net/docs/api/payments/route/
- Route product documentation: https://d6xcmfyh68wv8.cloudfront.net/docs/payments/route/
- Linked Accounts: https://d6xcmfyh68wv8.cloudfront.net/docs/payments/route/linked-account/
- Standard Checkout web integration: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/

### 3.2 Use test credentials

Generate test credentials from the Dashboard. Do not hardcode credentials into source code. The frontend may receive the **Key ID** needed to open Checkout. It must never receive the **Key Secret**.

### 3.3 Configure Supabase Edge Function secrets

Use Supabase's supported Edge Function secret-management mechanism. Suggested names, adapted to existing conventions:

```text
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
RAZORPAY_ROUTE_ENABLED
```

Optional settings, if needed:
```text
MEDCONNECT_PLATFORM_FEE_BPS
PAYMENT_ENVIRONMENT
```

Rules:
- `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` must never be placed in `VITE_*` variables.
- Never commit secrets to Git, README files, screenshots, logs, or database rows.
- Never expose Supabase `service_role` credentials to the browser.
- Edge Functions must validate user authorization and inputs even when using privileged server credentials.
- Keep test and live credentials separate.
- If a secret is exposed, rotate it in the provider dashboard and update the server-side secret store.

Supabase documentation:
- Edge Functions: https://supabase.com/docs/guides/functions
- Edge Function secrets: https://supabase.com/docs/guides/functions/secrets

---

## 4. Architecture and responsibility boundaries

### 4.1 React + Vite frontend

The browser should:
- Show appointment amount and payment state fetched from MedConnect.
- Request an order from a protected Edge Function.
- Open Checkout with the public Key ID and server-created order ID.
- Send Checkout response values to a server-side signature-verification function.
- Show pending, paid, failed, refund, and payout states based on server-confirmed records.
- Avoid collecting or storing card numbers, CVVs, UPI PINs, or other sensitive payment credentials.

The browser must **not**:
- Create Razorpay orders directly using the Key Secret.
- Decide the payable amount.
- Mark a payment paid based only on a callback.
- Authorize or release a doctor payout.
- Use a service-role key or bypass RLS.

### 4.2 Supabase Edge Functions

Use separate functions or clearly separated handlers for these responsibilities, adapting names to the existing project:

1. `create-payment-order`
   - Authenticates the patient.
   - Verifies appointment ownership and eligibility.
   - Calculates the amount server-side.
   - Creates the Razorpay order.
   - Saves a pending payment record and order ID.
   - Returns only data required by Checkout.

2. `verify-payment`
   - Authenticates the patient.
   - Confirms the payment/order belongs to the expected MedConnect payment and appointment.
   - Verifies the Checkout signature server-side using the official algorithm and credentials.
   - Never accepts a client-supplied `status: paid` as proof.
   - Records verified identifiers idempotently.
   - Reconciles confirmed payment state with provider/webhook information.

3. `razorpay-webhook`
   - Accepts Razorpay's server-to-server event.
   - Reads the raw body before JSON parsing.
   - Verifies `X-Razorpay-Signature` using the configured webhook secret and documented procedure.
   - Rejects invalid signatures.
   - Processes only supported events.
   - Handles duplicate deliveries idempotently.

4. `release-doctor-payout`
   - Is protected; it must not be a public unauthenticated payout endpoint.
   - Checks the caller's role or a trusted internal invocation mechanism.
   - Re-reads appointment, payment, and transfer from the database.
   - Requires verified payment and a valid completed appointment.
   - Checks for an existing transfer/release to prevent duplicate payouts.
   - Uses the linked-account ID from trusted database data.
   - Releases the hold or performs the supported transfer operation only after checks pass.
   - Stores provider response and audit information.
   - If Route is unavailable, records a simulated payout with an explicit simulation marker.

5. Optional `request-refund`
   - Verifies caller permission and refund eligibility.
   - Prevents duplicate refund requests.
   - Calls Razorpay from the server.
   - Tracks refund and transfer-reversal status separately.
   - Does not assume a refund and a transfer reversal are the same operation.

Do not create every function blindly if equivalent secure functions already exist. Reuse or extend the current implementation.

---

## 5. Payment lifecycle and status model

Use the project's existing enums/status naming if already established. Otherwise, define a clear state model through a migration.

Example payment states:
- `pending`: local payment attempt/order exists; payment not confirmed.
- `authorized`: payment authorized but not yet confirmed as captured/paid, if used by the chosen flow.
- `paid`: verified successful payment according to confirmed provider status.
- `failed`: confirmed failure or explicitly handled failure state.
- `refund_pending`: refund requested, awaiting provider confirmation.
- `partially_refunded`: part of the payment refunded.
- `refunded`: full refund confirmed.
- `cancelled` or `expired`: local attempt is no longer usable, if supported by the workflow.

Example transfer/payout states:
- `not_eligible`: appointment is not completed or payment is not confirmed.
- `pending`: eligible but transfer/release not completed.
- `on_hold`: provider transfer exists and settlement is held.
- `processing`: release/settlement is in progress.
- `settled`: provider confirms settlement.
- `failed`: transfer or settlement failed.
- `reversed`: provider confirms reversal.
- `simulated`: demo-only state with no real money movement.

Do not overload one `status` column to mean payment, transfer, refund, and appointment status. These are different lifecycles.

### 5.1 Example lifecycle

```text
Appointment booked
        |
        v
Create pending payment + Razorpay order
        |
        v
Patient completes Checkout
        |
        v
Signature verification + webhook verification
        |
        v
Payment confirmed as paid
        |
        v
Route transfer recorded with settlement on hold
        |
        v
Appointment completed by authorized workflow
        |
        v
Server validates completion and payment again
        |
        v
Release settlement hold (or use approved transfer flow)
        |
        v
Webhook/reconciliation confirms final settlement
```

If payment fails, the appointment must not be shown as paid. If the consultation is cancelled or not completed, the doctor payout must not be released automatically.

---

## 6. Database design and migrations

### 6.1 Reuse the existing `payments` table

Inspect the current table first. Add only missing fields in a new migration; do not replace the table.

Potential fields, adapted to actual naming:
- `id` — primary key.
- `appointment_id` — foreign key to appointment.
- `patient_id` — patient/profile reference.
- `doctor_id` — doctor/profile reference.
- `amount_paise` — integer/bigint in the smallest currency unit.
- `currency` — `INR`.
- `status` — payment lifecycle status.
- `gateway` — e.g. `razorpay`.
- `gateway_order_id` — Razorpay order ID.
- `gateway_payment_id` — Razorpay payment ID, when available.
- `gateway_signature_verified` — boolean or equivalent verified metadata.
- `paid_at` — timestamp when verified paid.
- `created_at`, `updated_at`.
- Optional `idempotency_key` or unique payment-attempt reference.

Add suitable unique constraints, especially for provider IDs and payment attempts. Avoid a constraint that prevents legitimate retries; decide whether multiple attempts per appointment are allowed.

**Money rule:** Store amounts as integer paise, never floating-point currency values. ₹1,000.00 = `100000` paise.

### 6.2 Add a transfer table only if needed

If no equivalent table exists, create a table such as `payment_transfers` to track doctor shares separately.

Potential fields:
- `id`
- `payment_id` (foreign key)
- `appointment_id`
- `doctor_id`
- `linked_account_id` (provider account identifier; restrict access)
- `gross_amount_paise`
- `platform_commission_paise`
- `doctor_amount_paise`
- `currency`
- `gateway_transfer_id`
- `transfer_status`
- `settlement_status`
- `on_hold`
- `released_at`
- `settled_at`
- `reversed_at`
- `is_simulated`
- `last_error_code` or safe error summary
- `created_at`, `updated_at`

Add uniqueness/idempotency protection so one payment cannot accidentally create multiple transfers for the same payout obligation.

### 6.3 Add webhook event tracking

If no equivalent event log exists, create `payment_webhook_events` or an equivalent durable event ledger.

Potential fields:
- `id`
- `provider_event_id` if available
- `event_type`
- `provider_entity_id`
- `payload_hash` or carefully controlled payload storage
- `processed_at`
- `processing_status`
- `error_summary`
- `created_at`

Use a unique constraint on a stable provider event identifier where supported. If the provider does not supply one in the chosen payload, define a robust deduplication key from documented fields. Do not store unnecessary personal or payment data in webhook logs.

### 6.4 Doctor linked-account mapping

Store the provider linked-account ID in the doctor record or a dedicated restricted table, following the existing schema. Do not accept an arbitrary linked-account ID from the browser.

Follow Razorpay's approved onboarding process for linked accounts and KYC. Do not build an unsafe custom bank-details form as a substitute.

### 6.5 Migration safety

1. Inspect current migrations and deployed schema.
2. Create a new forward migration with only necessary additions.
3. Add indexes and constraints.
4. Backfill only where there is a safe deterministic mapping.
5. Update RLS policies in a sequenced migration.
6. Test against a development Supabase project.
7. Confirm existing appointments, payments, dashboards, and login still work.
8. Never reset or drop production data to make a migration pass.

---

## 7. Commission and amount calculation

The platform fee policy must be explicit and server-controlled. Do not hardcode a business percentage in multiple frontend components.

Illustrative example only:
- Patient pays: ₹1,000.00 = 100000 paise.
- Platform commission at 10%: ₹100.00 = 10000 paise.
- Doctor share before applicable gateway fees/taxes/refunds: ₹900.00 = 90000 paise.

This example is not the project's final commission policy.

Implementation rules:
1. Read the consultation fee from trusted database data.
2. Confirm it belongs to the doctor/appointment being paid for.
3. Convert to integer paise using a defined rounding policy.
4. Read the commission policy from trusted server-side configuration/database.
5. Calculate platform and doctor shares server-side.
6. Validate amounts are non-negative and shares do not exceed the payable amount.
7. Save the calculation snapshot to payment/transfer records so later policy changes do not rewrite historical transactions.
8. Account for provider fees, applicable taxes, refunds, reversals, and contractual requirements separately.
9. Show the final amount before Checkout and show the doctor actual payout state/amount after confirmation.

---

## 8. Create the payment order securely

### 8.1 Frontend request

The patient page should call the Edge Function with the appointment ID and minimal required data. Do not accept an authoritative amount from the browser.

### 8.2 Edge Function checks

Before creating an order:
1. Verify the Supabase access token.
2. Get the authenticated user ID from the verified token.
3. Load the patient profile with the correct authorization context.
4. Fetch the appointment by ID.
5. Confirm the appointment belongs to this patient.
6. Confirm it is in a payable state and is not cancelled or otherwise ineligible under current policy.
7. Confirm there is not already a successful payment for the appointment.
8. Load the trusted consultation fee and currency.
9. Calculate the amount in paise.
10. Create a pending local payment attempt or reuse an eligible pending attempt according to the idempotency policy.
11. Create the Razorpay order from the server using the documented API and server-side credentials.
12. Save the returned Razorpay order ID and amount locally.
13. Return only the order ID, amount, currency, public Key ID, and safe display information.

Never log the secret or return it in JSON.

### 8.3 Order metadata

Where supported, include a non-sensitive MedConnect payment/appointment reference in Razorpay notes/receipt. Do not include diagnoses, medical reports, sensitive health information, or unnecessary patient data.

### 8.4 Failure handling

- If order creation fails, keep a safe error record and return a generic actionable error.
- Do not mark the payment paid.
- If Razorpay creates an order but the database write fails, retain safe reconciliation context; do not blindly create repeated orders.
- Make retries idempotent or otherwise prevent duplicate payable orders/charges.

---

## 9. Integrate Razorpay Checkout in React

Use the official Checkout web integration guidance and an approach compatible with the current project. Do not change the whole frontend framework.

### 9.1 UI states

The payment component should support:
- Loading appointment/amount
- Ready to pay
- Creating order
- Checkout open
- Verifying payment
- Payment confirmed
- Payment pending confirmation
- Payment failed
- Payment cancelled/closed
- Refund pending/refunded, where applicable

Disable the pay button while a request is in progress. Prevent double-clicks from creating multiple attempts.

### 9.2 Checkout sequence

1. Request a payment order from the Edge Function.
2. Validate the response.
3. Open Razorpay Checkout with the public Key ID, server-created order ID, amount, currency, and appropriate display details.
4. Keep Checkout callback handling minimal.
5. Send the returned payment identifiers/signature to the verification Edge Function.
6. Refresh the payment record from Supabase after verification.
7. Display success only after the server confirms the payment state.
8. If verification is pending, explain that confirmation is in progress and refresh safely or use Realtime.
9. If the Checkout modal closes, do not automatically mark payment failed; the payment may still be processing.
10. Provide a retry path that checks existing payment state before creating a new attempt.

### 9.3 UI consistency

Use existing MedConnect components and design system. Current palette:
- Primary: `#635BFF`
- Secondary: `#8B5CF6`
- Accent: `#F472B6`
- Background: `#F7F8FC`

Keep the checkout accessible, responsive, and consistent with the patient appointment page.

---

## 10. Verify the Checkout signature

The server must verify the signature according to Razorpay's current official documentation.

1. Accept the order ID, payment ID, signature, and MedConnect payment reference from the client.
2. Authenticate the request and confirm the user owns the associated payment/appointment.
3. Load the expected Razorpay order ID from the database; do not trust a client-supplied order ID alone.
4. Use the official server-side signature-verification procedure and Key Secret.
5. Compare signatures safely and handle malformed inputs.
6. Store verified provider IDs and verification outcome.
7. Never log the Key Secret or sensitive payment details.
8. Do not mark payment paid solely because the browser reports success.
9. Reconcile provider status/webhook events before irreversible business decisions.

Use the current official Checkout documentation for the exact signing input and algorithm. Do not improvise the signature string or use a browser-only verification example on the backend.

---

## 11. Webhook setup and verification

Webhooks matter because a user may close the browser, lose connectivity, or return before payment state is reconciled.

### 11.1 Configure the webhook

1. Deploy the webhook Edge Function to the development Supabase project.
2. Copy its HTTPS endpoint into Razorpay Dashboard webhook settings.
3. Configure a strong webhook secret in the Dashboard and set the same secret as a Supabase Edge Function secret.
4. Subscribe only to events required by the chosen payment/Route flow. Verify exact event names in current Razorpay docs; do not assume names from old tutorials.
5. Test webhook delivery and inspect response codes in the Dashboard.
6. Configure production webhooks separately from test webhooks.

### 11.2 Verify before trusting

1. Read the raw request body exactly as received.
2. Read the documented signature header.
3. Verify the signature with the webhook secret using Razorpay's documented procedure.
4. Reject invalid signatures and do not update payment/transfer state.
5. Only after verification, parse the body and validate its structure.
6. Record the event in the event ledger and process idempotently.
7. Return success for valid duplicate events already processed.
8. Persist the event and use a safe retryable processing strategy if the platform's execution limits make lengthy processing unreliable.

### 11.3 Event processing rules

For each supported event:
- Identify the provider entity and local payment/transfer record.
- Verify IDs and amounts match the expected transaction.
- Apply only permitted state transitions.
- Do not downgrade a confirmed paid payment because a delayed event arrives out of order.
- Do not process the same successful event twice.
- Log failures safely and make them retryable.
- Cross-check metadata against local database/provider IDs.

### 11.4 Reconciliation

Provide an admin/developer process to compare local states with Razorpay Dashboard/API records. If a webhook was missed, retrieve provider state server-side and update local records only after verification.

---

## 12. Doctor payouts with Razorpay Route

**Critical rule:** Do not release a doctor's payout until the consultation is confirmed completed.

### 12.1 Onboard linked accounts

1. Confirm Route is enabled.
2. Follow Razorpay's official Linked Account onboarding procedure.
3. Save the returned linked-account ID in a protected server-side mapping to the correct doctor.
4. Confirm the linked account's state and eligibility before transfers.
5. Never allow the frontend to submit a linked-account ID to choose the recipient.
6. Do not invent linked-account IDs for real transfers.
7. For the college demo, use provider-supported test setup if available. Otherwise use a clearly labelled simulated payout.

### 12.2 Select the transfer strategy

Confirm from the current account's Route documentation which approach is supported:
- Create a transfer associated with the captured payment and hold its settlement; release the hold after consultation completion.
- Create the transfer only after consultation completion, if that better matches the approved product flow.

Do not treat “transfer created,” “settlement released,” and “bank payout completed” as synonyms. Verify current API status names and webhook events.

### 12.3 Create a held transfer

After payment is confirmed:
1. Load payment and appointment server-side.
2. Confirm the payment is paid and the doctor share is calculated.
3. Confirm the doctor's linked account is verified/eligible.
4. Check whether a transfer already exists.
5. Create the transfer using the correct documented provider endpoint and parameters.
6. If supported, put settlement on hold using the documented field.
7. Store returned transfer ID, amount, recipient, transfer status, settlement status, and hold status.
8. Do not display “doctor paid” while settlement remains on hold.
9. Reconcile provider responses and events.

### 12.4 Confirm consultation completion

The doctor dashboard must not release payout by simply sending `{ "completed": true }` from the browser.

1. An authorized doctor completes the consultation through the existing protected workflow.
2. Server-side logic verifies the doctor is assigned to the appointment and the state transition is valid.
3. Apply existing MedConnect completion rules, if any.
4. Record completion timestamp and actor.
5. Prevent unauthorized users from completing another doctor's appointment.
6. Trigger the payout eligibility check after completion has been committed.

Do not invent clinical requirements or block completion on features the current project does not implement.

### 12.5 Release the payout

The protected server-side release operation must:
1. Authenticate/authorize the internal caller or permitted admin workflow.
2. Re-fetch appointment, payment, and transfer.
3. Confirm payment remains verified as paid.
4. Confirm appointment is completed and not cancelled/refunded/disputed under current policy.
5. Confirm the transfer belongs to the correct doctor/payment, is held, and is not already released/settled.
6. Confirm the recipient and share match the saved calculation.
7. Call the documented Route operation to release the hold or execute the approved transfer strategy.
8. Save provider response and status.
9. Write an audit-log entry.
10. Wait for provider confirmation/webhook/reconciliation before showing final settlement as complete.

If a provider request times out, do not blindly retry an operation that may have succeeded. Query/reconcile provider state first.

### 12.6 Payout failures

- Keep the payment record intact.
- Mark transfer status only when provider state supports that conclusion.
- Store a safe error summary.
- Notify the appropriate admin/doctor without exposing secrets.
- Provide a retry/reconciliation operation with idempotency controls.
- Do not automatically redirect funds to a different account.
- Do not silently switch to simulated payout in a live environment.

---

## 13. RLS and authorization

Test RLS with real patient, doctor, and admin sessions.

### Patients
- Can read their own appointments and relevant payment records.
- Can request payment only for their own eligible appointment.
- Cannot change amount, provider order ID, paid status, payout status, or transfer recipient.
- Cannot read another patient's payment or medical data.

### Doctors
- Can read relevant appointments and their own payout summaries.
- Can update only fields authorized by the existing workflow.
- Cannot mark provider payments as paid or release transfers directly from the client.
- Cannot view another doctor's linked-account mapping or private provider configuration.

### Admins
- Admin capabilities must be enforced server-side and through RLS/secure function checks, not by hiding buttons alone.
- Use existing MedConnect role management and audit requirements.

### Privileged credentials
- Never include Supabase `service_role` in frontend code or `VITE_*` variables.
- Avoid privileged credentials where a user-scoped query is sufficient.
- Every privileged Edge Function must validate inputs and authorization explicitly.

### Storage and logs
- Do not put payment secrets, full bank details, or unnecessary medical information in logs.
- Restrict access to webhook payloads, provider IDs, linked-account mappings, and audit events.
- Do not store card data; let Checkout handle payment credentials.

---

## 14. Refunds, cancellations, and disputes

Design these flows before calling the integration complete.

### 14.1 Appointment cancellation before payment
- If no successful payment exists, allow cancellation according to the current appointment policy.
- For a pending order, mark the local attempt appropriately and recheck provider status before retrying.
- Do not assume closing Checkout means the order is unpaid.

### 14.2 Cancellation after payment but before consultation
- Apply MedConnect's refund policy.
- Initiate refunds server-side only.
- Track refund request and provider confirmation separately.
- If a transfer exists, check Route's documented refund/transfer-reversal behaviour and reverse funds where supported.
- Do not release payout for a cancelled appointment.

### 14.3 Refund after transfer/settlement
- Follow current Route refund and transfer-reversal rules.
- A refund may require a transfer reversal or sufficient balance; do not assume settled funds can always be reversed automatically.
- Track customer refund and transfer reversal separately.
- Escalate unsupported cases to an admin workflow.

### 14.4 Disputes/chargebacks
- Track supported provider dispute events.
- Flag affected payments and pause unreleased payouts when policy/provider rules permit.
- Keep an audit trail.
- Never delete payment history.

### 14.5 Policy
Cancellation windows, refund percentages, commission treatment, and dispute policy are business decisions. Use an existing MedConnect policy if available. Otherwise document and approve the policy rather than inventing it in code.

---

## 15. Security checklist

- [ ] Razorpay Key Secret exists only in Supabase Edge Function secrets.
- [ ] Webhook secret exists only server-side.
- [ ] Supabase service-role key is never bundled into Vite output.
- [ ] No secret is committed to Git or printed in logs.
- [ ] Order amount is calculated on the server from trusted data.
- [ ] Patient ownership of appointment/payment is checked.
- [ ] Checkout signature is verified server-side.
- [ ] Webhook signature is verified from the raw body.
- [ ] Duplicate webhooks cannot double-update or double-pay.
- [ ] Duplicate payment attempts cannot cause unnoticed duplicate charges.
- [ ] Doctor linked-account ID comes from trusted server-side data.
- [ ] Payout release is protected and checks appointment completion.
- [ ] Provider status is reconciled before irreversible transitions.
- [ ] Refunds and transfer reversals have separate states.
- [ ] RLS prevents cross-patient/cross-doctor access.
- [ ] Logs exclude secrets and unnecessary medical/payment details.
- [ ] UI does not claim settlement when it is pending or on hold.
- [ ] Simulated payouts are visibly and persistently labelled simulated.

---

## 16. Testing plan

Use test mode and test data only. Follow Razorpay's current testing documentation for supported test payment methods.

### 16.1 Happy path
1. Sign in as a patient.
2. Open an appointment assigned to a test doctor record.
3. Start payment.
4. Confirm an order is created server-side and saved locally.
5. Complete the supported test checkout.
6. Verify the signature server-side.
7. Confirm webhook delivery and payment state.
8. Confirm the transfer is recorded and held, if Route test mode supports it.
9. Complete the appointment through the authorized doctor workflow.
10. Trigger protected payout release.
11. Confirm transfer/settlement state from provider responses and webhooks.
12. Confirm patient and doctor dashboards show consistent state.

### 16.2 Failure and edge cases

| Test | Expected result |
|---|---|
| Unauthenticated order request | Rejected |
| Patient pays for another patient's appointment | Rejected |
| Appointment cancelled | Order creation blocked by policy |
| Client tampers with amount | Server uses trusted fee |
| Invalid Checkout signature | Payment is not marked paid |
| Invalid webhook signature | Event rejected; no state mutation |
| Duplicate successful webhook | No duplicate payment or payout |
| Webhook arrives before browser callback | Local state converges to verified provider state |
| Browser closes after payment | Webhook/reconciliation updates record |
| Checkout modal closes | No false paid/failed state without confirmation |
| Double-click pay | No duplicate charge beyond defined attempt policy |
| Doctor releases before completion | Rejected |
| Patient attempts payout release | Rejected |
| Wrong doctor completes appointment | Rejected |
| Payout release repeated | No duplicate transfer/release |
| Route transfer creation fails | Payment stays paid; payout tracked as pending/failed |
| Release request times out | Reconcile provider before retry |
| Appointment cancelled after payment | Refund policy applied; payout not released |
| Refund request repeated | No duplicate refund |
| RLS: patient A reads patient B payment | Denied |
| RLS: doctor A reads doctor B payout | Denied |
| Missing secrets | Safe server error; no secret leak |
| Route unavailable in test mode | Payout shown as simulated, never real |

### 16.3 Regression tests

Verify integration does not break:
- Login, registration, and role-based routing.
- Appointment booking and cancellation.
- Patient and doctor dashboards.
- Consultation/video-call routes.
- Medical records and prescriptions.
- Notifications.
- Profile editing and RLS.
- Responsive layout.
- Existing build, lint, and test commands.

### 16.4 Test evidence

Record:
- Commands run and actual results.
- Edge Functions deployed and their actual names.
- Migration name and whether it was applied.
- Safe Razorpay test order/payment/transfer IDs.
- Webhook test outcomes.
- Screenshots of UI states if useful.
- Any untested step or account limitation.

Never claim a test passed unless it was actually run.

---

## 17. Suggested implementation order

### Phase 1 — Discovery and design
- Inspect repository, database, payment code, appointment state flow, and Git status.
- Report the actual schema and smallest safe changes.
- Confirm Route availability and transfer strategy.
- Do not modify code until the discovery report is complete.

### Phase 2 — Database and security
- Add only missing payment/transfer/webhook fields and tables.
- Add indexes, uniqueness constraints, and RLS policies.
- Verify patient, doctor, and admin access separately.

### Phase 3 — Server-side order creation
- Implement/extend the order-creation Edge Function.
- Validate authentication, appointment ownership, amount, state, and idempotency.
- Test with test credentials.

### Phase 4 — Checkout UI
- Add Checkout to the existing patient appointment/payment UI.
- Add loading, success, pending, error, and retry states.
- Preserve existing design and routes.

### Phase 5 — Signature verification and webhook
- Implement signature verification.
- Configure the webhook endpoint.
- Add event deduplication and safe retries.
- Test browser-callback and webhook event order permutations.

### Phase 6 — Route transfer and delayed payout
- Add/verify linked-account mapping and eligibility.
- Create held transfer only after verified payment.
- Implement server-side completion checks and release.
- If Route testing is unavailable, implement an explicit demo-only simulated payout and keep the production path disabled.

### Phase 7 — Refunds and reconciliation
- Implement cancellation/refund state handling.
- Add transfer reversal where supported.
- Add a safe reconciliation/admin view or documented manual reconciliation process.

### Phase 8 — Regression and documentation
- Run existing build/lint/tests.
- Test patient, doctor, and admin roles.
- Verify no secrets in Git history or frontend build.
- Update README/configuration instructions without exposing secrets.
- Report actual work, test results, migration/deployment status, and limitations.

---

## 18. Environment configuration examples

Follow the project's existing environment-file conventions. Frontend variables may include public values only:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The Supabase anon/publishable key is designed for frontend use with correctly configured RLS. Never put the service-role key in frontend code.

Configure server-side Edge Function secrets through Supabase secret management, for example:
```text
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
```

`RAZORPAY_KEY_ID` can be returned to the browser when Checkout requires it; the secret cannot. Do not use placeholder values in production. Follow current Supabase CLI/Dashboard instructions for setting secrets and deploying functions.

---

## 19. Operational and production-readiness requirements

Although the current goal is a college demo, keep the security boundaries correct.

Before live payments:
- Complete provider business/account verification and product approval.
- Confirm Route and linked-account eligibility.
- Confirm the approved use case and applicable marketplace requirements.
- Configure production keys and webhooks separately from test mode.
- Define refund, cancellation, commission, payout, dispute, and support policies.
- Validate tax/accounting implications with an appropriate professional.
- Review applicable privacy, data-protection, payment, and healthcare requirements.
- Add monitoring and reconciliation for missed webhooks and failed transfers.
- Add alerts for repeated failures and inconsistent states.
- Restrict admin access and audit sensitive actions.
- Confirm the live release path with controlled testing where permitted.

Do not collect or store raw card data. A payment gateway does not automatically make the whole application compliant or secure.

---

## 20. Completion criteria

The demo implementation is complete only when all applicable items have been verified:

- [ ] Existing project architecture preserved.
- [ ] Existing database schema inspected and extended without destructive recreation.
- [ ] Patient can initiate payment for their own eligible appointment.
- [ ] Order is created by a protected server-side function.
- [ ] Amount is calculated server-side in integer paise.
- [ ] Checkout uses public Key ID and server-created order ID.
- [ ] Signature verification is server-side.
- [ ] Webhook verification uses the raw request body.
- [ ] Payment updates are idempotent and reconciled.
- [ ] RLS prevents unauthorized appointment/payment access.
- [ ] Payout cannot be released before a trusted completion check.
- [ ] Route transfer/settlement states are separate from payment state.
- [ ] Refund/cancellation/failure handling is documented and tested to the supported extent.
- [ ] If real Route test transfers are unavailable, simulated payout is clearly labelled.
- [ ] Appointment, video consultation, dashboard, records, and authentication pass regression checks.
- [ ] Actual commands, test results, deployment status, and limitations are documented.

---

## 21. Official references

Use current official documentation as the authority for provider-specific API details and account availability:

1. Razorpay Route: https://razorpay.com/route/
2. Razorpay Route API reference: https://d6xcmfyh68wv8.cloudfront.net/docs/api/payments/route/
3. Razorpay Route product documentation: https://d6xcmfyh68wv8.cloudfront.net/docs/payments/route/
4. Razorpay Linked Accounts: https://d6xcmfyh68wv8.cloudfront.net/docs/payments/route/linked-account/
5. Razorpay Checkout web integration: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
6. Supabase Edge Functions: https://supabase.com/docs/guides/functions
7. Supabase Edge Function secrets: https://supabase.com/docs/guides/functions/secrets

Provider APIs, dashboards, product eligibility, event names, and test-mode support can change. Verify the latest official documentation before implementing provider-specific requests or relying on particular events/statuses.

---

## 22. Final instruction for the Antigravity coding agent

Use this file as the integration specification. First inspect the current MedConnect repository and Supabase schema. Report the actual implementation plan and any missing account prerequisites. Then implement the smallest safe set of changes in phases. Preserve working features, routes, components, database data, and styling. Do not invent table columns or claim Route is enabled without verification. Do not expose secrets, bypass RLS, mark payment successful from a frontend callback, or release a doctor's payout before a trusted completion check. Run available tests and report only results actually verified.
