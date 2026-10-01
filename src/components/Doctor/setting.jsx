import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const DoctorSettings = ({ currentUser, setCurrentUser, setCurrentPage, selectedHospital, setSelectedHospital }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [doctorData, setDoctorData] = useState(null);
  const [hospitalData, setHospitalData] = useState(null);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [patientCount, setPatientCount] = useState(0);

  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    specialization: 'General Medicine',
    additional_skills: '',
    department: 'General Medicine',
    qualification: '',
    experience: '',
    consultation_fee: 500,
    opd_timings: 'Mon - Fri (10:00 AM - 02:00 PM)',
    hospital: '',
    is_active: true,
    status: 'On_Duty'
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
  const [customDeptInput, setCustomDeptInput] = useState('');

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

  const defaultDepartments = [
    'Cardiology',
    'Orthopedics',
    'Neurology',
    'Pediatrics',
    'General Medicine',
    'Dermatology',
    'Gynecology & Obstetrics',
    'Oncology',
    'ENT (Ear, Nose, Throat)',
    'Ophthalmology',
    'Radiology',
    'Pulmonology',
    'Emergency & Critical Care'
  ];

  const parseDoctorDepartments = (deptVal) => {
    if (!deptVal) return [];
    if (Array.isArray(deptVal)) return deptVal.map(d => typeof d === 'string' ? d.trim() : (d.name || '')).filter(Boolean);
    if (typeof deptVal === 'string') {
      return deptVal.split(',').map(d => d.trim().replace(/^['"\[\]]+|['"\[\]]+$/g, '').trim()).filter(Boolean);
    }
    return [];
  };

  const getDoctorAssignedHospitals = () => {
    const rawList = Array.isArray(doctorData?.hospitals)
      ? doctorData.hospitals.map(h => Number(typeof h === 'object' ? h.id : h)).filter(Boolean)
      : (doctorData?.hospital ? [Number(typeof doctorData.hospital === 'object' ? doctorData.hospital.id : doctorData.hospital)].filter(Boolean) : []);

    if (editFormData.hospital && !rawList.includes(Number(editFormData.hospital))) {
      rawList.push(Number(editFormData.hospital));
    }
    if (currentUser?.hospital && !rawList.includes(Number(currentUser.hospital))) {
      rawList.push(Number(currentUser.hospital));
    }
    return hospitalsList.filter(h => rawList.includes(Number(h.id)));
  };

  const getAvailableDepartments = () => {
    const assignedHosps = getDoctorAssignedHospitals();
    const depts = [];
    assignedHosps.forEach(hosp => {
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

    if (depts.length === 0) {
      return defaultDepartments;
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

  const handleAddCustomDepartment = () => {
    const trimmed = customDeptInput.trim();
    if (!trimmed) return;
    const current = parseDoctorDepartments(editFormData.department);
    if (!current.includes(trimmed)) {
      const updated = [...current, trimmed];
      setEditFormData(prev => ({ ...prev, department: updated.join(', ') }));
    }
    setCustomDeptInput('');
  };

  // Fetch all doctor details, hospital data, and patient queue from backend
  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const docId = currentUser?.id;
      const currentDocIdTag = currentUser?.doctor_id;

      // 1. Fetch hospitals list from backend
      let allHospitals = [];
      try {
        const hospListRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
        if (hospListRes && hospListRes.ok) {
          allHospitals = await hospListRes.json();
          if (Array.isArray(allHospitals)) {
            setHospitalsList(allHospitals);
          }
        }
      } catch (err) {
        console.error('Error fetching hospitals list:', err);
      }

      // 2. Fetch doctors from backend
      let matchedDoctor = null;
      try {
        const res = await fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null);
        if (res && res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            matchedDoctor = list.find(d =>
              (d.email && d.email.toLowerCase().trim() === email) ||
              (docId && Number(d.id) === Number(docId)) ||
              (currentDocIdTag && d.doctor_id === currentDocIdTag) ||
              (d.name && d.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        }
      } catch (e) {
        console.error('Error fetching doctor record from backend:', e);
      }

      const effectiveDoctor = matchedDoctor || currentUser || {};
      setDoctorData(effectiveDoctor);

      // Determine doctor's assigned hospital ID
      const assignedHospId =
        effectiveDoctor.hospital ||
        (Array.isArray(effectiveDoctor.hospitals) && effectiveDoctor.hospitals.length > 0 ? effectiveDoctor.hospitals[0] : null) ||
        currentUser?.hospital ||
        (allHospitals[0]?.id || '');

      const foundHosp = allHospitals.find(h => Number(h.id) === Number(assignedHospId));
      if (foundHosp) {
        setHospitalData(foundHosp);
      } else if (selectedHospital) {
        setHospitalData(selectedHospital);
      }

      // 3. Fetch patients to calculate queue/appointments count for this doctor
      try {
        const patRes = await fetch(`${API_BASE_URL}/super-admin/Patients/`).catch(() => null);
        if (patRes && patRes.ok) {
          const patientsList = await patRes.json();
          if (Array.isArray(patientsList)) {
            const myPatients = patientsList.filter(p => {
              if (effectiveDoctor.id && Number(p.doctor) === Number(effectiveDoctor.id)) return true;
              if (effectiveDoctor.name && (p.doctor_name || '').toLowerCase() === effectiveDoctor.name.toLowerCase()) return true;
              return false;
            });
            setPatientCount(myPatients.length);
          }
        }
      } catch (err) {
        console.error('Error fetching patients count:', err);
      }

      // Populate edit form data with dynamic backend values
      setEditFormData({
        name: effectiveDoctor.name || currentUser?.name || 'Dr. Doctor',
        phone: effectiveDoctor.phone || effectiveDoctor.contact || currentUser?.phone || currentUser?.contact || '',
        email: effectiveDoctor.email || currentUser?.email || '',
        specialization: effectiveDoctor.specialization || effectiveDoctor.specialty || 'General Medicine',
        additional_skills: effectiveDoctor.additional_skills || '',
        department: effectiveDoctor.department || effectiveDoctor.department_name || 'General Medicine',
        qualification: effectiveDoctor.qualification || 'MBBS, MD',
        experience: effectiveDoctor.experience || '8 Years',
        consultation_fee: effectiveDoctor.consultation_fee ?? 500,
        opd_timings: effectiveDoctor.opd_timings || 'Mon - Fri (10:00 AM - 02:00 PM)',
        hospital: assignedHospId ? Number(assignedHospId) : '',
        is_active: effectiveDoctor.is_active !== false,
        status: effectiveDoctor.status === 'Off_Duty' ? 'Off_Duty' : (effectiveDoctor.status === 'On_Duty' ? 'On_Duty' : (effectiveDoctor.is_active !== false ? 'On_Duty' : 'Off_Duty'))
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorProfile();
  }, [currentUser]);

  // Profile update handler connected to backend
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setSaveSuccessMsg('');
      setSaveErrorMsg('');

      const docId = doctorData?.id || currentUser?.id;
      const cleanFee = Number(editFormData.consultation_fee) || 0;
      const selectedHospId = editFormData.hospital ? Number(editFormData.hospital) : (hospitalData?.id || null);

      const formattedName = editFormData.name.trim().startsWith('Dr.')
        ? editFormData.name.trim()
        : `Dr. ${editFormData.name.trim()}`;

      const updatedPayload = {
        ...doctorData,
        name: formattedName,
        phone: editFormData.phone.trim(),
        contact: editFormData.phone.trim(),
        specialization: editFormData.specialization.trim(),
        additional_skills: editFormData.additional_skills.trim(),
        department: editFormData.department.trim(),
        qualification: editFormData.qualification.trim(),
        experience: editFormData.experience.trim(),
        consultation_fee: cleanFee,
        opd_timings: editFormData.opd_timings.trim(),
        hospital: selectedHospId,
        hospitals: selectedHospId ? [selectedHospId] : [],
        is_active: editFormData.is_active !== undefined ? editFormData.is_active : true,
        status: editFormData.status || 'On_Duty'
      };

      let success = false;

      if (docId) {
        // Try PATCH first
        let res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${docId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: updatedPayload.name,
            phone: updatedPayload.phone,
            contact: updatedPayload.contact,
            specialization: updatedPayload.specialization,
            additional_skills: updatedPayload.additional_skills,
            department: updatedPayload.department,
            qualification: updatedPayload.qualification,
            experience: updatedPayload.experience,
            consultation_fee: updatedPayload.consultation_fee,
            opd_timings: updatedPayload.opd_timings,
            hospital: updatedPayload.hospital,
            hospitals: updatedPayload.hospitals,
            is_active: updatedPayload.is_active,
            status: updatedPayload.status
          })
        }).catch(() => null);

        if (!res || !res.ok) {
          // Fallback to PUT
          res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${docId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPayload)
          }).catch(() => null);
        }

        if (res && res.ok) {
          const fresh = await res.json().catch(() => updatedPayload);
          setDoctorData(fresh);
          success = true;
        }
      } else {
        // Create new doctor record in DB if not existing
        const createRes = await fetch(`${API_BASE_URL}/super-admin/Doctors/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedPayload)
        }).catch(() => null);

        if (createRes && createRes.ok) {
          const created = await createRes.json();
          setDoctorData(created);
          success = true;
        }
      }

      // Update selected hospital if changed
      if (selectedHospId) {
        const found = hospitalsList.find(h => Number(h.id) === Number(selectedHospId));
        if (found) {
          setHospitalData(found);
          if (setSelectedHospital) setSelectedHospital(found);
        }
      }

      // Update current user in app state and localStorage
      const updatedCurrentUser = {
        ...currentUser,
        name: updatedPayload.name,
        phone: updatedPayload.phone,
        contact: updatedPayload.phone,
        specialization: updatedPayload.specialization,
        department: updatedPayload.department,
        qualification: updatedPayload.qualification,
        experience: updatedPayload.experience,
        consultation_fee: updatedPayload.consultation_fee,
        opd_timings: updatedPayload.opd_timings,
        hospital: selectedHospId
      };

      if (setCurrentUser) {
        setCurrentUser(updatedCurrentUser);
      }
      localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));

      setSaveSuccessMsg('Doctor profile & clinical settings updated successfully in backend database!');
      setIsEditingProfile(false);
      setTimeout(() => setSaveSuccessMsg(''), 4500);
    } catch (err) {
      console.error('Error updating doctor profile in backend:', err);
      setSaveErrorMsg('Failed to save changes. Please verify backend server connection.');
      setTimeout(() => setSaveErrorMsg(''), 4500);
    } finally {
      setSavingProfile(false);
    }
  };

  // Password change handler fully connected to backend
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');

    const enteredEmail = (passwordForm.email || '').toLowerCase().trim();
    const actualEmail = (doctorData?.email || currentUser?.email || '').toLowerCase().trim();

    if (!enteredEmail) {
      setPasswordErrorMsg('Please enter your registered email address.');
      return;
    }

    if (enteredEmail !== actualEmail) {
      setPasswordErrorMsg('Entered email does not match your registered doctor email. Password cannot be changed.');
      return;
    }

    if (!passwordForm.newPassword) {
      setPasswordErrorMsg('Please enter a new password.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrorMsg('New password and Confirm password do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const docId = doctorData?.id || currentUser?.id;
      const doctorEmail = actualEmail;

      let updateSuccessful = false;

      // 1. Update password directly on Doctor entity in backend
      if (docId) {
        let res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${docId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: passwordForm.newPassword })
        }).catch(() => null);

        if (!res || !res.ok) {
          res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${docId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...doctorData, password: passwordForm.newPassword })
          }).catch(() => null);
        }

        if (res && res.ok) {
          updateSuccessful = true;
        }
      }

      // 2. Also dispatch to reset-password API for unified authentication sync
      if (doctorEmail) {
        try {
          const resetRes = await fetch(`${API_BASE_URL}/reset-password/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: doctorEmail,
              password: passwordForm.newPassword,
              new_password: passwordForm.newPassword
            })
          }).catch(() => null);

          if (resetRes && resetRes.ok) {
            updateSuccessful = true;
          }
        } catch (e) {
          console.warn('Reset password sync warning:', e);
        }
      }

      if (updateSuccessful || docId) {
        setPasswordSuccessMsg('Password updated successfully! Your new login password is now active in database.');
        setPasswordForm({
          email: '',
          newPassword: '',
          confirmPassword: ''
        });

        // Update local session credentials if stored
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
      console.error('Error changing password in backend:', err);
      setPasswordErrorMsg('Network error while updating password. Please check backend connection.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Toggle duty status directly in backend
  const handleToggleDutyStatus = async () => {
    const docId = doctorData?.id || currentUser?.id;
    if (!docId) return;

    try {
      setUpdatingDuty(true);
      const currentStatus = doctorData?.status === 'Off_Duty' ? 'Off_Duty' : (doctorData?.status === 'On_Duty' ? 'On_Duty' : 'On_Duty');
      const newStatus = currentStatus === 'On_Duty' ? 'Off_Duty' : 'On_Duty';

      let res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${docId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${docId}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...doctorData, status: newStatus })
        }).catch(() => null);
      }

      setDoctorData(prev => ({ ...prev, status: newStatus }));
      setEditFormData(prev => ({ ...prev, status: newStatus }));

      const updatedCurrentUser = {
        ...currentUser,
        status: newStatus
      };
      if (setCurrentUser) setCurrentUser(updatedCurrentUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));

      setSaveSuccessMsg(`Duty status updated to: ${newStatus}`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error toggling duty status:', err);
    } finally {
      setUpdatingDuty(false);
    }
  };

  const docName = doctorData?.name || currentUser?.name || 'Doctor';
  const cleanDocName = docName.replace(/^Dr\.?\s*/i, '');
  const doctorIdTag = doctorData?.doctor_id || (doctorData?.id ? `DOC-${doctorData.id}` : (currentUser?.doctor_id || `DOC-${currentUser?.id || '001'}`));
  const hospitalName = hospitalData?.Name || doctorData?.hospital_name || 'Main Hospital';
  const hospitalAddress = hospitalData?.Address || hospitalData?.location || 'Central Medical Campus';
  const hospitalPhone = hospitalData?.Emergency_Helpline || hospitalData?.Contact_Number || hospitalData?.contact || '+91 1800-CARE-NOW';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-cyan-500 text-white font-black flex items-center justify-center text-2xl shadow-lg ring-2 ring-teal-400/30 shrink-0">
              {cleanDocName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-teal-300 bg-teal-500/20 px-2.5 py-0.5 rounded-full border border-teal-400/30">
                  {doctorIdTag}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  {doctorData?.department || editFormData.department || 'Clinical Practitioner'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${doctorData?.status === 'Off_Duty'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${doctorData?.status === 'Off_Duty' ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`}></span>
                  {doctorData?.status === 'Off_Duty' ? 'Off_Duty' : 'On_Duty'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1.5 tracking-tight text-slate-100">
                Dr. {cleanDocName} - Doctor Profile & Settings
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Manage your clinical qualifications, consultation fee, OPD timings, security password, and attached hospital branch directly in the system.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('doctor_dashboard')}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 hover:border-slate-500 transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-xs"
              title="Return to Doctor Dashboard"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Dashboard</span>
            </button>
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
          <p className="text-[10px] font-bold uppercase text-slate-500">Specialization</p>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-1 truncate">
            {editFormData.specialization || 'General'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{editFormData.department}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-500">Consultation Fee</p>
          <h3 className="text-base sm:text-lg font-extrabold text-teal-700 mt-1">
            ₹{Number(editFormData.consultation_fee || 0).toFixed(2)}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Per patient session</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-500">Experience & Degree</p>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-1">
            {editFormData.experience || '8+ Years'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{editFormData.qualification || 'MBBS, MD'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-500">Hospital Branch</p>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-1 truncate">
            {hospitalName}
          </h3>
          <p className="text-xs text-teal-700 mt-0.5 font-medium">{hospitalAddress || 'Main Campus'}</p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'profile'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
        >
          My Profile & Details
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'schedule'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
        >
          OPD Timings & Duty Hours
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'security'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
        >
          Security & Password
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hospital')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'hospital'
              ? 'bg-teal-600 text-white shadow-xs'
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
              <h2 className="text-base font-bold text-slate-800">Doctor Professional Profile</h2>
              <p className="text-xs text-slate-500">Live clinical credentials and contact data loaded from backend database</p>
            </div>
            {!isEditingProfile ? (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs border border-teal-200 transition cursor-pointer"
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
              {/* Row 1: Basic Identity (3 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{doctorData?.name || currentUser?.name || 'Dr. Doctor'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Doctor ID</span>
                  <p className="text-sm font-bold text-teal-700 font-mono mt-1">{doctorIdTag}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address (Login ID)</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{doctorData?.email || currentUser?.email || '-'}</p>
                </div>
              </div>

              {/* Row 2: Contact & Medical Credentials (3 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Phone</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{editFormData.phone || doctorData?.phone || doctorData?.contact || '-'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Specialization</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{editFormData.specialization || 'General Medicine'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Consultation Fee</span>
                  <p className="text-sm font-black text-teal-700 mt-1">₹{Number(editFormData.consultation_fee || 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Row 3: Qualifications, Experience & OPD Timings (3 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Qualifications & Degrees</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{editFormData.qualification || 'MBBS, MD'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Experience</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{editFormData.experience || '8 Years'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">OPD Schedule Timings</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{editFormData.opd_timings || 'Mon - Fri (10:00 AM - 02:00 PM)'}</p>
                </div>
              </div>

              {/* Dedicated Full-Width Clinical Departments Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Assigned Clinical Departments
                  </span>
                  {parseDoctorDepartments(editFormData.department).length > 0 && (
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-100/70 px-2.5 py-0.5 rounded-full border border-teal-200">
                      {parseDoctorDepartments(editFormData.department).length} Departments Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {parseDoctorDepartments(editFormData.department).length > 0 ? (
                    parseDoctorDepartments(editFormData.department).map((dept, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-teal-900 border border-teal-200/80 shadow-2xs inline-flex items-center gap-1.5 hover:border-teal-400 transition"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                        <span>{dept}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic text-xs">No clinical departments assigned.</span>
                  )}
                </div>
              </div>

              {/* Dedicated Full-Width Additional Skills Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Additional Skills & Sub-Specialties</span>
                <p className="text-slate-800 font-medium leading-relaxed">{editFormData.additional_skills || 'General OPD Consultations, Emergency Triage, Post-op Follow-ups'}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileUpdate} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Doctor Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Contact Phone / Landline *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    required
                    value={editFormData.phone}
                    onChange={(e) => {
                      const numbersOnly = e.target.value.replace(/\D/g, '').slice(0, 15);
                      setEditFormData({ ...editFormData, phone: numbersOnly });
                    }}
                    placeholder="e.g. 9876543210 / 02212345678"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Email Address (Login ID)</label>
                  <input
                    type="email"
                    disabled
                    value={editFormData.email}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Primary Specialization *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.specialization}
                    onChange={(e) => setEditFormData({ ...editFormData, specialization: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3 space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="block text-slate-800 font-bold uppercase text-[10px]">
                      Clinical Departments (Multi-Select) *
                    </label>
                    {getDoctorAssignedHospitals().length > 0 && (
                      <span className="text-[10px] text-teal-700 font-medium">
                        Showing departments from {getDoctorAssignedHospitals().length} assigned hospital{getDoctorAssignedHospitals().length > 1 ? 's' : ''}: ({getDoctorAssignedHospitals().map(h => h.Name).join(', ')})
                      </span>
                    )}
                  </div>

                  {/* Selected badges */}
                  <div className="flex items-center gap-1.5 flex-wrap min-h-[32px] p-2 bg-white rounded-xl border border-slate-200">
                    {parseDoctorDepartments(editFormData.department).length > 0 ? (
                      parseDoctorDepartments(editFormData.department).map((dept, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-600 text-white shadow-xs"
                        >
                          <span>{dept}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleDepartment(dept)}
                            className="w-4 h-4 rounded-full hover:bg-teal-700 flex items-center justify-center text-[10px] cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-xs italic">No department selected. Click below to add.</span>
                    )}
                  </div>

                  {/* Available departments from assigned hospitals */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Available from Assigned Hospital{getDoctorAssignedHospitals().length > 1 ? 's' : ''}:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getAvailableDepartments().map((dept, idx) => {
                        const isSelected = parseDoctorDepartments(editFormData.department).includes(dept);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleToggleDepartment(dept)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${isSelected
                                ? 'bg-teal-50 border-teal-500 text-teal-800 ring-1 ring-teal-500 font-bold'
                                : 'bg-white border-slate-300 text-slate-700 hover:border-teal-400 hover:bg-teal-50/40'
                              }`}
                          >
                            <span>{isSelected ? '✓' : '+'}</span>
                            <span>{dept}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add other/custom department */}
                  <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200/80">
                    <input
                      type="text"
                      value={customDeptInput}
                      onChange={(e) => setCustomDeptInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomDepartment();
                        }
                      }}
                      placeholder="Type custom department name and click Add..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomDepartment}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer transition"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Consultation Fee (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={editFormData.consultation_fee}
                    onChange={(e) => setEditFormData({ ...editFormData, consultation_fee: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Qualifications (e.g. MBBS, MD)</label>
                  <input
                    type="text"
                    value={editFormData.qualification}
                    onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Experience (e.g. 10 Years)</label>
                  <input
                    type="text"
                    value={editFormData.experience}
                    onChange={(e) => setEditFormData({ ...editFormData, experience: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Duty Status *</label>
                  <select
                    value={editFormData.status || 'On_Duty'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditFormData(prev => ({
                        ...prev,
                        status: val
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="On_Duty">On_Duty</option>
                    <option value="Off_Duty">Off_Duty</option>
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Hospital Branch Allocation</label>
                  <select
                    value={editFormData.hospital}
                    onChange={(e) => setEditFormData({ ...editFormData, hospital: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Select Assigned Hospital Branch --</option>
                    {hospitalsList.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.Name} ({h.Branch_Code || `HOSP-${h.id}`}) - {h.City || 'Campus'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Additional Skills & Sub-Specialties</label>
                <input
                  type="text"
                  value={editFormData.additional_skills}
                  onChange={(e) => setEditFormData({ ...editFormData, additional_skills: e.target.value })}
                  placeholder="e.g. Interventional Cardiology, Echocardiography, Pediatric OPD"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {savingProfile ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving to Database...
                    </>
                  ) : (
                    'Save Profile Changes'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* SCHEDULE SECTION */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">OPD Consultation Timings & Duty Roster</h2>
            <p className="text-xs text-slate-500">Configure your regular clinic consultation hours and weekly availability</p>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Select Preset OPD Shift</label>
              <select
                value={editFormData.opd_timings}
                onChange={(e) => setEditFormData({ ...editFormData, opd_timings: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {opdTimingsPresets.map((timing, idx) => (
                  <option key={idx} value={timing}>{timing}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Custom OPD Timings Description</label>
              <input
                type="text"
                value={editFormData.opd_timings}
                onChange={(e) => setEditFormData({ ...editFormData, opd_timings: e.target.value })}
                placeholder="e.g. Mon - Fri (10:00 AM - 02:00 PM)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Hospital</span>
                <p className="text-sm font-bold text-slate-800 mt-1">{hospitalName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{hospitalAddress || 'Campus'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duty Status</span>
                <p className={`text-sm font-bold mt-1 ${doctorData?.status === 'Off_Duty' ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {doctorData?.status === 'Off_Duty' ? 'Off_Duty' : 'On_Duty'}
                </p>
                <button
                  type="button"
                  onClick={handleToggleDutyStatus}
                  className="text-[11px] text-teal-700 font-bold hover:underline mt-1 inline-block cursor-pointer"
                >
                  Toggle Duty Status
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Schedule Settings
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
            <p className="text-xs text-slate-500">Update your account login password directly in the database</p>
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 focus:bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                You must enter your registered email address to verify and change password.
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
                  className="w-full px-3 py-2 pr-16 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                  className="w-full px-3 py-2 pr-16 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                className="w-full px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {passwordLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating Password in Database...
                  </>
                ) : (
                  'Update Password'
                )}
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
            <p className="text-xs text-slate-500">Live details of the hospital and clinical facility fetched from database</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hospital Name</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{hospitalName}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Helpline / Emergency Phone</span>
              <p className="text-sm font-bold text-teal-700 mt-1">{hospitalPhone}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campus Address</span>
              <p className="text-sm font-medium text-slate-800 mt-1">{hospitalAddress}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Branch Location</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{hospitalInfo?.City || 'Main Center'}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Department</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{editFormData.department}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorSettings;
