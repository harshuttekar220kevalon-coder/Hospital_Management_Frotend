import React, { useState, useEffect } from 'react';

const Receptionist = ({ currentUser, setCurrentPage }) => {
  const [receptionists, setReceptionists] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedReceptionist, setSelectedReceptionist] = useState(null);
  const [detailReceptionist, setDetailReceptionist] = useState(null);
  const [deleteReceptionistTarget, setDeleteReceptionistTarget] = useState(null);

  const shiftsList = [
    'Morning Shift',
    'Evening Shift',
    'Night Shift',
    'Day Shift (09:00 AM - 05:00 PM)',
    'Rotational Shift'
  ];

  const rolesList = [
    'Front Desk Executive',
    'Senior Receptionist',
    'Emergency Receptionist',
    'OPD Helpdesk Executive',
    'Billing & Admission Desk',
    'Patient Relations Officer',
    'Information Desk Executive'
  ];

  const desksList = [
    'Main Lobby Desk 1',
    'Main Lobby Desk 2',
    'Emergency Reception Desk',
    'OPD Helpdesk Floor 1',
    'OPD Helpdesk Floor 2',
    'Billing & Admission Counter',
    'IPD Reception Desk',
    'Diagnostic & Lab Helpdesk',
    'VIP / Corporate Desk'
  ];

  const initialFormState = {
    name: '',
    receptionist_id: '',
    role: 'Front Desk Executive',
    desk: 'Main Lobby Desk 1',
    shift: 'Morning Shift',
    languages: 'English, Hindi',
    extension: '',
    contact: '',
    email: '',
    status: 'Active',
    is_active: true,
    hospital: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [assignHospitalId, setAssignHospitalId] = useState('');

  const fetchHospitals = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/');
      if (response.ok) {
        const data = await response.json();
        setHospitalsList(data);
      }
    } catch (err) {
      console.error('Error fetching hospitals:', err);
    }
  };

  const fetchReceptionists = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Receptionists/');
      if (response.ok) {
        const data = await response.json();
        setReceptionists(data);
      } else {
        const altResponse = await fetch('http://127.0.0.1:8000/api/super-admin/Receptionist/');
        if (altResponse.ok) {
          const altData = await altResponse.json();
          setReceptionists(altData);
        } else {
          alert('Failed to fetch receptionists from backend.');
        }
      }
    } catch (err) {
      console.error('Error fetching receptionists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
    fetchReceptionists();
  }, []);

  const totalReceptionistsCount = receptionists.length;
  const activeReceptionistsCount = receptionists.filter(r => r.is_active && r.status !== 'On Leave').length;
  const onLeaveCount = receptionists.filter(r => r.status === 'On Leave' || !r.is_active).length;
  const assignedReceptionistsCount = receptionists.filter(r => r.hospital).length;

  const filteredReceptionists = receptionists.filter((rec) => {
    const term = searchTerm.toLowerCase();
    const assignedHosp = hospitalsList.find(h => h.id === rec.hospital);
    const hospName = assignedHosp ? (assignedHosp.Name || '').toLowerCase() : '';

    const matchesSearch =
      (rec.name || '').toLowerCase().includes(term) ||
      (rec.receptionist_id || '').toLowerCase().includes(term) ||
      (rec.role || '').toLowerCase().includes(term) ||
      (rec.desk || '').toLowerCase().includes(term) ||
      (rec.shift || '').toLowerCase().includes(term) ||
      (rec.contact || '').toLowerCase().includes(term) ||
      (rec.email || '').toLowerCase().includes(term) ||
      (rec.languages || '').toLowerCase().includes(term) ||
      (rec.extension || '').toLowerCase().includes(term) ||
      hospName.includes(term);

    const matchesShift =
      shiftFilter === 'ALL'
        ? true
        : (rec.shift || '').toLowerCase().includes(shiftFilter.toLowerCase());

    const matchesHospital =
      hospitalFilter === 'ALL'
        ? true
        : hospitalFilter === 'UNASSIGNED'
        ? !rec.hospital
        : (rec.hospital || '').toString() === hospitalFilter.toString();

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'Active'
        ? rec.is_active === true && rec.status !== 'On Leave'
        : statusFilter === 'On Leave'
        ? rec.status === 'On Leave'
        : rec.is_active === false || rec.status === 'Off Duty';

    return matchesSearch && matchesShift && matchesHospital && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setFormData({
      ...initialFormState,
      receptionist_id: `REC-${Math.floor(1000 + Math.random() * 9000)}`
    });
    setIsAddModalOpen(true);
  };

  const handleCreateReceptionist = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        hospital: formData.hospital ? Number(formData.hospital) : null
      };

      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Receptionists/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Receptionist registered successfully.');
        setIsAddModalOpen(false);
        fetchReceptionists();
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error creating receptionist:', error);
      alert('Network error while saving receptionist profile.');
    }
  };

  const handleOpenEditModal = (rec) => {
    setSelectedReceptionist(rec);
    setFormData({
      name: rec.name || '',
      receptionist_id: rec.receptionist_id || '',
      role: rec.role || 'Front Desk Executive',
      desk: rec.desk || 'Main Lobby Desk 1',
      shift: rec.shift || 'Morning Shift',
      languages: rec.languages || 'English, Hindi',
      extension: rec.extension || '',
      contact: rec.contact || '',
      email: rec.email || '',
      status: rec.status || 'Active',
      is_active: rec.is_active !== false,
      hospital: rec.hospital || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateReceptionist = async (e) => {
    e.preventDefault();
    if (!selectedReceptionist) return;

    try {
      const payload = {
        ...formData,
        hospital: formData.hospital ? Number(formData.hospital) : null
      };

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${selectedReceptionist.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Receptionist profile updated successfully.');
        setIsEditModalOpen(false);
        fetchReceptionists();
        if (detailReceptionist && detailReceptionist.id === selectedReceptionist.id) {
          setDetailReceptionist(data);
        }
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error updating receptionist:', error);
      alert('Network error while updating receptionist.');
    }
  };

  const handleOpenAssignModal = (rec) => {
    setSelectedReceptionist(rec);
    setAssignHospitalId(rec.hospital || '');
    setIsAssignModalOpen(true);
  };

  const handleSaveHospitalAssignment = async () => {
    if (!selectedReceptionist) return;

    try {
      const updatedHospitalId = assignHospitalId ? Number(assignHospitalId) : null;
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${selectedReceptionist.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital: updatedHospitalId })
      });

      if (response.ok) {
        alert('Hospital branch assigned successfully.');
        setIsAssignModalOpen(false);
        fetchReceptionists();
      } else {
        alert('Failed to update hospital assignment.');
      }
    } catch (error) {
      console.error('Error assigning hospital:', error);
    }
  };

  const handleToggleStatus = async (rec) => {
    try {
      const updatedStatus = !rec.is_active;
      const newStatusText = updatedStatus ? 'Active' : 'Off Duty';

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${rec.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: updatedStatus,
          status: newStatusText
        })
      });

      if (response.ok) {
        fetchReceptionists();
        if (detailReceptionist && detailReceptionist.id === rec.id) {
          const fresh = await response.json();
          setDetailReceptionist(fresh);
        }
      } else {
        alert('Failed to update status.');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDeleteReceptionist = async (id) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('Receptionist record removed successfully.');
        setReceptionists(prev => prev.filter(r => r.id !== id));
        if (detailReceptionist && detailReceptionist.id === id) setDetailReceptionist(null);
        setDeleteReceptionistTarget(null);
      } else {
        alert('Failed to delete receptionist record.');
      }
    } catch (error) {
      console.error('Error deleting receptionist:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Front Desk & Reception (PostgreSQL)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                {activeReceptionistsCount} Active on Duty
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">
              Receptionists & Front Desk Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage front desk executives, reception desks, duty shifts, languages, and hospital branch allocations.
            </p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-2"
          >
            + Register Receptionist
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Receptionists</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalReceptionistsCount}</h3>
          <p className="text-xs text-slate-500 mt-1">Stored in PostgreSQL DB</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active & On Desk</p>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">{activeReceptionistsCount}</h3>
          <p className="text-xs text-slate-400 mt-1">{onLeaveCount} On Leave / Off Duty</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital Assigned</p>
          <h3 className="text-2xl font-bold text-indigo-700 mt-1">{assignedReceptionistsCount}</h3>
          <p className="text-xs text-slate-400 mt-1">{totalReceptionistsCount - assignedReceptionistsCount} Unassigned</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lobby & Help Desks</p>
          <h3 className="text-2xl font-bold text-amber-700 mt-1">{desksList.length} Desks</h3>
          <p className="text-xs text-slate-500 mt-1">Main Lobby, Emergency, OPD Counters</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, role, desk, shift, phone, email, or hospital..."
            className="w-full pl-3 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-amber-600 cursor-pointer"
          >
            <option value="ALL">All Duty Shifts</option>
            {shiftsList.map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-amber-600 cursor-pointer"
          >
            <option value="ALL">All Hospital Branches</option>
            <option value="UNASSIGNED">Unassigned Only</option>
            {hospitalsList.map((h) => (
              <option key={h.id} value={h.id}>
                {h.Name} ({h.city})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-amber-600 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Off Duty">Off Duty / Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <p className="text-center py-8 text-xs text-slate-500">Loading receptionists from backend...</p>
          ) : filteredReceptionists.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs font-semibold text-slate-500">No receptionists found matching your criteria.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-3 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
              >
                + Register Receptionist Now
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600 min-w-[880px]">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Receptionist Name & ID</th>
                  <th className="py-3.5 px-4">Role & Languages</th>
                  <th className="py-3.5 px-4">Assigned Hospital</th>
                  <th className="py-3.5 px-4">Desk Location</th>
                  <th className="py-3.5 px-4">Duty Shift</th>
                  <th className="py-3.5 px-4">Contact Phone & Ext</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceptionists.map((rec) => {
                  const assignedHosp = hospitalsList.find(h => h.id === rec.hospital);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800 text-sm">{rec.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {rec.receptionist_id || `REC-${rec.id}`}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block">
                          {rec.role || 'Front Desk Executive'}
                        </span>
                        <p className="text-slate-500 text-[10px] mt-0.5">{rec.languages || 'English, Hindi'}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        {assignedHosp ? (
                          <div>
                            <p className="font-bold text-indigo-700">{assignedHosp.Name}</p>
                            <p className="text-slate-400 text-[10px]">
                              {assignedHosp.Branch_Code ? `${assignedHosp.Branch_Code} • ` : ''}{assignedHosp.city || ''}
                            </p>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{rec.desk || 'Main Lobby Desk'}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-teal-800">{rec.shift || 'Morning Shift'}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-700">{rec.contact}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="truncate max-w-[120px]">{rec.email}</span>
                          {rec.extension && (
                            <span className="font-mono text-slate-600 bg-slate-100 px-1 rounded">
                              {rec.extension}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(rec)}
                          title="Click to toggle status"
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            rec.is_active && rec.status !== 'On Leave'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : rec.status === 'On Leave'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {rec.is_active ? rec.status || 'Active' : 'Off Duty'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(rec)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-semibold text-[11px] transition cursor-pointer border border-indigo-200"
                          >
                            Assign Hospital
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(rec)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-semibold text-[11px] transition cursor-pointer border border-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailReceptionist(rec)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-[11px] transition cursor-pointer border border-slate-200"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteReceptionistTarget(rec)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white font-semibold text-[11px] transition cursor-pointer border border-rose-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Register Front Desk Receptionist</h2>
                <p className="text-xs text-slate-400">Add receptionist credentials, desk assignment, shift, and hospital branch</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateReceptionist} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Receptionist Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Role / Designation *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 font-medium cursor-pointer"
                  >
                    {rolesList.map((r, i) => (
                      <option key={i} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Receptionist ID</label>
                  <input
                    type="text"
                    value={formData.receptionist_id}
                    onChange={(e) => setFormData({ ...formData, receptionist_id: e.target.value })}
                    placeholder="REC-1001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Desk Location *</label>
                  <select
                    required
                    value={formData.desk}
                    onChange={(e) => setFormData({ ...formData, desk: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 font-medium cursor-pointer"
                  >
                    {desksList.map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Duty Shift *</label>
                  <select
                    required
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 font-medium cursor-pointer"
                  >
                    {shiftsList.map((s, i) => (
                      <option key={i} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Languages Spoken</label>
                  <input
                    type="text"
                    value={formData.languages}
                    onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                    placeholder="e.g. English, Hindi, Gujarati"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="+91 98765 00000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="reception@hospital.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Intercom Extension</label>
                  <input
                    type="text"
                    value={formData.extension}
                    onChange={(e) => setFormData({ ...formData, extension: e.target.value })}
                    placeholder="Ext 101"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Hospital Branch</label>
                <select
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Operational Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value, is_active: e.target.value === 'Active' })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 font-medium cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Off Duty">Off Duty</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="recActiveCreate"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked, status: e.target.checked ? 'Active' : 'Off Duty' })}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                  <label htmlFor="recActiveCreate" className="font-semibold text-slate-700 cursor-pointer">
                    Account Active & Available on Desk
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Register Receptionist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedReceptionist && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Edit Receptionist Profile</h2>
                <p className="text-xs text-slate-400">ID: {selectedReceptionist.receptionist_id || selectedReceptionist.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateReceptionist} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Receptionist Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Role / Designation *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 font-medium cursor-pointer"
                  >
                    {rolesList.map((r, i) => (
                      <option key={i} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Receptionist ID</label>
                  <input
                    type="text"
                    value={formData.receptionist_id}
                    onChange={(e) => setFormData({ ...formData, receptionist_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Desk Location *</label>
                  <select
                    required
                    value={formData.desk}
                    onChange={(e) => setFormData({ ...formData, desk: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 font-medium cursor-pointer"
                  >
                    {desksList.map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Duty Shift *</label>
                  <select
                    required
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 font-medium cursor-pointer"
                  >
                    {shiftsList.map((s, i) => (
                      <option key={i} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Languages Spoken</label>
                  <input
                    type="text"
                    value={formData.languages}
                    onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Intercom Extension</label>
                  <input
                    type="text"
                    value={formData.extension}
                    onChange={(e) => setFormData({ ...formData, extension: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Branch Assignment</label>
                <select
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Operational Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value, is_active: e.target.value === 'Active' })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-600 font-medium cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Off Duty">Off Duty</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="recActiveEdit"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked, status: e.target.checked ? 'Active' : 'Off Duty' })}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                  <label htmlFor="recActiveEdit" className="font-semibold text-slate-700 cursor-pointer">
                    Account Active & Available on Desk
                  </label>
                </div>
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
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssignModalOpen && selectedReceptionist && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Assign Receptionist &rarr; Hospital</h2>
                <p className="text-xs text-slate-400">{selectedReceptionist.name} ({selectedReceptionist.role})</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <p className="font-semibold text-slate-700">Current Hospital Branch:</p>
              <p className="text-sm font-bold text-indigo-700 mt-0.5">
                {hospitalsList.find(h => h.id === selectedReceptionist.hospital)?.Name || 'Currently Unassigned'}
              </p>
              <p className="font-semibold text-slate-700 mt-2">Desk Assignment:</p>
              <p className="text-sm font-bold text-amber-800 mt-0.5">
                {selectedReceptionist.desk || 'Main Lobby Desk'}
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 text-xs uppercase mb-1">
                Select Destination Hospital Branch:
              </label>
              <select
                value={assignHospitalId}
                onChange={(e) => setAssignHospitalId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 font-medium focus:outline-none focus:border-amber-600 cursor-pointer"
              >
                <option value="">Unassign / No Hospital Assigned</option>
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
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {detailReceptionist && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                    {detailReceptionist.receptionist_id || `REC-${detailReceptionist.id}`}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                    detailReceptionist.is_active && detailReceptionist.status !== 'On Leave'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : detailReceptionist.status === 'On Leave'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {detailReceptionist.is_active ? detailReceptionist.status || 'Active' : 'Off Duty'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-800 mt-2">{detailReceptionist.name}</h2>
                <p className="text-xs text-indigo-700 font-semibold">{detailReceptionist.role || 'Front Desk Executive'}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailReceptionist(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Hospital</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {hospitalsList.find(h => h.id === detailReceptionist.hospital)?.Name || 'Unassigned'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Desk Location</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailReceptionist.desk || 'Main Lobby'}</p>
                <p className="text-[10px] text-amber-700 font-medium">Ext: {detailReceptionist.extension || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Duty Shift</p>
                <p className="font-bold text-teal-900 mt-0.5">{detailReceptionist.shift || 'Morning Shift'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Languages Known</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailReceptionist.languages || 'English, Hindi'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Contact Phone</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailReceptionist.contact}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Official Email</p>
                <p className="font-bold text-slate-800 mt-0.5 truncate">{detailReceptionist.email}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  const target = detailReceptionist;
                  setDetailReceptionist(null);
                  handleOpenEditModal(target);
                }}
                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold cursor-pointer border border-blue-200"
              >
                Edit Receptionist
              </button>
              <button
                type="button"
                onClick={() => setDetailReceptionist(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteReceptionistTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800">Delete Receptionist Profile?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-700">{deleteReceptionistTarget.name}</span> from the database?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setDeleteReceptionistTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteReceptionist(deleteReceptionistTarget.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md cursor-pointer"
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

export default Receptionist;