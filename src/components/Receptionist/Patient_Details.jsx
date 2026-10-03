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
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusUpdateValue, setStatusUpdateValue] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [editSelectedFile, setEditSelectedFile] = useState(null);

  const [editFormData, setEditFormData] = useState({
    patient_id: '',
    name: '',
    age: '',
    gender: 'Male',
    blood_group: '',
    contact: '',
    email: '',
    address: '',
    hospital: '',
    doctor: '',
    doctor_name: '',
    bed_number: '',
    nurse: '',
    consultation_fee: '',
    Hospitals_Chargies: '',
    amount_paid: '',
    payment_status: 'Paid',
    payment_method: 'Cash',
    symptoms_diagnosis: '',
    Condation: 'Normal',
    status: 'Admitted'
  });

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (patientData) {
      setEditFormData({
        patient_id: patientData.patient_id || patientData.uhid || `PAT-${patientData.id}`,
        name: patientData.name || '',
        age: patientData.age || '',
        gender: patientData.gender || 'Male',
        blood_group: patientData.blood_group || patientData.Blood_Group || '',
        contact: patientData.contact || patientData.phone || '',
        email: patientData.email || '',
        address: patientData.address || '',
        hospital: typeof patientData.hospital === 'object' ? patientData.hospital?.id : patientData.hospital || '',
        doctor: typeof patientData.doctor === 'object' ? patientData.doctor?.id : patientData.doctor || '',
        doctor_name: patientData.doctor_name || '',
        bed_number: patientData.bed_number || '',
        nurse: typeof patientData.nurse === 'object' ? patientData.nurse?.id : patientData.nurse || '',
        consultation_fee: patientData.consultation_fee || '500',
        Hospitals_Chargies: patientData.Hospitals_Chargies || patientData.hospital_charges || '1500',
        amount_paid: patientData.amount_paid || '2000',
        payment_status: patientData.payment_status || 'Paid',
        payment_method: patientData.payment_method || 'Cash',
        symptoms_diagnosis: patientData.symptoms_diagnosis || patientData.reason_for_visit || '',
        Condation: patientData.Condation || patientData.condition || patientData.symptoms_severity || 'Normal',
        status: patientData.status || 'Admitted'
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
        alert(updated.message || 'Patient clinical file updated successfully.');
        setPatientData(updated);
        if (setSelectedPatient) setSelectedPatient(updated);
        localStorage.setItem('selectedPatient', JSON.stringify(updated));
        setEditSelectedFile(null);
        setIsEditModalOpen(false);
      } else {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        let errMsg = errorData.message || errorData.detail || errorData.error;
        if (!errMsg && typeof errorData === 'object') {
          errMsg = Object.entries(errorData)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : v)}`)
            .join('\n');
        }
        alert(errMsg || 'Failed to update patient record.');
      }
    } catch (err) {
      console.error('Error updating patient:', err);
      alert(err.message || 'Error updating patient file.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!activePatient || !activePatient.id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/Patients/${activePatient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusUpdateValue,
          symptoms_diagnosis: statusRemarks || activePatient.symptoms_diagnosis
        })
      });

      if (response.ok) {
        const updated = await response.json();
        alert(updated.message || `Patient status updated to ${statusUpdateValue} successfully.`);
        setPatientData(updated);
        if (setSelectedPatient) setSelectedPatient(updated);
        localStorage.setItem('selectedPatient', JSON.stringify(updated));
        setIsStatusModalOpen(false);
      } else {
        alert('Failed to update patient status.');
      }
    } catch (err) {
      console.error('Error saving status:', err);
      alert('Error updating status.');
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

  const cond = activePatient.Condation || activePatient.condition || activePatient.symptoms_severity || 'Normal';
  const condColor = cond === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                    cond === 'Emergency' ? 'bg-red-100 text-red-800 border-red-200' :
                    cond === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    'bg-emerald-100 text-emerald-800 border-emerald-200';

  const hospitalObj = hospitalsList.find(h => Number(h.id) === Number(typeof activePatient.hospital === 'object' ? activePatient.hospital?.id : activePatient.hospital));
  const hospDisplayName = hospitalObj ? hospitalObj.Name : (activePatient.hospital_name || 'Apex Care Central Hospital');

  const totalBill = Number(activePatient.consultation_fee || 0) + Number(activePatient.Hospitals_Chargies || activePatient.hospital_charges || 0);

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
          Back to Patient Admissions
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStatusUpdateValue(activePatient.status || 'Admitted');
              setStatusRemarks(activePatient.symptoms_diagnosis || '');
              setIsStatusModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition cursor-pointer"
          >
            Update Status ({activePatient.status || 'Admitted'})
          </button>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Patient Record
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            Print Slip
          </button>
        </div>
      </div>

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
                  {cond} Condition
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
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Admission Status</span>
              <span className="text-xs font-bold text-emerald-400">{activePatient.status || 'Confirmed Admitted'}</span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Bed Allocation</span>
              <span className="text-xs font-bold text-teal-300">
                {activePatient.bed_number ? `Bed #${activePatient.bed_number} (Fl ${getFloorNumber(activePatient.bed_number)})` : 'OPD Consultation'}
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
              <span>Consulting Medical Staff & Bed Station</span>
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
                <span className="text-xs text-slate-500">Inpatient Care Team</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Hospital Campus</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">{hospDisplayName}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Ward & Bed Allocation</span>
                <span className="text-xs font-bold text-teal-800 block mt-0.5">
                  {activePatient.bed_number ? `Bed #${activePatient.bed_number} (Floor ${getFloorNumber(activePatient.bed_number)})` : 'General OPD'}
                </span>
              </div>
            </div>
          </div>

          {/* CLINICAL COMPLAINT & SYMPTOMS */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <span>Reason For Visit / Clinical Diagnosis</span>
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium">
              {activePatient.symptoms_diagnosis || activePatient.reason_for_visit || 'No specific symptoms recorded upon registration.'}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-slate-500 font-semibold">Triage Severity:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold border ${condColor}`}>
                {cond} Priority
              </span>
            </div>
          </div>

          {/* CONTACT & PERSONAL INFORMATION */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              <span>Patient Contact & Residential Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Phone Number:</span>
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

        {/* RIGHT COLUMN: BILLING, PAYMENT & DOCUMENTS */}
        <div className="space-y-5">
          {/* BILLING SUMMARY CARD */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
              <span>Billing & Invoicing</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                activePatient.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {activePatient.payment_status || 'Paid'}
              </span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Doctor Consultation Fee:</span>
                <span className="font-bold text-slate-800">
                  ₹{Number(activePatient.consultation_fee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Hospital Facility / Bed:</span>
                <span className="font-bold text-slate-800">
                  ₹{Number(activePatient.Hospitals_Chargies || activePatient.hospital_charges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-slate-900">
                <span>Total Invoice:</span>
                <span className="text-teal-700">
                  ₹{Number(totalBill).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span>Amount Received:</span>
                <span className="font-bold text-emerald-700">
                  ₹{Number(activePatient.amount_paid || totalBill).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Payment Mode:</span>
                <span className="font-bold text-slate-800">{activePatient.payment_method || 'Cash'}</span>
              </div>
            </div>
          </div>

          {/* ATTACHED DOCUMENTS */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              <span>Medical Documents & Files</span>
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

      {/* MODAL: EDIT PATIENT RECORD */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
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
                    <option value="">Select Doctor</option>
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

      {/* MODAL: UPDATE STATUS */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Update Admission Status</h3>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Target Status</label>
                <select
                  value={statusUpdateValue}
                  onChange={(e) => setStatusUpdateValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                >
                  <option value="Admitted">Admitted</option>
                  <option value="Discharged">Discharged</option>
                  <option value="Pending">Pending / Triage</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status Remarks</label>
                <textarea
                  rows={2}
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="Optional remarks about patient status..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistPatientDetails;
