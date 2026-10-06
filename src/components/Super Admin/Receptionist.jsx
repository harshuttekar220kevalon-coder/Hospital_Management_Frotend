import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const Receptionist = ({ currentUser, setCurrentPage, setSelectedReceptionist }) => {
  const [receptionists, setReceptionists] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);
  const [showAddPassword, setShowAddPassword] = useState(false);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, shiftFilter, hospitalFilter, statusFilter]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const shiftsList = [
    'Morning Shift (07:00 AM - 03:00 PM)',
    'Evening Shift (03:00 PM - 11:00 PM)',
    'Night Shift (11:00 PM - 07:00 AM)',
    'General Day Shift (09:00 AM - 05:00 PM)',
    'Rotational Shift'
  ];

  const rolesList = [
    'Front Desk Receptionist',
    'Patient Registration Receptionist',
    'Appointment Receptionist',
    'Admission Receptionist',
    'Billing Receptionist',
    'Emergency Receptionist'
  ];

  // Exact 10 fields only: Hospital, Name, Receptionist id, Role, Shift, Languages, Contact, Email, Password, Status
  const initialFormState = {
    hospital: '',
    name: '',
    receptionist_id: '',
    role: 'Front Desk Receptionist',
    shift: 'Morning Shift (07:00 AM - 03:00 PM)',
    languages: 'English, Hindi',
    contact: '',
    email: '',
    password: '',
    status: 'On_Duty',
    is_active: true
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchHospitals = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/Hospital/`);
      if (response.ok) {
        const data = await response.json();
        setHospitalsList(data);
      }
    } catch (err) {
      console.error('Error fetching hospitals:', err);
    }
  };

  const fetchReceptionists = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/super-admin/Receptionists/`).catch(() => null);
      if (response && response.ok) {
        const data = await response.json();
        setReceptionists(data);
      } else {
        console.warn('Could not fetch receptionists.');
      }
    } catch (err) {
      console.error('Error fetching receptionists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
    fetchReceptionists();
  }, []);

  const totalReceptionistsCount = receptionists.length;
  const activeReceptionistsCount = receptionists.filter(r => r.is_active && r.status !== 'On Leave').length;
  const assignedReceptionistsCount = receptionists.filter(r => r.hospital).length;

  const filteredReceptionists = receptionists.filter((rec) => {
    const term = searchTerm.toLowerCase();
    const assignedHosp = hospitalsList.find(h => h.id === rec.hospital);
    const hospName = assignedHosp ? (assignedHosp.Name || '').toLowerCase() : '';

    const matchesSearch =
      (rec.name || '').toLowerCase().includes(term) ||
      (rec.receptionist_id || '').toLowerCase().includes(term) ||
      (rec.role || '').toLowerCase().includes(term) ||
      (rec.shift || '').toLowerCase().includes(term) ||
      (rec.contact || '').toLowerCase().includes(term) ||
      (rec.email || '').toLowerCase().includes(term) ||
      (rec.languages || '').toLowerCase().includes(term) ||
      hospName.includes(term);

    const matchesShift =
      shiftFilter === 'ALL'
        ? true
        : (rec.shift || '').toLowerCase().includes(shiftFilter.toLowerCase());

    const matchesHospital =
      hospitalFilter === 'ALL'
        ? true
        : (rec.hospital || '').toString() === hospitalFilter.toString();

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'Active'
          ? rec.is_active !== false
          : rec.is_active === false;

    return matchesSearch && matchesShift && matchesHospital && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setFormData({
      ...initialFormState,
      receptionist_id: '',
      password: ''
    });
    setShowAddPassword(false);
    setIsAddModalOpen(true);
  };

  const handleCreateReceptionist = async (e) => {
    e.preventDefault();
    if (!formData.hospital) {
      alert('Please select an assigned hospital branch.');
      return;
    }

    try {
      const generatedRecId = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        hospital: Number(formData.hospital),
        name: formData.name.trim(),
        receptionist_id: generatedRecId,
        role: formData.role || formData.designation || 'Front Desk Receptionist',
        designation: formData.role || formData.designation || 'Front Desk Receptionist',
        shift: formData.shift,
        languages: formData.languages.trim(),
        contact: formData.contact.trim(),
        email: formData.email.trim(),
        password: formData.password || '',
        desk: 'Main Lobby Desk 1',
        extension: 'Ext. 101',
        status: formData.status || 'On_Duty',
        is_active: formData.is_active !== undefined ? formData.is_active : true
      };

      const response = await fetch(`${API_BASE_URL}/super-admin/Receptionists/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        const successMsg = data.message || `Receptionist ${formData.name || 'member'} registered successfully!`;
        alert(successMsg);
        setIsAddModalOpen(false);
        fetchReceptionists();
      } else {
        let errMsg = data.message || data.detail || data.error;
        if (!errMsg && typeof data === 'object') {
          errMsg = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : v)}`)
            .join('\n');
        }
        alert(errMsg || 'Failed to register receptionist.');
      }
    } catch (error) {
      console.error('Error creating receptionist:', error);
      alert(error.message || 'Error registering receptionist profile.');
    }
  };

  const handleToggleStatus = async (rec) => {
    try {
      const isCurrentlyOnDuty = rec.status === 'On_Duty' || rec.status === 'On Duty';
      const updatedStatusStr = isCurrentlyOnDuty ? 'Off_Duty' : 'On_Duty';

      const response = await fetch(`${API_BASE_URL}/super-admin/Receptionists/${rec.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: updatedStatusStr })
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        setReceptionists(prev => prev.map(r => r.id === rec.id ? { ...r, status: updatedStatusStr, ...(data || {}) } : r));
        fetchReceptionists();
      } else {
        alert('Failed to update duty status.');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Error updating receptionist status.');
    }
  };

  const handleNavigateToDetails = (rec) => {
    if (setSelectedReceptionist) {
      setSelectedReceptionist(rec);
    }
    try {
      localStorage.setItem('selectedReceptionist', JSON.stringify(rec));
    } catch {
      // ignore
    }
    if (setCurrentPage) {
      setCurrentPage('receptionist_details');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Front Desk & Reception Registry
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                {activeReceptionistsCount} Active On Desk
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                {totalReceptionistsCount - activeReceptionistsCount} Inactive
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">
              Receptionists & Front Desk Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Front desk executives, duty shifts, languages, and hospital branch allocations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span> Register Receptionist
          </button>
        </div>
      </div>

      {/* TOP SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Receptionists</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1">{totalReceptionistsCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Registered staff</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active & On Desk</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">{activeReceptionistsCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{totalReceptionistsCount - activeReceptionistsCount} Inactive</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital Assigned</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-700 mt-1">{assignedReceptionistsCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Deployed to branches</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, name, role, shift, phone, email, or hospital..."
            className="w-full pl-3 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-semibold focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">All Duty Shifts</option>
            {shiftsList.map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-semibold focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">-- Select Hospital (All) --</option>
            {hospitalsList.map((h) => (
              <option key={h.id} value={h.id}>
                {h.Name || h.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-semibold focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <p className="text-center py-8 text-xs text-slate-500">Loading receptionists...</p>
          ) : filteredReceptionists.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs font-semibold text-slate-500">No receptionists found matching your criteria.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-3 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
              >
                + Register Receptionist Now
              </button>
            </div>
          ) : (
            <table className="w-full text-center text-xs text-slate-600 min-w-[760px]">
              <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 text-center">Receptionist Name & ID</th>
                  <th className="py-3.5 px-4 text-center">Role & Shift</th>
                  <th className="py-3.5 px-4 text-center">Assigned Hospital</th>
                  <th className="py-3.5 px-4 text-center">CONTACT & EMAIL</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceptionists.slice(0, visibleCount).map((rec) => {
                  const hospId = Number(typeof rec.hospital === 'object' ? rec.hospital?.id : rec.hospital);
                  const assignedHosp = hospitalsList.find(h => h.id === hospId) || hospitalsList.find(h => h.id === Number(rec.hospital));
                  const emailLower = (rec.email || '').toLowerCase();

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-800 break-words">{rec.name || 'Not Provided'}</div>
                        <span className="font-mono text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block mt-0.5">
                          {rec.receptionist_id || `REC-${rec.id}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="font-semibold text-slate-800 text-xs">
                          {rec.role || rec.designation || 'Not Provided'}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {rec.shift || 'Not Provided'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {assignedHosp || (rec.hospital_name && !/^\d+$/.test(rec.hospital_name)) ? (
                          <span className="font-semibold text-slate-800">
                            {assignedHosp ? assignedHosp.Name : rec.hospital_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium text-xs">
                            Not Provided
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="font-bold text-slate-800 text-xs">
                            {rec.contact || rec.phone || 'Not Provided'}
                          </span>
                          {emailLower ? (
                            <a
                              href={`mailto:${emailLower}`}
                              title={`Send email to ${emailLower}`}
                              className="text-[11px] text-sky-700 hover:text-sky-900 hover:underline block lowercase transition truncate max-w-[180px]"
                            >
                              {emailLower}
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">Not Provided</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(rec)}
                          title="Click to toggle Duty Status (On_Duty / Off_Duty)"
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${rec.status === 'Off_Duty'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                        >
                          {rec.status === 'Off_Duty' ? 'Off_Duty' : 'On_Duty'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleNavigateToDetails(rec)}
                          className="px-3.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white font-bold text-xs transition cursor-pointer border border-sky-200 inline-flex items-center justify-center gap-1"
                        >
                          Details &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {visibleCount < filteredReceptionists.length && (
          <div className="p-4 text-center border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More
            </button>
          </div>
        )}
      </div>

      {/* REGISTER RECEPTIONIST MODAL - EXACT 10 FIELDS */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Register New Receptionist</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateReceptionist} className="space-y-3 text-xs">
              {/* ROW 1: RECEPTIONIST FULL NAME & OFFICIAL EMAIL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Receptionist Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Pooja Sharma"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="receptionist@hospital.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* ROW 2: CONTACT PHONE & SIGNIN PASSWORD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone / Landline *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                    placeholder="e.g. 9876543210 / 02212345678"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Signin Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter signin password"
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono text-xs"
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
              </div>

              {/* ROW 3: ROLE */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Role *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                >
                  {rolesList.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* ROW 4: SHIFT & LANGUAGES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Shift *</label>
                  <select
                    required
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                  >
                    {shiftsList.map((s, i) => (
                      <option key={i} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Languages *</label>
                  <input
                    type="text"
                    required
                    value={formData.languages}
                    onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                    placeholder="e.g. English, Hindi, Marathi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* ROW 5: ASSIGN HOSPITAL BRANCH */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Branch *</label>
                <select
                  required
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                >
                  <option value="">-- Select Hospital --</option>
                  {hospitalsList.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.Name || h.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ROW 6: STATUS */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Duty Status *</label>
                <select
                  value={formData.status || 'On_Duty'}
                  onChange={(e) => setFormData({
                    ...formData,
                    status: e.target.value
                  })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                >
                  <option value="On_Duty">On_Duty</option>
                  <option value="Off_Duty">Off_Duty</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md cursor-pointer transition"
                >
                  Register Receptionist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Receptionist;