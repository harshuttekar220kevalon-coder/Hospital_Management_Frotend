import { useState, useRef, useEffect, useCallback } from 'react';
import NotificationBell from '../Common/NotificationBell';
import { getNotificationEndpoint, getNotificationHeaders, getNotificationParams, getNotificationRole, getChatEndpoint } from '../Api/Api';

const AdminNavbar = ({ currentPage, setCurrentPage, onLogout, currentUser, onBackToWebsite }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const endpoint = getNotificationEndpoint(currentUser?.role || 'ADMIN');
  const chatEndpoint = getChatEndpoint(currentUser?.role || 'ADMIN');

  const refreshCount = useCallback(async () => {
    if (!endpoint || !currentUser?.email) return;
    try {
      const params = getNotificationParams(currentUser);
      params.set('_t', String(Date.now()));
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          ...getNotificationHeaders(currentUser),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (!response.ok) return;
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.results || [];
      const role = getNotificationRole(currentUser?.role || 'ADMIN');
      const unread = list.filter(item => !item.is_read && ((item.recipient_email && item.recipient_email.toLowerCase() === currentUser?.email?.toLowerCase()) || item.recipient_role === role)).length;
      setUnreadCount(unread);
    } catch {
      // Keep last known count
    }
  }, [currentUser, endpoint]);

  const refreshChatCount = useCallback(async () => {
    if (!chatEndpoint || !currentUser?.email) return;
    try {
      const email = currentUser.email;
      const res = await fetch(`${chatEndpoint}unread-count/?email=${encodeURIComponent(email)}&current_email=${encodeURIComponent(email)}`, {
        cache: 'no-store',
        headers: getNotificationHeaders(currentUser),
      });
      if (!res.ok) return;
      const data = await res.json();
      setChatUnreadCount(data.total || 0);
    } catch {
      // Keep last known count
    }
  }, [chatEndpoint, currentUser]);

  useEffect(() => {
    refreshCount();
    refreshChatCount();
    const interval = window.setInterval(refreshCount, 20000);
    const chatInterval = window.setInterval(refreshChatCount, 12000);

    const handleChatUpdate = (e) => {
      if (typeof e?.detail?.count === 'number') {
        setChatUnreadCount(e.detail.count);
      } else {
        refreshChatCount();
      }
    };

    window.addEventListener('chat-unread-updated', handleChatUpdate);
    window.addEventListener('focus', refreshCount);
    window.addEventListener('focus', refreshChatCount);

    return () => {
      window.clearInterval(interval);
      window.clearInterval(chatInterval);
      window.removeEventListener('chat-unread-updated', handleChatUpdate);
      window.removeEventListener('focus', refreshCount);
      window.removeEventListener('focus', refreshChatCount);
    };
  }, [refreshCount, refreshChatCount]);

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
      id: 'admin_hospital_management',
      label: 'Hospital Profile',
      matchPages: ['admin_hospital_management'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'admin_doctors',
      label: 'Doctors',
      matchPages: ['admin_doctors', 'admin_doctor_details'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'admin_nurses',
      label: 'Nurses',
      matchPages: ['admin_nurses', 'admin_nurse_details'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      id: 'admin_receptionists',
      label: 'Receptionists',
      matchPages: ['admin_receptionists', 'admin_receptionist_details'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'admin_patients',
      label: 'Patients',
      matchPages: ['admin_patients', 'admin_patient_details'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      id: 'notifications',
      label: 'Notifications',
      matchPages: ['notifications', 'admin_notifications'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      id: 'chat',
      label: 'Chat',
      matchPages: ['chat', 'admin_chat'],
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
    if (!name) return 'AD';
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

  const displayName = currentUser?.name || 'Admin';

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
          onClick={() => handleNavClick('admin_dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-teal-400 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform duration-200 shrink-0">
            AC
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold bg-gradient-to-r from-purple-300 via-indigo-200 to-white bg-clip-text text-transparent leading-none">
                Apex Care
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 leading-none">
                Admin
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">
              Hospital Branch Portal
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
          Main Navigation
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
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              <span className={`${active ? 'text-sky-300' : 'text-slate-400'}`}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
              {item.id === 'notifications' && unreadCount > 0 ? (
                <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-extrabold bg-rose-500 text-white rounded-full min-w-5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : item.id === 'chat' && chatUnreadCount > 0 ? (
                <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-extrabold bg-emerald-500 text-white rounded-full min-w-5 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse">
                  {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                </span>
              ) : active ? (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"></span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Dynamic layout style to shift main content for Admin on desktop */}
      <style>{`
        /* Prevent ancestor transform/animation from trapping fixed positioning */
        html,
        body,
        #root,
        #root > *,
        div.min-h-screen {
          transform: none !important;
          animation: none !important;
          filter: none !important;
          perspective: none !important;
        }

        @media (min-width: 1024px) {
          aside[data-sidebar="desktop"] {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 16rem !important;
            height: 100vh !important;
            height: 100dvh !important;
            max-height: 100vh !important;
            max-height: 100dvh !important;
            z-index: 50 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          header[data-navbar="topbar"],
          header.topbar-sticky {
            position: sticky !important;
            top: 0 !important;
            margin-left: 16rem !important;
            width: calc(100% - 16rem) !important;
            max-width: calc(100% - 16rem) !important;
            padding-left: 0 !important;
            z-index: 40 !important;
          }
          body > #root > div > main,
          div.min-h-screen > main {
            margin-left: 16rem !important;
            width: calc(100% - 16rem) !important;
            max-width: calc(100% - 16rem) !important;
            min-height: 100vh !important;
          }
        }
      `}</style>

      {/* 1. DESKTOP PERMANENT SIDEBAR */}
      <aside
        data-sidebar="desktop"
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: '16rem',
          height: '100vh',
          maxHeight: '100vh',
          zIndex: 50,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
        className="fixed inset-y-0 left-0 z-50 w-64 h-screen max-h-screen bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col overflow-y-auto overflow-x-hidden"
      >
        {renderSidebarContent()}
      </aside>

      {/* 2. MOBILE DRAWER SIDEBAR WITH BACKDROP */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[110] lg:hidden animate-in fade-in duration-200"
        />
      )}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          height: '100vh',
          maxHeight: '100vh',
          zIndex: 120,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
        className={`fixed inset-y-0 left-0 z-[120] w-64 h-screen max-h-screen bg-slate-900 border-r border-slate-800 flex flex-col lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto overflow-x-hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent()}
      </aside>

      {/* 3. HORIZONTAL TOP BAR */}
      <header
        data-navbar="topbar"
        className="sticky top-0 z-40 w-full lg:ml-64 lg:w-[calc(100%-16rem)] bg-slate-900 border-b border-slate-800 text-slate-100 shadow-sm topbar-sticky"
      >
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

          {/* Right section: ONLY NOTIFICATION ICON & USER LOGO (As Requested) */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto" ref={dropdownRef}>
            
            {/* Notification Bell */}
            <NotificationBell currentUser={currentUser} setCurrentPage={handleNavClick} />

            {/* User Logo / Avatar */}
            <div className="relative z-[9999]">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-teal-400 text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-md ring-2 ring-white/10 hover:ring-purple-400/50 transition cursor-pointer"
                title={displayName}
                aria-label="User profile menu"
              >
                {getInitials(displayName)}
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 z-[9999] animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-2 space-y-1.5 text-slate-100 backdrop-blur-xl">
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-teal-400 text-white font-bold flex items-center justify-center text-xs shadow-inner shrink-0">
                          {getInitials(displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-white truncate">{displayName}</p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-300 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                            Hospital Administrator
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleNavClick('admin_dashboard')}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                        currentPage === 'admin_dashboard'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs shrink-0">📊</span>
                      <div>
                        <p className="font-bold text-xs">Admin Dashboard</p>
                        <p className="text-[10px] text-slate-400 font-normal">Branch analytics & controls</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavClick('admin_staff_approve')}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                        currentPage === 'admin_staff_approve'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs shrink-0">🛡️</span>
                      <div>
                        <p className="font-bold text-xs">Staff Approvals</p>
                        <p className="text-[10px] text-slate-400 font-normal">Approve Doctors, Nurses & Staff</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavClick('admin_settings')}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                        currentPage === 'admin_settings' || currentPage === 'setting'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-xs shrink-0">⚙️</span>
                      <div>
                        <p className="font-bold text-xs">Hospital Settings</p>
                        <p className="text-[10px] text-slate-400 font-normal">Configure hospital branch</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={onBackToWebsite || (() => handleNavClick('home'))}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-sky-200 hover:bg-slate-800 transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center text-xs shrink-0">🌐</span>
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

export default AdminNavbar;
