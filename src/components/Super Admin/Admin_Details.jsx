import React, { useState, useEffect } from 'react';

const Admin_Details = ({ currentUser, selectedAdmin, setSelectedAdmin, setCurrentPage }) => {
  const [activeTab, setActiveTab] = useState('all');

  const [adminData, setAdminData] = useState(() => {
    if (selectedAdmin && selectedAdmin.id) return selectedAdmin;
    try {
      const saved = localStorage.getItem('selectedAdmin');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      id: 1,
      name: 'Administrator',
      employee_id: 'ADM-001',
      designation: 'Hospital Administrator',
      email: 'admin@hospital.com',
      contact: '+91 98765 43210',
      password: '••••••••',
      is_active: true
    };
  });

  const [hospitalData, setHospitalData] = useState(null);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isDataFetching, setIsDataFetching] = useState(false);

  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [receptionistsList, setReceptionistsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [patientsList, setPatientsList] = useState([]);

  const [doctorSearch, setDoctorSearch] = useState('');
  const [nurseSearch, setNurseSearch] = useState('');
  const [receptionistSearch, setReceptionistSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');

  const [visibleDoctorsCount, setVisibleDoctorsCount] = useState(10);
  const [visibleNursesCount, setVisibleNursesCount] = useState(10);
  const [visibleReceptionistsCount, setVisibleReceptionistsCount] = useState(10);
  const [visiblePatientsCount, setVisiblePatientsCount] = useState(10);
  const [visibleDeptsCount, setVisibleDeptsCount] = useState(10);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    contact: '',
    designation: 'Hospital Administrator',
    role: 'Hospital Admin',
    hospital: '',
    is_active: true
  });

  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;

    const loadAdminAndBranchData = async () => {
      setIsDataFetching(true);
      try {
        let currentAdmin = selectedAdmin || adminData;
        if (!currentAdmin || !currentAdmin.id) {
          const saved = localStorage.getItem('selectedAdmin');
          if (saved) {
            currentAdmin = JSON.parse(saved);
            if (isMounted) setAdminData(currentAdmin);
          }
        }

        const hospListRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/').catch(() => null);
        let allHospitals = [];
        if (hospListRes && hospListRes.ok) {
          allHospitals = await hospListRes.json();
          if (isMounted) setHospitalsList(allHospitals);
        }

        if (currentAdmin && currentAdmin.id && !String(currentAdmin.id).startsWith('hosp-')) {
          const adminRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${currentAdmin.id}/`).catch(() => null);
          if (adminRes && adminRes.ok) {
            const freshAdmin = await adminRes.json();
            currentAdmin = freshAdmin;
            if (isMounted) {
              setAdminData(freshAdmin);
              localStorage.setItem('selectedAdmin', JSON.stringify(freshAdmin));
            }
          }
        }

        const rawHospitalId = currentAdmin?.hospital;
        const targetHospitalId = typeof rawHospitalId === 'object' && rawHospitalId !== null
          ? rawHospitalId.id
          : rawHospitalId;

        if (targetHospitalId) {
          let targetHosp = allHospitals.find(h => Number(h.id) === Number(targetHospitalId));
          if (!targetHosp) {
            const hRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${targetHospitalId}/`).catch(() => null);
            if (hRes && hRes.ok) {
              targetHosp = await hRes.json();
            }
          }
          if (isMounted && targetHosp) setHospitalData(targetHosp);

          // Fetch Branch Doctors
          const docRes = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null);
          if (docRes && docRes.ok) {
            const allDocs = await docRes.json();
            const branchDocs = allDocs.filter(d => {
              if (Array.isArray(d.hospitals)) return d.hospitals.map(Number).includes(Number(targetHospitalId));
              return Number(d.hospital) === Number(targetHospitalId);
            });
            if (isMounted) setDoctorsList(branchDocs);
          }

          // Fetch Branch Nurses
          const nurRes = await fetch('http://127.0.0.1:8000/api/super-admin/Nurses/').catch(() => null);
          if (nurRes && nurRes.ok) {
            const allNurs = await nurRes.json();
            const branchNurs = allNurs.filter(n => Number(n.hospital) === Number(targetHospitalId));
            if (isMounted) setNursesList(branchNurs);
          }

          // Fetch Branch Receptionists
          const recRes = await fetch('http://127.0.0.1:8000/api/super-admin/Receptionists/').catch(() => null);
          if (recRes && recRes.ok) {
            const allRecs = await recRes.json();
            const branchRecs = allRecs.filter(r => Number(r.hospital) === Number(targetHospitalId));
            if (isMounted) setReceptionistsList(branchRecs);
          }

          // Fetch Branch Patients
          const patRes = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/').catch(() => null);
          if (patRes && patRes.ok) {
            const allPats = await patRes.json();
            const branchPats = allPats.filter(p => Number(p.hospital) === Number(targetHospitalId));
            if (isMounted) setPatientsList(branchPats);
          }

          // Parse Departments
          if (targetHosp && (targetHosp.departments || targetHosp.department)) {
            const rawDepts = targetHosp.departments || targetHosp.department;
            let deptsArray = [];
            if (Array.isArray(rawDepts)) {
              deptsArray = rawDepts.map((d, index) => ({
                id: index + 1,
                name: typeof d === 'string' ? d : (d.name || 'Department')
              }));
            } else if (typeof rawDepts === 'string') {
              deptsArray = rawDepts.split(',').map((d, index) => ({
                id: index + 1,
                name: d.trim()
              })).filter(d => d.name.length > 0);
            }
            if (isMounted) setDepartmentsList(deptsArray);
          }
        }
      } catch (error) {
        console.error('Error loading admin details from backend:', error);
      } finally {
        if (isMounted) setIsDataFetching(false);
      }
    };

    loadAdminAndBranchData();

    return () => {
      isMounted = false;
    };
  }, [selectedAdmin?.id]);

  const handleBackClick = () => {
    if (setCurrentPage) {
      setCurrentPage('super_admin_admins');
    }
  };

  const admin = adminData || selectedAdmin || {};
  const activeHospital = hospitalData;

  const filteredDoctors = doctorsList.filter(d =>
    (d.name || '').toLowerCase().includes(doctorSearch.toLowerCase()) ||
    (d.specialization || '').toLowerCase().includes(doctorSearch.toLowerCase()) ||
    (d.doctor_id || '').toLowerCase().includes(doctorSearch.toLowerCase())
  );

  const filteredNurses = nursesList.filter(n =>
    (n.name || '').toLowerCase().includes(nurseSearch.toLowerCase()) ||
    (n.role || '').toLowerCase().includes(nurseSearch.toLowerCase()) ||
    (n.nurse_id || '').toLowerCase().includes(nurseSearch.toLowerCase())
  );

  const filteredReceptionists = receptionistsList.filter(r =>
    (r.name || '').toLowerCase().includes(receptionistSearch.toLowerCase()) ||
    (r.role || '').toLowerCase().includes(receptionistSearch.toLowerCase()) ||
    (r.receptionist_id || '').toLowerCase().includes(receptionistSearch.toLowerCase())
  );

  const filteredPatients = patientsList.filter(p =>
    (p.name || '').toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.patient_id || '').toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.symptoms_diagnosis || '').toLowerCase().includes(patientSearch.toLowerCase())
  );

  const filteredDepts = departmentsList.filter(d =>
    (d.name || '').toLowerCase().includes(deptSearch.toLowerCase())
  );

  const handleToggleStatus = async () => {
    if (!admin || !admin.id || String(admin.id).startsWith('hosp-')) return;
    try {
      const nextStatus = !admin.is_active;
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${admin.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus })
      });

      if (response.ok) {
        const updated = { ...admin, is_active: nextStatus };
        setAdminData(updated);
        if (setSelectedAdmin) setSelectedAdmin(updated);
        localStorage.setItem('selectedAdmin', JSON.stringify(updated));
      } else {
        alert('Failed to update status.');
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
      alert('Error updating status.');
    }
  };

  const handleOpenEdit = () => {
    let hospId = '';
    if (admin.hospital) {
      hospId = typeof admin.hospital === 'object' ? admin.hospital.id : admin.hospital;
    } else if (activeHospital) {
      hospId = activeHospital.id;
    }

    setEditFormData({
      name: admin.name || '',
      email: (admin.email || '').toLowerCase(),
      contact: admin.contact || '',
      designation: admin.designation || 'Hospital Administrator',
      role: admin.role || 'Hospital Admin',
      hospital: hospId,
      is_active: admin.is_active !== false
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!admin || !admin.id) return;
    if (!editFormData.hospital) {
      alert('Please select an assigned hospital branch.');
      return;
    }

    try {
      const payload = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim().toLowerCase(),
        contact: editFormData.contact.trim(),
        designation: editFormData.designation || 'Hospital Administrator',
        role: editFormData.role || 'Hospital Admin',
        hospital: Number(editFormData.hospital),
        is_active: Boolean(editFormData.is_active)
      };

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${admin.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Hospital Administrator updated successfully.');
        setAdminData(data);
        if (setSelectedAdmin) setSelectedAdmin(data);
        localStorage.setItem('selectedAdmin', JSON.stringify(data));
        setIsEditModalOpen(false);
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      alert('Network error while updating administrator.');
    }
  };

  const handleOpenResetPassword = () => {
    setResetEmail((admin.email || '').toLowerCase());
    setNewPassword('');
    setShowNewPassword(false);
    setIsResetPasswordModalOpen(true);
  };

  const handleSaveResetPassword = async (e) => {
    e.preventDefault();
    const emailToReset = (resetEmail || '').trim().toLowerCase();
    const passwordToSet = newPassword.trim();

    if (!emailToReset) {
      alert('Please enter a valid email address.');
      return;
    }
    if (!passwordToSet || passwordToSet.length < 6) {
      alert('Please enter a secure password of at least 6 characters.');
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${admin.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToReset,
          password: passwordToSet
        })
      });

      if (response.ok) {
        const updatedAdmin = await response.json().catch(() => null);
        const freshAdmin = {
          ...admin,
          email: emailToReset,
          password: passwordToSet,
          ...(updatedAdmin || {})
        };
        setAdminData(freshAdmin);
        if (setSelectedAdmin) setSelectedAdmin(freshAdmin);
        localStorage.setItem('selectedAdmin', JSON.stringify(freshAdmin));

        setIsResetPasswordModalOpen(false);
        alert(`Password reset successfully for admin with email: ${emailToReset}`);
      } else {
        alert('Failed to reset password. Please verify the email ID or backend server connection.');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Network error while resetting password.');
    }
  };

  const handleDeleteAdmin = async () => {
    if (!admin || !admin.id || String(admin.id).startsWith('hosp-')) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${admin.id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('Administrator deleted successfully.');
        if (setSelectedAdmin) setSelectedAdmin(null);
        localStorage.removeItem('selectedAdmin');
        setIsDeleteModalOpen(false);
        handleBackClick();
      } else {
        alert('Failed to delete administrator.');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Network error while deleting administrator.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* TOP NAVIGATION & BACK BUTTON */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
        >
          &larr; Back to Admins
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Super Admin</span>
          <span>/</span>
          <span>Hospital Admins</span>
          <span>/</span>
          <span className="font-semibold text-slate-700 font-mono">
            {admin.employee_id || `ADM-${admin.id}`}
          </span>
        </div>
      </div>

      {/* HEADER HERO CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md shrink-0">
            {(admin.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                {admin.employee_id || `ADM-${admin.id}`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {admin.designation || 'Hospital Administrator'}
              </span>
              <button
                type="button"
                onClick={handleToggleStatus}
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                  admin.is_active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {admin.is_active !== false ? 'Active' : 'Inactive'}
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight mt-1">
              {admin.name || 'Administrator'}
            </h1>
            {admin.email && (
              <p className="mt-1">
                <a
                  href={`mailto:${admin.email.toLowerCase()}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                  title="Send email"
                >
                  {admin.email.toLowerCase()}
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenResetPassword}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
          >
            Reset Password
          </button>

          <button
            type="button"
            onClick={handleOpenEdit}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            Edit Admin
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      {/* ADMIN CREDENTIALS & ASSIGNED HOSPITAL PROFILE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Admin Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-slate-800">Admin Credentials & Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Email Address</span>
              {admin.email ? (
                <p className="font-semibold text-slate-800 mt-0.5 break-all">
                  <a href={`mailto:${admin.email.toLowerCase()}`} className="text-sky-700 hover:underline">
                    {admin.email.toLowerCase()}
                  </a>
                </p>
              ) : (
                <p className="font-semibold text-slate-400 mt-0.5">-</p>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Contact Phone</span>
              <p className="font-semibold text-slate-800 mt-0.5">{admin.contact || '-'}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Signin Password</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-sky-600 font-semibold hover:underline cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="font-mono font-semibold text-slate-800 mt-0.5 tracking-wider">
                {showPassword ? (admin.password || '••••••••') : '••••••••'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Assigned Hospital Branch */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Assigned Hospital Branch</h2>
            {activeHospital && activeHospital.Branch_Code && (
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                {activeHospital.Branch_Code}
              </span>
            )}
          </div>
          {activeHospital ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 text-sm">{activeHospital.Name}</p>
                <p className="text-slate-500 mt-0.5">{activeHospital.address || `${activeHospital.city || ''} ${activeHospital.area || ''}`}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Beds</span>
                  <p className="font-bold text-indigo-700 mt-0.5">{activeHospital.total_beds || 0} Beds</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">ICU Beds</span>
                  <p className="font-bold text-emerald-700 mt-0.5">{activeHospital.icu_beds || 0} Beds</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">No hospital branch assigned to this administrator.</p>
          )}
        </div>
      </div>

      {/* TOP SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch Doctors</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-teal-700 mt-1">{doctorsList.length}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Assigned specialists</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nursing Staff</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">{nursesList.length}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Clinical care staff</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receptionists</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-1">{receptionistsList.length}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Front desk team</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patients</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-700 mt-1">{patientsList.length}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Branch registrations</p>
        </div>
      </div>

      {/* TABS BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex flex-wrap items-center gap-1.5">
        {[
          { id: 'all', label: 'All Overview' },
          { id: 'doctors', label: `Doctors (${doctorsList.length})` },
          { id: 'nurses', label: `Nurses (${nursesList.length})` },
          { id: 'receptionists', label: `Receptionists (${receptionistsList.length})` },
          { id: 'patients', label: `Patients (${patientsList.length})` },
          { id: 'departments', label: `Departments (${departmentsList.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === tab.id ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'all' && activeHospital && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-800">Branch Infrastructure & Beds Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px]">Total Beds</span>
              <p className="text-lg font-bold text-slate-800">{activeHospital.total_beds || 0}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px]">ICU Beds</span>
              <p className="text-lg font-bold text-slate-800">{activeHospital.icu_beds || 0}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px]">NICU Beds</span>
              <p className="text-lg font-bold text-slate-800">{activeHospital.nicu_beds || 0}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px]">Operation Theatres</span>
              <p className="text-lg font-bold text-slate-800">{activeHospital.operation_theatres || 0}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px]">Ambulances</span>
              <p className="text-lg font-bold text-slate-800">{activeHospital.ambulances_count || 0}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'doctors' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-slate-800">Branch Doctors List ({filteredDoctors.length})</h2>
            <input
              type="text"
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
              placeholder="Filter doctors..."
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>
          {filteredDoctors.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No doctors found.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDoctors.slice(0, visibleDoctorsCount).map((doc) => (
                  <div key={doc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <h3 className="font-bold text-slate-800 text-sm">{doc.name}</h3>
                    <p className="text-teal-700 font-semibold">{doc.specialization || doc.specialty || 'General'}</p>
                    <p className="text-slate-500">ID: {doc.doctor_id || `DOC-${doc.id}`}</p>
                    <p className="text-slate-500">Contact: {doc.phone || '-'}</p>
                    {doc.email && (
                      <p className="text-[11px]">
                        <a href={`mailto:${doc.email.toLowerCase()}`} className="text-sky-700 hover:underline">
                          {doc.email.toLowerCase()}
                        </a>
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {visibleDoctorsCount < filteredDoctors.length && (
                <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-3 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setVisibleDoctorsCount((prev) => prev + 10)}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
                  >
                    Show More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'nurses' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-slate-800">Branch Nursing Staff ({filteredNurses.length})</h2>
            <input
              type="text"
              value={nurseSearch}
              onChange={(e) => setNurseSearch(e.target.value)}
              placeholder="Filter nurses..."
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>
          {filteredNurses.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No nurses found.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredNurses.slice(0, visibleNursesCount).map((nurse) => (
                  <div key={nurse.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <h3 className="font-bold text-slate-800 text-sm">{nurse.name}</h3>
                    <p className="text-emerald-700 font-semibold">{nurse.role === 'Head Nurse' ? 'Head Nurse' : 'Staff Nurse'} - Ward: {nurse.ward || 'General'}</p>
                    <p className="text-slate-500">ID: {nurse.nurse_id || `NUR-${nurse.id}`}</p>
                    <p className="text-slate-500">Shift: {nurse.shift || 'Morning'}</p>
                  </div>
                ))}
              </div>
              {visibleNursesCount < filteredNurses.length && (
                <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-3 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setVisibleNursesCount((prev) => prev + 10)}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
                  >
                    Show More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'receptionists' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-slate-800">Branch Receptionists ({filteredReceptionists.length})</h2>
            <input
              type="text"
              value={receptionistSearch}
              onChange={(e) => setReceptionistSearch(e.target.value)}
              placeholder="Filter receptionists..."
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>
          {filteredReceptionists.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No receptionists found.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredReceptionists.slice(0, visibleReceptionistsCount).map((rec) => (
                  <div key={rec.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <h3 className="font-bold text-slate-800 text-sm">{rec.name}</h3>
                    <p className="text-amber-700 font-semibold">{rec.role || 'Front Desk'}</p>
                    <p className="text-slate-500">ID: {rec.receptionist_id || `REC-${rec.id}`}</p>
                    <p className="text-slate-500">Shift: {rec.shift || 'Morning Shift'}</p>
                  </div>
                ))}
              </div>
              {visibleReceptionistsCount < filteredReceptionists.length && (
                <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-3 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setVisibleReceptionistsCount((prev) => prev + 10)}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
                  >
                    Show More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-slate-800">Branch Patient Registry ({filteredPatients.length})</h2>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Filter patients..."
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>
          {filteredPatients.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No patients registered.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPatients.slice(0, visiblePatientsCount).map((pat) => (
                  <div key={pat.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm break-words break-all">{pat.name}</h3>
                    <p className="text-indigo-700 font-semibold break-words break-all">{pat.symptoms_diagnosis || 'General Visit'}</p>
                    <p className="text-slate-500 break-all">ID: {pat.patient_id || pat.uhid || `PAT-${pat.id}`}</p>
                    <p className="text-slate-500">Paid: ₹{pat.amount_paid || 0}</p>
                  </div>
                ))}
              </div>
              {visiblePatientsCount < filteredPatients.length && (
                <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-3 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setVisiblePatientsCount((prev) => prev + 10)}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
                  >
                    Show More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-slate-800">Branch Clinical Departments ({filteredDepts.length})</h2>
            <input
              type="text"
              value={deptSearch}
              onChange={(e) => setDeptSearch(e.target.value)}
              placeholder="Filter departments..."
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>
          {filteredDepts.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No departments configured.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {filteredDepts.slice(0, visibleDeptsCount).map((dept) => (
                  <div key={dept.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <h3 className="font-bold text-slate-800 text-sm">{dept.name}</h3>
                    <p className="text-xs text-indigo-700 font-semibold">Active Department</p>
                  </div>
                ))}
              </div>
              {visibleDeptsCount < filteredDepts.length && (
                <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-3 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setVisibleDeptsCount((prev) => prev + 10)}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
                  >
                    Show More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Edit Admin Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Edit Administrator Details</h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assigned Hospital Branch: *</label>
                <select
                  required
                  value={editFormData.hospital}
                  onChange={(e) => setEditFormData({ ...editFormData, hospital: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                >
                  <option value="">-- Select Hospital Branch * --</option>
                  {hospitalsList.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.Name} ({h.city}) - {h.Branch_Code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name: *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email: *</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white lowercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone: *</label>
                <input
                  type="tel"
                  required
                  value={editFormData.contact}
                  onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Designation:</label>
                <input
                  type="text"
                  value={editFormData.designation}
                  onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="admin_status_edit"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                />
                <label htmlFor="admin_status_edit" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Active Administrator
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Reset Administrator Password</h2>
              <button
                type="button"
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Admin Email *</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 lowercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">New Secure Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-3 pr-16 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-semibold text-[11px] cursor-pointer"
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <h2 className="text-base font-bold text-slate-800">Delete Administrator?</h2>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete administrator <span className="font-bold text-slate-800">{admin.name}</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAdmin}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin_Details;