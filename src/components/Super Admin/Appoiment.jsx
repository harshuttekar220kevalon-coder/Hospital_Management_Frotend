import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const getFloorNumber = (bed) => {
  if (!bed) return null;
  const num = Number(bed);
  if (isNaN(num) || num <= 0) return null;
  return Math.floor((num - 1) / 100) + 1;
};

const SuperAdminAppointments = ({ currentUser, setCurrentPage, setSelectedPatient, setSelectedAppointment }) => {
  const [appointments, setAppointments] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [specializationFilter, setSpecializationFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  // Status & Bed Allocation Modal State
  const [selectedApptForAction, setSelectedApptForAction] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatusValue, setNewStatusValue] = useState('');
  const [newBedValue, setNewBedValue] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Book Appointment Modal State
  const [patientsList, setPatientsList] = useState([]);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const initialBookFormState = {
    selected_patient_id: '',
    patient_name: '',
    email: '',
    contact: '',
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
    symptoms_diagnosis: '',
    visit_date_time: new Date().toISOString().slice(0, 16)
  };
  const [bookFormData, setBookFormData] = useState(initialBookFormState);

  const statusOptions = ['Pending', 'Assigned', 'Admitted', 'Discharged', 'Cancelled'];
  const severityLevels = ['Critical', 'Emergency', 'Urgent', 'Normal'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Not Known'];

  const fetchAllAppointmentsData = async () => {
    try {
      setLoading(true);

      const [apptRes, hospRes, docRes, nurRes, patRes] = await Promise.all([
        fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Patients/`).catch(() => null)
      ]);

      let rawAppts = [];
      let hospData = [];
      let docData = [];
      let nurData = [];
      let patsData = [];

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
      if (nurRes && nurRes.ok) {
        const nJson = await nurRes.json().catch(() => []);
        nurData = Array.isArray(nJson) ? nJson : (nJson?.results || []);
        setNursesList(nurData);
      }
      if (patRes && patRes.ok) {
        const pJson = await patRes.json().catch(() => []);
        patsData = Array.isArray(pJson) ? pJson : (pJson?.results || pJson?.data || []);
        setPatientsList(patsData);
      }
      if (apptRes && apptRes.ok) {
        const aJson = await apptRes.json().catch(() => []);
        rawAppts = Array.isArray(aJson) ? aJson : (aJson?.results || aJson?.data || aJson?.appointments || []);
      }

      // Normalize EVERY appointment booking (preserving multiple bookings with the same email)
      const normalized = rawAppts.map((item) => {
        const id = item.id || item.Appoment_id || item.appointment_id;
        const apptId = item.Appoment_id || item.appointment_id || (typeof id === 'string' && id.startsWith('APT-') ? id : `APT-${id}`);
        
        const patEmail = (item.email || '').toLowerCase().trim();
        const patPhone = (item.contact || item.phone || '').trim();
        const patIdVal = item.patient || item.patient_id;

        const matchedPat = patsData.find(p => 
          (patIdVal && (Number(p.id) === Number(patIdVal) || String(p.id) === String(patIdVal))) ||
          (patEmail && p.email && p.email.toLowerCase().trim() === patEmail) ||
          (patPhone && (p.contact === patPhone || p.phone === patPhone))
        ) || null;

        const resolvedAccountHolder = matchedPat?.name || matchedPat?.patient_Name || matchedPat?.patient_name || item.account_holder_name || item.booked_by || (item.email ? item.email.split('@')[0] : 'Account User');
        const rawPatName = item.patient_name || item.patient_Name || (item.name && item.name !== 'Patient' ? item.name : '');
        const resolvedPatientName = rawPatName || matchedPat?.name || matchedPat?.patient_name || `Patient #${id}`;
        
        const hospId = typeof item.hospital === 'object' ? item.hospital?.id : item.hospital;
        const docId = typeof item.doctor === 'object' ? item.doctor?.id : item.doctor;
        const nurseId = typeof item.nurse === 'object' ? item.nurse?.id : item.nurse;

        const hospObj = hospId ? hospData.find(h => Number(h.id) === Number(hospId)) : null;
        const docObj = docId ? docData.find(d => Number(d.id) === Number(docId)) : null;
        const nurseObj = nurseId ? nurData.find(n => Number(n.id) === Number(nurseId)) : null;

        const docFee = Number(item.consultation_fee || docObj?.consultation_fee || 0);
        const hospCharges = Number(item.hospitals_charges || item.Hospitals_Chargies || 0);
        const total = docFee + hospCharges;
        const amtPaid = Number(item.amount_paid || (item.payment_status === 'Paid' ? total : 0));

        const visitDateStr = item.visit_date_time || item.appointment_date || item.created_at || new Date().toISOString();

        return {
          ...item,
          id,
          appointment_id: apptId,
          Appoment_id: apptId,
          uhid: item.uhid || item.patient_id || (matchedPat?.uhid ? matchedPat.uhid : `UHID-${id}`),
          patient_id: item.patient_id || item.uhid || `PAT-${id}`,
          name: resolvedPatientName,
          patient_name: resolvedPatientName,
          patient_Name: resolvedPatientName,
          account_holder_name: resolvedAccountHolder,
          booked_by: resolvedAccountHolder,
          email: item.email || matchedPat?.email || '',
          contact: item.contact || item.phone || matchedPat?.contact || matchedPat?.phone || '',
          phone: item.contact || item.phone || matchedPat?.contact || matchedPat?.phone || '',
          age: item.age || item.Age || matchedPat?.age || matchedPat?.Age || '',
          gender: item.gender || item.Gender || item.patient_gender || matchedPat?.gender || matchedPat?.Gender || '',
          blood_group: item.blood_group || item.Blood_Group || matchedPat?.blood_group || matchedPat?.Blood_Group || '',
          address: item.address || matchedPat?.address || '',
          hospital: hospId ? Number(hospId) : null,
          hospital_name: item.hospital_name || hospObj?.Name || hospObj?.name || 'Central Hospital',
          doctor: docId ? Number(docId) : null,
          doctor_name: item.doctor_name || (docObj ? (docObj.name?.startsWith('Dr.') ? docObj.name : `Dr. ${docObj.name}`) : (docId ? `Dr. #${docId}` : 'Not Assigned')),
          doctor_specialization: item.doctor_specialization || docObj?.specialization || docObj?.specialty || '',
          nurse: nurseId ? Number(nurseId) : null,
          nurse_name: item.nurse_name || (nurseObj ? nurseObj.name : ''),
          bed_number: item.bed_number ? Number(item.bed_number) : null,
          consultation_fee: docFee,
          Hospitals_Chargies: hospCharges,
          hospitals_charges: hospCharges,
          total_bill: total,
          amount_paid: amtPaid,
          pending_due: Math.max(0, total - amtPaid),
          payment_status: item.payment_status || (amtPaid >= total && total > 0 ? 'Paid' : 'Pending'),
          payment_method: item.payment_method || 'Cash',
          condition: item.condition || item.Condation || item.condation || item.symptoms_severity || 'Normal',
          Condation: item.condition || item.Condation || item.condation || item.symptoms_severity || 'Normal',
          status: item.status || 'Pending',
          symptoms_diagnosis: item.symptoms_diagnosis || item.reason_for_visit || 'General Consultation',
          visit_date_time: visitDateStr,
          created_at: item.created_at || visitDateStr,
          attached_document: item.attached_document || item.document || ''
        };
      });

      // Sort newest appointments first
      normalized.sort((a, b) => new Date(b.visit_date_time || 0) - new Date(a.visit_date_time || 0));
      setAppointments(normalized);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAppointmentsData();
  }, []);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, activeTab, hospitalFilter, specializationFilter, severityFilter]);

  const todayStr = new Date().toISOString().split('T')[0];

  const isTodayAppt = (item) => {
    const d = item.visit_date_time || item.created_at || item.appointment_date;
    return d && d.includes(todayStr);
  };

  // Metrics
  const totalBookingsCount = appointments.length;
  const todayBookingsCount = appointments.filter(a => isTodayAppt(a)).length;
  const pendingCount = appointments.filter(a => a.status === 'Pending' || a.status === 'Pending Review').length;
  const assignedCount = appointments.filter(a => a.status === 'Assigned').length;
  
  // Bed occupancy strict rule: ONLY occupied when status is Admitted (not Discharged and not Cancelled) with assigned bed
  const admittedInpatientsCount = appointments.filter(a => (a.status === 'Admitted' || a.status === 'In Consultation') && a.status !== 'Discharged' && a.status !== 'Cancelled' && a.bed_number != null).length;
  const dischargedCount = appointments.filter(a => a.status === 'Discharged' || a.status === 'Completed').length;
  const cancelledCount = appointments.filter(a => a.status === 'Cancelled' || a.status === 'Rejected').length;

  const filteredAppointments = appointments.filter((appt) => {
    const term = searchTerm.toLowerCase();

    if (activeTab === 'TODAY' && !isTodayAppt(appt)) return false;
    if (activeTab === 'PENDING' && appt.status !== 'Pending' && appt.status !== 'Pending Review') return false;
    if (activeTab === 'ASSIGNED' && appt.status !== 'Assigned') return false;
    if (activeTab === 'ADMITTED' && appt.status !== 'Admitted' && appt.status !== 'In Consultation') return false;
    if (activeTab === 'DISCHARGED' && appt.status !== 'Discharged' && appt.status !== 'Completed') return false;
    if (activeTab === 'CANCELLED' && appt.status !== 'Cancelled' && appt.status !== 'Rejected') return false;

    const matchesSearch =
      (appt.name || '').toLowerCase().includes(term) ||
      (appt.account_holder_name || '').toLowerCase().includes(term) ||
      (appt.booked_by || '').toLowerCase().includes(term) ||
      (appt.appointment_id || '').toLowerCase().includes(term) ||
      (appt.email || '').toLowerCase().includes(term) ||
      (appt.contact || appt.phone || '').toLowerCase().includes(term) ||
      (appt.doctor_name || '').toLowerCase().includes(term) ||
      (appt.hospital_name || '').toLowerCase().includes(term) ||
      (appt.symptoms_diagnosis || '').toLowerCase().includes(term) ||
      (appt.bed_number ? `bed ${appt.bed_number}` : '').toLowerCase().includes(term);

    const matchesHosp =
      hospitalFilter === 'ALL'
        ? true
        : String(appt.hospital) === hospitalFilter || appt.hospital_name.toLowerCase().includes(hospitalFilter.toLowerCase());

    const matchesSpec =
      specializationFilter === 'ALL'
        ? true
        : (appt.doctor_specialization || '').toLowerCase().includes(specializationFilter.toLowerCase());

    const matchesSev =
      severityFilter === 'ALL'
        ? true
        : (appt.condition || '').toLowerCase() === severityFilter.toLowerCase();

    return matchesSearch && matchesHosp && matchesSpec && matchesSev;
  });

  const handleOpenStatusModal = (appt) => {
    setSelectedApptForAction(appt);
    setNewStatusValue(appt.status || 'Pending');
    setNewBedValue(appt.bed_number ? String(appt.bed_number) : '');
    setActionRemarks(appt.symptoms_diagnosis || '');
    setIsStatusModalOpen(true);
  };

  const handleSaveApptStatus = async (e) => {
    e.preventDefault();
    if (!selectedApptForAction || !selectedApptForAction.id) return;

    try {
      setIsUpdating(true);
      const isDischarge = newStatusValue === 'Discharged' || newStatusValue === 'Cancelled';
      // Strict rule: If discharged or cancelled, bed is freed automatically (bed_number set to null)
      const finalBedNum = isDischarge ? null : (newBedValue ? Number(newBedValue) : selectedApptForAction.bed_number);

      const payload = {
        status: newStatusValue,
        bed_number: finalBedNum,
        symptoms_diagnosis: actionRemarks || selectedApptForAction.symptoms_diagnosis
      };

      // PATCH to appointments endpoint
      await fetch(`${API_BASE_URL}/super-admin/appointments/${selectedApptForAction.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      // Also sync to Patients endpoint
      await fetch(`${API_BASE_URL}/super-admin/Patients/${selectedApptForAction.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      alert(`Appointment status updated to "${newStatusValue}" successfully! ${isDischarge ? 'Bed has been released and is now available.' : ''}`);
      setIsStatusModalOpen(false);
      setSelectedApptForAction(null);
      fetchAllAppointmentsData();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Network error while updating appointment status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewPatientDetails = (appt) => {
    if (setSelectedPatient) {
      setSelectedPatient(appt);
    }
    localStorage.setItem('selectedPatient', JSON.stringify(appt));
    if (setCurrentPage) {
      setCurrentPage('patient_details');
    }
  };

  const handleOpenBookModal = (prefillPatient = null) => {
    if (prefillPatient) {
      setBookFormData({
        ...initialBookFormState,
        selected_patient_id: String(prefillPatient.id || ''),
        patient_name: prefillPatient.name || prefillPatient.patient_name || '',
        email: prefillPatient.email || '',
        contact: prefillPatient.contact || prefillPatient.phone || '',
        age: prefillPatient.age || '',
        gender: prefillPatient.gender || prefillPatient.Gender || 'Male',
        blood_group: prefillPatient.blood_group || prefillPatient.Blood_Group || 'A+',
        address: prefillPatient.address || '',
        hospital: prefillPatient.hospital ? String(typeof prefillPatient.hospital === 'object' ? prefillPatient.hospital.id : prefillPatient.hospital) : (hospitalsList[0]?.id ? String(hospitalsList[0].id) : '')
      });
    } else {
      setBookFormData({
        ...initialBookFormState,
        hospital: hospitalsList[0]?.id ? String(hospitalsList[0].id) : ''
      });
    }
    setIsBookModalOpen(true);
  };

  const handleSelectPatientChange = (e) => {
    const pId = e.target.value;
    if (!pId) {
      setBookFormData(prev => ({
        ...prev,
        selected_patient_id: '',
        patient_name: '',
        email: '',
        contact: '',
        age: '',
        gender: 'Male',
        blood_group: 'A+',
        address: ''
      }));
      return;
    }

    const matchedPat = patientsList.find(p => String(p.id) === String(pId));
    if (matchedPat) {
      const hospVal = matchedPat.hospital ? String(typeof matchedPat.hospital === 'object' ? matchedPat.hospital.id : matchedPat.hospital) : bookFormData.hospital;
      setBookFormData(prev => ({
        ...prev,
        selected_patient_id: pId,
        patient_name: matchedPat.name || matchedPat.patient_Name || matchedPat.patient_name || '',
        email: matchedPat.email || '',
        contact: matchedPat.contact || matchedPat.phone || '',
        age: matchedPat.age || '',
        gender: matchedPat.gender || matchedPat.Gender || 'Male',
        blood_group: matchedPat.blood_group || matchedPat.Blood_Group || 'A+',
        address: matchedPat.address || '',
        hospital: hospVal || prev.hospital
      }));
    }
  };

  const handleBookDoctorChange = (e) => {
    const docId = e.target.value;
    const docObj = doctorsList.find(d => Number(d.id) === Number(docId));
    const fee = docObj ? Number(docObj.consultation_fee || 0) : 0;
    const hospCharges = Number(bookFormData.hospitals_charges) || 0;
    const total = fee + hospCharges;
    setBookFormData(prev => ({
      ...prev,
      doctor: docId,
      consultation_fee: fee,
      amount_paid: total
    }));
  };

  const handleBookAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!bookFormData.patient_name.trim()) {
      alert('Please enter patient name.');
      return;
    }
    if (!bookFormData.hospital) {
      alert('Please select a target hospital branch.');
      return;
    }

    try {
      setIsBooking(true);
      const selectedDoc = doctorsList.find(d => Number(d.id) === Number(bookFormData.doctor));
      const hospId = Number(bookFormData.hospital);
      const isAdmitted = bookFormData.status === 'Admitted';
      const parsedBed = isAdmitted && bookFormData.bed_number ? Number(bookFormData.bed_number) : null;

      const payload = {
        patient_name: bookFormData.patient_name.trim(),
        name: bookFormData.patient_name.trim(),
        email: bookFormData.email.trim(),
        contact: bookFormData.contact.trim(),
        phone: bookFormData.contact.trim(),
        age: bookFormData.age ? Number(bookFormData.age) : null,
        gender: bookFormData.gender || 'Male',
        Gender: bookFormData.gender || 'Male',
        blood_group: bookFormData.blood_group || 'A+',
        Blood_Group: bookFormData.blood_group || 'A+',
        address: bookFormData.address.trim(),
        hospital: hospId,
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
        setBookFormData(initialBookFormState);
        fetchAllAppointmentsData();
      } else {
        const errData = res ? await res.json().catch(() => ({})) : {};
        let errMsg = errData.message || errData.detail || errData.error;
        if (!errMsg && typeof errData === 'object') {
          errMsg = Object.entries(errData)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : v)}`)
            .join('\n');
        }
        alert(errMsg || 'Failed to book appointment.');
      }
    } catch (err) {
      console.error('Error booking appointment:', err);
      alert('Error while booking appointment. Please check network connection.');
    } finally {
      setIsBooking(false);
    }
  };

  const handleViewAppointmentDetails = (appt) => {
    localStorage.setItem('selectedAppointment', JSON.stringify(appt));
    if (setSelectedAppointment) {
      setSelectedAppointment(appt);
    }
    if (setSelectedPatient) {
      setSelectedPatient(appt);
    }
    if (setCurrentPage) {
      setCurrentPage('appointment_details');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-semibold border border-sky-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Super Admin Central Appointments Hub
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mt-2 tracking-tight">
            Patient Appointments & Consultations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Surveillance of all booked appointments across multiple hospital branches. Multiple bookings per email are preserved and tracked individually.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenBookModal()}
          className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition duration-150 cursor-pointer flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <span className="text-base font-black">+</span> Book New Appointment
        </button>
      </div>

      {/* TOP KPI COUNTERS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Total Bookings</p>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">{totalBookingsCount}</h3>
          <p className="text-[10px] text-sky-600 font-medium mt-0.5">All Recorded Visits</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] sm:text-xs font-semibold text-teal-600 uppercase">Today's Visits</p>
          <h3 className="text-xl sm:text-2xl font-black text-teal-800 mt-1">{todayBookingsCount}</h3>
          <p className="text-[10px] text-teal-600 font-medium mt-0.5">Booked for Today</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] sm:text-xs font-semibold text-amber-600 uppercase">Pending Review</p>
          <h3 className="text-xl sm:text-2xl font-black text-amber-700 mt-1">{pendingCount}</h3>
          <p className="text-[10px] text-amber-600 font-medium mt-0.5">Awaiting Triage</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] sm:text-xs font-semibold text-sky-600 uppercase">Assigned / Confirmed</p>
          <h3 className="text-xl sm:text-2xl font-black text-sky-700 mt-1">{assignedCount}</h3>
          <p className="text-[10px] text-sky-600 font-medium mt-0.5">Doctor Allotted</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] sm:text-xs font-semibold text-purple-600 uppercase">Admitted (Beds)</p>
          <h3 className="text-xl sm:text-2xl font-black text-purple-800 mt-1">{admittedInpatientsCount}</h3>
          <p className="text-[10px] text-purple-600 font-medium mt-0.5">Beds Occupied</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] sm:text-xs font-semibold text-emerald-600 uppercase">Discharged</p>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{dischargedCount}</h3>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Beds Auto-Freed</p>
        </div>
      </div>

      {/* FILTER TABS & CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* TABS */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-100">
          {[
            { id: 'ALL', label: 'All Appointments', count: totalBookingsCount },
            { id: 'TODAY', label: "Today's Visits", count: todayBookingsCount },
            { id: 'PENDING', label: 'Pending', count: pendingCount },
            { id: 'ASSIGNED', label: 'Assigned', count: assignedCount },
            { id: 'ADMITTED', label: 'Admitted Inpatients', count: admittedInpatientsCount },
            { id: 'DISCHARGED', label: 'Discharged', count: dischargedCount },
            { id: 'CANCELLED', label: 'Cancelled', count: cancelledCount }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* SEARCH & DROPDOWN FILTERS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Search Appointments</label>
            <input
              type="text"
              placeholder="Search by Patient, Email, Doctor, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-600 text-slate-800 font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Hospital Branch</label>
            <select
              value={hospitalFilter}
              onChange={(e) => setHospitalFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-600 text-slate-800 font-medium cursor-pointer"
            >
              <option value="ALL">All Hospital Branches</option>
              {hospitalsList.map((h) => (
                <option key={h.id} value={h.id}>{h.Name || h.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Doctor Specialization</label>
            <select
              value={specializationFilter}
              onChange={(e) => setSpecializationFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-600 text-slate-800 font-medium cursor-pointer"
            >
              <option value="ALL">All Specializations</option>
              {Array.from(new Set(doctorsList.map(d => d.specialization || d.specialty).filter(Boolean))).map((spec, idx) => (
                <option key={idx} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Triage Condition</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-600 text-slate-800 font-medium cursor-pointer"
            >
              <option value="ALL">All Severity Levels</option>
              {severityLevels.map((sev, idx) => (
                <option key={idx} value={sev}>{sev}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* APPOINTMENTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium">
            Loading live appointment bookings from backend...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl font-bold">
              ∅
            </div>
            <p className="text-sm font-bold text-slate-700">No appointment bookings found.</p>
            <p className="text-xs text-slate-400">Try changing your search keywords or filter settings.</p>
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full text-left text-xs table-auto">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 text-center">Appt ID & Date</th>
                  <th className="py-3 px-3 text-left">Patient Details</th>
                  <th className="py-3 px-3 text-left">Hospital & Doctor</th>
                  <th className="py-3 px-3 text-center">Bed / Ward</th>
                  <th className="py-3 px-3 text-center">Condition</th>
                  <th className="py-3 px-3 text-center">Billing & Paid</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredAppointments.slice(0, visibleCount).map((appt) => {
                  const isAdmitted = (appt.status === 'Admitted' || appt.status === 'In Consultation') && appt.status !== 'Discharged';
                  const isDischarged = appt.status === 'Discharged' || appt.status === 'Completed';

                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block text-[11px]">
                          {appt.appointment_id || `APT-${appt.id}`}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                          {appt.visit_date_time ? new Date(appt.visit_date_time).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-left">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleViewAppointmentDetails(appt)}
                              className="font-bold text-slate-900 hover:text-sky-600 hover:underline text-left text-xs cursor-pointer"
                            >
                              {appt.name}
                            </button>
                            <span className="text-[9px] font-bold bg-sky-50 text-sky-700 px-1.5 py-0.2 rounded border border-sky-200">
                              Patient
                            </span>
                          </div>
                          {appt.account_holder_name && (
                            <div className="text-[10px] text-slate-600 flex items-center gap-1 flex-wrap">
                              <span className="text-slate-400">Account: </span>
                              <strong className="text-indigo-800 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                {appt.account_holder_name}
                              </strong>
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {appt.email ? (
                              <a
                                href={`mailto:${appt.email.toLowerCase()}`}
                                onClick={(e) => e.stopPropagation()}
                                title={`Send email to ${appt.email}`}
                                className="text-[10px] text-sky-700 hover:text-sky-900 hover:underline block truncate max-w-[130px] transition lowercase font-medium"
                              >
                                {appt.email.toLowerCase()}
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 block">No email</span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              {appt.contact || appt.phone || '-'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-left">
                        <span className="font-bold text-slate-800 block text-xs">{appt.hospital_name}</span>
                        <span className="text-teal-800 font-semibold block text-[11px]">{appt.doctor_name}</span>
                        {appt.doctor_specialization ? (
                          <span className="text-[10px] text-slate-400 block">{appt.doctor_specialization}</span>
                        ) : null}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {appt.bed_number ? (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200 text-[11px] inline-block">
                              Bed #{appt.bed_number}
                            </span>
                            <span className="text-[10px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 font-bold block">
                              Floor {getFloorNumber(appt.bed_number)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs text-slate-400 font-medium">Unassigned</span>
                            <span className="text-[9px] text-slate-400">OPD / No Bed</span>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
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

                      <td className="py-2.5 px-3 text-center">
                        <div className="font-mono font-bold text-slate-800 text-xs">
                          ₹{appt.total_bill.toFixed(2)}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            Paid: ₹{appt.amount_paid.toFixed(2)}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${
                            appt.payment_status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {appt.payment_status || 'Pending'}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                          appt.status === 'Confirmed' || appt.status === 'Admitted' || appt.status === 'Discharged' || appt.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : appt.status === 'Cancelled' || appt.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {appt.status || 'Pending'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(appt)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-200 transition cursor-pointer whitespace-nowrap"
                            title="Update status & bed allocation"
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewAppointmentDetails(appt)}
                            className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer whitespace-nowrap"
                          >
                            Details &rarr;
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

        {filteredAppointments.length > visibleCount && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount(prev => prev + 10)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 shadow-2xs transition cursor-pointer"
            >
              Load More Appointments ({filteredAppointments.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* BOOK NEW APPOINTMENT MODAL */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 space-y-4 my-auto text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  New Appointment Booking
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 mt-1">Book Patient Appointment</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleBookAppointmentSubmit} className="space-y-4">
              {/* SELECT REGISTERED PATIENT OR ENTER NEW */}
              <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 space-y-2">
                <label className="block font-bold text-sky-900 uppercase text-[11px]">
                  Select Registered Patient (Autofills Patient Details)
                </label>
                <select
                  value={bookFormData.selected_patient_id}
                  onChange={handleSelectPatientChange}
                  className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-white text-slate-800 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
                >
                  <option value="">-- Or enter new patient details below --</option>
                  {patientsList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.patient_Name || `Patient #${p.id}`} {p.email ? `(${p.email})` : ''} {p.contact ? `• ${p.contact}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* PATIENT INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    value={bookFormData.patient_name}
                    onChange={(e) => setBookFormData({ ...bookFormData, patient_name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-800 font-medium focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={bookFormData.email}
                    onChange={(e) => setBookFormData({ ...bookFormData, email: e.target.value })}
                    placeholder="e.g. patient@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-800 font-medium focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={bookFormData.contact}
                    onChange={(e) => setBookFormData({ ...bookFormData, contact: e.target.value })}
                    placeholder="e.g. +91 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-800 font-medium focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Age</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={bookFormData.age}
                      onChange={(e) => setBookFormData({ ...bookFormData, age: e.target.value })}
                      placeholder="28"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-800 font-medium focus:outline-none focus:border-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Gender</label>
                    <select
                      value={bookFormData.gender}
                      onChange={(e) => setBookFormData({ ...bookFormData, gender: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Blood</label>
                    <select
                      value={bookFormData.blood_group}
                      onChange={(e) => setBookFormData({ ...bookFormData, blood_group: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
                    >
                      {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* HOSPITAL AND DOCTOR SELECTION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Branch *</label>
                  <select
                    required
                    value={bookFormData.hospital}
                    onChange={(e) => setBookFormData({ ...bookFormData, hospital: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    <option value="">-- Select Hospital Branch --</option>
                    {hospitalsList.map(h => (
                      <option key={h.id} value={h.id}>{h.Name || h.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Doctor Allotment</label>
                  <select
                    value={bookFormData.doctor}
                    onChange={handleBookDoctorChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    <option value="">-- Select Doctor (Optional) --</option>
                    {doctorsList.map(d => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.name} ({d.specialization || d.specialty || 'General'}) • Fee: ₹{d.consultation_fee || 0}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Appointment Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={bookFormData.visit_date_time}
                    onChange={(e) => setBookFormData({ ...bookFormData, visit_date_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Triage Condition</label>
                  <select
                    value={bookFormData.condition}
                    onChange={(e) => setBookFormData({ ...bookFormData, condition: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* STATUS & BED ALLOCATION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Initial Status</label>
                  <select
                    value={bookFormData.status}
                    onChange={(e) => setBookFormData({ ...bookFormData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Assigned">Assigned / Confirmed</option>
                    <option value="Admitted">Admitted (Inpatient Bed)</option>
                  </select>
                </div>

                {bookFormData.status === 'Admitted' && (
                  <div>
                    <label className="block font-semibold text-purple-900 uppercase mb-1">Bed Number (Inpatient)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 101, 204"
                      value={bookFormData.bed_number}
                      onChange={(e) => setBookFormData({ ...bookFormData, bed_number: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-purple-50 text-purple-950 font-bold focus:outline-none focus:border-purple-600"
                    />
                  </div>
                )}
              </div>

              {/* BILLING & PAYMENT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Doctor Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bookFormData.consultation_fee}
                    onChange={(e) => {
                      const fee = parseFloat(e.target.value) || 0;
                      const hosp = Number(bookFormData.hospitals_charges) || 0;
                      setBookFormData({ ...bookFormData, consultation_fee: fee, amount_paid: fee + hosp });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Charge (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bookFormData.hospitals_charges}
                    onChange={(e) => {
                      const hosp = parseFloat(e.target.value) || 0;
                      const fee = Number(bookFormData.consultation_fee) || 0;
                      setBookFormData({ ...bookFormData, hospitals_charges: hosp, amount_paid: fee + hosp });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Payment Status</label>
                  <select
                    value={bookFormData.payment_status}
                    onChange={(e) => setBookFormData({ ...bookFormData, payment_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
              </div>

              {/* SYMPTOMS & REASON */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Reason for Visit / Symptoms</label>
                <textarea
                  rows={2}
                  value={bookFormData.symptoms_diagnosis}
                  onChange={(e) => setBookFormData({ ...bookFormData, symptoms_diagnosis: e.target.value })}
                  placeholder="e.g. Chest pain, routine checkup, follow-up..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-800 font-medium focus:outline-none focus:border-sky-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBooking}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isBooking ? 'Booking...' : 'Confirm Appointment Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminAppointments;
