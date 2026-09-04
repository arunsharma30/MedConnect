# MedConnect --- Complete Database Schema

## Purpose

Master database-design document for the MedConnect Smart Healthcare &
Telemedicine Platform.

**Implementation target:** Supabase / PostgreSQL

**Core schema:** 21 tables

------------------------------------------------------------------------

# 1. Complete Table List

  ---------------------------------------------------------------------------
                            \# Table                   Purpose
  ---------------------------- ----------------------- ----------------------
                             1 `profiles`              Common
                                                       application-level user
                                                       information

                             2 `patients`              Patient-specific
                                                       information

                             3 `doctors`               Doctor professional
                                                       information

                             4 `admins`                Administrator
                                                       information

                             5 `specializations`       Medical specialty
                                                       master data

                             6 `hospitals`             Hospital/clinic
                                                       information

                             7 `doctor_hospital`       Doctor-to-hospital
                                                       relationship

                             8 `doctor_availability`   Doctor
                                                       working/appointment
                                                       availability

                             9 `appointments`          Patient-doctor
                                                       appointment management

                            10 `video_sessions`        Online consultation
                                                       session information

                            11 `medical_records`       Patient medical
                                                       history/consultation
                                                       records

                            12 `prescriptions`         Digital prescriptions

                            13 `prescription_items`    Individual medicines
                                                       within prescriptions

                            14 `medicines`             Medicine master data

                            15 `payments`              Appointment/payment
                                                       transactions

                            16 `notifications`         User notifications

                            17 `reviews`               Patient reviews and
                                                       doctor ratings

                            18 `messages`              Patient-doctor
                                                       messaging

                            19 `report_files`          Uploaded medical
                                                       reports/documents

                            20 `audit_logs`            System/security
                                                       activity tracking

                            21 `system_settings`       System-wide
                                                       configuration
  ---------------------------------------------------------------------------

------------------------------------------------------------------------

# 2. Database Architecture

``` text
Supabase Auth
     |
     v
profiles
     |
     +-------------------+-------------------+
     |                   |                   |
     v                   v                   v
 patients             doctors              admins
                         |
             +-----------+-----------+
             |           |           |
             v           v           v
      specializations hospitals doctor_availability
                         |
                         v
                  doctor_hospital

patients + doctors + hospitals
             |
             v
       appointments
          /   |   \
         /    |    \
        v     v     v
   payments  video  medical_records
                    |
                    +------------------+
                    |                  |
                    v                  v
             report_files       prescriptions
                                      |
                                      v
                              prescription_items
                                      |
                                      v
                                  medicines

profiles -----------------> notifications
profiles -----------------> messages
patients + doctors -------> reviews

profiles -----------------> audit_logs

system_settings
```

------------------------------------------------------------------------

# 3. Detailed Schema

## 3.1 `profiles`

**Purpose:** Central application-level profile table for all users.
Supabase Auth handles authentication credentials; this table stores
application profile information.

  ------------------------------------------------------------------------
  Column            Type              Key / Constraint   Description
  ----------------- ----------------- ------------------ -----------------
  `id`              UUID              Primary Key        Unique profile
                                                         identifier

  `auth_id`         UUID              Foreign Key -\>    Supabase Auth
                                      `auth.users.id`,   user identifier
                                      Unique             

  `role`            ENUM/TEXT         Required           `patient`,
                                                         `doctor`, `admin`

  `first_name`      TEXT                                 First name

  `last_name`       TEXT                                 Last name

  `email`           TEXT                                 Email

  `phone`           TEXT                                 Phone number

  `gender`          TEXT                                 Gender

  `dob`             DATE                                 Date of birth

  `profile_image`   TEXT                                 Profile image
                                                         URL/path

  `address`         TEXT                                 Address

  `city`            TEXT                                 City

  `state`           TEXT                                 State

  `country`         TEXT                                 Country

  `pincode`         TEXT                                 Postal/PIN code

  `is_active`       BOOLEAN                              Whether account
                                                         is active

  `created_at`      TIMESTAMP                            Creation
                                                         timestamp

  `updated_at`      TIMESTAMP                            Last update
                                                         timestamp
  ------------------------------------------------------------------------

**Relationships**

``` text
auth.users 1 ---- 1 profiles
profiles 1 ---- 1 patients
profiles 1 ---- 1 doctors
profiles 1 ---- 1 admins
```

------------------------------------------------------------------------

## 3.2 `patients`

**Purpose:** Stores healthcare-specific patient information.

  ----------------------------------------------------------------------------
  Column                 Type              Key / Constraint  Description
  ---------------------- ----------------- ----------------- -----------------
  `id`                   UUID              Primary Key       Unique patient
                                                             identifier

  `profile_id`           UUID              Foreign Key -\>   Associated
                                           `profiles.id`     profile

  `blood_group`          TEXT                                Blood group

  `height`               DECIMAL                             Height

  `weight`               DECIMAL                             Weight

  `allergies`            TEXT                                Known allergies

  `emergency_contact`    TEXT                                Emergency contact

  `insurance_number`     TEXT                                Insurance number

  `insurance_provider`   TEXT                                Insurance
                                                             provider

  `created_at`           TIMESTAMP                           Creation
                                                             timestamp
  ----------------------------------------------------------------------------

