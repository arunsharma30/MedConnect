import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import RoleSelection from './components/RoleSelection';
import HowItWorks from './components/HowItWorks';
import TrustBanner from './components/TrustBanner';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';

// Pages and Protection
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import ProfileSettings from './pages/ProfileSettings';
import DoctorSearch from './pages/DoctorSearch';
import DoctorAvailability from './pages/DoctorAvailability';
import AppointmentBooking from './pages/AppointmentBooking';
import PatientAppointments from './pages/PatientAppointments';
import DoctorAppointments from './pages/DoctorAppointments';
import MedicalRecords from './pages/MedicalRecords';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import DoctorProfile from './pages/DoctorProfile';
import { DoctorPatientRecords, DoctorPrescriptions, DoctorDiagnostics, DoctorBilling } from './pages/DoctorStubs';
import VideoConsultationPage from './pages/VideoConsultationPage';

function LandingPage({ handleOpenAuth, authModalRef, authView, setAuthView }) {
  return (
    <>
      <Header onOpenAuth={handleOpenAuth} />
      <main className="flex-grow">
        <Hero onOpenAuth={handleOpenAuth} />
        <RoleSelection onOpenAuth={handleOpenAuth} />
        <HowItWorks />
        <TrustBanner />
        <AuthModal ref={authModalRef} authView={authView} setAuthView={setAuthView} />
      </main>
      <Footer onOpenAuth={handleOpenAuth} />
    </>
  );
}

function App() {
  const [authView, setAuthView] = useState({ role: 'patient', action: 'login' });
  const authModalRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  // Handle URL query parameters or direct routes for authentication
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    const actionParam = params.get('action');

    let targetRole = null;
    let targetAction = null;

    if (location.pathname === '/login') {
      targetRole = 'patient';
      targetAction = 'login';
    } else if (location.pathname === '/register' || location.pathname === '/signup') {
      targetRole = 'patient';
      targetAction = 'register';
    } else if (location.pathname === '/doctor/login') {
      targetRole = 'doctor';
      targetAction = 'login';
    } else if (location.pathname === '/doctor/register' || location.pathname === '/doctor/signup') {
      targetRole = 'doctor';
      targetAction = 'register';
    } else if (roleParam && (roleParam === 'patient' || roleParam === 'doctor')) {
      targetRole = roleParam;
      targetAction = (actionParam === 'register' || actionParam === 'signup') ? 'register' : 'login';
    }

    if (targetRole && targetAction) {
      setAuthView({ role: targetRole, action: targetAction });
      if (authModalRef.current) {
        authModalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [location.pathname, location.search]);

  // Redirect authenticated users trying to access auth/landing routes to their respective dashboards
  useEffect(() => {
    const isAuthRoute = ['/', '/login', '/register', '/doctor/login', '/doctor/register'].includes(location.pathname);
    if (!loading && user && isAuthRoute) {
      if (role === 'patient') navigate('/patient/dashboard');
      if (role === 'doctor') navigate('/doctor/dashboard');
    }
  }, [user, role, loading, location.pathname, navigate]);

  const handleOpenAuth = (role, action) => {
    setAuthView({ role, action });
    if (authModalRef.current) {
      authModalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <Routes>
      <Route 
        path="/" 
        element={<LandingPage handleOpenAuth={handleOpenAuth} authModalRef={authModalRef} authView={authView} setAuthView={setAuthView} />} 
      />
      <Route 
        path="/login" 
        element={<LandingPage handleOpenAuth={handleOpenAuth} authModalRef={authModalRef} authView={authView} setAuthView={setAuthView} />} 
      />
      <Route 
        path="/register" 
        element={<LandingPage handleOpenAuth={handleOpenAuth} authModalRef={authModalRef} authView={authView} setAuthView={setAuthView} />} 
      />
      <Route 
        path="/doctor/login" 
        element={<LandingPage handleOpenAuth={handleOpenAuth} authModalRef={authModalRef} authView={authView} setAuthView={setAuthView} />} 
      />
      <Route 
        path="/doctor/register" 
        element={<LandingPage handleOpenAuth={handleOpenAuth} authModalRef={authModalRef} authView={authView} setAuthView={setAuthView} />} 
      />
      <Route 
        path="/reset-password" 
        element={<ResetPassword />} 
      />
      <Route 
        path="/patient/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientDashboard />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/patient/appointments" 
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientAppointments />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/patient/book-appointment" 
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <AppointmentBooking />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/patient/records" 
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <MedicalRecords />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/patient/doctors" 
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <DoctorSearch />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/patient/doctors/:doctorId" 
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <DoctorProfile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/patient/profile" 
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <ProfileSettings />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/doctor/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/doctor/appointments" 
        element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorAppointments />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/doctor/availability" 
        element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorAvailability />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/doctor/profile" 
        element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <ProfileSettings />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/doctor/patients" 
        element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorPatientRecords />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/doctor/prescriptions" 
        element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorPrescriptions />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/doctor/diagnostics" 
        element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorDiagnostics />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/doctor/billing" 
        element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorBilling />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/consultations/:appointmentId/video" 
        element={
          <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}>
            <VideoConsultationPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;
