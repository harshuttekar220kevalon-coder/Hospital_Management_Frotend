import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../Api/Api';

const shifts = ['Morning First Shift', 'Afternoon Second Shift', 'Evening Third Shift'];
const getDepartments = (hospital) => (Array.isArray(hospital?.departments)
  ? hospital.departments.map((item) => typeof item === 'string' ? item : item?.name)
  : String(hospital?.departments || hospital?.department || '').split(','))
  .map((item) => String(item || '').trim()).filter(Boolean);

const AdminDoctorDetails = ({ currentUser, selectedDoctor, setSelectedDoctor, setCurrentPage }) => {
  const [doctor, setDoctor] = useState(() => {
    if (selectedDoctor) return selectedDoctor;
    try { return JSON.parse(localStorage.getItem('selectedDoctor') || 'null'); } catch { return null; }
  });
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [form, setForm] = useState({});

  const updateDoctor = (updated) => {
    setDoctor(updated);
    setSelectedDoctor?.(updated);
    try { localStorage.setItem('selectedDoctor', JSON.stringify(updated)); } catch {}
  };

  const loadDoctor = async () => {
    if (!doctor?.id) { setLoading(false); return; }
    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/Doctors/${doctor.id}/`).catch(() => null);
      const fresh = response?.ok ? await response.json().catch(() => doctor) : doctor;
      if (response?.ok) updateDoctor(fresh);
      const hospitalRelation = Array.isArray(fresh.hospitals) ? fresh.hospitals[0] : fresh.hospitals;
      const hospitalId = hospitalRelation?.id || hospitalRelation || fresh.hospital?.id || fresh.hospital || currentUser?.hospital?.id || currentUser?.hospital;
      if (hospitalId) {
        const hospitalResponse = await fetch(`${API_BASE_URL}/super-admin/Hospital/${hospitalId}/`).catch(() => null);
        if (hospitalResponse?.ok) setHospital(await hospitalResponse.json());
      }
    } catch (error) { console.error('Error loading doctor details:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadDoctor(); }, [selectedDoctor?.id]);

  const openEdit = () => {
    setForm({
      name: doctor.name || '',
      doctor_id: doctor.doctor_id || `DOC-${doctor.id}`,
      specialization: doctor.specialization || '',
      department: String(doctor.department || '').split(',').map((item) => item.trim()).filter(Boolean),
      qualification: doctor.qualification || '',
      experience: doctor.experience || '',
      Shifts: doctor.Shifts || doctor.shift || doctor.opd_timings || shifts[0],
      phone: (doctor.phone || doctor.contact || '').replace(/\D/g, '').slice(0, 10),
      email: doctor.email || '',
      status: doctor.status || 'On_Duty',
      is_active: doctor.is_active !== false,
      consultation_fee: doctor.consultation_fee ?? '0.00'
    });
    setEditing(true);
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (form.department.length === 0) {
      alert('Select at least one department.');
      return;
    }
    const payload = {
      name: /^Dr\.?\s/i.test(form.name) ? form.name.trim() : `Dr. ${form.name.trim()}`,
      specialization: form.specialization.trim(),
      department: form.department.join(', '),
      qualification: form.qualification.trim() || null,
      experience: form.experience.trim() || null,
      Shifts: form.Shifts,
      phone: form.phone,
      email: form.email.trim(),
      is_active: form.is_active,
      consultation_fee: form.consultation_fee || '0.00'
    };
    const response = await fetch(`${API_BASE_URL}/super-admin/Doctors/${doctor.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => null);
    if (response?.ok) {
      const result = await response.json().catch(() => payload);
      updateDoctor({ ...doctor, ...payload, ...result });
      setEditing(false);
    } else {
      const error = await response?.json().catch(() => null);
      alert(error?.detail || error?.message || 'Unable to update doctor profile.');
    }
  };

  const updateAccountStatus = async (isActive) => {
    const response = await fetch(`${API_BASE_URL}/super-admin/Doctors/${doctor.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: isActive }) }).catch(() => null);
    if (response?.ok) updateDoctor({ ...doctor, is_active: isActive });
    else alert('Unable to update account status.');
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (password.length < 6) { alert('Password must be at least 6 characters.'); return; }
    const response = await fetch(`${API_BASE_URL}/super-admin/Doctors/${doctor.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }).catch(() => null);
    if (response?.ok) { setResetOpen(false); setPassword(''); alert('Doctor password reset successfully.'); }
    else alert('Unable to reset doctor password.');
  };

  const deleteDoctor = async () => {
    const response = await fetch(`${API_BASE_URL}/super-admin/Doctors/${doctor.id}/`, { method: 'DELETE' }).catch(() => null);
    if (response?.ok || response?.status === 204) {
      localStorage.removeItem('selectedDoctor');
      setSelectedDoctor?.(null);
      setCurrentPage?.('admin_doctors');
    } else alert('Unable to delete doctor.');
  };

  const goBack = () => setCurrentPage?.('admin_doctors');
  const active = doctor?.is_active !== false;
  const onDuty = !String(doctor?.status || '').toLowerCase().includes('off');
  const dutyLabel = onDuty ? 'On Duty' : 'Off Duty';
  const shift = doctor?.Shifts || doctor?.shift || doctor?.opd_timings || 'Not Provided';
  const email = (doctor?.email || '').toLowerCase();
  const departmentOptions = getDepartments(hospital);
  const fieldClass = 'w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white';

  if (!doctor) return <div className="p-8 text-center space-y-4"><p className="text-slate-500 text-sm">No doctor selected.</p><button onClick={goBack} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer">← Back to Doctors</button></div>;

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button type="button" onClick={goBack} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">← Back to Doctors List</button>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${active ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <div className="leading-tight">
              <p className={`text-xs font-bold ${active ? 'text-emerald-800' : 'text-rose-800'}`}>Account {active ? 'Active' : 'Inactive'}</p>
              <p className="text-[10px] text-slate-500">{active ? 'Login access enabled' : 'Login access disabled'}</p>
            </div>
            <button type="button" role="switch" aria-checked={active} aria-label={active ? 'Deactivate doctor account' : 'Activate doctor account'} onClick={() => updateAccountStatus(!active)} className={`relative ml-2 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${active ? 'bg-emerald-600' : 'bg-slate-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <button type="button" onClick={openEdit} className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer">Edit Doctor</button>
          <button type="button" onClick={() => setResetOpen(true)} className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer">Reset Password</button>
          <button type="button" onClick={() => setDeleteOpen(true)} className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer">Delete</button>
        </div>
      </div>

      <header className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white font-bold flex items-center justify-center text-2xl">{(doctor.name || 'Doctor').replace(/^Dr\.?\s*/i, '').slice(0, 2).toUpperCase()}</div>
          <div><p className="text-xs uppercase tracking-wider text-teal-200 font-semibold">Doctor Profile</p><h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 text-white">{doctor.name || 'Not Provided'}</h1><p className="text-xs text-slate-300 mt-1">Complete clinical and contact information</p></div>
        </div>
      </header>

      {loading && <p className="text-xs text-slate-500">Refreshing doctor details…</p>}
      <section className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500" />
        <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-xl font-bold text-white shadow-sm">{(doctor.name || 'Doctor').replace(/^Dr\.?\s*/i, '').slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">Doctor Profile</p><h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">{doctor.name || 'Not Provided'}</h2><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs"><span><span className="text-slate-400">Doctor ID </span><strong className="font-mono text-slate-700">{doctor.doctor_id || `DOC-${doctor.id}`}</strong></span><span><span className="text-slate-400">Created </span><strong className="text-slate-700">{doctor.created_at || 'Not Provided'}</strong></span></div></div>
        </div>
        <div className="mb-5"><h3 className="text-base font-bold text-slate-800">Doctor Information</h3><p className="mt-1 text-xs text-slate-500">Clinical, duty, and contact details</p></div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/70 p-4 sm:p-5 transition-colors hover:from-teal-50 hover:to-emerald-50">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Professional</h3>
            <div className="space-y-4">
              {[['Specialization', doctor.specialization], ['Department(s)', doctor.department], ['Qualification', doctor.qualification], ['Experience', doctor.experience]].map(([label, value]) => <div key={label}><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{value || 'Not Provided'}</p></div>)}
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/70 p-4 sm:p-5 transition-colors hover:from-sky-50 hover:to-cyan-50">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Duty & Schedule</h3>
            <div className="space-y-4">
              <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Duty Status</p><span className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${onDuty ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}><span className={`h-2 w-2 rounded-full ${onDuty ? 'bg-emerald-500' : 'bg-amber-500'}`} />{dutyLabel}</span></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Duty Shift</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{shift}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Consultation Fee</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{doctor.consultation_fee ? `₹${Number(doctor.consultation_fee).toFixed(2)}` : '₹0.00'}</p></div>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/60 p-4 sm:p-5 transition-colors hover:from-indigo-50 hover:to-violet-50">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Hospital & Contact</h3>
            <div className="space-y-4">
              <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Hospital</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{hospital?.Name || doctor.hospital_name || 'Not Provided'}</p>{hospital?.city && <p className="text-xs text-slate-500">{hospital.city}</p>}</div>
              <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Phone</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{doctor.phone || doctor.contact || 'Not Provided'}</p></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Email</p>{email ? <a href={`mailto:${email}`} className="mt-0.5 block break-all text-sm font-semibold text-sky-700 hover:text-sky-900 hover:underline">{email}</a> : <p className="mt-0.5 text-sm font-semibold text-slate-800">Not Provided</p>}</div>
            </div>
          </div>
        </div>
      </section>

      {editing && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"><div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 my-auto"><div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-lg font-bold text-slate-800">Edit Doctor Profile</h2><button type="button" onClick={() => setEditing(false)} className="text-2xl text-slate-400 cursor-pointer">×</button></div>
        <form onSubmit={submitEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="font-semibold text-slate-700">Hospital (unchangeable)<input readOnly value={hospital?.Name || doctor.hospital_name || 'Assigned hospital'} className={`${fieldClass} mt-1 bg-slate-100`} /></label>
          <label className="font-semibold text-slate-700">Doctor ID (unchangeable)<input readOnly value={form.doctor_id} className={`${fieldClass} mt-1 bg-slate-100`} /></label>
          <label className="sm:col-span-2 font-semibold text-slate-700">Doctor Full Name *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`${fieldClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Specialization *<input required value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} className={`${fieldClass} mt-1`} /></label>
          <fieldset className="sm:col-span-2 font-semibold text-slate-700"><legend>Department(s) *</legend><div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-slate-300 bg-slate-50 p-3">{departmentOptions.length ? departmentOptions.map((department) => <label key={department} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-white cursor-pointer"><input type="checkbox" checked={form.department.includes(department)} onChange={(event) => setForm({ ...form, department: event.target.checked ? [...form.department, department] : form.department.filter((item) => item !== department) })} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />{department}</label>) : <p className="text-xs font-normal text-slate-500">No departments are configured for this hospital.</p>}</div><span className="block mt-1 text-[11px] font-normal text-slate-500">Choose one or more departments from this hospital.</span></fieldset>
          <label className="font-semibold text-slate-700">Qualification<input value={form.qualification} onChange={(event) => setForm({ ...form, qualification: event.target.value })} className={`${fieldClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Experience<input value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} className={`${fieldClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Duty Shift<select value={form.Shifts} onChange={(event) => setForm({ ...form, Shifts: event.target.value })} className={`${fieldClass} mt-1`}>{shifts.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="font-semibold text-slate-700">Phone *<input required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} className={`${fieldClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Email *<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={`${fieldClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Duty Status (unchangeable)<input readOnly value={form.status} className={`${fieldClass} mt-1 bg-slate-100`} /></label>
          <label className="font-semibold text-slate-700">Consultation Fee<input required type="number" min="0" step="0.01" value={form.consultation_fee} onChange={(event) => setForm({ ...form, consultation_fee: event.target.value })} className={`${fieldClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Created At (automatic)<input readOnly value={doctor.created_at || 'Assigned on save'} className={`${fieldClass} mt-1 bg-slate-100`} /></label>
          <label className="font-semibold text-slate-700">Password (reset separately)<input readOnly type="password" value="********" className={`${fieldClass} mt-1 bg-slate-100`} /></label>
          <label className="sm:col-span-2 flex items-center gap-2 text-slate-700"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />Account is active</label>
          <p className="sm:col-span-2 text-[11px] text-slate-500">Password can only be changed with Reset Password. Created date is assigned automatically.</p>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-pointer">Cancel</button><button type="submit" className="px-5 py-2 rounded-xl bg-teal-600 text-white font-bold cursor-pointer">Save Changes</button></div>
        </form></div></div>}
      {resetOpen && <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"><form onSubmit={resetPassword} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4"><h2 className="font-bold text-slate-800">Reset Doctor Password</h2><input type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password (min 6 characters)" className={fieldClass} /><div className="flex justify-end gap-2"><button type="button" onClick={() => setResetOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 cursor-pointer">Cancel</button><button className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold cursor-pointer">Reset Password</button></div></form></div>}
      {deleteOpen && <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4"><h2 className="font-bold text-slate-800">Confirm Doctor Removal</h2><p className="text-xs text-slate-500">Remove {doctor.name} from the doctor records?</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setDeleteOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 cursor-pointer">Cancel</button><button type="button" onClick={deleteDoctor} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold cursor-pointer">Delete Doctor</button></div></div></div>}
    </div>
  );
};

export default AdminDoctorDetails;
