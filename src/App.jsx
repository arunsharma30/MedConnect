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

  // Redirect authenticated users trying to access the landing page to their respective dashboards
  useEffect(() => {
    if (!loading && user && location.pathname === '/') {
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
    </Routes>
  );
}

export default App;
