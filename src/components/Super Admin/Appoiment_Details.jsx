import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const getFloorNumber = (bed) => {
  if (!bed) return null;
  const num = Number(bed);
  if (isNaN(num) || num <= 0) return null;
  return Math.floor((num - 1) / 100) + 1;
};

const getAssignedNurseForPatientBed = (bedNumber, nursesList = [], hospitalId = null) => {
  if (!nursesList || !Array.isArray(nursesList) || nursesList.length === 0) {
    return { nurseId: null, nurseName: '' };
  }
  const hospNurses = hospitalId
    ? nursesList.filter(n => Number(typeof n.hospital === 'object' ? n.hospital?.id : n.hospital) === Number(hospitalId))
    : nursesList;
  const activeNurses = hospNurses.length > 0 ? hospNurses : nursesList;
  if (activeNurses.length === 0) return { nurseId: null, nurseName: '' };
  const first = activeNurses[0];
  return { nurseId: first.id, nurseName: first.name };
};

const SuperAdminAppointmentDetails = ({
  currentUser,
  selectedAppointment,
  setSelectedAppointment,
  setSelectedPatient,
  setCurrentPage
}) => {
  const [appointmentData, setAppointmentData] = useState(() => {
    if (selectedAppointment) return selectedAppointment;
    try {
      const saved = localStorage.getItem('selectedAppointment');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [hospitalsList, setHospitalsList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [isDataFetching, setIsDataFetching] = useState(false);

  // Status & Bed Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusUpdateValue, setStatusUpdateValue] = useState('');
  const [bedUpdateValue, setBedUpdateValue] = useState('');
  const [nurseUpdateValue, setNurseUpdateValue] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Edit Appointment Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    contact: '',
    email: '',
    age: '',
    gender: 'Male',
    blood_group: 'A+',
    address: '',
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
    nurse: '',
    symptoms_diagnosis: '',
    visit_date_time: ''
  });

  const statusOptions = ['Pending', 'Assigned', 'Admitted', 'Discharged', 'Cancelled'];
  const conditionChoices = ['Critical', 'Emergency', 'Urgent', 'Normal'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Not Known'];
  const paymentStatuses = ['Paid', 'Partial', 'Pending', 'Failed'];
  const paymentMethods = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Net Banking'];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const loadAppointmentDetails = async () => {
    setIsDataFetching(true);
    try {
      let currentAppt = selectedAppointment || appointmentData;
      if (!currentAppt || !currentAppt.id) {
        const saved = localStorage.getItem('selectedAppointment');
        if (saved) {
          currentAppt = JSON.parse(saved);
          setAppointmentData(currentAppt);
        }
      }

      const [hospRes, docRes, nurseRes, patRes, apptRes] = await Promise.all([
        fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Patients/`).catch(() => null),
        currentAppt?.id
          ? fetch(`${API_BASE_URL}/super-admin/appointments/${currentAppt.id}/`).catch(() => null)
          : Promise.resolve(null)
      ]);

      let hospData = [];
      let docData = [];
      let nurseData = [];
      let patsData = [];

      if (hospRes && hospRes.ok) {
        hospData = await hospRes.json().catch(() => []);
        setHospitalsList(Array.isArray(hospData) ? hospData : (hospData?.results || []));
      }
      if (docRes && docRes.ok) {
        docData = await docRes.json().catch(() => []);
        setDoctorsList(Array.isArray(docData) ? docData : (docData?.results || []));
      }
      if (nurseRes && nurseRes.ok) {
        nurseData = await nurseRes.json().catch(() => []);
        setNursesList(Array.isArray(nurseData) ? nurseData : (nurseData?.results || []));
      }
      if (patRes && patRes.ok) {
        const pJson = await patRes.json().catch(() => []);
        patsData = Array.isArray(pJson) ? pJson : (pJson?.results || pJson?.data || []);
      }

      if (apptRes && apptRes.ok) {
        const freshAppt = await apptRes.json().catch(() => null);
        if (freshAppt && freshAppt.id) {
          const hospId = typeof freshAppt.hospital === 'object' ? freshAppt.hospital?.id : freshAppt.hospital;
          const docId = typeof freshAppt.doctor === 'object' ? freshAppt.doctor?.id : freshAppt.doctor;
          const nurseId = typeof freshAppt.nurse === 'object' ? freshAppt.nurse?.id : freshAppt.nurse;

          const hospObj = hospId ? hospData.find(h => Number(h.id) === Number(hospId)) : null;
          const docObj = docId ? docData.find(d => Number(d.id) === Number(docId)) : null;
          const nurseObj = nurseId ? nurseData.find(n => Number(n.id) === Number(nurseId)) : null;

          // Find the registered account user strictly by email (or account FK) from /super-admin/Patients/
          const apptEmail = (freshAppt.email || currentAppt?.email || '').toLowerCase().trim();
          const apptPhone = (freshAppt.contact || freshAppt.phone || currentAppt?.contact || currentAppt?.phone || '').trim();
          const patIdVal = freshAppt.patient || freshAppt.patient_id || currentAppt?.patient || currentAppt?.patient_id;

          const matchedAccountUser = patsData.find(p => {
            const pEmail = (p.email || '').toLowerCase().trim();
            if (apptEmail && pEmail && pEmail === apptEmail) return true;
            return false;
          }) || patsData.find(p => {
            if (patIdVal && (Number(p.id) === Number(patIdVal) || String(p.id) === String(patIdVal))) return true;
            const pContact = (p.contact || p.phone || '').trim();
            if (apptPhone && pContact && pContact === apptPhone) return true;
            return false;
          }) || null;

          // 1. Account Holder Name (The registered account user who owns this email / booked the appointment):
          const resolvedAccountHolder = matchedAccountUser?.name || matchedAccountUser?.patient_Name || matchedAccountUser?.patient_name || freshAppt.account_holder_name || freshAppt.booked_by || currentAppt?.account_holder_name || (apptEmail ? apptEmail.split('@')[0] : 'Account User');

          // 2. Appointment Patient Name (The name entered on the appointment booking form / person undergoing treatment):
          const resolvedPatientName = freshAppt.patient_name || freshAppt.patient_Name || freshAppt.name || currentAppt?.patient_name || currentAppt?.patient_Name || currentAppt?.name || 'Patient';

          const docFee = Number(freshAppt.consultation_fee ?? docObj?.consultation_fee ?? 0);
          const hospCharges = Number(freshAppt.hospitals_charges ?? freshAppt.Hospitals_Chargies ?? 0);
          const totalBill = docFee + hospCharges;
          const amtPaid = Number(freshAppt.amount_paid ?? 0);

          const rawBackendApptId = freshAppt.Appoment_id || freshAppt.appoment_id || freshAppt.appointment_id || freshAppt.id || currentAppt?.appointment_id || currentAppt?.Appoment_id || currentAppt?.id;
          const formattedApptId = rawBackendApptId
            ? (String(rawBackendApptId).startsWith('APT-') ? String(rawBackendApptId) : `APT-${rawBackendApptId}`)
            : `APT-${freshAppt.id || '1'}`;

          const resolvedGender = freshAppt.gender || freshAppt.Gender || freshAppt.patient_gender || freshAppt.patient_Gender || freshAppt.sex || freshAppt.Sex || matchedPat?.gender || matchedPat?.Gender || matchedPat?.patient_gender || currentAppt?.gender || currentAppt?.Gender || '';
          const resolvedAge = freshAppt.age ?? freshAppt.Age ?? freshAppt.patient_age ?? matchedPat?.age ?? matchedPat?.Age ?? currentAppt?.age ?? currentAppt?.Age ?? '';
          const resolvedBloodGroup = freshAppt.blood_group || freshAppt.Blood_Group || freshAppt.bloodGroup || matchedPat?.blood_group || matchedPat?.Blood_Group || currentAppt?.blood_group || currentAppt?.Blood_Group || '';
          const resolvedAddress = freshAppt.address || freshAppt.Address || matchedPat?.address || matchedPat?.Address || currentAppt?.address || '';
          const resolvedContact = freshAppt.contact || freshAppt.phone || freshAppt.Contact || matchedPat?.contact || matchedPat?.phone || currentAppt?.contact || currentAppt?.phone || '';
          const resolvedEmail = freshAppt.email || matchedPat?.email || currentAppt?.email || '';
          const resolvedDocSpec = freshAppt.doctor_specialization || (typeof freshAppt.doctor === 'object' ? (freshAppt.doctor?.specialization || freshAppt.doctor?.specialty) : '') || docObj?.specialization || docObj?.specialty || '';
          const resolvedUhid = freshAppt.uhid || freshAppt.UHID || freshAppt.patient_uhid || matchedPat?.uhid || matchedPat?.UHID || matchedPat?.patient_id || (freshAppt.patient_id && !String(freshAppt.patient_id).startsWith('APT') ? String(freshAppt.patient_id) : '');
          const resolvedCreatedAt = freshAppt.created_at || freshAppt.created_date || freshAppt.applied_at || freshAppt.visit_date_time || currentAppt?.created_at || currentAppt?.visit_date_time || '';
          const resolvedVisitDate = freshAppt.visit_date_time || freshAppt.appointment_date || freshAppt.appointment_time || currentAppt?.visit_date_time || '';

          const merged = {
            ...freshAppt,
            name: resolvedPatientName,
            patient_name: resolvedPatientName,
            patient_Name: resolvedPatientName,
            account_holder_name: resolvedAccountHolder,
            booked_by: resolvedAccountHolder,
            gender: resolvedGender,
            Gender: resolvedGender,
            age: resolvedAge,
            Age: resolvedAge,
            blood_group: resolvedBloodGroup,
            Blood_Group: resolvedBloodGroup,
            address: resolvedAddress,
            contact: resolvedContact,
            phone: resolvedContact,
            email: resolvedEmail,
            uhid: resolvedUhid,
            created_at: resolvedCreatedAt,
            visit_date_time: resolvedVisitDate,
            appointment_id: formattedApptId,
            Appoment_id: formattedApptId,
            hospital_name: freshAppt.hospital_name || hospObj?.Name || hospObj?.name || 'Main Hospital Branch',
            doctor_name: freshAppt.doctor_name || (typeof freshAppt.doctor === 'object' ? (freshAppt.doctor?.name ? (freshAppt.doctor.name.startsWith('Dr.') ? freshAppt.doctor.name : `Dr. ${freshAppt.doctor.name}`) : '') : '') || (docObj ? (docObj.name?.startsWith('Dr.') ? docObj.name : `Dr. ${docObj.name}`) : (docId ? `Dr. #${docId}` : 'Unassigned Doctor')),
            doctor_specialization: resolvedDocSpec,
            nurse_name: freshAppt.nurse_name || (nurseObj ? nurseObj.name : ''),
            consultation_fee: docFee,
            hospitals_charges: hospCharges,
            Hospitals_Chargies: hospCharges,
            total_bill: totalBill,
            amount_paid: amtPaid,
            condition: freshAppt.condition || freshAppt.Condation || freshAppt.symptoms_severity || 'Normal',
            status: freshAppt.status || 'Pending'
          };

          setAppointmentData(merged);
          if (setSelectedAppointment) setSelectedAppointment(merged);
          localStorage.setItem('selectedAppointment', JSON.stringify(merged));
        }
      }
    } catch (err) {
      console.error('Error fetching appointment details:', err);
    } finally {
      setIsDataFetching(false);
    }
  };

  useEffect(() => {
    loadAppointmentDetails();
  }, [selectedAppointment?.id]);

  const activeAppt = appointmentData || {};
  const isAdmitted = (activeAppt.status === 'Admitted' || activeAppt.status === 'In Consultation') && activeAppt.status !== 'Discharged' && activeAppt.status !== 'Cancelled';
  const isDischarged = activeAppt.status === 'Discharged' || activeAppt.status === 'Completed';
  const isCancelled = activeAppt.status === 'Cancelled' || activeAppt.status === 'Rejected';

  const docFee = Number(activeAppt.consultation_fee ?? 0);
  const hospCharge = Number(activeAppt.hospitals_charges ?? activeAppt.Hospitals_Chargies ?? 0);
  const totalBill = docFee + hospCharge;
  const amountPaid = Number(activeAppt.amount_paid ?? 0);
  const pendingDue = Math.max(0, totalBill - amountPaid);

  const rawApptId = activeAppt.appointment_id || activeAppt.Appoment_id || activeAppt.appoment_id || activeAppt.id;
  const displayId = rawApptId
    ? (String(rawApptId).startsWith('APT-') ? String(rawApptId) : `APT-${rawApptId}`)
    : 'APT-1';
  const displayPatientName = activeAppt.patient_name || activeAppt.name || activeAppt.patient_Name || 'Patient';
  const displayAccountHolder = activeAppt.account_holder_name || activeAppt.booked_by || displayPatientName;
  const displayName = displayPatientName;
  const displayEmail = (activeAppt.email || '').toLowerCase().trim();
  const displayPhone = activeAppt.contact || activeAppt.phone || '-';

  const handleBackClick = () => {
    if (setCurrentPage) {
      setCurrentPage('super_admin_appointments');
    }
  };

  // Open Status / Bed Modal
  const handleOpenStatusModal = () => {
    let nurseVal = '';
    if (activeAppt.nurse) {
      nurseVal = String(typeof activeAppt.nurse === 'object' ? activeAppt.nurse.id : activeAppt.nurse);
    } else if (activeAppt.nurse_name) {
      const cleanNurseName = activeAppt.nurse_name.toLowerCase().trim();
      const match = nursesList.find(n => (n.name || '').toLowerCase().trim() === cleanNurseName);
      if (match) nurseVal = String(match.id);
    }

    setStatusUpdateValue(activeAppt.status || 'Pending');
    setBedUpdateValue(activeAppt.bed_number != null && activeAppt.bed_number !== '' ? String(activeAppt.bed_number) : '');
    setNurseUpdateValue(nurseVal);
    setStatusRemarks(activeAppt.symptoms_diagnosis || activeAppt.reason_for_visit || '');
    setIsStatusModalOpen(true);
  };

  const handleSaveStatusModal = async (e) => {
    e.preventDefault();
    if (!activeAppt || !activeAppt.id) return;
    try {
      setIsUpdatingStatus(true);
      const isDischarging = statusUpdateValue === 'Discharged' || statusUpdateValue === 'Cancelled';
      const bedNum = isDischarging ? null : (bedUpdateValue ? Number(bedUpdateValue) : null);
      const nurseObj = nursesList.find(n => Number(n.id) === Number(nurseUpdateValue));

      const payload = {
        status: statusUpdateValue,
        bed_number: bedNum,
        nurse: nurseUpdateValue ? Number(nurseUpdateValue) : null,
        nurse_name: nurseObj ? nurseObj.name : '',
        symptoms_diagnosis: statusRemarks.trim() || activeAppt.symptoms_diagnosis || 'Status updated by Super Admin'
      };

      const res = await fetch(`${API_BASE_URL}/super-admin/appointments/${activeAppt.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res && res.ok) {
        alert(`Appointment status updated to "${statusUpdateValue}" successfully.${isDischarging ? ' Bed has been released.' : ''}`);
        setIsStatusModalOpen(false);
        loadAppointmentDetails();
      } else {
        const errData = res ? await res.json().catch(() => ({})) : {};
        alert(errData.message || errData.detail || 'Failed to update clinical status.');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Network error while updating appointment status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Open Edit Details Modal
  const handleOpenEditModal = () => {
    let hospVal = '';
    if (activeAppt.hospital) {
      hospVal = String(typeof activeAppt.hospital === 'object' ? activeAppt.hospital.id : activeAppt.hospital);
    } else if (activeAppt.hospital_name) {
      const match = hospitalsList.find(h => 
        (h.Name && h.Name.toLowerCase().trim() === activeAppt.hospital_name.toLowerCase().trim()) ||
        (h.name && h.name.toLowerCase().trim() === activeAppt.hospital_name.toLowerCase().trim())
      );
      if (match) hospVal = String(match.id);
    }

    let docVal = '';
    if (activeAppt.doctor) {
      docVal = String(typeof activeAppt.doctor === 'object' ? activeAppt.doctor.id : activeAppt.doctor);
    } else if (activeAppt.doctor_name) {
      const cleanDocName = activeAppt.doctor_name.replace(/^dr\.?\s*/i, '').toLowerCase().trim();
      const match = doctorsList.find(d => {
        const dClean = (d.name || '').replace(/^dr\.?\s*/i, '').toLowerCase().trim();
        return dClean && cleanDocName && (dClean === cleanDocName || dClean.includes(cleanDocName) || cleanDocName.includes(dClean));
      });
      if (match) docVal = String(match.id);
    }

    let nurseVal = '';
    if (activeAppt.nurse) {
      nurseVal = String(typeof activeAppt.nurse === 'object' ? activeAppt.nurse.id : activeAppt.nurse);
    } else if (activeAppt.nurse_name) {
      const cleanNurseName = activeAppt.nurse_name.toLowerCase().trim();
      const match = nursesList.find(n => (n.name || '').toLowerCase().trim() === cleanNurseName);
      if (match) nurseVal = String(match.id);
    }

    let formattedDateTime = '';
    const dateSrc = activeAppt.visit_date_time || activeAppt.appointment_date || activeAppt.created_at;
    if (dateSrc) {
      try {
        const dt = new Date(dateSrc);
        if (!isNaN(dt.getTime())) {
          const pad = (n) => String(n).padStart(2, '0');
          formattedDateTime = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
        }
      } catch {}
    }

    setEditFormData({
      name: activeAppt.patient_name || activeAppt.name || activeAppt.patient_Name || '',
      account_holder_name: activeAppt.account_holder_name || activeAppt.booked_by || '',
      contact: activeAppt.contact || activeAppt.phone || '',
      email: activeAppt.email || '',
      age: activeAppt.age != null && activeAppt.age !== '' ? String(activeAppt.age) : (activeAppt.Age != null && activeAppt.Age !== '' ? String(activeAppt.Age) : ''),
      gender: activeAppt.gender || activeAppt.Gender || activeAppt.patient_gender || 'Male',
      blood_group: activeAppt.blood_group || activeAppt.Blood_Group || 'A+',
      address: activeAppt.address || '',
      hospital: hospVal,
      doctor: docVal,
      consultation_fee: Number(activeAppt.consultation_fee ?? docFee ?? 0),
      hospitals_charges: Number(activeAppt.hospitals_charges ?? activeAppt.Hospitals_Chargies ?? hospCharge ?? 0),
      amount_paid: Number(activeAppt.amount_paid ?? amountPaid ?? 0),
      payment_status: activeAppt.payment_status || 'Pending',
      payment_method: activeAppt.payment_method || 'Cash',
      condition: activeAppt.condition || activeAppt.Condation || 'Normal',
      status: activeAppt.status || 'Pending',
      bed_number: activeAppt.bed_number != null && activeAppt.bed_number !== '' ? String(activeAppt.bed_number) : '',
      nurse: nurseVal,
      symptoms_diagnosis: activeAppt.symptoms_diagnosis || activeAppt.reason_for_visit || '',
      visit_date_time: formattedDateTime
    });
    setIsEditModalOpen(true);
  };

  const handleEditDoctorChange = (e) => {
    const docId = e.target.value;
    const docObj = doctorsList.find(d => Number(d.id) === Number(docId));
    const fee = docObj ? Number(docObj.consultation_fee || 0) : 0;
    const hosp = Number(editFormData.hospitals_charges) || 0;
    setEditFormData(prev => ({
      ...prev,
      doctor: docId,
      consultation_fee: fee,
      amount_paid: prev.payment_status === 'Paid' ? fee + hosp : prev.amount_paid
    }));
  };

  const handleSaveEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeAppt || !activeAppt.id) return;
    try {
      setIsSavingEdit(true);
      const selectedDoc = doctorsList.find(d => Number(d.id) === Number(editFormData.doctor));
      const selectedHosp = hospitalsList.find(h => Number(h.id) === Number(editFormData.hospital));
      const isDischarging = editFormData.status === 'Discharged' || editFormData.status === 'Cancelled';
      const parsedBed = isDischarging ? null : (editFormData.bed_number ? Number(editFormData.bed_number) : null);

      const payload = {
        patient_name: editFormData.name.trim(),
        name: editFormData.name.trim(),
        account_holder_name: (editFormData.account_holder_name || '').trim(),
        booked_by: (editFormData.account_holder_name || '').trim(),
        contact: editFormData.contact.trim(),
        phone: editFormData.contact.trim(),
        email: editFormData.email.trim(),
        age: editFormData.age ? Number(editFormData.age) : null,
        gender: editFormData.gender,
        Gender: editFormData.gender,
        blood_group: editFormData.blood_group,
        Blood_Group: editFormData.blood_group,
        address: editFormData.address.trim(),
        hospital: editFormData.hospital ? Number(editFormData.hospital) : null,
        hospital_name: selectedHosp ? (selectedHosp.Name || selectedHosp.name) : activeAppt.hospital_name,
        doctor: editFormData.doctor ? Number(editFormData.doctor) : null,
        doctor_name: selectedDoc ? selectedDoc.name : activeAppt.doctor_name,
        doctor_specialization: selectedDoc ? (selectedDoc.specialization || selectedDoc.specialty || '') : activeAppt.doctor_specialization,
        consultation_fee: Number(editFormData.consultation_fee) || 0,
        hospitals_charges: Number(editFormData.hospitals_charges) || 0,
        Hospitals_Chargies: Number(editFormData.hospitals_charges) || 0,
        amount_paid: Number(editFormData.amount_paid) || 0,
        payment_status: editFormData.payment_status,
        payment_method: editFormData.payment_method,
        condition: editFormData.condition,
        Condation: editFormData.condition,
        status: editFormData.status,
        bed_number: parsedBed,
        symptoms_diagnosis: editFormData.symptoms_diagnosis.trim(),
        reason_for_visit: editFormData.symptoms_diagnosis.trim(),
        visit_date_time: editFormData.visit_date_time ? new Date(editFormData.visit_date_time).toISOString() : activeAppt.visit_date_time
      };

      const res = await fetch(`${API_BASE_URL}/super-admin/appointments/${activeAppt.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res && res.ok) {
        alert('Appointment details updated successfully.');
        setIsEditModalOpen(false);
        loadAppointmentDetails();
      } else {
        const errData = res ? await res.json().catch(() => ({})) : {};
        alert(errData.message || errData.detail || 'Failed to update appointment.');
      }
    } catch (err) {
      console.error('Error saving appointment:', err);
      alert('Error updating appointment.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (!activeAppt || !activeAppt.id) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-800">No Appointment Selected</h2>
          <p className="text-xs text-slate-500">
            Please return to the Appointments hub and select an appointment record to inspect its full clinical journey.
          </p>
          <button
            type="button"
            onClick={handleBackClick}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition cursor-pointer"
          >
            &larr; Back to Appointments List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 animate-fade-in">
      {/* TOP NAVIGATION & BREADCRUMB */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
        >
          &larr; Back to Appointments Hub
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span>Super Admin</span>
          <span>/</span>
          <span>Appointments</span>
          <span>/</span>
          <span className="font-semibold text-slate-700 font-mono">
            {displayId}
          </span>
        </div>
      </div>

      {/* HEADER HERO BANNER */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md shrink-0">
            {displayPatientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                {displayId}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                activeAppt.status === 'Confirmed' || activeAppt.status === 'Admitted' || activeAppt.status === 'Discharged' || activeAppt.status === 'Completed'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : activeAppt.status === 'Cancelled' || activeAppt.status === 'Rejected'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {activeAppt.status || 'Pending'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                activeAppt.condition === 'Critical'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : activeAppt.condition === 'Emergency'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : activeAppt.condition === 'Urgent'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                Condition: {activeAppt.condition || 'Normal'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                activeAppt.payment_status === 'Paid'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                Payment: {activeAppt.payment_status || 'Pending'}
              </span>
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Patient Name:
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
                  {displayPatientName}
                </h1>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                <span className="text-slate-500 font-semibold">
                  Account Holder:
                </span>
                <strong className="text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200 font-bold">
                  {displayAccountHolder}
                </strong>
                {displayEmail && (
                  <span className="text-slate-400 font-mono text-[11px]">
                    {displayEmail}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              {(activeAppt.gender || activeAppt.age) && (
                <>
                  <span>
                    {[activeAppt.gender, activeAppt.age ? `${activeAppt.age} yrs` : null].filter(Boolean).join(', ')}
                  </span>
                  <span>•</span>
                </>
              )}
              {activeAppt.blood_group && (
                <>
                  <span>Blood: <strong className="text-rose-700 font-semibold">{activeAppt.blood_group}</strong></span>
                  <span>•</span>
                </>
              )}
              <span>Phone: <strong className="text-slate-700 font-mono">{displayPhone}</strong></span>
              {displayEmail && (
                <>
                  <span>•</span>
                  <a
                    href={`mailto:${displayEmail}`}
                    title={`Send email to ${displayEmail}`}
                    className="text-sky-600 hover:text-sky-800 hover:underline lowercase font-medium"
                  >
                    {displayEmail}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* HEADER ACTIONS */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleOpenStatusModal}
            className="px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs border border-purple-200 transition cursor-pointer"
          >
            Update Clinical Status / Bed
          </button>
          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            Edit Appointment Data
          </button>
        </div>
      </div>

      {/* APPOINTMENT LIFECYCLE PROGRESS / JOURNEY (BOOKING TO DISCHARGE) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Complete Consultation & Admission Lifecycle</h2>
            <p className="text-xs text-slate-500">Live progress tracking from initial booking to discharge</p>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Scheduled: {activeAppt.visit_date_time ? new Date(activeAppt.visit_date_time).toLocaleString() : '-'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* STAGE 1: REGISTRATION */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 1</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Appointment Booked</h3>
            <p className="text-slate-700 text-[11px]">
              Patient: <strong className="text-slate-900">{displayPatientName}</strong>
            </p>
            <p className="text-slate-600 text-[10px]">
              Booked By: <strong className="text-indigo-700">{displayAccountHolder}</strong>
            </p>
            <p className="text-slate-500 text-[10px]">
              Branch: <strong className="text-slate-700">{activeAppt.hospital_name || '-'}</strong>
            </p>
            <p className="text-slate-400 text-[10px]">
              {activeAppt.created_at
                ? new Date(activeAppt.created_at).toLocaleDateString()
                : activeAppt.visit_date_time
                ? new Date(activeAppt.visit_date_time).toLocaleDateString()
                : '-'}
            </p>
          </div>

          {/* STAGE 2: DOCTOR ASSIGNMENT */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 2</span>
              <span className={`w-2 h-2 rounded-full ${activeAppt.doctor_name ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Doctor Consultation</h3>
            <p className="text-slate-600 font-semibold text-[11px] truncate">
              {activeAppt.doctor_name || 'Awaiting Doctor Assignment'}
            </p>
            {activeAppt.doctor_specialization ? (
              <p className="text-slate-500 text-[10px]">
                Dept: {activeAppt.doctor_specialization}
              </p>
            ) : null}
          </div>

          {/* STAGE 3: BED ALLOCATION / INPATIENT */}
          <div className={`p-3.5 rounded-xl border space-y-1.5 ${
            isAdmitted ? 'border-purple-200 bg-purple-50/50' : 'border-slate-200 bg-slate-50/60'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 3</span>
              <span className={`w-2 h-2 rounded-full ${isAdmitted ? 'bg-purple-600 animate-pulse' : 'bg-slate-300'}`}></span>
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Inpatient & Bed Status</h3>
            <p className="text-slate-700 font-medium text-[11px]">
              {isAdmitted && activeAppt.bed_number ? (
                <strong className="text-purple-900">Bed #{activeAppt.bed_number} (Floor {getFloorNumber(activeAppt.bed_number)})</strong>
              ) : isDischarged ? (
                <span className="text-emerald-700 font-semibold">Discharged</span>
              ) : (
                <span className="text-slate-400 italic">OPD / Outpatient</span>
              )}
            </p>
            {activeAppt.nurse_name && (
              <p className="text-slate-500 text-[10px]">Nurse: {activeAppt.nurse_name}</p>
            )}
          </div>

          {/* STAGE 4: DISCHARGE & SETTLEMENT */}
          <div className={`p-3.5 rounded-xl border space-y-1.5 ${
            isDischarged ? 'border-emerald-200 bg-emerald-50/50' : isCancelled ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-slate-50/60'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 4</span>
              <span className={`w-2 h-2 rounded-full ${isDischarged ? 'bg-emerald-600' : isCancelled ? 'bg-rose-500' : 'bg-slate-300'}`}></span>
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Discharge & Billing</h3>
            <p className="text-slate-700 font-medium text-[11px]">
              {isDischarged ? 'Completed & Discharged' : isCancelled ? 'Visit Cancelled' : 'Ongoing / In Progress'}
            </p>
            <p className="text-[10px] font-mono font-bold text-slate-600">
              Bill: ₹{totalBill.toFixed(2)} | Paid: ₹{amountPaid.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* 2-COLUMN MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* LEFT 2 COLUMNS: PATIENT & CLINICAL DETAILS */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* MEDICAL & CLINICAL DETAILS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 border-b border-slate-100 pb-3">
              Medical & Consultation Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Hospital Branch</span>
                <span className="font-bold text-slate-800 text-sm">{activeAppt.hospital_name || 'Not Provided'}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Assigned Physician</span>
                <span className="font-bold text-teal-800 text-sm">{activeAppt.doctor_name || 'Not Assigned'}</span>
                {activeAppt.doctor_specialization ? (
                  <span className="text-slate-500 text-[11px] block">{activeAppt.doctor_specialization}</span>
                ) : null}
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Scheduled Date & Time</span>
                <span className="font-semibold text-slate-800">
                  {activeAppt.visit_date_time ? new Date(activeAppt.visit_date_time).toLocaleString() : '-'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Triage Severity</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                  activeAppt.condition === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                  activeAppt.condition === 'Emergency' ? 'bg-red-100 text-red-800 border-red-300' :
                  activeAppt.condition === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {activeAppt.condition || 'Normal'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Bed Number & Ward</span>
                {activeAppt.bed_number ? (
                  <span className="font-mono font-bold text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 inline-block">
                    Bed #{activeAppt.bed_number} (Floor {getFloorNumber(activeAppt.bed_number)})
                  </span>
                ) : (
                  <span className="text-slate-400 italic">No bed allocated (Outpatient)</span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Assigned Nurse</span>
                <span className="font-semibold text-slate-700">{activeAppt.nurse_name || 'No nurse allocated'}</span>
              </div>
            </div>

            {/* SYMPTOMS & DIAGNOSIS */}
            <div className="pt-3 border-t border-slate-100 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Symptoms / Diagnosis / Reason for Visit</span>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs leading-relaxed font-medium">
                {activeAppt.symptoms_diagnosis || activeAppt.reason_for_visit || 'No specific clinical symptoms or diagnosis notes recorded for this visit.'}
              </div>
            </div>

            {/* MEDICAL DOCUMENT */}
            {activeAppt.attached_document && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between p-3 bg-sky-50 rounded-xl border border-sky-100">
                <span className="font-semibold text-sky-900 text-xs">Medical Document Attached</span>
                <a
                  href={activeAppt.attached_document}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs transition"
                >
                  Download / View File &rarr;
                </a>
              </div>
            )}
          </div>

          {/* PATIENT DEMOGRAPHICS & ACCOUNT IDENTIFICATION CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  Patient & Account Information
                </h2>
                <p className="text-xs text-slate-500">
                  Detailed profile of treated patient vs registered booking account
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-sky-700 block">
                  Patient Name
                </span>
                <span className="font-extrabold text-slate-900 text-base block">{displayPatientName}</span>
                <span className="text-[10px] text-slate-500 block">
                  Name entered on appointment booking form
                </span>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1">
                <span className="text-[10px] font-bold uppercase text-indigo-700 block">
                  Account Holder
                </span>
                <span className="font-extrabold text-indigo-900 text-base block">{displayAccountHolder}</span>
                <span className="text-[10px] text-slate-500 block">
                  User registered with email: <strong className="text-indigo-700">{displayEmail || '-'}</strong>
                </span>
              </div>

              {activeAppt.uhid ? (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Patient UHID / Record ID</span>
                  <span className="font-mono font-bold text-slate-700">
                    {activeAppt.uhid}
                  </span>
                </div>
              ) : null}

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Registered Account Email</span>
                {displayEmail ? (
                  <a
                    href={`mailto:${displayEmail}`}
                    title={`Send email to ${displayEmail}`}
                    className="text-sky-700 hover:text-sky-900 hover:underline lowercase font-medium"
                  >
                    {displayEmail}
                  </a>
                ) : (
                  <span className="text-slate-400">No email registered</span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Contact Number</span>
                <span className="font-mono font-bold text-slate-800">{displayPhone}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Age & Gender</span>
                <span className="font-semibold text-slate-700">
                  {[activeAppt.gender, activeAppt.age ? `${activeAppt.age} yrs` : null].filter(Boolean).join(', ') || '-'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Blood Group</span>
                <span className="font-bold text-rose-700">{activeAppt.blood_group || activeAppt.Blood_Group || '-'}</span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Residential Address</span>
                <span className="font-medium text-slate-700">{activeAppt.address || 'No residential address recorded'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: BILLING & INVOICE BREAKDOWN */}
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Billing & Invoice Summary</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                activeAppt.payment_status === 'Paid'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {activeAppt.payment_status || 'Pending'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Doctor Consultation Fee</span>
                <span className="font-mono font-bold text-slate-800">
                  {docFee > 0 ? `₹${docFee.toFixed(2)}` : '₹0.00'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Hospital Facility Charges</span>
                <span className="font-mono font-bold text-slate-800">
                  {hospCharge > 0 ? `₹${hospCharge.toFixed(2)}` : '₹0.00'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-200 bg-slate-50/70 px-2 rounded-xl">
                <span className="font-bold text-slate-800">Total Invoice Amount</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  ₹{totalBill.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-emerald-700 font-semibold">Amount Paid</span>
                <span className="font-mono font-bold text-emerald-700">
                  ₹{amountPaid.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-slate-100">
                <span className="text-amber-700 font-semibold">Outstanding Due</span>
                <span className="font-mono font-bold text-amber-700">
                  ₹{pendingDue.toFixed(2)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Payment Mode</span>
                <p className="font-semibold text-slate-700">{activeAppt.payment_method || 'Cash'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenEditModal}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer text-center"
            >
              Update Billing & Record Payment
            </button>
          </div>
        </div>
      </div>

      {/* UPDATE STATUS & BED MODAL */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Update Clinical Status & Bed</h2>
                <p className="text-xs text-slate-500">Change patient state, allocate bed or process discharge</p>
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
                <label className="block font-semibold text-slate-700 uppercase mb-1">Clinical Status *</label>
                <select
                  value={statusUpdateValue}
                  onChange={(e) => setStatusUpdateValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                >
                  {statusOptions.map((st, idx) => (
                    <option key={idx} value={st}>{st}</option>
                  ))}
                </select>
                {statusUpdateValue === 'Discharged' && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    ✓ Discharging will automatically release any assigned bed and update occupancy counters.
                  </p>
                )}
              </div>

              {statusUpdateValue !== 'Discharged' && statusUpdateValue !== 'Cancelled' && (
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Bed Number {statusUpdateValue === 'Admitted' ? '(Required for Inpatient)' : '(Optional)'}
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 101, 204"
                    value={bedUpdateValue}
                    onChange={(e) => setBedUpdateValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assigned Nurse</label>
                <select
                  value={nurseUpdateValue}
                  onChange={(e) => setNurseUpdateValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                >
                  <option value="">-- Select Nurse (Optional) --</option>
                  {nursesList.map(n => (
                    <option key={n.id} value={n.id}>{n.name} ({n.ward || 'General'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Doctor Remarks / Symptoms</label>
                <textarea
                  rows={2}
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="Clinical progress notes, diagnosis, or discharge advice..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 resize-none"
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
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT APPOINTMENT & BILLING MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Edit Appointment & Billing</h2>
                <p className="text-xs text-slate-500">Update patient demographic data, doctors, charges, and payment</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold"
                    placeholder="Patient Name"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.account_holder_name}
                    onChange={(e) => setEditFormData({ ...editFormData, account_holder_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold"
                    placeholder="Account Holder Name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editFormData.contact}
                    onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Age</label>
                  <input
                    type="number"
                    value={editFormData.age}
                    onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium"
                    placeholder="Age"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Gender</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Branch *</label>
                  <select
                    value={editFormData.hospital}
                    onChange={(e) => setEditFormData({ ...editFormData, hospital: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="">-- Select Hospital Branch --</option>
                    {hospitalsList.map(h => (
                      <option key={h.id} value={h.id}>{h.Name || h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Assign Doctor</label>
                  <select
                    value={editFormData.doctor}
                    onChange={handleEditDoctorChange}
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
                    value={editFormData.consultation_fee}
                    onChange={(e) => {
                      const fee = parseFloat(e.target.value) || 0;
                      setEditFormData({ ...editFormData, consultation_fee: fee, amount_paid: fee + (Number(editFormData.hospitals_charges) || 0) });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Charges (₹)</label>
                  <input
                    type="number"
                    value={editFormData.hospitals_charges}
                    onChange={(e) => {
                      const hosp = parseFloat(e.target.value) || 0;
                      setEditFormData({ ...editFormData, hospitals_charges: hosp, amount_paid: (Number(editFormData.consultation_fee) || 0) + hosp });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={editFormData.amount_paid}
                    onChange={(e) => setEditFormData({ ...editFormData, amount_paid: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Payment Status</label>
                  <select
                    value={editFormData.payment_status}
                    onChange={(e) => setEditFormData({ ...editFormData, payment_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    {paymentStatuses.map((st, idx) => (
                      <option key={idx} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Payment Mode</label>
                  <select
                    value={editFormData.payment_method}
                    onChange={(e) => setEditFormData({ ...editFormData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    {paymentMethods.map((pm, idx) => (
                      <option key={idx} value={pm}>{pm}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Condition</label>
                  <select
                    value={editFormData.condition}
                    onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    {conditionChoices.map((c, idx) => (
                      <option key={idx} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Clinical Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    {statusOptions.map((st, idx) => (
                      <option key={idx} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Bed Number</label>
                  <input
                    type="number"
                    placeholder="e.g. 101"
                    value={editFormData.bed_number}
                    onChange={(e) => setEditFormData({ ...editFormData, bed_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Scheduled Visit Date & Time</label>
                <input
                  type="datetime-local"
                  value={editFormData.visit_date_time}
                  onChange={(e) => setEditFormData({ ...editFormData, visit_date_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Symptoms / Reason for Visit</label>
                <textarea
                  rows={2}
                  value={editFormData.symptoms_diagnosis}
                  onChange={(e) => setEditFormData({ ...editFormData, symptoms_diagnosis: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminAppointmentDetails;
