import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

// Helper to clean hospital name: strip suffixes like "International", "Branch", "Campus", etc.
export const cleanHospitalName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/[\s,.-]+(international|intl\.?|branch|campus)[\s,.-]*$/i, '')
    .trim();
};

const NurseSettings = ({ currentUser, setCurrentUser, setCurrentPage, selectedHospital, setSelectedHospital }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [nurseData, setNurseData] = useState(null);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [hospitalData, setHospitalData] = useState(null);

  // Complete Nurse Model Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    nurse_id: '',
    role: '',
    ward: '',
    shift: '',
    qualification: '',
    experience: '',
    contact: '',
    email: '',
    password: '',
    status: '',
    is_active: true,
    max_patient_capacity: '',
    assigned_floor: '',
    hospital: '',
    created_at: ''
  });

  const [showPassword, setShowPassword] = useState(true);
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
    'Head Nurse',
    'Staff Nurse'
  ];

  const wardsList = [
    'ICU',
    'NICU',
    'General Ward',
    'Emergency Ward',
    'Operation Theatre',
    'OPD'
  ];

  const statusChoices = [
    { value: 'On_Duty', label: 'On Duty' },
    { value: 'Off_Duty', label: 'Off Duty' }
  ];

  const shiftsList = [
    'Morning First Shift',
    'Afternoon Second Shift',
    'Evening Third Shift'
  ];

  const fetchNurseProfile = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const nurseId = currentUser?.id;

      // 1. Fetch hospitals
      const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
      let loadedHospitals = [];
      if (hospRes && hospRes.ok) {
        loadedHospitals = await hospRes.json().catch(() => []);
        if (Array.isArray(loadedHospitals)) {
          setHospitalsList(loadedHospitals);
        }
      }

      // 2. Fetch nurse record
      let matchedNurse = null;
      try {
        const nRes = await fetch(`${API_BASE_URL}/super-admin/Nurses/`).catch(() => null);
        if (nRes && nRes.ok) {
          const nurses = await nRes.json().catch(() => []);
          if (Array.isArray(nurses)) {
            const nurseTag = currentUser?.nurse_id || '';
            matchedNurse = nurses.find(n =>
              (email && n.email && n.email.toLowerCase().trim() === email) ||
              (nurseId && Number(n.id) === Number(nurseId)) ||
              (nurseTag && n.nurse_id && String(n.nurse_id).toLowerCase().trim() === String(nurseTag).toLowerCase().trim())
            );
          }
        }
      } catch (e) {
        console.error('Error fetching nurse record:', e);
      }

      const activeNurse = matchedNurse || currentUser || {};
      setNurseData(activeNurse);

      let targetHospId = activeNurse.hospital
        ? (typeof activeNurse.hospital === 'object' ? activeNurse.hospital.id : activeNurse.hospital)
        : (currentUser?.hospital || '');

      if (!targetHospId && email) {
        const savedHospId = localStorage.getItem(`user_hospital_${email}`);
        if (savedHospId) targetHospId = savedHospId;
      }

      if (Array.isArray(loadedHospitals)) {
        const found = loadedHospitals.find(h =>
          (targetHospId && Number(h.id) === Number(targetHospId)) ||
          (activeNurse?.hospital_name && h.Name && h.Name.toLowerCase().trim() === activeNurse.hospital_name.toLowerCase().trim()) ||
          (typeof activeNurse?.hospital === 'string' && h.Name && h.Name.toLowerCase().trim() === activeNurse.hospital.toLowerCase().trim()) ||
          (currentUser?.hospital_name && h.Name && h.Name.toLowerCase().trim() === currentUser.hospital_name.toLowerCase().trim())
        );
        if (found) {
          setHospitalData(found);
          targetHospId = found.id;
        } else if (selectedHospital) {
          setHospitalData(selectedHospital);
        }
      }

      let rawRole = (activeNurse.role && activeNurse.role.trim()) || (activeNurse.nurse_role && activeNurse.nurse_role.trim()) || '';
      const resolvedRole = rolesList.includes(rawRole) ? rawRole : (rawRole ? (rawRole.toLowerCase().includes('head') ? 'Head Nurse' : 'Staff Nurse') : '');

      setEditFormData({
        name: activeNurse.name || currentUser?.name || '',
        nurse_id: activeNurse.nurse_id || (activeNurse.id ? `NUR-${activeNurse.id}` : (currentUser?.nurse_id || '')),
        role: resolvedRole,
        ward: activeNurse.ward || '',
        shift: activeNurse.shift || '',
        qualification: activeNurse.qualification || '',
        experience: activeNurse.experience || '',
        contact: activeNurse.contact || activeNurse.phone || currentUser?.contact || '',
        email: activeNurse.email || currentUser?.email || '',
        password: activeNurse.password || 'Nurse@123',
        status: activeNurse.status || '',
        is_active: activeNurse.is_active !== undefined ? Boolean(activeNurse.is_active) : true,
        max_patient_capacity: activeNurse.max_patient_capacity !== undefined && activeNurse.max_patient_capacity !== null ? activeNurse.max_patient_capacity : '',
        assigned_floor: activeNurse.assigned_floor !== undefined && activeNurse.assigned_floor !== null ? activeNurse.assigned_floor : '',
        hospital: targetHospId ? String(targetHospId) : '',
        created_at: activeNurse.created_at || ''
      });

      setPasswordForm(prev => ({
        ...prev,
        email: activeNurse.email || currentUser?.email || ''
      }));

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNurseProfile();
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;
    if (name === 'contact' || name === 'phone') {
      finalValue = String(value).replace(/\D/g, '').slice(0, 10);
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
    const cleanPhone = (editFormData.contact || '').replace(/\D/g, '').slice(0, 10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setSaveErrorMsg("Phone number must be exactly 10 digits.");
      return;
    }
    if (!editFormData.email || !editFormData.email.trim().toLowerCase().endsWith('@gmail.com')) {
      setSaveErrorMsg("Email must be a valid @gmail.com address.");
      return;
    }
    try {
      setSavingProfile(true);
      setSaveSuccessMsg('');
      setSaveErrorMsg('');

      const nurseId = nurseData?.id || currentUser?.id;

      const registeredHospitalId = nurseData?.hospital
        ? (typeof nurseData.hospital === 'object' ? nurseData.hospital.id : nurseData.hospital)
        : (currentUser?.hospital || hospitalData?.id || editFormData.hospital);

      const payload = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        contact: cleanPhone,
        phone: cleanPhone,
        role: editFormData.role ? editFormData.role.trim() : '',
        ward: editFormData.ward || '',
        shift: editFormData.shift || '',
        qualification: (editFormData.qualification || '').trim(),
        experience: (editFormData.experience || '').trim(),
        status: editFormData.status || '',
        is_active: Boolean(editFormData.is_active),
        max_patient_capacity: editFormData.max_patient_capacity !== '' && !isNaN(Number(editFormData.max_patient_capacity)) ? Number(editFormData.max_patient_capacity) : null,
        assigned_floor: editFormData.assigned_floor !== '' && !isNaN(Number(editFormData.assigned_floor)) ? Number(editFormData.assigned_floor) : null,
        hospital: registeredHospitalId ? Number(registeredHospitalId) : null
      };

      if (editFormData.password) {
        payload.password = editFormData.password;
      }

      if (nurseId) {
        try {
          const res = await fetch(`${API_BASE_URL}/super-admin/Nurses/${nurseId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            await fetch(`${API_BASE_URL}/super-admin/Nurses/${nurseId}/`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...nurseData,
                ...payload
              })
            }).catch(() => null);
          }
        } catch (apiErr) {
          console.warn('API PATCH failed, saving locally:', apiErr);
        }
      }

      // Update local state
      const updatedNurse = {
        ...nurseData,
        ...payload,
        id: nurseId,
        nurse_id: editFormData.nurse_id,
        created_at: editFormData.created_at
      };
      setNurseData(updatedNurse);

      const updatedCurrentUser = {
        ...currentUser,
        name: payload.name,
        email: payload.email,
        contact: payload.contact,
        role: payload.role,
        ward: payload.ward,
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

      setSaveSuccessMsg('Nurse profile & ward allocation details updated successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating nurse profile:', err);
      setSaveErrorMsg(err.message || 'Failed to update nurse profile.');
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
      const nurseId = nurseData?.id || currentUser?.id;
      const targetEmail = (editFormData.email || currentUser?.email || '').toLowerCase().trim();

      if (nurseId) {
        await fetch(`${API_BASE_URL}/super-admin/Nurses/${nurseId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPass })
        }).catch(() => null);
      }

      localStorage.setItem(`pwd_${targetEmail}`, newPass);
      setEditFormData(prev => ({ ...prev, password: newPass }));

      setPasswordSuccessMsg('Nurse password updated successfully!');
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
    <div className="w-full bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* HEADER BAR */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                🩺
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Nurse Profile
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {editFormData.nurse_id || 'NUR'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Manage your nursing profile, ward assignment, shift timings & portal security
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('nurse_dashboard')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>&larr;</span>
                <span>Back to Nurse Dashboard</span>
              </button>
            </div>
          </div>

          {/* TABS */}
          <div className="flex items-center gap-2 border-t border-slate-100 pt-1 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${activeTab === 'profile'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <span>👤</span>
              <span>Nurse Profile (All Model Fields)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${activeTab === 'security'
                  ? 'border-emerald-600 text-emerald-800'
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
      <div className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8 space-y-6">
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

        {/* TAB 1: COMPLETE NURSE MODEL EDIT FORM */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: NURSE OVERVIEW CARD */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-black text-2xl shadow-md mb-3">
                  {(editFormData.name || currentUser?.name || 'NU').slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-base font-bold text-slate-900">{editFormData.name || currentUser?.name || 'Nurse'}</h3>
                <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                  {editFormData.role || 'Role not assigned'}{editFormData.ward ? ` • ${editFormData.ward}` : ''}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Nurse ID:</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {editFormData.nurse_id || (currentUser?.id ? `NUR-${currentUser.id}` : 'NUR-101')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Assigned Floor:</span>
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {editFormData.assigned_floor !== '' && editFormData.assigned_floor !== undefined && editFormData.assigned_floor !== null ? `Floor ${editFormData.assigned_floor}` : 'Not Assigned'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Max Capacity:</span>
                    <span className="font-semibold text-slate-800">
                      {editFormData.max_patient_capacity !== '' && editFormData.max_patient_capacity !== undefined && editFormData.max_patient_capacity !== null ? `${editFormData.max_patient_capacity} Patients` : 'Not Provided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Duty Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${editFormData.status === 'On_Duty' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {editFormData.status ? (editFormData.status === 'On_Duty' ? 'On Duty' : 'Off Duty') : 'Not Set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Account Active:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${editFormData.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                      {editFormData.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 text-slate-600">
                    <span className="text-slate-400">Hospital:</span>
                    <span className="font-bold text-emerald-900 truncate max-w-[140px]">
                      {cleanHospitalName(hospitalData?.Name || hospitalData?.name || 'Not Provided')}
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
                    <h2 className="text-sm font-bold text-slate-900">Nurse Profile & Duty Information</h2>
                    <p className="text-[11px] text-slate-500">Edit nursing credentials and ward assignment (Nurse ID is system-protected)</p>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. NAME */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Nurse Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={editFormData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Sister Mary Joseph"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition"
                      />
                    </div>

                    {/* 2. NURSE ID */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Nurse ID
                      </label>
                      <input
                        type="text"
                        value={editFormData.nurse_id || ''}
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
                        pattern="[a-zA-Z0-9._%+-]+@gmail\.com"
                        title="Email must be a valid @gmail.com address"
                        value={editFormData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="nurse@gmail.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition"
                      />
                    </div>

                    {/* 4. CONTACT */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Contact / Phone <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="contact"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        inputMode="numeric"
                        value={editFormData.contact}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. 9876543210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition"
                      />
                    </div>

                    {/* 5. ROLE */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Role
                      </label>
                      <select
                        name="role"
                        value={editFormData.role || ''}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 font-semibold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer"
                      >
                        <option value="">-- Select Role --</option>
                        {rolesList.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    {/* 6. WARD */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Ward
                      </label>
                      <select
                        name="ward"
                        value={editFormData.ward || ''}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer"
                      >
                        <option value="">-- Select Ward --</option>
                        {wardsList.map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>

                    {/* 7. SHIFT */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Shift Timings
                      </label>
                      <select
                        name="shift"
                        value={editFormData.shift || ''}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer"
                      >
                        <option value="">-- Select Shift --</option>
                        {shiftsList.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* 8. STATUS (AVAILABILITY) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Status (Availability)
                      </label>
                      <select
                        name="status"
                        value={editFormData.status || ''}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer"
                      >
                        <option value="">-- Select Status --</option>
                        <option value="On_Duty">On Duty</option>
                        <option value="Off_Duty">Off Duty</option>
                      </select>
                    </div>

                    {/* 9. ASSIGNED FLOOR */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Assigned Floor
                      </label>
                      <input
                        type="number"
                        name="assigned_floor"
                        value={editFormData.assigned_floor}
                        onChange={handleInputChange}
                        min="1"
                        max="20"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition"
                      />
                    </div>

                    {/* 10. MAX PATIENT CAPACITY */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Max Patient Capacity
                      </label>
                      <input
                        type="number"
                        name="max_patient_capacity"
                        value={editFormData.max_patient_capacity}
                        onChange={handleInputChange}
                        min="1"
                        max="200"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition"
                      />
                    </div>

                    {/* 11. QUALIFICATION */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Qualification
                      </label>
                      <input
                        type="text"
                        name="qualification"
                        value={editFormData.qualification}
                        onChange={handleInputChange}
                        placeholder="e.g. B.Sc Nursing, GNM"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition"
                      />
                    </div>

                    {/* 12. EXPERIENCE */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Experience
                      </label>
                      <input
                        type="text"
                        name="experience"
                        value={editFormData.experience}
                        onChange={handleInputChange}
                        placeholder="e.g. 4 Years"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition"
                      />
                    </div>

                    {/* 13. HOSPITAL (LOCKED) */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Hospital <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                          🔒 Locked (Non-editable)
                        </span>
                      </div>
                      <input
                        type="text"
                        value={cleanHospitalName(hospitalData?.Name || hospitalData?.name || nurseData?.hospital_name || currentUser?.hospital_name || 'Assigned Hospital')}
                        disabled
                        readOnly
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        🔒 Hospital assignment is managed by Hospital Admin and cannot be changed here.
                      </p>
                    </div>

                    {/* 15. PASSWORD (READ-ONLY IN PROFILE) */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Login Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveTab('security')}
                          className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>🔒 Change in Password & Security &rarr;</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="password"
                          name="password"
                          value={editFormData.password}
                          readOnly
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs sm:text-sm text-slate-700 font-mono cursor-not-allowed select-all focus:outline-none"
                        />
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
                      onClick={fetchNurseProfile}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                    >
                      Reset Changes
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingProfile ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Saving Profile...</span>
                        </>
                      ) : (
                        'Save Nurse Profile'
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
                <span>Change Nurse Password</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update login credentials for nurse ward access.
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
                  Nurse Email
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
                    maxLength="12"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition"
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
                    maxLength="12"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition"
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
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
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
      </div>
    </div>
  );
};

export default NurseSettings;
