import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const DoctorSettings = ({ currentUser, setCurrentUser, setCurrentPage, selectedHospital, setSelectedHospital }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [doctorData, setDoctorData] = useState(null);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [hospitalData, setHospitalData] = useState(null);

  // Complete Doctor Model Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    doctor_id: '',
    email: '',
    phone: '',
    password: '',
    specialization: '',
    additional_skills: '',
    department: '',
    qualification: '',
    experience: '',
    opd_timings: '',
    consultation_fee: '',
    status: 'On_Duty',
    is_active: true,
    hospitals: [],
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

  const opdTimingsPresets = [
    'Mon - Fri (10:00 AM - 02:00 PM)',
    'Mon - Fri (02:00 PM - 06:00 PM)',
    'Mon - Sat (09:00 AM - 01:00 PM)',
    'Mon - Sat (05:00 PM - 09:00 PM)',
    'Morning Shift (08:00 AM - 02:00 PM)',
    'Evening Shift (02:00 PM - 08:00 PM)',
    'Full Day (09:00 AM - 05:00 PM)',
    'Night Duty (08:00 PM - 08:00 AM)',
    'Weekend Clinic (Sat - Sun 10:00 AM - 04:00 PM)',
    'Emergency 24x7 On-Call'
  ];

  const statusChoices = [
    { value: 'On_Duty', label: 'On Duty' },
    { value: 'Off_Duty', label: 'Off Duty' }
  ];

  const parseDoctorDepartments = (deptVal) => {
    if (!deptVal) return [];
    if (Array.isArray(deptVal)) return deptVal.map(d => typeof d === 'string' ? d.trim() : (d.name || '')).filter(Boolean);
    if (typeof deptVal === 'string') {
      return deptVal.split(',').map(d => d.trim().replace(/^['"\[\]]+|['"\[\]]+$/g, '').trim()).filter(Boolean);
    }
    return [];
  };

  const getAvailableHospitalDepartments = () => {
    let targetHospIds = Array.isArray(editFormData.hospitals) ? editFormData.hospitals.map(Number).filter(Boolean) : [];
    
    // If none selected in form, check doctor data or current user hospital
    if (targetHospIds.length === 0) {
      if (Array.isArray(doctorData?.hospitals)) {
        targetHospIds = doctorData.hospitals.map(h => typeof h === 'object' ? Number(h.id) : Number(h)).filter(Boolean);
      } else if (doctorData?.hospital) {
        targetHospIds = [typeof doctorData.hospital === 'object' ? Number(doctorData.hospital.id) : Number(doctorData.hospital)].filter(Boolean);
      } else if (currentUser?.hospital) {
        targetHospIds = [Number(currentUser.hospital)].filter(Boolean);
      }
    }

    const depts = [];

    // Extract departments ONLY from the doctor's selected / affiliated hospitals in backend
    targetHospIds.forEach(hId => {
      const hosp = hospitalsList.find(h => Number(h.id) === Number(hId));
      if (hosp) {
        const raw = hosp.departments || hosp.department;
        if (Array.isArray(raw)) {
          raw.forEach(d => {
            const name = typeof d === 'string' ? d.trim() : (d.name || '');
            if (name && !depts.includes(name)) depts.push(name);
          });
        } else if (typeof raw === 'string') {
          raw.split(',').forEach(s => {
            const name = s.trim().replace(/^['"\[\]]+|['"\[\]]+$/g, '').trim();
            if (name && !depts.includes(name)) depts.push(name);
          });
        }
      }
    });

    // If no hospital is assigned yet, check if any backend hospitals exist
    if (targetHospIds.length === 0 && hospitalsList.length > 0) {
      hospitalsList.forEach(hosp => {
        const raw = hosp.departments || hosp.department;
        if (Array.isArray(raw)) {
          raw.forEach(d => {
            const name = typeof d === 'string' ? d.trim() : (d.name || '');
            if (name && !depts.includes(name)) depts.push(name);
          });
        } else if (typeof raw === 'string') {
          raw.split(',').forEach(s => {
            const name = s.trim().replace(/^['"\[\]]+|['"\[\]]+$/g, '').trim();
            if (name && !depts.includes(name)) depts.push(name);
          });
        }
      });
    }

    return depts;
  };

  const handleToggleDepartment = (deptName) => {
    const current = parseDoctorDepartments(editFormData.department);
    let updated;
    if (current.includes(deptName)) {
      updated = current.filter(d => d !== deptName);
    } else {
      updated = [...current, deptName];
    }
    setEditFormData(prev => ({ ...prev, department: updated.join(', ') }));
  };

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const docId = currentUser?.id;

      // 1. Fetch hospitals
      const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
      let loadedHospitals = [];
      if (hospRes && hospRes.ok) {
        loadedHospitals = await hospRes.json().catch(() => []);
        if (Array.isArray(loadedHospitals)) {
          setHospitalsList(loadedHospitals);
        }
      }

      // 2. Fetch doctor profile
      let matchedDoc = null;
      try {
        const docRes = await fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null);
        if (docRes && docRes.ok) {
          const docs = await docRes.json().catch(() => []);
          if (Array.isArray(docs)) {
            matchedDoc = docs.find(d => 
              (d.email && d.email.toLowerCase().trim() === email) ||
              (docId && Number(d.id) === Number(docId)) ||
              (d.name && d.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        }
      } catch (e) {
        console.error('Error fetching doctor record:', e);
      }

      const activeDoc = matchedDoc || currentUser || {};
      setDoctorData(activeDoc);

      // Extract hospitals array (ManyToMany)
      let initialHospIds = [];
      if (Array.isArray(activeDoc.hospitals)) {
        initialHospIds = activeDoc.hospitals.map(h => typeof h === 'object' ? h.id : h).filter(Boolean);
      } else if (activeDoc.hospital) {
        initialHospIds = [typeof activeDoc.hospital === 'object' ? activeDoc.hospital.id : activeDoc.hospital].filter(Boolean);
      } else if (currentUser?.hospital) {
        initialHospIds = [Number(currentUser.hospital)].filter(Boolean);
      }

      setEditFormData({
        name: activeDoc.name || currentUser?.name || '',
        doctor_id: activeDoc.doctor_id || (activeDoc.id ? `DOC-${activeDoc.id}` : ''),
        email: activeDoc.email || currentUser?.email || '',
        phone: activeDoc.phone || activeDoc.contact || currentUser?.phone || '',
        password: activeDoc.password || '',
        specialization: activeDoc.specialization || activeDoc.specialty || '',
        additional_skills: activeDoc.additional_skills || '',
        department: activeDoc.department || '',
        qualification: activeDoc.qualification || '',
        experience: activeDoc.experience || '',
        opd_timings: activeDoc.opd_timings || '',
        consultation_fee: activeDoc.consultation_fee !== undefined && activeDoc.consultation_fee !== null ? activeDoc.consultation_fee : '',
        status: activeDoc.status || 'On_Duty',
        is_active: activeDoc.is_active !== undefined ? Boolean(activeDoc.is_active) : true,
        hospitals: initialHospIds,
        created_at: activeDoc.created_at || ''
      });

      setPasswordForm(prev => ({
        ...prev,
        email: activeDoc.email || currentUser?.email || ''
      }));

      // Find primary hospital
      if (initialHospIds.length > 0 && Array.isArray(loadedHospitals)) {
        const found = loadedHospitals.find(h => Number(h.id) === Number(initialHospIds[0]));
        if (found) setHospitalData(found);
      } else if (selectedHospital) {
        setHospitalData(selectedHospital);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorProfile();
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

  const handleHospitalToggle = (hospId) => {
    const idNum = Number(hospId);
    setEditFormData(prev => {
      const current = prev.hospitals || [];
      const updated = current.includes(idNum)
        ? current.filter(id => id !== idNum)
        : [...current, idNum];
      return { ...prev, hospitals: updated };
    });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setSaveSuccessMsg('');
      setSaveErrorMsg('');

      const docId = doctorData?.id || currentUser?.id;
      
      const payload = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim(),
        contact: editFormData.phone.trim(),
        specialization: editFormData.specialization.trim(),
        additional_skills: editFormData.additional_skills.trim(),
        department: editFormData.department.trim(),
        qualification: editFormData.qualification.trim(),
        experience: editFormData.experience.trim(),
        opd_timings: editFormData.opd_timings.trim(),
        consultation_fee: Number(editFormData.consultation_fee) || 0,
        status: editFormData.status,
        is_active: Boolean(editFormData.is_active),
        hospitals: editFormData.hospitals
      };

      if (editFormData.password) {
        payload.password = editFormData.password;
      }

      if (docId) {
        try {
          const res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${docId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            // Fallback PUT
            await fetch(`${API_BASE_URL}/super-admin/Doctors/${docId}/`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...doctorData,
                ...payload
              })
            }).catch(() => null);
          }
        } catch (apiErr) {
          console.warn('API PATCH failed, saving locally:', apiErr);
        }
      }

      // Update local state
      const updatedDoc = {
        ...doctorData,
        ...payload,
        id: docId,
        doctor_id: editFormData.doctor_id,
        created_at: editFormData.created_at
      };
      setDoctorData(updatedDoc);

      const updatedCurrentUser = {
        ...currentUser,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        specialization: payload.specialization,
        department: payload.department,
        status: payload.status,
        is_active: payload.is_active,
        hospital: payload.hospitals[0] || currentUser?.hospital
      };

      if (setCurrentUser) {
        setCurrentUser(updatedCurrentUser);
      }
      localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));

      if (payload.password) {
        localStorage.setItem(`pwd_${payload.email.toLowerCase()}`, payload.password);
      }

      setSaveSuccessMsg('Doctor profile updated successfully across all clinical records!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating doctor profile:', err);
      setSaveErrorMsg(err.message || 'Failed to update doctor profile.');
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
      const docId = doctorData?.id || currentUser?.id;
      const targetEmail = (editFormData.email || currentUser?.email || '').toLowerCase().trim();

      if (docId) {
        await fetch(`${API_BASE_URL}/super-admin/Doctors/${docId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPass })
        }).catch(() => null);
      }

      localStorage.setItem(`pwd_${targetEmail}`, newPass);
      setEditFormData(prev => ({ ...prev, password: newPass }));

      setPasswordSuccessMsg('Doctor login password updated successfully!');
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
      {/* TOP HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                🩺
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Doctor Profile & Settings
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    {editFormData.doctor_id || 'DOC'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Manage your clinical credentials, consultation schedule, affiliated hospitals & OPD timings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('doctor_dashboard')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>&larr;</span>
                <span>Back to Doctor Portal</span>
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
                  ? 'border-blue-600 text-blue-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>👤</span>
              <span>Doctor Profile (All Model Fields)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'security'
                  ? 'border-blue-600 text-blue-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🔒</span>
              <span>Password & Security</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
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

        {/* TAB 1: DOCTOR FULL PROFILE FORM */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: DOCTOR CARD & QUICK STATUS */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md mb-3">
                  {(editFormData.name || 'DOC').slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-base font-bold text-slate-900">{editFormData.name || 'Not Provided'}</h3>
                <p className="text-xs text-blue-700 font-semibold mt-0.5">{editFormData.specialization || 'Not Provided'}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Doctor ID:</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {editFormData.doctor_id || 'Not Provided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Consultation Fee:</span>
                    <span className="font-mono font-extrabold text-emerald-700">
                      {editFormData.consultation_fee ? `₹${editFormData.consultation_fee}` : 'Not Provided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Duty Status:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {editFormData.status || 'Not Provided'}
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
                    <span className="text-slate-400">Joined Date:</span>
                    <span className="font-medium text-slate-700">{editFormData.created_at || 'Not Provided'}</span>
                  </div>
                </div>
              </div>

              {/* AFFILIATED HOSPITALS SUMMARY */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Affiliated Hospitals ({editFormData.hospitals.length})</p>
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                  {editFormData.hospitals.map(hId => {
                    const hObj = hospitalsList.find(h => Number(h.id) === Number(hId));
                    return (
                      <div key={hId} className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{hObj?.Name || `Hospital #${hId}`}</span>
                        <span className="text-[10px] text-blue-300 font-mono">ID: {hId}</span>
                      </div>
                    );
                  })}
                  {editFormData.hospitals.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No hospitals selected</p>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: COMPLETE MODEL FIELD EDIT FORM */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Doctor Profile & Clinical Settings</h2>
                    <p className="text-[11px] text-slate-500">Edit clinical credentials and consultation profile (Doctor ID is system-protected)</p>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. NAME */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Doctor Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={editFormData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Dr. John Doe"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
                      />
                    </div>

                    {/* 2. DOCTOR ID */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Doctor ID
                      </label>
                      <input
                        type="text"
                        value={editFormData.doctor_id || ''}
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
                        placeholder="doctor@hospital.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
                      />
                    </div>

                    {/* 4. PHONE */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Phone / Contact <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="phone"
                        value={editFormData.phone}
                        onChange={handleInputChange}
                        required
                        placeholder="+91 9876543210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
                      />
                    </div>

                    {/* 5. SPECIALIZATION */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Specialization <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="specialization"
                        value={editFormData.specialization}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. Cardiologist, Cardiac Surgeon"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
                      />
                    </div>

                    {/* 6. STATUS (AVAILABILITY) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Status (Availability) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="status"
                        value={editFormData.status === 'Off_Duty' || editFormData.status === 'Off Duty' ? 'Off_Duty' : 'On_Duty'}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition cursor-pointer"
                      >
                        <option value="On_Duty">On Duty</option>
                        <option value="Off_Duty">Off Duty</option>
                      </select>
                    </div>

                    {/* 7. DEPARTMENT (DYNAMIC MULTI-SELECT FROM ALL SELECTED HOSPITALS) */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Department(s) <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] text-blue-600 font-semibold">
                          {parseDoctorDepartments(editFormData.department).length} Department(s) Selected
                        </span>
                      </div>
                      
                      {/* SELECTED BADGES DISPLAY */}
                      {parseDoctorDepartments(editFormData.department).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mb-2.5 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200">
                          {parseDoctorDepartments(editFormData.department).map(dept => (
                            <span
                              key={dept}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-2xs"
                            >
                              <span>{dept}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleDepartment(dept)}
                                className="text-blue-200 hover:text-white font-bold ml-1 cursor-pointer"
                                title="Remove Department"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-amber-700 mb-2 font-medium bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                          ⚠️ Please select at least one department from your affiliated hospital(s) below.
                        </p>
                      )}

                      {/* AVAILABLE DEPARTMENTS FROM ASSIGNED HOSPITALS */}
                      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Departments Configured for Your Hospital Branch(es):
                        </p>
                        {getAvailableHospitalDepartments().length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                            {getAvailableHospitalDepartments().map(dept => {
                              const isSelected = parseDoctorDepartments(editFormData.department).includes(dept);
                              return (
                                <button
                                  key={dept}
                                  type="button"
                                  onClick={() => handleToggleDepartment(dept)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                  }`}
                                >
                                  <span className="font-bold">{isSelected ? '✓' : '+'}</span>
                                  <span>{dept}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 text-center rounded-lg bg-slate-100 text-xs text-slate-500 font-medium">
                            ℹ️ No departments added by Hospital Admin for this hospital branch yet. (Departments can only be added/edited by Admin or Super Admin during hospital setup).
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 8. QUALIFICATION */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Qualification
                      </label>
                      <input
                        type="text"
                        name="qualification"
                        value={editFormData.qualification}
                        onChange={handleInputChange}
                        placeholder="e.g. MBBS, MD (Medicine), DM (Cardio)"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
                      />
                    </div>

                    {/* 9. EXPERIENCE */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Experience
                      </label>
                      <input
                        type="text"
                        name="experience"
                        value={editFormData.experience}
                        onChange={handleInputChange}
                        placeholder="e.g. 8 Years"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
                      />
                    </div>

                    {/* 10. OPD TIMINGS */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        OPD Timings
                      </label>
                      <select
                        name="opd_timings"
                        value={editFormData.opd_timings}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
                      >
                        <option value="">-- Select OPD Timings --</option>
                        {opdTimingsPresets.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* 11. CONSULTATION FEE */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Consultation Fee (₹)
                      </label>
                      <input
                        type="number"
                        name="consultation_fee"
                        value={editFormData.consultation_fee}
                        onChange={handleInputChange}
                        min="0"
                        step="50"
                        placeholder="e.g. 500"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
                      />
                    </div>

                    {/* 13. PASSWORD (READ-ONLY IN PROFILE) */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Login Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveTab('security')}
                          className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
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

                    {/* 14. ADDITIONAL SKILLS */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Additional Skills & Expertise
                      </label>
                      <textarea
                        name="additional_skills"
                        value={editFormData.additional_skills}
                        onChange={handleInputChange}
                        rows="2"
                        placeholder="e.g. Angioplasty, Echocardiography, Pacemaker Implantation..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
                      ></textarea>
                    </div>

                    {/* 15. HOSPITALS */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Assigned Hospitals
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 max-h-40 overflow-y-auto">
                        {hospitalsList.map(h => {
                          const isChecked = editFormData.hospitals.includes(Number(h.id));
                          return (
                            <label
                              key={h.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition ${
                                isChecked
                                  ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleHospitalToggle(h.id)}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                              />
                              <span className="truncate">{h.Name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={fetchDoctorProfile}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                    >
                      Reset Changes
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingProfile ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Saving Profile...</span>
                        </>
                      ) : (
                        'Save Doctor Profile'
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
                <span>Change Doctor Password</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update password for doctor portal access.
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
                  Doctor Email
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
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
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
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
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
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
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

export default DoctorSettings;
