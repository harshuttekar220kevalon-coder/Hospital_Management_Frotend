import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const DoctorRegularSchedule = ({ currentUser, setCurrentPage }) => {
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [assignedHospitals, setAssignedHospitals] = useState([]);
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [patients, setPatients] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [isEditTimingsModalOpen, setIsEditTimingsModalOpen] = useState(false);
  const [editTimingsValue, setEditTimingsValue] = useState('');
  const [updatingDutyStatus, setUpdatingDutyStatus] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Date helper
  const getAppointmentDateInfo = (patient) => {
    if (!patient) return { isToday: false, timeFormatted: '--', diffDays: 999 };
    const rawDateStr = patient.visit_date_time || patient.appointment_time || patient.visit_date;
    if (!rawDateStr) return { isToday: false, timeFormatted: '--', diffDays: 999 };

    const d = new Date(rawDateStr);
    if (isNaN(d.getTime())) {
      return { isToday: false, timeFormatted: '--', diffDays: 999 };
    }

    const now = new Date();
    const isToday = d.getFullYear() === now.getFullYear() &&
                    d.getMonth() === now.getMonth() &&
                    d.getDate() === now.getDate();

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const targetMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
    const timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    return {
      dateObj: d,
      isToday,
      diffDays,
      timeFormatted
    };
  };

  const getPatientCondition = (p) => {
    return p?.Condation || p?.condation || p?.condition || p?.Condition || p?.symptoms_severity || 'Normal';
  };

  const loadDoctorSchedule = async () => {
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
        console.error('Error fetching doctor schedule data:', err);
      }

      const resolvedDoctor = currentDoc || currentUser || null;
      setDoctorInfo(resolvedDoctor);
      setEditTimingsValue(resolvedDoctor?.opd_timings || 'Mon - Fri (10:00 AM - 02:00 PM)');

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
        console.error('Error fetching schedule queue:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorSchedule();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = days[new Date().getDay()];
    setSelectedDay(currentDayName === 'Sunday' ? 'Monday' : currentDayName);
  }, [currentUser]);

  const handleToggleDutyStatus = async () => {
    if (!doctorInfo?.id) return;
    try {
      setUpdatingDutyStatus(true);
      const currentStatus = doctorInfo?.status === 'Off_Duty' ? 'Off_Duty' : (doctorInfo?.status === 'On_Duty' ? 'On_Duty' : 'On_Duty');
      const newStatus = currentStatus === 'On_Duty' ? 'Off_Duty' : 'On_Duty';

      let res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${doctorInfo.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${doctorInfo.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...doctorInfo, status: newStatus })
        }).catch(() => null);
      }

      setDoctorInfo(prev => ({ ...prev, status: newStatus }));
      setSuccessMsg(`Duty status changed to: ${newStatus}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error toggling duty status:', err);
    } finally {
      setUpdatingDutyStatus(false);
    }
  };

  const handleSaveOpdTimings = async (e) => {
    e.preventDefault();
    if (!doctorInfo?.id || !editTimingsValue) return;
    try {
      let res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${doctorInfo.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opd_timings: editTimingsValue })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${API_BASE_URL}/super-admin/Doctors/${doctorInfo.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...doctorInfo, opd_timings: editTimingsValue })
        }).catch(() => null);
      }

      setDoctorInfo(prev => ({ ...prev, opd_timings: editTimingsValue }));
      setIsEditTimingsModalOpen(false);
      setSuccessMsg(`Regular OPD Schedule updated to: "${editTimingsValue}"`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating schedule timings:', err);
    }
  };

  const docName = doctorInfo?.name || currentUser?.name || 'Doctor';
  const cleanDocName = docName.replace(/^Dr\.?\s*/i, '');
  const hospitalName = hospitalInfo?.Name || doctorInfo?.hospital_name || 'Main Hospital';
  const opdTimings = doctorInfo?.opd_timings || currentUser?.opd_timings || 'Mon - Fri (10:00 AM - 02:00 PM)';
  const docDepartment = doctorInfo?.department || doctorInfo?.specialization || 'Clinical Department';

  const weeklyScheduleMatrix = [
    { day: 'Monday', isWorking: true, hours: opdTimings, slotCapacity: '25 Patients', type: 'Morning OPD & IPD Rounds' },
    { day: 'Tuesday', isWorking: true, hours: opdTimings, slotCapacity: '25 Patients', type: 'Morning OPD & Follow-ups' },
    { day: 'Wednesday', isWorking: true, hours: opdTimings, slotCapacity: '20 Patients', type: 'Clinical Consultation & Special' },
    { day: 'Thursday', isWorking: true, hours: opdTimings, slotCapacity: '25 Patients', type: 'General OPD & Minor Procedures' },
    { day: 'Friday', isWorking: true, hours: opdTimings, slotCapacity: '25 Patients', type: 'OPD & Clinical Case Reviews' },
    { day: 'Saturday', isWorking: true, hours: '10:00 AM - 01:00 PM', slotCapacity: '15 Patients', type: 'Half-Day OPD & Emergency Cover' },
    { day: 'Sunday', isWorking: false, hours: 'Emergency On-Call', slotCapacity: 'On-Demand', type: 'On-Call / Weekly Off' },
  ];

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

  // Today slots
  const todayOnlyPatients = hospitalScopedPatients.filter(p => getAppointmentDateInfo(p).isToday);

  const getSlotForPatient = (p) => {
    const rawDateStr = p.visit_date_time || p.appointment_time || p.visit_date;
    if (rawDateStr) {
      const d = new Date(rawDateStr);
      if (!isNaN(d.getTime())) {
        const hour = d.getHours() + d.getMinutes() / 60;
        if (hour < 11.5) return 'slot_a';
        if (hour >= 11.5 && hour < 13.0) return 'slot_b';
        if (hour >= 13.0 && hour < 15.0) return 'slot_c';
        return 'slot_d';
      }
    }
    return null;
  };

  const slotAPatients = [];
  const slotBPatients = [];
  const slotCPatients = [];
  const slotDPatients = [];
  const unassignedToday = [];

  todayOnlyPatients.forEach(p => {
    const slot = getSlotForPatient(p);
    if (slot === 'slot_a') slotAPatients.push(p);
    else if (slot === 'slot_b') slotBPatients.push(p);
    else if (slot === 'slot_c') slotCPatients.push(p);
    else if (slot === 'slot_d') slotDPatients.push(p);
    else unassignedToday.push(p);
  });

  unassignedToday.forEach((p, idx) => {
    if (idx % 4 === 0) slotAPatients.push(p);
    else if (idx % 4 === 1) slotBPatients.push(p);
    else if (idx % 4 === 2) slotCPatients.push(p);
    else slotDPatients.push(p);
  });

  const todaySlots = [
    {
      time: '10:00 AM - 11:30 AM',
      name: 'Morning OPD - Slot A (General Consultations)',
      status: 'Morning Session',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      patientList: slotAPatients
    },
    {
      time: '11:30 AM - 01:00 PM',
      name: 'Midday OPD - Slot B (Special & Follow-ups)',
      status: 'Midday Session',
      statusColor: 'bg-blue-100 text-blue-800 border-blue-300',
      patientList: slotBPatients
    },
    {
      time: '01:00 PM - 02:00 PM',
      name: 'IPD In-Patient Ward Rounds & Observations',
      status: 'Afternoon Rounds',
      statusColor: 'bg-purple-100 text-purple-800 border-purple-300',
      patientList: slotCPatients
    },
    {
      time: '04:00 PM - 06:00 PM',
      name: 'Evening Special Consultations & Tele-OPD',
      status: 'Evening Session',
      statusColor: 'bg-amber-100 text-amber-800 border-amber-300',
      patientList: slotDPatients
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* HEADER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                Regular Duty & OPD Schedule
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                Dr. {cleanDocName}
              </span>
              <span className="text-xs text-slate-400">
                {hospitalName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 text-slate-100 tracking-tight">
              Daily Clinical Schedule & Weekly OPD Roster
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Official regular schedule, duty hours, session capacities, and time slots for Dr. {cleanDocName}.
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
                    All Branches
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
            <button
              type="button"
              disabled={updatingDutyStatus}
              onClick={handleToggleDutyStatus}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 ${
                doctorInfo?.status === 'Off_Duty'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${doctorInfo?.status === 'Off_Duty' ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`}></span>
              {doctorInfo?.status === 'Off_Duty' ? 'Status: Off_Duty' : 'Status: On_Duty'}
            </button>

            <button
              type="button"
              onClick={() => setIsEditTimingsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Edit Regular Hours
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('doctor_settings')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-teal-300 hover:text-white text-xs font-bold border border-teal-500/30 hover:border-teal-400/60 transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-sm group"
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

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-4 flex-wrap text-xs text-slate-300">
          <div className="flex items-center gap-4 flex-wrap">
            <span><strong>Department:</strong> {docDepartment}</span>
            <span>•</span>
            <span><strong>Official Hours:</strong> <span className="text-teal-300 font-bold">{opdTimings}</span></span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* TODAY SCHEDULE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">Today's Daily Schedule & Time Slot Allocation</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {todayOnlyPatients.length} Today's Patients
              </span>
            </div>
            <p className="text-xs text-slate-500">Only patients with today's scheduled visit date & time appear in these slots.</p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
            Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {todaySlots.map((slot, index) => (
            <div key={index} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {slot.time}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm mt-1.5">{slot.name}</h3>
                  <p className="text-[11px] text-slate-500">{hospitalName}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${slot.statusColor}`}>
                    {slot.status}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {slot.patientList.length} Scheduled
                  </span>
                </div>
              </div>

              {slot.patientList && slot.patientList.length > 0 ? (
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Today's Queued Patients for this Slot:</span>
                  <div className="space-y-1.5">
                    {slot.patientList.map((p, pIdx) => {
                      const dateInfo = getAppointmentDateInfo(p);
                      const condition = getPatientCondition(p);
                      const isCompleted = (p.status || '').toLowerCase().includes('discharg') || (p.status || '').toLowerCase().includes('complet');

                      return (
                        <div key={p.id || pIdx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-white border border-slate-200 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-teal-700 text-[11px]">#{pIdx + 1}</span>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 block truncate">{p.name || 'Patient'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{p.patient_id || p.uhid || `PAT-${p.id}`}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {dateInfo.timeFormatted !== '--' ? dateInfo.timeFormatted : 'Today'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                              condition === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                              condition === 'Emergency' ? 'bg-red-100 text-red-800 border-red-300' :
                              condition === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {condition}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                              isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {isCompleted ? 'Done' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-400 py-1 italic">
                  No patients scheduled for today in this slot.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* WEEKLY SCHEDULE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-800">Weekly OPD & Clinical Schedule Matrix</h2>
            <p className="text-xs text-slate-500">Regular weekly duty days and consultation hours</p>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {weeklyScheduleMatrix.map((item) => (
              <button
                key={item.day}
                type="button"
                onClick={() => setSelectedDay(item.day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedDay === item.day
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {weeklyScheduleMatrix.map((item) => {
            const isCurrentSelected = selectedDay === item.day;
            return (
              <div
                key={item.day}
                onClick={() => setSelectedDay(item.day)}
                className={`p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                  isCurrentSelected
                    ? 'border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">{item.day}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    item.isWorking ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>
                    {item.isWorking ? 'Active Working Day' : 'On-Call / Off'}
                  </span>
                </div>

                <p className="text-xs font-semibold text-teal-700">{item.type}</p>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <p><strong>Hours:</strong> {item.hours}</p>
                  <p><strong>Capacity:</strong> {item.slotCapacity}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL */}
      {isEditTimingsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">Edit Regular OPD Timings</h3>
                <p className="text-xs text-slate-500">Update official duty hours for Dr. {cleanDocName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditTimingsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOpdTimings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  OPD Timings Text (e.g. Mon - Fri 10:00 AM - 02:00 PM)
                </label>
                <input
                  type="text"
                  required
                  value={editTimingsValue}
                  onChange={(e) => setEditTimingsValue(e.target.value)}
                  placeholder="e.g. Mon - Sat (09:00 AM - 01:00 PM)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditTimingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Timings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorRegularSchedule;
