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

// Helper: Auto-assign Nurse based on Bed number and hospital
const getAutoNurseForBed = (bedNumber, nursesList = [], hospitalId = null) => {
  if (!bedNumber || !nursesList || !Array.isArray(nursesList) || nursesList.length === 0) {
    return { nurseId: null, nurseName: '', reason: 'No bed specified' };
  }

  const hospNurses = hospitalId
    ? nursesList.filter(n => Number(typeof n.hospital === 'object' ? n.hospital?.id : n.hospital) === Number(hospitalId))
    : nursesList;
  const activeNurses = hospNurses.length > 0 ? hospNurses : nursesList;

  if (activeNurses.length === 0) return { nurseId: null, nurseName: '', reason: 'No nurses registered' };

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

const BLOOD_GROUP_CHOICES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const STATUS_CHOICES = ['Pending', 'Assigned', 'Cancelled'];
const PAYMENT_STATUS_CHOICES = ['Paid', 'Partial', 'Pending', 'Failed'];
const PAYMENT_METHOD_CHOICES = [
  { value: 'UPI', label: 'UPI' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Net Banking', label: 'Net Banking' },
  { value: 'Cash', label: 'Cash' }
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

const ReceptionistAnassine = ({ currentUser, setCurrentPage, setSelectedPatient }) => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs: 'ALL_UNASSIGNED' | 'NO_BED'
  const [activeTab, setActiveTab] = useState('ALL_UNASSIGNED');
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  // Comprehensive Edit Appointment Modal State (Populated with full Appointment model fields)
  const [editModalPatient, setEditModalPatient] = useState(null);
  const [editFormData, setEditFormData] = useState({
    patient_Name: '',
    hospital: '',
    doctor: '',
    visit_date: '',
    visit_time: '10:00 AM',
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
    payment_status: 'Pending',
    payment_method: 'Cash',
    status: 'Pending',
    condition: 'Normal',
    bed_number: '',
    nurse: '',
    attached_document: null
  });
  const [editAttachedFile, setEditAttachedFile] = useState(null);
  const [autoNurseText, setAutoNurseText] = useState('');
  const [updatingEdit, setUpdatingEdit] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [currentUser]);

  // Helper to normalize appointment records from Django backend
  const normalizeAppointment = (item, doctorsList = [], hospitalsList = [], nursesList = []) => {
    if (!item) return null;
    const id = item.id || item.appointment_id;
    const patientName = item.patient_Name || item.patient_name || item.name || `Patient #${id}`;
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
      blood_group: item.blood_group || item.Blood_Group || 'Not Specified',
      contact: item.contact || item.phone || '',
      email: item.email || '',
      address: item.address || '',
      symptoms_diagnosis: item.symptoms_diagnosis || item.reason_for_visit || '-',
      hospitals_charges: item.hospitals_charges || item.Hospitals_Chargies || '0.00',
      Hospitals_Chargies: item.hospitals_charges || item.Hospitals_Chargies || '0.00',
      amount_paid: item.amount_paid || '0.00',
      payment_status: item.payment_status || 'Pending',
      payment_method: item.payment_method || 'Cash',
      checkup_status: item.checkup_status || 'Pending',
      visit_date_time: item.visit_date_time || item.created_at || new Date().toISOString(),
      appointment_date: item.appointment_date || (item.visit_date_time ? item.visit_date_time.split('T')[0] : ''),
      appointment_time: item.appointment_time || '10:00 AM',
      attached_document: item.attached_document || null,
      created_at: item.created_at || item.visit_date_time || new Date().toISOString()
    };
  };

  const updateBackendAppointment = async (apptId, payload, file = null, numericId = null, patientItem = null) => {
    // Collect all candidate APPOINTMENT IDs (Never use non-appointment patient IDs)
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

    // Step 2 Fallback: Query all appointments to find the exact backend Appointment PK (id)
    try {
      const allApptsRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
      if (allApptsRes && allApptsRes.ok) {
        const allAppts = extractArray(await allApptsRes.json().catch(() => []));
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
          if (patName && aName && patName === aName && patName.length > 2) return true;
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

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const email = (currentUser?.email || '').toLowerCase().trim();
      const recId = currentUser?.id;

      // 1. Fetch metadata in parallel
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

      if (docRes.status === 'fulfilled' && docRes.value.ok) {
        docData = extractArray(await docRes.value.json().catch(() => []));
      }
      if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
        hospData = extractArray(await hospRes.value.json().catch(() => []));
      }
      if (nurRes.status === 'fulfilled' && nurRes.value.ok) {
        nurData = extractArray(await nurRes.value.json().catch(() => []));
      }
      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        recData = extractArray(await recRes.value.json().catch(() => []));
      }

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

      let userHospId = matchedRec?.hospital || currentUser?.hospital || (typeof currentUser?.hospital_data === 'object' ? currentUser?.hospital_data?.id : null);
      if (typeof userHospId === 'object' && userHospId !== null) {
        userHospId = userHospId.id || userHospId.hospital_id;
      }

      let matchedHosp = null;
      if (userHospId && Array.isArray(hospData)) {
        matchedHosp = hospData.find(h => Number(h.id) === Number(userHospId));
      }
      if (!matchedHosp && (currentUser?.hospital_name || matchedRec?.hospital_name)) {
        const hName = (currentUser?.hospital_name || matchedRec?.hospital_name).toLowerCase().trim();
        matchedHosp = hospData.find(h => (h.Name || h.name || '').toLowerCase().trim() === hName);
        if (matchedHosp) userHospId = matchedHosp.id;
      }
      if (!matchedHosp && email) {
        const savedHospId = localStorage.getItem(`user_hospital_${email}`);
        if (savedHospId) {
          matchedHosp = hospData.find(h => Number(h.id) === Number(savedHospId));
          if (matchedHosp) userHospId = matchedHosp.id;
        }
      }
      if (!matchedHosp) {
        const checkStr = `${email} ${currentUser?.name || ''} ${matchedRec?.name || ''}`.toLowerCase();
        matchedHosp = hospData.find(h => {
          const hn = (h.Name || h.name || '').toLowerCase().trim();
          return hn && checkStr.includes(hn);
        });
        if (matchedHosp) userHospId = matchedHosp.id;
      }

      setHospitalInfo(matchedHosp);
      const userHospName = matchedHosp?.Name || matchedHosp?.name || currentUser?.hospital_name || matchedRec?.hospital_name || '';

      // STRICT HOSPITAL FILTERING: Only doctors and nurses of her hospital
      const hospDocs = userHospId || userHospName
        ? docData.filter(d => isDoctorInHospital(d, userHospId, userHospName))
        : [];

      const hospNurses = userHospId || userHospName
        ? nurData.filter(n => isNurseInHospital(n, userHospId, userHospName))
        : [];

      setDoctors(hospDocs);
      setNurses(hospNurses);

      // 2. Fetch Appointments ONLY from Backend
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
      const filteredPats = userHospId || userHospName
        ? combinedList.filter(p => isAppointmentInHospital(p, userHospId, userHospName, hospData))
        : [];

      setPatients(filteredPats);
    } catch (err) {
      console.error('Error fetching unassigned appointments data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine if doctor is unassigned
  const isDoctorUnassigned = (p) => {
    if (!p) return true;
    const docId = p.doctor;
    const docName = (p.doctor_name || '').toLowerCase().trim();
    if (!docId || docId === 'null' || docId === 'None' || docId === '') {
      return true;
    }
    if (!docName || docName === '' || docName.includes('awaiting') || docName.includes('unassign') || docName.includes('none') || docName.includes('null')) {
      return true;
    }
    return false;
  };

  // Helper to determine if bed is unassigned
  const isBedUnassigned = (p) => {
    return !p.bed_number || p.bed_number === null || p.bed_number === '';
  };

  const isDischargedOrCancelled = (p) => {
    if (!p) return true;
    const s = (p.status || '').toLowerCase().trim();
    return s.includes('discharg') || s.includes('cancel');
  };

  // Patients who are unassigned: doctor unassigned or explicitly unassigned status
  // Exclude discharged/cancelled records
  const unassignedPatientsList = patients.filter(p => {
    if (isDischargedOrCancelled(p)) return false;
    const s = (p.status || '').toLowerCase().trim();
    if (s.includes('unassign')) return true;
    return isDoctorUnassigned(p);
  });

  // Bed Required Patients (Doctor assigned, but awaiting ward / bed allocation)
  const bedRequiredPatientsList = patients.filter(p => {
    if (isDischargedOrCancelled(p)) return false;
    return !isDoctorUnassigned(p) && isBedUnassigned(p);
  });

  // Filter based on active tab:
  // 1. ALL_UNASSIGNED: All unassigned (awaiting doctor assignment)
  // 2. NO_BED: Bed / Ward Required (Only patients with doctor assigned but needing bed / admit)
  const tabFilteredPatients = activeTab === 'NO_BED'
    ? bedRequiredPatientsList
    : unassignedPatientsList;

  // Apply Search & Severity Filters
  const displayedPatients = tabFilteredPatients.filter(p => {
    const term = searchTerm.toLowerCase();
    const pName = (p.name || '').toLowerCase();
    const pId = (p.patient_id || p.uhid || `pat-${p.id}`).toLowerCase();
    const pContact = (p.contact || p.phone || '').toLowerCase();
    const pEmail = (p.email || '').toLowerCase();
    const pDiag = (p.symptoms_diagnosis || '').toLowerCase();

    const matchesSearch = pName.includes(term) || pId.includes(term) || pContact.includes(term) || pEmail.includes(term) || pDiag.includes(term);
    const pCond = p.Condation || p.condition || p.symptoms_severity || 'Normal';
    const matchesSeverity = severityFilter === 'ALL' || pCond.toLowerCase() === severityFilter.toLowerCase();

    return matchesSearch && matchesSeverity;
  });

  // Stats calculation
  const totalUnassignedCount = unassignedPatientsList.length;
  const bedRequiredCount = unassignedPatientsList.filter(p => !isDoctorUnassigned(p) && isBedUnassigned(p)).length;
  const emergencyUnassignedCount = unassignedPatientsList.filter(p => {
    const c = (p.Condation || p.condition || p.symptoms_severity || '').toLowerCase();
    return c.includes('emergency') || c.includes('critical') || c.includes('urgent');
  }).length;

  // Open Edit Appointment Modal with all model fields prefilled
  const handleOpenEditModal = (patient) => {
    setEditModalPatient(patient);
    setEditAttachedFile(null);

    let vDate = '';
    let vTime = '10:00 AM';
    if (patient.visit_date_time) {
      try {
        const d = new Date(patient.visit_date_time);
        if (!isNaN(d.getTime())) {
          vDate = d.toISOString().split('T')[0];
        }
      } catch (e) { }
    }
    if (!vDate && patient.appointment_date) {
      vDate = patient.appointment_date;
    }
    if (patient.appointment_time) {
      vTime = patient.appointment_time;
    }

    const hospId = typeof patient.hospital === 'object' ? patient.hospital?.id : patient.hospital;
    const docId = typeof patient.doctor === 'object' ? patient.doctor?.id : patient.doctor;
    const nurseId = typeof patient.nurse === 'object' ? patient.nurse?.id : patient.nurse;
    const autoRes = patient.bed_number ? getAutoNurseForBed(patient.bed_number, nurses, hospId) : { nurseId: '', nurseName: '' };

    if (patient.bed_number && autoRes.nurseName) {
      setAutoNurseText(`Auto-Mapped: ${autoRes.nurseName} (Floor ${getFloorNumber(patient.bed_number)})`);
    } else {
      setAutoNurseText('');
    }

    setEditFormData({
      patient_Name: patient.patient_Name || patient.patient_name || patient.name || '',
      hospital: hospId ? String(hospId) : (hospitalInfo?.id ? String(hospitalInfo.id) : (hospitals[0]?.id ? String(hospitals[0].id) : '')),
      doctor: docId ? String(docId) : '',
      visit_date: vDate || new Date().toISOString().split('T')[0],
      visit_time: vTime,
      age: patient.age || patient.Age || '',
      gender: patient.Gender || patient.gender || 'Male',
      Gender: patient.Gender || patient.gender || 'Male',
      symptoms_diagnosis: patient.symptoms_diagnosis || patient.reason_for_visit || '',
      blood_group: patient.blood_group || patient.Blood_Group || 'A+',
      attached_document: patient.attached_document || null,
      contact: patient.contact || patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      hospitals_charges: String(patient.hospitals_charges || patient.Hospitals_Chargies || '0.00'),
      amount_paid: String(patient.amount_paid || '0.00'),
      payment_status: patient.payment_status || 'Pending',
      payment_method: patient.payment_method || 'Cash',
      status: patient.status || (patient.bed_number ? 'Admitted' : (docId ? 'Assigned' : 'Pending')),
      condition: patient.condition || patient.Condation || patient.symptoms_severity || 'Normal',
      bed_number: patient.bed_number ? String(patient.bed_number) : '',
      nurse: nurseId ? String(nurseId) : (autoRes.nurseId ? String(autoRes.nurseId) : '')
    });
  };

  const handleEditBedChange = (bedVal) => {
    const hospId = editFormData.hospital || (hospitalInfo?.id ? String(hospitalInfo.id) : null);
    const autoRes = bedVal ? getAutoNurseForBed(bedVal, nurses, hospId) : { nurseId: '', nurseName: '' };

    setEditFormData(prev => ({
      ...prev,
      bed_number: bedVal,
      nurse: autoRes.nurseId ? String(autoRes.nurseId) : prev.nurse,
      status: bedVal ? (prev.status === 'Pending' ? 'Admitted' : prev.status) : prev.status
    }));

    if (autoRes.nurseName) {
      setAutoNurseText(`Auto-Mapped: ${autoRes.nurseName} (Floor ${getFloorNumber(bedVal)})`);
    } else {
      setAutoNurseText('');
    }
  };

  const handleEditDoctorChange = (docVal) => {
    setEditFormData(prev => ({
      ...prev,
      doctor: docVal,
      status: docVal && prev.status === 'Pending' ? 'Assigned' : prev.status
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editModalPatient) return;

    if (!editFormData.patient_Name.trim()) {
      alert('Please enter patient name.');
      return;
    }

    try {
      setUpdatingEdit(true);
      const apptId = editModalPatient.Appoment_id || editModalPatient.appoment_id || editModalPatient.appointment_id || editModalPatient.id;
      const numericId = editModalPatient.id;
      const chosenDoc = doctors.find(d => Number(d.id) === Number(editFormData.doctor));
      const parsedBed = editFormData.bed_number ? Number(editFormData.bed_number) : null;
      // Strictly preserve patient's chosen hospital - Receptionist cannot alter hospital
      const hospId = Number(typeof editModalPatient.hospital === 'object' ? editModalPatient.hospital?.id : (editModalPatient.hospital || hospitalInfo?.id)) || null;
      const chosenHosp = hospitals.find(h => Number(h.id) === Number(hospId)) || hospitalInfo;

      const autoRes = parsedBed ? getAutoNurseForBed(parsedBed, nurses, hospId) : { nurseId: null, nurseName: '' };
      const chosenNurse = nurses.find(n => Number(n.id) === Number(editFormData.nurse)) || (autoRes.nurseId ? nurses.find(n => Number(n.id) === autoRes.nurseId) : null);

      let visitIso = editModalPatient.visit_date_time || new Date().toISOString();
      if (editFormData.visit_date) {
        visitIso = `${editFormData.visit_date}T10:00:00`;
      }

      const nameVal = (editFormData.patient_Name || editModalPatient.patient_Name || editModalPatient.name || editModalPatient.patient_name || '').trim();
      const phoneVal = (editFormData.contact || editModalPatient.contact || editModalPatient.phone || '').trim();
      const condVal = ['Critical', 'Emergency', 'Urgent', 'Normal'].includes(editFormData.condition) ? editFormData.condition : (editModalPatient.condition || editModalPatient.Condation || 'Normal');
      const chargesVal = Number(editFormData.hospitals_charges || 0);
      const paidVal = Number(editFormData.amount_paid || 0);
      const ageNum = editFormData.age && !isNaN(Number(editFormData.age)) ? Number(editFormData.age) : (editModalPatient.age && !isNaN(Number(editModalPatient.age)) ? Number(editModalPatient.age) : 25);
      const genderVal = editFormData.gender || editFormData.Gender || editModalPatient.Gender || editModalPatient.gender || 'Male';

      const cleanPayload = {
        Appoment_id: apptId,
        appoment_id: apptId,
        appointment_id: apptId,
        name: nameVal,
        patient_Name: nameVal,
        patient_name: nameVal,
        contact: phoneVal,
        phone: phoneVal,
        email: (editFormData.email || editModalPatient.email || '').trim(),
        age: ageNum,
        gender: genderVal,
        Gender: genderVal,
        patient_gender: genderVal,
        blood_group: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(editFormData.blood_group) ? editFormData.blood_group : (editModalPatient.blood_group || 'A+'),
        Blood_Group: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(editFormData.blood_group) ? editFormData.blood_group : (editModalPatient.blood_group || 'A+'),
        address: (editFormData.address || editModalPatient.address || 'Hospital Inpatient').trim(),
        hospitals_charges: Number(chargesVal).toFixed(2),
        Hospitals_Chargies: Number(chargesVal).toFixed(2),
        hospital_charges: Number(chargesVal).toFixed(2),
        amount_paid: Number(paidVal).toFixed(2),
        payment_status: ['Paid', 'Partial', 'Pending', 'Failed'].includes(editFormData.payment_status) ? editFormData.payment_status : 'Pending',
        payment_method: ['UPI', 'Credit Card', 'Net Banking', 'Cash'].includes(editFormData.payment_method) ? editFormData.payment_method : 'Cash',
        status: ['Pending', 'Assigned', 'Admitted', 'Discharged', 'Cancelled'].includes(editFormData.status) ? editFormData.status : (parsedBed ? 'Admitted' : (chosenDoc ? 'Assigned' : 'Pending')),
        checkup_status: editModalPatient.checkup_status || 'Pending',
        condition: condVal,
        Condation: condVal,
        Condition: condVal,
        symptoms_diagnosis: (editFormData.symptoms_diagnosis || editModalPatient.symptoms_diagnosis || editModalPatient.reason_for_visit || 'General Consultation').trim(),
        reason_for_visit: (editFormData.symptoms_diagnosis || editModalPatient.symptoms_diagnosis || editModalPatient.reason_for_visit || 'General Consultation').trim(),
        visit_date_time: visitIso,
        is_active: true
      };

      if (hospId) cleanPayload.hospital = Number(hospId);
      if (chosenDoc) {
        cleanPayload.doctor = Number(chosenDoc.id);
        cleanPayload.doctor_name = chosenDoc.name || '';
      }
      if (parsedBed) {
        cleanPayload.bed_number = Number(parsedBed);
      }
      if (chosenNurse) {
        cleanPayload.nurse = Number(chosenNurse.id);
        cleanPayload.nurse_name = chosenNurse.name || '';
      }

      const result = await updateBackendAppointment(apptId, cleanPayload, editAttachedFile, numericId, editModalPatient);

      if (result && result.ok) {
        alert(`Success! Patient triage & appointment for ${cleanPayload.patient_Name} updated successfully in database.`);
        setEditModalPatient(null);
        setEditAttachedFile(null);
        fetchAllData();
      } else {
        console.error('Update appointment failed:', result?.error);
        alert(`Failed to update appointment.\n${result?.error || 'Please check backend connection.'}`);
      }
    } catch (err) {
      console.error('Error updating appointment:', err);
      alert('Error connecting to backend.');
    } finally {
      setUpdatingEdit(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5">
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Receptionist Triage & Doctor Dispatch Queue
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 text-slate-100">
              Unassigned Patients Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Live queue of self-registered OPD patients awaiting doctor assignment, slot timing, or inpatient bed allocation with auto-nurse mapping.
            </p>
          </div>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('ALL_UNASSIGNED')}
          className={`p-4 rounded-2xl bg-white border shadow-xs cursor-pointer transition ${activeTab === 'ALL_UNASSIGNED' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-amber-300'}`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Unassigned Patients</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">{totalUnassignedCount}</h3>
          <p className="text-[11px] text-amber-600 font-medium mt-0.5">Self-bookings & Admit queue awaiting action</p>
        </div>

        <div
          onClick={() => { setActiveTab('ALL_UNASSIGNED'); setSeverityFilter('Emergency'); }}
          className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs cursor-pointer hover:border-rose-400 transition"
        >
          <p className="text-[11px] font-semibold text-rose-600 uppercase">Emergency / Critical Cases</p>
          <h3 className="text-xl sm:text-2xl font-bold text-rose-700 mt-1">{emergencyUnassignedCount}</h3>
          <p className="text-[11px] text-rose-500 font-semibold mt-0.5">Requires priority triage</p>
        </div>
      </div>

      {/* TABS, SEARCH AND FILTERS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
          {[
            { id: 'ALL_UNASSIGNED', label: 'All Unassigned', count: totalUnassignedCount },
            { id: 'NO_BED', label: 'Bed / Ward Required', count: bedRequiredCount }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap ${activeTab === tab.id
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
              placeholder="Search unassigned queue by UHID, patient name, phone, symptoms..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-600/20 transition"
            />
          </div>

          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-600/20 transition cursor-pointer"
            >
              <option value="ALL">All Clinical Severities</option>
              <option value="Critical">Critical</option>
              <option value="Emergency">Emergency</option>
              <option value="Urgent">Urgent</option>
              <option value="Normal">Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* UNASSIGNED PATIENTS TABLE */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              Unassigned Patients Roster ({displayedPatients.length})
            </h2>
            <p className="text-xs text-slate-500">Live reception triage, doctor & timing dispatch, and bed/nurse allocation</p>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[880px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Appointment ID & Patient</th>
                <th className="py-3 px-3">Contact Details</th>
                <th className="py-3 px-3">Age / Gender</th>
                <th className="py-3 px-3">Condition</th>
                <th className="py-3 px-3">Doctor</th>
                <th className="py-3 px-3">Bed & Nurse</th>
                <th className="py-3 px-3">Symptoms</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">Loading unassigned patients queue...</td>
                </tr>
              ) : displayedPatients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Queue is Clear!</h4>
                      <p className="text-xs text-slate-500">All registered patients have been assigned to doctors and beds.</p>
                      <button
                        type="button"
                        onClick={() => { setActiveTab('ALL_UNASSIGNED'); setSeverityFilter('ALL'); setSearchTerm(''); }}
                        className="mt-2 px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedPatients.slice(0, visibleCount).map((p, idx) => {
                  const cond = p.Condation || p.condition || p.symptoms_severity || 'Normal';
                  const condColor = cond === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-200 font-bold' :
                    cond === 'Emergency' ? 'bg-red-100 text-red-800 border-red-200 font-bold' :
                      cond === 'Urgent' || cond === 'Serious' ? 'bg-amber-100 text-amber-800 border-amber-200 font-semibold' :
                        'bg-emerald-100 text-emerald-800 border-emerald-200';

                  const noDoc = isDoctorUnassigned(p);
                  const noBed = isBedUnassigned(p);

                  return (
                    <tr key={p.id || idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        <div className="text-sm font-bold text-slate-900">{p.name}</div>
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
                        {p.age ? `${p.age} Yrs` : '-'} • {p.Gender || p.gender || 'Not Specified'}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border ${condColor}`}>
                          {cond}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {noDoc ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Unassigned
                          </span>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-800">{p.doctor_name || `Dr. #${p.doctor}`}</div>
                            {p.doctor_specialization && <span className="text-[10px] text-teal-600 block">{p.doctor_specialization}</span>}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {noBed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Unassigned
                          </span>
                        ) : (
                          <div>
                            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                              Bed #{p.bed_number} (Fl {getFloorNumber(p.bed_number)})
                            </span>
                            {p.nurse_name && (
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                👩‍⚕️ Nurse: {p.nurse_name}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <p className="text-slate-700 max-w-[160px] truncate" title={p.symptoms_diagnosis || 'General'}>
                          {p.symptoms_diagnosis || 'General Consultation'}
                        </p>
                        {p.attached_document && (
                          <span className="text-[10px] font-bold text-teal-700 block">📎 Document Attached</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${(p.status || '').toLowerCase().includes('admit') ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            (p.status || '').toLowerCase().includes('assign') ? 'bg-teal-50 text-teal-700 border-teal-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                            {p.status || 'Unassigned'}
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
                          onClick={() => handleOpenEditModal(p)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                          title="Edit Appointment Details"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {visibleCount < displayedPatients.length && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-4">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More ({displayedPatients.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* COMPREHENSIVE EDIT APPOINTMENT MODAL (All Appointment Model Fields) */}
      {editModalPatient && (
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
                  {editModalPatient.name} • Appointment ID: APT-{editModalPatient.Appoment_id || editModalPatient.appoment_id || editModalPatient.appointment_id || editModalPatient.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setEditModalPatient(null); setEditAttachedFile(null); }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-5 overflow-y-auto">
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
                      placeholder="Full Name"
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
                      placeholder="e.g. 28"
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
                      type="text"
                      maxLength={14}
                      value={editFormData.contact}
                      onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })}
                      placeholder="Phone number"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email ID</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      placeholder="patient@example.com"
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
                        🔒 Patient Selected (Locked)
                      </span>
                    </label>
                    <div 
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs sm:text-sm text-slate-700 font-bold flex items-center justify-between cursor-not-allowed shadow-2xs"
                      title="Only the patient has the authority to choose their hospital. Receptionists only manage appointments within their hospital."
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>🏥</span>
                        <span className="truncate">
                          {hospitals.find(h => Number(h.id) === Number(editFormData.hospital))?.Name ||
                           hospitals.find(h => Number(h.id) === Number(editFormData.hospital))?.name ||
                           editModalPatient?.hospital_name ||
                           hospitalInfo?.Name || hospitalInfo?.name || 'Patient Selected Hospital'}
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
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.specialization || d.specialty || 'General'}) {d.consultation_fee ? `- ₹${d.consultation_fee}` : ''}
                        </option>
                      ))}
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                    <select
                      value={editFormData.visit_time}
                      onChange={(e) => setEditFormData({ ...editFormData, visit_time: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
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
                      placeholder="e.g. 102 (Floor 1), 205 (Floor 2)"
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
                      onChange={(e) => setEditFormData({ ...editFormData, nurse: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
                      <option value="">-- Auto-assigned from Bed Duty --</option>
                      {nurses.map(n => (
                        <option key={n.id} value={n.id}>{n.name} ({n.ward || 'Ward Staff'})</option>
                      ))}
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
                      {STATUS_CHOICES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                      {(editFormData.status === 'Admitted' || editFormData.status === 'Discharged') && (
                        <option value={editFormData.status}>{editFormData.status} (Doctor Assigned)</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
                    <select
                      value={editFormData.payment_status}
                      onChange={(e) => setEditFormData({ ...editFormData, payment_status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
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
                  onClick={() => { setEditModalPatient(null); setEditAttachedFile(null); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingEdit}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md cursor-pointer transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updatingEdit ? (
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

export default ReceptionistAnassine;
