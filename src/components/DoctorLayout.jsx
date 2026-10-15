import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const DoctorLayout = ({ children, pageTitle = 'Dashboard' }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [doctorData, setDoctorData] = useState(null);
  const [pendingConsults, setPendingConsults] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (profile) {
      fetchDoctorData();
      fetchBadgeCounts();
    }
  }, [profile]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const fetchDoctorData = async () => {
    const { data } = await supabase
      .from('doctors')
      .select('id, consultation_fee, verification_status, specializations(name)')
      .eq('profile_id', profile.id)
      .single();
    if (data) setDoctorData(data);
  };

  const fetchBadgeCounts = async () => {
    const { data: docData } = await supabase
      .from('doctors')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (!docData) return;

    const today = new Date().toISOString().split('T')[0];

    // Today's pending consults
    const { count: pendingCount } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', docData.id)
      .eq('appointment_date', today)
      .in('status', ['pending', 'confirmed']);

    setPendingConsults(pendingCount || 0);

    // Unread notifications
    const { count: notifCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);

    setUnreadNotifications(notifCount || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/doctor/dashboard', icon: 'space_dashboard', badge: null },
    { name: 'Consultations', path: '/doctor/appointments', icon: 'calendar_month', badge: pendingConsults },
    { name: 'Availability', path: '/doctor/availability', icon: 'event_available', badge: null },
    { name: 'Patient Records', path: '/doctor/patients', icon: 'folder_shared', badge: null },
    { name: 'Prescriptions', path: '/doctor/prescriptions', icon: 'prescriptions', badge: null },
    { name: 'Diagnostics & Labs', path: '/doctor/diagnostics', icon: 'biotech', badge: null },
    { name: 'Billing & Payouts', path: '/doctor/billing', icon: 'payments', badge: null },
    { name: 'My Profile', path: '/doctor/profile', icon: 'manage_accounts', badge: null },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-[#E5E7EB] shrink-0">
        <NavLink to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="MedConnect" className="w-8 h-8 object-contain" />
          <span className="text-headline-sm font-headline-sm font-bold text-on-surface tracking-tight">MedConnect</span>
        </NavLink>
        <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-primary-container text-on-primary font-semibold">
          Doctor
        </span>
      </div>

      {/* Doctor Status Pill */}
      <div className="px-5 py-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          <span className="text-label-sm font-label-sm text-on-surface-variant">
            {doctorData?.verification_status === 'verified' ? 'Accepting Consults' : 'Pending Verification'}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-lg text-body-md transition-colors group ${
                isActive
                  ? 'bg-primary/10 text-primary-container font-medium'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
              <span className="text-body-md font-body-md">{link.name}</span>
            </div>
            {link.badge !== null && link.badge > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary-container text-on-primary text-label-sm font-label-sm flex items-center justify-center">
                {link.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Doctor Profile Card & Logout */}
      <div className="p-4 border-t border-[#E5E7EB] shrink-0 space-y-3">
        <div className="flex items-center gap-3">
          {profile?.profile_image ? (
            <img src={profile.profile_image} alt="Doctor Avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-surface-container-high" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-label-md ring-2 ring-surface-container-high shrink-0">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-body-md font-body-md text-on-surface font-semibold truncate">
              {(() => {
                const first = profile?.first_name || '';
                const cleanFirst = first.replace(/^dr\.?\s+/i, '');
                return `Dr. ${cleanFirst} ${profile?.last_name || ''}`.trim();
              })()}
            </p>
            <p className="text-body-sm font-body-sm text-on-surface-variant truncate">
              {doctorData?.specializations?.name || 'General Practice'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-error hover:bg-error/10 rounded-lg transition-colors text-label-md font-label-md"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F7F8FC] overflow-hidden font-body-md">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#E5E7EB] z-20 shrink-0 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#E5E7EB] shadow-xl transform transition-transform duration-200 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Sticky Header */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center px-4 md:px-6 gap-4 shrink-0 shadow-sm z-10">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
            aria-label="Toggle sidebar"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-body-sm font-body-sm text-on-surface-variant shrink-0">
            <span className="text-on-surface font-semibold hidden sm:block">Doctor Portal</span>
            <span className="material-symbols-outlined text-[14px] text-outline hidden sm:block">chevron_right</span>
            <span className="text-primary-container font-semibold">{pageTitle}</span>
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center relative flex-1 max-w-sm">
            <span className="absolute left-3 text-outline">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </span>
            <input
              type="text"
              placeholder="Search patients by name or MRN..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E5E7EB] bg-[#F7F8FC] text-body-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {/* New Consultation CTA */}
            <button
              onClick={() => navigate('/doctor/appointments')}
              className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary-container text-on-primary text-label-md font-label-md hover:bg-[#5249EC] transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>New Consultation</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorLayout;
