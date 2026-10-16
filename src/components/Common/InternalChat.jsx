import { useState, useEffect, useRef, useCallback } from 'react';
import { getChatEndpoint, getChatRole, getNotificationHeaders } from '../Api/Api';

const formatChatTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatChatDate = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const getRoleBadgeStyle = (roleStr) => {
  const r = (roleStr || '').toUpperCase();
  if (r.includes('ADMIN')) return 'bg-purple-100 text-purple-700 border-purple-200';
  if (r.includes('DOCTOR')) return 'bg-teal-100 text-teal-800 border-teal-200';
  if (r.includes('NURSE')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (r.includes('RECEPTION')) return 'bg-sky-100 text-sky-800 border-sky-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const getRoleAvatarBg = (roleStr) => {
  const r = (roleStr || '').toUpperCase();
  if (r.includes('ADMIN')) return 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white';
  if (r.includes('DOCTOR')) return 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white';
  if (r.includes('NURSE')) return 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white';
  if (r.includes('RECEPTION')) return 'bg-gradient-to-br from-sky-500 to-blue-600 text-white';
  return 'bg-gradient-to-br from-slate-600 to-slate-800 text-white';
};

const getInitials = (name) => {
  if (!name) return 'U';
  const clean = name.replace(/^Dr\.?\s*/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase() || 'U';
};

const BROADCAST_CONTACT = {
  id: 'broadcast-all',
  name: 'All Hospital Staff',
  email: 'ALL',
  role: 'ALL',
  is_broadcast: true,
  designation: 'Hospital Announcement Channel',
};

const deduplicateMessages = (rawList) => {
  if (!Array.isArray(rawList)) return [];
  const seenIds = new Set();
  const result = [];

  for (const m of rawList) {
    if (!m) continue;

    const msgId = String(m.id ?? '');
    if (msgId) {
      if (seenIds.has(msgId)) continue;
      seenIds.add(msgId);
    }

    result.push(m);
  }
  return result;
};

const InternalChat = ({ currentUser }) => {
  const role = getChatRole(currentUser?.role || currentUser?.Role || currentUser?.Select_User || currentUser?.user?.role);
  const email = (currentUser?.email || currentUser?.Email || currentUser?.user?.email || currentUser?.username || '').trim().toLowerCase();
  const userName = currentUser?.name || currentUser?.username || 'Staff Member';
  const endpoint = getChatEndpoint(role);

  const isAdmin = role === 'ADMIN';

  // State
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [adminContact, setAdminContact] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [unreadMap, setUnreadMap] = useState({});
  const [broadcastUnread, setBroadcastUnread] = useState(0);

  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [contactSearch, setContactSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Stable refs to prevent unnecessary effect re-executions & re-renders
  const activeContactRef = useRef(activeContact);
  activeContactRef.current = activeContact;

  const hospitalInfoRef = useRef(hospitalInfo);
  hospitalInfoRef.current = hospitalInfo;

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const adminContactRef = useRef(adminContact);
  adminContactRef.current = adminContact;

  const prevMsgLengthRef = useRef(0);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const handleSelectContact = useCallback((contact) => {
    if (!contact) return;
    if (activeContactRef.current?.email === contact.email) return;
    setActiveContact(contact);
  }, []);

  // 1. Load contacts and hospital profile (stable callback)
  const fetchContacts = useCallback(async (silent = false) => {
    if (!endpoint || !email) return;
    try {
      if (!silent) setLoadingContacts(true);
      const res = await fetch(`${endpoint}contacts/?email=${encodeURIComponent(email)}&current_email=${encodeURIComponent(email)}`, {
        headers: getNotificationHeaders(currentUserRef.current),
      });
      if (!res.ok) return;
      const data = await res.json();

      setHospitalInfo((prev) => (prev?.id === data.hospital?.id ? prev : data.hospital || null));
      setAdminContact((prev) => (prev?.email === data.admin?.email ? prev : data.admin || null));

      setContacts((prev) => {
        const nextList = Array.isArray(data.contacts) ? data.contacts : [];
        if (prev.length === nextList.length && prev.every((c, idx) => c.email === nextList[idx]?.email)) {
          return prev;
        }
        return nextList;
      });

      setUnreadMap((prev) => {
        const nextMap = data.unread_counts || {};
        const pKeys = Object.keys(prev);
        const nKeys = Object.keys(nextMap);
        if (pKeys.length === nKeys.length && pKeys.every((k) => prev[k] === nextMap[k])) {
          return prev;
        }
        return nextMap;
      });

      setBroadcastUnread((prev) => (prev === (data.broadcast_unread || 0) ? prev : data.broadcast_unread || 0));

      // Dispatch unread count to update side navbar badge
      const totalUnread = Object.values(data.unread_counts || {}).reduce((acc, v) => acc + (Number(v) || 0), 0) + (Number(data.broadcast_unread) || 0);
      window.dispatchEvent(new CustomEvent('chat-unread-updated', { detail: { count: totalUnread } }));

      // Auto-select initial contact only if none active yet
      if (!activeContactRef.current) {
        if (!isAdmin && data.admin) {
          handleSelectContact(data.admin);
        } else if (isAdmin) {
          handleSelectContact(BROADCAST_CONTACT);
        }
      }
    } catch (err) {
      console.error('Error fetching chat contacts:', err);
    } finally {
      if (!silent) setLoadingContacts(false);
    }
  }, [endpoint, email, isAdmin, handleSelectContact]);

  // 2. Load messages for active conversation (stable callback)
  const fetchMessages = useCallback(async (contact, silent = false) => {
    if (!endpoint || !email || !contact) return;
    const withEmail = contact.email;
    try {
      if (!silent && prevMsgLengthRef.current === 0) setLoadingMessages(true);
      const params = new URLSearchParams({
        email: email,
        current_email: email,
        with_email: withEmail,
      });
      const hospId = hospitalInfoRef.current?.id;
      if (hospId) params.set('hospital_id', hospId);

      const res = await fetch(`${endpoint}?${params.toString()}`, {
        headers: getNotificationHeaders(currentUserRef.current),
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.results || [];
      const cleanList = deduplicateMessages(list);

      // Deep compare to prevent re-rendering when messages haven't changed
      setMessages((prev) => {
        if (prev.length === cleanList.length) {
          let identical = true;
          for (let i = 0; i < prev.length; i++) {
            if (prev[i]?.id !== cleanList[i]?.id || prev[i]?.is_read !== cleanList[i]?.is_read || prev[i]?.message !== cleanList[i]?.message) {
              identical = false;
              break;
            }
          }
          if (identical) return prev; // Return exact same array reference -> NO RE-RENDER!
        }
        return cleanList;
      });

      // Mark messages as read
      fetch(`${endpoint}mark-read/`, {
        method: 'POST',
        headers: getNotificationHeaders(currentUserRef.current, true),
        body: JSON.stringify({
          user_email: email,
          with_email: withEmail,
          hospital_id: hospId,
        }),
      }).then(() => {
        if (withEmail.toUpperCase() === 'ALL') {
          setBroadcastUnread((prev) => (prev === 0 ? prev : 0));
        } else {
          setUnreadMap((prev) => {
            const k = withEmail.toLowerCase();
            if (!prev[k]) return prev;
            return { ...prev, [k]: 0 };
          });
        }
        window.dispatchEvent(new CustomEvent('chat-unread-updated'));
      }).catch(() => {});
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [endpoint, email]);

  // Initial load once on mount
  useEffect(() => {
    fetchContacts(false);
  }, [fetchContacts]);

  // When activeContact changes, load messages
  const activeEmail = activeContact?.email;
  useEffect(() => {
    if (activeEmail && activeContactRef.current) {
      prevMsgLengthRef.current = 0;
      fetchMessages(activeContactRef.current, false);
    }
  }, [activeEmail, fetchMessages]);

  // Auto-scroll ONLY when message count increases or first load
  useEffect(() => {
    if (messages.length > prevMsgLengthRef.current) {
      scrollToBottom(prevMsgLengthRef.current > 0);
    }
    prevMsgLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Controlled silent polling every 6 seconds without recreating the interval
  useEffect(() => {
    pollIntervalRef.current = setInterval(() => {
      if (activeContactRef.current) {
        fetchMessages(activeContactRef.current, true);
      }
      fetchContacts(true);
    }, 6000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchMessages, fetchContacts]);

  // Send message handler (supports multiple consecutive messages and same text)
  const handleSendMessage = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const text = inputMessage.trim();
    if (!text || !activeContact) return;

    setInputMessage('');
    const isBroadcast = activeContact.email.toUpperCase() === 'ALL';

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      sender_name: userName,
      sender_email: email,
      sender_role: role,
      recipient_name: activeContact.name,
      recipient_email: activeContact.email,
      recipient_role: activeContact.role || 'STAFF',
      message: text,
      hospital_id: hospitalInfo?.id,
    };

    // Optimistic message append
    const tempMsg = {
      id: tempId,
      sender_name: userName,
      sender_email: email,
      sender_role: role,
      recipient_name: activeContact.name,
      recipient_email: activeContact.email,
      recipient_role: activeContact.role,
      message: text,
      is_broadcast: isBroadcast,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch(`${endpoint}`, {
        method: 'POST',
        headers: getNotificationHeaders(currentUser, true),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        setMessages((prev) => deduplicateMessages(prev.map((m) => (m.id === tempId ? saved : m))));
        scrollToBottom(true);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Message could not be sent.');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (sendErr) {
      console.error('Send error:', sendErr);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  // Permanently delete message from UI and backend database
  const handleDeleteMessage = async (msg) => {
    if (!msg || !msg.id) return;
    if (String(msg.id).startsWith('temp-')) return;

    if (!window.confirm('Are you sure you want to permanently delete this message?')) {
      return;
    }

    // Immediately remove from UI
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));

    try {
      const deleteUrl = `${endpoint}${msg.id}/?email=${encodeURIComponent(email)}&current_email=${encodeURIComponent(email)}`;
      const res = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: getNotificationHeaders(currentUserRef.current),
      });

      if (!res.ok && res.status !== 204 && res.status !== 404) {
        console.error('Failed to delete on server:', res.status);
        if (activeContactRef.current) {
          fetchMessages(activeContactRef.current, true);
        }
      } else {
        window.dispatchEvent(new CustomEvent('chat-unread-updated'));
      }
    } catch (err) {
      console.error('Delete error:', err);
      if (activeContactRef.current) {
        fetchMessages(activeContactRef.current, true);
      }
    }
  };

  // Filter contacts by search and role (excluding redundant admin contact for Admin)
  const filteredContacts = contacts
    .filter((c) => !isAdmin || c.role !== 'ADMIN')
    .filter((c) => {
      const matchesSearch =
        !contactSearch ||
        c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
        (c.designation && c.designation.toLowerCase().includes(contactSearch.toLowerCase()));

      const matchesRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'DOCTOR' && c.role === 'DOCTOR') ||
        (roleFilter === 'NURSE' && c.role === 'NURSES') ||
        (roleFilter === 'RECEPTIONIST' && c.role === 'RECEPTIONISTS');

      return matchesSearch && matchesRole;
    });

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-slate-50/70 p-2 sm:p-4 lg:p-6 flex flex-col">
      <div className="mx-auto max-w-7xl w-full flex-1 flex flex-col space-y-3 sm:space-y-4">
        
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-4 sm:p-6 text-white shadow-lg">
          <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-teal-400/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-teal-300 ring-1 ring-teal-400/30">
                  {role?.replace('_', ' ') || 'Staff'} Internal Chat
                </span>
                {hospitalInfo && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-200">
                    <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {hospitalInfo.name}
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-white">
                Hospital Team Chat & Direct Messaging
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Secure hospital branch communications locked strictly to <strong className="text-teal-200">{hospitalInfo?.name || 'your hospital'}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Chat Main Workspace Card */}
        <div className="flex-1 min-h-[560px] rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          {/* LEFT COLUMN: CONTACTS LIST & QUICK ACCESS */}
          <div className="md:col-span-5 lg:col-span-4 flex flex-col h-full bg-slate-50/50">
            
            {/* Direct Admin Card: Prominently pinned for Doctor, Nurse, and Receptionist */}
            {!isAdmin && adminContact && (
              <div className="p-3 sm:p-4 border-b border-slate-200 bg-gradient-to-r from-purple-50/80 to-indigo-50/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Direct Hospital Admin Contact
                  </span>
                  {unreadMap[adminContact.email.toLowerCase()] > 0 && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-black text-white animate-pulse">
                      {unreadMap[adminContact.email.toLowerCase()]} New
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectContact(adminContact)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition cursor-pointer shadow-xs ${
                    activeContact?.email === adminContact.email
                      ? 'bg-purple-600 text-white border-purple-700 shadow-purple-600/20'
                      : 'bg-white border-purple-200/80 text-slate-800 hover:bg-purple-100/50'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                    activeContact?.email === adminContact.email ? 'bg-white/20 text-white' : 'bg-purple-600 text-white'
                  }`}>
                    {getInitials(adminContact.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs sm:text-sm font-extrabold truncate ${
                        activeContact?.email === adminContact.email ? 'text-white' : 'text-slate-900'
                      }`}>
                        {adminContact.name}
                      </p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                        activeContact?.email === adminContact.email ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                      }`}>
                        Admin
                      </span>
                    </div>
                    <p className={`text-[11px] truncate ${
                        activeContact?.email === adminContact.email ? 'text-purple-100' : 'text-slate-500'
                    }`}>
                      Click to message your Hospital Admin directly
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* Admin Broadcast Option: ONLY for Hospital Admin */}
            {isAdmin && (
              <div className="p-3 sm:p-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50/70">
                <button
                  type="button"
                  onClick={() => handleSelectContact(BROADCAST_CONTACT)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer shadow-xs ${
                    activeContact?.id === 'broadcast-all'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-amber-600/20'
                      : 'bg-white border-amber-200 text-slate-800 hover:bg-amber-100/50'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                    activeContact?.id === 'broadcast-all' ? 'bg-white/20' : 'bg-amber-100 text-amber-700'
                  }`}>
                    📢
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs sm:text-sm font-extrabold truncate ${
                        activeContact?.id === 'broadcast-all' ? 'text-white' : 'text-slate-900'
                      }`}>
                        Broadcast to All Staff
                      </p>
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                        activeContact?.id === 'broadcast-all' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
                      }`}>
                        ALL
                      </span>
                    </div>
                    <p className={`text-[11px] truncate ${
                      activeContact?.id === 'broadcast-all' ? 'text-amber-100' : 'text-slate-500'
                    }`}>
                      Doctor, Nurse, Receptionist (Same Message)
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* For Staff: Announcement Channel from Admin */}
            {!isAdmin && (
              <div className="p-2.5 sm:px-4 border-b border-slate-200 bg-slate-100/60">
                <button
                  type="button"
                  onClick={() => handleSelectContact(BROADCAST_CONTACT)}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition cursor-pointer ${
                    activeContact?.id === 'broadcast-all'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base shrink-0">📢</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate">Hospital Announcements</span>
                      {broadcastUnread > 0 && (
                        <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                          {broadcastUnread} New
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] truncate ${activeContact?.id === 'broadcast-all' ? 'text-slate-300' : 'text-slate-400'}`}>
                      Broadcasts from Hospital Admin
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* Search and Role Filter Tabs */}
            <div className="p-3 border-b border-slate-200 space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search staff by name or designation..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                />
                <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {contactSearch && (
                  <button
                    type="button"
                    onClick={() => setContactSearch('')}
                    className="absolute right-2.5 top-2 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Role filter chips */}
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { id: 'ALL', label: 'All Staff' },
                  { id: 'DOCTOR', label: 'Doctors' },
                  { id: 'NURSE', label: 'Nurses' },
                  { id: 'RECEPTIONIST', label: 'Reception' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setRoleFilter(chip.id)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                      roleFilter === chip.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contacts Scrollable List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[380px] md:max-h-[500px]">
              {loadingContacts ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                  <p className="mt-2 text-xs font-medium">Loading hospital staff…</p>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs px-4">
                  No staff members match the selected filter in your hospital.
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = activeContact?.email === contact.email;
                  const unreadCount = unreadMap[contact.email.toLowerCase()] || 0;

                  return (
                    <button
                      key={contact.email}
                      type="button"
                      onClick={() => handleSelectContact(contact)}
                      className={`w-full p-2.5 sm:px-3.5 flex items-center gap-3 text-left transition cursor-pointer hover:bg-slate-100/80 ${
                        isSelected ? 'bg-teal-50/80 border-r-3 border-teal-600' : ''
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs shadow-xs ${getRoleAvatarBg(contact.role)}`}>
                          {getInitials(contact.name)}
                        </div>
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                            {unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs sm:text-sm truncate ${unreadCount > 0 ? 'font-black text-slate-900' : 'font-semibold text-slate-800'}`}>
                            {contact.name}
                          </p>
                          <span className={`shrink-0 rounded-md px-1.5 py-0.2 text-[9px] font-bold uppercase border ${getRoleBadgeStyle(contact.role)}`}>
                            {contact.role === 'NURSES' ? 'Nurse' : contact.role === 'RECEPTIONISTS' ? 'Receptionist' : contact.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {contact.designation || contact.email}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: ACTIVE CONVERSATION & CHAT STREAM */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col h-full bg-white">
            
            {/* Conversation Header */}
            {activeContact ? (
              <div className="p-3 sm:p-4 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm shadow-xs ${
                    activeContact.is_broadcast ? 'bg-amber-500 text-white' : getRoleAvatarBg(activeContact.role)
                  }`}>
                    {activeContact.is_broadcast ? '📢' : getInitials(activeContact.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                        {activeContact.name}
                      </h2>
                      <span className={`shrink-0 rounded-md px-2 py-0.2 text-[10px] font-extrabold uppercase border ${
                        activeContact.is_broadcast ? 'bg-amber-100 text-amber-800 border-amber-300' : getRoleBadgeStyle(activeContact.role)
                      }`}>
                        {activeContact.is_broadcast ? 'Broadcast' : activeContact.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {activeContact.is_broadcast
                        ? 'Broadcasting to all Doctors, Nurses, and Receptionists in this branch'
                        : `${activeContact.designation || activeContact.role} • ${hospitalInfo?.name || 'Hospital'}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fetchMessages(activeContact, false)}
                    title="Refresh conversation"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-b border-slate-200 text-sm font-semibold text-slate-500">
                Select a colleague from the left to start communicating.
              </div>
            )}

            {/* Messages Stream Container */}
            <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3 bg-slate-50/40 min-h-[350px] max-h-[500px]">
              {!activeContact ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-400">
                  <div className="h-16 w-16 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-3">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Select a staff member</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Choose your Hospital Admin, a doctor, nurse, or receptionist to exchange direct messages.
                  </p>
                </div>
              ) : loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                  <p className="mt-2 text-xs font-semibold">Loading messages…</p>
                </div>
              ) : deduplicateMessages(messages).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-400">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mb-2">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">No messages yet</h4>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    {activeContact.is_broadcast
                      ? 'No broadcast announcements have been posted yet.'
                      : `Say hello to ${activeContact.name} to initiate a direct conversation.`}
                  </p>
                </div>
              ) : (
                deduplicateMessages(messages).map((msg, index, arr) => {
                  const isMine = msg.sender_email.toLowerCase() === email.toLowerCase();
                  const showDate =
                    index === 0 ||
                    formatChatDate(arr[index - 1]?.created_at) !== formatChatDate(msg.created_at);

                  return (
                    <div key={msg.id || `msg-${index}-${msg.created_at}`} className="space-y-1">
                      {showDate && (
                        <div className="flex items-center justify-center my-3">
                          <span className="rounded-full bg-slate-200/80 px-3 py-0.5 text-[10px] font-bold text-slate-600 shadow-2xs">
                            {formatChatDate(msg.created_at)}
                          </span>
                        </div>
                      )}

                      <div className={`group flex items-end gap-1.5 sm:gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {!isMine && (
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold text-[10px] ${getRoleAvatarBg(msg.sender_role)}`}>
                            {getInitials(msg.sender_name)}
                          </div>
                        )}

                        {/* Delete button (for sent messages) */}
                        {isMine && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMessage(msg);
                            }}
                            title="Delete message permanently from database"
                            className="opacity-80 hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer self-center"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}

                        <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                          isMine
                            ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-br-xs'
                            : msg.is_broadcast
                            ? 'bg-amber-50 border border-amber-200 text-slate-900 rounded-bl-xs'
                            : 'bg-white border border-slate-200/90 text-slate-900 rounded-bl-xs'
                        }`}>
                          {/* Sender details on received messages */}
                          {!isMine && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[11px] font-black text-slate-800">
                                {msg.sender_name}
                              </span>
                              <span className={`rounded-md px-1 py-0.1 text-[9px] font-extrabold uppercase border ${getRoleBadgeStyle(msg.sender_role)}`}>
                                {msg.sender_role}
                              </span>
                              {msg.is_broadcast && (
                                <span className="rounded-md bg-amber-200 text-amber-900 px-1 py-0.1 text-[9px] font-extrabold uppercase">
                                  Announcement
                                </span>
                              )}
                            </div>
                          )}

                          {/* Message Content */}
                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {msg.message}
                          </p>

                          {/* Footer: Timestamp and Read Receipt */}
                          <div className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] font-medium ${
                            isMine ? 'text-teal-100' : 'text-slate-400'
                          }`}>
                            <span>{formatChatTime(msg.created_at)}</span>

                            {/* Read Receipt (Only for messages sent by this user) */}
                            {isMine && !msg.is_broadcast && (
                              <span
                                title={
                                  msg.is_read
                                    ? `Read by recipient${msg.read_at ? ` at ${formatChatTime(msg.read_at)}` : ''}`
                                    : 'Sent (Delivered, Unread)'
                                }
                                className="inline-flex items-center"
                              >
                                {msg.is_read ? (
                                  // Double Blue Check (Read)
                                  <span className="inline-flex items-center text-teal-200 font-black">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <svg className="-ml-2 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </span>
                                ) : (
                                  // Single Check (Sent / Unread)
                                  <svg className="w-3.5 h-3.5 text-teal-200/70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete button (for received messages or admin) */}
                        {!isMine && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMessage(msg);
                            }}
                            title="Delete message permanently from database"
                            className="opacity-80 hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer self-center"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            {activeContact && (
              <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
                {activeContact.is_broadcast && !isAdmin ? (
                  <div className="p-2.5 rounded-xl bg-slate-100 text-center text-xs font-semibold text-slate-500">
                    🔒 This is an announcement channel. Only Hospital Admins can broadcast messages to all staff.
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        rows="2"
                        placeholder={
                          activeContact.is_broadcast
                            ? 'Type an announcement message to broadcast to all Doctors, Nurses, and Receptionists...'
                            : `Message ${activeContact.name}... (Press Enter to send, Shift+Enter for new line)`
                        }
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 sm:p-3 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-200 transition"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!inputMessage.trim()}
                      className={`inline-flex h-11 items-center justify-center rounded-xl px-4 sm:px-5 font-bold text-xs sm:text-sm text-white shadow-md transition cursor-pointer active:scale-95 ${
                        !inputMessage.trim()
                          ? 'bg-slate-300 cursor-not-allowed'
                          : activeContact.is_broadcast
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-600/25'
                          : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-teal-600/25'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{activeContact.is_broadcast ? 'Broadcast' : 'Send'}</span>
                        <svg className="w-4 h-4 rotate-45 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternalChat;
