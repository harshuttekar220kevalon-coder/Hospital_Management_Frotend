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
    hospital: '',
    is_active: true
  });

  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // Optimized useEffect with safe dependency
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

        if (currentAdmin && currentAdmin.id) {
          const adminRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${currentAdmin.id}/`).catch(() => null);
          if (adminRes && adminRes.ok) {
            const freshAdmin = await adminRes.json();
            currentAdmin = freshAdmin;
            if (isMounted) {
              setAdminData(freshAdmin);
              localStorage.setItem('selectedAdmin', JSON.stringify(freshAdmin));
            }
          }

          const rawHospitalId = currentAdmin.hospital;
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
  }, [selectedAdmin?.id]); // Only run when selectedAdmin ID changes

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

  const handleOpenEdit = () => {
    setEditFormData({
      name: admin.name || '',
      email: admin.email || '',
      contact: admin.contact || '',
      password: admin.password || '',
      designation: admin.designation || 'Hospital Administrator',
      hospital: typeof admin.hospital === 'object' && admin.hospital !== null ? admin.hospital.id : (admin.hospital || ''),
      is_active: admin.is_active !== false
    });
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!admin || !admin.id) return;
    try {
      const payload = {
        name: editFormData.name,
        email: editFormData.email,
        contact: editFormData.contact,
        designation: editFormData.designation,
        hospital: editFormData.hospital ? Number(editFormData.hospital) : null,
        is_active: editFormData.is_active
      };

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${admin.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updated = await response.json();
        setAdminData(updated);
        if (setSelectedAdmin) setSelectedAdmin(updated);
        localStorage.setItem('selectedAdmin', JSON.stringify(updated));
        setIsEditModalOpen(false);
        alert('Administrator details updated successfully.');
        window.location.reload();
      } else {
        const err = await response.json().catch(() => ({}));
        alert('Failed to update administrator: ' + JSON.stringify(err));
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      alert('Network error while updating administrator.');
    }
  };

  const handleOpenResetPassword = () => {
    setResetEmail('');
    setNewPassword('');
    setShowNewPassword(false);
    setIsResetPasswordModalOpen(true);
  };

  const handleSaveResetPassword = async (e) => {
    e.preventDefault();
    const emailToReset = resetEmail.trim();
    const passwordToSet = newPassword.trim();

    if (!emailToReset) {
      alert('Please enter the administrator email ID.');
      return;
    }
    if (!passwordToSet) {
      alert('Please enter a new password.');
      return;
    }

    try {
      let isSuccess = false;
      let updatedAdmin = null;

      // 1. Try email-based reset password endpoint
      let response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/reset_password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToReset, new_password: passwordToSet, password: passwordToSet })
      }).catch(() => null);

      if (response && response.ok) {
        isSuccess = true;
        try {
          updatedAdmin = await response.json();
        } catch {
          // ignore
        }
      } else {
        // 2. Direct PATCH endpoint using admin ID
        const targetId = admin?.id;
        if (targetId) {
          response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${targetId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailToReset, password: passwordToSet })
          }).catch(() => null);

          if (response && response.ok) {
            isSuccess = true;
            try {
              updatedAdmin = await response.json();
            } catch {
              // ignore
            }
          }
        }
      }

      if (isSuccess) {
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
    if (!admin || !admin.id) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${admin.id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('Administrator deleted successfully.');
        if (setSelectedAdmin) setSelectedAdmin(null);
        localStorage.removeItem('selectedAdmin');
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
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                admin.is_active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {admin.is_active !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight mt-1">
              {admin.name || 'Administrator'}
            </h1>
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
          <h2 className="text-base font-bold text-slate-800">Branch Doctors List ({filteredDoctors.length})</h2>
          {filteredDoctors.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No doctors found.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDoctors.slice(0, visibleDoctorsCount).map((doc) => (
                  <div key={doc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <h3 className="font-bold text-slate-800 text-sm">{doc.name}</h3>
                    <p className="text-teal-700 font-semibold">{doc.specialization}</p>
                    <p className="text-slate-500">ID: {doc.doctor_id}</p>
                    <p className="text-slate-500">Contact: {doc.phone}</p>
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
          <h2 className="text-base font-bold text-slate-800">Branch Nursing Staff ({filteredNurses.length})</h2>
          {filteredNurses.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No nurses found.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredNurses.slice(0, visibleNursesCount).map((nurse) => (
                  <div key={nurse.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <h3 className="font-bold text-slate-800 text-sm">{nurse.name}</h3>
                    <p className="text-emerald-700 font-semibold">{nurse.role} - Ward: {nurse.ward}</p>
                    <p className="text-slate-500">ID: {nurse.nurse_id}</p>
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
          <h2 className="text-base font-bold text-slate-800">Branch Receptionists ({filteredReceptionists.length})</h2>
          {filteredReceptionists.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No receptionists found.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredReceptionists.slice(0, visibleReceptionistsCount).map((rec) => (
                  <div key={rec.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <h3 className="font-bold text-slate-800 text-sm">{rec.name}</h3>
                    <p className="text-amber-700 font-semibold">{rec.role}</p>
                    <p className="text-slate-500">ID: {rec.receptionist_id}</p>
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
          <h2 className="text-base font-bold text-slate-800">Branch Patient Registry ({filteredPatients.length})</h2>
          {filteredPatients.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No patients registered.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPatients.slice(0, visiblePatientsCount).map((pat) => (
                  <div key={pat.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <h3 className="font-bold text-slate-800 text-sm">{pat.name}</h3>
                    <p className="text-indigo-700 font-semibold">{pat.symptoms_diagnosis || 'General Visit'}</p>
                    <p className="text-slate-500">ID: {pat.patient_id}</p>
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
          <h2 className="text-base font-bold text-slate-800">Branch Clinical Departments ({filteredDepts.length})</h2>
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
              <div>
                <h2 className="text-base font-bold text-slate-800">Edit Administrator Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">Update profile, contact, and hospital branch assignment.</p>
              </div>
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
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="admin@hospital.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone (Numbers only) *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  required
                  value={editFormData.contact}
                  onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value.replace(/\D/g, '') })}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              {/* Password Field (Read-Only / Backend Synced) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase">
                    Admin Signin Password
                  </label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Read-Only (Non-editable)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    readOnly
                    value={editFormData.password || admin.password || '••••••••'}
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 font-mono cursor-not-allowed select-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    title={showEditPassword ? 'Hide password' : 'Show password'}
                  >
                    {showEditPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Password cannot be changed here. Use the 'Reset Password' button to change.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Designation</label>
                <input
                  type="text"
                  value={editFormData.designation}
                  onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Hospital Branch</label>
                <select
                  value={editFormData.hospital}
                  onChange={(e) => setEditFormData({ ...editFormData, hospital: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                >
                  <option value="">Select Hospital Branch *</option>
                  {hospitalsList.map((h) => (
                    <option key={h.id} value={h.id}>{h.Name} ({h.city}) - {h.Branch_Code}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="adminActiveEditModal"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                />
                <label htmlFor="adminActiveEditModal" className="font-semibold text-slate-700 cursor-pointer">
                  Active Status
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md cursor-pointer"
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
              <div>
                <h2 className="text-base font-bold text-slate-800">Reset Administrator Password</h2>
                <p className="text-xs text-slate-500 mt-0.5">Identify administrator by Email ID to reset login credentials.</p>
              </div>
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
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Administrator Email ID *
                </label>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter administrator email address"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  The account associated with this email address will be updated with the new password.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-center">
            <h3 className="text-base font-bold text-slate-800">Delete Administrator?</h3>
            <p className="text-xs text-slate-500">Are you sure you want to delete this administrator?</p>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs">Cancel</button>
              <button onClick={handleDeleteAdmin} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin_Details;