**Relationship:** `profiles 1 ---- 1 patients`

------------------------------------------------------------------------

## 3.3 `doctors`

**Purpose:** Stores professional and healthcare-provider information.

  ----------------------------------------------------------------------------------
  Column                  Type              Key / Constraint       Description
  ----------------------- ----------------- ---------------------- -----------------
  `id`                    UUID              Primary Key            Unique doctor
                                                                   identifier

  `profile_id`            UUID              Foreign Key -\>        Associated
                                            `profiles.id`          profile

  `specialization_id`     UUID              Foreign Key -\>        Doctor
                                            `specializations.id`   specialization

  `hospital_id`           UUID              Foreign Key -\>        Primary/default
                                            `hospitals.id`         hospital

  `experience`            TEXT                                     Professional
                                                                   experience
                                                                   information

  `qualification`         TEXT                                     Medical
                                                                   qualification

  `license_number`        TEXT                                     Medical license
                                                                   number

  `consultation_fee`      DECIMAL                                  Consultation fee

  `bio`                   TEXT                                     Doctor biography

  `languages`             TEXT/ARRAY                               Languages spoken

  `rating`                DECIMAL                                  Doctor rating

  `total_reviews`         INTEGER                                  Number of reviews

  `verification_status`   TEXT/ENUM                                Doctor
                                                                   verification
                                                                   status

  `years_experience`      INTEGER                                  Number of years
                                                                   of experience

  `created_at`            TIMESTAMP                                Creation
                                                                   timestamp
  ----------------------------------------------------------------------------------

**Relationships**

``` text
profiles 1 ---- 1 doctors
specializations 1 ---- N doctors
hospitals 1 ---- N doctors (primary/default relationship)
```

`doctor_hospital` separately supports multiple hospital associations.

------------------------------------------------------------------------

## 3.4 `admins`

**Purpose:** Stores administrator-specific information and permissions.

  -----------------------------------------------------------------------
  Column            Type              Key / Constraint  Description
  ----------------- ----------------- ----------------- -----------------
  `id`              UUID              Primary Key       Unique admin
                                                        identifier

  `profile_id`      UUID              Foreign Key -\>   Associated
                                      `profiles.id`     profile

  `designation`     TEXT                                Admin designation

  `permissions`     JSONB                               Admin permission
                                                        configuration

  `created_at`      TIMESTAMP                           Creation
                                                        timestamp
  -----------------------------------------------------------------------

**Relationship:** `profiles 1 ---- 1 admins`

------------------------------------------------------------------------

## 3.5 `specializations`

**Purpose:** Master data for medical specialties used by doctors and
doctor search/filtering.

  Column          Type   Key / Constraint   Description
  --------------- ------ ------------------ --------------------------
  `id`            UUID   Primary Key        Unique specialization ID
  `name`          TEXT                      Specialization name
  `description`   TEXT                      Description
  `icon`          TEXT                      Icon/image reference

**Examples:** Cardiology, Dermatology, Neurology, Orthopedics,
Pediatrics, Psychiatry, Dentistry, General Medicine.

**Relationship:** `specializations 1 ---- N doctors`

------------------------------------------------------------------------

## 3.6 `hospitals`

**Purpose:** Stores hospital and clinic information.

  Column         Type        Key / Constraint   Description
  -------------- ----------- ------------------ ------------------------
  `id`           UUID        Primary Key        Unique hospital ID
  `name`         TEXT                           Hospital/clinic name
  `address`      TEXT                           Address
  `city`         TEXT                           City
  `state`        TEXT                           State
  `country`      TEXT                           Country
  `phone`        TEXT                           Hospital phone
  `email`        TEXT                           Hospital email
  `latitude`     DECIMAL                        Geographic latitude
  `longitude`    DECIMAL                        Geographic longitude
  `logo`         TEXT                           Hospital logo URL/path
  `created_at`   TIMESTAMP                      Creation timestamp

**Relationships**

``` text
hospitals 1 ---- N doctors
hospitals N ---- N doctors through doctor_hospital
hospitals 1 ---- N appointments
```

------------------------------------------------------------------------

## 3.7 `doctor_hospital`

**Purpose:** Junction table for the many-to-many relationship between
doctors and hospitals.

  Column          Type        Key / Constraint                 Description
  --------------- ----------- -------------------------------- ---------------------
  `doctor_id`     UUID        Foreign Key -\> `doctors.id`     Doctor
  `hospital_id`   UUID        Foreign Key -\> `hospitals.id`   Hospital
  `department`    TEXT                                         Hospital department
  `joined_at`     TIMESTAMP                                    Joining date/time

**Recommended uniqueness:** `UNIQUE(doctor_id, hospital_id)`

**Relationship:** `doctors N ---- N hospitals through doctor_hospital`

