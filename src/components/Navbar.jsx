import React, { useState } from 'react';

const Navbar = ({ currentPage, setCurrentPage, isLoggedIn, onLogout, currentUser }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getRoleDetails = (role) => {
    const r = (role || '').toString().toUpperCase();
    if (r.includes('SUPER')) {
      return { label: 'Super Admin', page: 'super_admin_dashboard', color: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-600' };
    }
    if (r.includes('ADMIN')) {
      return { label: 'Admin', page: 'admin_dashboard', color: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-600' };
    }
    if (r.includes('DOCTOR')) {
      return { label: 'Doctor', page: 'doctor_dashboard', color: 'bg-teal-100 text-teal-800 border-teal-200', dot: 'bg-teal-600' };
    }
    if (r.includes('NURSE')) {
      return { label: 'Nurse', page: 'nurse_dashboard', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-600' };
    }
    if (r.includes('RECEPTION')) {
      return { label: 'Receptionist', page: 'receptionist_dashboard', color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-600' };
    }
    if (r.includes('PATIENT')) {
      return { label: 'Patient', page: 'patient_dashboard', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', dot: 'bg-indigo-600' };
    }
    return { label: 'User', page: 'home', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-600' };
  };

  const roleInfo = getRoleDetails(currentUser?.role);

  const handleNavClick = (page) => {
    if (setCurrentPage) {
      setCurrentPage(page);
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    setIsMobileMenuOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="w-full bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 text-slate-100 shadow-lg sticky top-0 z-50 transition-all duration-300">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="flex items-center justify-between h-18 sm:h-20 w-full gap-3">
          <div
            onClick={() => handleNavClick(roleInfo.page)}
            className="flex items-center gap-3.5 cursor-pointer select-none group py-2"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-all duration-200">
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

          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            {isLoggedIn && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavClick(roleInfo.page)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    currentPage === roleInfo.page
                      ? 'bg-slate-800 text-teal-300 border border-teal-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  My Dashboard
                </button>

                {(currentUser?.role || '').toString().toUpperCase().includes('DOCTOR') && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNavClick('doctor_appointments')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        currentPage === 'doctor_schedule'
                          ? 'bg-slate-800 text-teal-300 border border-teal-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      Regular Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('doctor_settings')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                        currentPage === 'doctor_settings'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-400/50 font-bold shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                      }`}
                      title="Doctor Profile & Settings"
                    >
                      <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Settings</span>
                    </button>
                  </>
                )}

                {(currentUser?.role || '').toString().toUpperCase().includes('NURSE') && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNavClick('nurse_patients')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                        currentPage === 'nurse_patients'
                          ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      Inpatients & Vitals
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('nurse_settings')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                        currentPage === 'nurse_settings'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                      }`}
                      title="Nurse Profile & Settings"
                    >
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Settings</span>
                    </button>
                  </>
                )}

                {(currentUser?.role || '').toString().toUpperCase().includes('RECEPTION') && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNavClick('receptionist_doctors')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        currentPage === 'receptionist_doctors'
                          ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      Doctors & OPD
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('receptionist_patients')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
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
                      onClick={() => handleNavClick('receptionist_settings')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                        currentPage === 'receptionist_settings'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 font-bold shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                      }`}
                      title="Front Desk Profile & Settings"
                    >
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Settings</span>
                    </button>
                  </>
                )}

                {((currentUser?.role || '').toString().toUpperCase().includes('ADMIN') && !(currentUser?.role || '').toString().toUpperCase().includes('SUPER')) && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNavClick('admin_doctors')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        currentPage === 'admin_hospital_management'
                          ? 'bg-slate-800 text-teal-300 border border-teal-500/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      Hospital Management
                    </button>
                  </>
                )}

                {/* User badge */}

                <div className="flex items-center gap-2.5 pl-3 border-l border-slate-700">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-inner shrink-0">
                    {getInitials(currentUser?.name)}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[130px]">
                      {currentUser?.name || 'User'}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleInfo.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot}`}></span>
                        {roleInfo.label}
                      </span>
                      {(currentUser?.hospital_name || currentUser?.hospital_data?.Name) && (
                        <span className="text-[10px] font-semibold text-teal-300 truncate max-w-[90px]" title={currentUser?.hospital_name || currentUser?.hospital_data?.Name}>
                          {currentUser?.hospital_name || currentUser?.hospital_data?.Name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition duration-150 cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </>
            )}
          </div>

          <div className="flex md:hidden">
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
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-4 space-y-2.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
              {getInitials(currentUser?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-100 truncate">{currentUser?.name || 'User'}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleInfo.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot}`}></span>
                  {roleInfo.label}
                </span>
                {(currentUser?.hospital_name || currentUser?.hospital_data?.Name) && (
                  <span className="text-[10px] font-semibold text-teal-300">
                    {currentUser?.hospital_name || currentUser?.hospital_data?.Name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleNavClick(roleInfo.page)}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
              currentPage === roleInfo.page ? 'bg-slate-800 text-teal-300 border border-teal-500/30' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            My Dashboard
          </button>

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
              <button
                type="button"
                onClick={() => handleNavClick('doctor_settings')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                  currentPage === 'doctor_settings' ? 'bg-teal-500/20 text-teal-300 border border-teal-400/50 font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Doctor Settings & Profile</span>
              </button>
            </>
          )}

          {(currentUser?.role || '').toString().toUpperCase().includes('NURSE') && (
            <>
              <button
                type="button"
                onClick={() => handleNavClick('nurse_patients')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                  currentPage === 'nurse_patients' ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Inpatients & Vitals Chart
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('nurse_settings')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                  currentPage === 'nurse_settings' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Nurse Settings & Profile</span>
              </button>
            </>
          )}

          {(currentUser?.role || '').toString().toUpperCase().includes('RECEPTION') && (
            <>
              <button
                type="button"
                onClick={() => handleNavClick('receptionist_doctors')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                  currentPage === 'receptionist_doctors' ? 'bg-slate-800 text-amber-300 border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Doctors & OPD Schedule
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
                onClick={() => handleNavClick('receptionist_settings')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                  currentPage === 'receptionist_settings' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Front Desk Settings</span>
              </button>
            </>
          )}

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

          {/* Mobile menu bottom */}

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