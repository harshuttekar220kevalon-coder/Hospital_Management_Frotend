import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const DoctorSettings = ({
  currentUser,
  setCurrentUser,
  setCurrentPage,
  selectedHospital,
  setSelectedHospital,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [doctorData, setDoctorData] = useState(null);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [hospitalData, setHospitalData] = useState(null);

  // Dynamic backend lists for Specialization & Department
  const [backendSpecializations, setBackendSpecializations] = useState([]);
  const [backendDepartments, setBackendDepartments] = useState([]);
  const [isCustomSpec, setIsCustomSpec] = useState(false);
  const [isCustomDept, setIsCustomDept] = useState(false);

  // Complete Doctor Model Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    doctor_id: '',
    email: '',
    contact: '',
    phone: '',
    specialization: '',
    department: '',
    qualification: '',
    experience: '',
    shift: '',
    Shifts: '',
    opd_timings: '',
    consultation_fee: '',
    status: '',
    duty_status: '',
    hospital: '',
    password: '',
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

  const shiftsList = [
    'Morning First Shift',
    'Afternoon Second Shift',
    'Evening Third Shift'
  ];

  // Helper to extract unique departments from backend data
  const extractDepartmentsFromBackend = (hospitals, doctors, extraDepts = []) => {
    const deptSet = new Set();

    if (Array.isArray(extraDepts)) {
      extraDepts.forEach(d => {
        const name = typeof d === 'string' ? d : (d.name || d.department_name || d.title || '');
        if (name && name.trim()) deptSet.add(name.trim());
      });
    }

    if (Array.isArray(hospitals)) {
      hospitals.forEach(h => {
        const raw = h.departments || h.department;
        if (Array.isArray(raw)) {
          raw.forEach(d => {
            const name = typeof d === 'string' ? d : (d.name || '');
            if (name && name.trim()) deptSet.add(name.trim());
          });
        } else if (typeof raw === 'string' && raw.trim()) {
          raw.split(',').forEach(d => {
            const name = d.trim();
            if (name) deptSet.add(name);
          });
        }
      });
    }

    if (Array.isArray(doctors)) {
      doctors.forEach(doc => {
        if (doc.department && typeof doc.department === 'string' && doc.department.trim()) {
          deptSet.add(doc.department.trim());
        }
      });
    }

    if (deptSet.size === 0) {
      ['General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General Surgery', 'Gynecology', 'Emergency / OPD'].forEach(d => deptSet.add(d));
    }

    return Array.from(deptSet).sort();
  };

  // Helper to extract unique specializations from backend data
  const extractSpecializationsFromBackend = (doctors, hospitals, extraSpecs = []) => {
    const specSet = new Set();

    if (Array.isArray(extraSpecs)) {
      extraSpecs.forEach(s => {
        const name = typeof s === 'string' ? s : (s.name || s.specialization_name || s.title || '');
        if (name && name.trim()) specSet.add(name.trim());
      });
    }

    if (Array.isArray(doctors)) {
      doctors.forEach(doc => {
        const s = doc.specialization || doc.specialty;
        if (s && typeof s === 'string' && s.trim()) {
          specSet.add(s.trim());
        }
      });
    }

    if (Array.isArray(hospitals)) {
      hospitals.forEach(h => {
        const raw = h.departments || h.department;
        if (typeof raw === 'string' && raw.trim()) {
          raw.split(',').forEach(d => {
            const name = d.trim();
            if (name) specSet.add(name);
          });
        } else if (Array.isArray(raw)) {
          raw.forEach(d => {
            const name = typeof d === 'string' ? d : (d.name || '');
            if (name && name.trim()) specSet.add(name.trim());
          });
        }
      });
    }

    if (specSet.size === 0) {
      ['General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Gynecology', 'Oncology', 'Psychiatry', 'General Surgery'].forEach(s => specSet.add(s));
    }

    return Array.from(specSet).sort();
  };

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const docId = currentUser?.id;
      const docCode = currentUser?.doctor_id;

      // 1. Fetch hospitals from backend
      const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
      let loadedHospitals = [];
      if (hospRes && hospRes.ok) {
        loadedHospitals = await hospRes.json().catch(() => []);
        if (Array.isArray(loadedHospitals)) {
          setHospitalsList(loadedHospitals);
        }
      }

      // 2. Fetch all doctors from backend
      let allDocs = [];
      let matchedDoctor = null;
      try {
        const dRes = await fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null);
        if (dRes && dRes.ok) {
          allDocs = await dRes.json().catch(() => []);
          if (Array.isArray(allDocs)) {
            matchedDoctor = allDocs.find(d =>
              (d.email && d.email.toLowerCase().trim() === email) ||
              (docId && Number(d.id) === Number(docId)) ||
              (docCode && d.doctor_id === docCode) ||
              (d.name && d.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        }
      } catch (e) {
        console.error('Error fetching doctor record:', e);
      }

      // 3. Attempt direct backend departments & specializations endpoints if available
      let directDepts = [];
      let directSpecs = [];
      try {
        const deptRes = await fetch(`${API_BASE_URL}/super-admin/departments/`).catch(() => null)
          || await fetch(`${API_BASE_URL}/super-admin/Department/`).catch(() => null);
        if (deptRes && deptRes.ok) {
          directDepts = await deptRes.json().catch(() => []);
        }
      } catch (e) {}

      try {
        const specRes = await fetch(`${API_BASE_URL}/super-admin/specializations/`).catch(() => null)
          || await fetch(`${API_BASE_URL}/super-admin/Specialization/`).catch(() => null);
        if (specRes && specRes.ok) {
          directSpecs = await specRes.json().catch(() => []);
        }
      } catch (e) {}

      // Extract dynamic backend lists
      let extractedDepts = extractDepartmentsFromBackend(loadedHospitals, allDocs, directDepts);
      let extractedSpecs = extractSpecializationsFromBackend(allDocs, loadedHospitals, directSpecs);

      const activeDoctor = matchedDoctor || currentUser || {};
      setDoctorData(activeDoctor);

      const currentSpec = activeDoctor.specialization || currentUser?.specialization || '';
      const currentDept = activeDoctor.department || currentUser?.department || '';

      if (currentSpec && !extractedSpecs.includes(currentSpec)) {
        extractedSpecs.push(currentSpec);
        extractedSpecs.sort();
      }
      if (currentDept && !extractedDepts.includes(currentDept)) {
        extractedDepts.push(currentDept);
        extractedDepts.sort();
      }

      setBackendSpecializations(extractedSpecs);
      setBackendDepartments(extractedDepts);

      const targetHospId = activeDoctor.hospital
        ? (typeof activeDoctor.hospital === 'object' ? activeDoctor.hospital.id : activeDoctor.hospital)
        : (currentUser?.hospital || '');

      const docShift = activeDoctor.shift || activeDoctor.Shifts || activeDoctor.opd_timings || currentUser?.shift || '';
      const docStatus = activeDoctor.status || activeDoctor.duty_status || currentUser?.status || '';

      setEditFormData({
        name: activeDoctor.name || currentUser?.name || '',
        doctor_id: activeDoctor.doctor_id || (activeDoctor.id ? `DOC-${activeDoctor.id}` : (currentUser?.doctor_id || 'DOC-101')),
        email: activeDoctor.email || currentUser?.email || '',
        contact: activeDoctor.contact || activeDoctor.phone || currentUser?.contact || currentUser?.phone || '',
        phone: activeDoctor.phone || activeDoctor.contact || currentUser?.phone || currentUser?.contact || '',
        specialization: currentSpec,
        department: currentDept,
        qualification: activeDoctor.qualification || currentUser?.qualification || '',
        experience: activeDoctor.experience || currentUser?.experience || '',
        shift: docShift,
        Shifts: docShift,
        opd_timings: docShift,
        consultation_fee: activeDoctor.consultation_fee !== undefined && activeDoctor.consultation_fee !== null ? String(activeDoctor.consultation_fee) : '',
        status: docStatus,
        duty_status: docStatus,
        hospital: targetHospId ? String(targetHospId) : '',
        password: activeDoctor.password || 'Doctor@123',
        created_at: activeDoctor.created_at || ''
      });

      setPasswordForm(prev => ({
        ...prev,
        email: activeDoctor.email || currentUser?.email || ''
      }));

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
    fetchDoctorProfile();
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;

    if (name === 'contact' || name === 'phone') {
      finalValue = String(value).replace(/\D/g, '').slice(0, 10);
    } else if (name === 'consultation_fee') {
      let val = String(value);
      if (val.includes('0.00') && val.length > 4) {
        val = val.replace('0.00', '');
      } else if (val.startsWith('0') && val.length > 1 && !val.startsWith('0.')) {
        val = val.replace(/^0+/, '');
      }
      finalValue = val;
    }

    setEditFormData(prev => {
      const next = { ...prev, [name]: finalValue };
      if (name === 'contact') next.phone = finalValue;
      if (name === 'shift') {
        next.Shifts = finalValue;
        next.opd_timings = finalValue;
      }
      if (name === 'status') {
        next.duty_status = finalValue;
      }
      return next;
    });

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

      const doctorId = doctorData?.id || currentUser?.id;
      const rawName = editFormData.name.trim();
      const formattedName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName.replace(/^Dr\.\s*/i, '')}`;

      const payload = {
        name: formattedName,
        doctor_id: editFormData.doctor_id,
        email: editFormData.email.trim(),
        contact: cleanPhone,
        phone: cleanPhone,
        specialization: editFormData.specialization.trim(),
        department: editFormData.department.trim(),
        qualification: editFormData.qualification.trim(),
        experience: editFormData.experience.trim(),
        shift: editFormData.shift,
        Shifts: editFormData.shift,
        opd_timings: editFormData.shift,
        consultation_fee: editFormData.consultation_fee,
        status: editFormData.status,
        duty_status: editFormData.status,
        hospital: editFormData.hospital ? Number(editFormData.hospital) : null,
        hospitals: editFormData.hospital ? [Number(editFormData.hospital)] : []
      };

      if (editFormData.password) {
        payload.password = editFormData.password;
      }

      if (doctorId) {
        try {
          const res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${doctorId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            await fetch(`${API_BASE_URL}/super-admin/Doctors/${doctorId}/`, {
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

      // Update local doctor state
      const updatedDoctor = {
        ...doctorData,
        ...payload,
        id: doctorId,
        doctor_id: editFormData.doctor_id,
        created_at: editFormData.created_at
      };
      setDoctorData(updatedDoctor);

      // Keep dynamic backend choices updated
      if (payload.specialization && !backendSpecializations.includes(payload.specialization)) {
        setBackendSpecializations(prev => [...prev, payload.specialization].sort());
      }
      if (payload.department && !backendDepartments.includes(payload.department)) {
        setBackendDepartments(prev => [...prev, payload.department].sort());
      }

      // Update current user state for live session sync
      const updatedCurrentUser = {
        ...currentUser,
        name: payload.name,
        email: payload.email,
        contact: payload.contact,
        phone: payload.contact,
        specialization: payload.specialization,
        department: payload.department,
        qualification: payload.qualification,
        experience: payload.experience,
        shift: payload.shift,
        Shifts: payload.shift,
        opd_timings: payload.shift,
        consultation_fee: payload.consultation_fee,
        status: payload.status,
        duty_status: payload.status,
        hospital: payload.hospital
      };

      if (setCurrentUser) {
        setCurrentUser(updatedCurrentUser);
      }
      localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));

      if (payload.password) {
        localStorage.setItem(`pwd_${payload.email.toLowerCase()}`, payload.password);
      }

      if (payload.hospital && hospitalsList.length > 0) {
        const found = hospitalsList.find(h => Number(h.id) === Number(payload.hospital));
        if (found) {
          setHospitalData(found);
          if (setSelectedHospital) setSelectedHospital(found);
          localStorage.setItem('selectedHospital', JSON.stringify(found));
        }
      }

      setSaveSuccessMsg('Doctor profile details updated successfully!');
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
      const doctorId = doctorData?.id || currentUser?.id;
      const targetEmail = (editFormData.email || currentUser?.email || '').toLowerCase().trim();

      if (doctorId) {
        await fetch(`${API_BASE_URL}/super-admin/Doctors/${doctorId}/`, {
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

  // Compute initials for avatar
  const displayName = editFormData.name || currentUser?.name || 'Doctor';
  const cleanInitials = displayName.replace(/^Dr\.\s*/i, '').trim().slice(0, 2).toUpperCase() || 'DR';

  // Multi-hospital affiliations list
  const assignedHospitalsList = Array.isArray(doctorData?.hospitals) && doctorData.hospitals.length > 0
    ? hospitalsList.filter(h => doctorData.hospitals.some(dh => Number(typeof dh === 'object' ? dh.id : dh) === Number(h.id)))
    : (hospitalData ? [hospitalData] : []);

  return (
    <div className="w-full bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* HEADER BAR */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                👨‍⚕️
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Doctor Profile & Settings
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                    {editFormData.doctor_id || 'DOC'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Manage medical credentials, backend specialization & department, OPD timings & security
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
                <span>Back to Doctor Dashboard</span>
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
                  ? 'border-teal-600 text-teal-800'
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
      <div className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8 space-y-6">
        {saveSuccessMsg && (
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold flex items-center gap-2 shadow-xs">
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

        {/* TAB 1: COMPLETE DOCTOR MODEL EDIT FORM */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: DOCTOR OVERVIEW SUMMARY CARD */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-600 text-white flex items-center justify-center font-black text-2xl shadow-md mb-3">
                  {cleanInitials}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editFormData.name ? (editFormData.name.startsWith('Dr.') ? editFormData.name : `Dr. ${editFormData.name}`) : 'Dr. Doctor'}
                </h3>
                <p className="text-xs text-teal-700 font-semibold mt-0.5">
                  {editFormData.specialization || 'Specialization not set'}{editFormData.department ? ` • ${editFormData.department}` : ''}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Doctor ID:</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {editFormData.doctor_id || (currentUser?.id ? `DOC-${currentUser.id}` : 'DOC-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">OPD Shift:</span>
                    <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 truncate max-w-[150px]">
                      {editFormData.shift || 'Not Set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Consultation Fee:</span>
                    <span className="font-bold text-slate-900 bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                      {editFormData.consultation_fee !== '' && editFormData.consultation_fee !== undefined && editFormData.consultation_fee !== null ? `₹${editFormData.consultation_fee}` : 'Not Set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Duty Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      editFormData.status === 'On_Duty' ? 'bg-emerald-100 text-emerald-800' : (editFormData.status === 'Off_Duty' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')
                    }`}>
                      {editFormData.status ? (editFormData.status === 'On_Duty' ? 'On Duty' : editFormData.status === 'Off_Duty' ? 'Off Duty' : editFormData.status) : 'Not Set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Experience:</span>
                    <span className="font-semibold text-slate-800">
                      {editFormData.experience || 'Not Specified'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50 text-slate-600">
                    <span className="text-slate-400">Qualification:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                      {editFormData.qualification || 'MBBS, MD'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 text-slate-600">
                    <span className="text-slate-400">Hospital:</span>
                    <span className="font-bold text-teal-900 truncate max-w-[140px]">
                      {hospitalData?.Name || hospitalData?.name || 'Hospital Branch'}
                    </span>
                  </div>
                </div>

                {/* MULTI HOSPITAL BADGES */}
                {assignedHospitalsList.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-left">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                      Affiliated Branches ({assignedHospitalsList.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {assignedHospitalsList.map(h => (
                        <span key={h.id} className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          {h.Name || h.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: EDIT FORM */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Doctor Profile & Practice Information</h2>
                    <p className="text-[11px] text-slate-500">Edit credentials, backend specialization & department, OPD shifts and consultation fee</p>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. DOCTOR NAME */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Doctor Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={editFormData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Dr. John Doe"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                      />
                    </div>

                    {/* 2. DOCTOR ID (READ-ONLY) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Doctor ID (System-Protected)
                      </label>
                      <input
                        type="text"
                        value={editFormData.doctor_id || ''}
                        disabled
                        placeholder="DOC-101"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs sm:text-sm font-mono text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    {/* 3. EMAIL ADDRESS */}
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
                        placeholder="doctor@gmail.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                      />
                    </div>

                    {/* 4. CONTACT / PHONE */}
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                      />
                    </div>

                    {/* 5. SPECIALIZATION (FROM BACKEND) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Specialization <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                          From Backend ({backendSpecializations.length})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <select
                          name="specialization"
                          value={backendSpecializations.includes(editFormData.specialization) && !isCustomSpec ? editFormData.specialization : 'CUSTOM'}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setIsCustomSpec(true);
                            } else {
                              setIsCustomSpec(false);
                              setEditFormData(prev => ({ ...prev, specialization: e.target.value }));
                            }
                          }}
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 font-semibold focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition cursor-pointer"
                        >
                          <option value="">-- Select Specialization from Backend --</option>
                          {backendSpecializations.map(spec => (
                            <option key={spec} value={spec}>{spec}</option>
                          ))}
                          <option value="CUSTOM">+ Add / Custom Specialization</option>
                        </select>
                        {(isCustomSpec || (!backendSpecializations.includes(editFormData.specialization) && editFormData.specialization)) && (
                          <div className="flex items-center gap-1.5 animate-in fade-in">
                            <input
                              type="text"
                              name="specialization"
                              value={editFormData.specialization}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, specialization: e.target.value }))}
                              placeholder="Type custom specialization..."
                              className="w-full px-3.5 py-2 rounded-xl border border-teal-500 bg-teal-50/40 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                            />
                            <button
                              type="button"
                              onClick={() => setIsCustomSpec(false)}
                              className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                              title="Back to list"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 6. DEPARTMENT (FROM BACKEND) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Department <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                          From Backend ({backendDepartments.length})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <select
                          name="department"
                          value={backendDepartments.includes(editFormData.department) && !isCustomDept ? editFormData.department : 'CUSTOM'}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setIsCustomDept(true);
                            } else {
                              setIsCustomDept(false);
                              setEditFormData(prev => ({ ...prev, department: e.target.value }));
                            }
                          }}
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 font-semibold focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition cursor-pointer"
                        >
                          <option value="">-- Select Department from Backend --</option>
                          {backendDepartments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                          <option value="CUSTOM">+ Add / Custom Department</option>
                        </select>
                        {(isCustomDept || (!backendDepartments.includes(editFormData.department) && editFormData.department)) && (
                          <div className="flex items-center gap-1.5 animate-in fade-in">
                            <input
                              type="text"
                              name="department"
                              value={editFormData.department}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, department: e.target.value }))}
                              placeholder="Type custom department..."
                              className="w-full px-3.5 py-2 rounded-xl border border-teal-500 bg-teal-50/40 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                            />
                            <button
                              type="button"
                              onClick={() => setIsCustomDept(false)}
                              className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                              title="Back to list"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 7. QUALIFICATION */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Qualification
                      </label>
                      <input
                        type="text"
                        name="qualification"
                        value={editFormData.qualification}
                        onChange={handleInputChange}
                        placeholder="e.g. MBBS, MD, MS, FRCS"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                      />
                    </div>

                    {/* 8. EXPERIENCE */}
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                      />
                    </div>

                    {/* 9. SHIFT TIMINGS */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        OPD Shift Timings <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="shift"
                        value={editFormData.shift || ''}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition"
                      >
                        <option value="">-- Select Shift --</option>
                        {shiftsList.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* 10. CONSULTATION FEE */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Consultation Fee (₹)
                      </label>
                      <input
                        type="number"
                        name="consultation_fee"
                        min="0"
                        step="any"
                        value={editFormData.consultation_fee}
                        onFocus={(e) => {
                          const currentVal = String(editFormData.consultation_fee || '').trim();
                          if (currentVal === '0.00' || currentVal === '0' || Number(currentVal) === 0) {
                            setEditFormData(prev => ({ ...prev, consultation_fee: '' }));
                          } else {
                            e.target.select();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
                            const currentVal = String(editFormData.consultation_fee || '').trim();
                            if (currentVal === '0.00' || currentVal === '0') {
                              e.preventDefault();
                              setEditFormData(prev => ({ ...prev, consultation_fee: e.key }));
                            }
                          }
                        }}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val.includes('0.00') && val.length > 4) {
                            val = val.replace('0.00', '');
                          } else if (val.startsWith('0') && val.length > 1 && !val.startsWith('0.')) {
                            val = val.replace(/^0+/, '');
                          }
                          setEditFormData(prev => ({ ...prev, consultation_fee: val }));
                          if (saveSuccessMsg) setSaveSuccessMsg('');
                          if (saveErrorMsg) setSaveErrorMsg('');
                        }}
                        placeholder="Enter consultation fee"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition font-medium"
                      />
                    </div>

                    {/* 11. DUTY STATUS */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Duty Status
                      </label>
                      <select
                        name="status"
                        value={editFormData.status || ''}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition cursor-pointer"
                      >
                        <option value="">-- Select Status --</option>
                        <option value="On_Duty">On Duty</option>
                        <option value="Off_Duty">Off Duty</option>
                      </select>
                    </div>

                    {/* 12. HOSPITAL AFFILIATION (LOCKED) */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Primary Hospital Affiliation
                        </label>
                        <span className="text-[10px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-flex items-center gap-1">
                          🔒 Locked (Non-editable)
                        </span>
                      </div>
                      <input
                        type="text"
                        value={hospitalData?.Name || hospitalData?.name || (editFormData.hospital ? (hospitalsList.find(h => Number(h.id) === Number(editFormData.hospital))?.Name || hospitalsList.find(h => Number(h.id) === Number(editFormData.hospital))?.name) : '') || doctorData?.hospital_name || currentUser?.hospital_name || 'Assigned Hospital'}
                        disabled
                        readOnly
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        🔒 Hospital assignment is managed by Hospital Admin and cannot be changed here.
                      </p>
                    </div>

                    {/* 13. PASSWORD PREVIEW IN PROFILE */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Doctor Login Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveTab('security')}
                          className="text-[11px] text-teal-600 hover:text-teal-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
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
                        🔒 Read-only preview field. Password can only be changed in the <strong>Password & Security</strong> section.
                      </p>
                    </div>
                  </div>

                  {/* SUBMIT BUTTONS */}
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
                      className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
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

        {/* TAB 2: SECURITY & PASSWORD */}
        {activeTab === 'security' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🔒</span>
                <span>Change Doctor Password</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update login credentials for doctor portal access.
              </p>
            </div>

            {passwordSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold">
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
                  Doctor Email Address
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
                    maxLength="20"
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
                    maxLength="20"
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
      </div>
    </div>
  );
};

export default DoctorSettings;
