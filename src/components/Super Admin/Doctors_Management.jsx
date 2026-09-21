import React, { useState, useEffect } from 'react';

const Doctors_Management = ({ currentUser, setCurrentPage }) => {
  const [doctors, setDoctors] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [detailDoctor, setDetailDoctor] = useState(null);
  const [deleteDoctorTarget, setDeleteDoctorTarget] = useState(null);

  const specializationsList = [
    'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 
    'General Medicine', 'General Surgery', 'Obstetrics & Gynecology', 
    'Dermatology', 'Oncology', 'ENT', 'Ophthalmology', 
    'Psychiatry', 'Pulmonology', 'Nephrology', 'Urology', 'Radiology'
  ];

  const initialFormState = {
    name: '',
    specialization: 'Cardiology',
    department: 'Cardiology Department',
    qualification: '',
    experience: '',
    opd_timings: 'Mon - Fri (10:00 AM - 02:00 PM)',
    chamber: '',
    phone: '',
    email: '',
    hospital: '',
    status: 'Available',
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

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/');
      if (response.ok) {
        const data = await response.json();
        setDoctors(data);
      } else {
        alert('Failed to fetch doctors from backend.');
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
    fetchDoctors();
  }, []);

  const totalDoctorsCount = doctors.length;
  const activeDoctorsCount = doctors.filter(d => d.is_active).length;
  const inactiveDoctorsCount = totalDoctorsCount - activeDoctorsCount;
  const assignedDoctorsCount = doctors.filter(d => d.hospital).length;
  const uniqueSpecializationsCount = new Set(doctors.map(d => d.specialization).filter(Boolean)).size;

  const filteredDoctors = doctors.filter((doc) => {
    const term = searchTerm.toLowerCase();
    const assignedHosp = hospitalsList.find(h => h.id === doc.hospital);
    const hospName = assignedHosp ? assignedHosp.Name.toLowerCase() : '';

    const matchesSearch =
      (doc.name || '').toLowerCase().includes(term) ||
      (doc.specialization || '').toLowerCase().includes(term) ||
      (doc.department || '').toLowerCase().includes(term) ||
      (doc.chamber || '').toLowerCase().includes(term) ||
      (doc.phone || '').toLowerCase().includes(term) ||
      (doc.email || '').toLowerCase().includes(term) ||
      hospName.includes(term);

    const matchesSpec =
      specializationFilter === 'ALL'
        ? true
        : (doc.specialization || '').toLowerCase() === specializationFilter.toLowerCase();

    const matchesHospital =
      hospitalFilter === 'ALL'
        ? true
        : hospitalFilter === 'UNASSIGNED'
        ? !doc.hospital
        : (doc.hospital || '').toString() === hospitalFilter.toString();

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'Active'
        ? doc.is_active === true
        : doc.is_active === false;

    return matchesSearch && matchesSpec && matchesHospital && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setFormData(initialFormState);
    setIsAddModalOpen(true);
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        name: formData.name.startsWith('Dr.') ? formData.name : `Dr. ${formData.name}`,
        hospital: formData.hospital ? Number(formData.hospital) : null
      };

      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Doctor profile created successfully.');
        setIsAddModalOpen(false);
        fetchDoctors();
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error creating doctor:', error);
      alert('Network error while saving doctor profile.');
    }
  };

  const handleOpenEditModal = (doctor) => {
    setSelectedDoctor(doctor);
    setFormData({
      name: doctor.name || '',
      specialization: doctor.specialization || 'Cardiology',
      department: doctor.department || '',
      qualification: doctor.qualification || '',
      experience: doctor.experience || '',
      opd_timings: doctor.opd_timings || '',
      chamber: doctor.chamber || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
      hospital: doctor.hospital || '',
      status: doctor.status || 'Available',
      is_active: doctor.is_active
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) return;

    try {
      const payload = {
        ...formData,
        name: formData.name.startsWith('Dr.') ? formData.name : `Dr. ${formData.name}`,
        hospital: formData.hospital ? Number(formData.hospital) : null
      };

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${selectedDoctor.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Doctor profile updated successfully.');
        setIsEditModalOpen(false);
        fetchDoctors();
        if (detailDoctor && detailDoctor.id === selectedDoctor.id) {
          setDetailDoctor(data);
        }
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error updating doctor:', error);
      alert('Network error while updating doctor.');
    }
  };

  const handleOpenAssignModal = (doctor) => {
    setSelectedDoctor(doctor);
    setAssignHospitalId(doctor.hospital || '');
    setIsAssignModalOpen(true);
  };

  const handleSaveHospitalAssignment = async () => {
    if (!selectedDoctor) return;

    try {
      const updatedHospitalId = assignHospitalId ? Number(assignHospitalId) : null;
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${selectedDoctor.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital: updatedHospitalId })
      });

      if (response.ok) {
        alert('Hospital assignment updated successfully.');
        setIsAssignModalOpen(false);
        fetchDoctors();
      } else {
        alert('Failed to update hospital assignment.');
      }
    } catch (error) {
      console.error('Error assigning hospital:', error);
    }
  };

  const handleToggleStatus = async (doctor) => {
    try {
      const updatedStatus = !doctor.is_active;
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${doctor.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: updatedStatus, status: updatedStatus ? 'Available' : 'On Leave' })
      });

      if (response.ok) {
        fetchDoctors();
        if (detailDoctor && detailDoctor.id === doctor.id) {
          const fresh = await response.json();
          setDetailDoctor(fresh);
        }
      } else {
        alert('Failed to update status.');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDeleteDoctor = async (id) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('Doctor profile removed successfully.');
        setDoctors(doctors.filter(d => d.id !== id));
        if (detailDoctor && detailDoctor.id === id) setDetailDoctor(null);
        setDeleteDoctorTarget(null);
      } else {
        alert('Failed to delete doctor.');
      }
    } catch (error) {
      console.error('Error deleting doctor:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Medical & Clinical Specialists (PostgreSQL)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                {activeDoctorsCount} Available Doctors
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">
              Doctors & Medical Specialists Registry
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Register medical doctors, manage specializations, chambers, OPD consultation schedules, and hospital affiliations via database.
            </p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-2"
          >
            + Add New Doctor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Doctors</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalDoctorsCount}</h3>
          <p className="text-xs text-slate-500 mt-1">Stored in PostgreSQL DB</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active & Available</p>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">{activeDoctorsCount}</h3>
          <p className="text-xs text-slate-400 mt-1">{inactiveDoctorsCount} On Leave / Inactive</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinical Specializations</p>
          <h3 className="text-2xl font-bold text-teal-700 mt-1">{uniqueSpecializationsCount || specializationsList.length}</h3>
          <p className="text-xs text-slate-500 mt-1">Cardiology, Neurology, Surgery, etc.</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital Assigned</p>
          <h3 className="text-2xl font-bold text-indigo-700 mt-1">{assignedDoctorsCount}</h3>
          <p className="text-xs text-slate-400 mt-1">{totalDoctorsCount - assignedDoctorsCount} Unassigned</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by doctor name, specialization, chamber, hospital, or phone..."
            className="w-full pl-3 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          <select
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-teal-600 cursor-pointer"
          >
            <option value="ALL">All Specializations</option>
            {specializationsList.map((spec, i) => (
              <option key={i} value={spec}>{spec}</option>
            ))}
          </select>

          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-teal-600 cursor-pointer"
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
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-teal-600 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Available (Active)</option>
            <option value="Inactive">On Leave (Inactive)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <p className="text-center py-8 text-xs text-slate-500">Loading doctors registry from backend...</p>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs font-semibold text-slate-500">No doctors found matching your criteria.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-3 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
              >
                + Register Doctor Now
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600 min-w-[850px]">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Doctor Name</th>
                  <th className="py-3.5 px-4">Specialization & Dept</th>
                  <th className="py-3.5 px-4">Assigned Hospital</th>
                  <th className="py-3.5 px-4">OPD Schedule & Chamber</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDoctors.map((doc) => {
                  const assignedHosp = hospitalsList.find(h => h.id === doc.hospital);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800 text-sm">{doc.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Reg: {doc.qualification || 'MBBS'}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-block">
                          {doc.specialization}
                        </span>
                        <p className="text-slate-500 text-[10px] mt-0.5">{doc.experience || '-'}</p>
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
                        <p className="font-semibold text-slate-800">{doc.opd_timings}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">
                          Chamber: <span className="font-medium text-slate-700">{doc.chamber || 'General OPD'}</span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-700">{doc.phone}</p>
                        <p className="text-slate-400 text-[10px] truncate max-w-[150px]">{doc.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(doc)}
                          title="Click to toggle status"
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            doc.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {doc.is_active ? 'Available' : 'On Leave'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(doc)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-semibold text-[11px] transition cursor-pointer border border-indigo-200"
                          >
                            Assign Hospital
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(doc)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-semibold text-[11px] transition cursor-pointer border border-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailDoctor(doc)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-[11px] transition cursor-pointer border border-slate-200"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteDoctorTarget(doc)}
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
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Register New Doctor & Specialist</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Specialization *</label>
                  <select
                    required
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value, department: `${e.target.value} Department` })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-medium cursor-pointer"
                  >
                    {specializationsList.map((spec, i) => (
                      <option key={i} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Qualifications *</label>
                  <input
                    type="text"
                    required
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="e.g. MBBS, MS (Orthopedics)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Experience</label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="e.g. 10 Years"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doctor@hospital.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">OPD Timings *</label>
                  <input
                    type="text"
                    required
                    value={formData.opd_timings}
                    onChange={(e) => setFormData({ ...formData, opd_timings: e.target.value })}
                    placeholder="Mon - Fri (10:00 AM - 02:00 PM)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Chamber / Room *</label>
                  <input
                    type="text"
                    required
                    value={formData.chamber}
                    onChange={(e) => setFormData({ ...formData, chamber: e.target.value })}
                    placeholder="Room 204, Block A"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Hospital Branch</label>
                <select
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 font-medium cursor-pointer"
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
                  id="doctorActiveCreate"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                />
                <label htmlFor="doctorActiveCreate" className="font-semibold text-slate-700 cursor-pointer">
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
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Register Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedDoctor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Edit Doctor Profile</h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateDoctor} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Specialization *</label>
                  <select
                    required
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value, department: `${e.target.value} Department` })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-medium cursor-pointer"
                  >
                    {specializationsList.map((spec, i) => (
                      <option key={i} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Qualifications *</label>
                  <input
                    type="text"
                    required
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Experience</label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">OPD Timings *</label>
                  <input
                    type="text"
                    required
                    value={formData.opd_timings}
                    onChange={(e) => setFormData({ ...formData, opd_timings: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Chamber / Room *</label>
                  <input
                    type="text"
                    required
                    value={formData.chamber}
                    onChange={(e) => setFormData({ ...formData, chamber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Hospital Branch</label>
                <select
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 font-medium cursor-pointer"
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
                  id="doctorActiveEdit"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                />
                <label htmlFor="doctorActiveEdit" className="font-semibold text-slate-700 cursor-pointer">
                  Doctor is Currently Active & Available
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
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssignModalOpen && selectedDoctor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Assign Doctor &rarr; Hospital</h2>
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 font-medium focus:outline-none focus:border-teal-600 cursor-pointer"
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

      {detailDoctor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                  detailDoctor.is_active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {detailDoctor.is_active ? 'Available' : 'On Leave'}
                </span>
                <h2 className="text-lg font-bold text-slate-800 mt-2">{detailDoctor.name}</h2>
                <p className="text-xs text-teal-700 font-semibold">{detailDoctor.specialization}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailDoctor(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Hospital</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {hospitalsList.find(h => h.id === detailDoctor.hospital)?.Name || 'Unassigned'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Contact Phone</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailDoctor.phone}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Email</p>
                <p className="font-bold text-slate-800 mt-0.5 break-all">{detailDoctor.email}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">OPD Timings</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailDoctor.opd_timings}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Chamber / Room</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailDoctor.chamber}</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailDoctor(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDoctorTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-800">Delete Doctor Profile?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-700">{deleteDoctorTarget.name}</span> from the database?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setDeleteDoctorTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDoctor(deleteDoctorTarget.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md cursor-pointer"
              >
                Yes, Delete Doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors_Management;