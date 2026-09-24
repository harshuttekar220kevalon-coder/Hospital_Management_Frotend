import React, { useState, useEffect } from 'react';

const Doctors_Management = ({ currentUser, setCurrentPage, setSelectedDoctor: setSelectedDoctorProp }) => {
  const [doctors, setDoctors] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, specializationFilter, hospitalFilter, statusFilter]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [detailDoctor, setDetailDoctor] = useState(null);
  const [deleteDoctorTarget, setDeleteDoctorTarget] = useState(null);

  const handleViewDoctorDetails = (doc) => {
    if (setSelectedDoctorProp) {
      setSelectedDoctorProp(doc);
    }
    localStorage.setItem('selectedDoctor', JSON.stringify(doc));
    if (setCurrentPage) {
      setCurrentPage('doctor_details');
    }
  };

  const specializationsList = [
    'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
    'General Medicine', 'General Surgery', 'Obstetrics & Gynecology',
    'Dermatology', 'Oncology', 'ENT', 'Ophthalmology',
    'Psychiatry', 'Pulmonology', 'Nephrology', 'Urology', 'Radiology'
  ];

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

  const generateDoctorId = () => `DOC-${Math.floor(1000 + Math.random() * 9000)}`;

  const parseSpecializations = (spec) => {
    if (!spec) return [];
    if (Array.isArray(spec)) return spec.map(s => typeof s === 'string' ? s.trim() : (s.name || '')).filter(Boolean);
    if (typeof spec === 'string') {
      return spec.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const getHospitalDepartments = (hospitalId) => {
    if (!hospitalId) return [];
    const hosp = hospitalsList.find(h => h.id === Number(hospitalId));
    if (!hosp) return [];
    const raw = hosp.departments || hosp.department;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(d => typeof d === 'string' ? d.trim() : (d.name || '')).filter(Boolean);
    }
    if (typeof raw === 'string') {
      return raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const initialFormState = {
    doctor_id: '',
    name: '',
    specialization: 'Cardiology',
    additional_skills: '',
    department: '',
    qualification: '',
    experience: '',
    consultation_fee: '', // Added consultation fee field
    opd_timings: 'Mon - Fri (10:00 AM - 02:00 PM)',
    phone: '',
    email: '',
    password: '',
    hospital: '',
    hospitals: [],
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

  const hasHospitalAssigned = (doc) => {
    if (Array.isArray(doc.hospitals) && doc.hospitals.length > 0) return true;
    if (doc.hospital) return true;
    return false;
  };

  const assignedDoctorsCount = doctors.filter(d => hasHospitalAssigned(d)).length;
  const doctorSpecialtiesList = Array.from(
    new Set(doctors.flatMap(d => parseSpecializations(d.specialization || d.specialty)))
  ).filter(Boolean).sort();
  const uniqueSpecializationsCount = doctorSpecialtiesList.length;

  const filteredDoctors = doctors.filter((doc) => {
    const term = searchTerm.toLowerCase();

    let matchesHospName = false;
    const hospIds = Array.isArray(doc.hospitals) ? doc.hospitals : (doc.hospital ? [doc.hospital] : []);
    hospIds.forEach(hid => {
      const hObj = hospitalsList.find(h => h.id === Number(typeof hid === 'object' ? hid.id : hid));
      if (hObj && hObj.Name.toLowerCase().includes(term)) {
        matchesHospName = true;
      }
    });

    const matchesSearch =
      (doc.name || '').toLowerCase().includes(term) ||
      (doc.specialization || '').toLowerCase().includes(term) ||
      (doc.additional_skills || doc.additionalSkills || '').toLowerCase().includes(term) ||
      (doc.department || '').toLowerCase().includes(term) ||
      (doc.phone || '').toLowerCase().includes(term) ||
      (doc.email || '').toLowerCase().includes(term) ||
      matchesHospName;

    const matchesSpec =
      specializationFilter === 'ALL'
        ? true
        : parseSpecializations(doc.specialization || doc.specialty)
            .some(s => s.toLowerCase() === specializationFilter.toLowerCase());

    const matchesHospital =
      hospitalFilter === 'ALL'
        ? true
        : hospitalFilter === 'UNASSIGNED'
          ? !hasHospitalAssigned(doc)
          : hospIds.map(String).includes(hospitalFilter.toString());

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'Active'
          ? doc.is_active === true
          : doc.is_active === false;

    return matchesSearch && matchesSpec && matchesHospital && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setFormData({
      ...initialFormState,
      doctor_id: '',
      password: '',
      additional_skills: ''
    });
    setShowAddPassword(false);
    setIsAddModalOpen(true);
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    try {
      const generatedDocId = generateDoctorId();
      const payload = {
        ...formData,
        doctor_id: generatedDocId,
        name: formData.name.startsWith('Dr.') ? formData.name.trim() : `Dr. ${formData.name.trim()}`,
        consultation_fee: Number(formData.consultation_fee) || 0.00,
        additional_skills: (formData.additional_skills || '').trim(),
        password: formData.password || '',
        hospitals: formData.hospital ? [Number(formData.hospital)] : []
      };
      delete payload.hospital;

      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        const createdId = data.doctor_id || generatedDocId;
        alert(`Doctor profile created successfully!\nDoctor ID: ${createdId}`);
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
    const existingHospId = Array.isArray(doctor.hospitals) && doctor.hospitals.length > 0
      ? doctor.hospitals[0]
      : (doctor.hospital || '');

    setFormData({
      name: doctor.name || '',
      specialization: doctor.specialization || 'Cardiology',
      additional_skills: doctor.additional_skills || doctor.additionalSkills || '',
      department: doctor.department || '',
      qualification: doctor.qualification || '',
      experience: doctor.experience || '',
      consultation_fee: doctor.consultation_fee ?? 0.00,
      opd_timings: doctor.opd_timings || 'Mon - Fri (10:00 AM - 02:00 PM)',
      phone: doctor.phone || '',
      email: doctor.email || '',
      password: doctor.password || 'Doctor@123',
      hospital: existingHospId,
      status: doctor.status || 'Available',
      is_active: doctor.is_active !== false
    });
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) return;

    try {
      const payload = {
        ...formData,
        name: formData.name.startsWith('Dr.') ? formData.name : `Dr. ${formData.name}`,
        consultation_fee: Number(formData.consultation_fee) || 0.00,
        additional_skills: (formData.additional_skills || '').trim(),
        hospitals: formData.hospital ? [Number(formData.hospital)] : []
      };
      delete payload.hospital;

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
    const existingHospId = Array.isArray(doctor.hospitals) && doctor.hospitals.length > 0
      ? doctor.hospitals[0]
      : (doctor.hospital || '');
    setAssignHospitalId(existingHospId);
    setIsAssignModalOpen(true);
  };

  const handleSaveHospitalAssignment = async () => {
    if (!selectedDoctor) return;

    try {
      const updatedHospitals = assignHospitalId ? [Number(assignHospitalId)] : [];
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${selectedDoctor.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitals: updatedHospitals })
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
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Medical & Clinical Specialists Registry
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                {activeDoctorsCount} Available Doctors
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                {inactiveDoctorsCount} Inactive
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">
              Doctors & Medical Specialists Registry
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Register medical doctors, manage specializations, consultation fees, OPD schedules, and hospital affiliations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span> Add New Doctor
          </button>
        </div>
      </div>

      {/* TOP SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Doctors</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1">{totalDoctorsCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Registered Practitioners</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active & Available</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">{activeDoctorsCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{inactiveDoctorsCount} Inactive</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinical Specializations</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-sky-700 mt-1">{uniqueSpecializationsCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate" title={doctorSpecialtiesList.join(', ')}>
            {doctorSpecialtiesList.length > 0
              ? doctorSpecialtiesList.slice(0, 3).join(', ') + (doctorSpecialtiesList.length > 3 ? '...' : '')
              : 'No specializations registered'}
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospital Assigned</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-700 mt-1">{assignedDoctorsCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{totalDoctorsCount - assignedDoctorsCount} Unassigned</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by doctor name, specialization, hospital, or phone..."
            className="w-full pl-3 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          <select
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-semibold focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">All Specializations ({doctorSpecialtiesList.length})</option>
            {doctorSpecialtiesList.map((spec, i) => (
              <option key={i} value={spec}>{spec}</option>
            ))}
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
            <p className="text-center py-8 text-xs text-slate-500">Loading doctors registry from backend...</p>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs font-semibold text-slate-500">No doctors found matching your criteria.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-3 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
              >
                + Register Doctor Now
              </button>
            </div>
          ) : (
            <table className="w-full text-center text-xs text-slate-600 min-w-[760px]">
              <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 text-center">Doctor ID</th>
                  <th className="py-3.5 px-4 text-center">Specialization</th>
                  <th className="py-3.5 px-4 text-center">Fee (₹)</th>
                  <th className="py-3.5 px-4 text-center">Assigned Hospital</th>
                  <th className="py-3.5 px-4 text-center">Contact Email</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDoctors.slice(0, visibleCount).map((doc) => {
                  const hospIds = Array.isArray(doc.hospitals) ? doc.hospitals : (doc.hospital ? [doc.hospital] : []);
                  const assignedHospitalsList = hospIds.map(hid => hospitalsList.find(h => h.id === Number(typeof hid === 'object' ? hid.id : hid))).filter(Boolean);

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-xs text-sky-700 font-bold bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 inline-block">
                          {doc.doctor_id || `DOC-${doc.id}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {(() => {
                          const specs = parseSpecializations(doc.specialization || doc.specialty);
                          if (specs.length === 0) {
                            return <span className="text-slate-400 font-medium text-xs">General</span>;
                          }
                          return (
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 inline-block">
                                {specs[0]}
                              </span>
                              {specs.length > 1 && (
                                <span
                                  className="font-mono text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 cursor-help"
                                  title={specs.join(', ')}
                                >
                                  +{specs.length - 1}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-emerald-800">
                          ₹{doc.consultation_fee ?? '0.00'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {assignedHospitalsList.length === 0 ? (
                          <span className="text-slate-400 font-medium text-xs">
                            {doc.hospital_name && !/^\d+$/.test(doc.hospital_name) ? doc.hospital_name : 'Unassigned'}
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-800">
                              {assignedHospitalsList[0].Name}
                            </span>
                            {assignedHospitalsList.length > 1 && (
                              <span
                                className="font-mono text-[11px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200"
                                title={assignedHospitalsList.slice(1).map(h => h.Name).join(', ')}
                              >
                                +{assignedHospitalsList.length - 1}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <p className="font-medium text-sky-700 truncate max-w-[180px] mx-auto">{doc.email || '-'}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${doc.is_active !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                        >
                          {doc.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewDoctorDetails(doc)}
                          className="px-3.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white font-bold text-xs transition cursor-pointer border border-sky-200 inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0"
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
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More
            </button>
          </div>
        )}
      </div>

      {/* ADD NEW DOCTOR MODAL */}
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
              {/* ROW 1: DOCTOR NAME & OFFICIAL EMAIL */}
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
                    value={formData.phone}
                    onChange={(e) => {
                      const numbersOnly = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, phone: numbersOnly });
                    }}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-mono"
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
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-mono text-xs"
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

              {/* ROW 3: ASSIGN HOSPITAL BRANCH & DEPARTMENT (SELECTABLE FROM ASSIGNED HOSPITAL) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Hospital Branch</label>
                  <select
                    value={formData.hospital}
                    onChange={(e) => {
                      const newHospId = e.target.value;
                      const depts = getHospitalDepartments(newHospId);
                      setFormData(prev => ({
                        ...prev,
                        hospital: newHospId,
                        department: depts.length > 0 ? (depts.includes(prev.department) ? prev.department : depts[0]) : prev.department
                      }));
                    }}
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

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Department {getHospitalDepartments(formData.hospital).length > 0 ? '(Assigned Hospital)' : ''}
                  </label>
                  {getHospitalDepartments(formData.hospital).length > 0 ? (
                    <div className="space-y-1">
                      <select
                        value={getHospitalDepartments(formData.hospital).includes(formData.department) ? formData.department : '__custom__'}
                        onChange={(e) => {
                          if (e.target.value !== '__custom__') {
                            setFormData({ ...formData, department: e.target.value });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 font-medium cursor-pointer"
                      >
                        <option value="">-- Select Hospital Department --</option>
                        {getHospitalDepartments(formData.hospital).map((dept, idx) => (
                          <option key={idx} value={dept}>{dept}</option>
                        ))}
                        <option value="__custom__">+ Other / Custom Department...</option>
                      </select>
                      {(!getHospitalDepartments(formData.hospital).includes(formData.department) || formData.department === '') && (
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          placeholder="Type custom department name..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      list="commonDeptsAdd"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder={formData.hospital ? "e.g. Cardiology Department" : "Assign hospital or enter department"}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                    />
                  )}
                  <datalist id="commonDeptsAdd">
                    {specializationsList.map((s, i) => (
                      <option key={i} value={`${s} Department`} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* ROW 4: CLINICAL SPECIALIZATION & ADDITIONAL SKILLS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Clinical Specialization *</label>
                  <input
                    type="text"
                    required
                    list="specializationsListAddDM"
                    value={formData.specialization}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        specialization: val,
                        department: prev.department ? prev.department : `${val} Department`
                      }));
                    }}
                    placeholder="e.g. Cardiology, Neurology (Comma-separated for multiple)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-medium"
                  />
                  <datalist id="specializationsListAddDM">
                    {doctorSpecialtiesList.length > 0
                      ? doctorSpecialtiesList.map((spec, i) => <option key={i} value={spec} />)
                      : specializationsList.map((spec, i) => <option key={i} value={spec} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Additional Skills / Expertise</label>
                  <input
                    type="text"
                    value={formData.additional_skills}
                    onChange={(e) => setFormData({ ...formData, additional_skills: e.target.value })}
                    placeholder="e.g. Laparoscopic Surgery, Critical Care, Echocardiography"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* ROW 5: QUALIFICATIONS & EXPERIENCE */}
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

              {/* ROW 6: CONSULTATION FEE & OPD SCHEDULE TIMINGS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Consultation Fee (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.consultation_fee}
                    onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">OPD Schedule Timings *</label>
                  <select
                    required
                    value={formData.opd_timings}
                    onChange={(e) => setFormData({ ...formData, opd_timings: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-medium cursor-pointer"
                  >
                    {opdTimingsList.map((timing, i) => (
                      <option key={i} value={timing}>{timing}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ROW 7: AUTO-GENERATED ID BADGE & ACTIVE CHECKBOX */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
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
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="text-[10px] uppercase font-bold">Doctor ID:</span>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    Auto-Generated upon creation
                  </span>
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
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Register Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DOCTOR MODAL */}
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
              {/* ROW 1: DOCTOR NAME & OFFICIAL EMAIL */}
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

              {/* ROW 2: CONTACT PHONE & ASSIGN HOSPITAL BRANCH */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone (Numbers only) *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      const numbersOnly = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, phone: numbersOnly });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Hospital Branch</label>
                  <select
                    value={formData.hospital}
                    onChange={(e) => {
                      const newHospId = e.target.value;
                      const depts = getHospitalDepartments(newHospId);
                      setFormData(prev => ({
                        ...prev,
                        hospital: newHospId,
                        department: depts.length > 0 ? (depts.includes(prev.department) ? prev.department : depts[0]) : prev.department
                      }));
                    }}
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
              </div>

              {/* ROW 3: DEPARTMENT (FROM ASSIGNED HOSPITAL) & CLINICAL SPECIALIZATION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Department {getHospitalDepartments(formData.hospital).length > 0 ? '(Assigned Hospital)' : ''}
                  </label>
                  {getHospitalDepartments(formData.hospital).length > 0 ? (
                    <div className="space-y-1">
                      <select
                        value={getHospitalDepartments(formData.hospital).includes(formData.department) ? formData.department : '__custom__'}
                        onChange={(e) => {
                          if (e.target.value !== '__custom__') {
                            setFormData({ ...formData, department: e.target.value });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 font-medium cursor-pointer"
                      >
                        <option value="">-- Select Hospital Department --</option>
                        {getHospitalDepartments(formData.hospital).map((dept, idx) => (
                          <option key={idx} value={dept}>{dept}</option>
                        ))}
                        <option value="__custom__">+ Other / Custom Department...</option>
                      </select>
                      {(!getHospitalDepartments(formData.hospital).includes(formData.department) || formData.department === '') && (
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          placeholder="Type custom department name..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      list="commonDeptsEdit"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder={formData.hospital ? "e.g. Cardiology Department" : "Assign hospital or enter department"}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                    />
                  )}
                  <datalist id="commonDeptsEdit">
                    {specializationsList.map((s, i) => (
                      <option key={i} value={`${s} Department`} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Clinical Specialization *</label>
                  <input
                    type="text"
                    required
                    list="specializationsListEditDM"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="e.g. Cardiology, Neurology (Comma-separated for multiple)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-medium"
                  />
                  <datalist id="specializationsListEditDM">
                    {doctorSpecialtiesList.length > 0
                      ? doctorSpecialtiesList.map((spec, i) => <option key={i} value={spec} />)
                      : specializationsList.map((spec, i) => <option key={i} value={spec} />)}
                  </datalist>
                </div>
              </div>

              {/* ROW 4: ADDITIONAL SKILLS & QUALIFICATIONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Additional Skills / Expertise</label>
                  <input
                    type="text"
                    value={formData.additional_skills}
                    onChange={(e) => setFormData({ ...formData, additional_skills: e.target.value })}
                    placeholder="e.g. Laparoscopic Surgery, Critical Care, Echocardiography"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                </div>
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
              </div>

              {/* ROW 5: CONSULTATION FEE & EXPERIENCE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Consultation Fee (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.consultation_fee}
                    onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-mono font-bold"
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

              {/* ROW 6: OPD SCHEDULE TIMINGS */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">OPD Schedule Timings *</label>
                <select
                  required
                  value={formData.opd_timings}
                  onChange={(e) => setFormData({ ...formData, opd_timings: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white font-medium cursor-pointer"
                >
                  {opdTimingsList.map((timing, i) => (
                    <option key={i} value={timing}>{timing}</option>
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

      {/* ASSIGN HOSPITAL MODAL */}
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

      {/* DETAIL MODAL */}
      {detailDoctor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${detailDoctor.is_active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                  {detailDoctor.is_active ? 'Available' : 'On Leave'}
                </span>
                <h2 className="text-lg font-bold text-slate-800 mt-2">{detailDoctor.name}</h2>
                <div className="flex flex-wrap gap-1 mt-1">
                  {parseSpecializations(detailDoctor.specialization || detailDoctor.specialty).map((spec, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                      {spec}
                    </span>
                  ))}
                </div>
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
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Hospital(s)</p>
                <div className="font-bold text-slate-800 mt-0.5">
                  {(() => {
                    const hIds = Array.isArray(detailDoctor.hospitals) ? detailDoctor.hospitals : (detailDoctor.hospital ? [detailDoctor.hospital] : []);
                    const matchedHs = hIds.map(hid => hospitalsList.find(h => h.id === Number(typeof hid === 'object' ? hid.id : hid))?.Name).filter(Boolean);
                    return matchedHs.length > 0 ? matchedHs.join(', ') : 'Unassigned';
                  })()}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Department</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailDoctor.department || 'General'}</p>
              </div>
              {detailDoctor.additional_skills && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Additional Skills / Expertise</p>
                  <p className="font-bold text-slate-800 mt-0.5">{detailDoctor.additional_skills}</p>
                </div>
              )}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-[10px] text-emerald-800 uppercase font-semibold">Consultation Fee</p>
                <p className="font-bold text-emerald-900 text-sm mt-0.5">₹{detailDoctor.consultation_fee ?? '0.00'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Contact Phone</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailDoctor.phone}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Email</p>
                <p className="font-bold text-slate-800 mt-0.5 break-all">{detailDoctor.email}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">OPD Timings</p>
                <p className="font-bold text-slate-800 mt-0.5">{detailDoctor.opd_timings}</p>
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

      {/* DELETE MODAL */}
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