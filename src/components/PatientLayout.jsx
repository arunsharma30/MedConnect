import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const PatientLayout = ({ children }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/patient/dashboard', icon: 'dashboard' },
    { name: 'Appointments', path: '/patient/appointments', icon: 'calendar_month' },
    { name: 'Health Records', path: '/patient/records', icon: 'clinical_notes' },
    { name: 'Find a Doctor', path: '/patient/doctors', icon: 'person_search' },
    { name: 'Profile', path: '/patient/profile', icon: 'person' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest shadow-sm w-full transition-all">
        <div className="max-w-[72rem] mx-auto h-16 px-6 md:px-12 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Clinical Emblem */}
          <div className="flex items-center gap-12">
            <NavLink to="/" className="flex items-center gap-2 group focus:outline-none">
              <img src="/logo.png" alt="MedConnect Logo" className="w-9 h-9 object-contain" />
              <span className="text-headline-md font-headline-md font-bold text-on-surface tracking-tight hidden sm:block">MedConnect</span>
            </NavLink>
            
            {/* Desktop Navigation Items */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `whitespace-nowrap font-body-md transition-colors flex items-center gap-1.5 ${
                      isActive 
                        ? 'text-primary border-b-2 border-primary pb-1 font-semibold' 
                        : 'text-on-surface-variant hover:text-primary pb-1'
                    }`
                  }
                >
                  <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
                  <span>{link.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Action Cluster & Patient Status */}
          <div className="flex items-center gap-3">
            {/* Quick Search */}
            <div className="hidden md:flex items-center relative w-48 xl:w-56">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">search</span>
              <input 
                className="w-full h-9 pl-9 pr-3 text-body-sm font-body-sm bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-on-surface-variant/60 transition-all" 
                placeholder="Search..." 
                type="text"
              />
            </div>
            
            {/* Logout Icon */}
            <button 
              onClick={handleLogout}
              className="relative p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors" 
              title="Log out"
            >
              <span className="material-symbols-outlined text-[22px]">logout</span>
            </button>

            {/* Patient Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-outline-variant">
              <div className="w-9 h-9 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold ring-2 ring-surface-container text-label-md">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-label-md font-label-md text-on-surface font-semibold leading-tight truncate max-w-[150px]">
                  {profile?.first_name} {profile?.last_name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-[72rem] mx-auto px-6 md:px-12 py-8 space-y-8">
        {children}
      </main>

      {/* Footprint / Footer */}
      <footer className="w-full border-t border-outline-variant bg-surface-container-low mt-16 px-6 md:px-12 py-12">
        <div className="max-w-[72rem] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="MedConnect Logo" className="w-7 h-7 object-contain grayscale opacity-80" />
              <span className="text-headline-md font-headline-md font-bold text-on-surface tracking-tight">MedConnect</span>
            </div>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              © 2026 MedConnect Inc. All rights reserved. HIPAA Compliant & Certified.
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-label-sm font-label-sm text-on-surface-variant">
            <span className="hover:text-primary transition-colors cursor-pointer">Find a Doctor</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-primary transition-colors cursor-pointer">HIPAA Compliance</span>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default PatientLayout;
