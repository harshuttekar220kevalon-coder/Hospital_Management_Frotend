import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const Patient_Details = ({ currentUser, selectedPatient, setSelectedPatient, setSelectedAppointment, setCurrentPage }) => {
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
  const [nursesList, setNursesList] = useState([]);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [isDataFetching, setIsDataFetching] = useState(false);

  // Search & Filter for appointments table
  const [apptSearchTerm, setApptSearchTerm] = useState('');
  const [apptStatusFilter, setApptStatusFilter] = useState('ALL');

  // Edit Patient Account Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    contact: '',
    password: '',
    gender: 'Male',
    blood_group: 'A+',
    address: ''
  });

  // Delete Patient Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Update Appointment Status Modal State
  const [selectedApptForStatus, setSelectedApptForStatus] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateValue, setStatusUpdateValue] = useState('Pending');
  const [bedUpdateValue, setBedUpdateValue] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');

  // Book Appointment Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookFormData, setBookFormData] = useState({
    patient_name: '',
    hospital: '',
    doctor: '',
    consultation_fee: 0,
    hospitals_charges: 0,
    amount_paid: 0,
    payment_status: 'Pending',
    payment_method: 'Cash',
    condition: 'Normal',
    status: 'Pending',
    bed_number: '',
    symptoms_diagnosis: '',
    visit_date_time: new Date().toISOString().slice(0, 16)
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

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

      // Fetch hospitals, doctors, nurses, all appointments
      const [hospRes, docRes, nurseRes, allApptsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null)
      ]);

      let hospData = [];
      let docData = [];
      let nurseData = [];
      let allAppts = [];

      if (hospRes && hospRes.ok) {
        const hJson = await hospRes.json().catch(() => []);
        hospData = Array.isArray(hJson) ? hJson : (hJson?.results || []);
        setHospitalsList(hospData);
      }
      if (docRes && docRes.ok) {
        const dJson = await docRes.json().catch(() => []);
        docData = Array.isArray(dJson) ? dJson : (dJson?.results || []);
        setDoctorsList(docData);
      }
      if (nurseRes && nurseRes.ok) {
        const nJson = await nurseRes.json().catch(() => []);
        nurseData = Array.isArray(nJson) ? nJson : (nJson?.results || []);
        setNursesList(nurseData);
      }
      if (allApptsRes && allApptsRes.ok) {
        const aData = await allApptsRes.json().catch(() => []);
        allAppts = Array.isArray(aData) ? aData : (aData?.results || aData?.data || aData?.appointments || []);
      }

      if (currentPat && (currentPat.id || currentPat.email || currentPat.contact)) {
        let freshPat = null;
        if (currentPat.id && typeof currentPat.id === 'number') {
          const patRes = await fetch(`${API_BASE_URL}/super-admin/Patients/${currentPat.id}/`).catch(() => null);
          if (patRes && patRes.ok) {
            freshPat = await patRes.json().catch(() => null);
          }
        }

        const patEmail = (freshPat?.email || currentPat.email || '').toLowerCase().trim();
        const patPhone = String(freshPat?.contact || freshPat?.phone || currentPat.contact || currentPat.phone || '').trim();
        const patIdVal = freshPat?.id || currentPat.id;

        // Filter all appointments booked under this patient's registered email
        const matchedHistory = allAppts.filter(a => {
          const aEmail = (a.email || '').toLowerCase().trim();
          const aPhone = String(a.contact || a.phone || '').trim();
          const aPat = a.patient || a.patient_id;

          const emailMatch = patEmail && aEmail && patEmail === aEmail;
          const idMatch = patIdVal && aPat && (Number(aPat) === Number(patIdVal) || String(aPat) === String(patIdVal));
          const phoneMatch = !patEmail && patPhone && aPhone && patPhone === aPhone;

          return emailMatch || idMatch || phoneMatch;
        });

        const normalizedHistory = matchedHistory.map(a => {
          const hospId = typeof a.hospital === 'object' ? a.hospital?.id : a.hospital;
          const docId = typeof a.doctor === 'object' ? a.doctor?.id : a.doctor;
          const nurseId = typeof a.nurse === 'object' ? a.nurse?.id : a.nurse;

          const hospObj = hospId ? hospData.find(h => Number(h.id) === Number(hospId)) : null;
          const docObj = docId ? docData.find(d => Number(d.id) === Number(docId)) : null;
          const nurseObj = nurseId ? nurseData.find(n => Number(n.id) === Number(nurseId)) : null;

          const docFee = Number(a.consultation_fee || docObj?.consultation_fee || 0);
          const hospCharges = Number(a.Hospitals_Chargies || a.hospitals_charges || 0);
          const total = docFee + hospCharges;
          const amtPaid = Number(a.amount_paid || (a.payment_status === 'Paid' ? total : 0));

          const apptPatientName = a.patient_name || a.patient_Name || a.name || 'Patient';

          return {
            ...a,
            id: a.id,
            appointment_id: a.appointment_id || a.Appoment_id || `APT-${a.id}`,
            patient_name: apptPatientName,
            name: apptPatientName,
            hospital: hospId ? Number(hospId) : null,
            hospital_name: a.hospital_name || hospObj?.Name || hospObj?.name || 'Hospital Branch',
            doctor: docId ? Number(docId) : null,
            doctor_name: a.doctor_name || (docObj ? (docObj.name?.startsWith('Dr.') ? docObj.name : `Dr. ${docObj.name}`) : (docId ? `Dr. #${docId}` : 'Assigned Doctor')),
            doctor_specialization: a.doctor_specialization || docObj?.specialization || docObj?.specialty || '',
            nurse_name: a.nurse_name || (nurseObj ? nurseObj.name : ''),
            bed_number: a.bed_number ? Number(a.bed_number) : null,
            consultation_fee: docFee,
            Hospitals_Chargies: hospCharges,
            hospitals_charges: hospCharges,
            total_bill: total,
            amount_paid: amtPaid,
            pending_due: Math.max(0, total - amtPaid),
            condition: a.condition || a.Condation || a.condation || a.symptoms_severity || 'Normal',
            status: a.status || 'Pending',
            payment_status: a.payment_status || (amtPaid >= total && total > 0 ? 'Paid' : 'Pending'),
            payment_method: a.payment_method || 'Cash',
            visit_date_time: a.visit_date_time || a.appointment_time || a.created_at || new Date().toISOString(),
            attached_document: a.attached_document || a.document || ''
          };
        });

        // Sort appointments by newest first
        normalizedHistory.sort((x, y) => new Date(y.visit_date_time || 0) - new Date(x.visit_date_time || 0));
        setPatientAppointments(normalizedHistory);

        const mergedAccount = {
          ...currentPat,
          ...(freshPat || {}),
          id: freshPat?.id || currentPat.id,
          name: freshPat?.name || freshPat?.patient_Name || freshPat?.patient_name || currentPat.name || 'Registered Patient',
          email: patEmail,
          contact: patPhone,
          phone: patPhone,
          age: freshPat?.age ?? freshPat?.Age ?? currentPat.age ?? '',
          gender: freshPat?.gender || freshPat?.Gender || currentPat.gender || '',
          blood_group: freshPat?.blood_group || freshPat?.Blood_Group || currentPat.blood_group || '',
          address: freshPat?.address || freshPat?.Address || currentPat.address || '',
          uhid: freshPat?.uhid || freshPat?.patient_id || currentPat.uhid || (freshPat?.id ? `UHID-${freshPat.id}` : `UHID-${currentPat.id}`)
        };

        setPatientData(mergedAccount);
        if (setSelectedPatient) setSelectedPatient(mergedAccount);
        localStorage.setItem('selectedPatient', JSON.stringify(mergedAccount));
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
  const displayName = activePatient.name || 'Patient';
  const displayId = activePatient.uhid || activePatient.patient_id || `UHID-${activePatient.id || '1'}`;
  const displayEmail = (activePatient.email || '').toLowerCase().trim();
  const displayPhone = activePatient.contact || activePatient.phone || '-';

  const handleBackClick = () => {
    if (setCurrentPage) {
      setCurrentPage('super_admin_patients');
    }
  };

  // Open Edit Patient Modal
  const handleOpenEditModal = () => {
    setEditFormData({
      name: activePatient.name || '',
      email: activePatient.email || '',
      contact: activePatient.contact || activePatient.phone || '',
      password: activePatient.password || activePatient.Password || '',
      gender: activePatient.gender || activePatient.Gender || 'Male',
      blood_group: activePatient.blood_group || activePatient.Blood_Group || 'A+',
      address: activePatient.address || ''
    });
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  // Save Patient Account Changes
  const handleSavePatientEdit = async (e) => {
    e.preventDefault();
    if (!activePatient || !activePatient.id) return;
    try {
      setIsSavingEdit(true);
      const payload = {
        name: editFormData.name.trim(),
        patient_name: editFormData.name.trim(),
        patient_Name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        contact: editFormData.contact.trim(),
        phone: editFormData.contact.trim(),
        gender: editFormData.gender,
        Gender: editFormData.gender,
        blood_group: editFormData.blood_group,
        Blood_Group: editFormData.blood_group,
        address: editFormData.address.trim()
      };

      if (editFormData.password && editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
        payload.Password = editFormData.password.trim();
      }

      const res = await fetch(`${API_BASE_URL}/super-admin/Patients/${activePatient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res && res.ok) {
        alert('Patient account details updated successfully.');
        setIsEditModalOpen(false);
        loadPatientAndRelatedData();
      } else {
        const errData = res ? await res.json().catch(() => ({})) : {};
        alert(errData.message || errData.detail || 'Failed to update patient details.');
      }
    } catch (err) {
      console.error('Error saving patient:', err);
      alert('Error saving patient account details.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Book Appointment Modal
  const handleOpenBookApptModal = () => {
    const defaultHosp = hospitalsList[0]?.id ? String(hospitalsList[0].id) : '';
    setBookFormData({
      patient_name: activePatient.name || '',
      hospital: defaultHosp,
      doctor: '',
      consultation_fee: 0,
      hospitals_charges: 0,
      amount_paid: 0,
      payment_status: 'Pending',
      payment_method: 'Cash',
      condition: 'Normal',
      status: 'Pending',
      bed_number: '',
      symptoms_diagnosis: '',
      visit_date_time: new Date().toISOString().slice(0, 16)
    });
    setIsBookModalOpen(true);
  };

  const handleBookDoctorChange = (e) => {
    const docId = e.target.value;
    const docObj = doctorsList.find(d => Number(d.id) === Number(docId));
    const fee = docObj ? Number(docObj.consultation_fee || 0) : 0;
    const hosp = Number(bookFormData.hospitals_charges) || 0;
    setBookFormData(prev => ({
      ...prev,
      doctor: docId,
      consultation_fee: fee,
      amount_paid: prev.payment_status === 'Paid' ? fee + hosp : prev.amount_paid
    }));
  };

  const handleBookAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!bookFormData.hospital) {
      alert('Please select a hospital branch.');
      return;
    }
    try {
      setIsBooking(true);
      const selectedDoc = doctorsList.find(d => Number(d.id) === Number(bookFormData.doctor));
      const selectedHosp = hospitalsList.find(h => Number(h.id) === Number(bookFormData.hospital));
      const hospId = Number(bookFormData.hospital);
      const isAdmitted = bookFormData.status === 'Admitted';
      const parsedBed = isAdmitted && bookFormData.bed_number ? Number(bookFormData.bed_number) : null;

      const pName = (bookFormData.patient_name || activePatient.name || 'Patient').trim();

      const payload = {
        patient: activePatient.id,
        patient_id: activePatient.id,
        patient_name: pName,
        name: pName,
        account_holder_name: (activePatient.name || '').trim(),
        booked_by: (activePatient.name || '').trim(),
        email: displayEmail,
        contact: displayPhone !== '-' ? displayPhone : '',
        phone: displayPhone !== '-' ? displayPhone : '',
        age: activePatient.age ? Number(activePatient.age) : null,
        gender: activePatient.gender || 'Male',
        Gender: activePatient.gender || 'Male',
        blood_group: activePatient.blood_group || 'A+',
        Blood_Group: activePatient.blood_group || 'A+',
        address: (activePatient.address || '').trim(),
        hospital: hospId,
        hospital_name: selectedHosp ? (selectedHosp.Name || selectedHosp.name) : 'Hospital Branch',
        doctor: bookFormData.doctor ? Number(bookFormData.doctor) : null,
        doctor_name: selectedDoc ? selectedDoc.name : '',
        doctor_specialization: selectedDoc ? (selectedDoc.specialization || selectedDoc.specialty || '') : '',
        consultation_fee: Number(bookFormData.consultation_fee) || 0,
        hospitals_charges: Number(bookFormData.hospitals_charges) || 0,
        Hospitals_Chargies: Number(bookFormData.hospitals_charges) || 0,
        amount_paid: Number(bookFormData.amount_paid) || 0,
        payment_status: bookFormData.payment_status || 'Pending',
        payment_method: bookFormData.payment_method || 'Cash',
        condition: bookFormData.condition || 'Normal',
        Condation: bookFormData.condition || 'Normal',
        status: bookFormData.status || 'Pending',
        bed_number: parsedBed,
        symptoms_diagnosis: bookFormData.symptoms_diagnosis.trim() || 'General Consultation',
        reason_for_visit: bookFormData.symptoms_diagnosis.trim() || 'General Consultation',
        visit_date_time: bookFormData.visit_date_time ? new Date(bookFormData.visit_date_time).toISOString() : new Date().toISOString()
      };

      const res = await fetch(`${API_BASE_URL}/super-admin/appointments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res && res.ok) {
        const resData = await res.json().catch(() => ({}));
        alert(`Appointment booked successfully! ID: ${resData.appointment_id || resData.id || 'New'}`);
        setIsBookModalOpen(false);
        loadPatientAndRelatedData();
      } else {
        const errData = res ? await res.json().catch(() => ({})) : {};
        alert(errData.message || errData.detail || 'Failed to book appointment.');
      }
    } catch (err) {
      console.error('Error booking appointment:', err);
      alert('Error while booking appointment.');
    } finally {
      setIsBooking(false);
    }
  };

  // Open Update Appointment Status Modal
  const handleOpenStatusModal = (appt) => {
    setSelectedApptForStatus(appt);
    setStatusUpdateValue(appt.status || 'Pending');
    setBedUpdateValue(appt.bed_number ? String(appt.bed_number) : '');
    setStatusRemarks(appt.symptoms_diagnosis || '');
    setIsStatusModalOpen(true);
  };

  const handleSaveStatusModal = async (e) => {
    e.preventDefault();
    if (!selectedApptForStatus || !selectedApptForStatus.id) return;
    try {
      setIsUpdatingStatus(true);
      const isDischarge = statusUpdateValue === 'Discharged' || statusUpdateValue === 'Cancelled';
      const bedNum = isDischarge ? null : (bedUpdateValue ? Number(bedUpdateValue) : null);

      const statusPayload = {
        status: statusUpdateValue,
        bed_number: bedNum,
        symptoms_diagnosis: statusRemarks.trim()
      };

      const res = await fetch(`${API_BASE_URL}/super-admin/appointments/${selectedApptForStatus.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusPayload)
      });

      if (res && res.ok) {
        alert('Appointment status updated successfully.');
        setIsStatusModalOpen(false);
        loadPatientAndRelatedData();
      } else {
        const errData = res ? await res.json().catch(() => ({})) : {};
        alert(errData.message || errData.detail || 'Failed to update status.');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Error updating status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete Patient Account
  const handleConfirmDelete = async () => {
    if (!activePatient || !activePatient.id) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`${API_BASE_URL}/super-admin/Patients/${activePatient.id}/`, {
        method: 'DELETE'
      }).catch(() => null);

      if (res && (res.ok || res.status === 204)) {
        alert('Patient account deleted successfully.');
        setIsDeleteModalOpen(false);
        handleBackClick();
      } else {
        alert('Failed to delete patient account.');
      }
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert('Network error while deleting patient.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Navigate to Appointment Details Page
  const handleViewAppointmentDetails = (appt) => {
    if (setSelectedAppointment) {
      setSelectedAppointment(appt);
    }
    localStorage.setItem('selectedAppointment', JSON.stringify(appt));
    if (setCurrentPage) {
      setCurrentPage('appointment_details');
    }
  };

  // Filter appointments
  const filteredAppointments = patientAppointments.filter(appt => {
    const term = apptSearchTerm.toLowerCase();
    if (apptStatusFilter !== 'ALL' && appt.status !== apptStatusFilter) return false;

    return (
      (appt.appointment_id || '').toLowerCase().includes(term) ||
      (appt.patient_name || appt.name || '').toLowerCase().includes(term) ||
      (appt.doctor_name || '').toLowerCase().includes(term) ||
      (appt.hospital_name || '').toLowerCase().includes(term) ||
      (appt.symptoms_diagnosis || '').toLowerCase().includes(term) ||
      (appt.condition || '').toLowerCase().includes(term)
    );
  });

  if (!activePatient || !activePatient.id) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-base font-bold text-slate-800">No Patient Account Selected</h2>
          <p className="text-xs text-slate-500">
            Please return to the Patients list and select a patient record to view full details.
          </p>
          <button
            type="button"
            onClick={handleBackClick}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition cursor-pointer"
          >
            &larr; Back to Patients List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5">
      {/* TOP NAVIGATION & BREADCRUMB */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
        >
          &larr; Back to Patients List
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

      {/* HEADER HERO CARD - PATIENT SIGNUP ACCOUNT DETAILS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                {displayId}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Patient Account
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {patientAppointments.length} Total Booking{patientAppointments.length === 1 ? '' : 's'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight truncate">
              {displayName}
            </h1>
            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-600 font-medium">
              {displayEmail && (
                <p className="flex items-center gap-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Email:</span>
                  <a
                    href={`mailto:${displayEmail}`}
                    title={`Send email to ${displayEmail}`}
                    className="text-sky-700 hover:text-sky-900 hover:underline font-mono font-bold"
                  >
                    {displayEmail}
                  </a>
                </p>
              )}
              {displayPhone && (
                <p className="flex items-center gap-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Contact:</span>
                  <span className="font-mono font-bold text-slate-800">{displayPhone}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* HEADER ACTIONS */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleOpenBookApptModal}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            + Book Appointment
          </button>
          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            Edit Account Details
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

      {/* ALL APPOINTMENTS BOOKED UNDER THIS EMAIL TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">
                Appointments & Consultations Booked Under This Email
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                {patientAppointments.length} Record{patientAppointments.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              All appointments booked using registered email:{' '}
              <strong className="text-indigo-700 font-mono">{displayEmail || displayName}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenBookApptModal}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            + Book New Appointment
          </button>
        </div>

        {/* SEARCH & STATUS FILTER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by ID, Patient name, Doctor, Branch, Diagnosis..."
              value={apptSearchTerm}
              onChange={(e) => setApptSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-sky-500 text-xs"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Status:</span>
            <select
              value={apptStatusFilter}
              onChange={(e) => setApptStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <option value="ALL">All Statuses ({patientAppointments.length})</option>
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="Admitted">Admitted</option>
              <option value="Discharged">Discharged</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* APPOINTMENTS TABLE */}
        {patientAppointments.length === 0 ? (
          <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl font-bold">
              ∅
            </div>
            <p className="text-sm font-bold text-slate-700">No appointments found for this email address.</p>
            <p className="text-xs text-slate-400">
              No appointments have been registered under email <strong className="font-mono">{displayEmail}</strong> yet.
            </p>
            <button
              type="button"
              onClick={handleOpenBookApptModal}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              + Book First Appointment
            </button>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-slate-200 text-xs text-slate-500">
            No appointments matched your search keyword or filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3 text-center">Appt ID & Date</th>
                  <th className="p-3 text-left">Patient Name</th>
                  <th className="p-3 text-left">Hospital Branch</th>
                  <th className="p-3 text-left">Doctor & Dept</th>
                  <th className="p-3 text-center">Ward / Bed</th>
                  <th className="p-3 text-center">Condition</th>
                  <th className="p-3 text-center">Billing & Paid</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-left">Diagnosis / Reason</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredAppointments.map((appt, idx) => {
                  const isAdmitted = (appt.status === 'Admitted' || appt.status === 'In Consultation') && appt.status !== 'Discharged';
                  const isDischarged = appt.status === 'Discharged' || appt.status === 'Completed';

                  return (
                    <tr key={appt.id || idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px] inline-block">
                          {appt.appointment_id || `APT-${appt.id}`}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">
                          {appt.visit_date_time ? new Date(appt.visit_date_time).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>

                      <td className="p-3 text-left whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleViewAppointmentDetails(appt)}
                          className="font-bold text-slate-900 hover:text-sky-600 hover:underline text-left text-xs cursor-pointer block"
                        >
                          {appt.patient_name || appt.name || displayName}
                        </button>
                      </td>

                      <td className="p-3 text-left whitespace-nowrap">
                        <span className="font-bold text-slate-800 block text-xs">{appt.hospital_name}</span>
                      </td>

                      <td className="p-3 text-left whitespace-nowrap">
                        <span className="font-bold text-teal-800 block text-xs">{appt.doctor_name}</span>
                        {appt.doctor_specialization ? (
                          <span className="text-[10px] text-slate-400 block">{appt.doctor_specialization}</span>
                        ) : null}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        {appt.bed_number ? (
                          <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[11px]">
                            Bed #{appt.bed_number}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">OPD / No Bed</span>
                        )}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          appt.condition === 'Critical'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : appt.condition === 'Emergency'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : appt.condition === 'Urgent'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {appt.condition || 'Normal'}
                        </span>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap font-mono text-[11px]">
                        <span className="font-bold text-slate-800 block">
                          ₹{Number(appt.total_bill || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-emerald-600 block">
                          Paid: ₹{Number(appt.amount_paid || 0).toFixed(2)}
                        </span>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          appt.status === 'Confirmed' || appt.status === 'Admitted' || appt.status === 'Discharged' || appt.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : appt.status === 'Cancelled' || appt.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {appt.status || 'Pending'}
                        </span>
                      </td>

                      <td className="p-3 text-left max-w-xs">
                        <p className="truncate text-slate-700 text-xs font-medium" title={appt.symptoms_diagnosis || appt.reason_for_visit}>
                          {appt.symptoms_diagnosis || appt.reason_for_visit || 'General Consultation'}
                        </p>
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewAppointmentDetails(appt)}
                            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-[11px] shadow-2xs transition cursor-pointer"
                          >
                            View Details &rarr;
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(appt)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] border border-slate-200 transition cursor-pointer"
                          >
                            Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT PATIENT ACCOUNT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Edit Patient Account Details</h2>
                <p className="text-xs text-slate-500">Update registered personal profile for {displayName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePatientEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editFormData.contact}
                    onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 uppercase">Account Password</label>
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                    >
                      {showEditPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      placeholder="Enter new password to update..."
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono focus:outline-none focus:border-sky-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Gender</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer focus:outline-none focus:border-sky-600"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer focus:outline-none focus:border-sky-600"
                  >
                    {bloodGroups.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Address / City</label>
                <input
                  type="text"
                  placeholder="Patient residential address..."
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOOK APPOINTMENT MODAL */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Book New Appointment</h2>
                <p className="text-xs text-slate-500">
                  Book appointment under account email:{' '}
                  <strong className="text-indigo-700 font-mono">{displayEmail}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleBookAppointmentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Patient Name *
                </label>
                <input
                  type="text"
                  required
                  value={bookFormData.patient_name}
                  onChange={(e) => setBookFormData({ ...bookFormData, patient_name: e.target.value })}
                  placeholder={`e.g. ${displayName}`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Target Hospital Branch *</label>
                  <select
                    required
                    value={bookFormData.hospital}
                    onChange={(e) => setBookFormData({ ...bookFormData, hospital: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="">-- Select Branch --</option>
                    {hospitalsList.map(h => (
                      <option key={h.id} value={h.id}>{h.Name || h.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Doctor</label>
                  <select
                    value={bookFormData.doctor}
                    onChange={handleBookDoctorChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="">-- Select Doctor --</option>
                    {doctorsList.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialization || d.specialty || 'General'}) - ₹{d.consultation_fee || 0}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Doctor Fee (₹)</label>
                  <input
                    type="number"
                    value={bookFormData.consultation_fee}
                    onChange={(e) => {
                      const fee = parseFloat(e.target.value) || 0;
                      setBookFormData(prev => ({
                        ...prev,
                        consultation_fee: fee,
                        amount_paid: prev.payment_status === 'Paid' ? fee + (Number(prev.hospitals_charges) || 0) : prev.amount_paid
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Charges (₹)</label>
                  <input
                    type="number"
                    value={bookFormData.hospitals_charges}
                    onChange={(e) => {
                      const hosp = parseFloat(e.target.value) || 0;
                      setBookFormData(prev => ({
                        ...prev,
                        hospitals_charges: hosp,
                        amount_paid: prev.payment_status === 'Paid' ? (Number(prev.consultation_fee) || 0) + hosp : prev.amount_paid
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Payment Status</label>
                  <select
                    value={bookFormData.payment_status}
                    onChange={(e) => {
                      const pStatus = e.target.value;
                      const total = (Number(bookFormData.consultation_fee) || 0) + (Number(bookFormData.hospitals_charges) || 0);
                      setBookFormData(prev => ({
                        ...prev,
                        payment_status: pStatus,
                        amount_paid: pStatus === 'Paid' ? total : 0
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Clinical Condition</label>
                  <select
                    value={bookFormData.condition}
                    onChange={(e) => setBookFormData({ ...bookFormData, condition: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Appointment Status</label>
                  <select
                    value={bookFormData.status}
                    onChange={(e) => setBookFormData({ ...bookFormData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Admitted">Admitted</option>
                  </select>
                </div>
              </div>

              {bookFormData.status === 'Admitted' && (
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Bed Number</label>
                  <input
                    type="number"
                    value={bookFormData.bed_number}
                    onChange={(e) => setBookFormData({ ...bookFormData, bed_number: e.target.value })}
                    placeholder="e.g. 101"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Symptoms / Reason for Visit</label>
                <textarea
                  rows="2"
                  value={bookFormData.symptoms_diagnosis}
                  onChange={(e) => setBookFormData({ ...bookFormData, symptoms_diagnosis: e.target.value })}
                  placeholder="Clinical symptoms, reason for visit..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBooking}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isBooking ? 'Booking...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE APPOINTMENT STATUS MODAL */}
      {isStatusModalOpen && selectedApptForStatus && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Update Appointment Status</h2>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedApptForStatus.appointment_id || `APT-${selectedApptForStatus.id}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveStatusModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Status *</label>
                <select
                  value={statusUpdateValue}
                  onChange={(e) => setStatusUpdateValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Admitted">Admitted</option>
                  <option value="Discharged">Discharged</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {statusUpdateValue === 'Admitted' && (
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Bed Number</label>
                  <input
                    type="number"
                    value={bedUpdateValue}
                    onChange={(e) => setBedUpdateValue(e.target.value)}
                    placeholder="e.g. 101"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Notes / Diagnosis</label>
                <textarea
                  rows="2"
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PATIENT MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 my-auto">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-800">Delete Patient Account?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete the account of{' '}
                <strong className="text-slate-800">{displayName}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patient_Details;