import { useCallback, useEffect, useState, useRef } from 'react';
import {
  getNotificationEndpoint,
  getNotificationHeaders,
  getNotificationParams,
  getNotificationRole
} from '../Api/Api';

const formatTimeAgo = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
};

const NotificationBell = ({ currentUser, setCurrentPage, light = false }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const role = getNotificationRole(currentUser?.role || currentUser?.Role || currentUser?.Select_User || currentUser?.user?.role);
  const email = (currentUser?.email || currentUser?.Email || currentUser?.user?.email || currentUser?.username || '').trim();
  const endpoint = getNotificationEndpoint(role || currentUser?.role);

  const refreshCount = useCallback(async () => {
    if (!endpoint || !email) return;
    try {
      const params = getNotificationParams(currentUser);
      params.set('recipient_email', email);
      params.set('current_email', email);
      if (role) params.set('recipient_role', role);
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
      const userNotifications = list.filter(item => {
        const matchesEmail = item.recipient_email && item.recipient_email.toLowerCase() === email.toLowerCase();
        const matchesRole = item.recipient_role === role;
        return matchesEmail || matchesRole;
      });

      // Sort newest notifications first
      userNotifications.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      const unread = userNotifications.filter(item => !item.is_read).length;
      setUnreadCount(unread);
      setNotifications(userNotifications);
    } catch {
      // Keep last known state if offline/temporarily unavailable
    }
  }, [currentUser, endpoint, email, role]);

  useEffect(() => {
    refreshCount();
    const interval = window.setInterval(refreshCount, 20000);
    window.addEventListener('focus', refreshCount);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshCount);
    };
  }, [refreshCount]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  if (!currentUser?.email || !endpoint) return null;

  const handleNotificationClick = async (item) => {
    if (!item.is_read) {
      try {
        const params = getNotificationParams(currentUser);
        fetch(`${endpoint}${item.id}/?${params.toString()}`, {
          headers: getNotificationHeaders(currentUser),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // silent
      }
    }
    setIsOpen(false);
    setCurrentPage?.('notifications');
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const handleViewAll = () => {
    setIsOpen(false);
    setCurrentPage?.('notifications');
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  // Show only unread / new notifications in the compact dropdown
  const unreadItems = notifications.filter((n) => !n.is_read);
  const displayItems = unreadItems;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
        title="Notifications"
        aria-expanded={isOpen}
        className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer ${
          light
            ? 'border-slate-200 bg-white text-slate-700 hover:bg-teal-50 hover:text-teal-700'
            : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white'
        }`}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-slate-900 bg-rose-500 px-1 text-[10px] font-extrabold leading-none text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* COMPACT NOTIFICATION DROPDOWN MENU */}
      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-2 w-80 sm:w-96 z-[9999] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl ${
            light
              ? 'bg-white border border-slate-200 text-slate-800 ring-1 ring-black/5'
              : 'bg-slate-900 border border-slate-700/90 text-slate-100 ring-1 ring-white/10'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b ${
              light
                ? 'border-slate-100 bg-slate-50/70'
                : 'border-slate-800/80 bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  {unreadCount} New
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">All caught up</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition cursor-pointer"
              aria-label="Close notifications"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Compact Notification List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/30 custom-scrollbar">
            {displayItems.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-800/60 flex items-center justify-center text-slate-400 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-slate-400">No notifications</p>
                <p className="text-[10px] text-slate-500 mt-0.5">You're all caught up!</p>
              </div>
            ) : (
              displayItems.map((item) => {
                const unread = !item.is_read;
                const senderDisplay = item.sender_name || item.sender_role || item.sender_email || 'Hospital Admin';
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3 text-left transition flex items-start gap-2.5 cursor-pointer ${
                      light
                        ? unread
                          ? 'bg-teal-50/70 hover:bg-teal-100/60'
                          : 'hover:bg-slate-50'
                        : unread
                        ? 'bg-teal-950/30 hover:bg-teal-950/50'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Unread dot indicator */}
                    <div className="mt-1 shrink-0">
                      <span
                        className={`block h-2 w-2 rounded-full ${
                          unread
                            ? 'bg-teal-400 ring-2 ring-teal-400/40 animate-pulse'
                            : 'bg-slate-600'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <p
                          className={`text-xs truncate ${
                            unread
                              ? light
                                ? 'font-bold text-slate-900'
                                : 'font-bold text-white'
                              : light
                              ? 'font-medium text-slate-700'
                              : 'font-medium text-slate-300'
                          }`}
                        >
                          {item.title || 'Notification'}
                        </p>
                        <time
                          title={item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                          className="text-[10px] text-slate-400 shrink-0 font-medium"
                        >
                          {formatTimeAgo(item.created_at)}
                        </time>
                      </div>

                      {item.message && (
                        <p
                          className={`text-[11px] line-clamp-2 mt-0.5 leading-relaxed ${
                            light ? 'text-slate-600' : 'text-slate-300'
                          }`}
                        >
                          {item.message}
                        </p>
                      )}

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-semibold truncate ${
                            light ? 'text-teal-700' : 'text-teal-400'
                          }`}
                        >
                          From: {senderDisplay}
                          {item.sender_role && (
                            <span className="ml-1 opacity-75 text-[9px] uppercase">
                              ({item.sender_role})
                            </span>
                          )}
                        </span>
                        <span
                          className={`shrink-0 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            unread
                              ? light
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : light
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {unread ? 'Unread' : 'Read'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with "View All" Button */}
          <div
            className={`p-2.5 border-t text-center ${
              light
                ? 'border-slate-100 bg-slate-50/70'
                : 'border-slate-800/80 bg-slate-800/40'
            }`}
          >
            <button
              type="button"
              onClick={handleViewAll}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-teal-300 hover:text-white bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View All Notifications</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
