import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';
import ActiveFilterTags from '../Common/ActiveFilterTags';

const extractArray = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  if (Array.isArray(resData.data)) return resData.data;
  return [];
};

const Nurses = ({ currentUser, setCurrentPage, setSelectedNurse }) => {
  const [nurses, setNurses] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  const shiftsList = [
    'Morning First Shift',
    'Afternoon Second Shift',
    'Evening Third Shift'
  ];

  const wardsList = [
    'ICU',
    'NICU',
    'General Ward',
    'Emergency Ward',
    'Operation Theatre',
    'OPD'
  ];

  const rolesList = [
    'Head Nurse',
    'Staff Nurse'
  ];

  const initialFormState = {
    hospital: '',
    name: '',
    email: '',
    contact: '',
    password: '',
    confirmPassword: '',
    role: 'Staff Nurse',
    ward: 'General Ward',
    shift: 'Morning First Shift',
    qualification: '',
    experience: '',
    status: 'On_Duty',
    is_active: true
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showAddConfirmPassword, setShowAddConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hospRes, nurRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`)
      ]);

      if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
        const hData = await hospRes.value.json().catch(() => []);
        setHospitalsList(extractArray(hData));
      }

      if (nurRes.status === 'fulfilled' && nurRes.value.ok) {
        const nData = await nurRes.value.json().catch(() => []);
        setNurses(extractArray(nData));
      }
    } catch (err) {
      console.error('Error fetching nurses data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewDetails = (nurse) => {
    if (setSelectedNurse) setSelectedNurse(nurse);
    try {
      localStorage.setItem('selectedNurse', JSON.stringify(nurse));
    } catch (e) {}
    if (setCurrentPage) setCurrentPage('nurse_details');
  };

  const handleOpenAddModal = () => {
    setFormData(initialFormState);
    setShowAddPassword(false);
    setShowAddConfirmPassword(false);
    setIsAddModalOpen(true);
  };

  const handleAddNurse = async (e) => {
    e.preventDefault();
    if (!formData.hospital) {
      alert('Please select an assigned hospital branch.');
      return;
    }
    const trimmedName = (formData.name || '').trim();
    const trimmedEmail = (formData.email || '').trim().toLowerCase();
    const cleanContact = (formData.contact || '').replace(/\D/g, '').slice(0, 10);
    const pass = (formData.password || '').trim();
    const confirmPass = (formData.confirmPassword || '').trim();

    if (!trimmedName) {
      alert('Nurse Full Name is required.');
      return;
    }
    if (!cleanContact || cleanContact.length !== 10) {
      alert('Phone number must be exactly 10 digits.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.endsWith('@gmail.com')) {
      alert('Official email must be a valid @gmail.com address.');
      return;
    }
    if (!pass) {
      alert('Please enter a login password.');
      return;
    }
    if (pass.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    if (pass !== confirmPass) {
      alert('Password and Confirm Password do not match. Please verify.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        hospital: Number(formData.hospital),
        name: trimmedName,
        email: trimmedEmail,
        contact: cleanContact,
        phone: cleanContact,
        password: pass,
        role: formData.role || 'Staff Nurse',
        ward: formData.ward || 'General Ward',
        shift: formData.shift || 'Morning First Shift',
        qualification: (formData.qualification || '').trim() || null,
        experience: (formData.experience || '').trim() || null,
        status: formData.status || 'On_Duty',
        is_active: formData.is_active !== false,
        is_approved: false
      };

      const response = await fetch(`${API_BASE_URL}/super-admin/Nurses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        alert(`Nurse "${trimmedName}" registered successfully! Dashboard access will remain restricted until manually approved by the Branch Hospital Admin.`);
        setIsAddModalOpen(false);
        setFormData(initialFormState);
        fetchData();
      } else {
        console.error('Error adding nurse:', data);
        let errorMsg = 'Failed to register nurse.';
        if (typeof data === 'object' && data !== null) {
          errorMsg = Object.entries(data)
            .map(([k, v]) => `${k.toUpperCase()}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('\n');
        }
        alert(errorMsg);
      }
    } catch (err) {
      console.error('Network error registering nurse:', err);
      alert('Network error while saving nurse profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNurses = nurses.filter((nurse) => {
    const term = searchTerm.toLowerCase().trim();
    const nName = (nurse.name || '').toLowerCase();
    const nEmail = (nurse.email || '').toLowerCase();
    const nContact = (nurse.contact || nurse.phone || '').toLowerCase();
    const nWard = (nurse.ward || '').toLowerCase();
    const nId = String(nurse.nurse_id || nurse.id || '').toLowerCase();

    const matchesSearch =
      !term ||
      nName.includes(term) ||
      nEmail.includes(term) ||
      nContact.includes(term) ||
      nWard.includes(term) ||
      nId.includes(term);

    const nHosp = typeof nurse.hospital === 'object' && nurse.hospital !== null ? nurse.hospital.id : nurse.hospital;
    const matchesHosp = hospitalFilter === 'ALL' || String(nHosp) === String(hospitalFilter);

    const nShift = nurse.shift || nurse.shifts || '';
    const matchesShift = shiftFilter === 'ALL' || nShift === shiftFilter;

    const nStatus = String(nurse.status || nurse.duty_status || '').toLowerCase();
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'On_Duty' && (nStatus.includes('on') || nStatus === 'active')) ||
      (statusFilter === 'Off_Duty' && (nStatus.includes('off') || nStatus.includes('leave')));

    return matchesSearch && matchesHosp && matchesShift && matchesStatus;
  });
  const onDutyCount = nurses.filter((nurse) => {
    const status = String(nurse.status || nurse.duty_status || '').toLowerCase();
    return status.includes('on') || status === 'active';
  }).length;
  const offDutyCount = nurses.length - onDutyCount;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-screen bg-slate-50 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Nurses Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage hospital nursing staff, ward allocations, and duty shifts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>+</span> Add Nurse
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Nurses</p>
          <h3 className="mt-1 text-2xl font-black text-slate-800 sm:text-3xl">{nurses.length}</h3>
          <p className="mt-0.5 text-xs text-slate-500">All registered nursing staff</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">On Duty</p>
          <h3 className="mt-1 text-2xl font-black text-emerald-700 sm:text-3xl">{onDutyCount}</h3>
          <p className="mt-0.5 text-xs font-medium text-emerald-700/80">Currently active</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/40 to-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Off Duty / On Leave</p>
          <h3 className="mt-1 text-2xl font-black text-rose-700 sm:text-3xl">{offDutyCount}</h3>
          <p className="mt-0.5 text-xs text-rose-700/80">Not currently on duty</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/40 to-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800">Hospitals</p>
          <h3 className="mt-1 text-2xl font-black text-sky-700 sm:text-3xl">{hospitalsList.length}</h3>
          <p className="mt-0.5 text-xs text-sky-700/80">Affiliated branches</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <input
          type="text"
          placeholder="Search nurse by name, email, ward..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 sm:text-sm"
        />

        <select
          value={hospitalFilter}
          onChange={(e) => setHospitalFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-700 focus:border-teal-500 focus:outline-none sm:text-sm"
        >
          <option value="ALL">All Hospitals</option>
          {hospitalsList.map((h) => (
            <option key={h.id} value={h.id}>{h.Name || h.name}</option>
          ))}
        </select>

        <select
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-700 focus:border-teal-500 focus:outline-none sm:text-sm"
        >
          <option value="ALL">All Shifts</option>
          {shiftsList.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-700 focus:border-teal-500 focus:outline-none sm:text-sm"
        >
          <option value="ALL">All Duty Statuses</option>
          <option value="On_Duty">On Duty</option>
          <option value="Off_Duty">Off Duty / On Leave</option>
        </select>
      </div>

      {/* ACTIVE FILTER TAGS */}
      <ActiveFilterTags
        filters={[
          { name: 'Search', value: searchTerm.trim(), onRemove: () => setSearchTerm('') },
          {
            name: 'Hospital',
            value: hospitalFilter,
            displayValue: hospitalsList.find((h) => String(h.id) === String(hospitalFilter))?.Name || hospitalFilter,
            onRemove: () => setHospitalFilter('ALL'),
          },
          { name: 'Shift', value: shiftFilter, onRemove: () => setShiftFilter('ALL') },
          {
            name: 'Status',
            value: statusFilter,
            displayValue: statusFilter === 'On_Duty' ? 'On Duty' : statusFilter === 'Off_Duty' ? 'Off Duty / On Leave' : statusFilter,
            onRemove: () => setStatusFilter('ALL'),
          },
        ]}
        onClearAll={() => {
          setSearchTerm('');
          setHospitalFilter('ALL');
          setShiftFilter('ALL');
          setStatusFilter('ALL');
        }}
      />

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center space-y-3 rounded-2xl border border-slate-200 bg-white p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-teal-500/20 border-t-teal-500"></div>
          <p className="text-xs text-slate-500">Loading nurses directory...</p>
        </div>
      ) : filteredNurses.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-16 text-center">
          <p className="text-sm font-semibold text-slate-600">No nurses found matching your criteria.</p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>+</span> Add Nurse Now
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-xs text-slate-600 sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-3.5 px-4 text-center">NURSE NAME &amp; ID</th>
                  <th className="py-3.5 px-4">Ward</th>
                  <th className="py-3.5 px-4">Hospital</th>
                  <th className="py-3.5 px-4">Shift</th>
                  <th className="py-3.5 px-4">Duty Status</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNurses.slice(0, visibleCount).map((nurse) => {
                  const nHosp = typeof nurse.hospital === 'object' && nurse.hospital !== null ? nurse.hospital.id : nurse.hospital;
                  const hospObj = hospitalsList.find((h) => Number(h.id) === Number(nHosp));
                  const hospName = (typeof nurse.hospital === 'object' && nurse.hospital !== null ? nurse.hospital.Name || nurse.hospital.name : '') || hospObj?.Name || hospObj?.name || nurse.hospital_name || '-';
                  const nurseStatus = String(nurse.status || nurse.duty_status || '').replaceAll('_', ' ') || '-';
                  const statusKey = nurseStatus.toLowerCase();
                  const isOff = statusKey.includes('off') || statusKey.includes('leave');

                  return (
                    <tr key={nurse.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold text-slate-800">{nurse.name || '-'}</span>
                          <span className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-sky-700">
                            {nurse.nurse_id || (nurse.id ? `NUR-${nurse.id}` : '-')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {nurse.ward || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {hospName}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {nurse.shift || nurse.shifts || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {nurseStatus && nurseStatus !== '-' ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isOff
                              ? 'border border-rose-200 bg-rose-50 text-rose-700'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isOff ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                            {nurseStatus}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {nurse.contact || nurse.phone || nurse.email || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleViewDetails(nurse)}
                          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700 cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD NURSE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Register New Nurse</h2>
                <p className="text-xs text-slate-500 mt-0.5">Add a new nursing staff member to a hospital branch.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddNurse} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Hospital Branch *</label>
                  <select
                    required
                    value={formData.hospital}
                    onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 font-medium cursor-pointer"
                  >
                    <option value="">-- Select Hospital --</option>
                    {hospitalsList.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.Name || h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Nurse Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    pattern="[a-zA-Z0-9._%+-]+@gmail\.com"
                    title="Email must be a valid @gmail.com address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nurse@gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white lowercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Signin Password *</label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      title={showAddPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAddPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showAddConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirm password"
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddConfirmPassword(!showAddConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      title={showAddConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAddConfirmPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Role / Designation *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 font-medium cursor-pointer"
                  >
                    {rolesList.map((r, i) => (
                      <option key={i} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Assigned Ward *</label>
                  <select
                    required
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 font-medium cursor-pointer"
                  >
                    {wardsList.map((w, i) => (
                      <option key={i} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Shift Timing *</label>
                  <select
                    required
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 font-medium cursor-pointer"
                  >
                    {shiftsList.map((s, i) => (
                      <option key={i} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Duty Status *</label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 font-medium cursor-pointer"
                  >
                    <option value="On_Duty">On Duty</option>
                    <option value="Off_Duty">Off Duty / On Leave</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Qualifications</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="e.g. B.Sc Nursing, GNM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Experience</label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="e.g. 3 Years"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="nurseActiveState"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                />
                <label htmlFor="nurseActiveState" className="font-semibold text-slate-700 cursor-pointer">
                  Activate Nurse Account Immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md cursor-pointer transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Nurse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nurses;
