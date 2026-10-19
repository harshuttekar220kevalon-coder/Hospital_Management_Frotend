import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../Api/Api';

const asArray = (value) => Array.isArray(value) ? value : (value?.results || value?.data || []);
const shifts = ['Morning First Shift', 'Afternoon Second Shift', 'Evening Third Shift'];

const AdminDoctors = ({ currentUser, setCurrentPage, setSelectedDoctor, setSelectedHospital }) => {
  const [doctors, setDoctors] = useState([]);
  const [hospital, setHospital] = useState(null);
  const [hospitalId, setHospitalId] = useState(() => Number(currentUser?.hospital?.id || currentUser?.hospital || currentUser?.hospital_data?.id) || null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const initialForm = { name: '', doctor_id: '', specialization: '', department: [], qualification: '', experience: '', Shifts: shifts[0], phone: '', email: '', password: '', confirmPassword: '', status: 'On_Duty', is_active: true, consultation_fee: '0.00' };
  const [form, setForm] = useState(initialForm);
  const hospitalDepartments = (Array.isArray(hospital?.departments)
    ? hospital.departments.map((department) => typeof department === 'string' ? department : department?.name)
    : String(hospital?.departments || hospital?.department || '').split(','))
    .map((department) => String(department || '').trim()).filter(Boolean);

  const fetchDoctors = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      let hospitalId = currentUser?.hospital?.id || currentUser?.hospital || currentUser?.hospital_data?.id;
      if (!hospitalId) {
        try {
          const savedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
          hospitalId = savedUser.hospital?.id || savedUser.hospital;
        } catch {}
      }
      if (!hospitalId) {
        try { hospitalId = JSON.parse(localStorage.getItem('selectedHospital') || '{}')?.id; } catch {}
      }
      if (!hospitalId) {
        const adminsRes = await fetch(`${API_BASE_URL}/super-admin/Admins/`).catch(() => null);
        if (adminsRes?.ok) {
          const admins = asArray(await adminsRes.json());
          const match = admins.find((admin) => (currentUser?.id && Number(admin.id) === Number(currentUser.id)) || (admin.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase());
          hospitalId = match?.hospital?.id || match?.hospital;
        }
      }
      setHospitalId(Number(hospitalId) || null);
      if (hospitalId) {
        const hospitalRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/${hospitalId}/`).catch(() => null);
        if (hospitalRes?.ok) {
          const hospitalInfo = await hospitalRes.json();
          setHospital(hospitalInfo);
          setSelectedHospital?.(hospitalInfo);
        }
      }
      const response = await fetch(`${API_BASE_URL}/super-admin/Doctors/`);
      if (response.ok) {
        const list = asArray(await response.json());
        setDoctors(list.filter((doctor) => {
          if (!hospitalId) return false;
          const ids = [...(Array.isArray(doctor.hospitals) ? doctor.hospitals : []), doctor.hospital].filter(Boolean).map((item) => Number(typeof item === 'object' ? item.id : item));
          return ids.includes(Number(hospitalId));
        }));
      }
    } catch (error) {
      console.error('Error loading hospital doctors:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
    const interval = setInterval(() => fetchDoctors(true), 3500);
    const onFocus = () => fetchDoctors(true);
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [currentUser]);

  useEffect(() => setVisibleCount(10), [search, shiftFilter, statusFilter]);

  const filtered = doctors.filter((doctor) => {
    const query = search.toLowerCase().trim();
    const matchesSearch = [doctor.name, doctor.doctor_id, doctor.specialization, doctor.email, doctor.contact, doctor.phone].some((value) => String(value || '').toLowerCase().includes(query));
    const shift = doctor.Shifts || doctor.shift || doctor.opd_timings || '';
    const status = String(doctor.status || doctor.duty_status || '').toLowerCase();
    const matchesShift = shiftFilter === 'ALL' || shift === shiftFilter;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'On_Duty' ? !status.includes('off') && !status.includes('leave') : status.includes('off') || status.includes('leave'));
    return matchesSearch && matchesShift && matchesStatus;
  });

  const openDetails = (doctor) => {
    setSelectedDoctor?.(doctor);
    try { localStorage.setItem('selectedDoctor', JSON.stringify(doctor)); } catch {}
    setCurrentPage?.('admin_doctor_details');
  };

  const submitAdd = async (event) => {
    event.preventDefault();
    if (form.department.length === 0) {
      alert('Select at least one department.');
      return;
    }
    if (!hospitalId) {
      alert('A hospital must be assigned to your admin account before registering a doctor.');
      return;
    }
    const cleanPhone = (form.phone || '').replace(/\D/g, '').slice(0, 10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }
    if (!form.email || !form.email.trim().toLowerCase().endsWith('@gmail.com')) {
      alert("Email must be a valid @gmail.com address.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      alert("Password and Confirm Password do not match.");
      return;
    }
    const payload = {
      hospitals: [hospitalId],
      name: /^Dr\.?\s/i.test(form.name) ? form.name.trim() : `Dr. ${form.name.trim()}`,
      ...(form.doctor_id.trim() ? { doctor_id: form.doctor_id.trim() } : {}),
      specialization: form.specialization.trim(),
      department: form.department.join(', '),
      qualification: form.qualification.trim() || null,
      experience: form.experience.trim() || null,
      Shifts: form.Shifts,
      phone: cleanPhone,
      email: form.email.trim(),
      password: form.password,
      status: form.status,
      is_active: form.is_active,
      consultation_fee: form.consultation_fee || '0.00'
    };
    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/Doctors/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) { const error = await response.json().catch(() => ({})); alert(error.detail || error.message || 'Failed to register doctor.'); return; }
      setIsAddOpen(false);
      setForm(initialForm);
      fetchDoctors();
    } catch (error) { console.error('Error registering doctor:', error); alert('Network error while saving doctor profile.'); }
  };

  const activeCount = doctors.filter((doctor) => doctor.is_active !== false && !String(doctor.status || '').toLowerCase().includes('off')).length;
  const inactiveCount = doctors.length - activeCount;
  const inputClass = 'w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white';

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-8 space-y-4 sm:space-y-6">
      <header className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 text-xs font-semibold border border-teal-400/30">{hospital?.Name || 'Branch Hospital'} · Medical Department</span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 text-slate-100">Doctor Management</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">Manage doctors, specializations, duty shifts, and availability.</p>
          </div>
          <button type="button" onClick={() => setIsAddOpen(true)} className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md cursor-pointer">+ Register New Doctor</button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[["Doctor Roster", doctors.length, 'Doctors assigned to this facility', 'text-teal-700'], ['On Duty', activeCount, 'Available for patient care', 'text-emerald-700'], ['Off Duty', inactiveCount, 'Doctors currently unavailable', 'text-rose-700']].map(([title, count, caption, colorClass]) => (
          <div key={title} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
            <h2 className={`text-lg sm:text-xl font-bold ${colorClass} mt-2`}>{count} {title === 'Doctor Roster' ? 'Total' : ''}</h2>
            <p className="text-xs text-slate-500 mt-1">{caption}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, ID, specialty, contact..." className={`${inputClass} sm:max-w-sm`} />
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)} className={inputClass + ' sm:w-auto'}><option value="ALL">All Shifts</option>{shifts.map((shift) => <option key={shift}>{shift}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass + ' sm:w-auto'}><option value="ALL">All Duty Status</option><option value="On_Duty">On Duty</option><option value="Off_Duty">Off Duty</option></select>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <div className="text-center py-12 text-xs font-semibold text-slate-500">Loading doctors...</div> : filtered.length === 0 ? <div className="text-center py-10 text-xs font-semibold text-slate-500">No doctors found matching these filters.</div> : (
            <table className="w-full text-center text-xs text-slate-600 min-w-[760px]">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200"><tr><th className="py-3.5 px-4">Doctor Name & ID</th><th className="py-3.5 px-4">Specialization</th><th className="py-3.5 px-4">Shift</th><th className="py-3.5 px-4">Contact & Email</th><th className="py-3.5 px-4">Duty Status</th><th className="py-3.5 px-4">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{filtered.slice(0, visibleCount).map((doctor) => {
                const off = String(doctor.status || doctor.duty_status || '').toLowerCase().includes('off') || String(doctor.status || '').toLowerCase().includes('leave');
                return <tr key={doctor.id} className="hover:bg-slate-50/70"><td className="py-3.5 px-4"><div className="font-bold text-slate-800">{doctor.name || 'Not Provided'}</div><span className="font-mono text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-0.5">{doctor.doctor_id || `DOC-${doctor.id}`}</span></td><td className="py-3.5 px-4 font-semibold text-slate-800">{doctor.specialization || 'General Medicine'}</td><td className="py-3.5 px-4">{doctor.Shifts || doctor.shift || doctor.opd_timings || 'Not Provided'}</td><td className="py-3.5 px-4"><div className="font-bold text-slate-800">{doctor.contact || doctor.phone || 'Not Provided'}</div><div className="text-[11px] text-sky-700 truncate max-w-[180px] mx-auto">{doctor.email || 'Not Provided'}</div></td><td className="py-3.5 px-4"><span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${off ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{off ? 'Off_Duty' : 'On_Duty'}</span></td><td className="py-3.5 px-4"><button type="button" onClick={() => openDetails(doctor)} className="px-3.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white font-bold border border-teal-200 cursor-pointer">Details →</button></td></tr>;
              })}</tbody>
            </table>
          )}
        </div>
        {visibleCount < filtered.length && <div className="p-4 text-center border-t border-slate-100"><button type="button" onClick={() => setVisibleCount((count) => count + 10)} className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer">Show More ({filtered.length - visibleCount} remaining)</button></div>}
      </section>

      {isAddOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"><div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 my-auto"><div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-lg font-bold text-slate-800">Register Doctor</h2><button type="button" onClick={() => setIsAddOpen(false)} className="text-2xl text-slate-400 cursor-pointer">×</button></div>
        <form onSubmit={submitAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="font-semibold text-slate-700">Assigned Hospital<input readOnly value={hospital?.Name || hospital?.name || currentUser?.hospital_data?.Name || (hospitalId ? `Hospital #${hospitalId}` : 'Loading assigned hospital...')} className={`${inputClass} mt-1 bg-slate-100`} /></label>
          <label className="font-semibold text-slate-700">Doctor ID <span className="font-normal text-slate-500">(optional; generated if blank)</span><input value={form.doctor_id} onChange={(event) => setForm({ ...form, doctor_id: event.target.value })} className={`${inputClass} mt-1`} placeholder="DOC-1234" /></label>
          <label className="sm:col-span-2 font-semibold text-slate-700">Doctor Full Name *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`${inputClass} mt-1`} placeholder="Enter doctor name" /></label>
          <label className="font-semibold text-slate-700">Specialization *<input required value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} className={`${inputClass} mt-1`} placeholder="Enter specialization" /></label>
          <fieldset className="sm:col-span-2 font-semibold text-slate-700"><legend>Department(s) *</legend><div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-slate-300 bg-slate-50 p-3">{hospitalDepartments.length ? hospitalDepartments.map((department) => <label key={department} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-white cursor-pointer"><input type="checkbox" checked={form.department.includes(department)} onChange={(event) => setForm({ ...form, department: event.target.checked ? [...form.department, department] : form.department.filter((item) => item !== department) })} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />{department}</label>) : <p className="text-xs font-normal text-slate-500">No departments are configured for this hospital.</p>}</div><span className="block mt-1 text-[11px] font-normal text-slate-500">Choose one or more departments from this hospital.</span></fieldset>
          <label className="font-semibold text-slate-700">Qualification<input value={form.qualification} onChange={(event) => setForm({ ...form, qualification: event.target.value })} className={`${inputClass} mt-1`} placeholder="Enter qualification" /></label>
          <label className="font-semibold text-slate-700">Experience<input value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} className={`${inputClass} mt-1`} placeholder="Enter experience" /></label>
          <label className="font-semibold text-slate-700">Duty Shift<select value={form.Shifts} onChange={(event) => setForm({ ...form, Shifts: event.target.value })} className={`${inputClass} mt-1`}>{shifts.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="font-semibold text-slate-700">Phone *<input required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} className={`${inputClass} mt-1`} placeholder="Enter phone number" /></label>
          <label className="font-semibold text-slate-700">Email *<input required type="email" pattern="[a-zA-Z0-9._%+-]+@gmail\.com" title="Email must be a valid @gmail.com address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="font-semibold text-slate-700">Password *<input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className={`${inputClass} mt-1`} placeholder="Enter password" /></label>
          <label className="font-semibold text-slate-700">Confirm Password *<input required type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} className={`${inputClass} mt-1`} placeholder="Confirm password" /></label>
          <label className="font-semibold text-slate-700">Duty Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={`${inputClass} mt-1`}><option value="On_Duty">On_Duty</option><option value="Off_Duty">Off_Duty</option></select></label>
          <label className="font-semibold text-slate-700">Consultation Fee<input required type="number" min="0" step="0.01" value={form.consultation_fee} onChange={(event) => setForm({ ...form, consultation_fee: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="sm:col-span-2 flex items-center gap-2 text-slate-700"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />Account is active</label>
          <p className="sm:col-span-2 text-[11px] text-slate-500">Created date is assigned automatically when the doctor record is saved.</p>
          <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-pointer">Cancel</button><button type="submit" disabled={!hospitalId} className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold cursor-pointer">Register Doctor</button></div>
        </form>
      </div></div>}
    </div>
  );
};

export default AdminDoctors;
