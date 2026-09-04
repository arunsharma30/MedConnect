import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const DashboardLayout = ({ children }) => {
  const { profile, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const patientLinks = [
    { name: 'Dashboard', path: '/patient/dashboard', icon: 'space_dashboard' },
    { name: 'My Appointments', path: '/patient/appointments', icon: 'calendar_month' },
    { name: 'Medical Records', path: '/patient/records', icon: 'medical_information' },
    { name: 'Find Doctors', path: '/patient/doctors', icon: 'search' },
    { name: 'My Profile', path: '/patient/profile', icon: 'person' },
  ];

  const doctorLinks = [
    { name: 'Dashboard', path: '/doctor/dashboard', icon: 'space_dashboard' },
    { name: 'Consultations', path: '/doctor/appointments', icon: 'calendar_month' },
    { name: 'Availability', path: '/doctor/availability', icon: 'event_available' },
    { name: 'My Profile', path: '/doctor/profile', icon: 'person' },
  ];

  const links = role === 'patient' ? patientLinks : doctorLinks;

  return (
    <div className="flex h-screen bg-[#F7F8FC] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-outline-variant/50 flex flex-col shadow-sm z-10">
        <div className="h-16 flex items-center px-6 border-b border-outline-variant/50">
          <NavLink to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="MedConnect Logo" className="w-8 h-8 object-contain" />
            <span className="text-title-lg font-title-lg text-primary font-bold">MedConnect</span>
          </NavLink>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-label-lg font-label-lg transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
              <span>{link.name}</span>
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-outline-variant/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-label-md font-label-md text-on-surface truncate font-medium">
                {role === 'doctor' ? 'Dr. ' : ''}{profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-body-sm font-body-sm text-on-surface-variant truncate capitalize">
                {role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 w-full px-3 py-2 text-error hover:bg-error/10 rounded-lg transition-colors text-label-md font-label-md"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-outline-variant/50 flex items-center px-8 shadow-sm shrink-0">
          <h2 className="text-title-lg font-title-lg text-on-surface capitalize">
            {role} Portal
          </h2>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-max-width-content mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
