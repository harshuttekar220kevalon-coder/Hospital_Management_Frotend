import React, { useState, useEffect, useRef } from 'react';
import PatientNavbar from './PatientNavbar';
import PatientFooter from './PatientFooter';
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

const PatientDashboard = ({ currentUser, setCurrentPage, isLoggedIn = true, onLogout }) => {
  const [patientProfile, setPatientProfile] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [selectedApptId, setSelectedApptId] = useState(null);
  const selectedApptIdRef = useRef(null);
  const [allAppointments, setAllAppointments] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDischargeAlert, setShowDischargeAlert] = useState(true);

  const isDischarged = (itemOrStatus, checkupStatus, paymentStatus) => {
    let s = '';
    let c = '';
    let b = '';
    if (typeof itemOrStatus === 'object' && itemOrStatus !== null) {
      s = (itemOrStatus.status || itemOrStatus.discharge_status || '').toString().toLowerCase().trim();
      c = (itemOrStatus.checkup_status || itemOrStatus.Checkup_status || '').toString().toLowerCase().trim();
      b = (itemOrStatus.payment_status || itemOrStatus.Payment_status || itemOrStatus.billing_status || '').toString().toLowerCase().trim();
    } else {
      s = (itemOrStatus || '').toString().toLowerCase().trim();
      c = (checkupStatus || '').toString().toLowerCase().trim();
      b = (paymentStatus || '').toString().toLowerCase().trim();
    }

    // If status is Pending or contains pending / unassign / admit / in progress -> NOT discharged
    if (s.includes('pending') || s.includes('unassign') || s.includes('admit') || s.includes('progress') || s.includes('cancel') || s === '') {
      return false;
    }

    // Must explicitly contain discharged or completed
    if (!s.includes('discharg') && s !== 'completed') {
      return false;
    }

    // Checkup status must NOT be pending
    if (c && (c.includes('pending') || c.includes('wait') || c === 'under checkup')) {
      return false;
    }

    // Billing / Payment status must NOT be pending / unpaid
    if (b && (b === 'pending' || b.includes('pending') || b === 'unpaid' || b === 'due')) {
      return false;
    }

    return true;
  };

  const loadPatientData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const patId = currentUser?.id;
      const patPhone = (currentUser?.contact || currentUser?.phone || '').replace(/\D/g, '');
      const userUhid = (currentUser?.patient_id || currentUser?.uhid || '').toLowerCase().trim();

      // 1. Fetch metadata (Patients, Doctors, Hospitals) in parallel
      const [patRes, docRes, hospRes] = await Promise.all([
        fetch(`${API_BASE_URL}/super-admin/Patients/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null)
      ]);

      let foundPatientRecord = null;
      if (patRes && patRes.ok) {
        const pats = await patRes.json().catch(() => []);
        const patsArr = extractArray(pats);
        if (patsArr.length > 0) {
          if (email) foundPatientRecord = patsArr.find(p => (p.email || '').toLowerCase().trim() === email);
          if (!foundPatientRecord && userUhid) foundPatientRecord = patsArr.find(p => (p.patient_id || p.uhid || '').toLowerCase().trim() === userUhid);
          if (!foundPatientRecord && patId && !isNaN(Number(patId)) && Number(patId) > 0) foundPatientRecord = patsArr.find(p => Number(p.id) === Number(patId));
          if (!foundPatientRecord && patPhone && patPhone.length >= 10) foundPatientRecord = patsArr.find(p => (p.contact || p.phone || '').replace(/\D/g, '') === patPhone);
          if (!foundPatientRecord && (currentUser?.name || currentUser?.username)) {
            const checkName = (currentUser?.name || currentUser?.username || '').toLowerCase().trim();
            if (checkName && checkName.length > 1) {
              foundPatientRecord = patsArr.find(p => (p.name || p.patient_name || p.patient_Name || '').toLowerCase().trim() === checkName);
            }
          }
        }
      }

      let docs = [];
      if (docRes && docRes.ok) {
        const rawDocs = await docRes.json().catch(() => []);
        docs = extractArray(rawDocs);
        setDoctorsList(docs);
      }

      let hosps = [];
      if (hospRes && hospRes.ok) {
        const rawHosps = await hospRes.json().catch(() => []);
        hosps = extractArray(rawHosps);
        setHospitalsList(hosps);
      }

      setPatientProfile(foundPatientRecord || currentUser);

      // 2. Aggregate appointments strictly for this logged-in patient ONLY
      let fetchedAppointments = [];
      try {
        let rawAppointments = [];
        try {
          const res = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
          if (res && res.ok) {
            const data = await res.json().catch(() => []);
            rawAppointments = extractArray(data);
          }
        } catch (e) {}

        const patientPk = foundPatientRecord?.id || (patId && !isNaN(Number(patId)) ? Number(patId) : null);
        const patientUhid = (foundPatientRecord?.patient_id || foundPatientRecord?.uhid || userUhid || '').toLowerCase().trim();
        const patientEmail = (foundPatientRecord?.email || email || '').toLowerCase().trim();
        const patientPhone = (foundPatientRecord?.contact || foundPatientRecord?.phone || patPhone || '').replace(/\D/g, '');

        // Filter backend appointments for this patient
        const specificAppts = rawAppointments.filter(a => {
          const aPatId = typeof a.patient === 'object' ? a.patient?.id : a.patient;
          const aEmail = (a.email || a.Email || a.patient_email || a.patient_Email || (typeof a.patient === 'object' ? a.patient?.email : '') || '').toLowerCase().trim();
          const aContact = (a.contact || a.phone || (typeof a.patient === 'object' ? a.patient?.contact : '') || '').replace(/\D/g, '');
          const aUhid = (a.patient_id || a.uhid || (typeof a.patient === 'object' ? a.patient?.patient_id : '') || '').toLowerCase().trim();
          const aApptId = String(a.Appoment_id || a.appoment_id || a.id || '').toLowerCase().trim();

          if (patientEmail && aEmail && aEmail === patientEmail) return true;
          if (patientUhid && aUhid && aUhid === patientUhid) return true;
          if (patientUhid && aApptId && (patientUhid === aApptId || patientUhid === `apt-${aApptId}` || patientUhid === `apt${aApptId}`)) return true;
          if (patientPk && aPatId && Number(aPatId) === Number(patientPk)) return true;
          if (patientPhone && patientPhone.length >= 10 && aContact && aContact === patientPhone) return true;

          return false;
        });

        // Read locally cached appointments for this patient
        let localAppts = [];
        const storedKey = patientEmail ? `patient_appointments_${patientEmail}` : null;
        if (storedKey) {
          try {
            const rawStored = localStorage.getItem(storedKey);
            if (rawStored) {
              const parsed = JSON.parse(rawStored);
              localAppts = Array.isArray(parsed) ? parsed : [parsed];
            }
          } catch (e) {}
        }

        // When backend data is fetched, backend is source of truth. Purge deleted records from cache.
        const backendIds = new Set(rawAppointments.map(a => String(a.id || a.Appoment_id || a.appoment_id || '')));
        if (storedKey && localAppts.length > 0) {
          const activeLocal = localAppts.filter(loc => {
            const locId = String(loc?.id || loc?.Appoment_id || loc?.appoment_id || '');
            return locId && backendIds.has(locId);
          });
          try {
            localStorage.setItem(storedKey, JSON.stringify(activeLocal));
          } catch (e) {}
        }

        fetchedAppointments = specificAppts;
      } catch (e) {
        console.warn('Appointments fetch notice:', e);
      }

      // Sort newest appointments first (by id descending)
      fetchedAppointments.sort((a, b) => (Number(b.id || b.Appoment_id) || 0) - (Number(a.id || a.Appoment_id) || 0));
      setAllAppointments(fetchedAppointments);

      // Only set active appointment if it is NOT discharged
      const activeList = fetchedAppointments.filter(a => !isDischarged(a));

      let targetAppt = null;
      if (selectedApptIdRef.current) {
        targetAppt = activeList.find(a => String(a.id || a.Appoment_id || a.appoment_id || a.appointment_id) === String(selectedApptIdRef.current));
      }

      if (!targetAppt) {
        targetAppt = activeList.length > 0 ? activeList[0] : null;
      }

      if (targetAppt) {
        const targetId = String(targetAppt.id || targetAppt.Appoment_id || targetAppt.appoment_id || targetAppt.appointment_id);
        selectedApptIdRef.current = targetId;
        setSelectedApptId(targetId);
      } else {
        selectedApptIdRef.current = null;
        setSelectedApptId(null);
      }

      setPatientInfo(targetAppt);

    } catch (err) {
      console.error('Error in PatientDashboard load:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Real-Time Live Synchronization & Polling
  useEffect(() => {
    let isMounted = true;
    loadPatientData(false);

    // 1. Silent Background Polling every 3.5 seconds
    const pollInterval = setInterval(() => {
      if (isMounted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadPatientData(true);
      }
    }, 3500);

    // 2. Immediate refetch on Window Focus / Tab Switch
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isMounted) {
        loadPatientData(true);
      }
    };

    const handleFocus = () => {
      if (isMounted) {
        loadPatientData(true);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [currentUser]);

  const activeAppointments = allAppointments.filter(a => !isDischarged(a));
  const dischargedAppointments = allAppointments.filter(a => isDischarged(a));
  const hasActiveAppointment = activeAppointments.length > 0;

  // Auto-hide the discharged alert banner after 5 seconds
  useEffect(() => {
    if (dischargedAppointments.length > 0 && !hasActiveAppointment) {
      setShowDischargeAlert(true);
      const timer = setTimeout(() => {
        setShowDischargeAlert(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowDischargeAlert(false);
    }
  }, [dischargedAppointments.length, hasActiveAppointment]);

  // Selected appointment ONLY if it is an active non-discharged appointment
  const activeAppt = hasActiveAppointment
    ? ((selectedApptId || selectedApptIdRef.current)
        ? (activeAppointments.find(a => String(a.id || a.Appoment_id || a.appoment_id || a.appointment_id) === String(selectedApptId || selectedApptIdRef.current)) || patientInfo || activeAppointments[0])
        : (patientInfo && !isDischarged(patientInfo) ? patientInfo : activeAppointments[0]))
    : null;

  // Dynamically resolve appointment tracking ID
  const activeApptId = activeAppt ? (activeAppt.Appoment_id || activeAppt.appoment_id || activeAppt.appointment_id || activeAppt.id) : null;
  const trackingId = activeApptId ? `APT-${activeApptId}` : (patientProfile?.patient_id || patientProfile?.uhid || (patientProfile?.id ? `PAT-${patientProfile.id}` : 'PAT-01'));

  // Helper to determine if doctor is unassigned
  const isDoctorValUnassigned = (docVal, docNameVal) => {
    if (!docVal || docVal === 'null' || docVal === 'None' || docVal === '' || docVal === 0) return true;
    const dn = (docNameVal || '').toLowerCase().trim();
    if (!dn || dn.includes('awaiting') || dn.includes('unassign') || dn.includes('none') || dn.includes('null')) return true;
    return false;
  };

  // Dynamically resolve doctor & hospital for active appointment strictly from backend
  const targetDocId = typeof activeAppt?.doctor === 'object' ? activeAppt?.doctor?.id : activeAppt?.doctor;
  const docObj = targetDocId && !isNaN(Number(targetDocId)) && Number(targetDocId) > 0 ? doctorsList.find(d => Number(d.id) === Number(targetDocId)) : null;

  const hasDoctor = Boolean(activeAppt && !isDoctorValUnassigned(targetDocId, activeAppt.doctor_name || docObj?.name));
  const docName = hasDoctor
    ? (docObj?.name ? (docObj.name.startsWith('Dr.') ? docObj.name : `Dr. ${docObj.name}`) : (activeAppt?.doctor_name ? (activeAppt.doctor_name.startsWith('Dr.') ? activeAppt.doctor_name : `Dr. ${activeAppt.doctor_name}`) : (targetDocId ? `Dr. ID #${targetDocId}` : 'Assigned Doctor')))
    : 'None Assigned';
  const docSpecialty = hasDoctor
    ? (docObj?.specialization || docObj?.specialty || activeAppt?.doctor_specialization || 'Consulting Specialist')
    : 'Pending Triage Assignment';

  const targetHospId = typeof activeAppt?.hospital === 'object' ? activeAppt?.hospital?.id : activeAppt?.hospital;
  const hospObj = targetHospId ? hospitalsList.find(h => Number(h.id) === Number(targetHospId)) : null;

  // Logged-in Patient Account Information (strictly user who logged in, NOT appointment)
  const loggedInProfile = patientProfile || currentUser || {};

  const loggedInName =
    (loggedInProfile.name && loggedInProfile.name.trim() !== '') ? loggedInProfile.name :
    (loggedInProfile.patient_name && loggedInProfile.patient_name.trim() !== '') ? loggedInProfile.patient_name :
    (loggedInProfile.patient_Name && loggedInProfile.patient_Name.trim() !== '') ? loggedInProfile.patient_Name :
    (currentUser?.name && currentUser.name.trim() !== '') ? currentUser.name :
    (currentUser?.patient_name && currentUser.patient_name.trim() !== '') ? currentUser.patient_name :
    (currentUser?.email ? currentUser.email.split('@')[0] : 'Patient');

  const resolvePatientId = () => {
    if (patientProfile?.uhid && !String(patientProfile.uhid).toUpperCase().startsWith('APT-')) {
      return patientProfile.uhid;
    }
    if (patientProfile?.patient_id && !String(patientProfile.patient_id).toUpperCase().startsWith('APT-')) {
      return patientProfile.patient_id;
    }
    if (patientProfile?.id && !isNaN(Number(patientProfile.id)) && Number(patientProfile.id) > 0) {
      return `PAT-${patientProfile.id}`;
    }
    if (currentUser?.uhid && !String(currentUser.uhid).toUpperCase().startsWith('APT-')) {
      return currentUser.uhid;
    }
    if (currentUser?.patient_id && !String(currentUser.patient_id).toUpperCase().startsWith('APT-')) {
      return currentUser.patient_id;
    }
    if (currentUser?.id && !isNaN(Number(currentUser.id)) && Number(currentUser.id) > 0) {
      return `PAT-${currentUser.id}`;
    }
    return 'PAT-01';
  };

  const loggedInPatientId = resolvePatientId();
  const loggedInPhone = loggedInProfile.contact || loggedInProfile.phone || currentUser?.contact || currentUser?.phone || '';
  const loggedInEmail = loggedInProfile.email || currentUser?.email || '';
  const loggedInGender = loggedInProfile.gender || loggedInProfile.Gender || currentUser?.gender || currentUser?.Gender || '';
  const loggedInBloodGroup = loggedInProfile.blood_group || loggedInProfile.Blood_Group || currentUser?.blood_group || currentUser?.Blood_Group || '';
  const loggedInAge = loggedInProfile.age || loggedInProfile.Age || currentUser?.age || '';

  const patName = loggedInName;
  const patGender = loggedInGender || activeAppt?.Gender || activeAppt?.gender || 'Not Specified';

  const hospName = hospObj?.Name || hospObj?.name || activeAppt?.hospital_name || '';

  const rawBed = activeAppt?.bed_number;
  const bedNum = (rawBed !== null && rawBed !== undefined && rawBed !== 'null' && rawBed !== 'None' && rawBed !== '' && !String(rawBed).toLowerCase().includes('unassign') && Number(rawBed) > 0) ? Number(rawBed) : null;
  const floorName = bedNum ? `Floor ${Math.floor((Number(bedNum) - 1) / 100) + 1}` : 'Outpatient (OPD)';

  const rawStatus = (activeAppt?.status || '').trim();
  const statusStr = rawStatus || (hasDoctor ? 'Assigned' : 'Pending');
  const appointmentDate = activeAppt?.appointment_date || (activeAppt?.visit_date_time ? new Date(activeAppt.visit_date_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Scheduled');
  const appointmentTime = activeAppt?.appointment_time || (activeAppt?.visit_date_time ? new Date(activeAppt.visit_date_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : (hasDoctor ? 'Slot Assigned' : 'Awaiting Slot'));

  const isPendingTriage = hasActiveAppointment && (!hasDoctor || statusStr.toLowerCase().includes('pending') || statusStr.toLowerCase().includes('unassign'));
  const isCheckupDone = statusStr.toLowerCase().includes('checkup') || statusStr.toLowerCase().includes('admit') || statusStr.toLowerCase().includes('done');
  const isPaid = activeAppt?.payment_status === 'Paid';

  // Real billing from active backend record
  const docFee = hasActiveAppointment ? Number(activeAppt?.consultation_fee ?? activeAppt?.Consultation_Fee ?? (docObj?.consultation_fee || 0)) : 0;
  const hospCharges = hasActiveAppointment && (activeAppt?.hospitals_charges ?? activeAppt?.hospital_charges ?? activeAppt?.Hospitals_Chargies) !== undefined && (activeAppt?.hospitals_charges ?? activeAppt?.hospital_charges ?? activeAppt?.Hospitals_Chargies) !== null
    ? parseFloat(activeAppt?.hospitals_charges ?? activeAppt?.hospital_charges ?? activeAppt?.Hospitals_Chargies)
    : 0;
  const amtPaid = hasActiveAppointment && activeAppt?.amount_paid !== undefined && activeAppt?.amount_paid !== null
    ? parseFloat(activeAppt.amount_paid)
    : (hasActiveAppointment && isPaid ? docFee + hospCharges : 0);
  const totalBill = hasActiveAppointment ? docFee + hospCharges : 0;

  // Stat cards: Show Live Appointment Tracking by APT ID
  const patientStats = hasActiveAppointment ? [
    { title: 'APPOINTMENT ID', value: trackingId, sub: `Active Booking #${activeApptId}`, tag: 'Live Tracking', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { title: 'INPATIENT BED & WARD', value: bedNum ? `Bed #${bedNum}` : 'Outpatient / OPD', sub: floorName, tag: 'Care Location', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { title: 'ATTENDING DOCTOR', value: hasDoctor ? docName : 'Pending Assignment', sub: docSpecialty, tag: 'Consultant', color: hasDoctor ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200' },
    { title: 'TOTAL BILL AMOUNT', value: `₹${totalBill.toFixed(2)}`, sub: `Payment: ${activeAppt?.payment_status || 'Pending'} • Paid: ₹${amtPaid.toFixed(2)}`, tag: 'Live Billing', color: totalBill > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200' },
  ] : [
    { title: 'PATIENT PROFILE ID', value: trackingId, sub: 'Account Registered', tag: 'Profile', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { title: 'ACTIVE OPD VISITS', value: '0 Active Bookings', sub: dischargedAppointments.length > 0 ? `${dischargedAppointments.length} Past Discharged Visits` : 'No Active Consultation', tag: 'Status', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { title: 'ATTENDING DOCTOR', value: 'None Assigned', sub: 'Book OPD to consult doctor', tag: 'Ready', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { title: 'TOTAL BILLING', value: '₹0.00', sub: 'No pending dues', tag: 'Cleared', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

  const getStatusBadgeStyle = (status) => {
    const s = (status || '').toString().toLowerCase().trim();
    if (s.includes('pending') || s.includes('unassign')) return 'bg-amber-50 text-amber-800 border-amber-300';
    if (s.includes('admit') || s.includes('ipd') || s.includes('ward')) return 'bg-purple-50 text-purple-800 border-purple-300';
    if (s.includes('checkup') || s.includes('progress') || s.includes('consult')) return 'bg-indigo-50 text-indigo-800 border-indigo-300';
    if (s.includes('done') || s.includes('complete') || s.includes('approved') || s.includes('confirmed') || s.includes('assigned')) return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    if (s.includes('discharg')) return 'bg-slate-100 text-slate-800 border-slate-300';
    if (s.includes('cancel') || s.includes('reject')) return 'bg-rose-50 text-rose-800 border-rose-300';
    return 'bg-teal-50 text-teal-800 border-teal-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* UNIFIED PATIENT NAVBAR */}
      <PatientNavbar
        currentPage="patient_dashboard"
        setCurrentPage={setCurrentPage}
        isLoggedIn={isLoggedIn}
        onLogout={onLogout}
        currentUser={currentUser}
      />

      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-8 space-y-5 sm:space-y-6">
        {/* HERO HEADER */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-7 shadow-md border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                Patient Health Portal • Real-Time Live Status Tracker
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold mt-2 tracking-tight text-slate-100">
                Hello, {loggedInName}
              </h1>
              <div className="text-xs sm:text-sm text-slate-300 mt-1.5 flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-slate-400">Patient ID:</span>
                  <span className="font-mono text-teal-300 font-bold px-2 py-0.5 rounded bg-teal-950/60 border border-teal-500/30">
                    {loggedInPatientId}
                  </span>
                </span>
                {loggedInPhone && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">Phone:</span>
                    <span className="text-slate-100 font-semibold">{loggedInPhone}</span>
                  </span>
                )}
                {loggedInEmail && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">Email:</span>
                    <span className="text-slate-100 font-semibold">{loggedInEmail}</span>
                  </span>
                )}
                {loggedInGender && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">Gender:</span>
                    <span className="text-slate-100 font-semibold">{loggedInGender}</span>
                  </span>
                )}
                {loggedInBloodGroup && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">Blood:</span>
                    <span className="text-teal-300 font-bold px-1.5 py-0.5 rounded bg-teal-950/40 border border-teal-500/30">{loggedInBloodGroup}</span>
                  </span>
                )}
                {loggedInAge && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">Age:</span>
                    <span className="text-slate-100 font-semibold">{loggedInAge} Yrs</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => loadPatientData(false)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white text-xs font-bold border border-teal-500/30 hover:border-teal-400/50 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Live Sync patient status from database"
              >
                <span className="text-xs">🔄</span>
                <span>Live Sync</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('appointment')}
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-900 font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span>Book New OPD Appointment</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('my_hestory')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                title="View Treatment & Discharge History"
              >
                <span>📜</span>
                <span>Medical History</span>
                {dischargedAppointments.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 rounded-full text-[10px] font-extrabold">
                    {dischargedAppointments.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* LIVE APPOINTMENT PROGRESS STEPPER (When active appointment exists) */}
        {hasActiveAppointment && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping"></span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Live Appointment Progress Tracker • <span className="font-mono text-teal-700">{trackingId}</span>
                </h3>
              </div>
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${getStatusBadgeStyle(statusStr || (isPendingTriage ? 'Pending Triage' : 'In Progress'))}`}>
                {statusStr || (isPendingTriage ? 'Pending Triage' : 'In Progress')}
              </span>
            </div>

            {/* 5-STEP JOURNEY BAR */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-3 text-xs">
              {/* Stage 1: Booking */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">✓</span>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Step 1</span>
                </div>
                <p className="font-bold text-slate-900 text-xs mt-1">Booking Recorded</p>
                <p className="text-[11px] text-slate-500 mt-0.5">ID: <strong className="font-mono text-teal-700">{trackingId}</strong></p>
              </div>

              {/* Stage 2: Doctor Assignment */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                hasDoctor && !isPendingTriage
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center ${
                    hasDoctor && !isPendingTriage ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white animate-pulse'
                  }`}>
                    {hasDoctor && !isPendingTriage ? '✓' : '2'}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Step 2</span>
                </div>
                <p className="font-bold text-slate-900 text-xs mt-1">Doctor & Slot</p>
                <p className="text-[11px] text-slate-600 truncate mt-0.5">{hasDoctor ? docName : 'Awaiting Assignment'}</p>
              </div>

              {/* Stage 3: Inpatient / OPD Allocation */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                bedNum
                  ? 'bg-emerald-50 border-emerald-200'
                  : hasDoctor
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center ${
                    bedNum ? 'bg-emerald-600 text-white' : hasDoctor ? 'bg-teal-600 text-white' : 'bg-slate-300 text-slate-600'
                  }`}>
                    {bedNum ? '✓' : '3'}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Step 3</span>
                </div>
                <p className="font-bold text-slate-900 text-xs mt-1">Ward / Location</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{bedNum ? `Bed #${bedNum}` : 'Outpatient (OPD)'}</p>
              </div>

              {/* Stage 4: Doctor Checkup & Diagnosis */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                isCheckupDone
                  ? 'bg-emerald-50 border-emerald-200'
                  : hasDoctor
                    ? 'bg-indigo-50/70 border-indigo-200'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center ${
                    isCheckupDone ? 'bg-emerald-600 text-white' : hasDoctor ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-600'
                  }`}>
                    {isCheckupDone ? '✓' : '4'}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Step 4</span>
                </div>
                <p className="font-bold text-slate-900 text-xs mt-1">Clinical Checkup</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{isCheckupDone ? 'Checkup Done' : (hasDoctor ? 'Consultation Active' : 'Pending')}</p>
              </div>

              {/* Stage 5: Billing & Discharge */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                isPaid
                  ? 'bg-emerald-50 border-emerald-200'
                  : totalBill > 0
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center ${
                    isPaid ? 'bg-emerald-600 text-white' : totalBill > 0 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-600'
                  }`}>
                    {isPaid ? '✓' : '5'}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Step 5</span>
                </div>
                <p className="font-bold text-slate-900 text-xs mt-1">Billing & Clearance</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{isPaid ? 'Paid • Ready for Discharge' : (totalBill > 0 ? `Dues: ₹${totalBill.toFixed(2)}` : 'Pending Bill')}</p>
              </div>
            </div>
          </div>
        )}

        {/* STATUS BANNER */}
        {hasActiveAppointment ? (
          isPendingTriage ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                  ⏳
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                    Appointment {trackingId} Recorded • Awaiting Receptionist Assignment
                  </h3>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Your appointment booking data is successfully saved in the database under <strong>{trackingId}</strong>. The duty receptionist will assign your consulting Doctor & time slot shortly.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-bold border border-amber-300 uppercase shrink-0">
                Pending Triage
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-950">
                    Appointment {trackingId} • Doctor Assigned: {docName} ({docSpecialty})
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Scheduled: <strong>{appointmentDate}</strong> at <strong>{appointmentTime}</strong> {hospName ? `• ${hospName}` : ''}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase shrink-0 ${getStatusBadgeStyle(statusStr || 'Assigned')}`}>
                {statusStr || 'Assigned'}
              </span>
            </div>
          )
        ) : (showDischargeAlert && dischargedAppointments.length > 0) ? (
          /* TEMPORARY DISCHARGED SUCCESS BANNER (Auto-dismisses in 5 seconds) */
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all duration-300">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center shrink-0 text-lg font-bold">
                🎉
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-950">
                    Your Recent Appointment has been Discharged & Settled!
                  </h3>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-1.5 py-0.2 rounded">
                    Auto-closing
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Aapka previous appointment successfully discharge ho chuka hai. Aapki complete booking-to-discharge journey, doctor notes, itemized bill aur official Gate Pass aapke <strong>Medical History</strong> page me save kar diya gaya hai.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('my_hestory')}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span>📜</span>
                <span>View Medical History</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDischargeAlert(false)}
                className="w-7 h-7 rounded-full bg-emerald-200 hover:bg-emerald-300 text-emerald-900 font-bold flex items-center justify-center text-xs transition cursor-pointer"
                title="Dismiss banner"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          /* CLEAN NORMAL STATE BANNER */
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 flex items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-200 text-sky-800 flex items-center justify-center shrink-0 font-bold">
                ℹ️
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-sky-950">Patient Account Active • No Active Appointments</h3>
                <p className="text-xs text-sky-800 mt-0.5">
                  You are registered as a patient. Book an OPD appointment anytime to consult with specialized doctors.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('appointment')}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-xs flex items-center gap-1"
            >
              <span>➕</span>
              <span>Book Now</span>
            </button>
          </div>
        )}

        {/* QUICK STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {patientStats.map((item, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-teal-300 transition"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.color}`}>
                  {item.tag || 'Record'}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">{item.title}</p>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-0.5">{item.value}</h3>
              <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* MEDICAL & BILLING DETAILS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-800">Your Active Appointment & Medical Record</h2>
                <p className="text-xs text-slate-500">
                  {hasActiveAppointment ? `Live consultation details tracked under ${trackingId}` : 'No active consultation at the moment'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {/* REGISTERED PATIENT ACCOUNT CORNER INFO */}
                <div className="px-3 py-1 rounded-xl bg-slate-100/90 border border-slate-200/90 text-right shrink-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Patient Account</span>
                  <span className="text-xs font-bold text-slate-800">
                    {patientProfile?.name || patientProfile?.patient_Name || currentUser?.name || 'Patient'} <span className="font-mono text-teal-700 font-bold">({patientProfile?.patient_id || patientProfile?.uhid || (patientProfile?.id ? `PAT-${patientProfile.id}` : (currentUser?.patient_id || currentUser?.uhid || (currentUser?.id ? `PAT-${currentUser.id}` : 'PAT-0001')))})</span>
                  </span>
                </div>

                <span className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border shrink-0 ${
                  !hasActiveAppointment ? 'bg-slate-100 text-slate-600 border-slate-200' :
                  isPendingTriage ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-teal-50 text-teal-800 border-teal-200'
                }`}>
                  {!hasActiveAppointment ? 'No Active Booking' : activeAppt?.status || (isPendingTriage ? 'Pending Triage' : 'Confirmed')}
                </span>
              </div>
            </div>

            {hasActiveAppointment ? (
              /* ACTIVE APPOINTMENT CONTENT */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Consultation Status</span>
                    <p className="font-bold text-slate-900 text-sm">{statusStr || 'Active Consultation'}</p>
                    <p className="text-teal-700 font-mono text-[11px] font-bold">
                      Appointment ID: {trackingId}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Attending Specialist & Timing</span>
                    <p className="font-bold text-slate-900 text-sm">{docName}</p>
                    <p className="text-slate-500 text-[11px]">
                      🕒 {appointmentDate} {appointmentTime ? `• Slot: ${appointmentTime}` : ''}
                    </p>
                  </div>

                  {bedNum && (
                    <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 sm:col-span-2 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-teal-700">Assigned Inpatient Location</p>
                        <p className="text-sm font-extrabold text-teal-900 mt-0.5">Bed #{bedNum} • {floorName}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold border border-teal-300">
                        Floor {Math.floor((Number(bedNum) - 1) / 100) + 1}
                      </span>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Chief Symptoms / Diagnosis:</p>
                    <p className="text-slate-800 text-xs font-medium leading-relaxed">
                      {activeAppt?.symptoms_diagnosis || activeAppt?.reason_for_visit || 'General health consultation & OPD review.'}
                    </p>
                  </div>

                  {/* INDIVIDUAL SEPARATE PATIENT ATTRIBUTE CARDS (STRICTLY FROM APPOINTMENT DATA) */}
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {/* 1. Patient Name (Appointment Form Data) */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Patient Name</p>
                      <p className="font-bold text-slate-900 text-sm truncate" title={activeAppt?.patient_Name || activeAppt?.patient_name || activeAppt?.name || '-'}>
                        {activeAppt?.patient_Name || activeAppt?.patient_name || activeAppt?.name || '-'}
                      </p>
                      <p className="text-teal-700 font-mono text-[10px] font-bold">
                        Appointment ID: {trackingId}
                      </p>
                    </div>

                    {/* 2. Contact Phone & Email (Appointment Form Data) */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Contact Phone</p>
                      <p className="font-bold text-slate-900 text-sm">
                        {activeAppt?.contact || activeAppt?.phone || '-'}
                      </p>
                      <p className="text-slate-500 text-[10px] truncate" title={activeAppt?.email || '-'}>
                        {activeAppt?.email || '-'}
                      </p>
                    </div>

                    {/* 3. Age & Gender (Appointment Form Data) */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Age & Gender</p>
                      <p className="font-bold text-slate-900 text-sm">
                        {activeAppt?.age || activeAppt?.Age ? `${activeAppt?.age || activeAppt?.Age} Yrs` : '-'}
                      </p>
                      <p className="text-slate-600 text-[11px] font-semibold">
                        {activeAppt?.Gender || activeAppt?.gender || activeAppt?.patient_gender || '-'}
                      </p>
                    </div>

                    {/* 4. Blood Group (Appointment Form Data) */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Blood Group</p>
                      <p className="font-black text-rose-600 text-sm">
                        {activeAppt?.Blood_Group || activeAppt?.blood_group || '-'}
                      </p>
                      <p className="text-slate-500 text-[10px] font-medium">
                        Blood Type
                      </p>
                    </div>

                    {/* 5. Severity / Condition (Appointment Form Data) */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Severity / Condition</p>
                      <div className="pt-0.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          (activeAppt?.Condation || activeAppt?.condition) === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                          (activeAppt?.Condation || activeAppt?.condition) === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          (activeAppt?.Condation || activeAppt?.condition) === 'Emergency' ? 'bg-red-100 text-red-800 border-red-200' :
                          'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {activeAppt?.Condation || activeAppt?.condition || 'Normal'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[10px]">
                        Triage Priority
                      </p>
                    </div>
                  </div>
                </div>

                {/* MULTIPLE ACTIVE APPOINTMENTS (IF ANY) */}
                {activeAppointments.length > 1 && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Your Active Bookings ({activeAppointments.length} Active)
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Click any booking to view details
                      </span>
                    </div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {activeAppointments.map((app, idx) => {
                        const curAppId = String(app.id || app.Appoment_id || app.appoment_id || app.appointment_id || idx);
                        const isSelected = activeAppt && String(activeAppt.id || activeAppt.Appoment_id || activeAppt.appoment_id || activeAppt.appointment_id) === curAppId;

                        return (
                          <div
                            key={curAppId}
                            onClick={() => {
                              selectedApptIdRef.current = curAppId;
                              setSelectedApptId(curAppId);
                              setPatientInfo(app);
                            }}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? 'bg-teal-50/90 border-teal-400 ring-2 ring-teal-500/25 shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                                isSelected ? 'text-teal-800 bg-teal-100 border-teal-300' : 'text-sky-700 bg-sky-50 border-sky-200'
                              }`}>
                                APT-{app.Appoment_id || app.appoment_id || app.appointment_id || app.id}
                              </span>
                              <div className="truncate">
                                <span className="font-semibold text-slate-800 text-xs">
                                  {app.symptoms_diagnosis || 'OPD Consultation'}
                                </span>
                                {app.hospital_name && (
                                  <span className="text-[10px] text-slate-500 ml-1.5 hidden sm:inline">
                                    • {app.hospital_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isSelected && (
                                <span className="text-[10px] font-bold text-teal-700 bg-teal-100/60 px-1.5 py-0.5 rounded">
                                  Viewing
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                                {app.status || 'Active'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* CLEAN INITIAL EMPTY STATE */
              <div className="py-8 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center text-2xl font-bold">
                  🏥
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {dischargedAppointments.length > 0 ? 'All Appointments Completed & Discharged' : 'No Appointments Booked Yet'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md">
                  {dischargedAppointments.length > 0
                    ? `You have ${dischargedAppointments.length} past discharged appointment records in your Medical History. Click below to view history or book a fresh consultation.`
                    : 'You have not booked any OPD doctor consultations yet. Click the button below to book an appointment with our specialist doctors.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage && setCurrentPage('appointment')}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                  >
                    Book OPD Appointment
                  </button>
                  {dischargedAppointments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCurrentPage && setCurrentPage('my_hestory')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      View Medical History ({dischargedAppointments.length})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* BILLING & RECEIPTS SIDEBAR CARD */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm sm:text-base font-bold text-slate-800">Billing & Receipts</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  !hasActiveAppointment ? 'bg-slate-100 text-slate-600' :
                  activeAppt?.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {!hasActiveAppointment ? 'No Invoices' : activeAppt?.payment_status || 'Pending'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                {hasActiveAppointment ? `Invoice breakdown for ${patName} (${trackingId})` : 'No active invoices'}
              </p>

              {hasActiveAppointment ? (
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-700">Doctor Consultation Fee</p>
                      <p className="text-[10px] text-slate-400">
                        {docName} ({docSpecialty})
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      ₹{docFee.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-700">Hospital & Treatment Charges</p>
                      <p className="text-[10px] text-slate-400">
                        {hospCharges > 0 ? 'Facility, care & medication fee' : 'To be updated by receptionist'}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-sky-800">
                      ₹{hospCharges.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-700">Amount Paid</p>
                      <p className="text-[10px] text-slate-400">
                        Method: {activeAppt?.payment_method || 'Cash / Counter'}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-emerald-800">
                      ₹{amtPaid.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-emerald-950">Total Bill Amount</p>
                      <p className="text-[10px] text-emerald-700">
                        Status: <span className="font-bold">{activeAppt?.payment_status || 'Pending'}</span>
                      </p>
                    </div>
                    <span className="font-mono font-extrabold text-sm text-emerald-800">
                      ₹{totalBill.toFixed(2)}
                    </span>
                  </div>

                  {totalBill === 0 && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-tight">
                      ℹ️ Hospital charges will be updated by the receptionist upon your visit at the front desk.
                    </div>
                  )}
                </div>
              ) : (
                /* CLEAN NO INVOICES STATE */
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1 my-4">
                  <p className="text-xs font-semibold text-slate-700">No Active Invoices</p>
                  <p className="text-[11px] text-slate-500">
                    {dischargedAppointments.length > 0
                      ? 'Your previous invoices are cleared & saved under Medical History.'
                      : 'Billing details will appear here once you book an appointment and it is verified at the reception desk.'}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!hasActiveAppointment}
                className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-xs transition ${
                  hasActiveAppointment
                    ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Print Health Slip
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <PatientFooter setCurrentPage={setCurrentPage} isLoggedIn={isLoggedIn} currentUser={currentUser} />
    </div>
  );
};

export default PatientDashboard;
