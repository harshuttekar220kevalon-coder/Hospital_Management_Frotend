import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const DoctorPatients = ({ currentUser, setCurrentPage }) => {
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [assignedHospitals, setAssignedHospitals] = useState([]);
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [patients, setPatients] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Today_Pending');
  
  // Selected patient for Clinical Checkup & Admission modal
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('Normal');
  const [updatingPatientId, setUpdatingPatientId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Status helpers
  const isCompletedStatus = (status) => {
    const s = (status || '').toLowerCase().trim();
    return s === 'discharged' || s === 'completed' || s.includes('discharg') || s.includes('complet');
  };

  const isAdmitStatus = (status) => {
    const s = (status || '').toLowerCase().trim();
    return s.includes('admit');
  };

  // Condition helper
  const getPatientCondition = (patient) => {
    return patient?.Condation || patient?.condation || patient?.condition || patient?.Condition || patient?.symptoms_severity || 'Normal';
  };

  // Blood Group helper
  const getPatientBloodGroup = (patient) => {
    return patient?.Blood_Group || patient?.blood_group || patient?.BloodGroup || patient?.bloodGroup || patient?.blood || patient?.Blood || '-';
  };

  // Completed today localStorage tracking
  const getTodayKey = () => `doc_completed_today_${new Date().toISOString().split('T')[0]}`;

  const getCompletedTodayIds = () => {
    try {
      const raw = localStorage.getItem(getTodayKey());
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const saveCompletedTodayId = (id) => {
    try {
      const list = getCompletedTodayIds();
      if (!list.includes(Number(id))) {
        list.push(Number(id));
        localStorage.setItem(getTodayKey(), JSON.stringify(list));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeCompletedTodayId = (id) => {
    try {
      const list = getCompletedTodayIds().filter(i => Number(i) !== Number(id));
      localStorage.setItem(getTodayKey(), JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  // Date helper
  const getAppointmentDateInfo = (patient) => {
    if (!patient) {
      return {
        dateObj: null,
        isToday: false,
        isYesterday: false,
        isTomorrow: false,
        isPast: false,
        isUpcoming: false,
        diffDays: 0,
        dayLabel: 'Not Scheduled',
        timeFormatted: '--',
        dateFormatted: '--',
        fullScheduleDisplay: 'Not Scheduled',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
      };
    }

    const rawDateStr = patient.visit_date_time || patient.appointment_time || patient.appointment_date || patient.visit_date;

    if (!rawDateStr) {
      return {
        dateObj: null,
        isToday: false,
        isYesterday: false,
        isTomorrow: false,
        isPast: false,
        isUpcoming: false,
        diffDays: 999,
        dayLabel: 'Not Scheduled',
        timeFormatted: patient.appointment_time || '--',
        dateFormatted: patient.appointment_date || '--',
        fullScheduleDisplay: patient.appointment_date ? `${patient.appointment_date} ${patient.appointment_time || ''}` : 'Not Scheduled',
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200'
      };
    }

    const d = new Date(rawDateStr);
    if (isNaN(d.getTime())) {
      return {
        dateObj: null,
        isToday: false,
        isYesterday: false,
        isTomorrow: false,
        isPast: false,
        isUpcoming: false,
        diffDays: 999,
        dayLabel: 'Scheduled',
        timeFormatted: patient.appointment_time || '--',
        dateFormatted: patient.appointment_date || String(rawDateStr),
        fullScheduleDisplay: String(rawDateStr),
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200'
      };
    }

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const targetMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

    const timeFormatted = patient.appointment_time || d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateFormatted = d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

    const isToday = diffDays === 0;
    const isYesterday = diffDays === -1;
    const isTomorrow = diffDays === 1;
    const isPast = diffDays < 0;
    const isUpcoming = diffDays > 0;

    let dayLabel = '';
    let fullScheduleDisplay = '';
    let badgeClass = '';

    if (isToday) {
      dayLabel = 'Today';
      fullScheduleDisplay = `Today, ${timeFormatted}`;
      badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
    } else if (isYesterday) {
      dayLabel = 'Yesterday';
      fullScheduleDisplay = `Yesterday, ${timeFormatted}`;
      badgeClass = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
    } else if (isTomorrow) {
      dayLabel = 'Tomorrow';
      fullScheduleDisplay = `Tomorrow, ${timeFormatted}`;
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-300 font-semibold';
    } else if (diffDays < -1) {
      dayLabel = `${Math.abs(diffDays)}d Ago`;
      fullScheduleDisplay = `${dateFormatted}, ${timeFormatted}`;
      badgeClass = 'bg-slate-100 text-slate-700 border-slate-300 font-medium';
    } else {
      dayLabel = `In ${diffDays}d`;
      fullScheduleDisplay = `${dateFormatted}, ${timeFormatted}`;
      badgeClass = 'bg-purple-50 text-purple-700 border-purple-300 font-medium';
    }

    return {
      dateObj: d,
      isToday,
      isYesterday,
      isTomorrow,
      isPast,
      isUpcoming,
      diffDays,
      dayLabel,
      timeFormatted,
      dateFormatted,
      fullScheduleDisplay,
      badgeClass
    };
  };

  const isCompletedToday = (patient) => {
    if (!patient || !isCompletedStatus(patient.status)) return false;

    const completedIds = getCompletedTodayIds();
    if (completedIds.includes(Number(patient.id))) return true;

    const now = new Date();
    const dateToCheck = patient.completed_at || patient.discharge_date || patient.updated_at;
    if (dateToCheck) {
      const d = new Date(dateToCheck);
      if (!isNaN(d.getTime())) {
        if (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        ) {
          return true;
        }
      }
    }

    const visitInfo = getAppointmentDateInfo(patient);
    if (visitInfo.isToday) return true;

    return false;
  };

  const loadDoctorPatients = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const docId = currentUser?.id;
      const currentDocIdTag = currentUser?.doctor_id;

      // 1. Fetch all hospitals
      let allHospitals = [];
      try {
        const hospListRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
        if (hospListRes && hospListRes.ok) {
          allHospitals = await hospListRes.json();
        }
      } catch (e) {
        console.error('Error fetching hospitals:', e);
      }

      // 2. Fetch doctor profile
      let currentDoc = null;
      try {
        const docRes = await fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null);
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

      // Extract assigned hospital IDs
      const rawHospIds = Array.isArray(resolvedDoctor?.hospitals)
        ? resolvedDoctor.hospitals.map(h => Number(typeof h === 'object' ? h.id : h)).filter(Boolean)
        : (resolvedDoctor?.hospital ? [Number(typeof resolvedDoctor.hospital === 'object' ? resolvedDoctor.hospital.id : resolvedDoctor.hospital)].filter(Boolean) : []);

      if (currentUser?.hospital && !rawHospIds.includes(Number(currentUser.hospital))) {
        rawHospIds.push(Number(currentUser.hospital));
      }

      let docAssignedHospitals = allHospitals.filter(h => rawHospIds.includes(Number(h.id)));
      if (docAssignedHospitals.length === 0 && currentUser?.hospital_name) {
        const byName = allHospitals.find(h => (h.Name || h.name || '').toLowerCase() === currentUser.hospital_name.toLowerCase());
        if (byName) docAssignedHospitals = [byName];
      }
      setAssignedHospitals(docAssignedHospitals);

      const primaryHosp = docAssignedHospitals[0] || allHospitals.find(h => Number(h.id) === Number(rawHospIds[0])) || null;
      setHospitalInfo(primaryHosp);

      // 3. Fetch patients queue - STRICTLY FILTERED TO THIS ASSIGNED DOCTOR ONLY!
      try {
        const patRes = await fetch(`${API_BASE_URL}/super-admin/Patients/`).catch(() => null);
        if (patRes && patRes.ok) {
          const allPats = await patRes.json();
          if (Array.isArray(allPats)) {
            const myPatients = allPats.filter(p => {
              // Only patients explicitly assigned to this Doctor!
              if (!p.doctor && !p.doctor_name) return false;

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

  // Open Checkup & Decision Modal
  const handleOpenCheckupModal = (patient) => {
    setSelectedPatientModal(patient);
    setClinicalNotes(patient.symptoms_diagnosis || patient.reason_for_visit || '');
    setPrescriptionText(patient.prescription || patient.notes || '');
    setSelectedSeverity(getPatientCondition(patient) || 'Normal');
  };

  // Handle Clinical Decision: Admit vs OPD Completed
  const handleDoctorDecision = async (decisionType) => {
    if (!selectedPatientModal?.id) return;

    try {
      setUpdatingPatientId(selectedPatientModal.id);
      const nowIso = new Date().toISOString();
      const isAdmit = (decisionType === 'ADMIT');
      
      const newStatus = isAdmit ? 'Admit_Requested' : 'Completed';
      const updatedNotes = clinicalNotes.trim() + (prescriptionText.trim() ? `\n[Prescription / Advice: ${prescriptionText.trim()}]` : '');

      const payload = {
        ...selectedPatientModal,
        status: newStatus,
        Condation: selectedSeverity,
        condation: selectedSeverity,
        condition: selectedSeverity,
        symptoms_severity: selectedSeverity,
        symptoms_diagnosis: updatedNotes || selectedPatientModal.symptoms_diagnosis,
        completed_at: !isAdmit ? nowIso : null
      };

      if (!isAdmit) {
        saveCompletedTodayId(selectedPatientModal.id);
      } else {
        removeCompletedTodayId(selectedPatientModal.id);
      }

      let res = await fetch(`${API_BASE_URL}/super-admin/Patients/${selectedPatientModal.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${API_BASE_URL}/super-admin/Patients/${selectedPatientModal.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => null);
      }

      const updatedPat = {
        ...selectedPatientModal,
        ...payload
      };

      setPatients(prev => prev.map(p => p.id === selectedPatientModal.id ? updatedPat : p));
      setSelectedPatientModal(null);

      if (isAdmit) {
        setActionSuccessMsg(`🏥 Patient ${selectedPatientModal.name} (${selectedPatientModal.patient_id || `PAT-${selectedPatientModal.id}`}) has been marked for ADMISSION. Routed to Receptionist to allocate Bed & Nurse.`);
      } else {
        setActionSuccessMsg(`✓ Checkup completed for ${selectedPatientModal.name}. Added to Completed list.`);
      }

      setTimeout(() => setActionSuccessMsg(''), 5500);
      loadDoctorPatients();
    } catch (err) {
      console.error('Error saving doctor clinical decision:', err);
      alert('Error updating patient file in backend.');
    } finally {
      setUpdatingPatientId(null);
    }
  };

  const docName = doctorInfo?.name || currentUser?.name || 'Doctor';
  const cleanDocName = docName.replace(/^Dr\.?\s*/i, '');
  const hospitalName = hospitalInfo?.Name || doctorInfo?.hospital_name || 'Apex Care Hospital';

  // Filter patients by hospital filter first
  const hospitalScopedPatients = patients.filter(p => {
    if (hospitalFilter === 'ALL') return true;
    const patHospId = Number(typeof p.hospital === 'object' ? p.hospital?.id : p.hospital);
    const patHospName = (p.hospital_name || (typeof p.hospital === 'object' ? p.hospital?.Name : '') || '').toLowerCase().trim();
    const filterHosp = assignedHospitals.find(h => String(h.id) === String(hospitalFilter));
    const filterName = filterHosp?.Name?.toLowerCase().trim() || '';

    return patHospId === Number(hospitalFilter) ||
           (filterName && patHospName === filterName) ||
           patHospName === String(hospitalFilter).toLowerCase().trim();
  });

  // Day filtering
  const todayPatients = hospitalScopedPatients.filter(p => getAppointmentDateInfo(p).isToday);
  const todayPendingPatients = todayPatients.filter(p => !isCompletedStatus(p.status));
  const todayCompletedPatients = hospitalScopedPatients.filter(p => isCompletedToday(p));
  const admittedPatients = hospitalScopedPatients.filter(p => isAdmitStatus(p.status));
  const yesterdayPatients = hospitalScopedPatients.filter(p => getAppointmentDateInfo(p).isYesterday);
  const upcomingPatients = hospitalScopedPatients.filter(p => getAppointmentDateInfo(p).isUpcoming);

  const filteredPatients = hospitalScopedPatients.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    const nameMatch = (p.name || '').toLowerCase().includes(term);
    const idMatch = (p.patient_id || p.uhid || `PAT-${p.id}` || '').toLowerCase().includes(term);
    const symptomsMatch = (p.symptoms_diagnosis || p.reason || '').toLowerCase().includes(term);
    const contactMatch = (p.contact || p.phone || '').toLowerCase().includes(term);
    const matchesSearch = !term || nameMatch || idMatch || symptomsMatch || contactMatch;

    if (!matchesSearch) return false;

    const dateInfo = getAppointmentDateInfo(p);
    const completed = isCompletedStatus(p.status);
    const admitted = isAdmitStatus(p.status);
    const doneToday = isCompletedToday(p);

    if (statusFilter === 'Today_Pending') {
      return dateInfo.isToday && !completed;
    } else if (statusFilter === 'Today_Completed') {
      return doneToday;
    } else if (statusFilter === 'Today_All') {
      return dateInfo.isToday;
    } else if (statusFilter === 'Admitted') {
      return admitted;
    } else if (statusFilter === 'Yesterday') {
      return dateInfo.isYesterday;
    } else if (statusFilter === 'Upcoming') {
      return dateInfo.isUpcoming;
    } else if (statusFilter === 'Completed') {
      return completed;
    }
    return true;
  }).sort((a, b) => {
    const infoA = getAppointmentDateInfo(a);
    const infoB = getAppointmentDateInfo(b);
    if (infoA.dateObj && infoB.dateObj) {
      if (statusFilter === 'Yesterday') {
        return infoB.dateObj - infoA.dateObj;
      }
      return infoA.dateObj - infoB.dateObj;
    }
    return (a.id || 0) - (b.id || 0);
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* HEADER */}
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
              Consult with patients assigned to you by the Hospital Receptionist. Conduct checkup, enter diagnosis notes, and decide: Mark OPD Consultation Complete or Admit Patient to IPD Ward.
            </p>

            {/* ASSIGNED HOSPITALS BADGES */}
            {assignedHospitals.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {assignedHospitals.length > 1 ? `Affiliated Branches (${assignedHospitals.length}):` : 'Hospital Branch:'}
                </span>
                {assignedHospitals.map(h => (
                  <span
                    key={h.id}
                    onClick={() => setHospitalFilter(String(h.id))}
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                      hospitalFilter === String(h.id)
                        ? 'bg-teal-500 text-slate-900 border-teal-300 font-black shadow-xs'
                        : 'bg-teal-500/20 text-teal-300 border-teal-400/30 hover:bg-teal-500/30'
                    }`}
                  >
                    <span>{h.Name}</span>
                    <span className="text-[10px] opacity-80">({h.Branch_Code || `HOSP-${h.id}`})</span>
                  </span>
                ))}
                {assignedHospitals.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setHospitalFilter('ALL')}
                    className={`px-2 py-0.5 rounded-md text-xs font-bold border transition cursor-pointer ${
                      hospitalFilter === 'ALL'
                        ? 'bg-slate-100 text-slate-900 border-white'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    All Branches
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="flex items-center gap-3 bg-slate-800/90 px-4 py-3 rounded-2xl border border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Today's Remaining Checkups</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono">
                    {todayPendingPatients.length}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    / {todayPatients.length} Today Total
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={loadDoctorPatients}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh List
            </button>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{actionSuccessMsg}</span>
          </div>
          <button type="button" onClick={() => setActionSuccessMsg('')} className="text-emerald-700 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter('Today_All')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs ${statusFilter === 'Today_All' ? 'ring-2 ring-teal-500 border-teal-400' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today's Assigned Total</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Today</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{todayPatients.length}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Assigned by Receptionist</p>
        </div>

        <div
          onClick={() => setStatusFilter('Today_Pending')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs bg-amber-50/30 ${statusFilter === 'Today_Pending' ? 'ring-2 ring-amber-500 border-amber-400' : 'border-amber-300 hover:border-amber-400'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Checkups</p>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{todayPendingPatients.length}</h3>
          <p className="text-xs text-amber-700/80 mt-0.5 font-medium">Waiting for consultation</p>
        </div>

        <div
          onClick={() => setStatusFilter('Today_Completed')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs bg-emerald-50/30 ${statusFilter === 'Today_Completed' ? 'ring-2 ring-emerald-500 border-emerald-400' : 'border-emerald-300 hover:border-emerald-400'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Checkups Done</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">OPD Complete</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{todayCompletedPatients.length}</h3>
          <p className="text-xs text-emerald-700/80 mt-0.5 font-medium">Consulted & finished</p>
        </div>

        <div
          onClick={() => setStatusFilter('Admitted')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs bg-purple-50/30 ${statusFilter === 'Admitted' ? 'ring-2 ring-purple-500 border-purple-400' : 'border-purple-300 hover:border-purple-400'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Admitted (IPD)</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Inpatients</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-purple-800 mt-1">{admittedPatients.length}</h3>
          <p className="text-xs text-purple-700/80 mt-0.5">Admitted under your care</p>
        </div>
      </div>

      {/* PATIENT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Doctor Patient Queue ({filteredPatients.length})</h2>
            <p className="text-xs text-slate-500">Conduct checkups and make clinical decisions (OPD Complete vs IPD Admission)</p>
          </div>

          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Search by UHID, name, phone, symptoms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-teal-600 focus:bg-white transition"
            />
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setStatusFilter('Today_Pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Today_Pending' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Today's Pending ({todayPendingPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Today_Completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Today_Completed' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Completed Today ({todayCompletedPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Admitted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Admitted' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Admitted Inpatients ({admittedPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Assigned ({hospitalScopedPatients.length})
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-center text-xs text-slate-600 min-w-[780px]">
            <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">Token</th>
                <th className="py-3 px-3 text-left">Patient & UHID</th>
                <th className="py-3 px-3 text-center">Age / Gender / Blood</th>
                <th className="py-3 px-3 text-center">Assigned Schedule</th>
                <th className="py-3 px-3 text-left">Symptoms / Complaint</th>
                <th className="py-3 px-3 text-center">Clinical Status</th>
                <th className="py-3 px-3 text-right">Doctor Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading assigned patient checkup queue...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <div className="font-semibold text-slate-600">No patients found for this filter criteria.</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {statusFilter === 'Today_Pending' ? 'No pending consultations remaining for Today!' : 'Try switching to another tab.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.slice(0, visibleCount).map((pat, idx) => {
                  const patientIdDisplay = pat.patient_id || pat.uhid || (pat.id ? `PAT-${pat.id}` : '-');
                  const isDone = isCompletedStatus(pat.status);
                  const isAdmit = isAdmitStatus(pat.status);
                  const dateInfo = getAppointmentDateInfo(pat);
                  const condition = getPatientCondition(pat);

                  return (
                    <tr key={pat.id || idx} className={`transition ${isDone ? 'bg-slate-50/40 opacity-75' : 'hover:bg-slate-50/70'}`}>
                      <td className="py-3 px-3 font-mono font-bold text-teal-700">
                        #{String(idx + 1).padStart(2, '0')}
                      </td>

                      <td className="py-3 px-3 text-left">
                        <div className="font-bold text-slate-800 text-sm">{pat.name || 'Patient'}</div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="font-mono text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block">
                            {patientIdDisplay}
                          </span>
                          {pat.bed_number && (
                            <span className="text-[9px] font-mono font-bold bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded border border-purple-300 inline-block">
                              Bed #{pat.bed_number}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {pat.age ? `${pat.age} Y` : '-'} • {pat.gender || '-'}
                        {pat.blood_group && <span className="block font-bold text-rose-600 text-[10px]">{pat.blood_group}</span>}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border inline-block ${dateInfo.badgeClass}`}>
                            {dateInfo.dayLabel}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700">
                            {dateInfo.timeFormatted !== '--' ? dateInfo.timeFormatted : (dateInfo.dateFormatted || 'Scheduled')}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-left">
                        <span className="font-medium text-slate-800 block max-w-[190px] truncate" title={pat.symptoms_diagnosis || pat.reason}>
                          {pat.symptoms_diagnosis || pat.reason || 'General OPD Checkup'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border inline-block mt-0.5 ${
                          condition === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          condition === 'Emergency' ? 'bg-red-100 text-red-800 border-red-300' :
                          condition === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {condition}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isAdmit ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isAdmit ? 'Admitted (IPD)' : (isDone ? 'Completed' : 'Pending Checkup')}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenCheckupModal(pat)}
                          className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 ml-auto"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span>Consult & Decide</span>
                        </button>
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

      {/* MODAL: DOCTOR CONSULTATION & ADMISSION DECISION */}
      {selectedPatientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">Doctor Clinical Consultation</span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">{selectedPatientModal.name}</h3>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-0.5">
                  UHID: {selectedPatientModal.patient_id || selectedPatientModal.uhid || `PAT-${selectedPatientModal.id}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatientModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* PATIENT DEMOGRAPHICS SUMMARY */}
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Age & Gender</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedPatientModal.age ? `${selectedPatientModal.age} Yrs` : '-'} • {selectedPatientModal.gender || '-'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Blood Group</span>
                <p className="font-bold text-rose-700 mt-0.5">{getPatientBloodGroup(selectedPatientModal)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Contact Phone</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedPatientModal.contact || selectedPatientModal.phone || '-'}</p>
              </div>
            </div>

            {/* RESIDENTIAL ADDRESS */}
            {selectedPatientModal.address && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Residential Address</span>
                <p className="text-slate-700 font-medium mt-0.5">{selectedPatientModal.address}</p>
              </div>
            )}

            {/* ATTACHED MEDICAL DOCUMENT */}
            {selectedPatientModal.attached_document && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-teal-800 block">Patient Attached Document</span>
                  <span className="font-medium text-teal-900 truncate max-w-[220px] block">
                    {String(selectedPatientModal.attached_document).split('/').pop()}
                  </span>
                </div>
                <a
                  href={String(selectedPatientModal.attached_document).startsWith('http') ? selectedPatientModal.attached_document : `${API_BASE_URL.replace('/api', '')}${selectedPatientModal.attached_document}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs"
                >
                  View Document
                </a>
              </div>
            )}

            {/* CLINICAL SYMPTOMS & DIAGNOSIS EDIT */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Symptoms & Clinical Diagnosis *
                </label>
                <textarea
                  rows={2}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Record your clinical findings, diagnosis, and patient complaints..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-teal-600 font-medium"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Prescription / Medical Advice & Regimen
                </label>
                <textarea
                  rows={2}
                  value={prescriptionText}
                  onChange={(e) => setPrescriptionText(e.target.value)}
                  placeholder="Rx: Medicines, dosage (e.g. Paracetamol 500mg TDS), dietary instructions..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-teal-600 font-medium"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Patient Condition Severity
                </label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-teal-600 font-medium"
                >
                  <option value="Normal">Normal (Stable condition)</option>
                  <option value="Serious">Serious (Requires Close Monitoring)</option>
                  <option value="Urgent">Urgent (Immediate Attention)</option>
                  <option value="Critical">Critical (Intensive Care)</option>
                  <option value="Emergency">Emergency Attention</option>
                </select>
              </div>
            </div>

            {/* DECISION ACTION BUTTONS: ADMIT VS COMPLETE */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block text-center">
                Select Clinical Outcome for this Patient:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* OPTION 1: COMPLETE CHECKUP */}
                <button
                  type="button"
                  disabled={updatingPatientId === selectedPatientModal.id}
                  onClick={() => handleDoctorDecision('COMPLETE')}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                >
                  <span className="text-sm font-extrabold flex items-center gap-1">
                    <span>✓</span> Checkup Complete
                  </span>
                  <span className="text-[10px] font-normal opacity-90">Outpatient (No Admission)</span>
                </button>

                {/* OPTION 2: ADMIT PATIENT */}
                <button
                  type="button"
                  disabled={updatingPatientId === selectedPatientModal.id}
                  onClick={() => handleDoctorDecision('ADMIT')}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md transition cursor-pointer flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                >
                  <span className="text-sm font-extrabold flex items-center gap-1">
                    <span>🏥</span> Admit Patient (IPD)
                  </span>
                  <span className="text-[10px] font-normal opacity-90">Send to Reception for Bed & Nurse</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPatients;
