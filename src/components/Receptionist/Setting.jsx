import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const ReceptionistSetting = ({ currentUser, setCurrentUser, setCurrentPage }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [receptionistData, setReceptionistData] = useState(null);
  const [hospitalData, setHospitalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    contact: '',
    desk: 'Main Lobby Desk 1',
    extension: 'Ext. 101',
    shift: 'Morning Shift',
    status: 'On_Duty'
  });

  // Security / Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    fetchReceptionistProfile();
  }, [currentUser]);

  const fetchReceptionistProfile = async () => {
    setLoading(true);
    try {
      const email = (currentUser?.email || '').toLowerCase().trim();
      const recId = currentUser?.id;

      const [recRes, hospListRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`),
        fetch(`${API_BASE_URL}/super-admin/Hospital/`)
      ]);

      let matchedRec = null;
      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const allRecs = await recRes.value.json().catch(() => []);
        if (Array.isArray(allRecs)) {
          matchedRec = allRecs.find(r =>
            (r.email && r.email.toLowerCase().trim() === email) ||
            (recId && Number(r.id) === Number(recId)) ||
            (r.name && r.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
          );
        }
      }

      const activeRecord = matchedRec || currentUser;
      setReceptionistData(activeRecord);

      if (activeRecord) {
        setProfileForm({
          name: activeRecord.name || '',
          email: activeRecord.email || '',
          contact: activeRecord.contact || activeRecord.phone || '',
          desk: activeRecord.desk || 'Main Lobby Desk 1',
          extension: activeRecord.extension || 'Ext. 101',
          shift: activeRecord.shift || 'Morning Shift',
          status: activeRecord.status || 'On_Duty'
        });
      }

      // Fetch hospital info
      const hospId = activeRecord?.hospital;
      if (hospId && hospListRes.status === 'fulfilled' && hospListRes.value.ok) {
        const hospList = await hospListRes.value.json().catch(() => []);
        if (Array.isArray(hospList)) {
          const foundHosp = hospList.find(h => Number(h.id) === Number(typeof hospId === 'object' ? hospId.id : hospId));
          setHospitalData(foundHosp);
        }
      }
    } catch (err) {
      console.error('Error fetching receptionist profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
    if (successMsg) setSuccessMsg('');
    if (errorMsg) setErrorMsg('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!receptionistData?.id) {
      alert('Receptionist ID not found.');
      return;
    }

    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/Receptionists/${receptionistData.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          contact: profileForm.contact.trim(),
          email: profileForm.email.trim(),
          desk: profileForm.desk,
          extension: profileForm.extension,
          shift: profileForm.shift,
          status: profileForm.status
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setReceptionistData(updated);
        const updatedUser = { ...currentUser, ...updated };
        if (setCurrentUser) setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setSuccessMsg('Receptionist profile details updated successfully!');
      } else {
        const errData = await response.json().catch(() => ({}));
        setErrorMsg(errData.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setErrorMsg('Network error while updating profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleDutyStatus = async () => {
    if (!receptionistData?.id) return;
    const isCurrentlyOn = profileForm.status === 'On_Duty' || profileForm.status === 'On Duty';
    const nextStatus = isCurrentlyOn ? 'Off_Duty' : 'On_Duty';

    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/Receptionists/${receptionistData.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (response.ok) {
        const updated = await response.json();
        setReceptionistData(updated);
        setProfileForm(prev => ({ ...prev, status: nextStatus }));
        const updatedUser = { ...currentUser, status: nextStatus };
        if (setCurrentUser) setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setSuccessMsg(`Duty status switched to ${nextStatus === 'On_Duty' ? 'Active On Duty' : 'Off Duty'}`);
      } else {
        alert('Failed to toggle duty status.');
      }
    } catch (err) {
      console.error('Error toggling duty status:', err);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
    if (successMsg) setSuccessMsg('');
    if (errorMsg) setErrorMsg('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMsg('New Password and Confirm Password do not match!');
      return;
    }

    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/Receptionists/${receptionistData?.id || currentUser?.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: passwordForm.newPassword
        })
      });

      if (response.ok) {
        setSuccessMsg('Your security password has been changed successfully.');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        setErrorMsg(errData.message || 'Failed to update password.');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setErrorMsg('Network error while updating password.');
    } finally {
      setIsSaving(false);
    }
  };

  const isOnDuty = profileForm.status === 'On_Duty' || profileForm.status === 'On Duty';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5">
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 text-white font-bold text-xl flex items-center justify-center shadow-md">
              {profileForm.name?.slice(0, 2).toUpperCase() || 'RC'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{profileForm.name || 'Reception Staff'}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isOnDuty ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                  {isOnDuty ? 'Active On Duty' : 'Off Duty'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Receptionist ID: {receptionistData?.receptionist_id || `REC-${currentUser?.id || '01'}`} • {profileForm.shift} • {hospitalData?.Name || 'Apex Care Hospital'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleDutyStatus}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 ${
                isOnDuty ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isOnDuty ? 'Mark Off Duty' : 'Mark On Duty'}
            </button>
          </div>
        </div>
      </div>

      {/* ALERT MESSAGES */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} className="text-rose-900 font-bold">✕</button>
        </div>
      )}

      {/* SETTINGS TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Profile & Desk Info</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'security'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Security & Password</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hospital')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'hospital'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Hospital Branch Info</span>
        </button>
      </div>

      {/* TAB 1: PROFILE & DESK SETTINGS */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Receptionist Information & Front Desk Configuration
            </h3>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    name="contact"
                    value={profileForm.contact}
                    onChange={handleProfileChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Assigned Shift</label>
                  <select
                    name="shift"
                    value={profileForm.shift}
                    onChange={handleProfileChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  >
                    <option value="Morning Shift">Morning Shift (08:00 AM - 04:00 PM)</option>
                    <option value="Evening Shift">Evening Shift (04:00 PM - 12:00 AM)</option>
                    <option value="Night Shift">Night Shift (12:00 AM - 08:00 AM)</option>
                    <option value="General Shift">General Shift (09:00 AM - 06:00 PM)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Desk Station</label>
                  <input
                    type="text"
                    name="desk"
                    value={profileForm.desk}
                    onChange={handleProfileChange}
                    placeholder="e.g. Main Lobby Counter #1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Intercom Extension</label>
                  <input
                    type="text"
                    name="extension"
                    value={profileForm.extension}
                    onChange={handleProfileChange}
                    placeholder="e.g. Ext. 101"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving Profile...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT SUMMARY CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              Duty & Station Overview
            </h4>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 font-medium block">Front Desk Role:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5">Patient Admissions & Triage Desk</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 font-medium block">Hospital Facility:</span>
                <span className="font-bold text-slate-800 block mt-0.5">{hospitalData?.Name || 'Apex Care Hospital'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 font-medium block">Official Receptionist ID:</span>
                <span className="font-mono font-bold text-amber-700 text-sm block mt-0.5">
                  {receptionistData?.receptionist_id || `REC-${currentUser?.id || '01'}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div className="max-w-xl bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
            Change Portal Security Password
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Keep your credentials secure. Password should be at least 6 characters long.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  {showNewPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border ${
                    passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword
                      ? 'border-rose-400 focus:border-rose-500'
                      : passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword
                      ? 'border-emerald-400 focus:border-emerald-500'
                      : 'border-slate-200 focus:border-amber-600'
                  } text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  {showConfirmPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
              <p className="text-[11px] text-rose-600 font-semibold">Passwords do not match</p>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: HOSPITAL BRANCH INFO */}
      {activeTab === 'hospital' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
            Assigned Hospital Branch Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-medium block">Hospital Facility:</span>
              <span className="text-sm font-bold text-slate-800 block mt-0.5">{hospitalData?.Name || 'Apex Care Hospital'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-medium block">City / Branch:</span>
              <span className="text-sm font-bold text-slate-800 block mt-0.5">{hospitalData?.city || 'Main Branch'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-medium block">Branch Address:</span>
              <span className="font-semibold text-slate-700 block mt-0.5">{hospitalData?.address || 'Hospital Road Campus'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-medium block">Emergency Helpline:</span>
              <span className="font-bold text-emerald-700 block mt-0.5">{hospitalData?.contact_number || '+91 1800-APEX-CARE'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistSetting;
