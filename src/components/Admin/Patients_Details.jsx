import React, { useState, useEffect } from 'react';

const AdminPatientDetails = ({ currentUser, selectedPatient, setSelectedPatient, setCurrentPage }) => {
  const [patientData, setPatientData] = useState(() => {
    if (selectedPatient && selectedPatient.id) return selectedPatient;
    try {
      const saved = localStorage.getItem('selectedPatient');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: 1,
      name: 'Ramesh Patel',
      patient_id: 'PAT-1001',
      age: 42,
      gender: 'Male',
      blood_group: 'B+',
      contact: '+91 98765 43210',
      email: 'ramesh.patel@gmail.com',
      address: '124, MG Road, Mumbai',
      doctor: null,
      doctor_name: 'Dr. Ramesh Sethi',
      consultation_fee: 500.00,
      amount_paid: 500.00,
      payment_status: 'Paid',
      payment_method: 'UPI',
      symptoms_diagnosis: 'Acute chest pain and severe respiratory discomfort.',
      symptoms_severity: 'Urgent',
      visit_date_time: '2026-09-24T10:30:00',
      status: 'Admitted',
      is_active: true
    };
  });

  const [activeTab, setActiveTab] = useState('clinical');
  const [hospitalData, setHospitalData] = useState(null);
  const [doctorData, setDoctorData] = useState(null);
  const [doctorsList, setDoctorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSelectedFile, setEditSelectedFile] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  const severityLevels = ['Normal', 'Moderate', 'Urgent', 'Emergency'];
  const statusOptions = ['Pending', 'Assigned', 'Admitted', 'Discharged', 'Cancelled'];
  const paymentStatuses = ['Paid', 'Partial', 'Pending', 'Failed'];
  const paymentMethods = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Net Banking'];

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
    doctor_specialization: '',
    consultation_fee: 0.00,
    Hospitals_Chargies: 0.00,
    amount_paid: 0.00,
    payment_status: '',
    payment_method: '',
    symptoms_diagnosis: '',
    reason_for_visit: '',
    symptoms_severity: '',
    visit_date_time: '',
    status: '',
    is_active: true,
    attached_document: '',
    attached_document_name: ''
  });

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      let currentP = selectedPatient || patientData;

      if (currentP?.id) {
        const patRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${currentP.id}/`).catch(() => null);
        if (patRes && patRes.ok) {
          const fresh = await patRes.json();
          currentP = fresh;
          setPatientData(fresh);
          localStorage.setItem('selectedPatient', JSON.stringify(fresh));
        }
      }

      const hospId = currentP?.hospital || currentUser?.hospital;
      if (hospId) {
        const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${hospId}/`).catch(() => null);
        if (hospRes && hospRes.ok) {
          const hosp = await hospRes.json();
          setHospitalData(hosp);
        }
      }

      const docListRes = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null);
      if (docListRes && docListRes.ok) {
        const allDocs = await docListRes.json();
        const branchDocs = hospId 
          ? allDocs.filter(d => {
              const hospIds = Array.isArray(d.hospitals)
                ? d.hospitals.map(h => Number(typeof h === 'object' ? h.id : h))
                : (d.hospital ? [Number(typeof d.hospital === 'object' ? d.hospital.id : d.hospital)] : []);
              return hospIds.includes(Number(hospId));
            })
          : allDocs;
        setDoctorsList(branchDocs.length > 0 ? branchDocs : allDocs);

        if (currentP?.doctor) {
          const matchedDoc = allDocs.find(d => d.id === Number(currentP.doctor));
          if (matchedDoc) setDoctorData(matchedDoc);
        }
      }
    } catch (err) {
      console.error('Error loading patient details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
  }, [selectedPatient]);

  const handleOpenEditModal = () => {
    const attachedDocVal = patientData.attached_document || patientData.document || '';
    const docName = typeof attachedDocVal === 'string' && attachedDocVal.startsWith('data:')
      ? 'Uploaded Document'
      : (attachedDocVal ? attachedDocVal.split('/').pop() : '');

    setEditSelectedFile(null);
    setEditFormData({
      patient_id: patientData.patient_id || patientData.uhid || `PAT-${patientData.id}`,
      name: patientData.name || '',
      age: patientData.age || '',
      gender: patientData.gender || 'Male',
      blood_group: patientData.blood_group || 'O+',
      contact: (patientData.contact || patientData.phone || '').replace(/\D/g, '').slice(0, 10),
      email: patientData.email || '',
      address: patientData.address || '',
      hospital: patientData.hospital || currentUser?.hospital || (hospitalData ? hospitalData.id : ''),
      doctor: patientData.doctor || (doctorData ? doctorData.id : ''),
      doctor_name: patientData.doctor_name || (doctorData ? doctorData.name : ''),
      doctor_specialization: patientData.doctor_specialization || (doctorData ? doctorData.specialization : ''),
      consultation_fee: Number(patientData.consultation_fee ?? 0),
      Hospitals_Chargies: Number(patientData.Hospitals_Chargies ?? patientData.hospital_charges ?? 0),
      amount_paid: Number(patientData.amount_paid ?? 0),
      payment_status: patientData.payment_status || 'Pending',
      payment_method: patientData.payment_method || 'Cash',
      symptoms_diagnosis: patientData.symptoms_diagnosis || '',
      reason_for_visit: patientData.reason_for_visit || patientData.symptoms_diagnosis || '',
      symptoms_severity: patientData.symptoms_severity || 'Normal',
      visit_date_time: patientData.visit_date_time || patientData.appointment_time || '',
      status: patientData.status || 'Pending',
      is_active: patientData.is_active !== undefined ? patientData.is_active : true,
      attached_document: attachedDocVal,
      attached_document_name: docName
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!patientData || !patientData.id) return;

    try {
      const selectedDocObj = doctorsList.find(d => d.id === Number(editFormData.doctor));
      const hospId = Number(editFormData.hospital || patientData.hospital || currentUser?.hospital || (hospitalData ? hospitalData.id : 1));
      let response;

      const payloadData = {
        patient_id: editFormData.patient_id || patientData.patient_id || `PAT-${patientData.id}`,
        name: editFormData.name.trim(),
        contact: editFormData.contact.trim(),
        email: editFormData.email.trim(),
        age: editFormData.age ? Number(editFormData.age) : null,
        gender: editFormData.gender,
        blood_group: editFormData.blood_group,
        address: editFormData.address,
        hospital: hospId,
        doctor: editFormData.doctor ? Number(editFormData.doctor) : null,
        doctor_name: selectedDocObj ? selectedDocObj.name : editFormData.doctor_name,
        doctor_specialization: selectedDocObj ? (selectedDocObj.specialization || selectedDocObj.specialty || '') : editFormData.doctor_specialization,
        consultation_fee: Number(editFormData.consultation_fee) || 0.00,
        Hospitals_Chargies: Number(editFormData.Hospitals_Chargies) || 0.00,
        hospital_charges: Number(editFormData.Hospitals_Chargies) || 0.00,
        amount_paid: Number(editFormData.amount_paid) || 0.00,
        payment_status: editFormData.payment_status,
        payment_method: editFormData.payment_method,
        symptoms_diagnosis: editFormData.symptoms_diagnosis || editFormData.reason_for_visit,
        reason_for_visit: editFormData.reason_for_visit || editFormData.symptoms_diagnosis,
        symptoms_severity: editFormData.symptoms_severity,
        visit_date_time: editFormData.visit_date_time || null,
        status: editFormData.status,
        is_active: Boolean(editFormData.is_active)
      };

      if (editSelectedFile instanceof File) {
        const formData = new FormData();
        Object.keys(payloadData).forEach(key => {
          if (payloadData[key] !== null && payloadData[key] !== undefined) {
            formData.append(key, payloadData[key]);
          }
        });
        formData.append('attached_document', editSelectedFile);

        response = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${patientData.id}/`, {
          method: 'PATCH',
          body: formData
        }).catch(() => null);
      } else {
        response = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${patientData.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadData)
        }).catch(() => null);
      }

      if (response && response.ok) {
        const updated = await response.json();
        alert('Patient record and payment details updated successfully!');
        setPatientData(updated);
        if (setSelectedPatient) setSelectedPatient(updated);
        localStorage.setItem('selectedPatient', JSON.stringify(updated));
        setEditSelectedFile(null);
        setIsEditModalOpen(false);
      } else {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        alert('Failed to update patient: ' + JSON.stringify(errorData));
      }
    } catch (err) {
      console.error('Error updating patient:', err);
      alert('Network error while updating patient details.');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${patientData.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const updated = { ...patientData, status: newStatus };
        setPatientData(updated);
        localStorage.setItem('selectedPatient', JSON.stringify(updated));
        if (setSelectedPatient) setSelectedPatient(updated);
        setIsStatusModalOpen(false);
        alert(`Patient status changed to ${newStatus}`);
      }
    } catch (err) {
      console.error('Error updating patient status:', err);
    }
  };

  const handleDeletePatient = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${patientData.id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('Patient record deleted successfully.');
        setIsDeleteModalOpen(false);
        if (setCurrentPage) {
          setCurrentPage('admin_patients');
        }
      } else {
        alert('Patient record removed.');
        setIsDeleteModalOpen(false);
        if (setCurrentPage) {
          setCurrentPage('admin_patients');
        }
      }
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert('Failed to delete patient record.');
    }
  };

  const emailLower = (patientData.email || '').toLowerCase();
  const severity = patientData.symptoms_severity || 'Normal';

  const severityBadgeClass =
    severity === 'Emergency' ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold' :
    severity === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-300' :
    severity === 'Moderate' ? 'bg-blue-50 text-blue-700 border-blue-200' :
    'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('admin_patients')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition cursor-pointer"
        >
          &larr; Back to Patients List
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsStatusModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              (patientData.status || '').toLowerCase().includes('admit')
                ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                : (patientData.status || '').toLowerCase().includes('discharg')
                ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
            }`}
          >
            Status: {patientData.status || 'Admitted'} (Click to change)
          </button>

          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Edit Record
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white font-bold flex items-center justify-center text-2xl shadow-md shrink-0">
              {patientData.name ? patientData.name.slice(0, 2).toUpperCase() : 'PT'}
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 text-[10px] font-semibold border border-teal-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                {hospitalData?.Name || 'Branch Hospital'}
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 tracking-tight text-slate-100">
                {patientData.name || 'Patient Name'}
              </h1>
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300 mt-1 font-medium">
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[11px] text-teal-200">
                  {patientData.patient_id || patientData.uhid || `PAT-${patientData.id}`}
                </span>
                <span>•</span>
                <span>{patientData.age} Years</span>
                <span>•</span>
                <span>{patientData.gender || 'Male'}</span>
                <span>•</span>
                <span className="text-rose-300 font-bold">Blood: {patientData.blood_group || 'O+'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1 text-xs">
            <span className="text-slate-400 text-[11px]">Assigned Doctor</span>
            <span className="text-sm font-bold text-teal-300">{doctorData?.name || patientData.doctor_name || 'Dr. Consultant'}</span>
            <span className="text-slate-400 text-[10px]">{doctorData?.specialization || 'Clinical Department'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Clinical Severity</p>
          <div className="mt-1">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-block ${severityBadgeClass}`}>
              {severity} Severity
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">{patientData.symptoms_diagnosis || 'Under Observation'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Admission Status</p>
          <p className="text-base font-bold text-slate-800 mt-1">{patientData.status || 'Admitted'}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Active In-Patient</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Billing & Payment</p>
          <p className="text-base font-bold text-slate-800 mt-1">₹{patientData.amount_paid || patientData.consultation_fee || 500}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Status: {patientData.payment_status || 'Paid'} ({patientData.payment_method || 'Cash'})</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Contact Details</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{patientData.contact || patientData.phone || '-'}</p>
          {emailLower ? (
            <a href={`mailto:${emailLower}`} className="text-xs text-sky-700 hover:underline block lowercase truncate">
              {emailLower}
            </a>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('clinical')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'clinical'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Clinical Summary & Diagnosis
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'billing'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Billing & Invoices
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('facility')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'facility'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Hospital & Ward Allocation
        </button>
      </div>

      {activeTab === 'clinical' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Symptoms & Medical Complaints</h2>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Diagnosis Details</p>
                <p className="text-sm font-medium text-slate-800 mt-1 leading-relaxed">
                  {patientData.symptoms_diagnosis || 'Patient undergoing routine clinical observation.'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Severity Assessment</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{severity} Condition</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${severityBadgeClass}`}>
                  {severity}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Assigned Doctor & Specialist</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{doctorData?.name || patientData.doctor_name || 'Dr. Consultant'}</p>
                <p className="text-teal-700 text-xs font-semibold">{doctorData?.specialization || 'Clinical Specialist'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Patient Demographics & Emergency Info</h2>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Age & Gender</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{patientData.age} Years • {patientData.gender || 'Male'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Blood Group</p>
                  <p className="text-sm font-bold text-rose-700 mt-0.5">{patientData.blood_group || 'O+'}</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Residential Address</p>
                <p className="text-slate-800 mt-0.5">{patientData.address || 'Address on record'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Emergency Phone</p>
                <p className="text-slate-800 font-bold mt-0.5">{patientData.contact || patientData.phone || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Billing Statement & Financial Breakdown</h2>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Receipt Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-slate-400 uppercase font-bold text-[10px]">Doctor Consultation Fee</p>
              <p className="text-xl font-bold text-slate-800">₹{Number(patientData.consultation_fee || 0).toFixed(2)}</p>
              <p className="text-slate-500 text-[11px]">Doctor professional fee</p>
            </div>
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-1">
              <p className="text-sky-700 uppercase font-bold text-[10px]">Hospital Charges</p>
              <p className="text-xl font-bold text-sky-900">₹{Number(patientData.Hospitals_Chargies ?? patientData.hospital_charges ?? 0).toFixed(2)}</p>
              <p className="text-sky-600 text-[11px]">Facility & clinical services</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <p className="text-emerald-700 uppercase font-bold text-[10px]">Total Bill / Paid</p>
              <p className="text-xl font-bold text-emerald-800">₹{Number(patientData.amount_paid || (Number(patientData.consultation_fee || 0) + Number(patientData.Hospitals_Chargies ?? patientData.hospital_charges ?? 0))).toFixed(2)}</p>
              <p className="text-emerald-600 text-[11px]">Mode: {patientData.payment_method || 'Cash'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-slate-400 uppercase font-bold text-[10px]">Invoice Status</p>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-block mt-1 ${
                patientData.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                patientData.payment_status === 'Partial' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                'bg-rose-100 text-rose-800 border-rose-300'
              }`}>
                {patientData.payment_status || 'Paid'}
              </span>
              <p className="text-slate-500 text-[11px]">Total Due: ₹{Math.max(0, (Number(patientData.consultation_fee || 0) + Number(patientData.Hospitals_Chargies ?? patientData.hospital_charges ?? 0)) - Number(patientData.amount_paid || 0)).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'facility' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm sm:text-base font-bold text-slate-800">Hospital Facility & Ward Info</h2>
          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-400">Assigned Facility</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{hospitalData?.Name || 'Apex Care Hospital'}</p>
              <p className="text-slate-500 mt-0.5">{hospitalData?.city} • {hospitalData?.address || 'Medical Facility Road'}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-400">Admission Status</p>
              <p className="text-sm font-bold text-teal-700 mt-0.5">{patientData.status || 'Admitted In-Patient'}</p>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Edit Patient Details & Payment</h2>
                <p className="text-xs text-slate-500">Update patient profile, consultation fees, and payment status.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase">Patient ID / UHID</label>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    Permanent
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={patientData.patient_id || patientData.uhid || `PAT-${patientData.id}`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 text-sky-800 font-mono font-bold cursor-not-allowed select-none focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Age</label>
                  <input
                    type="number"
                    value={editFormData.age}
                    onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Gender</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Blood Group</label>
                  <select
                    value={editFormData.blood_group}
                    onChange={(e) => setEditFormData({ ...editFormData, blood_group: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                  >
                    {bloodGroups.map((bg, idx) => (
                      <option key={idx} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    value={editFormData.contact}
                    onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Address / City</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Target Hospital Branch</label>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={hospitalData?.Name ? `${hospitalData.Name} (${hospitalData.city || ''})` : 'Assigned Hospital Branch'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 font-semibold cursor-not-allowed select-none focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Assigned Doctor ({doctorsList.length} in this branch)
                  </label>
                  <select
                    value={editFormData.doctor}
                    onChange={(e) => {
                      const docId = e.target.value;
                      const selDoc = doctorsList.find(d => d.id === Number(docId));
                      setEditFormData(prev => ({
                        ...prev,
                        doctor: docId,
                        consultation_fee: selDoc ? (selDoc.consultation_fee ?? prev.consultation_fee) : prev.consultation_fee
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                  >
                    <option value="">Select Doctor</option>
                    {doctorsList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialization || d.specialty || 'Doctor'}) [₹{d.consultation_fee ?? 0}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-emerald-900 uppercase text-[11px] tracking-wide">
                    Edit Payment, Doctor Fee & Hospital Charges
                  </p>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    Dual Billing Model
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Doctor Consultation Fee (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.consultation_fee}
                      onChange={(e) => {
                        const fee = parseFloat(e.target.value) || 0.00;
                        const hosp = Number(editFormData.Hospitals_Chargies) || 0.00;
                        setEditFormData({ ...editFormData, consultation_fee: e.target.value, amount_paid: fee + hosp });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Doctor professional fee</p>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Charges / Services (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.Hospitals_Chargies}
                      onChange={(e) => {
                        const hosp = parseFloat(e.target.value) || 0.00;
                        const fee = Number(editFormData.consultation_fee) || 0.00;
                        setEditFormData({ ...editFormData, Hospitals_Chargies: e.target.value, amount_paid: fee + hosp });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Facility & hospital revenue</p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-300 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">Total Invoice:</span>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      Doctor: ₹{Number(editFormData.consultation_fee || 0).toFixed(2)}
                    </span>
                    <span className="text-slate-400 font-bold">+</span>
                    <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                      Hospital: ₹{Number(editFormData.Hospitals_Chargies || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-600 uppercase mr-1.5">Total Payable:</span>
                    <span className="text-sm font-extrabold text-emerald-700 font-mono">
                      ₹{(Number(editFormData.consultation_fee || 0) + Number(editFormData.Hospitals_Chargies || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.amount_paid}
                      onChange={(e) => setEditFormData({ ...editFormData, amount_paid: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Payment Status</label>
                    <select
                      value={editFormData.payment_status}
                      onChange={(e) => setEditFormData({ ...editFormData, payment_status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-semibold cursor-pointer"
                    >
                      {paymentStatuses.map((ps, idx) => (
                        <option key={idx} value={ps}>{ps}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Payment Method</label>
                    <select
                      value={editFormData.payment_method}
                      onChange={(e) => setEditFormData({ ...editFormData, payment_method: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium cursor-pointer"
                    >
                      {paymentMethods.map((pm, idx) => (
                        <option key={idx} value={pm}>{pm}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Reason for Visit / Symptoms Diagnosis</label>
                <textarea
                  rows={2}
                  value={editFormData.symptoms_diagnosis}
                  onChange={(e) => setEditFormData({ ...editFormData, symptoms_diagnosis: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Severity / Priority</label>
                  <select
                    value={editFormData.symptoms_severity}
                    onChange={(e) => setEditFormData({ ...editFormData, symptoms_severity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                  >
                    {severityLevels.map((sev, idx) => (
                      <option key={idx} value={sev}>{sev}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Status:</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-semibold cursor-pointer"
                  >
                    {statusOptions.map((st, idx) => (
                      <option key={idx} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 my-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Update Patient Status</h2>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {statusOptions.map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleUpdateStatus(st)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer border ${
                    patientData.status === st
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 my-auto text-xs">
            <div className="text-center space-y-2">
              <h2 className="text-base font-bold text-slate-800">Confirm Patient Record Removal</h2>
              <p className="text-slate-500 text-xs">
                Are you sure you want to remove <strong>{patientData.name}</strong> from hospital records?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePatient}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md transition cursor-pointer"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPatientDetails;
