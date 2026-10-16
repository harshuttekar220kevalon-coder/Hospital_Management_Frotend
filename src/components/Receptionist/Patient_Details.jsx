import { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../Api/Api';

const BLOOD_GROUP_CHOICES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const STATUS_CHOICES = ['Pending', 'Assigned', 'Cancelled'];
const PAYMENT_STATUS_CHOICES = ['Pending', 'Paid', 'Partial', 'Failed'];
const PAYMENT_METHOD_CHOICES = [
  { value: 'Cash', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Debit Card', label: 'Debit Card' },
  { value: 'Net Banking', label: 'Net Banking' }
];
const CONDITION_STATUS_CHOICES = [
  { value: 'Critical', label: 'Critical' },
  { value: 'Emergency', label: 'Emergency' },
  { value: 'Urgent', label: 'Urgent' },
  { value: 'Normal', label: 'Normal' }
];
const timeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM',
  '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM'
];

const normalizeTimeToSlot = (timeStr) => {
  if (!timeStr) return '';
  const trimmed = String(timeStr).trim();
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    const h = ampmMatch[1].padStart(2, '0');
    const m = ampmMatch[2];
    const ampm = ampmMatch[3].toUpperCase();
    return `${h}:${m} ${ampm}`;
  }
  const h24Match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (h24Match) {
    let h = parseInt(h24Match[1], 10);
    const m = h24Match[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  }
  return trimmed;
};

const bloodGroupChoices = BLOOD_GROUP_CHOICES;
const conditionChoices = CONDITION_STATUS_CHOICES;
const appointmentStatusChoices = STATUS_CHOICES;
const paymentStatusChoices = PAYMENT_STATUS_CHOICES;

const getFloorNumber = (bed) => {
  if (!bed) return null;
  const num = Number(bed);
  if (isNaN(num) || num <= 0) return null;
  return Math.floor((num - 1) / 100) + 1;
};

const isDoctorOnDuty = (doc) => {
  if (!doc) return false;
  if (doc.is_active === false || doc.is_active === 'false') return false;
  const statusStr = String(doc.status || doc.duty_status || doc.availability || '').toLowerCase().trim();
  if (statusStr.includes('off') || statusStr.includes('leave') || statusStr === 'inactive' || statusStr === 'false') return false;
  return true;
};

const isDoctorOnLeave = (doc) => !isDoctorOnDuty(doc);

const isNurseOnDuty = (nurse) => {
  if (!nurse) return false;
  if (nurse.is_active === false || nurse.is_active === 'false') return false;
  const st = (nurse.status || '').toString().toLowerCase().trim();
  if (st.includes('off') || st.includes('leave') || st === 'inactive' || st === 'false') return false;
  return true;
};

// Helper: Auto-assign Nurse based on Bed number and hospital
const getAutoNurseForBed = (bedNumber, nursesList = [], hospitalId = null) => {
  if (!bedNumber || !nursesList || !Array.isArray(nursesList) || nursesList.length === 0) {
    return { nurseId: null, nurseName: '', reason: 'No bed specified' };
  }

  const hospNurses = hospitalId
    ? nursesList.filter(n => Number(typeof n.hospital === 'object' ? n.hospital?.id : n.hospital) === Number(hospitalId))
    : nursesList;
  const onDutyNurses = hospNurses.filter(n => isNurseOnDuty(n));
  const activeNurses = onDutyNurses.length > 0 ? onDutyNurses : [];

  if (activeNurses.length === 0) return { nurseId: null, nurseName: '', reason: 'No on-duty nurses available' };

  const floor = getFloorNumber(bedNumber);

  // 1. Try to match nurse by floor or ward
  const floorNurse = activeNurses.find(n => {
    const nWard = (n.ward || '').toLowerCase();
    const nFloor = (n.floor || '').toLowerCase();
    return nWard.includes(`floor ${floor}`) || nWard.includes(`floor${floor}`) ||
      nFloor.includes(`floor ${floor}`) || nFloor.includes(String(floor));
  });

  if (floorNurse) {
    return { nurseId: floorNurse.id, nurseName: floorNurse.name, reason: `Duty Station: Floor ${floor}` };
  }

  // 2. Fallback: pick on-duty hospital nurse
  const chosen = activeNurses[(Number(bedNumber) % activeNurses.length)] || activeNurses[0];
  return { nurseId: chosen.id, nurseName: chosen.name, reason: `Station Floor ${floor} Ward Staff` };
};

const extractArray = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.doctors)) return resData.doctors;
  if (Array.isArray(resData.appointments)) return resData.appointments;
  if (Array.isArray(resData.patients)) return resData.patients;
  if (Array.isArray(resData.nurses)) return resData.nurses;
  if (Array.isArray(resData.rows)) return resData.rows;
  return [];
};

const isDoctorInHospital = (doc, targetHospId, targetHospName = '', hospList = []) => {
  if (!doc) return false;

  let targetId = targetHospId && !isNaN(Number(targetHospId)) ? Number(targetHospId) : null;
  let targetName = (targetHospName || '').toString().toLowerCase().trim();

  // If targetId is provided but targetName isn't, resolve from hospList
  if (targetId && !targetName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => Number(h.id) === targetId);
    if (matched) targetName = (matched.Name || matched.name || '').toLowerCase().trim();
  } else if (!targetId && targetName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === targetName);
    if (matched) targetId = Number(matched.id);
  }

  // If receptionist's hospital cannot be resolved, return true so doctors are not hidden
  if (!targetId && !targetName) return true;

  // 1. Check array of hospitals if doctor has multiple branches
  if (Array.isArray(doc.hospitals) && doc.hospitals.length > 0) {
    const matchedInArray = doc.hospitals.some(h => {
      const hId = typeof h === 'object' && h !== null ? (h.id || h.hospital_id) : h;
      const hN = typeof h === 'object' && h !== null ? (h.Name || h.name || '') : (typeof h === 'string' ? h : '');
      if (targetId && hId && Number(hId) === targetId) return true;
      if (targetName && hN && hN.toString().toLowerCase().trim() === targetName) return true;
      return false;
    });
    if (matchedInArray) return true;
  }

  // 2. Resolve Doctor's raw hospital value
  const rawHosp = typeof doc.hospital === 'object' && doc.hospital !== null
    ? (doc.hospital.id || doc.hospital.hospital_id || doc.hospital.Name || doc.hospital.name)
    : doc.hospital;
  const rawHospName = doc.hospital_name || (typeof doc.hospital === 'object' && doc.hospital !== null ? (doc.hospital.Name || doc.hospital.name) : '') || '';

  let docHospId = null;
  let docHospName = '';

  if (rawHosp && !isNaN(Number(rawHosp)) && Number(rawHosp) > 0) {
    docHospId = Number(rawHosp);
    if (Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => Number(h.id) === docHospId);
      if (matched) docHospName = (matched.Name || matched.name || '').toLowerCase().trim();
    }
  } else if (rawHosp && typeof rawHosp === 'string' && rawHosp.trim() !== '') {
    const cleanRaw = rawHosp.trim().toLowerCase();
    if (Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === cleanRaw);
      if (matched) {
        docHospId = Number(matched.id);
        docHospName = (matched.Name || matched.name || '').toLowerCase().trim();
      } else {
        docHospName = cleanRaw;
      }
    } else {
      docHospName = cleanRaw;
    }
  }

  if (!docHospName && rawHospName && rawHospName.trim() !== '') {
    const cleanRawName = rawHospName.trim().toLowerCase();
    if (Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === cleanRawName);
      if (matched) {
        if (!docHospId) docHospId = Number(matched.id);
        docHospName = (matched.Name || matched.name || '').toLowerCase().trim();
      } else {
        docHospName = cleanRawName;
      }
    } else {
      docHospName = cleanRawName;
    }
  }

  if (!docHospId && !docHospName) return false;

  // Direct ID match
  if (targetId && docHospId && targetId === docHospId) return true;

  // Direct Name match
  if (targetName && docHospName && targetName === docHospName) return true;

  // Cross match via hospital list
  if (targetId && docHospName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === docHospName);
    if (matched && Number(matched.id) === targetId) return true;
  }
  if (targetName && docHospId && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => Number(h.id) === docHospId);
    if (matched && (matched.Name || matched.name || '').toLowerCase().trim() === targetName) return true;
  }

  // Distinctive keyword match (e.g., "Apollo Hospital" vs "Apollo")
  if (targetName && docHospName) {
    const cleanTarget = targetName.replace(/hospital|hospitals|care|clinic|super|speciality|specialty/gi, '').trim();
    const cleanDocHosp = docHospName.replace(/hospital|hospitals|care|clinic|super|speciality|specialty/gi, '').trim();
    if (cleanTarget.length >= 3 && cleanDocHosp.length >= 3) {
      if (cleanTarget.includes(cleanDocHosp) || cleanDocHosp.includes(cleanTarget)) {
        return true;
      }
    }
  }

  return false;
};

