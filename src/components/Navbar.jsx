import React, { useState, useRef, useEffect } from 'react';

const Navbar = ({ currentPage, setCurrentPage, isLoggedIn, onLogout, currentUser }) => {
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

  const getRoleDetails = (role) => {
    const r = (role || '').toString().toUpperCase();
    if (r.includes('SUPER')) {
      return {
        label: currentUser?.role || 'Super Admin',
        page: 'super_admin_dashboard',
        settingsPage: 'super_admin_dashboard',
        code: currentUser?.id ? `SA-${currentUser.id}` : 'SUPER-ADMIN',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        dot: 'bg-purple-600',
        gradient: 'from-purple-500 via-indigo-500 to-teal-400'
      };
    }
    if (r.includes('ADMIN')) {
      return {
        label: currentUser?.role || 'Admin',
        page: 'admin_dashboard',
        settingsPage: 'admin_settings',
        code: currentUser?.admin_id || (currentUser?.id ? `ADM-${currentUser.id}` : 'ADM-01'),
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        dot: 'bg-blue-600',
        gradient: 'from-teal-500 via-emerald-500 to-cyan-500'
      };
    }
    if (r.includes('DOCTOR')) {
      return {
        label: currentUser?.role || 'Doctor',
        page: 'doctor_dashboard',
        settingsPage: 'doctor_settings',
        code: currentUser?.doctor_id || (currentUser?.id ? `DOC-${currentUser.id}` : 'DOC-01'),
        color: 'bg-teal-100 text-teal-800 border-teal-200',
        dot: 'bg-teal-600',
        gradient: 'from-teal-500 via-cyan-500 to-blue-600'
      };
    }
    if (r.includes('NURSE')) {
      return {
        label: currentUser?.role || 'Nurse',
        page: 'nurse_dashboard',
        settingsPage: 'nurse_settings',
        code: currentUser?.nurse_id || (currentUser?.id ? `NUR-${currentUser.id}` : 'NUR-01'),
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-600',
        gradient: 'from-emerald-500 via-teal-500 to-cyan-600'
      };
    }
    if (r.includes('RECEPTION')) {
      return {
        label: currentUser?.role || 'Receptionist',
        page: 'receptionist_dashboard',
        settingsPage: 'receptionist_settings',
        code: currentUser?.receptionist_id || (currentUser?.id ? `REC-${currentUser.id}` : 'REC-01'),
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-600',
        gradient: 'from-amber-500 via-orange-500 to-rose-500'
      };
    }
    if (r.includes('PATIENT')) {
      return {
        label: currentUser?.role || 'Patient',
        page: 'patient_dashboard',
        settingsPage: 'patient_setting',
        code: currentUser?.patient_id || (currentUser?.id ? `PAT-${currentUser.id}` : 'PAT-01'),
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        dot: 'bg-indigo-600',
        gradient: 'from-cyan-500 via-teal-500 to-blue-600'
      };
    }
    return {
      label: currentUser?.role || '',
      page: 'home',
      settingsPage: 'home',
      code: 'USER',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-600',
      gradient: 'from-slate-600 to-slate-800'
    };
  };

  const roleInfo = getRoleDetails(currentUser?.role);

  const handleNavClick = (page) => {
    if (setCurrentPage) {
      setCurrentPage(page);
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
    if (!name) return 'US';
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

  const displayName = currentUser?.name || currentUser?.patient_name || 'Staff User';

  return (
    <header className="w-full bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 text-slate-100 shadow-lg sticky top-0 z-50 transition-all duration-300 overflow-visible">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="flex items-center justify-between h-18 sm:h-20 w-full gap-3">
          <div
            onClick={() => handleNavClick(roleInfo.page)}
            className="flex items-center gap-3.5 cursor-pointer select-none group py-2 shrink-0"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-all duration-200 shrink-0">
              <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <span className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-blue-200 via-teal-300 to-white bg-clip-text text-transparent truncate block max-w-[220px] xs:max-w-none tracking-tight">
                Apex Care Hospital
              </span>
              <span className="hidden sm:block text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                Healthcare Management System
              </span>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-2 lg:gap-3 flex-1 justify-center min-w-0 px-2">
            {isLoggedIn && (
              <>
                {/* Doctor Navigation (NO Dashboard or Settings in top tabs) */}
                {(currentUser?.role || '').toString().toUpperCase().includes('DOCTOR') && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNavClick('doctor_appointments')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                        currentPage === 'doctor_appointments'
                          ? 'bg-slate-800 text-rose-300 border border-rose-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      Emergency & Special
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('doctor_patients')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                        currentPage === 'doctor_patients'
                          ? 'bg-slate-800 text-teal-300 border border-teal-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      Patients Queue
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('doctor_schedule')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                        currentPage === 'doctor_schedule'
                          ? 'bg-slate-800 text-teal-300 border border-teal-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      Regular Schedule
                    </button>
                  </>
                )}

                {/* Nurse Navigation (NO Dashboard or Settings in top tabs) */}
                {(currentUser?.role || '').toString().toUpperCase().includes('NURSE') && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNavClick('nurse_patients')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                        currentPage === 'nurse_patients'
                          ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      Patient
                    </button>
                  </>
                )}

                {/* Receptionist Navigation (NO Dashboard or Settings in top tabs) */}
                {(currentUser?.role || '').toString().toUpperCase().includes('RECEPTION') && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNavClick('receptionist_appointments')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                        currentPage === 'receptionist_appointments' || currentPage === 'receptionist_appoiment'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 font-bold shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Appointments</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('receptionist_doctors')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                        currentPage === 'receptionist_doctors'
                          ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      Doctors
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('receptionist_nurses')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                        currentPage === 'receptionist_nurses' || currentPage === 'receptionist_nurse'
                          ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      Nurses
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('receptionist_patients')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                        currentPage === 'receptionist_patients' || currentPage === 'receptionist_patient_details'
                          ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      Patient Admissions
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('receptionist_anassine')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                        currentPage === 'receptionist_anassine' || currentPage === 'receptionist_unassigned'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 font-bold shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                      title="Unassigned Patients Queue & Triage"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      <span>Unassigned Patients</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('receptionist_billing')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                        currentPage === 'receptionist_billing' || currentPage === 'billing'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                      title="Discharged Patients Billing & Clearance"
                    >
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m0 0l-6-6m6 6H3" />
                      </svg>
                      <span>Discharge Billing</span>
                    </button>
                  </>
                )}

                {/* Admin Fallback Navigation */}
                {((currentUser?.role || '').toString().toUpperCase().includes('ADMIN') && !(currentUser?.role || '').toString().toUpperCase().includes('SUPER')) && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNavClick('admin_doctors')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                        currentPage === 'admin_doctors' || currentPage === 'admin_doctor_details'
                          ? 'bg-slate-800 text-teal-300 border border-teal-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      Doctors
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('admin_hospital_management')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                        currentPage === 'admin_hospital_management'
                          ? 'bg-slate-800 text-teal-300 border border-teal-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      Hospital Management
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Right Side: Profile Dropdown Pill */}
          {isLoggedIn && (
            <div className="hidden xl:flex items-center gap-2 lg:gap-3 shrink-0 relative" ref={dropdownRef}>
              <div
                className="relative"
                onMouseEnter={() => setProfileDropdownOpen(true)}
                onMouseLeave={() => setProfileDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all duration-150 flex items-center gap-2.5 cursor-pointer border select-none ${
                    currentPage === roleInfo.page || currentPage === roleInfo.settingsPage
                      ? 'bg-slate-800 text-teal-200 border-teal-500/50 ring-2 ring-teal-500/20 shadow-xs'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border-slate-700/70 hover:border-slate-600 shadow-xs'
                  }`}
                >
                  <div className={`w-7 h-7 xl:w-8 xl:h-8 rounded-full bg-gradient-to-br ${roleInfo.gradient} text-white font-bold flex items-center justify-center text-xs shadow-inner ring-1 ring-white/20 shrink-0`}>
                    {getInitials(displayName)}
                  </div>
                  <div className="flex flex-col text-left leading-tight hidden sm:flex">
                    <span className="text-xs font-bold text-slate-100 truncate max-w-[130px]">
                      {displayName}
                    </span>
                    <span className="text-[10px] font-semibold text-teal-300 tracking-tight">
                      {roleInfo.label || 'Staff'}
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
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roleInfo.gradient} text-white font-bold flex items-center justify-center text-xs shadow-inner shrink-0`}>
                            {getInitials(displayName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-white truncate">{displayName}</p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-300 mt-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot} animate-pulse`}></span>
                              {roleInfo.label} Portal
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Role Dashboard Option */}
                      <button
                        type="button"
                        onClick={() => handleNavClick(roleInfo.page)}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                          currentPage === roleInfo.page
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                            : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center text-xs shrink-0">📊</span>
                        <div>
                          <p className="font-bold text-xs">My Dashboard</p>
                          <p className="text-[10px] text-slate-400 font-normal">Overview & active metrics</p>
                        </div>
                      </button>

                      {/* Role Profile Option */}
                      <button
                        type="button"
                        onClick={() => handleNavClick(roleInfo.settingsPage)}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                          currentPage === roleInfo.settingsPage
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                            : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-xs shrink-0">👤</span>
                        <div>
                          <p className="font-bold text-xs">Profile</p>
                          <p className="text-[10px] text-slate-400 font-normal">Account profile & preferences</p>
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
          )}

          <div className="flex xl:hidden items-center gap-2">
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => handleNavClick(roleInfo.page)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs"
              >
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${roleInfo.gradient} text-white font-bold flex items-center justify-center text-[10px]`}>
                  {getInitials(displayName)}
                </div>
                <span className="text-xs font-bold text-slate-200 hidden sm:inline">{displayName}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && isLoggedIn && (
        <div className="xl:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-4 space-y-2.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
            <div
              onClick={() => handleNavClick(roleInfo.page)}
              className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
            >
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roleInfo.gradient} text-white font-bold flex items-center justify-center text-xs shrink-0`}>
                {getInitials(displayName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-100 truncate">{displayName}</p>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleInfo.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot}`}></span>
                    {displayCode} • {roleInfo.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleNavClick(roleInfo.settingsPage)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-teal-300 border border-slate-600 hover:bg-slate-600 shrink-0 ml-2"
            >
              Profile
            </button>
          </div>

          {/* Doctor Mobile */}
          {(currentUser?.role || '').toString().toUpperCase().includes('DOCTOR') && (
            <>
              <button
                type="button"
                onClick={() => handleNavClick('doctor_appointments')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                  currentPage === 'doctor_appointments' ? 'bg-slate-800 text-rose-300 border border-rose-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Emergency & Special
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('doctor_patients')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                  currentPage === 'doctor_patients' ? 'bg-slate-800 text-teal-300 border border-teal-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Patients Queue
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('doctor_schedule')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                  currentPage === 'doctor_schedule' ? 'bg-slate-800 text-teal-300 border border-teal-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Regular Schedule
              </button>
            </>
          )}

          {/* Nurse Mobile */}
          {(currentUser?.role || '').toString().toUpperCase().includes('NURSE') && (
            <>
              <button
                type="button"
                onClick={() => handleNavClick('nurse_patients')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                  currentPage === 'nurse_patients' ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Patient
              </button>
            </>
          )}

          {/* Receptionist Mobile */}
          {(currentUser?.role || '').toString().toUpperCase().includes('RECEPTION') && (
            <>
              <button
                type="button"
                onClick={() => handleNavClick('receptionist_appointments')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                  currentPage === 'receptionist_appointments' || currentPage === 'receptionist_appoiment'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Appointments</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('receptionist_doctors')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                  currentPage === 'receptionist_doctors' ? 'bg-slate-800 text-amber-300 border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Doctors
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('receptionist_nurses')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                  currentPage === 'receptionist_nurses' || currentPage === 'receptionist_nurse' ? 'bg-slate-800 text-amber-300 border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Nurses
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('receptionist_patients')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                  currentPage === 'receptionist_patients' || currentPage === 'receptionist_patient_details' ? 'bg-slate-800 text-amber-300 border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Patient Admissions
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('receptionist_anassine')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                  currentPage === 'receptionist_anassine' || currentPage === 'receptionist_unassigned' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>Unassigned Patients Queue</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('receptionist_billing')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                  currentPage === 'receptionist_billing' || currentPage === 'billing' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m0 0l-6-6m6 6H3" />
                </svg>
                <span>Discharge Billing & Invoices</span>
              </button>
            </>
          )}

          {/* Admin Mobile */}
          {((currentUser?.role || '').toString().toUpperCase().includes('ADMIN') && !(currentUser?.role || '').toString().toUpperCase().includes('SUPER')) && (
            <>
              <button
                type="button"
                onClick={() => handleNavClick('admin_doctors')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                  currentPage === 'admin_doctors' || currentPage === 'admin_doctor_details' ? 'bg-slate-800 text-teal-300 border border-teal-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Doctors
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('admin_hospital_management')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                  currentPage === 'admin_hospital_management' ? 'bg-slate-800 text-teal-300 border border-teal-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Hospital Management
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleLogoutClick}
            className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 flex items-center gap-2 border border-rose-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      )}
    </header>
  );
};

export default Navbar;
