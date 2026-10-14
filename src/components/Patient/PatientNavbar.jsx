import { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';
import NotificationBell from '../Common/NotificationBell';

const PatientNavbar = ({ currentPage, setCurrentPage, isLoggedIn, onLogout, currentUser }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [livePatient, setLivePatient] = useState(null);
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

  // Fetch live patient ID / UHID from backend (Patients table & Appointments table)
  useEffect(() => {
    let isMounted = true;
    const fetchLivePatientInfo = async () => {
      if (!isLoggedIn) return;
      try {
        const email = (currentUser?.email || '').toLowerCase().trim();
        const contact = (currentUser?.contact || currentUser?.phone || '').trim();
        const patId = currentUser?.id;
        const patName = (currentUser?.name || currentUser?.patient_name || '').toLowerCase().trim();
        const userUhid = (currentUser?.patient_id || currentUser?.uhid || '').toLowerCase().trim();

        const [patRes, apptRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/super-admin/Patients/`),
          fetch(`${API_BASE_URL}/super-admin/appointments/`)
        ]);

        let patList = [];
        let apptList = [];
        if (patRes.status === 'fulfilled' && patRes.value?.ok) patList = await patRes.value.json().catch(() => []);
        if (apptRes.status === 'fulfilled' && apptRes.value?.ok) apptList = await apptRes.value.json().catch(() => []);

        let matched = null;
        if (Array.isArray(patList) && patList.length > 0) {
          if (email) {
            matched = patList.find(p => (p.email || '').toLowerCase().trim() === email);
          }
          if (!matched && userUhid) {
            matched = patList.find(p => (p.patient_id || p.uhid || '').toLowerCase().trim() === userUhid);
          }
          if (!matched && patId && !isNaN(Number(patId)) && Number(patId) > 0) {
            matched = patList.find(p => Number(p.id) === Number(patId));
          }
          if (!matched && contact && contact.replace(/\D/g, '').length >= 10) {
            const cleanDigits = contact.replace(/\D/g, '');
            matched = patList.find(p => (p.contact || p.phone || '').replace(/\D/g, '') === cleanDigits);
          }
        }

        let matchedAppt = null;
        if (!matched && Array.isArray(apptList) && apptList.length > 0) {
          if (email) {
            matchedAppt = apptList.find(a => (a.email || '').toLowerCase().trim() === email);
          }
          if (!matchedAppt && userUhid) {
            matchedAppt = apptList.find(a => {
              const aUhid = (a.patient_id || a.uhid || (a.Appoment_id ? `APT-${a.Appoment_id}` : '')).toLowerCase().trim();
              const aApptId = String(a.Appoment_id || a.appoment_id || a.id || '').toLowerCase().trim();
              return aUhid === userUhid || aApptId === userUhid || `apt-${aApptId}` === userUhid;
            });
          }
          if (!matchedAppt && contact && contact.replace(/\D/g, '').length >= 10) {
            const cleanDigits = contact.replace(/\D/g, '');
            matchedAppt = apptList.find(a => (a.contact || a.phone || '').replace(/\D/g, '') === cleanDigits);
          }
        }

        if (isMounted) {
          if (matched) {
            setLivePatient(matched);
            try {
              const rawStored = localStorage.getItem('currentUser');
              const storedObj = rawStored ? JSON.parse(rawStored) : {};
              const resolvedId = matched.patient_id || matched.uhid || (matched.id ? `PAT-${matched.id}` : storedObj.patient_id);
              if (resolvedId && storedObj.patient_id !== resolvedId) {
                const updated = {
                  ...storedObj,
                  patient_id: resolvedId,
                  uhid: resolvedId,
                  name: matched.name || storedObj.name,
                  contact: matched.contact || matched.phone || storedObj.contact
                };
                localStorage.setItem('currentUser', JSON.stringify(updated));
              }
            } catch (e) {}
          } else if (matchedAppt) {
            const apptUhid = matchedAppt.Appoment_id ? `APT-${matchedAppt.Appoment_id}` : (matchedAppt.patient_id || (matchedAppt.id ? `APT-${matchedAppt.id}` : null));
            setLivePatient({
              patient_id: apptUhid,
              uhid: apptUhid,
              name: matchedAppt.patient_name || matchedAppt.patient_Name || currentUser?.name,
              contact: matchedAppt.contact || currentUser?.contact,
              email: matchedAppt.email || currentUser?.email
            });
            try {
              const rawStored = localStorage.getItem('currentUser');
              const storedObj = rawStored ? JSON.parse(rawStored) : {};
              if (apptUhid && storedObj.patient_id !== apptUhid) {
                const updated = {
                  ...storedObj,
                  patient_id: apptUhid,
                  uhid: apptUhid,
                  name: matchedAppt.patient_name || storedObj.name
                };
                localStorage.setItem('currentUser', JSON.stringify(updated));
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('PatientNavbar backend sync notice:', err);
      }
    };

    fetchLivePatientInfo();
    return () => { isMounted = false; };
  }, [currentUser, isLoggedIn]);

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

  const currentRole = (currentUser?.role || '').toString().toUpperCase();
  const isPatientLoggedIn = Boolean(isLoggedIn && currentRole.includes('PATIENT'));
  const showAppointmentAction = !isLoggedIn || isPatientLoggedIn;

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
        id: 'my_hestory',
        label: 'My History',
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      }
    ] : [])
  ];

  const resolvedName = livePatient?.name || livePatient?.patient_name || currentUser?.name || currentUser?.patient_name || 'Patient';
  const resolvedRole = currentUser?.role || 'User';
  const normalizedRole = resolvedRole.toString().toUpperCase();
  const staffHomePage = normalizedRole.includes('SUPER') ? 'super_admin_dashboard'
    : normalizedRole.includes('ADMIN') ? 'admin_dashboard'
      : normalizedRole.includes('DOCTOR') ? 'doctor_dashboard'
        : normalizedRole.includes('NURSE') ? 'nurse_dashboard'
          : normalizedRole.includes('RECEPTION') ? 'receptionist_dashboard' : null;
  const resolvedUhid =
    livePatient?.patient_id ||
    livePatient?.uhid ||
    (livePatient?.Appoment_id ? `APT-${livePatient.Appoment_id}` : null) ||
    currentUser?.patient_id ||
    currentUser?.uhid ||
    (currentUser?.id ? `PAT-${currentUser.id}` : 'PAT-01');

  const getInitials = (name) => {
    if (!name) return 'PT';
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

  const isNavActive = (itemId) => {
    if (currentPage === itemId) return true;
    if (itemId === 'home' && (currentPage === 'patient_home' || currentPage === 'home' || !currentPage)) return true;
    if (itemId === 'about' && currentPage === 'patient_about') return true;
    if (itemId === 'contact' && currentPage === 'patient_contact') return true;
    if (itemId === 'patient_dashboard' && currentPage === 'patient_dashboard') return true;
    if (
      (itemId === 'my_hestory' || itemId === 'patient_discharge_history' || itemId === 'my_history') &&
      (currentPage === 'my_hestory' || currentPage === 'patient_my_hestory' || currentPage === 'my_history' || currentPage === 'patient_my_history' || currentPage === 'patient_discharge_history' || currentPage === 'discharge_history')
    ) return true;
    return false;
  };

  const uhidDisplay = resolvedUhid;

  return (
    <header className="w-full sticky top-0 z-50 bg-white/98 backdrop-blur-md border-b border-slate-200 shadow-2xs select-none">
      {/* 1. TOP ANNOUNCEMENT & EMERGENCY TICKER BAR */}
      <div className="w-full bg-slate-900 text-white text-xs py-1.5 px-4 sm:px-8 lg:px-12 border-b border-slate-800">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px]">
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
      <div className="w-full px-4 sm:px-8 lg:px-12">
        <div className="flex min-w-0 items-center justify-between h-16 sm:h-18 gap-3 sm:gap-4">
          
          {/* BRAND LOGO */}
          <div
            onClick={() => handleNavClick('home')}
            className="flex min-w-0 items-center gap-2 sm:gap-2.5 cursor-pointer group shrink"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-teal-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:scale-105 transition duration-150 shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                  Apex Care
                </span>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 font-extrabold text-[10px] border border-teal-200">
                  HOSPITAL
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 hidden sm:block">
                Multi-Speciality Healthcare
              </p>
            </div>
          </div>

          {/* CENTER NAVIGATION LINKS */}
          <nav className="hidden xl:flex items-center gap-1 lg:gap-1.5">
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
          <div className="hidden xl:flex items-center gap-2 lg:gap-3 shrink-0">
            {isPatientLoggedIn && <NotificationBell currentUser={currentUser} setCurrentPage={handleNavClick} light />}
            {isLoggedIn && !isPatientLoggedIn && staffHomePage && (
              <button type="button" onClick={() => handleNavClick(staffHomePage)} className="px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold whitespace-nowrap transition">
                Back to My Site
              </button>
            )}
            {/* Appointment booking is available to visitors and patient accounts. */}
            {showAppointmentAction && (
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
            )}

            {isPatientLoggedIn ? (
              <div className="relative pl-2 border-l border-slate-200 shrink-0">
                <div
                  className="relative"
                  onMouseEnter={() => setProfileDropdownOpen(true)}
                  onMouseLeave={() => setProfileDropdownOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer border select-none ${
                      currentPage === 'patient_setting' || currentPage === 'patient_dashboard'
                        ? 'bg-teal-50 text-teal-900 border-teal-300 ring-2 ring-teal-400/20 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 via-teal-500 to-blue-600 text-white font-bold flex items-center justify-center text-[11px] shadow-xs shrink-0">
                      {getInitials(resolvedName)}
                    </div>
                    <div className="text-left leading-tight hidden sm:flex sm:flex-col">
                      <p className="truncate max-w-[120px] font-bold text-slate-800 text-xs">
                        {resolvedName}
                      </p>
                      <p className="text-[10px] text-teal-700 font-semibold tracking-tight">
                        Patient
                      </p>
                    </div>
                  </button>

                  {/* PROFILE DROPDOWN MENU */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 top-full pt-2 w-64 z-50 animate-fadeIn">
                      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 space-y-1">
                        {/* User Details Header */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 via-teal-500 to-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                              {getInitials(resolvedName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-slate-900 truncate">{resolvedName}</p>
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                                Patient Portal
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Dashboard Link */}
                        <button
                          type="button"
                          onClick={() => { handleNavClick('patient_dashboard'); setProfileDropdownOpen(false); }}
                          className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                            currentPage === 'patient_dashboard' ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-xs">My Dashboard</p>
                            <p className="text-[10px] text-slate-400 font-normal">Appointments & live clinical status</p>
                          </div>
                        </button>

                        {/* Profile Link */}
                        <button
                          type="button"
                          onClick={() => { handleNavClick('patient_setting'); setProfileDropdownOpen(false); }}
                          className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                            currentPage === 'patient_setting' ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-xs">Profile</p>
                            <p className="text-[10px] text-slate-400 font-normal">Personal details & security</p>
                          </div>
                        </button>

                        <div className="border-t border-slate-100 my-1"></div>

                        {/* Sign Out */}
                        <button
                          type="button"
                          onClick={() => { handleLogoutClick(); setProfileDropdownOpen(false); }}
                          className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition flex items-center gap-2.5 cursor-pointer"
                        >
                          <span>Logout Account</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : isLoggedIn ? (
              <div className="relative pl-2 border-l border-slate-200 shrink-0">
                <button type="button" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)} className="flex items-center gap-2 rounded-2xl px-2 py-1.5 hover:bg-slate-100 transition" aria-expanded={profileDropdownOpen} aria-label="Open user menu">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 via-teal-500 to-blue-600 text-white font-bold flex items-center justify-center text-[11px] shadow-xs shrink-0">
                    {getInitials(currentUser?.name || currentUser?.username || resolvedRole)}
                  </div>
                  <div className="hidden sm:flex flex-col leading-tight max-w-[130px] text-left">
                    <span className="truncate text-xs font-bold text-slate-800">{currentUser?.name || currentUser?.username || resolvedRole}</span>
                    <span className="truncate text-[10px] font-semibold text-teal-700">{resolvedRole}</span>
                  </div>
                </button>
                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full pt-2 w-64 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || currentUser?.username || 'User'}</p>
                        <p className="text-[10px] text-teal-700 font-semibold mt-1">{resolvedRole}</p>
                        {currentUser?.email && <p className="text-[10px] text-slate-500 truncate mt-1">{currentUser.email}</p>}
                      </div>
                      <button type="button" onClick={handleLogoutClick} className="w-full mt-1 px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition">
                        Logout Account
                      </button>
                    </div>
                  </div>
                )}
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
          <div className="flex xl:hidden items-center gap-1.5 sm:gap-2 shrink-0">
            {isPatientLoggedIn && <NotificationBell currentUser={currentUser} setCurrentPage={handleNavClick} light />}
            {isLoggedIn && !isPatientLoggedIn && staffHomePage && (
              <button type="button" onClick={() => handleNavClick(staffHomePage)} className="px-2 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-800 text-[10px] font-bold whitespace-nowrap" title="Back to My Site">
                My Site
              </button>
            )}
            {showAppointmentAction && <button
              type="button"
              onClick={() => handleNavClick('appointment')}
              className="px-2 py-1.5 sm:px-2.5 rounded-lg bg-teal-600 text-white font-bold text-xs shadow-xs"
            >
              Book
            </button>}

            {isLoggedIn ? (
              <>
                {!isPatientLoggedIn && (
                  <div className="relative">
                    <button type="button" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)} className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 via-teal-500 to-blue-600 text-white font-bold flex items-center justify-center text-[11px] shadow-xs" title={`${currentUser?.name || currentUser?.username || resolvedRole} · ${resolvedRole}`} aria-label="Open user menu" aria-expanded={profileDropdownOpen}>
                      {getInitials(currentUser?.name || currentUser?.username || resolvedRole)}
                    </button>
                    {profileDropdownOpen && (
                      <div className="absolute right-0 top-full pt-2 w-64 z-50">
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name || currentUser?.username || 'User'}</p>
                            <p className="text-[10px] text-teal-700 font-semibold mt-1">{resolvedRole}</p>
                            {currentUser?.email && <p className="text-[10px] text-slate-500 truncate mt-1">{currentUser.email}</p>}
                          </div>
                          <button type="button" onClick={handleLogoutClick} className="w-full mt-1 px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition">Logout Account</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="px-2 py-1.5 sm:px-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold"
                  title="Logout"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleNavClick('login')}
                className="px-2 py-1.5 sm:px-2.5 rounded-lg bg-slate-900 text-white text-xs font-bold"
              >
                Login
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
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
        <div className="xl:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg animate-fadeIn">
          {isPatientLoggedIn && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {getInitials(resolvedName)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {resolvedName}
                  </p>
                  <p className="text-[11px] text-teal-700 font-semibold">
                    Patient
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleNavClick('patient_setting')}
                className="px-2.5 py-1 bg-white text-teal-800 border border-teal-200 rounded-lg text-xs font-bold"
              >
                Profile
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
            {showAppointmentAction && <button
              type="button"
              onClick={() => handleNavClick('appointment')}
              className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-xs text-center flex items-center justify-center gap-1.5"
            >
              <span>Book Appointment</span>
            </button>}
            {!isLoggedIn && (
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
