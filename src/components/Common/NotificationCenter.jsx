import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../Api/Api';
import { getNotificationEndpoint, getNotificationHeaders, getNotificationParams, getNotificationRole } from './notificationApi';

const readError = async (response) => {
  try {
    const data = await response.json();
    return data.detail || data.message || Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' Â· ');
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

const NotificationCenter = ({ currentUser }) => {
  const endpoint = getNotificationEndpoint(currentUser?.role);
  const role = getNotificationRole(currentUser?.role);
  const email = currentUser?.email || '';
  const [notifications, setNotifications] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [filter, setFilter] = useState('inbox');
  const [importantOnly, setImportantOnly] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [form, setForm] = useState({ recipient: '', title: '', message: '', is_important: false });
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryParams = useCallback((extra = {}) => {
    const params = getNotificationParams(currentUser);
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    return params;
  }, [currentUser]);

  const loadNotifications = useCallback(async () => {
    if (!endpoint || !email) {
      setLoading(false);
      setError('Your account email is missing. Sign out and sign in again to load notifications.');
      return;
    }
    try {
      const params = queryParams({ direction: filter, important: importantOnly ? 'true' : '' });
      const response = await fetch(`${endpoint}?${params.toString()}`, { headers: getNotificationHeaders(currentUser) });
      if (!response.ok) throw new Error(await readError(response));
      const payload = await response.json();
      setNotifications(Array.isArray(payload) ? payload : payload.results || []);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [email, endpoint, filter, importantOnly, queryParams]);

  const loadRecipients = useCallback(async () => {
    if (!email) return;
    try {
      const params = new URLSearchParams({ current_email: email });
      const response = await fetch(`${API_BASE_URL}/notifications/recipients/?${params.toString()}`, { headers: getNotificationHeaders(currentUser) });
      if (!response.ok) throw new Error(await readError(response));
      const payload = await response.json();
      setRecipients(Array.isArray(payload) ? payload : []);
    } catch (loadError) {
      setError(loadError.message || 'Could not load user directory.');
    }
  }, [email]);

  useEffect(() => {
    setLoading(true);
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 20000);
    window.addEventListener('focus', loadNotifications);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', loadNotifications);
    };
  }, [loadNotifications]);

  useEffect(() => {
    loadRecipients();
  }, [loadRecipients]);

  const visibleRecipients = useMemo(() => {
    const search = recipientSearch.toLowerCase().trim();
    if (!search) return recipients;
    return recipients.filter((person) => `${person.name} ${person.email} ${person.role}`.toLowerCase().includes(search));
  }, [recipientSearch, recipients]);

  const openNotification = async (item) => {
    setSelected(item);
    setThread([item]);
    setError('');
    try {
      const params = queryParams();
      const isIncoming = item.recipient_email?.toLowerCase() === email.toLowerCase() || (!item.sender_email && item.recipient_role === role);
      let opened = item;
      if (isIncoming && !item.is_read) {
        const response = await fetch(`${endpoint}${item.id}/?${params.toString()}`, { headers: getNotificationHeaders(currentUser) });
        if (!response.ok) throw new Error(await readError(response));
        opened = await response.json();
        setSelected(opened);
        setNotifications((items) => items.map((entry) => entry.id === item.id ? opened : entry));
      }
      if (item.thread_id) {
        const threadParams = queryParams({ thread_id: item.thread_id });
        const response = await fetch(`${endpoint}?${threadParams.toString()}`, { headers: getNotificationHeaders(currentUser) });
        if (response.ok) {
          const payload = await response.json();
          const entries = Array.isArray(payload) ? payload : payload.results || [];
          setThread(entries.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
        }
      }
    } catch (openError) {
      setError(openError.message || 'Could not open this message.');
    }
  };

  const submitMessage = async (event, reply = false) => {
    event.preventDefault();
    const recipient = reply
      ? (selected.sender_email?.toLowerCase() === email.toLowerCase()
        ? { email: selected.recipient_email, role: selected.recipient_role }
        : { email: selected.sender_email, role: selected.sender_role })
      : (() => {
        const [recipientEmail, recipientRole] = form.recipient.split('|');
        return { email: recipientEmail, role: recipientRole };
      })();
    const bodyText = reply ? replyText.trim() : form.message.trim();
    const title = reply ? (selected.title.startsWith('Re:') ? selected.title : `Re: ${selected.title}`) : form.title.trim();
    if (!recipient.email || !recipient.role || !bodyText || !title) {
      setError('Choose a recipient and enter a subject and message.');
      return;
    }
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/send/`, {
        method: 'POST',
        headers: getNotificationHeaders(currentUser, true),
        body: JSON.stringify({
          sender_email: email,
          sender_role: role,
          recipient_email: recipient.email,
          recipient_role: recipient.role,
          title,
          message: bodyText,
          is_important: reply ? false : form.is_important,
          ...(reply ? { thread_id: selected.thread_id, reply_to: thread.at(-1)?.message_id || selected.message_id } : {}),
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const result = await response.json();
      setSuccess(result.message || 'Message sent.');
      setReplyText('');
      if (reply) {
        const params = queryParams({ thread_id: selected.thread_id });
        const refreshed = await fetch(`${endpoint}?${params.toString()}`, { headers: getNotificationHeaders(currentUser) });
        if (refreshed.ok) {
          const entries = await refreshed.json();
          setThread((Array.isArray(entries) ? entries : entries.results || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
        }
      } else {
        setComposeOpen(false);
        setForm({ recipient: '', title: '', message: '', is_important: false });
        setFilter('sent');
      }
      await loadNotifications();
    } catch (sendError) {
      setError(sendError.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const unreadCount = notifications.filter((item) => !item.is_read && (item.recipient_email?.toLowerCase() === email.toLowerCase() || (!item.sender_email && item.recipient_role === role))).length;
  const activeThread = thread.length ? thread : selected ? [selected] : [];
  const latestMessage = activeThread.at(-1) || selected;
  const canReply = selected && latestMessage?.sender_email && latestMessage.sender_email.toLowerCase() !== email.toLowerCase();

  return (
    <section className="min-h-[calc(100vh-5rem)] w-full flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">{role?.replace('_', ' ') || 'Account'} inbox</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Notifications & messages</h1>
          <p className="mt-1 text-sm text-slate-500">Messages and updates for {email}.</p>
        </div>
        <button type="button" onClick={() => { setComposeOpen(true); setSelected(null); setSuccess(''); setError(''); }} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-800">
          <span className="text-lg leading-none">+</span> New message
        </button>
      </div>

      {error && !composeOpen && !selected && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <div className="min-h-[calc(100vh-13rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {['inbox', 'sent'].map((value) => <button key={value} type="button" onClick={() => { setFilter(value); setSelected(null); }} className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${filter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{value}</button>)}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={importantOnly} onChange={(event) => setImportantOnly(event.target.checked)} className="rounded border-slate-300 text-amber-500 focus:ring-amber-400" /> Important only</label>
        </div>
        <div className="max-h-[calc(100vh-18rem)] divide-y divide-slate-100 overflow-y-auto">
          {loading ? <p className="p-6 text-sm text-slate-500">Loading messages…</p> : notifications.length === 0 ? <div className="p-12 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">?</div><p className="font-bold text-slate-800">No messages here</p><p className="mt-1 text-sm text-slate-500">New messages will appear here automatically.</p></div> : notifications.map((item) => {
            const isIncoming = item.recipient_email?.toLowerCase() === email.toLowerCase() || (!item.sender_email && item.recipient_role === role);
            const unread = isIncoming && !item.is_read;
            const sender = item.sender_name || item.sender_email || 'Hospital system';
            return <button key={item.message_id || item.id} type="button" onClick={() => openNotification(item)} className={`w-full p-4 text-left transition hover:bg-slate-50 sm:px-6 ${selected?.thread_id === item.thread_id ? 'bg-teal-50/70' : ''}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${unread ? 'bg-teal-500' : 'bg-transparent'}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2"><span className={`truncate text-sm ${unread ? 'font-extrabold text-slate-900' : 'font-bold text-slate-700'}`}>{item.title}</span>{item.is_important && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800">Important</span>}{unread && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-extrabold text-teal-800">New</span>}</span>
                  <span className="mt-1 block text-xs text-slate-500">{filter === 'sent' ? `To ${item.recipient_email}` : `From ${sender}`} · {formatDate(item.created_at)}</span>
                  <span className="mt-2 line-clamp-2 block text-sm leading-5 text-slate-600">{item.message}</span>
                </span>
              </div>
            </button>;
          })}
        </div>
        {filter === 'inbox' && unreadCount > 0 && <div className="border-t border-slate-100 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-800">{unreadCount} unread message{unreadCount === 1 ? '' : 's'}</div>}
      </div>

      {composeOpen && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setComposeOpen(false); }}>
        <form role="dialog" aria-modal="true" aria-labelledby="compose-notification-title" onSubmit={(event) => submitMessage(event, false)} className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6"><div><h2 id="compose-notification-title" className="text-lg font-extrabold text-slate-900">Compose message</h2><p className="mt-1 text-sm text-slate-500">Choose a user and add your message details.</p></div><button type="button" onClick={() => setComposeOpen(false)} aria-label="Close compose window" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button></div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
            {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="notification-recipient-search">Find recipient</label><input id="notification-recipient-search" value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} placeholder="Search name, email or role" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></div>
            <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="notification-recipient">To</label><select id="notification-recipient" required value={form.recipient} onChange={(event) => setForm((prev) => ({ ...prev, recipient: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"><option value="">Select a user</option>{visibleRecipients.map((person) => <option key={`${person.role}:${person.email}`} value={`${person.email}|${person.role}`}>{person.name} · {person.role.replace('_', ' ')} · {person.email}</option>)}</select>{recipients.length === 0 && <p className="mt-1 text-xs text-amber-700">User directory is empty or unavailable.</p>}</div>
            <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="notification-title">Subject</label><input id="notification-title" required maxLength={160} value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" placeholder="Message subject" /></div>
            <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="notification-message">Message</label><textarea id="notification-message" required rows={6} value={form.message} onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))} className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" placeholder="Write your message" /></div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-900"><input type="checkbox" checked={form.is_important} onChange={(event) => setForm((prev) => ({ ...prev, is_important: event.target.checked }))} className="rounded border-amber-300 text-amber-600 focus:ring-amber-400" /> Mark this message as important</label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 p-5 sm:px-6"><button type="button" onClick={() => setComposeOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button disabled={sending || recipients.length === 0} className="rounded-xl bg-teal-700 px-5 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60">{sending ? 'Sending…' : 'Send message'}</button></div>
        </form>
      </div>}

      {selected && <div className="fixed inset-0 z-[110] flex flex-col bg-white" role="dialog" aria-modal="true" aria-labelledby="notification-fullscreen-title">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-8"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 id="notification-fullscreen-title" className="break-words text-lg font-extrabold text-slate-900 sm:text-xl">{selected.title}</h2>{selected.is_important && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-800">Important</span>}</div><p className="mt-1 text-sm text-slate-500">Conversation · {formatDate(selected.created_at)}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Close message" className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">×</button></div>
        {error && <div role="alert" className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-8">{error}</div>}
        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-4 py-5 sm:px-8 sm:py-7">{activeThread.map((item) => { const own = item.sender_email?.toLowerCase() === email.toLowerCase(); return <article key={item.message_id || item.id} className={`w-full rounded-2xl border p-4 shadow-sm sm:p-6 ${own ? 'border-teal-200 bg-teal-50' : 'border-slate-200 bg-white'}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-extrabold text-slate-800">{item.sender_name || item.sender_email || 'Hospital system'} <span className="font-medium text-slate-400">· {item.sender_role?.replace('_', ' ') || 'System'}</span></p><time className="text-xs text-slate-400">{formatDate(item.created_at)}</time></div><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 sm:text-base">{item.message}</p></article>; })}</div>
        <section className="max-h-[38vh] shrink-0 overflow-y-auto border-t border-slate-200 bg-white px-4 py-4 sm:px-8">
          <h3 className="mb-3 text-sm font-extrabold text-slate-800">Notification record details</h3>
          <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Record ID', selected.id],
              ['Category', selected.category],
              ['Sender name', selected.sender_name],
              ['Sender email', selected.sender_email],
              ['Sender role', selected.sender_role],
              ['Recipient email', selected.recipient_email],
              ['Recipient role', selected.recipient_role],
              ['Message ID', selected.message_id],
              ['Thread ID', selected.thread_id],
              ['Reply to', selected.reply_to],
              ['Important', selected.is_important ? 'Yes' : 'No'],
              ['Read status', selected.is_read ? 'Read' : 'Unread'],
              ['Receipt notification', selected.read_at ? selected.id : 'No read receipt'],
              ['Receipt recipient', selected.read_at ? email : 'No read receipt'],
              ['Read at', selected.read_at ? formatDate(selected.read_at) : 'Not read'],
              ['Created at', formatDate(selected.created_at)],
              ['Updated at', formatDate(selected.updated_at)],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-lg bg-slate-50 p-2.5">
                <dt className="font-bold uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className="mt-1 break-words font-semibold text-slate-700">{value === null || value === undefined || value === '' ? 'Not provided' : String(value)}</dd>
              </div>
            ))}
            <div className="min-w-0 rounded-lg bg-slate-50 p-2.5 sm:col-span-2 lg:col-span-3">
              <dt className="font-bold uppercase tracking-wide text-slate-400">Additional data</dt>
              <dd className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-slate-700">{JSON.stringify(selected.data ?? {}, null, 2)}</dd>
            </div>
          </dl>
        </section>
        {canReply && <form onSubmit={(event) => submitMessage(event, true)} className="border-t border-slate-200 bg-white p-4 sm:px-8 sm:py-5"><label htmlFor="notification-reply" className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Reply to {latestMessage.sender_name || latestMessage.sender_email}</label><div className="flex flex-col gap-2 sm:flex-row"><textarea id="notification-reply" required rows={2} value={replyText} onChange={(event) => setReplyText(event.target.value)} className="min-h-12 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" placeholder="Write a reply" /><button disabled={sending} className="rounded-xl bg-teal-700 px-5 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60">{sending ? 'Sending…' : 'Reply'}</button></div></form>}
      </div>}
    </section>
  );
};

export default NotificationCenter;

