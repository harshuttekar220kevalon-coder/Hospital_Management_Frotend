import React, { useState, useEffect } from 'react';

const Hospital = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(6);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [detailHospital, setDetailHospital] = useState(null);
  const [deleteHospitalTarget, setDeleteHospitalTarget] = useState(null);

  const [formData, setFormData] = useState({
    Name: '',
    city: '',
    area: '',
    address: '',
    contact: '',
    email: '',
    is_active: true
  });

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/');
      if (response.ok) {
        const data = await response.json();
        setHospitals(data);
      } else {
        alert('Failed to fetch hospitals from backend.');
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Backend server se connect nahi ho paya.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    setVisibleCount(6);
  }, [searchTerm, statusFilter, cityFilter]);

  const citiesList = Array.from(new Set(hospitals.map(h => h.city)));

  const totalHospitalsCount = hospitals.length;
  const activeHospitalsCount = hospitals.filter(h => h.is_active).length;
  const inactiveHospitalsCount = hospitals.filter(h => !h.is_active).length;

  const filteredHospitals = hospitals.filter(h => {
    const matchesSearch =
      h.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.Branch_Code && h.Branch_Code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      h.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'Active'
        ? h.is_active === true
        : h.is_active === false;

    const matchesCity = cityFilter === 'ALL' ? true : h.city === cityFilter;

    return matchesSearch && matchesStatus && matchesCity;
  });

  const handleOpenAddModal = () => {
    setFormData({
      Name: '',
      city: '',
      area: '',
      address: '',
      contact: '',
      email: '',
      is_active: true
    });
    setIsAddModalOpen(true);
  };

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Hospital branch added successfully!');
        setIsAddModalOpen(false);
        fetchHospitals();
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error creating hospital:', error);
      alert('Network error while saving hospital.');
    }
  };

  const handleOpenEditModal = (hosp) => {
    setSelectedHospital(hosp);
    setFormData({
      Name: hosp.Name,
      city: hosp.city,
      area: hosp.area,
      address: hosp.address,
      contact: hosp.contact,
      email: hosp.email,
      is_active: hosp.is_active
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateHospital = async (e) => {
    e.preventDefault();
    if (!selectedHospital) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${selectedHospital.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Hospital branch updated successfully!');
        setIsEditModalOpen(false);
        fetchHospitals();
        if (detailHospital && detailHospital.id === selectedHospital.id) {
          setDetailHospital(data);
        }
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error updating hospital:', error);
      alert('Network error while updating hospital.');
    }
  };

  const handleToggleStatus = async (hosp) => {
    try {
      const updatedData = { ...hosp, is_active: !hosp.is_active };
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${hosp.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        fetchHospitals();
        if (detailHospital && detailHospital.id === hosp.id) {
          const freshData = await response.json();
          setDetailHospital(freshData);
        }
      } else {
        alert('Failed to update status.');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDeleteHospital = async (id) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${id}/`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        alert('Hospital deleted successfully from backend.');
        setHospitals(hospitals.filter(h => h.id !== id));
        if (detailHospital && detailHospital.id === id) {
          setDetailHospital(null);
        }
        setDeleteHospitalTarget(null);
      } else {
        alert('Failed to delete hospital.');
      }
    } catch (error) {
      console.error('Error deleting hospital:', error);
      alert('Network error while deleting.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-800">
            Hospital Branches & Network Management
          </h1>
        </div>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition duration-150 cursor-pointer w-full sm:w-auto shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Add New Hospital Branch
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">
            <span>Total Branches</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalHospitalsCount}</h3>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">
            <span>Active & Operational</span>
          </div>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">{activeHospitalsCount}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{inactiveHospitalsCount} Inactive</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Hear"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50/50 text-xs text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white transition"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-purple-600 cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-purple-600 cursor-pointer"
          >
            <option value="ALL">All Cities</option>
            {citiesList.map((city, idx) => (
              <option key={idx} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <p className="text-center py-8 text-xs text-slate-500">Loading hospitals from backend...</p>
          ) : filteredHospitals.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No hospital branches found.</p>
          ) : (
            <table className="w-full text-center text-xs text-slate-600 min-w-[640px]">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-3 sm:px-4 text-center">Branch Code</th>
                  <th className="py-3.5 px-3 sm:px-4 text-center">Hospital Name</th>
                  <th className="py-3.5 px-3 sm:px-4 text-center">City / Area</th>
                  <th className="py-3.5 px-3 sm:px-4 text-center">Contact & Email</th>
                  <th className="py-3.5 px-3 sm:px-4 text-center">Operational Status</th>
                  <th className="py-3.5 px-3 sm:px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHospitals.slice(0, visibleCount).map((hosp) => (
                  <tr key={hosp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 sm:px-4 font-mono font-bold text-purple-700 text-center">{hosp.Branch_Code || 'N/A'}</td>
                    <td className="py-3 px-3 sm:px-4 font-semibold text-slate-800 text-center">{hosp.Name}</td>
                    <td className="py-3 px-3 sm:px-4 text-center">{hosp.city} ({hosp.area})</td>
                    <td className="py-3 px-3 sm:px-4 text-center">
                      <p className="font-medium text-slate-700">{hosp.contact}</p>
                      <p className="text-slate-400 text-[10px]">{hosp.email}</p>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(hosp)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                          hosp.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {hosp.is_active ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailHospital(hosp)}
                          className="px-2 sm:px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white font-semibold text-[10px] sm:text-[11px] transition cursor-pointer"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(hosp)}
                          className="px-2 sm:px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-semibold text-[10px] sm:text-[11px] transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteHospitalTarget(hosp)}
                          className="px-2 sm:px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white font-semibold text-[10px] sm:text-[11px] transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {visibleCount < filteredHospitals.length && (
          <div className="p-4 text-center border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 6)}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More
            </button>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Add New Hospital Branch</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateHospital} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Name</label>
                <input
                  type="text"
                  required
                  value={formData.Name}
                  onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                  placeholder="e.g. Apex Multi-Specialty Centre"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Surat"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Area / Locality</label>
                  <input
                    type="text"
                    required
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="e.g. Adajan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Complete Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address with PIN code"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone</label>
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
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="branch@hospital.org"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="addActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <label htmlFor="addActive" className="font-semibold text-slate-700 cursor-pointer">
                  Mark as Active & Operational
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
                  Save Hospital Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedHospital && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Edit Hospital Branch</h2>
                <p className="text-xs text-slate-400">Branch Code: {selectedHospital.Branch_Code}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateHospital} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Name</label>
                <input
                  type="text"
                  required
                  value={formData.Name}
                  onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Area / Locality</label>
                  <input
                    type="text"
                    required
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Complete Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <label htmlFor="editActive" className="font-semibold text-slate-700 cursor-pointer">
                  Mark as Active & Operational
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
                  Update Hospital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailHospital && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 my-auto">
            <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-100">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
                    {detailHospital.Branch_Code}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    detailHospital.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {detailHospital.is_active ? '● Operational' : '○ Inactive'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 mt-2">{detailHospital.Name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">📍 {detailHospital.address}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailHospital(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">City / Area</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{detailHospital.city} / {detailHospital.area}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Contact Details</p>
                <p className="text-sm font-bold text-purple-700 mt-0.5">{detailHospital.contact}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 col-span-1 sm:col-span-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Official Email</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5 break-all">{detailHospital.email}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-4 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  const target = detailHospital;
                  setDetailHospital(null);
                  handleOpenEditModal(target);
                }}
                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold cursor-pointer border border-blue-200 text-center"
              >
                Edit Hospital Information
              </button>
              <button
                type="button"
                onClick={() => setDetailHospital(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold cursor-pointer text-center"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteHospitalTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl mx-auto border border-rose-200">
              ⚠️
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800">Delete Hospital Branch?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-700">{deleteHospitalTarget.Name}</span> ({deleteHospitalTarget.Branch_Code})? This will permanently remove it from PostgreSQL.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteHospitalTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteHospital(deleteHospitalTarget.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
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

export default Hospital;