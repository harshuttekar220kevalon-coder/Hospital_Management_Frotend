import { useState, useRef, useEffect, useCallback } from 'react';
import NotificationBell from '../Common/NotificationBell';
import { getNotificationEndpoint, getNotificationHeaders, getNotificationParams } from '../Common/notificationApi';

const ReceptionistNavbar = ({ currentPage, setCurrentPage, onLogout, currentUser, onBackToWebsite }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const endpoint = getNotificationEndpoint(currentUser?.role || 'RECEPTIONISTS');

  const refreshCount = useCallback(async () => {
    if (!endpoint || !currentUser?.email) return;
    try {
      const params = getNotificationParams(currentUser);
      const response = await fetch(`${endpoint}unread_count/?${params.toString()}`, { headers: getNotificationHeaders(currentUser) });
      if (!response.ok) return;
      const data = await response.json();
      setUnreadCount(Number(data.unread_count) || 0);
    } catch {
      // Keep last known count
    }
  }, [currentUser, endpoint]);

  useEffect(() => {
    refreshCount();
    const interval = window.setInterval(refreshCount, 20000);
    window.addEventListener('focus', refreshCount);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshCount);
    };
  }, [refreshCount]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  const navItems = [
    {
      id: 'receptionist_dashboard',
      label: 'Front Desk Dashboard',
      matchPages: ['receptionist_dashboard'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'receptionist_appointments',
      label: 'Appointments',
      matchPages: ['receptionist_appointments', 'receptionist_appoiment'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'receptionist_patients',
      label: 'Patient Admissions',
      matchPages: ['receptionist_patients', 'receptionist_patient', 'receptionist_patient_details'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'receptionist_anassine',
      label: 'Unassigned Patients',
      matchPages: ['receptionist_anassine', 'receptionist_unassigned'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    {
      id: 'receptionist_doctors',
      label: 'Doctors',
      matchPages: ['receptionist_doctors'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'receptionist_nurses',
      label: 'Nurses',
      matchPages: ['receptionist_nurses', 'receptionist_nurse'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      id: 'receptionist_billing',
      label: 'Discharge Billing',
      matchPages: ['receptionist_billing', 'billing'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m0 0l-6-6m6 6H3m18 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'receptionist_settings',
      label: 'Settings',
      matchPages: ['receptionist_settings', 'receptionist_setting'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      id: 'notifications',
      label: 'Notifications',
      matchPages: ['notifications', 'receptionist_notifications'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    }
  ];

  const handleNavClick = (pageId) => {
    if (setCurrentPage) {
      setCurrentPage(pageId);
    }
    setIsSidebarOpen(false);
    setProfileDropdownOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    setIsSidebarOpen(false);
    setProfileDropdownOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return 'RC';
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

  const displayName = currentUser?.name || 'Receptionist';

  const isTabActive = (item) => {
    if (item.matchPages) {
      return item.matchPages.includes(currentPage);
    }
    return currentPage === item.id;
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800 shrink-0">
        <div
          onClick={() => handleNavClick('receptionist_dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0">
            RC
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold bg-gradient-to-r from-amber-300 via-orange-200 to-white bg-clip-text text-transparent leading-none">
                Apex Care
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 leading-none">
                Desk
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">
              Reception & Triage
            </span>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation Links (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        <div className="px-3 pb-2 text-[10px] font-bold tracking-wider uppercase text-slate-400">
          Receptionist Navigation
        </div>

        {navItems.map((item) => {
          const active = isTabActive(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                active
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              <span className={`${active ? 'text-amber-300' : 'text-slate-400'}`}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
              {item.id === 'notifications' && unreadCount > 0 ? (
                <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-extrabold bg-rose-500 text-white rounded-full min-w-5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : active ? (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800/90 space-y-1.5 shrink-0 bg-slate-900/95">
        <button
          type="button"
          onClick={onBackToWebsite || (() => handleNavClick('home'))}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="truncate">Back to Website</span>
        </button>

        <button
          type="button"
          onClick={handleLogoutClick}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="truncate">Logout Account</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Dynamic layout style to shift main content for Receptionist on desktop */}
      <style>{`
        @media (min-width: 1024px) {
          body > #root > div > main,
          div.min-h-screen > main {
            margin-left: 16rem !important;
            width: calc(100% - 16rem) !important;
            max-width: calc(100% - 16rem) !important;
          }
        }
      `}</style>

      {/* 1. DESKTOP PERMANENT SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-40 w-64 h-screen max-h-screen bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col overflow-hidden">
        {renderSidebarContent()}
      </aside>

      {/* 2. MOBILE DRAWER SIDEBAR WITH BACKDROP */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 lg:hidden animate-in fade-in duration-200"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 h-screen max-h-screen bg-slate-900 border-r border-slate-800 flex flex-col lg:hidden transform transition-transform duration-300 ease-in-out overflow-hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent()}
      </aside>

      {/* 3. HORIZONTAL TOP BAR (जो आड़ा आ रहा है - Contains ONLY Notification Icon & User Logo) */}
      <header className="sticky top-0 z-30 w-full bg-slate-900 border-b border-slate-800 text-slate-100 shadow-sm lg:pl-64">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Left section: Mobile menu trigger */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 focus:outline-none cursor-pointer transition"
              aria-label="Open sidebar menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Right section: ONLY NOTIFICATION ICON & USER LOGO */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto" ref={dropdownRef}>
            
            {/* Notification Bell */}
            <NotificationBell currentUser={currentUser} setCurrentPage={handleNavClick} />

            {/* User Logo / Avatar */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-md ring-2 ring-white/10 hover:ring-amber-400/50 transition cursor-pointer"
                title={displayName}
                aria-label="User profile menu"
              >
                {getInitials(displayName)}
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-2 space-y-1.5 text-slate-100 backdrop-blur-xl">
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white font-bold flex items-center justify-center text-xs shadow-inner shrink-0">
                          {getInitials(displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-white truncate">{displayName}</p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            Front Desk Receptionist
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavClick('receptionist_dashboard')}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                        currentPage === 'receptionist_dashboard'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs shrink-0">📊</span>
                      <div>
                        <p className="font-bold text-xs">Reception Dashboard</p>
                        <p className="text-[10px] text-slate-400 font-normal">Desk statistics & overview</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavClick('receptionist_settings')}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                        currentPage === 'receptionist_settings' || currentPage === 'receptionist_setting' || currentPage === 'setting'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-xs shrink-0">⚙️</span>
                      <div>
                        <p className="font-bold text-xs">Desk Settings</p>
                        <p className="text-[10px] text-slate-400 font-normal">Manage receptionist profile</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={onBackToWebsite || (() => handleNavClick('home'))}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-amber-200 hover:bg-slate-800 transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs shrink-0">🌐</span>
                      <div>
                        <p className="font-bold text-xs">Back to Website</p>
                        <p className="text-[10px] text-slate-400 font-normal">Visit public hospital portal</p>
                      </div>
                    </button>

                    <div className="border-t border-slate-800 my-1"></div>

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

        </div>
      </header>
    </>
  );
};

export default ReceptionistNavbar;