------------------------------------------------------------------------

## 3.8 `doctor_availability`

**Purpose:** Stores recurring doctor availability and appointment slot
configuration.

  Column            Type        Key / Constraint               Description
  ----------------- ----------- ------------------------------ ----------------------------
  `id`              UUID        Primary Key                    Unique availability record
  `doctor_id`       UUID        Foreign Key -\> `doctors.id`   Doctor
  `day`             TEXT/ENUM                                  Day of week
  `start_time`      TIME                                       Start time
  `end_time`        TIME                                       End time
  `slot_duration`   INTEGER                                    Slot duration
  `is_available`    BOOLEAN                                    Availability status

**Relationship:** `doctors 1 ---- N doctor_availability`

------------------------------------------------------------------------

## 3.9 `appointments`

**Purpose:** Core appointment table connecting patients, doctors and
hospitals.

  -----------------------------------------------------------------------------------------
  Column                 Type              Key / Constraint      Description
  ---------------------- ----------------- --------------------- --------------------------
  `id`                   UUID              Primary Key           Unique appointment ID

  `appointment_number`   TEXT              Unique                Human-readable appointment
                                                                 number

  `patient_id`           UUID              Foreign Key -\>       Patient
                                           `patients.id`         

  `doctor_id`            UUID              Foreign Key -\>       Doctor
                                           `doctors.id`          

  `hospital_id`          UUID              Foreign Key -\>       Hospital/clinic
                                           `hospitals.id`        

  `appointment_date`     DATE                                    Appointment date

  `start_time`           TIME                                    Start time

  `end_time`             TIME                                    End time

  `mode`                 TEXT/ENUM                               `online` or `offline`

  `status`               TEXT/ENUM                               Appointment status

  `reason`               TEXT                                    Appointment reason

  `symptoms`             TEXT                                    Patient-provided symptoms

  `payment_status`       TEXT/ENUM                               Payment status

  `video_session_id`     UUID              Foreign Key -\>       Online session
                                           `video_sessions.id`   

  `notes`                TEXT                                    Appointment/consultation
                                                                 notes

  `created_at`           TIMESTAMP                               Creation timestamp

  `updated_at`           TIMESTAMP                               Last update timestamp
  -----------------------------------------------------------------------------------------

**Suggested status values:**

``` text
pending
confirmed
completed
cancelled
rescheduled
no_show
```

**Suggested mode values:**

``` text
online
offline
```

**Relationships**

``` text
patients 1 ---- N appointments
doctors 1 ---- N appointments
hospitals 1 ---- N appointments
appointments 1 ---- N payments
appointments 1 ---- 1 video_sessions
appointments 1 ---- N medical_records
appointments 1 ---- N prescriptions
appointments 1 ---- N reviews
appointments 1 ---- N messages
```

------------------------------------------------------------------------

## 3.10 `video_sessions`

**Purpose:** Stores metadata for online video consultations. Actual
real-time audio/video media is handled by WebRTC or the selected video
service, not PostgreSQL.

  ----------------------------------------------------------------------------
  Column               Type              Key / Constraint    Description
  -------------------- ----------------- ------------------- -----------------
  `id`                 UUID              Primary Key         Unique video
                                                             session ID

  `appointment_id`     UUID              Foreign Key -\>     Associated
                                         `appointments.id`   appointment

  `meeting_url`        TEXT                                  Meeting/session
                                                             URL

  `meeting_id`         TEXT                                  Meeting
                                                             identifier

  `meeting_password`   TEXT                                  Meeting password
                                                             if applicable

  `started_at`         TIMESTAMP                             Session start

  `ended_at`           TIMESTAMP                             Session end

  `recording_url`      TEXT                                  Recording
                                                             reference

  `status`             TEXT/ENUM                             Video session
                                                             status
  ----------------------------------------------------------------------------

**Relationship:** `appointments 1 ---- 1 video_sessions`

------------------------------------------------------------------------

## 3.11 `medical_records`

**Purpose:** Stores patient medical history and consultation records.

  --------------------------------------------------------------------------
  Column             Type              Key / Constraint    Description
  ------------------ ----------------- ------------------- -----------------
  `id`               UUID              Primary Key         Unique medical
                                                           record ID

  `patient_id`       UUID              Foreign Key -\>     Patient
                                       `patients.id`       

  `doctor_id`        UUID              Foreign Key -\>     Doctor
                                       `doctors.id`        

  `appointment_id`   UUID              Foreign Key -\>     Related
                                       `appointments.id`   appointment

  `diagnosis`        TEXT                                  Diagnosis

  `blood_pressure`   TEXT                                  Blood pressure

  `temperature`      DECIMAL                               Temperature

  `weight`           DECIMAL                               Weight

  `heart_rate`       INTEGER                               Heart rate

  `remarks`          TEXT                                  Medical remarks

  `created_at`       TIMESTAMP                             Creation
                                                           timestamp
  --------------------------------------------------------------------------

**Relationships**

