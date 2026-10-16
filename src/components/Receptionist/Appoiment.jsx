import { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../Api/Api';

// Helper: Safe array extractor
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

// Helper: Check if Doctor belongs to target hospital
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

// Helper: Check if Nurse belongs to target hospital
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

// Helper: Strict hospital isolation for appointment
const isAppointmentInHospital = (item, targetHospId, targetHospName = '', hospList = []) => {
  if (!item) return false;

  let targetId = targetHospId && !isNaN(Number(targetHospId)) ? Number(targetHospId) : null;
  let targetName = (targetHospName || '').toString().toLowerCase().trim();

  if (targetId && !targetName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => Number(h.id) === targetId);
    if (matched) targetName = (matched.Name || matched.name || '').toLowerCase().trim();
  } else if (!targetId && targetName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === targetName);
    if (matched) targetId = Number(matched.id);
  }

  if (!targetId && !targetName) return false;

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

  if (!itemHospId && !itemHospName) return false;

  if (targetId && itemHospId) return itemHospId === targetId;

  if (targetId && itemHospName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === itemHospName);
    if (matched) return Number(matched.id) === targetId;
  }

  if (targetName && itemHospId && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => Number(h.id) === itemHospId);
    if (matched) return (matched.Name || matched.name || '').toLowerCase().trim() === targetName;
  }

  if (targetName && itemHospName) return targetName === itemHospName;

  return false;
};

// Date Format Helpers (Local Time Based)
const formatDateToYMD = (dateObj) => {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getTodayYMD = () => formatDateToYMD(new Date());

const getYesterdayYMD = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateToYMD(d);
};

// Parse an appointment's date string into clean YYYY-MM-DD
const extractApptDateString = (appt) => {
  if (!appt) return '';
  const raw = appt.appointment_date || appt.visit_date || appt.date || appt.visit_date_time || appt.created_at;
  if (!raw) return '';

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const datePart = trimmed.split('T')[0].split(' ')[0];

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }

    // DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(datePart)) {
      const parts = datePart.split(/[\/\-]/);
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    // Try Date parsing
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return formatDateToYMD(parsed);
    }
  }

  return '';
};

// Categorize appointment into: 'today' | 'yesterday' | 'history'
const categorizeAppointmentDate = (appt) => {
  const apptDateStr = extractApptDateString(appt);
  if (!apptDateStr) return 'history';

  const todayStr = getTodayYMD();
  const yesterdayStr = getYesterdayYMD();

  if (apptDateStr === todayStr) return 'today';
  if (apptDateStr === yesterdayStr) return 'yesterday';
  if (apptDateStr < yesterdayStr) return 'history';

  // Future / upcoming dates are grouped with today or current roster
  return 'today';
};

// Helper: Check if Doctor is assigned
const isDoctorAssigned = (appt) => {
  if (!appt) return false;
  const docId = appt.doctor;
  const docName = (appt.doctor_name || '').toLowerCase().trim();
  if (!docId || docId === 'null' || docId === 'None' || docId === '' || docId === 0) {
    return false;
  }
  if (!docName || docName === '' || docName.includes('awaiting') || docName.includes('unassign') || docName.includes('none') || docName.includes('null')) {
    return false;
  }
  return true;
};

const isDoctorOnDuty = (doc) => {
  if (!doc) return false;
  if (doc.is_active === false || doc.is_active === 'false') return false;
  const statusStr = String(doc.status || doc.duty_status || doc.availability || '').toLowerCase().trim();
  if (statusStr.includes('off') || statusStr.includes('leave') || statusStr === 'inactive' || statusStr === 'false') return false;
  return true;
};

const isNurseOnDuty = (nurse) => {
  if (!nurse) return false;
  if (nurse.is_active === false || nurse.is_active === 'false') return false;
  const st = (nurse.status || '').toString().toLowerCase().trim();
  if (st.includes('off') || st.includes('leave') || st === 'inactive' || st === 'false') return false;
  return true;
};

// Helper: Display names
const getPatientDisplayName = (appt) => {
  if (!appt) return 'Patient';
  return appt.patient_name || appt.patient_Name || appt.name || (typeof appt.patient === 'object' ? appt.patient?.name : '') || 'Patient';
};

const getAppointmentDisplayId = (appt) => {
  if (!appt) return 'APT-0';
  const rawId = appt.Appoment_id || appt.appoment_id || appt.appointment_id || appt.id;
  if (!rawId) return 'APT-0';
  const strId = String(rawId).trim();
  if (strId.toUpperCase().startsWith('APT-')) return strId.toUpperCase();
  return `APT-${strId}`;
};

const getPatientUhidDisplay = (appt) => {
  if (!appt) return '';
  return appt.patient_id || appt.uhid || appt.patient_uhid || (typeof appt.patient === 'object' ? (appt.patient?.patient_id || appt.patient?.uhid) : '') || '';
};

