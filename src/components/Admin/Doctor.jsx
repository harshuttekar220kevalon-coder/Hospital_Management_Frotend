import React, { useState, useEffect } from 'react';

const AdminDoctors = ({ currentUser, setCurrentPage, setSelectedDoctor, setSelectedHospital }) => {
  const [doctors, setDoctors] = useState([]);
  const [hospitalData, setHospitalData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);

  const [specializationsList, setSpecializationsList] = useState([]);

  const parseSpecializations = (spec) => {
    if (!spec) return [];
    if (Array.isArray(spec)) {
      return spec
        .flatMap(item => {
          if (typeof item === 'string') return item.split(',');
          if (item?.name && typeof item.name === 'string') return item.name.split(',');
          return [];
        })
        .map(s => s.trim().replace(/^['"\[\]]+|['"\[\]]+$/g, '').trim())
        .filter(Boolean);
    }
    if (typeof spec === 'string') {
      return spec
        .split(',')
        .map(s => s.trim().replace(/^['"\[\]]+|['"\[\]]+$/g, '').trim())
        .filter(Boolean);
    }
    return [];
  };

  const opdTimingsList = [
    'Mon - Fri (10:00 AM - 02:00 PM)',
    'Mon - Fri (02:00 PM - 06:00 PM)',
    'Mon - Sat (09:00 AM - 01:00 PM)',
    'Mon - Sat (05:00 PM - 09:00 PM)',
    'Morning Shift (08:00 AM - 02:00 PM)',
    'Evening Shift (02:00 PM - 08:00 PM)',
    'Full Day (09:00 AM - 05:00 PM)',
    'Night Duty (08:00 PM - 08:00 AM)',
    'Weekend Clinic (Sat - Sun 10:00 AM - 04:00 PM)',
    'Emergency 24x7 On-Call'
  ];

  const initialAddFormState = {
    doctor_id: '',
    name: '',
    specialization: 'Cardiology',
    additional_skills: '',
    department: '',
    qualification: '',
    experience: '',
    consultation_fee: '500',
    opd_timings: 'Mon - Fri (10:00 AM - 02:00 PM)',
    phone: '',
    email: '',
    password: '',
    status: 'Available',
    is_active: true
  };

  const [addFormData, setAddFormData] = useState(initialAddFormState);

  const generateDoctorId = () => `DOC-${Math.floor(1000 + Math.random() * 9000)}`;

  const fetchAdminAndDoctors = async () => {
    try {
      setLoading(true);

      let assignedHospitalId = currentUser?.hospital || null;

      try {
        const adminsRes = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/').catch(() => null);
        if (adminsRes && adminsRes.ok) {
          const adminsList = await adminsRes.json();
          const currentEmail = (currentUser?.email || '').toLowerCase().trim();
          const matchedAdmin = adminsList.find(a => (a.email || '').toLowerCase().trim() === currentEmail);
          if (matchedAdmin && matchedAdmin.hospital) {
            assignedHospitalId = Number(matchedAdmin.hospital);
          }
        }
      } catch (e) {
        console.error('Error fetching admin record:', e);
      }

      if (!assignedHospitalId) {
        try {
          const saved = localStorage.getItem('selectedHospital');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.id) assignedHospitalId = parsed.id;
          }
        } catch {}
      }

      let hosp = null;
      if (assignedHospitalId) {
        const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${assignedHospitalId}/`).catch(() => null);
        if (hospRes && hospRes.ok) {
          hosp = await hospRes.json();
        }
      }

      if (!hosp) {
        const allHospRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/').catch(() => null);
        if (allHospRes && allHospRes.ok) {
          const allHosp = await allHospRes.json();
          hosp = (assignedHospitalId ? allHosp.find(h => Number(h.id) === Number(assignedHospitalId)) : null) || allHosp[0] || null;
          if (hosp) assignedHospitalId = hosp.id;
        }
      }

      if (hosp) {
        setHospitalData(hosp);
        if (setSelectedHospital) setSelectedHospital(hosp);
      }

      const docsRes = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null);
      if (docsRes && docsRes.ok) {
        const allDocs = await docsRes.json();
        
        const dynamicSpecsSet = new Set();
        if (Array.isArray(allDocs)) {
          allDocs.forEach(d => {
            const specs = parseSpecializations(d.specialization || d.specialty);
            specs.forEach(s => dynamicSpecsSet.add(s));
            if (d.department) {
              const deptSpecs = parseSpecializations(d.department);
              deptSpecs.forEach(s => dynamicSpecsSet.add(s));
            }
          });
        }

        if (hosp) {
          const rawDepts = hosp.departments || hosp.department;
          const hospSpecs = parseSpecializations(rawDepts);
          hospSpecs.forEach(s => dynamicSpecsSet.add(s));
        }

        const fallbackSpecs = [
          'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
          'General Medicine', 'General Surgery', 'Obstetrics & Gynecology',
          'Dermatology', 'Oncology', 'ENT', 'Ophthalmology',
          'Psychiatry', 'Pulmonology', 'Nephrology', 'Urology', 'Radiology'
        ];

        const finalSpecs = dynamicSpecsSet.size > 0 
          ? Array.from(dynamicSpecsSet).filter(Boolean).sort()
          : fallbackSpecs;

        setSpecializationsList(finalSpecs);

        if (assignedHospitalId) {
          const branchDocs = allDocs.filter(d => {
            const hospIds = Array.isArray(d.hospitals)
              ? d.hospitals.map(h => Number(typeof h === 'object' ? h.id : h))
              : (d.hospital ? [Number(typeof d.hospital === 'object' ? d.hospital.id : d.hospital)] : []);
            return hospIds.includes(Number(assignedHospitalId));
          });
          setDoctors(branchDocs.length > 0 ? branchDocs : allDocs);
        } else {
          setDoctors(allDocs);
        }
      }
    } catch (err) {
      console.error('Error loading doctors data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminAndDoctors();
  }, [currentUser]);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, specializationFilter, statusFilter]);

  const handleOpenAddModal = () => {
    setAddFormData({
      ...initialAddFormState,
      doctor_id: '',
      password: '',
      department: hospitalData?.departments?.[0] || (specializationsList[0] ? `${specializationsList[0]} Department` : 'General Medicine')
    });
    setShowAddPassword(false);
    setIsAddModalOpen(true);
  };

  const handleAddFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addFormData.name.trim()) {
      alert('Doctor Name is required.');
      return;
    }

    try {
      const generatedDocId = generateDoctorId();
      const payload = {
        ...addFormData,
        role: 'Doctor',
        doctor_id: generatedDocId,
        name: addFormData.name.startsWith('Dr.') ? addFormData.name.trim() : `Dr. ${addFormData.name.trim()}`,
        consultation_fee: Number(addFormData.consultation_fee) || 0.00,
        additional_skills: (addFormData.additional_skills || '').trim(),
        password: addFormData.password || '',
        hospitals: hospitalData?.id ? [Number(hospitalData.id)] : [],
        hospital: hospitalData?.id ? Number(hospitalData.id) : null,
        status: addFormData.is_active ? 'Available' : 'On Leave',
        is_active: addFormData.is_active
      };

      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const createdId = data.doctor_id || generatedDocId;
        alert(`Doctor profile created successfully!\nDoctor ID: ${createdId}`);
        setIsAddModalOpen(false);
        fetchAdminAndDoctors();
      } else {
        alert('Error creating doctor: ' + JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error adding doctor:', err);
      alert('Failed to connect to backend server.');
    }
  };

  const handleToggleStatus = async (doctor) => {
    const newStatus = !doctor.is_active;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${doctor.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus })
      });

      if (response.ok) {
        setDoctors(prev => prev.map(d => d.id === doctor.id ? { ...d, is_active: newStatus } : d));
      } else {
        // Fallback PUT
        const putRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${doctor.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...doctor, is_active: newStatus })
        });
        if (putRes.ok) {
          setDoctors(prev => prev.map(d => d.id === doctor.id ? { ...d, is_active: newStatus } : d));
        }
      }
    } catch (err) {
      console.error('Error toggling doctor status:', err);
    }
  };

  const handleViewDoctorDetails = (doc) => {
    if (setSelectedDoctor) {
      setSelectedDoctor(doc);
    }
    localStorage.setItem('selectedDoctor', JSON.stringify(doc));
    if (setCurrentPage) {
      setCurrentPage('admin_doctor_details');
    }
  };

  const filteredDoctors = doctors.filter(doc => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (doc.name || '').toLowerCase().includes(term) ||
      (doc.doctor_id || '').toLowerCase().includes(term) ||
      (doc.email || '').toLowerCase().includes(term) ||
      (doc.specialization || '').toLowerCase().includes(term);

    const matchesSpec =
      specializationFilter === 'ALL' ||
      parseSpecializations(doc.specialization || doc.specialty || doc.department)
        .some(s => s.toLowerCase() === specializationFilter.toLowerCase()) ||
      (doc.specialization || '').toLowerCase().includes(specializationFilter.toLowerCase()) ||
      (doc.department || '').toLowerCase().includes(specializationFilter.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Active' && doc.is_active !== false) ||
      (statusFilter === 'Inactive' && doc.is_active === false);

    return matchesSearch && matchesSpec && matchesStatus;
  });

  const activeDoctorsCount = doctors.filter(d => d.is_active !== false).length;
  const onLeaveDoctorsCount = doctors.filter(d => d.is_active === false).length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-teal-950 to-slate-800 text-white p-4 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 text-xs font-semibold border border-teal-400/30">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              {hospitalData?.Name || 'Branch Hospital'} • Medical Staff Roster
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Branch Doctors Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Manage clinical practitioners, OPD consultation schedules, and active duty status.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition duration-150 cursor-pointer flex items-center justify-center gap-2"
            >
              + Register New Doctor
            </button>
            <button
              type="button"
              onClick={fetchAdminAndDoctors}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-teal-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Roster</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-teal-50 text-teal-700 border-teal-200">
              Total Roster
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">Branch Doctors</p>
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-0.5">{doctors.length} Doctors</h3>
          <p className="text-xs text-slate-500 mt-1">Assigned to this facility</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
              On Duty
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">Active Doctors</p>
          <h3 className="text-lg sm:text-xl font-bold text-emerald-700 mt-0.5">{activeDoctorsCount} Available</h3>
          <p className="text-xs text-emerald-600 mt-1">Accepting OPD Consultations</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leave</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-rose-50 text-rose-700 border-rose-200">
              On Leave
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">Inactive / Leave</p>
          <h3 className="text-lg sm:text-xl font-bold text-rose-700 mt-0.5">{onLeaveDoctorsCount} Off Duty</h3>
          <p className="text-xs text-rose-600 mt-1">Login disabled while inactive</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, specialty..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 focus:outline-none focus:border-teal-600 cursor-pointer"
          >
            <option value="ALL">All Specializations ({specializationsList.length})</option>
            {specializationsList.map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 focus:outline-none focus:border-teal-600 cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-semibold text-slate-500">Loading branch doctors from backend...</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs font-semibold text-slate-500">No doctors found matching criteria.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-3 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
              >
                + Register Doctor Now
              </button>
            </div>
          ) : (
            <table className="w-full text-center text-xs text-slate-600 min-w-[760px]">
              <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 text-center">Doctor Name & ID</th>
                  <th className="py-3.5 px-4 text-center">Specialization</th>
                  <th className="py-3.5 px-4 text-center">OPD Timings</th>
                  <th className="py-3.5 px-4 text-center">CONTACT & EMAIL</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDoctors.slice(0, visibleCount).map((doc) => {
                  const emailLower = (doc.email || '').toLowerCase();
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-800 break-words">{doc.name || 'Doctor'}</div>
                        <span className="font-mono text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-0.5">
                          {doc.doctor_id || `DOC-${doc.id}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1 max-w-[220px] mx-auto">
                          {parseSpecializations(doc.specialization || doc.specialty || 'General').map((specItem, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 inline-block">
                              {specItem}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                        {doc.opd_timings || 'Mon - Fri (10:00 AM - 02:00 PM)'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="font-bold text-slate-800 text-xs">
                            {doc.phone || doc.contact || '-'}
                          </span>
                          {emailLower ? (
                            <a
                              href={`mailto:${emailLower}`}
                              title={`Send email to ${emailLower}`}
                              className="text-[11px] text-sky-700 hover:text-sky-900 hover:underline block lowercase transition truncate max-w-[180px]"
                            >
                              {emailLower}
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(doc)}
                          title="Click to toggle active/inactive status"
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            doc.is_active !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {doc.is_active !== false ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewDoctorDetails(doc)}
                          className="px-3.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white font-bold text-xs transition cursor-pointer border border-teal-200 inline-flex items-center justify-center gap-1"
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

        {visibleCount < filteredDoctors.length && (
          <div className="p-4 text-center border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More ({filteredDoctors.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Register New Medical Doctor</h2>
                <p className="text-xs text-slate-500">Auto-assigned to {hospitalData?.Name || 'Branch Hospital'}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Doctor Full Name *</label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={addFormData.name}
                    onChange={handleAddFormChange}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone Number *</label>
                  <input
                    type="text"
                    required
                    name="phone"
                    value={addFormData.phone}
                    onChange={handleAddFormChange}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={addFormData.email}
                    onChange={handleAddFormChange}
                    placeholder="doctor@apexcare.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Account Login Password *</label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      required
                      name="password"
                      value={addFormData.password}
                      onChange={handleAddFormChange}
                      placeholder="Doctor@123"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white pr-14"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-2 top-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {showAddPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Branch</label>
                  <input
                    type="text"
                    readOnly
                    value={`${hospitalData?.Name || 'Apex Care'} (${hospitalData?.city || 'Branch'})`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-medium cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    list="adminDoctorDepts"
                    name="department"
                    value={addFormData.department}
                    onChange={handleAddFormChange}
                    placeholder="e.g. Cardiology Department"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                  <datalist id="adminDoctorDepts">
                    {specializationsList.map((s, i) => (
                      <option key={i} value={`${s} Department`} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Clinical Specialization *</label>
                  <input
                    type="text"
                    required
                    list="adminDoctorSpecs"
                    name="specialization"
                    value={addFormData.specialization}
                    onChange={handleAddFormChange}
                    placeholder="e.g. Cardiology, Neurology"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-medium"
                  />
                  <datalist id="adminDoctorSpecs">
                    {specializationsList.map((spec, i) => (
                      <option key={i} value={spec} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Additional Skills / Expertise</label>
                  <input
                    type="text"
                    name="additional_skills"
                    value={addFormData.additional_skills}
                    onChange={handleAddFormChange}
                    placeholder="e.g. Laparoscopic Surgery, Critical Care"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Qualifications *</label>
                  <input
                    type="text"
                    required
                    name="qualification"
                    value={addFormData.qualification}
                    onChange={handleAddFormChange}
                    placeholder="e.g. MBBS, MD (Cardiology)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Years of Experience</label>
                  <input
                    type="text"
                    name="experience"
                    value={addFormData.experience}
                    onChange={handleAddFormChange}
                    placeholder="e.g. 8 Years"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Consultation Fee (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    name="consultation_fee"
                    value={addFormData.consultation_fee}
                    onChange={handleAddFormChange}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">OPD Schedule Timings *</label>
                  <select
                    required
                    name="opd_timings"
                    value={addFormData.opd_timings}
                    onChange={handleAddFormChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-medium cursor-pointer"
                  >
                    {opdTimingsList.map((timing, i) => (
                      <option key={i} value={timing}>{timing}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="doctorActiveCreateAdmin"
                  name="is_active"
                  checked={addFormData.is_active}
                  onChange={handleAddFormChange}
                  className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                />
                <label htmlFor="doctorActiveCreateAdmin" className="font-semibold text-slate-700 cursor-pointer">
                  Doctor is Currently Active & Available
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
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md transition cursor-pointer"
                >
                  Register Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDoctors;
