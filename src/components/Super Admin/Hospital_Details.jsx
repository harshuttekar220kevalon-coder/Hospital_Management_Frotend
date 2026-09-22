import React, { useState, useEffect } from 'react';

const Hospital_Details = ({ currentUser, selectedHospital, setSelectedHospital, setCurrentPage }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [hospitalData, setHospitalData] = useState(selectedHospital);
  const [loading, setLoading] = useState(!selectedHospital);

  const [hospitalAdminInfo, setHospitalAdminInfo] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // Branch-specific Related Lists
  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [receptionistsList, setReceptionistsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [subLoading, setSubLoading] = useState(false);

  const [isAdminCreateModalOpen, setIsAdminCreateModalOpen] = useState(false);
  const [isEditHospitalModalOpen, setIsEditHospitalModalOpen] = useState(false);
  const [isDeleteHospitalModalOpen, setIsDeleteHospitalModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [adminFormData, setAdminFormData] = useState({
    name: '',
    designation: 'Hospital Administrator',
    email: '',
    contact: '',
    password: '',
    is_active: true
  });

  const [editHospitalFormData, setEditHospitalFormData] = useState({
    Name: '',
    Branch_Code: '',
    city: '',
    area: '',
    address: '',
    contact: '',
    email: '',
    total_beds: 100,
    icu_beds: 10,
    nicu_beds: 5,
    operation_theatres: 4,
    restroom_for_relatives: 3,
    ambulances_count: 2,
    departments: '',
    is_active: true
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  useEffect(() => {
    const fetchHospitalDetailsAndRelatedData = async () => {
      if (selectedHospital && selectedHospital.id) {
        try {
          setLoading(true);
          // 1. Fetch Specific Hospital Details
          const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${selectedHospital.id}/`);
          let hospData = null;
          if (hospRes.ok) {
            hospData = await hospRes.json();
            setHospitalData(hospData);
          }

          setAdminLoading(true);
          setSubLoading(true);

          // 2. Fetch Assigned Hospital Admin
          const adminRes = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/').catch(() => null);
          if (adminRes && adminRes.ok) {
            const adminsList = await adminRes.json();
            const matchedAdmin = adminsList.find(a => Number(a.hospital) === Number(selectedHospital.id));
            setHospitalAdminInfo(matchedAdmin || null);
          }

          // 3. Fetch Doctors assigned to this hospital
          const docRes = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null);
          if (docRes && docRes.ok) {
            const allDocs = await docRes.json();
            const branchDocs = allDocs.filter(d => {
              if (Array.isArray(d.hospitals)) {
                return d.hospitals.includes(Number(selectedHospital.id));
              }
              return Number(d.hospital) === Number(selectedHospital.id);
            });
            setDoctorsList(branchDocs);
          }

          // 4. Fetch Nurses for this Hospital Branch
          const nurRes = await fetch('http://127.0.0.1:8000/api/super-admin/Nurses/').catch(() => null);
          if (nurRes && nurRes.ok) {
            const allNurs = await nurRes.json();
            const branchNurs = allNurs.filter(n => Number(n.hospital) === Number(selectedHospital.id));
            setNursesList(branchNurs);
          }

          // 5. Fetch Receptionists for this Hospital Branch
          const recRes = await fetch('http://127.0.0.1:8000/api/super-admin/Receptionists/').catch(() => null);
          if (recRes && recRes.ok) {
            const allRecs = await recRes.json();
            const branchRecs = allRecs.filter(r => Number(r.hospital) === Number(selectedHospital.id));
            setReceptionistsList(branchRecs);
          }

// 6. Parse Departments safely (handles string, array, or null)
          const currentHosp = hospData || selectedHospital;
          if (currentHosp && (currentHosp.departments || currentHosp.department)) {
            const rawDepts = currentHosp.departments || currentHosp.department;
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
            
            setDepartmentsList(deptsArray);
          } else {
            setDepartmentsList([]);
          }

          // 7. Fetch Patients for this Hospital Branch
          const patRes = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/').catch(() => null);
          if (patRes && patRes.ok) {
            const allPats = await patRes.json();
            const branchPats = allPats.filter(p => Number(p.hospital) === Number(selectedHospital.id));
            setPatientsList(branchPats);
          }

        } catch (error) {
          console.error('Error fetching branch details:', error);
        } finally {
          setLoading(false);
          setAdminLoading(false);
          setSubLoading(false);
        }
      }
    };

    fetchHospitalDetailsAndRelatedData();
  }, [selectedHospital]);

  const defaultHospitalData = {
    id: 1,
    Name: 'Apex Care Hospital',
    Branch_Code: 'APEX-01',
    city: 'Mumbai',
    area: 'Bandra West',
    address: 'Plot 42, Health Avenue, Bandra West, Mumbai, Maharashtra - 400050',
    contact: '+91 98765 43210',
    email: 'info@hospital.com',
    total_beds: 100,
    icu_beds: 10,
    nicu_beds: 5,
    operation_theatres: 4,
    restroom_for_relatives: 3,
    ambulances_count: 2,
    departments: 'Cardiology, Neurology, Orthopedics',
    is_active: true
  };

  const activeBranch = hospitalData || defaultHospitalData;

  // Live Calculations for Hospital Live Status
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayPatientsCount = patientsList.filter(p => (p.applied_at || p.created_at || '').includes(todayDateStr)).length;
  const workingDoctorsCount = doctorsList.filter(d => d.is_active !== false).length;
  const onLeaveDoctorsCount = doctorsList.length - workingDoctorsCount;
  const onDutyNursesCount = nursesList.filter(n => n.is_active !== false).length;
  const activeReceptionistsCount = receptionistsList.filter(r => r.is_active !== false).length;

  const handleOpenAdminCreate = () => {
    setAdminFormData({
      name: '',
      designation: 'Hospital Administrator',
      email: '',
      contact: '',
      password: '',
      is_active: true
    });
    setShowPassword(false);
    setIsAdminCreateModalOpen(true);
  };

  const handleSaveAdminCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...adminFormData,
        hospital: activeBranch.id
      };

      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Hospital Administrator created and assigned successfully.');
        setHospitalAdminInfo(data);
        setIsAdminCreateModalOpen(false);
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      alert('Network error while creating administrator.');
    }
  };

  const handleOpenEditHospital = () => {
    setEditHospitalFormData({
      Name: activeBranch.Name || '',
      Branch_Code: activeBranch.Branch_Code || '',
      city: activeBranch.city || '',
      area: activeBranch.area || '',
      address: activeBranch.address || '',
      contact: activeBranch.contact || '',
      email: activeBranch.email || '',
      total_beds: activeBranch.total_beds || 100,
      icu_beds: activeBranch.icu_beds || 10,
      nicu_beds: activeBranch.nicu_beds || 5,
      operation_theatres: activeBranch.operation_theatres || 4,
      restroom_for_relatives: activeBranch.restroom_for_relatives || 3,
      ambulances_count: activeBranch.ambulances_count || 2,
      departments: typeof activeBranch.departments === 'string'
        ? activeBranch.departments
        : (Array.isArray(activeBranch.departments)
            ? activeBranch.departments.map(d => typeof d === 'string' ? d : (d.name || '')).join(', ')
            : ''),
      is_active: activeBranch.is_active !== false
    });
    setIsEditHospitalModalOpen(true);
  };

  const handleSaveEditHospital = async (e) => {
    e.preventDefault();
    if (!activeBranch || !activeBranch.id) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${activeBranch.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editHospitalFormData)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Hospital branch updated successfully!');
        setHospitalData(data);
        if (setSelectedHospital) setSelectedHospital(data);
        localStorage.setItem('selectedHospital', JSON.stringify(data));
        setIsEditHospitalModalOpen(false);
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error updating hospital:', error);
      alert('Network error while updating hospital.');
    }
  };

  const handleDeleteHospital = async () => {
    if (!activeBranch || !activeBranch.id) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${activeBranch.id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('Hospital branch deleted successfully.');
        if (setSelectedHospital) setSelectedHospital(null);
        localStorage.removeItem('selectedHospital');
        setIsDeleteHospitalModalOpen(false);
        handleBackClick();
      } else {
        alert('Failed to delete hospital.');
      }
    } catch (error) {
      console.error('Error deleting hospital:', error);
      alert('Network error while deleting hospital.');
    }
  };

  const [doctorSearch, setDoctorSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');

  const filteredDoctors = doctorsList.filter(doc => {
    return (doc.name || '').toLowerCase().includes(doctorSearch.toLowerCase()) ||
      (doc.specialization || '').toLowerCase().includes(doctorSearch.toLowerCase());
  });

  const filteredNurses = nursesList;
  const filteredReceptionists = receptionistsList;
  const filteredPatients = patientsList.filter(pat => {
    return (pat.name || '').toLowerCase().includes(patientSearch.toLowerCase()) ||
      (pat.patient_id || pat.uhid || '').toLowerCase().includes(patientSearch.toLowerCase());
  });

  const filteredDepts = departmentsList.filter(dept => {
    return (dept.name || '').toLowerCase().includes(deptSearch.toLowerCase());
  });

  const handleBackClick = () => {
    if (setCurrentPage) {
      const r = (currentUser?.role || '').toString().toUpperCase();
      if (r.includes('SUPER')) setCurrentPage('super_admin_hospitals');
      else setCurrentPage('admin_dashboard');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-sm font-semibold text-slate-500">Loading branch profile from backend...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-5">
      {/* Top Header Bar with Back & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={handleBackClick}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          &larr; Back to Hospitals List
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenEditHospital}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Hospital
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteHospitalModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Hospital
          </button>
        </div>
      </div>

      {/* Top Cards: Hospital Info & Assigned Admin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Hospital Branch Profile
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                activeBranch.is_active !== false
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {activeBranch.is_active !== false ? 'Operational' : 'Inactive'}
              </span>
              {activeBranch.Branch_Code && (
                <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[10px]">
                  {activeBranch.Branch_Code}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mt-2">
              {activeBranch.Name || 'Hospital Details'}
            </h1>

            <p className="text-xs text-slate-600 mt-1">
              {activeBranch.address || (activeBranch.city ? `${activeBranch.city}, ${activeBranch.area || ''}` : 'Address not specified')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-600">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">City / Location</p>
              <p className="font-semibold text-slate-800 mt-0.5">{activeBranch.city || '-'} {activeBranch.area ? `(${activeBranch.area})` : ''}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Contact Number</p>
              <p className="font-semibold text-slate-800 mt-0.5">{activeBranch.contact || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Official Email</p>
              <p className="font-semibold text-blue-700 mt-0.5 truncate">{activeBranch.email || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Beds</p>
              <p className="font-semibold text-slate-800 mt-0.5">{activeBranch.total_beds || 100} Beds</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  Assigned Administrator
                </span>
                {hospitalAdminInfo && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    hospitalAdminInfo.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {hospitalAdminInfo.is_active ? 'Active' : 'Deactivated'}
                  </span>
                )}
              </div>
              
              {!hospitalAdminInfo && (
                <button
                  type="button"
                  onClick={handleOpenAdminCreate}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  + Create Admin
                </button>
              )}
            </div>

            {adminLoading ? (
              <p className="text-xs text-slate-400 mt-4">Loading assigned admin...</p>
            ) : hospitalAdminInfo ? (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                    {hospitalAdminInfo.name}
                  </h2>
                  <span className="font-mono text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {hospitalAdminInfo.employee_id || 'ADM'}
                  </span>
                </div>
                <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                  {hospitalAdminInfo.designation}
                </p>
              </div>
            ) : (
              <div className="mt-4 p-4 text-center bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-600">No Administrator assigned to this branch yet.</p>
              </div>
            )}
          </div>

          {hospitalAdminInfo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-600">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Admin Contact</p>
                <p className="font-semibold text-slate-800 mt-0.5">{hospitalAdminInfo.contact || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Admin Email</p>
                <p className="font-semibold text-slate-800 mt-0.5 truncate">{hospitalAdminInfo.email || '-'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex flex-wrap items-center gap-1.5">
        {[
          { id: 'all', label: 'All Overview' },
          { id: 'departments', label: `Departments (${departmentsList.length})` },
          { id: 'doctors', label: `Doctors (${doctorsList.length})` },
          { id: 'nurses', label: `Nurses (${nursesList.length})` },
          { id: 'receptionists', label: `Receptionists (${receptionistsList.length})` },
          { id: 'patients', label: `Patients (${patientsList.length})` },
          { id: 'status', label: 'Hospital Live Status' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ALL OVERVIEW */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-800">Branch Infrastructure & Beds Breakdown</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Total Beds</span>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{activeBranch.total_beds || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">ICU Beds</span>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{activeBranch.icu_beds || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">NICU / General Beds</span>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{activeBranch.nicu_beds || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Operation Theatres</span>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{activeBranch.operation_theatres || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Relatives Restrooms</span>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{activeBranch.restroom_for_relatives || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENTS */}
      {(activeTab === 'all' || activeTab === 'departments') && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Hospital Departments Available ({filteredDepts.length})</h2>
          </div>
          {filteredDepts.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No departments specified for this branch.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredDepts.map((dept, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm">{dept.name}</h3>
                  <p className="text-[11px] text-teal-700 font-semibold">Active Clinical Department</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DOCTORS */}
      {(activeTab === 'all' || activeTab === 'doctors') && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Assigned Doctors & Specialists ({filteredDoctors.length})</h2>
            <input
              type="text"
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
              placeholder="Filter doctors..."
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:border-blue-600"
            />
          </div>
          {subLoading ? (
            <p className="text-xs text-slate-400">Loading doctors...</p>
          ) : filteredDoctors.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No doctors assigned to this branch.</p>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Doctor Name & ID</th>
                    <th className="py-3 px-3">Specialization</th>
                    <th className="py-3 px-3">OPD Timings</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDoctors.map((doc, idx) => (
                    <tr key={doc.id || idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{doc.name}</p>
                        <span className="font-mono text-[10px] text-teal-700">{doc.doctor_id || 'DOC'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {doc.specialization}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{doc.opd_timings || 'Mon-Fri'}</td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-700">{doc.phone}</p>
                        <p className="text-[10px] text-slate-400">{doc.email}</p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          doc.is_active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {doc.is_active !== false ? 'Working (Available)' : 'On Leave'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: NURSES */}
      {(activeTab === 'all' || activeTab === 'nurses') && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-800">Assigned Nursing Staff ({filteredNurses.length})</h2>
          {subLoading ? (
            <p className="text-xs text-slate-400">Loading nurses...</p>
          ) : filteredNurses.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No nurses assigned to this branch.</p>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Nurse Name & ID</th>
                    <th className="py-3 px-3">Role & Ward</th>
                    <th className="py-3 px-3">Shift</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNurses.map((nur, idx) => (
                    <tr key={nur.id || idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{nur.name}</p>
                        <span className="font-mono text-[10px] text-indigo-700">{nur.nurse_id || 'NUR'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          {nur.role}
                        </span>
                        <p className="font-semibold text-slate-800 mt-0.5">Ward: {nur.ward}</p>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{nur.shift}</td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-700">{nur.contact}</p>
                        <p className="text-[10px] text-slate-400">{nur.email}</p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          nur.is_active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {nur.is_active !== false ? 'On Duty' : 'On Leave'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: RECEPTIONISTS */}
      {(activeTab === 'all' || activeTab === 'receptionists') && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-800">Front Desk & Receptionists ({filteredReceptionists.length})</h2>
          {subLoading ? (
            <p className="text-xs text-slate-400">Loading receptionists...</p>
          ) : filteredReceptionists.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No receptionists assigned to this branch.</p>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Name & ID</th>
                    <th className="py-3 px-3">Role & Shift</th>
                    <th className="py-3 px-3">Languages</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceptionists.map((rec, idx) => (
                    <tr key={rec.id || idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{rec.name}</p>
                        <span className="font-mono text-[10px] text-amber-800">{rec.receptionist_id || 'REC'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{rec.role}</p>
                        <p className="text-[10px] text-teal-800">{rec.shift}</p>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{rec.languages}</td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-700">{rec.contact}</p>
                        <p className="text-[10px] text-slate-400">{rec.email}</p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          rec.is_active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {rec.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: PATIENTS */}
      {(activeTab === 'all' || activeTab === 'patients') && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Branch Patients & Visits ({filteredPatients.length})</h2>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search patients..."
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:border-blue-600"
            />
          </div>
          {filteredPatients.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No patient records registered for this branch.</p>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Patient Name & UHID</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((pat, idx) => (
                    <tr key={pat.id || idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{pat.name}</p>
                        <span className="font-mono text-[10px] text-sky-800">{pat.patient_id || pat.uhid || 'PAT'}</span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{pat.contact || pat.phone}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 inline-block">
                          {pat.status || 'Confirmed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: HOSPITAL LIVE STATUS ANALYTICS */}
      {(activeTab === 'all' || activeTab === 'status') && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-800">Hospital Live Operational Status Dashboard</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <p className="font-bold text-emerald-900 uppercase text-[10px]">Doctors Working Today</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{workingDoctorsCount} Working</h3>
              <p className="text-[11px] text-emerald-600 mt-0.5">{onLeaveDoctorsCount} On Leave / Inactive</p>
            </div>

            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs">
              <p className="font-bold text-teal-900 uppercase text-[10px]">Active Nursing Staff</p>
              <h3 className="text-2xl font-bold text-teal-700 mt-1">{onDutyNursesCount} On Duty</h3>
              <p className="text-[11px] text-teal-600 mt-0.5">Deployed across wards</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs">
              <p className="font-bold text-amber-900 uppercase text-[10px]">Front Desk Receptionists</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">{activeReceptionistsCount} Active</h3>
              <p className="text-[11px] text-amber-600 mt-0.5">Operating counters</p>
            </div>

            <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs">
              <p className="font-bold text-sky-900 uppercase text-[10px]">Patient Visits Today</p>
              <h3 className="text-2xl font-bold text-sky-800 mt-1">{patientsList.length} Total Visits</h3>
              <p className="text-[11px] text-sky-700 mt-0.5">{todayPatientsCount} registered today</p>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ADMIN MODAL */}
      {isAdminCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Create & Assign Administrator</h2>
              <button
                type="button"
                onClick={() => setIsAdminCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAdminCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={adminFormData.name}
                  onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                  placeholder="e.g. Vikram Malhotra"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={adminFormData.email}
                  onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                  placeholder="admin@hospital.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={adminFormData.contact}
                    onChange={(e) => setAdminFormData({ ...adminFormData, contact: e.target.value })}
                    placeholder="+91..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Signin Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={adminFormData.password}
                      onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                      placeholder="Enter password"
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Designation</label>
                <input
                  type="text"
                  value={adminFormData.designation}
                  onChange={(e) => setAdminFormData({ ...adminFormData, designation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="adminActiveCreate"
                  checked={adminFormData.is_active}
                  onChange={(e) => setAdminFormData({ ...adminFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <label htmlFor="adminActiveCreate" className="font-semibold text-slate-700 cursor-pointer">
                  Activate Administrator Account Immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdminCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Save Administrator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT HOSPITAL MODAL */}
      {isEditHospitalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Edit Hospital Branch Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">Modify branch infrastructure, location, and contact parameters.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditHospitalModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEditHospital} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Name *</label>
                  <input
                    type="text"
                    required
                    value={editHospitalFormData.Name}
                    onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, Name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Branch Code *</label>
                  <input
                    type="text"
                    required
                    value={editHospitalFormData.Branch_Code}
                    onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, Branch_Code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={editHospitalFormData.city}
                    onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Area / Locality *</label>
                  <input
                    type="text"
                    required
                    value={editHospitalFormData.area}
                    onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, area: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Address *</label>
                <textarea
                  rows="2"
                  required
                  value={editHospitalFormData.address}
                  onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={editHospitalFormData.contact}
                    onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, contact: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={editHospitalFormData.email}
                    onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Total Beds</label>
                  <input
                    type="number"
                    value={editHospitalFormData.total_beds}
                    onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, total_beds: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">ICU Beds</label>
                  <input
                    type="number"
                    value={editHospitalFormData.icu_beds}
                    onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, icu_beds: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">NICU Beds</label>
                  <input
                    type="number"
                    value={editHospitalFormData.nicu_beds}
                    onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, nicu_beds: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Operation Theatres</label>
                  <input
                    type="number"
                    value={editHospitalFormData.operation_theatres}
                    onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, operation_theatres: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Restrooms (Relatives)</label>
                  <input
                    type="number"
                    value={editHospitalFormData.restroom_for_relatives}
                    onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, restroom_for_relatives: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Ambulances</label>
                  <input
                    type="number"
                    value={editHospitalFormData.ambulances_count}
                    onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, ambulances_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Clinical Departments (Comma Separated)</label>
                <input
                  type="text"
                  value={editHospitalFormData.departments}
                  onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, departments: e.target.value })}
                  placeholder="Cardiology, Neurology, Orthopedics..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hospitalActiveEdit"
                  checked={editHospitalFormData.is_active}
                  onChange={(e) => setEditHospitalFormData({ ...editHospitalFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <label htmlFor="hospitalActiveEdit" className="font-semibold text-slate-700 cursor-pointer">
                  Branch Operational & Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditHospitalModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Save Hospital Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE HOSPITAL MODAL */}
      {isDeleteHospitalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800">Delete Hospital Branch?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete <span className="font-bold text-slate-700">{activeBranch.Name}</span> ({activeBranch.Branch_Code})? This action will remove all branch data and cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setIsDeleteHospitalModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHospital}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md cursor-pointer"
              >
                Yes, Delete Branch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hospital_Details;