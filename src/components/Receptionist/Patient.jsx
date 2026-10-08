import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const extractArray = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.appointments)) return resData.appointments;
  if (Array.isArray(resData.doctors)) return resData.doctors;
  if (Array.isArray(resData.nurses)) return resData.nurses;
  if (Array.isArray(resData.rows)) return resData.rows;
  return [];
};

const isDoctorInHospital = (doc, targetHospId, targetHospName = '') => {
  if (!targetHospId && !targetHospName) return true;
  if (!doc) return false;

  const docHosp = typeof doc.hospital === 'object' && doc.hospital !== null ? doc.hospital.id : doc.hospital;

  if (targetHospId && !isNaN(Number(targetHospId))) {
    if (docHosp && !isNaN(Number(docHosp))) {
      return Number(docHosp) === Number(targetHospId);
    }
    if (Array.isArray(doc.hospitals) && doc.hospitals.length > 0) {
      return doc.hospitals.some(h => {
        const hId = typeof h === 'object' && h !== null ? h.id : h;
        return Number(hId) === Number(targetHospId);
      });
    }
    if (targetHospName) {
      const dHospName = (doc.hospital_name || (typeof doc.hospital === 'object' ? (doc.hospital?.Name || doc.hospital?.name) : '') || '').toLowerCase().trim();
      return dHospName === targetHospName.toLowerCase().trim() && dHospName !== '';
    }
    return false;
  }

  if (targetHospName && targetHospName.trim() !== '') {
    const dHospName = (doc.hospital_name || (typeof doc.hospital === 'object' ? (doc.hospital?.Name || doc.hospital?.name) : '') || '').toLowerCase().trim();
    return dHospName === targetHospName.toLowerCase().trim() && dHospName !== '';
  }

  return false;
};

