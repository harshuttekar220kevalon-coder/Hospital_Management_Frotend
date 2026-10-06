import React, { useState, useEffect } from 'react';
import PatientNavbar from './PatientNavbar';
import PatientFooter from './PatientFooter';
import { API_BASE_URL } from '../Api/Api';

const PatientDashboard = ({ currentUser, setCurrentPage, isLoggedIn = true, onLogout }) => {
  const [patientProfile, setPatientProfile] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [allAppointments, setAllAppointments] = useState([]);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const patId = currentUser?.id;
      const patPhone = (currentUser?.contact || currentUser?.phone || '').trim();
      const patName = (currentUser?.name || currentUser?.patient_Name || currentUser?.patient_name || '').toLowerCase().trim();
      const userUhid = (currentUser?.patient_id || currentUser?.uhid || '').toLowerCase().trim();

      // 1. Fetch Patient profile from Patients table (Account info only)
      let foundPatientRecord = null;
      try {
        const patRes = await fetch(`${API_BASE_URL}/super-admin/Patients/`).catch(() => null);
        if (patRes && patRes.ok) {
          const pats = await patRes.json().catch(() => []);
          if (Array.isArray(pats)) {
            const matchedPats = pats.filter(p => {
              const pEmail = (p.email || '').toLowerCase().trim();
              const pPhone = (p.contact || p.phone || '').trim();
              const pName = (p.name || p.patient_Name || '').toLowerCase().trim();
              const pId = p.id;
              const pUhid = (p.patient_id || p.uhid || '').toLowerCase().trim();

              return (email && pEmail === email) ||
                     (patId && Number(pId) === Number(patId)) ||
                     (userUhid && pUhid && pUhid === userUhid) ||
                     (patPhone && pPhone && pPhone === patPhone) ||
                     (patName && pName && pName === patName);
            });
            foundPatientRecord = matchedPats[0] || null;
          }
        }
      } catch (e) {
        console.warn('Patients fetch notice:', e);
      }

      setPatientProfile(foundPatientRecord || currentUser);

      // 2. Fetch Appointments ONLY from Appointments table (Strictly real booked appointments)
      let fetchedAppointments = [];
      try {
        const [appRes1, appRes2, appRes3] = await Promise.all([
          fetch(`${API_BASE_URL}/super-admin/Appointments/`).catch(() => null),
          fetch(`${API_BASE_URL}/super-admin/Appointment/`).catch(() => null),
          fetch(`${API_BASE_URL}/appointments/`).catch(() => null)
        ]);

        let appList = [];
        if (appRes1 && appRes1.ok) {
          appList = await appRes1.json().catch(() => []);
        } else if (appRes2 && appRes2.ok) {
          appList = await appRes2.json().catch(() => []);
        } else if (appRes3 && appRes3.ok) {
          appList = await appRes3.json().catch(() => []);
        }

        if (Array.isArray(appList) && appList.length > 0) {
          const patientPk = foundPatientRecord?.id || currentUser?.id;
          const patientUhid = foundPatientRecord?.patient_id || currentUser?.patient_id;

          fetchedAppointments = appList.filter(a => {
            const aPatId = typeof a.patient === 'object' ? a.patient?.id : a.patient;
            const aEmail = (a.email || (typeof a.patient === 'object' ? a.patient?.email : '') || '').toLowerCase().trim();
            const aContact = (a.contact || a.phone || (typeof a.patient === 'object' ? a.patient?.contact : '') || '').trim();
            const aName = (a.patient_Name || a.patient_name || a.name || (typeof a.patient === 'object' ? (a.patient?.patient_Name || a.patient?.name) : '') || '').toLowerCase().trim();
            const aUhid = (a.patient_id || a.uhid || (typeof a.patient === 'object' ? a.patient?.patient_id : '') || '').toLowerCase().trim();

            return (patientPk && Number(aPatId) === Number(patientPk)) ||
                   (patientUhid && aUhid && aUhid === (patientUhid || '').toLowerCase().trim()) ||
                   (email && aEmail === email) ||
                   (patPhone && aContact && aContact === patPhone) ||
                   (patName && aName && aName === patName);
          });
        }
      } catch (e) {
        console.warn('Appointments fetch notice:', e);
      }

      // Sort newest appointments first (by id descending)
      fetchedAppointments.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
      setAllAppointments(fetchedAppointments);

      const activeAppt = fetchedAppointments.length > 0 ? fetchedAppointments[0] : null;
      setPatientInfo(activeAppt);

      // Fetch Hospital details for current appointment or user's hospital
      const targetHospId = typeof activeAppt?.hospital === 'object'
        ? activeAppt.hospital?.id
        : (activeAppt?.hospital || foundPatientRecord?.hospital || currentUser?.hospital);

      if (targetHospId && typeof targetHospId !== 'object') {
        const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/${targetHospId}/`).catch(() => null);
        if (hospRes && hospRes.ok) {
          const hospData = await hospRes.json().catch(() => null);
          if (hospData) setHospitalInfo(hospData);
        }
      } else if (typeof targetHospId === 'object' && targetHospId?.id) {
        setHospitalInfo(targetHospId);
      }

      // Fetch Doctor details for active appointment if assigned
      const targetDocId = typeof activeAppt?.doctor === 'object' ? activeAppt.doctor?.id : activeAppt?.doctor;
      if (targetDocId) {
        const docRes = await fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null);
        if (docRes && docRes.ok) {
          const docs = await docRes.json().catch(() => []);
          const doc = Array.isArray(docs) ? docs.find(d => Number(d.id) === Number(targetDocId)) : null;
          if (doc) setDoctorInfo(doc);
        }
      } else {
        setDoctorInfo(null);
      }
    } catch (err) {
      console.error('Error in PatientDashboard load:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [currentUser]);

  const hasAppointments = allAppointments.length > 0;
  const activeAppt = patientInfo || (hasAppointments ? allAppointments[0] : null);

  const patName = activeAppt?.patient_Name || activeAppt?.patient_name || activeAppt?.name ||
    patientProfile?.name || patientProfile?.patient_Name || currentUser?.name || currentUser?.patient_Name || 'Patient';

  const uhid = activeAppt?.patient_id || activeAppt?.uhid ||
    patientProfile?.patient_id || patientProfile?.uhid || currentUser?.patient_id ||
    (patientProfile?.id ? `PAT-${patientProfile.id}` : `PAT-${currentUser?.id || '01'}`);

  const hospitalName = hospitalInfo?.Name || hospitalInfo?.name ||
    activeAppt?.hospital_name || currentUser?.hospital_name || 'Apex Care Hospital';

  const hasDoctor = Boolean(activeAppt?.doctor || activeAppt?.doctor_name || doctorInfo?.name);
  const docName = hasDoctor
    ? (doctorInfo?.name ? (doctorInfo.name.startsWith('Dr.') ? doctorInfo.name : `Dr. ${doctorInfo.name}`) : (activeAppt?.doctor_name ? (activeAppt.doctor_name.startsWith('Dr.') ? activeAppt.doctor_name : `Dr. ${activeAppt.doctor_name}`) : 'Assigned Doctor'))
    : 'Awaiting Receptionist Assignment';
  const docSpecialty = doctorInfo?.specialization || doctorInfo?.specialty || activeAppt?.doctor_specialization || (hasDoctor ? 'Clinical Specialist' : 'Triage in Progress');

  const bedNum = activeAppt?.bed_number;
  const floorName = activeAppt?.floor || (bedNum ? `Floor ${Math.floor((bedNum - 1) / 100) + 1}` : 'Outpatient (OPD)');
  const statusStr = (activeAppt?.status || 'Pending').trim();
  const appointmentDate = activeAppt?.appointment_date || (activeAppt?.visit_date_time ? new Date(activeAppt.visit_date_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Scheduled for Today');
  const appointmentTime = activeAppt?.appointment_time || (activeAppt?.visit_date_time ? new Date(activeAppt.visit_date_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : (hasDoctor ? 'Slot Assigned' : 'Awaiting Slot'));

  const isPendingTriage = !hasDoctor || statusStr.toLowerCase().includes('pending') || statusStr.toLowerCase().includes('unassign');

  // Exact real billing from backend only (no fake 500/300 fallbacks)
  const consultFee = activeAppt?.consultation_fee !== undefined && activeAppt?.consultation_fee !== null ? parseFloat(activeAppt.consultation_fee) : 0;
  const hospCharges = (activeAppt?.hospitals_charges ?? activeAppt?.hospital_charges ?? activeAppt?.Hospitals_Chargies) !== undefined && (activeAppt?.hospitals_charges ?? activeAppt?.hospital_charges ?? activeAppt?.Hospitals_Chargies) !== null ? parseFloat(activeAppt?.hospitals_charges ?? activeAppt?.hospital_charges ?? activeAppt?.Hospitals_Chargies) : 0;
  const totalBill = consultFee + hospCharges;

  const patientStats = hasAppointments ? [
    { title: 'UHID / Patient ID', value: uhid, sub: 'Registered Patient', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { title: 'Inpatient Bed & Ward', value: bedNum ? `Bed #${bedNum}` : 'Outpatient / OPD', sub: floorName, color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { title: 'Attending Doctor', value: hasDoctor ? docName : 'Pending Assignment', sub: docSpecialty, color: hasDoctor ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200' },
    { title: 'Total Bill Amount', value: `₹${totalBill.toFixed(2)}`, sub: `Payment: ${activeAppt?.payment_status || 'Pending'}`, color: totalBill > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200' },
  ] : [
    { title: 'UHID / Patient ID', value: uhid, sub: 'Account Registered', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { title: 'Active OPD Visits', value: '0 Bookings', sub: 'No Active Consultation', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { title: 'Attending Doctor', value: 'None Assigned', sub: 'Book OPD to consult doctor', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { title: 'Total Billing', value: '₹0.00', sub: 'No pending invoices', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* HERO HEADER */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-7 shadow-md border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                Patient Health Portal • {hospitalName}
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold mt-2 tracking-tight text-slate-100">
                Hello, {patName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                UHID: <span className="font-mono text-teal-300 font-bold">{uhid}</span> • Attending Doctor: <span className="font-semibold text-white">{docName}</span> • {hospitalName}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
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
                onClick={loadPatientData}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                title="Refresh Status"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* STATUS BANNER */}
        {hasAppointments ? (
          isPendingTriage ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                  ⏳
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-amber-950">Appointment Saved • Awaiting Receptionist Assignment</h3>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Your appointment booking data is successfully saved in the backend database. The duty receptionist at <strong>{hospitalName}</strong> will review your symptoms and assign the consulting Doctor & time slot.
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
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-950">Doctor Assigned: {docName} ({docSpecialty})</h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Appointment Scheduled: <strong>{appointmentDate}</strong> at <strong>{appointmentTime}</strong> • {hospitalName}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 text-xs font-bold border border-emerald-300 uppercase shrink-0">
                {statusStr || 'Assigned'}
              </span>
            </div>
          )
        ) : (
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 flex items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-200 text-sky-800 flex items-center justify-center shrink-0 font-bold">
                ℹ️
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-sky-950">Patient Account Active • No Active Appointments</h3>
                <p className="text-xs text-sky-800 mt-0.5">
                  You are registered in the hospital network. Book an OPD appointment anytime to consult with our specialized doctors.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('appointment')}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shrink-0"
            >
              Book Now
            </button>
          </div>
        )}

        {/* QUICK STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {patientStats.map((item, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-teal-300 transition"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.color}`}>
                  Live Record
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
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-800">Your Active Appointment & Medical Record</h2>
                <p className="text-xs text-slate-500">Live consultation details at {hospitalName}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                !hasAppointments ? 'bg-slate-100 text-slate-600 border-slate-200' :
                isPendingTriage ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-teal-50 text-teal-800 border-teal-200'
              }`}>
                {!hasAppointments ? 'No Bookings' : activeAppt?.status || (isPendingTriage ? 'Pending Triage' : 'Confirmed')}
              </span>
            </div>

            {hasAppointments ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Hospital Branch</span>
                    <p className="font-bold text-slate-900 text-sm">{hospitalName}</p>
                    <p className="text-slate-500 text-[11px]">{hospitalInfo?.Address || activeAppt?.hospital_address || 'Main Campus Branch'}</p>
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
                        Floor {Math.floor((bedNum - 1) / 100) + 1}
                      </span>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Chief Symptoms / Diagnosis:</p>
                    <p className="text-slate-800 text-xs font-medium leading-relaxed">
                      {activeAppt?.symptoms_diagnosis || activeAppt?.reason_for_visit || 'General health consultation & OPD review.'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Contact & Patient Name</p>
                    <p className="font-bold text-slate-800 mt-0.5">{patName} • {activeAppt?.contact || activeAppt?.phone || currentUser?.contact || 'N/A'}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Blood Group & Condition</p>
                    <p className="font-bold text-slate-800 mt-0.5">
                      <span className="text-rose-600 font-extrabold">{activeAppt?.Blood_Group || activeAppt?.blood_group || 'Not Specified'}</span>
                      <span> • {activeAppt?.Condation || activeAppt?.condition || 'Normal'}</span>
                    </p>
                  </div>
                </div>

                {/* APPOINTMENT HISTORY LIST (ONLY REAL APPOINTMENTS) */}
                {allAppointments.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Your Appointment History ({allAppointments.length} {allAppointments.length === 1 ? 'Booking' : 'Bookings'})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {allAppointments.map((app, idx) => (
                        <div
                          key={app.id || idx}
                          onClick={() => {
                            setPatientInfo(app);
                          }}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                            (patientInfo?.id || allAppointments[0]?.id) === app.id ? 'bg-teal-50/80 border-teal-300 ring-1 ring-teal-400' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          <div>
                            <span className="font-mono text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                              {app.patient_id || app.uhid || `PAT-${app.id}`}
                            </span>
                            <span className="font-semibold text-slate-800 ml-2">
                              {app.patient_Name || app.patient_name || app.name ? `${app.patient_Name || app.patient_name || app.name}: ` : ''}{app.symptoms_diagnosis || 'OPD Consultation'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">
                              {app.visit_date_time ? new Date(app.visit_date_time).toLocaleDateString('en-IN') : (app.appointment_date || 'Recent')}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              (app.status || '').toLowerCase().includes('assign') ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {app.status || 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center text-2xl font-bold">
                  🏥
                </div>
                <h3 className="text-base font-bold text-slate-800">No Appointments Booked Yet</h3>
                <p className="text-xs text-slate-500 max-w-md">
                  You have not booked any OPD doctor consultations yet. Click the button below to book an appointment with our specialist doctors.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentPage && setCurrentPage('appointment')}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition"
                >
                  Book OPD Appointment
                </button>
              </div>
            )}
          </div>

          {/* BILLING BREAKDOWN */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm sm:text-base font-bold text-slate-800">Billing & Receipts</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  !hasAppointments ? 'bg-slate-100 text-slate-600' :
                  activeAppt?.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {!hasAppointments ? 'No Dues' : activeAppt?.payment_status || 'Pending'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                {hasAppointments ? `Invoice breakdown for ${patName}` : 'No active invoices'}
              </p>

              {hasAppointments ? (
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-700">Doctor Consultation</p>
                      <p className="text-[10px] text-slate-400">
                        {consultFee > 0 ? (hasDoctor ? docName : 'Standard OPD') : 'To be billed by reception'}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-teal-800">
                      ₹{consultFee.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-700">Hospital Charges</p>
                      <p className="text-[10px] text-slate-400">
                        {hospCharges > 0 ? hospitalName : 'To be billed by reception'}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-sky-800">
                      ₹{hospCharges.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-emerald-950">Total Bill Amount</p>
                      <p className="text-[10px] text-emerald-700">
                        Method: {activeAppt?.payment_method || 'At Reception Counter'}
                      </p>
                    </div>
                    <span className="font-mono font-extrabold text-sm text-emerald-800">
                      ₹{totalBill.toFixed(2)}
                    </span>
                  </div>

                  {totalBill === 0 && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-tight">
                      ℹ️ Consultation fees & hospital charges will be updated by the hospital receptionist upon your visit at the front desk.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1 my-4">
                  <p className="text-xs font-semibold text-slate-700">No Invoices Found</p>
                  <p className="text-[11px] text-slate-500">
                    Billing details will appear here once you book an appointment and it is verified at the reception desk.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!hasAppointments}
                className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-xs transition ${
                  hasAppointments
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

      {/* PATIENT FOOTER */}
      <PatientFooter setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default PatientDashboard;
