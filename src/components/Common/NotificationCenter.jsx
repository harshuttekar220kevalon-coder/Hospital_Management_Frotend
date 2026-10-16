import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  API_BASE_URL,
  getNotificationEndpoint,
  getNotificationHeaders,
  getNotificationParams,
  getNotificationRole,
} from '../Api/Api';

const readError = async (response) => {
  try {
    const data = await response.json();
    return (
      data.detail ||
      data.message ||
      Object.entries(data)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join(' · ')
    );
  } catch {
    return `Request failed (${response.status})`;
  }
};

const formatDate = (value) => {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const formatTimeAgo = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
};

const isToday = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const isYesterday = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
};

const isHistory = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return !isToday(value) && !isYesterday(value);
};

const getSenderRoleBadge = (roleName) => {
  const r = (roleName || '').toUpperCase();
  if (r.includes('SUPER')) {
    return {
      label: 'Super Admin',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
      avatarClass: 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white',
    };
  }
  if (r.includes('ADMIN')) {
    return {
      label: 'Hospital Admin',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      avatarClass: 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white',
    };
  }
  if (r.includes('DOCTOR')) {
    return {
      label: 'Doctor',
      badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
      avatarClass: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white',
    };
  }
  if (r.includes('NURSE')) {
    return {
      label: 'Nurse',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      avatarClass: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
    };
  }
  if (r.includes('RECEPTION')) {
    return {
      label: 'Receptionist',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
      avatarClass: 'bg-gradient-to-br from-sky-500 to-cyan-600 text-white',
    };
  }
  return {
    label: 'Hospital System',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    avatarClass: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white',
  };
};

const getSenderInitial = (sender) => {
  if (!sender) return 'H';
  const clean = sender.replace(/^Dr\.?\s*/i, '').trim();
  return clean ? clean.charAt(0).toUpperCase() : 'H';
};

