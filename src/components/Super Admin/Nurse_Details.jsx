import React, { useState, useEffect } from 'react';

const Nurse_Details = ({ currentUser, selectedNurse, setSelectedNurse, setCurrentPage }) => {
  const [nurseData, setNurseData] = useState(() => {
    if (selectedNurse) return selectedNurse;
    try {
      const saved = localStorage.getItem('selectedNurse');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [hospitalsList, setHospitalsList] = useState([]);
  const [isDataFetching, setIsDataFetching] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignHospitalId, setAssignHospitalId] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  const rolesList = [
    'Staff Nurse',
    'Head Nurse',
    'ICU Nurse',
    'Emergency Nurse',
    'OT Nurse',
    'Ward Nurse',
    'Pediatric Nurse'
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
    password: 'Nurse@123',
    hospital: '',
    status: 'On Duty',
    is_active: true
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const loadNurseAndHospitals = async () => {
    setIsDataFetching(true);
    try {
      let currentNurse = selectedNurse || nurseData;
      if (!currentNurse || !currentNurse.id) {
        const saved = localStorage.getItem('selectedNurse');
        if (saved) {
          currentNurse = JSON.parse(saved);
          setNurseData(currentNurse);
        }
      }

      const hospListRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/').catch(() => null);
      if (hospListRes && hospListRes.ok) {
        const allHospitals = await hospListRes.json();
        setHospitalsList(allHospitals);
      }

      if (currentNurse && currentNurse.id) {
        const nurseRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${currentNurse.id}/`).catch(() => null);
        if (nurseRes && nurseRes.ok) {
          const freshNurse = await nurseRes.json();
          setNurseData(freshNurse);
          if (setSelectedNurse) setSelectedNurse(freshNurse);
          localStorage.setItem('selectedNurse', JSON.stringify(freshNurse));
        }
      }
    } catch (err) {
      console.error('Error fetching nurse details:', err);
    } finally {
      setIsDataFetching(false);
    }
  };

  useEffect(() => {
    loadNurseAndHospitals();
  }, [selectedNurse?.id]);

  const activeNurse = nurseData || {};
  const assignedHospital = hospitalsList.find(h => h.id === Number(activeNurse.hospital));

  const displayName = activeNurse.name || 'Nurse';
  const displayRole = activeNurse.role || 'Staff Nurse';
  const displayPhone = activeNurse.contact || '-';

  const handleBackClick = () => {
    if (setCurrentPage) {
      setCurrentPage('super_admin_nurses');
    }
  };

  const handleOpenEditModal = () => {
    setEditFormData({
      nurse_id: activeNurse.nurse_id || `NUR-${activeNurse.id}`,
      name: activeNurse.name || '',
      role: activeNurse.role || 'Staff Nurse',
      ward: activeNurse.ward || 'General Ward',
      shift: activeNurse.shift || 'Morning (08:00 AM - 04:00 PM)',
      qualification: activeNurse.qualification || '',
      experience: activeNurse.experience || '',
      contact: activeNurse.contact || '',
      email: activeNurse.email || '',
      password: activeNurse.password || 'Nurse@123',
      hospital: activeNurse.hospital || '',
      status: activeNurse.status || (activeNurse.is_active ? 'On Duty' : 'On Leave'),
      is_active: activeNurse.is_active !== false
    });
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  const handleSaveNurseEdit = async (e) => {
    e.preventDefault();
    if (!activeNurse || !activeNurse.id) return;

    try {
      const nurseIdToSend = editFormData.nurse_id || activeNurse.nurse_id || `NUR-${activeNurse.id}`;
      const payload = {
        ...editFormData,
        nurse_id: nurseIdToSend,
        role: editFormData.nurse_role,
        nurse_role: editFormData.nurse_role,
        designation: editFormData.nurse_role,
        name: editFormData.name.trim(),
        contact: editFormData.contact.trim(),
        password: activeNurse.password || editFormData.password || 'Nurse@123',
        hospital: editFormData.hospital ? Number(editFormData.hospital) : null
      };

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${activeNurse.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const updated = await response.json();

      if (response.ok) {
        alert('Nurse profile updated successfully!');
        setNurseData(updated);
        if (setSelectedNurse) setSelectedNurse(updated);
        localStorage.setItem('selectedNurse', JSON.stringify(updated));
        setIsEditModalOpen(false);
      } else {
        alert('Failed to update nurse: ' + JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error updating nurse:', err);
      alert('Network error while updating nurse details.');
    }
  };

  const handleToggleStatus = async () => {
    if (!activeNurse || !activeNurse.id) return;
    try {
      const newStatus = !activeNurse.is_active;
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${activeNurse.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus, status: newStatus ? 'On Duty' : 'On Leave' })
      });

      if (response.ok) {
        const updated = await response.json();
        setNurseData(updated);
        if (setSelectedNurse) setSelectedNurse(updated);
        localStorage.setItem('selectedNurse', JSON.stringify(updated));
      } else {
        alert('Failed to toggle duty status.');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeNurse || !activeNurse.id) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${activeNurse.id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('Nurse profile removed successfully.');
        localStorage.removeItem('selectedNurse');
        if (setSelectedNurse) setSelectedNurse(null);
        if (setCurrentPage) setCurrentPage('super_admin_nurses');
      } else {
        alert('Failed to delete nurse profile.');
      }
    } catch (err) {
      console.error('Error deleting nurse:', err);
      alert('Network error while deleting nurse.');
    }
  };

  const handleOpenAssignModal = () => {
    setAssignHospitalId(activeNurse.hospital || '');
    setIsAssignModalOpen(true);
  };

  const handleSaveHospitalAssignment = async () => {
    if (!activeNurse || !activeNurse.id) return;

    try {
      const updatedHospitalId = assignHospitalId ? Number(assignHospitalId) : null;
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${activeNurse.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital: updatedHospitalId })
      });

      if (response.ok) {
        const updated = await response.json();
        alert('Hospital branch allocation updated successfully.');
        setNurseData(updated);
        if (setSelectedNurse) setSelectedNurse(updated);
        localStorage.setItem('selectedNurse', JSON.stringify(updated));
        setIsAssignModalOpen(false);
      } else {
        alert('Failed to update hospital assignment.');
      }
    } catch (error) {
      console.error('Error assigning hospital:', error);
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
          &larr; Back to Nurses
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Super Admin</span>
          <span>/</span>
          <span>Nurses</span>
          <span>/</span>
          <span className="font-semibold text-slate-700 font-mono">
            {activeNurse.nurse_id || `NUR-${activeNurse.id || 'NEW'}`}
          </span>
        </div>
      </div>

      {/* HEADER HERO CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                {activeNurse.nurse_id || `NUR-${activeNurse.id || 'NEW'}`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {displayRole}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                activeNurse.is_active !== false 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {activeNurse.is_active !== false ? 'On Duty (Active)' : 'On Leave (Inactive)'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight mt-1">
              {displayName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleStatus}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
          >
            {activeNurse.is_active !== false ? 'Mark On Leave' : 'Set On Duty'}
          </button>

          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            Edit Nurse
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

      {/* TOP SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role & Designation</p>
          <div className="mt-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 inline-block">
              {displayRole}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Nursing department</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Ward</p>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-1 truncate">
            {activeNurse.ward || 'General Ward'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Primary care ward</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift Roster</p>
          <h3 className="text-base sm:text-lg font-bold text-indigo-700 mt-1 truncate">
            {activeNurse.shift || 'Morning'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Active duty roster</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital Affiliation</p>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-1 truncate">
            {assignedHospital ? assignedHospital.Name : 'Unassigned'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {assignedHospital ? `${assignedHospital.city || ''}` : 'Needs Allocation'}
          </p>
        </div>
      </div>

      {/* MAIN CONTENT: 2-COLUMN PROFILE & ASSIGNED HOSPITAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        {/* LEFT COLUMN: NURSE CREDENTIALS & CONTACT (1 COL) */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5 self-start">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Nurse Credentials & Contact</h2>
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Nurse ID / Registration</span>
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                    Permanent
                  </span>
                </div>
                <p className="font-mono text-sm font-bold text-indigo-700 mt-0.5 select-none">{activeNurse.nurse_id || `NUR-${activeNurse.id}`}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Role / Designation</span>
                <div className="mt-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 inline-block">
                    {displayRole}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Assigned Ward</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{activeNurse.ward || 'General Ward'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Shift Schedule</span>
                <p className="font-semibold text-indigo-700 mt-0.5">{activeNurse.shift || 'Morning'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Qualifications</span>
                <p className="font-semibold text-slate-800 mt-0.5">{activeNurse.qualification || 'GNM, B.Sc Nursing'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Years of Experience</span>
                <p className="font-semibold text-slate-800 mt-0.5">{activeNurse.experience || 'Not specified'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Official Email Address</span>
                <p className="font-semibold text-blue-700 mt-0.5 break-all">{activeNurse.email || '-'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Contact Phone</span>
                <p className="font-semibold text-slate-800 mt-0.5">{displayPhone}</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition cursor-pointer text-center"
            >
              Update Information
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: ASSIGNED HOSPITAL BRANCH FULL DETAILS (2 COLS) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 self-start">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Assigned Hospital Branch
              </h2>
              <p className="text-xs text-slate-500">
                Hospital location where {displayName} is currently deployed for ward duties.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAssignModal}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold text-xs border border-indigo-300 transition cursor-pointer"
            >
              {assignedHospital ? 'Change Branch' : '+ Assign Branch'}
            </button>
          </div>

          {!assignedHospital ? (
            <div className="text-center py-12 bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 my-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-slate-600">No hospital branch currently assigned to this nurse.</p>
              <p className="text-[11px] text-slate-400 mt-1">Assign a hospital branch to activate ward duty schedules and shift rosters.</p>
              <button
                type="button"
                onClick={handleOpenAssignModal}
                className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
              >
                + Assign Hospital Branch Now
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block">
                    {assignedHospital.Branch_Code || `HOSP-${assignedHospital.id}`}
                  </span>
                  <h3 className="font-bold text-slate-800 text-base mt-1.5">{assignedHospital.Name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{assignedHospital.city} ({assignedHospital.area || ''})</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${
                  assignedHospital.is_active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {assignedHospital.is_active !== false ? 'Active Branch' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-200/60">
                <p className="text-xs"><span className="font-semibold text-slate-700">Address:</span> {assignedHospital.address || `${assignedHospital.area || ''}, ${assignedHospital.city || ''}`}</p>
                <p className="text-xs"><span className="font-semibold text-slate-700">Contact Phone:</span> {assignedHospital.contact || '-'}</p>
                <p className="text-xs"><span className="font-semibold text-slate-700">Official Email:</span> {assignedHospital.email || '-'}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/60 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Total Beds</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{assignedHospital.total_beds || 0}</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">ICU Beds</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{assignedHospital.icu_beds || 0}</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">OTs</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{assignedHospital.operation_theatres || 0}</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-500 font-medium">All nurse records are synced with Super Admin backend.</span>
            <button
              type="button"
              onClick={handleBackClick}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
            >
              &larr; Back to Nurses
            </button>
          </div>
        </div>
      </div>

      {/* EDIT NURSE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Edit Nurse Profile</h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveNurseEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 uppercase">Nurse ID</label>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Permanent ID
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={activeNurse.nurse_id || `NUR-${activeNurse.id}`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 text-indigo-700 font-mono font-bold cursor-not-allowed select-none focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 uppercase">
                      Nurse Password
                    </label>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Unchangeable
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      readOnly
                      tabIndex={-1}
                      value={activeNurse.password || 'Nurse@123'}
                      className="w-full pl-3 pr-20 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 font-mono text-xs cursor-not-allowed select-none focus:outline-none tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-300 shadow-2xs flex items-center gap-1 transition cursor-pointer"
                    >
                      {showEditPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Nurse Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g. Rita"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Role / Designation *</label>
                  <select
                    required
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 font-medium cursor-pointer"
                  >
                    {rolesList.map((r, i) => (
                      <option key={i} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Assigned Ward *</label>
                  <select
                    required
                    value={editFormData.ward}
                    onChange={(e) => setEditFormData({ ...editFormData, ward: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 font-medium cursor-pointer"
                  >
                    {wardsList.map((w, i) => (
                      <option key={i} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Shift Timing *</label>
                  <select
                    required
                    value={editFormData.shift}
                    onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 font-medium cursor-pointer"
                  >
                    {shiftsList.map((s, i) => (
                      <option key={i} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    value={editFormData.contact}
                    onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    placeholder="nurse@hospital.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Qualifications</label>
                  <input
                    type="text"
                    value={editFormData.qualification}
                    onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
                    placeholder="e.g. GNM, B.Sc Nursing"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Experience</label>
                <input
                  type="text"
                  value={editFormData.experience}
                  onChange={(e) => setEditFormData({ ...editFormData, experience: e.target.value })}
                  placeholder="e.g. 5 Years"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Hospital Branch</label>
                <select
                  value={editFormData.hospital}
                  onChange={(e) => setEditFormData({ ...editFormData, hospital: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 font-medium cursor-pointer"
                >
                  <option value="">Leave Unassigned</option>
                  {hospitalsList.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.Name} ({h.city}) - {h.Branch_Code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="nurseActiveEditModal"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ 
                    ...editFormData, 
                    is_active: e.target.checked,
                    status: e.target.checked ? 'On Duty' : 'On Leave'
                  })}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="nurseActiveEditModal" className="font-semibold text-slate-700 cursor-pointer">
                  Nurse Active & On Duty
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md cursor-pointer transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ASSIGN HOSPITAL MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Assign Hospital Branch</h2>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Select the hospital branch where <span className="font-bold text-slate-800">{displayName}</span> will be deployed:
              </p>
              <select
                value={assignHospitalId}
                onChange={(e) => setAssignHospitalId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
              >
                <option value="">-- Remove / Leave Unassigned --</option>
                {hospitalsList.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.Name} ({h.city}) - {h.Branch_Code}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHospitalAssignment}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md cursor-pointer transition"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800">Delete Nurse Profile?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-700">{displayName}</span> from the database? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md cursor-pointer"
              >
                Yes, Delete Nurse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nurse_Details;