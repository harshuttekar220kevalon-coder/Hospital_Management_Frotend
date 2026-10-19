import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../Api/Api';

const roles = ['Head Nurse', 'Staff Nurse'];
const wards = ['ICU', 'NICU', 'General Ward', 'Emergency Ward', 'Operation Theatre', 'OPD'];
const shifts = ['Morning First Shift', 'Afternoon Second Shift', 'Evening Third Shift'];

const AdminNurseDetails = ({ currentUser, selectedNurse, setSelectedNurse, setCurrentPage }) => {
  const [nurse, setNurse] = useState(() => {
    if (selectedNurse?.id) return selectedNurse;
    try { return JSON.parse(localStorage.getItem('selectedNurse') || 'null'); } catch { return null; }
  });
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(true);
  const [form, setForm] = useState({});

  const updateNurse = (updated) => {
    setNurse(updated);
    setSelectedNurse?.(updated);
    try { localStorage.setItem('selectedNurse', JSON.stringify(updated)); } catch {}
  };

  const loadNurse = async () => {
    if (!nurse?.id) { setLoading(false); return; }
    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/Nurses/${nurse.id}/`).catch(() => null);
      if (response?.status === 404) {
        localStorage.removeItem('selectedNurse');
        setSelectedNurse?.(null);
        setNurse(null);
        setCurrentPage?.('admin_nurses');
        return;
      }
      const fresh = response?.ok ? await response.json().catch(() => nurse) : nurse;
      if (response?.ok) updateNurse(fresh);
      const hospitalId = fresh.hospital?.id || fresh.hospital || currentUser?.hospital?.id || currentUser?.hospital || currentUser?.hospital_data?.id;
      if (hospitalId) {
        const hospitalResponse = await fetch(`${API_BASE_URL}/super-admin/Hospital/${hospitalId}/`).catch(() => null);
        if (hospitalResponse?.ok) setHospital(await hospitalResponse.json());
      }
    } catch (error) { console.error('Error loading nurse details:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadNurse();
    const interval = setInterval(loadNurse, 3500);
    const onFocus = () => loadNurse();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [selectedNurse?.id]);

  const openEdit = () => {
    setForm({
      name: nurse.name || '',
      nurse_id: nurse.nurse_id || `NUR-${nurse.id}`,
      role: nurse.role || 'Staff Nurse',
      ward: nurse.ward || 'General Ward',
      shift: nurse.shift || shifts[0],
      qualification: nurse.qualification || '',
      experience: nurse.experience || '',
      contact: (nurse.contact || '').replace(/\D/g, '').slice(0, 10),
      email: nurse.email || '',
      hospital: nurse.hospital?.id || nurse.hospital || '',
      status: nurse.status || 'On_Duty',
      is_active: nurse.is_active !== false,
      max_patient_capacity: nurse.max_patient_capacity ?? 50,
      assigned_floor: nurse.assigned_floor ?? ''
    });
    setEditing(true);
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    const cleanContact = (form.contact || '').replace(/\D/g, '').slice(0, 10);
    if (!cleanContact || cleanContact.length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }
    if (!form.email || !form.email.trim().toLowerCase().endsWith('@gmail.com')) {
      alert("Email must be a valid @gmail.com address.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      role: form.role,
      ward: form.ward,
      shift: form.shift,
      qualification: form.qualification.trim() || null,
      experience: form.experience.trim() || null,
      contact: cleanContact,
      email: form.email.trim(),
      is_active: Boolean(form.is_active),
      max_patient_capacity: Number(form.max_patient_capacity) || 50,
      assigned_floor: form.assigned_floor === '' ? null : Number(form.assigned_floor)
    };
    const response = await fetch(`${API_BASE_URL}/super-admin/Nurses/${nurse.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => null);
    if (response?.ok) {
      const updated = await response.json().catch(() => payload);
      updateNurse({ ...nurse, ...payload, ...updated });
      setEditing(false);
    } else {
      const error = await response?.json().catch(() => null);
      alert(error?.detail || error?.message || 'Unable to update nurse profile.');
    }
  };

  const updateAccountStatus = async (isActive) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/Nurses/${nurse.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: isActive }) }).catch(() => null);
    if (response?.ok) updateNurse({ ...nurse, is_active: isActive });
    else alert('Unable to update account status.');
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (password.length < 6 || password.length > 12) { alert('Password must be between 6 and 12 characters.'); return; }
    const response = await fetch(`${API_BASE_URL}/super-admin/Nurses/${nurse.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }).catch(() => null);
    if (response?.ok) { setResetOpen(false); setPassword(''); alert('Nurse password reset successfully.'); }
    else alert('Unable to reset nurse password.');
  };

  const deleteNurse = async () => {
    const response = await fetch(`${API_BASE_URL}/super-admin/Nurses/${nurse.id}/`, { method: 'DELETE' }).catch(() => null);
    if (response?.ok || response?.status === 204) {
      localStorage.removeItem('selectedNurse');
      setSelectedNurse?.(null);
      setCurrentPage?.('admin_nurses');
    } else alert('Unable to delete nurse.');
  };

  const goBack = () => setCurrentPage?.('admin_nurses');
  const active = nurse?.is_active !== false;
  const offDuty = String(nurse?.status || '').toLowerCase().includes('off');
  const dutyStatus = offDuty ? 'Off_Duty' : 'On_Duty';
  const hospitalId = hospital?.id || (typeof nurse?.hospital === 'object' ? nurse.hospital?.id : nurse?.hospital) || currentUser?.hospital?.id || currentUser?.hospital;
  const inputClass = 'w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white';

  if (!nurse) return <div className="p-8 text-center space-y-4"><p className="text-slate-500 text-sm">No nurse selected.</p><button onClick={goBack} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer">← Back to Nurses</button></div>;

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button type="button" onClick={goBack} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">← Back to Nurses List</button>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${active ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <div className="leading-tight"><p className={`text-xs font-bold ${active ? 'text-emerald-800' : 'text-rose-800'}`}>Account {active ? 'Active' : 'Inactive'}</p><p className="text-[10px] text-slate-500">{active ? 'Login access enabled' : 'Login access disabled'}</p></div>
            <button type="button" role="switch" aria-checked={active} aria-label={active ? 'Deactivate nurse account' : 'Activate nurse account'} onClick={() => updateAccountStatus(!active)} className={`relative ml-2 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${active ? 'bg-emerald-600' : 'bg-slate-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} /></button>
          </div>
          <button type="button" onClick={openEdit} className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer">Edit Nurse</button>
          <button type="button" onClick={() => setResetOpen(true)} className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer">Reset Password</button>
          <button type="button" onClick={() => setDeleteOpen(true)} className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer">Delete</button>
        </div>
      </div>

      <header className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800"><div className="flex items-center gap-4"><div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white font-bold flex items-center justify-center text-2xl">{(nurse.name || 'Nurse').replace(/^(Sister|Nurse|Ms\.)\s*/i, '').slice(0, 2).toUpperCase()}</div><div><p className="text-xs uppercase tracking-wider text-teal-200 font-semibold">Nursing Staff Profile</p><h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 text-white">{nurse.name || 'Not Provided'}</h1><p className="text-xs text-slate-300 mt-1">Clinical and contact information</p></div></div></header>

      {loading && <p className="text-xs text-slate-500">Refreshing nurse details…</p>}
      <section className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500" />
        <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-5"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-xl font-bold text-white shadow-sm">{(nurse.name || 'Nurse').replace(/^(Sister|Nurse|Ms\.)\s*/i, '').slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">Nurse Profile</p><h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">{nurse.name || 'Not Provided'}</h2><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs"><span><span className="text-slate-400">Nurse ID </span><strong className="font-mono text-slate-700">{nurse.nurse_id || `NUR-${nurse.id}`}</strong></span><span><span className="text-slate-400">Created </span><strong className="text-slate-700">{nurse.created_at || 'Not Provided'}</strong></span></div></div></div>
        <div className="mb-5"><h3 className="text-base font-bold text-slate-800">Nurse Information</h3><p className="mt-1 text-xs text-slate-500">Role, ward assignment, and contact information</p></div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/70 p-4 sm:p-5 transition-colors hover:from-teal-50 hover:to-emerald-50"><h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Professional</h3><div className="space-y-4">{[['Role', nurse.role], ['Ward', nurse.ward], ['Qualification', nurse.qualification], ['Experience', nurse.experience]].map(([label, value]) => <div key={label}><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{value || 'Not Provided'}</p></div>)}</div></div>
          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/70 p-4 sm:p-5 transition-colors hover:from-sky-50 hover:to-cyan-50"><h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Duty & Assignment</h3><div className="space-y-4"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Duty Status</p><span className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${offDuty ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}><span className={`h-2 w-2 rounded-full ${offDuty ? 'bg-amber-500' : 'bg-emerald-500'}`} />{dutyStatus}</span></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Shift</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{nurse.shift || 'Not Provided'}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Maximum Patient Capacity</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{nurse.max_patient_capacity ?? 50} patients</p></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Assigned Floor</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{nurse.assigned_floor ?? 'Not Assigned'}</p></div></div></div>
          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/60 p-4 sm:p-5 transition-colors hover:from-indigo-50 hover:to-violet-50"><h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Hospital & Contact</h3><div className="space-y-4"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Hospital</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{hospital?.Name || nurse.hospital_name || 'Not Provided'}</p>{hospital?.city && <p className="text-xs text-slate-500">{hospital.city}</p>}</div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Phone</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{nurse.contact || 'Not Provided'}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Email</p>{nurse.email ? <a href={`mailto:${nurse.email}`} className="mt-0.5 block break-all text-sm font-semibold text-sky-700 hover:underline">{nurse.email}</a> : <p className="mt-0.5 text-sm font-semibold text-slate-800">Not Provided</p>}</div></div></div>
        </div>
      </section>

      {editing && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"><div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 my-auto"><div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-lg font-bold text-slate-800">Edit Nurse Profile</h2><button type="button" onClick={() => setEditing(false)} className="text-2xl text-slate-400 cursor-pointer">×</button></div>
        <form onSubmit={submitEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="font-semibold text-slate-700">Hospital & ID (unchangeable)<input readOnly value={`${hospital?.Name || nurse.hospital_name || 'Assigned hospital'}${hospitalId ? ` · ID ${hospitalId}` : ''}`} className={`${inputClass} mt-1 bg-slate-100`} /></label>
          <label className="font-semibold text-slate-700">Nurse ID (unchangeable)<input readOnly value={form.nurse_id} className={`${inputClass} mt-1 bg-slate-100`} /></label>
          <label className="sm:col-span-2 font-semibold text-slate-700">Full Name *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Role *<select required value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className={`${inputClass} mt-1`}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
          <label className="font-semibold text-slate-700">Ward *<select required value={form.ward} onChange={(event) => setForm({ ...form, ward: event.target.value })} className={`${inputClass} mt-1`}>{wards.map((ward) => <option key={ward}>{ward}</option>)}</select></label>
          <label className="font-semibold text-slate-700">Shift<select value={form.shift} onChange={(event) => setForm({ ...form, shift: event.target.value })} className={`${inputClass} mt-1`}>{shifts.map((shift) => <option key={shift}>{shift}</option>)}</select></label>
          <label className="font-semibold text-slate-700">Phone *<input required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value.replace(/\D/g, '').slice(0, 10) })} className={`${inputClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Email *<input required type="email" pattern="[a-zA-Z0-9._%+-]+@gmail\.com" title="Email must be a valid @gmail.com address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Qualification<input value={form.qualification} onChange={(event) => setForm({ ...form, qualification: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Experience<input value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Maximum Patient Capacity<input required type="number" min="1" value={form.max_patient_capacity} onChange={(event) => setForm({ ...form, max_patient_capacity: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Assigned Floor<input type="number" min="0" value={form.assigned_floor} onChange={(event) => setForm({ ...form, assigned_floor: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Duty Status (unchangeable)<input readOnly value={form.status} className={`${inputClass} mt-1 bg-slate-100`} /></label>
          <label className="font-semibold text-slate-700">Created At (automatic)<input readOnly value={nurse.created_at || 'Assigned on registration'} className={`${inputClass} mt-1 bg-slate-100`} /></label>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Password</span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Read Only
              </span>
            </div>
            <div className="relative">
              <input
                type="password"
                readOnly
                tabIndex={-1}
                value={nurse.password || 'Nurse@123'}
                className={`${inputClass} mt-1 bg-slate-100 font-mono cursor-not-allowed select-all`}
              />
            </div>
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold text-slate-700"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="h-4 w-4 rounded text-teal-600" />Account is active</label>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-pointer">Cancel</button><button type="submit" className="px-5 py-2 rounded-xl bg-teal-600 text-white font-bold cursor-pointer">Save Changes</button></div>
        </form></div></div>}
      {resetOpen && <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"><form onSubmit={resetPassword} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4"><h2 className="font-bold text-slate-800">Reset Nurse Password</h2><input type="password" minLength={6} maxLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter new password" className={inputClass} /><div className="flex justify-end gap-2"><button type="button" onClick={() => setResetOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 cursor-pointer">Cancel</button><button className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold cursor-pointer">Reset Password</button></div></form></div>}
      {deleteOpen && <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4"><h2 className="font-bold text-slate-800">Confirm Nurse Removal</h2><p className="text-xs text-slate-500">Remove {nurse.name} from the nurse records?</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setDeleteOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 cursor-pointer">Cancel</button><button type="button" onClick={deleteNurse} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold cursor-pointer">Delete Nurse</button></div></div></div>}
    </div>
  );
};

export default AdminNurseDetails;
