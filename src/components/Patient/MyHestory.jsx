import React, { useState, useEffect } from 'react';
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

const MyHestory = ({ currentUser, setCurrentPage, isLoggedIn = true, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [patientProfile, setPatientProfile] = useState(null);
  const [dischargedRecords, setDischargedRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [doctorsList, setDoctorsList] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState('ALL');

  const isDischargedStatus = (status) => {
    const s = (status || '').toString().toLowerCase().trim();
    return s.includes('discharg');
  };

  const loadHistoryData = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const patId = currentUser?.id;
      const patPhone = (currentUser?.contact || currentUser?.phone || '').replace(/\D/g, '');
      const userUhid = (currentUser?.patient_id || currentUser?.uhid || '').toLowerCase().trim();

      // 1. Fetch metadata (Patients, Doctors, Hospitals) in parallel
      const [patRes, docRes, hospRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Patients/`),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`),
        fetch(`${API_BASE_URL}/super-admin/Hospital/`)
      ]);

      let foundPatientRecord = null;
      if (patRes.status === 'fulfilled' && patRes.value?.ok) {
        const pats = await patRes.value.json().catch(() => []);
        const patsArr = extractArray(pats);
        if (patsArr.length > 0) {
          if (email) foundPatientRecord = patsArr.find(p => (p.email || '').toLowerCase().trim() === email);
          if (!foundPatientRecord && userUhid) foundPatientRecord = patsArr.find(p => (p.patient_id || p.uhid || '').toLowerCase().trim() === userUhid);
          if (!foundPatientRecord && patId && !isNaN(Number(patId)) && Number(patId) > 0) foundPatientRecord = patsArr.find(p => Number(p.id) === Number(patId));
          if (!foundPatientRecord && patPhone && patPhone.length >= 10) foundPatientRecord = patsArr.find(p => (p.contact || p.phone || '').replace(/\D/g, '') === patPhone);
        }
      }

      let docs = [];
      if (docRes.status === 'fulfilled' && docRes.value?.ok) {
        const dData = await docRes.value.json().catch(() => []);
        docs = extractArray(dData);
        setDoctorsList(docs);
      }

      let hosps = [];
      if (hospRes.status === 'fulfilled' && hospRes.value?.ok) {
        const hData = await hospRes.value.json().catch(() => []);
        hosps = extractArray(hData);
        setHospitalsList(hosps);
      }

      setPatientProfile(foundPatientRecord || currentUser);

      // 2. Fetch all appointments from backend
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

      // 3. Filter all appointments belonging to this patient
      const userAppointments = rawAppointments.filter(a => {
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

      // 4. Read locally cached appointments for this patient as well
      let localAppts = [];
      if (patientEmail) {
        try {
          const rawStored = localStorage.getItem(`patient_appointments_${patientEmail}`);
          if (rawStored) {
            const parsed = JSON.parse(rawStored);
            localAppts = Array.isArray(parsed) ? parsed : [parsed];
          }
        } catch (e) {}
      }

      const combinedAppts = [...userAppointments];
      const seenApptIds = new Set(userAppointments.map(a => String(a.id || a.Appoment_id || a.appoment_id)));
      for (const loc of localAppts) {
        const locId = String(loc?.id || loc?.Appoment_id || loc?.appoment_id || '');
        if (loc && (!locId || !seenApptIds.has(locId))) {
          combinedAppts.push(loc);
          if (locId) seenApptIds.add(locId);
        }
      }

      // 5. Filter DISCHARGED appointments & format complete journey
      const discharged = combinedAppts
        .filter(a => isDischargedStatus(a.status))
        .map(item => {
          const id = item.id || item.appointment_id;
          const apptId = item.Appoment_id || item.appoment_id || item.appointment_id || id;
          const docId = typeof item.doctor === 'object' ? item.doctor?.id : item.doctor;
          const hospId = typeof item.hospital === 'object' ? item.hospital?.id : item.hospital;
          const docObj = docId ? docs.find(d => Number(d.id) === Number(docId)) : null;
          const hospObj = hospId ? hosps.find(h => Number(h.id) === Number(hospId)) : null;

          const docName = item.doctor_name || (docObj ? (docObj.name.startsWith('Dr.') ? docObj.name : `Dr. ${docObj.name}`) : (docId ? `Dr. ID #${docId}` : 'Assigned Specialist'));
          const hospName = hospObj?.Name || hospObj?.name || item.hospital_name || 'Apex Care Central Hospital';

          const docFee = Number(item.consultation_fee ?? item.Consultation_Fee ?? item.consultancy_fee ?? (docObj?.consultation_fee || 0));
          const hospCharge = Number(item.hospitals_charges ?? item.Hospitals_Chargies ?? item.hospital_charges ?? 0);
          const total = docFee + hospCharge;
          const paid = Number(item.amount_paid ?? item.Amount_Paid ?? (item.payment_status === 'Paid' ? total : 0));
          const due = Math.max(0, total - paid);

          const formattedVisitDate = item.appointment_date || (item.visit_date_time ? new Date(item.visit_date_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Visit Recorded');
          const formattedVisitTime = item.appointment_time || (item.visit_date_time ? new Date(item.visit_date_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Consultation Slot');

          return {
            ...item,
            id,
            Appoment_id: apptId,
            appointment_id: apptId,
            tracking_id: `APT-${apptId}`,
            patient_id: `APT-${apptId}`,
            patient_Name: item.patient_Name || item.patient_name || item.name || foundPatientRecord?.name || currentUser?.name || 'Patient',
            gender: item.Gender || item.gender || foundPatientRecord?.Gender || foundPatientRecord?.gender || currentUser?.Gender || currentUser?.gender || 'Not Specified',
            Gender: item.Gender || item.gender || foundPatientRecord?.Gender || foundPatientRecord?.gender || currentUser?.Gender || currentUser?.gender || 'Not Specified',
            age: item.age || item.Age || foundPatientRecord?.age || currentUser?.age || '-',
            blood_group: item.Blood_Group || item.blood_group || foundPatientRecord?.Blood_Group || foundPatientRecord?.blood_group || 'N/A',
            doctor_name: docName,
            doctor_specialization: docObj?.specialization || docObj?.specialty || item.doctor_specialization || 'Clinical Specialist',
            hospital_name: hospName,
            hospital_address: hospObj?.Address || hospObj?.address || 'Super Speciality Medical Campus',
            hospital_phone: hospObj?.Emergency_Number || hospObj?.Phone || '+91 9876543210',
            consultation_fee: docFee,
            hospitals_charges: hospCharge,
            total_bill: total,
            amount_paid: paid,
            due_balance: due,
            payment_status: item.payment_status || (paid >= total && total > 0 ? 'Paid' : 'Paid'),
            payment_method: item.payment_method || 'Cash',
            bed_number: item.bed_number || null,
            floor: item.bed_number ? `Floor ${Math.floor((Number(item.bed_number) - 1) / 100) + 1}` : 'Outpatient (OPD)',
            visit_date_formatted: formattedVisitDate,
            visit_time_formatted: formattedVisitTime,
            symptoms: item.symptoms_diagnosis || item.reason_for_visit || 'General health consultation and OPD review.',
            condition_severity: item.condition || item.Condation || 'Normal',
            discharge_date: item.settled_at || item.updated_at || item.visit_date_time || new Date().toISOString()
          };
        });

      // Sort newest discharge first (by appointment id descending)
      discharged.sort((a, b) => (Number(b.Appoment_id || b.id) || 0) - (Number(a.Appoment_id || a.id) || 0));

      setDischargedRecords(discharged);
      if (discharged.length > 0 && !selectedRecord) {
        setSelectedRecord(discharged[0]);
      }
    } catch (err) {
      console.error('Error loading history data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistoryData();
  }, [currentUser]);

  // Open details popup for a specific record
  const handleOpenDetails = (record) => {
    setSelectedRecord(record);
    setIsDetailsModalOpen(true);
  };

  // Filtered records by search & hospital
  const filteredRecords = dischargedRecords.filter((rec) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      rec.tracking_id.toLowerCase().includes(q) ||
      rec.doctor_name.toLowerCase().includes(q) ||
      rec.doctor_specialization.toLowerCase().includes(q) ||
      rec.hospital_name.toLowerCase().includes(q) ||
      rec.symptoms.toLowerCase().includes(q);

    const matchesHosp =
      selectedHospitalFilter === 'ALL' ||
      rec.hospital_name.toLowerCase().includes(selectedHospitalFilter.toLowerCase());

    return matchesSearch && matchesHosp;
  });

  // Calculate high level aggregates
  const totalCompletedVisits = dischargedRecords.length;
  const totalAmountPaid = dischargedRecords.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
  const uniqueHospitalsCount = new Set(dischargedRecords.map(r => r.hospital_name)).size;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* UNIFIED PATIENT NAVBAR */}
      <PatientNavbar
        currentPage="my_hestory"
        setCurrentPage={setCurrentPage}
        isLoggedIn={isLoggedIn}
        onLogout={onLogout}
        currentUser={currentUser}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6">
        {/* HERO HEADER */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-7 shadow-md border border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Medical History & Discharged Records
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold mt-2 tracking-tight text-slate-100">
                Discharged Appointments & Treatment History
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
                Jab aap hospital se discharge hote hain, aapki appointment ID ke saath doctor consultation, clinical diagnosis, bed/ward allocation aur itemized billing ki complete journey yahan safe rehti hai. Click <strong>"Details"</strong> on any row to view full journey.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('appointment')}
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-900 font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                title="Schedule a new appointment"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span>Book New Appointment</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('patient_dashboard')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>&larr;</span>
                <span>My Dashboard</span>
              </button>
            </div>
          </div>
        </div>

        {/* QUICK STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed / Discharged Visits</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{totalCompletedVisits} Visits</h3>
            <p className="text-xs text-emerald-700 font-medium mt-1">✓ All medical records archived</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount Settled</p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">₹{totalAmountPaid.toFixed(2)}</h3>
            <p className="text-xs text-slate-500 mt-1">100% dues cleared with receipts</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hospitals Consulted</p>
            <h3 className="text-xl sm:text-2xl font-black text-teal-800 mt-1">{uniqueHospitalsCount} Hospitals</h3>
            <p className="text-xs text-slate-500 mt-1">Specialized care records</p>
          </div>
        </div>

        {/* CONTENT SECTION */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-bold text-slate-700">Loading your complete medical history...</p>
            <p className="text-xs text-slate-400 mt-1">Retrieving verified appointment journey, clinical records, doctor notes, and billing history.</p>
          </div>
        ) : dischargedRecords.length === 0 ? (
          /* NO DISCHARGE RECORDS YET */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-4 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-2xl flex items-center justify-center mx-auto shadow-2xs">
              📋
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No Discharged Records Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Aapke paas abhi koi discharged appointment record nahi hai. Jab hospital doctor ya receptionist aapki visit ko <strong>Discharged</strong> mark karke billing settle karenge, aapki appointment ID ke sath starting se end tak ki sari details yahan table me show ho jayegi.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('appointment')}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>Book OPD Appointment</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('patient_dashboard')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* TABLE FORMAT VIEW FOR DISCHARGED APPOINTMENTS */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
            {/* TABLE HEADER & SEARCH BAR */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Discharged Appointments History Table ({filteredRecords.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Click on the <span className="font-semibold text-teal-800">"Details"</span> button in any row to see full chronological journey from booking to discharge.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Input */}
                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ID, Doctor, Diagnosis..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                  <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                </div>

                {/* Hospital Filter */}
                <select
                  value={selectedHospitalFilter}
                  onChange={(e) => setSelectedHospitalFilter(e.target.value)}
                  className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:border-teal-500"
                >
                  <option value="ALL">All Hospitals</option>
                  {Array.from(new Set(dischargedRecords.map(r => r.hospital_name))).map((hName, idx) => (
                    <option key={idx} value={hName}>{hName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* RESPONSIVE TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/80 text-slate-600 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Appointment ID</th>
                    <th className="py-3.5 px-4">Doctor & Specialization</th>
                    <th className="py-3.5 px-4">Hospital</th>
                    <th className="py-3.5 px-4">Visit Date & Time</th>
                    <th className="py-3.5 px-4">Chief Symptoms / Diagnosis</th>
                    <th className="py-3.5 px-4">Ward / Bed</th>
                    <th className="py-3.5 px-4">Total Bill</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                        No discharged appointments match your search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className="hover:bg-teal-50/40 transition duration-150 group"
                      >
                        {/* 1. Appointment ID */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-extrabold text-xs text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 inline-block shadow-2xs">
                            {item.tracking_id}
                          </span>
                        </td>

                        {/* 2. Doctor & Specialty */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs">{item.doctor_name}</div>
                          <div className="text-[11px] text-teal-700 font-medium">{item.doctor_specialization}</div>
                        </td>

                        {/* 3. Hospital */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800 text-xs truncate max-w-[160px]" title={item.hospital_name}>
                            🏥 {item.hospital_name}
                          </div>
                        </td>

                        {/* 4. Visit Date & Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{item.visit_date_formatted}</div>
                          <div className="text-[11px] text-slate-500">🕒 {item.visit_time_formatted}</div>
                        </td>

                        {/* 5. Diagnosis / Symptoms */}
                        <td className="py-3.5 px-4">
                          <p className="text-slate-700 max-w-[180px] truncate" title={item.symptoms}>
                            {item.symptoms}
                          </p>
                        </td>

                        {/* 6. Ward / Bed */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.bed_number ? (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-[11px]">
                              Bed #{item.bed_number}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">OPD / Daycare</span>
                          )}
                        </td>

                        {/* 7. Total Bill & Paid */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900">₹{item.total_bill.toFixed(2)}</div>
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Paid ({item.payment_method})
                          </span>
                        </td>

                        {/* 8. Discharge Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Discharged
                          </span>
                        </td>

                        {/* 9. Action: Details Button */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(item)}
                            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1 mx-auto"
                            title="View Complete Journey Details"
                          >
                            <span>👁️</span>
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* TABLE FOOTER SUMMARY */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
              <p>
                Showing <strong>{filteredRecords.length}</strong> of <strong>{dischargedRecords.length}</strong> total discharged appointment records.
              </p>
              <p className="text-[11px]">
                Records are permanently preserved in your personal medical log.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* FULL JOURNEY DETAILS POPUP MODAL */}
      {isDetailsModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-5 sm:p-7 space-y-5 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-300">
                    {selectedRecord.tracking_id}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    ✓ Officially Discharged & Cleared
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Complete Medical Journey & Discharge Summary
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hospital: <strong>{selectedRecord.hospital_name}</strong> • Attending: <strong>{selectedRecord.doctor_name}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition cursor-pointer text-sm shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* CHRONOLOGICAL JOURNEY TIMELINE STEPPER (START TO END) */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chronological Journey (Booking to Discharge)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                {/* 1. Booking */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center mb-1.5">
                    1
                  </span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Initial Booking</p>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">{selectedRecord.visit_date_formatted}</p>
                  <p className="text-[11px] text-slate-500">ID: {selectedRecord.tracking_id}</p>
                </div>

                {/* 2. Doctor Care */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center mb-1.5">
                    2
                  </span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Doctor Care</p>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">{selectedRecord.doctor_name}</p>
                  <p className="text-[11px] text-slate-500">{selectedRecord.doctor_specialization}</p>
                </div>

                {/* 3. Ward/Bed */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center mb-1.5">
                    3
                  </span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Ward & Bed</p>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">
                    {selectedRecord.bed_number ? `Bed #${selectedRecord.bed_number}` : 'Outpatient (OPD)'}
                  </p>
                  <p className="text-[11px] text-slate-500">{selectedRecord.floor}</p>
                </div>

                {/* 4. Discharge */}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 shadow-2xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center mb-1.5">
                    4
                  </span>
                  <p className="text-[10px] font-bold text-emerald-800 uppercase">Discharge & Bill</p>
                  <p className="font-bold text-emerald-950 text-xs mt-0.5">Gate Pass Cleared</p>
                  <p className="text-[11px] text-emerald-700 font-semibold">₹{selectedRecord.total_bill.toFixed(2)} Paid</p>
                </div>
              </div>
            </div>

            {/* DETAILED INFORMATION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* PATIENT DEMOGRAPHICS */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                <p className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1.5">
                  👤 Patient Demographics & Identification
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 text-[10px]">Patient Name:</span>
                    <p className="font-bold text-slate-900">{selectedRecord.patient_Name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Appointment Tracking ID:</span>
                    <p className="font-mono font-bold text-teal-700">{selectedRecord.tracking_id}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Age / Gender:</span>
                    <p className="font-semibold text-slate-800">{selectedRecord.age} Yrs • {selectedRecord.Gender}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Blood Group & Severity:</span>
                    <p className="font-semibold text-rose-600">{selectedRecord.blood_group} • {selectedRecord.condition_severity}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 text-[10px]">Contact Phone / Email:</span>
                    <p className="font-semibold text-slate-800">{selectedRecord.contact || selectedRecord.phone || '-'} • {selectedRecord.email || '-'}</p>
                  </div>
                </div>
              </div>

              {/* DOCTOR & HOSPITAL INFO */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                <p className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1.5">
                  🏥 Doctor & Hospital Details
                </p>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-slate-400 text-[10px]">Attending Specialist:</span>
                    <p className="font-bold text-slate-900">{selectedRecord.doctor_name}</p>
                    <p className="text-[11px] text-teal-700 font-medium">{selectedRecord.doctor_specialization}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Hospital Facility:</span>
                    <p className="font-semibold text-slate-800">{selectedRecord.hospital_name}</p>
                    <p className="text-[10px] text-slate-500">{selectedRecord.hospital_address}</p>
                  </div>
                  {selectedRecord.bed_number && (
                    <div className="p-2 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 font-semibold flex items-center justify-between">
                      <span>Inpatient Bed #{selectedRecord.bed_number}</span>
                      <span className="text-[10px] font-bold">{selectedRecord.floor}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CLINICAL DIAGNOSIS & SYMPTOMS */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 md:col-span-2 space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1.5">
                  🩺 Clinical Diagnosis, Symptoms & Care Summary
                </p>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Chief Complaint / Diagnosis Recorded:</span>
                  <p className="text-slate-900 font-medium text-xs mt-1 leading-relaxed">
                    {selectedRecord.symptoms}
                  </p>
                </div>
              </div>

              {/* FINANCIAL & INVOICE SETTLEMENT */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 md:col-span-2 space-y-2.5">
                <p className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1.5">
                  💳 Itemized Financial Settlement & Receipt
                </p>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-1.5 text-slate-600">Doctor Clinical Consultation & Observation Fee</td>
                      <td className="py-1.5 text-right font-mono font-bold text-slate-800">₹{selectedRecord.consultation_fee.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-slate-600">Hospital & Treatment Facilities Charges</td>
                      <td className="py-1.5 text-right font-mono font-bold text-slate-800">₹{selectedRecord.hospitals_charges.toFixed(2)}</td>
                    </tr>
                    <tr className="border-t-2 border-slate-200 font-bold bg-slate-50/50">
                      <td className="py-2 text-slate-900 uppercase">Total Billed Amount</td>
                      <td className="py-2 text-right font-mono font-black text-slate-900 text-sm">₹{selectedRecord.total_bill.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-emerald-50 text-emerald-950 font-bold">
                      <td className="py-2 px-2">Amount Paid ({selectedRecord.payment_method})</td>
                      <td className="py-2 px-2 text-right font-mono font-black text-emerald-800 text-sm">₹{selectedRecord.amount_paid.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 text-slate-400 text-[11px]">Remaining Balance Dues:</td>
                      <td className="py-1 px-2 text-right font-mono text-slate-400 text-[11px] font-bold">₹0.00 (Fully Settled)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* MODAL FOOTER ACTIONS */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Close Window
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <span>🖨️</span>
                <span>Print Official Gate Pass & Journey Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <PatientFooter />
    </div>
  );
};

export default MyHestory;
export { MyHestory, MyHestory as MyHistory, MyHestory as PatientMyHestory };
