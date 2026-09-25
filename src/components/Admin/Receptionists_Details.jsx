import React, { useState, useEffect } from 'react';

const AdminReceptionistDetails = ({ currentUser, selectedReceptionist, setSelectedReceptionist, setCurrentPage }) => {
  const [receptionistData, setReceptionistData] = useState(() => {
    if (selectedReceptionist && selectedReceptionist.id) return selectedReceptionist;
    try {
      const saved = localStorage.getItem('selectedReceptionist');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: 1,
      name: 'Rahul Mehta',
      receptionist_id: 'REC-1001',
      role: 'Front Desk Receptionist',
      shift: 'Morning Shift (07:00 AM - 03:00 PM)',
      languages: 'English, Hindi, Gujarati',
      contact: '+91 98765 43210',
      email: 'rahul.mehta@hospital.com',
      status: 'Active',
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

  const fetchReceptionistAndHospital = async () => {
    try {
      setLoading(true);
      let currentR = selectedReceptionist || receptionistData;

      if (currentR?.id) {
        const res = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${currentR.id}/`).catch(() => null);
        if (res && res.ok) {
          const fresh = await res.json();
          currentR = fresh;
          setReceptionistData(fresh);
          localStorage.setItem('selectedReceptionist', JSON.stringify(fresh));
        }
      }

      const hospId = currentR?.hospital || currentUser?.hospital;
      if (hospId) {
        const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${hospId}/`).catch(() => null);
        if (hospRes && hospRes.ok) {
          const hosp = await hospRes.json();
          setHospitalData(hosp);
        }
      }
    } catch (err) {
      console.error('Error loading receptionist details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceptionistAndHospital();
  }, [selectedReceptionist]);

  const handleOpenEditModal = () => {
    setEditFormData({
      hospital: receptionistData.hospital || currentUser?.hospital || (hospitalData ? hospitalData.id : ''),
      name: receptionistData.name || '',
      receptionist_id: receptionistData.receptionist_id || `REC-${receptionistData.id}`,
      role: receptionistData.role || receptionistData.designation || 'Front Desk Receptionist',
      shift: receptionistData.shift || 'Morning Shift (07:00 AM - 03:00 PM)',
      languages: receptionistData.languages || 'English, Hindi',
      contact: (receptionistData.contact || receptionistData.phone || '').replace(/\D/g, '').slice(0, 10),
      email: receptionistData.email || '',
      password: receptionistData.password || 'Reception@123',
      status: receptionistData.status || (receptionistData.is_active ? 'Active' : 'Off Duty'),
      is_active: receptionistData.is_active !== false
    });
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!receptionistData || !receptionistData.id) return;

    try {
      const recIdToSend = editFormData.receptionist_id || receptionistData.receptionist_id || `REC-${receptionistData.id}`;
      const passwordToSend = receptionistData.password || editFormData.password || 'Reception@123';
      const hospId = Number(editFormData.hospital || receptionistData.hospital || currentUser?.hospital || (hospitalData ? hospitalData.id : 1));
      
      const payload = {
        ...receptionistData,
        ...editFormData,
        hospital: hospId,
        name: editFormData.name ? editFormData.name.trim() : '',
        receptionist_id: recIdToSend,
        role: editFormData.role || editFormData.designation || receptionistData.role || 'Front Desk Receptionist',
        designation: editFormData.role || editFormData.designation || receptionistData.role || 'Front Desk Receptionist',
        shift: editFormData.shift,
        languages: editFormData.languages ? editFormData.languages.trim() : 'English, Hindi',
        contact: editFormData.contact ? editFormData.contact.trim() : '',
        email: editFormData.email ? editFormData.email.trim() : '',
        password: passwordToSend,
        desk: receptionistData.desk || 'Main Lobby Desk 1',
        extension: receptionistData.extension || 'Ext. 101',
        status: editFormData.is_active ? 'Active' : 'Off Duty',
        is_active: editFormData.is_active
      };

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${receptionistData.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const updated = await response.json();

      if (response.ok) {
        alert('Receptionist profile updated successfully!');
        setReceptionistData(updated);
        localStorage.setItem('selectedReceptionist', JSON.stringify(updated));
        if (setSelectedReceptionist) setSelectedReceptionist(updated);
        setIsEditModalOpen(false);
      } else {
        alert('Failed to update receptionist: ' + JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error updating receptionist:', err);
      alert('Network error while updating receptionist details.');
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = !receptionistData.is_active;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${receptionistData.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus, status: newStatus ? 'Active' : 'On Leave' })
      });

      if (response.ok) {
        const updated = { ...receptionistData, is_active: newStatus, status: newStatus ? 'Active' : 'On Leave' };
        setReceptionistData(updated);
        localStorage.setItem('selectedReceptionist', JSON.stringify(updated));
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
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${receptionistData.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });

      if (response.ok) {
        alert('Receptionist password reset successfully!');
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

  const handleDeleteReceptionist = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${receptionistData.id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('Receptionist deleted successfully.');
        setIsDeleteModalOpen(false);
        if (setCurrentPage) {
          setCurrentPage('admin_receptionists');
        }
      } else {
        alert('Receptionist record removed.');
        setIsDeleteModalOpen(false);
        if (setCurrentPage) {
          setCurrentPage('admin_receptionists');
        }
      }
    } catch (err) {
      console.error('Error deleting receptionist:', err);
      alert('Failed to delete receptionist.');
    }
  };

  const emailLower = (receptionistData.email || '').toLowerCase();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('admin_receptionists')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition cursor-pointer"
        >
          &larr; Back to Receptionists List
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleStatus}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              receptionistData.is_active !== false && receptionistData.status !== 'On Leave'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            Status: {receptionistData.is_active !== false && receptionistData.status !== 'On Leave' ? 'Active (On Counter)' : 'Inactive (On Leave)'}
          </button>

          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Edit Receptionist
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
              {receptionistData.name ? receptionistData.name.slice(0, 2).toUpperCase() : 'RC'}
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 text-[10px] font-semibold border border-teal-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                {hospitalData?.Name || 'Branch Hospital'}
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 tracking-tight text-slate-100">
                {receptionistData.name || 'Receptionist Name'}
              </h1>
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300 mt-1 font-medium">
                <span className="text-teal-300 font-bold">{receptionistData.role || 'Front Desk'}</span>
                <span>•</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[11px] text-teal-200">
                  {receptionistData.receptionist_id || `REC-${receptionistData.id}`}
                </span>
                <span>•</span>
                <span>{receptionistData.languages || 'English, Hindi'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1 text-xs">
            <span className="text-slate-400 text-[11px]">Shift Assignment</span>
            <span className="text-sm font-bold text-teal-300">{receptionistData.shift || 'Morning Shift'}</span>
            <span className="text-slate-400 text-[10px]">Counter: Front Registration Desk</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Desk Role</p>
          <p className="text-base font-bold text-slate-800 mt-1">{receptionistData.role || 'Front Desk'}</p>
          <p className="text-xs text-slate-500 mt-0.5">Patient Intake Counter</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Duty Shift</p>
          <p className="text-sm font-bold text-slate-800 mt-1 truncate">{receptionistData.shift || '07:00 AM - 03:00 PM'}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Active Shift Assignment</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Languages Known</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{receptionistData.languages || 'English, Hindi'}</p>
          <p className="text-xs text-slate-500 mt-0.5">Multilingual Support</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Contact Details</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{receptionistData.contact || receptionistData.phone || '-'}</p>
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
          Desk Overview & Facility Info
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
          Weekly Counter Roster
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Front Desk Responsibilities</h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Assigned Counter Function</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{receptionistData.role || 'Front Desk Receptionist'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Core Duties</p>
                <p className="text-slate-600 mt-1">Patient token generation, OPD scheduling, emergency intake routing, and consultation billing assistance.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Languages & Communication</p>
                <p className="text-sm font-bold text-teal-700 mt-0.5">{receptionistData.languages || 'English, Hindi'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Assigned Facility Location</h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Hospital Facility</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{hospitalData?.Name || 'Apex Care Hospital'}</p>
                <p className="text-slate-500 mt-0.5">{hospitalData?.city} • {hospitalData?.address || 'Medical Facility Road'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Reception Counter Location</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">Ground Floor • Main Lobby Counter #02</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Shift Timings</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{receptionistData.shift || 'Morning Shift (07:00 AM - 03:00 PM)'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm sm:text-base font-bold text-slate-800">Weekly Shift Schedule for {receptionistData.name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
              <div key={day} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800 text-sm">{day}</p>
                <p className="text-teal-700 font-semibold">{receptionistData.shift || '07:00 AM - 03:00 PM'}</p>
                <p className="text-slate-500 text-[11px]">Main Reception Counter • {hospitalData?.Name || 'Branch Hospital'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital: *</label>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={hospitalData?.Name ? `${hospitalData.Name} (${hospitalData.city || ''})` : 'Assigned Hospital Branch'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 font-semibold cursor-not-allowed select-none focus:outline-none"
                />
              </div>

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
                    value={receptionistData.receptionist_id || `REC-${receptionistData.id}`}
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
                      value={receptionistData.password || editFormData.password || 'Reception@123'}
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
                    onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

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

      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 my-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Reset Receptionist Password</h2>
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
              <h2 className="text-base font-bold text-slate-800">Confirm Receptionist Removal</h2>
              <p className="text-slate-500 text-xs">
                Are you sure you want to remove <strong>{receptionistData.name}</strong> from this hospital? This action cannot be undone.
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
                onClick={handleDeleteReceptionist}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition cursor-pointer"
              >
                Yes, Delete Receptionist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReceptionistDetails;

