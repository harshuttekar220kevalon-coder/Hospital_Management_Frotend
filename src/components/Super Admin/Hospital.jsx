import React, { useState, useEffect } from 'react';

const Hospital = ({ currentUser, setCurrentPage, setSelectedHospital: setSelectedHospitalProp }) => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [detailHospital, setDetailHospital] = useState(null);
  const [deleteHospitalTarget, setDeleteHospitalTarget] = useState(null);


  const handleViewFullDetails = (hosp) => {
    if (setSelectedHospitalProp) {
      setSelectedHospitalProp(hosp);
    }
    if (setCurrentPage) {
      setCurrentPage('hospital_details');
    } else {
      setDetailHospital(hosp);
    }
  };

  const initialFormData = {
    Name: '',
    Branch_Code: '',
    city: '',
    area: '',
    address: '',
    contact: '',
    email: '',
    total_beds: '',
    icu_beds: '',
    nicu_beds: '',
    operation_theatres: '',
    restroom_for_relatives: '',
    ambulances_count: '',
    departments: '',
    is_active: true
  };

  const [formData, setFormData] = useState(initialFormData);

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
    setVisibleCount(10);
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
    setFormData(initialFormData);
    setIsAddModalOpen(true);
  };

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        Name: formData.Name.trim(),
        city: formData.city.trim(),
        area: formData.area.trim(),
        address: formData.address.trim(),
        contact: formData.contact.trim(),
        email: formData.email.trim(),
        total_beds: formData.total_beds !== '' ? Number(formData.total_beds) : 0,
        icu_beds: formData.icu_beds !== '' ? Number(formData.icu_beds) : 0,
        nicu_beds: formData.nicu_beds !== '' ? Number(formData.nicu_beds) : 0,
        operation_theatres: formData.operation_theatres !== '' ? Number(formData.operation_theatres) : 0,
        restroom_for_relatives: formData.restroom_for_relatives !== '' ? Number(formData.restroom_for_relatives) : 0,
        ambulances_count: formData.ambulances_count !== '' ? Number(formData.ambulances_count) : 0,
        departments: (formData.departments || '').trim(),
        is_active: Boolean(formData.is_active)
      };

      if (formData.Branch_Code && formData.Branch_Code.trim()) {
        payload.Branch_Code = formData.Branch_Code.trim();
      }

      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
      Name: hosp.Name || '',
      Branch_Code: hosp.Branch_Code || '',
      city: hosp.city || '',
      area: hosp.area || '',
      address: hosp.address || '',
      contact: hosp.contact || '',
      email: hosp.email || '',
      total_beds: hosp.total_beds !== undefined && hosp.total_beds !== null ? hosp.total_beds : '',
      icu_beds: hosp.icu_beds !== undefined && hosp.icu_beds !== null ? hosp.icu_beds : '',
      nicu_beds: hosp.nicu_beds !== undefined && hosp.nicu_beds !== null ? hosp.nicu_beds : '',
      operation_theatres: hosp.operation_theatres !== undefined && hosp.operation_theatres !== null ? hosp.operation_theatres : '',
      restroom_for_relatives: hosp.restroom_for_relatives !== undefined && hosp.restroom_for_relatives !== null ? hosp.restroom_for_relatives : '',
      ambulances_count: hosp.ambulances_count !== undefined && hosp.ambulances_count !== null ? hosp.ambulances_count : '',
      departments: typeof hosp.departments === 'string'
        ? hosp.departments
        : (Array.isArray(hosp.departments)
            ? hosp.departments.map(d => typeof d === 'string' ? d : (d.name || '')).join(', ')
            : (hosp.department || '')),
      is_active: hosp.is_active !== false
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateHospital = async (e) => {
    e.preventDefault();
    if (!selectedHospital) return;

    try {
      const payload = {
        Name: formData.Name.trim(),
        Branch_Code: formData.Branch_Code.trim(),
        city: formData.city.trim(),
        area: formData.area.trim(),
        address: formData.address.trim(),
        contact: formData.contact.trim(),
        email: formData.email.trim(),
        total_beds: formData.total_beds !== '' ? Number(formData.total_beds) : 0,
        icu_beds: formData.icu_beds !== '' ? Number(formData.icu_beds) : 0,
        nicu_beds: formData.nicu_beds !== '' ? Number(formData.nicu_beds) : 0,
        operation_theatres: formData.operation_theatres !== '' ? Number(formData.operation_theatres) : 0,
        restroom_for_relatives: formData.restroom_for_relatives !== '' ? Number(formData.restroom_for_relatives) : 0,
        ambulances_count: formData.ambulances_count !== '' ? Number(formData.ambulances_count) : 0,
        departments: (formData.departments || '').trim(),
        is_active: Boolean(formData.is_active)
      };

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${selectedHospital.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
    const nextStatus = !hosp.is_active;
    // Optimistically update UI state
    setHospitals(prev => prev.map(h => h.id === hosp.id ? { ...h, is_active: nextStatus } : h));
    if (detailHospital && detailHospital.id === hosp.id) {
      setDetailHospital(prev => ({ ...prev, is_active: nextStatus }));
    }

    try {
      const updatedData = { ...hosp, is_active: nextStatus };
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${hosp.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        const freshData = await response.json().catch(() => null);
        if (freshData) {
          setHospitals(prev => prev.map(h => h.id === hosp.id ? freshData : h));
          if (detailHospital && detailHospital.id === hosp.id) {
            setDetailHospital(freshData);
          }
        }
      } else {
        // Revert on error
        setHospitals(prev => prev.map(h => h.id === hosp.id ? hosp : h));
        if (detailHospital && detailHospital.id === hosp.id) {
          setDetailHospital(hosp);
        }
        alert('Failed to update status.');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      setHospitals(prev => prev.map(h => h.id === hosp.id ? hosp : h));
      if (detailHospital && detailHospital.id === hosp.id) {
        setDetailHospital(hosp);
      }
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
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Hospital Infrastructure & Locations
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                {activeHospitalsCount} Active Branches
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                {inactiveHospitalsCount} Inactive
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">
              Hospital Branches & Network Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live operational surveillance of multi-specialty branches, bed capacities, and administrative centers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span> Add Hospital Branch
          </button>
        </div>
      </div>

      {/* TOP SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Branches</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1">{totalHospitalsCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Healthcare Facilities</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active & Operational</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">{activeHospitalsCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{inactiveHospitalsCount} Inactive Branches</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Bed Capacity</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-sky-700 mt-1">
            {hospitals.reduce((acc, h) => acc + (Number(h.total_beds) || 0), 0)} Beds
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Across all branches</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Covered Cities</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-700 mt-1">{citiesList.length} Cities</h3>
          <p className="text-xs text-slate-400 mt-0.5">Regional Healthcare Reach</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by branch name, code, city, area, or email..."
            className="w-full pl-3 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-semibold focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-semibold focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">All Cities</option>
            {citiesList.map((city, idx) => (
              <option key={idx} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <p className="text-center py-8 text-xs text-slate-500">Loading hospitals from backend...</p>
          ) : filteredHospitals.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No hospital branches found.</p>
          ) : (
            <table className="w-full text-center text-xs text-slate-600 min-w-[760px]">
              <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-3 sm:px-4 text-center">Branch Name & Code</th>
                  <th className="py-3.5 px-3 sm:px-4 text-center">City / Area</th>
                  <th className="py-3.5 px-3 sm:px-4 text-center">CONTACT & EMAIL</th>
                  <th className="py-3.5 px-3 sm:px-4 text-center">Status</th>
                  <th className="py-3.5 px-3 sm:px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHospitals.slice(0, visibleCount).map((hosp) => {
                  const emailLower = (hosp.email || '').toLowerCase();
                  return (
                    <tr key={hosp.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <div className="font-bold text-slate-800 break-words">{hosp.Name}</div>
                        <span className="font-mono text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block mt-0.5">
                          {hosp.Branch_Code || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center font-medium text-slate-700">{hosp.city} ({hosp.area})</td>
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="font-bold text-slate-800 text-xs">
                            {hosp.contact || '-'}
                          </span>
                          {emailLower ? (
                            <a
                              href={`mailto:${emailLower}`}
                              className="text-[11px] text-sky-700 hover:text-sky-900 hover:underline block lowercase transition truncate max-w-[180px]"
                              title="Send email"
                            >
                              {emailLower}
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(hosp)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${hosp.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                        >
                          {hosp.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewFullDetails(hosp)}
                          className="px-3.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white font-bold text-xs transition cursor-pointer border border-sky-200 inline-flex items-center justify-center gap-1"
                        >
                          Details &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {visibleCount < filteredHospitals.length && (
          <div className="p-4 text-center border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More
            </button>
          </div>
        )}
      </div>

      {/* ADD HOSPITAL MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Add New Hospital Branch</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateHospital} className="space-y-4 text-xs">
              {/* Branch Identity */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Name *</label>
                <input
                  type="text"
                  required
                  value={formData.Name}
                  onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                  placeholder="e.g. Apex Multi-Specialty Centre"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              {/* Location & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Surat"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Area *</label>
                  <input
                    type="text"
                    required
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="e.g. Adajan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Street Address *</label>
                <textarea
                  rows="2"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Complete street address with landmark and PIN code"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone (Numbers only) *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="branch@hospital.org"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Infrastructure & Bed Allocation */}
              <div className="pt-2 border-t border-slate-100">
                <p className="font-bold text-slate-800 uppercase tracking-wide text-[11px] mb-2.5">
                  Infrastructure & Bed Capacity
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Total Beds</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.total_beds}
                      onChange={(e) => setFormData({ ...formData, total_beds: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">ICU Beds</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.icu_beds}
                      onChange={(e) => setFormData({ ...formData, icu_beds: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">NICU / General Beds</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.nicu_beds}
                      onChange={(e) => setFormData({ ...formData, nicu_beds: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Operation Theatres</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.operation_theatres}
                      onChange={(e) => setFormData({ ...formData, operation_theatres: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Relatives Restrooms</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.restroom_for_relatives}
                      onChange={(e) => setFormData({ ...formData, restroom_for_relatives: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Ambulances</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.ambulances_count}
                      onChange={(e) => setFormData({ ...formData, ambulances_count: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                </div>
              </div>

              {/* Clinical Departments */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Clinical Departments
                </label>
                <input
                  type="text"
                  value={formData.departments}
                  onChange={(e) => setFormData({ ...formData, departments: e.target.value })}
                  placeholder="Cardiology, Neurology, Orthopedics, Emergency, Pediatrics, Oncology"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="addActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                />
                <label htmlFor="addActive" className="font-semibold text-slate-700 cursor-pointer select-none">
                  Mark as Operational & Active Branch
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md cursor-pointer transition"
                >
                  Save Hospital Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT HOSPITAL MODAL */}
      {isEditModalOpen && selectedHospital && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Edit Hospital Branch Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">Branch Code: {selectedHospital.Branch_Code}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateHospital} className="space-y-4 text-xs">
              {/* Branch Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.Name}
                    onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Branch Code (Permanent)</label>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={formData.Branch_Code || (selectedHospital && selectedHospital.Branch_Code) || `HOSP-${selectedHospital?.id}`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 font-mono text-xs cursor-not-allowed select-none focus:outline-none uppercase"
                  />
                </div>
              </div>

              {/* Location & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Area *</label>
                  <input
                    type="text"
                    required
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Street Address *</label>
                <textarea
                  rows="2"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone (Numbers only) *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Infrastructure & Bed Allocation */}
              <div className="pt-2 border-t border-slate-100">
                <p className="font-bold text-slate-800 uppercase tracking-wide text-[11px] mb-2.5">
                  Infrastructure & Bed Capacity
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Total Beds</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.total_beds}
                      onChange={(e) => setFormData({ ...formData, total_beds: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">ICU Beds</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.icu_beds}
                      onChange={(e) => setFormData({ ...formData, icu_beds: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">NICU / General Beds</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.nicu_beds}
                      onChange={(e) => setFormData({ ...formData, nicu_beds: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Operation Theatres</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.operation_theatres}
                      onChange={(e) => setFormData({ ...formData, operation_theatres: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Relatives Restrooms</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.restroom_for_relatives}
                      onChange={(e) => setFormData({ ...formData, restroom_for_relatives: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Ambulances</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.ambulances_count}
                      onChange={(e) => setFormData({ ...formData, ambulances_count: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                </div>
              </div>

              {/* Clinical Departments */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Clinical Departments
                </label>
                <input
                  type="text"
                  value={formData.departments}
                  onChange={(e) => setFormData({ ...formData, departments: e.target.value })}
                  placeholder="Cardiology, Neurology, Orthopedics, Emergency, Pediatrics, Oncology"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                />
                <label htmlFor="editActive" className="font-semibold text-slate-700 cursor-pointer select-none">
                  Mark as Operational & Active Branch
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md cursor-pointer transition"
                >
                  Update Hospital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL HOSPITAL DRAWER */}
      {detailHospital && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 my-auto">
            <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-100">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
                    {detailHospital.Branch_Code || 'APEX'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${detailHospital.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                    {detailHospital.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 mt-2">{detailHospital.Name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{detailHospital.address}</p>
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
                <p className="text-sm font-bold text-sky-700 mt-0.5">{detailHospital.contact}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 col-span-1 sm:col-span-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Official Email</p>
                {detailHospital.email ? (
                  <p className="mt-0.5 break-all">
                    <a
                      href={`mailto:${detailHospital.email.toLowerCase()}`}
                      className="text-sm font-bold text-sky-600 hover:text-sky-800 hover:underline"
                      title="Send email"
                    >
                      {detailHospital.email.toLowerCase()}
                    </a>
                  </p>
                ) : (
                  <p className="text-sm font-bold text-slate-400 mt-0.5">-</p>
                )}
              </div>
            </div>

            {/* Infrastructure Breakdown */}
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Branch Infrastructure & Bed Metrics
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Total Beds</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{detailHospital.total_beds ?? 100}</p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">ICU</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{detailHospital.icu_beds ?? 10}</p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">NICU</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{detailHospital.nicu_beds ?? 5}</p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">OTs</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{detailHospital.operation_theatres ?? 4}</p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Restrooms</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{detailHospital.restroom_for_relatives ?? 3}</p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Ambulance</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{detailHospital.ambulances_count ?? 2}</p>
                </div>
              </div>

              {detailHospital.departments && (
                <div className="pt-2 border-t border-slate-200/60">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Departments</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    {typeof detailHospital.departments === 'string'
                      ? detailHospital.departments
                      : Array.isArray(detailHospital.departments)
                        ? detailHospital.departments.map(d => typeof d === 'string' ? d : d.name).join(', ')
                        : detailHospital.department || 'General Medicine'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-4 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  const target = detailHospital;
                  setDetailHospital(null);
                  handleViewFullDetails(target);
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 font-semibold cursor-pointer text-center shadow-xs"
              >
                View Full Hospital Details &rarr;
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = detailHospital;
                  setDetailHospital(null);
                  handleOpenEditModal(target);
                }}
                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold cursor-pointer border border-blue-200 text-center"
              >
                Edit Hospital
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