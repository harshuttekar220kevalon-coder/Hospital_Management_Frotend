import React, { useState, useEffect } from 'react';

const Doctor_Details = ({ currentUser, selectedDoctor, setSelectedDoctor, setCurrentPage }) => {
  const [doctorData, setDoctorData] = useState(() => {
    if (selectedDoctor && selectedDoctor.id) return selectedDoctor;
    try {
      const saved = localStorage.getItem('selectedDoctor');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      id: 1,
      name: 'Dr. Doctor',
      doctor_id: 'DOC-001',
      specialization: 'Cardiology',
      additional_skills: 'Interventional Cardiology, Echocardiography',
      department: 'Cardiology Department',
      qualification: 'MBBS, MD (Cardiology)',
      experience: '12 Years',
      consultation_fee: 500.00,
      opd_timings: 'Mon - Fri (10:00 AM - 02:00 PM)',
      phone: '+91 98765 43210',
      email: 'doctor@hospital.com',
      hospitals: [],
      is_active: true
    };
  });

  const [hospitalsList, setHospitalsList] = useState([]);
  const [isDataFetching, setIsDataFetching] = useState(false);

  const [showEditPassword, setShowEditPassword] = useState(false);
  const [visibleHospitalsCount, setVisibleHospitalsCount] = useState(10);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignHospitalsModalOpen, setIsAssignHospitalsModalOpen] = useState(false);

  const parseSpecializations = (spec) => {
    if (!spec) return [];
    if (Array.isArray(spec)) return spec.map(s => typeof s === 'string' ? s.trim() : (s.name || '')).filter(Boolean);
    if (typeof spec === 'string') {
      return spec.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const getHospitalDepartments = (hospitalIds) => {
    if (!hospitalIds) return [];
    const ids = Array.isArray(hospitalIds) ? hospitalIds.map(Number) : [Number(hospitalIds)];
    const depts = [];
    ids.forEach(id => {
      const hosp = hospitalsList.find(h => h.id === id);
      if (hosp) {
        const raw = hosp.departments || hosp.department;
        if (Array.isArray(raw)) {
          raw.forEach(d => {
            const name = typeof d === 'string' ? d.trim() : (d.name || '');
            if (name && !depts.includes(name)) depts.push(name);
          });
        } else if (typeof raw === 'string') {
          raw.split(',').forEach(s => {
            const name = s.trim();
            if (name && !depts.includes(name)) depts.push(name);
          });
        }
      }
    });
    return depts;
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

  const [editFormData, setEditFormData] = useState({
    name: '',
    specialization: 'Cardiology',
    additional_skills: '',
    department: '',
    qualification: '',
    experience: '',
    consultation_fee: '',
    opd_timings: '',
    phone: '',
    email: '',
    password: '',
    hospitals: [],
    status: 'Available',
    is_active: true
  });

  const [selectedHospitalsForAssign, setSelectedHospitalsForAssign] = useState([]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const loadDoctorAndHospitals = async () => {
    setIsDataFetching(true);
    try {
      let currentDoc = selectedDoctor || doctorData;
      if (!currentDoc || !currentDoc.id) {
        const saved = localStorage.getItem('selectedDoctor');
        if (saved) {
          currentDoc = JSON.parse(saved);
          setDoctorData(currentDoc);
        }
      }

      // Fetch all hospitals
      const hospListRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/').catch(() => null);
      if (hospListRes && hospListRes.ok) {
        const allHospitals = await hospListRes.json();
        setHospitalsList(allHospitals);
      }

      // Fetch fresh doctor data from backend
      if (currentDoc && currentDoc.id) {
        const docRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${currentDoc.id}/`).catch(() => null);
        if (docRes && docRes.ok) {
          const freshDoc = await docRes.json();
          setDoctorData(freshDoc);
          if (setSelectedDoctor) setSelectedDoctor(freshDoc);
          localStorage.setItem('selectedDoctor', JSON.stringify(freshDoc));
        }
      }
    } catch (err) {
      console.error('Error fetching doctor details:', err);
    } finally {
      setIsDataFetching(false);
    }
  };

  useEffect(() => {
    setVisibleHospitalsCount(10);
    loadDoctorAndHospitals();
  }, [selectedDoctor?.id]);

  const activeDoc = doctorData || {};

  // Extract assigned hospital IDs safely
  const assignedHospitalIds = Array.isArray(activeDoc.hospitals)
    ? activeDoc.hospitals.map(h => Number(typeof h === 'object' ? h.id : h))
    : (activeDoc.hospital ? [Number(typeof activeDoc.hospital === 'object' ? activeDoc.hospital.id : activeDoc.hospital)] : []);

  // Filter full hospital objects assigned to this doctor
  const assignedHospitalsList = hospitalsList.filter(h => assignedHospitalIds.includes(Number(h.id)));

  const handleBackClick = () => {
    if (setCurrentPage) {
      setCurrentPage('super_admin_doctors');
    }
  };

  // Open Edit Modal with current data
  const handleOpenEditModal = () => {
    setEditFormData({
      name: activeDoc.name || '',
      specialization: activeDoc.specialization || 'Cardiology',
      additional_skills: activeDoc.additional_skills || '',
      department: activeDoc.department || '',
      qualification: activeDoc.qualification || '',
      experience: activeDoc.experience || '',
      consultation_fee: activeDoc.consultation_fee ?? 0.00,
      opd_timings: activeDoc.opd_timings || 'Mon - Fri (10:00 AM - 02:00 PM)',
      phone: activeDoc.phone || '',
      email: activeDoc.email || '',
      password: activeDoc.password || 'Doctor@123',
      hospitals: assignedHospitalIds,
      status: activeDoc.status || (activeDoc.is_active ? 'Available' : 'On Leave'),
      is_active: activeDoc.is_active !== false
    });
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  // Save Edit Doctor
  const handleSaveDoctorEdit = async (e) => {
    e.preventDefault();
    if (!activeDoc || !activeDoc.id) return;

    try {
      const payload = {
        ...editFormData,
        name: editFormData.name.startsWith('Dr.') ? editFormData.name : `Dr. ${editFormData.name}`,
        consultation_fee: Number(editFormData.consultation_fee) || 0.00,
        hospitals: editFormData.hospitals.map(Number)
      };
      delete payload.hospital;

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${activeDoc.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const updated = await response.json();

      if (response.ok) {
        alert('Doctor profile and consultation fee updated successfully!');
        setDoctorData(updated);
        if (setSelectedDoctor) setSelectedDoctor(updated);
        localStorage.setItem('selectedDoctor', JSON.stringify(updated));
        setIsEditModalOpen(false);
      } else {
        alert('Failed to update doctor: ' + JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error updating doctor:', err);
      alert('Network error while updating doctor details.');
    }
  };

  // Toggle Doctor Active Status
  const handleToggleStatus = async () => {
    if (!activeDoc || !activeDoc.id) return;
    try {
      const newStatus = !activeDoc.is_active;
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${activeDoc.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus, status: newStatus ? 'Available' : 'On Leave' })
      });

      if (response.ok) {
        const updated = await response.json();
        setDoctorData(updated);
        if (setSelectedDoctor) setSelectedDoctor(updated);
        localStorage.setItem('selectedDoctor', JSON.stringify(updated));
      } else {
        alert('Failed to toggle status.');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  // Open Quick Hospital Assignment Modal
  const handleOpenAssignHospitalsModal = () => {
    setSelectedHospitalsForAssign(assignedHospitalIds);
    setIsAssignHospitalsModalOpen(true);
  };

  // Save Quick Hospital Assignment
  const handleSaveHospitalAssignments = async () => {
    if (!activeDoc || !activeDoc.id) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${activeDoc.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitals: selectedHospitalsForAssign.map(Number) })
      });

      if (response.ok) {
        const updated = await response.json();
        alert('Assigned hospital branches updated successfully!');
        setDoctorData(updated);
        if (setSelectedDoctor) setSelectedDoctor(updated);
        localStorage.setItem('selectedDoctor', JSON.stringify(updated));
        setIsAssignHospitalsModalOpen(false);
      } else {
        alert('Failed to update assigned hospitals.');
      }
    } catch (err) {
      console.error('Error assigning hospitals:', err);
      alert('Network error while saving assigned branches.');
    }
  };

  // Delete Doctor
  const handleDeleteDoctor = async () => {
    if (!activeDoc || !activeDoc.id) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${activeDoc.id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert(`Doctor "${activeDoc.name}" has been deleted successfully.`);
        localStorage.removeItem('selectedDoctor');
        if (setSelectedDoctor) setSelectedDoctor(null);
        setIsDeleteModalOpen(false);
        handleBackClick();
      } else {
        alert('Failed to delete doctor from database.');
      }
    } catch (err) {
      console.error('Error deleting doctor:', err);
      alert('Network error while deleting doctor.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* TOP NAVIGATION & BACK BUTTON */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
        >
          &larr; Back to Doctors
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Super Admin</span>
          <span>/</span>
          <span>Doctors</span>
          <span>/</span>
          <span className="font-semibold text-slate-700 font-mono">
            {activeDoc.doctor_id || `DOC-${activeDoc.id}`}
          </span>
        </div>
      </div>

      {/* HEADER HERO CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md shrink-0">
            {(activeDoc.name || 'D').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                {activeDoc.doctor_id || `DOC-${activeDoc.id}`}
              </span>
              {parseSpecializations(activeDoc.specialization || activeDoc.specialty).map((spec, idx) => (
                <span key={idx} className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {spec}
                </span>
              ))}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                activeDoc.is_active !== false
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {activeDoc.is_active !== false ? 'Available on Duty' : 'On Leave (Inactive)'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight mt-1">
              {activeDoc.name || 'Doctor'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleStatus}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
          >
            {activeDoc.is_active !== false ? 'Mark On Leave' : 'Set Available'}
          </button>

          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            Edit Doctor
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      {/* QUICK METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Consultation Fee</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">₹{activeDoc.consultation_fee ?? '0.00'}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Per consultation charge</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Hospitals</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-700 mt-1">{assignedHospitalsList.length}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Active branch affiliations</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">OPD Timings</p>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-1 truncate">{activeDoc.opd_timings || 'Mon - Fri'}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Scheduled OPD</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operational Status</p>
          <h3 className={`text-base sm:text-lg font-bold mt-1 ${activeDoc.is_active !== false ? 'text-emerald-700' : 'text-rose-600'}`}>
            {activeDoc.is_active !== false ? 'Available on Duty' : 'On Leave (Inactive)'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Status verified</p>
        </div>
      </div>

      {/* MAIN CONTENT: 2-COLUMN PROFILE & ASSIGNED HOSPITALS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        {/* LEFT COLUMN: FULL CLINICAL & PERSONAL PROFILE (1 COL) */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5 self-start">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Doctor Credentials & Fees</h2>
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Doctor ID / Registration</span>
                <p className="font-mono text-sm font-bold text-teal-700 mt-0.5">{activeDoc.doctor_id || `DOC-${activeDoc.id}`}</p>
              </div>

              {/* CONSULTATION FEE FIELD */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-800 uppercase font-bold">Consultation Fee</span>
                <p className="font-bold text-emerald-900 text-base mt-0.5">₹{activeDoc.consultation_fee ?? '0.00'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Medical Qualification</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{activeDoc.qualification || 'MBBS'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Clinical Specialization</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {parseSpecializations(activeDoc.specialization || activeDoc.specialty).map((spec, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-block">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Additional Skills / Expertise</span>
                <p className="font-semibold text-slate-800 mt-0.5">{activeDoc.additional_skills || 'None specified'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Department</span>
                <p className="font-semibold text-slate-800 mt-0.5">{activeDoc.department || 'General'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Years of Experience</span>
                <p className="font-semibold text-slate-800 mt-0.5">{activeDoc.experience || 'Not specified'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">OPD Consultation Schedule</span>
                <p className="font-bold text-teal-800 mt-0.5">{activeDoc.opd_timings || 'Mon - Fri'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Official Email Address</span>
                <p className="font-semibold text-blue-700 mt-0.5 break-all">{activeDoc.email || '-'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Phone Number</span>
                <p className="font-semibold text-slate-800 mt-0.5">{activeDoc.phone || '-'}</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition cursor-pointer text-center"
            >
              Update Information
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: ASSIGNED HOSPITAL BRANCHES FULL DETAILS (2 COLS) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 self-start">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Assigned Hospital Branches ({assignedHospitalsList.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Locations where Dr. {activeDoc.name?.replace(/^Dr\.?\s*/i, '')} conducts consultations and clinical procedures.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAssignHospitalsModal}
                className="px-3.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white font-bold text-xs border border-sky-200 transition cursor-pointer"
              >
                + Assign / Edit Branches
              </button>
            </div>

            {assignedHospitalsList.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 my-4">
                <p className="text-xs font-semibold text-slate-600">No hospital branches currently assigned to this doctor.</p>
                <p className="text-[11px] text-slate-400 mt-1">Assign branches to enable OPD scheduling and ward operations.</p>
                <button
                  type="button"
                  onClick={handleOpenAssignHospitalsModal}
                  className="mt-3 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
                >
                  + Assign Hospital Branch Now
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 mt-4">
                  {assignedHospitalsList.slice(0, visibleHospitalsCount).map((hosp) => (
                    <div
                      key={hosp.id}
                      className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 shadow-xs hover:border-sky-300 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block">
                            {hosp.Branch_Code || `HOSP-${hosp.id}`}
                          </span>
                          <h3 className="font-bold text-slate-800 text-sm mt-1">{hosp.Name}</h3>
                          <p className="text-xs text-slate-500">{hosp.city} ({hosp.area})</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                          hosp.is_active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {hosp.is_active !== false ? 'Active Branch' : 'Inactive'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                        <p className="text-[11px]"><span className="font-semibold text-slate-700">Address:</span> {hosp.address || `${hosp.area}, ${hosp.city}`}</p>
                        <p className="text-[11px]"><span className="font-semibold text-slate-700">Phone:</span> {hosp.contact || '-'}</p>
                        <p className="text-[11px]"><span className="font-semibold text-slate-700">Email:</span> {hosp.email || '-'}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/60 text-center">
                        <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Total Beds</p>
                          <p className="font-bold text-slate-800 text-xs">{hosp.total_beds || 0}</p>
                        </div>
                        <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">ICU Beds</p>
                          <p className="font-bold text-slate-800 text-xs">{hosp.icu_beds || 0}</p>
                        </div>
                        <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">OTs</p>
                          <p className="font-bold text-slate-800 text-xs">{hosp.operation_theatres || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {visibleHospitalsCount < assignedHospitalsList.length && (
                  <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-3 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setVisibleHospitalsCount((prev) => prev + 10)}
                      className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
                    >
                      Show More
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-500 font-medium">All hospital records are synced with Super Admin backend.</span>
            <button
              type="button"
              onClick={handleBackClick}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
            >
              &larr; Back to Doctors
            </button>
          </div>
        </div>
      </div>

      {/* EDIT DOCTOR MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Edit Doctor Profile & Clinical Details</h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveDoctorEdit} className="space-y-3 text-xs">
              {/* ROW 1: DOCTOR NAME & CLINICAL SPECIALIZATION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Clinical Specialization *</label>
                  <input
                    type="text"
                    required
                    list="docDetailsSpecsList"
                    value={editFormData.specialization}
                    onChange={(e) => setEditFormData({ ...editFormData, specialization: e.target.value })}
                    placeholder="e.g. Cardiology, Neurology"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-medium"
                  />
                  <datalist id="docDetailsSpecsList">
                    {specializationsList.map((spec, i) => (
                      <option key={i} value={spec} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* ROW 2: DEPARTMENT & ADDITIONAL SKILLS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Department {getHospitalDepartments(editFormData.hospitals).length > 0 ? '(From Assigned Branches)' : ''}
                  </label>
                  {getHospitalDepartments(editFormData.hospitals).length > 0 ? (
                    <div className="space-y-1">
                      <select
                        value={getHospitalDepartments(editFormData.hospitals).includes(editFormData.department) ? editFormData.department : '__custom__'}
                        onChange={(e) => {
                          if (e.target.value !== '__custom__') {
                            setEditFormData({ ...editFormData, department: e.target.value });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                      >
                        <option value="">-- Select Hospital Department --</option>
                        {getHospitalDepartments(editFormData.hospitals).map((dept, idx) => (
                          <option key={idx} value={dept}>{dept}</option>
                        ))}
                        <option value="__custom__">+ Other / Custom Department...</option>
                      </select>
                      {(!getHospitalDepartments(editFormData.hospitals).includes(editFormData.department) || editFormData.department === '') && (
                        <input
                          type="text"
                          value={editFormData.department}
                          onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                          placeholder="Type custom department name..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={editFormData.department}
                      onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                      placeholder="e.g. Cardiology Department"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Additional Skills / Expertise</label>
                  <input
                    type="text"
                    value={editFormData.additional_skills}
                    onChange={(e) => setEditFormData({ ...editFormData, additional_skills: e.target.value })}
                    placeholder="e.g. Interventional Cardiology, Echocardiography"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* ROW 3: CONSULTATION FEE & YEARS OF EXPERIENCE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Consultation Fee (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editFormData.consultation_fee}
                    onChange={(e) => setEditFormData({ ...editFormData, consultation_fee: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Years of Experience</label>
                  <input
                    type="text"
                    value={editFormData.experience}
                    onChange={(e) => setEditFormData({ ...editFormData, experience: e.target.value })}
                    placeholder="e.g. 10 Years"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* ROW 4: QUALIFICATIONS & OPD SCHEDULE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Qualification / Degrees</label>
                  <input
                    type="text"
                    value={editFormData.qualification}
                    onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
                    placeholder="e.g. MBBS, MD, DM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">OPD Schedule Timings</label>
                  <select
                    value={editFormData.opd_timings}
                    onChange={(e) => setEditFormData({ ...editFormData, opd_timings: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-medium cursor-pointer"
                  >
                    {opdTimingsList.map((timing, i) => (
                      <option key={i} value={timing}>{timing}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone (Numbers only)</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    value={editFormData.phone}
                    onChange={(e) => {
                      const numbersOnly = e.target.value.replace(/\D/g, '');
                      setEditFormData({ ...editFormData, phone: numbersOnly });
                    }}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    placeholder="doctor@hospital.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* ASSIGNED HOSPITALS CHECKBOXES */}
              <div className="pt-2">
                <label className="block font-semibold text-slate-700 uppercase mb-1.5">
                  Assigned Hospital Branches (Select multiple)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {hospitalsList.map((hosp) => {
                    const isChecked = editFormData.hospitals.includes(hosp.id);
                    return (
                      <label key={hosp.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditFormData({ ...editFormData, hospitals: [...editFormData.hospitals, hosp.id] });
                            } else {
                              setEditFormData({ ...editFormData, hospitals: editFormData.hospitals.filter(id => id !== hosp.id) });
                            }
                          }}
                          className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                        />
                        <span className="text-xs text-slate-700 font-medium">{hosp.Name} ({hosp.city})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="doctorActiveStatus"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ 
                    ...editFormData, 
                    is_active: e.target.checked,
                    status: e.target.checked ? 'Available' : 'On Leave'
                  })}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                />
                <label htmlFor="doctorActiveStatus" className="font-semibold text-slate-700 cursor-pointer">
                  Doctor Available on Duty (Active Status)
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

      {/* QUICK ASSIGN HOSPITALS MODAL */}
      {isAssignHospitalsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Assign Hospital Branches</h2>
                <p className="text-xs text-slate-400">Select which hospital branches Dr. {activeDoc.name} is assigned to</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignHospitalsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
              {hospitalsList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No hospital branches registered in system.</p>
              ) : (
                hospitalsList.map((hosp) => {
                  const isChecked = selectedHospitalsForAssign.includes(hosp.id);
                  return (
                    <label
                      key={hosp.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                        isChecked ? 'bg-sky-50 border-sky-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedHospitalsForAssign([...selectedHospitalsForAssign, hosp.id]);
                            } else {
                              setSelectedHospitalsForAssign(selectedHospitalsForAssign.filter(id => id !== hosp.id));
                            }
                          }}
                          className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                        />
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{hosp.Name}</p>
                          <p className="text-[10px] text-slate-400">{hosp.Branch_Code} &bull; {hosp.city}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {hosp.area}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAssignHospitalsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHospitalAssignments}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md cursor-pointer transition"
              >
                Save Assignments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2 rounded-full bg-rose-100 text-lg">⚠️</span>
              <h3 className="font-bold text-base text-slate-800">Delete Doctor Account?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete <strong className="text-slate-800">{activeDoc.name}</strong> ({activeDoc.doctor_id || 'DOC'}) from the system? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDoctor}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
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

export default Doctor_Details;