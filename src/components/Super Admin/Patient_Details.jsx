import React, { useState, useEffect } from 'react';

const Patient_Details = ({ currentUser, selectedPatient, setSelectedPatient, setCurrentPage }) => {
  const [patientData, setPatientData] = useState(() => {
    if (selectedPatient) return selectedPatient;
    try {
      const saved = localStorage.getItem('selectedPatient');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [hospitalsList, setHospitalsList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [isDataFetching, setIsDataFetching] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSelectedFile, setEditSelectedFile] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusUpdateValue, setStatusUpdateValue] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');

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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const loadPatientAndRelatedData = async () => {
    setIsDataFetching(true);
    try {
      let currentPat = selectedPatient || patientData;
      if (!currentPat || !currentPat.id) {
        const saved = localStorage.getItem('selectedPatient');
        if (saved) {
          currentPat = JSON.parse(saved);
          setPatientData(currentPat);
        }
      }

      // Fetch hospitals
      const hospRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/').catch(() => null);
      if (hospRes && hospRes.ok) {
        const hospData = await hospRes.json();
        setHospitalsList(hospData);
      }

      // Fetch doctors
      const docRes = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null);
      if (docRes && docRes.ok) {
        const docData = await docRes.json();
        setDoctorsList(docData);
      }

      // Fetch admins
      const adminRes = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/').catch(() => null);
      if (adminRes && adminRes.ok) {
        const adminData = await adminRes.json();
        setAdminsList(adminData);
      }

      // Fetch fresh patient data from backend
      if (currentPat && currentPat.id) {
        const patRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${currentPat.id}/`).catch(() => null);
        if (patRes && patRes.ok) {
          const freshPat = await patRes.json();
          setPatientData(freshPat);
          if (setSelectedPatient) setSelectedPatient(freshPat);
          localStorage.setItem('selectedPatient', JSON.stringify(freshPat));
        }
      }
    } catch (err) {
      console.error('Error fetching patient details:', err);
    } finally {
      setIsDataFetching(false);
    }
  };

  useEffect(() => {
    loadPatientAndRelatedData();
  }, [selectedPatient?.id]);

  const activePatient = patientData || {};
  const assignedHospital = hospitalsList.find(h => h.id === Number(activePatient.hospital));
  const assignedDoctor = doctorsList.find(d => d.id === Number(activePatient.doctor)) || 
                         doctorsList.find(d => (d.name || '').toLowerCase() === (activePatient.doctor_name || '').toLowerCase());
  const assignedAdmin = adminsList.find(a => a.hospital === Number(activePatient.hospital));

  const displayName = activePatient.name || 'Patient';
  const displayId = activePatient.patient_id || activePatient.uhid || `PAT-${activePatient.id}`;
  const displayPhone = activePatient.contact || activePatient.phone || '-';
  const displayDoctor = assignedDoctor ? assignedDoctor.name : (activePatient.doctor_name || 'Dr. Assigned');
  const displayHospital = assignedHospital ? assignedHospital.Name : (activePatient.hospital_name || 'Branch Hospital');
  const attachedDocVal = activePatient.attached_document || activePatient.document || '';

  const docFee = Number(activePatient.consultation_fee ?? 0);
  const hospCharge = Number(activePatient.Hospitals_Chargies ?? activePatient.hospital_charges ?? 0);
  const totalBill = docFee + hospCharge;
  const amountPaid = Number(activePatient.amount_paid ?? (activePatient.payment_status === 'Paid' ? totalBill : 0));
  const pendingDue = Math.max(0, totalBill - amountPaid);

  const handleBackClick = () => {
    if (setCurrentPage) {
      setCurrentPage('super_admin_patients');
    }
  };

  const handleConsultationFeeChange = (e) => {
    const val = e.target.value;
    const docF = parseFloat(val) || 0;
    const hospC = parseFloat(editFormData.Hospitals_Chargies) || 0;
    const total = docF + hospC;
    setEditFormData(prev => ({
      ...prev,
      consultation_fee: val,
      amount_paid: prev.payment_status === 'Paid' ? total.toFixed(2) : prev.amount_paid
    }));
  };

  const handleHospitalChargesChange = (e) => {
    const val = e.target.value;
    const hospC = parseFloat(val) || 0;
    const docF = parseFloat(editFormData.consultation_fee) || 0;
    const total = docF + hospC;
    setEditFormData(prev => ({
      ...prev,
      Hospitals_Chargies: val,
      amount_paid: prev.payment_status === 'Paid' ? total.toFixed(2) : prev.amount_paid
    }));
  };

  const handleOpenEditModal = () => {
    const docName = typeof attachedDocVal === 'string' && attachedDocVal.startsWith('data:')
      ? 'Uploaded Document'
      : (attachedDocVal ? attachedDocVal.split('/').pop() : '');

    setEditSelectedFile(null);
    setEditFormData({
      patient_id: displayId,
      name: activePatient.name || '',
      age: activePatient.age || '',
      gender: activePatient.gender || 'Male',
      blood_group: activePatient.blood_group || 'O+',
      contact: activePatient.contact || activePatient.phone || '',
      email: activePatient.email || '',
      address: activePatient.address || '',
      hospital: activePatient.hospital || '',
      doctor: activePatient.doctor || (assignedDoctor ? assignedDoctor.id : ''),
      doctor_name: activePatient.doctor_name || displayDoctor,
      doctor_specialization: activePatient.doctor_specialization || (assignedDoctor?.specialization || ''),
      consultation_fee: docFee,
      Hospitals_Chargies: hospCharge,
      amount_paid: amountPaid,
      payment_status: activePatient.payment_status || 'Pending',
      payment_method: activePatient.payment_method || 'Cash',
      symptoms_diagnosis: activePatient.symptoms_diagnosis || '',
      reason_for_visit: activePatient.reason_for_visit || activePatient.symptoms_diagnosis || '',
      symptoms_severity: activePatient.symptoms_severity || 'Normal',
      visit_date_time: activePatient.visit_date_time || activePatient.appointment_time || '',
      status: activePatient.status || 'Pending',
      is_active: activePatient.is_active !== undefined ? activePatient.is_active : true,
      attached_document: attachedDocVal,
      attached_document_name: docName
    });
    setIsEditModalOpen(true);
  };

  const handleSavePatientEdit = async (e) => {
    e.preventDefault();
    if (!activePatient || !activePatient.id) return;
    if (!editFormData.hospital) {
      alert('Please select a target hospital branch.');
      return;
    }

    try {
      const selectedDocObj = doctorsList.find(d => d.id === Number(editFormData.doctor));
      let response;

      const payloadData = {
        patient_id: displayId,
        name: editFormData.name.trim(),
        contact: editFormData.contact.trim(),
        email: editFormData.email.trim(),
        age: editFormData.age ? Number(editFormData.age) : null,
        gender: editFormData.gender,
        blood_group: editFormData.blood_group,
        address: editFormData.address,
        hospital: Number(editFormData.hospital),
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

        response = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${activePatient.id}/`, {
          method: 'PATCH',
          body: formData
        }).catch(() => null);
      } else {
        response = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${activePatient.id}/`, {
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


  const handleOpenStatusModal = () => {
    setStatusUpdateValue(activePatient.status || 'Confirmed');
    setStatusRemarks(activePatient.symptoms_diagnosis || '');
    setIsStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!activePatient || !activePatient.id) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${activePatient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusUpdateValue,
          symptoms_diagnosis: statusRemarks
        })
      });

      if (response.ok) {
        const updated = await response.json();
        alert('Patient status updated successfully in database.');
        setPatientData(updated);
        if (setSelectedPatient) setSelectedPatient(updated);
        localStorage.setItem('selectedPatient', JSON.stringify(updated));
        setIsStatusModalOpen(false);
      } else {
        alert('Failed to update status.');
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activePatient || !activePatient.id) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Patients/${activePatient.id}/`, {
        method: 'DELETE'
      }).catch(() => null);

      if (response && (response.ok || response.status === 204)) {
        alert('Patient record removed successfully.');
        localStorage.removeItem('selectedPatient');
        if (setSelectedPatient) setSelectedPatient(null);
        if (setCurrentPage) setCurrentPage('super_admin_patients');
      } else {
        alert('Failed to delete patient record.');
      }
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert('Network error while deleting patient.');
    }
  };

  if (!activePatient || !activePatient.id) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-800">No Patient Selected</h2>
          <p className="text-xs text-slate-500">
            Please return to the Patients list and select a patient record to view full details.
          </p>
          <button
            type="button"
            onClick={handleBackClick}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition cursor-pointer"
          >
            &larr; Back to Patients List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* TOP NAVIGATION & BACK BUTTON */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
        >
          &larr; Back to Patients
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Super Admin</span>
          <span>/</span>
          <span>Patients</span>
          <span>/</span>
          <span className="font-semibold text-slate-700 font-mono">
            {displayId}
          </span>
        </div>
      </div>

      {/* HEADER HERO CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 break-all">
                {displayId}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                activePatient.status === 'Confirmed' || activePatient.status === 'Admitted' || activePatient.status === 'Discharged' || activePatient.status === 'Completed'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : activePatient.status === 'Cancelled' || activePatient.status === 'Rejected'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {activePatient.status || 'Pending'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                activePatient.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                Payment: {activePatient.payment_status || 'Pending'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight mt-1 break-words break-all">
              {displayName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenStatusModal}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
          >
            Update Status
          </button>

          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            Edit Patient
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      {/* TOP SUMMARY METRICS INCLUDING DOCTOR, BRANCH & FINANCIAL BREAKDOWN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Doctor</p>
          <h3 className="text-base sm:text-lg font-bold text-teal-800 mt-1 truncate">{displayDoctor}</h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{assignedDoctor?.specialization || 'Clinical Specialist'}</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs min-w-0">
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Doctor Consultation Fee</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-teal-800 mt-1">₹{docFee.toFixed(2)}</h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">Doctor Share</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs min-w-0">
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Hospital Charges</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-sky-800 mt-1">₹{hospCharge.toFixed(2)}</h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{displayHospital}</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Gross Bill</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1">₹{totalBill.toFixed(2)}</h3>
          <p className="text-xs text-emerald-600 font-semibold mt-0.5">Paid: ₹{amountPaid.toFixed(2)}</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Due</p>
          <h3 className={`text-xl sm:text-2xl font-extrabold mt-1 ${pendingDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            ₹{pendingDue.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{pendingDue > 0 ? 'Balance to clear' : 'Fully Paid'}</p>
        </div>
      </div>

      {/* MAIN 2-COLUMN PROFILE & MEDICAL SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        {/* LEFT COLUMN: PATIENT CREDENTIALS & CONTACT (1 COL) */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5 self-start min-w-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Patient Details & Medical Info</h2>
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="text-xs font-semibold text-sky-600 hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Patient ID / UHID</span>
                  <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                    Permanent
                  </span>
                </div>
                <p className="font-mono text-sm font-bold text-sky-700 mt-0.5 select-none break-all">{displayId}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Full Name</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5 break-words break-all">{displayName}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Age</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5 break-words">{activePatient.age || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Gender</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5 break-words">{activePatient.gender || 'Not specified'}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Blood Group</span>
                <p className="font-mono font-bold text-rose-700 mt-0.5 break-words">{activePatient.Blood_Group || ''}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Contact Phone Number</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5 break-all">{displayPhone}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Email Address</span>
                {activePatient.email ? (
                  <p className="mt-0.5 break-all">
                    <a
                      href={`mailto:${activePatient.email.toLowerCase()}`}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                      title="Send email"
                    >
                      {activePatient.email.toLowerCase()}
                    </a>
                  </p>
                ) : (
                  <p className="font-semibold text-slate-400 mt-0.5">-</p>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Address / City</span>
                <p className="font-semibold text-slate-800 mt-0.5 break-words break-all">{activePatient.address || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MEDICAL REASON, PAYMENT & DOCUMENTS (2 COLS) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5 min-w-0">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-800">Medical Consultation & Payment Summary</h2>
              <p className="text-xs text-slate-500 mt-0.5">Symptoms, billing, doctor allocation and branch</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* PAYMENT DETAILS BREAKDOWN CARD */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 uppercase text-[11px]">Billing & Payment Overview</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  activePatient.payment_status === 'Paid' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {activePatient.payment_status || 'Pending'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-emerald-200/60">
                <div>
                  <span className="text-[10px] text-teal-700 uppercase block font-semibold">Doctor Fee</span>
                  <span className="font-mono text-sm font-bold text-teal-900">₹{docFee.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-sky-700 uppercase block font-semibold">Hospital Charges</span>
                  <span className="font-mono text-sm font-bold text-sky-900">₹{hospCharge.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Bill</span>
                  <span className="font-mono text-sm font-bold text-slate-800">₹{totalBill.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 uppercase block font-semibold">Paid Amount</span>
                  <span className="font-mono text-sm font-bold text-emerald-700">₹{amountPaid.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Due Balance</span>
                  <span className={`font-mono text-sm font-bold ${pendingDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{pendingDue.toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 pt-1 break-words break-all">
                <span className="font-semibold">Mode of Payment:</span> {activePatient.payment_method || 'Cash'}
              </p>
            </div>

            {/* MEDICAL REASON & SYMPTOMS */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Reason for Visit / Symptoms Diagnosis</span>
              <p className="text-sm font-semibold text-slate-800 leading-relaxed break-words break-all">
                {activePatient.symptoms_diagnosis || activePatient.reason_for_visit || 'General health checkup and consultation.'}
              </p>
            </div>

            {/* ATTACHED MEDICAL DOCUMENT CARD */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Attached Document (Photo / PDF)</span>
                {attachedDocVal ? (
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Document Attached
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    None
                  </span>
                )}
              </div>

              {attachedDocVal ? (
                <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 mt-2 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 overflow-hidden flex-1">
                    {attachedDocVal.startsWith('data:image') || (typeof attachedDocVal === 'string' && attachedDocVal.match(/\.(jpeg|jpg|png|gif|webp)$/i)) ? (
                      <img src={attachedDocVal} alt="Document Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg border border-red-200 shrink-0">
                        📄
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-xs truncate break-all">
                        {typeof attachedDocVal === 'string' && attachedDocVal.startsWith('data:') ? 'Patient_Document_Upload' : attachedDocVal.split('/').pop()}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">Uploaded Document File</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {attachedDocVal.startsWith('data:') || attachedDocVal.startsWith('http') ? (
                      <a
                        href={attachedDocVal}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={attachedDocVal.startsWith('data:') ? 'Patient_Document' : undefined}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition"
                      >
                        View / Download
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600 font-mono break-all">{attachedDocVal}</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No document or photo currently attached.</p>
              )}
            </div>

            {/* TARGET HOSPITAL BRANCH */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-200 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-indigo-800 uppercase font-bold">Target Hospital Branch</span>
                {assignedHospital?.Branch_Code && (
                  <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {assignedHospital.Branch_Code}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-indigo-950 mt-1 break-words break-all">{displayHospital}</h3>
              <p className="text-xs text-slate-600 mt-0.5 break-words break-all">
                {[assignedHospital?.area, assignedHospital?.city, assignedHospital?.address].filter(Boolean).join(', ') || 'Main Healthcare Facility'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-500 font-medium">Live database surveillance active.</span>
            <button
              type="button"
              onClick={handleBackClick}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
            >
              &larr; Back to Patients
            </button>
          </div>
        </div>
      </div>

      {/* EDIT PATIENT MODAL WITH PAYMENT FIELDS */}
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

            <form onSubmit={handleSavePatientEdit} className="space-y-3 text-xs">
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
                  value={displayId}
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
                    onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value.replace(/\D/g, '') })}
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

              {/* TARGET HOSPITAL BRANCH & AFFILIATED DOCTOR SELECTION */}
              {(() => {
                const getHospDocs = (hospId) => {
                  if (!hospId) return doctorsList;
                  return doctorsList.filter(d => {
                    const hospIds = Array.isArray(d.hospitals)
                      ? d.hospitals.map(h => Number(typeof h === 'object' ? h.id : h))
                      : (d.hospital ? [Number(typeof d.hospital === 'object' ? d.hospital.id : d.hospital)] : []);
                    return hospIds.includes(Number(hospId));
                  });
                };
                const availableDocs = getHospDocs(editFormData.hospital);

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">Target Hospital Branch *</label>
                      <select
                        required
                        value={editFormData.hospital}
                        onChange={(e) => {
                          const newHId = e.target.value;
                          const docsInHosp = getHospDocs(newHId);
                          const docStillValid = docsInHosp.some(d => d.id === Number(editFormData.doctor));
                          setEditFormData(prev => ({
                            ...prev,
                            hospital: newHId,
                            doctor: docStillValid ? prev.doctor : ''
                          }));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                      >
                        <option value="" disabled>Select Target Hospital Branch *</option>
                        {hospitalsList.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.Name} ({h.city}) - {h.Branch_Code}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">
                        Assigned Doctor {editFormData.hospital ? `(${availableDocs.length} in this branch)` : ''}
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
                        {availableDocs.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.specialization || d.specialty || 'Doctor'}) [₹{d.consultation_fee ?? 0}]
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })()}

              {/* PAYMENT SECTION IN EDIT MODAL */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-emerald-900 uppercase text-[11px]">Fee & Billing Details</p>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    Auto-Calculated Total
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Doctor Consultation Fee (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.consultation_fee}
                      onChange={handleConsultationFeeChange}
                      placeholder="e.g. 500.00"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Credited to Doctor earnings</p>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Charges / Services (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.Hospitals_Chargies}
                      onChange={handleHospitalChargesChange}
                      placeholder="e.g. 350.00"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Credited to Hospital Revenue</p>
                  </div>
                </div>

                {/* Total Billing Live Calculation Preview */}
                <div className="p-3 bg-white rounded-xl border border-emerald-300 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">Bill Breakdown:</span>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      Doctor: ₹{Number(editFormData.consultation_fee || 0).toFixed(2)}
                    </span>
                    <span className="text-slate-400 font-bold">+</span>
                    <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                      Hospital: ₹{Number(editFormData.Hospitals_Chargies || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-600 uppercase mr-1.5">Total Amount:</span>
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
                      <option value="">Select Method</option>
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

      {/* UPDATE STATUS MODAL */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Update Patient Status</h3>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Status:</label>
                <select
                  value={statusUpdateValue}
                  onChange={(e) => setStatusUpdateValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-semibold cursor-pointer"
                >
                  {statusOptions.map((st, idx) => (
                    <option key={idx} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Clinical Remarks / Diagnosis</label>
                <textarea
                  rows={3}
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="Enter remarks..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Save Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
              🗑️
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-800">Delete Patient Record?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete profile for <strong className="text-slate-800">{displayName}</strong> (<span className="font-mono">{displayId}</span>)? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer"
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

export default Patient_Details;