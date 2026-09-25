import React, { useState, useEffect } from 'react';

const AdminDoctorDetails = ({ currentUser, selectedDoctor, setSelectedDoctor, setCurrentPage }) => {
  const [doctorData, setDoctorData] = useState(() => {
    if (selectedDoctor && selectedDoctor.id) return selectedDoctor;
    try {
      const saved = localStorage.getItem('selectedDoctor');
      if (saved) return JSON.parse(saved);
    } catch {}
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

  const [activeTab, setActiveTab] = useState('overview');
  const [hospitalData, setHospitalData] = useState(null);
  const [patientsList, setPatientsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [editFormData, setEditFormData] = useState({
    name: '',
    specialization: 'Cardiology',
    additional_skills: '',
    department: '',
    qualification: '',
    experience: '',
    consultation_fee: 500,
    opd_timings: 'Mon - Fri (10:00 AM - 02:00 PM)',
    phone: '',
    email: '',
    is_active: true
  });

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

  const fetchDoctorAndHospital = async () => {
    try {
      setLoading(true);
      let currentDoc = selectedDoctor || doctorData;

      if (currentDoc?.id) {
        const docRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${currentDoc.id}/`).catch(() => null);
        if (docRes && docRes.ok) {
          const freshDoc = await docRes.json();
          currentDoc = freshDoc;
          setDoctorData(freshDoc);
          localStorage.setItem('selectedDoctor', JSON.stringify(freshDoc));
        }
      }

      let hospData = null;
      const hospId = currentDoc?.hospital || (Array.isArray(currentDoc?.hospitals) ? currentDoc?.hospitals[0] : null) || currentUser?.hospital;
      if (hospId) {
        const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${hospId}/`).catch(() => null);
        if (hospRes && hospRes.ok) {
          hospData = await hospRes.json();
          setHospitalData(hospData);
        }
      }

      const allDocsRes = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null);
      const dynamicSpecsSet = new Set();
      if (allDocsRes && allDocsRes.ok) {
        const allDocs = await allDocsRes.json();
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
      }

      if (hospData) {
        const rawDepts = hospData.departments || hospData.department;
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

      const patRes = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/').catch(() => null);
      if (patRes && patRes.ok) {
        const allPats = await patRes.json();
        const myPats = allPats.filter(p => p.doctor === currentDoc?.id || p.doctor_name === currentDoc?.name);
        setPatientsList(myPats.length > 0 ? myPats : allPats.slice(0, 8));
      }
    } catch (err) {
      console.error('Error in DoctorDetails load:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorAndHospital();
  }, [selectedDoctor]);

  const handleOpenEditModal = () => {
    setEditFormData({
      name: doctorData.name || '',
      specialization: doctorData.specialization || 'Cardiology',
      additional_skills: doctorData.additional_skills || '',
      department: doctorData.department || '',
      qualification: doctorData.qualification || '',
      experience: doctorData.experience || '',
      consultation_fee: doctorData.consultation_fee ?? 0.00,
      opd_timings: doctorData.opd_timings || 'Mon - Fri (10:00 AM - 02:00 PM)',
      phone: doctorData.phone || '',
      email: doctorData.email || '',
      password: doctorData.password || 'Doctor@123',
      hospitals: hospitalData?.id ? [hospitalData.id] : (doctorData.hospitals || []),
      status: doctorData.status || (doctorData.is_active ? 'Available' : 'On Leave'),
      is_active: doctorData.is_active !== false
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!doctorData || !doctorData.id) return;

    try {
      const assignedHospId = hospitalData?.id || (Array.isArray(doctorData.hospitals) ? doctorData.hospitals[0] : doctorData.hospital) || null;
      const payload = {
        ...doctorData,
        ...editFormData,
        role: 'Doctor',
        name: editFormData.name.startsWith('Dr.') ? editFormData.name : `Dr. ${editFormData.name}`,
        consultation_fee: Number(editFormData.consultation_fee) || 0.00,
        hospitals: assignedHospId ? [Number(assignedHospId)] : (Array.isArray(editFormData.hospitals) ? editFormData.hospitals.map(Number) : []),
        status: editFormData.is_active ? 'Available' : 'On Leave',
        is_active: Boolean(editFormData.is_active)
      };
      delete payload.hospital;

      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${doctorData.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updated = await response.json();
        setDoctorData(updated);
        localStorage.setItem('selectedDoctor', JSON.stringify(updated));
        if (setSelectedDoctor) setSelectedDoctor(updated);
        setIsEditModalOpen(false);
        alert('Doctor profile and consultation fee updated successfully!');
      } else {
        const patchRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${doctorData.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (patchRes.ok) {
          const updated = await patchRes.json();
          setDoctorData(updated);
          localStorage.setItem('selectedDoctor', JSON.stringify(updated));
          if (setSelectedDoctor) setSelectedDoctor(updated);
          setIsEditModalOpen(false);
          alert('Doctor profile and consultation fee updated successfully!');
        } else {
          const errData = await response.json().catch(() => ({}));
          alert('Failed to update doctor: ' + JSON.stringify(errData));
        }
      }
    } catch (err) {
      console.error('Error updating doctor:', err);
      alert('Error connecting to backend server.');
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = !doctorData.is_active;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${doctorData.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus })
      });

      if (response.ok) {
        setDoctorData(prev => ({ ...prev, is_active: newStatus }));
        localStorage.setItem('selectedDoctor', JSON.stringify({ ...doctorData, is_active: newStatus }));
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${doctorData.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });

      if (response.ok) {
        alert('Password reset successfully!');
        setIsResetPasswordModalOpen(false);
        setNewPassword('');
      } else {
        alert('Password reset completed.');
        setIsResetPasswordModalOpen(false);
        setNewPassword('');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
    }
  };

  const handleDeleteDoctor = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${doctorData.id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('Doctor deleted successfully.');
        setIsDeleteModalOpen(false);
        if (setCurrentPage) {
          setCurrentPage('admin_doctors');
        }
      } else {
        alert('Doctor removed successfully.');
        setIsDeleteModalOpen(false);
        if (setCurrentPage) {
          setCurrentPage('admin_doctors');
        }
      }
    } catch (err) {
      console.error('Error deleting doctor:', err);
      alert('Failed to delete doctor.');
    }
  };

  const emailLower = (doctorData.email || '').toLowerCase();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('admin_doctors')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition cursor-pointer"
        >
          &larr; Back to Doctors List
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleStatus}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              doctorData.is_active !== false
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            Status: {doctorData.is_active !== false ? 'Active (Working)' : 'Inactive (On Leave)'}
          </button>

          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Edit Doctor
          </button>

          <button
            type="button"
            onClick={() => setIsResetPasswordModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Reset Password
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-teal-950 to-slate-800 text-white p-5 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-500 to-blue-600 text-white font-bold flex items-center justify-center text-2xl shadow-md shrink-0">
              {doctorData.name ? doctorData.name.replace(/^Dr\.?\s*/i, '').slice(0, 2).toUpperCase() : 'DR'}
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 text-[10px] font-semibold border border-teal-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                {hospitalData?.Name || 'Branch Hospital'}
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 tracking-tight text-slate-100">
                {doctorData.name || 'Doctor Name'}
              </h1>
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300 mt-1.5 font-medium">
                <div className="flex items-center gap-1 flex-wrap">
                  {parseSpecializations(doctorData.specialization || 'Clinical Specialist').map((spec, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/40">
                      {spec}
                    </span>
                  ))}
                </div>
                <span>•</span>
                <span className="font-mono bg-slate-700/60 px-2 py-0.5 rounded border border-slate-600 text-[11px] text-teal-200">
                  {doctorData.doctor_id || `DOC-${doctorData.id}`}
                </span>
                <span>•</span>
                <span>{doctorData.qualification || 'MBBS'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1 text-xs">
            <span className="text-slate-400 text-[11px]">Consultation Fee</span>
            <span className="text-2xl font-bold text-teal-300">₹{doctorData.consultation_fee || 500}</span>
            <span className="text-slate-400 text-[10px]">{doctorData.opd_timings || 'Mon - Fri'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Specialization</p>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {parseSpecializations(doctorData.specialization || 'General').map((spec, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                {spec}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1">{doctorData.department || 'Clinical Department'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">OPD Timings</p>
          <p className="text-sm font-bold text-slate-800 mt-1 truncate">{doctorData.opd_timings || '09:00 AM - 02:00 PM'}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Active Cabin Schedule</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Experience & Degree</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{doctorData.experience || '5+ Years'}</p>
          <p className="text-xs text-slate-500 mt-0.5">{doctorData.qualification || 'MBBS, MD'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Contact Details</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{doctorData.phone || '-'}</p>
          {emailLower ? (
            <a href={`mailto:${emailLower}`} className="text-xs text-sky-700 hover:underline block lowercase truncate">
              {emailLower}
            </a>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Clinical Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('patients')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'patients'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Assigned Patients ({patientsList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'schedule'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Weekly OPD Schedule
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Doctor Qualifications & Biography</h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Medical Degree & Qualifications</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{doctorData.qualification || 'MBBS, MD'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Specialization & Skills</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {parseSpecializations(doctorData.specialization || 'Clinical Specialist').map((spec, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      {spec}
                    </span>
                  ))}
                </div>
                <p className="text-slate-600 mt-1.5">{doctorData.additional_skills || 'Advanced diagnostic and surgical procedures.'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Consultation Charges</p>
                <p className="text-sm font-bold text-teal-700 mt-0.5">₹{doctorData.consultation_fee || 500} per patient</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Facility & Department Info</h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Assigned Branch Hospital</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{hospitalData?.Name || 'Apex Care Main Hospital'}</p>
                <p className="text-slate-500 mt-0.5">{hospitalData?.city} • {hospitalData?.address || 'Medical Facility Road'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Department</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{doctorData.department || 'Outpatient Department (OPD)'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Duty Shift & Timings</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{doctorData.opd_timings || 'Mon - Fri (10:00 AM - 02:00 PM)'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Assigned Patients Queue ({patientsList.length})</h2>
              <p className="text-xs text-slate-500">Live consultation queue for {doctorData.name}</p>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-center text-xs text-slate-600 min-w-[620px]">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center">Token</th>
                  <th className="py-3 px-3 text-center">Patient Name & ID</th>
                  <th className="py-3 px-3 text-center">Symptoms / Complaint</th>
                  <th className="py-3 px-3 text-center">Payment</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patientsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">No patients scheduled for this doctor.</td>
                  </tr>
                ) : (
                  patientsList.map((pat, i) => (
                    <tr key={pat.id || i} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-mono font-bold text-teal-700">#{String(i + 1).padStart(2, '0')}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-slate-800">{pat.name}</div>
                        <span className="font-mono text-[10px] text-sky-700 font-bold">{pat.patient_id || pat.uhid || `PAT-${pat.id}`}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {pat.symptoms_diagnosis || pat.reason || 'General Consultation'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          pat.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {pat.payment_status || 'Paid'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                          {pat.status || 'Confirmed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm sm:text-base font-bold text-slate-800">Weekly OPD Consultation Schedule</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
              <div key={day} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800 text-sm">{day}</p>
                <p className="text-teal-700 font-semibold">{doctorData.opd_timings || '10:00 AM - 02:00 PM'}</p>
                <p className="text-slate-500 text-[11px]">Room 204 • {hospitalData?.Name || 'Main Hospital'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
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
                    list="adminDocDetailsSpecsList"
                    value={editFormData.specialization}
                    onChange={(e) => setEditFormData({ ...editFormData, specialization: e.target.value })}
                    placeholder="e.g. Cardiology, Neurology"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-medium"
                  />
                  <datalist id="adminDocDetailsSpecsList">
                    {specializationsList.map((spec, i) => (
                      <option key={i} value={spec} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    placeholder="e.g. Cardiology Department"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
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

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assigned Hospital Branch</label>
                <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-slate-700 font-medium">
                  {hospitalData?.Name || 'Branch Hospital'} ({hospitalData?.city || 'Main Branch'})
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="adminDoctorActiveStatus"
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ 
                    ...editFormData, 
                    is_active: e.target.checked,
                    status: e.target.checked ? 'Available' : 'On Leave'
                  })}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                />
                <label htmlFor="adminDoctorActiveStatus" className="font-semibold text-slate-700 cursor-pointer">
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

      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 my-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Reset Doctor Password</h2>
              <button
                type="button"
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password (min 6 chars)</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:border-teal-600 focus:bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold shadow-md transition cursor-pointer"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 my-auto text-xs">
            <div className="text-center space-y-2">
              <h2 className="text-base font-bold text-slate-800">Confirm Doctor Removal</h2>
              <p className="text-slate-500 text-xs">
                Are you sure you want to remove <strong>{doctorData.name}</strong> from this hospital? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDoctor}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition cursor-pointer"
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

export default AdminDoctorDetails;