``` text
patients 1 ---- N medical_records
doctors 1 ---- N medical_records
appointments 1 ---- N medical_records
medical_records 1 ---- N report_files
```

------------------------------------------------------------------------

## 3.12 `prescriptions`

**Purpose:** Stores digital prescriptions issued by doctors.

  --------------------------------------------------------------------------
  Column             Type              Key / Constraint    Description
  ------------------ ----------------- ------------------- -----------------
  `id`               UUID              Primary Key         Unique
                                                           prescription ID

  `appointment_id`   UUID              Foreign Key -\>     Related
                                       `appointments.id`   appointment

  `patient_id`       UUID              Foreign Key -\>     Patient
                                       `patients.id`       

  `doctor_id`        UUID              Foreign Key -\>     Doctor
                                       `doctors.id`        

  `diagnosis`        TEXT                                  Diagnosis

  `instructions`     TEXT                                  Prescription
                                                           instructions

  `next_visit`       DATE                                  Recommended next
                                                           visit

  `pdf_url`          TEXT                                  Prescription PDF
                                                           URL/path

  `created_at`       TIMESTAMP                             Creation
                                                           timestamp
  --------------------------------------------------------------------------

**Relationships**

``` text
appointments 1 ---- N prescriptions
patients 1 ---- N prescriptions
doctors 1 ---- N prescriptions
prescriptions 1 ---- N prescription_items
```

------------------------------------------------------------------------

## 3.13 `prescription_items`

**Purpose:** Stores individual medicines within a prescription.

  ----------------------------------------------------------------------------
  Column              Type              Key / Constraint     Description
  ------------------- ----------------- -------------------- -----------------
  `id`                UUID              Primary Key          Unique item ID

  `prescription_id`   UUID              Foreign Key -\>      Prescription
                                        `prescriptions.id`   

  `medicine_id`       UUID              Foreign Key -\>      Medicine
                                        `medicines.id`       

  `dosage`            TEXT                                   Dosage

  `frequency`         TEXT                                   Frequency

  `duration`          TEXT                                   Duration

  `quantity`          INTEGER                                Quantity
  ----------------------------------------------------------------------------

**Relationships**

``` text
prescriptions 1 ---- N prescription_items
medicines 1 ---- N prescription_items
```

------------------------------------------------------------------------

## 3.14 `medicines`

**Purpose:** Master medicine data.

  Column           Type   Key / Constraint   Description
  ---------------- ------ ------------------ ----------------------
  `id`             UUID   Primary Key        Unique medicine ID
  `name`           TEXT                      Medicine name
  `manufacturer`   TEXT                      Manufacturer
  `type`           TEXT                      Medicine type
  `description`    TEXT                      Medicine description

**Relationship:** `medicines 1 ---- N prescription_items`

------------------------------------------------------------------------

## 3.15 `payments`

**Purpose:** Stores appointment payment and transaction information.

  --------------------------------------------------------------------------
  Column             Type              Key / Constraint    Description
  ------------------ ----------------- ------------------- -----------------
  `id`               UUID              Primary Key         Unique payment ID

  `appointment_id`   UUID              Foreign Key -\>     Related
                                       `appointments.id`   appointment

  `patient_id`       UUID              Foreign Key -\>     Paying patient
                                       `patients.id`       

  `amount`           DECIMAL                               Payment amount

  `currency`         TEXT                                  Currency code

  `payment_method`   TEXT                                  Payment method

  `gateway`          TEXT                                  Payment gateway

  `transaction_id`   TEXT              Unique              Gateway
                                                           transaction ID

  `status`           TEXT/ENUM                             Payment status

  `invoice_url`      TEXT                                  Invoice URL/path

  `paid_at`          TIMESTAMP                             Successful
                                                           payment timestamp
  --------------------------------------------------------------------------

**Relationships**

``` text
appointments 1 ---- N payments
patients 1 ---- N payments
```

------------------------------------------------------------------------

## 3.16 `notifications`

**Purpose:** Stores notifications for users.

  Column         Type        Key / Constraint                Description
  -------------- ----------- ------------------------------- ------------------------
  `id`           UUID        Primary Key                     Unique notification ID
  `user_id`      UUID        Foreign Key -\> `profiles.id`   Recipient
  `title`        TEXT                                        Notification title
  `message`      TEXT                                        Notification content
  `type`         TEXT/ENUM                                   Notification type
  `is_read`      BOOLEAN                                     Read/unread status
  `created_at`   TIMESTAMP                                   Creation timestamp

**Examples:**

``` text
Appointment booked
Appointment confirmed
Appointment cancelled
Appointment reminder
Payment successful
Prescription generated
Doctor joined consultation
New message
```

**Relationship:** `profiles 1 ---- N notifications`

------------------------------------------------------------------------

## 3.17 `reviews`

