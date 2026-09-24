import React, { useState, useEffect } from 'react';

const Nurses = ({ currentUser, setCurrentPage, setSelectedNurse }) => {
  const [nurses, setNurses] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, shiftFilter, hospitalFilter, statusFilter]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);

  const generateNurseId = () => `NUR-${Math.floor(1000 + Math.random() * 9000)}`;

  const initialFormState = {
    nurse_id: '',
    name: '',
    nurse_role: 'Staff Nurse',
    ward: 'General Ward',
    shift: 'Morning',
    qualification: '',
    experience: '',
    contact: '',
    email: '',
    password: '',
    hospital: '',
    status: 'On Duty',
    is_active: true
  };

  const [formData, setFormData] = useState(initialFormState);

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
    const fullName = (nurse.name || `${nurse.first_name || ''} ${nurse.last_name || ''}`).toLowerCase();
    const contact = (nurse.contact || nurse.phone_number || '').toLowerCase();

    const matchesSearch =
      fullName.includes(term) ||
      (nurse.nurse_id || '').toLowerCase().includes(term) ||
      (nurse.nurse_role || nurse.role || '').toLowerCase().includes(term) ||
      (nurse.ward || '').toLowerCase().includes(term) ||
      (nurse.shift || '').toLowerCase().includes(term) ||
      contact.includes(term) ||
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
    setFormData({
      ...initialFormState,
      nurse_id: '',
      password: ''
    });
    setShowAddPassword(false);
    setIsAddModalOpen(true);
  };

  const handleCreateNurse = async (e) => {
    e.preventDefault();
    try {
      const generatedNurseId = generateNurseId();
      const payload = {
        ...formData,
        name: formData.name.trim(),
        nurse_id: generatedNurseId,
        contact: formData.contact.trim(),
        password: formData.password || '',
        hospital: formData.hospital ? Number(formData.hospital) : null
      };

      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Nurses/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        const createdId = data.nurse_id || generatedNurseId;
        alert(`Nurse registered successfully!\nNurse ID: ${createdId}`);
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

  const handleViewNurseDetails = (nurse) => {
    if (setSelectedNurse) {
      setSelectedNurse(nurse);
    }
    try {
      localStorage.setItem('selectedNurse', JSON.stringify(nurse));
    } catch (err) {
      console.error('Error storing selectedNurse:', err);
    }
    if (setCurrentPage) {
      setCurrentPage('nurse_details');
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
                Nursing Staff Registry
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                {activeNursesCount} Active On Duty
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                {inactiveNursesCount} Inactive
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">
              Nurses & Clinical Care Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Staff nurse registrations, duty shifts, ward allocations, and branch assignments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span> Register New Nurse
          </button>
        </div>
      </div>

      {/* TOP SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Nurses</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1">{totalNursesCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Registered staff</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active & On Duty</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">{activeNursesCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{inactiveNursesCount} Inactive</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital Assigned</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-700 mt-1">{assignedNursesCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Deployed in Wards</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unassigned</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-1">{totalNursesCount - assignedNursesCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Available for Branch Assignment</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by nurse name, ID, role, ward, hospital, or phone..."
            className="w-full pl-3 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-semibold focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">All Shifts</option>
            <option value="Morning">Morning Shift</option>
            <option value="Evening">Evening Shift</option>
            <option value="Night">Night Shift</option>
          </select>

          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-semibold focus:outline-none focus:border-sky-600 cursor-pointer"
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
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-semibold focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
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
                className="mt-3 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
              >
                + Register Nurse Now
              </button>
            </div>
          ) : (
            <table className="w-full text-center text-xs text-slate-600 min-w-[760px]">
              <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 text-center">Nurse ID</th>
                  <th className="py-3.5 px-4 text-center">Role</th>
                  <th className="py-3.5 px-4 text-center">Assigned Hospital</th>
                  <th className="py-3.5 px-4 text-center">Ward</th>
                  <th className="py-3.5 px-4 text-center">Email</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNurses.slice(0, visibleCount).map((nurse) => {
                  const hospId = Number(typeof nurse.hospital === 'object' ? nurse.hospital?.id : nurse.hospital);
                  const assignedHosp = hospitalsList.find(h => h.id === hospId) || hospitalsList.find(h => h.id === Number(nurse.hospital));

                  return (
                    <tr key={nurse.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-xs text-sky-700 font-bold bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 inline-block">
                          {nurse.nurse_id || `NUR-${nurse.id}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-slate-800 text-xs">
                          {nurse.nurse_role || nurse.role || 'Staff Nurse'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {assignedHosp || (nurse.hospital_name && !/^\d+$/.test(nurse.hospital_name)) ? (
                          <span className="font-semibold text-slate-800">
                            {assignedHosp ? assignedHosp.Name : nurse.hospital_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium text-xs">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-medium text-slate-700 text-xs">{nurse.ward || 'General Ward'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <p className="font-medium text-sky-700 truncate max-w-[180px] mx-auto">{nurse.email || '-'}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${nurse.is_active !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                        >
                          {nurse.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewNurseDetails(nurse)}
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

        {visibleCount < filteredNurses.length && (
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
              {/* ROW 1: NURSE FULL NAME & OFFICIAL EMAIL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Nurse Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Mary Joseph"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* ROW 2: CONTACT PHONE & SIGNIN PASSWORD */}
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
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Signin Password *</label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter signin password"
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      title={showAddPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAddPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* ROW 3: ROLE / DESIGNATION & NURSE ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Role / Designation *</label>
                  <select
                    required
                    value={formData.nurse_role}
                    onChange={(e) => setFormData({ ...formData, nurse_role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-medium cursor-pointer"
                  >
                    <option value="Staff Nurse">Staff Nurse</option>
                    <option value="Head Nurse">Head Nurse</option>
                    <option value="ICU Nurse">ICU Nurse</option>
                    <option value="Emergency Nurse">Emergency Nurse</option>
                    <option value="OT Nurse">OT Nurse</option>
                    <option value="Ward Nurse">Ward Nurse</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 uppercase">Nurse ID</label>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      Auto-Generated
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value="Auto-Generated upon creation"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-500 italic font-medium cursor-not-allowed select-none focus:outline-none"
                  />
                </div>
              </div>

              {/* ROW 4: ASSIGNED WARD & SHIFT TIMING */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Assigned Ward *</label>
                  <select
                    required
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-medium cursor-pointer"
                  >
                    <option value="General Ward">General Ward</option>
                    <option value="ICU">ICU</option>
                    <option value="NICU">NICU</option>
                    <option value="Emergency Ward">Emergency Ward</option>
                    <option value="Operation Theatre">Operation Theatre</option>
                    <option value="OPD">OPD</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Shift Timing *</label>
                  <select
                    required
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-medium cursor-pointer"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                    <option value="Rotating">Rotating</option>
                  </select>
                </div>
              </div>

              {/* ROW 5: QUALIFICATIONS & EXPERIENCE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Qualifications</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="e.g. GNM, B.Sc Nursing"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Experience</label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="e.g. 5 Years"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* ROW 6: ASSIGN HOSPITAL BRANCH */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Hospital Branch</label>
                <select
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
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

              {/* ROW 7: ACTIVE CHECKBOX */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="nurseActiveCreate"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer"
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
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md cursor-pointer transition"
                >
                  Register Nurse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nurses;