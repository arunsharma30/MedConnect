# Jiski Meet Guidlines
## Complete AI-Agent Workflow for Integrating Jitsi Meet Video Consultations into MedConnect

> **Purpose:** This document is the implementation playbook for an AI coding agent working inside Antigravity IDE. It explains how to inspect the existing MedConnect project, plan and implement Jitsi Meet video consultations, secure appointment access, preserve existing features, test the result, and report exactly what was changed.
>
> **Project:** MedConnect — Smart Healthcare & Telemedicine Platform  
> **Frontend:** React + Vite  
> **Authentication / database:** Supabase Auth and PostgreSQL  
> **Video conferencing:** Jitsi Meet, initially evaluating the public `meet.jit.si` service  
> **Design palette:** Primary `#635BFF`, Secondary `#8B5CF6`, Accent `#F472B6`, Background `#F7F8FC`

---

## 0. Mandatory Instructions for the AI Agent

Follow this document in order. Do not skip inspection and immediately generate code.

1. **Inspect before editing.** Read the existing source code, route configuration, authentication/role logic, appointment workflow, Supabase client setup, database migrations, and current UI conventions.
2. **Plan before major changes.** First report the findings, assumptions, proposed files, route changes, database impact, security model, and test plan. Do not make large architectural changes before this report.
3. **Preserve the project.** Do not replace React, Vite, Supabase, the router, styling system, or existing authentication. Reuse existing patterns and components.
4. **Use real application data.** Do not create fake patients, doctors, appointments, profiles, medical records, or reviews. Do not hardcode a doctor or patient name.
5. **Do not guess the schema.** Confirm actual table names, columns, relationships, enum values, and RLS policies from the repository and, when available, the connected Supabase project.
6. **Keep changes focused.** Avoid unrelated refactors, dependency upgrades, redesigns, or file deletions.
7. **Protect secrets.** Never place Supabase service-role keys, Jitsi secrets, private keys, or privileged credentials in frontend code, committed files, logs, or client-visible environment variables.
8. **Treat security as a requirement.** A hard-to-guess room name is not access control. Authorization must be checked against the authenticated user and selected appointment.
9. **Be honest about public Jitsi.** A frontend check can protect MedConnect's own page, but it does not necessarily prevent someone who learns the room name from joining directly through the public Jitsi service. Do not describe `meet.jit.si` rooms as securely private unless the chosen deployment and configuration actually enforce participant authentication/access control.
10. **Test what is possible.** Run available lint, type-check, build, migration checks, and tests. For browser, camera, microphone, and two-user tests that cannot be performed by the agent, give explicit manual steps and mark them as not run.
11. **Do not claim success without evidence.** Report actual command results, limitations, and remaining setup tasks.
12. **Use small, reviewable changes.** After inspection, implement in logical stages and review the diff before finishing.

---

## 1. Desired Outcome

Add an in-app video consultation feature so that an authenticated patient and the doctor assigned to the same eligible appointment can enter the same Jitsi meeting from MedConnect.

### Patient experience

1. Patient signs in through the existing Supabase Auth flow.
2. Patient opens the existing appointments area.
3. An eligible appointment displays a **Join Video Consultation** action.
4. Selecting it opens a MedConnect consultation page for that appointment.
5. The application validates the signed-in user and appointment before showing the meeting.
6. The patient joins the appointment's designated Jitsi room.
7. The patient can mute/unmute, turn camera on/off, leave the meeting, and return to the appointment or dashboard.

### Doctor experience

1. Doctor signs in through the existing authentication flow.
2. Doctor opens the existing doctor appointments/consultations area.
3. The eligible appointment displays the same **Join Video Consultation** action.
4. The application validates that the signed-in doctor is assigned to the appointment.
5. The doctor joins the exact same Jitsi room as the assigned patient.
6. The doctor can use meeting controls and return to the dashboard after leaving.

### Administrative and data expectations

- Every consultation must be associated with a real existing appointment.
- One appointment must resolve to a stable room identifier; different appointments must resolve to different identifiers.
- Existing appointment and profile workflows must continue working.
- Access to session metadata must be controlled by Supabase RLS and/or trusted server-side authorization.
- The system must not accidentally mark a consultation complete simply because a single participant closes a tab.
- No recording should be enabled by this task unless there is a separate, explicitly approved requirement and appropriate consent/privacy controls.

---

## 2. Phase One — Inspect the Existing Project

### 2.1 Map the project structure

Inspect the project root and identify:

- `package.json` and package manager/lockfile
- Vite entry point and React application bootstrap
- Route definitions and route guards
- Supabase client initialization
- Authentication/session provider or context
- User role resolution (`patient`, `doctor`, `admin`, or the actual roles used)
- Patient dashboard and appointments pages
- Doctor dashboard and appointments/consultations pages
- Appointment creation, cancellation, rescheduling, and status-update logic
- Existing service/repository/data-access conventions
- UI component library, CSS strategy, responsive layout conventions, and toast/dialog patterns
- Existing tests, lint scripts, and build scripts
- Supabase migrations, generated types, seed files, and RLS policy definitions
- Any existing video call, meeting, conferencing, or `video_sessions` implementation

Do not assume file paths or route names. Discover them from the repository.

### 2.2 Inspect database structure

Inspect existing migrations and database types. If a Supabase connection is available, use read-only inspection where possible before changing anything.

For each relevant table, record actual names and columns:

- Appointment table
- Profile/identity table
- Patient profile table
- Doctor profile table
- Video-session table, if present
- Any role, availability, or consultation-type tables involved in authorization

Determine:

- How `auth.users.id` maps to the application profile
- Whether `appointments.patient_id` and `appointments.doctor_id` reference profile IDs, patient IDs, doctor IDs, or another key
- Actual appointment statuses and enum values
- How appointment date and time are stored, including timezone semantics
- Whether appointment type distinguishes online/video consultations
- Existing unique constraints, foreign keys, indexes, triggers, and RLS policies
- Whether users can read an appointment only when they are assigned to it
- Whether doctors/patients are linked to profile IDs through separate tables

**Do not write queries or policies using assumed IDs or column names.** Adapt to the actual schema.

### 2.3 Produce an inspection report before coding

The agent should report:

1. Current routing/authentication approach
2. Actual appointment data model and relevant relationships
3. Existing video-related code/schema, if any
4. Existing access-control model and gaps
5. Proposed implementation architecture
6. Exact files likely to be added/modified
7. Whether a migration is needed
8. Jitsi public-service security limitations and the chosen development/production plan
9. Test commands available in the project
10. Any blockers that require the project owner to decide

Then proceed with implementation unless a genuinely blocking security or architecture decision requires clarification. Do not stop just to ask questions whose answers can be discovered in the repository.

---

## 3. Phase Two — Choose the Jitsi Integration Method

### 3.1 Prefer the React SDK when compatible

Evaluate the official Jitsi React SDK, commonly distributed as `@jitsi/react-sdk`, against the existing React/Vite version and build setup.

Official reference:
- React SDK guide: <https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-react-sdk/>
- Jitsi handbook: <https://jitsi.github.io/handbook/>

Before installing:

1. Check the current package version and peer dependencies.
2. Check the project's package manager and lockfile.
3. Check whether the package works with the existing Vite/browser targets.
4. Install only the required package(s).
5. Preserve the existing lockfile and avoid upgrading unrelated dependencies.

If the React SDK is incompatible, document the evidence and choose a supported alternative, such as the Jitsi IFrame API, rather than silently changing the app's framework.

### 3.2 Development service versus production service

For a prototype, evaluate `meet.jit.si` subject to its current service requirements and limitations. Do not assume the public service guarantees private rooms or production healthcare compliance.

Keep the Jitsi domain configurable rather than scattering it through components. For example, a public domain may be read from a Vite environment variable such as:

```env
VITE_JITSI_DOMAIN=meet.jit.si
```

This is a public configuration value, not a secret. Confirm that the chosen SDK actually accepts the domain through the expected property before using it.

Do not put secret values in `VITE_*` variables; Vite exposes those values to browser code.

### 3.3 Important public-room security boundary

The application must separate two security concerns:

1. **MedConnect authorization:** whether a user can open the consultation page and obtain the appointment's room details.
2. **Jitsi room authorization:** whether Jitsi itself permits a participant to enter the meeting.

Supabase RLS can enforce the first concern. It does not automatically enforce the second.

A stable appointment-specific room name prevents accidental room collisions, but a public room can still be joined by someone who obtains its name if the Jitsi deployment permits that.

For a local/demo implementation:

- Gate the MedConnect consultation page using Supabase authentication and appointment authorization.
- Do not claim that this alone creates an authenticated Jitsi room.
- Avoid including personal or medical details in room names.
- Clearly document the limitation in the UI/report if applicable.