**Purpose:** Stores patient reviews and doctor ratings.

  --------------------------------------------------------------------------
  Column             Type              Key / Constraint    Description
  ------------------ ----------------- ------------------- -----------------
  `id`               UUID              Primary Key         Unique review ID

  `patient_id`       UUID              Foreign Key -\>     Reviewing patient
                                       `patients.id`       

  `doctor_id`        UUID              Foreign Key -\>     Reviewed doctor
                                       `doctors.id`        

  `appointment_id`   UUID              Foreign Key -\>     Related
                                       `appointments.id`   appointment

  `rating`           INTEGER                               Rating

  `review`           TEXT                                  Written review

  `created_at`       TIMESTAMP                             Creation
                                                           timestamp
  --------------------------------------------------------------------------

**Relationships**

``` text
patients 1 ---- N reviews
doctors 1 ---- N reviews
appointments 1 ---- N reviews
```

**Business rule:** Reviews should normally be allowed only for completed
appointments and duplicate reviews for the same appointment should be
prevented.

------------------------------------------------------------------------

## 3.18 `messages`

**Purpose:** Stores patient-doctor chat messages.

  --------------------------------------------------------------------------
  Column             Type              Key / Constraint    Description
  ------------------ ----------------- ------------------- -----------------
  `id`               UUID              Primary Key         Unique message ID

  `sender_id`        UUID              Foreign Key -\>     Sender
                                       `profiles.id`       

  `receiver_id`      UUID              Foreign Key -\>     Receiver
                                       `profiles.id`       

  `appointment_id`   UUID              Foreign Key -\>     Related
                                       `appointments.id`   appointment

  `message`          TEXT                                  Message content

  `attachment`       TEXT                                  Attachment
                                                           URL/path

  `is_seen`          BOOLEAN                               Whether receiver
                                                           has seen it

  `created_at`       TIMESTAMP                             Message timestamp
  --------------------------------------------------------------------------

**Relationships**

``` text
profiles 1 ---- N messages (sender)
profiles 1 ---- N messages (receiver)
appointments 1 ---- N messages
```

Supabase Realtime can later be used for live chat updates.

------------------------------------------------------------------------

## 3.19 `report_files`

**Purpose:** Stores metadata for uploaded patient medical
reports/documents.

  --------------------------------------------------------------------------------
  Column                Type              Key / Constraint       Description
  --------------------- ----------------- ---------------------- -----------------
  `id`                  UUID              Primary Key            Unique file
                                                                 record ID

  `patient_id`          UUID              Foreign Key -\>        Patient
                                          `patients.id`          

  `medical_record_id`   UUID              Foreign Key -\>        Associated
                                          `medical_records.id`   medical record

  `file_name`           TEXT                                     File name

  `file_url`            TEXT                                     Storage URL/path

  `file_type`           TEXT                                     File type

  `uploaded_by`         UUID              Foreign Key -\>        Uploading user
                                          `profiles.id`          

  `created_at`          TIMESTAMP                                Upload timestamp
  --------------------------------------------------------------------------------

**Examples:**

``` text
Blood Test.pdf
X-Ray.jpg
MRI Scan.pdf
Medical Report.pdf
Prescription.pdf
```

Actual files should be stored in Supabase Storage; PostgreSQL stores the
metadata/reference.

------------------------------------------------------------------------

## 3.20 `audit_logs`

**Purpose:** Stores important system/security activities for
traceability.

  -----------------------------------------------------------------------
  Column            Type              Key / Constraint  Description
  ----------------- ----------------- ----------------- -----------------
  `id`              UUID              Primary Key       Unique audit
                                                        record ID

  `user_id`         UUID              Foreign Key -\>   User performing
                                      `profiles.id`     action

  `action`          TEXT                                Action performed

  `table_name`      TEXT                                Affected table

  `record_id`       UUID                                Affected record
                                                        ID

  `ip_address`      TEXT/INET                           Request IP

  `device`          TEXT                                Device
                                                        information

  `created_at`      TIMESTAMP                           Action timestamp
  -----------------------------------------------------------------------

**Example actions:**

``` text
Doctor viewed patient record
Patient uploaded report
Admin verified doctor
Doctor created prescription
Patient cancelled appointment
Admin updated hospital
```

**Relationship:** `profiles 1 ---- N audit_logs`

------------------------------------------------------------------------

## 3.21 `system_settings`

**Purpose:** Stores configurable system-wide settings.

  Column            Type         Key / Constraint   Description
  ----------------- ------------ ------------------ ---------------------
  `id`              UUID         Primary Key        Unique setting ID
  `setting_key`     TEXT         Unique             Setting key
  `setting_value`   TEXT/JSONB                      Setting value
  `description`     TEXT                            Setting description

**Examples:**

``` text
platform_name = MedConnect
appointment_slot_duration = 30
support_email = ...
maintenance_mode = false
max_file_size = ...
```

------------------------------------------------------------------------

