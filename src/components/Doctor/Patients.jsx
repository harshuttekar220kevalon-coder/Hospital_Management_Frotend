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
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);
  const [updatingPatientId, setUpdatingPatientId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Status
  const isCompletedStatus = (status) => {
    const s = (status || '').toLowerCase().trim();
    return s === 'discharged' || s === 'completed' || s.includes('discharg') || s.includes('complet');
  };

  // Condition
  const getPatientCondition = (patient) => {
    return patient?.Condation || patient?.condation || patient?.condition || patient?.Condition || patient?.symptoms_severity || 'Normal';
  };

  // Completed today
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

    const rawDateStr = patient.visit_date_time || patient.appointment_time || patient.visit_date;

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
        timeFormatted: '--',
        dateFormatted: '--',
        fullScheduleDisplay: 'Not Scheduled',
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
        dayLabel: 'Not Scheduled',
        timeFormatted: '--',
        dateFormatted: '--',
        fullScheduleDisplay: String(rawDateStr),
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200'
      };
    }

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const targetMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

    const timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
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

  // Completed helper
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

      // 1. Fetch all hospitals list
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

      // Extract all assigned hospital IDs
      const rawHospIds = Array.isArray(resolvedDoctor?.hospitals)
        ? resolvedDoctor.hospitals.map(h => Number(typeof h === 'object' ? h.id : h)).filter(Boolean)
        : (resolvedDoctor?.hospital ? [Number(typeof resolvedDoctor.hospital === 'object' ? resolvedDoctor.hospital.id : resolvedDoctor.hospital)].filter(Boolean) : []);

      if (currentUser?.hospital && !rawHospIds.includes(Number(currentUser.hospital))) {
        rawHospIds.push(Number(currentUser.hospital));
      }

      const docAssignedHospitals = allHospitals.filter(h => rawHospIds.includes(Number(h.id)));
      setAssignedHospitals(docAssignedHospitals.length > 0 ? docAssignedHospitals : (allHospitals[0] ? [allHospitals[0]] : []));

      const primaryHosp = docAssignedHospitals[0] || allHospitals.find(h => Number(h.id) === Number(rawHospIds[0])) || null;
      setHospitalInfo(primaryHosp);

      // 3. Fetch patients queue
      try {
        const patRes = await fetch(`${API_BASE_URL}/super-admin/Patients/`).catch(() => null);
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

  const handleUpdatePatientStatus = async (patient, selectedOption) => {
    if (!selectedOption || !patient?.id) return;
    try {
      setUpdatingPatientId(patient.id);
      
      const isMarkingDone = (selectedOption === 'Completed' || selectedOption === 'Complete' || selectedOption === 'Discharged');
      const backendStatus = isMarkingDone ? 'Discharged' : 'Pending';
      const nowIso = new Date().toISOString();

      if (isMarkingDone) {
        saveCompletedTodayId(patient.id);
      } else {
        removeCompletedTodayId(patient.id);
      }

      let res = await fetch(`${API_BASE_URL}/super-admin/Patients/${patient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: backendStatus })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${API_BASE_URL}/super-admin/Patients/${patient.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...patient, status: backendStatus })
        }).catch(() => null);
      }

      const updatedPat = {
        ...patient,
        status: backendStatus,
        completed_at: isMarkingDone ? nowIso : null
      };

      setPatients(prev => prev.map(p => p.id === patient.id ? updatedPat : p));
      if (selectedPatientModal && selectedPatientModal.id === patient.id) {
        setSelectedPatientModal(updatedPat);
      }

      const dateInfo = getAppointmentDateInfo(patient);
      const isYesterdayCase = dateInfo.isYesterday;

      setActionSuccessMsg(
        backendStatus === 'Discharged'
          ? `Checkup completed for Patient #${patient.id} (${patient.name || 'Patient'}). Added to Completed Today list!${isYesterdayCase ? ' (Yesterday\'s Patient)' : ''}`
          : `Patient #${patient.id} status updated to "Pending".`
      );
      setTimeout(() => setActionSuccessMsg(''), 4500);
    } catch (err) {
      console.error('Error updating patient status:', err);
    } finally {
      setUpdatingPatientId(null);
    }
  };

  const docName = doctorInfo?.name || currentUser?.name || 'Doctor';
  const cleanDocName = docName.replace(/^Dr\.?\s*/i, '');
  const hospitalName = hospitalInfo?.Name || doctorInfo?.hospital_name || 'Main Hospital';

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
  const yesterdayPatients = hospitalScopedPatients.filter(p => getAppointmentDateInfo(p).isYesterday);
  const upcomingPatients = hospitalScopedPatients.filter(p => getAppointmentDateInfo(p).isUpcoming);
  const pastOverduePatients = hospitalScopedPatients.filter(p => getAppointmentDateInfo(p).isPast && !getAppointmentDateInfo(p).isYesterday);

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
    const doneToday = isCompletedToday(p);

    if (statusFilter === 'Today_Pending') {
      return dateInfo.isToday && !completed;
    } else if (statusFilter === 'Today_Completed') {
      return doneToday;
    } else if (statusFilter === 'Today_All') {
      return dateInfo.isToday;
    } else if (statusFilter === 'Yesterday') {
      return dateInfo.isYesterday;
    } else if (statusFilter === 'Upcoming') {
      return dateInfo.isUpcoming;
    } else if (statusFilter === 'Past_Overdue') {
      return dateInfo.isPast && !dateInfo.isYesterday;
    } else if (statusFilter === 'Pending') {
      return !completed;
    } else if (statusFilter === 'Completed') {
      return completed;
    }
    return true;
  }).sort((a, b) => {
    const infoA = getAppointmentDateInfo(a);
    const infoB = getAppointmentDateInfo(b);
    if (infoA.dateObj && infoB.dateObj) {
      if (statusFilter === 'Yesterday' || statusFilter === 'Past_Overdue') {
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
              Day-based clinical OPD consultations. Only today's scheduled pending patients appear in the live queue. When you complete any patient (today or yesterday), they are added to "Completed Today".
            </p>

            {/* ASSIGNED HOSPITALS BADGES */}
            {assignedHospitals.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {assignedHospitals.length > 1 ? `Affiliated Hospitals (${assignedHospitals.length} Branches):` : 'Hospital Branch:'}
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
                    All Branches ({patients.length})
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 bg-slate-800/90 px-4 py-3 rounded-2xl border border-slate-700 shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Today's Remaining Checkups</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-amber-400 font-mono">
                  {todayPendingPatients.length}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  / {todayPatients.length} Today Total
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

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter('Today_All')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs ${statusFilter === 'Today_All' ? 'ring-2 ring-teal-500 border-teal-400' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today's Appointments</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Today</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{todayPatients.length}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {hospitalFilter === 'ALL' ? 'Across all assigned branches' : (assignedHospitals.find(h => String(h.id) === String(hospitalFilter))?.Name || 'Selected branch')}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter('Today_Pending')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs bg-amber-50/30 ${statusFilter === 'Today_Pending' ? 'ring-2 ring-amber-500 border-amber-400' : 'border-amber-300 hover:border-amber-400'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Today</p>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{todayPendingPatients.length}</h3>
          <p className="text-xs text-amber-700/80 mt-0.5 font-medium">Waiting in today's queue</p>
        </div>

        <div
          onClick={() => setStatusFilter('Today_Completed')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs bg-emerald-50/30 ${statusFilter === 'Today_Completed' ? 'ring-2 ring-emerald-500 border-emerald-400' : 'border-emerald-300 hover:border-emerald-400'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Completed Today</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Done Today</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{todayCompletedPatients.length}</h3>
          <p className="text-xs text-emerald-700/80 mt-0.5 font-medium">Consulted & Completed Today</p>
        </div>

        <div
          onClick={() => setStatusFilter('Yesterday')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs bg-slate-50/50 ${statusFilter === 'Yesterday' ? 'ring-2 ring-indigo-500 border-indigo-400' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Yesterday's Patients</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Yesterday</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-700 mt-1">{yesterdayPatients.length}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Scheduled yesterday</p>
        </div>
      </div>

      {/* PATIENT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-800">Doctor Patient Queue & Consultation Checklist</h2>
              {statusFilter === 'Today_Pending' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Today's Pending
                </span>
              )}
              {statusFilter === 'Today_Completed' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Completed Today
                </span>
              )}
              {statusFilter === 'Yesterday' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Yesterday's List
                </span>
              )}
              {hospitalFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  Branch: {assignedHospitals.find(h => String(h.id) === String(hospitalFilter))?.Name || 'Selected'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Click "Completed" on any patient (Today or Yesterday) to mark finished and add them to "Completed Today"</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* MULTI-HOSPITAL SELECTOR */}
            {assignedHospitals.length > 1 && (
              <select
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-teal-300 bg-teal-50/70 text-xs font-bold text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="ALL">All Branches ({patients.length})</option>
                {assignedHospitals.map(h => {
                  const countForHosp = patients.filter(p => {
                    const pHospId = Number(typeof p.hospital === 'object' ? p.hospital?.id : p.hospital);
                    const pHospName = (p.hospital_name || (typeof p.hospital === 'object' ? p.hospital?.Name : '') || '').toLowerCase().trim();
                    return pHospId === Number(h.id) || (h.Name && pHospName === h.Name.toLowerCase().trim());
                  }).length;
                  return (
                    <option key={h.id} value={String(h.id)}>
                      {h.Name} ({countForHosp})
                    </option>
                  );
                })}
              </select>
            )}

            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search patient name, ID, symptoms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            {/* STATUS FILTER */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="Today_Pending">Today's Pending Queue ({todayPendingPatients.length})</option>
              <option value="Today_Completed">Completed Today ({todayCompletedPatients.length})</option>
              <option value="Today_All">All Today's Appointments ({todayPatients.length})</option>
              <option value="Yesterday">Yesterday's Patients ({yesterdayPatients.length})</option>
              <option value="Upcoming">Upcoming Appointments ({upcomingPatients.length})</option>
              <option value="Past_Overdue">Past / Overdue Appointments ({pastOverduePatients.length})</option>
              <option value="ALL">All Patients ({hospitalScopedPatients.length})</option>
            </select>
          </div>
        </div>

        {/* FILTER PILLS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setStatusFilter('Today_Pending')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Today_Pending' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Today Pending ({todayPendingPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Today_Completed')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Today_Completed' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Completed Today ({todayCompletedPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Today_All')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Today_All' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Today ({todayPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Yesterday')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Yesterday' ? 'bg-amber-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Yesterday ({yesterdayPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Upcoming')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Upcoming' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Upcoming ({upcomingPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All History ({hospitalScopedPatients.length})
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-center text-xs text-slate-600 min-w-[750px]">
            <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">Token</th>
                <th className="py-3 px-3 text-center">Patient & ID</th>
                <th className="py-3 px-3 text-center">Age / Gender</th>
                <th className="py-3 px-3 text-center">Visit Date & Time (Schedule)</th>
                <th className="py-3 px-3 text-center">Symptoms / Complaint</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions & Checkup</th>
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
                      {statusFilter === 'Today_Pending' ? 'No pending patients remaining for Today!' : 'Try switching to another day or tab.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.slice(0, visibleCount).map((pat, idx) => {
                  const patientIdDisplay = pat.patient_id || pat.uhid || (pat.id ? `PAT-${pat.id}` : '-');
                  const isDone = isCompletedStatus(pat.status);
                  const isUpdating = updatingPatientId === pat.id;
                  const dateInfo = getAppointmentDateInfo(pat);
                  const condition = getPatientCondition(pat);
                  const doneToday = isCompletedToday(pat);

                  return (
                    <tr key={pat.id || idx} className={`transition ${isDone ? 'bg-slate-50/40 opacity-75' : 'hover:bg-slate-50/70'}`}>
                      <td className="py-3 px-3 font-mono font-bold text-teal-700">
                        #{String(idx + 1).padStart(2, '0')}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-slate-800">{pat.name || 'Patient'}</div>
                        <div className="flex items-center justify-center gap-1 flex-wrap mt-0.5">
                          <span className="font-mono text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block">
                            {patientIdDisplay}
                          </span>
                          {assignedHospitals.length > 1 && (
                            <span className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 inline-block">
                              {pat.hospital_name || (assignedHospitals.find(h => Number(h.id) === Number(typeof pat.hospital === 'object' ? pat.hospital?.id : pat.hospital))?.Name) || 'Branch'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {pat.age ? `${pat.age} Y` : '-'} • {pat.gender || '-'}
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

                      <td className="py-3 px-3 text-center">
                        <span className="font-medium text-slate-800 block max-w-[180px] mx-auto truncate" title={pat.symptoms_diagnosis || pat.reason}>
                          {pat.symptoms_diagnosis || pat.reason || '-'}
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
                          isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isDone ? (doneToday ? 'Completed Today' : 'Completed') : 'Pending'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
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

      {/* MODAL */}
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
              {(() => {
                const modalDateInfo = getAppointmentDateInfo(selectedPatientModal);
                return (
                  <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 flex items-center justify-between">
                    <div>
                      <span className="text-teal-800 uppercase font-bold text-[10px] block">Visit Date & Time Schedule</span>
                      <span className="font-bold text-slate-800 text-sm mt-0.5 block">{modalDateInfo.fullScheduleDisplay}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${modalDateInfo.badgeClass}`}>
                      {modalDateInfo.dayLabel}
                    </span>
                  </div>
                );
              })()}

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

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Condition Severity</span>
                  <p className="font-bold text-slate-800 mt-0.5">{getPatientCondition(selectedPatientModal)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Contact Phone</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedPatientModal.contact || selectedPatientModal.phone || '-'}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Hospital Facility / Branch</span>
                <p className="font-bold text-teal-800 mt-0.5">
                  {selectedPatientModal.hospital_name || (assignedHospitals.find(h => Number(h.id) === Number(typeof selectedPatientModal.hospital === 'object' ? selectedPatientModal.hospital?.id : selectedPatientModal.hospital))?.Name) || hospitalName || 'Hospital'}
                </p>
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
                  <option value="Completed">Completed</option>
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
