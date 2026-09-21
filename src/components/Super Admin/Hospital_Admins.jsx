import React, { useState, useEffect } from 'react';

const Hospital_Admins = ({ currentUser, setCurrentPage }) => {
  const [admins, setAdmins] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [detailAdmin, setDetailAdmin] = useState(null);
  const [deleteAdminTarget, setDeleteAdminTarget] = useState(null);

  const initialFormState = {
    name: '',
    email: '',
    contact: '',
    emergency_contact: '',
    designation: 'Hospital Administrator',
    qualification: '',
    experience: '',
    office: '',
    hospital: '',
    is_active: true,
    responsibilities: ''
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

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/');
      if (response.ok) {
        const data = await response.json();
        setAdmins(data);
      } else {
        alert('Failed to fetch hospital admins from backend.');
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
    fetchAdmins();
  }, []);

  const totalAdminsCount = admins.length;
  const activeAdminsCount = admins.filter(a => a.is_active).length;
  const inactiveAdminsCount = admins.filter(a => !a.is_active).length;
  const assignedAdminsCount = admins.filter(a => a.hospital).length;
  const unassignedAdminsCount = totalAdminsCount - assignedAdminsCount;

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch =
      (admin.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (admin.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (admin.contact || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (admin.designation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (admin.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (admin.hospital_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'Active'
        ? admin.is_active === true
        : admin.is_active === false;

    const matchesHospital =
      hospitalFilter === 'ALL'
        ? true
        : hospitalFilter === 'UNASSIGNED'
        ? !admin.hospital
        : (admin.hospital || '').toString() === hospitalFilter.toString();

    return matchesSearch && matchesStatus && matchesHospital;
  });

  const handleOpenAddModal = () => {
    setFormData(initialFormState);
    setIsAddModalOpen(true);
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      const { employee_id, ...restFormData } = formData;

      const payload = {
        ...restFormData,
        hospital: formData.hospital ? Number(formData.hospital) : null
      };

      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText };
      }

      if (response.ok) {
        alert('Hospital Administrator created successfully.');
        setIsAddModalOpen(false);
        fetchAdmins();
      } else {
        console.error('Backend validation error:', data);
        alert('Backend Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Network error creating admin:', error);
      alert('Network error while saving administrator.');
    }
  };

  const handleOpenEditModal = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name || '',
      email: admin.email || '',
      contact: admin.contact || '',
      emergency_contact: admin.emergency_contact || '',
      designation: admin.designation || '',
      qualification: admin.qualification || '',
      experience: admin.experience || '',
      office: admin.office || '',
      hospital: admin.hospital || '',
      is_active: admin.is_active,
      responsibilities: admin.responsibilities || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    try {
      const payload = {
        ...formData,
        hospital: formData.hospital ? Number(formData.hospital) : null
      };

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${selectedAdmin.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Hospital Administrator updated successfully.');
        setIsEditModalOpen(false);
        fetchAdmins();
        if (detailAdmin && detailAdmin.id === selectedAdmin.id) {
          setDetailAdmin(data);
        }
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      alert('Network error while updating administrator.');
    }
  };

  const handleOpenAssignModal = (admin) => {
    setSelectedAdmin(admin);
    setAssignHospitalId(admin.hospital || '');
    setIsAssignModalOpen(true);
  };

  const handleSaveHospitalAssignment = async () => {
    if (!selectedAdmin) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${selectedAdmin.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital: assignHospitalId ? Number(assignHospitalId) : null })
      });

      if (response.ok) {
        alert('Hospital assignment updated successfully.');
        setIsAssignModalOpen(false);
        fetchAdmins();
      } else {
        alert('Failed to update hospital assignment.');
      }
    } catch (error) {
      console.error('Error assigning hospital:', error);
    }
  };

  const handleToggleStatus = async (admin) => {
    try {
      const updatedStatus = !admin.is_active;
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${admin.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: updatedStatus })
      });

      if (response.ok) {
        fetchAdmins();
        if (detailAdmin && detailAdmin.id === admin.id) {
          const fresh = await response.json();
          setDetailAdmin(fresh);
        }
      } else {
        alert('Failed to update status.');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDeleteAdmin = async (id) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Admins/${id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('Hospital Administrator removed successfully.');
        setAdmins(admins.filter(a => a.id !== id));
        if (detailAdmin && detailAdmin.id === id) setDetailAdmin(null);
        setDeleteAdminTarget(null);
      } else {
        alert('Failed to delete administrator.');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Hospital Administration Management (Backend Synced)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                {activeAdminsCount} Active Admins
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">
              Hospital Administrators Hub
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Create, configure, assign hospital branches, and manage administrative credentials via PostgreSQL.
            </p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-2"
          >
            + Create New Hospital Admin
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Administrators</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalAdminsCount}</h3>
          <p className="text-xs text-slate-500 mt-1">Stored in PostgreSQL DB</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active & Operational</p>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">{activeAdminsCount}</h3>
          <p className="text-xs text-slate-400 mt-1">{inactiveAdminsCount} Deactivated</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned to Branches</p>
          <h3 className="text-2xl font-bold text-indigo-700 mt-1">{assignedAdminsCount}</h3>
          <p className="text-xs text-slate-500 mt-1">Leading Branch Operations</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unassigned Admins</p>
          <h3 className="text-2xl font-bold text-amber-700 mt-1">{unassignedAdminsCount}</h3>
          <p className="text-xs text-slate-400 mt-1">Available for Deployment</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Admin by name, email, designation, or employee ID..."
            className="w-full pl-3 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-purple-600 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active Admins</option>
            <option value="Inactive">Deactivated Admins</option>
          </select>

          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-purple-600 cursor-pointer"
          >
            <option value="ALL">All Hospital Branches</option>
            <option value="UNASSIGNED">Unassigned Only</option>
            {hospitalsList.map((h, idx) => (
              <option key={h.id || idx} value={h.id}>
                {h.Name} ({h.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <p className="text-center py-8 text-xs text-slate-500">Loading administrators from backend...</p>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs font-semibold text-slate-500">No administrators found.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-3 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
              >
                + Create Admin Now
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600 min-w-[760px]">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Admin Name & ID</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Assigned Hospital</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.map((admin) => {
                  const assignedHosp = hospitalsList.find(h => h.id === admin.hospital);
                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800 text-sm">{admin.name}</p>
                        <span className="font-mono text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 mt-0.5 inline-block">
                          {admin.employee_id || 'ADM-N/A'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{admin.designation}</p>
                        <p className="text-slate-400 text-[10px]">{admin.qualification || admin.experience || '-'}</p>
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
                        <p className="font-medium text-slate-700">{admin.contact}</p>
                        <p className="text-slate-400 text-[10px]">{admin.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(admin)}
                          title="Click to toggle active/deactivated status"
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            admin.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {admin.is_active ? 'Active' : 'Deactivated'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(admin)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-semibold text-[11px] transition cursor-pointer border border-indigo-200"
                          >
                            Assign Branch
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(admin)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-semibold text-[11px] transition cursor-pointer border border-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailAdmin(admin)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-[11px] transition cursor-pointer border border-slate-200"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteAdminTarget(admin)}
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
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Create New Hospital Administrator</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Vikram Malhotra"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="admin@hospital.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Hospital Branch</label>
                <select
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 font-medium cursor-pointer"
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
                  id="addAdminActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <label htmlFor="addAdminActive" className="font-semibold text-slate-700 cursor-pointer">
                  Activate Administrator Account Immediately
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
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Create Administrator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedAdmin && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Edit Hospital Administrator</h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateAdmin} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Hospital Branch</label>
                <select
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 font-medium cursor-pointer"
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
                  id="editAdminActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <label htmlFor="editAdminActive" className="font-semibold text-slate-700 cursor-pointer">
                  Account Active & Operational
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
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssignModalOpen && selectedAdmin && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Assign Admin &rarr; Hospital</h2>
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 font-medium focus:outline-none focus:border-purple-600 cursor-pointer"
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

      {detailAdmin && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                  {detailAdmin.employee_id}
                </span>
                <h2 className="text-lg font-bold text-slate-800 mt-2">{detailAdmin.name}</h2>
                <p className="text-xs text-indigo-700 font-semibold">{detailAdmin.designation}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailAdmin(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Hospital</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {hospitalsList.find(h => h.id === detailAdmin.hospital)?.Name || 'Unassigned'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Contact Phone</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailAdmin.contact}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Email</p>
                <p className="font-bold text-slate-800 mt-0.5 break-all">{detailAdmin.email}</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailAdmin(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteAdminTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800">Delete Administrator Account?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-700">{deleteAdminTarget.name}</span> from the database?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setDeleteAdminTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAdmin(deleteAdminTarget.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md cursor-pointer"
              >
                Yes, Delete Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hospital_Admins;