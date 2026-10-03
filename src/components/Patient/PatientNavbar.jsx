import React, { useState } from 'react';

const PatientNavbar = ({ currentPage, setCurrentPage, isLoggedIn, currentUser }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (page) => {
    if (setCurrentPage) {
      setCurrentPage(page);
    }
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About Us' },
    { id: 'appointment', label: 'Book Appointment' },
    { id: 'contact', label: 'Contact & Emergency' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all duration-200">
      {/* TOP EMERGENCY TICKER BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white text-[11px] py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 font-medium">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-600/90 text-white font-bold text-[10px] tracking-wide uppercase shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              24/7 Helpline
            </span>
            <span className="text-slate-200">Emergency & Ambulance Dispatch:</span>
            <a href="tel:108" className="font-bold text-teal-300 hover:text-white transition">
              1800-273-9000 / 108
            </a>
          </div>
          <div className="hidden md:flex items-center gap-4 text-slate-300 text-[11px]">
            <span>Multi-Hospital Healthcare Network</span>
            <span>OPD Consultations: Mon - Sat</span>
            <span className="text-amber-300 font-semibold">NABH Accredited</span>
          </div>
        </div>
      </div>

      {/* MAIN NAVBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* BRAND LOGO */}
          <div
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition duration-200">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-slate-900 via-blue-900 to-teal-700 bg-clip-text text-transparent">
                  Hospital Network
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                  HEALTHCARE
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 tracking-wider uppercase hidden sm:block">
                Multi-Branch OPD Portal
              </p>
            </div>
          </div>

          {/* DESKTOP NAV LINKS */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                currentPage === item.id ||
                (item.id === 'home' && (currentPage === 'patient_home' || !currentPage)) ||
                (item.id === 'about' && currentPage === 'patient_about') ||
                (item.id === 'appointment' && (currentPage === 'patient_appointment' || currentPage === 'appoint')) ||
                (item.id === 'contact' && currentPage === 'patient_contact');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* RIGHT ACTION BUTTONS */}
          <div className="hidden sm:flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleNavClick('appointment')}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm shadow-teal-600/20 transition duration-200 cursor-pointer"
            >
              Book OPD Checkup
            </button>

            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => handleNavClick('patient_dashboard')}
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                {currentUser?.name ? `Portal: ${currentUser.name}` : 'My Portal'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNavClick('login')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition cursor-pointer border border-slate-200"
              >
                Sign In / Login
              </button>
            )}
          </div>

          {/* MOBILE HAMBURGER BUTTON */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => handleNavClick('appointment')}
              className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-bold text-[11px] shadow-xs"
            >
              Book OPD
            </button>
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

      {/* MOBILE DROPDOWN MENU */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md px-4 pt-3 pb-5 space-y-2 shadow-lg animate-fadeIn">
          {navItems.map((item) => {
            const isActive =
              currentPage === item.id ||
              (item.id === 'home' && (currentPage === 'patient_home' || !currentPage)) ||
              (item.id === 'about' && currentPage === 'patient_about') ||
              (item.id === 'appointment' && (currentPage === 'patient_appointment' || currentPage === 'appoint')) ||
              (item.id === 'contact' && currentPage === 'patient_contact');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isActive ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => handleNavClick('appointment')}
              className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-xs text-center"
            >
              Book OPD Checkup
            </button>
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => handleNavClick('login')}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 text-center"
              >
                Sign In / Login
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default PatientNavbar;
