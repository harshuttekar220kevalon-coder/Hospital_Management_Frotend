import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const getFloorNumber = (bed) => {
  if (!bed) return null;
  const num = Number(bed);
  if (isNaN(num) || num <= 0) return null;
  return Math.floor((num - 1) / 100) + 1;
};

const ReceptionistPatientDetails = ({ currentUser, selectedPatient, setSelectedPatient, setCurrentPage }) => {
  const [patientData, setPatientData] = useState(() => {
    if (selectedPatient && selectedPatient.id) return selectedPatient;
    try {
      const saved = localStorage.getItem('selectedPatient');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [doctorsList, setDoctorsList] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [editSelectedFile, setEditSelectedFile] = useState(null);

  // Payment Form State
  const [paymentFormData, setPaymentFormData] = useState({
    amount_paid: '',
    payment_method: 'Cash',
    payment_status: 'Paid',
    hospital_charges: '',
    consultation_fee: ''
  });

  const [editFormData, setEditFormData] = useState({
    patient_id: '',
    name: '',
    age: '',
    gender: '',
    blood_group: '',
    contact: '',
    email: '',
    password: '',
    Password: '',
    address: '',
    hospital: '',
    doctor: '',
    doctor_name: '',
    bed_number: '',
    nurse: '',
    consultation_fee: '',
    Hospitals_Chargies: '',
    amount_paid: '',
    payment_status: '',
    payment_method: '',
    symptoms_diagnosis: '',
    Condation: '',
    status: ''
  });

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (patientData) {
      const docFee = Number(patientData.consultation_fee || 500);
      const hospCharges = Number(patientData.Hospitals_Chargies || patientData.hospital_charges || 1500);
      const total = docFee + hospCharges;

      setEditFormData({
        patient_id: patientData.patient_id || patientData.uhid || `PAT-${patientData.id}`,
        name: patientData.name || '',
        age: patientData.age || '',
        gender: patientData.gender || '',
        blood_group: patientData.blood_group || patientData.Blood_Group || '',
        contact: patientData.contact || patientData.phone || '',
        email: patientData.email || '',
        password: patientData.Password || patientData.password || '',
        Password: patientData.Password || patientData.password || '',
        address: patientData.address || '',
        hospital: typeof patientData.hospital === 'object' ? patientData.hospital?.id : patientData.hospital || '',
        doctor: typeof patientData.doctor === 'object' ? patientData.doctor?.id : patientData.doctor || '',
        doctor_name: patientData.doctor_name || '',
        bed_number: patientData.bed_number || '',
        nurse: typeof patientData.nurse === 'object' ? patientData.nurse?.id : patientData.nurse || '',
        consultation_fee: String(docFee),
        Hospitals_Chargies: String(hospCharges),
        amount_paid: String(patientData.amount_paid || total),
        payment_status: patientData.payment_status || 'Pending',
        payment_method: patientData.payment_method || 'Cash',
        symptoms_diagnosis: patientData.symptoms_diagnosis || patientData.reason_for_visit || '',
        Condation: patientData.Condation || patientData.condition || patientData.symptoms_severity || '',
        status: patientData.status || 'Admitted'
      });

      setPaymentFormData({
        amount_paid: String(patientData.amount_paid || total),
        payment_method: patientData.payment_method || 'Cash',
        payment_status: patientData.payment_status || 'Pending',
        hospital_charges: String(hospCharges),
        consultation_fee: String(docFee)
      });
    }
  }, [patientData]);

  const fetchMetadata = async () => {
    try {
      const [docsRes, hospRes, nurRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Doctors/`),
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`)
      ]);

      if (docsRes.status === 'fulfilled' && docsRes.value.ok) {
        setDoctorsList(await docsRes.value.json().catch(() => []));
      }
      if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
        setHospitalsList(await hospRes.value.json().catch(() => []));
      }
      if (nurRes.status === 'fulfilled' && nurRes.value.ok) {
        setNursesList(await nurRes.value.json().catch(() => []));
      }
    } catch (e) {
      console.error('Error loading metadata:', e);
    }
  };

  const activePatient = patientData;

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name === 'doctor') {
      const selectedDoc = doctorsList.find(d => Number(d.id) === Number(value));
      setEditFormData(prev => ({
        ...prev,
        doctor: value,
        doctor_name: selectedDoc ? selectedDoc.name : prev.doctor_name,
        consultation_fee: selectedDoc?.consultation_fee || prev.consultation_fee
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activePatient || !activePatient.id) return;

    try {
      setLoading(true);
      const selectedDocObj = doctorsList.find(d => Number(d.id) === Number(editFormData.doctor));
      const hospId = Number(editFormData.hospital || activePatient.hospital || currentUser?.hospital || 1);
      const parsedBedNum = editFormData.bed_number ? Number(editFormData.bed_number) : null;
      const chosenCondition = editFormData.Condation || 'Normal';

      const payloadData = {
        patient_id: editFormData.patient_id || activePatient.patient_id || `PAT-${activePatient.id}`,
        name: editFormData.name.trim(),
        contact: editFormData.contact.trim(),
        email: editFormData.email.trim(),
        password: (editFormData.password || editFormData.Password || '').trim(),
        Password: (editFormData.password || editFormData.Password || '').trim(),
        age: editFormData.age ? Number(editFormData.age) : null,
        gender: editFormData.gender,
        blood_group: editFormData.blood_group,
        Blood_Group: editFormData.blood_group,
        address: editFormData.address,
        hospital: hospId,
        doctor: editFormData.doctor ? Number(editFormData.doctor) : null,
        doctor_name: selectedDocObj ? selectedDocObj.name : editFormData.doctor_name,
        doctor_specialization: selectedDocObj ? (selectedDocObj.specialization || selectedDocObj.specialty || '') : '',
        bed_number: parsedBedNum,
        nurse: editFormData.nurse ? Number(editFormData.nurse) : null,
        consultation_fee: Number(editFormData.consultation_fee) || 0.00,
        Hospitals_Chargies: Number(editFormData.Hospitals_Chargies) || 0.00,
        hospital_charges: Number(editFormData.Hospitals_Chargies) || 0.00,
        amount_paid: Number(editFormData.amount_paid) || 0.00,
        payment_status: editFormData.payment_status,
        payment_method: editFormData.payment_method,
        symptoms_diagnosis: editFormData.symptoms_diagnosis || 'General Consultation',
        reason_for_visit: editFormData.symptoms_diagnosis || 'General Consultation',
        Condation: chosenCondition,
        condation: chosenCondition,
        condition: chosenCondition,
        Condition: chosenCondition,
        symptoms_severity: chosenCondition,
        status: editFormData.status
      };

      let response;
      if (editSelectedFile instanceof File) {
        const formData = new FormData();
        Object.keys(payloadData).forEach(key => {
          if (payloadData[key] !== null && payloadData[key] !== undefined) {
            formData.append(key, payloadData[key]);
          }
        });
        formData.append('attached_document', editSelectedFile);

        response = await fetch(`${API_BASE_URL}/super-admin/Patients/${activePatient.id}/`, {
          method: 'PATCH',
          body: formData
        }).catch(() => null);
      } else {
        response = await fetch(`${API_BASE_URL}/super-admin/Patients/${activePatient.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadData)
        }).catch(() => null);
      }

      if (response && response.ok) {
        const updated = await response.json();
        alert(updated.message || 'Patient record updated successfully.');
        setPatientData(updated);
        if (setSelectedPatient) setSelectedPatient(updated);
        localStorage.setItem('selectedPatient', JSON.stringify(updated));
        setEditSelectedFile(null);
        setIsEditModalOpen(false);
      } else {
        alert('Failed to update patient record.');
      }
    } catch (err) {
      console.error('Error updating patient:', err);
      alert(err.message || 'Error updating patient file.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Payment Collection / Billing Submission
  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!activePatient || !activePatient.id) return;

    try {
      setLoading(true);
      const docFee = Number(paymentFormData.consultation_fee) || Number(activePatient.consultation_fee) || 500;
      const hospCharge = Number(paymentFormData.hospital_charges) || Number(activePatient.Hospitals_Chargies) || 1500;
      const totalAmount = docFee + hospCharge;
      const amountPaid = Number(paymentFormData.amount_paid) || totalAmount;

      const payload = {
        consultation_fee: docFee,
        hospital_charges: hospCharge,
        Hospitals_Chargies: hospCharge,
        amount_paid: amountPaid,
        payment_method: paymentFormData.payment_method || 'Cash',
        payment_status: paymentFormData.payment_status || 'Paid'
      };

      const response = await fetch(`${API_BASE_URL}/super-admin/Patients/${activePatient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updated = await response.json();
        alert(`Payment of ₹${amountPaid.toFixed(2)} recorded successfully! Status: ${payload.payment_status}.`);
        setPatientData(updated);
        if (setSelectedPatient) setSelectedPatient(updated);
        localStorage.setItem('selectedPatient', JSON.stringify(updated));
        setIsPaymentModalOpen(false);
      } else {
        alert('Failed to update payment information.');
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Error updating payment.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Patient Discharge Process
  const handleProcessDischarge = async () => {
    if (!activePatient || !activePatient.id) return;

    // VALIDATION: Must be paid before discharge
    if (activePatient.payment_status !== 'Paid') {
      alert('⚠️ Payment Required:\nThe total hospital bill must be paid and marked as "Paid" before this patient can be discharged.\nPlease click "Collect & Pay Bill" first.');
      setIsPaymentModalOpen(true);
      return;
    }

    try {
      setLoading(true);
      const nowIso = new Date().toISOString();

      const dischargePayload = {
        status: 'Discharged',
        discharge_status: 'Discharged',
        discharge_date: nowIso,
        completed_at: nowIso,
        bed_number: null // free the bed upon discharge
      };

      const response = await fetch(`${API_BASE_URL}/super-admin/Patients/${activePatient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dischargePayload)
      });

      if (response.ok) {
        const updated = await response.json();
        alert(`🎉 Success!\nPatient ${activePatient.name} (UHID: ${activePatient.patient_id || `PAT-${activePatient.id}`}) has been successfully discharged.\nBed #${activePatient.bed_number || 'N/A'} is now free.\nThis record is now archived in Discharge & Medical History.`);
        setPatientData(updated);
        if (setSelectedPatient) setSelectedPatient(updated);
        localStorage.setItem('selectedPatient', JSON.stringify(updated));
        setIsDischargeModalOpen(false);
      } else {
        alert('Failed to complete discharge process in backend.');
      }
    } catch (err) {
      console.error('Error processing discharge:', err);
      alert('Error completing discharge.');
    } finally {
      setLoading(false);
    }
  };

  if (!activePatient) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xs font-bold uppercase tracking-wider">
            Patient
          </div>
          <h2 className="text-xl font-bold text-slate-800">No Patient Record Selected</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Please select a patient from the admissions directory to view their complete profile and medical records.
          </p>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('receptionist_patients')}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm cursor-pointer"
          >
            ← Return to Patient Admissions
          </button>
        </div>
      </div>
    );
  }

  const isDischarged = (activePatient.status || '').toLowerCase().includes('discharg');
  const isPaid = (activePatient.payment_status === 'Paid');

  const cond = activePatient.Condation || activePatient.condition || activePatient.symptoms_severity || 'Normal';
  const condColor = cond === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                    cond === 'Emergency' ? 'bg-red-100 text-red-800 border-red-200' :
                    cond === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    'bg-emerald-100 text-emerald-800 border-emerald-200';

  const hospitalObj = hospitalsList.find(h => Number(h.id) === Number(typeof activePatient.hospital === 'object' ? activePatient.hospital?.id : activePatient.hospital));
  const hospDisplayName = hospitalObj ? hospitalObj.Name : (activePatient.hospital_name || 'Apex Care Central Hospital');

  const docFeeVal = Number(activePatient.consultation_fee || 500);
  const hospFeeVal = Number(activePatient.Hospitals_Chargies || activePatient.hospital_charges || 1500);
  const totalBill = docFeeVal + hospFeeVal;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5">
      {/* TOP NAVIGATION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('receptionist_patients')}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Admissions Directory
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* COLLECT / PAY BILL BUTTON */}
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className={`px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 ${
              isPaid
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            <span>💳</span>
            <span>{isPaid ? 'Payment Received (₹' + Number(activePatient.amount_paid || totalBill).toFixed(0) + ')' : 'Collect & Pay Bill'}</span>
          </button>

          {/* DISCHARGE PATIENT BUTTON */}
          {!isDischarged ? (
            <button
              type="button"
              onClick={() => setIsDischargeModalOpen(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 ${
                isPaid
                  ? 'bg-teal-600 hover:bg-teal-700 text-white animate-pulse'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>🏥</span>
              <span>Process Discharge</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold flex items-center gap-1">
              <span>✓</span> Discharged ({new Date(activePatient.discharge_date || activePatient.updated_at || Date.now()).toLocaleDateString('en-IN')})
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition cursor-pointer flex items-center gap-1"
          >
            Edit Record
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1"
          >
            Print Slip
          </button>
        </div>
      </div>

      {/* DISCHARGED ARCHIVED BANNER */}
      {isDischarged && (
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📜</span>
            <div>
              <p className="font-bold">Archived Medical History Record</p>
              <p className="text-[11px] text-purple-700">This patient has been fully discharged. The bed is freed, bill has been cleared, and records are preserved for medical history.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-purple-200 text-purple-900 font-bold text-[10px] uppercase">
            Discharged
          </span>
        </div>
      )}

      {/* PATIENT PROFILE HEADER CARD */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
              {activePatient.name?.slice(0, 2).toUpperCase() || 'PT'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{activePatient.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${condColor}`}>
                  {cond} Priority
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                <span className="font-mono bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700 font-bold">
                  UHID: {activePatient.patient_id || activePatient.uhid || `PAT-${activePatient.id}`}
                </span>
                <span>Age: {activePatient.age || '--'} Yrs</span>
                <span>Gender: {activePatient.gender || 'Male'}</span>
                {activePatient.blood_group && <span className="text-rose-400 font-bold">Blood: {activePatient.blood_group}</span>}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Status</span>
              <span className={`text-xs font-bold ${isDischarged ? 'text-purple-400' : 'text-emerald-400'}`}>
                {activePatient.status || 'Active Inpatient'}
              </span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Bed Allocation</span>
              <span className="text-xs font-bold text-teal-300">
                {activePatient.bed_number ? `Bed #${activePatient.bed_number} (Fl ${getFloorNumber(activePatient.bed_number)})` : (isDischarged ? 'Discharged (Bed Freed)' : 'OPD Consultation')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-COLUMN GRID DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT 2 COLUMNS: CLINICAL & DOCTOR INFO */}
        <div className="lg:col-span-2 space-y-5">
          {/* CONSULTING DOCTOR & WARD STATION */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <span>Consulting Medical Staff & Duty Station</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Attending Doctor</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {activePatient.doctor_name || 'Assigned OPD Specialist'}
                </span>
                <span className="text-xs text-teal-700 font-semibold">
                  {activePatient.doctor_specialization || 'Clinical Consultant'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Designated Station Nurse</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {activePatient.nurse_name || 'Duty Staff Nurse On Station'}
                </span>
                <span className="text-xs text-slate-500">Auto-Assigned based on Bed Floor</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Hospital Campus</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">{hospDisplayName}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Ward & Bed Number</span>
                <span className="text-xs font-bold text-teal-800 block mt-0.5">
                  {activePatient.bed_number ? `Bed #${activePatient.bed_number} (Floor ${getFloorNumber(activePatient.bed_number)})` : (isDischarged ? 'Discharged' : 'General OPD Checkup')}
                </span>
              </div>
            </div>
          </div>

          {/* CLINICAL COMPLAINT & SYMPTOMS */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <span>Reason For Visit / Clinical Diagnosis & Prescription</span>
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-line">
              {activePatient.symptoms_diagnosis || activePatient.reason_for_visit || 'Routine health evaluation recorded upon registration.'}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-slate-500 font-semibold">Triage Priority:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold border ${condColor}`}>
                {cond} Priority
              </span>
            </div>
          </div>

          {/* CONTACT & RESIDENTIAL */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              <span>Patient Contact & Residential Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Contact Phone:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5">{activePatient.contact || activePatient.phone || 'Not provided'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Email Address:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5">{activePatient.email || 'Not provided'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-400 block font-medium">Residential Address:</span>
              <span className="font-semibold text-slate-800 block mt-0.5">{activePatient.address || 'Address not recorded'}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: BILLING & PAYMENT & DISCHARGE */}
        <div className="space-y-5">
          {/* ITEMISED BILLING & INVOICE CARD */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Billing & Discharge Invoicing
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {activePatient.payment_status || 'Pending'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Doctor Consultation Fee:</span>
                <span className="font-bold text-slate-800">
                  ₹{docFeeVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Hospital Facility / Bed Care:</span>
                <span className="font-bold text-slate-800">
                  ₹{hospFeeVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-slate-900">
                <span>Total Calculated Bill:</span>
                <span className="text-teal-700 font-extrabold text-base">
                  ₹{totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span>Amount Paid:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  ₹{Number(activePatient.amount_paid || (isPaid ? totalBill : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Payment Mode:</span>
                <span className="font-bold text-slate-800">{activePatient.payment_method || 'Cash'}</span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>💳</span>
                <span>{isPaid ? 'Edit Payment Details' : 'Collect & Record Payment'}</span>
              </button>

              {!isDischarged && (
                <button
                  type="button"
                  onClick={handleProcessDischarge}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    isPaid
                      ? 'bg-teal-600 hover:bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>🏥</span>
                  <span>{isPaid ? 'Discharge Patient Now' : 'Pay Bill First to Discharge'}</span>
                </button>
              )}
            </div>
          </div>

          {/* ATTACHED DOCUMENTS */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              <span>Attached Medical Documents</span>
            </h3>

            {activePatient.attached_document ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 truncate max-w-[170px]">
                  {String(activePatient.attached_document).split('/').pop()}
                </span>
                <a
                  href={String(activePatient.attached_document).startsWith('http') ? activePatient.attached_document : `${API_BASE_URL.replace('/api', '')}${activePatient.attached_document}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold"
                >
                  View File
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2">No documents attached to this patient file.</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: COLLECT PAYMENT */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Collect Hospital Bill & Payment</h3>
                <p className="text-xs text-slate-300">{activePatient.name} • UHID: {activePatient.patient_id || activePatient.uhid}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase">Doctor Fee (₹)</label>
                    <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">Doctor Set</span>
                  </div>
                  <input
                    type="number"
                    value={paymentFormData.consultation_fee}
                    disabled
                    readOnly
                    title="Doctor consultation fee is fixed by the doctor and cannot be modified"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Bed / Facility (₹)</label>
                  <input
                    type="number"
                    value={paymentFormData.hospital_charges}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, hospital_charges: e.target.value })}
                    placeholder="e.g. 1500"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs text-emerald-950 font-bold">
                <span>Calculated Total:</span>
                <span className="text-base font-extrabold text-emerald-800">
                  ₹{(Number(paymentFormData.consultation_fee || 0) + Number(paymentFormData.hospital_charges || 0)).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  value={paymentFormData.amount_paid}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount_paid: e.target.value })}
                  placeholder="Enter amount collected"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentFormData.payment_method}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  >
                    <option value="">-- Select Payment Method --</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Insurance">Insurance / TPA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Status</label>
                  <select
                    value={paymentFormData.payment_status}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-emerald-700"
                  >
                    <option value="">-- Select Payment Status --</option>
                    <option value="Paid">Paid (Bill Cleared)</option>
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save & Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISCHARGE CONFIRMATION */}
      {isDischargeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 bg-teal-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Confirm Patient Discharge</h3>
              <button
                type="button"
                onClick={() => setIsDischargeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-teal-800 hover:bg-teal-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900 text-sm">{activePatient.name}</p>
                <p className="text-slate-500">UHID: {activePatient.patient_id || activePatient.uhid} • Bed #{activePatient.bed_number || 'N/A'}</p>
                <p className="text-emerald-700 font-bold pt-1">✓ Payment Verified: ₹{Number(activePatient.amount_paid || totalBill).toFixed(2)} (Paid)</p>
              </div>

              <p className="leading-relaxed">
                By discharging this patient:
                <br />• The allocated bed (#{activePatient.bed_number || 'N/A'}) will be freed up for new admissions.
                <br />• The discharge date & timestamp will be officially recorded.
                <br />• This file will be moved to the <strong>Medical Discharge & History Archive</strong> visible to Receptionists, Admins, and Super Admins.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDischargeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessDischarge}
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Discharging...' : 'Confirm Final Discharge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CLINICAL FILE */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Edit Patient Clinical File</h3>
                <p className="text-xs text-slate-300">{activePatient.name} • UHID: {activePatient.patient_id || activePatient.uhid}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Patient Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditChange}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contact Number</label>
                  <input
                    type="text"
                    name="contact"
                    value={editFormData.contact}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditChange}
                    placeholder="patient@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Portal Password</label>
                  <input
                    type="password"
                    name="password"
                    value={editFormData.password || editFormData.Password || ''}
                    onChange={handleEditChange}
                    placeholder="Set / update portal password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={editFormData.age}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Gender</label>
                  <select
                    name="gender"
                    value={editFormData.gender}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Blood Group</label>
                  <select
                    name="blood_group"
                    value={editFormData.blood_group}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  >
                    <option value="">-- Select Blood Group --</option>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DOCTOR & BED */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Consulting Doctor</label>
                  <select
                    name="doctor"
                    value={editFormData.doctor}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  >
                    <option value="">-- Select Doctor --</option>
                    {doctorsList.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialization || 'General'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Bed Number</label>
                  <input
                    type="number"
                    name="bed_number"
                    value={editFormData.bed_number}
                    onChange={handleEditChange}
                    placeholder="Leave empty for OPD"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* CONDITION & STATUS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Condition Severity</label>
                  <select
                    name="Condation"
                    value={editFormData.Condation}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  >
                    <option value="">-- Select Condition --</option>
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status</label>
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  >
                    <option value="">-- Select Status --</option>
                    <option value="Admitted">Admitted</option>
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Discharged">Discharged</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Symptoms / Notes</label>
                <textarea
                  name="symptoms_diagnosis"
                  rows={2}
                  value={editFormData.symptoms_diagnosis}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistPatientDetails;