# 4. Complete Foreign-Key Reference

  Child Table             Column                Parent Table        Parent Column
  ----------------------- --------------------- ------------------- ---------------
  `profiles`              `auth_id`             `auth.users`        `id`
  `patients`              `profile_id`          `profiles`          `id`
  `doctors`               `profile_id`          `profiles`          `id`
  `doctors`               `specialization_id`   `specializations`   `id`
  `doctors`               `hospital_id`         `hospitals`         `id`
  `admins`                `profile_id`          `profiles`          `id`
  `doctor_hospital`       `doctor_id`           `doctors`           `id`
  `doctor_hospital`       `hospital_id`         `hospitals`         `id`
  `doctor_availability`   `doctor_id`           `doctors`           `id`
  `appointments`          `patient_id`          `patients`          `id`
  `appointments`          `doctor_id`           `doctors`           `id`
  `appointments`          `hospital_id`         `hospitals`         `id`
  `appointments`          `video_session_id`    `video_sessions`    `id`
  `video_sessions`        `appointment_id`      `appointments`      `id`
  `medical_records`       `patient_id`          `patients`          `id`
  `medical_records`       `doctor_id`           `doctors`           `id`
  `medical_records`       `appointment_id`      `appointments`      `id`
  `prescriptions`         `appointment_id`      `appointments`      `id`
  `prescriptions`         `patient_id`          `patients`          `id`
  `prescriptions`         `doctor_id`           `doctors`           `id`
  `prescription_items`    `prescription_id`     `prescriptions`     `id`
  `prescription_items`    `medicine_id`         `medicines`         `id`
  `payments`              `appointment_id`      `appointments`      `id`
  `payments`              `patient_id`          `patients`          `id`
  `notifications`         `user_id`             `profiles`          `id`
  `reviews`               `patient_id`          `patients`          `id`
  `reviews`               `doctor_id`           `doctors`           `id`
  `reviews`               `appointment_id`      `appointments`      `id`
  `messages`              `sender_id`           `profiles`          `id`
  `messages`              `receiver_id`         `profiles`          `id`
  `messages`              `appointment_id`      `appointments`      `id`
  `report_files`          `patient_id`          `patients`          `id`
  `report_files`          `medical_record_id`   `medical_records`   `id`
  `report_files`          `uploaded_by`         `profiles`          `id`
  `audit_logs`            `user_id`             `profiles`          `id`

------------------------------------------------------------------------

# 5. Master Relationship Map

``` text
                         auth.users
                              |
                              | 1:1
                              v
                          profiles
                              |
                +-------------+-------------+
                |             |             |
               1:1           1:1           1:1
                |             |             |
                v             v             v
            patients       doctors        admins
                              |
             +----------------+----------------+
             |                |                |
             v                v                v
      specializations  doctor_availability  hospitals
                                              ^
                                              |
                                      doctor_hospital
                                              |
                                              v
                                         doctors

patients + doctors + hospitals
             |
             v
        appointments
          /   |            /    |            v     v     v
   payments video medical_records
                    |
                    v
               report_files

appointments
     |
     v
prescriptions
     |
     v
prescription_items
     |
     v
medicines

profiles ----------------> notifications
profiles ----------------> messages
patients + doctors ------> reviews
profiles ----------------> audit_logs

system_settings
```

------------------------------------------------------------------------

# 6. Feature-to-Database Mapping

  -----------------------------------------------------------------------
  Feature                             Tables / Services
  ----------------------------------- -----------------------------------
  Patient Registration                `profiles`, `patients`, Supabase
                                      Auth

  Patient Login                       Supabase Auth, `profiles`

  Doctor Registration                 `profiles`, `doctors`, Supabase
                                      Auth

  Doctor Login                        Supabase Auth, `profiles`

  Admin                               `profiles`, `admins`

  Doctor Search                       `doctors`, `specializations`,
                                      `hospitals`

  Specialization Filter               `specializations`, `doctors`

  Hospital Filter                     `hospitals`, `doctor_hospital`,
                                      `doctors`

  Experience Filter                   `doctors`

  Fee Filter                          `doctors`

  Rating Filter                       `doctors`, `reviews`

  Availability Filter                 `doctor_availability`

  Doctor Profile                      `profiles`, `doctors`,
                                      `specializations`, `hospitals`

  Doctor Availability                 `doctor_availability`

  Appointment Booking                 `appointments`

  Appointment Cancellation            `appointments`

  Appointment Rescheduling            `appointments`

  Appointment History                 `appointments`

  Online Consultation                 `appointments`, `video_sessions`

  Medical History                     `medical_records`

  Medical Reports                     `report_files`, Supabase Storage

  Digital Prescription                `prescriptions`,
                                      `prescription_items`, `medicines`

  Prescription PDF                    `prescriptions`, Supabase Storage

  Online Payments                     `payments`

  Invoice                             `payments`

  Notifications                       `notifications`

  Patient-Doctor Chat                 `messages`, Supabase Realtime

  Doctor Reviews                      `reviews`

  Doctor Rating                       `reviews`, `doctors`

  Hospital Management                 `hospitals`, `doctor_hospital`

  Admin Management                    `admins`, `audit_logs`,
                                      `system_settings`

  Security Tracking                   `audit_logs`

  System Configuration                `system_settings`
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 7. Supabase Architecture

