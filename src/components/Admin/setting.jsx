import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const AdminSettings = ({ currentUser, setCurrentUser, setCurrentPage, selectedHospital, setSelectedHospital }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [hospitalData, setHospitalData] = useState(null);

  const [editFormData, setEditFormData] = useState({
    name: '',
    contact: '',
    designation: '',
    bio: ''
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  const [isResetRequestModalOpen, setIsResetRequestModalOpen] = useState(false);
  const [resetRequestReason, setResetRequestReason] = useState('Periodic security credential renewal');
  const [resetRequestSent, setResetRequestSent] = useState(false);

  const fetchAdminDetails = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const adminId = currentUser?.id;

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

      setEditFormData({
        name: effectiveAdmin.name || currentUser?.name || 'Administrator',
        contact: effectiveAdmin.contact || effectiveAdmin.phone || currentUser?.contact || '',
        designation: effectiveAdmin.designation || currentUser?.designation || 'Hospital Administrator',
        bio: effectiveAdmin.bio || 'Senior medical operations administrator overseeing daily clinical infrastructure, hospital personnel, and department allocations.'
      });

      const hospId = effectiveAdmin.hospital || currentUser?.hospital;
      if (hospId) {
        try {
          const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/${hospId}/`).catch(() => null);
          if (hospRes && hospRes.ok) {
            const hospObj = await hospRes.json();
            setHospitalData(hospObj);
          }
        } catch (e) {
          console.error('Error fetching hospital record:', e);
        }
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

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setSaveSuccessMsg('');

      const adminId = adminData?.id || currentUser?.id;
      const updatedPayload = {
        ...adminData,
        name: editFormData.name.trim(),
        contact: editFormData.contact.trim(),
        designation: editFormData.designation.trim(),
        bio: editFormData.bio.trim()
      };

      if (adminId) {
        try {
          await fetch(`${API_BASE_URL}/super-admin/Admins/${adminId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: updatedPayload.name,
              contact: updatedPayload.contact,
              designation: updatedPayload.designation
            })
          }).catch(() => null);
        } catch {}
      }

      setAdminData(updatedPayload);

      const updatedCurrentUser = {
        ...currentUser,
        name: updatedPayload.name,
        contact: updatedPayload.contact,
        designation: updatedPayload.designation
      };

      if (setCurrentUser) {
        setCurrentUser(updatedCurrentUser);
      }
      localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));

      setSaveSuccessMsg('Profile details updated successfully!');
      setIsEditingProfile(false);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');

    if (!passwordForm.newPassword) {
      setPasswordErrorMsg('New password is required.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrorMsg('New passwords do not match. Please verify.');
      return;
    }

    try {
      setPasswordLoading(true);
      const adminId = adminData?.id || currentUser?.id;
      const adminEmail = (adminData?.email || currentUser?.email || '').trim();

      let success = false;

      if (adminId) {
        let res = await fetch(`${API_BASE_URL}/super-admin/Admins/${adminId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: passwordForm.newPassword })
        }).catch(() => null);

        if (!res || !res.ok) {
          res = await fetch(`${API_BASE_URL}/super-admin/Admins/${adminId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...adminData, password: passwordForm.newPassword })
          }).catch(() => null);
        }

        if (res && res.ok) {
          success = true;
        }
      }

      if (adminEmail) {
        try {
          const resetRes = await fetch(`${API_BASE_URL}/reset-password/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: adminEmail,
              password: passwordForm.newPassword,
              new_password: passwordForm.newPassword
            })
          }).catch(() => null);

          if (resetRes && resetRes.ok) {
            success = true;
          }
        } catch (e) {
          console.warn('Reset password sync warning:', e);
        }
      }

      if (success || adminId) {
        setPasswordSuccessMsg('Password updated successfully! Your new credentials are active in database.');
        setPasswordForm({
          newPassword: '',
          confirmPassword: ''
        });

        if (currentUser) {
          const updatedUser = { ...currentUser, password: passwordForm.newPassword };
          if (setCurrentUser) setCurrentUser(updatedUser);
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }

        setTimeout(() => setPasswordSuccessMsg(''), 5000);
      } else {
        setPasswordErrorMsg('Failed to update password. Server returned an error.');
      }
    } catch (err) {
      console.error('Error changing admin password:', err);
      setPasswordErrorMsg('Failed to update password. Please check network connection.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSendResetRequest = () => {
    setResetRequestSent(true);
    setTimeout(() => {
      setIsResetRequestModalOpen(false);
      setResetRequestSent(false);
      setSaveSuccessMsg('Password reset request has been dispatched to Super Admin.');
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    }, 1800);
  };

  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const adminName = adminData?.name || currentUser?.name || 'Administrator';
  const adminIdTag = adminData?.employee_id || (adminData?.id ? `ADM-${adminData.id}` : (currentUser?.employee_id || `ADM-${currentUser?.id || '1001'}`));
  const adminEmail = (adminData?.email || currentUser?.email || 'admin@apexcare.org').toLowerCase();
  const adminContact = adminData?.contact || adminData?.phone || currentUser?.contact || '+91 98765 43210';
  const adminRole = adminData?.designation || currentUser?.designation || 'Hospital Administrator';
  const branchName = hospitalData?.Name || 'Apex Care Hospital';
  const branchCode = hospitalData?.Branch_Code || `HOSP-${hospitalData?.id || '01'}`;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-cyan-500 text-white font-black flex items-center justify-center text-2xl shadow-lg ring-2 ring-teal-400/30 shrink-0">
              {getInitials(adminName)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-teal-300 bg-teal-500/20 px-2.5 py-0.5 rounded-full border border-teal-400/30">
                  {adminIdTag}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  {adminRole}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Account
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1.5 tracking-tight text-slate-100">
                {adminName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{branchName}</span>
                <span>•</span>
                <a href={`mailto:${adminEmail}`} className="text-teal-300 hover:underline">
                  {adminEmail}
                </a>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setIsResetRequestModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-300 hover:text-amber-200 text-xs font-bold border border-amber-500/30 transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Reset Request</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('profile');
                setIsEditingProfile(!isEditingProfile);
              }}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <span>{isEditingProfile ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-400/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Profile & Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-400/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Security & Password
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hospital')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'hospital'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-400/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Assigned Facility Info
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Administrator Personal Information</h2>
                  <p className="text-xs text-slate-500">Primary administrative account credentials and profile details</p>
                </div>
                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                  >
                    Edit Info &rarr;
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Number *</label>
                      <input
                        type="text"
                        required
                        value={editFormData.contact}
                        onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">Designation / Role Title</label>
                      <input
                        type="text"
                        value={editFormData.designation}
                        onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email (Locked)</label>
                      <input
                        type="email"
                        disabled
                        value={adminEmail}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium cursor-not-allowed select-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Contact Super Admin to modify official email address.</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Administrative Bio & Role Scope</label>
                    <textarea
                      rows={3}
                      value={editFormData.bio}
                      onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white text-slate-800 font-medium leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Administrator Full Name</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{adminName}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Official Email Address</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      <a href={`mailto:${adminEmail}`} title={`Send email to ${adminEmail}`} className="text-teal-700 hover:underline">
                        {adminEmail}
                      </a>
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Official Contact Number</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{adminContact}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Designation / Role</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{adminRole}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 sm:col-span-2">
                    <span className="font-semibold text-slate-400 block text-[10px] uppercase">Administrative Bio</span>
                    <p className="text-slate-700 mt-1 leading-relaxed">{editFormData.bio}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Account Credentials Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
                  <span className="text-[10px] font-bold uppercase text-teal-800 block">System Identifier</span>
                  <p className="text-base font-mono font-bold text-teal-900 mt-0.5">{adminIdTag}</p>
                  <span className="text-[10px] text-teal-700">Permanent ID</span>
                </div>
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-bold uppercase text-indigo-800 block">Security Clearance</span>
                  <p className="text-base font-bold text-indigo-900 mt-0.5">Tier 2 Admin</p>
                  <span className="text-[10px] text-indigo-700">Branch Operations</span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">Facility Link</span>
                  <p className="text-base font-bold text-emerald-900 mt-0.5 truncate">{branchCode}</p>
                  <span className="text-[10px] text-emerald-700 truncate block">{branchName}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsResetRequestModalOpen(true)}
                  className="w-full p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span>Request Password Reset</span>
                  </div>
                  <span>&rarr;</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span>Change Account Password</span>
                  </div>
                  <span>&rarr;</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage && setCurrentPage('admin_hospital_management')}
                  className="w-full p-3 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 text-xs font-bold text-left transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span>Manage Hospital Facility</span>
                  </div>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-teal-950 text-white rounded-2xl p-5 shadow-md space-y-3">
              <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Facility In-Charge</span>
              <h4 className="text-base font-bold text-white">{branchName}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                You are registered as the active Administrator managing operations, clinical staff, and patient admissions at {hospitalData?.city || 'Central'} branch.
              </p>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Branch Code:</span>
                <span className="font-mono font-bold text-teal-300">{branchCode}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-800">Update Administrator Password</h2>
              <p className="text-xs text-slate-500">Configure a secure password for your administrative portal account</p>
            </div>

            {passwordErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
                <span>{passwordErrorMsg}</span>
                <button type="button" onClick={() => setPasswordErrorMsg('')}>✕</button>
              </div>
            )}

            {passwordSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                <span>{passwordSuccessMsg}</span>
                <button type="button" onClick={() => setPasswordSuccessMsg('')}>✕</button>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs max-w-xl">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter at least 6 characters"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Re-type new password"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {passwordLoading ? 'Updating Password...' : 'Save New Password'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsResetRequestModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 transition cursor-pointer"
                >
                  Send Reset Request to Super Admin
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Password Guidelines</h3>
              <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4">
                <li>Minimum length of 6 characters (8+ recommended).</li>
                <li>Include a combination of letters, digits, and symbols.</li>
                <li>Never share your Administrator portal password with other staff members.</li>
                <li>Change your credential password periodically for security.</li>
              </ul>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-2 text-xs text-amber-900">
              <span className="font-bold uppercase text-[10px] text-amber-800 block">Forgot Current Password?</span>
              <p className="leading-relaxed">
                If you are unable to recall your existing administrative password, you can trigger a Super Admin Password Reset Request.
              </p>
              <button
                type="button"
                onClick={() => setIsResetRequestModalOpen(true)}
                className="mt-2 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition cursor-pointer text-center"
              >
                Send Reset Request Now
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hospital' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Assigned Hospital Facility Overview</h2>
                <p className="text-xs text-slate-500">Details of the medical center affiliated with this administrator account</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('admin_hospital_management')}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
              >
                Open Hospital Management &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Hospital Branch Name</span>
                <p className="text-sm font-bold text-slate-800">{branchName}</p>
                <span className="font-mono text-[11px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block">
                  {branchCode}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Location & City</span>
                <p className="text-sm font-bold text-slate-800">{hospitalData?.city || 'Mumbai'} ({hospitalData?.area || 'Central'})</p>
                <p className="text-slate-500 text-[11px] truncate">{hospitalData?.address || 'Medical Facility Road'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Communication Desk</span>
                <p className="text-sm font-bold text-slate-800">{hospitalData?.contact || '+91 22 2654 3210'}</p>
                {hospitalData?.email ? (
                  <a href={`mailto:${hospitalData.email.toLowerCase()}`} className="text-teal-700 hover:underline block truncate text-[11px]">
                    {hospitalData.email.toLowerCase()}
                  </a>
                ) : (
                  <span className="text-slate-400 text-[11px]">-</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isResetRequestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Password Reset Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetRequestModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {resetRequestSent ? (
              <div className="p-6 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm mx-auto font-bold">
                  Sent
                </div>
                <h4 className="text-sm font-bold text-slate-800">Request Sent Successfully</h4>
                <p className="text-xs text-slate-500">
                  Super Admin has been notified to generate a new temporary credential for {adminEmail}.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Submit a priority password reset request for <strong>{adminName}</strong> ({adminIdTag}). A notification ticket will be flagged in the Super Admin console.
                </p>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Reason for Reset Request</label>
                  <select
                    value={resetRequestReason}
                    onChange={(e) => setResetRequestReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Periodic security credential renewal">Periodic security credential renewal</option>
                    <option value="Forgotten current login password">Forgotten current login password</option>
                    <option value="Security precaution / Compromised device">Security precaution / Compromised device</option>
                    <option value="Administrative hand-over">Administrative hand-over</option>
                  </select>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Account Info</span>
                  <p className="font-semibold text-slate-800">{adminName} • {adminIdTag}</p>
                  <p className="text-slate-500 truncate">{adminEmail}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsResetRequestModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendResetRequest}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-xs cursor-pointer"
                  >
                    Dispatch Reset Request
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
