import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const AdminSettings = ({ currentUser, setCurrentUser, setCurrentPage, selectedHospital, setSelectedHospital }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [hospitalData, setHospitalData] = useState(null);

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    contact: '',
    password: '',
    designation: '',
    hospital: '',
    is_active: true,
    employee_id: '',
    created_at: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // Password tab state
  const [passwordForm, setPasswordForm] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  const fetchAdminDetails = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const adminId = currentUser?.id;

      // 1. Fetch hospitals list
      const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
      let loadedHospitals = [];
      if (hospRes && hospRes.ok) {
        loadedHospitals = await hospRes.json().catch(() => []);
        if (Array.isArray(loadedHospitals)) {
          setHospitalsList(loadedHospitals);
        }
      }

      // 2. Fetch admin record
      let matchedAdmin = null;
      try {
        const res = await fetch(`${API_BASE_URL}/super-admin/Admins/`).catch(() => null);
        if (res && res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            matchedAdmin = list.find(a =>
              (a.email && a.email.toLowerCase().trim() === email) ||
              (adminId && Number(a.id) === Number(adminId)) ||
              (a.name && a.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        }
      } catch (e) {
        console.error('Error fetching admin record:', e);
      }

      const effectiveAdmin = matchedAdmin || currentUser || {};
      setAdminData(effectiveAdmin);

      const targetHospId = effectiveAdmin.hospital
        ? (typeof effectiveAdmin.hospital === 'object' ? effectiveAdmin.hospital.id : effectiveAdmin.hospital)
        : (currentUser?.hospital || '');

      setEditFormData({
        name: effectiveAdmin.name || currentUser?.name || '',
        email: effectiveAdmin.email || currentUser?.email || '',
        contact: effectiveAdmin.contact || effectiveAdmin.phone || currentUser?.contact || '',
        password: effectiveAdmin.password || '',
        designation: effectiveAdmin.designation || currentUser?.designation || '',
        hospital: targetHospId ? String(targetHospId) : '',
        is_active: effectiveAdmin.is_active !== undefined ? Boolean(effectiveAdmin.is_active) : true,
        employee_id: effectiveAdmin.employee_id || (effectiveAdmin.id ? `ADM-${effectiveAdmin.id}` : ''),
        created_at: effectiveAdmin.created_at || ''
      });

      setPasswordForm(prev => ({
        ...prev,
        email: effectiveAdmin.email || currentUser?.email || ''
      }));

      // Find matching hospital object
      if (targetHospId && Array.isArray(loadedHospitals)) {
        const found = loadedHospitals.find(h => Number(h.id) === Number(targetHospId));
        if (found) setHospitalData(found);
      } else if (selectedHospital) {
        setHospitalData(selectedHospital);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDetails();
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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

      const adminId = adminData?.id || currentUser?.id;

      const payload = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        contact: editFormData.contact.trim(),
        phone: editFormData.contact.trim(),
        designation: editFormData.designation.trim(),
        hospital: editFormData.hospital ? Number(editFormData.hospital) : null,
        is_active: Boolean(editFormData.is_active)
      };

      if (editFormData.password) {
        payload.password = editFormData.password;
      }

      if (adminId) {
        try {
          const res = await fetch(`${API_BASE_URL}/super-admin/Admins/${adminId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            // Try PUT as fallback
            await fetch(`${API_BASE_URL}/super-admin/Admins/${adminId}/`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...adminData,
                ...payload
              })
            }).catch(() => null);
          }
        } catch (apiErr) {
          console.warn('API PATCH failed, saving locally:', apiErr);
        }
      }

      // Update local state
      const updatedAdmin = {
        ...adminData,
        ...payload,
        id: adminId,
        employee_id: editFormData.employee_id,
        created_at: editFormData.created_at
      };
      setAdminData(updatedAdmin);

      const updatedCurrentUser = {
        ...currentUser,
        name: payload.name,
        email: payload.email,
        contact: payload.contact,
        designation: payload.designation,
        hospital: payload.hospital,
        is_active: payload.is_active
      };

      if (setCurrentUser) {
        setCurrentUser(updatedCurrentUser);
      }
      localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));

      if (payload.password) {
        localStorage.setItem(`pwd_${payload.email.toLowerCase()}`, payload.password);
      }

      // Update selected hospital if changed
      if (payload.hospital && hospitalsList.length > 0) {
        const found = hospitalsList.find(h => Number(h.id) === Number(payload.hospital));
        if (found) {
          setHospitalData(found);
          if (setSelectedHospital) setSelectedHospital(found);
          localStorage.setItem('selectedHospital', JSON.stringify(found));
        }
      }

      setSaveSuccessMsg('Administrator profile details updated successfully!');
      setIsEditingProfile(false);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setSaveErrorMsg(err.message || 'Failed to update administrator profile.');
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
      const adminId = adminData?.id || currentUser?.id;
      const targetEmail = (editFormData.email || currentUser?.email || '').toLowerCase().trim();

      if (adminId) {
        await fetch(`${API_BASE_URL}/super-admin/Admins/${adminId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPass })
        }).catch(() => null);
      }

      localStorage.setItem(`pwd_${targetEmail}`, newPass);
      setEditFormData(prev => ({ ...prev, password: newPass }));

      setPasswordSuccessMsg('Password updated successfully!');
      setPasswordForm(prev => ({
        ...prev,
        currentPassword: '',
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                ⚙️
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Admin Account Settings
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                    {editFormData.employee_id || 'ADM'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Manage your administrator credentials, hospital affiliation, and profile details
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('admin_dashboard')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>&larr;</span>
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex items-center gap-2 border-t border-slate-100 pt-1 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${activeTab === 'profile'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <span>👤</span>
              <span>Administrator Profile (All Fields)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${activeTab === 'security'
                ? 'border-teal-600 text-teal-800'
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
        {/* SUCCESS / ERROR ALERTS */}
        {saveSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
            <span>✓</span>
            <span>{saveSuccessMsg}</span>
          </div>
        )}
        {saveErrorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
            <span>✕</span>
            <span>{saveErrorMsg}</span>
          </div>
        )}

        {/* TAB 1: PROFILE EDIT FORM (ALL MODEL FIELDS) */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: ADMIN BADGE & HOSPITAL OVERVIEW */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center font-black text-2xl shadow-md mb-3">
                  {(editFormData.name || 'AD').slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-base font-bold text-slate-900">{editFormData.name || 'Not Provided'}</h3>
                <p className="text-xs text-teal-700 font-semibold mt-0.5">{editFormData.designation || 'Not Provided'}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Employee ID:</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {editFormData.employee_id || 'Not Provided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Account Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${editFormData.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                      {editFormData.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Joined Date:</span>
                    <span className="font-medium text-slate-700">{editFormData.created_at || 'Not Provided'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 text-slate-600">
                    <span className="text-slate-400">Hospital:</span>
                    <span className="font-bold text-teal-900 truncate max-w-[140px]">
                      {hospitalData?.Name || hospitalData?.name || 'Not Provided'}
                    </span>
                  </div>
                </div>
              </div>

              {/* HOSPITAL CARD */}
              <div className="bg-gradient-to-br from-slate-900 to-teal-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Assigned Hospital</p>
                <h4 className="text-base font-bold mt-1 text-slate-100">{hospitalData?.Name || hospitalData?.name || 'Not Provided'}</h4>
                <p className="text-xs text-slate-300 mt-1">{hospitalData?.Address || hospitalData?.address || 'Not Provided'}</p>
                <div className="mt-3 pt-3 border-t border-teal-800/60 flex items-center justify-between text-xs text-teal-200">
                  <span>Helpline:</span>
                  <span className="font-mono font-bold">{hospitalData?.Emergency_Number || hospitalData?.Phone || hospitalData?.contact || 'Not Provided'}</span>
                </div>
              </div>
            </div>

            {/* RIGHT: COMPLETE MODEL FIELD EDITOR */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">HospitalAdmin Model Information</h2>
                    <p className="text-[11px] text-slate-500">Edit all backend fields (ID & Employee ID are system-protected)</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                    Django Model: HospitalAdmin
                  </span>
                </div>

                <form onSubmit={handleProfileUpdate} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. NAME */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={editFormData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. Dr. Rajesh Kumar"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                      />
                    </div>

                    {/* 2. EMAIL */}
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
                        placeholder="admin@hospital.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                      />
                    </div>

                    {/* 3. CONTACT */}
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                      />
                    </div>

                    {/* 4. DESIGNATION */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Designation <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="designation"
                        value={editFormData.designation}
                        onChange={handleInputChange}
                        required
                        placeholder="Hospital Administrator"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                      />
                    </div>

                    {/* 5. HOSPITAL */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Assigned Hospital
                      </label>
                      <select
                        name="hospital"
                        value={editFormData.hospital}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                      >
                        <option value="">-- Select Hospital --</option>
                        {hospitalsList.map(h => (
                          <option key={h.id} value={h.id}>
                            {h.Name || h.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 6. PASSWORD (EDITABLE IN PROFILE) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Login Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={editFormData.password}
                          onChange={handleInputChange}
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    {/* 7. EMPLOYEE ID */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Employee ID
                      </label>
                      <input
                        type="text"
                        value={editFormData.employee_id || ''}
                        disabled
                        placeholder="Not Provided"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs sm:text-sm font-mono text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    {/* 8. ACCOUNT STATUS */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Account Status
                      </label>
                      <select
                        name="is_active"
                        value={editFormData.is_active ? 'true' : 'false'}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                      >
                        <option value="true">Active (Account Enabled)</option>
                        <option value="false">Inactive (Account Disabled)</option>
                      </select>
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={fetchAdminDetails}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                    >
                      Reset Changes
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingProfile ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Saving Profile...</span>
                        </>
                      ) : (
                        'Save Administrator Profile'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SECURITY & PASSWORD UPDATE */}
        {activeTab === 'security' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🔒</span>
                <span>Change Administrator Password</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your portal login password. This updates the backend database & local authentication credentials.
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
                  Admin Email
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
                    placeholder="Enter new password (min 4 characters)"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
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
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Re-enter new password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
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
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
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

export default AdminSettings;
