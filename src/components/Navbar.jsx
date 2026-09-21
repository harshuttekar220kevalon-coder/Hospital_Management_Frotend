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
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div
            onClick={() => handleNavClick(roleInfo.page)}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center text-white shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-300 via-teal-300 to-white bg-clip-text text-transparent truncate block max-w-[200px] xs:max-w-none">
                Apex Care Hospital
              </span>
              <span className="hidden sm:block text-[10px] font-medium text-slate-400 tracking-wider uppercase">
                Healthcare Management System
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
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

                {(currentUser?.role || '').toString().toUpperCase().includes('SUPER') && (
                  <button
                    type="button"
                    onClick={() => handleNavClick('super_admin_hospitals')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                      currentPage === 'super_admin_hospitals'
                        ? 'bg-purple-900/90 text-purple-200 border border-purple-400/40 shadow-xs'
                        : 'text-purple-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    🏥 Hospital Branches
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleNavClick('home')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    currentPage === 'home'
                      ? 'bg-slate-800 text-blue-300 border border-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Hospital Overview
                </button>

                <div className="flex items-center gap-2.5 pl-3 border-l border-slate-700">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-inner">
                    {getInitials(currentUser?.name)}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-200 leading-tight">
                      {currentUser?.name || 'User'}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleInfo.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot}`}></span>
                        {roleInfo.label}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition duration-150 cursor-pointer flex items-center gap-1.5"
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
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-4 space-y-3 shadow-lg">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white font-bold flex items-center justify-center text-xs">
              {getInitials(currentUser?.name)}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-100">{currentUser?.name || 'User'}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border mt-0.5 ${roleInfo.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot}`}></span>
                {roleInfo.label}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleNavClick(roleInfo.page)}
            className={`w-full text-left px-4 py-2 rounded-lg text-xs font-semibold ${
              currentPage === roleInfo.page ? 'bg-slate-800 text-teal-300' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            My Dashboard
          </button>

          {(currentUser?.role || '').toString().toUpperCase().includes('SUPER') && (
            <button
              type="button"
              onClick={() => handleNavClick('super_admin_hospitals')}
              className={`w-full text-left px-4 py-2 rounded-lg text-xs font-semibold ${
                currentPage === 'super_admin_hospitals' ? 'bg-purple-900/80 text-purple-200' : 'text-purple-300 hover:bg-slate-800'
              }`}
            >
              🏥 Hospital Branches
            </button>
          )}

          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className={`w-full text-left px-4 py-2 rounded-lg text-xs font-semibold ${
              currentPage === 'home' ? 'bg-slate-800 text-blue-300' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Hospital Overview
          </button>

          <button
            type="button"
            onClick={handleLogoutClick}
            className="w-full text-left px-4 py-2 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 flex items-center gap-2"
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