For production use with real patient information, evaluate an appropriately secured Jitsi deployment and its current authentication/authorization configuration. Verify the chosen configuration end to end before asserting that only authorized participants can join. If strong access control cannot be guaranteed, do not claim production readiness.

---

## 4. Phase Three — Design the Integration Architecture

Keep responsibilities separated:

- **React page:** loads appointment context, handles page-level loading/error states, and provides navigation.
- **Video-call component:** embeds Jitsi and handles meeting lifecycle and events.
- **Appointment authorization service:** retrieves and validates the appointment using the current Supabase session.
- **Session service:** creates or retrieves session metadata, if the existing data model needs it.
- **Supabase database/RLS:** controls access to appointment and session records.
- **Trusted server-side function, if required:** performs privileged checks or operations that must not be trusted to the browser.

Use the project's existing directory conventions. Names below are examples, not mandatory paths:

```text
src/
  components/
    video/
      JitsiMeetingPanel.jsx
      VideoCallControls.jsx        # only if the SDK does not supply adequate controls
  pages/
    consultations/
      VideoConsultationPage.jsx
  services/
    videoConsultationService.js
  hooks/
    useVideoConsultation.js         # optional, only if it matches existing patterns
supabase/
  migrations/
    <timestamp>_video_consultation_changes.sql
```

Use TypeScript extensions only if the project already uses TypeScript. Do not create unnecessary abstraction layers.

### Room naming

Use a deterministic, appointment-specific room identifier. It should be derived from a stable, non-PII appointment identifier, using the project's existing ID format. Normalize it to the character format accepted by the selected Jitsi integration.

Example concept only:

```text
medconnect-consult-<stable-appointment-identifier>
```

Requirements:

- Same appointment always resolves to the same room.
- Different appointments resolve to different rooms.
- Never use patient name, doctor name, email, phone number, diagnosis, or medical record number in the room name.
- Never rely on room-name obscurity as the authorization system.
- Avoid generating a different random room every time a participant reloads, because the doctor and patient could enter different rooms.

If the appointment identifier is sensitive or guessable, remember that obscuring it in a public room name is not a substitute for Jitsi-side access control.

---

## 5. Phase Four — Implement Appointment Authorization

### 5.1 Authentication

Before retrieving or joining a consultation:

1. Obtain the current Supabase Auth session using the project's established client/session approach.
2. If no valid session exists, use the existing protected-route behavior to redirect to login or show an unauthorized state.
3. Do not accept a user ID, role, doctor ID, or patient ID from URL parameters as proof of identity.
4. Derive the current user identity from the authenticated Supabase session.
5. Resolve the user's actual role using the project's existing trusted role model.

### 5.2 Appointment access

Use the existing appointment table and its actual relationships.

The authorization decision must establish all of the following:

- The appointment exists.
- The current authenticated user is the patient assigned to that appointment or the doctor assigned to that appointment.
- The appointment status permits joining.
- The appointment is a video/online consultation if the application distinguishes consultation types.
- The current time falls within the allowed joining window, according to documented project business rules.
- The appointment has not been cancelled or otherwise invalidated.

Do not invent a join window without checking the current application requirements. If no rule exists, propose a reasonable configurable rule and document it.

A frontend query followed by a conditional render is useful for UX, but it is not sufficient as the only security boundary. Use RLS and/or a trusted server-side authorization operation for sensitive actions.

### 5.3 URL tampering

If the route uses an appointment identifier, treat it as an untrusted selector only. On every load, re-authorize the appointment from Supabase. Changing the URL to another appointment must not reveal that appointment's details or permit a valid MedConnect join flow.

Do not return sensitive appointment information in error messages. Prefer a generic “You are not authorized to join this consultation” message where appropriate.

### 5.4 Admin behavior

Follow existing project policy. Do not automatically grant every administrator access to patient video consultations unless the project explicitly defines and authorizes that ability. Administrative access to session metadata is not necessarily permission to join a clinical call.

---

## 6. Phase Five — Database and `video_sessions`

### 6.1 Reuse before creating

Search all migrations and source code for `video_sessions`, video-call session models, or equivalent records.

If a suitable table exists, reuse it and add only necessary fields/constraints through a migration.

If no suitable table exists, decide whether session persistence is genuinely needed for this implementation. If it is, create a migration compatible with the actual schema and naming conventions. Do not create a second table with overlapping responsibility.

Potential metadata fields, adapted to the existing schema, include:

- Primary key
- Foreign key to the appointment
- Patient/doctor identifiers, if not safely derivable through the appointment relationship
- Stable room identifier
- Status
- Session start timestamp
- Session end timestamp
- Creation/update timestamps

Do not duplicate patient and doctor identifiers unnecessarily if they can be reliably derived from the appointment. If duplicated for query performance or historical tracking, enforce consistency and explain the reason.

### 6.2 Constraints and indexes

Consider only those constraints supported by the actual schema and lifecycle:

- Foreign key from session to appointment
- Unique session per appointment, if the business rule is one reusable consultation room/session per appointment
- Check constraint or enum for allowed status values
- Indexes for appointment lookup and relevant participant queries
- Timestamp consistency constraints where appropriate

Do not assume that a single appointment can only ever have one session; inspect whether rescheduled appointments, reconnects, or repeat sessions require different behavior.

### 6.3 Status lifecycle

Define and document a small state model that matches the application, for example:

```text
scheduled -> in_progress -> completed
scheduled -> cancelled
in_progress -> completed
```

The final statuses and transitions must match existing appointment/session conventions.

Do not mark the entire session completed when one participant leaves. A participant can disconnect temporarily while the other remains in the meeting. Do not mark an appointment completed automatically unless the existing business rules explicitly require that behavior.

Treat Jitsi events as client-observed events, not unquestionable proof of the other participant's state. For reliable multi-participant session lifecycle tracking, consider trusted server-side events or a documented reconciliation mechanism.

### 6.4 Row Level Security

Inspect current RLS policies before changing them. Preserve existing policies that are still required.

The resulting policy set must ensure:

- An authenticated patient can read only session metadata for appointments assigned to that patient.
- An authenticated doctor can read only session metadata for appointments assigned to that doctor.
- Session inserts and updates are limited to authorized participants and valid lifecycle transitions.
- Users cannot change the session's appointment relationship, participant identifiers, or other protected fields to take over a different appointment.
- Admin access follows explicit project policy.
- Anonymous access is denied unless there is a separately justified, secure mechanism.

Where policies require joins, use the real foreign keys and actual user/profile mappings. Avoid writing permissive policies such as `USING (true)` for private session data. Avoid trusting user-editable metadata for authorization.

If a trusted Edge Function is used, validate the caller's JWT and authorization inside the function. Keep service-role credentials server-side only and use them only where necessary. Do not expose privileged credentials in React code or browser requests.

### 6.5 Migration discipline

- Make schema changes through a versioned migration consistent with the repository.
- Do not edit a migration that has already been applied in a shared/production environment unless the project owner explicitly confirms that is the correct workflow.
- Do not apply destructive changes automatically.
- Show the migration diff and provide the appropriate application instructions.
- If database access is unavailable, create the migration based on verified repository schema and clearly state that it has not been applied or remotely verified.

---

## 7. Phase Six — Build the React Meeting UI

### 7.1 Consultation page

Create or extend a route using the existing router and protected-route conventions. Example only:

```text
/consultations/:appointmentId/video
```

Use the route format already established by the project if one exists.

The page should:

1. Read the appointment identifier from the route.
2. Check authentication.
3. Load and authorize the appointment.
4. Load/create the corresponding session metadata, if needed.
5. Show a clear loading state while checks are in progress.
6. Render the meeting only after authorization succeeds.
7. Display appointment context using only fields needed for the consultation.
8. Provide a return action to the appropriate existing appointment list/dashboard.
9. Handle errors without exposing sensitive data.

### 7.2 Meeting component

Use the official React SDK if compatible. Verify the current SDK API rather than relying on memory for exact prop/event names.

The meeting component should support, as available in the chosen integration:

- Camera and microphone controls
- Participant display
- Leave/end-meeting action
- Responsive meeting frame
- Loading/ready state
- Meeting join failure
- Permission-denied handling
- Network/disconnection events
- Cleanup on unmount
- Controlled navigation when the user leaves

Prefer the SDK's built-in meeting controls unless a custom UI is needed for consistency. Do not build duplicate controls that conflict with the embedded Jitsi toolbar.

### 7.3 Cleanup

On leaving or unmounting:

- Call the SDK's documented dispose/cleanup mechanism.
- Remove event listeners and subscriptions registered by the component.
- Cancel outstanding requests if supported by the existing data layer.
- Avoid stale state updates after unmount.
- Return the user to the correct MedConnect route.
- Do not automatically end the session for all participants when one participant leaves.
- Avoid adding a global browser-unload handler unless justified; explain any user-experience and browser limitations.