``` text
                         MEDCONNECT
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
        Supabase Auth     PostgreSQL       Storage
              |               |               |
         Login/Register    21 Tables      Medical Files
         Session/JWT       Relationships   Images/PDFs
         User Identity     RLS Policies    Reports
              |
              v
           profiles

              |
              v
         Supabase Realtime
              |
        +-----+------+
        |            |
       Chat      Notifications

              |
              v
         Edge Functions
              |
        +-----+----------+
        |                |
 Payment Verification   Webhooks
 Reminders              Server Logic
```

------------------------------------------------------------------------

# 8. Authentication Architecture

``` text
Supabase Auth
      |
      v
auth.users
      |
      | auth_id
      v
profiles
      |
      +---------+---------+
      |         |         |
      v         v         v
   patient    doctor    admin
```

Do not store passwords in application tables. Authentication credentials
are handled by Supabase Auth.

------------------------------------------------------------------------

# 9. Role-Based Access Requirements

## Patient

A patient should be able to access only authorized patient information,
including:

``` text
Own profile
Own patient information
Own appointments
Own payments
Own medical records
Own prescriptions
Own report files
Own notifications
Own messages
Own reviews
```

## Doctor

A doctor should be able to manage authorized information including:

``` text
Own profile
Own availability
Own appointments
Relevant patient information
Authorized medical records
Prescriptions they create
Consultation sessions
Messages
```

## Admin

An authorized admin should be able to manage platform-level information
such as:

``` text
Doctors
Patients
Hospitals
Appointments
Payments
Specializations
System settings
Analytics-related information
```

Use Supabase Row Level Security (RLS) and server-side authorization for
these rules.

------------------------------------------------------------------------

# 10. Supabase Storage

Use Supabase Storage for binary files such as:

``` text
Profile Images
Doctor Certificates
Medical Reports
X-Rays
MRI/Scan Documents
Prescription PDFs
Invoices
Other Healthcare Documents
```

Store references/metadata in PostgreSQL.

Relevant database file-reference fields include:

``` text
profiles.profile_image
specializations.icon
hospitals.logo
prescriptions.pdf_url
payments.invoice_url
messages.attachment
video_sessions.recording_url
report_files.file_url
```

------------------------------------------------------------------------

# 11. Realtime Requirements

Supabase Realtime can be used for:

``` text
Patient-doctor chat
Notifications
Appointment status updates
Online consultation status
Doctor availability updates
```

Main tables:

``` text
messages
notifications
appointments
video_sessions
doctor_availability
```

------------------------------------------------------------------------

# 12. Video Consultation Architecture

``` text
Patient Browser
       |
       | WebRTC / selected video technology
       |
       v
Doctor Browser

       |
       v
video_sessions
       |
       v
appointment
```

The database stores session metadata; it does not store the real-time
audio/video stream.

------------------------------------------------------------------------

# 13. Medical Records Architecture

``` text
Patient
   |
   v
Medical Record
   |
   +-- Diagnosis
   +-- Blood Pressure
   +-- Temperature
   +-- Weight
   +-- Heart Rate
   +-- Remarks
   |
   +---- Report Files
```

------------------------------------------------------------------------

# 14. Prescription Architecture

``` text
prescriptions
      |
      +--------------------------+
      |                          |
      v                          v
Patient / Doctor / Appointment   prescription_items
                                      |
                                      v
                                  medicines
```

One prescription can contain multiple prescription items/medicines.

------------------------------------------------------------------------

# 15. Payment Architecture

``` text
Patient
   |
   v
Appointment
   |
   v
payments
   |
   +-- amount
   +-- currency
   +-- payment_method
   +-- gateway
   +-- transaction_id
   +-- status
   +-- invoice_url
   +-- paid_at
```

Payment verification should be performed through secure server-side
logic or Supabase Edge Functions. Do not trust payment success values
supplied only by the browser.

------------------------------------------------------------------------

# 16. Notification Events

Potential notification records include:

``` text
Appointment Created
Appointment Confirmed
Appointment Cancelled
Appointment Rescheduled
Appointment Reminder
Payment Successful
Payment Failed
Prescription Created
Doctor Joined Consultation
New Message
```

------------------------------------------------------------------------

# 17. Security Requirements

Because MedConnect handles healthcare-related information, security is a
core requirement.

Implement:

``` text
Supabase Authentication
        +
Role-Based Access
        +
Row Level Security (RLS)
        +
Storage Policies
        +
Input Validation
        +
Server-Side Authorization
        +
Audit Logging
        +
Secure Payment Verification
```

Never expose Supabase service-role credentials in frontend code.

------------------------------------------------------------------------

# 18. Data Integrity Rules

The implementation should enforce:

1.  Every patient belongs to a valid profile.
2.  Every doctor belongs to a valid profile.
3.  Every admin belongs to a valid profile.
4.  Every doctor specialization references an existing specialization.
5.  Every doctor-hospital relationship references an existing doctor and
    hospital.
