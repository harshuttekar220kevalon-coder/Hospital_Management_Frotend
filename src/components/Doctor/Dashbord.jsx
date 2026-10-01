import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const DoctorDashboard = ({ currentUser, setCurrentPage }) => {
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

  // Blood Group helper
  const getPatientBloodGroup = (patient) => {
    return patient?.Blood_Group || patient?.blood_group || patient?.BloodGroup || patient?.bloodGroup || patient?.blood || patient?.Blood || '-';
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

  const loadDoctorData = async () => {
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
    loadDoctorData();
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
          ? `Checkup completed for Patient #${patient.id} (${patient.name || 'Patient'}). Added to "Completed Today" list!${isYesterdayCase ? ' (Yesterday\'s Patient)' : ''}`
          : `Patient #${patient.id} marked as Pending.`
      );
      setTimeout(() => setActionSuccessMsg(''), 4500);
    } catch (err) {
      console.error('Error updating patient status:', err);
    } finally {
      setUpdatingPatientId(null);
    }
  };

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

  const docName = doctorInfo?.name || currentUser?.name || 'Doctor';
  const cleanDocName = docName.replace(/^Dr\.?\s*/i, '');
  const doctorIdTag = doctorInfo?.doctor_id || (doctorInfo?.id ? `DOC-${doctorInfo.id}` : (currentUser?.doctor_id || `DOC-${currentUser?.id || '-'}`));
  const docEmail = (doctorInfo?.email || currentUser?.email || '').toLowerCase();
  const docPhone = doctorInfo?.phone || doctorInfo?.contact || currentUser?.phone || currentUser?.contact || '-';
  const docSpecs = parseSpecializations(doctorInfo?.specialization || doctorInfo?.specialty || currentUser?.specialization);
  const docOpdTimings = doctorInfo?.opd_timings || currentUser?.opd_timings || '-';
  const docDepartment = doctorInfo?.department || doctorInfo?.department_name || (docSpecs[0] ? `${docSpecs[0]} Department` : '-');

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
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-cyan-500 text-white font-black flex items-center justify-center text-2xl shadow-lg ring-2 ring-teal-400/30 shrink-0">
              {cleanDocName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-teal-300 bg-teal-500/20 px-2.5 py-0.5 rounded-full border border-teal-400/30">
                  {doctorIdTag}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  {docDepartment}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${
                  doctorInfo?.is_active !== false ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${doctorInfo?.is_active !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                  {doctorInfo?.is_active !== false ? 'Active Practitioner' : 'On Leave'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1.5 tracking-tight text-slate-100">
                Dr. {cleanDocName}
              </h1>
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300 mt-1">
                {docEmail ? (
                  <a href={`mailto:${docEmail}`} className="text-teal-300 hover:underline">
                    {docEmail}
                  </a>
                ) : (
                  <span>{docPhone}</span>
                )}
                <span>•</span>
                <span className="font-semibold text-emerald-300">OPD: {docOpdTimings}</span>
              </div>

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
                      All Branches
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('doctor_settings')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-teal-300 hover:text-white text-xs font-bold border border-teal-500/30 hover:border-teal-400/60 transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-sm hover:shadow-teal-500/10 group"
              title="Open Doctor Settings & Profile"
            >
              <svg className="w-4 h-4 text-teal-400 group-hover:rotate-45 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Doctor Settings</span>
            </button>
          </div>
        </div>

        {docSpecs.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold">Specializations:</span>
            {docSpecs.map((spec, idx) => (
              <span key={idx} className="px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-semibold">
                {spec}
              </span>
            ))}
          </div>
        )}
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
            {hospitalFilter === 'ALL' ? 'Across all assigned branches' : 'Selected branch'}
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
          <p className="text-xs text-amber-700/80 mt-0.5 font-medium">Awaiting live checkup</p>
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
              <h2 className="text-base font-bold text-slate-800">Patient Queue & Appointment Schedule</h2>
              {statusFilter === 'Today_Pending' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Today's Pending Queue
                </span>
              )}
              {statusFilter === 'Today_Completed' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Completed Today
                </span>
              )}
              {statusFilter === 'Yesterday' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Yesterday's Roster
                </span>
              )}
              {hospitalFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Branch: {assignedHospitals.find(h => String(h.id) === String(hospitalFilter))?.Name || 'Selected'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Day-synchronized clinical consultation list for Dr. {cleanDocName}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* MULTI-HOSPITAL SELECTOR */}
            {assignedHospitals.length > 1 && (
              <select
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-teal-300 bg-teal-50/50 text-xs font-bold text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">All Branches</option>
                {assignedHospitals.map(h => {
                  const countForHosp = patients.filter(p => Number(p.hospital) === Number(h.id) || p.hospital_name === h.Name).length;
                  return (
                    <option key={h.id} value={h.id}>
                      {h.Name} ({countForHosp})
                    </option>
                  );
                })}
              </select>
            )}

            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search name, ID, symptoms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            {/* STATUS FILTER */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Today_Pending">Today's Pending Queue ({todayPendingPatients.length})</option>
              <option value="Today_Completed">Completed Today ({todayCompletedPatients.length})</option>
              <option value="Today_All">All Today's Appointments ({todayPatients.length})</option>
              <option value="Yesterday">Yesterday's Patients ({yesterdayPatients.length})</option>
              <option value="Upcoming">Upcoming Appointments ({upcomingPatients.length})</option>
              <option value="Past_Overdue">Past / Overdue Appointments ({pastOverduePatients.length})</option>
              <option value="ALL">All Patient Records ({hospitalScopedPatients.length})</option>
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
                <th className="py-3 px-3 text-center">Hospital Branch</th>
                <th className="py-3 px-3 text-center">Age / Gender</th>
                <th className="py-3 px-3 text-center">Visit Date & Time (Schedule)</th>
                <th className="py-3 px-3 text-center">Symptoms / Condition</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading assigned patient queue...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <div className="font-semibold text-slate-600">No patients found for this selection.</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {statusFilter === 'Today_Pending' ? 'No pending patients remaining for Today! All clear.' : 'Try selecting another day or filter tab.'}
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
                  const hospObj = assignedHospitals.find(h => Number(h.id) === Number(pat.hospital)) || { Name: pat.hospital_name || hospitalInfo?.Name || 'Branch' };

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
                          {pat.bed_number ? (
                            <span className="text-[9px] font-mono font-bold bg-teal-100 text-teal-900 px-1.5 py-0.5 rounded border border-teal-300 inline-block">
                              Bed #{pat.bed_number} ({pat.floor || `Floor ${Math.floor((pat.bed_number - 1) / 100) + 1}`})
                            </span>
                          ) : null}
                        </div>
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

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Hospital Branch</span>
                <p className="font-bold text-slate-800 text-xs mt-0.5">
                  {assignedHospitals.find(h => Number(h.id) === Number(selectedPatientModal.hospital))?.Name || selectedPatientModal.hospital_name || hospitalInfo?.Name || 'General Campus'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Chief Complaints / Diagnosis</span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {selectedPatientModal.symptoms_diagnosis || selectedPatientModal.reason || 'Routine consultation and observation.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Age & Gender</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedPatientModal.age ? `${selectedPatientModal.age} Years` : '-'} • {selectedPatientModal.gender || '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Blood Group</span>
                  <p className="font-bold text-rose-700 mt-0.5">{getPatientBloodGroup(selectedPatientModal)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Condition Severity</span>
                  <p className="font-bold text-slate-800 mt-0.5">{getPatientCondition(selectedPatientModal)}</p>
                </div>
                <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200">
                  <span className="text-teal-800 uppercase font-bold text-[10px]">Inpatient Location</span>
                  <p className="font-bold text-teal-950 font-mono mt-0.5">
                    {selectedPatientModal.bed_number ? `Bed #${selectedPatientModal.bed_number} (${selectedPatientModal.floor || `Floor ${Math.floor((selectedPatientModal.bed_number - 1) / 100) + 1}`})` : 'Outpatient / OPD'}
                  </p>
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

export default DoctorDashboard;
