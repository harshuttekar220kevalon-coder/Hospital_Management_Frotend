import React, { useState, useRef, useEffect } from 'react';

const PatientNavbar = ({ currentPage, setCurrentPage, isLoggedIn, onLogout, currentUser }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (page) => {
    if (setCurrentPage) {
      setCurrentPage(page);
    }
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  };

  const isPatientLoggedIn = Boolean(isLoggedIn);

  // Clean, focused navigation links without duplicate settings
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'about',
      label: 'About Us',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'contact',
      label: 'Contact & Emergency',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    },
    ...(isPatientLoggedIn ? [
      {
        id: 'patient_dashboard',
        label: 'My Dashboard',
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      }
    ] : [])
  ];

  const getInitials = (name) => {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isNavActive = (itemId) => {
    if (currentPage === itemId) return true;
    if (itemId === 'home' && (currentPage === 'patient_home' || currentPage === 'home' || !currentPage)) return true;
    if (itemId === 'about' && currentPage === 'patient_about') return true;
    if (itemId === 'contact' && currentPage === 'patient_contact') return true;
    if (itemId === 'patient_dashboard' && currentPage === 'patient_dashboard') return true;
    return false;
  };

  const uhidDisplay = currentUser?.patient_id || currentUser?.uhid || (currentUser?.id ? `PAT-${currentUser.id}` : 'PAT-01');

  return (
    <header className="w-full sticky top-0 z-50 bg-white/98 backdrop-blur-md border-b border-slate-200 shadow-2xs select-none">
      {/* 1. TOP ANNOUNCEMENT & EMERGENCY TICKER BAR */}
      <div className="w-full bg-slate-900 text-white text-xs py-1.5 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px]">
          {/* Left: Emergency */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[10px] tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              24/7 Emergency
            </span>
            <span className="text-slate-300 hidden md:inline">Ambulance & Trauma Helpline:</span>
            <a
              href="tel:18002739000"
              className="font-bold text-teal-300 hover:text-white transition inline-flex items-center gap-1"
            >
              📞 1800-273-9000 / 108
            </a>
          </div>

          {/* Right: Status */}
          <div className="hidden md:flex items-center gap-4 text-slate-300">
            <span>• OPD Open (8 AM - 8 PM)</span>
            <span>• Cashless Insurance</span>
            <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30 text-[10px]">
              NABH Accredited
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-17 gap-3">
          
          {/* BRAND LOGO */}
          <div
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-teal-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:scale-105 transition duration-150">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  Apex Care
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 font-extrabold text-[10px] border border-teal-200">
                  HOSPITAL
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 hidden sm:block">
                Multi-Speciality Healthcare
              </p>
            </div>
          </div>

          {/* CENTER NAVIGATION LINKS */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
            {navItems.map((item) => {
              const active = isNavActive(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    active
                      ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200 shadow-2xs'
                      : 'text-slate-600 hover:text-teal-700 hover:bg-slate-100'
                  }`}
                >
                  <span className={active ? 'text-teal-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.id === 'patient_dashboard' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* RIGHT ACTION BUTTONS & USER PROFILE */}
          <div className="hidden sm:flex items-center gap-2 lg:gap-3 shrink-0">
            {/* Book Appointment CTA Button */}
            <button
              type="button"
              onClick={() => handleNavClick('appointment')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition duration-150 cursor-pointer flex items-center gap-1.5 shadow-sm whitespace-nowrap ${
                currentPage === 'appointment' || currentPage === 'appoint' || currentPage === 'patient_appointment'
                  ? 'bg-teal-700 text-white shadow-teal-700/25 ring-2 ring-teal-600/30'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Book Appointment</span>
            </button>

            {isPatientLoggedIn ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
                {/* User Profile & Settings Button */}
                <button
                  type="button"
                  onClick={() => handleNavClick('patient_setting')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                    currentPage === 'patient_setting'
                      ? 'bg-teal-50 text-teal-900 border-teal-300 ring-1 ring-teal-300 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title="Patient Profile & Settings"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white font-bold flex items-center justify-center text-[10px] shadow-2xs shrink-0">
                    {getInitials(currentUser?.name)}
                  </div>
                  <div className="text-left leading-tight hidden lg:block">
                    <p className="truncate max-w-[100px] font-bold text-slate-800 text-xs">
                      {currentUser?.name || 'Patient'}
                    </p>
                    <p className="text-[10px] font-mono text-teal-700 font-semibold">
                      {uhidDisplay}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400">⚙️</span>
                </button>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
                  title="Logout Account"
                >
                  <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => handleNavClick('login')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('signin')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition cursor-pointer"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* MOBILE RESPONSIVE HAMBURGER & QUICK ACTIONS */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => handleNavClick('appointment')}
              className="px-2.5 py-1.5 rounded-lg bg-teal-600 text-white font-bold text-xs shadow-xs"
            >
              Book
            </button>

            {isPatientLoggedIn ? (
              <button
                type="button"
                onClick={handleLogoutClick}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold"
                title="Logout"
              >
                Logout
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNavClick('login')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold"
              >
                Login
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* 3. MOBILE DROPDOWN DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg animate-fadeIn">
          {isPatientLoggedIn && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {getInitials(currentUser?.name)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser?.name || 'Patient'}
                  </p>
                  <p className="text-[10px] text-teal-700 font-mono font-semibold">
                    {uhidDisplay}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleNavClick('patient_setting')}
                className="px-2.5 py-1 bg-white text-teal-800 border border-teal-200 rounded-lg text-xs font-bold"
              >
                Settings
              </button>
            </div>
          )}

          {navItems.map((item) => {
            const active = isNavActive(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                  active ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={active ? 'text-teal-600' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.id === 'patient_dashboard' && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold">Portal</span>
                )}
              </button>
            );
          })}

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => handleNavClick('appointment')}
              className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-xs text-center flex items-center justify-center gap-1.5"
            >
              <span>Book Appointment</span>
            </button>
            {!isPatientLoggedIn && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleNavClick('login')}
                  className="py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs text-center"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('signin')}
                  className="py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 text-center"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default PatientNavbar;
