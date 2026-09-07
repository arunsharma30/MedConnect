# MedConnect

MedConnect is a Smart Healthcare and Telemedicine Platform designed to connect patients and doctors through a secure, convenient, and centralized digital healthcare system.

The platform brings essential healthcare services such as doctor discovery, appointment booking, online payments, video consultations, digital prescriptions, medical records, notifications, messaging, and administrative management into one application.

## Table of Contents

- [About the Project](#about-the-project)
- [Problem Statement](#problem-statement)
- [Objectives](#objectives)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [System Modules](#system-modules)
- [Application Workflow](#application-workflow)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Database Design](#database-design)
- [Database Tables](#database-tables)
- [Security](#security)
- [SDLC Model](#sdlc-model)
- [Agile Sprint Plan](#agile-sprint-plan)
- [UML and Software Engineering Models](#uml-and-software-engineering-models)
- [Testing](#testing)
- [Future Scope](#future-scope)
- [Getting Started](#getting-started)
- [Development Guidelines](#development-guidelines)
- [Project Status](#project-status)
- [Contributing](#contributing)
- [License](#license)
- [Disclaimer](#disclaimer)

## About the Project

MedConnect is a full-stack web application for online healthcare delivery.

Patients can use the platform to:
- Register and securely log in
- Search and filter doctors
- View doctor profiles and availability
- Book, cancel, and reschedule appointments
- Make online payments
- Attend online video consultations
- Upload medical reports
- View medical history
- Access digital prescriptions
- Receive notifications and reminders
- Communicate with doctors
- Submit ratings and reviews

Doctors can use the platform to:
- Create and manage professional profiles
- Manage qualifications and specialization
- Manage availability
- View and manage appointments
- Conduct online consultations
- View authorized patient information
- Create digital prescriptions
- Add consultation records
- Communicate with patients

Administrators can manage:
- Patients
- Doctors
- Hospitals
- Payments
- Analytics
- System configuration
- Security and audit activities

## Problem Statement

Traditional healthcare access may require patients to use multiple disconnected channels for finding doctors, scheduling appointments, managing reports, making payments, and maintaining medical information.

MedConnect aims to provide a centralized digital platform that simplifies this process by connecting patients and doctors online.

The overall healthcare workflow is:

```text
Patient Registration
        |
        v
Doctor Discovery
        |
        v
Appointment Booking
        |
        v
Online Payment
        |
        v
Video Consultation
        |
        v
Digital Prescription
        |
        v
Medical Records
        |
        v
Future Follow-up
```

## Objectives

1. Provide a centralized healthcare and telemedicine platform.
2. Make doctor discovery easier for patients.
3. Simplify appointment scheduling.
4. Support online healthcare consultations.
5. Provide digital prescription management.
6. Allow patients to manage medical reports and medical history.
7. Support online payment processing.
8. Provide notifications and appointment reminders.
9. Provide doctors with tools to manage appointments and consultations.
10. Provide administrators with centralized platform management.
11. Maintain appropriate access control for healthcare-related data.
12. Build the application in a scalable and maintainable way.
13. Support continuous improvement through Agile development.

## Key Features

### Patient Features

- Patient registration and login
- Email verification
- Password recovery
- Role-based authentication
- Patient profile management
- Doctor search and filtering
- Doctor profile viewing
- Doctor availability
- Appointment booking
- Appointment cancellation
- Appointment rescheduling
- Online payment
- Payment status tracking
- Video consultation
- Medical report upload
- Medical history
- Digital prescription viewing
- Doctor ratings and reviews
- Patient-doctor messaging
- Notifications and reminders

### Doctor Features

- Doctor registration and login
- Professional profile management
- Qualification information
- Specialization management
- Hospital/clinic association
- Availability management
- Appointment management
- Authorized patient information access
- Online video consultation
- Consultation notes
- Digital prescription creation
- Medical record management
- Notifications
- Patient communication

### Admin Features

- Admin authentication
- Patient management
- Doctor management
- Hospital management
- Payment management
- Platform analytics
- System configuration
- Security and audit monitoring
- Administrative notifications

## User Roles

| Role | Main Responsibilities |
|------|------------------------|
| Patient | Search doctors, book appointments, make payments, attend consultations, manage medical records |
| Doctor | Manage profile, availability, appointments, consultations, prescriptions and authorized patient information |
| Admin | Manage doctors, patients, hospitals, payments, analytics and system configuration |

## System Modules

The main modules are:

1. User Authentication
2. Patient Dashboard
3. Doctor Dashboard
4. Doctor Search and Discovery
5. Appointment Booking
6. Prescription Management
7. Medical Records
8. Payments
9. Notifications
10. Video Consultation
11. Messaging
12. Reviews and Ratings
13. Admin Dashboard
14. Audit and Security Management
15. System Configuration

## Application Workflow

### Patient Workflow

```text
Register / Login
      |
      v
Patient Dashboard
      |
      v
Search Doctor
      |
      v
View Doctor Profile
      |
      v
Check Availability
      |
      v
Book Appointment
      |
      v
Make Payment
      |
      v
Receive Confirmation
      |
      v
Attend Consultation
      |
      v
Receive Prescription
      |
      v
View / Maintain Medical History
```

### Doctor Workflow

```text
Register / Login
      |
      v
Doctor Dashboard
      |
      v
Manage Profile
      |
      v
Set Availability
      |
      v
View Appointments
      |
      v
Conduct Consultation
      |
      v
Create Consultation Record
      |
      v
Create Digital Prescription
```

### Admin Workflow

```text
Admin Login
     |
     v
Admin Dashboard
     |
     +----> Manage Patients
     |
     +----> Manage Doctors
     |
     +----> Manage Hospitals
     |
     +----> Monitor Payments
     |
     +----> View Analytics
     |
     +----> Manage System Settings
     |
     +----> Review Audit Activities
```

## Technology Stack

### Frontend
- React
- Vite
- JavaScript / TypeScript
- Responsive component-based UI

### Backend and Application Services
- Node.js
- Express.js
- TypeScript
- REST APIs
- Prisma ORM
- Zod for request validation
- Pino/Sentry for application logging and monitoring
- Redis and BullMQ where background jobs and retry-safe processing are required

### Supabase and Database
- Supabase
- Supabase Auth
- PostgreSQL
- Supabase Storage
- Supabase Realtime
- Row Level Security (RLS)
- Supabase Edge Functions where appropriate
- PostgreSQL scheduled jobs where appropriate

### Testing
- Vitest / Jest
- Supertest
- Integration testing
- End-to-end testing
- Regression testing
- Performance testing

### DevOps
- Git
- GitHub
- GitHub Actions
- Supabase CLI for migrations where applicable

## System Architecture

The application follows a layered architecture in which the frontend communicates with the application/API layer, which communicates with Supabase and the database.

```text
                    MedConnect
                        |
                        v
                React Frontend
                        |
                    HTTPS / JWT
                        |
                        v
              Node.js / Express API
                        |
          +-------------+-------------+
          |             |             |
          v             v             v
       Prisma      Supabase Auth   Supabase Storage
          |
          v
    PostgreSQL / Supabase
          |
     +----+----+
     |         |
     v         v
  Redis     Supabase
  /BullMQ   Realtime
```

The exact services used may evolve as implementation progresses.

## Database Design

The primary database implementation target is Supabase PostgreSQL.

The master database specification contains 21 core tables. Supabase Auth handles authentication credentials, while the application database stores application-level profile and healthcare-related information.

The database uses:

- Primary keys
- Foreign keys
- Unique constraints
- Check constraints
- Timestamps
- Indexes
- Row Level Security
- Storage policies
- Validation
- Audit logging

### Database Relationship Overview

```text
Supabase Auth
      |
      v
  profiles
      |
  +---+-----------+
  |   |           |
  v   v           v
patients doctors admins
          |
          +----------------------+
          |          |           |
          v          v           v
specializations hospitals doctor_availability
                         |
                         v
                  doctor_hospital

patients + doctors + hospitals
              |
              v
        appointments
         /    |    \
        /     |     \
       v      v      v
  payments  video  medical_records
                         |
                  +------+------+
                  |             |
                  v             v
             report_files   prescriptions
                                |
                                v
                         prescription_items
                                |
                                v
                            medicines

profiles --> notifications
profiles --> messages
patients + doctors --> reviews
profiles --> audit_logs

system_settings
```

## Database Tables

| # | Table | Purpose |
|---|-------|---------|
| 1 | `profiles` | Common application-level user information |
| 2 | `patients` | Patient-specific information |
| 3 | `doctors` | Doctor professional information |
| 4 | `admins` | Administrator information |
| 5 | `specializations` | Medical specialization master data |
| 6 | `hospitals` | Hospital/clinic information |
| 7 | `doctor_hospital` | Doctor-to-hospital relationship |
| 8 | `doctor_availability` | Doctor working and appointment availability |
| 9 | `appointments` | Patient-doctor appointment management |
| 10 | `video_sessions` | Online consultation session information |
| 11 | `medical_records` | Patient medical history and consultation records |
| 12 | `prescriptions` | Digital prescriptions |
| 13 | `prescription_items` | Individual medicines within prescriptions |
| 14 | `medicines` | Medicine master data |
| 15 | `payments` | Appointment/payment transactions |
| 16 | `notifications` | User notifications |
| 17 | `reviews` | Patient reviews and doctor ratings |
| 18 | `messages` | Patient-doctor messaging |
| 19 | `report_files` | Uploaded medical reports/documents |
| 20 | `audit_logs` | Security and system activity tracking |
| 21 | `system_settings` | System-wide configuration |

## Security

MedConnect is designed with security and controlled healthcare-data access in mind.

Security principles include:

- Supabase Auth for authentication
- JWT/session-based authentication
- Role-based access control
- PostgreSQL Row Level Security
- Primary and foreign-key constraints
- Protected Supabase Storage access
- Audit logging for important security-sensitive actions
- Server-side validation for critical operations
- Server-side payment verification
- No passwords stored in application tables
- No service-role credentials exposed in frontend code
- Restricted access to patient medical information
- HTTPS in production
- Secure environment-variable handling
- Input validation and sanitization
- Principle of least privilege

## SDLC Model

MedConnect uses the **Agile SDLC model with the Scrum framework**.

Agile is suitable because:

- The project contains multiple independent modules.
- Requirements can evolve during development.
- Features can be delivered incrementally.
- Continuous testing is possible.
- Faculty and user feedback can be incorporated regularly.
- Bugs can be detected earlier.
- New healthcare features can be added in future iterations.
- Agile supports CI/CD and continuous improvement.

The basic cycle is:

```text
Plan
  |
  v
Develop
  |
  v
Test
  |
  v
Review / Feedback
  |
  v
Improve
  |
  +------> Next Sprint
```

## Agile Sprint Plan

| Sprint | Module | Main Work |
|--------|--------|-----------|
| Sprint 1 | Authentication | Registration, login, role-based access, email verification, password security |
| Sprint 2 | Patient & Doctor Dashboard | Profiles, doctor search, filters and dashboards |
| Sprint 3 | Appointment Booking | Availability, slot booking, rescheduling and cancellation |
| Sprint 4 | Prescriptions & Medical Records | Digital prescriptions, report upload and medical history |
| Sprint 5 | Payments & Notifications | Payment gateway, invoices, notifications and reminders |
| Sprint 6 | Video Consultation | Real-time video consultation, scheduling and consultation notes |
| Sprint 7 | Admin Dashboard | Patient, doctor, hospital and analytics management |
| Sprint 8 | Testing & Deployment | Regression testing, performance testing, deployment and bug fixing |

## UML and Software Engineering Models

The project can be documented using:

### Use Case Diagram
Shows who uses the system and what they can do.

Main actors:
- Patient
- Doctor
- Admin

### Class Diagram
Shows the classes/entities, attributes, methods and relationships.

Examples:
- Patient
- Doctor
- Appointment
- Prescription
- Payment
- MedicalRecord
- Hospital

### Sequence Diagram
Shows how actors and system components communicate step-by-step over time.

Important workflows:
- Patient Login
- Doctor Login
- Book Appointment
- Make Payment
- Video Consultation
- Create Prescription

### State Chart Diagram
Shows how an object changes between states based on events.

Example:

```text
Booked
   |
   v
Confirmed
   |
   +--------> Cancelled
   |
   v
Completed
```

Other useful models include:
- Activity Diagram
- Component Diagram
- Deployment Diagram
- Entity Relationship Diagram
- Data Flow Diagram
- System Architecture Diagram

## Testing

Testing is an important part of the Agile development process.

### Unit Testing
Tests individual functions, components, utilities and business rules.

### Integration Testing
Tests communication between components such as:
- API and database
- Authentication and profile creation
- Appointment booking and availability
- Payment verification and appointment confirmation

### End-to-End Testing

A complete workflow can be tested as:

```text
Patient Login
     |
Search Doctor
     |
Select Appointment
     |
Make Payment
     |
Receive Confirmation
     |
Attend Consultation
```

### Regression Testing
Ensures that new changes do not break existing functionality.

### Performance Testing
Can evaluate:
- API response times
- Database queries
- Concurrent users
- Application performance
- Real-time communication infrastructure

## Future Scope

Possible future enhancements include:

- Lab-test booking
- Insurance integration
- Pharmacy integration
- AI-assisted symptom information
- OCR for medical reports
- Voice-to-text consultation notes
- Healthcare FAQ chatbot
- Automated appointment reminders
- No-show prediction
- Advanced analytics
- Mobile application
- Multi-language support
- Enhanced doctor recommendation
- Electronic health record integrations
- Additional notification channels
- Healthcare provider integrations

Future features should be evaluated for security, privacy, reliability, regulatory requirements, and clinical appropriateness.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/arunsharma30/MedConnect.git
cd MedConnect
```

### 2. Install Dependencies

```bash
npm install
```

If a separate backend exists:

```bash
cd server
npm install
```

### 3. Configure Environment Variables

Create the required `.env` file using `.env.example` as a reference.

Typical frontend Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never commit real secrets to GitHub.

### 4. Start the Frontend

```bash
npm run dev
```

### 5. Database Setup

Use the project's Supabase migration workflow to apply database changes.

The database should be verified against the master 21-table specification before deployment.

### 6. Backend

If the Express backend is enabled, use the development command defined in the backend package configuration.

## Development Guidelines

1. Inspect existing code before introducing new architecture.
2. Reuse existing components and services where appropriate.
3. Keep frontend, backend and database responsibilities separated.
4. Use Supabase PostgreSQL as the database source of truth.
5. Do not use localStorage as a replacement for the database.
6. Do not create mock APIs for production functionality.
7. Do not duplicate existing database tables.
8. Preserve the defined 21 core database tables.
9. Use migrations for database schema changes.
10. Apply Row Level Security to protected data.
11. Validate important inputs on the server side.
12. Do not trust frontend-only authorization.
13. Do not trust frontend-only payment-success values.
14. Never expose service-role credentials.
15. Keep healthcare-data access restricted according to user roles.
16. Write tests for important business logic.
17. Use meaningful Git commits.
18. Keep documentation updated when architecture changes.

## Project Status

MedConnect is being developed incrementally using the Agile Scrum approach.

Current development areas include:

- Frontend UI
- Authentication
- Supabase integration
- Database implementation
- Patient and doctor workflows
- Appointment management
- Healthcare record management
- Payment integration
- Video consultation
- Administrative functionality
- Testing and deployment

Some features may remain under active development and their final implementation can change as the project progresses.

## Repository

GitHub Repository:

https://github.com/arunsharma30/MedConnect

## Contributing

This project is primarily being developed as a Software Engineering / academic project.

For contributions:

1. Create a feature branch.
2. Make the required changes.
3. Test the changes locally.
4. Ensure existing functionality is not broken.
5. Commit the changes with a meaningful message.
6. Push the branch.
7. Open a Pull Request if collaborative development is enabled.

Example:

```bash
git checkout -b feature/appointment-booking
git add .
git commit -m "feat: implement appointment booking"
git push origin feature/appointment-booking
```

## Git Commit Convention

Recommended commit prefixes:

```text
feat:     New functionality
fix:      Bug fix
refactor: Code restructuring
docs:     Documentation changes
test:     Test-related changes
chore:    Maintenance/configuration
style:    UI or formatting changes
```

Examples:

```text
feat: add doctor search
feat: implement appointment booking
fix: resolve authentication redirect
docs: update database documentation
test: add appointment service tests
refactor: improve auth service structure
```

## License

This project is currently developed as an academic/software engineering project.

A formal open-source license can be added when the project's distribution and ownership requirements are finalized.

## Disclaimer

MedConnect is an academic/software engineering project intended to demonstrate the design and development of a digital healthcare and telemedicine platform.

The application should not be treated as a replacement for professional medical advice, diagnosis, or emergency healthcare services.

Any production deployment involving real healthcare data should undergo appropriate security, privacy, compliance, legal, clinical, and infrastructure reviews before being used with real patients or healthcare providers.

## Project Summary

MedConnect aims to provide a centralized digital healthcare experience by connecting patients, doctors and administrators through one platform.

The core workflow is:

```text
Patients
   |
   v
Doctor Discovery
   |
   v
Appointment
   |
   v
Payment
   |
   v
Video Consultation
   |
   v
Prescription
   |
   v
Medical Records
   |
   v
Follow-up Healthcare
```

The project follows an Agile Scrum development approach and is designed with modularity, security, scalability, maintainability and continuous improvement in mind.
