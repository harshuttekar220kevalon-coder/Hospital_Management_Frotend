import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const DoctorAppointments = ({ currentUser, setCurrentPage }) => {
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [assignedHospitals, setAssignedHospitals] = useState([]);
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [dayFilter, setDayFilter] = useState('ALL');
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);
  const [updatingPatientId, setUpdatingPatientId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Status
  const isCompletedStatus = (status) => {
    const s = (status || '').toLowerCase().trim();
    return s === 'discharged' || s === 'completed' || s.includes('discharg') || s.includes('complet');
  };

  // Condition
  const getPatientCondition = (pat) => {
    return pat?.Condation || pat?.condation || pat?.condition || pat?.Condition || pat?.symptoms_severity || 'Normal';
  };

  // Blood Group helper
  const getPatientBloodGroup = (pat) => {
    return pat?.Blood_Group || pat?.blood_group || pat?.BloodGroup || pat?.bloodGroup || pat?.blood || pat?.Blood || '-';
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

  const loadAppointmentsData = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const docId = currentUser?.id;
      const currentDocIdTag = currentUser?.doctor_id;

      // 1. Fetch hospitals list
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

      // 3. Fetch patients
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
        console.error('Error fetching appointments queue:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointmentsData();
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
          ? `Patient #${patient.id} (${patient.name || 'Patient'}) marked as Discharged and added to Completed Today!${isYesterdayCase ? ' (Yesterday\'s Patient)' : ''}`
          : `Patient #${patient.id} marked as Pending.`
      );
      setTimeout(() => setActionSuccessMsg(''), 4500);
    } catch (err) {
      console.error('Error updating patient status:', err);
    } finally {
      setUpdatingPatientId(null);
    }
  };

  const handleTriageAction = async (patient, actionValue) => {
    if (!actionValue || !patient?.id) return;
    try {
      setUpdatingPatientId(patient.id);

      if (actionValue === 'Checkup Done') {
        const backendStatus = 'Discharged';
        const nowIso = new Date().toISOString();
        saveCompletedTodayId(patient.id);

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
          completed_at: nowIso
        };

        setPatients(prev => prev.map(p => p.id === patient.id ? updatedPat : p));
        if (selectedPatientModal && selectedPatientModal.id === patient.id) {
          setSelectedPatientModal(updatedPat);
        }

        setActionSuccessMsg(`Checkup Done for Patient #${patient.id} (${patient.name || 'Patient'})! Added to Completed Today.`);
        setTimeout(() => setActionSuccessMsg(''), 4500);

      } else if (actionValue === 'Condition Normal') {
        const updatePayload = {
          Condation: 'Normal',
          condation: 'Normal',
          condition: 'Normal',
          Condition: 'Normal',
          symptoms_severity: 'Normal'
        };

        let res = await fetch(`${API_BASE_URL}/super-admin/Patients/${patient.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        }).catch(() => null);

        if (!res || !res.ok) {
          res = await fetch(`${API_BASE_URL}/super-admin/Patients/${patient.id}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...patient, ...updatePayload })
          }).catch(() => null);
        }

        const updatedPat = { ...patient, ...updatePayload };
        setPatients(prev => prev.map(p => p.id === patient.id ? updatedPat : p));
        if (selectedPatientModal && selectedPatientModal.id === patient.id) {
          setSelectedPatientModal(updatedPat);
        }
        setActionSuccessMsg(`Patient #${patient.id} (${patient.name || 'Patient'}) condition updated to "Normal".`);
        setTimeout(() => setActionSuccessMsg(''), 4500);
      }
    } catch (err) {
      console.error('Error executing triage action:', err);
    } finally {
      setUpdatingPatientId(null);
    }
  };

  const isEmergencyCase = (pat) => {
    const cond = getPatientCondition(pat).toLowerCase();
    return cond.includes('critical') || cond.includes('emergency') || cond.includes('emerg') || cond.includes('urgent') || cond.includes('urg');
  };

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

  // Emergency queue based on hospital filter
  const activeEmergencyList = hospitalScopedPatients.filter(p => isEmergencyCase(p));

  const criticalCount = activeEmergencyList.filter(p => {
    const s = getPatientCondition(p).toLowerCase();
    return s.includes('critical');
  }).length;

  const emergencyCount = activeEmergencyList.filter(p => {
    const s = getPatientCondition(p).toLowerCase();
    return s.includes('emergency') || s.includes('emerg');
  }).length;

  const urgentCount = activeEmergencyList.filter(p => {
    const s = getPatientCondition(p).toLowerCase();
    return s.includes('urgent') || s.includes('urg');
  }).length;

  const todayEmergencyCount = activeEmergencyList.filter(p => getAppointmentDateInfo(p).isToday).length;
  const yesterdayEmergencyCount = activeEmergencyList.filter(p => getAppointmentDateInfo(p).isYesterday).length;

  const filteredList = activeEmergencyList.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    const nameMatch = (p.name || '').toLowerCase().includes(term);
    const idMatch = (p.patient_id || p.uhid || `PAT-${p.id}` || '').toLowerCase().includes(term);
    const symptomsMatch = (p.symptoms_diagnosis || p.reason || '').toLowerCase().includes(term);
    const contactMatch = (p.contact || p.phone || '').toLowerCase().includes(term);
    const matchesSearch = !term || nameMatch || idMatch || symptomsMatch || contactMatch;

    if (!matchesSearch) return false;

    const cond = getPatientCondition(p).toLowerCase();
    let matchesFilter = true;

    if (filterType === 'Critical') {
      matchesFilter = cond.includes('critical');
    } else if (filterType === 'Emergency') {
      matchesFilter = cond.includes('emergency') || cond.includes('emerg');
    } else if (filterType === 'Urgent') {
      matchesFilter = cond.includes('urgent') || cond.includes('urg');
    }

    if (!matchesFilter) return false;

    const dateInfo = getAppointmentDateInfo(p);
    if (dayFilter === 'Today') {
      return dateInfo.isToday;
    } else if (dayFilter === 'Yesterday') {
      return dateInfo.isYesterday;
    } else if (dayFilter === 'Upcoming') {
      return dateInfo.isUpcoming;
    } else if (dayFilter === 'Past') {
      return dateInfo.isPast && !dateInfo.isYesterday;
    }

    return true;
  });

  const getSeverityBadge = (condition) => {
    const cond = (condition || '').toLowerCase();
    if (cond.includes('critical')) {
      return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    }
    if (cond.includes('emergency') || cond.includes('emerg')) {
      return 'bg-red-100 text-red-800 border-red-300 font-bold';
    }
    if (cond.includes('urgent') || cond.includes('urg')) {
      return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const docName = doctorInfo?.name || currentUser?.name || 'Doctor';
  const cleanDocName = docName.replace(/^Dr\.?\s*/i, '');
  const hospitalName = hospitalInfo?.Name || doctorInfo?.hospital_name || 'Main Hospital';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* HEADER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                Emergency & Critical Triage
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                Dr. {cleanDocName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 text-slate-100 tracking-tight">
              Emergency Appointments & Critical Triage
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Live triage monitoring for Critical, Emergency, and Urgent patients across your assigned hospital branches.
            </p>

            {/* MULTI-HOSPITAL BRANCHES IN HEADER */}
            {assignedHospitals.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {assignedHospitals.length > 1 ? `Affiliated Branches (${assignedHospitals.length}):` : 'Branch:'}
                </span>
                {assignedHospitals.map(h => (
                  <span
                    key={h.id}
                    onClick={() => setHospitalFilter(String(h.id))}
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                      hospitalFilter === String(h.id)
                        ? 'bg-rose-500 text-white border-rose-300 font-black shadow-xs'
                        : 'bg-rose-500/20 text-rose-300 border-rose-400/30 hover:bg-rose-500/30'
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
            <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-3 rounded-2xl border border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Emergency Cases</span>
                <span className="text-sm sm:text-base font-extrabold text-rose-300 font-mono">
                  {criticalCount} Critical • {emergencyCount} Emergency • {urgentCount} Urgent
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('doctor_settings')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-teal-300 hover:text-white text-xs font-bold border border-teal-500/30 hover:border-teal-400/60 transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-sm group whitespace-nowrap"
              title="Doctor Profile & Settings"
            >
              <svg className="w-4 h-4 text-teal-400 group-hover:rotate-45 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
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

      {/* METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs bg-slate-50/40">
          <p className="text-[10px] font-bold uppercase text-slate-600">Total Emergency</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">{activeEmergencyList.length}</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            {hospitalFilter === 'ALL' ? 'All Branches' : 'Selected Branch'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-300 shadow-xs bg-rose-50/40 ring-1 ring-rose-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-rose-700">Critical Cases</p>
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-rose-900 mt-1">{criticalCount}</h3>
          <p className="text-xs text-rose-600 mt-0.5 font-medium">Life-Threatening</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-red-200 shadow-xs bg-red-50/20">
          <p className="text-[10px] font-bold uppercase text-red-700">Emergency</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-red-800 mt-1">{emergencyCount}</h3>
          <p className="text-xs text-red-600 mt-0.5">Immediate Attention</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs bg-amber-50/20">
          <p className="text-[10px] font-bold uppercase text-amber-700">Urgent Priority</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-amber-800 mt-1">{urgentCount}</h3>
          <p className="text-xs text-amber-600 mt-0.5">High Priority Cases</p>
        </div>
      </div>

      {/* PATIENT LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
              Live Emergency & Condition Triage Queue
            </h2>
            <p className="text-xs text-slate-500">Patients categorized by Condition & Visit Date Time schedule.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* MULTI-HOSPITAL FILTER */}
            {assignedHospitals.length > 1 && (
              <select
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50/50 text-xs font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value="ALL">All Branches</option>
                {assignedHospitals.map(h => {
                  const countForHosp = patients.filter(p => isEmergencyCase(p) && (Number(p.hospital) === Number(h.id) || p.hospital_name === h.Name)).length;
                  return (
                    <option key={h.id} value={h.id}>
                      {h.Name} ({countForHosp})
                    </option>
                  );
                })}
              </select>
            )}

            <div className="relative flex-1 sm:w-56">
              <input
                type="text"
                placeholder="Search emergency case, UHID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
              />
            </div>

            {/* DAY FILTER */}
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              <option value="ALL">All Days</option>
              <option value="Today">Today Only ({todayEmergencyCount})</option>
              <option value="Yesterday">Yesterday ({yesterdayEmergencyCount})</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Past">Past / Overdue</option>
            </select>

            {/* CONDITION FILTER */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              <option value="ALL">All Triage ({activeEmergencyList.length})</option>
              <option value="Critical">Critical ({criticalCount})</option>
              <option value="Emergency">Emergency ({emergencyCount})</option>
              <option value="Urgent">Urgent ({urgentCount})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-center text-xs text-slate-600 min-w-[800px]">
            <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">Condition / Priority</th>
                <th className="py-3 px-3 text-center">Patient & ID</th>
                <th className="py-3 px-3 text-center">Hospital Branch</th>
                <th className="py-3 px-3 text-center">Age / Gender</th>
                <th className="py-3 px-3 text-center">Visit Date & Time (Schedule)</th>
                <th className="py-3 px-3 text-center">Chief Complaint</th>
                <th className="py-3 px-3 text-center">Contact</th>
                <th className="py-3 px-3 text-center">Triage Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading emergency triage queue...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-slate-700 text-sm">No Emergency or Critical Cases for this filter</p>
                    <p className="text-xs text-slate-400 mt-0.5">All regular patients can be viewed in the Patient Checkup Queue.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((pat, idx) => {
                  const patientIdDisplay = pat.patient_id || pat.uhid || (pat.id ? `PAT-${pat.id}` : '-');
                  const currentCondition = getPatientCondition(pat);
                  const isUpdating = updatingPatientId === pat.id;
                  const isCriticalOrEmerg = currentCondition.toLowerCase().includes('critical') || currentCondition.toLowerCase().includes('emerg');
                  const dateInfo = getAppointmentDateInfo(pat);
                  const hospObj = assignedHospitals.find(h => Number(h.id) === Number(pat.hospital)) || { Name: pat.hospital_name || hospitalInfo?.Name || 'Branch' };

                  return (
                    <tr key={pat.id || idx} className={`transition ${isCriticalOrEmerg ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-slate-50/70'}`}>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] border inline-flex items-center gap-1 ${getSeverityBadge(currentCondition)}`}>
                          {isCriticalOrEmerg && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>}
                          {currentCondition}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-slate-800">{pat.name || 'Patient'}</div>
                        <span className="font-mono text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-0.5">
                          {patientIdDisplay}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold inline-block truncate max-w-[140px]">
                          {hospObj.Name}
                        </span>
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
                        <span className="font-semibold text-slate-900 block max-w-[180px] mx-auto truncate" title={pat.symptoms_diagnosis || pat.reason}>
                          {pat.symptoms_diagnosis || pat.reason || 'Emergency Consultation'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {pat.contact || pat.phone || '-'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <select
                            defaultValue=""
                            disabled={isUpdating}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleTriageAction(pat, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="" disabled>Actions ▾</option>
                            <option value="Checkup Done">Checkup Done</option>
                            <option value="Condition Normal">Condition Normal</option>
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

      {/* PATIENT MODAL */}
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

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Hospital Branch</span>
                <p className="font-bold text-slate-800 text-xs mt-0.5">
                  {assignedHospitals.find(h => Number(h.id) === Number(selectedPatientModal.hospital))?.Name || selectedPatientModal.hospital_name || hospitalInfo?.Name || 'General Campus'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Chief Complaints / Symptoms</span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {selectedPatientModal.symptoms_diagnosis || selectedPatientModal.reason || 'Critical emergency evaluation.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Condition Priority</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block mt-0.5 ${getSeverityBadge(getPatientCondition(selectedPatientModal))}`}>
                    {getPatientCondition(selectedPatientModal)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Blood Group</span>
                  <p className="font-bold text-rose-700 mt-0.5">{getPatientBloodGroup(selectedPatientModal)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Age & Gender</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedPatientModal.age ? `${selectedPatientModal.age} Years` : '-'} • {selectedPatientModal.gender || '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Contact Phone</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedPatientModal.contact || selectedPatientModal.phone || '-'}</p>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100 flex-wrap">
                <span className="text-slate-700 font-bold text-xs">Update Status:</span>
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

export default DoctorAppointments;