const ReceptionistAppoiment = ({
  currentUser,
  setCurrentPage,
  setSelectedPatient,
  setSelectedDoctorForPatient,
  setSelectedAppointment
}) => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [receptionistInfo, setReceptionistInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);

  // Filters
  const [dateTab, setDateTab] = useState('TODAY'); // 'TODAY' | 'YESTERDAY' | 'HISTORY'
  const [assignFilter, setAssignFilter] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'UNASSIGNED'
  const [selectedKpi, setSelectedKpi] = useState('TODAY'); // 'TODAY' | 'YESTERDAY' | 'ASSIGNED' | 'UNASSIGNED' | null
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [editFormData, setEditFormData] = useState({
    patient_name: '',
    contact: '',
    email: '',
    age: '',
    gender: 'Male',
    doctor: '',
    nurse: '',
    bed_number: '',
    status: 'Pending',
    visit_date: '',
    visit_time: '',
    symptoms_diagnosis: '',
    hospitals_charges: '',
    payment_status: 'Pending'
  });

  // Load All Hospital Appointments, Doctors, Nurses, and Receptionist Info
  useEffect(() => {
    let isMounted = true;

    const loadData = async (silent = false) => {
      try {
        if (!silent && isMounted) setLoading(true);
        const email = (currentUser?.email || '').toLowerCase().trim();
        const recId = currentUser?.id;

        // 1. Fetch Hospital Directory
        let hospList = [];
        try {
          const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
          if (hospRes && hospRes.ok) {
            hospList = extractArray(await hospRes.json().catch(() => []));
            if (isMounted) setHospitalsList(hospList);
          }
        } catch (e) {}

        // 2. Fetch Receptionist Profile
        let currentRec = null;
        try {
          const rRes = await fetch(`${API_BASE_URL}/super-admin/Receptionists/`).catch(() => null);
          if (rRes && rRes.ok) {
            const allRecs = extractArray(await rRes.json().catch(() => []));
            currentRec = allRecs.find(r =>
              (r.email && r.email.toLowerCase().trim() === email) ||
              (recId && Number(r.id) === Number(recId)) ||
              (r.name && r.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        } catch (e) {}

        const activeRec = currentRec || currentUser;
        if (isMounted) setReceptionistInfo(activeRec);

        let targetHospId = typeof activeRec?.hospital === 'object' ? activeRec?.hospital?.id : (activeRec?.hospital || currentUser?.hospital);
        let hospName = activeRec?.hospital_name || currentUser?.hospital_name || '';

        // Match hospital details
        let matchedHospital = null;
        if (targetHospId && Array.isArray(hospList)) {
          matchedHospital = hospList.find(h => Number(h.id) === Number(targetHospId));
        }
        if (!matchedHospital && hospName && Array.isArray(hospList)) {
          matchedHospital = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === hospName.toLowerCase().trim());
        }
        if (matchedHospital) {
          targetHospId = matchedHospital.id;
          hospName = matchedHospital.Name || matchedHospital.name || hospName;
          if (isMounted) setHospitalInfo(matchedHospital);
        }

        // 3. Fetch Doctors for this Hospital
        let docList = [];
        try {
          const docRes = await fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null);
          if (docRes && docRes.ok) {
            docList = extractArray(await docRes.json().catch(() => []));
            const hospDocs = targetHospId || hospName
              ? docList.filter(d => isDoctorInHospital(d, targetHospId, hospName))
              : docList;
            if (isMounted) setDoctorsList(hospDocs);
          }
        } catch (e) {}

        // 4. Fetch Nurses for this Hospital
        let nurseList = [];
        try {
          const nurseRes = await fetch(`${API_BASE_URL}/super-admin/Nurses/`).catch(() => null);
          if (nurseRes && nurseRes.ok) {
            nurseList = extractArray(await nurseRes.json().catch(() => []));
            const hospNurses = targetHospId || hospName
              ? nurseList.filter(n => isNurseInHospital(n, targetHospId, hospName))
              : nurseList;
            if (isMounted) setNursesList(hospNurses);
          }
        } catch (e) {}

        // 5. Fetch ALL Appointments
        let rawAppointments = [];
        try {
          const aRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
          if (aRes && aRes.ok) {
            rawAppointments = extractArray(await aRes.json().catch(() => []));
          }
        } catch (e) {}

        // Normalize appointment items
        const normalizeItem = (item) => {
          if (!item) return null;
          const id = item.id || item.appointment_id;
          const name = item.patient_name || item.patient_Name || item.name || `Patient #${id}`;
          const hosp = typeof item.hospital === 'object' && item.hospital !== null ? item.hospital.id : item.hospital;
          const hospObj = hosp && Array.isArray(hospList) ? hospList.find(h => Number(h.id) === Number(hosp)) : null;
          const itemHospName = item.hospital_name || hospObj?.Name || hospObj?.name || (typeof item.hospital === 'string' && isNaN(Number(item.hospital)) ? item.hospital : '');

          const docId = typeof item.doctor === 'object' && item.doctor !== null ? item.doctor.id : item.doctor;
          const docObj = docId ? docList.find(d => Number(d.id) === Number(docId)) : null;
          const docName = item.doctor_name || (docObj ? (docObj.name?.startsWith('Dr.') ? docObj.name : `Dr. ${docObj.name}`) : (docId ? `Dr. ID ${docId}` : 'Awaiting Doctor Assignment'));

          const nurseId = typeof item.nurse === 'object' && item.nurse !== null ? item.nurse.id : item.nurse;
          const nurseObj = nurseId ? nurseList.find(n => Number(n.id) === Number(nurseId)) : null;
          const nurseName = item.nurse_name || (nurseObj ? nurseObj.name : '');

          const condition = item.condition || item.Condation || item.Condition || 'Normal';
          const status = item.status || (docId ? 'Assigned' : 'Pending');

          const rawApptId = item.Appoment_id || item.appoment_id || item.appointment_id || id;
          const resolvedPatUhid = item.patient_uhid || (typeof item.patient_id === 'string' && !item.patient_id.startsWith('APT-') ? item.patient_id : null) || item.uhid || (typeof item.patient === 'object' ? (item.patient?.patient_id || item.patient?.uhid || (item.patient?.id ? `PAT-${item.patient.id}` : '')) : (item.patient ? `PAT-${item.patient}` : '')) || (id ? `PAT-${id}` : '-');

          const dateStr = item.appointment_date || item.visit_date || (item.visit_date_time ? item.visit_date_time.split('T')[0] : '') || (item.created_at ? item.created_at.split('T')[0] : getTodayYMD());
          const timeStr = item.appointment_time || item.visit_time || '10:00 AM';

          return {
            ...item,
            id,
            Appoment_id: rawApptId,
            appoment_id: rawApptId,
            appointment_id: rawApptId,
            tracking_id: `APT-${rawApptId}`,
            patient_id: resolvedPatUhid,
            uhid: resolvedPatUhid,
            name,
            patient_name: name,
            hospital: hosp,
            hospital_name: itemHospName,
            doctor: docId ? Number(docId) : null,
            doctor_name: docName,
            nurse: nurseId ? Number(nurseId) : null,
            nurse_name: nurseName,
            bed_number: item.bed_number || null,
            condition,
            status,
            age: item.age || item.Age || '',
            gender: item.gender || item.Gender || 'Not Specified',
            contact: item.contact || item.phone || '',
            email: item.email || '',
            address: item.address || '',
            appointment_date: dateStr,
            visit_date: dateStr,
            appointment_time: timeStr,
            visit_time: timeStr,
            symptoms_diagnosis: item.symptoms_diagnosis || item.reason_for_visit || 'General Consultation',
            hospitals_charges: item.hospitals_charges || item.Hospitals_Chargies || '0.00',
            payment_status: item.payment_status || 'Pending',
            checkup_status: item.checkup_status || 'Pending'
          };
        };

        const appointmentsList = [];
        const seenIds = new Set();
        for (const item of rawAppointments) {
          const norm = normalizeItem(item);
          if (norm && !seenIds.has(String(norm.id))) {
            seenIds.add(String(norm.id));
            appointmentsList.push(norm);
          }
        }

        // STRICT ISOLATION: Only include appointments belonging to this receptionist's hospital
        const hospitalAppts = (targetHospId || hospName)
          ? appointmentsList.filter(p => isAppointmentInHospital(p, targetHospId, hospName, hospList))
          : appointmentsList;

        // Sort descending by ID or date so latest appointments appear first
        hospitalAppts.sort((a, b) => {
          const dateA = a.appointment_date || '';
          const dateB = b.appointment_date || '';
          if (dateA !== dateB) return dateB.localeCompare(dateA);
          return Number(b.id || 0) - Number(a.id || 0);
        });

        if (isMounted) {
          setAppointments(hospitalAppts);
        }
      } catch (err) {
        console.error('Error loading appointments:', err);
      } finally {
        if (!silent && isMounted) setLoading(false);
      }
    };

    loadData(false);

    // Auto-polling every 3.5s for real-time synchronization
    const pollInterval = setInterval(() => {
      if (isMounted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData(true);
      }
    }, 3500);

    const handleFocus = () => { if (isMounted) loadData(true); };
    const handleVisibility = () => { if (isMounted && document.visibilityState === 'visible') loadData(true); };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser]);

  const hospitalName = hospitalInfo?.Name || hospitalInfo?.name || receptionistInfo?.hospital_name || currentUser?.hospital_name || 'Hospital Branch';
  const recName = receptionistInfo?.name || currentUser?.name || 'Reception Desk';

  // Categorize Appointments Counts
  const { todayCount, yesterdayCount, historyCount, assignedCount, unassignedCount } = useMemo(() => {
    let tCount = 0;
    let yCount = 0;
    let hCount = 0;
    let aCount = 0;
    let uCount = 0;

    appointments.forEach(a => {
      const cat = categorizeAppointmentDate(a);
      if (cat === 'today') tCount++;
      else if (cat === 'yesterday') yCount++;
      else hCount++;

      if (isDoctorAssigned(a)) aCount++;
      else uCount++;
    });

    return {
      todayCount: tCount,
      yesterdayCount: yCount,
      historyCount: hCount,
      assignedCount: aCount,
      unassignedCount: uCount
    };
  }, [appointments]);

  // Filtered Appointments based on: Date Tab, Assignment Filter, Status Filter, Search Term
  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      // 1. Date Tab Filter
      if (dateTab !== 'ALL') {
        const cat = categorizeAppointmentDate(a);
        if (dateTab === 'TODAY' && cat !== 'today') return false;
        if (dateTab === 'YESTERDAY' && cat !== 'yesterday') return false;
        if (dateTab === 'HISTORY' && cat !== 'history') return false;
      }

      // 2. Assignment Filter
      if (assignFilter === 'ASSIGNED' && !isDoctorAssigned(a)) return false;
      if (assignFilter === 'UNASSIGNED' && isDoctorAssigned(a)) return false;

      // 3. Search Filter
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase().trim();
        const patName = getPatientDisplayName(a).toLowerCase();
        const apptId = getAppointmentDisplayId(a).toLowerCase();
        const uhid = getPatientUhidDisplay(a).toLowerCase();
        const contact = (a.contact || a.phone || '').toLowerCase();
        const email = (a.email || '').toLowerCase();
        const doc = (a.doctor_name || '').toLowerCase();
        const disease = (a.symptoms_diagnosis || '').toLowerCase();
        const dateStr = (a.appointment_date || '').toLowerCase();

        const match = patName.includes(term) ||
          apptId.includes(term) ||
          uhid.includes(term) ||
          contact.includes(term) ||
          email.includes(term) ||
          doc.includes(term) ||
          disease.includes(term) ||
          dateStr.includes(term);

        if (!match) return false;
      }

      return true;
    });
  }, [appointments, dateTab, assignFilter, searchTerm]);

  // Open Edit Modal
  const handleOpenEditModal = (appt) => {
    const currentDoc = appt.doctor ? doctorsList.find(d => Number(d.id) === Number(appt.doctor)) : null;
    const isDocActive = currentDoc && isDoctorOnDuty(currentDoc);

    const currentNurse = appt.nurse ? nursesList.find(n => Number(n.id) === Number(appt.nurse)) : null;
    const isNurseActive = currentNurse && isNurseOnDuty(currentNurse);

    setEditingAppt(appt);
    setEditFormData({
      patient_name: appt.patient_name || appt.name || '',
      contact: appt.contact || appt.phone || '',
      email: appt.email || '',
      age: appt.age || '',
      gender: appt.gender || 'Male',
      doctor: isDocActive ? String(appt.doctor) : '',
      nurse: isNurseActive ? String(appt.nurse) : '',
      bed_number: appt.bed_number ? String(appt.bed_number) : '',
      status: appt.status || 'Pending',
      visit_date: appt.appointment_date || appt.visit_date || getTodayYMD(),
      visit_time: appt.appointment_time || appt.visit_time || '10:00 AM',
      symptoms_diagnosis: appt.symptoms_diagnosis || '',
      hospitals_charges: appt.hospitals_charges || '0.00',
      payment_status: appt.payment_status || 'Pending'
    });
    setIsEditModalOpen(true);
  };

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    let finalVal = value;
    if (name === 'contact' || name === 'phone') {
      finalVal = String(value).replace(/\D/g, '').slice(0, 10);
    }
    if (name === 'doctor' && value) {
      const selectedDoc = doctorsList.find(d => Number(d.id) === Number(value));
      if (selectedDoc && !isDoctorOnDuty(selectedDoc)) {
        alert(`Doctor ${selectedDoc.name || ''} is currently Off Duty / On Leave and cannot be assigned.`);
        return;
      }
    }
    if (name === 'nurse' && value) {
      const selectedNurse = nursesList.find(n => Number(n.id) === Number(value));
      if (selectedNurse && !isNurseOnDuty(selectedNurse)) {
        alert(`Nurse ${selectedNurse.name || ''} is currently Off Duty and cannot be assigned.`);
        return;
      }
    }
    setEditFormData(prev => {
      const updated = { ...prev, [name]: finalVal };
      // If doctor is selected, auto-suggest 'Assigned' status if it was Pending
      if (name === 'doctor' && value && (!prev.status || prev.status === 'Pending')) {
        updated.status = 'Assigned';
      }
      return updated;
    });
  };

  // Save Edit to Backend
  const handleSaveEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAppt) return;

    const cleanPhone = (editFormData.contact || '').replace(/\D/g, '').slice(0, 10);
    if (editFormData.contact && cleanPhone.length !== 10) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }
    if (editFormData.email && !editFormData.email.trim().toLowerCase().endsWith('@gmail.com')) {
      alert("Email must be a valid @gmail.com address.");
      return;
    }

    try {
      setSavingEdit(true);

      const chosenDoc = editFormData.doctor
        ? doctorsList.find(d => Number(d.id) === Number(editFormData.doctor))
        : null;

      if (chosenDoc && !isDoctorOnDuty(chosenDoc)) {
        alert(`Doctor ${chosenDoc.name || ''} is currently Off Duty / On Leave and cannot be assigned to this appointment.`);
        setSavingEdit(false);
        return;
      }

      const chosenNurse = editFormData.nurse
        ? nursesList.find(n => Number(n.id) === Number(editFormData.nurse))
        : null;

      if (chosenNurse && !isNurseOnDuty(chosenNurse)) {
        alert(`Nurse ${chosenNurse.name || ''} is currently Off Duty and cannot be assigned to this appointment.`);
        setSavingEdit(false);
        return;
      }

      const parsedBed = editFormData.bed_number ? Number(editFormData.bed_number) : null;

      const payload = {
        name: editFormData.patient_name.trim(),
        patient_name: editFormData.patient_name.trim(),
        patient_Name: editFormData.patient_name.trim(),
        contact: editFormData.contact.trim(),
        phone: editFormData.contact.trim(),
        email: editFormData.email.trim(),
        age: editFormData.age ? Number(editFormData.age) : editingAppt.age,
        gender: editFormData.gender,
        doctor: chosenDoc ? Number(chosenDoc.id) : (editFormData.doctor ? Number(editFormData.doctor) : null),
        doctor_name: chosenDoc ? (chosenDoc.name?.startsWith('Dr.') ? chosenDoc.name : `Dr. ${chosenDoc.name}`) : (editFormData.doctor ? `Dr. ID ${editFormData.doctor}` : 'Awaiting Doctor Assignment'),
        nurse: chosenNurse ? Number(chosenNurse.id) : null,
        nurse_name: chosenNurse ? chosenNurse.name : '',
        bed_number: parsedBed,
        status: editFormData.status,
        appointment_date: editFormData.visit_date,
        visit_date: editFormData.visit_date,
        appointment_time: editFormData.visit_time,
        visit_time: editFormData.visit_time,
        symptoms_diagnosis: editFormData.symptoms_diagnosis.trim(),
        reason_for_visit: editFormData.symptoms_diagnosis.trim(),
        hospitals_charges: editFormData.hospitals_charges,
        payment_status: editFormData.payment_status
      };

      const candidateIds = [
        editingAppt.appointment_pk,
        editingAppt.appointment_id,
        editingAppt.Appoment_id,
        editingAppt.appoment_id,
        editingAppt.id,
        typeof editingAppt.id === 'string' && editingAppt.id.startsWith('APT-') ? editingAppt.id.replace('APT-', '') : null,
        typeof editingAppt.id === 'string' ? editingAppt.id.replace(/\D/g, '') : null
      ].filter(Boolean);

      let isSuccess = false;
      let backendUpdated = null;

      for (const targetId of Array.from(new Set(candidateIds))) {
        try {
          const res = await fetch(`${API_BASE_URL}/super-admin/appointments/${targetId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res && res.ok) {
            isSuccess = true;
            backendUpdated = await res.json().catch(() => null);
            break;
          }
        } catch (err) {}
      }

      if (!isSuccess) {
        // Fallback PUT
        for (const targetId of Array.from(new Set(candidateIds))) {
          try {
            const res = await fetch(`${API_BASE_URL}/super-admin/appointments/${targetId}/`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...editingAppt,
                ...payload
              })
            });
            if (res && res.ok) {
              isSuccess = true;
              backendUpdated = await res.json().catch(() => null);
              break;
            }
          } catch (err) {}
        }
      }

      if (!isSuccess) {
        // Step 2 Fallback: Search all appointments from backend by ID or patient details
        try {
          const allRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
          if (allRes && allRes.ok) {
            const allAppts = extractArray(await allRes.json().catch(() => []));
            const patName = (payload.patient_name || payload.name || '').toLowerCase().trim();
            const patPhone = String(payload.contact || payload.phone || '').replace(/\D/g, '');
            const rawIdSet = new Set(candidateIds.map(String));

            const matched = allAppts.find(a => {
              if (rawIdSet.has(String(a.id)) || rawIdSet.has(String(a.Appoment_id)) || rawIdSet.has(String(a.appointment_id))) return true;
              const aName = (a.patient_name || a.patient_Name || a.name || '').toLowerCase().trim();
              const aPhone = String(a.contact || a.phone || '').replace(/\D/g, '');
              if (patName && aName && patName === aName && patPhone && aPhone && patPhone === aPhone) return true;
              return false;
            });

            if (matched && matched.id) {
              const res = await fetch(`${API_BASE_URL}/super-admin/appointments/${matched.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              if (res && res.ok) {
                isSuccess = true;
                backendUpdated = await res.json().catch(() => null);
              } else {
                const putRes = await fetch(`${API_BASE_URL}/super-admin/appointments/${matched.id}/`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...matched, ...payload })
                });
                if (putRes && putRes.ok) {
                  isSuccess = true;
                  backendUpdated = await putRes.json().catch(() => null);
                }
              }
            }
          }
        } catch (e) {}
      }

      // Update local state immediately
      const updatedItem = {
        ...editingAppt,
        ...payload,
        ...(backendUpdated || {})
      };

      setAppointments(prev => prev.map(a =>
        (a.id === editingAppt.id || a.Appoment_id === editingAppt.Appoment_id) ? updatedItem : a
      ));

      setActionSuccessMsg(`✓ Appointment ${getAppointmentDisplayId(editingAppt)} for ${getPatientDisplayName(editingAppt)} updated successfully!`);
      setTimeout(() => setActionSuccessMsg(''), 4500);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error saving appointment changes:', err);
      alert('Failed to update appointment. Please check connection and try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  // View Patient Details action
  const handleViewPatientDetails = (appt) => {
    if (setSelectedPatient) {
      setSelectedPatient(appt);
      localStorage.setItem('selectedPatient', JSON.stringify(appt));
    }
    if (setSelectedAppointment) {
      setSelectedAppointment(appt);
      localStorage.setItem('selectedAppointment', JSON.stringify(appt));
    }
    if (setCurrentPage) {
      setCurrentPage('receptionist_patient_details');
    }
  };

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-8 space-y-5 sm:space-y-6 overflow-x-hidden min-h-screen bg-slate-50/50">
      {/* 1. TOP WELCOME & DIRECTORY HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold border border-amber-400/30">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                Hospital Appointments Central Roster
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700">
                {hospitalName}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-bold border border-emerald-400/30">
                Live Reception Desk • {recName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2.5 tracking-tight text-slate-100">
              All Hospital Appointments
            </h1>
          </div>
        </div>
      </div>

      {/* ACTION SUCCESS BANNER */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-base cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. STATS KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* TODAY APPOINTMENTS */}
        <div
          onClick={() => {
            setSelectedKpi('TODAY');
            setDateTab('TODAY');
            setAssignFilter('ALL');
          }}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition duration-150 cursor-pointer shadow-xs ${
            selectedKpi === 'TODAY'
              ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/30'
              : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Today's Schedule
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mt-3">Today Appointments</p>
          <h3 className="text-2xl font-black text-emerald-700 mt-0.5">{todayCount}</h3>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Scheduled for today</p>
        </div>

        {/* YESTERDAY APPOINTMENTS */}
        <div
          onClick={() => {
            setSelectedKpi('YESTERDAY');
            setDateTab('YESTERDAY');
            setAssignFilter('ALL');
          }}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition duration-150 cursor-pointer shadow-xs ${
            selectedKpi === 'YESTERDAY'
              ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/30'
              : 'border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
              Yesterday
            </span>
            <span className="text-blue-500 text-xs font-bold">Prior Day</span>
          </div>
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mt-3">Yesterday Appointments</p>
          <h3 className="text-2xl font-black text-blue-700 mt-0.5">{yesterdayCount}</h3>
          <p className="text-[11px] text-blue-600 font-medium mt-1">Completed / prior day</p>
        </div>

        {/* ASSIGNED APPOINTMENTS */}
        <div
          onClick={() => {
            setSelectedKpi('ASSIGNED');
            setAssignFilter('ASSIGNED');
          }}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition duration-150 cursor-pointer shadow-xs ${
            selectedKpi === 'ASSIGNED'
              ? 'ring-2 ring-teal-500 border-teal-400 bg-teal-50/30'
              : 'border-slate-200 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
              Doctor Assigned
            </span>
            <span className="text-teal-600 text-xs font-bold">✓ Active</span>
          </div>
          <p className="text-xs font-bold text-teal-800 uppercase tracking-wider mt-3">Assigned Patients</p>
          <h3 className="text-2xl font-black text-teal-700 mt-0.5">{assignedCount}</h3>
          <p className="text-[11px] text-teal-600 font-medium mt-1">Under physician care</p>
        </div>

        {/* UNASSIGNED QUEUE */}
        <div
          onClick={() => {
            setSelectedKpi('UNASSIGNED');
            setAssignFilter('UNASSIGNED');
          }}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition duration-150 cursor-pointer shadow-xs ${
            selectedKpi === 'UNASSIGNED'
              ? 'ring-2 ring-rose-500 border-rose-400 bg-rose-50/40'
              : 'border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
              Needs Doctor
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
          <p className="text-xs font-bold text-rose-800 uppercase tracking-wider mt-3">Unassigned Queue</p>
          <h3 className="text-2xl font-black text-rose-700 mt-0.5">{unassignedCount}</h3>
          <p className="text-[11px] text-rose-600 font-medium mt-1">Awaiting assignment</p>
        </div>
      </div>

      {/* 3. MAIN TABLE CONTAINER WITH TABS & FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4">
        {/* TABS HEADER: TODAY, YESTERDAY, HISTORY, ALL */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* PRIMARY DATE TABS */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setDateTab('TODAY');
                setSelectedKpi('TODAY');
                setAssignFilter('ALL');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition duration-150 cursor-pointer flex items-center gap-1.5 ${
                dateTab === 'TODAY'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dateTab === 'TODAY' ? 'bg-white' : 'bg-emerald-500'} animate-pulse`}></span>
              <span>Today's Appointments</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${dateTab === 'TODAY' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                {todayCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDateTab('YESTERDAY');
                setSelectedKpi('YESTERDAY');
                setAssignFilter('ALL');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition duration-150 cursor-pointer flex items-center gap-1.5 ${
                dateTab === 'YESTERDAY'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <span>Yesterday's Appointments</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${dateTab === 'YESTERDAY' ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-900'}`}>
                {yesterdayCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDateTab('HISTORY');
                setSelectedKpi(null);
                setAssignFilter('ALL');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition duration-150 cursor-pointer flex items-center gap-1.5 ${
                dateTab === 'HISTORY'
                  ? 'bg-purple-700 text-white shadow-sm ring-1 ring-purple-600'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <span>Appointments History</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${dateTab === 'HISTORY' ? 'bg-purple-900 text-white' : 'bg-purple-200 text-purple-900'}`}>
                {historyCount}
              </span>
            </button>
          </div>

          {/* SECONDARY FILTER CONTROLS (SEARCH & ASSIGNMENT) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* SEARCH INPUT */}
            <div className="relative min-w-[220px]">
              <input
                type="text"
                placeholder="Search name, APT ID, phone, doctor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* ASSIGNMENT FILTER */}
            <select
              value={assignFilter}
              onChange={(e) => {
                const val = e.target.value;
                setAssignFilter(val);
                if (val === 'ASSIGNED') setSelectedKpi('ASSIGNED');
                else if (val === 'UNASSIGNED') setSelectedKpi('UNASSIGNED');
                else setSelectedKpi(dateTab === 'TODAY' ? 'TODAY' : dateTab === 'YESTERDAY' ? 'YESTERDAY' : null);
              }}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">All Assignment Status</option>
              <option value="ASSIGNED">✓ Assigned Only ({assignedCount})</option>
              <option value="UNASSIGNED">⚠️ Unassigned Only ({unassignedCount})</option>
            </select>
          </div>
        </div>

        {/* RESULTS INFO BAR */}
        <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
          <div>
            Showing <strong className="text-slate-800 font-bold">{filteredAppointments.length}</strong> of {appointments.length} appointments
            {dateTab !== 'ALL' && <span className="ml-1 text-amber-700 font-semibold">• Tab: {dateTab}</span>}
            {assignFilter !== 'ALL' && <span className="ml-1 text-teal-700 font-semibold">• Filter: {assignFilter}</span>}
            {searchTerm && <span className="ml-1 text-slate-600 font-semibold">• Query: "{searchTerm}"</span>}
          </div>
          {(dateTab !== 'TODAY' || assignFilter !== 'ALL' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setDateTab('TODAY');
                setSelectedKpi('TODAY');
                setAssignFilter('ALL');
                setSearchTerm('');
              }}
              className="text-amber-700 hover:text-amber-800 font-bold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* 4. MASTER APPOINTMENTS TABLE */}
        <div className="overflow-x-auto w-full rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-600 min-w-[850px]">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-3.5">Appointment ID</th>
                <th className="py-3.5 px-3.5">Patient Name & Info</th>
                <th className="py-3.5 px-3.5">Contact Details</th>
                <th className="py-3.5 px-3.5">Date & Timing</th>
                <th className="py-3.5 px-3.5">Assignment Status</th>
                <th className="py-3.5 px-3.5">Care Status</th>
                <th className="py-3.5 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-semibold text-slate-500">Loading hospital appointments directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-1.5">
                      <p className="font-bold text-slate-700 text-sm">No appointments found</p>
                      <p className="text-xs text-slate-500">
                        {dateTab === 'TODAY'
                          ? `No patient appointments found for Today (${getTodayYMD()}). You can book a new appointment or switch to 'All Appointments'.`
                          : dateTab === 'YESTERDAY'
                          ? `No appointments found for Yesterday (${getYesterdayYMD()}).`
                          : dateTab === 'HISTORY'
                          ? 'No previous appointment history records found.'
                          : 'No appointment records matching your active filters or search keyword.'}
                      </p>
                      {(dateTab !== 'TODAY' || assignFilter !== 'ALL' || searchTerm) && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDateTab('TODAY');
                              setSelectedKpi('TODAY');
                              setAssignFilter('ALL');
                              setSearchTerm('');
                            }}
                            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer"
                          >
                            Reset To Today's Appointments
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appt, idx) => {
                  const assigned = isDoctorAssigned(appt);
                  const dateCat = categorizeAppointmentDate(appt);
                  const apptId = getAppointmentDisplayId(appt);
                  const patName = getPatientDisplayName(appt);
                  const uhid = getPatientUhidDisplay(appt);

                  return (
                    <tr
                      key={appt.id || idx}
                      className="hover:bg-amber-50/40 transition duration-100 border-b border-slate-100/80"
                    >
                      {/* 1. APPOINTMENT ID */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                          {apptId}
                        </span>
                      </td>

                      {/* 2. PATIENT NAME */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-800 text-xs sm:text-sm">
                          {patName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span>{appt.age ? `${appt.age} Y` : 'Adult'}</span>
                          <span>•</span>
                          <span>{appt.gender || 'Not Specified'}</span>
                          {appt.blood_group && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-rose-600">{appt.blood_group}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 3. CONTACT DETAILS (CLICKABLE PHONE & EMAIL) */}
                      <td className="py-3 px-3.5">
                        {appt.contact || appt.phone ? (
                          <a
                            href={`tel:${appt.contact || appt.phone}`}
                            className="font-mono text-xs font-semibold text-slate-700 hover:text-amber-600 hover:underline flex items-center gap-1 transition"
                            title="Call patient"
                          >
                            <span>📞</span>
                            <span>{appt.contact || appt.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">No phone</span>
                        )}
                        {appt.email && (
                          <a
                            href={`mailto:${appt.email}`}
                            className="text-[10px] text-sky-600 hover:text-sky-800 hover:underline truncate max-w-[170px] block mt-0.5 transition"
                            title={`Send email to ${appt.email}`}
                          >
                            ✉️ {appt.email}
                          </a>
                        )}
                      </td>

                      {/* 4. DATE & TIMING (ONLY DATE & TIMING) */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-xs text-slate-800">
                          {appt.appointment_date || appt.visit_date}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                          ⏰ {appt.appointment_time || appt.visit_time || '10:00 AM'}
                        </div>
                      </td>

                      {/* 5. ASSIGNMENT STATUS (ONLY DOCTOR NAME & ID) */}
                      <td className="py-3 px-3.5">
                        {assigned ? (
                          <div>
                            <div className="font-bold text-slate-800 text-xs">
                              {appt.doctor_name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              ID: {appt.doctor ? `DOC-${appt.doctor}` : 'N/A'}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* 6. CARE STATUS (ONLY ASSIGNED OR UNASSIGNED) */}
                      <td className="py-3 px-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          assigned
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {assigned ? 'Assigned' : 'Unassigned'}
                        </span>
                      </td>

                      {/* 7. ACTIONS (ONLY EDIT BUTTON) */}
                      <td className="py-3 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(appt)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer inline-flex items-center gap-1"
                          title="Edit appointment"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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
      </div>

      {/* 5. EDIT APPOINTMENT MODAL */}
      {isEditModalOpen && editingAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* MODAL HEADER */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 text-white rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-md border border-amber-400/30">
                    {getAppointmentDisplayId(editingAppt)}
                  </span>
                  <h3 className="font-bold text-base sm:text-lg">Edit Appointment Details</h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Patient: <strong className="text-white">{getPatientDisplayName(editingAppt)}</strong> • {hospitalName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* MODAL FORM */}
            <form onSubmit={handleSaveEditSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. PATIENT NAME */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                    Patient Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="patient_name"
                    required
                    value={editFormData.patient_name}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 2. CONTACT / PHONE */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                    Contact / Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="contact"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    required
                    maxLength={10}
                    value={editFormData.contact}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 3. ASSIGN DOCTOR (KEY REQUIREMENT) */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                    Assign Attending Doctor
                  </label>
                  <select
                    name="doctor"
                    value={editFormData.doctor}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">-- No Doctor Assigned (Unassigned) --</option>
                    {doctorsList.map(doc => {
                      const onDuty = isDoctorOnDuty(doc);
                      const docName = doc.name?.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`;
                      return (
                        <option 
                          key={doc.id} 
                          value={doc.id}
                          disabled={!onDuty}
                          style={!onDuty ? { color: '#dc2626', fontWeight: 'bold', backgroundColor: '#fff1f2' } : {}}
                          className={!onDuty ? 'text-rose-600 font-bold bg-rose-50' : ''}
                        >
                          {docName} ({doc.specialization || doc.department || 'General Physician'}){!onDuty ? ' (Off Duty)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 4. CARE STATUS */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                    Appointment Care Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Consultation">In Consultation</option>
                    <option value="Admitted">Admitted</option>
                    <option value="Completed">Completed</option>
                    <option value="Discharged">Discharged</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* 5. APPOINTMENT DATE */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                    Appointment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="visit_date"
                    required
                    value={editFormData.visit_date}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  />
                </div>

                {/* 6. APPOINTMENT TIME */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                    Appointment Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="visit_time"
                    required
                    placeholder="e.g. 10:30 AM"
                    value={editFormData.visit_time}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 7. ASSIGN NURSE */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                    Assign Duty Nurse
                  </label>
                  <select
                    name="nurse"
                    value={editFormData.nurse}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">-- No Nurse Assigned --</option>
                    {nursesList.map(n => {
                      const onDuty = isNurseOnDuty(n);
                      return (
                        <option 
                          key={n.id} 
                          value={n.id}
                          disabled={!onDuty}
                          style={!onDuty ? { color: '#dc2626', fontWeight: 'bold', backgroundColor: '#fff1f2' } : {}}
                          className={!onDuty ? 'text-rose-600 font-bold bg-rose-50' : ''}
                        >
                          {n.name} ({n.role || n.ward || 'Staff Nurse'}){!onDuty ? ' (Off Duty)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 8. BED NUMBER */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                    Inpatient Bed Number
                  </label>
                  <input
                    type="number"
                    name="bed_number"
                    min="1"
                    placeholder="e.g. 45"
                    value={editFormData.bed_number}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 9. EMAIL */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    pattern="[a-zA-Z0-9._%+-]+@gmail\.com"
                    title="Email must be a valid @gmail.com address"
                    placeholder="patient@gmail.com"
                    value={editFormData.email}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 10. PAYMENT STATUS */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                    Billing / Payment Status
                  </label>
                  <select
                    name="payment_status"
                    value={editFormData.payment_status}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

              {/* 11. SYMPTOMS / DIAGNOSIS */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                  Reason for Visit / Symptoms Diagnosis
                </label>
                <textarea
                  rows={2}
                  name="symptoms_diagnosis"
                  placeholder="Enter medical reason, symptoms, or consultation notes..."
                  value={editFormData.symptoms_diagnosis}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* MODAL FOOTER BUTTONS */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Appointment Changes</span>
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

export { ReceptionistAppoiment as ReceptionistAppointments };
export default ReceptionistAppoiment;
