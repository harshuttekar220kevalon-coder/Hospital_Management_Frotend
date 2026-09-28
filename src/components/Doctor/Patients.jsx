import React, { useState, useEffect } from 'react';

const DoctorPatients = ({ currentUser, setCurrentPage }) => {
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [patients, setPatients] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);
  const [updatingPatientId, setUpdatingPatientId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const STATUS_OPTIONS = ['Pending', 'Assigned', 'Admitted', 'Discharged', 'Cancelled'];

  const loadDoctorPatients = async () => {
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
        console.error('Error fetching patients queue:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorPatients();
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
          ? `Checkup completed for Patient #${patient.id} (${patient.name || 'Patient'}). Discharged in system!`
          : `Patient #${patient.id} status updated to "Pending".`
      );
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating patient status:', err);
    } finally {
      setUpdatingPatientId(null);
    }
  };

  const completedCheckupCount = patients.filter(p => isCompletedStatus(p.status)).length;
  const pendingCheckupCount = patients.filter(p => !isCompletedStatus(p.status)).length;

  const filteredPatients = patients.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    const nameMatch = (p.name || '').toLowerCase().includes(term);
    const idMatch = (p.patient_id || p.uhid || `PAT-${p.id}` || '').toLowerCase().includes(term);
    const symptomsMatch = (p.symptoms_diagnosis || p.reason || '').toLowerCase().includes(term);
    const contactMatch = (p.contact || p.phone || '').toLowerCase().includes(term);
    const matchesSearch = !term || nameMatch || idMatch || symptomsMatch || contactMatch;

    let matchesStatus = true;
    if (statusFilter === 'Pending') {
      matchesStatus = !isCompletedStatus(p.status);
    } else if (statusFilter === 'Completed') {
      matchesStatus = isCompletedStatus(p.status);
    }

    return matchesSearch && matchesStatus;
  });

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
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100 whitespace-nowrap"
          >
            Special & Emergency Cases
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('doctor_patients')}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer bg-teal-600 text-white shadow-xs whitespace-nowrap"
          >
            Patient Checkup Queue ({pendingCheckupCount} Pending)
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
          onClick={loadDoctorPatients}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer shrink-0"
        >
          Refresh
        </button>
      </div>

      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                Assigned Clinical Queue
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                Dr. {cleanDocName}
              </span>
              <span className="text-xs text-slate-400">
                {hospitalName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 text-slate-100 tracking-tight">
              Assigned Patients & Live Checkup Workflow
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Manage your assigned clinical OPD consultations. Mark checkups completed in real time to automatically decrease the pending consultation queue.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/90 px-4 py-3 rounded-2xl border border-slate-700 shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Remaining Checkups</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-amber-400 font-mono">
                  {pendingCheckupCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  / {patients.length} Total Patients
                </span>
              </div>
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

      {/* TOP STATS CARDS: Total Patients of Today, Pending today, Completed today */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Patients of Today</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{patients.length}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Assigned to Dr. {cleanDocName}</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-300 shadow-xs bg-amber-50/30 ring-1 ring-amber-200/50">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending today</p>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{pendingCheckupCount}</h3>
          <p className="text-xs text-amber-700/80 mt-0.5 font-medium">Waiting in queue</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-300 shadow-xs bg-emerald-50/30 ring-1 ring-emerald-200/50">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Completed today</p>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{completedCheckupCount}</h3>
          <p className="text-xs text-emerald-700/80 mt-0.5 font-medium">Completed Consultations</p>
        </div>
      </div>

      {/* PATIENT TABLE & CHECKUP ACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Doctor Patient Queue & Consultation Checklist</h2>
            <p className="text-xs text-slate-500">Click "Complete Checkup" to mark consultation finished and decrease queue count</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search patient name, ID, symptoms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">All Patients ({patients.length})</option>
              <option value="Pending">Pending today ({pendingCheckupCount})</option>
              <option value="Completed">Completed today ({completedCheckupCount})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-center text-xs text-slate-600 min-w-[650px]">
            <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">Token</th>
                <th className="py-3 px-3 text-center">Patient & ID</th>
                <th className="py-3 px-3 text-center">Age / Gender</th>
                <th className="py-3 px-3 text-center">Symptoms / Complaint</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions & Checkup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading assigned patient checkup queue...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No patients found matching this filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPatients.slice(0, visibleCount).map((pat, idx) => {
                  const patientIdDisplay = pat.patient_id || pat.uhid || (pat.id ? `PAT-${pat.id}` : '-');
                  const isDone = isCompletedStatus(pat.status);
                  const isUpdating = updatingPatientId === pat.id;

                  return (
                    <tr key={pat.id || idx} className={`transition ${isDone ? 'bg-slate-50/40 opacity-75' : 'hover:bg-slate-50/70'}`}>
                      <td className="py-3 px-3 font-mono font-bold text-teal-700">
                        #{String(idx + 1).padStart(2, '0')}
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
                        <span className="font-medium text-slate-800 block max-w-[200px] mx-auto truncate" title={pat.symptoms_diagnosis || pat.reason}>
                          {pat.symptoms_diagnosis || pat.reason || '-'}
                        </span>
                        {pat.symptoms_severity && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border inline-block mt-0.5 ${
                            pat.symptoms_severity === 'Emergency' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            pat.symptoms_severity === 'Urgent' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {pat.symptoms_severity}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isDone ? 'Completed' : 'Pending'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* ACTIONS DROPDOWN: Pending & Completed (Discharge) */}
                          <select
                            value={isDone ? 'Completed' : 'Pending'}
                            onChange={(e) => handleUpdatePatientStatus(pat, e.target.value)}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer disabled:opacity-50"
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

        {visibleCount < filteredPatients.length && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 rounded-xl">
            <button
              type="button"
              onClick={() => setVisibleCount(prev => prev + 10)}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More ({filteredPatients.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedPatientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">{selectedPatientModal.name}</h3>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-0.5">
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
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Chief Complaints / Diagnosis</span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {selectedPatientModal.symptoms_diagnosis || selectedPatientModal.reason || 'Routine consultation and clinical observation.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Age & Gender</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedPatientModal.age ? `${selectedPatientModal.age} Years` : '-'} • {selectedPatientModal.gender || '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Blood Group</span>
                  <p className="font-bold text-rose-700 mt-0.5">{selectedPatientModal.blood_group || '-'}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Contact Phone</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedPatientModal.contact || selectedPatientModal.phone || '-'}</p>
              </div>

              <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100 flex-wrap">
                <span className="text-slate-700 font-bold text-xs">Change Status:</span>
                <select
                  value={isCompletedStatus(selectedPatientModal.status) ? 'Completed' : 'Pending'}
                  onChange={(e) => handleUpdatePatientStatus(selectedPatientModal, e.target.value)}
                  disabled={updatingPatientId === selectedPatientModal.id}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer disabled:opacity-50"
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

export default DoctorPatients;
