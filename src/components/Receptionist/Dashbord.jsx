import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const extractArray = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.appointments)) return resData.appointments;
  if (Array.isArray(resData.rows)) return resData.rows;
  return [];
};

const isDoctorInHospital = (doc, targetHospId, targetHospName = '') => {
  if (!targetHospId && !targetHospName) return true;
  if (!doc) return false;

  const docHosp = typeof doc.hospital === 'object' && doc.hospital !== null ? doc.hospital.id : doc.hospital;

  if (targetHospId && !isNaN(Number(targetHospId))) {
    if (docHosp && !isNaN(Number(docHosp))) {
      return Number(docHosp) === Number(targetHospId);
    }
    if (Array.isArray(doc.hospitals) && doc.hospitals.length > 0) {
      return doc.hospitals.some(h => {
        const hId = typeof h === 'object' && h !== null ? h.id : h;
        return Number(hId) === Number(targetHospId);
      });
    }
    if (targetHospName) {
      const dHospName = (doc.hospital_name || (typeof doc.hospital === 'object' ? (doc.hospital?.Name || doc.hospital?.name) : '') || '').toLowerCase().trim();
      return dHospName === targetHospName.toLowerCase().trim() && dHospName !== '';
    }
    return false;
  }

  if (targetHospName && targetHospName.trim() !== '') {
    const dHospName = (doc.hospital_name || (typeof doc.hospital === 'object' ? (doc.hospital?.Name || doc.hospital?.name) : '') || '').toLowerCase().trim();
    return dHospName === targetHospName.toLowerCase().trim() && dHospName !== '';
  }

  return false;
};

const isAppointmentInHospital = (item, targetHospId, targetHospName = '', hospList = []) => {
  if (!item) return false;

  // 1. Resolve Target Hospital ID & Name
  let targetId = targetHospId && !isNaN(Number(targetHospId)) ? Number(targetHospId) : null;
  let targetName = (targetHospName || '').toString().toLowerCase().trim();

  if (targetId && !targetName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => Number(h.id) === targetId);
    if (matched) targetName = (matched.Name || matched.name || '').toLowerCase().trim();
  } else if (!targetId && targetName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === targetName);
    if (matched) targetId = Number(matched.id);
  }

  // If target hospital is not specified, do NOT leak records
  if (!targetId && !targetName) return false;

  // 2. Resolve Appointment's Hospital ID & Name
  const rawHosp = typeof item.hospital === 'object' && item.hospital !== null 
    ? (item.hospital.id || item.hospital.hospital_id || item.hospital.Name || item.hospital.name) 
    : item.hospital;
  const rawHospName = item.hospital_name || (typeof item.hospital === 'object' && item.hospital !== null ? (item.hospital.Name || item.hospital.name) : '') || '';

  let itemHospId = null;
  let itemHospName = '';

  if (rawHosp && !isNaN(Number(rawHosp)) && Number(rawHosp) > 0) {
    itemHospId = Number(rawHosp);
    if (Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => Number(h.id) === itemHospId);
      if (matched) itemHospName = (matched.Name || matched.name || '').toLowerCase().trim();
    }
  } else if (rawHosp && typeof rawHosp === 'string' && rawHosp.trim() !== '') {
    const cleanRaw = rawHosp.trim().toLowerCase();
    if (Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === cleanRaw);
      if (matched) {
        itemHospId = Number(matched.id);
        itemHospName = (matched.Name || matched.name || '').toLowerCase().trim();
      } else {
        itemHospName = cleanRaw;
      }
    } else {
      itemHospName = cleanRaw;
    }
  }

  if (!itemHospName && rawHospName && rawHospName.trim() !== '') {
    const cleanRawName = rawHospName.trim().toLowerCase();
    if (Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === cleanRawName);
      if (matched) {
        if (!itemHospId) itemHospId = Number(matched.id);
        itemHospName = (matched.Name || matched.name || '').toLowerCase().trim();
      } else {
        itemHospName = cleanRawName;
      }
    } else {
      itemHospName = cleanRawName;
    }
  }

  // If appointment has no hospital assigned, it does NOT belong to this hospital
  if (!itemHospId && !itemHospName) return false;

  // 3. Strict Comparison
  if (targetId && itemHospId) {
    return itemHospId === targetId;
  }

  if (targetId && itemHospName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === itemHospName);
    if (matched) {
      return Number(matched.id) === targetId;
    }
  }

  if (targetName && itemHospId && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => Number(h.id) === itemHospId);
    if (matched) {
      return (matched.Name || matched.name || '').toLowerCase().trim() === targetName;
    }
  }

  if (targetName && itemHospName) {
    return targetName === itemHospName;
  }

  return false;
};

