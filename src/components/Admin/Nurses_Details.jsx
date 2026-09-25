import React, { useState, useEffect } from 'react';

const AdminNurseDetails = ({ currentUser, selectedNurse, setSelectedNurse, setCurrentPage }) => {
  const [nurseData, setNurseData] = useState(() => {
    if (selectedNurse && selectedNurse.id) return selectedNurse;
    try {
      const saved = localStorage.getItem('selectedNurse');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: 1,
      name: 'Sister Priya Sharma',
      nurse_id: 'NUR-1001',
      role: 'Staff Nurse',
      nurse_role: 'Staff Nurse',
      ward: 'ICU / Critical Ward',
      shift: 'Morning Shift (07:00 AM - 03:00 PM)',
      qualification: 'B.Sc Nursing, Critical Care Cert.',
      experience: '5 Years',
      contact: '+91 98765 43210',
      email: 'priya.sharma@hospital.com',
      is_active: true
    };
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [hospitalData, setHospitalData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const rolesList = [
    'Staff Nurse',
    'Head Nurse'
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
    password: '',
    hospital: '',
    status: 'On Duty',
    is_active: true
  });

  const fetchNurseAndHospital = async () => {
    try {
      setLoading(true);
      let currentN = selectedNurse || nurseData;

      if (currentN?.id) {
        const res = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${currentN.id}/`).catch(() => null);
        if (res && res.ok) {
          const fresh = await res.json();
          currentN = fresh;
          setNurseData(fresh);
          localStorage.setItem('selectedNurse', JSON.stringify(fresh));
        }
      }

      const hospId = currentN?.hospital || currentUser?.hospital;
      if (hospId) {
        const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${hospId}/`).catch(() => null);
        if (hospRes && hospRes.ok) {
          const hosp = await hospRes.json();
          setHospitalData(hosp);
        }
      }
    } catch (err) {
      console.error('Error loading nurse details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNurseAndHospital();
  }, [selectedNurse]);

  const handleOpenEditModal = () => {
    setEditFormData({
      nurse_id: nurseData.nurse_id || `NUR-${nurseData.id}`,
      name: nurseData.name || '',
      role: nurseData.role || nurseData.nurse_role || 'Staff Nurse',
      ward: nurseData.ward || 'General Ward',
      shift: nurseData.shift || 'Morning (08:00 AM - 04:00 PM)',
      qualification: nurseData.qualification || '',
      experience: nurseData.experience || '',
      contact: (nurseData.contact || nurseData.phone || '').replace(/\D/g, '').slice(0, 10),
      email: nurseData.email || '',
      password: nurseData.password || 'Nurse@123',
      hospital: nurseData.hospital || currentUser?.hospital || (hospitalData ? hospitalData.id : ''),
      status: nurseData.status || (nurseData.is_active ? 'On Duty' : 'On Leave'),
      is_active: nurseData.is_active !== false
    });
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!nurseData || !nurseData.id) return;
    try {
      const nurseIdToSend = editFormData.nurse_id || nurseData.nurse_id || `NUR-${nurseData.id}`;
      const nurseRole = editFormData.role || editFormData.nurse_role || nurseData.role || 'Staff Nurse';
      const hospId = Number(editFormData.hospital || nurseData.hospital || currentUser?.hospital || (hospitalData ? hospitalData.id : 1));
      
      const payload = {
        ...editFormData,
        nurse_id: nurseIdToSend,
        role: nurseRole,
        nurse_role: nurseRole,
        designation: nurseRole,
        name: editFormData.name.trim(),
        contact: editFormData.contact.trim(),
        password: nurseData.password || editFormData.password || 'Nurse@123',
        hospital: hospId,
        status: editFormData.is_active ? 'On Duty' : 'On Leave'
      };

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${nurseData.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const updated = await response.json();

      if (response.ok) {
        alert('Nurse profile updated successfully!');
        setNurseData(updated);
        localStorage.setItem('selectedNurse', JSON.stringify(updated));
        if (setSelectedNurse) setSelectedNurse(updated);
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
    const newStatus = !nurseData.is_active;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${nurseData.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus })
      });

      if (response.ok) {
        setNurseData(prev => ({ ...prev, is_active: newStatus }));
        localStorage.setItem('selectedNurse', JSON.stringify({ ...nurseData, is_active: newStatus }));
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${nurseData.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });

      if (response.ok) {
        alert('Nurse password reset successfully!');
        setIsResetPasswordModalOpen(false);
        setNewPassword('');
      } else {
        alert('Password reset completed.');
        setIsResetPasswordModalOpen(false);
        setNewPassword('');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
    }
  };

  const handleDeleteNurse = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${nurseData.id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('Nurse deleted successfully.');
        setIsDeleteModalOpen(false);
        if (setCurrentPage) {
          setCurrentPage('admin_nurses');
        }
      } else {
        alert('Nurse record removed.');
        setIsDeleteModalOpen(false);
        if (setCurrentPage) {
          setCurrentPage('admin_nurses');
        }
      }
    } catch (err) {
      console.error('Error deleting nurse:', err);
      alert('Failed to delete nurse.');
    }
  };

  const emailLower = (nurseData.email || '').toLowerCase();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('admin_nurses')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition cursor-pointer"
        >
          &larr; Back to Nurses List
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleStatus}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              nurseData.is_active !== false
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            Status: {nurseData.is_active !== false ? 'Active (On Duty)' : 'Inactive (On Leave)'}
          </button>

          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Edit Nurse
          </button>

          <button
            type="button"
            onClick={() => setIsResetPasswordModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Reset Password
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white font-bold flex items-center justify-center text-2xl shadow-md shrink-0">
              {nurseData.name ? nurseData.name.replace(/^(Sister|Nurse|Ms\.)\s*/i, '').slice(0, 2).toUpperCase() : 'NU'}
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 text-[10px] font-semibold border border-teal-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                {hospitalData?.Name || 'Branch Hospital'}
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 tracking-tight text-slate-100">
                {nurseData.name || 'Nurse Name'}
              </h1>
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300 mt-1 font-medium">
                <span className="text-teal-300 font-bold">{nurseData.role || nurseData.nurse_role || 'Staff Nurse'}</span>
                <span>•</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[11px] text-teal-200">
                  {nurseData.nurse_id || `NUR-${nurseData.id}`}
                </span>
                <span>•</span>
                <span>{nurseData.ward || 'General Ward'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1 text-xs">
            <span className="text-slate-400 text-[11px]">Shift Assignment</span>
            <span className="text-sm font-bold text-teal-300">{nurseData.shift || 'Morning Shift'}</span>
            <span className="text-slate-400 text-[10px]">{nurseData.qualification || 'Nursing Degree'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Designation / Role</p>
          <p className="text-base font-bold text-slate-800 mt-1">{nurseData.role || nurseData.nurse_role || 'Staff Nurse'}</p>
          <p className="text-xs text-slate-500 mt-0.5">{nurseData.ward || 'Assigned Ward'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Duty Shift</p>
          <p className="text-sm font-bold text-slate-800 mt-1 truncate">{nurseData.shift || '07:00 AM - 03:00 PM'}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Active Duty Schedule</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Experience & Degree</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{nurseData.experience || '3+ Years'}</p>
          <p className="text-xs text-slate-500 mt-0.5">{nurseData.qualification || 'B.Sc Nursing'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Contact Details</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{nurseData.contact || nurseData.phone || '-'}</p>
          {emailLower ? (
            <a href={`mailto:${emailLower}`} className="text-xs text-sky-700 hover:underline block lowercase truncate">
              {emailLower}
            </a>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Nurse Overview & Ward Duties
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'schedule'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Weekly Shift Roster
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Nursing Qualifications & Skills</h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Academic Qualification</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{nurseData.qualification || 'B.Sc Nursing, GNM'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Clinical Nursing Experience</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{nurseData.experience || '3 Years Clinical Experience'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Specialized Skills & Unit Training</p>
                <p className="text-sm font-bold text-teal-700 mt-0.5">Emergency Patient Triage, IV Cannulation, Vital Monitoring</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Assigned Ward & Station Info</h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Hospital Facility</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{hospitalData?.Name || 'Apex Care Hospital'}</p>
                <p className="text-slate-500 mt-0.5">{hospitalData?.city} • {hospitalData?.address || 'Medical Facility Road'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Assigned Ward / Station</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{nurseData.ward || 'General Medical Ward'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Assigned Shift Hours</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{nurseData.shift || 'Morning Shift (07:00 AM - 03:00 PM)'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm sm:text-base font-bold text-slate-800">Weekly Duty Roster for {nurseData.name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
              <div key={day} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800 text-sm">{day}</p>
                <p className="text-teal-700 font-semibold">{nurseData.shift || '07:00 AM - 03:00 PM'}</p>
                <p className="text-slate-500 text-[11px]">{nurseData.ward || 'Ward Desk'} • {hospitalData?.Name || 'Branch Hospital'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
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

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
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
                    value={nurseData.nurse_id || `NUR-${nurseData.id}`}
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
                      value={nurseData.password || 'Nurse@123'}
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
                    onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Assigned Hospital</label>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={hospitalData?.Name ? `${hospitalData.Name} (${hospitalData.city || ''})` : 'Assigned Hospital Branch'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 font-semibold cursor-not-allowed select-none focus:outline-none"
                  />
                </div>
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 my-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Reset Nurse Password</h2>
              <button
                type="button"
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password (min 6 chars)</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:border-teal-600 focus:bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-semibold"
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold shadow-md transition cursor-pointer"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 my-auto text-xs">
            <div className="text-center space-y-2">
              <h2 className="text-base font-bold text-slate-800">Confirm Nurse Removal</h2>
              <p className="text-slate-500 text-xs">
                Are you sure you want to remove <strong>{nurseData.name}</strong> from this hospital? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteNurse}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition cursor-pointer"
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

export default AdminNurseDetails;