const isNurseInHospital = (nurse, targetHospId, targetHospName = '') => {
  if (!targetHospId && !targetHospName) return true;
  if (!nurse) return false;

  const nHosp = typeof nurse.hospital === 'object' && nurse.hospital !== null ? (nurse.hospital.id || nurse.hospital.hospital_id) : nurse.hospital;

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

const ReceptionistPatientDetails = ({ currentUser, selectedPatient, setSelectedPatient, setCurrentPage }) => {
  const [patient, setPatient] = useState(() => {
    if (selectedPatient) return selectedPatient;
    try {
      const saved = localStorage.getItem('selectedPatient');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isCancelledAppt = (a) => (a?.status || a?.appointment_status || '').toLowerCase().includes('cancel');
  const [appointments, setAppointments] = useState(() => (patient?.hospital_appointments || patient?.appointments || []).filter(a => !isCancelledAppt(a)));
  const [loading, setLoading] = useState(false);

  // Common Directory Lists
  const [hospitals, setHospitals] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [receptionistsList, setReceptionistsList] = useState([]);

  // Booking Modal State (with full Appointment fields)
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [bookAutoNurseText, setBookAutoNurseText] = useState('');

  // Form Data initialized with ONLY Email (locked) and Hospital (locked) - all other fields empty
  const [formData, setFormData] = useState({
    patient_name: '',
    age: '',
    gender: '',
    blood_group: '',
    contact: '',
    email: patient?.email && patient.email !== '-' ? patient.email : '',
    address: '',
    hospital: '',
    doctor: '',
    visit_date: '',
    visit_time: '',
    condition: '',
    symptoms_diagnosis: '',
    bed_number: '',
    nurse: '',
    status: '',
    payment_status: '',
    payment_method: '',
    hospitals_charges: '',
    amount_paid: ''
  });

  // Edit Appointment Modal State (Matching Anassine.jsx edit structure)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [editAttachedFile, setEditAttachedFile] = useState(null);
  const [autoNurseText, setAutoNurseText] = useState('');

  const [editFormData, setEditFormData] = useState({
    patient_Name: '',
    hospital: '',
    doctor: '',
    visit_date: '',
    visit_time: '',
    age: '',
    gender: 'Male',
    Gender: 'Male',
    symptoms_diagnosis: '',
    blood_group: 'A+',
    contact: '',
    email: '',
    address: '',
    hospitals_charges: '0.00',
    amount_paid: '0.00',
    payment_status: '',
    payment_method: '',
    status: '',
    condition: '',
    bed_number: '',
    nurse: '',
    attached_document: null
  });

  useEffect(() => {
    if (selectedPatient) {
      setPatient(selectedPatient);
      setAppointments(selectedPatient.hospital_appointments || selectedPatient.appointments || []);
    }
  }, [selectedPatient]);

  // Fetch Hospitals, Doctors, and Nurses List
  useEffect(() => {
    let isMounted = true;
    const fetchHospitalsDoctorsAndNurses = async () => {
      try {
        const [hospRes, docRes, nurseRes, recRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/super-admin/Hospital/`),
          fetch(`${API_BASE_URL}/super-admin/Doctors/`),
          fetch(`${API_BASE_URL}/super-admin/Nurses/`),
          fetch(`${API_BASE_URL}/super-admin/Receptionists/`)
        ]);

        if (hospRes.status === 'fulfilled' && hospRes.value?.ok) {
          const data = await hospRes.value.json().catch(() => []);
          const list = extractArray(data);
          if (isMounted) {
            setHospitals(list);
          }
        }

        if (docRes.status === 'fulfilled' && docRes.value?.ok) {
          const dData = await docRes.value.json().catch(() => []);
          const dList = extractArray(dData);
          if (isMounted) {
            setDoctorsList(dList);
          }
        }

        if (nurseRes.status === 'fulfilled' && nurseRes.value?.ok) {
          const nData = await nurseRes.value.json().catch(() => []);
          const nList = extractArray(nData);
          if (isMounted) {
            setNursesList(nList);
          }
        }

        if (recRes.status === 'fulfilled' && recRes.value?.ok) {
          const rData = await recRes.value.json().catch(() => []);
          const rList = extractArray(rData);
          if (isMounted) {
            setReceptionistsList(rList);
          }
        }
      } catch (e) {
        console.warn('Error loading hospitals, doctors, or nurses:', e);
      }
    };
    fetchHospitalsDoctorsAndNurses();
    return () => { isMounted = false; };
  }, [patient?.hospital_id, patient?.hospital_name, currentUser?.hospital]);

  // Receptionist's Assigned Hospital Branch (Strictly Locked)
  const assignedHospital = useMemo(() => {
    let storedUser = null;
    try {
      const rawStored = localStorage.getItem('currentUser');
      if (rawStored) storedUser = JSON.parse(rawStored);
    } catch (e) { }

    const activeUser = currentUser || storedUser || {};
    const email = (activeUser.email || '').toLowerCase().trim();
    const recId = activeUser.id;

    let matchedRec = null;
    if (Array.isArray(receptionistsList) && receptionistsList.length > 0) {
      matchedRec = receptionistsList.find(r =>
        (r.email && r.email.toLowerCase().trim() === email) ||
        (recId && Number(r.id) === Number(recId)) ||
        (r.name && r.name.toLowerCase().trim() === (activeUser.name || '').toLowerCase().trim())
      );
    }

    let targetHospId = matchedRec?.hospital
      ? (typeof matchedRec.hospital === 'object' ? matchedRec.hospital.id : matchedRec.hospital)
      : (activeUser?.hospital
        ? (typeof activeUser.hospital === 'object' ? activeUser.hospital.id : activeUser.hospital)
        : (activeUser?.hospital_id || null));

    let targetHospName = matchedRec?.hospital_name || activeUser?.hospital_name || '';

    if (!targetHospId && email) {
      const savedHospId = localStorage.getItem(`user_hospital_${email}`);
      if (savedHospId) targetHospId = savedHospId;
    }
    if (!targetHospId) {
      const savedAnyHospId = localStorage.getItem('user_hospital');
      if (savedAnyHospId) targetHospId = savedAnyHospId;
    }
    if (!targetHospName) {
      const savedHospName = localStorage.getItem('user_hospital_name');
      if (savedHospName) targetHospName = savedHospName;
    }

    if (!targetHospId && patient?.hospital_id) {
      targetHospId = patient.hospital_id;
    }
    if (!targetHospName && patient?.hospital_name) {
      targetHospName = patient.hospital_name;
    }

    if (Array.isArray(hospitals) && hospitals.length > 0) {
      if (targetHospId) {
        const found = hospitals.find(h => Number(h.id) === Number(targetHospId));
        if (found) return found;
      }
      if (targetHospName) {
        const cleanName = targetHospName.toLowerCase().trim();
        const found = hospitals.find(h => (h.Name || h.name || '').toLowerCase().trim() === cleanName);
        if (found) return found;
      }
      return hospitals[0];
    }

    return targetHospId ? { id: targetHospId, Name: targetHospName || 'Hospital Campus' } : null;
  }, [currentUser, patient?.hospital_id, patient?.hospital_name, hospitals, receptionistsList]);

  useEffect(() => {
    if (assignedHospital?.id) {
      setFormData(prev => ({ ...prev, hospital: String(assignedHospital.id) }));
    }
  }, [assignedHospital]);

  // Doctors strictly belonging to this receptionist's locked hospital branch
  const hospitalDoctors = useMemo(() => {
    if (!doctorsList || doctorsList.length === 0) return [];
    const targetHospId = assignedHospital?.id ? Number(assignedHospital.id) : null;
    const targetHospName = (assignedHospital?.Name || assignedHospital?.name || '').toLowerCase().trim();

    if (!targetHospId && !targetHospName) return doctorsList;

    const filtered = doctorsList.filter(d => isDoctorInHospital(d, targetHospId, targetHospName, hospitals));
    // Return all doctors belonging to this hospital. If filtered is non-empty, use it. If 0 found due to matching discrepancy, fallback to all doctorsList so receptionist can always assign.
    return filtered.length > 0 ? filtered : doctorsList;
  }, [doctorsList, assignedHospital, hospitals]);

  // Nurses strictly belonging to this receptionist's locked hospital branch
  const hospitalNurses = useMemo(() => {
    if (!nursesList || nursesList.length === 0) return [];
    const targetHospId = assignedHospital?.id ? Number(assignedHospital.id) : null;
    const targetHospName = (assignedHospital?.Name || assignedHospital?.name || '').toLowerCase().trim();

    if (!targetHospId && !targetHospName) return nursesList;

    return nursesList.filter(n => isNurseInHospital(n, targetHospId, targetHospName));
  }, [nursesList, assignedHospital]);

  // Maintain patient's locked email in formData (no other fields are pre-filled)
  useEffect(() => {
    if (patient?.email) {
      setFormData(prev => ({
        ...prev,
        email: patient.email && patient.email !== '-' ? patient.email : prev.email
      }));
    }
  }, [patient?.email]);

  const handleOpenBookingModal = () => {
    // Re-fetch latest doctors from backend so recently added doctors appear immediately
    fetch(`${API_BASE_URL}/super-admin/Doctors/`)
      .then(res => res.json())
      .then(dData => {
        const list = extractArray(dData);
        if (list.length > 0) setDoctorsList(list);
      })
      .catch(() => { });

    setFormData({
      patient_name: '',
      age: '',
      gender: '',
      blood_group: '',
      contact: '',
      email: patient?.email && patient.email !== '-' ? patient.email : '',
      address: '',
      hospital: assignedHospital?.id ? String(assignedHospital.id) : '',
      doctor: '',
      visit_date: '',
      visit_time: '',
      condition: '',
      symptoms_diagnosis: '',
      bed_number: '',
      nurse: '',
      status: '',
      payment_status: '',
      payment_method: '',
      hospitals_charges: '',
      amount_paid: ''
    });
    setAttachedFile(null);
    setBookAutoNurseText('');
    setSubmitError('');
    setShowBookingModal(true);
  };

  const fetchLatestAppts = async () => {
    if (!patient) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : (data?.results || data?.data || data?.appointments || []);

        const pEmail = (patient.email || '').trim().toLowerCase();
        const pContact = (patient.contact || patient.phone || '').trim().replace(/\D/g, '');
        const pId = patient.id ? String(patient.id) : '';
        const targetHospName = (patient.hospital_name || '').toLowerCase().trim();
        const targetHospId = patient.hospital_id || (typeof currentUser?.hospital === 'object' ? currentUser.hospital.id : currentUser?.hospital);

        const matched = list.filter(a => {
          const aStatus = (a.status || a.appointment_status || '').toLowerCase().trim();
          if (aStatus.includes('cancel')) return false;
          // Strict hospital isolation check
          if (targetHospId || targetHospName) {
            const aHosp = typeof a.hospital === 'object' && a.hospital !== null ? (a.hospital.id || a.hospital.hospital_id || a.hospital.Name || a.hospital.name) : a.hospital;
            const aHospName = (a.hospital_name || (typeof a.hospital === 'object' ? (a.hospital?.Name || a.hospital?.name) : '') || '').toLowerCase().trim();
            if (targetHospId && aHosp && !isNaN(Number(aHosp)) && Number(aHosp) !== Number(targetHospId)) return false;
            if (targetHospName && aHospName && aHospName !== targetHospName && !aHospName.includes(targetHospName) && !targetHospName.includes(aHospName)) return false;
          }

          const aEmail = (a.email || '').trim().toLowerCase();
          const aContact = (a.contact || a.phone || '').trim().replace(/\D/g, '');
          const aPat = typeof a.patient === 'object' && a.patient !== null ? String(a.patient.id) : (a.patient ? String(a.patient) : '');
          const aPatUhid = (a.patient_id || a.uhid || '').trim();

          if (pEmail && aEmail && pEmail === aEmail) return true;
          if (pContact && aContact && (pContact === aContact || (pContact.length >= 10 && aContact.length >= 10 && pContact.slice(-10) === aContact.slice(-10)))) return true;
          if (pId && aPat && pId === aPat) return true;
          if (pId && (aPatUhid === pId || aPatUhid === `PAT-${pId}`)) return true;

          return false;
        });

        if (matched.length > 0) {
          setAppointments(matched);
        }
      }
    } catch (e) {
      console.error('Error fetching patient appointments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestAppts();
  }, [patient?.id, patient?.email, patient?.contact]);

  const handleBack = () => {
    if (setCurrentPage) {
      setCurrentPage('receptionist_patients');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleBookBedChange = (bedVal) => {
    const hospId = formData.hospital || patient?.hospital_id || null;
    const autoRes = bedVal ? getAutoNurseForBed(bedVal, hospitalNurses, hospId) : { nurseId: '', nurseName: '' };

    setFormData(prev => ({
      ...prev,
      bed_number: bedVal,
      nurse: autoRes.nurseId ? String(autoRes.nurseId) : prev.nurse
    }));

    if (autoRes.nurseName) {
      setBookAutoNurseText(`Auto-Mapped: ${autoRes.nurseName} (Floor ${getFloorNumber(bedVal)})`);
    } else {
      setBookAutoNurseText('');
    }
  };

  const handleBookDoctorChange = (docVal) => {
    const chosenDoc = hospitalDoctors.find(d => Number(d.id) === Number(docVal));
    if (chosenDoc && isDoctorOnLeave(chosenDoc)) {
      alert(`${chosenDoc.name || 'This doctor'} is currently On Leave and cannot be assigned.`);
      return;
    }
    setFormData(prev => ({
      ...prev,
      doctor: docVal,
      hospitals_charges: (chosenDoc?.consultation_fee && (prev.hospitals_charges === '0.00' || !prev.hospitals_charges))
        ? String(chosenDoc.consultation_fee)
        : prev.hospitals_charges
    }));
  };

  const handleResetToPatient = () => {
    setFormData(prev => ({
      ...prev,
      patient_name: patient?.name || '',
      age: patient?.age && patient.age !== '-' ? String(patient.age) : '',
      gender: patient?.gender && patient.gender !== 'Not Specified' ? patient.gender : 'Male',
      blood_group: patient?.blood_group && patient.blood_group !== 'N/A' ? patient.blood_group : 'A+',
      contact: patient?.contact && patient.contact !== '-' ? String(patient.contact).replace(/\D/g, '').slice(0, 10) : '',
      email: patient?.email && patient.email !== '-' ? patient.email : '',
      address: patient?.address && patient.address !== 'Local Resident' ? patient.address : ''
    }));
  };

  const handleClearForm = () => {
    setFormData(prev => ({
      ...prev,
      condition: 'Normal',
      symptoms_diagnosis: '',
      age: '',
      address: '',
      bed_number: '',
      nurse: '',
      doctor: '',
      hospitals_charges: '0.00',
      amount_paid: '0.00'
    }));
    setAttachedFile(null);
    setBookAutoNurseText('');
  };

  // Open Edit Modal for a selected appointment (Exact Anassine.jsx behavior)
  const handleOpenEditModal = (appt) => {
    setEditingAppt(appt);
    setEditError('');
    setEditAttachedFile(null);

    let vDate = '';
    if (appt.appointment_date) {
      vDate = String(appt.appointment_date).split('T')[0].trim();
    } else if (appt.visit_date) {
      vDate = String(appt.visit_date).split('T')[0].trim();
    } else if (appt.visit_date_time) {
      try {
        const d = new Date(appt.visit_date_time);
        if (!isNaN(d.getTime())) {
          vDate = d.toISOString().split('T')[0];
        }
      } catch (e) { }
    } else if (appt.created_at) {
      try {
        const d = new Date(appt.created_at);
        if (!isNaN(d.getTime())) {
          vDate = d.toISOString().split('T')[0];
        }
      } catch (e) { }
    }

    let vTime = '';
    if (appt.appointment_time) {
      vTime = normalizeTimeToSlot(appt.appointment_time);
    } else if (appt.visit_time) {
      vTime = normalizeTimeToSlot(appt.visit_time);
    } else if (appt.visit_date_time) {
      try {
        const d = new Date(appt.visit_date_time);
        if (!isNaN(d.getTime())) {
          vTime = normalizeTimeToSlot(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
        }
      } catch (e) { }
    }
    if (!vTime) {
      vTime = '10:00 AM';
    }

    const hospId = typeof appt.hospital === 'object' ? appt.hospital?.id : appt.hospital;
    const docId = typeof appt.doctor === 'object' ? appt.doctor?.id : appt.doctor;
    const nurseId = typeof appt.nurse === 'object' ? appt.nurse?.id : appt.nurse;

    // Strict duty validation for existing assignments
    const existingDoc = docId ? hospitalDoctors.find(d => Number(d.id) === Number(docId)) : null;
    const isDocActive = existingDoc && isDoctorOnDuty(existingDoc);

    const existingNurse = nurseId ? hospitalNurses.find(n => Number(n.id) === Number(nurseId)) : null;
    const isNurseActive = existingNurse && isNurseOnDuty(existingNurse);

    const autoRes = appt.bed_number ? getAutoNurseForBed(appt.bed_number, hospitalNurses, hospId) : { nurseId: '', nurseName: '' };

    if (appt.bed_number && autoRes.nurseName) {
      setAutoNurseText(`Auto-Mapped: ${autoRes.nurseName} (Floor ${getFloorNumber(appt.bed_number)})`);
    } else {
      setAutoNurseText('');
    }

    setEditFormData({
      patient_Name: appt.patient_Name || appt.patient_name || appt.name || patient?.name || '',
      hospital: hospId ? String(hospId) : (patient?.hospital_id ? String(patient.hospital_id) : ''),
      doctor: isDocActive ? String(existingDoc.id) : '',
      visit_date: vDate,
      visit_time: vTime,
      age: appt.age || appt.Age || patient?.age || '',
      gender: appt.Gender || appt.gender || patient?.gender || 'Male',
      Gender: appt.Gender || appt.gender || patient?.gender || 'Male',
      symptoms_diagnosis: appt.symptoms_diagnosis || appt.reason_for_visit || '',
      blood_group: appt.blood_group || appt.Blood_Group || patient?.blood_group || 'A+',
      contact: appt.contact || appt.phone || patient?.contact || '',
      email: appt.email || patient?.email || '',
      address: appt.address || patient?.address || '',
      hospitals_charges: String(appt.hospitals_charges ?? appt.Hospitals_Chargies ?? appt.hospital_charges ?? '0.00'),
      amount_paid: String(appt.amount_paid ?? appt.Amount_Paid ?? '0.00'),
      payment_status: appt.payment_status || appt.Payment_Status || 'Pending',
      payment_method: appt.payment_method || appt.Payment_Method || '',
      status: STATUS_CHOICES.includes(appt.status || appt.Status)
        ? (appt.status || appt.Status)
        : ((docId || appt.doctor) ? 'Assigned' : 'Pending'),
      condition: appt.condition || appt.Condation || appt.Condition || appt.symptoms_severity || '',
      bed_number: appt.bed_number ? String(appt.bed_number) : '',
      nurse: isNurseActive ? String(existingNurse.id) : (autoRes.nurseId ? String(autoRes.nurseId) : ''),
      attached_document: appt.attached_document || null
    });

    setShowEditModal(true);
  };

  const handleEditBedChange = (bedVal) => {
    const hospId = editFormData.hospital || patient?.hospital_id || null;
    const autoRes = bedVal ? getAutoNurseForBed(bedVal, hospitalNurses, hospId) : { nurseId: '', nurseName: '' };

    setEditFormData(prev => ({
      ...prev,
      bed_number: bedVal,
      nurse: autoRes.nurseId ? String(autoRes.nurseId) : prev.nurse
    }));

    if (autoRes.nurseName) {
      setAutoNurseText(`Auto-Mapped: ${autoRes.nurseName} (Floor ${getFloorNumber(bedVal)})`);
    } else {
      setAutoNurseText('');
    }
  };

  const handleEditDoctorChange = (docVal) => {
    const chosenDoc = docVal ? hospitalDoctors.find(d => Number(d.id) === Number(docVal)) : null;
    if (chosenDoc) {
      if (chosenDoc && !isDoctorOnDuty(chosenDoc)) {
        alert(`${chosenDoc.name || 'This doctor'} is currently Off Duty / On Leave and cannot be assigned.`);
        return;
      }
    }
    setEditFormData(prev => ({
      ...prev,
      doctor: docVal,
      hospitals_charges: (chosenDoc?.consultation_fee && (prev.hospitals_charges === '0.00' || !prev.hospitals_charges))
        ? String(chosenDoc.consultation_fee)
        : prev.hospitals_charges
    }));
  };

  // Backend appointment update helper with candidate ID fallbacks & file upload support
  const updateBackendAppointment = async (apptId, payload, file = null, numericId = null, patientItem = null) => {
    const rawIds = [
      patientItem?.appointment_pk,
      patientItem?.appointment_id,
      patientItem?.Appoment_id,
      patientItem?.appoment_id,
      numericId,
      patientItem?.id,
      apptId,
      typeof apptId === 'string' && apptId.startsWith('APT-') ? apptId.replace('APT-', '') : null,
      typeof apptId === 'string' ? apptId.replace(/\D/g, '') : null
    ].filter(Boolean);

    const candidateIds = Array.from(new Set(rawIds.map(v => typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v)));
    let lastError = '';

    for (const targetId of candidateIds) {
      try {
        let res;
        if (file instanceof File) {
          const formDataObj = new FormData();
          Object.entries(payload).forEach(([key, val]) => {
            if (val !== null && val !== undefined && val !== '') {
              formDataObj.append(key, val);
            }
          });
          formDataObj.append('attached_document', file);

          res = await fetch(`${API_BASE_URL}/super-admin/appointments/${targetId}/`, {
            method: 'PATCH',
            body: formDataObj
          });
        } else {
          res = await fetch(`${API_BASE_URL}/super-admin/appointments/${targetId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        if (res && res.ok) {
          const resJson = await res.json().catch(() => ({}));
          return { ok: true, data: resJson };
        } else if (res) {
          lastError = await res.text().catch(() => '');
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    // Step 2 Fallback: Search all appointments to find exact backend PK
    try {
      const allApptsRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
      if (allApptsRes && allApptsRes.ok) {
        const allData = await allApptsRes.json().catch(() => []);
        const allAppts = Array.isArray(allData) ? allData : (allData?.results || allData?.data || []);
        const patName = (payload.patient_name || payload.patient_Name || payload.name || patientItem?.name || '').toLowerCase().trim();
        const patEmail = (payload.email || patientItem?.email || '').toLowerCase().trim();
        const patPhone = String(payload.contact || payload.phone || patientItem?.contact || '').replace(/\D/g, '');

        const matched = allAppts.find(a => {
          const aId = Number(a.id);
          const aApptId = String(a.Appoment_id || a.appoment_id || a.appointment_id || '');
          const aName = (a.patient_name || a.patient_Name || a.name || '').toLowerCase().trim();
          const aEmail = (a.email || '').toLowerCase().trim();
          const aPhone = String(a.contact || a.phone || '').replace(/\D/g, '');

          if (candidateIds.includes(aId) || candidateIds.includes(String(a.id))) return true;
          if (aApptId && candidateIds.includes(aApptId)) return true;
          if (patName && aName && patName === aName && patPhone && aPhone && patPhone === aPhone) return true;
          if (patName && aName && patName === aName && patEmail && aEmail && patEmail === aEmail) return true;
          if (patEmail && aEmail && patEmail === aEmail && patEmail.length > 4) return true;
          if (patPhone && aPhone && patPhone === aPhone && patPhone.length > 5) return true;
          return false;
        });

        if (matched && matched.id) {
          let res;
          if (file instanceof File) {
            const formDataObj = new FormData();
            Object.entries(payload).forEach(([key, val]) => {
              if (val !== null && val !== undefined && val !== '') {
                formDataObj.append(key, val);
              }
            });
            formDataObj.append('attached_document', file);

            res = await fetch(`${API_BASE_URL}/super-admin/appointments/${matched.id}/`, {
              method: 'PATCH',
              body: formDataObj
            });
          } else {
            res = await fetch(`${API_BASE_URL}/super-admin/appointments/${matched.id}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          }

          if (res && res.ok) {
            const resJson = await res.json().catch(() => ({}));
            return { ok: true, data: resJson };
          } else if (res) {
            lastError = await res.text().catch(() => '');
          }
        }
      }
    } catch (e) {
      lastError = e.message;
    }

    return { ok: false, error: lastError || 'Failed to update appointment in backend' };
  };

  // Save changes to backend appointment (Exact Anassine.jsx behavior)
  const handleSaveEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAppt) return;

    if (!editFormData.patient_Name.trim()) {
      alert('Please enter patient name.');
      return;
    }

    const cleanPhone = (editFormData.contact || editingAppt.contact || editingAppt.phone || '').replace(/\D/g, '').slice(0, 10);
    if (editFormData.contact && cleanPhone.length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }
    const editEmail = (editFormData.email || editingAppt.email || patient?.email || '').trim();
    if (editEmail && !editEmail.toLowerCase().endsWith('@gmail.com')) {
      alert("Email must be a valid @gmail.com address.");
      return;
    }

    if (!editFormData.visit_date) {
      alert('Please select Appointment Date.');
      return;
    }

    if (!editFormData.visit_time) {
      alert('Please select Appointment Time.');
      return;
    }

    if (!editFormData.condition) {
      alert('Please select Clinical Condition.');
      return;
    }

    if (!editFormData.status) {
      alert('Please select Appointment Status.');
      return;
    }

    if (!editFormData.payment_status) {
      alert('Please select Payment Status.');
      return;
    }

    try {
      setSavingEdit(true);
      setEditError('');

      const apptId = editingAppt.Appoment_id || editingAppt.appoment_id || editingAppt.appointment_id || editingAppt.id;
      const numericId = editingAppt.id;
      const chosenDoc = hospitalDoctors.find(d => Number(d.id) === Number(editFormData.doctor));
      if (chosenDoc && !isDoctorOnDuty(chosenDoc)) {
        alert(`Doctor ${chosenDoc.name || ''} is currently Off Duty / On Leave and cannot be assigned.`);
        setSavingEdit(false);
        return;
      }
      const parsedBed = editFormData.bed_number ? Number(editFormData.bed_number) : null;
      const hospId = Number(typeof editingAppt.hospital === 'object' ? editingAppt.hospital?.id : (editingAppt.hospital || editFormData.hospital || patient?.hospital_id)) || null;

      const autoRes = parsedBed ? getAutoNurseForBed(parsedBed, hospitalNurses, hospId) : { nurseId: null, nurseName: '' };
      const chosenNurse = hospitalNurses.find(n => Number(n.id) === Number(editFormData.nurse)) || (autoRes.nurseId ? hospitalNurses.find(n => Number(n.id) === autoRes.nurseId) : null);

      if (chosenNurse && !isNurseOnDuty(chosenNurse)) {
        alert(`Nurse ${chosenNurse.name || ''} is currently Off Duty and cannot be assigned to this appointment.`);
        setSavingEdit(false);
        return;
      }

      let visitIso = editingAppt.visit_date_time || new Date().toISOString();
      if (editFormData.visit_date) {
        let hours = 10;
        let minutes = 0;
        if (editFormData.visit_time) {
          const timeMatch = editFormData.visit_time.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (timeMatch) {
            let h = parseInt(timeMatch[1], 10);
            const m = parseInt(timeMatch[2], 10);
            const ampm = timeMatch[3].toUpperCase();
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            hours = h;
            minutes = m;
          }
        }
        const d = new Date(editFormData.visit_date);
        d.setHours(hours, minutes, 0, 0);
        visitIso = d.toISOString();
      }

      const nameVal = (editFormData.patient_Name || editingAppt.patient_Name || editingAppt.name || editingAppt.patient_name || patient?.name || '').trim();
      const phoneVal = (editFormData.contact || editingAppt.contact || editingAppt.phone || '').trim();
      const condVal = ['Critical', 'Emergency', 'Urgent', 'Normal'].includes(editFormData.condition) ? editFormData.condition : (editingAppt.condition || editingAppt.Condation || 'Normal');
      const chargesVal = Number(editFormData.hospitals_charges || 0);
      const paidVal = Number(editFormData.amount_paid || 0);
      const ageNum = editFormData.age && !isNaN(Number(editFormData.age)) ? Number(editFormData.age) : (editingAppt.age && !isNaN(Number(editingAppt.age)) ? Number(editingAppt.age) : 25);
      const genderVal = editFormData.gender || editFormData.Gender || editingAppt.Gender || editingAppt.gender || 'Male';

      const cleanPayload = {
        Appoment_id: apptId,
        appoment_id: apptId,
        appointment_id: apptId,
        name: nameVal,
        patient_Name: nameVal,
        patient_name: nameVal,
        contact: phoneVal,
        phone: phoneVal,
        email: (editFormData.email || editingAppt.email || patient?.email || '').trim(),
        age: ageNum,
        gender: genderVal,
        Gender: genderVal,
        patient_gender: genderVal,
        blood_group: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(editFormData.blood_group) ? editFormData.blood_group : (editingAppt.blood_group || 'A+'),
        Blood_Group: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(editFormData.blood_group) ? editFormData.blood_group : (editingAppt.blood_group || 'A+'),
        address: (editFormData.address || editingAppt.address || patient?.address || 'Hospital Inpatient').trim(),
        hospitals_charges: Number(chargesVal).toFixed(2),
        Hospitals_Chargies: Number(chargesVal).toFixed(2),
        hospital_charges: Number(chargesVal).toFixed(2),
        amount_paid: Number(paidVal).toFixed(2),
        payment_status: ['Pending', 'Paid', 'Partial', 'Failed'].includes(editFormData.payment_status) ? editFormData.payment_status : 'Pending',
        payment_method: editFormData.payment_method || editingAppt.payment_method || editingAppt.Payment_Method || 'Cash',
        status: STATUS_CHOICES.includes(editFormData.status) ? editFormData.status : 'Pending',
        checkup_status: editFormData.status === 'Completed' ? 'Completed' : (editFormData.status === 'In Consultation' ? 'In Progress' : (editingAppt.checkup_status || 'Pending')),
        condition: condVal,
        Condation: condVal,
        Condition: condVal,
        symptoms_diagnosis: (editFormData.symptoms_diagnosis || editingAppt.symptoms_diagnosis || editingAppt.reason_for_visit || 'General Consultation').trim(),
        reason_for_visit: (editFormData.symptoms_diagnosis || editingAppt.symptoms_diagnosis || editingAppt.reason_for_visit || 'General Consultation').trim(),
        visit_date_time: visitIso,
        appointment_date: editFormData.visit_date,
        appointment_time: editFormData.visit_time,
        visit_date: editFormData.visit_date,
        visit_time: editFormData.visit_time,
        is_active: true
      };

      if (hospId) cleanPayload.hospital = Number(hospId);
      if (chosenDoc) {
        cleanPayload.doctor = Number(chosenDoc.id);
        cleanPayload.doctor_name = chosenDoc.name?.startsWith('Dr.') ? chosenDoc.name : `Dr. ${chosenDoc.name}`;
      } else if (!editFormData.doctor) {
        cleanPayload.doctor = null;
        cleanPayload.doctor_name = 'Awaiting Doctor Assignment';
      }
      if (parsedBed) {
        cleanPayload.bed_number = Number(parsedBed);
      } else {
        cleanPayload.bed_number = null;
      }
      if (chosenNurse) {
        cleanPayload.nurse = Number(chosenNurse.id);
        cleanPayload.nurse_name = chosenNurse.name || '';
      } else if (!editFormData.nurse) {
        cleanPayload.nurse = null;
        cleanPayload.nurse_name = '';
      }

      const result = await updateBackendAppointment(apptId, cleanPayload, editAttachedFile, numericId, editingAppt);

      if (result && result.ok) {
        const candidateIds = [
          editingAppt.id,
          editingAppt.appointment_id,
          editingAppt.Appoment_id,
          editingAppt.appoment_id
        ].filter(Boolean).map(String);

        if (cleanPayload.status === 'Cancelled') {
          setAppointments(prev => prev.filter(a => !candidateIds.includes(String(a.id || a.appointment_id || a.Appoment_id))));
        } else {
          setAppointments(prev => prev.map(a => {
            const aId = a.id || a.appointment_id || a.Appoment_id;
            if (candidateIds.includes(String(aId))) {
              return {
                ...a,
                ...cleanPayload,
                doctor_name: cleanPayload.doctor_name || a.doctor_name,
                nurse_name: cleanPayload.nurse_name || a.nurse_name,
                visit_date_time: visitIso,
                appointment_date: editFormData.visit_date,
                appointment_time: editFormData.visit_time,
                visit_date: editFormData.visit_date,
                visit_time: editFormData.visit_time,
                attached_document: editAttachedFile ? (result.data?.attached_document || URL.createObjectURL(editAttachedFile)) : (result.data?.attached_document || a.attached_document)
              };
            }
            return a;
          }));
        }

        setPatient(prev => {
          if (!prev) return prev;
          const updatedAppts = (prev.hospital_appointments || prev.appointments || [])
            .map(a => {
              const aId = a.id || a.appointment_id || a.Appoment_id;
              return candidateIds.includes(String(aId))
                ? {
                  ...a,
                  ...cleanPayload,
                  doctor_name: cleanPayload.doctor_name || a.doctor_name,
                  nurse_name: cleanPayload.nurse_name || a.nurse_name,
                  visit_date_time: visitIso,
                  appointment_date: editFormData.visit_date,
                  appointment_time: editFormData.visit_time,
                  visit_date: editFormData.visit_date,
                  visit_time: editFormData.visit_time
                }
                : a;
            })
            .filter(a => cleanPayload.status !== 'Cancelled' || !candidateIds.includes(String(a.id || a.appointment_id || a.Appoment_id)));
          return {
            ...prev,
            hospital_appointments: updatedAppts,
            appointments: updatedAppts
          };
        });

        try {
          const currentSaved = JSON.parse(localStorage.getItem('selectedPatient') || '{}');
          if (Array.isArray(currentSaved.hospital_appointments)) {
            currentSaved.hospital_appointments = currentSaved.hospital_appointments.map(a => {
              const aId = a.id || a.appointment_id || a.Appoment_id;
              return candidateIds.includes(String(aId))
                ? {
                  ...a,
                  ...cleanPayload,
                  doctor_name: cleanPayload.doctor_name || a.doctor_name,
                  nurse_name: cleanPayload.nurse_name || a.nurse_name,
                  visit_date_time: visitIso,
                  appointment_date: editFormData.visit_date,
                  appointment_time: editFormData.visit_time,
                  visit_date: editFormData.visit_date,
                  visit_time: editFormData.visit_time
                }
                : a;
            });
            localStorage.setItem('selectedPatient', JSON.stringify(currentSaved));
            if (setSelectedPatient) {
              setSelectedPatient(currentSaved);
            }
          }
        } catch (err) { }

        if (typeof fetchLatestAppts === 'function') {
          fetchLatestAppts();
        }

        alert(`✓ Success! Appointment for ${cleanPayload.patient_Name} updated successfully.`);
        setShowEditModal(false);
        setEditingAppt(null);
        setEditAttachedFile(null);
      } else {
        throw new Error(result?.error || 'Failed to update appointment on backend.');
      }
    } catch (err) {
      console.error('Error saving appointment edit:', err);
      setEditError(err.message || 'Failed to save appointment changes.');
      alert(`⚠️ ${err.message || 'Failed to save appointment changes.'}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!formData.symptoms_diagnosis.trim()) {
      alert('Please enter chief symptoms or reason for appointment.');
      return;
    }
    if (!formData.hospital && !assignedHospital?.id) {
      alert('Hospital branch is required.');
      return;
    }

    const cleanPhone = (formData.contact || patient?.contact || patient?.phone || '').replace(/\D/g, '').slice(0, 10);
    if ((formData.contact || patient?.contact) && cleanPhone.length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }
    const finalEmail = (formData.email || patient?.email || '').trim().toLowerCase();
    if (finalEmail && !finalEmail.endsWith('@gmail.com')) {
      alert("Email must be a valid @gmail.com address.");
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const selectedHospId = assignedHospital?.id ? Number(assignedHospital.id) : (formData.hospital ? Number(formData.hospital) : null);
      const chosenHosp = hospitals.find(h => Number(h.id) === selectedHospId) || assignedHospital;
      const hospName = chosenHosp?.Name || chosenHosp?.name || patient?.hospital_name || 'Hospital Campus';

      const enteredName = formData.patient_name.trim() || patient?.name || 'Patient';
      const ageVal = formData.age ? String(formData.age).trim() : (patient?.age ? String(patient.age) : '25');
      const phoneVal = cleanPhone || '9876543210';
      const addrVal = (formData.address || patient?.address || '').trim() || 'Local Resident';
      const genderVal = formData.gender || patient?.gender || 'Male';
      const conditionVal = formData.condition || 'Normal';
      const bloodVal = formData.blood_group || patient?.blood_group || 'O+';

      const chosenDoc = hospitalDoctors.find(d => Number(d.id) === Number(formData.doctor));
      if (chosenDoc && !isDoctorOnDuty(chosenDoc)) {
        alert(`Doctor ${chosenDoc.name || ''} is currently Off Duty / On Leave and cannot be booked.`);
        return;
      }
      const parsedBed = formData.bed_number ? Number(formData.bed_number) : null;
      const autoRes = parsedBed ? getAutoNurseForBed(parsedBed, hospitalNurses, selectedHospId) : { nurseId: null, nurseName: '' };
      const chosenNurse = hospitalNurses.find(n => Number(n.id) === Number(formData.nurse)) || (autoRes.nurseId ? hospitalNurses.find(n => Number(n.id) === autoRes.nurseId) : null);
      if (chosenNurse && !isNurseOnDuty(chosenNurse)) {
        alert(`Nurse ${chosenNurse.name || ''} is currently Off Duty and cannot be assigned.`);
        return;
      }

      let visitIso = new Date().toISOString();
      if (formData.visit_date) {
        let hours = 10;
        let minutes = 0;
        if (formData.visit_time) {
          const timeMatch = formData.visit_time.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (timeMatch) {
            let h = parseInt(timeMatch[1], 10);
            const m = parseInt(timeMatch[2], 10);
            const ampm = timeMatch[3].toUpperCase();
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            hours = h;
            minutes = m;
          }
        }
        const d = new Date(formData.visit_date);
        d.setHours(hours, minutes, 0, 0);
        visitIso = d.toISOString();
      }

      const chargesVal = Number(formData.hospitals_charges || 0);
      const paidVal = Number(formData.amount_paid || 0);

      const appointmentPayload = {
        patient: patient?.id && !isNaN(Number(patient.id)) ? Number(patient.id) : undefined,
        patient_name: enteredName,
        patient_Name: enteredName,
        name: enteredName,
        age: ageVal,
        gender: genderVal,
        Gender: genderVal,
        patient_gender: genderVal,
        contact: phoneVal,
        phone: phoneVal,
        email: finalEmail,
        address: addrVal,
        hospital: selectedHospId,
        visit_date_time: visitIso,
        appointment_date: formData.visit_date,
        appointment_time: formData.visit_time,
        symptoms_diagnosis: formData.symptoms_diagnosis.trim(),
        reason_for_visit: formData.symptoms_diagnosis.trim(),
        blood_group: bloodVal,
        Blood_Group: bloodVal,
        hospitals_charges: chargesVal.toFixed(2),
        Hospitals_Chargies: chargesVal.toFixed(2),
        hospital_charges: chargesVal.toFixed(2),
        amount_paid: paidVal.toFixed(2),
        payment_status: formData.payment_status || 'Pending',
        payment_method: formData.payment_method || 'Cash',
        status: STATUS_CHOICES.includes(formData.status) ? formData.status : (chosenDoc ? 'Assigned' : 'Pending'),
        checkup_status: formData.status === 'Completed' ? 'Completed' : (formData.status === 'In Consultation' ? 'In Progress' : 'Pending'),
        condition: conditionVal,
        Condation: conditionVal,
        Condition: conditionVal,
        is_active: true
      };

      if (chosenDoc) {
        appointmentPayload.doctor = Number(chosenDoc.id);
        appointmentPayload.doctor_name = chosenDoc.name?.startsWith('Dr.') ? chosenDoc.name : `Dr. ${chosenDoc.name}`;
      }
      if (parsedBed) {
        appointmentPayload.bed_number = Number(parsedBed);
      }
      if (chosenNurse) {
        appointmentPayload.nurse = Number(chosenNurse.id);
        appointmentPayload.nurse_name = chosenNurse.name || '';
      }

      let apptResponse = null;
      if (attachedFile instanceof File) {
        const formDataObj = new FormData();
        Object.entries(appointmentPayload).forEach(([key, val]) => {
          if (val !== null && val !== undefined && val !== '') {
            formDataObj.append(key, val);
          }
        });
        formDataObj.append('attached_document', attachedFile);

        apptResponse = await fetch(`${API_BASE_URL}/super-admin/appointments/`, {
          method: 'POST',
          body: formDataObj
        });
      } else {
        apptResponse = await fetch(`${API_BASE_URL}/super-admin/appointments/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(appointmentPayload)
        });
      }

      if (!apptResponse || !apptResponse.ok) {
        let serverErr = '';
        try {
          const errData = await apptResponse.json();
          serverErr = typeof errData === 'object' ? JSON.stringify(errData) : String(errData);
        } catch {
          serverErr = `HTTP ${apptResponse.status}: ${apptResponse.statusText}`;
        }
        throw new Error(serverErr || 'Failed to create appointment');
      }

      const resData = await apptResponse.json().catch(() => ({}));
      const createdAppt = resData.data || resData;
      const newApptItem = {
        ...appointmentPayload,
        ...createdAppt,
        id: createdAppt.id || Date.now(),
        Appoment_id: createdAppt.Appoment_id || createdAppt.id || Date.now(),
        hospital_name: hospName
      };

      setAppointments(prev => [newApptItem, ...prev]);

      try {
        const currentSaved = JSON.parse(localStorage.getItem('selectedPatient') || '{}');
        const updatedSaved = {
          ...currentSaved,
          total_appointments: (currentSaved.total_appointments || 0) + 1,
          hospital_appointments: [newApptItem, ...(currentSaved.hospital_appointments || [])]
        };
        localStorage.setItem('selectedPatient', JSON.stringify(updatedSaved));
      } catch (err) { }

      alert(`✓ Appointment booked successfully for ${enteredName}!`);
      setShowBookingModal(false);
      setAttachedFile(null);
      setBookAutoNurseText('');
      setFormData({
        patient_name: '',
        age: '',
        gender: '',
        blood_group: '',
        contact: '',
        email: patient?.email && patient.email !== '-' ? patient.email : '',
        address: '',
        hospital: assignedHospital?.id ? String(assignedHospital.id) : '',
        doctor: '',
        visit_date: '',
        visit_time: '',
        condition: '',
        symptoms_diagnosis: '',
        bed_number: '',
        nurse: '',
        status: '',
        payment_status: '',
        payment_method: '',
        hospitals_charges: '',
        amount_paid: ''
      });
    } catch (err) {
      console.error('Error booking appointment:', err);
      setSubmitError(err.message || 'Failed to book appointment.');
      alert(`⚠️ ${err.message || 'Failed to book appointment.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 p-8 flex flex-col items-center justify-center space-y-4">
        <p className="text-slate-500 text-sm">No patient selected to display details.</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
        >
          ← Back to Patients Directory
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-8 space-y-4 sm:space-y-6">
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Patient Electronic Profile
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              {patient.name || 'Patient Profile'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              UHID: {patient.patient_id || patient.uhid || `PAT-${patient.id}`} • Hospital consultation and appointment records
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleOpenBookingModal}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-teal-900/30 flex items-center gap-2"
            >
              <span>➕</span>
              <span>Book Appointment For This Patient</span>
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700 flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Back to Patients</span>
            </button>
          </div>
        </div>
      </div>

      {/* Patient Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-black text-xl shadow-xs">
              {(patient.name || 'P').charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800">{patient.name}</h1>
                <span className="px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-mono text-xs font-bold">
                  {patient.patient_id || patient.uhid || `PAT-${patient.id}`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Registered Hospital Patient Profile
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold self-start sm:self-auto">
              {appointments.length} Total Visits
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block font-medium">Contact Phone</span>
            <span className="font-bold text-slate-800 font-mono text-sm mt-0.5 block">{patient.contact || patient.phone || '-'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block font-medium">Email Address</span>
            <span className="font-bold text-slate-800 text-sm mt-0.5 truncate block" title={patient.email}>{patient.email || '-'}</span>
          </div>

          <div className="col-span-1 sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block font-medium">Residential Address</span>
            <span className="font-medium text-slate-700 text-sm mt-0.5 block">{patient.address || 'Local Resident'}</span>
          </div>
        </div>
      </div>

      {/* Appointments History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-800">Hospital Appointments History</h2>
            <p className="text-xs text-slate-500">Bookings recorded at this hospital branch</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
              {appointments.length} Records
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-medium">
            No appointments found for this patient. Click "Book Appointment" above to schedule a consultation.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-600 min-w-[760px]">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
                <tr>
                  <th className="py-2.5 px-3">Appt ID</th>
                  <th className="py-2.5 px-3">Visit Date/Time</th>
                  <th className="py-2.5 px-3">Doctor</th>
                  <th className="py-2.5 px-3">Bed / Station Nurse</th>
                  <th className="py-2.5 px-3">Condition & Status</th>
                  <th className="py-2.5 px-3">Billing</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appt, idx) => {
                  const apptId = appt.id || appt.appointment_id || appt.Appoment_id;
                  // Resolve Doctor Name and Doctor ID
                  const rawDoc = appt.doctor;
                  let docObj = null;
                  if (typeof rawDoc === 'object' && rawDoc !== null) {
                    docObj = rawDoc;
                  } else if (rawDoc && Array.isArray(doctorsList)) {
                    docObj = doctorsList.find(d => Number(d.id) === Number(rawDoc) || String(d.doctor_id) === String(rawDoc) || String(d.id) === String(rawDoc));
                  }
                  if (!docObj && appt.doctor_name && Array.isArray(doctorsList)) {
                    docObj = doctorsList.find(d => (d.name || '').toLowerCase().trim() === (appt.doctor_name || '').toLowerCase().trim());
                  }

                  const rawName = docObj?.name || appt.doctor_name || (typeof rawDoc === 'object' ? rawDoc?.name : null) || (rawDoc ? `Dr. ID #${rawDoc}` : null);
                  const isAssigned = Boolean(rawName && rawName !== 'Awaiting Assignment');
                  const docDisplayName = isAssigned ? (rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`) : 'Awaiting Assignment';
                  const docDisplayId = isAssigned
                    ? (docObj?.doctor_id || appt.doctor_id || (typeof rawDoc === 'object' ? (rawDoc?.doctor_id || (rawDoc?.id ? `DOC-${rawDoc.id}` : null)) : null) || (docObj?.id ? `DOC-${docObj.id}` : (rawDoc ? (String(rawDoc).startsWith('DOC-') ? rawDoc : `DOC-${rawDoc}`) : null)))
                    : null;
                  const visitTime = appt.visit_date_time || appt.created_at || 'Scheduled';
                  const condition = appt.condition || appt.Condation || 'Normal';
                  const status = appt.status || 'Pending';
                  const payStatus = appt.payment_status || 'Pending';
                  const charges = Number(appt.hospitals_charges ?? appt.Hospitals_Chargies ?? appt.hospital_charges ?? 0).toFixed(2);
                  const paid = Number(appt.amount_paid ?? appt.Amount_Paid ?? 0).toFixed(2);

                  let nurseDisplayName = appt.nurse_name || (typeof appt.nurse === 'object' ? appt.nurse?.name : '');
                  if (!nurseDisplayName && appt.nurse && Array.isArray(nursesList)) {
                    const foundNurse = nursesList.find(n => Number(n.id) === Number(appt.nurse));
                    if (foundNurse) nurseDisplayName = foundNurse.name;
                  }

                  return (
                    <tr key={apptId ? `a-${apptId}-${idx}` : `a-idx-${idx}`} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-mono font-bold text-teal-800">
                        {appt.Appoment_id || appt.tracking_id || `APT-${apptId}`}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {typeof visitTime === 'string' && visitTime.includes('T') ? visitTime.replace('T', ' ').slice(0, 16) : visitTime}
                      </td>
                      <td className="py-3 px-3">
                        {isAssigned ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-xs sm:text-[13px]">
                              {docDisplayName}
                            </span>
                            {docDisplayId && (
                              <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 w-max mt-0.5">
                                {docDisplayId}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Awaiting Assignment</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {appt.bed_number ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px] inline-block w-max">
                              🛏️ Bed #{appt.bed_number}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              {nurseDisplayName ? `Nurse: ${nurseDisplayName}` : 'Floor Staff'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">OPD Consultation</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${condition === 'Critical' || condition === 'Emergency' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              condition === 'Urgent' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                            {condition}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status === 'Assigned' || status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                            {status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block ${
                          (payStatus || '').toLowerCase() === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : (payStatus || '').toLowerCase() === 'unpaid' || (payStatus || '').toLowerCase() === 'failed'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : (payStatus || '').toLowerCase() === 'partial'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {payStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(appt)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          title="Edit this appointment record"
                        >
                          <span>✏️</span>
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* BOOK APPOINTMENT MODAL (ALIGNED WITH APPOINTMENT REGISTRATION FORM)        */}
      {/* ========================================================================= */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            {/* MODAL HEADER */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold border border-teal-400/30">
                  <span>OPD Consultation</span>
                  <span>•</span>
                  <span>{patient.name}</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold mt-1">Appointment Registration Form</h2>
                <p className="text-xs text-slate-300">Fill in patient details and select preferred hospital branch.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* MODAL BODY (SCROLLABLE) */}
            <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-6">
              {submitError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleBookingSubmit} className="space-y-6">
                {/* SECTION 1: PATIENT INFORMATION */}
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                        <span>Patient Information</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Enter patient full name, contact details, and blood group.
                      </p>
                    </div>

                    {/* QUICK ACTION BUTTONS */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleResetToPatient}
                        className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold cursor-pointer transition flex items-center gap-1"
                        title="Reset to Patient Profile Info"
                      >
                        <span>👤</span>
                        <span>Fill My Info</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearForm}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold cursor-pointer transition"
                        title="Clear optional fields"
                      >
                        Clear Form
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* PATIENT NAME */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Patient Full Name *
                      </label>
                      <input
                        type="text"
                        name="patient_name"
                        required
                        placeholder="Enter patient full name"
                        value={formData.patient_name}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                      />
                    </div>

                    {/* PATIENT AGE */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Patient Age (Years)
                      </label>
                      <input
                        type="number"
                        name="age"
                        min="0"
                        max="150"
                        placeholder="Enter your age"
                        value={formData.age}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                      />
                    </div>

                    {/* GENDER */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Gender *
                      </label>
                      <select
                        name="gender"
                        required
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs font-medium"
                      >
                        <option value="">-- Select Gender --</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* BLOOD GROUP */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Blood Group *
                      </label>
                      <select
                        name="blood_group"
                        value={formData.blood_group}
                        onChange={handleChange}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs font-medium"
                      >
                        <option value="">-- Select Your Blood Group --</option>
                        {bloodGroupChoices.map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>

                    {/* CONTACT PHONE */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Contact Phone *
                      </label>
                      <input
                        type="tel"
                        name="contact"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        inputMode="numeric"
                        required
                        placeholder="e.g. 9876543210"
                        value={formData.contact}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                      />
                    </div>

                    {/* EMAIL ADDRESS (LOCKED TO THIS PATIENT'S ACCOUNT EMAIL) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 uppercase">
                          Email Address *
                        </label>
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                          <span>🔒</span>
                          <span>Account Email (Locked)</span>
                        </span>
                      </div>
                      <input
                        type="email"
                        name="email"
                        pattern="[a-zA-Z0-9._%+-]+@gmail\.com"
                        title="Email must be a valid @gmail.com address"
                        required
                        readOnly
                        placeholder="e.g. patient@gmail.com"
                        value={patient.email || formData.email || ''}
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-100 border-slate-300 text-slate-700 cursor-not-allowed font-semibold text-xs sm:text-sm shadow-2xs"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Appointment will be strictly linked to your portal account ({patient.email || 'patient account'}).
                      </p>
                    </div>

                    {/* RESIDENTIAL ADDRESS */}
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Residential Address *
                      </label>
                      <input
                        type="text"
                        name="address"
                        required
                        placeholder="Enter patient full residential address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: DOCTOR, TIMING & HOSPITAL ASSIGNMENT */}
                <div className="space-y-4 pt-2">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                      <span>Doctor, Timing & Hospital Assignment</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Select hospital branch, consulting doctor, visit date, time slot, and health concern.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* HOSPITAL BRANCH (LOCKED TO RECEPTIONIST'S ASSIGNED BRANCH) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 uppercase">
                          Hospital Branch *
                        </label>
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                          <span>🔒</span>
                          <span>Receptionist Branch (Locked)</span>
                        </span>
                      </div>
                      <div
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-100 text-xs sm:text-sm text-slate-700 font-bold flex items-center justify-between cursor-not-allowed shadow-2xs"
                        title="Receptionists only manage appointments within their hospital branch."
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>🏥</span>
                          <span className="truncate">
                            {assignedHospital?.Name || assignedHospital?.name || patient?.hospital_name || 'Assigned Hospital Branch'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">Read-only</span>
                      </div>
                      <input
                        type="hidden"
                        name="hospital"
                        value={formData.hospital || assignedHospital?.id || ''}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Appointments are strictly locked to your receptionist branch ({assignedHospital?.Name || assignedHospital?.name || 'this hospital'}).
                      </p>
                    </div>

                    {/* CONSULTING DOCTOR */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Consulting Doctor
                      </label>
                      <select
                        name="doctor"
                        value={formData.doctor}
                        onChange={(e) => handleBookDoctorChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs font-medium"
                      >
                        <option value="">-- Assign Doctor (Or Awaiting Assignment) --</option>
                        {hospitalDoctors.map(doc => {
                          const onDuty = isDoctorOnDuty(doc);
                          const docName = doc.name?.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`;
                          const specialty = doc.specialty || doc.specialization || 'General';
                          return (
                            <option
                              key={doc.id}
                              value={doc.id}
                              disabled={!onDuty}
                              style={!onDuty ? { color: '#dc2626', fontWeight: 'bold', backgroundColor: '#fff1f2' } : {}}
                              className={!onDuty ? 'text-rose-600 font-bold bg-rose-50' : ''}
                            >
                              {docName} ({specialty}){!onDuty ? ' (Off Duty)' : ''}{doc.consultation_fee ? ` - ₹${doc.consultation_fee}` : ''}
                            </option>
                          );
                        })}
                      </select>
                      {hospitalDoctors.length === 0 && (
                        <p className="text-[10px] text-amber-600 mt-1">
                          No doctors found for this hospital branch.
                        </p>
                      )}
                    </div>

                    {/* APPOINTMENT DATE */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Appointment Date *
                      </label>
                      <input
                        type="date"
                        name="visit_date"
                        required
                        value={formData.visit_date}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                      />
                    </div>

                    {/* TIME SLOT */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Time Slot *
                      </label>
                      <select
                        name="visit_time"
                        value={formData.visit_time}
                        onChange={handleChange}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs font-medium"
                      >
                        <option value="">-- Select Time Slot --</option>
                        {timeSlots.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* CONDITION STATUS */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Condition Severity *
                      </label>
                      <select
                        name="condition"
                        value={formData.condition}
                        onChange={handleChange}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs font-medium"
                      >
                        <option value="">-- Select Condition Severity --</option>
                        {CONDITION_STATUS_CHOICES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* SYMPTOMS / DIAGNOSIS */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Chief Symptoms / Health Concern *
                      </label>
                      <textarea
                        name="symptoms_diagnosis"
                        rows={2}
                        required
                        placeholder="Describe your symptoms, illness duration or reason for consultation..."
                        value={formData.symptoms_diagnosis}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium resize-none"
                      ></textarea>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: BED & NURSE ALLOCATION */}
                <div className="space-y-4 pt-2">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                      <span>Bed & Nurse Allocation</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Assign bed number for inpatient admission or leave empty for outpatient consultation.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Bed Number (Leave blank for OPD)
                      </label>
                      <input
                        type="number"
                        placeholder="Enter bed number"
                        value={formData.bed_number}
                        onChange={(e) => handleBookBedChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-mono font-medium"
                      />
                      {bookAutoNurseText && (
                        <p className="text-[11px] text-teal-700 font-semibold mt-1 flex items-center gap-1">
                          <span>✨</span>
                          <span>{bookAutoNurseText}</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Assigned Station Nurse
                      </label>
                      <select
                        name="nurse"
                        value={formData.nurse}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs font-medium"
                      >
                        <option value="">-- Auto-assigned from Bed Duty --</option>
                        {hospitalNurses.map(n => {
                          const onDuty = isNurseOnDuty(n);
                          return (
                            <option
                              key={n.id}
                              value={n.id}
                              disabled={!onDuty}
                              style={!onDuty ? { color: '#dc2626', fontWeight: 'bold', backgroundColor: '#fff1f2' } : {}}
                              className={!onDuty ? 'text-rose-600 font-bold bg-rose-50' : ''}
                            >
                              {n.name} ({n.ward || 'Ward Staff'}){!onDuty ? ' (Off Duty)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: STATUS, FINANCIALS & DOCUMENTS */}
                <div className="space-y-4 pt-2">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">4</span>
                      <span>Status, Financials & Documents</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Configure appointment status, payment status, hospital charges, and attached reports.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Appointment Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs font-medium"
                      >
                        <option value="">-- Select Status --</option>
                        {STATUS_CHOICES.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Payment Status
                      </label>
                      <select
                        name="payment_status"
                        value={formData.payment_status}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs font-medium"
                      >
                        <option value="">-- Select Payment Status --</option>
                        {PAYMENT_STATUS_CHOICES.map(ps => (
                          <option key={ps} value={ps}>{ps}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Payment Method
                      </label>
                      <select
                        name="payment_method"
                        value={formData.payment_method}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs font-medium"
                      >
                        <option value="">-- Select Payment Method --</option>
                        {PAYMENT_METHOD_CHOICES.map(pm => (
                          <option key={pm.value} value={pm.value}>{pm.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Hospital / Bed Charges (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="hospitals_charges"
                        value={formData.hospitals_charges}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Amount Paid (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="amount_paid"
                        value={formData.amount_paid}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-600 shadow-2xs font-medium"
                      />
                    </div>

                    {/* ATTACHED DOCUMENT */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Attach Medical Document (Optional)
                      </label>
                      <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-50 transition">
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={handleFileChange}
                          className="block w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                        />
                        {attachedFile && (
                          <p className="text-[11px] text-teal-700 font-semibold mt-1.5 flex items-center gap-1">
                            <span>✓ Attached File:</span>
                            <span className="font-mono">{attachedFile.name} ({(attachedFile.size / 1024).toFixed(1)} KB)</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* MODAL FOOTER BUTTONS */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-700/20 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Booking Appointment...</span>
                      </>
                    ) : (
                      <>
                        <span>✓</span>
                        <span>Confirm & Book Appointment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT APPOINTMENT MODAL                                                    */}
      {/* ========================================================================= */}
      {/* COMPREHENSIVE EDIT APPOINTMENT MODAL (Exact Anassine.jsx unassigned edit form) */}
      {showEditModal && editingAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Appointment & Assignment</span>
                </h3>
                <p className="text-xs text-slate-300">
                  {editFormData.patient_Name || editingAppt.name || patient.name} • Appointment ID: APT-{editingAppt.Appoment_id || editingAppt.appoment_id || editingAppt.appointment_id || editingAppt.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowEditModal(false); setEditingAppt(null); setEditAttachedFile(null); }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="p-6 space-y-5 overflow-y-auto">
              {editError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                  {editError}
                </div>
              )}

              {/* SECTION 1: PATIENT PERSONAL DETAILS */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                  <span>👤</span>
                  <span>Patient Information</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Name *</label>
                    <input
                      type="text"
                      value={editFormData.patient_Name}
                      onChange={(e) => setEditFormData({ ...editFormData, patient_Name: e.target.value })}
                      required
                      placeholder="Enter your name"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={editFormData.age}
                      onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                      placeholder="Enter your age"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                    <select
                      value={editFormData.gender || editFormData.Gender || 'Male'}
                      onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value, Gender: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Number</label>
                    <input
                      type="tel"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      inputMode="numeric"
                      value={editFormData.contact}
                      onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email ID</label>
                    <input
                      type="email"
                      pattern="[a-zA-Z0-9._%+-]+@gmail\.com"
                      title="Email must be a valid @gmail.com address"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      placeholder="patient@gmail.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                    <select
                      value={editFormData.blood_group}
                      onChange={(e) => setEditFormData({ ...editFormData, blood_group: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
                      <option value="">-- Select Blood Group --</option>
                      {BLOOD_GROUP_CHOICES.map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    placeholder="Residential address..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* SECTION 2: CLINICAL ASSIGNMENT & STATUS */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                  <span>🩺</span>
                  <span>Doctor, Timing & Hospital Assignment</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Hospital Facility</span>
                      <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                        🔒 Receptionist Branch (Locked)
                      </span>
                    </label>
                    <div
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs sm:text-sm text-slate-700 font-bold flex items-center justify-between cursor-not-allowed shadow-2xs"
                      title="Receptionists only manage appointments within their hospital branch."
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>🏥</span>
                        <span className="truncate">
                          {hospitals.find(h => Number(h.id) === Number(editFormData.hospital))?.Name ||
                            hospitals.find(h => Number(h.id) === Number(editFormData.hospital))?.name ||
                            assignedHospital?.Name ||
                            assignedHospital?.name ||
                            editingAppt?.hospital_name ||
                            patient?.hospital_name || 'Hospital Branch'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">Read-only</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Consulting Doctor</label>
                    <select
                      value={editFormData.doctor}
                      onChange={(e) => handleEditDoctorChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
                      <option value="">-- Unassigned Doctor --</option>
                      {hospitalDoctors.map(d => {
                        const onDuty = isDoctorOnDuty(d);
                        const docName = d.name?.startsWith('Dr.') ? d.name : `Dr. ${d.name}`;
                        const specialty = d.specialization || d.specialty || 'General';
                        return (
                          <option
                            key={d.id}
                            value={d.id}
                            disabled={!onDuty}
                            style={!onDuty ? { color: '#dc2626', fontWeight: 'bold', backgroundColor: '#fff1f2' } : {}}
                            className={!onDuty ? 'text-rose-600 font-bold bg-rose-50' : ''}
                          >
                            {docName} ({specialty}){!onDuty ? ' (Off Duty)' : ''}{d.consultation_fee ? ` - ₹${d.consultation_fee}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Appointment Date</label>
                    <input
                      type="date"
                      value={editFormData.visit_date}
                      onChange={(e) => setEditFormData({ ...editFormData, visit_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Appointment Time</label>
                    <select
                      value={editFormData.visit_time}
                      onChange={(e) => setEditFormData({ ...editFormData, visit_time: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
                      <option value="">-- Select Appointment Time --</option>
                      {editFormData.visit_time && !timeSlots.includes(editFormData.visit_time) && (
                        <option value={editFormData.visit_time}>{editFormData.visit_time}</option>
                      )}
                      {timeSlots.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Condition</label>
                    <select
                      value={editFormData.condition}
                      onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
                      <option value="">-- Select Clinical Condition --</option>
                      {CONDITION_STATUS_CHOICES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Symptoms / Chief Complaint</label>
                  <textarea
                    rows={2}
                    value={editFormData.symptoms_diagnosis}
                    onChange={(e) => setEditFormData({ ...editFormData, symptoms_diagnosis: e.target.value })}
                    placeholder="Chief medical symptoms and diagnosis notes..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white resize-none"
                  />
                </div>
              </div>

              {/* SECTION 3: BED & INPATIENT WARD ALLOCATION */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                  <span>🛏️</span>
                  <span>Bed & Nurse Allocation</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bed Number (Leave blank for OPD)</label>
                    <input
                      type="number"
                      placeholder="Enter bed number"
                      value={editFormData.bed_number}
                      onChange={(e) => handleEditBedChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white font-mono"
                    />
                    {autoNurseText && (
                      <p className="text-[11px] text-teal-700 font-semibold mt-1 flex items-center gap-1">
                        <span>✨</span>
                        <span>{autoNurseText}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Station Nurse</label>
                    <select
                      value={editFormData.nurse}
                      onChange={(e) => {
                        const val = e.target.value;
                        const selNurse = hospitalNurses.find(n => Number(n.id) === Number(val));
                        if (selNurse && !isNurseOnDuty(selNurse)) {
                          alert(`Nurse ${selNurse.name} is currently Off Duty and cannot be assigned.`);
                          return;
                        }
                        setEditFormData({ ...editFormData, nurse: val });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
                      <option value="">-- Auto-assigned from Bed Duty --</option>
                      {hospitalNurses.map(n => {
                        const onDuty = isNurseOnDuty(n);
                        return (
                          <option 
                            key={n.id} 
                            value={n.id}
                            disabled={!onDuty}
                            style={!onDuty ? { color: '#dc2626', fontWeight: 'bold', backgroundColor: '#fff1f2' } : {}}
                            className={!onDuty ? 'text-rose-600 font-bold bg-rose-50' : ''}
                          >
                            {n.name} ({n.ward || 'Ward Staff'}){!onDuty ? ' (Off Duty)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 4: APPOINTMENT STATUS & BILLING */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200 flex items-center gap-1.5">
                  <span>💳</span>
                  <span>Status, Financials & Documents</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Appointment Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
                      <option value="">-- Select Status --</option>
                      {STATUS_CHOICES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
                    <select
                      value={editFormData.payment_status}
                      onChange={(e) => setEditFormData({ ...editFormData, payment_status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
                      <option value="">-- Select Payment Status --</option>
                      {PAYMENT_STATUS_CHOICES.map(ps => (
                        <option key={ps} value={ps}>{ps}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                    <select
                      value={editFormData.payment_method}
                      onChange={(e) => setEditFormData({ ...editFormData, payment_method: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
                      <option value="">-- Select Payment Method --</option>
                      {PAYMENT_METHOD_CHOICES.map(pm => (
                        <option key={pm.value} value={pm.value}>{pm.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital / Bed Charges (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.hospitals_charges}
                      onChange={(e) => setEditFormData({ ...editFormData, hospitals_charges: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.amount_paid}
                      onChange={(e) => setEditFormData({ ...editFormData, amount_paid: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Attached Document File Input */}
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Attached Document</label>
                  <input
                    type="file"
                    onChange={(e) => setEditAttachedFile(e.target.files[0] || null)}
                    className="w-full px-3 py-1.5 text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                  />
                  {editFormData.attached_document && !editAttachedFile && (
                    <div className="mt-1 text-[11px] text-teal-700 font-semibold flex items-center gap-1">
                      <span>📎 Current Document:</span>
                      <a
                        href={String(editFormData.attached_document).startsWith('http') ? editFormData.attached_document : `${API_BASE_URL.replace('/api', '')}${editFormData.attached_document}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-teal-900"
                      >
                        {String(editFormData.attached_document).split('/').pop()}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingAppt(null); setEditAttachedFile(null); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md cursor-pointer transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingEdit ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
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