const isNurseInHospital = (nurse, targetHospId, targetHospName = '') => {
  if (!targetHospId && !targetHospName) return true;
  if (!nurse) return false;

  const nHosp = typeof nurse.hospital === 'object' && nurse.hospital !== null ? nurse.hospital.id : nurse.hospital;

  if (targetHospId && !isNaN(Number(targetHospId))) {
    if (nHosp && !isNaN(Number(nHosp))) {
      return Number(nHosp) === Number(targetHospId);
    }
    if (targetHospName) {
      const nHospName = (nurse.hospital_name || (typeof nurse.hospital === 'object' ? (nurse.hospital?.Name || nurse.hospital?.name) : '') || '').toLowerCase().trim();
      return nHospName === targetHospName.toLowerCase().trim() && nHospName !== '';
    }
    return false;
  }

  if (targetHospName && targetHospName.trim() !== '') {
    const nHospName = (nurse.hospital_name || (typeof nurse.hospital === 'object' ? (nurse.hospital?.Name || nurse.hospital?.name) : '') || '').toLowerCase().trim();
    return nHospName === targetHospName.toLowerCase().trim() && nHospName !== '';
  }

  return false;
};

const ReceptionistDashboard = ({ currentUser, setCurrentPage, setSelectedPatient, setSelectedDoctorForPatient }) => {
  const [visibleCount, setVisibleCount] = useState(8);
  const [loading, setLoading] = useState(true);
  const [receptionistInfo, setReceptionistInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [patients, setPatients] = useState([]);
  const [doctorStats, setDoctorStats] = useState({ total: 0, working: 0, offDuty: 0 });
  const [nurseStats, setNurseStats] = useState({ total: 0, working: 0, offDuty: 0 });

  useEffect(() => {
    let isMounted = true;

    const loadReceptionistData = async () => {
      try {
        setLoading(true);
        const email = (currentUser?.email || '').toLowerCase().trim();
        const recId = currentUser?.id;

        const [recRes, docRes, hospListRes, nurseRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/super-admin/Receptionists/`),
          fetch(`${API_BASE_URL}/super-admin/Doctors/`),
          fetch(`${API_BASE_URL}/super-admin/Hospital/`),
          fetch(`${API_BASE_URL}/super-admin/Nurses/`)
        ]);

        let currentRec = null;
        if (recRes.status === 'fulfilled' && recRes.value.ok) {
          const recsData = await recRes.value.json().catch(() => []);
          const recs = extractArray(recsData);
          if (Array.isArray(recs)) {
            currentRec = recs.find(r => 
              (r.email && r.email.toLowerCase().trim() === email) ||
              (recId && Number(r.id) === Number(recId)) ||
              (r.name && r.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        }

        if (isMounted) {
          setReceptionistInfo(currentRec || currentUser);
        }

        let hospList = [];
        let foundHosp = null;
        let targetHospId = currentRec?.hospital || currentUser?.hospital || (typeof currentUser?.hospital_data === 'object' ? currentUser?.hospital_data?.id : null);
        if (typeof targetHospId === 'object' && targetHospId !== null) {
          targetHospId = targetHospId.id || targetHospId.hospital_id;
        }

        if (hospListRes.status === 'fulfilled' && hospListRes.value.ok) {
          const hData = await hospListRes.value.json().catch(() => []);
          hospList = extractArray(hData);
          if (Array.isArray(hospList)) {
            if (targetHospId) {
              foundHosp = hospList.find(h => Number(h.id) === Number(targetHospId));
            }
            if (!foundHosp && (currentUser?.hospital_name || currentRec?.hospital_name)) {
              const hName = (currentUser?.hospital_name || currentRec?.hospital_name).toLowerCase().trim();
              foundHosp = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === hName);
              if (foundHosp) targetHospId = foundHosp.id;
            }
            if (!foundHosp && email) {
              const savedHospId = localStorage.getItem(`user_hospital_${email}`);
              if (savedHospId) {
                foundHosp = hospList.find(h => Number(h.id) === Number(savedHospId));
                if (foundHosp) targetHospId = foundHosp.id;
              }
            }
            if (!foundHosp) {
              const checkStr = `${email} ${currentUser?.name || ''} ${currentRec?.name || ''}`.toLowerCase();
              foundHosp = hospList.find(h => {
                const hn = (h.Name || h.name || '').toLowerCase().trim();
                const cleanHn = hn.replace(/hospital|hospitals|care|clinic|super|speciality|specialty/gi, '').trim();
                return cleanHn.length >= 3 && checkStr.includes(cleanHn);
              });
              if (foundHosp) targetHospId = foundHosp.id;
            }
            if (isMounted && foundHosp) setHospitalInfo(foundHosp);
          }
        }

        const hospName = foundHosp?.Name || foundHosp?.name || currentUser?.hospital_name || currentRec?.hospital_name || '';

        // Doctor directory loading & hospital filtering
        let docList = [];
        if (docRes.status === 'fulfilled' && docRes.value.ok) {
          const dData = await docRes.value.json().catch(() => []);
          docList = extractArray(dData);
        }

        if (Array.isArray(docList)) {
          const hospDocs = targetHospId || hospName
            ? docList.filter(d => isDoctorInHospital(d, targetHospId, hospName))
            : [];
          const workingDocs = hospDocs.filter(d => !String(d.status || d.duty_status || '').toLowerCase().includes('off') && !String(d.status || '').toLowerCase().includes('leave')).length;
          const offDutyDocs = hospDocs.length - workingDocs;
          if (isMounted) {
            setDoctorStats({ total: hospDocs.length, working: workingDocs, offDuty: offDutyDocs });
          }
        }

        // Nurse directory loading & hospital filtering
        let nurseList = [];
        if (nurseRes.status === 'fulfilled' && nurseRes.value.ok) {
          const nData = await nurseRes.value.json().catch(() => []);
          nurseList = extractArray(nData);
        }

        if (Array.isArray(nurseList)) {
          const hospNurses = targetHospId || hospName
            ? nurseList.filter(n => isNurseInHospital(n, targetHospId, hospName))
            : [];
          const workingNurses = hospNurses.filter(n => !String(n.status || n.duty_status || '').toLowerCase().includes('off') && !String(n.status || '').toLowerCase().includes('leave')).length;
          const offDutyNurses = hospNurses.length - workingNurses;
          if (isMounted) {
            setNurseStats({ total: hospNurses.length, working: workingNurses, offDuty: offDutyNurses });
          }
        }

        // Fetch Appointments ONLY from Backend (Single working endpoint)
        let rawAppointments = [];
        try {
          const aRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
          if (aRes && aRes.ok) {
            const aJson = await aRes.json().catch(() => []);
            rawAppointments = extractArray(aJson);
          }
        } catch (e) {}

        // Normalize appointment items strictly from backend
        const normalizeItem = (item) => {
          if (!item) return null;
          const id = item.id || item.appointment_id;
          const name = item.patient_name || item.patient_Name || item.name || `Patient #${id}`;
          const hosp = typeof item.hospital === 'object' && item.hospital !== null ? item.hospital.id : item.hospital;
          const hospObj = hosp && Array.isArray(hospList) ? hospList.find(h => Number(h.id) === Number(hosp)) : null;
          const itemHospName = item.hospital_name || hospObj?.Name || hospObj?.name || (typeof item.hospital === 'string' && isNaN(Number(item.hospital)) ? item.hospital : '');
          
          const docId = typeof item.doctor === 'object' && item.doctor !== null ? item.doctor.id : item.doctor;
          const docObj = docId ? docList.find(d => Number(d.id) === Number(docId)) : null;
          const docName = item.doctor_name || (docObj ? (docObj.name.startsWith('Dr.') ? docObj.name : `Dr. ${docObj.name}`) : (docId ? `Dr. ID ${docId}` : 'Awaiting Assignment'));
          const condition = item.condition || item.Condation || 'Normal';
          const status = item.status || (docId ? 'Assigned' : 'Pending');

          const apptId = item.Appoment_id || item.appoment_id || item.appointment_id || id;

          return {
            ...item,
            id,
            Appoment_id: apptId,
            appoment_id: apptId,
            appointment_id: apptId,
            patient_id: `APT-${apptId}`,
            name,
            patient_name: name,
            hospital: hosp,
            hospital_name: itemHospName,
            doctor: docId ? Number(docId) : null,
            doctor_name: docName,
            bed_number: item.bed_number || null,
            condition,
            Condation: condition,
            status,
            age: item.age || item.Age || '',
            contact: item.contact || item.phone || '',
            email: item.email || '',
            payment_status: item.payment_status || 'Pending',
            checkup_status: item.checkup_status || 'Pending'
          };
        };

        const appointmentsList = [];
        const seenIds = new Set();

        for (const item of rawAppointments) {
          const norm = normalizeItem(item);
          if (norm && !seenIds.has(String(norm.id))) {
            seenIds.add(String(norm.id));
            appointmentsList.push(norm);
          }
        }

        // STRICT HOSPITAL ISOLATION: Only include appointments belonging to this receptionist's hospital
        const hospPats = targetHospId || hospName
          ? appointmentsList.filter(p => isAppointmentInHospital(p, targetHospId, hospName, hospList))
          : [];

        if (isMounted) {
          setPatients(hospPats);
        }
      } catch (err) {
        console.error('Error in ReceptionistDashboard load:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadReceptionistData();
    return () => { isMounted = false; };
  }, [currentUser]);

  const recName = receptionistInfo?.name || currentUser?.name || '';
  const roleTitle = receptionistInfo?.role || currentUser?.role || '';
  const shiftName = receptionistInfo?.shift || currentUser?.shift || '';
  const hospitalName = hospitalInfo?.Name || hospitalInfo?.name || receptionistInfo?.hospital_name || currentUser?.hospital_name || '';

  const isDoctorUnassigned = (p) => {
    if (!p) return true;
    const docId = p.doctor;
    const docName = (p.doctor_name || '').toLowerCase().trim();
    if (!docId || docId === 'null' || docId === 'None' || docId === '') {
      return true;
    }
    if (!docName || docName === '' || docName.includes('awaiting') || docName.includes('unassign') || docName.includes('none') || docName.includes('null')) {
      return true;
    }
    return false;
  };

  const isDischargedOrCancelled = (p) => {
    if (!p) return true;
    const s = (p.status || '').toLowerCase().trim();
    return s.includes('discharg') || s.includes('cancel');
  };

  const unassignedPatients = patients.filter(p => {
    if (isDischargedOrCancelled(p)) return false;
    const s = (p.status || '').toLowerCase().trim();
    if (s.includes('unassign')) return true;
    return isDoctorUnassigned(p);
  });

  const unassignedCount = unassignedPatients.length;
  const dischargedCount = patients.filter(p => (p.status || '').toLowerCase().includes('discharg')).length;

  const receptionistStats = [
    {
      title: 'Unassigned Patients',
      value: `${unassignedCount} Patients`,
      sub: 'Awaiting Doctor / Bed Triage',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      action: () => setCurrentPage && setCurrentPage('receptionist_anassine')
    },
    {
      title: 'Discharged & Billing',
      value: `${dischargedCount} Discharged`,
      sub: 'Ready for Bill Clearance',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      action: () => setCurrentPage && setCurrentPage('receptionist_billing')
    },
    {
      title: 'Total Patients',
      value: `${patients.length} Admissions`,
      sub: hospitalName ? `In ${hospitalName}` : 'Admissions',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      action: () => setCurrentPage && setCurrentPage('receptionist_patients')
    },
    {
      title: 'Doctors & Staff',
      value: `${doctorStats.total} Doctors`,
      sub: `${doctorStats.working} On Duty • ${nurseStats.working} Nurses`,
      color: 'bg-teal-50 text-teal-700 border-teal-200',
      action: () => setCurrentPage && setCurrentPage('receptionist_doctors')
    },
  ];

  const handlePatientClick = (patient) => {
    if (setSelectedPatient) {
      setSelectedPatient(patient);
      localStorage.setItem('selectedPatient', JSON.stringify(patient));
    }
    if (setCurrentPage) {
      setCurrentPage('receptionist_patient_details');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* WELCOME BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold border border-amber-400/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Reception & Front Desk{hospitalName ? ` • ${hospitalName}` : ''}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Welcome{recName ? `, ${recName}` : ''}
            </h1>
            {([roleTitle ? `Role: ${roleTitle}` : null, shiftName ? `Shift: ${shiftName}` : null, hospitalName].filter(Boolean).length > 0) && (
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {[roleTitle ? `Role: ${roleTitle}` : null, shiftName ? `Shift: ${shiftName}` : null, hospitalName].filter(Boolean).join(' • ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('receptionist_patients')}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Add Patient</span>
            </button>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {receptionistStats.map((item, idx) => (
          <div
            key={idx}
            onClick={item.action}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-amber-300 transition duration-150 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.color}`}>
                Front Desk
              </span>
              <span className="text-slate-400 text-xs">➔</span>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">{item.title}</p>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-0.5">{item.value}</h3>
            <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('receptionist_anassine')}
          className="p-4 rounded-2xl bg-gradient-to-tr from-rose-50 to-red-50 border border-rose-200 text-left hover:border-rose-400 transition cursor-pointer shadow-xs flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <h4 className="text-sm font-bold text-rose-950">Unassigned Queue</h4>
            </div>
            <p className="text-xs text-rose-700 mt-0.5">{unassignedCount} patients awaiting doctor or bed</p>
          </div>
          <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-lg">Queue</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('receptionist_billing')}
          className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-50 to-teal-50 border border-emerald-200 text-left hover:border-emerald-400 transition cursor-pointer shadow-xs flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <h4 className="text-sm font-bold text-emerald-950">Discharge Billing</h4>
            </div>
            <p className="text-xs text-emerald-700 mt-0.5">{dischargedCount} patients ready for bill settlement</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">Billing</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('receptionist_patients')}
          className="p-4 rounded-2xl bg-gradient-to-tr from-amber-50 to-orange-50 border border-amber-200 text-left hover:border-amber-400 transition cursor-pointer shadow-xs flex items-center justify-between"
        >
          <div>
            <h4 className="text-sm font-bold text-amber-900">Admissions</h4>
            <p className="text-xs text-amber-700 mt-0.5">Admit new patient & consultation</p>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">Admit</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('receptionist_doctors')}
          className="p-4 rounded-2xl bg-gradient-to-tr from-teal-50 to-emerald-50 border border-teal-200 text-left hover:border-teal-400 transition cursor-pointer shadow-xs flex items-center justify-between"
        >
          <div>
            <h4 className="text-sm font-bold text-teal-900">Doctors</h4>
            <p className="text-xs text-teal-700 mt-0.5">Check doctors availability</p>
          </div>
          <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2 py-1 rounded-lg">Doctors</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('receptionist_settings')}
          className="p-4 rounded-2xl bg-gradient-to-tr from-slate-50 to-blue-50 border border-slate-200 text-left hover:border-blue-400 transition cursor-pointer shadow-xs flex items-center justify-between"
        >
          <div>
            <h4 className="text-sm font-bold text-slate-800">Front Desk Setup</h4>
            <p className="text-xs text-slate-600 mt-0.5">Duty status & desk shift</p>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">Setup</span>
        </button>
      </div>

      {/* RECENT PATIENTS TABLE */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Recent Patient Registrations ({patients.length})</h2>
            <p className="text-xs text-slate-500">Live reception desk entries for {hospitalName}</p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('receptionist_patients')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
          >
            View All Patient Records ➔
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Patient Name & UHID</th>
                <th className="py-3 px-3">Bed & Floor</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Doctor Assigned</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading registrations...</td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No patient registrations yet today.</td>
                </tr>
              ) : (
                patients.slice(0, visibleCount).map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <div>{p.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-sky-700 font-bold">APT-{p.Appoment_id || p.appoment_id || p.appointment_id || p.id}</span>
                        {p.age && <span className="text-[10px] text-slate-500 font-medium">• {p.age} Yrs</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                        p.bed_number 
                          ? 'bg-teal-50 text-teal-800 border border-teal-200' 
                          : 'text-slate-400'
                      }`}>
                        {p.bed_number ? `Bed #${p.bed_number}` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      <div className="font-semibold text-slate-800">{p.contact || p.phone || '-'}</div>
                      {p.email && <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{p.email}</div>}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{p.doctor_name || 'Assigned Specialist'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        p.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {p.payment_status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                          {p.status || 'Confirmed'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          p.checkup_status === 'Checkup Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {p.checkup_status === 'Checkup Done' ? '✓ Checkup Done' : '⏳ Checkup Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handlePatientClick(p)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition cursor-pointer"
                      >
                        View File
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {visibleCount < patients.length && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-4">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 6)}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
