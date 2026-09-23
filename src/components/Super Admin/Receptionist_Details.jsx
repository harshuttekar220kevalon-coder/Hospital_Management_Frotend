import React, { useState, useEffect } from 'react';

const Receptionist_Details = ({ currentUser, selectedReceptionist, setSelectedReceptionist, setCurrentPage }) => {
  const [receptionistData, setReceptionistData] = useState(() => {
    if (selectedReceptionist) return selectedReceptionist;
    try {
      const saved = localStorage.getItem('selectedReceptionist');
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

  const shiftsList = [
    'Morning Shift (07:00 AM - 03:00 PM)',
    'Evening Shift (03:00 PM - 11:00 PM)',
    'Night Shift (11:00 PM - 07:00 AM)',
    'General Day Shift (09:00 AM - 05:00 PM)',
    'Rotational Shift'
  ];

  const rolesList = [
    'Front Desk Receptionist',
    'Patient Registration Receptionist',
    'Appointment Receptionist',
    'Admission Receptionist',
    'Billing Receptionist',
    'Emergency Receptionist'
  ];

  // Exact 10 fields only: Hospital, Name, Receptionist id, Role, Shift, Languages, Contact, Email, Password, Status
  const [editFormData, setEditFormData] = useState({
    hospital: '',
    name: '',
    receptionist_id: '',
    role: 'Front Desk Receptionist',
    shift: 'Morning Shift (07:00 AM - 03:00 PM)',
    languages: 'English, Hindi',
    contact: '',
    email: '',
    password: 'Reception@123',
    status: 'Active',
    is_active: true
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const loadReceptionistAndHospitals = async () => {
    setIsDataFetching(true);
    try {
      let currentRec = selectedReceptionist || receptionistData;
      if (!currentRec || !currentRec.id) {
        const saved = localStorage.getItem('selectedReceptionist');
        if (saved) {
          currentRec = JSON.parse(saved);
          setReceptionistData(currentRec);
        }
      }

      // Fetch all hospitals
      const hospListRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/').catch(() => null);
      if (hospListRes && hospListRes.ok) {
        const allHospitals = await hospListRes.json();
        setHospitalsList(allHospitals);
      }

      // Fetch fresh receptionist data from backend
      if (currentRec && currentRec.id) {
        const recRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${currentRec.id}/`).catch(() => null);
        if (recRes && recRes.ok) {
          const freshRec = await recRes.json();
          setReceptionistData(freshRec);
          if (setSelectedReceptionist) setSelectedReceptionist(freshRec);
          localStorage.setItem('selectedReceptionist', JSON.stringify(freshRec));
        }
      }
    } catch (err) {
      console.error('Error fetching receptionist details:', err);
    } finally {
      setIsDataFetching(false);
    }
  };

  useEffect(() => {
    loadReceptionistAndHospitals();
  }, [selectedReceptionist?.id]);

  const activeReceptionist = receptionistData || {};
  const assignedHospital = hospitalsList.find(h => h.id === Number(activeReceptionist.hospital));

  const displayName = activeReceptionist.name || `${activeReceptionist.first_name || ''} ${activeReceptionist.last_name || ''}`.trim() || 'Receptionist';
  const displayRole = activeReceptionist.role || activeReceptionist.designation || 'Front Desk Receptionist';
  const displayPhone = activeReceptionist.contact || activeReceptionist.phone_number || '-';

  const handleBackClick = () => {
    if (setCurrentPage) {
      setCurrentPage('super_admin_receptionists');
    }
  };

  // Open Edit Modal with current 10 fields data
  const handleOpenEditModal = () => {
    setEditFormData({
      hospital: activeReceptionist.hospital || '',
      name: activeReceptionist.name || `${activeReceptionist.first_name || ''} ${activeReceptionist.last_name || ''}`.trim(),
      receptionist_id: activeReceptionist.receptionist_id || `REC-${activeReceptionist.id}`,
      role: activeReceptionist.role || activeReceptionist.designation || 'Front Desk Receptionist',
      shift: activeReceptionist.shift || 'Morning Shift (07:00 AM - 03:00 PM)',
      languages: activeReceptionist.languages || 'English, Hindi',
      contact: activeReceptionist.contact || activeReceptionist.phone_number || '',
      email: activeReceptionist.email || '',
      password: activeReceptionist.password || 'Reception@123',
      status: activeReceptionist.status || (activeReceptionist.is_active ? 'Active' : 'Off Duty'),
      is_active: activeReceptionist.is_active !== false
    });
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  // Save Edit Receptionist
  const handleSaveReceptionistEdit = async (e) => {
    e.preventDefault();
    if (!activeReceptionist || !activeReceptionist.id) return;

    try {
      const recIdToSend = editFormData.receptionist_id || activeReceptionist.receptionist_id || `REC-${activeReceptionist.id}`;
      const passwordToSend = activeReceptionist.password || editFormData.password || 'Reception@123';
      const payload = {
        ...activeReceptionist,
        ...editFormData,
        hospital: editFormData.hospital ? Number(editFormData.hospital) : null,
        name: editFormData.name ? editFormData.name.trim() : '',
        receptionist_id: recIdToSend,
        role: editFormData.role,
        designation: editFormData.role,
        shift: editFormData.shift,
        languages: editFormData.languages ? editFormData.languages.trim() : 'English, Hindi',
        contact: editFormData.contact ? editFormData.contact.trim() : '',
        email: editFormData.email ? editFormData.email.trim() : '',
        password: passwordToSend,
        desk: activeReceptionist.desk || 'Main Lobby Desk 1',
        extension: activeReceptionist.extension || 'Ext. 101',
        status: editFormData.is_active ? 'Active' : 'Off Duty',
        is_active: editFormData.is_active
      };

      // Try PUT first
      let response = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${activeReceptionist.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      // If PUT is not accepted, try PATCH
      if (!response || !response.ok) {
        const patchRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${activeReceptionist.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => null);

        if (patchRes && patchRes.ok) {
          response = patchRes;
        }
      }

      if (response && response.ok) {
        const updated = await response.json();
        alert('Receptionist profile updated successfully!');
        setReceptionistData(updated);
        if (setSelectedReceptionist) setSelectedReceptionist(updated);
        localStorage.setItem('selectedReceptionist', JSON.stringify(updated));
        setIsEditModalOpen(false);
      } else {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        alert('Failed to update receptionist: ' + JSON.stringify(errorData));
      }
    } catch (err) {
      console.error('Error updating receptionist:', err);
      alert('Network error while updating receptionist details.');
    }
  };

  // Toggle Receptionist Active Status
  const handleToggleStatus = async () => {
    if (!activeReceptionist || !activeReceptionist.id) return;
    try {
      const newStatus = !activeReceptionist.is_active;
      const newStatusText = newStatus ? 'Active' : 'Off Duty';
      
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${activeReceptionist.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus, status: newStatusText })
      }).catch(() => null);

      if (response && response.ok) {
        const updated = await response.json();
        setReceptionistData(updated);
        if (setSelectedReceptionist) setSelectedReceptionist(updated);
        localStorage.setItem('selectedReceptionist', JSON.stringify(updated));
      } else {
        alert('Failed to toggle duty status.');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  // Delete Receptionist
  const handleConfirmDelete = async () => {
    if (!activeReceptionist || !activeReceptionist.id) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${activeReceptionist.id}/`, {
        method: 'DELETE'
      }).catch(() => null);

      if (response && (response.ok || response.status === 204)) {
        alert('Receptionist profile removed successfully.');
        localStorage.removeItem('selectedReceptionist');
        if (setSelectedReceptionist) setSelectedReceptionist(null);
        if (setCurrentPage) setCurrentPage('super_admin_receptionists');
      } else {
        alert('Failed to delete receptionist profile.');
      }
    } catch (err) {
      console.error('Error deleting receptionist:', err);
      alert('Network error while deleting receptionist.');
    }
  };

  // Assign Hospital Branch
  const handleOpenAssignModal = () => {
    setAssignHospitalId(activeReceptionist.hospital || '');
    setIsAssignModalOpen(true);
  };

  const handleSaveHospitalAssignment = async () => {
    if (!activeReceptionist || !activeReceptionist.id) return;

    try {
      const updatedHospitalId = assignHospitalId ? Number(assignHospitalId) : null;
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${activeReceptionist.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital: updatedHospitalId })
      }).catch(() => null);

      if (response && response.ok) {
        const updated = await response.json();
        alert('Hospital branch allocation updated successfully.');
        setReceptionistData(updated);
        if (setSelectedReceptionist) setSelectedReceptionist(updated);
        localStorage.setItem('selectedReceptionist', JSON.stringify(updated));
        setIsAssignModalOpen(false);
      } else {
        alert('Failed to update hospital assignment.');
      }
    } catch (err) {
      console.error('Error assigning hospital:', err);
    }
  };

  if (!activeReceptionist || !activeReceptionist.id) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-800">No Receptionist Selected</h2>
          <p className="text-xs text-slate-500">
            Please return to the Receptionists list and select a receptionist profile to view details.
          </p>
          <button
            type="button"
            onClick={handleBackClick}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer"
          >
            &larr; Back to Receptionists List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      {/* TOP NAVIGATION & BACK BUTTON */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
        >
          &larr; Back to Receptionists
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Super Admin</span>
          <span>/</span>
          <span>Receptionists</span>
          <span>/</span>
          <span className="font-semibold text-slate-700 font-mono">
            {activeReceptionist.receptionist_id || `REC-${activeReceptionist.id}`}
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
                {activeReceptionist.receptionist_id || `REC-${activeReceptionist.id}`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {displayRole}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  activeReceptionist.is_active !== false && activeReceptionist.status !== 'On Leave'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : activeReceptionist.status === 'On Leave'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {activeReceptionist.is_active !== false ? activeReceptionist.status || 'Active' : 'Off Duty'}
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
            {activeReceptionist.is_active !== false && activeReceptionist.status !== 'On Leave' ? 'Mark Off Duty' : 'Set Active'}
          </button>

          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            Edit Receptionist
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
          <p className="text-xs text-slate-400 mt-1">Front desk services</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Duty Shift</p>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-1 truncate">
            {activeReceptionist.shift || 'Morning Shift'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Assigned schedule</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Languages</p>
          <h3 className="text-sm font-bold text-slate-800 mt-1 truncate">
            {activeReceptionist.languages || 'English, Hindi'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Spoken languages</p>
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
        {/* LEFT COLUMN: RECEPTIONIST CREDENTIALS & CONTACT (1 COL) */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5 self-start">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Receptionist Credentials & Contact</h2>
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="text-xs font-semibold text-amber-600 hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* 1. RECEPTIONIST ID */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Receptionist id:</span>
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Permanent
                  </span>
                </div>
                <p className="font-mono text-sm font-bold text-amber-700 mt-0.5 select-none">{activeReceptionist.receptionist_id || `REC-${activeReceptionist.id}`}</p>
              </div>

              {/* 2. NAME */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Name:</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{displayName}</p>
              </div>

              {/* 3. ROLE */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Role:</span>
                <div className="mt-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block">
                    {displayRole}
                  </span>
                </div>
              </div>

              {/* 4. SHIFT */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Shift:</span>
                <p className="font-semibold text-amber-700 mt-0.5">{activeReceptionist.shift || 'Morning Shift'}</p>
              </div>

              {/* 5. LANGUAGES */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Languages:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{activeReceptionist.languages || 'English, Hindi'}</p>
              </div>

              {/* 6. CONTACT */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Contact:</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{displayPhone}</p>
              </div>

              {/* 7. EMAIL */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Email:</span>
                <p className="font-semibold text-blue-700 mt-0.5 break-all">{activeReceptionist.email || '-'}</p>
              </div>

              {/* 8. HOSPITAL */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Hospital:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{assignedHospital ? assignedHospital.Name : 'Unassigned'}</p>
              </div>

              {/* 9. STATUS */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Status:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{activeReceptionist.status || (activeReceptionist.is_active ? 'Active' : 'Off Duty')}</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold text-[10px] border border-slate-300 transition cursor-pointer"
                >
                  Toggle
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ASSIGNED HOSPITAL BRANCH (2 COLS) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-800">Assigned Hospital Branch</h2>
              <p className="text-xs text-slate-500 mt-0.5">Facility and branch location details</p>
            </div>
            <button
              type="button"
              onClick={handleOpenAssignModal}
              className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs border border-amber-200 transition cursor-pointer"
            >
              {assignedHospital ? 'Change Allocation' : '+ Assign Branch'}
            </button>
          </div>

          {!assignedHospital ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl font-bold">
                🏢
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Hospital Branch Allocated</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                This receptionist is currently not assigned to any hospital branch. Assign a branch to link desk allocations and shift rosters.
              </p>
              <button
                type="button"
                onClick={handleOpenAssignModal}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Assign Hospital Branch Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-200">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                        {assignedHospital.Branch_Code || `HOSP-${assignedHospital.id}`}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Operational
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
                      {assignedHospital.Name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      {[assignedHospital.area, assignedHospital.city, assignedHospital.address].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-amber-200/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Hospital Phone</span>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">{assignedHospital.phone || assignedHospital.contact || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Official Email</span>
                    <p className="font-semibold text-blue-700 mt-0.5 truncate">{assignedHospital.email || '-'}</p>
                  </div>
                </div>
              </div>

              {/* HOSPITAL QUICK STATS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Total Beds</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{assignedHospital.total_beds || assignedHospital.beds || 0}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">ICU Beds</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{assignedHospital.icu_beds || 0}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Ambulances</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{assignedHospital.ambulances || 0}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">OTs</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{assignedHospital.operation_theatres || 0}</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-500 font-medium">All receptionist records are synced with Super Admin backend.</span>
            <button
              type="button"
              onClick={handleBackClick}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
            >
              &larr; Back to Receptionists
            </button>
          </div>
        </div>
      </div>

      {/* EDIT RECEPTIONIST MODAL - EXACT 10 FIELDS */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Edit Receptionist Profile</h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveReceptionistEdit} className="space-y-3 text-xs">
              {/* 1. HOSPITAL */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital: *</label>
                <select
                  value={editFormData.hospital}
                  onChange={(e) => setEditFormData({ ...editFormData, hospital: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 font-medium cursor-pointer"
                >
                  <option value="">Leave Unassigned</option>
                  {hospitalsList.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.Name} ({h.city}) - {h.Branch_Code}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. NAME */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Name: *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g. Pooja Sharma"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
              </div>

              {/* 3 & 9. RECEPTIONIST ID & PASSWORD (UNCHANGEABLE & UNCLICKABLE) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 uppercase">
                      Receptionist id:
                    </label>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Permanent ID
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={activeReceptionist.receptionist_id || `REC-${activeReceptionist.id}`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 text-amber-800 font-mono font-bold cursor-not-allowed select-none focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 uppercase">
                      Password:
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
                      value={activeReceptionist.password || editFormData.password || 'Reception@123'}
                      className="w-full pl-3 pr-18 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 font-mono text-xs cursor-not-allowed select-none focus:outline-none tracking-wider"
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

              {/* 4 & 5. ROLE & SHIFT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Role: *</label>
                  <select
                    required
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 font-medium cursor-pointer"
                  >
                    {rolesList.map((r, i) => (
                      <option key={i} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Shift: *</label>
                  <select
                    required
                    value={editFormData.shift}
                    onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                  >
                    {shiftsList.map((s, i) => (
                      <option key={i} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 6 & 7. LANGUAGES & CONTACT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Languages: *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.languages}
                    onChange={(e) => setEditFormData({ ...editFormData, languages: e.target.value })}
                    placeholder="e.g. English, Hindi, Marathi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact: (Numbers only) *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    value={editFormData.contact}
                    onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* 8. EMAIL */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Email: *</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="receptionist@hospital.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              {/* 10. STATUS */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recActiveEditModal"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ 
                    ...editFormData, 
                    is_active: e.target.checked,
                    status: e.target.checked ? 'Active' : 'Off Duty'
                  })}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                />
                <label htmlFor="recActiveEditModal" className="font-semibold text-slate-700 cursor-pointer">
                  Status: Active & On Duty
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

      {/* ASSIGN HOSPITAL MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4">
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
                Assigning branch for <strong className="text-slate-800">{displayName}</strong>:
              </p>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Select Hospital Branch</label>
                <select
                  value={assignHospitalId}
                  onChange={(e) => setAssignHospitalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                >
                  <option value="">Leave Unassigned</option>
                  {hospitalsList.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.Name} ({h.city}) - {h.Branch_Code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
                  Save Allocation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2 rounded-full bg-rose-100 text-lg font-bold">!</span>
              <h3 className="font-bold text-base text-slate-800">Delete Receptionist Record?</h3>
            </div>
            <div className="space-y-1 text-xs">
              <p className="text-slate-500">
                Are you sure you want to permanently delete profile for <strong className="text-slate-800">{displayName}</strong> (<span className="font-mono">{activeReceptionist.receptionist_id || `REC-${activeReceptionist.id}`}</span>)? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Receptionist_Details;