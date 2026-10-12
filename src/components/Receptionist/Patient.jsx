import React, { useState, useEffect, useMemo } from 'react';
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

// Strict isolation helper for receptionist's hospital appointments
const isAppointmentInHospital = (item, targetHospId, targetHospName = '', hospList = [], doctorsList = []) => {
  if (!item) return false;

  let targetId = targetHospId && !isNaN(Number(targetHospId)) ? Number(targetHospId) : null;
  let targetName = (targetHospName || '').toString().toLowerCase().trim();

  if (targetId && !targetName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => Number(h.id) === targetId);
    if (matched) targetName = (matched.Name || matched.name || '').toLowerCase().trim();
  } else if (!targetId && targetName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === targetName);
    if (matched) targetId = Number(matched.id);
  }

  // If receptionist's hospital cannot be resolved, strictly return false (NO LEAKS)
  if (!targetId && !targetName) return false;

  // 1. Resolve Appointment's raw hospital value
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

  // 2. Direct comparison if appointment has hospital info
  if (itemHospId || itemHospName) {
    if (targetId && itemHospId && itemHospId === targetId) return true;
    if (targetName && itemHospName && targetName === itemHospName) return true;
    if (targetId && itemHospName && Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === itemHospName);
      if (matched && Number(matched.id) === targetId) return true;
    }
    if (targetName && itemHospId && Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => Number(h.id) === itemHospId);
      if (matched && (matched.Name || matched.name || '').toLowerCase().trim() === targetName) return true;
    }
    if (targetName && itemHospName) {
      const cleanTarget = targetName.replace(/hospital|hospitals|care|clinic|super|speciality|specialty/gi, '').trim();
      const cleanItem = itemHospName.replace(/hospital|hospitals|care|clinic|super|speciality|specialty/gi, '').trim();
      if (cleanTarget.length >= 3 && cleanItem.length >= 3 && (cleanTarget.includes(cleanItem) || cleanItem.includes(cleanTarget))) {
        return true;
      }
    }
    // If appointment specifies a hospital and it did not match this hospital, it belongs elsewhere!
    return false;
  }

  // 3. Fallback: check if doctor assigned to appointment belongs to this hospital
  const docId = typeof item.doctor === 'object' && item.doctor !== null ? item.doctor.id : item.doctor;
  if (docId && Array.isArray(doctorsList) && doctorsList.length > 0) {
    const docObj = doctorsList.find(d => Number(d.id) === Number(docId));
    if (docObj) {
      const dHosp = typeof docObj.hospital === 'object' && docObj.hospital !== null ? (docObj.hospital.id || docObj.hospital.hospital_id) : docObj.hospital;
      const dHospName = (docObj.hospital_name || (typeof docObj.hospital === 'object' ? docObj.hospital?.Name : '') || '').toLowerCase().trim();
      if (targetId && dHosp && Number(dHosp) === targetId) return true;
      if (targetName && dHospName && targetName === dHospName) return true;
    }
  }

  return false;
};