const NotificationCenter = ({ currentUser, allowSend = true }) => {
  const role = getNotificationRole(currentUser?.role || currentUser?.Role || currentUser?.Select_User || currentUser?.user?.role);
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN';
  const email = (
    currentUser?.email ||
    currentUser?.Email ||
    currentUser?.user?.email ||
    currentUser?.username ||
    (isSuperAdmin ? 'superadmin@hospital.com' : (isAdmin ? 'admin@hospital.com' : ''))
  ).trim();
  const endpoint = getNotificationEndpoint(role || currentUser?.role);
  const isDoctor = role === 'DOCTOR' || (currentUser?.role || '').toString().toUpperCase().includes('DOCTOR');
  const isNurse = role === 'NURSES' || (currentUser?.role || '').toString().toUpperCase().includes('NURSE');
  const isReceptionist = role === 'RECEPTIONISTS' || (currentUser?.role || '').toString().toUpperCase().includes('RECEPTION');
  const isPatient = role === 'PATIENTS' || (currentUser?.role || '').toString().toUpperCase().includes('PATIENT');
  const isStaff = isDoctor || isNurse || isReceptionist;

  // Doctor, Nurse, Receptionist, and Patients can NEVER send messages. They only receive notifications!
  const canSendMessages = allowSend !== false && !isStaff && !isPatient && (isSuperAdmin || isAdmin);

  const [notifications, setNotifications] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState(isSuperAdmin ? 'sent' : 'inbox');
  const [quickFilter, setQuickFilter] = useState('today'); // 'today' | 'yesterday' | 'history' | 'unread' | 'important' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [form, setForm] = useState({ recipient: '', title: '', message: '', is_important: false });
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Automatically default Super Admin to their Sent tab since they only send messages to Admins
  useEffect(() => {
    if (isSuperAdmin && filter === 'inbox') {
      setFilter('sent');
    }
  }, [isSuperAdmin]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelected(null);
        setComposeOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const queryParams = useCallback(
    (extra = {}) => {
      const params = getNotificationParams(currentUser);
      const activeDirection = extra.direction || (canSendMessages ? filter : 'inbox');
      if (activeDirection === 'sent') {
        params.delete('recipient_email');
        params.delete('recipient_role');
        if (email) params.set('sender_email', email);
        if (role) params.set('sender_role', role);
      } else {
        if (email) params.set('recipient_email', email);
        if (role) params.set('recipient_role', role);
      }
      if (email) params.set('current_email', email);
      if (role) params.set('current_role', role);
      Object.entries(extra).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
      });
      return params;
    },
    [currentUser, email, role, canSendMessages, filter]
  );

  const loadNotifications = useCallback(
    async (isManualRefresh = false, directionOverride = null) => {
      if (!endpoint) {
        setLoading(false);
        return;
      }
      if (isManualRefresh) setRefreshing(true);
      try {
        const directionParam = directionOverride || (canSendMessages ? filter : 'inbox');
        const params = queryParams({ direction: directionParam });
        params.set('_t', String(Date.now()));
        const response = await fetch(`${endpoint}?${params.toString()}`, {
          cache: 'no-store',
          headers: {
            ...getNotificationHeaders(currentUser),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });
        if (!response.ok) throw new Error(await readError(response));
        const payload = await response.json();
        const items = Array.isArray(payload) ? payload : (payload.results || payload.data || []);
        setNotifications(items);
        setError('');
      } catch (loadError) {
        const msg = loadError?.message || '';
        // Suppress "Failed to fetch" errors completely
        if (!msg.toLowerCase().includes('failed to fetch') && !msg.toLowerCase().includes('fetch')) {
          setError(msg || 'Could not load notifications.');
        } else {
          setError('');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [endpoint, filter, queryParams, canSendMessages, currentUser]
  );

  const loadRecipients = useCallback(async () => {
    if (!canSendMessages) {
      setRecipients([]);
      return;
    }
    try {
      const activeEmail = email || (isSuperAdmin ? 'superadmin@hospital.com' : 'admin@hospital.com');
      const activeRole = role || (isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN');
      const params = new URLSearchParams({ current_email: activeEmail, current_role: activeRole });
      const response = await fetch(`${API_BASE_URL}/notifications/recipients/?${params.toString()}`, {
        headers: getNotificationHeaders(currentUser),
      });
      if (!response.ok) throw new Error(await readError(response));
      const payload = await response.json();
      setRecipients(Array.isArray(payload) ? payload : []);
    } catch (loadError) {
      const msg = loadError?.message || '';
      if (!msg.toLowerCase().includes('failed to fetch') && !msg.toLowerCase().includes('fetch')) {
        setError(msg || 'Could not load user directory.');
      }
    }
  }, [email, canSendMessages, role, currentUser, isSuperAdmin]);

  useEffect(() => {
    setLoading(true);
    loadNotifications();
    const interval = window.setInterval(() => loadNotifications(), 20000);
    const onFocus = () => loadNotifications();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadNotifications]);

  useEffect(() => {
    loadRecipients();
  }, [loadRecipients]);

  const visibleRecipients = useMemo(() => {
    const search = recipientSearch.toLowerCase().trim();
    if (!search) return recipients;
    return recipients.filter((person) =>
      `${person.name} ${person.email} ${person.role}`.toLowerCase().includes(search)
    );
  }, [recipientSearch, recipients]);

  const openNotification = async (item) => {
    setSelected(item);
    setError('');
    try {
      const params = queryParams();
      const isIncoming =
        (item.recipient_email && item.recipient_email.toLowerCase() === email.toLowerCase()) ||
        item.recipient_role === role;
      if (isIncoming && !item.is_read) {
        const response = await fetch(`${endpoint}${item.id}/?${params.toString()}`, {
          headers: getNotificationHeaders(currentUser),
        });
        if (response.ok) {
          const opened = await response.json();
          setSelected(opened);
          setNotifications((items) => items.map((entry) => (entry.id === item.id ? opened : entry)));
        }
      }
    } catch (openError) {
      // Suppress fetch error
    }
  };

  const submitMessage = async (event, reply = false) => {
    event.preventDefault();
    if (!canSendMessages) {
      setError('You do not have permission to send messages.');
      return;
    }
    const rawRecipient = reply
      ? selected.sender_email?.toLowerCase() === email.toLowerCase()
        ? `${selected.recipient_email}|${selected.recipient_role || ''}`
        : `${selected.sender_email}|${selected.sender_role || ''}`
      : (form.recipient || recipientSearch || '').trim();

    let recipientEmail = '';
    let recipientRole = '';
    if (rawRecipient.includes('|')) {
      const parts = rawRecipient.split('|');
      recipientEmail = (parts[0] || '').trim();
      recipientRole = (parts[1] || '').trim();
    } else {
      recipientEmail = rawRecipient.trim();
      recipientRole = isSuperAdmin ? 'ADMIN' : (isAdmin ? 'DOCTOR' : '');
    }

    const bodyText = reply ? replyText.trim() : form.message.trim();
    const title = reply
      ? selected.title.startsWith('Re:')
        ? selected.title
        : `Re: ${selected.title}`
      : form.title.trim();

    if (!recipientEmail || !title || !bodyText) {
      setError('Please select or type a recipient email, and enter a subject and message.');
      return;
    }
    if (!recipientRole) {
      recipientRole = isSuperAdmin ? 'ADMIN' : 'ADMIN';
    }

    const senderEmail = email || (isSuperAdmin ? 'superadmin@hospital.com' : 'admin@hospital.com');
    const senderRole = role || (isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN');

    setSending(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/send/`, {
        method: 'POST',
        headers: getNotificationHeaders(currentUser, true),
        body: JSON.stringify({
          sender_email: senderEmail,
          sender_role: senderRole,
          recipient_email: recipientEmail,
          recipient_role: recipientRole,
          title,
          message: bodyText,
          is_important: reply ? false : form.is_important,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const result = await response.json();
      setSuccess(result.message || 'Message sent successfully.');
      setReplyText('');
      if (!reply) {
        setComposeOpen(false);
        setForm({ recipient: '', title: '', message: '', is_important: false });
        setRecipientSearch('');
        if (result?.data) {
          setNotifications((prev) => [result.data, ...prev.filter((n) => n.id !== result.data.id)]);
        }
        if (canSendMessages) {
          setFilter('sent');
          await loadNotifications(true, 'sent');
        } else {
          await loadNotifications(true);
        }
      } else {
        setSelected(null);
        await loadNotifications(true);
      }
    } catch (sendError) {
      const msg = sendError?.message || '';
      if (!msg.toLowerCase().includes('failed to fetch')) {
        setError(msg || 'Message could not be sent.');
      }
    } finally {
      setSending(false);
    }
  };

  // Base list filtered by direction tab (Inbox vs Sent)
  const baseNotifications = useMemo(() => {
    let list = notifications;

    // Strict tab separation: Receiver only in Inbox, Sender only in Sent
    if (canSendMessages) {
      if (filter === 'sent') {
        list = list.filter((item) => {
          const isSender =
            (item.sender_email && email && item.sender_email.toLowerCase() === email.toLowerCase()) ||
            (isSuperAdmin && (item.sender_role || '').toUpperCase().includes('SUPER')) ||
            (isAdmin && (item.sender_role || '').toUpperCase().includes('ADMIN') && !(item.sender_role || '').toUpperCase().includes('SUPER'));
          const isReceiver =
            item.recipient_email && email && item.recipient_email.toLowerCase() === email.toLowerCase();
          return isSender && !isReceiver;
        });
      } else {
        list = list.filter((item) => {
          const isSender =
            (item.sender_email && email && item.sender_email.toLowerCase() === email.toLowerCase()) ||
            (isSuperAdmin && (item.sender_role || '').toUpperCase().includes('SUPER')) ||
            (isAdmin && (item.sender_role || '').toUpperCase().includes('ADMIN') && !(item.sender_role || '').toUpperCase().includes('SUPER'));
          return !isSender;
        });
      }
    }
    return list;
  }, [notifications, filter, canSendMessages, email, isSuperAdmin, isAdmin]);

  const todayCount = useMemo(() => {
    return baseNotifications.filter((item) => isToday(item.created_at || item.createdAt || item.timestamp || item.date)).length;
  }, [baseNotifications]);

  const yesterdayCount = useMemo(() => {
    return baseNotifications.filter((item) => isYesterday(item.created_at || item.createdAt || item.timestamp || item.date)).length;
  }, [baseNotifications]);

  const historyCount = useMemo(() => {
    return baseNotifications.filter((item) => isHistory(item.created_at || item.createdAt || item.timestamp || item.date)).length;
  }, [baseNotifications]);

  const unreadCount = useMemo(() => {
    return baseNotifications.filter((item) => {
      if (filter === 'sent') {
        return !item.is_read;
      }
      const isIncoming =
        (item.recipient_email && item.recipient_email.toLowerCase() === email.toLowerCase()) ||
        item.recipient_role === role;
      return isIncoming && !item.is_read;
    }).length;
  }, [baseNotifications, filter, email, role]);

  const importantCount = useMemo(() => {
    return baseNotifications.filter((item) => item.is_important).length;
  }, [baseNotifications]);

  const canReply =
    canSendMessages &&
    selected &&
    selected.sender_email &&
    selected.sender_email.toLowerCase() !== email.toLowerCase() &&
    ((isSuperAdmin && selected.sender_role === 'ADMIN') ||
      (isAdmin && ['DOCTOR', 'NURSES', 'RECEPTIONISTS'].includes(selected.sender_role)));

  // Dynamic search and quick filters
  const displayedNotifications = useMemo(() => {
    let list = baseNotifications;

    if (quickFilter === 'today') {
      list = list.filter((item) => isToday(item.created_at || item.createdAt || item.timestamp || item.date));
    } else if (quickFilter === 'yesterday') {
      list = list.filter((item) => isYesterday(item.created_at || item.createdAt || item.timestamp || item.date));
    } else if (quickFilter === 'history') {
      list = list.filter((item) => isHistory(item.created_at || item.createdAt || item.timestamp || item.date));
    } else if (quickFilter === 'unread') {
      list = list.filter((item) => {
        if (filter === 'sent') {
          return !item.is_read;
        }
        const isIncoming =
          (item.recipient_email && item.recipient_email.toLowerCase() === email.toLowerCase()) ||
          item.recipient_role === role;
        return isIncoming && !item.is_read;
      });
    } else if (quickFilter === 'important') {
      list = list.filter((item) => item.is_important);
    }
    // quickFilter === 'all' keeps full list

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(q)) ||
          (item.message && item.message.toLowerCase().includes(q)) ||
          (item.sender_name && item.sender_name.toLowerCase().includes(q)) ||
          (item.sender_email && item.sender_email.toLowerCase().includes(q)) ||
          (item.recipient_name && item.recipient_name.toLowerCase().includes(q)) ||
          (item.recipient_email && item.recipient_email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [baseNotifications, quickFilter, filter, email, role, searchQuery]);

  return (
    <div className="w-full min-h-screen bg-slate-50/60 px-3 py-4 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5">
        
        {/* Dynamic & Aesthetic Header Banner */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-5 sm:p-7 text-white shadow-xl shadow-slate-900/10">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-teal-400/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-teal-300 ring-1 ring-teal-400/30">
                  {role?.replace('_', ' ') || 'Portal'}
                </span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-300 ring-1 ring-rose-500/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                    {unreadCount} New
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Notifications & Updates
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Connected as <span className="font-semibold text-teal-200">{email}</span>
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => loadNotifications(true)}
                title="Refresh notifications"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-slate-200 backdrop-blur-md transition hover:bg-white/20 active:scale-95 cursor-pointer ring-1 ring-white/10"
              >
                <svg
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>

              {/* Compose button: ONLY for Admin and Super Admin. DOCTOR, NURSE, RECEPTIONIST CAN NEVER SEND */}
              {canSendMessages && (
                <button
                  type="button"
                  onClick={() => {
                    setComposeOpen(true);
                    setSelected(null);
                    setSuccess('');
                    setError('');
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-teal-500/25 transition hover:from-teal-600 hover:to-emerald-600 active:scale-95 cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Message</span>
                </button>
              )}
            </div>
          </div>

          {/* Ambient visual lighting */}
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        </div>

        {/* Status Alerts */}
        {error && !error.toLowerCase().includes('failed to fetch') && !composeOpen && !selected && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-xs sm:text-sm text-rose-700 shadow-sm animate-in fade-in"
          >
            {error}
          </div>
        )}
        {success && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-xs sm:text-sm text-emerald-700 shadow-sm animate-in fade-in"
          >
            {success}
          </div>
        )}

        {/* Main Notification Card Container */}
        <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all">
          
          {/* Controls Bar: Dynamic Filter Chips & Search Bar */}
          <div className="border-b border-slate-100 bg-slate-50/60 p-3.5 sm:p-5 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              
              {/* Inbox / Sent Tab Toggle: ONLY visible for Admin and Super Admin.
                  For Doctor, Nurse, Receptionist, SEND OPTION IS COMPLETELY REMOVED! */}
              {canSendMessages ? (
                <div className="inline-flex rounded-xl bg-slate-200/70 p-1 shadow-inner">
                  {['inbox', 'sent'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setFilter(tab);
                        setSelected(null);
                        loadNotifications(false, tab);
                      }}
                      className={`rounded-lg px-4 py-1.5 text-xs font-bold capitalize transition-all ${
                        filter === tab
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab === 'inbox' ? 'Inbox' : 'Sent by me'}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Dynamic Quick Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'today', label: 'Today', count: todayCount },
                  { id: 'yesterday', label: 'Yesterday', count: yesterdayCount },
                  { id: 'history', label: 'History', count: historyCount },
                  { id: 'unread', label: 'Unread', count: unreadCount },
                  { id: 'important', label: '⭐ Important', count: importantCount },
                  { id: 'all', label: 'All', count: baseNotifications.length },
                ].map((chip) => {
                  const isActive = quickFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setQuickFilter(chip.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span>{chip.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : chip.id === 'unread' && chip.count > 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {chip.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Instant Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by subject, message, or sender name..."
                className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-9 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition shadow-xs"
              />
              <svg
                className="absolute left-3.5 top-3 h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  className="absolute right-3 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-300"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Notifications List Area */}
          <div className="min-h-[200px] max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-teal-600 border-t-transparent" />
                <p className="mt-3.5 text-xs font-bold text-slate-600">Loading notifications…</p>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-50 text-teal-600 border border-teal-100/80 shadow-xs">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.6"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-800">
                  {searchQuery
                    ? 'No matching notifications found'
                    : quickFilter === 'today'
                    ? 'No notifications today'
                    : quickFilter === 'yesterday'
                    ? 'No notifications from yesterday'
                    : quickFilter === 'history'
                    ? 'No notifications in history'
                    : quickFilter === 'unread'
                    ? 'No unread notifications'
                    : quickFilter === 'important'
                    ? 'No important notifications'
                    : 'All caught up!'}
                </h3>
                <p className="mt-1 max-w-sm text-xs sm:text-sm text-slate-500">
                  {searchQuery
                    ? `No messages matched "${searchQuery}". Check your spelling or try clearing the search.`
                    : quickFilter === 'today'
                    ? 'There are no notifications received today. You can select "All" or other filters above to view previous notifications.'
                    : quickFilter === 'yesterday'
                    ? 'There were no notifications received yesterday.'
                    : quickFilter === 'history'
                    ? 'There are no older notifications in history.'
                    : 'There are no notifications or messages to show right now. When new updates arrive, they will appear here.'}
                </p>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-4 rounded-xl bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100 transition"
                  >
                    Clear Search Filter
                  </button>
                ) : quickFilter === 'today' && baseNotifications.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setQuickFilter('all')}
                    className="mt-4 rounded-xl bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100 transition cursor-pointer"
                  >
                    View All Notifications ({baseNotifications.length})
                  </button>
                ) : null}
              </div>
            ) : (
              displayedNotifications.map((item) => {
                const isIncoming =
                  (item.recipient_email && item.recipient_email.toLowerCase() === email.toLowerCase()) ||
                  item.recipient_role === role;
                const unread = isIncoming && !item.is_read;
                const senderName = item.sender_name || item.sender_email || 'Hospital system';
                const senderRole = item.sender_role || 'SYSTEM';
                const roleBadge = getSenderRoleBadge(senderRole);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openNotification(item)}
                    className={`group w-full p-4 text-left transition-all hover:bg-slate-50/90 sm:px-6 cursor-pointer ${
                      selected?.id === item.id
                        ? 'bg-teal-50/50'
                        : unread
                        ? 'bg-teal-50/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Avatar with Role Coding */}
                      <div className="relative mt-0.5 shrink-0">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl font-black text-sm shadow-xs ${
                            unread
                              ? roleBadge.avatarClass
                              : filter === 'sent'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {getSenderInitial(filter === 'sent' ? (item.recipient_name || item.recipient_email) : senderName)}
                        </div>
                        {unread && (
                          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-teal-500 border-2 border-white" />
                          </span>
                        )}
                      </div>

                      {/* Notification Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`truncate text-sm sm:text-base ${
                                unread ? 'font-black text-slate-900' : 'font-semibold text-slate-700'
                              }`}
                            >
                              {item.title}
                            </span>
                            {item.is_important && (
                              <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 border border-amber-200">
                                ⭐ Important
                              </span>
                            )}
                            {unread && (
                              <span className="shrink-0 rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-black text-teal-800">
                                New
                              </span>
                            )}
                          </div>
                          <time
                            title={formatDate(item.created_at)}
                            className="shrink-0 text-[11px] font-medium text-slate-400"
                          >
                            {formatTimeAgo(item.created_at)}
                          </time>
                        </div>

                        {/* Sender / Recipient Info with Read Status for Sent */}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          {filter === 'sent' && canSendMessages ? (
                            <>
                              <span className="text-slate-500 font-medium">To:</span>
                              <strong className="text-slate-800 font-bold">{item.recipient_name || item.recipient_email}</strong>
                              {item.recipient_role && (
                                <span className="rounded px-1.5 py-0.2 text-[10px] font-bold border border-slate-200 bg-slate-100 text-slate-700">
                                  {item.recipient_role}
                                </span>
                              )}
                              {item.is_read ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                                  <svg className="h-3 w-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Read by {item.recipient_name || item.recipient_email} {item.read_at ? `(${formatTimeAgo(item.read_at)})` : ''}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
                                  <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Unread by {item.recipient_name || item.recipient_email}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="text-slate-500 font-medium">From:</span>
                              <span className="font-semibold text-slate-700 truncate">{senderName}</span>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-bold border ${roleBadge.badgeClass}`}
                              >
                                {roleBadge.label}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Truncated message preview */}
                        <p className="mt-1 line-clamp-2 text-xs sm:text-sm leading-relaxed text-slate-600 group-hover:text-slate-900">
                          {item.message}
                        </p>
                      </div>

                      {/* Right hover chevron */}
                      <svg
                        className="h-4 w-4 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-1 transition self-center shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer stats bar */}
          <div className="flex flex-wrap items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{displayedNotifications.length}</strong> of{' '}
              {notifications.length} message{notifications.length === 1 ? '' : 's'}
            </span>
            {unreadCount > 0 && (
              <span className="font-bold text-teal-700">
                {unreadCount} unread message{unreadCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Compose Message Modal (ONLY for Admin & Super Admin) */}
      {composeOpen && canSendMessages && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setComposeOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-notification-title"
            onSubmit={(event) => submitMessage(event, false)}
            className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 bg-slate-50/50">
              <div>
                <h2 id="compose-notification-title" className="text-lg font-black text-slate-900">
                  Compose Message
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isSuperAdmin
                    ? 'Super Admin can send messages to Hospital Branch Admins.'
                    : 'Admin can send messages to branch staff (Doctors, Nurses, Receptionists).'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                aria-label="Close"
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {error && !error.toLowerCase().includes('failed to fetch') && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="notification-recipient">
                  To (Recipient) <span className="text-rose-500">*</span>
                </label>

                {recipients.length > 0 && (
                  <select
                    id="notification-recipient"
                    value={form.recipient}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, recipient: event.target.value }));
                      setRecipientSearch('');
                    }}
                    className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                  >
                    <option value="">{isSuperAdmin ? '-- Select Hospital Admin from list --' : '-- Select branch staff from list --'}</option>
                    {visibleRecipients.map((person) => (
                      <option key={`${person.role}:${person.email}`} value={`${person.email}|${person.role}`}>
                        {person.name} · {person.email} ({person.role})
                      </option>
                    ))}
                  </select>
                )}

                <input
                  id="notification-recipient-search"
                  type="email"
                  value={form.recipient && !form.recipient.includes('|') ? form.recipient : recipientSearch}
                  onChange={(event) => {
                    const val = event.target.value;
                    setRecipientSearch(val);
                    setForm((prev) => ({ ...prev, recipient: val }));
                  }}
                  placeholder={isSuperAdmin ? 'Or type Hospital Admin email (e.g. r@g.com)...' : 'Or search/type recipient email...'}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="notification-title">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  id="notification-title"
                  required
                  maxLength={160}
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                  placeholder="Enter message subject"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="notification-message">
                  Message Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="notification-message"
                  required
                  rows={4}
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                  placeholder="Write your message here..."
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs font-bold text-amber-900">
                <input
                  type="checkbox"
                  checked={form.is_important}
                  onChange={(event) => setForm((prev) => ({ ...prev, is_important: event.target.checked }))}
                  className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-400"
                />
                <span>Mark this message as important</span>
              </label>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-slate-100 p-4 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white transition"
              >
                Cancel
              </button>
              <button
                disabled={sending}
                className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-teal-600/20 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-60 transition cursor-pointer"
              >
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modern, Compact Centered POPUP MODAL for notification details */}
      {selected && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-popup-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5 bg-slate-50/70">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-teal-700">
                  <svg className="w-3.5 h-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span>Title / Subject</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="notification-popup-title" className="text-base font-black text-slate-900 sm:text-lg break-words">
                    {selected.title || '(No Subject)'}
                  </h2>
                  {selected.is_important && (
                    <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 border border-amber-200">
                      ⭐ Important
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {formatDate(selected.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Message Content */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5 bg-slate-50/40">
              {/* SENDER VIEW (Sent Message by current user) */}
              {selected.sender_email?.toLowerCase() === email.toLowerCase() || filter === 'sent' ? (
                <div className="space-y-3">
                  {/* Dedicated Subject / Title Card */}
                  <div className="rounded-xl border border-teal-200/90 bg-gradient-to-r from-teal-50/80 via-emerald-50/40 to-slate-50 p-3.5 space-y-1 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Message Title / Subject
                      </span>
                      {selected.is_important && (
                        <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 border border-amber-200">
                          ⭐ Important
                        </span>
                      )}
                    </div>
                    <div className="text-sm sm:text-base font-black text-slate-900 leading-snug break-words">
                      {selected.title || '(No Subject)'}
                    </div>
                  </div>

                  {/* Sender & Recipient Metadata */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">From (Sender):</span>
                      <span className="font-bold text-slate-800">
                        {selected.sender_name || 'You'} ({selected.sender_email}) · <span className="text-slate-500">{selected.sender_role}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">To (Recipient):</span>
                      <span className="font-bold text-slate-800">
                        {selected.recipient_name || selected.recipient_email} ({selected.recipient_email}) · <span className="text-teal-700">{selected.recipient_role}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Sent At:</span>
                      <span className="font-semibold text-slate-700">{formatDate(selected.created_at)}</span>
                    </div>
                  </div>

                  {/* Read Receipt Card */}
                  {selected.is_read ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-xs">✓</span>
                        <div>
                          <div className="font-extrabold text-emerald-900">
                            Read by {selected.recipient_name || selected.recipient_email}
                          </div>
                          <div className="text-[11px] text-emerald-700">
                            {selected.recipient_name || selected.recipient_email} opened and read this message.
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Read Date & Time</div>
                        <div className="font-extrabold text-emerald-900">{formatDate(selected.read_at)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 flex items-center gap-2.5 text-xs">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-black text-xs">⏳</span>
                      <div>
                        <div className="font-extrabold text-amber-900">
                          Unread by {selected.recipient_name || selected.recipient_email}
                        </div>
                        <div className="text-[11px] text-amber-700">
                          {selected.recipient_name || selected.recipient_email} has not opened or read this message yet.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Full Message Box */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Message Content</div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
                      {selected.message}
                    </p>
                  </div>
                </div>
              ) : (
                /* RECEIVER VIEW (Incoming Message) */
                <div className="space-y-3">
                  {/* Dedicated Subject / Title Card */}
                  <div className="rounded-xl border border-teal-200/90 bg-gradient-to-r from-teal-50/80 via-emerald-50/40 to-slate-50 p-3.5 space-y-1 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Message Title / Subject
                      </span>
                      {selected.is_important && (
                        <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 border border-amber-200">
                          ⭐ Important
                        </span>
                      )}
                    </div>
                    <div className="text-sm sm:text-base font-black text-slate-900 leading-snug break-words">
                      {selected.title || '(No Subject)'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">From (Sender):</span>
                      <span className="font-bold text-slate-800">
                        {selected.sender_name || selected.sender_email || 'Hospital system'} ({selected.sender_email}) · <span className="text-indigo-700">{selected.sender_role}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Received At:</span>
                      <span className="font-semibold text-slate-700">{formatDate(selected.created_at)}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-teal-200/80 bg-white p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-2">Message Content</div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
                      {selected.message}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: Reply (for Admin/Super Admin) OR Simple Clean Close button */}
            {canReply ? (
              <form onSubmit={(e) => submitMessage(e, true)} className="border-t border-slate-100 bg-white p-3.5 sm:p-4">
                <label htmlFor="popup-reply" className="mb-1.5 block text-xs font-bold text-slate-700">
                  Reply to {selected.sender_name || selected.sender_email}
                </label>
                <div className="flex gap-2">
                  <textarea
                    id="popup-reply"
                    required
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                    placeholder="Write a reply..."
                  />
                  <button
                    disabled={sending}
                    className="self-end rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60 transition cursor-pointer"
                  >
                    {sending ? '...' : 'Reply'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end border-t border-slate-100 bg-white p-3 sm:px-4">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
