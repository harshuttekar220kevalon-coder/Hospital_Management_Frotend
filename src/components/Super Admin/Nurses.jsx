import React, { useState, useEffect } from 'react';

const Nurses = ({ currentUser, setCurrentPage }) => {
  const [nurses, setNurses] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [detailNurse, setDetailNurse] = useState(null);
  const [deleteNurseTarget, setDeleteNurseTarget] = useState(null);

  const initialFormState = {
    name: '',
    role: 'Staff Nurse',
    ward: '',
    shift: 'Morning (08:00 AM - 04:00 PM)',
    qualification: '',
    experience: '',
    contact: '',
    email: '',
    hospital: '',
    status: 'On Duty',
    is_active: true
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
      console.error('Error fetching hospitals list:', err);
    }
  };

  const fetchNurses = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Nurses/');
      if (response.ok) {
        const data = await response.json();
        setNurses(data);
      } else {
        alert('Failed to fetch nurses from backend.');
      }
    } catch (err) {
      console.error('Error fetching nurses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
    fetchNurses();
  }, []);

  const totalNursesCount = nurses.length;
  const activeNursesCount = nurses.filter(n => n.is_active).length;
  const inactiveNursesCount = totalNursesCount - activeNursesCount;
  const assignedNursesCount = nurses.filter(n => n.hospital).length;

  const filteredNurses = nurses.filter((nurse) => {
    const term = searchTerm.toLowerCase();
    const assignedHosp = hospitalsList.find(h => h.id === nurse.hospital);
    const hospName = assignedHosp ? assignedHosp.Name.toLowerCase() : '';

    const matchesSearch =
      (nurse.name || '').toLowerCase().includes(term) ||
      (nurse.nurse_id || '').toLowerCase().includes(term) ||
      (nurse.role || '').toLowerCase().includes(term) ||
      (nurse.ward || '').toLowerCase().includes(term) ||
      (nurse.shift || '').toLowerCase().includes(term) ||
      (nurse.contact || '').toLowerCase().includes(term) ||
      (nurse.email || '').toLowerCase().includes(term) ||
      hospName.includes(term);

    const matchesShift =
      shiftFilter === 'ALL'
        ? true
        : (nurse.shift || '').toLowerCase().includes(shiftFilter.toLowerCase());

    const matchesHospital =
      hospitalFilter === 'ALL'
        ? true
        : hospitalFilter === 'UNASSIGNED'
        ? !nurse.hospital
        : (nurse.hospital || '').toString() === hospitalFilter.toString();

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'Active'
        ? nurse.is_active === true
        : nurse.is_active === false;

    return matchesSearch && matchesShift && matchesHospital && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setFormData(initialFormState);
    setIsAddModalOpen(true);
  };

  const handleCreateNurse = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        hospital: formData.hospital ? Number(formData.hospital) : null
      };

      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Nurses/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Nurse registered successfully.');
        setIsAddModalOpen(false);
        fetchNurses();
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error creating nurse:', error);
      alert('Network error while saving nurse profile.');
    }
  };

  const handleOpenEditModal = (nurse) => {
    setSelectedNurse(nurse);
    setFormData({
      name: nurse.name || '',
      role: nurse.role || 'Staff Nurse',
      ward: nurse.ward || '',
      shift: nurse.shift || 'Morning (08:00 AM - 04:00 PM)',
      qualification: nurse.qualification || '',
      experience: nurse.experience || '',
      contact: nurse.contact || '',
      email: nurse.email || '',
      hospital: nurse.hospital || '',
      status: nurse.status || 'On Duty',
      is_active: nurse.is_active
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateNurse = async (e) => {
    e.preventDefault();
    if (!selectedNurse) return;

    try {
      const payload = {
        ...formData,
        hospital: formData.hospital ? Number(formData.hospital) : null
      };

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${selectedNurse.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Nurse profile updated successfully.');
        setIsEditModalOpen(false);
        fetchNurses();
        if (detailNurse && detailNurse.id === selectedNurse.id) {
          setDetailNurse(data);
        }
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error updating nurse:', error);
      alert('Network error while updating nurse.');
    }
  };

  const handleOpenAssignModal = (nurse) => {
    setSelectedNurse(nurse);
    setAssignHospitalId(nurse.hospital || '');
    setIsAssignModalOpen(true);
  };

  const handleSaveHospitalAssignment = async () => {
    if (!selectedNurse) return;

    try {
      const updatedHospitalId = assignHospitalId ? Number(assignHospitalId) : null;
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${selectedNurse.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital: updatedHospitalId })
      });

      if (response.ok) {
        alert('Hospital branch assignment updated successfully.');
        setIsAssignModalOpen(false);
        fetchNurses();
      } else {
        alert('Failed to update hospital assignment.');
      }
    } catch (error) {
      console.error('Error assigning hospital:', error);
    }
  };

  const handleToggleStatus = async (nurse) => {
    try {
      const updatedStatus = !nurse.is_active;
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${nurse.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: updatedStatus, status: updatedStatus ? 'On Duty' : 'On Leave' })
      });

      if (response.ok) {
        fetchNurses();
        if (detailNurse && detailNurse.id === nurse.id) {
          const fresh = await response.json();
          setDetailNurse(fresh);
        }
      } else {
        alert('Failed to update status.');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDeleteNurse = async (id) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Nurses/${id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('Nurse profile removed successfully.');
        setNurses(nurses.filter(n => n.id !== id));
        if (detailNurse && detailNurse.id === id) setDetailNurse(null);
        setDeleteNurseTarget(null);
      } else {
        alert('Failed to delete nurse.');
      }
    } catch (error) {
      console.error('Error deleting nurse:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Nursing Staff & Ward Roster (PostgreSQL)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                {activeNursesCount} On Duty
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">
              Nurses & Ward Care Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage nursing staff, ward assignments, shift rosters, hospital branch allocations, and duty statuses.
            </p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-2"
          >
            + Register New Nurse
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Nurses</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalNursesCount}</h3>
          <p className="text-xs text-slate-500 mt-1">Stored in PostgreSQL DB</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active & On Duty</p>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">{activeNursesCount}</h3>
          <p className="text-xs text-slate-400 mt-1">{inactiveNursesCount} On Leave / Inactive</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital Assigned</p>
          <h3 className="text-2xl font-bold text-indigo-700 mt-1">{assignedNursesCount}</h3>
          <p className="text-xs text-slate-500 mt-1">Deployed in Wards</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unassigned Staff</p>
          <h3 className="text-2xl font-bold text-amber-700 mt-1">{totalNursesCount - assignedNursesCount}</h3>
          <p className="text-xs text-slate-400 mt-1">Available for Allocation</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by nurse name, ID, role, ward, hospital, or phone..."
            className="w-full pl-3 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="ALL">All Shifts</option>
            <option value="Morning">Morning Shift</option>
            <option value="Evening">Evening Shift</option>
            <option value="Night">Night Shift</option>
          </select>

          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
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
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">On Duty (Active)</option>
            <option value="Inactive">On Leave (Inactive)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <p className="text-center py-8 text-xs text-slate-500">Loading nurses registry from backend...</p>
          ) : filteredNurses.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs font-semibold text-slate-500">No nurses found matching your criteria.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
              >
                + Register Nurse Now
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600 min-w-[850px]">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Nurse Name & ID</th>
                  <th className="py-3.5 px-4">Role & Ward</th>
                  <th className="py-3.5 px-4">Assigned Hospital</th>
                  <th className="py-3.5 px-4">Shift & Contact</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNurses.map((nurse) => {
                  const assignedHosp = hospitalsList.find(h => h.id === nurse.hospital);
                  return (
                    <tr key={nurse.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800 text-sm">{nurse.name}</p>
                        <span className="font-mono text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 mt-0.5 inline-block">
                          {nurse.nurse_id || 'NUR-N/A'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 inline-block">
                          {nurse.role}
                        </span>
                        <p className="text-slate-700 font-semibold text-[11px] mt-0.5">Ward: {nurse.ward}</p>
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
                        <p className="font-semibold text-slate-800">{nurse.shift}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">{nurse.contact} • {nurse.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(nurse)}
                          title="Click to toggle status"
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            nurse.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {nurse.is_active ? 'On Duty' : 'On Leave'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(nurse)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-semibold text-[11px] transition cursor-pointer border border-indigo-200"
                          >
                            Assign Hospital
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(nurse)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-semibold text-[11px] transition cursor-pointer border border-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailNurse(nurse)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-[11px] transition cursor-pointer border border-slate-200"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteNurseTarget(nurse)}
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Register New Nurse</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateNurse} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Nurse Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sister Mary Joseph"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Role / Designation *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white font-medium cursor-pointer"
                  >
                    <option value="Staff Nurse">Staff Nurse</option>
                    <option value="Head Nurse">Head Nurse</option>
                    <option value="ICU Specialist">ICU Specialist</option>
                    <option value="OT Nurse">OT Nurse</option>
                    <option value="Emergency Nurse">Emergency Nurse</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Assigned Ward *</label>
                  <input
                    type="text"
                    required
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    placeholder="e.g. General Ward 2A / ICU Unit 1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Shift Timing *</label>
                  <select
                    required
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white font-medium cursor-pointer"
                  >
                    <option value="Morning (08:00 AM - 04:00 PM)">Morning (08:00 AM - 04:00 PM)</option>
                    <option value="Evening (04:00 PM - 12:00 AM)">Evening (04:00 PM - 12:00 AM)</option>
                    <option value="Night (12:00 AM - 08:00 AM)">Night (12:00 AM - 08:00 AM)</option>
                    <option value="General Shift (09:00 AM - 05:00 PM)">General Shift (09:00 AM - 05:00 PM)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="+91..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nurse@hospital.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Qualifications</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="e.g. GNM, B.Sc Nursing"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Experience</label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="e.g. 5 Years"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Hospital Branch</label>
                <select
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
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
                  id="nurseActiveCreate"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="nurseActiveCreate" className="font-semibold text-slate-700 cursor-pointer">
                  Nurse is Currently On Duty & Active
                </label>
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Register Nurse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedNurse && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
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

            <form onSubmit={handleUpdateNurse} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Nurse Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Role / Designation *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white font-medium cursor-pointer"
                  >
                    <option value="Staff Nurse">Staff Nurse</option>
                    <option value="Head Nurse">Head Nurse</option>
                    <option value="ICU Specialist">ICU Specialist</option>
                    <option value="OT Nurse">OT Nurse</option>
                    <option value="Emergency Nurse">Emergency Nurse</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Assigned Ward *</label>
                  <input
                    type="text"
                    required
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Shift Timing *</label>
                  <select
                    required
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white font-medium cursor-pointer"
                  >
                    <option value="Morning (08:00 AM - 04:00 PM)">Morning (08:00 AM - 04:00 PM)</option>
                    <option value="Evening (04:00 PM - 12:00 AM)">Evening (04:00 PM - 12:00 AM)</option>
                    <option value="Night (12:00 AM - 08:00 AM)">Night (12:00 AM - 08:00 AM)</option>
                    <option value="General Shift (09:00 AM - 05:00 PM)">General Shift (09:00 AM - 05:00 PM)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Hospital Branch</label>
                <select
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
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
                  id="nurseActiveEdit"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="nurseActiveEdit" className="font-semibold text-slate-700 cursor-pointer">
                  Nurse Active & On Duty
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssignModalOpen && selectedNurse && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Assign Nurse &rarr; Hospital</h2>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 text-xs uppercase mb-1">
                Select Destination Hospital Branch:
              </label>
              <select
                value={assignHospitalId}
                onChange={(e) => setAssignHospitalId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
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

      {detailNurse && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                  detailNurse.is_active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {detailNurse.is_active ? 'On Duty' : 'On Leave'}
                </span>
                <h2 className="text-lg font-bold text-slate-800 mt-2">{detailNurse.name}</h2>
                <p className="text-xs text-indigo-700 font-semibold">{detailNurse.role} • Ward: {detailNurse.ward}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailNurse(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Hospital</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {hospitalsList.find(h => h.id === detailNurse.hospital)?.Name || 'Unassigned'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Contact Phone</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailNurse.contact}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Email</p>
                <p className="font-bold text-slate-800 mt-0.5 break-all">{detailNurse.email}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Shift Timing</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailNurse.shift}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Qualifications</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailNurse.qualification || '-'}</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailNurse(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteNurseTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800">Delete Nurse Profile?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-700">{deleteNurseTarget.name}</span> from the database?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setDeleteNurseTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteNurse(deleteNurseTarget.id)}
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

export default Nurses;