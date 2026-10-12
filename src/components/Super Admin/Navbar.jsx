import React, { useState, useRef, useEffect } from 'react';

const SuperAdminNavbar = ({ currentPage, setCurrentPage, onLogout, currentUser }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    {
      id: 'super_admin_hospitals',
      label: 'Hospital Branches',
      matchPages: ['super_admin_hospitals', 'hospital_details'],
      activeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/40 font-bold shadow-xs'
    },
    {
      id: 'super_admin_admins',
      label: 'Admins',
      matchPages: ['super_admin_admins', 'admin_details'],
      activeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/40 font-bold shadow-xs'
    },
    {
      id: 'super_admin_doctors',
      label: 'Doctors',
      matchPages: ['super_admin_doctors', 'doctor_details'],
      activeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/40 font-bold shadow-xs'
    },
    {
      id: 'super_admin_nurses',
      label: 'Nurses',
      matchPages: ['super_admin_nurses', 'nurse_details'],
      activeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/40 font-bold shadow-xs'
    },
    {
      id: 'super_admin_receptionists',
      label: 'Receptionists',
      matchPages: ['super_admin_receptionists', 'receptionist_details'],
      activeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/40 font-bold shadow-xs'
    },
    {
      id: 'super_admin_appointments',
      label: 'Appointments',
      matchPages: ['super_admin_appointments', 'super_admin_appointment_details', 'appointment_details'],
      activeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/40 font-bold shadow-xs'
    },
    {
      id: 'super_admin_patients',
      label: 'Patients',
      matchPages: ['super_admin_patients', 'patient_details'],
      activeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/40 font-bold shadow-xs'
    }
  ];

  const handleNavClick = (pageId) => {
    if (setCurrentPage) {
      setCurrentPage(pageId);
    }
    setIsMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    setIsMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return 'SA';
    const clean = name.replace(/^mr\.?\s*|^ms\.?\s*|^mrs\.?\s*|^dr\.?\s*/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (clean.length >= 2) {
      return clean.slice(0, 2).toUpperCase();
    }
    return clean.toUpperCase();
  };

  const displayName = currentUser?.name || 'Super Admin';

  const isTabActive = (item) => {
    if (item.matchPages) {
      return item.matchPages.includes(currentPage);
    }
    return currentPage === item.id;
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md sticky top-0 z-50 w-full overflow-visible">
      <div className="w-full px-4 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16 gap-2 lg:gap-4 xl:gap-6">
          
          <div
            onClick={() => handleNavClick('super_admin_dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-teal-400 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0">
              AC
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base xl:text-lg font-bold bg-gradient-to-r from-purple-300 via-indigo-200 to-white bg-clip-text text-transparent leading-none">
                  Apex Care
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 leading-none">
                  HQ
                </span>
              </div>
              <span className="hidden 2xl:block text-[9px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">
                Super Admin Central
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 2xl:gap-3 flex-1 justify-center min-w-0 px-2">
            {navItems.map((item) => {
              const active = isTabActive(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-lg text-[11px] xl:text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap border shrink-0 ${
                    active
                      ? `${item.activeClass}`
                      : 'text-slate-300 border-transparent hover:text-white hover:bg-slate-800/80 hover:border-slate-700/50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Profile Dropdown Pill */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0 relative" ref={dropdownRef}>
            <div
              className="relative"
              onMouseEnter={() => setProfileDropdownOpen(true)}
              onMouseLeave={() => setProfileDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all duration-150 flex items-center gap-2.5 cursor-pointer border select-none ${
                  currentPage === 'super_admin_dashboard'
                    ? 'bg-purple-900/40 text-purple-200 border-purple-500/50 ring-2 ring-purple-500/20 shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border-slate-700/70 hover:border-slate-600 shadow-xs'
                }`}
              >
                <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-teal-400 text-white font-bold flex items-center justify-center text-xs shadow-inner ring-1 ring-white/20 shrink-0">
                  {getInitials(displayName)}
                </div>
                <div className="flex flex-col text-left leading-tight hidden sm:flex">
                  <span className="text-xs font-bold text-slate-100 truncate max-w-[130px]">
                    {displayName}
                  </span>
                  <span className="text-[10px] font-semibold text-purple-300 tracking-tight">
                    Super Admin
                  </span>
                </div>
              </button>

              {/* FLOATING PROFILE DROPDOWN */}
              {profileDropdownOpen && (
                <div className="absolute right-0 top-full pt-2 w-64 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-2 space-y-1.5 text-slate-100 backdrop-blur-xl">
                    {/* User Card Header */}
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-teal-400 text-white font-bold flex items-center justify-center text-xs shadow-inner shrink-0">
                          {getInitials(displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-white truncate">{displayName}</p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-300 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                            Super Admin Central HQ
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* HQ Dashboard Option */}
                    <button
                      type="button"
                      onClick={() => handleNavClick('super_admin_dashboard')}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                        currentPage === 'super_admin_dashboard'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs shrink-0">📊</span>
                      <div>
                        <p className="font-bold text-xs">HQ Dashboard</p>
                        <p className="text-[10px] text-slate-400 font-normal">Analytics, stats & master controls</p>
                      </div>
                    </button>

                    {/* Admins Directory */}
                    <button
                      type="button"
                      onClick={() => handleNavClick('super_admin_admins')}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                        currentPage === 'super_admin_admins' || currentPage === 'admin_details'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-xs shrink-0">👥</span>
                      <div>
                        <p className="font-bold text-xs">Branch Admins</p>
                        <p className="text-[10px] text-slate-400 font-normal">Manage hospital branch admins</p>
                      </div>
                    </button>

                    <div className="border-t border-slate-800 my-1"></div>

                    {/* Sign Out */}
                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center text-xs shrink-0">🚪</span>
                      <span>Logout Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => handleNavClick('super_admin_dashboard')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white font-bold flex items-center justify-center text-[10px]">
                {getInitials(displayName)}
              </div>
              <span className="text-xs font-bold text-slate-200 hidden sm:inline">{displayName}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 focus:outline-none cursor-pointer border border-slate-700/60 transition"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-5 space-y-2 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 mb-3">
            <div
              onClick={() => handleNavClick('super_admin_dashboard')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-inner">
                {getInitials(displayName)}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">{displayName}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  {roleCode} • Dashboard
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogoutClick}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 cursor-pointer hover:bg-rose-500/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const active = isTabActive(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition duration-150 border cursor-pointer ${
                    active
                      ? `${item.activeClass}`
                      : 'text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && (
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

export default SuperAdminNavbar;