6.  Every availability record references an existing doctor.
7.  Every appointment references an existing patient and doctor.
8.  Appointment date/time should be validated against doctor
    availability.
9.  Appointment conflicts should be prevented.
10. Online appointments can have an associated video session.
11. Medical records reference the appropriate patient, doctor and
    appointment.
12. Prescriptions reference the appropriate appointment, patient and
    doctor.
13. Prescription items reference an existing prescription and medicine.
14. Payments reference valid appointments and patients.
15. Transaction IDs should be unique where supplied by the payment
    gateway.
16. Reviews reference valid patient-doctor appointments.
17. Reviews should normally be created only for completed appointments.
18. Message sender and receiver must be valid profiles.
19. Report files reference a valid patient and, where applicable,
    medical record.
20. Audit logs capture important security-sensitive actions.
21. System setting keys are unique.

------------------------------------------------------------------------

# 19. Recommended Index Areas

Consider indexes on frequently queried fields:

``` text
profiles.auth_id
profiles.role

patients.profile_id

doctors.profile_id
doctors.specialization_id
doctors.hospital_id
doctors.verification_status

doctor_hospital.doctor_id
doctor_hospital.hospital_id

doctor_availability.doctor_id
doctor_availability.day

appointments.patient_id
appointments.doctor_id
appointments.hospital_id
appointments.appointment_date
appointments.status

video_sessions.appointment_id

medical_records.patient_id
medical_records.doctor_id
medical_records.appointment_id

prescriptions.patient_id
prescriptions.doctor_id
prescriptions.appointment_id

prescription_items.prescription_id
prescription_items.medicine_id

payments.appointment_id
payments.patient_id
payments.transaction_id

notifications.user_id
notifications.is_read

reviews.patient_id
reviews.doctor_id
reviews.appointment_id

messages.sender_id
messages.receiver_id
messages.appointment_id

report_files.patient_id
report_files.medical_record_id

audit_logs.user_id
audit_logs.table_name
audit_logs.record_id
```

------------------------------------------------------------------------

# 20. Recommended Database Implementation Order

``` text
STEP 1
Supabase Auth
    |
    v
profiles

STEP 2
patients
doctors
admins

STEP 3
specializations
hospitals

STEP 4
doctor_hospital
doctor_availability

STEP 5
appointments

STEP 6
video_sessions
payments

STEP 7
medical_records
report_files

STEP 8
medicines
prescriptions
prescription_items

STEP 9
notifications
messages
reviews

STEP 10
audit_logs
system_settings

STEP 11
Indexes
RLS
Storage Policies
Triggers
Validation
Testing
```

------------------------------------------------------------------------

# 21. Antigravity / Claude Implementation Instructions

Treat this document as the **master logical database specification** for
the current MedConnect project.

### Mandatory rules

1.  All **21 core tables** must be preserved.
2.  Do not remove any listed entity.
3.  Do not silently rename tables.
4.  Do not silently rename columns.
5.  Do not omit listed relationships.
6.  Use Supabase PostgreSQL as the implementation target.
7.  Use Supabase Auth for authentication.
8.  Do not store passwords in application tables.
9.  Use Supabase Storage for uploaded files.
10. Use Supabase Realtime where appropriate.
11. Implement Row Level Security (RLS).
12. Add appropriate primary keys.
13. Add appropriate foreign keys.
14. Add appropriate unique constraints.
15. Add appropriate check constraints.
16. Add appropriate indexes.
17. Add timestamps and update handling where appropriate.
18. Do not expose service-role credentials in frontend code.
19. Do not trust frontend-only authorization or payment-success values.
20. Preserve healthcare-data access restrictions.
21. Before applying SQL migrations, compare the resulting schema against
    the 21-table checklist below.
22. Do not create unrelated tables unless a later approved feature
    technically requires one. If an additional supporting table becomes
    necessary, identify it clearly as an extension and do not
    replace/remove any core table.

------------------------------------------------------------------------

# 22. Final 21-Table Checklist

``` text
[ ] 01 profiles
[ ] 02 patients
[ ] 03 doctors
[ ] 04 admins
[ ] 05 specializations
[ ] 06 hospitals
[ ] 07 doctor_hospital
[ ] 08 doctor_availability
[ ] 09 appointments
[ ] 10 video_sessions
[ ] 11 medical_records
[ ] 12 prescriptions
[ ] 13 prescription_items
[ ] 14 medicines
[ ] 15 payments
[ ] 16 notifications
[ ] 17 reviews
[ ] 18 messages
[ ] 19 report_files
[ ] 20 audit_logs
[ ] 21 system_settings
```

# 23. Final Core Schema

**Total core tables: 21**

``` text
01  profiles
02  patients
03  doctors
04  admins
05  specializations
06  hospitals
07  doctor_hospital
08  doctor_availability
09  appointments
10  video_sessions
11  medical_records
12  prescriptions
13  prescription_items
14  medicines
15  payments
16  notifications
17  reviews
18  messages
19  report_files
20  audit_logs
21  system_settings
```

**This document is the master logical database-design reference for
MedConnect.**
