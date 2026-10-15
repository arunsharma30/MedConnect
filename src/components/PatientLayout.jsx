import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const PatientLayout = ({ children, fullWidth = false }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const searchContainerRef = useRef(null);

  // Sync with URL query parameter when on /patient/doctors
  useEffect(() => {
    if (location.pathname === '/patient/doctors') {
      const q = searchParams.get('q') || searchParams.get('search') || '';
      setSearchQuery(q);
    }
  }, [location.pathname, searchParams]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick suggestions query when typing
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const q = searchQuery.trim().toLowerCase();
        
        // Fetch doctors for suggestion matching
        const { data: doctors } = await supabase
          .from('doctors')
          .select(`
            id,
            consultation_fee,
            profiles!inner ( first_name, last_name, profile_image ),
            specializations ( name )
          `)
          .limit(50);

        if (doctors) {
          const matched = doctors.filter((doc) => {
            const rawFirst = doc.profiles?.first_name || '';
            const cleanFirst = rawFirst.replace(/^dr\.?\s+/i, '');
            const rawLast = doc.profiles?.last_name || '';
            const cleanName = `${cleanFirst} ${rawLast}`.toLowerCase();
            const rawName = `${rawFirst} ${rawLast}`.toLowerCase();
            const specName = (doc.specializations?.name || 'General Practice').toLowerCase();
            return (
              cleanName.includes(q) ||
              rawName.includes(q) ||
              cleanFirst.toLowerCase().includes(q) ||
              rawLast.toLowerCase().includes(q) ||
              specName.includes(q)
            );
          });
          setSearchResults(matched.slice(0, 5));
        }
      } catch (err) {
        console.error('Error fetching quick suggestions:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setIsSearchOpen(false);
    setShowMobileSearch(false);
    if (searchQuery.trim()) {
      navigate(`/patient/doctors?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/patient/doctors');
    }
  };

  const handleSelectDoctor = (docId) => {
    setIsSearchOpen(false);
    setShowMobileSearch(false);
    navigate(`/patient/doctors/${docId}`);
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
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          
          {/* Brand Logo & Navigation */}
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-7 min-w-0">
            <NavLink to="/" className="flex items-center gap-2 group focus:outline-none shrink-0">
              <img src="/logo.png" alt="MedConnect Logo" className="w-8 h-8 object-contain" />
              <span className="text-title-lg font-bold text-on-surface tracking-tight hidden sm:block">MedConnect</span>
            </NavLink>
            
            {/* Desktop Navigation Items */}
            <nav className="hidden lg:flex items-center space-x-2.5 xl:space-x-4">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `whitespace-nowrap text-[13.5px] font-medium transition-colors flex items-center gap-1.5 py-1 px-1.5 rounded-md ${
                      isActive 
                        ? 'text-primary border-b-2 border-primary font-semibold' 
                        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low/60 pb-1'
                    }`
                  }
                >
                  <span className="material-symbols-outlined text-[16px]">{link.icon}</span>
                  <span>{link.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Action Cluster: Search, Logout, Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* Desktop Quick Search with Dropdown */}
            <div ref={searchContainerRef} className="hidden md:block relative w-40 lg:w-48 xl:w-56">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-[18px] pointer-events-none">
                    search
                  </span>
                  <input 
                    className="w-full h-9 pl-9 pr-8 text-body-sm font-body-sm bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder-on-surface-variant/60 transition-all" 
                    placeholder="Search doctors or conditions..." 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        if (location.pathname === '/patient/doctors') {
                          navigate('/patient/doctors');
                        }
                      }}
                      className="absolute right-2 text-outline hover:text-on-surface p-0.5 rounded"
                      title="Clear"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              </form>

              {/* Suggestions Dropdown */}
              {isSearchOpen && searchQuery.trim().length >= 1 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-xl overflow-hidden z-50 animate-fade-in">
                  {/* Enter to view all results option */}
                  <div 
                    onClick={handleSearchSubmit}
                    className="px-3.5 py-2.5 bg-primary/5 hover:bg-primary/10 cursor-pointer flex items-center justify-between text-body-xs font-semibold text-primary border-b border-outline-variant/40 transition-colors"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-[16px]">search</span>
                      <span>Search all doctors for "{searchQuery}"</span>
                    </span>
                    <span className="text-[11px] text-outline uppercase font-mono px-1.5 py-0.5 bg-white rounded border border-outline-variant/60 shrink-0">
                      ↵ Enter
                    </span>
                  </div>

                  {/* Loading indicator */}
                  {isSearching && (
                    <div className="p-3 text-center text-body-xs text-on-surface-variant flex items-center justify-center gap-2">
                      <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary border-t-transparent"></span>
                      <span>Searching directory...</span>
                    </div>
                  )}

                  {/* Doctor Results */}
                  {!isSearching && searchResults.length > 0 && (
                    <div className="py-1 max-h-60 overflow-y-auto divide-y divide-outline-variant/30">
                      {searchResults.map((doc) => {
                        const rawFirst = doc.profiles?.first_name || '';
                        const cleanFirst = rawFirst.replace(/^dr\.?\s+/i, '');
                        const docName = `Dr. ${cleanFirst} ${doc.profiles?.last_name || ''}`.trim();
                        return (
                          <div
                            key={doc.id}
                            onClick={() => handleSelectDoctor(doc.id)}
                            className="px-3.5 py-2 hover:bg-surface-container-low cursor-pointer flex items-center gap-2.5 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-label-sm shrink-0 border border-primary/20">
                              {cleanFirst[0] || 'D'}{doc.profiles?.last_name?.[0] || 'R'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-body-sm font-semibold text-on-surface truncate">{docName}</p>
                              <p className="text-label-xs text-primary font-medium truncate">
                                {doc.specializations?.name || 'General Practice'}
                              </p>
                            </div>
                            <span className="material-symbols-outlined text-[16px] text-outline shrink-0">
                              arrow_forward
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Empty state */}
                  {!isSearching && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                    <div className="p-3.5 text-center text-body-xs text-on-surface-variant">
                      <p>No exact doctor matches found.</p>
                      <button 
                        onClick={handleSearchSubmit} 
                        className="text-primary hover:underline font-semibold mt-1"
                      >
                        Search full directory for "{searchQuery}" →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="md:hidden p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
              title="Search"
            >
              <span className="material-symbols-outlined text-[22px]">
                {showMobileSearch ? 'close' : 'search'}
              </span>
            </button>
            
            {/* Logout Icon */}
            <button 
              onClick={handleLogout}
              className="relative p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors" 
              title="Log out"
            >
              <span className="material-symbols-outlined text-[22px]">logout</span>
            </button>

            {/* Patient Profile Pill */}
            <div 
              onClick={() => navigate('/patient/profile')}
              className="flex items-center gap-2 pl-2 border-l border-outline-variant cursor-pointer group"
              title="View Profile Settings"
            >
              <div className="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold ring-2 ring-surface-container text-label-sm group-hover:ring-primary/40 transition-all">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-label-md font-label-md text-on-surface font-semibold leading-tight truncate max-w-[120px] group-hover:text-primary transition-colors">
                  {profile?.first_name} {profile?.last_name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Expandable Bar */}
        {showMobileSearch && (
          <div className="md:hidden px-4 pb-3 pt-1 border-t border-outline-variant/40 bg-surface-container-lowest animate-fade-in">
            <form onSubmit={handleSearchSubmit} className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">search</span>
              <input 
                className="w-full h-10 pl-9 pr-10 text-body-sm font-body-sm bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-surface"
                placeholder="Search doctors or conditions..."
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit" 
                className="absolute right-2 top-1.5 px-2.5 py-1 bg-primary text-on-primary rounded text-label-xs font-semibold"
              >
                Go
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className={`flex-grow w-full ${fullWidth ? '' : 'max-w-[72rem] mx-auto px-6 md:px-12 py-8 space-y-8'}`}>
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
            <span onClick={() => navigate('/patient/doctors')} className="hover:text-primary transition-colors cursor-pointer">Find a Doctor</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-primary transition-colors cursor-pointer">HIPAA Compliance</span>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default PatientLayout;
