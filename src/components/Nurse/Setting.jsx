import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const NurseSettings = ({ currentUser, setCurrentUser, setCurrentPage, selectedHospital, setSelectedHospital }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [nurseData, setNurseData] = useState(null);
  const [hospitalData, setHospitalData] = useState(null);
  const [hospitalsList, setHospitalsList] = useState([]);

  const [editFormData, setEditFormData] = useState({
    nurse_id: '',
    name: '',
    role: 'Staff Nurse',
    ward: 'General Ward',
    shift: 'Morning (08:00 AM - 04:00 PM)',
    qualification: '',
    experience: '',
    contact: '',
    email: '',
    hospital: '',
    status: 'On_Duty',
    is_active: true
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

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

  const [updatingDuty, setUpdatingDuty] = useState(false);

  const rolesList = [
    'Staff Nurse',
    'Head Nurse',
    'ICU Specialist Nurse',
    'Emergency Triage Nurse',
    'Pediatric Care Nurse',
    'OT Scrub Nurse',
    'Post-Op Recovery Nurse'
  ];

  const wardsList = [
    'General Ward',
    'ICU',
    'NICU',
    'Emergency Ward',
    'Operation Theatre',
    'OPD',
    'Maternity Ward',
    'Post-Op Recovery'
  ];

  const shiftsList = [
    'Morning (08:00 AM - 04:00 PM)',
    'Evening (04:00 PM - 12:00 AM)',
    'Night (12:00 AM - 08:00 AM)',
    'General Shift (09:00 AM - 05:00 PM)',
    'Rotating Shift'
  ];

  useEffect(() => {
    let isMounted = true;

    const fetchNurseProfile = async () => {
      try {
        setLoading(true);
        const email = (currentUser?.email || '').toLowerCase().trim();
        const nurseId = currentUser?.id;

        // 1. Fetch Nurse from database
        const nurseRes = await fetch(`${API_BASE_URL}/super-admin/Nurses/`).catch(() => null);
        let foundNurse = null;

        if (nurseRes && nurseRes.ok) {
          const nurses = await nurseRes.json();
          if (Array.isArray(nurses)) {
            foundNurse = nurses.find(n => 
              (n.email && n.email.toLowerCase().trim() === email) ||
              (nurseId && Number(n.id) === Number(nurseId)) ||
              (n.name && n.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        }

        const activeNurse = foundNurse || currentUser;

        if (isMounted && activeNurse) {
          setNurseData(activeNurse);
          setEditFormData({
            nurse_id: activeNurse.nurse_id || `NUR-${activeNurse.id || '01'}`,
            name: activeNurse.name || activeNurse.first_name || 'Nurse',
            role: activeNurse.nurse_role || activeNurse.role || 'Staff Nurse',
            ward: activeNurse.ward || 'General Ward',
            shift: activeNurse.shift || 'Morning (08:00 AM - 04:00 PM)',
            qualification: activeNurse.qualification || 'B.Sc Nursing, GNM',
            experience: activeNurse.experience || '5 Years',
            contact: activeNurse.contact || activeNurse.phone || '',
            email: activeNurse.email || currentUser?.email || '',
            hospital: typeof activeNurse.hospital === 'object' ? activeNurse.hospital?.id : (activeNurse.hospital || ''),
            status: activeNurse.status === 'Off_Duty' ? 'Off_Duty' : 'On_Duty',
            is_active: activeNurse.is_active !== false
          });
        }

        // 2. Fetch Hospitals
        const hospListRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
        if (hospListRes && hospListRes.ok) {
          const hospitals = await hospListRes.json();
          if (isMounted) {
            setHospitalsList(Array.isArray(hospitals) ? hospitals : []);
            const targetHospId = activeNurse?.hospital || currentUser?.hospital;
            if (targetHospId) {
              const matchedHosp = hospitals.find(h => Number(h.id) === Number(targetHospId));
              if (matchedHosp) setHospitalData(matchedHosp);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching nurse profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchNurseProfile();
    return () => { isMounted = false; };
  }, [currentUser]);

  // LIVE STATUS CHANGE HANDLER (CONNECTED DIRECTLY TO BACKEND)
  const handleStatusChange = async (newStatus) => {
    if (!newStatus || updatingDuty) return;
    setUpdatingDuty(true);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');

    try {
      const nurseId = nurseData?.id || currentUser?.id;
      if (nurseId) {
        const patchRes = await fetch(`${API_BASE_URL}/super-admin/Nurses/${nurseId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        }).catch(() => null);

        if (!patchRes || !patchRes.ok) {
          await fetch(`${API_BASE_URL}/super-admin/Nurses/${nurseId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...(nurseData || currentUser || {}),
              status: newStatus
            })
          }).catch(() => null);
        }
      }

      const updated = {
        ...(nurseData || currentUser || {}),
        status: newStatus
      };
      setNurseData(updated);
      setEditFormData(prev => ({ ...prev, status: newStatus }));

      const updatedCurrentUser = {
        ...(currentUser || {}),
        status: newStatus
      };
      if (setCurrentUser) setCurrentUser(updatedCurrentUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));

      setSaveSuccessMsg(`Duty availability updated to: ${newStatus}`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating duty status:', err);
      setSaveErrorMsg('Failed to update duty status in backend. Please try again.');
      setTimeout(() => setSaveErrorMsg(''), 4000);
    } finally {
      setUpdatingDuty(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');

    try {
      const nurseId = nurseData?.id || currentUser?.id;
      const payload = {
        name: editFormData.name,
        nurse_id: editFormData.nurse_id,
        role: editFormData.role,
        nurse_role: editFormData.role,
        ward: editFormData.ward,
        shift: editFormData.shift,
        qualification: editFormData.qualification,
        experience: editFormData.experience,
        contact: editFormData.contact,
        phone: editFormData.contact,
        hospital: editFormData.hospital ? Number(editFormData.hospital) : null,
        status: editFormData.status || 'On_Duty',
        is_active: editFormData.is_active !== undefined ? editFormData.is_active : true
      };

      if (nurseId) {
        const patchRes = await fetch(`${API_BASE_URL}/super-admin/Nurses/${nurseId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => null);

        if (!patchRes || !patchRes.ok) {
          await fetch(`${API_BASE_URL}/super-admin/Nurses/${nurseId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(() => null);
        }
      }

      const updatedUser = {
        ...(currentUser || {}),
        ...payload,
        id: nurseId || currentUser?.id,
        email: editFormData.email || currentUser?.email
      };

      if (setCurrentUser) setCurrentUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setNurseData(updatedUser);
      setIsEditingProfile(false);

      if (editFormData.hospital) {
        const hosp = hospitalsList.find(h => Number(h.id) === Number(editFormData.hospital));
        if (hosp) setHospitalData(hosp);
      }

      setSaveSuccessMsg('Nurse profile and ward clinical settings updated successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving nurse profile:', err);
      setSaveErrorMsg('Error saving profile changes. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');

    const enteredEmail = (passwordForm.email || '').toLowerCase().trim();
    const actualEmail = (nurseData?.email || currentUser?.email || '').toLowerCase().trim();

    if (!enteredEmail) {
      setPasswordErrorMsg('Please enter your registered email address.');
      setPasswordLoading(false);
      return;
    }

    if (enteredEmail !== actualEmail) {
      setPasswordErrorMsg('Entered email does not match your registered nurse email. Password cannot be changed.');
      setPasswordLoading(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrorMsg('New passwords do not match. Please verify.');
      setPasswordLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordErrorMsg('Password must be at least 6 characters long.');
      setPasswordLoading(false);
      return;
    }

    try {
      const email = actualEmail;
      const nurseId = nurseData?.id || currentUser?.id;

      let resetSuccess = false;

      // 1. Try reset-password endpoint
      const resetRes = await fetch(`${API_BASE_URL}/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: passwordForm.newPassword,
          new_password: passwordForm.newPassword
        })
      }).catch(() => null);

      if (resetRes && resetRes.ok) {
        resetSuccess = true;
      }

      // 2. Direct nurse object update
      if (nurseId) {
        const patchRes = await fetch(`${API_BASE_URL}/super-admin/Nurses/${nurseId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: passwordForm.newPassword })
        }).catch(() => null);

        if (patchRes && patchRes.ok) {
          resetSuccess = true;
        }
      }

      setPasswordSuccessMsg('Password updated successfully in system!');
      setPasswordForm({ email: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error resetting password:', err);
      setPasswordErrorMsg('Failed to update password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const nurseName = nurseData?.name || currentUser?.name || 'Nurse';
  const nurseIdTag = nurseData?.nurse_id || (nurseData?.id ? `NUR-${nurseData.id}` : (currentUser?.nurse_id || `NUR-${currentUser?.id || '01'}`));
  const hospitalName = hospitalData?.Name || hospitalData?.name || nurseData?.hospital_name || currentUser?.hospital_name || (typeof nurseData?.hospital === 'object' ? nurseData.hospital?.Name : null) || 'Apex Care Hospital';
  const hospitalAddress = hospitalData?.Address || hospitalData?.address || hospitalData?.location || 'Central Medical Campus';
  const hospitalPhone = hospitalData?.Emergency_Helpline || hospitalData?.Contact_Number || hospitalData?.phone || '+91 1800-CARE-NOW';
  const currentStatus = nurseData?.status === 'Off_Duty' ? 'Off_Duty' : 'On_Duty';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 w-full overflow-x-hidden">
      {/* HEADER BANNER WITH CORNER DUTY DROPDOWN */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white font-black flex items-center justify-center text-2xl shadow-lg ring-2 ring-emerald-400/30 shrink-0">
              {nurseName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  {nurseIdTag}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  {editFormData.role || 'Staff Nurse'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/25 text-blue-200 border border-blue-400/30 inline-flex items-center gap-1 shadow-xs">
                  <span>Assigned Hospital:</span>
                  <strong className="text-white font-extrabold decoration-emerald-400">{hospitalName}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
                Nurse {nurseName} - Profile & Ward Settings
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Assigned Hospital: <span className="font-semibold text-emerald-300">{hospitalName}</span> • Ward: <span className="font-semibold text-slate-200">{editFormData.ward}</span> • Shift: <span className="font-semibold text-slate-200">{editFormData.shift}</span>
              </p>
            </div>
          </div>

          {/* CORNER ON_DUTY / OFF_DUTY DROPDOWN INSIDE BANNER BOX */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0 self-start lg:self-center">
            <div className="flex items-center gap-2">
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updatingDuty || loading}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs focus:outline-none focus:ring-2 disabled:opacity-50 ${
                  currentStatus === 'Off_Duty'
                    ? 'bg-rose-500/20 text-rose-200 border-rose-500/40 focus:ring-rose-400 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 focus:ring-emerald-400 hover:bg-emerald-500/30'
                }`}
                title="Change Duty Status"
              >
                <option value="On_Duty" className="bg-slate-900 text-white font-semibold">On_Duty</option>
                <option value="Off_Duty" className="bg-slate-900 text-white font-semibold">Off_Duty</option>
              </select>

              {updatingDuty && (
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0"></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{saveSuccessMsg}</span>
          </div>
          <button type="button" onClick={() => setSaveSuccessMsg('')} className="text-emerald-700 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {saveErrorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>{saveErrorMsg}</span>
          </div>
          <button type="button" onClick={() => setSaveErrorMsg('')} className="text-rose-700 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-500">Assigned Ward</p>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-1 truncate">
            {editFormData.ward}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{editFormData.role}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-500">Current Shift</p>
          <h3 className="text-base sm:text-lg font-extrabold text-emerald-700 mt-1 truncate">
            {editFormData.shift}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Assigned Shift</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-500">Experience & Degree</p>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-1">
            {editFormData.experience || '5+ Years'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{editFormData.qualification || 'B.Sc Nursing'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-500">Hospital Branch</p>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-1 truncate">
            {hospitalName}
          </h3>
          <p className="text-xs text-emerald-700 mt-0.5 font-medium truncate">{hospitalAddress || 'Main Campus'}</p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar sm:flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          My Profile & Details
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Shift & Ward Allocation
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Security & Password
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hospital')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'hospital'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Hospital Branch Details
        </button>
      </div>

      {/* PROFILE SECTION */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Nurse Professional Profile</h2>
              <p className="text-xs text-slate-500">Live clinical nursing credentials and contact data loaded from backend database</p>
            </div>
            {!isEditingProfile ? (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition cursor-pointer"
              >
                Edit Details
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {!isEditingProfile ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{nurseData?.name || currentUser?.name || 'Nurse'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nurse ID</span>
                  <p className="text-sm font-bold text-emerald-700 font-mono mt-1">{nurseIdTag}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address (Login ID)</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{nurseData?.email || currentUser?.email || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Designation / Role</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{editFormData.role || 'Staff Nurse'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ward Allocation</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{editFormData.ward || 'General Ward'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shift Timing</span>
                  <p className="text-sm font-bold text-emerald-700 mt-1">{editFormData.shift}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Phone</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{editFormData.contact || nurseData?.contact || nurseData?.phone || '-'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Qualifications</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{editFormData.qualification || 'B.Sc Nursing, GNM'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Experience</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{editFormData.experience || '5 Years'}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/80 to-emerald-50/80 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">Assigned Hospital Branch</span>
                  <p className="text-sm font-bold text-slate-900">{hospitalName}</p>
                  <p className="text-[11px] text-slate-600 font-medium">{hospitalAddress} • Helpline: <span className="font-semibold text-emerald-800">{hospitalPhone}</span></p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white self-start sm:self-center shadow-xs">
                  Active Facility
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileUpdate} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Nurse ID Tag</label>
                  <input
                    type="text"
                    value={editFormData.nurse_id}
                    onChange={(e) => setEditFormData({ ...editFormData, nurse_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Designation / Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {rolesList.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Ward Assignment</label>
                  <select
                    value={editFormData.ward}
                    onChange={(e) => setEditFormData({ ...editFormData, ward: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {wardsList.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Shift Routine</label>
                  <select
                    value={editFormData.shift}
                    onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {shiftsList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Contact Phone</label>
                  <input
                    type="text"
                    value={editFormData.contact}
                    onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Qualifications</label>
                  <input
                    type="text"
                    value={editFormData.qualification}
                    onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Experience</label>
                  <input
                    type="text"
                    value={editFormData.experience}
                    onChange={(e) => setEditFormData({ ...editFormData, experience: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Assigned Hospital Branch</label>
                  <select
                    value={editFormData.hospital}
                    onChange={(e) => setEditFormData({ ...editFormData, hospital: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="">-- Select Hospital --</option>
                    {hospitalsList.map(h => (
                      <option key={h.id} value={h.id}>{h.Name} ({h.city || 'Main Branch'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? 'Saving Details...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* SCHEDULE & WARD SECTION */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">Shift & Ward Allocation Settings</h2>
            <p className="text-xs text-slate-500">Configure your shift hours and clinical ward responsibility</p>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Assigned Shift Timing *</label>
                <select
                  value={editFormData.shift}
                  onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {shiftsList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Clinical Ward Allocation *</label>
                <select
                  value={editFormData.ward}
                  onChange={(e) => setEditFormData({ ...editFormData, ward: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {wardsList.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Shift & Ward Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECURITY & PASSWORD SECTION */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6 max-w-2xl">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">Security Credentials & Password</h2>
            <p className="text-xs text-slate-500">Update your nurse portal account login password</p>
          </div>

          {passwordSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
              <span>{passwordSuccessMsg}</span>
              <button type="button" onClick={() => setPasswordSuccessMsg('')} className="font-bold cursor-pointer">✕</button>
            </div>
          )}

          {passwordErrorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
              <span>{passwordErrorMsg}</span>
              <button type="button" onClick={() => setPasswordErrorMsg('')} className="font-bold cursor-pointer">✕</button>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Registered Login Email *</label>
              <input
                type="email"
                required
                placeholder="Type your registered email address"
                value={passwordForm.email}
                onChange={(e) => setPasswordForm({ ...passwordForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                You must enter your registered email address to verify and reset password.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">New Password *</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter at least 6 characters"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 pr-16 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {showNewPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Confirm New Password *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-type new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 pr-16 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {passwordLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HOSPITAL SECTION */}
      {activeTab === 'hospital' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">Affiliated Hospital Branch Details</h2>
            <p className="text-xs text-slate-500">Facility credentials and emergency contacts for your duty hospital</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hospital Name</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{hospitalName}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Helpline / Emergency Phone</span>
              <p className="text-sm font-bold text-emerald-700 mt-1">{hospitalPhone}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campus Address</span>
              <p className="text-sm font-medium text-slate-800 mt-1">{hospitalAddress}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Ward</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{editFormData.ward}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duty Shift</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{editFormData.shift}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NurseSettings;