### 7.4 Loading and error states

Handle at least:

- Authentication still initializing
- No authenticated session
- Appointment not found
- Appointment cancelled
- Appointment not eligible yet or joining window expired
- User not assigned to the appointment
- Session metadata unavailable
- Jitsi script/iframe fails to load
- Camera permission denied
- Microphone permission denied
- Camera or microphone missing/in use
- Network disconnect
- User intentionally leaves the call

Error text should be actionable, accessible, and avoid disclosing another user's medical or appointment details.

### 7.5 Responsive and accessible design

- Use the existing CSS/component system.
- Match the palette: `#635BFF`, `#8B5CF6`, `#F472B6`, `#F7F8FC`.
- Ensure the video area works on common desktop and mobile viewport sizes.
- Make primary actions keyboard accessible.
- Provide accessible labels and visible focus states.
- Avoid relying on color alone for status/error meaning.
- Do not redesign unrelated pages.

---

## 8. Phase Seven — Integrate Patient and Doctor Workflows

### Patient appointment UI

Find the existing appointment cards/table/details view and add the join action only when the appointment is eligible.

- Do not show the button for cancelled appointments.
- Do not expose it to another patient's appointment.
- Follow the current appointment status model.
- Use the existing route and UI conventions.
- If the patient has no eligible appointments, retain the existing empty-state experience.

### Doctor appointment UI

Find the existing doctor schedule/appointments/consultations area and add the equivalent action.

- Only the doctor assigned to that appointment can use the MedConnect join flow.
- The room identifier must match the patient's room identifier.
- Preserve all existing doctor appointment actions.
- Do not hardcode doctor identity or appointment data.

### Appointment lifecycle changes

Inspect how booking, rescheduling, cancellation, and completion currently work.

Decide and document what happens to the room/session if an appointment is rescheduled or cancelled. At minimum:

- Cancelled appointments must not be joinable.
- Rescheduled appointments must follow the application's actual appointment identity and room policy.
- A cancelled appointment must not accidentally keep an eligible join button.
- A rescheduled appointment should not reuse a room in a way that mixes unrelated consultations.

---

## 9. Phase Eight — Testing and Verification

Run the tests that the repository actually supports. Do not invent test results.

### 9.1 Static checks

Use existing scripts from `package.json` where available:

- Lint
- Type check
- Unit tests
- Production build

Run a targeted test for appointment authorization and room-name stability if the project has a suitable test framework. Add tests using the existing framework rather than introducing a new testing stack without reason.

### 9.2 Functional test matrix

| Test | Expected result |
|---|---|
| Unauthenticated user opens consultation URL | Redirect or access-denied state; meeting is not rendered |
| Assigned patient opens eligible appointment | Authorized to proceed to the meeting |
| Assigned doctor opens the same appointment | Authorized to proceed to the same room |
| Patient changes URL to another patient's appointment | Denied without leaking private appointment details |
| Doctor changes URL to an appointment assigned to another doctor | Denied |
| Appointment does not exist | Safe not-found/denied state |
| Appointment is cancelled | Join is blocked |
| Appointment is outside the allowed time window | Behavior matches documented business rule |
| Appointment is not a video appointment | Join is blocked if the app distinguishes types |
| Same appointment loaded twice | Stable room identifier |
| Two different appointments | Different room identifiers |
| Camera permission denied | Clear recovery instructions |
| Microphone permission denied | Clear recovery instructions |
| Jitsi service/script fails | Recoverable error and return navigation |
| User leaves meeting | Local meeting instance cleans up; appointment remains intact |
| One participant leaves | Other participant is not automatically marked as finished |
| Existing booking workflow | Continues working |
| Existing patient and doctor dashboards | Continue working |
| RLS tested with different authenticated users | Only authorized rows/operations are permitted |

### 9.3 Manual two-user test

The agent should provide these steps if it cannot perform a real browser test:

1. Use a real test appointment created through the existing application.
2. Open a normal browser session and sign in as the assigned patient.
3. Open a separate browser profile/incognito session and sign in as the assigned doctor.
4. Open the same appointment from each account.
5. Verify that both join the same Jitsi room and can see/hear each other after granting device permissions.
6. Verify mute, camera toggle, and leave behavior.
7. Repeat with an unrelated patient and doctor; both must be blocked by MedConnect authorization.
8. Change the appointment ID in the URL and verify access is denied.
9. Repeat with a cancelled appointment.
10. Record what was actually observed, including any service-specific Jitsi limitations.

