import React, { useState } from 'react';

const AdminNavbar = ({ currentPage, setCurrentPage, onLogout, currentUser }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    {
      id: 'admin_dashboard',
      label: 'Dashboard',
      activeClass: 'bg-teal-500/20 text-teal-300 border-teal-400/40 font-bold shadow-xs'
    },
    {
      id: 'admin_doctors',
      label: 'Doctors',
      matchPages: ['admin_doctors', 'admin_doctor_details'],
      activeClass: 'bg-teal-500/20 text-teal-300 border-teal-400/40 font-bold shadow-xs'
    },
    {
      id: 'admin_nurses',
      label: 'Nurses',
      matchPages: ['admin_nurses', 'admin_nurse_details'],
      activeClass: 'bg-teal-500/20 text-teal-300 border-teal-400/40 font-bold shadow-xs'
    },
    {
      id: 'admin_receptionists',
      label: 'Receptionists',
      matchPages: ['admin_receptionists', 'admin_receptionist_details'],
      activeClass: 'bg-teal-500/20 text-teal-300 border-teal-400/40 font-bold shadow-xs'
    },
    {
      id: 'admin_patients',
      label: 'Patients',
      matchPages: ['admin_patients', 'admin_patient_details'],
      activeClass: 'bg-teal-500/20 text-teal-300 border-teal-400/40 font-bold shadow-xs'
    },
    {
      id: 'admin_hospital_management',
      label: 'Hospital Management',
      matchPages: ['admin_hospital_management'],
      activeClass: 'bg-teal-500/20 text-teal-300 border-teal-400/40 font-bold shadow-xs'
    }
  ];

  const handleNavClick = (pageId) => {
    if (setCurrentPage) {
      setCurrentPage(pageId);
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
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = currentUser?.name || 'Admin';

  const isTabActive = (item) => {
    if (item.matchPages) {
      return item.matchPages.includes(currentPage);
    }
    return currentPage === item.id;
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md sticky top-0 z-50 w-full overflow-x-hidden">
      <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between h-16 gap-2 lg:gap-3 xl:gap-6">
          
          {/* Logo / Branding */}
          <div
            onClick={() => handleNavClick('admin_dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-cyan-500 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0">
              AC
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base xl:text-lg font-bold bg-gradient-to-r from-teal-300 via-emerald-200 to-white bg-clip-text text-transparent leading-none">
                  Apex Care
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 leading-none">
                  Admin
                </span>
              </div>
              <span className="hidden 2xl:block text-[9px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">
                Hospital Administrator
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2 flex-1 justify-center min-w-0 max-w-3xl px-1">
            {navItems.map((item) => {
              const active = isTabActive(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap border shrink-0 ${
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

          {/* User Profile & Logout */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
            <div className="flex items-center gap-2 pl-2.5 py-1 pr-2.5 rounded-xl bg-slate-800/60 border border-slate-700/70">
              <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-lg bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-500 text-white font-bold flex items-center justify-center text-xs shadow-inner ring-1 ring-white/20 shrink-0">
                {getInitials(displayName)}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-100 leading-tight truncate max-w-[120px] xl:max-w-none">
                  {displayName}
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] xl:text-[10px] font-semibold text-teal-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  Hospital Admin
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogoutClick}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 border border-rose-500/30 transition-all duration-150 cursor-pointer shadow-xs shrink-0"
              title="Sign out of Admin Portal"
            >
              Logout
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-emerald-500 text-white font-bold flex items-center justify-center text-[10px]">
                {getInitials(displayName)}
              </div>
              <span className="text-xs font-bold text-slate-200 hidden sm:inline">{displayName}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 focus:outline-none cursor-pointer border border-slate-700/60 transition text-xs font-bold"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? 'Close' : 'Menu'}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-5 space-y-2 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white font-bold flex items-center justify-center text-xs shadow-inner">
                {getInitials(displayName)}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">{displayName}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  Hospital Admin
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogoutClick}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 cursor-pointer hover:bg-rose-500/20"
            >
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

export default AdminNavbar;
