import React, { useState, useEffect } from 'react';

const Hospital_Details = ({ currentUser, selectedHospital, setSelectedHospital, setCurrentPage }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [hospitalData, setHospitalData] = useState(selectedHospital);
  const [loading, setLoading] = useState(!selectedHospital);

  const [hospitalAdminInfo, setHospitalAdminInfo] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    const fetchHospitalDetailsAndAdmin = async () => {
      if (selectedHospital && selectedHospital.id) {
        try {
          setLoading(true);
          const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${selectedHospital.id}/`);
          if (hospRes.ok) {
            const hospData = await hospRes.json();
            setHospitalData(hospData);
          }

          setAdminLoading(true);
          const adminRes = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/');
          if (adminRes.ok) {
            const adminsList = await adminRes.json();
            const matchedAdmin = adminsList.find(a => Number(a.hospital) === Number(selectedHospital.id));
            setHospitalAdminInfo(matchedAdmin || null);
          }
        } catch (error) {
          console.error('Error fetching hospital details or admin:', error);
        } finally {
          setLoading(false);
          setAdminLoading(false);
        }
      }
    };

    fetchHospitalDetailsAndAdmin();
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
    ambulances_count: 2,
    pharmacy: '24x7 In-House Pharmacy',
    overview: 'Hospital overview description text.',
    is_active: true
  };

  const activeBranch = hospitalData || defaultHospitalData;

  const [departmentsList] = useState([
    { id: 'D1', name: 'Cardiology', code: 'CARD-01', head: 'Dr. Aditi Verma', doctors_count: 5, nurses_count: 12, beds_count: 30, location: 'Block A, 2nd Floor', status: 'Operational', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  ]);

  const [doctorsList] = useState([
    { id: 'DOC-001', name: 'Dr. Aditi Verma', specialization: 'Cardiologist', department: 'Cardiology', qualification: 'MBBS, MD, DM', experience: '12 Years', opd_timings: '10:00 AM - 02:00 PM', chamber: 'Room 204, Block A', phone: '+91 98765 00001', email: 'aditi.verma@hospital.com', status: 'Available', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  ]);

  const [nursesList] = useState([
    { id: 'NUR-001', name: 'Sister Mary Joseph', role: 'Staff Nurse', ward: 'General Ward 2A', shift: 'Morning (08:00 AM - 04:00 PM)', contact: '+91 98765 11111', experience: '8 Years', status: 'On Duty', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  ]);

  const [receptionistsList] = useState([
    { id: 'REC-001', name: 'Pooja Sawant', role: 'Front Desk Executive', desk: 'Main Lobby Desk 1', shift: 'Morning Shift', languages: 'English, Hindi', extension: 'Ext 101', phone: '+91 98765 22222', status: 'Active', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  ]);

  const [patientRegistry] = useState([
    { id: 'PAT-001', name: 'Manish Gupta', age: '52 M', ward_bed: 'Ward 2A - Bed 201', doctor: 'Dr. Aditi Verma', admitted_date: '2026-09-20', diagnosis: 'Cardiac Observation', status: 'Stable', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  ]);

  const [patientStats] = useState({
    total_admitted: 1,
    opd_today: 10,
    emergency_cases_today: 2,
    discharged_today: 1
  });

  const [isAdminCreateModalOpen, setIsAdminCreateModalOpen] = useState(false);
  const [isAdminEditModalOpen, setIsAdminEditModalOpen] = useState(false);
  const [isAdminDetailsModalOpen, setIsAdminDetailsModalOpen] = useState(false);
  const [isAdminDeleteModalOpen, setIsAdminDeleteModalOpen] = useState(false);

  const [adminFormData, setAdminFormData] = useState({
    name: '',
    designation: 'Hospital Administrator',
    email: '',
    contact: '',
    is_active: true
  });

  const handleOpenAdminCreate = () => {
    setAdminFormData({
      name: '',
      designation: 'Hospital Administrator',
      email: '',
      contact: '',
      is_active: true
    });
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

  const handleOpenAdminEdit = () => {
    if (!hospitalAdminInfo) return;
    setAdminFormData({
      name: hospitalAdminInfo.name || '',
      designation: hospitalAdminInfo.designation || '',
      email: hospitalAdminInfo.email || '',
      contact: hospitalAdminInfo.contact || '',
      is_active: hospitalAdminInfo.is_active !== false
    });
    setIsAdminEditModalOpen(true);
  };

  const handleSaveAdminUpdate = async (e) => {
    e.preventDefault();
    if (!hospitalAdminInfo) return;

    try {
      const payload = {
        ...adminFormData,
        hospital: activeBranch.id
      };

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${hospitalAdminInfo.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Hospital Administrator updated successfully.');
        setHospitalAdminInfo(data);
        setIsAdminEditModalOpen(false);
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      alert('Network error while updating administrator.');
    }
  };

  const handleToggleAdminStatus = async () => {
    if (!hospitalAdminInfo) return;
    try {
      const updatedStatus = !hospitalAdminInfo.is_active;
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${hospitalAdminInfo.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: updatedStatus })
      });

      if (response.ok) {
        const data = await response.json();
        setHospitalAdminInfo(data);
      } else {
        alert('Failed to update status.');
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
    }
  };

  const handleDeleteAdminConfirm = async () => {
    if (!hospitalAdminInfo) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${hospitalAdminInfo.id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        setHospitalAdminInfo(null);
        setIsAdminDeleteModalOpen(false);
        alert('Hospital Administrator unassigned and removed successfully.');
      } else {
        alert('Failed to remove administrator.');
      }
    } catch (error) {
      console.error('Error removing admin:', error);
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
  const filteredPatients = patientRegistry.filter(pat => {
    return (pat.name || '').toLowerCase().includes(patientSearch.toLowerCase());
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
        <p className="text-sm font-semibold text-slate-500">Loading hospital profile from backend...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-5">
      {setCurrentPage && (
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={handleBackClick}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            &larr; Back
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Hospital Information (PostgreSQL)
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
              
              {hospitalAdminInfo ? (
                <button
                  type="button"
                  onClick={handleOpenAdminEdit}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Update Admin
                </button>
              ) : (
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

      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex flex-wrap items-center gap-1.5">
        {[
          { id: 'all', label: 'All Overview' },
          { id: 'hospital_info', label: 'Hospital Information' },
          { id: 'admin', label: 'Hospital Admin' },
          { id: 'departments', label: `Departments (${departmentsList.length})` },
          { id: 'doctors', label: `Doctors (${doctorsList.length})` },
          { id: 'nurses', label: `Nurses (${nursesList.length})` },
          { id: 'receptionists', label: `Receptionists (${receptionistsList.length})` },
          { id: 'patients', label: `Patients (${patientStats.total_admitted})` },
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

      {(activeTab === 'all' || activeTab === 'admin') && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                Hospital Administrator Profile (Backend Synced)
              </h2>
              <p className="text-xs text-slate-500">Designated superintendent and administrative authority for this branch</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {hospitalAdminInfo ? (
                <>
                  <button
                    type="button"
                    onClick={handleToggleAdminStatus}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
                      hospitalAdminInfo.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {hospitalAdminInfo.is_active ? 'Active' : 'Deactivated'}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAdminEdit}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    Update Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdminDeleteModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition cursor-pointer"
                  >
                    Unassign Admin
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenAdminCreate}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  + Create Administrator
                </button>
              )}
            </div>
          </div>

          {!hospitalAdminInfo ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-sm font-bold text-slate-700">No Administrator Assigned</p>
              <p className="text-xs text-slate-500 mt-1">Click below to register and assign an administrator to {activeBranch.Name}.</p>
              <button
                type="button"
                onClick={handleOpenAdminCreate}
                className="mt-3 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
              >
                + Create Administrator
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white flex flex-col items-center text-center justify-between">
                <div className="w-full flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-slate-800 text-teal-300 font-extrabold text-2xl flex items-center justify-center border-2 border-slate-700">
                    {(hospitalAdminInfo.name || 'AD').slice(0, 2).toUpperCase()}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mt-3 text-white">{hospitalAdminInfo.name}</h3>
                  <p className="text-xs text-teal-300 font-medium">{hospitalAdminInfo.designation}</p>
                  <span className="font-mono text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300 mt-2">
                    ID: {hospitalAdminInfo.employee_id}
                  </span>
                  <div className="mt-4 pt-4 border-t border-white/10 w-full space-y-1.5 text-xs text-slate-300 text-left">
                    <p><strong>Phone:</strong> {hospitalAdminInfo.contact}</p>
                    <p className="truncate"><strong>Email:</strong> {hospitalAdminInfo.email}</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-3 sm:space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Assigned Branch</p>
                    <p className="font-bold text-slate-800 mt-0.5">{activeBranch.Name}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Status & Availability</p>
                    <p className={`font-bold mt-0.5 ${hospitalAdminInfo.is_active ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {hospitalAdminInfo.is_active ? 'Active & Operational' : 'Deactivated'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenAdminEdit}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-semibold transition cursor-pointer border border-blue-200"
                  >
                    Update Admin
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleAdminStatus}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white font-semibold transition cursor-pointer border border-amber-200"
                  >
                    {hospitalAdminInfo.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdminDeleteModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white font-semibold transition cursor-pointer border border-rose-200"
                  >
                    Unassign Admin
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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

      {isAdminEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Edit Administrator Details</h2>
              <button
                type="button"
                onClick={() => setIsAdminEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAdminUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={adminFormData.name}
                  onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                <input
                  type="text"
                  required
                  value={adminFormData.contact}
                  onChange={(e) => setAdminFormData({ ...adminFormData, contact: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
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
                  id="adminActiveEdit"
                  checked={adminFormData.is_active}
                  onChange={(e) => setAdminFormData({ ...adminFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <label htmlFor="adminActiveEdit" className="font-semibold text-slate-700 cursor-pointer">
                  Account Active & Operational
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdminEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdminDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800">Remove Administrator?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <span className="font-bold text-slate-700">{hospitalAdminInfo?.name}</span> from {activeBranch.Name}?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setIsAdminDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAdminConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md cursor-pointer"
              >
                Yes, Remove Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {(activeTab === 'all' || activeTab === 'departments') && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-800">Hospital Clinical & Diagnostic Departments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredDepts.map((dept) => (
              <div key={dept.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                <h3 className="font-bold text-slate-800 text-sm">{dept.name}</h3>
                <p className="text-xs text-blue-700 mt-1">HOD: {dept.head}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Hospital_Details;