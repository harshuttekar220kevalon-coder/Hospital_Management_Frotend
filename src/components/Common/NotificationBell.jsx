import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../Api/Api';
import { getNotificationEndpoint, getNotificationHeaders, getNotificationParams } from './notificationApi';

const NotificationBell = ({ currentUser, setCurrentPage, light = false }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const endpoint = getNotificationEndpoint(currentUser?.role);

  const refreshCount = useCallback(async () => {
    if (!endpoint || !currentUser?.email) return;
    try {
      const params = getNotificationParams(currentUser);
      const response = await fetch(`${endpoint}unread_count/?${params.toString()}`, { headers: getNotificationHeaders(currentUser) });
      if (!response.ok) return;
      const data = await response.json();
      setUnreadCount(Number(data.unread_count) || 0);
    } catch {
      // Keep the last known count when the API is temporarily unavailable.
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

  if (!currentUser?.email || !endpoint) return null;

  return (
    <button
      type="button"
      onClick={() => setCurrentPage?.('notifications')}
      aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
      title="Notifications"
      className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-teal-400 ${
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
  );
};

export default NotificationBell;
