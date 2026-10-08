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

const Patients = ({ currentUser, setCurrentPage, setSelectedPatient }) => {
  const [patients, setPatients] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [specializationFilter, setSpecializationFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookTargetPatient, setBookTargetPatient] = useState(null);
  const [bookFormData, setBookFormData] = useState({
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

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Not Known'];
  const severityLevels = ['Critical', 'Emergency', 'Urgent', 'Normal'];
  const conditionChoices = ['Critical', 'Emergency', 'Urgent', 'Normal'];
  const statusOptions = ['Pending', 'Assigned', 'Admitted', 'Discharged', 'Cancelled'];
  const paymentStatuses = ['Paid', 'Partial', 'Pending', 'Failed'];
  const paymentMethods = ['Cash', 'UPI', 'Credit Card', 'Net Banking'];

  const initialAddFormState = {
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
    bed_number: '',
    nurse: '',
    nurse_name: '',
    consultation_fee: '',
    Hospitals_Chargies: '',
    amount_paid: '',
    payment_status: '',
    payment_method: '',
    symptoms_diagnosis: '',
    Condation: '',
    condation: '',
    condition: '',
    symptoms_severity: '',
    visit_date_time: '',
    status: '',
    is_active: true,
    attached_document: '',
    attached_document_name: ''
  };

  const [addFormData, setAddFormData] = useState(initialAddFormState);
  const [addSelectedFile, setAddSelectedFile] = useState(null);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, activeTab, hospitalFilter, specializationFilter, severityFilter, floorFilter]);

  const generatePatientId = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `PAT-${randomNum}`;
  };

  const getHospitalDoctorList = (hospitalId, docs) => {
    if (!hospitalId) return [];
    const targetHospId = Number(hospitalId);
    return (docs || []).filter(d => {
      const hospIds = Array.isArray(d.hospitals)
        ? d.hospitals.map(h => Number(typeof h === 'object' ? h.id : h))
        : (d.hospital ? [Number(typeof d.hospital === 'object' ? d.hospital.id : d.hospital)] : []);
      return hospIds.includes(targetHospId);
    });
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [hospRes, docRes, adminRes, nurseRes, patRes, apptRes] = await Promise.all([
        fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Admins/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Patients/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null)
      ]);

      let hospData = [];
      let docData = [];
      let adminData = [];
      let nurseData = [];

      if (hospRes && hospRes.ok) {
        hospData = await hospRes.json().catch(() => []);
        setHospitalsList(Array.isArray(hospData) ? hospData : (hospData?.results || []));
      }
      if (docRes && docRes.ok) {
        docData = await docRes.json().catch(() => []);
        setDoctorsList(Array.isArray(docData) ? docData : (docData?.results || []));
      }
      if (adminRes && adminRes.ok) {
        adminData = await adminRes.json().catch(() => []);
        setAdminsList(Array.isArray(adminData) ? adminData : (adminData?.results || []));
      }
      if (nurseRes && nurseRes.ok) {
        nurseData = await nurseRes.json().catch(() => []);
        setNursesList(Array.isArray(nurseData) ? nurseData : (nurseData?.results || []));
      }

      let rawPatients = [];
      let rawAppointments = [];

      if (patRes && patRes.ok) {
        const pData = await patRes.json().catch(() => []);
        rawPatients = Array.isArray(pData) ? pData : (pData?.results || pData?.data || []);
      }
      if (apptRes && apptRes.ok) {
        const aData = await apptRes.json().catch(() => []);
        rawAppointments = Array.isArray(aData) ? aData : (aData?.results || aData?.data || aData?.appointments || []);
      }

      const combined = [];
      const seenKeys = new Set();

      const normalizeItem = (item) => {
        if (!item) return null;
        const id = item.id || item.appointment_id || item.Appoment_id;
        const name = item.patient_name || item.patient_Name || item.name || `Patient #${id}`;
        const hospId = typeof item.hospital === 'object' ? item.hospital?.id : item.hospital;
        const docId = typeof item.doctor === 'object' ? item.doctor?.id : item.doctor;
        const nurseId = typeof item.nurse === 'object' ? item.nurse?.id : item.nurse;

        const hospObj = hospId ? hospData.find(h => Number(h.id) === Number(hospId)) : null;
        const docObj = docId ? docData.find(d => Number(d.id) === Number(docId)) : null;
        const nurseObj = nurseId ? nurseData.find(n => Number(n.id) === Number(nurseId)) : null;

        const docFee = Number(item.consultation_fee || docObj?.consultation_fee || 0);
        const hospCharges = Number(item.hospitals_charges || item.Hospitals_Chargies || 0);
        const amtPaid = Number(item.amount_paid || 0);

        return {
          ...item,
          id,
          appointment_id: item.appointment_id || item.Appoment_id || id,
          patient_id: item.patient_id || item.uhid || `PAT-${id}`,
          uhid: item.uhid || item.patient_id || `UHID-${id}`,
          name,
          patient_name: name,
          patient_Name: name,
          hospital: hospId,
          hospital_name: item.hospital_name || hospObj?.Name || hospObj?.name || 'Central Hospital',
          doctor: docId ? Number(docId) : null,
          doctor_name: item.doctor_name || (docObj ? (docObj.name?.startsWith('Dr.') ? docObj.name : `Dr. ${docObj.name}`) : (docId ? `Dr. #${docId}` : 'Not Assigned')),
          doctor_specialization: item.doctor_specialization || docObj?.specialization || docObj?.specialty || '',
          bed_number: item.bed_number ? Number(item.bed_number) : null,
          nurse: nurseId ? Number(nurseId) : null,
          nurse_name: item.nurse_name || (nurseObj ? nurseObj.name : ''),
          consultation_fee: docFee,
          Hospitals_Chargies: hospCharges,
          hospitals_charges: hospCharges,
          amount_paid: amtPaid,
          condition: item.condition || item.Condation || item.symptoms_severity || 'Normal',
          Condation: item.condition || item.Condation || item.symptoms_severity || 'Normal',
          status: item.status || 'Pending',
          payment_status: item.payment_status || (amtPaid >= (docFee + hospCharges) && (docFee + hospCharges) > 0 ? 'Paid' : 'Pending'),
          payment_method: item.payment_method || 'Cash',
          contact: item.contact || item.phone || '',
          email: item.email || '',
          address: item.address || '',
          symptoms_diagnosis: item.symptoms_diagnosis || item.reason_for_visit || 'General Consultation',
          visit_date_time: item.visit_date_time || item.created_at || new Date().toISOString(),
          created_at: item.created_at || item.visit_date_time || new Date().toISOString()
        };
      };

      // 1. Strictly process registered patient users from /super-admin/Patients/
      for (const p of rawPatients) {
        const norm = normalizeItem(p);
        if (norm) {
          const emailKey = (norm.email || '').trim().toLowerCase();
          const contactKey = (norm.contact || norm.phone || '').trim();
          const uhidKey = (norm.uhid || norm.patient_id || '').trim();
          const key = emailKey || contactKey || uhidKey || `pat_${norm.id}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);

            // Find all appointments for this patient user
            const matchedAppts = rawAppointments.filter((a) => {
              const aEmail = (a.email || '').trim().toLowerCase();
              const aContact = (a.contact || a.phone || '').trim();
              const aUhid = (a.uhid || a.patient_id || '').trim();
              const aName = (a.patient_name || a.patient_Name || a.name || '').trim().toLowerCase();
              return (
                (emailKey && aEmail === emailKey) ||
                (contactKey && aContact === contactKey) ||
                (uhidKey && aUhid === uhidKey) ||
                (norm.name && aName === norm.name.trim().toLowerCase())
              );
            });

            combined.push({
              ...norm,
              total_appointments: matchedAppts.length,
              appointment_history: matchedAppts
            });
          }
        }
      }

      setPatients(combined);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleDoctorChange = (e) => {
    const docId = e.target.value;
    const selectedDoc = doctorsList.find(d => d.id === Number(docId));
    const fee = selectedDoc ? (selectedDoc.consultation_fee ?? 0.00) : 0.00;
    const hospCharge = Number(addFormData.Hospitals_Chargies) || 0.00;
    const total = fee + hospCharge;

    setAddFormData(prev => ({
      ...prev,
      doctor: docId,
      consultation_fee: fee,
      amount_paid: total
    }));
  };

  const handleConsultationFeeChange = (e) => {
    const fee = parseFloat(e.target.value) || 0.00;
    const hospCharge = Number(addFormData.Hospitals_Chargies) || 0.00;
    const total = fee + hospCharge;
    setAddFormData(prev => ({
      ...prev,
      consultation_fee: e.target.value,
      amount_paid: total
    }));
  };

  const handleHospitalChargesChange = (e) => {
    const hospCharge = parseFloat(e.target.value) || 0.00;
    const fee = Number(addFormData.consultation_fee) || 0.00;
    const total = fee + hospCharge;
    setAddFormData(prev => ({
      ...prev,
      Hospitals_Chargies: e.target.value,
      amount_paid: total
    }));
  };

  const todayDateStr = new Date().toISOString().split('T')[0];

  const isAppliedToday = (item) => {
    if (!item.applied_at && !item.created_at) return false;
    const dateVal = item.applied_at || item.created_at;
    return dateVal.includes(todayDateStr);
  };

  const todayApplicationsCount = patients.filter(p => isAppliedToday(p)).length;
  const totalPatientsCount = patients.length;
  const patientsWithApptsCount = patients.filter(p => (p.total_appointments || 0) > 0).length;
  const patientsWithoutApptsCount = patients.filter(p => !p.total_appointments || p.total_appointments === 0).length;

  const filteredPatients = patients.filter((patient) => {
    const term = searchTerm.toLowerCase();

    if (activeTab === 'TODAY' && !isAppliedToday(patient)) return false;
    if (activeTab === 'WITH_APPTS' && (!patient.total_appointments || patient.total_appointments === 0)) return false;
    if (activeTab === 'NEW' && patient.total_appointments > 0) return false;

    const displayId = (patient.patient_id || patient.uhid || `PAT-${patient.id}`).toLowerCase();
    const name = (patient.name || '').toLowerCase();
    const contact = (patient.contact || patient.phone || '').toLowerCase();
    const email = (patient.email || '').toLowerCase();

    return (
      name.includes(term) ||
      displayId.includes(term) ||
      contact.includes(term) ||
      email.includes(term)
    );
  });

  const handleOpenAddModal = () => {
    setAddSelectedFile(null);
    setAddFormData({
      ...initialAddFormState,
      patient_id: ''
    });
    setIsAddModalOpen(true);
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!addFormData.hospital) {
      alert('Branch Allocation Required:\nPlease select a target hospital branch for this patient admission.');
      return;
    }

    try {
      const generatedDocPatId = generatePatientId();
      const selectedDocObj = doctorsList.find(d => d.id === Number(addFormData.doctor));
      const selectedHospitalObj = hospitalsList.find(h => h.id === Number(addFormData.hospital));
      const selectedNurseObj = nursesList.find(n => n.id === Number(addFormData.nurse));
      const autoNurse = getAssignedNurseForPatientBed(addFormData.bed_number, nursesList, addFormData.hospital);
      const finalNurseId = addFormData.nurse ? Number(addFormData.nurse) : (autoNurse?.nurseId || null);
      const finalNurseName = selectedNurseObj ? selectedNurseObj.name : (addFormData.nurse_name || autoNurse?.nurseName || '');

      let response;

      const chosenCondition = addFormData.Condation || addFormData.condation || addFormData.condition || addFormData.symptoms_severity || 'Normal';
      const parsedBedNum = addFormData.bed_number ? Number(addFormData.bed_number) : null;

      const payloadData = {
        patient_id: generatedDocPatId,
        name: addFormData.name.trim(),
        contact: addFormData.contact.trim(),
        email: addFormData.email.trim(),
        password: (addFormData.password || addFormData.Password || '').trim(),
        Password: (addFormData.password || addFormData.Password || '').trim(),
        age: addFormData.age ? Number(addFormData.age) : null,
        gender: addFormData.gender || addFormData.Gender || '',
        Gender: addFormData.gender || addFormData.Gender || '',
        patient_gender: addFormData.gender || addFormData.Gender || '',
        blood_group: addFormData.blood_group,
        Blood_Group: addFormData.blood_group,
        address: (addFormData.address || '').trim(),
        hospital: Number(addFormData.hospital),
        doctor: addFormData.doctor ? Number(addFormData.doctor) : null,
        doctor_name: selectedDocObj ? selectedDocObj.name : '',
        doctor_specialization: selectedDocObj ? (selectedDocObj.specialization || selectedDocObj.specialty || '') : '',
        bed_number: parsedBedNum,
        nurse: finalNurseId,
        nurse_name: finalNurseName,
        consultation_fee: Number(addFormData.consultation_fee) || 0.00,
        Hospitals_Chargies: Number(addFormData.Hospitals_Chargies) || 0.00,
        hospital_charges: Number(addFormData.Hospitals_Chargies) || 0.00,
        amount_paid: Number(addFormData.amount_paid) || 0.00,
        payment_status: addFormData.payment_status,
        payment_method: addFormData.payment_method,
        symptoms_diagnosis: addFormData.symptoms_diagnosis,
        Condation: chosenCondition,
        condation: chosenCondition,
        condition: chosenCondition,
        Condition: chosenCondition,
        symptoms_severity: chosenCondition,
        visit_date_time: addFormData.visit_date_time || null,
        status: addFormData.status || 'Pending',
        is_active: Boolean(addFormData.is_active)
      };

      if (addSelectedFile instanceof File) {
        const formData = new FormData();
        Object.keys(payloadData).forEach(key => {
          if (payloadData[key] !== null && payloadData[key] !== undefined) {
            formData.append(key, payloadData[key]);
          }
        });
        formData.append('attached_document', addSelectedFile);

        response = await fetch(`${API_BASE_URL}/super-admin/Patients/`, {
          method: 'POST',
          body: formData
        }).catch(() => null);
      } else {
        response = await fetch(`${API_BASE_URL}/super-admin/Patients/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadData)
        }).catch(() => null);
      }

      if (response && response.ok) {
        const resData = await response.json().catch(() => ({}));
        const createdId = resData.patient_id || generatedDocPatId;
        const successMsg = resData.message || `Patient ${addFormData.name} registered successfully! (ID: ${createdId})`;
        alert(successMsg);
        setAddSelectedFile(null);
        setIsAddModalOpen(false);
        fetchAllData();
      } else {
        const data = response ? await response.json().catch(() => ({})) : {};
        let errMsg = data.message || data.detail || data.error;
        if (!errMsg && typeof data === 'object') {
          errMsg = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : v)}`)
            .join('\n');
        }
        alert(errMsg || 'Failed to register patient.');
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      alert(error.message || 'Error while registering patient. Please check backend connection.');
    }
  };

  const [updatingPatientId, setUpdatingPatientId] = useState(null);

  const handleUpdatePatientStatus = async (patient, newStatus) => {
    if (!newStatus || !patient?.id) return;
    try {
      setUpdatingPatientId(patient.id);
      let res = await fetch(`${API_BASE_URL}/super-admin/Patients/${patient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${API_BASE_URL}/super-admin/Patients/${patient.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...patient, status: newStatus })
        }).catch(() => null);
      }

      setPatients(prev => prev.map(p => p.id === patient.id ? { ...p, status: newStatus } : p));
    } catch (err) {
      console.error('Error updating patient status:', err);
    } finally {
      setUpdatingPatientId(null);
    }
  };

  const handleOpenBookForPatient = (pat) => {
    setBookTargetPatient(pat);
    const hospVal = pat.hospital ? String(typeof pat.hospital === 'object' ? pat.hospital.id : pat.hospital) : (hospitalsList[0]?.id ? String(hospitalsList[0].id) : '');
    const docVal = pat.doctor ? String(typeof pat.doctor === 'object' ? pat.doctor.id : pat.doctor) : '';
    const fee = Number(pat.consultation_fee || 0);
    setBookFormData({
      hospital: hospVal,
      doctor: docVal,
      consultation_fee: fee,
      hospitals_charges: 0,
      amount_paid: fee,
      payment_status: 'Pending',
      payment_method: 'Cash',
      condition: pat.condition || pat.Condation || 'Normal',
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
      amount_paid: fee + hosp
    }));
  };

  const handleBookAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!bookTargetPatient) return;
    if (!bookFormData.hospital) {
      alert('Please select hospital branch.');
      return;
    }
    try {
      setIsBooking(true);
      const selectedDoc = doctorsList.find(d => Number(d.id) === Number(bookFormData.doctor));
      const hospId = Number(bookFormData.hospital);
      const isAdmitted = bookFormData.status === 'Admitted';
      const parsedBed = isAdmitted && bookFormData.bed_number ? Number(bookFormData.bed_number) : null;

      const payload = {
        patient_name: bookTargetPatient.name || bookTargetPatient.patient_Name || 'Patient',
        name: bookTargetPatient.name || bookTargetPatient.patient_Name || 'Patient',
        email: (bookTargetPatient.email || '').trim(),
        contact: (bookTargetPatient.contact || bookTargetPatient.phone || '').trim(),
        phone: (bookTargetPatient.contact || bookTargetPatient.phone || '').trim(),
        age: bookTargetPatient.age ? Number(bookTargetPatient.age) : null,
        gender: bookTargetPatient.gender || bookTargetPatient.Gender || 'Male',
        Gender: bookTargetPatient.gender || bookTargetPatient.Gender || 'Male',
        blood_group: bookTargetPatient.blood_group || bookTargetPatient.Blood_Group || 'A+',
        Blood_Group: bookTargetPatient.blood_group || bookTargetPatient.Blood_Group || 'A+',
        address: (bookTargetPatient.address || '').trim(),
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
        alert(`Appointment booked successfully for ${bookTargetPatient.name}! ID: ${resData.appointment_id || resData.id || 'New'}`);
        setIsBookModalOpen(false);
        fetchAllData();
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

  const handleViewPatientDetails = (pat) => {
    if (setSelectedPatient) {
      setSelectedPatient(pat);
    }
    localStorage.setItem('selectedPatient', JSON.stringify(pat));
    if (setCurrentPage) {
      setCurrentPage('patient_details');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Patient Accounts Registry
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                {todayApplicationsCount} Registered Today
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
                {totalPatientsCount} Total Registered
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">
              Registered Patient Accounts
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Surveillance of registered user patient profiles, contact credentials, and appointment booking history.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span> Register Patient
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('TODAY')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${
            activeTab === 'TODAY' ? 'bg-sky-50/90 border-sky-400 ring-2 ring-sky-300' : 'bg-white border-slate-200 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Registered Today</p>
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></span>
          </div>
          <h3 className="text-2xl font-bold text-sky-900 mt-1">{todayApplicationsCount}</h3>
          <p className="text-[11px] text-sky-700 mt-0.5 font-medium">New Signups Today</p>
        </div>

        <div
          onClick={() => setActiveTab('ALL')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${
            activeTab === 'ALL' ? 'bg-slate-100/90 border-slate-400 ring-2 ring-slate-300' : 'bg-white border-slate-200 hover:border-slate-400'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Patients</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalPatientsCount}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Database User Accounts</p>
        </div>

        <div
          onClick={() => setActiveTab('WITH_APPTS')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${
            activeTab === 'WITH_APPTS' ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-300' : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">With Appointments</p>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">{patientsWithApptsCount}</h3>
          <p className="text-[11px] text-emerald-600 mt-0.5">Active Bookings</p>
        </div>

        <div
          onClick={() => setActiveTab('NEW')}
          className={`p-4 rounded-2xl border shadow-xs transition cursor-pointer ${
            activeTab === 'NEW' ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-300' : 'bg-white border-slate-200 hover:border-indigo-300'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">New Accounts</p>
          <h3 className="text-2xl font-bold text-indigo-700 mt-1">{patientsWithoutApptsCount}</h3>
          <p className="text-[11px] text-indigo-600 mt-0.5">No Bookings Yet</p>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeTab === 'ALL' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            All Accounts ({totalPatientsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TODAY')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeTab === 'TODAY' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            Registered Today ({todayApplicationsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WITH_APPTS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeTab === 'WITH_APPTS' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            With Appointments ({patientsWithApptsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('NEW')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeTab === 'NEW' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            New Accounts ({patientsWithoutApptsCount})
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient by name, ID, contact number, or email..."
            className="w-full pl-3 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white transition"
          />
        </div>
      </div>

      {/* PATIENTS TABLE - 5 COLUMNS ONLY (NAME, ID, CONTACT, EMAIL, ACTIONS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <p className="text-center py-8 text-xs text-slate-500">Loading patient records from database...</p>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs font-semibold text-slate-500">No patient accounts found in database.</p>
              <p className="text-[11px] text-slate-400 mt-1">Click "+ Register Patient" to add a new record.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600 table-auto">
              <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 text-left">Patient Name</th>
                  <th className="py-3.5 px-4 text-center">Patient ID</th>
                  <th className="py-3.5 px-4 text-center">Contact</th>
                  <th className="py-3.5 px-4 text-left">Email</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.slice(0, visibleCount).map((pat) => {
                  const displayId = pat.patient_id || pat.uhid || `PAT-${pat.id}`;
                  const appliedToday = isAppliedToday(pat);
                  const emailLower = (pat.email || '').toLowerCase().trim();
                  const contactNum = (pat.contact || pat.phone || '').trim();

                  return (
                    <tr
                      key={pat.id}
                      className={`transition ${appliedToday ? 'bg-sky-50/40 hover:bg-sky-50/70' : 'hover:bg-slate-50/70'}`}
                    >
                      {/* NAME */}
                      <td className="py-3.5 px-4 text-left font-bold text-slate-900 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {(pat.name || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-900">{pat.name || 'Patient'}</span>
                            {appliedToday && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-600 text-white uppercase inline-block mt-0.5">
                                Today
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 inline-block">
                          {displayId}
                        </span>
                      </td>

                      {/* CONTACT */}
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700 text-xs">
                        {contactNum || '-'}
                      </td>

                      {/* EMAIL */}
                      <td className="py-3.5 px-4 text-left">
                        {emailLower ? (
                          <a
                            href={`mailto:${emailLower}`}
                            title={`Send email to ${emailLower}`}
                            className="text-xs text-sky-700 hover:text-sky-900 hover:underline font-medium block lowercase transition truncate max-w-[240px]"
                          >
                            {emailLower}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenBookForPatient(pat)}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white font-bold text-xs transition cursor-pointer border border-teal-200 inline-flex items-center justify-center gap-1 whitespace-nowrap shadow-2xs"
                            title="Book appointment for this patient"
                          >
                            + Book Appt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewPatientDetails(pat)}
                            className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white font-bold text-xs transition cursor-pointer border border-sky-200 inline-flex items-center justify-center gap-1 whitespace-nowrap shadow-2xs"
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
          )}
        </div>

        {visibleCount < filteredPatients.length && (
          <div className="p-4 text-center border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More
            </button>
          </div>
        )}
      </div>

      {/* REGISTER / ADD PATIENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Register New Patient</h2>
                <p className="text-xs text-slate-500">Add patient profile, doctor consultation fee, payment details, and branch.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-3 text-xs">

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Gender</label>
                  <select
                    value={addFormData.gender}
                    onChange={(e) => setAddFormData({ ...addFormData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Blood Group</label>
                  <select
                    value={addFormData.blood_group}
                    onChange={(e) => setAddFormData({ ...addFormData, blood_group: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                  >
                    <option value="">-- Select Blood Group --</option>
                    {bloodGroups.map((bg, idx) => (
                      <option key={idx} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    required
                    placeholder="e.g. 9876543210"
                    value={addFormData.contact}
                    onChange={(e) => setAddFormData({ ...addFormData, contact: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="patient@example.com"
                    value={addFormData.email}
                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Account Password</label>
                  <input
                    type="password"
                    placeholder="Set password..."
                    value={addFormData.password}
                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value, Password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Enter patient full address..."
                  value={addFormData.address}
                  onChange={(e) => setAddFormData({ ...addFormData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              {/* TARGET HOSPITAL BRANCH & AFFILIATED DOCTOR SELECTION */}
              {(() => {
                const availableDoctorsForAdd = getHospitalDoctorList(addFormData.hospital, doctorsList);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">Target Hospital Branch *</label>
                      <select
                        required
                        value={addFormData.hospital}
                        onChange={(e) => {
                          const newHospId = e.target.value;
                          const docsInNewHosp = getHospitalDoctorList(newHospId, doctorsList);
                          const currentDocStillValid = docsInNewHosp.some(d => d.id === Number(addFormData.doctor));
                          setAddFormData(prev => ({
                            ...prev,
                            hospital: newHospId,
                            doctor: currentDocStillValid ? prev.doctor : '',
                            consultation_fee: currentDocStillValid ? prev.consultation_fee : '',
                            amount_paid: currentDocStillValid ? prev.amount_paid : ''
                          }));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                      >
                        <option value="">-- Select Hospital --</option>
                        {hospitalsList.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.Name || h.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 uppercase mb-1">
                        Assigned Doctor {addFormData.hospital ? `(${availableDoctorsForAdd.length} available in this branch)` : ''} *
                      </label>
                      <select
                        required
                        disabled={!addFormData.hospital}
                        value={addFormData.doctor}
                        onChange={handleDoctorChange}
                        className={`w-full px-3 py-2 rounded-xl border border-slate-300 font-medium ${!addFormData.hospital
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 cursor-pointer'
                          }`}
                      >
                        {!addFormData.hospital ? (
                          <option value="">-- Select Target Hospital Branch First --</option>
                        ) : availableDoctorsForAdd.length === 0 ? (
                          <option value="">-- No Doctors in this Hospital Branch --</option>
                        ) : (
                          <>
                            <option value="">-- Select Doctor ({availableDoctorsForAdd.length} Available) --</option>
                            {availableDoctorsForAdd.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.specialization || d.specialty || 'Doctor'}) [₹{d.consultation_fee ?? 0}]
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      {!addFormData.hospital ? (
                        <p className="text-[10px] text-amber-600 mt-1 font-medium">
                          Please select a hospital branch above to view its affiliated doctors.
                        </p>
                      ) : availableDoctorsForAdd.length === 0 ? (
                        <p className="text-[10px] text-rose-600 mt-1 font-medium">
                          No doctors are currently affiliated with this hospital branch.
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })()}

              {/* BED & FLOOR ALLOCATION & NURSE CARE SECTION */}
              {(() => {
                const hospActiveNurses = nursesList.filter(n => Number(typeof n.hospital === 'object' ? n.hospital?.id : n.hospital) === Number(addFormData.hospital));
                const currentBed = addFormData.bed_number ? Number(addFormData.bed_number) : null;
                const floorDisplay = currentBed ? `Floor ${Math.floor((currentBed - 1) / 100) + 1}` : 'Not Assigned';

                return (
                  <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sky-900 uppercase text-[11px]">Bed & Floor Allocation</p>
                      </div>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full border border-sky-200">
                        {floorDisplay}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 uppercase mb-1">
                          Bed Number
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="e.g. 45 or 150"
                          value={addFormData.bed_number}
                          onChange={(e) => {
                            const bedVal = e.target.value ? Math.max(1, parseInt(e.target.value, 10)) : '';
                            setAddFormData(prev => ({
                              ...prev,
                              bed_number: bedVal
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-sky-600 shadow-2xs"
                        />
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {currentBed ? `Allocated: Bed #${currentBed} • ${floorDisplay}` : 'Enter patient bed number'}
                        </p>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 uppercase mb-1">
                          Assigned Nurse {addFormData.hospital ? `(${hospActiveNurses.length} active in branch)` : ''}
                        </label>
                        <select
                          disabled={!addFormData.hospital}
                          value={addFormData.nurse}
                          onChange={(e) => {
                            const nId = e.target.value;
                            const selNurse = nursesList.find(n => n.id === Number(nId));
                            setAddFormData(prev => ({
                              ...prev,
                              nurse: nId,
                              nurse_name: selNurse ? selNurse.name : ''
                            }));
                          }}
                          className={`w-full px-3 py-2 rounded-xl border border-slate-300 font-medium ${!addFormData.hospital
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-white text-slate-800 focus:outline-none focus:border-sky-600 cursor-pointer shadow-2xs'
                            }`}
                        >
                          {!addFormData.hospital ? (
                            <option value="">-- Select Target Hospital First --</option>
                          ) : hospActiveNurses.length === 0 ? (
                            <option value="">-- No Active Nurses in this Branch --</option>
                          ) : (
                            <>
                              <option value="">-- Select Nurse --</option>
                              {hospActiveNurses.map(n => (
                                <option key={n.id} value={n.id}>
                                  {n.name} ({n.ward || 'Ward Staff'}) - Shift: {n.shift || 'General'}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* PAYMENT SECTION */}
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
                      value={addFormData.consultation_fee}
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
                      value={addFormData.Hospitals_Chargies}
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
                      Doctor: ₹{Number(addFormData.consultation_fee || 0).toFixed(2)}
                    </span>
                    <span className="text-slate-400 font-bold">+</span>
                    <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                      Hospital: ₹{Number(addFormData.Hospitals_Chargies || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-600 uppercase mr-1.5">Total Amount:</span>
                    <span className="text-sm font-extrabold text-emerald-700 font-mono">
                      ₹{(Number(addFormData.consultation_fee || 0) + Number(addFormData.Hospitals_Chargies || 0)).toFixed(2)}
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
                      value={addFormData.amount_paid}
                      onChange={(e) => setAddFormData({ ...addFormData, amount_paid: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase mb-1">Payment Status</label>
                    <select
                      value={addFormData.payment_status}
                      onChange={(e) => setAddFormData({ ...addFormData, payment_status: e.target.value })}
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
                      value={addFormData.payment_method}
                      onChange={(e) => setAddFormData({ ...addFormData, payment_method: e.target.value })}
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
                <label className="block font-semibold text-slate-700 uppercase mb-1">Reason for Visit / Symptoms</label>
                <textarea
                  rows={2}
                  placeholder="Describe patient's chief complaints..."
                  value={addFormData.symptoms_diagnosis}
                  onChange={(e) => setAddFormData({ ...addFormData, symptoms_diagnosis: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Patient Condition (Triage) *</label>
                  <select
                    value={addFormData.Condation || addFormData.condation || addFormData.condition || addFormData.symptoms_severity || ''}
                    onChange={(e) => setAddFormData({
                      ...addFormData,
                      Condation: e.target.value,
                      condation: e.target.value,
                      condition: e.target.value,
                      symptoms_severity: e.target.value
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-sky-600 focus:bg-white cursor-pointer"
                  >
                    <option value="">-- Select Condition --</option>
                    <option value="Critical">Critical</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Scheduled Visit Date & Time</label>
                  <input
                    type="datetime-local"
                    value={addFormData.visit_date_time}
                    onChange={(e) => setAddFormData({ ...addFormData, visit_date_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Status</label>
                  <select
                    value={addFormData.status}
                    onChange={(e) => setAddFormData({ ...addFormData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
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
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK BOOK APPOINTMENT MODAL */}
      {isBookModalOpen && bookTargetPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-1 border border-emerald-200">
                  Book Appointment
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  New Appointment for {bookTargetPatient.name}
                </h2>
                <p className="text-xs text-slate-500">
                  UHID: {bookTargetPatient.patient_id || bookTargetPatient.uhid || `PAT-${bookTargetPatient.id}`} • {bookTargetPatient.gender || 'Patient'}, {bookTargetPatient.age || '-'} yrs
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
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 flex items-center justify-between text-sky-900 font-medium">
                <div>
                  <span className="text-[10px] text-sky-600 block">Patient Name & Contact</span>
                  <span className="font-bold text-sm">{bookTargetPatient.name}</span> ({bookTargetPatient.contact || bookTargetPatient.phone || 'No phone'})
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-sky-600 block">Email Address</span>
                  <span className="font-bold text-xs">{bookTargetPatient.email || 'No email registered'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Target Hospital Branch *</label>
                  <select
                    value={bookFormData.hospital}
                    onChange={(e) => setBookFormData({ ...bookFormData, hospital: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="">-- Select Hospital Branch --</option>
                    {hospitalsList.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.Name || h.name} ({h.city || 'Main Branch'})
                      </option>
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
                    {doctorsList
                      .filter(d => !bookFormData.hospital || Number(d.hospital) === Number(bookFormData.hospital))
                      .map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name?.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`} ({doc.specialization || doc.specialty || 'General'}) - ₹{doc.consultation_fee || 0}
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
                      setBookFormData({ ...bookFormData, consultation_fee: fee, amount_paid: fee + (Number(bookFormData.hospitals_charges) || 0) });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Hospital Charges (₹)</label>
                  <input
                    type="number"
                    value={bookFormData.hospitals_charges}
                    onChange={(e) => {
                      const hosp = parseFloat(e.target.value) || 0;
                      setBookFormData({ ...bookFormData, hospitals_charges: hosp, amount_paid: (Number(bookFormData.consultation_fee) || 0) + hosp });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={bookFormData.amount_paid}
                    onChange={(e) => setBookFormData({ ...bookFormData, amount_paid: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Payment Status</label>
                  <select
                    value={bookFormData.payment_status}
                    onChange={(e) => setBookFormData({ ...bookFormData, payment_status: e.target.value })}
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
                    value={bookFormData.payment_method}
                    onChange={(e) => setBookFormData({ ...bookFormData, payment_method: e.target.value })}
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
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Triage Condition</label>
                  <select
                    value={bookFormData.condition}
                    onChange={(e) => setBookFormData({ ...bookFormData, condition: e.target.value })}
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
                    value={bookFormData.status}
                    onChange={(e) => setBookFormData({ ...bookFormData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold cursor-pointer"
                  >
                    {statusOptions.map((st, idx) => (
                      <option key={idx} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Bed Number {bookFormData.status === 'Admitted' ? '(Occupied)' : '(Optional)'}
                  </label>
                  <input
                    type="number"
                    placeholder={bookFormData.status === 'Admitted' ? 'e.g. 101' : 'Optional'}
                    value={bookFormData.bed_number}
                    onChange={(e) => setBookFormData({ ...bookFormData, bed_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Scheduled Visit Date & Time</label>
                <input
                  type="datetime-local"
                  value={bookFormData.visit_date_time}
                  onChange={(e) => setBookFormData({ ...bookFormData, visit_date_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Reason for Visit / Symptoms</label>
                <textarea
                  rows={2}
                  placeholder="Describe patient symptoms or reason for visit..."
                  value={bookFormData.symptoms_diagnosis}
                  onChange={(e) => setBookFormData({ ...bookFormData, symptoms_diagnosis: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isBooking ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;