const isNurseInHospital = (nurse, targetHospId, targetHospName = '') => {
  if (!targetHospId && !targetHospName) return true;
  if (!nurse) return false;

  const nHosp = typeof nurse.hospital === 'object' && nurse.hospital !== null ? nurse.hospital.id : nurse.hospital;

  if (targetHospId && !isNaN(Number(targetHospId))) {
    if (nHosp && !isNaN(Number(nHosp))) {
      return Number(nHosp) === Number(targetHospId);
    }
    if (targetHospName) {
      const nHospName = (nurse.hospital_name || (typeof nurse.hospital === 'object' ? (nurse.hospital?.Name || nurse.hospital?.name) : '') || '').toLowerCase().trim();
      return nHospName === targetHospName.toLowerCase().trim() && nHospName !== '';
    }
    return false;
  }

  if (targetHospName && targetHospName.trim() !== '') {
    const nHospName = (nurse.hospital_name || (typeof nurse.hospital === 'object' ? (nurse.hospital?.Name || nurse.hospital?.name) : '') || '').toLowerCase().trim();
    return nHospName === targetHospName.toLowerCase().trim() && nHospName !== '';
  }

  return false;
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

const getFloorNumber = (bed) => {
  if (!bed) return null;
  const num = Number(bed);
  if (isNaN(num) || num <= 0) return null;
  return Math.floor((num - 1) / 100) + 1;
};

// Auto-assign Nurse based on Bed
const getAutoNurseForBed = (bedNumber, nursesList = [], hospitalId = null) => {
  if (!bedNumber || !nursesList || !Array.isArray(nursesList) || nursesList.length === 0) {
    return { nurseId: null, nurseName: '' };
  }

  const hospNurses = hospitalId
    ? nursesList.filter(n => Number(typeof n.hospital === 'object' ? n.hospital?.id : n.hospital) === Number(hospitalId))
    : nursesList;
  const activeNurses = hospNurses.length > 0 ? hospNurses : nursesList;

  if (activeNurses.length === 0) return { nurseId: null, nurseName: '' };

  const floor = getFloorNumber(bedNumber);

  const floorNurse = activeNurses.find(n => {
    const nWard = (n.ward || '').toLowerCase();
    const nFloor = (n.floor || '').toLowerCase();
    return nWard.includes(`floor ${floor}`) || nWard.includes(`floor${floor}`) ||
           nFloor.includes(`floor ${floor}`) || nFloor.includes(String(floor));
  });

  if (floorNurse) {
    return { nurseId: floorNurse.id, nurseName: floorNurse.name };
  }

  const chosen = activeNurses[(Number(bedNumber) % activeNurses.length)] || activeNurses[0];
  return { nurseId: chosen.id, nurseName: chosen.name };
};

const ReceptionistPatient = ({ currentUser, setCurrentPage, setSelectedPatient, selectedDoctorForPatient }) => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' | 'ADMITTED' | 'OPD' | 'HISTORY'
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSelectedFile, setAddSelectedFile] = useState(null);
  const [autoNurseText, setAutoNurseText] = useState('');

  const generateUHID = () => `PAT-${Math.floor(1000 + Math.random() * 9000)}`;

  const userHospId = currentUser?.hospital || (typeof currentUser?.hospital_data === 'object' ? currentUser?.hospital_data?.id : '');

  const initialFormState = {
    patient_id: '',
    name: '',
    age: '',
    gender: 'Male',
    Gender: 'Male',
    blood_group: '',
    contact: '',
    email: '',
    password: '',
    Password: '',
    address: '',
    hospital: userHospId || '',
    doctor: selectedDoctorForPatient?.id || '',
    bed_number: '',
    nurse: '',
    consultation_fee: selectedDoctorForPatient?.consultation_fee || '',
    Hospitals_Chargies: '',
    amount_paid: '',
    payment_status: '',
    payment_method: '',
    symptoms_diagnosis: '',
    Condation: '',
    status: '',
    is_active: true
  };

  const [addFormData, setAddFormData] = useState(initialFormState);

  useEffect(() => {
    fetchAllData();
  }, [currentUser]);

  useEffect(() => {
    if (selectedDoctorForPatient) {
      setAddFormData(prev => ({
        ...prev,
        doctor: selectedDoctorForPatient.id,
        consultation_fee: selectedDoctorForPatient.consultation_fee ? String(selectedDoctorForPatient.consultation_fee) : '0.00',
        hospital: typeof selectedDoctorForPatient.hospital === 'object' ? selectedDoctorForPatient.hospital?.id : (selectedDoctorForPatient.hospital || prev.hospital)
      }));
      setIsAddModalOpen(true);
    }
  }, [selectedDoctorForPatient]);

  // Helper to normalize appointment records from Django backend
  const normalizeAppointment = (item, doctorsList = [], hospitalsList = [], nursesList = []) => {
    if (!item) return null;
    const id = item.id || item.appointment_id;
    const patientName = item.patient_name || item.patient_Name || item.name || `Patient #${id}`;
    const hospId = typeof item.hospital === 'object' ? item.hospital?.id : item.hospital;
    const docId = typeof item.doctor === 'object' ? item.doctor?.id : item.doctor;
    const nurseId = typeof item.nurse === 'object' ? item.nurse?.id : item.nurse;

    const docObj = docId ? doctorsList.find(d => Number(d.id) === Number(docId)) : null;
    const hospObj = hospId ? hospitalsList.find(h => Number(h.id) === Number(hospId)) : null;
    const nurseObj = nurseId ? nursesList.find(n => Number(n.id) === Number(nurseId)) : null;

    const docName = item.doctor_name || (docObj ? (docObj.name.startsWith('Dr.') ? docObj.name : `Dr. ${docObj.name}`) : (docId ? `Dr. ID ${docId}` : ''));
    const hospName = item.hospital_name || hospObj?.Name || hospObj?.name || '';
    const nurseName = item.nurse_name || nurseObj?.name || '';

    const condition = item.condition || item.Condation || item.symptoms_severity || 'Normal';
    const status = item.status || (docId ? 'Assigned' : 'Pending');

    const apptId = item.Appoment_id || item.appoment_id || item.appointment_id || id;
    const patGender = item.Gender || item.gender || 'Not Specified';

    return {
      ...item,
      id,
      Appoment_id: apptId,
      appoment_id: apptId,
      appointment_id: apptId,
      patient_id: `APT-${apptId}`,
      name: patientName,
      patient_name: patientName,
      patient_Name: patientName,
      hospital: hospId,
      hospital_name: hospName,
      doctor: docId ? Number(docId) : null,
      doctor_name: docName,
      doctor_specialization: docObj?.specialization || docObj?.specialty || item.doctor_specialization || '',
      bed_number: item.bed_number ? Number(item.bed_number) : null,
      nurse: nurseId ? Number(nurseId) : null,
      nurse_name: nurseName,
      condition,
      Condation: condition,
      status,
      age: item.age || item.Age || '',
      gender: patGender,
      Gender: patGender,
      blood_group: item.blood_group || item.Blood_Group || '',
      contact: item.contact || item.phone || '',
      email: item.email || '',
      symptoms_diagnosis: item.symptoms_diagnosis || item.reason_for_visit || '-',
      consultation_fee: item.consultation_fee || '0.00',
      hospitals_charges: item.hospitals_charges || item.Hospitals_Chargies || '0',
      Hospitals_Chargies: item.hospitals_charges || item.Hospitals_Chargies || '0',
      amount_paid: item.amount_paid || '0',
      payment_status: item.payment_status || 'Pending',
      payment_method: item.payment_method || 'Cash',
      checkup_status: item.checkup_status || 'Pending',
      visit_date_time: item.visit_date_time || item.created_at || new Date().toISOString(),
      created_at: item.created_at || item.visit_date_time || new Date().toISOString()
    };
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const email = (currentUser?.email || '').toLowerCase().trim();
      const recId = currentUser?.id;

      const [docRes, hospRes, nurRes, recRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Doctors/`),
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`),
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`)
      ]);

      let docData = [];
      let hospData = [];
      let nurData = [];
      let recData = [];

      if (docRes.status === 'fulfilled' && docRes.value.ok) docData = extractArray(await docRes.value.json().catch(() => []));
      if (hospRes.status === 'fulfilled' && hospRes.value.ok) hospData = extractArray(await hospRes.value.json().catch(() => []));
      if (nurRes.status === 'fulfilled' && nurRes.value.ok) nurData = extractArray(await nurRes.value.json().catch(() => []));
      if (recRes.status === 'fulfilled' && recRes.value.ok) recData = extractArray(await recRes.value.json().catch(() => []));

      setHospitals(hospData);

      // Determine Receptionist's assigned hospital
      let matchedRec = null;
      if (Array.isArray(recData)) {
        matchedRec = recData.find(r => 
          (r.email && r.email.toLowerCase().trim() === email) ||
          (recId && Number(r.id) === Number(recId)) ||
          (r.name && r.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
        );
      }

      let userHospIdVal = matchedRec?.hospital || currentUser?.hospital || (typeof currentUser?.hospital_data === 'object' ? currentUser?.hospital_data?.id : null);
      if (typeof userHospIdVal === 'object' && userHospIdVal !== null) {
        userHospIdVal = userHospIdVal.id || userHospIdVal.hospital_id;
      }

      let matchedHosp = null;
      if (userHospIdVal && Array.isArray(hospData)) {
        matchedHosp = hospData.find(h => Number(h.id) === Number(userHospIdVal));
      }
      if (!matchedHosp && (currentUser?.hospital_name || matchedRec?.hospital_name)) {
        const hName = (currentUser?.hospital_name || matchedRec?.hospital_name).toLowerCase().trim();
        matchedHosp = hospData.find(h => (h.Name || h.name || '').toLowerCase().trim() === hName);
        if (matchedHosp) userHospIdVal = matchedHosp.id;
      }
      if (!matchedHosp && email) {
        const savedHospId = localStorage.getItem(`user_hospital_${email}`);
        if (savedHospId) {
          matchedHosp = hospData.find(h => Number(h.id) === Number(savedHospId));
          if (matchedHosp) userHospIdVal = matchedHosp.id;
        }
      }
      if (!matchedHosp) {
        const checkStr = `${email} ${currentUser?.name || ''} ${matchedRec?.name || ''}`.toLowerCase();
        matchedHosp = hospData.find(h => {
          const hn = (h.Name || h.name || '').toLowerCase().trim();
          return hn && checkStr.includes(hn);
        });
        if (matchedHosp) userHospIdVal = matchedHosp.id;
      }

      setHospitalInfo(matchedHosp);
      const userHospName = matchedHosp?.Name || matchedHosp?.name || currentUser?.hospital_name || matchedRec?.hospital_name || '';

      // STRICT HOSPITAL FILTERING: Only doctors and nurses of her hospital
      const hospDocs = userHospIdVal || userHospName
        ? docData.filter(d => isDoctorInHospital(d, userHospIdVal, userHospName))
        : [];

      const hospNurses = userHospIdVal || userHospName
        ? nurData.filter(n => isNurseInHospital(n, userHospIdVal, userHospName))
        : [];

      setDoctors(hospDocs);
      setNurses(hospNurses);

      // 1. Fetch Appointments ONLY from Backend (No Patient model data)
      let rawAppointments = [];
      try {
        const aRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
        if (aRes && aRes.ok) {
          const aJson = await aRes.json().catch(() => []);
          rawAppointments = extractArray(aJson);
        }
      } catch (e) {}

      // Normalize appointments strictly from backend
      const combinedList = [];
      const seenIds = new Set();

      for (const item of rawAppointments) {
        const norm = normalizeAppointment(item, hospDocs, hospData, hospNurses);
        if (norm && !seenIds.has(String(norm.id))) {
          seenIds.add(String(norm.id));
          combinedList.push(norm);
        }
      }

      // STRICT HOSPITAL ISOLATION: Only appointments for this receptionist's hospital
      const filteredPats = userHospIdVal || userHospName
        ? combinedList.filter(p => isAppointmentInHospital(p, userHospIdVal, userHospName, hospData))
        : [];

      setPatients(filteredPats);
    } catch (err) {
      console.error('Error fetching receptionist appointments data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    const hospId = hospitalInfo?.id || userHospId || (hospitals[0]?.id || 1);
    setAddFormData({
      ...initialFormState,
      patient_id: generateUHID(),
      hospital: hospId
    });
    setAddSelectedFile(null);
    setAutoNurseText('');
    setIsAddModalOpen(true);
  };

  const handleBedInput = (bedVal) => {
    const hospId = addFormData.hospital || userHospId;
    const autoRes = bedVal ? getAutoNurseForBed(bedVal, nurses, hospId) : { nurseId: '', nurseName: '' };
    setAddFormData(prev => ({
      ...prev,
      bed_number: bedVal,
      nurse: autoRes.nurseId ? String(autoRes.nurseId) : prev.nurse
    }));
    if (autoRes.nurseName) {
      setAutoNurseText(`Auto-assigned: ${autoRes.nurseName} (Floor ${getFloorNumber(bedVal)})`);
    } else {
      setAutoNurseText('');
    }
  };

  const handleAddChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'doctor') {
      setAddFormData(prev => ({
        ...prev,
        doctor: value
      }));
    } else if (name === 'bed_number') {
      handleBedInput(value);
    } else {
      setAddFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    if (!addFormData.name.trim()) {
      alert('Please enter patient name.');
      return;
    }

    try {
      const generatedDocPatId = addFormData.patient_id || generateUHID();
      const selectedDocObj = doctors.find(d => Number(d.id) === Number(addFormData.doctor));
      const chosenHospId = Number(addFormData.hospital || userHospId || 1);
      const parsedBedNum = addFormData.bed_number ? Number(addFormData.bed_number) : null;
      const autoRes = parsedBedNum ? getAutoNurseForBed(parsedBedNum, nurses, chosenHospId) : { nurseId: null, nurseName: '' };
      const selectedNurseObj = nurses.find(n => Number(n.id) === Number(addFormData.nurse)) || (autoRes.nurseId ? nurses.find(n => Number(n.id) === autoRes.nurseId) : null);
      const chosenCondition = addFormData.Condation || 'Normal';
      const visitIso = new Date().toISOString();

      const chosenGender = ['Male', 'Female', 'Other'].includes(addFormData.gender || addFormData.Gender) ? (addFormData.gender || addFormData.Gender) : 'Male';

      const cleanAppointmentPayload = {
        patient_Name: addFormData.name.trim(),
        hospital: chosenHospId,
        doctor: addFormData.doctor ? Number(addFormData.doctor) : null,
        visit_date_time: visitIso,
        age: addFormData.age ? String(addFormData.age).trim() : '25',
        gender: chosenGender,
        Gender: chosenGender,
        patient_gender: chosenGender,
        symptoms_diagnosis: (addFormData.symptoms_diagnosis || 'General Consultation').trim(),
        blood_group: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(addFormData.blood_group) ? addFormData.blood_group : 'A+',
        contact: addFormData.contact.trim(),
        email: addFormData.email.trim() || `${generatedDocPatId.toLowerCase()}@patient.hospital.com`,
        address: (addFormData.address || 'Hospital Inpatient').trim(),
        hospitals_charges: Number(addFormData.Hospitals_Chargies) || 0.00,
        amount_paid: Number(addFormData.amount_paid) || 0.00,
        payment_status: ['Paid', 'Partial', 'Pending', 'Failed'].includes(addFormData.payment_status) ? addFormData.payment_status : 'Pending',
        payment_method: ['UPI', 'Credit Card', 'Net Banking', 'Cash'].includes(addFormData.payment_method) ? addFormData.payment_method : 'Cash',
        status: parsedBedNum ? 'Admitted' : (addFormData.doctor ? 'Assigned' : 'Pending'),
        condition: ['Critical', 'Emergency', 'Urgent', 'Normal'].includes(chosenCondition) ? chosenCondition : 'Normal',
        bed_number: parsedBedNum
      };

      let response = null;

      // 1. Multipart if file attached
      if (addSelectedFile instanceof File) {
        const formData = new FormData();
        Object.entries(cleanAppointmentPayload).forEach(([key, val]) => {
          if (val !== null && val !== undefined) {
            formData.append(key, val);
          }
        });
        formData.append('attached_document', addSelectedFile);

        response = await fetch(`${API_BASE_URL}/super-admin/appointments/`, {
          method: 'POST',
          body: formData
        });
      } else {
        // 2. Standard JSON POST
        response = await fetch(`${API_BASE_URL}/super-admin/appointments/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanAppointmentPayload)
        });
      }

      if (response && response.ok) {
        const resData = await response.json().catch(() => ({}));
        const createdId = resData.id || resData.appointment_id || generatedDocPatId;
        const newRecord = {
          ...cleanAppointmentPayload,
          ...resData,
          id: createdId,
          appointment_id: createdId
        };
        alert(`Patient ${addFormData.name} registered & saved successfully in backend database! (ID: #${createdId})`);
        setAddSelectedFile(null);
        setIsAddModalOpen(false);
        fetchAllData();
      } else {
        alert('Failed to register patient in hospital backend system. Please verify backend is running.');
      }
    } catch (error) {
      console.error('Error creating patient appointment:', error);
      alert('Error creating patient record.');
    }
  };

  const handleViewPatientDetails = (patient) => {
    if (setSelectedPatient) {
      setSelectedPatient(patient);
      localStorage.setItem('selectedPatient', JSON.stringify(patient));
    }
    if (setCurrentPage) {
      setCurrentPage('receptionist_patient_details');
    }
  };

  // Tab counts
  const dischargedCount = patients.filter(p => (p.status || '').toLowerCase().includes('discharg')).length;
  const admittedCount = patients.filter(p => (p.status || '').toLowerCase().includes('admit')).length;
  const activeCount = patients.filter(p => !(p.status || '').toLowerCase().includes('discharg')).length;
  const opdCount = patients.filter(p => !(p.status || '').toLowerCase().includes('admit') && !(p.status || '').toLowerCase().includes('discharg')).length;

  const filteredPatients = patients.filter(p => {
    const isDischarged = (p.status || '').toLowerCase().includes('discharg');
    const isAdmitted = (p.status || '').toLowerCase().includes('admit');

    // Tab Filter
    if (activeTab === 'HISTORY') {
      if (!isDischarged) return false;
    } else if (activeTab === 'ADMITTED') {
      if (!isAdmitted) return false;
    } else if (activeTab === 'OPD') {
      if (isAdmitted || isDischarged) return false;
    } else { // ACTIVE
      if (isDischarged) return false;
    }

    const pName = (p.name || '').toLowerCase();
    const pId = (p.patient_id || p.uhid || '').toLowerCase();
    const pContact = (p.contact || p.phone || '').toLowerCase();
    const pEmail = (p.email || '').toLowerCase();
    const pDoc = (p.doctor_name || '').toLowerCase();

    const matchesSearch = pName.includes(searchTerm.toLowerCase()) ||
                          pId.includes(searchTerm.toLowerCase()) ||
                          pContact.includes(searchTerm.toLowerCase()) ||
                          pEmail.includes(searchTerm.toLowerCase()) ||
                          pDoc.includes(searchTerm.toLowerCase());

    const patCond = p.Condation || p.condition || p.symptoms_severity || 'Normal';
    const matchesSeverity = severityFilter === 'ALL' || patCond === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5">
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Front Desk Patient Admissions & Medical History
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 text-slate-100">
              Patient Admissions & Discharged Records
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Manage active inpatients, OPD consultations, billing payments, and access full archived discharge records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              + Add Patient
            </button>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div 
          onClick={() => setActiveTab('ACTIVE')}
          className={`p-4 rounded-2xl bg-white border shadow-xs cursor-pointer transition ${activeTab === 'ACTIVE' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-amber-300'}`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Patients</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">{patients.length}</h3>
          <p className="text-[11px] text-amber-600 font-medium mt-0.5">Total registered in hospital</p>
        </div>

        <div 
          onClick={() => setActiveTab('ADMITTED')}
          className={`p-4 rounded-2xl bg-white border shadow-xs cursor-pointer transition ${activeTab === 'ADMITTED' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200 hover:border-purple-300'}`}
        >
          <p className="text-[11px] font-semibold text-purple-600 uppercase">Currently Admitted</p>
          <h3 className="text-xl sm:text-2xl font-bold text-purple-700 mt-1">{admittedCount}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">In Ward with Bed & Nurse</p>
        </div>

        <div 
          onClick={() => setActiveTab('HISTORY')}
          className={`p-4 rounded-2xl bg-white border shadow-xs cursor-pointer transition ${activeTab === 'HISTORY' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'}`}
        >
          <p className="text-[11px] font-semibold text-emerald-600 uppercase">Discharged History</p>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">{dischargedCount}</h3>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Paid & Discharged Archive</p>
        </div>
      </div>

      {/* TABS, SEARCH AND FILTERS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
          {[
            { id: 'ACTIVE', label: 'All Patients / Admissions', count: patients.length },
            { id: 'ADMITTED', label: 'Inpatient Wards (Admitted)', count: admittedCount },
            { id: 'HISTORY', label: '📜 Discharged & Medical History', count: dischargedCount }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by UHID, patient name, phone, doctor..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-600/20 transition"
            />
          </div>

          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-600/20 transition cursor-pointer"
            >
              <option value="ALL">All Clinical Conditions</option>
              <option value="Normal">Normal Condition</option>
              <option value="Urgent">Urgent Attention</option>
              <option value="Emergency">Emergency Case</option>
              <option value="Critical">Critical Severity</option>
            </select>
          </div>
        </div>
      </div>

      {/* PATIENT LIST TABLE */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              {activeTab === 'HISTORY' ? 'Archived Discharged Patient Records' : 'Active Patient Admissions & File Records'} ({filteredPatients.length})
            </h2>
            <p className="text-xs text-slate-500">
              {activeTab === 'HISTORY' ? 'Permanent clinical and billing archive for discharged patients' : 'Live reception registry'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[840px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Patient ID & Name</th>
                <th className="py-3 px-3">Contact Details</th>
                <th className="py-3 px-3">Age / Gender</th>
                <th className="py-3 px-3">Attending Doctor</th>
                <th className="py-3 px-3">Bed & Nurse</th>
                <th className="py-3 px-3">Condition</th>
                <th className="py-3 px-3">Billing Status</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">Loading admissions...</td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <p className="text-slate-400 font-semibold">No patients matching current filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.slice(0, visibleCount).map((p, idx) => {
                  const cond = p.Condation || p.condition || p.symptoms_severity || 'Normal';
                  const condColor = cond === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                    cond === 'Emergency' ? 'bg-red-100 text-red-800 border-red-200' :
                                    cond === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                    'bg-emerald-100 text-emerald-800 border-emerald-200';

                  const isDischarged = (p.status || '').toLowerCase().includes('discharg');
                  const isPaid = (p.payment_status === 'Paid');

                  return (
                    <tr key={p.id || idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <span className="font-mono text-[11px] text-sky-700 font-bold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                          APT-{p.Appoment_id || p.appoment_id || p.appointment_id || p.id}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        <div className="font-medium text-slate-800">{p.contact || p.phone || 'No phone'}</div>
                        {p.email ? (
                          <a href={`mailto:${p.email}`} className="text-[11px] text-teal-600 hover:text-teal-800 hover:underline block truncate max-w-[150px]" title={`Send email to ${p.email}`}>
                            ✉️ {p.email}
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 block">No email</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        {p.age ? `${p.age} Yrs` : '-'} • {p.Gender || p.gender || 'Male'}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{p.doctor_name || (p.doctor ? `Dr. #${p.doctor}` : '-')}</div>
                        {p.doctor_specialization && <span className="text-[10px] text-teal-600 block">{p.doctor_specialization}</span>}
                      </td>

                      <td className="py-3 px-3">
                        {p.bed_number ? (
                          <div>
                            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                              Bed #{p.bed_number} (Fl {getFloorNumber(p.bed_number)})
                            </span>
                            {p.nurse_name && <span className="text-[10px] text-slate-400 block mt-0.5">{p.nurse_name}</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border font-bold ${condColor}`}>
                          {cond}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isPaid ? 'Paid' : 'Pending'}
                        </span>
                        {Number(p.consultation_fee || 0) + Number(p.Hospitals_Chargies || p.hospital_charges || 0) > 0 ? (
                          <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                            ₹{Number((Number(p.consultation_fee || 0) + Number(p.Hospitals_Chargies || p.hospital_charges || 0))).toFixed(0)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">₹0</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isDischarged ? 'bg-purple-100 text-purple-800 border-purple-200' :
                            (p.status || '').toLowerCase().includes('admit') ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            'bg-teal-50 text-teal-700 border-teal-200'
                          }`}>
                            {p.status || 'Admitted'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            p.checkup_status === 'Checkup Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {p.checkup_status === 'Checkup Done' ? '✓ Checkup Done' : '⏳ Checkup Pending'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleViewPatientDetails(p)}
                          className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          Details & Bill
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {visibleCount < filteredPatients.length && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-4">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More ({filteredPatients.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* MODAL: ADMIT NEW PATIENT WITH BED & AUTO NURSE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Admit / Register New Patient</h3>
                <p className="text-xs text-slate-300">Front Desk UHID Generation & Inpatient Bed Allocation</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={addFormData.name}
                    onChange={handleAddChange}
                    required
                    placeholder="Enter patient full legal name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    name="contact"
                    value={addFormData.contact}
                    onChange={handleAddChange}
                    required
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Age (Years) *</label>
                  <input
                    type="number"
                    name="age"
                    min="0"
                    max="120"
                    required
                    value={addFormData.age}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Gender *</label>
                  <select
                    name="gender"
                    value={addFormData.gender}
                    onChange={handleAddChange}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Blood Group *</label>
                  <select
                    name="blood_group"
                    value={addFormData.blood_group}
                    onChange={handleAddChange}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  >
                    <option value="">-- Select Blood Group --</option>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Not Known'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DOCTOR & BED WITH AUTO NURSE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Consulting Doctor</label>
                  <select
                    name="doctor"
                    value={addFormData.doctor}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  >
                    <option value="">-- Select Doctor --</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialization || 'General'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Bed Number (Optional)</label>
                  <input
                    type="number"
                    name="bed_number"
                    placeholder="e.g. 102 (Floor 1)"
                    value={addFormData.bed_number}
                    onChange={handleAddChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                  />
                  {autoNurseText && (
                    <p className="text-[11px] text-teal-700 font-semibold mt-1">
                      ✨ {autoNurseText}
                    </p>
                  )}
                </div>
              </div>

              {/* CONDITION & REASON */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Clinical Severity</label>
                  <select
                    name="Condation"
                    value={addFormData.Condation}
                    onChange={handleAddChange}
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Attached Document</label>
                  <input
                    type="file"
                    onChange={(e) => e.target.files && setAddSelectedFile(e.target.files[0])}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-800 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Symptoms / Diagnosis *</label>
                <textarea
                  name="symptoms_diagnosis"
                  rows={2}
                  required
                  placeholder="Record symptoms, diagnosis, chief complaints..."
                  value={addFormData.symptoms_diagnosis}
                  onChange={handleAddChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Admit Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistPatient;
