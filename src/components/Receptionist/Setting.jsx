import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const ReceptionistSetting = ({ currentUser, setCurrentUser, setCurrentPage }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [receptionistData, setReceptionistData] = useState(null);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [hospitalData, setHospitalData] = useState(null);

  // Complete Receptionist Model Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    receptionist_id: '',
    role: 'Front Desk Receptionist',
    shift: 'Morning Shift (08:00 AM - 04:00 PM)',
    languages: 'English, Hindi',
    contact: '',
    email: '',
    password: '',
    status: 'On_Duty',
    is_active: true,
    hospital: '',
    created_at: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // Password tab state
  const [passwordForm, setPasswordForm] = useState({
    email: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  const rolesList = [
    'Front Desk Receptionist',
    'Patient Registration Receptionist',
    'Appointment Receptionist',
    'Admission Receptionist',
    'Billing Receptionist',
    'Emergency Receptionist',
    'General Receptionist',
    'Receptionist'
  ];

  const statusChoices = [
    { value: 'On_Duty', label: 'On Duty' },
    { value: 'Off_Duty', label: 'Off Duty' }
  ];

  const shiftsList = [
    'Morning Shift (08:00 AM - 04:00 PM)',
    'Evening Shift (04:00 PM - 12:00 AM)',
    'Night Shift (12:00 AM - 08:00 AM)',
    'General Shift (09:00 AM - 05:00 PM)',
    'Rotational Shift'
  ];

  const fetchReceptionistProfile = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const recId = currentUser?.id;

      // 1. Fetch hospitals
      const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
      let loadedHospitals = [];
      if (hospRes && hospRes.ok) {
        loadedHospitals = await hospRes.json().catch(() => []);
        if (Array.isArray(loadedHospitals)) {
          setHospitalsList(loadedHospitals);
        }
      }

      // 2. Fetch receptionist record
      let matchedRec = null;
      try {
        const rRes = await fetch(`${API_BASE_URL}/super-admin/Receptionists/`).catch(() => null);
        if (rRes && rRes.ok) {
          const recs = await rRes.json().catch(() => []);
          if (Array.isArray(recs)) {
            matchedRec = recs.find(r => 
              (r.email && r.email.toLowerCase().trim() === email) ||
              (recId && Number(r.id) === Number(recId)) ||
              (r.name && r.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        }
      } catch (e) {
        console.error('Error fetching receptionist record:', e);
      }

      const activeRec = matchedRec || currentUser || {};
      setReceptionistData(activeRec);

      const targetHospId = activeRec.hospital 
        ? (typeof activeRec.hospital === 'object' ? activeRec.hospital.id : activeRec.hospital)
        : (currentUser?.hospital || '');

      const resolvedRole = (activeRec.role && activeRec.role.trim()) || activeRec.designation || currentUser?.role || 'Front Desk Receptionist';

      setEditFormData({
        name: activeRec.name || currentUser?.name || '',
        receptionist_id: activeRec.receptionist_id || (activeRec.id ? `REC-${activeRec.id}` : (currentUser?.receptionist_id || '')),
        role: resolvedRole,
        shift: activeRec.shift || 'Morning Shift (08:00 AM - 04:00 PM)',
        languages: activeRec.languages || 'English, Hindi',
        contact: activeRec.contact || activeRec.phone || currentUser?.contact || '',
        email: activeRec.email || currentUser?.email || '',
        password: activeRec.password || '',
        status: activeRec.status || 'On_Duty',
        is_active: activeRec.is_active !== undefined ? Boolean(activeRec.is_active) : true,
        hospital: targetHospId ? String(targetHospId) : '',
        created_at: activeRec.created_at || ''
      });

      setPasswordForm(prev => ({
        ...prev,
        email: activeRec.email || currentUser?.email || ''
      }));

      if (targetHospId && Array.isArray(loadedHospitals)) {
        const found = loadedHospitals.find(h => Number(h.id) === Number(targetHospId));
        if (found) setHospitalData(found);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceptionistProfile();
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;
    if (name === 'role' && (!finalValue || finalValue.trim() === '')) {
      finalValue = currentUser?.role || 'Front Desk Receptionist';
    }
    setEditFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
    if (saveSuccessMsg) setSaveSuccessMsg('');
    if (saveErrorMsg) setSaveErrorMsg('');
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setSaveSuccessMsg('');
      setSaveErrorMsg('');

      const recId = receptionistData?.id || currentUser?.id;
      const safeRole = (editFormData.role && editFormData.role.trim()) || currentUser?.role || 'Front Desk Receptionist';
      
      const payload = {
        name: (editFormData.name || currentUser?.name || 'Receptionist').trim(),
        email: (editFormData.email || currentUser?.email || '').trim(),
        contact: (editFormData.contact || currentUser?.contact || '').trim(),
        phone: (editFormData.contact || currentUser?.contact || '').trim(),
        role: safeRole,
        shift: editFormData.shift || 'Morning Shift (08:00 AM - 04:00 PM)',
        languages: (editFormData.languages || 'English, Hindi').trim(),
        status: editFormData.status || 'On_Duty',
        is_active: Boolean(editFormData.is_active),
        hospital: editFormData.hospital ? Number(editFormData.hospital) : null
      };

      if (editFormData.password) {
        payload.password = editFormData.password;
      }

      if (recId) {
        try {
          const res = await fetch(`${API_BASE_URL}/super-admin/Receptionists/${recId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            await fetch(`${API_BASE_URL}/super-admin/Receptionists/${recId}/`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...receptionistData,
                ...payload
              })
            }).catch(() => null);
          }
        } catch (apiErr) {
          console.warn('API PATCH failed, saving locally:', apiErr);
        }
      }

      // Update local state
      const updatedRec = {
        ...receptionistData,
        ...payload,
        id: recId,
        receptionist_id: editFormData.receptionist_id,
        created_at: editFormData.created_at
      };
      setReceptionistData(updatedRec);

      const updatedCurrentUser = {
        ...currentUser,
        name: payload.name,
        email: payload.email,
        contact: payload.contact,
        role: payload.role,
        shift: payload.shift,
        status: payload.status,
        is_active: payload.is_active,
        hospital: payload.hospital
      };

      if (setCurrentUser) {
        setCurrentUser(updatedCurrentUser);
      }
      localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));

      if (payload.password) {
        localStorage.setItem(`pwd_${payload.email.toLowerCase()}`, payload.password);
      }

      setSaveSuccessMsg('Receptionist profile details updated successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating receptionist profile:', err);
      setSaveErrorMsg(err.message || 'Failed to update receptionist profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');

    const newPass = passwordForm.newPassword || '';
    const confirmPass = passwordForm.confirmPassword || '';

    if (!newPass || newPass.length < 4) {
      setPasswordErrorMsg('New password must be at least 4 characters.');
      return;
    }

    if (newPass !== confirmPass) {
      setPasswordErrorMsg('New password and Confirm password do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const recId = receptionistData?.id || currentUser?.id;
      const targetEmail = (editFormData.email || currentUser?.email || '').toLowerCase().trim();

      if (recId) {
        await fetch(`${API_BASE_URL}/super-admin/Receptionists/${recId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPass })
        }).catch(() => null);
      }

      localStorage.setItem(`pwd_${targetEmail}`, newPass);
      setEditFormData(prev => ({ ...prev, password: newPass }));

      setPasswordSuccessMsg('Receptionist password updated successfully!');
      setPasswordForm(prev => ({
        ...prev,
        newPassword: '',
        confirmPassword: ''
      }));
      setTimeout(() => setPasswordSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* HEADER BAR */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                📋
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Receptionist Settings
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                    {editFormData.receptionist_id || 'REC'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Manage your front-desk role, languages, shift timings, hospital assignment & security
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('receptionist_dashboard')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>&larr;</span>
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>

          {/* TABS */}
          <div className="flex items-center gap-2 border-t border-slate-100 pt-1 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'profile'
                  ? 'border-sky-600 text-sky-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>👤</span>
              <span>Receptionist Profile (All Fields)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'security'
                  ? 'border-sky-600 text-sky-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🔒</span>
              <span>Security & Password</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {saveSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
            <span>✓</span>
            <span>{saveSuccessMsg}</span>
          </div>
        )}
        {saveErrorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-xs">
            <span>✕</span>
            <span>{saveErrorMsg}</span>
          </div>
        )}

        {/* TAB 1: COMPLETE RECEPTIONIST MODEL FORM */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: CARD */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md mb-3">
                  {(editFormData.name || currentUser?.name || 'RE').slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-base font-bold text-slate-900">{editFormData.name || currentUser?.name || 'Receptionist'}</h3>
                <p className="text-xs text-sky-700 font-bold mt-0.5">{editFormData.role || currentUser?.role || 'Front Desk Receptionist'}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Receptionist ID:</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {editFormData.receptionist_id || (currentUser?.id ? `REC-${currentUser.id}` : 'REC-101')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Languages:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[140px]">{editFormData.languages || 'English, Hindi'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Duty Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      editFormData.status === 'On_Duty' || editFormData.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {editFormData.status || 'On_Duty'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Account Active:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      editFormData.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {editFormData.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 text-slate-600">
                    <span className="text-slate-400">Hospital:</span>
                    <span className="font-bold text-sky-900 truncate max-w-[140px]">
                      {hospitalData?.Name || hospitalData?.name || currentUser?.hospital_name || 'Hospital Reception'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: EDIT FORM */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Receptionist Profile & Desk Information</h2>
                    <p className="text-[11px] text-slate-500">Edit front desk information (ID is system-protected)</p>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. NAME */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Receptionist Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={editFormData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. Priya Sharma"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition"
                      />
                    </div>

                    {/* 2. RECEPTIONIST ID */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Receptionist ID
                      </label>
                      <input
                        type="text"
                        value={editFormData.receptionist_id || ''}
                        disabled
                        placeholder="Not Provided"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs sm:text-sm font-mono text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    {/* 3. EMAIL */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={editFormData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="reception@hospital.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition"
                      />
                    </div>

                    {/* 4. CONTACT */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Contact / Phone <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="contact"
                        value={editFormData.contact}
                        onChange={handleInputChange}
                        required
                        placeholder="+91 9876543210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition"
                      />
                    </div>

                    {/* 5. ROLE */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Role <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="role"
                        value={editFormData.role || 'Front Desk Receptionist'}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 font-semibold focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition cursor-pointer"
                      >
                        {rolesList.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    {/* 6. SHIFT */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Shift Timings
                      </label>
                      <select
                        name="shift"
                        value={editFormData.shift}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition"
                      >
                        <option value="">-- Select Shift --</option>
                        {shiftsList.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* 7. LANGUAGES */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Spoken Languages <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="languages"
                        value={editFormData.languages}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. English, Hindi, Marathi"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition"
                      />
                    </div>

                    {/* 8. STATUS (AVAILABILITY) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Status (Availability) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="status"
                        value={editFormData.status === 'Off_Duty' || editFormData.status === 'Off Duty' ? 'Off_Duty' : 'On_Duty'}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition cursor-pointer"
                      >
                        <option value="On_Duty">On Duty</option>
                        <option value="Off_Duty">Off Duty</option>
                      </select>
                    </div>

                    {/* 9. HOSPITAL */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Hospital
                      </label>
                      <select
                        name="hospital"
                        value={editFormData.hospital}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition"
                      >
                        <option value="">-- Select Hospital --</option>
                        {hospitalsList.map(h => (
                          <option key={h.id} value={h.id}>
                            {h.Name || h.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 11. PASSWORD (READ-ONLY IN PROFILE) */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Login Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveTab('security')}
                          className="text-[11px] text-sky-600 hover:text-sky-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>🔒 Change in Password & Security &rarr;</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={editFormData.password}
                          readOnly
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2.5 pr-20 rounded-xl border border-slate-200 bg-slate-100 text-xs sm:text-sm text-slate-700 font-mono cursor-not-allowed select-all focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        🔒 Read-only field. Password can only be edited in the <strong>Password & Security</strong> section.
                      </p>
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={fetchReceptionistProfile}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                    >
                      Reset Changes
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingProfile ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Saving Profile...</span>
                        </>
                      ) : (
                        'Save Receptionist Profile'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SECURITY */}
        {activeTab === 'security' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🔒</span>
                <span>Change Receptionist Password</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update login credentials for reception & front-desk portal access.
              </p>
            </div>

            {passwordSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                ✓ {passwordSuccessMsg}
              </div>
            )}
            {passwordErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                ✕ {passwordErrorMsg}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Receptionist Email
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Re-enter new password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {passwordLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    'Save New Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReceptionistSetting;