const ReceptionistPatient = ({ currentUser, setCurrentPage, setSelectedPatient }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'HISTORY' | 'ACTIVE'

  const loadPatientsData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      // Check stored user in localStorage as backup
      let storedUser = null;
      try {
        const rawStored = localStorage.getItem('currentUser');
        if (rawStored) storedUser = JSON.parse(rawStored);
      } catch (e) { }

      const activeUser = currentUser || storedUser || {};
      const email = (activeUser.email || '').toLowerCase().trim();
      const recId = activeUser.id;

      const [hospRes, recRes, patRes, apptRes, docRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`),
        fetch(`${API_BASE_URL}/super-admin/Patients/`),
        fetch(`${API_BASE_URL}/super-admin/appointments/`),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`)
      ]);

      let loadedHospitals = [];
      if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
        const hData = await hospRes.value.json().catch(() => []);
        loadedHospitals = extractArray(hData);
      }

      let loadedDoctors = [];
      if (docRes.status === 'fulfilled' && docRes.value.ok) {
        const dData = await docRes.value.json().catch(() => []);
        loadedDoctors = extractArray(dData);
      }

      let currentRec = null;
      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const rData = await recRes.value.json().catch(() => []);
        const recs = extractArray(rData);
        currentRec = recs.find(r =>
          (r.email && r.email.toLowerCase().trim() === email) ||
          (recId && Number(r.id) === Number(recId)) ||
          (r.name && r.name.toLowerCase().trim() === (activeUser.name || '').toLowerCase().trim())
        );
      }

      // Resolve receptionist's hospital target ID & Name
      let targetHospId = currentRec?.hospital
        ? (typeof currentRec.hospital === 'object' ? currentRec.hospital.id : currentRec.hospital)
        : (typeof activeUser.hospital === 'object' ? activeUser.hospital.id : activeUser.hospital);

      if (!targetHospId && activeUser.hospital_id) {
        targetHospId = activeUser.hospital_id;
      }
      if (!targetHospId && activeUser.hospital_data) {
        targetHospId = activeUser.hospital_data.id || activeUser.hospital_data.hospital_id;
      }

      let targetHospName = currentRec?.hospital_name || activeUser.hospital_name || '';

      let foundHosp = null;
      if (targetHospId && loadedHospitals.length > 0) {
        foundHosp = loadedHospitals.find(h => Number(h.id) === Number(targetHospId));
      }
      if (!foundHosp && (targetHospName || activeUser.hospital_name)) {
        const hName = (targetHospName || activeUser.hospital_name).toLowerCase().trim();
        foundHosp = loadedHospitals.find(h => (h.Name || h.name || '').toLowerCase().trim() === hName);
        if (foundHosp) targetHospId = foundHosp.id;
      }
      if (!foundHosp && email) {
        const savedHospId = localStorage.getItem(`user_hospital_${email}`);
        if (savedHospId) {
          foundHosp = loadedHospitals.find(h => Number(h.id) === Number(savedHospId));
          if (foundHosp) targetHospId = foundHosp.id;
        }
      }
      if (!foundHosp) {
        const savedAnyHospId = localStorage.getItem('user_hospital');
        if (savedAnyHospId) {
          foundHosp = loadedHospitals.find(h => Number(h.id) === Number(savedAnyHospId));
          if (foundHosp) targetHospId = foundHosp.id;
        }
      }
      if (!foundHosp) {
        const checkStr = `${email} ${activeUser.name || ''} ${currentRec?.name || ''}`.toLowerCase();
        foundHosp = loadedHospitals.find(h => {
          const hn = (h.Name || h.name || '').toLowerCase().trim();
          const cleanHn = hn.replace(/hospital|hospitals|care|clinic|super|speciality|specialty/gi, '').trim();
          return cleanHn.length >= 3 && checkStr.includes(cleanHn);
        });
        if (foundHosp) targetHospId = foundHosp.id;
      }

      if (foundHosp) {
        setHospitalInfo(foundHosp);
        targetHospName = foundHosp.Name || foundHosp.name || '';
      }

      let rawRegisteredPatients = [];
      if (patRes.status === 'fulfilled' && patRes.value.ok) {
        const pData = await patRes.value.json().catch(() => []);
        rawRegisteredPatients = extractArray(pData);
      }

      let rawAppointments = [];
      if (apptRes.status === 'fulfilled' && apptRes.value.ok) {
        const aData = await apptRes.value.json().catch(() => []);
        rawAppointments = extractArray(aData);
      }

      // =========================================================================
      // 1. STRICT HOSPITAL APPOINTMENT ISOLATION:
      // Keep ONLY appointments booked in THIS receptionist's hospital!
      // =========================================================================
      const isApptCancelled = (a) => {
        if (!a) return false;
        const s = (a.status || a.appointment_status || a.booking_status || '').toString().toLowerCase().trim();
        return s.includes('cancel');
      };

      const hospitalAppts = rawAppointments.filter(a =>
        isAppointmentInHospital(a, targetHospId, targetHospName, loadedHospitals, loadedDoctors) &&
        !isApptCancelled(a)
      );

      // =========================================================================
      // 2. STRICT PATIENT INCLUSION:
      // ONLY patients who have booked at least ONE appointment in THIS hospital
      // are included. If a registered user has 0 appointments in this hospital,
      // they are 100% EXCLUDED from this page!
      // =========================================================================
      const patientGroups = new Map();

      for (const appt of hospitalAppts) {
        const aEmail = (appt.email || '').trim().toLowerCase();
        const aContact = (appt.contact || appt.phone || '').trim().replace(/\D/g, '');
        const aContact10 = aContact.length >= 10 ? aContact.slice(-10) : aContact;
        const aPat = typeof appt.patient === 'object' && appt.patient !== null
          ? String(appt.patient.id)
          : (appt.patient ? String(appt.patient) : '');
        const aPatUhid = (appt.patient_uhid || (typeof appt.patient_id === 'string' && !appt.patient_id.startsWith('APT-') ? appt.patient_id : '') || appt.uhid || '').trim();
        const aName = (appt.patient_name || appt.patient_Name || appt.name || '').trim();

        // Check if this appointment matches an already existing group
        let existingKey = null;
        for (const [k, group] of patientGroups.entries()) {
          const matched = group.appointments.some(other => {
            const oEmail = (other.email || '').trim().toLowerCase();
            const oContact = (other.contact || other.phone || '').trim().replace(/\D/g, '');
            const oContact10 = oContact.length >= 10 ? oContact.slice(-10) : oContact;
            const oPat = typeof other.patient === 'object' && other.patient !== null ? String(other.patient.id) : (other.patient ? String(other.patient) : '');
            const oPatUhid = (other.patient_uhid || (typeof other.patient_id === 'string' && !other.patient_id.startsWith('APT-') ? other.patient_id : '') || other.uhid || '').trim();

            if (aPat && oPat && aPat === oPat) return true;
            if (aPatUhid && oPatUhid && aPatUhid === oPatUhid) return true;
            if (aEmail && oEmail && aEmail === oEmail) return true;
            if (aContact10 && oContact10 && aContact10 === oContact10) return true;
            return false;
          });
          if (matched) {
            existingKey = k;
            break;
          }
        }

        const targetKey = existingKey || (aPat ? `pat_id_${aPat}` : (aEmail ? `email_${aEmail}` : (aContact10 ? `phone_${aContact10}` : `appt_${appt.id}`)));

        if (!patientGroups.has(targetKey)) {
          patientGroups.set(targetKey, {
            appointments: [],
            latestAppt: appt
          });
        }

        const g = patientGroups.get(targetKey);
        g.appointments.push(appt);

        // Keep the latest appointment
        const curDate = new Date(appt.visit_date_time || appt.created_at || 0).getTime();
        const prevDate = new Date(g.latestAppt?.visit_date_time || g.latestAppt?.created_at || 0).getTime();
        if (curDate >= prevDate) {
          g.latestAppt = appt;
        }
      }

      // 3. For each hospital patient group, match with registered account profile if available
      const finalPatientsList = [];

      for (const [key, group] of patientGroups.entries()) {
        const patientAppts = group.appointments;
        const latestAppt = group.latestAppt || patientAppts[0];

        const apptEmails = new Set(patientAppts.map(a => (a.email || '').trim().toLowerCase()).filter(Boolean));
        const apptPhones = new Set(patientAppts.map(a => (a.contact || a.phone || '').trim().replace(/\D/g, '')).map(c => c.slice(-10)).filter(c => c.length >= 7));
        const apptPatIds = new Set(patientAppts.map(a => typeof a.patient === 'object' && a.patient !== null ? String(a.patient.id) : (a.patient ? String(a.patient) : '')).filter(Boolean));
        const apptUhids = new Set(patientAppts.map(a => (a.patient_uhid || (typeof a.patient_id === 'string' && !a.patient_id.startsWith('APT-') ? a.patient_id : '') || a.uhid || '').trim().toLowerCase()).filter(Boolean));

        // Match registered user account strictly by ID, UHID, verified email, or phone
        const matchedUser = rawRegisteredPatients.find(u => {
          const uId = u.id ? String(u.id) : '';
          const uEmail = (u.email || '').trim().toLowerCase();
          const uContact = (u.contact || u.phone || '').trim().replace(/\D/g, '');
          const uContact10 = uContact.slice(-10);
          const uUhid = (u.uhid || u.patient_id || '').trim().toLowerCase();

          if (uId && apptPatIds.has(uId)) return true;
          if (uUhid && apptUhids.has(uUhid)) return true;
          if (uEmail && apptEmails.has(uEmail)) return true;
          if (uContact10 && apptPhones.has(uContact10)) return true;

          return false;
        });

        const baseRecord = matchedUser || {};
        const patientName = baseRecord.name || baseRecord.patient_name || latestAppt.patient_name || latestAppt.patient_Name || latestAppt.name || 'Patient';
        const resolvedId = baseRecord.uhid || baseRecord.patient_id || (baseRecord.id ? `PAT-${baseRecord.id}` : null) || latestAppt.patient_uhid || (typeof latestAppt.patient_id === 'string' && !latestAppt.patient_id.startsWith('APT-') ? latestAppt.patient_id : null) || latestAppt.uhid || (latestAppt.id ? `PAT-${latestAppt.id}` : '-');
        const resolvedPhone = baseRecord.contact || baseRecord.phone || latestAppt.contact || latestAppt.phone || '-';
        const resolvedEmail = baseRecord.email || latestAppt.email || '-';
        const resolvedGender = baseRecord.gender || baseRecord.Gender || latestAppt.gender || latestAppt.Gender || 'Not Specified';
        const resolvedBlood = baseRecord.blood_group || baseRecord.Blood_Group || latestAppt.blood_group || latestAppt.Blood_Group || 'N/A';
        const resolvedAddress = baseRecord.address || latestAppt.address || 'Local Resident';
        const resolvedAge = baseRecord.age || baseRecord.Age || latestAppt.age || latestAppt.Age || '-';

        finalPatientsList.push({
          ...baseRecord,
          id: baseRecord.id || latestAppt.id,
          patient_id: resolvedId,
          uhid: resolvedId,
          name: patientName,
          contact: resolvedPhone,
          phone: resolvedPhone,
          email: resolvedEmail,
          gender: resolvedGender,
          blood_group: resolvedBlood,
          address: resolvedAddress,
          age: resolvedAge,
          total_appointments: patientAppts.length,
          hospital_appointments: patientAppts,
          latest_appointment: latestAppt,
          hospital_name: targetHospName || foundHosp?.Name || foundHosp?.name || 'Hospital Campus'
        });
      }

      setPatients(finalPatientsList);
    } catch (err) {
      console.error('Error loading receptionist patients:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadPatientsData(false);

    const pollInterval = setInterval(() => {
      if (isMounted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadPatientsData(true);
      }
    }, 4000);

    const handleFocus = () => {
      if (isMounted) loadPatientsData(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser]);

  const handleViewDetails = (patient) => {
    if (setSelectedPatient) {
      setSelectedPatient(patient);
    }
    try {
      localStorage.setItem('selectedPatient', JSON.stringify(patient));
    } catch (err) { }

    if (setCurrentPage) {
      setCurrentPage('receptionist_patient_details');
    }
  };

  const isApptDischarged = (a) => {
    if (!a) return false;
    const s = (a.status || a.discharge_status || '').toString().toLowerCase().trim();
    return s.includes('discharg') || s === 'completed';
  };

  const isApptBillPaid = (a) => {
    if (!a) return false;
    const p = (a.payment_status || a.Payment_status || a.billing_status || '').toString().toLowerCase().trim();
    return p === 'paid' || p.includes('paid');
  };

  const isPatientHistory = (p) => {
    const appts = p.hospital_appointments || [];
    if (!appts || appts.length === 0) return false;
    return appts.every(a => isApptDischarged(a) && isApptBillPaid(a));
  };

  const historyPatients = useMemo(() => {
    return patients.filter(isPatientHistory);
  }, [patients]);

  const activePatients = useMemo(() => {
    return patients.filter(p => !isPatientHistory(p));
  }, [patients]);

  const filteredPatients = useMemo(() => {
    let list = patients;
    if (activeFilter === 'HISTORY') {
      list = historyPatients;
    } else if (activeFilter === 'ACTIVE') {
      list = activePatients;
    }

    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase().trim();
    return list.filter(p =>
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.patient_id && p.patient_id.toLowerCase().includes(term)) ||
      (p.uhid && p.uhid.toLowerCase().includes(term)) ||
      (p.contact && p.contact.toLowerCase().includes(term)) ||
      (p.phone && p.phone.toLowerCase().includes(term)) ||
      (p.email && p.email.toLowerCase().includes(term))
    );
  }, [patients, historyPatients, activePatients, activeFilter, searchTerm]);

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-8 space-y-4 sm:space-y-6">
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Reception & Front Desk{hospitalInfo?.Name || hospitalInfo?.name || currentUser?.hospital_name ? ` • ${hospitalInfo?.Name || hospitalInfo?.name || currentUser?.hospital_name}` : ''}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Hospital Patients Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Registered patients who have booked appointments at {hospitalInfo?.Name || hospitalInfo?.name || currentUser?.hospital_name || 'this hospital'}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadPatientsData(false)}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
              title="Refresh database records"
            >
              <span className={refreshing ? 'animate-spin' : ''}>↻</span>
              <span>{refreshing ? 'Syncing...' : 'Refresh Records'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setActiveFilter('ALL')}
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition hover:shadow-sm ${
            activeFilter === 'ALL'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-gradient-to-br from-amber-50/30 to-white'
              : 'border-slate-200 hover:border-slate-300'
          }`}
          title="Click to view all patients"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Patients</p>
            {activeFilter === 'ALL' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Active View</span>
            )}
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{patients.length}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Hospital appointment holders</p>
        </div>

        <div className="bg-white rounded-2xl border border-teal-200 p-4 shadow-2xs bg-gradient-to-br from-teal-50/40 to-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">Total Appointments</p>
          <h3 className="text-2xl sm:text-3xl font-black text-teal-700 mt-1">
            {patients.reduce((sum, p) => sum + (p.total_appointments || 1), 0)}
          </h3>
          <p className="text-xs text-teal-700/80 mt-0.5 font-medium">Booked at this hospital</p>
        </div>

        {/* Patient History Box (Discharged & Billed) */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'HISTORY' ? 'ALL' : 'HISTORY')}
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition hover:shadow-sm ${
            activeFilter === 'HISTORY'
              ? 'border-emerald-600 ring-2 ring-emerald-600/30 bg-gradient-to-br from-emerald-100/60 to-white shadow-md'
              : 'border-emerald-300 hover:border-emerald-400 bg-gradient-to-br from-emerald-50/40 to-white'
          }`}
          title="Click to view Discharged & Settled Patient History"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
              <span>📜</span>
              <span>Patient History</span>
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              activeFilter === 'HISTORY'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
            }`}>
              {activeFilter === 'HISTORY' ? 'Showing History' : 'Discharged & Billed'}
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
            {historyPatients.length}
          </h3>
          <p className="text-xs text-emerald-800 mt-0.5 font-medium flex items-center justify-between">
            <span>Discharged & bill settled</span>
            <span className="text-[11px] font-bold underline">Click to view →</span>
          </p>
        </div>

        {/* Active Patients */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition hover:shadow-sm ${
            activeFilter === 'ACTIVE'
              ? 'border-sky-500 ring-2 ring-sky-500/20 bg-gradient-to-br from-sky-50/40 to-white shadow-md'
              : 'border-sky-200 hover:border-sky-300 bg-gradient-to-br from-sky-50/20 to-white'
          }`}
          title="Click to view active admissions"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800">Active Admissions</p>
            {activeFilter === 'ACTIVE' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">Active View</span>
            )}
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-sky-700 mt-1">
            {activePatients.length}
          </h3>
          <p className="text-xs text-sky-700/80 mt-0.5 font-medium">In consultation / treatment</p>
        </div>
      </div>

      {/* FILTER & PATIENTS TABLE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        {/* TOP CONTROLS & TABS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">
                {activeFilter === 'HISTORY' ? '📜 Discharged & Settled History Directory' : 'Patients Directory'}
              </h2>
              {activeFilter === 'HISTORY' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {historyPatients.length} History Records
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {activeFilter === 'HISTORY'
                ? 'Showing patients whose all appointments are discharged and billing is settled.'
                : 'Registered patients who booked an appointment in this hospital'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>All</span>
                <span className="text-[10px] opacity-75 font-mono">({patients.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('HISTORY')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'HISTORY'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                <span>📜 History</span>
                <span className="text-[10px] opacity-80 font-mono">({historyPatients.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('ACTIVE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'ACTIVE'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-sky-700 hover:text-sky-900'
                }`}
              >
                <span>Active</span>
                <span className="text-[10px] opacity-80 font-mono">({activePatients.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, ID, phone, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white sm:w-64"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Informational Banner for History Filter */}
        {activeFilter === 'HISTORY' && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">📜</span>
              <span>
                <strong>Patient History View:</strong> These patients have completed treatment, all their hospital appointments are marked as <strong>Discharged</strong>, and all bills have been <strong>Paid</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer ml-3 shrink-0"
            >
              Show All Patients ✕
            </button>
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[650px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Patient ID</th>
                <th className="py-3 px-3">Patient Name</th>
                <th className="py-3 px-3">Contact Details</th>
                <th className="py-3 px-3 text-center">Visits</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p>Loading patient directory...</p>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                    {activeFilter === 'HISTORY'
                      ? 'No history records found yet. Patients will appear in history once all their appointments are Discharged and bills are Paid.'
                      : searchTerm
                        ? 'No patients found matching search criteria.'
                        : 'No patients found with appointments in this hospital.'}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient, idx) => (
                  <tr key={patient.id ? `p-${patient.id}-${idx}` : `p-idx-${idx}`} className="hover:bg-slate-50/70 transition">
                    {/* ID */}
                    <td className="py-3.5 px-3 font-mono font-bold text-teal-800">
                      <span className="px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800">
                        {patient.patient_id || patient.uhid || `PAT-${patient.id}`}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3.5 px-3 font-bold text-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                          {(patient.name || 'P').charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800">{patient.name}</span>
                      </div>
                    </td>

                    {/* Contact Details */}
                    <td className="py-3.5 px-3">
                      <div className="space-y-0.5">
                        {patient.contact && patient.contact !== '-' && (
                          <div className="text-slate-700 font-mono font-medium text-xs flex items-center gap-1.5">
                            <span className="text-emerald-600 font-bold">📞</span>
                            <span>{patient.contact}</span>
                          </div>
                        )}
                        {patient.email && patient.email !== '-' && (
                          <div className="text-slate-500 text-[11px] truncate max-w-[240px] flex items-center gap-1.5">
                            <span className="text-sky-600">✉️</span>
                            <span>{patient.email}</span>
                          </div>
                        )}
                        {(!patient.contact || patient.contact === '-') && (!patient.email || patient.email === '-') && (
                          <span className="text-slate-400 italic">No contact details</span>
                        )}
                      </div>
                    </td>

                    {/* Hospital Visits */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                        {patient.total_appointments || 1} {patient.total_appointments === 1 ? 'Booking' : 'Bookings'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(patient)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer inline-flex items-center gap-1.5 ${
                          isPatientHistory(patient)
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                        title="View complete appointment and medical history"
                      >
                        <span>Details</span>
                        <span>→</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER NOTE */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredPatients.length} patient(s) with appointment history in this hospital</span>
          <span className="text-[11px]">Strict hospital data isolation active</span>
        </div>
      </div>
    </div>
  );
};

export default ReceptionistPatient;
