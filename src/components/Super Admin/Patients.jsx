import React, { useState, useEffect } from 'react';

const Patients = ({ currentUser, setCurrentPage }) => {
  const [patients, setPatients] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [specializationFilter, setSpecializationFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const [detailPatient, setDetailPatient] = useState(null);
  const [inspectDocModal, setInspectDocModal] = useState(null);
  const [statusUpdateTarget, setStatusUpdateTarget] = useState(null);
  const [newStatusValue, setNewStatusValue] = useState('');
  const [auditRemarkText, setAuditRemarkText] = useState('');

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const hospRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/').catch(() => null);
      if (hospRes && hospRes.ok) {
        const hospData = await hospRes.json();
        setHospitalsList(hospData);
      }

      const docRes = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null);
      if (docRes && docRes.ok) {
        const docData = await docRes.json();
        setDoctorsList(docData);
      }

      const adminRes = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/').catch(() => null);
      if (adminRes && adminRes.ok) {
        const adminData = await adminRes.json();
        setAdminsList(adminData);
      }

      const patRes = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/').catch(() => null);
      if (patRes && patRes.ok) {
        const patData = await patRes.json();
        setPatients(patData);
      } else {
        setPatients([]);
      }
    } catch (err) {
      console.error('Error fetching backend data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const todayDateStr = new Date().toISOString().split('T')[0];

  const isAppliedToday = (item) => {
    if (!item.applied_at && !item.created_at) return false;
    const dateVal = item.applied_at || item.created_at;
    return dateVal.includes(todayDateStr);
  };

  const todayApplicationsCount = patients.filter(p => isAppliedToday(p)).length;
  const totalPatientsCount = patients.length;
  const pendingReviewCount = patients.filter(p => p.status === 'Pending' || p.status === 'Pending Review').length;
  const confirmedCount = patients.filter(p => p.status === 'Confirmed' || p.status === 'Admitted' || p.status === 'In Consultation').length;
  const urgentEmergencyCount = patients.filter(p => p.symptoms_severity === 'Urgent' || p.symptoms_severity === 'Emergency').length;

  const filteredPatients = patients.filter((patient) => {
    const term = searchTerm.toLowerCase();

    if (activeTab === 'TODAY' && !isAppliedToday(patient)) return false;
    if (activeTab === 'PENDING' && patient.status !== 'Pending' && patient.status !== 'Pending Review') return false;
    if (activeTab === 'CONFIRMED' && patient.status !== 'Confirmed' && patient.status !== 'In Consultation' && patient.status !== 'Admitted') return false;
    if (activeTab === 'COMPLETED' && patient.status !== 'Completed') return false;

    const assignedHosp = hospitalsList.find(h => h.id === patient.hospital);
    const hospName = assignedHosp ? assignedHosp.Name : (patient.hospital_name || '');

    const matchesSearch =
      (patient.name || '').toLowerCase().includes(term) ||
      (patient.patient_id || patient.uhid || '').toLowerCase().includes(term) ||
      (patient.contact || patient.phone || '').toLowerCase().includes(term) ||
      (patient.email || '').toLowerCase().includes(term) ||
      (patient.doctor_name || '').toLowerCase().includes(term) ||
      hospName.toLowerCase().includes(term) ||
      (patient.symptoms_diagnosis || patient.reason_for_visit || '').toLowerCase().includes(term);

    const matchesHospital =
      hospitalFilter === 'ALL'
        ? true
        : (patient.hospital || '').toString() === hospitalFilter || hospName.toLowerCase().includes(hospitalFilter.toLowerCase());

    const matchesSpec =
      specializationFilter === 'ALL'
        ? true
        : (patient.doctor_specialization || '').toLowerCase().includes(specializationFilter.toLowerCase());

    const matchesSeverity =
      severityFilter === 'ALL'
        ? true
        : (patient.symptoms_severity || '').toLowerCase() === severityFilter.toLowerCase();

    return matchesSearch && matchesHospital && matchesSpec && matchesSeverity;
  });

  const handleOpenStatusModal = (patient) => {
    setStatusUpdateTarget(patient);
    setNewStatusValue(patient.status || 'Confirmed');
    setAuditRemarkText(patient.symptoms_diagnosis || '');
  };

  const handleSaveStatusUpdate = async () => {
    if (!statusUpdateTarget) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${statusUpdateTarget.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatusValue,
          symptoms_diagnosis: auditRemarkText
        })
      });

      if (response.ok) {
        alert('Patient status updated successfully.');
        setStatusUpdateTarget(null);
        fetchAllData();
      } else {
        alert('Failed to update status.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Patient Applications & Visits (PostgreSQL Database)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                {todayApplicationsCount} Applied Today
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                {pendingReviewCount} Pending Review
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">
              Patients & Incoming Applications Registry
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live central surveillance of patient registrations fetched directly from the database, showing preferred doctors, target hospitals, and handling administrators.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right hidden md:block">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Mode</span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 block">
              Super Admin Read / Audit
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('TODAY')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${
            activeTab === 'TODAY' ? 'bg-sky-50/90 border-sky-400 ring-2 ring-sky-300' : 'bg-white border-slate-200 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Today's Applications</p>
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></span>
          </div>
          <h3 className="text-2xl font-bold text-sky-900 mt-1">{todayApplicationsCount}</h3>
          <p className="text-[11px] text-sky-700 mt-0.5 font-medium">Applied Today</p>
        </div>

        <div
          onClick={() => setActiveTab('ALL')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${
            activeTab === 'ALL' ? 'bg-slate-100/90 border-slate-400 ring-2 ring-slate-300' : 'bg-white border-slate-200 hover:border-slate-400'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Patients</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalPatientsCount}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Stored in PostgreSQL DB</p>
        </div>

        <div
          onClick={() => setActiveTab('PENDING')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${
            activeTab === 'PENDING' ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300' : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Review</p>
          <h3 className="text-2xl font-bold text-amber-700 mt-1">{pendingReviewCount}</h3>
          <p className="text-[11px] text-amber-600 mt-0.5">Awaiting Action</p>
        </div>

        <div
          onClick={() => setActiveTab('CONFIRMED')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${
            activeTab === 'CONFIRMED' ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-300' : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Scheduled / Active</p>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">{confirmedCount}</h3>
          <p className="text-[11px] text-emerald-600 mt-0.5">Confirmed Visits</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Urgent Cases</p>
          <h3 className="text-2xl font-bold text-rose-700 mt-1">{urgentEmergencyCount}</h3>
          <p className="text-[11px] text-rose-600 mt-0.5">Critical Triage</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-slate-200/70 p-1.5 rounded-xl border border-slate-300">
        <button
          type="button"
          onClick={() => setActiveTab('TODAY')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'TODAY' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          Today's Applications ({todayApplicationsCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          All Applications ({totalPatientsCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'PENDING' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          Pending Review ({pendingReviewCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CONFIRMED')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'CONFIRMED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          Confirmed / In-Progress ({confirmedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'COMPLETED' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          Completed Consultations
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patient name, UHID, phone, doctor, hospital, or symptoms..."
            className="w-full pl-3 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">All Hospital Branches</option>
            {hospitalsList.map((h) => (
              <option key={h.id} value={h.id}>
                {h.Name} ({h.city})
              </option>
            ))}
          </select>

          <select
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">All Specializations</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Neurology">Neurology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Obstetrics">Obstetrics & Gynecology</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="General">General Medicine</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
          >
            <option value="ALL">All Triage Severities</option>
            <option value="Normal">Normal</option>
            <option value="Urgent">Urgent</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <p className="text-center py-8 text-xs text-slate-500">Loading patient records from database...</p>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs font-semibold text-slate-500">No patient applications found in database.</p>
              <p className="text-[11px] text-slate-400 mt-1">Patients will appear here automatically when registered.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600 min-w-[980px]">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Patient Name & ID</th>
                  <th className="py-3.5 px-4">Visit Time & Schedule</th>
                  <th className="py-3.5 px-4">Requested Doctor</th>
                  <th className="py-3.5 px-4">Target Hospital & Admin</th>
                  <th className="py-3.5 px-4">Attached Documents</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((pat) => {
                  const assignedHosp = hospitalsList.find(h => h.id === pat.hospital);
                  const assignedAdmin = adminsList.find(a => a.hospital === pat.hospital);
                  const appliedToday = isAppliedToday(pat);

                  return (
                    <tr key={pat.id} className={`transition ${appliedToday ? 'bg-sky-50/40 hover:bg-sky-50/70' : 'hover:bg-slate-50/70'}`}>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-800 text-sm">{pat.name}</p>
                          {appliedToday && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-600 text-white uppercase">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-sky-800 font-semibold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                            {pat.patient_id || pat.uhid || `PAT-${pat.id}`}
                          </span>
                          <span className="text-[10px] text-slate-500">{pat.age_gender || pat.contact}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">
                          {pat.visit_date_time ? new Date(pat.visit_date_time).toLocaleString() : (pat.appointment_time || 'Not Scheduled')}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Applied: {pat.applied_at || pat.created_at || 'Recent'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-teal-800">{pat.doctor_name || (pat.doctor ? pat.doctor.name : 'Assigned Doctor')}</p>
                        <p className="text-[10px] text-slate-500">{pat.doctor_specialization || 'Specialist'}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-indigo-700">{assignedHosp?.Name || pat.hospital_name || 'Branch Hospital'}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Admin: <span className="font-medium text-slate-700">{assignedAdmin?.name || pat.admin_name || 'Hospital Admin'}</span>
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        {pat.attached_document ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            📎 {pat.attached_document}
                          </span>
                        ) : pat.attached_documents && pat.attached_documents.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setInspectDocModal(pat)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold border border-slate-300 transition cursor-pointer"
                          >
                            {pat.attached_documents.length} File(s) &rarr;
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No document</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${
                          pat.status === 'Confirmed' || pat.status === 'Admitted' || pat.status === 'In Consultation'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : pat.status === 'Pending' || pat.status === 'Pending Review'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : pat.status === 'Completed'
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {pat.status || 'Pending'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setDetailPatient(pat)}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white font-semibold text-[11px] transition cursor-pointer border border-sky-200"
                          >
                            Full Details
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(pat)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-semibold text-[11px] transition cursor-pointer border border-indigo-200"
                          >
                            Audit / Status
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

      {detailPatient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                    UHID: {detailPatient.patient_id || detailPatient.uhid}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    detailPatient.status === 'Confirmed' || detailPatient.status === 'Admitted'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {detailPatient.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mt-2">{detailPatient.name}</h2>
                <p className="text-xs text-slate-500">
                  {detailPatient.age_gender || `${detailPatient.gender || ''}, ${detailPatient.age || ''} years`} • Contact: <span className="font-bold text-slate-700">{detailPatient.contact}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailPatient(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-sky-50/70 rounded-xl border border-sky-200">
                <p className="font-bold text-sky-950 uppercase text-[11px] mb-2">Visit Timing & Application Timestamp</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Application Timestamp</span>
                    <span className="font-bold text-slate-800 text-xs">{detailPatient.applied_at || detailPatient.created_at}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Scheduled Visit Date & Time</span>
                    <span className="font-bold text-teal-800 text-xs">{detailPatient.visit_date_time ? new Date(detailPatient.visit_date_time).toLocaleString() : detailPatient.appointment_time}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-800 uppercase text-[11px] mb-1.5">Doctor Requested</p>
                  <p className="font-bold text-teal-800 text-sm">{detailPatient.doctor_name || 'Assigned Doctor'}</p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-800 uppercase text-[11px] mb-1.5">Hospital Branch & Handling Admin</p>
                  <p className="font-bold text-indigo-700 text-sm">{hospitalsList.find(h => h.id === detailPatient.hospital)?.Name || detailPatient.hospital_name || 'Branch Hospital'}</p>
                  <p className="text-slate-500 text-[11px] mt-1">
                    Admin: <span className="font-bold text-slate-700">{adminsList.find(a => a.hospital === detailPatient.hospital)?.name || detailPatient.admin_name || 'Assigned Admin'}</span>
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 uppercase text-[11px] mb-1.5">Attached Document & Symptoms</p>
                <p className="text-slate-700"><span className="font-semibold">Document: </span>{detailPatient.attached_document || 'None'}</p>
                <p className="text-slate-700 mt-1"><span className="font-semibold">Complaint / Symptoms: </span>{detailPatient.symptoms_diagnosis || detailPatient.reason_for_visit || 'Not specified'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  const target = detailPatient;
                  setDetailPatient(null);
                  handleOpenStatusModal(target);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold cursor-pointer border border-indigo-200"
              >
                Update Status / Audit
              </button>
              <button
                type="button"
                onClick={() => setDetailPatient(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {statusUpdateTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">Audit & Update Status</h3>
                <p className="text-xs text-slate-400">{statusUpdateTarget.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setStatusUpdateTarget(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Application Status</label>
                <select
                  value={newStatusValue}
                  onChange={(e) => setNewStatusValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Admitted">Admitted</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Clinical Notes / Symptoms</label>
                <textarea
                  rows="3"
                  value={auditRemarkText}
                  onChange={(e) => setAuditRemarkText(e.target.value)}
                  placeholder="Enter medical notes or audit remarks..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setStatusUpdateTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStatusUpdate}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;