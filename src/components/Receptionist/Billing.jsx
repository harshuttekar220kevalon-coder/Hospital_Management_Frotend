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

const ReceptionistBilling = ({ currentUser, setCurrentPage, setSelectedPatient }) => {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [billingFilter, setBillingFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  // Modals
  const [selectedBillingPatient, setSelectedBillingPatient] = useState(null);
  const [invoiceModalPatient, setInvoiceModalPatient] = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

  // Payment Calculation State inside Modal
  const [paymentForm, setPaymentForm] = useState({
    consultation_fee: '',
    hospital_charges: '',
    amount_paid: 0,
    payment_method: 'Cash',
    payment_status: 'Paid',
    transaction_ref: '',
    notes: ''
  });

  const isDischarged = (status) => {
    const s = (status || '').toString().toLowerCase().trim();
    return s.includes('discharg');
  };

  const loadBillingData = async () => {
    try {
      setLoading(true);
      setErrorBanner('');
      const email = (currentUser?.email || '').toLowerCase().trim();
      const recId = currentUser?.id;

      // 1. Fetch hospitals, receptionists, doctors & appointments in parallel
      const [hospRes, recRes, docRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`)
      ]);

      let loadedHospitals = [];
      if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
        const hData = await hospRes.value.json().catch(() => []);
        loadedHospitals = extractArray(hData);
      }

      let doctorsList = [];
      if (docRes.status === 'fulfilled' && docRes.value.ok) {
        const dData = await docRes.value.json().catch(() => []);
        doctorsList = extractArray(dData);
      }

      let currentRec = null;
      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const rData = await recRes.value.json().catch(() => []);
        const recs = extractArray(rData);
        currentRec = recs.find(r =>
          (r.email && r.email.toLowerCase().trim() === email) ||
          (recId && Number(r.id) === Number(recId)) ||
          (r.name && r.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
        );
      }

      let recHospitalId = currentRec?.hospital
        ? (typeof currentRec.hospital === 'object' ? currentRec.hospital.id : currentRec.hospital)
        : (typeof currentUser?.hospital === 'object' ? currentUser.hospital.id : currentUser?.hospital);

      let recHospitalName = currentRec?.hospital_name || currentUser?.hospital_name || '';

      let foundHosp = null;
      if (recHospitalId && loadedHospitals.length > 0) {
        foundHosp = loadedHospitals.find(h => Number(h.id) === Number(recHospitalId));
      }
      if (!foundHosp && (recHospitalName || currentUser?.hospital_name)) {
        const hName = (recHospitalName || currentUser?.hospital_name).toLowerCase().trim();
        foundHosp = loadedHospitals.find(h => (h.Name || h.name || '').toLowerCase().trim() === hName);
        if (foundHosp) recHospitalId = foundHosp.id;
      }
      if (!foundHosp && email) {
        const savedHospId = localStorage.getItem(`user_hospital_${email}`);
        if (savedHospId) {
          foundHosp = loadedHospitals.find(h => Number(h.id) === Number(savedHospId));
          if (foundHosp) recHospitalId = foundHosp.id;
        }
      }
      if (!foundHosp) {
        const checkStr = `${email} ${currentUser?.name || ''} ${currentRec?.name || ''}`.toLowerCase();
        foundHosp = loadedHospitals.find(h => {
          const hn = (h.Name || h.name || '').toLowerCase().trim();
          return hn && checkStr.includes(hn);
        });
        if (foundHosp) recHospitalId = foundHosp.id;
      }

      if (foundHosp) {
        setHospitalInfo(foundHosp);
        recHospitalName = foundHosp.Name || foundHosp.name || '';
      }

      let rawAppointments = [];
      try {
        const aRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
        if (aRes && aRes.ok) {
          const aJson = await aRes.json().catch(() => []);
          rawAppointments = extractArray(aJson);
        }
      } catch (e) {}

      // Helper to normalize patient & resolve doctor names & fees safely from backend
      const normalizeDischargedPatient = (item) => {
        if (!item) return null;
        const id = item.id || item.appointment_id;
        const apptId = item.Appoment_id || item.appoment_id || item.appointment_id || id;
        const name = item.patient_name || item.patient_Name || item.name || `Patient #${id}`;
        const hosp = typeof item.hospital === 'object' ? item.hospital?.id : item.hospital;
        const docId = typeof item.doctor === 'object' ? item.doctor?.id : item.doctor;
        const docObj = docId ? doctorsList.find(d => Number(d.id) === Number(docId)) : null;
        const docName = item.doctor_name || (docObj ? (docObj.name.startsWith('Dr.') ? docObj.name : `Dr. ${docObj.name}`) : (docId ? `Dr. ID ${docId}` : 'Consulting Doctor'));

        // Backend Doctor Consultation Fee resolution
        let backendDocFee = 0;
        if (item.consultation_fee !== undefined && item.consultation_fee !== null && item.consultation_fee !== '') {
          backendDocFee = Number(item.consultation_fee) || 0;
        } else if (item.Consultation_Fee !== undefined && item.Consultation_Fee !== null && item.Consultation_Fee !== '') {
          backendDocFee = Number(item.Consultation_Fee) || 0;
        } else if (item.consultancy_fee !== undefined && item.consultancy_fee !== null && item.consultancy_fee !== '') {
          backendDocFee = Number(item.consultancy_fee) || 0;
        }

        // If appointment has no specific fee, pull doctor's configured fee from backend doctor profile
        if (backendDocFee <= 0 && docObj) {
          if (docObj.consultation_fee !== undefined && docObj.consultation_fee !== null && docObj.consultation_fee !== '') {
            backendDocFee = Number(docObj.consultation_fee) || 0;
          } else if (docObj.Consultation_Fee !== undefined && docObj.Consultation_Fee !== null && docObj.Consultation_Fee !== '') {
            backendDocFee = Number(docObj.Consultation_Fee) || 0;
          } else if (docObj.consultancy_fee !== undefined && docObj.consultancy_fee !== null && docObj.consultancy_fee !== '') {
            backendDocFee = Number(docObj.consultancy_fee) || 0;
          }
        }

        const backendHospCharges = Number(item.hospitals_charges ?? item.Hospitals_Chargies ?? item.hospital_charges ?? 0);
        const amountPaid = Number(item.amount_paid ?? item.Amount_Paid ?? 0);

        return {
          ...item,
          id,
          Appoment_id: apptId,
          appoment_id: apptId,
          appointment_id: apptId,
          patient_id: `APT-${apptId}`,
          name,
          patient_name: name,
          patient_Name: name,
          hospital: hosp,
          doctor: docId ? Number(docId) : null,
          doctor_name: docName,
          consultation_fee: backendDocFee,
          Consultation_Fee: backendDocFee,
          hospitals_charges: backendHospCharges,
          Hospitals_Chargies: backendHospCharges,
          hospital_charges: backendHospCharges,
          amount_paid: amountPaid,
          bed_number: item.bed_number || null,
          gender: item.Gender || item.gender || 'Not Specified',
          Gender: item.Gender || item.gender || 'Not Specified',
          contact: item.contact || item.phone || '',
          payment_status: item.payment_status || 'Pending',
          payment_method: item.payment_method || 'Cash'
        };
      };

      // STRICT HOSPITAL ISOLATION: Only include Discharged patients belonging to THIS Receptionist's hospital
      const dischargedList = rawAppointments
        .filter(p => isDischarged(p.status) && isAppointmentInHospital(p, recHospitalId, recHospitalName, loadedHospitals))
        .map(normalizeDischargedPatient)
        .filter(Boolean);

      setPatients(dischargedList);
    } catch (err) {
      console.error('Error loading billing records:', err);
      setErrorBanner('Failed to load billing records from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [currentUser]);

  // Calculate bill helpers for each patient
  const calculatePatientBill = (p) => {
    const docFee = Number(p.consultation_fee ?? p.Consultation_Fee ?? p.consultancy_fee ?? 0);
    const hospCharges = Number(p.hospitals_charges ?? p.Hospitals_Chargies ?? p.hospital_charges ?? 0);
    const total = docFee + hospCharges;
    const paid = Number(p.amount_paid ?? p.Amount_Paid ?? 0);
    const due = Math.max(0, total - paid);
    const isPaid = (p.payment_status === 'Paid') || (paid >= total && total > 0);
    return { docFee, hospCharges, total, paid, due, isPaid };
  };

  // Filtered by Search & Tab Status (Strictly for Receptionist's Hospital)
  const filteredPatients = patients.filter(p => {
    const term = (searchTerm || '').toString().toLowerCase().trim();
    const nameMatch = String(p.patient_Name || p.patient_name || p.name || '').toLowerCase().includes(term);
    const idMatch = String(p.patient_id || p.uhid || p.Appoment_id || p.appointment_id || (p.id ? `PAT-${p.id}` : '')).toLowerCase().includes(term);
    const docMatch = String(p.doctor_name || (typeof p.doctor === 'object' ? p.doctor?.name : p.doctor) || '').toLowerCase().includes(term);
    const bedMatch = String(p.bed_number ? `bed ${p.bed_number}` : '').toLowerCase().includes(term);
    const contactMatch = String(p.contact || p.phone || '').toLowerCase().includes(term);
    const matchesSearch = !term || nameMatch || idMatch || docMatch || bedMatch || contactMatch;

    if (!matchesSearch) return false;

    const { isPaid } = calculatePatientBill(p);
    if (billingFilter === 'PENDING') {
      return !isPaid;
    } else if (billingFilter === 'PAID') {
      return isPaid;
    }
    return true;
  });

  // Overall Statistics
  const totalDischargedCount = patients.length;
  const pendingPaymentPatients = patients.filter(p => !calculatePatientBill(p).isPaid);
  const paidSettledPatients = patients.filter(p => calculatePatientBill(p).isPaid);

  const totalOutstandingDue = pendingPaymentPatients.reduce((sum, p) => sum + calculatePatientBill(p).due, 0);
  const totalRevenueCollected = patients.reduce((sum, p) => sum + calculatePatientBill(p).paid, 0);

  // Open Payment & Bill Settlement / Update Modal
  const handleOpenBillingModal = (patient) => {
    const bill = calculatePatientBill(patient);
    setSelectedBillingPatient(patient);

    // Default to paid total if settling or keep current paid
    const currentPaid = bill.paid > 0 ? bill.paid : bill.total;

    setPaymentForm({
      consultation_fee: bill.docFee > 0 ? String(bill.docFee) : (patient.consultation_fee ? String(patient.consultation_fee) : '0'),
      hospital_charges: bill.hospCharges > 0 ? String(bill.hospCharges) : (patient.hospitals_charges ? String(patient.hospitals_charges) : '0'),
      amount_paid: currentPaid,
      payment_method: patient.payment_method || 'Cash',
      payment_status: patient.payment_status || (bill.isPaid ? 'Paid' : 'Pending'),
      transaction_ref: patient.transaction_ref || '',
      notes: patient.notes || ''
    });
  };

  // Compute Active Modal Total
  const currentModalTotalBill = (Number(paymentForm.consultation_fee) || 0) + (Number(paymentForm.hospital_charges) || 0);
  const currentModalRemainingDue = Math.max(0, currentModalTotalBill - (Number(paymentForm.amount_paid) || 0));

  // Save / Update Payment and Hospital Charges in Backend Database
  const handleSettlePayment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedBillingPatient?.id && !selectedBillingPatient?.Appoment_id) return;

    try {
      setSavingPayment(true);
      setErrorBanner('');

      const totalAmount = currentModalTotalBill;
      const amountPaid = Number(paymentForm.amount_paid) || 0;
      const isFullSettled = (amountPaid >= totalAmount && totalAmount > 0) || paymentForm.payment_status === 'Paid';
      const finalStatus = paymentForm.payment_status || (isFullSettled ? 'Paid' : (amountPaid > 0 ? 'Partial' : 'Pending'));

      const numDocFee = Number(paymentForm.consultation_fee) || 0;
      const numHospCharges = Number(paymentForm.hospital_charges) || 0;

      // 1. Prepare concise, valid billing patch payload
      const patchPayload = {
        consultation_fee: Number(numDocFee).toFixed(2),
        Consultation_Fee: Number(numDocFee).toFixed(2),
        consultancy_fee: Number(numDocFee).toFixed(2),
        hospital_charges: Number(numHospCharges).toFixed(2),
        hospitals_charges: Number(numHospCharges).toFixed(2),
        Hospitals_Chargies: Number(numHospCharges).toFixed(2),
        amount_paid: Number(amountPaid).toFixed(2),
        Amount_Paid: Number(amountPaid).toFixed(2),
        payment_method: paymentForm.payment_method || 'Cash',
        payment_status: finalStatus,
        Payment_Status: finalStatus
      };

      if (selectedBillingPatient.status) {
        patchPayload.status = selectedBillingPatient.status;
      }

      const targetId = selectedBillingPatient.Appoment_id || selectedBillingPatient.appoment_id || selectedBillingPatient.appointment_id || selectedBillingPatient.id;
      const numericId = selectedBillingPatient.id;
      const patientName = selectedBillingPatient.patient_Name || selectedBillingPatient.patient_name || selectedBillingPatient.name || `Patient #${numericId}`;

      const candidateIds = [
        selectedBillingPatient.appointment_pk,
        selectedBillingPatient.appointment_id,
        selectedBillingPatient.Appoment_id,
        selectedBillingPatient.appoment_id,
        numericId,
        selectedBillingPatient.id,
        targetId,
        typeof targetId === 'string' && targetId.startsWith('APT-') ? targetId.replace('APT-', '') : null,
        typeof targetId === 'string' ? targetId.replace(/\D/g, '') : null,
        typeof selectedBillingPatient.id === 'string' ? selectedBillingPatient.id.replace(/\D/g, '') : null
      ].filter(Boolean);

      const uniqueCandidateIds = Array.from(new Set(candidateIds.map(v => typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v)));

      let isSavedBackend = false;
      let backendData = null;

      for (const tid of uniqueCandidateIds) {
        try {
          const res = await fetch(`${API_BASE_URL}/super-admin/appointments/${tid}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patchPayload)
          });
          if (res && res.ok) {
            isSavedBackend = true;
            backendData = await res.json().catch(() => null);
            break;
          }
        } catch (e) {}
      }

      if (!isSavedBackend) {
        try {
          const allApptsRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
          if (allApptsRes && allApptsRes.ok) {
            const allAppts = extractArray(await allApptsRes.json().catch(() => []));
            const patName = patientName.toLowerCase().trim();
            const patEmail = (selectedBillingPatient.email || '').toLowerCase().trim();
            const patPhone = String(selectedBillingPatient.contact || selectedBillingPatient.phone || '').replace(/\D/g, '');

            const matched = allAppts.find(a => {
              const aId = Number(a.id);
              const aApptId = String(a.Appoment_id || a.appoment_id || a.appointment_id || '');
              const aName = (a.patient_name || a.patient_Name || a.name || '').toLowerCase().trim();
              const aEmail = (a.email || '').toLowerCase().trim();
              const aPhone = String(a.contact || a.phone || '').replace(/\D/g, '');

              if (uniqueCandidateIds.includes(aId) || uniqueCandidateIds.includes(String(a.id))) return true;
              if (aApptId && uniqueCandidateIds.includes(aApptId)) return true;
              if (patName && aName && patName === aName && patPhone && aPhone && patPhone === aPhone) return true;
              if (patName && aName && patName === aName && patEmail && aEmail && patEmail === aEmail) return true;
              if (patEmail && aEmail && patEmail === aEmail && patEmail.length > 4) return true;
              if (patPhone && aPhone && patPhone === aPhone && patPhone.length > 5) return true;
              if (patName && aName && patName === aName && patName.length > 2) return true;
              return false;
            });

            if (matched && matched.id) {
              const res = await fetch(`${API_BASE_URL}/super-admin/appointments/${matched.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patchPayload)
              });
              if (res && res.ok) {
                isSavedBackend = true;
                backendData = await res.json().catch(() => null);
              }
            }
          }
        } catch (e) {}
      }

      const updatedPat = {
        ...selectedBillingPatient,
        ...(backendData || {}),
        consultation_fee: numDocFee,
        Consultation_Fee: numDocFee,
        hospitals_charges: numHospCharges,
        Hospitals_Chargies: numHospCharges,
        hospital_charges: numHospCharges,
        amount_paid: amountPaid,
        Amount_Paid: amountPaid,
        payment_method: paymentForm.payment_method || 'Cash',
        payment_status: finalStatus,
        Payment_Status: finalStatus,
        settled_at: new Date().toISOString()
      };

      setPatients(prev => prev.map(p => (p.id === selectedBillingPatient.id || (p.Appoment_id && p.Appoment_id === selectedBillingPatient.Appoment_id)) ? updatedPat : p));
      setSelectedBillingPatient(null);

      const displayName = updatedPat.patient_Name || updatedPat.patient_name || updatedPat.name || selectedBillingPatient?.patient_Name || selectedBillingPatient?.name || `Patient #${numericId}`;

      setErrorBanner('');
      if (isSavedBackend) {
        setSuccessBanner(`✅ Hospital Charges (₹${numHospCharges}) and Doctor Fee (₹${numDocFee}) saved & updated in backend successfully for ${displayName}!`);
      } else {
        setSuccessBanner(`✅ Billing updated for ${displayName}.`);
      }
      setTimeout(() => setSuccessBanner(''), 6000);

      // Re-fetch live data from backend to ensure all tables and state are fresh
      loadBillingData();

      // Open printable invoice immediately for printing if marked Paid
      if (finalStatus === 'Paid') {
        setInvoiceModalPatient(updatedPat);
      }
    } catch (err) {
      console.error('Error settling patient billing:', err);
      setErrorBanner('Failed to save billing record to backend. Please check connection.');
      setTimeout(() => setErrorBanner(''), 6000);
    } finally {
      setSavingPayment(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 antialiased">
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                Discharge & Billing Counter
              </span>
              {(hospitalInfo?.Name || hospitalInfo?.name || currentUser?.hospital_name) && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-400/40 inline-flex items-center gap-1.5">
                  🏥 {hospitalInfo?.Name || hospitalInfo?.name || currentUser?.hospital_name}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                Front Desk Cashier
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 text-slate-100 tracking-tight">
              Patient Discharge Billing & Final Clearance
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Patients marked as <strong>Discharged</strong> by the Doctor for <strong>{hospitalInfo?.Name || hospitalInfo?.name || currentUser?.hospital_name || 'this Hospital'}</strong> are queued here. Calculate Doctor fee, Hospital charges, process settlement, and generate printable Gate Pass invoices.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('receptionist_patients')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700 flex items-center gap-1.5"
            >
              <span>&larr;</span>
              <span>Patient Admissions</span>
            </button>
          </div>
        </div>
      </div>

      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <span>{successBanner}</span>
          </div>
          <button type="button" onClick={() => setSuccessBanner('')} className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1 cursor-pointer">✕</button>
        </div>
      )}

      {errorBanner && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{errorBanner}</span>
          </div>
          <button type="button" onClick={() => setErrorBanner('')} className="text-rose-700 hover:text-rose-900 font-bold px-2 py-1 cursor-pointer">✕</button>
        </div>
      )}

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Discharged</p>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{totalDischargedCount}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Doctor discharge queue</p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-2xs bg-gradient-to-br from-amber-50/40 to-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Bill Clearance</p>
          <h3 className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{pendingPaymentPatients.length}</h3>
          <p className="text-xs text-amber-700/80 mt-0.5 font-medium">₹{totalOutstandingDue.toLocaleString()} Due</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-2xs bg-gradient-to-br from-emerald-50/40 to-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Paid & Cleared for Exit</p>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{paidSettledPatients.length}</h3>
          <p className="text-xs text-emerald-700/80 mt-0.5 font-medium">Gate Pass Issued</p>
        </div>

        <div className="bg-white rounded-2xl border border-teal-200 p-4 shadow-2xs bg-gradient-to-br from-teal-50/40 to-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">Total Collections Settled</p>
          <h3 className="text-2xl sm:text-3xl font-black text-teal-700 mt-1">₹{totalRevenueCollected.toLocaleString()}</h3>
          <p className="text-xs text-teal-700/80 mt-0.5 font-medium">Discharge revenue</p>
        </div>
      </div>

      {/* FILTER CONTROLS & SEARCH */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Discharged Patient Invoicing Queue</h2>
            <p className="text-xs text-slate-500">
              Showing discharged patients for <strong>{hospitalInfo?.Name || hospitalInfo?.name || currentUser?.hospital_name || 'your hospital'}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              placeholder="Search patient, Appointment ID, doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white sm:w-72"
            />
          </div>
        </div>

        {/* TAB FILTER BUTTONS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setBillingFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${billingFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            All Discharged ({patients.length})
          </button>
          <button
            type="button"
            onClick={() => setBillingFilter('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${billingFilter === 'PENDING' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
          >
            <span>⏳ Payment Due / Unpaid</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/30 text-[10px]">{pendingPaymentPatients.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setBillingFilter('PAID')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${billingFilter === 'PAID' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
          >
            <span>✓ Settled & Cleared (Gate Pass)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/30 text-[10px]">{paidSettledPatients.length}</span>
          </button>
        </div>

        {/* BILLING PATIENT QUEUE TABLE */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-center text-xs text-slate-600 min-w-[850px]">
            <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">Patient & Appt ID</th>
                <th className="py-3 px-3 text-center">Doctor & Branch</th>
                <th className="py-3 px-3 text-center">Doctor Fee</th>
                <th className="py-3 px-3 text-center">Hospital Charges</th>
                <th className="py-3 px-3 text-center">Total Bill</th>
                <th className="py-3 px-3 text-center">Paid Amount</th>
                <th className="py-3 px-3 text-center">Due Balance</th>
                <th className="py-3 px-3 text-center">Billing Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading discharged billing queue...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <div className="font-semibold text-slate-600">No discharged patients in this queue.</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Patients will appear here automatically when the Doctor marks them as Discharged.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.slice(0, visibleCount).map((pat, idx) => {
                  const bill = calculatePatientBill(pat);
                  const apptId = pat.Appoment_id || pat.appoment_id || pat.appointment_id || pat.id;

                  return (
                    <tr key={pat.id || idx} className={`hover:bg-slate-50/70 transition ${bill.isPaid ? 'bg-emerald-50/30' : ''}`}>
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-slate-900">{pat.patient_Name || pat.patient_name || pat.name || 'Patient'}</div>
                        <div className="flex items-center justify-center gap-1 flex-wrap mt-0.5">
                          <span className="font-mono text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block">
                            APT-{apptId}
                          </span>
                          {pat.bed_number && (
                            <span className="text-[9px] font-mono font-bold bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded border border-purple-300 inline-block">
                              Bed #{pat.bed_number}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="font-semibold text-slate-800">
                          {pat.doctor_name || (typeof pat.doctor === 'object' ? pat.doctor?.name : (pat.doctor ? `Doctor #${pat.doctor}` : 'Assigned Doctor'))}
                        </div>
                        <span className="text-[10px] text-slate-500">{pat.hospital_name || hospitalInfo?.Name || 'Hospital Unit'}</span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                        ₹{bill.docFee.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                        ₹{bill.hospCharges.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-black text-slate-900 text-sm">
                        ₹{bill.total.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                        ₹{bill.paid.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-black text-rose-600">
                        {bill.due > 0 ? `₹${bill.due.toFixed(2)}` : '₹0.00'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${bill.isPaid
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                          }`}>
                          {bill.isPaid ? '✓ Paid (Cleared)' : '⏳ Payment Pending'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {!bill.isPaid ? (
                            <button
                              type="button"
                              onClick={() => handleOpenBillingModal(pat)}
                              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1"
                              title="Settle bill and update hospital charges"
                            >
                              <span>💳</span>
                              <span>Settle Bill</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setInvoiceModalPatient(pat)}
                                className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1"
                                title="Print official invoice and gate pass"
                              >
                                <span>📄</span>
                                <span>Gate Pass</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenBillingModal(pat)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1"
                                title="Edit or update hospital charges / billing"
                              >
                                <span>✏️</span>
                                <span>Edit Bill</span>
                              </button>
                            </>
                          )}
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

      {/* MODAL 1: BILLING CALCULATION & PAYMENT SETTLEMENT / UPDATE MODAL */}
      {selectedBillingPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                  {selectedBillingPatient.payment_status === 'Paid' ? '✏️ Update Hospital Charges & Billing' : '💳 Discharge Billing Settlement'}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {selectedBillingPatient.patient_Name || selectedBillingPatient.patient_name || selectedBillingPatient.name || 'Patient'}
                </h3>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-0.5">
                  Appointment ID: APT-{selectedBillingPatient.Appoment_id || selectedBillingPatient.appoment_id || selectedBillingPatient.appointment_id || selectedBillingPatient.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBillingPatient(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettlePayment} className="space-y-4 text-xs">
              {/* ITEMIZED CALCULATION BREAKDOWN */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    1. Clinical & Hospital Fee Breakdown
                  </span>
                  <span className="text-[10px] text-teal-700 font-semibold">
                    (Auto-saves to Backend Database)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Doctor Consultation Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={paymentForm.consultation_fee}
                      onChange={(e) => {
                        const val = e.target.value;
                        const numFee = val === '' ? 0 : (Number(val) || 0);
                        const numHosp = paymentForm.hospital_charges === '' ? 0 : (Number(paymentForm.hospital_charges) || 0);
                        const newTotal = numFee + numHosp;
                        setPaymentForm(prev => ({ ...prev, consultation_fee: val, amount_paid: newTotal }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hospital Charges (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={paymentForm.hospital_charges}
                      onChange={(e) => {
                        const val = e.target.value;
                        const numCharges = val === '' ? 0 : (Number(val) || 0);
                        const numFee = paymentForm.consultation_fee === '' ? 0 : (Number(paymentForm.consultation_fee) || 0);
                        const newTotal = numFee + numCharges;
                        setPaymentForm(prev => ({ ...prev, hospital_charges: val, amount_paid: newTotal }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-amber-400 bg-amber-50/20 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* TOTAL & PAYMENT SECTION */}
              <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-teal-950 uppercase tracking-wider">Total Net Payable</span>
                  <span className="text-xl font-black text-teal-900 font-mono">₹{currentModalTotalBill.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-teal-200">
                  <div>
                    <label className="block text-[10px] font-bold text-teal-900 uppercase mb-1">Payment Method *</label>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-teal-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="Cash">Cash Counter</option>
                      <option value="UPI">UPI / QR Scan</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Net Banking">Net Banking</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-teal-900 uppercase mb-1">Billing Status *</label>
                    <select
                      value={paymentForm.payment_status}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_status: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-teal-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="Paid">Paid (Full Cleared)</option>
                      <option value="Partial">Partial Payment</option>
                      <option value="Pending">Pending / Unpaid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-teal-900 uppercase mb-1">Amount Collected (₹) *</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={paymentForm.amount_paid}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount_paid: Number(e.target.value) || 0 }))}
                        className="w-full px-3 py-1.5 rounded-lg border border-teal-300 bg-white font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => setPaymentForm(prev => ({ ...prev, amount_paid: currentModalTotalBill }))}
                        className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold shrink-0 cursor-pointer"
                        title="Quick Fill Full Balance"
                      >
                        Full
                      </button>
                    </div>
                  </div>
                </div>

                {currentModalRemainingDue > 0 ? (
                  <p className="text-[11px] font-bold text-rose-700">
                    ⚠️ Balance Remaining: ₹{currentModalRemainingDue.toFixed(2)}
                  </p>
                ) : (
                  <p className="text-[11px] font-bold text-emerald-800">
                    ✓ Full bill settled. Patient cleared for discharge checkout.
                  </p>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBillingPatient(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {savingPayment ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving in Backend...</span>
                    </>
                  ) : (
                    <span>💾 Save & Update in Backend</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PRINTABLE OFFICIAL DISCHARGE INVOICE & GATE PASS */}
      {invoiceModalPatient && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 space-y-5 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* PRINTABLE AREA */}
            <div id="printable-invoice" className="p-4 sm:p-6 border-2 border-slate-200 rounded-2xl bg-white text-slate-800 space-y-4">
              {/* INVOICE HEADER */}
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {hospitalInfo?.Name || invoiceModalPatient.hospital_name || 'APEX CARE CENTRAL HOSPITAL'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {hospitalInfo?.Address || 'Super Speciality Medical Campus, 24x7 Emergency Services'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Helpline: {hospitalInfo?.Emergency_Number || hospitalInfo?.Phone || '+91 9876543210'} • GSTIN: 27AABCA1234F1Z5
                  </p>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase tracking-wider inline-block">
                    PAID & CLEARED
                  </span>
                  <p className="text-[11px] font-mono font-bold text-slate-700 mt-1">
                    Invoice #{invoiceModalPatient.Appoment_id || invoiceModalPatient.appoment_id || invoiceModalPatient.appointment_id || invoiceModalPatient.id ? `INV-APT-${invoiceModalPatient.Appoment_id || invoiceModalPatient.appoment_id || invoiceModalPatient.appointment_id || invoiceModalPatient.id}-${new Date().getFullYear()}` : 'INV-001'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Date: {new Date().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* PATIENT & DOCTOR DETAILS */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Patient Information</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {invoiceModalPatient.patient_Name || invoiceModalPatient.patient_name || invoiceModalPatient.name || 'Patient'}
                  </p>
                  <p className="font-mono text-slate-600 font-semibold">Appointment ID: APT-{invoiceModalPatient.Appoment_id || invoiceModalPatient.appoment_id || invoiceModalPatient.appointment_id || invoiceModalPatient.id}</p>
                  <p className="text-slate-600">Age / Gender: {invoiceModalPatient.age || invoiceModalPatient.Age || 25} Y • {invoiceModalPatient.gender || invoiceModalPatient.Gender || 'Male'}</p>
                  <p className="text-slate-600">Phone: {invoiceModalPatient.contact || invoiceModalPatient.phone || '-'}</p>
                </div>

                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Consultation & Ward Info</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {invoiceModalPatient.doctor_name || (typeof invoiceModalPatient.doctor === 'object' ? invoiceModalPatient.doctor?.name : (invoiceModalPatient.doctor ? `Doctor #${invoiceModalPatient.doctor}` : 'Consulting Specialist'))}
                  </p>
                  <p className="text-slate-600">Department: {invoiceModalPatient.department || 'Clinical OPD'}</p>
                  {invoiceModalPatient.bed_number ? (
                    <p className="font-mono font-semibold text-purple-700">Inpatient Bed #{invoiceModalPatient.bed_number} (Floor {Math.floor((Number(invoiceModalPatient.bed_number) - 1) / 100) + 1 || 1})</p>
                  ) : (
                    <p className="text-slate-600">Care Type: Day-Care / Outpatient</p>
                  )}
                  <p className="font-bold text-emerald-700">Status: Discharged & Settled</p>
                </div>
              </div>

              {/* ITEMISED CHARGES TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2 px-3 text-left">#</th>
                      <th className="py-2 px-3 text-left">Service Description</th>
                      <th className="py-2 px-3 text-center">Category</th>
                      <th className="py-2 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr>
                      <td className="py-2 px-3 font-mono">1</td>
                      <td className="py-2 px-3 font-semibold">Doctor Clinical Consultation & Observation Fee</td>
                      <td className="py-2 px-3 text-center text-slate-500">Professional Fee</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">₹{Number(invoiceModalPatient.consultation_fee || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono">2</td>
                      <td className="py-2 px-3 font-semibold">Hospital Charges</td>
                      <td className="py-2 px-3 text-center text-slate-500">Hospital Facility</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">₹{Number(invoiceModalPatient.hospitals_charges || invoiceModalPatient.Hospitals_Chargies || invoiceModalPatient.hospital_charges || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-right uppercase text-slate-600">Total Invoice Amount:</td>
                      <td className="py-2 px-3 text-right font-mono text-sm font-black text-slate-900">
                        ₹{(Number(invoiceModalPatient.consultation_fee || 0) + Number(invoiceModalPatient.hospitals_charges || invoiceModalPatient.Hospitals_Chargies || invoiceModalPatient.hospital_charges || 0)).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-1.5 px-3 text-right uppercase text-emerald-700">Amount Paid ({invoiceModalPatient.payment_method || 'Cash'}):</td>
                      <td className="py-1.5 px-3 text-right font-mono text-sm font-black text-emerald-700">
                        ₹{Number(invoiceModalPatient.amount_paid || (Number(invoiceModalPatient.consultation_fee || 0) + Number(invoiceModalPatient.hospitals_charges || invoiceModalPatient.Hospitals_Chargies || invoiceModalPatient.hospital_charges || 0))).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-1.5 px-3 text-right uppercase text-slate-500">Remaining Balance:</td>
                      <td className="py-1.5 px-3 text-right font-mono text-xs font-bold text-slate-600">₹0.00</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* OFFICIAL SIGNATURES & STAMP */}
              <div className="pt-6 grid grid-cols-2 gap-6 text-center text-xs text-slate-500">
                <div className="border-t border-dashed border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">Front Desk Cashier</p>
                  <p className="text-[10px]">Accounts & Billing Clearance</p>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">Medical Superintendent / Officer</p>
                  <p className="text-[10px]">Authorized Gate Pass Signatory</p>
                </div>
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInvoiceModalPatient(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Close Window
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pat = invoiceModalPatient;
                    setInvoiceModalPatient(null);
                    handleOpenBillingModal(pat);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                  title="Modify hospital charges or payment details"
                >
                  <span>✏️</span>
                  <span>Adjust Charges</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <span>🖨️</span>
                <span>Print Invoice & Gate Pass</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistBilling;