**Important:** Passing the MedConnect page-authorization tests does not prove that the public Jitsi room itself rejects unauthorized direct joins. Test that separately or document it as an unresolved limitation.

### 9.4 Security review

Before finishing, inspect the diff for:

- Service-role key or private credentials in client code
- Unsafe RLS policies
- Authorization based only on URL values or local state
- Patient/doctor IDs accepted from untrusted input without validation
- Medical or personal details in room names
- Sensitive data in logs or user-visible error messages
- Missing cleanup of SDK events/subscriptions
- Unintended changes to unrelated files
- Fake data accidentally introduced into production paths

---

## 10. Phase Nine — Final Implementation Report

At the end, return a concise but complete report with the following headings.

### A. Inspection findings
- Relevant routes and components found
- Actual appointment schema/relationships
- Existing video-session implementation, if any
- Existing authentication and role mapping
- Existing RLS/security model

### B. Implementation
- Files created
- Files modified
- Components/services/routes added
- Jitsi integration method and package version
- How the room identifier is generated
- How the patient and doctor share the same room
- How the join action is gated by appointment status/time

### C. Database
- Whether a migration was required
- Exact migration filename
- Tables/columns/constraints/indexes changed
- RLS policies added/modified
- Whether the migration was applied and verified remotely

### D. Configuration
- Environment variables required
- Jitsi domain/service selected
- Any manual setup required
- No secrets should be printed in the report

### E. Verification
For every check, mark one of:
- **PASS** — actually executed and passed
- **FAIL** — executed and failed
- **NOT RUN** — could not be executed
- **NEEDS MANUAL TEST** — requires two accounts, browser interaction, camera, microphone, or external service access

Include the exact command and relevant result for build/lint/tests where useful.

### F. Known limitations and production readiness
Explicitly describe:
- Whether public Jitsi room access is authenticated or effectively public
- What a person who knows the room name can do under the selected deployment
- Whether MedConnect authorization protects only the app route or also the Jitsi room itself
- Any missing TURN/Jitsi deployment/access-control setup
- Privacy, consent, recording, and healthcare-data considerations
- Remaining work required before real patient use

### G. Manual test instructions
Give a clear, ordered test plan using separate patient and doctor accounts.

Do not claim that production-ready security has been achieved unless the Jitsi deployment itself and MedConnect authorization have both been verified.

---

## 11. Definition of Done

The task is complete only when all applicable items below are satisfied:

- [ ] Existing project and schema were inspected before editing.
- [ ] Implementation plan was reported.
- [ ] Correct Jitsi integration method was selected based on compatibility.
- [ ] Patient and doctor workflows are integrated into existing appointment screens.
- [ ] Both participants resolve to the same stable appointment-specific room.
- [ ] Every consultation request is authorized against the current Supabase user and real appointment.
- [ ] Relevant RLS policies enforce least-privilege access.
- [ ] No privileged secret is exposed to the browser.
- [ ] Session metadata is stored only if necessary and follows existing schema conventions.
- [ ] Loading, error, permission-denied, leave, and cleanup states are handled.
- [ ] Existing appointment/authentication/dashboard features remain intact.
- [ ] Available static checks and builds have been run.
- [ ] Manual tests are completed or explicitly listed as not run.
- [ ] Public Jitsi room-security limitations are documented accurately.
- [ ] Final report distinguishes verified facts from assumptions and pending work.

---

## 12. Official References

Use the current official documentation to confirm package APIs and deployment behavior. Do not rely on outdated examples without checking compatibility.

- Jitsi Meet React SDK: <https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-react-sdk/>
- Jitsi handbook: <https://jitsi.github.io/handbook/>
- Supabase Auth: <https://supabase.com/docs/guides/auth>
- Supabase Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase Edge Functions: <https://supabase.com/docs/guides/functions>
- Vite environment variables: <https://vite.dev/guide/env-and-mode>

---

## Final Instruction to the Antigravity Agent

Work on the existing MedConnect repository, not a new demo. Inspect first, report your plan, then implement the smallest complete and secure integration that fits the actual codebase. Reuse the existing schema and UI wherever possible. Validate every authorization decision against real authenticated identity and appointment data. Do not invent schema details, fake data, test results, or security guarantees. If a requirement cannot be fully satisfied with public Jitsi, explain the exact limitation and provide a realistic next step instead of claiming that the feature is secure or production-ready.
