import React, { useState, useEffect } from 'react';

const DoctorAppointments = ({ currentUser, setCurrentPage }) => {
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);
  const [updatingPatientId, setUpdatingPatientId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const STATUS_OPTIONS = ['Pending', 'Assigned', 'Admitted', 'Discharged', 'Cancelled'];

  const loadAppointmentsData = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const docId = currentUser?.id;
      const currentDocIdTag = currentUser?.doctor_id;

      let currentDoc = null;
      try {
        const docRes = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null);
        if (docRes && docRes.ok) {
          const docs = await docRes.json();
          if (Array.isArray(docs)) {
            currentDoc = docs.find(d => 
              (d.email && d.email.toLowerCase().trim() === email) ||
              (docId && Number(d.id) === Number(docId)) ||
              (currentDocIdTag && d.doctor_id === currentDocIdTag) ||
              (d.name && d.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        }
      } catch (err) {
        console.error('Error fetching doctor profile:', err);
      }

      const resolvedDoctor = currentDoc || currentUser || null;
      setDoctorInfo(resolvedDoctor);

      const targetHospId = resolvedDoctor?.hospital || (Array.isArray(resolvedDoctor?.hospitals) ? resolvedDoctor?.hospitals[0] : null) || currentUser?.hospital;
      if (targetHospId) {
        try {
          const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${targetHospId}/`).catch(() => null);
          if (hospRes && hospRes.ok) {
            const hospData = await hospRes.json();
            setHospitalInfo(hospData);
          }
        } catch (err) {
          console.error('Error fetching hospital record:', err);
        }
      }

      try {
        const patRes = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/').catch(() => null);
        if (patRes && patRes.ok) {
          const allPats = await patRes.json();
          if (Array.isArray(allPats)) {
            const myPatients = allPats.filter(p => {
              const matchDocId = (resolvedDoctor?.id && Number(p.doctor) === Number(resolvedDoctor.id)) ||
                (currentUser?.id && Number(p.doctor) === Number(currentUser.id));
              
              const matchDocName = resolvedDoctor?.name && p.doctor_name && 
                p.doctor_name.toLowerCase().trim() === resolvedDoctor.name.toLowerCase().trim();

              const matchDocTag = resolvedDoctor?.doctor_id && p.doctor_id &&
                p.doctor_id === resolvedDoctor.doctor_id;

              return matchDocId || matchDocName || matchDocTag;
            });
            setPatients(myPatients);
          }
        }
      } catch (err) {
        console.error('Error fetching appointments queue:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointmentsData();
  }, [currentUser]);

  const isCompletedStatus = (status) => {
    const s = (status || '').toLowerCase().trim();
    return s === 'discharged' || s === 'completed' || s.includes('discharg') || s.includes('complet');
  };

  const handleUpdatePatientStatus = async (patient, selectedOption) => {
    if (!selectedOption || !patient?.id) return;
    try {
      setUpdatingPatientId(patient.id);
      
      const backendStatus = (selectedOption === 'Completed' || selectedOption === 'Complete') ? 'Discharged' : 'Pending';

      let res = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${patient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: backendStatus })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${patient.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...patient, status: backendStatus })
        }).catch(() => null);
      }

      setPatients(prev => prev.map(p => p.id === patient.id ? { ...p, status: backendStatus } : p));
      if (selectedPatientModal && selectedPatientModal.id === patient.id) {
        setSelectedPatientModal(prev => ({ ...prev, status: backendStatus }));
      }
      setActionSuccessMsg(
        backendStatus === 'Discharged'
          ? `Patient #${patient.id} (${patient.name || 'Patient'}) marked as Completed (Discharged in system).`
          : `Patient #${patient.id} marked as Pending.`
      );
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating patient status:', err);
    } finally {
      setUpdatingPatientId(null);
    }
  };

  const handleUpdateSeverity = async (patient, newSeverity) => {
    if (!newSeverity || !patient?.id) return;
    try {
      setUpdatingPatientId(patient.id);
      let res = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${patient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms_severity: newSeverity })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${patient.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...patient, symptoms_severity: newSeverity })
        }).catch(() => null);
      }

      setPatients(prev => prev.map(p => p.id === patient.id ? { ...p, symptoms_severity: newSeverity } : p));
      if (selectedPatientModal && selectedPatientModal.id === patient.id) {
        setSelectedPatientModal(prev => ({ ...prev, symptoms_severity: newSeverity }));
      }
      setActionSuccessMsg(`Patient #${patient.id} priority updated to "${newSeverity}".`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating severity:', err);
    } finally {
      setUpdatingPatientId(null);
    }
  };

  const isEmergencyOrSpecial = (pat) => {
    const sev = (pat.symptoms_severity || '').toLowerCase();
    const reason = (pat.symptoms_diagnosis || pat.reason || '').toLowerCase();
    const isEmerg = sev === 'emergency' || sev.includes('emerg') || sev.includes('critical');
    const isUrg = sev === 'urgent' || sev.includes('urg') || sev.includes('high');
    const isSpecial = reason.includes('special') || reason.includes('vip') || reason.includes('icu') || reason.includes('cardiac') || reason.includes('surgery') || reason.includes('operation');
    return isEmerg || isUrg || isSpecial;
  };

  // Only show Emergency & Special Appointments
  const emergencySpecialList = patients.filter(isEmergencyOrSpecial);

  const emergencyCount = emergencySpecialList.filter(p => {
    const s = (p.symptoms_severity || '').toLowerCase();
    return s.includes('emerg') || s.includes('critical');
  }).length;

  const urgentCount = emergencySpecialList.filter(p => {
    const s = (p.symptoms_severity || '').toLowerCase();
    return s.includes('urg') || s.includes('high');
  }).length;

  const specialConsultsCount = emergencySpecialList.filter(p => {
    const s = (p.symptoms_severity || '').toLowerCase();
    return !s.includes('emerg') && !s.includes('urg');
  }).length;

  const admittedCount = emergencySpecialList.filter(p => (p.status || '').toLowerCase().includes('admit')).length;
  const pendingTriageCount = emergencySpecialList.filter(p => {
    const s = (p.status || '').toLowerCase();
    return s.includes('pending') || s.includes('wait') || !s;
  }).length;

  const filteredList = emergencySpecialList.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    const nameMatch = (p.name || '').toLowerCase().includes(term);
    const idMatch = (p.patient_id || p.uhid || `PAT-${p.id}` || '').toLowerCase().includes(term);
    const symptomsMatch = (p.symptoms_diagnosis || p.reason || '').toLowerCase().includes(term);
    const contactMatch = (p.contact || p.phone || '').toLowerCase().includes(term);
    const matchesSearch = !term || nameMatch || idMatch || symptomsMatch || contactMatch;

    const sev = (p.symptoms_severity || '').toLowerCase();
    const status = (p.status || '').toLowerCase();
    let matchesFilter = true;

    if (filterType === 'Emergency') {
      matchesFilter = sev.includes('emerg') || sev.includes('critical');
    } else if (filterType === 'Urgent') {
      matchesFilter = sev.includes('urg') || sev.includes('high');
    } else if (filterType === 'Special') {
      matchesFilter = !sev.includes('emerg') && !sev.includes('urg');
    } else if (filterType === 'Pending') {
      matchesFilter = status.includes('pending') || status.includes('wait') || !status;
    } else if (filterType === 'Admitted') {
      matchesFilter = status.includes('admit');
    }

    return matchesSearch && matchesFilter;
  });

  const getSeverityBadge = (sev) => {
    const s = (sev || 'Normal').toLowerCase();
    if (s.includes('emerg') || s.includes('critical')) {
      return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    }
    if (s.includes('urg') || s.includes('high')) {
      return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
    }
    return 'bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold';
  };

  const getStatusBadge = (status) => {
    const s = (status || 'Pending').toLowerCase().trim();
    if (s === 'admitted' || s.includes('admit')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (s === 'discharged' || s.includes('discharg') || s.includes('complet')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s === 'cancelled' || s.includes('cancel') || s.includes('reject')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (s === 'assigned' || s.includes('assign') || s.includes('consult')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const docName = doctorInfo?.name || currentUser?.name || 'Doctor';
  const cleanDocName = docName.replace(/^Dr\.?\s*/i, '');
  const hospitalName = hospitalInfo?.Name || doctorInfo?.hospital_name || 'Main Hospital';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* DOCTOR NAVIGATION BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-2.5 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('doctor_dashboard')}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100 whitespace-nowrap"
          >
            Dashboard Overview
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('doctor_appointments')}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer bg-rose-600 text-white shadow-xs whitespace-nowrap"
          >
            Special & Emergency Cases ({emergencySpecialList.length})
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('doctor_patients')}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100 whitespace-nowrap"
          >
            Patient Checkup Queue ({patients.length})
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('doctor_schedule')}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100 whitespace-nowrap"
          >
            Regular OPD Schedule
          </button>
        </div>

        <button
          type="button"
          onClick={loadAppointmentsData}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer shrink-0"
        >
          Refresh
        </button>
      </div>

      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                Emergency & Special Case Triage
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                Dr. {cleanDocName}
              </span>
              <span className="text-xs text-slate-400">
                {hospitalName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 text-slate-100 tracking-tight">
              Special Appointments & Critical Emergency Triage
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Real-time monitoring for high-priority emergency cases, urgent clinical visits, and VIP special consultations assigned to Dr. {cleanDocName}.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-3 rounded-2xl border border-slate-700 shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Priority Queue</span>
              <span className="text-xl font-extrabold text-rose-300 font-mono">
                {emergencyCount} Critical • {urgentCount} Urgent
              </span>
            </div>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{actionSuccessMsg}</span>
          </div>
          <button type="button" onClick={() => setActionSuccessMsg('')} className="text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-slate-400">Total Flagged</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1">{emergencySpecialList.length}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Special & Emergency</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs bg-rose-50/20">
          <p className="text-[10px] font-bold uppercase text-rose-700">Critical Emergency</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-rose-800 mt-1">{emergencyCount}</h3>
          <p className="text-xs text-rose-600 mt-0.5">Immediate Attention</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs bg-amber-50/20">
          <p className="text-[10px] font-bold uppercase text-amber-700">Urgent Priority</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-amber-800 mt-1">{urgentCount}</h3>
          <p className="text-xs text-amber-600 mt-0.5">High Priority Cases</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-indigo-200 shadow-xs bg-indigo-50/20">
          <p className="text-[10px] font-bold uppercase text-indigo-700">Special / VIP</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-800 mt-1">{specialConsultsCount}</h3>
          <p className="text-xs text-indigo-600 mt-0.5">Specialized Care</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-purple-200 shadow-xs bg-purple-50/20 col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold uppercase text-purple-700">Admitted IPD</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-purple-800 mt-1">{admittedCount}</h3>
          <p className="text-xs text-purple-600 mt-0.5">{pendingTriageCount} Pending Triage</p>
        </div>
      </div>

      {/* EMERGENCY PATIENT LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
              Emergency & Special Case Appointments Queue
            </h2>
            <p className="text-xs text-slate-500">Fast-track clinical decision and triage workflow</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search emergency case, UHID, symptom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="ALL">All Special & Emergency ({emergencySpecialList.length})</option>
              <option value="Emergency">Critical Emergency ({emergencyCount})</option>
              <option value="Urgent">Urgent Priority ({urgentCount})</option>
              <option value="Special">Special Consultations ({specialConsultsCount})</option>
              <option value="Pending">Pending Triage ({pendingTriageCount})</option>
              <option value="Admitted">Admitted IPD ({admittedCount})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-center text-xs text-slate-600 min-w-[760px]">
            <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">Priority</th>
                <th className="py-3 px-3 text-center">Patient & ID</th>
                <th className="py-3 px-3 text-center">Age / Gender</th>
                <th className="py-3 px-3 text-center">Chief Complaint / Severity</th>
                <th className="py-3 px-3 text-center">Contact / Phone</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading special and emergency appointments...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-slate-700 text-sm">No Emergency or Special Appointments Pending</p>
                    <p className="text-xs text-slate-400 mt-0.5">All regular patients can be viewed in the Patient Checkup Queue.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((pat, idx) => {
                  const patientIdDisplay = pat.patient_id || pat.uhid || (pat.id ? `PAT-${pat.id}` : '-');
                  const currentStatus = pat.status || 'Pending';
                  const currentSeverity = pat.symptoms_severity || 'Emergency';
                  const isUpdating = updatingPatientId === pat.id;
                  const isCritical = currentSeverity.toLowerCase().includes('emerg') || currentSeverity.toLowerCase().includes('critical');

                  return (
                    <tr key={pat.id || idx} className={`transition ${isCritical ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-slate-50/70'}`}>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] border inline-flex items-center gap-1 ${getSeverityBadge(currentSeverity)}`}>
                          {isCritical && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>}
                          {currentSeverity}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-slate-800">{pat.name || 'Patient'}</div>
                        <span className="font-mono text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-0.5">
                          {patientIdDisplay}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {pat.age ? `${pat.age} Y` : '-'} • {pat.gender || '-'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-semibold text-slate-900 block max-w-[200px] mx-auto truncate" title={pat.symptoms_diagnosis || pat.reason}>
                          {pat.symptoms_diagnosis || pat.reason || 'Emergency Consultation'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-bold text-slate-800 text-xs">
                            {pat.contact || pat.phone || '-'}
                          </span>
                          {pat.contact && (
                            <a
                              href={`tel:${pat.contact}`}
                              className="text-[10px] text-rose-700 hover:underline font-semibold mt-0.5"
                            >
                              Direct Call
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isCompletedStatus(currentStatus) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isCompletedStatus(currentStatus) ? 'Completed' : 'Pending'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <select
                            value={isCompletedStatus(pat.status) ? 'Completed' : 'Pending'}
                            onChange={(e) => handleUpdatePatientStatus(pat, e.target.value)}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => setSelectedPatientModal(pat)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer border border-slate-200"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedPatientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(selectedPatientModal.symptoms_severity)}`}>
                    {selectedPatientModal.symptoms_severity || 'Emergency'}
                  </span>
                  <h3 className="text-base font-bold text-slate-800">{selectedPatientModal.name}</h3>
                </div>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-1">
                  {selectedPatientModal.patient_id || selectedPatientModal.uhid || `PAT-${selectedPatientModal.id}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatientModal(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200 space-y-1">
                <span className="text-rose-700 uppercase font-bold text-[10px]">Chief Complaints & Diagnosis</span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {selectedPatientModal.symptoms_diagnosis || selectedPatientModal.reason || 'Emergency acute symptoms under doctor evaluation.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Age & Gender</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedPatientModal.age ? `${selectedPatientModal.age} Years` : '-'} • {selectedPatientModal.gender || '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Blood Group</span>
                  <p className="font-bold text-rose-700 mt-0.5">{selectedPatientModal.blood_group || 'Not Known'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Contact Phone</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedPatientModal.contact || selectedPatientModal.phone || '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Triage Priority</span>
                  <select
                    value={selectedPatientModal.symptoms_severity || 'Emergency'}
                    onChange={(e) => handleUpdateSeverity(selectedPatientModal, e.target.value)}
                    className="w-full mt-1 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 bg-white"
                  >
                    <option value="Emergency">Critical Emergency</option>
                    <option value="Urgent">Urgent Priority</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100 flex-wrap">
                <span className="text-slate-700 font-bold text-xs">Update Status:</span>
                <select
                  value={isCompletedStatus(selectedPatientModal.status) ? 'Completed' : 'Pending'}
                  onChange={(e) => handleUpdatePatientStatus(selectedPatientModal, e.target.value)}
                  disabled={updatingPatientId === selectedPatientModal.id}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed (Discharge)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;
