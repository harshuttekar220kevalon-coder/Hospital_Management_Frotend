import { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../Api/Api';
import ActiveFilterTags from '../Common/ActiveFilterTags';

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

const isApptDischargedOrNotNeed = (appt) => {
  if (!appt) return false;
  const s = (appt.status || appt.Status || appt.appointment_status || appt.discharge_status || '').toString().toLowerCase().trim();
  return s.includes('discharg') || s.includes('not need') || s === 'completed';
};

// Categorize appointment into: 'today' | 'yesterday' | 'history'
const categorizeAppointmentDate = (appt) => {
  // STRICT RULE: If discharge or 'Not Need For Admitt' is selected, appointment must ONLY show in history, nowhere else!
  if (isApptDischargedOrNotNeed(appt)) {
    return 'history';
  }

  const apptDateStr = extractApptDateString(appt);
  if (!apptDateStr) return 'history';

  const todayStr = getTodayYMD();
  const yesterdayStr = getYesterdayYMD();

  if (apptDateStr === todayStr) return 'today';
  if (apptDateStr === yesterdayStr) return 'yesterday';
  if (apptDateStr < todayStr) return 'history';

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

  const onDutyNurses = activeNurses.filter(n => isNurseOnDuty(n));
  if (onDutyNurses.length === 0) {
    return { nurseId: null, nurseName: '', reason: 'No on-duty nurses available' };
  }

  const floor = getFloorNumber(bedNumber);

  const floorNurse = onDutyNurses.find(n => {
    const nWard = (n.ward || '').toLowerCase();
    const nFloor = (n.floor || '').toLowerCase();
    return nWard.includes(`floor ${floor}`) || nWard.includes(`floor${floor}`) ||
      nFloor.includes(`floor ${floor}`) || nFloor.includes(String(floor));
  });

  if (floorNurse) {
    return { nurseId: floorNurse.id, nurseName: floorNurse.name, reason: `Duty Station: Floor ${floor}` };
  }

  const chosen = onDutyNurses[(Number(bedNumber) % onDutyNurses.length)] || onDutyNurses[0];
  return { nurseId: chosen.id, nurseName: chosen.name, reason: `Station Floor ${floor} Ward Staff` };
};

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
  const clean = String(timeStr).trim().toUpperCase();
  if (timeSlots.includes(clean)) return clean;
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return clean;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  let ampm = match[3];
  if (!ampm) {
    ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
  }
  const roundedM = m < 15 ? '00' : (m < 45 ? '30' : '00');
  let finalH = m >= 45 ? (h === 12 ? 1 : h + 1) : h;
  const candidate = `${String(finalH).padStart(2, '0')}:${roundedM} ${ampm}`;
  if (timeSlots.includes(candidate)) return candidate;
  return clean;
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Comprehensive Edit Appointment Modal State (Populated with full Appointment model fields)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
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
          const rawDocName = docObj?.name || item.doctor_name || '';
          const docName = rawDocName ? rawDocName.replace(/^Dr\.\s*/i, '') : (docId ? `Doctor #${docId}` : 'Awaiting Doctor Assignment');
          const resolvedDocId = item.doctor_id || docObj?.doctor_id || (docObj?.id ? String(docObj.id) : (docId ? String(docId) : ''));

          const nurseId = typeof item.nurse === 'object' && item.nurse !== null ? item.nurse.id : item.nurse;
          const nurseObj = nurseId ? nurseList.find(n => Number(n.id) === Number(nurseId)) : null;
          const nurseName = item.nurse_name || (nurseObj ? nurseObj.name : '');

          const condition = item.condition || item.Condation || item.Condition || 'Normal';
          const status = item.status || (docId ? 'Assigned' : 'Pending');

          const rawApptId = item.Appoment_id || item.appoment_id || item.appointment_id || id;
          const resolvedPatUhid = item.patient_uhid || (typeof item.patient_id === 'string' && !item.patient_id.startsWith('APT-') ? item.patient_id : null) || item.uhid || (typeof item.patient === 'object' ? (item.patient?.patient_id || item.patient?.uhid || (item.patient?.id ? `PAT-${item.patient.id}` : '')) : (item.patient ? `PAT-${item.patient}` : '')) || (id ? `PAT-${id}` : '-');

          let dateStr = item.appointment_date || item.visit_date || '';
          let timeStr = item.appointment_time || item.visit_time || '';
          if (item.visit_date_time) {
            try {
              const vd = new Date(item.visit_date_time);
              if (!isNaN(vd.getTime())) {
                if (!dateStr) dateStr = formatDateToYMD(vd);
                if (!timeStr) timeStr = normalizeTimeToSlot(vd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
              }
            } catch (e) {}
          }

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
            doctor_id: resolvedDocId,
            doctor_name: docName,
            nurse: nurseId ? Number(nurseId) : null,
            nurse_name: nurseName,
            bed_number: item.bed_number || null,
            condition,
            status,
            age: item.age || item.Age || '',
            gender: item.gender || item.Gender || 'Not Specified',
            blood_group: item.blood_group || item.Blood_Group || '',
            contact: item.contact || item.phone || '',
            email: item.email || '',
            address: item.address || '',
            appointment_date: dateStr,
            visit_date: dateStr,
            appointment_time: timeStr,
            visit_time: timeStr,
            symptoms_diagnosis: item.symptoms_diagnosis || item.reason_for_visit || 'General Consultation',
            hospitals_charges: item.hospitals_charges || item.Hospitals_Chargies || '0.00',
            amount_paid: item.amount_paid || '0.00',
            payment_status: item.payment_status || 'Pending',
            payment_method: item.payment_method || '',
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
  }, [currentUser, refreshTrigger]);

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

  const updateBackendAppointment = async (apptId, payload, file = null, numericId = null, patientItem = null) => {
    let lastError = null;
    const cleanId = String(apptId).replace('APT-', '').trim();
    // Prioritize direct numeric database primary key first to ensure exact record match
    const candidateIds = Array.from(new Set([
      numericId,
      patientItem?.id,
      cleanId,
      apptId,
      patientItem?.Appoment_id,
      patientItem?.appoment_id,
      patientItem?.appointment_id
    ].filter(Boolean)));

    for (const targetId of candidateIds) {
      try {
        let res;
        if (file instanceof File) {
          const formDataObj = new FormData();
          Object.entries(payload).forEach(([key, val]) => {
            if (val !== null && val !== undefined) {
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
          const errText = await res.text().catch(() => '');
          try {
            const errObj = JSON.parse(errText);
            lastError = errObj.detail || (Array.isArray(errObj) ? errObj.join(', ') : Object.entries(errObj).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')) || errText;
          } catch (_) {
            lastError = errText;
          }
          // On bad request / validation error, stop retrying invalid payload
          if (res.status === 400) {
            return { ok: false, error: lastError || 'Validation error while saving appointment' };
          }
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    if (!file) {
      for (const targetId of candidateIds) {
        try {
          const res = await fetch(`${API_BASE_URL}/super-admin/appointments/${targetId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...(patientItem || {}),
              ...payload
            })
          });
          if (res && res.ok) {
            const resJson = await res.json().catch(() => ({}));
            return { ok: true, data: resJson };
          }
        } catch (e) {}
      }
    }

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
              if (val !== null && val !== undefined) {
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
            const errText = await res.text().catch(() => '');
            try {
              const errObj = JSON.parse(errText);
              lastError = errObj.detail || (Array.isArray(errObj) ? errObj.join(', ') : Object.entries(errObj).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')) || errText;
            } catch (_) {
              lastError = errText;
            }
          }
        }
      }
    } catch (e) {
      lastError = e.message;
    }

    return { ok: false, error: lastError || 'Failed to update appointment in backend' };
  };

  // Open Edit Modal with exact same logic as Unassigned Patients
  const handleOpenEditModal = (patient) => {
    setEditingAppt(patient);
    setEditAttachedFile(null);

    // Strictly empty by default unless already set by receptionist in backend
    let vDate = '';
    let vTime = '';
    if (patient.visit_date_time) {
      try {
        const d = new Date(patient.visit_date_time);
        if (!isNaN(d.getTime())) {
          vDate = formatDateToYMD(d);
          vTime = normalizeTimeToSlot(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
        }
      } catch (e) { }
    }
    if (!vDate) {
      vDate = patient.appointment_date || patient.visit_date || '';
    }
    if (!vTime) {
      vTime = patient.appointment_time || patient.visit_time || '';
    }

    const hospId = typeof patient.hospital === 'object' ? patient.hospital?.id : patient.hospital;
    const docId = typeof patient.doctor === 'object' ? patient.doctor?.id : patient.doctor;
    const nurseId = typeof patient.nurse === 'object' ? patient.nurse?.id : patient.nurse;

    // Strict Duty verification for existing assignments
    const existingDoc = docId ? doctorsList.find(d => Number(d.id) === Number(docId)) : null;
    const isDocActive = existingDoc ? isDoctorOnDuty(existingDoc) : true;

    const existingNurse = nurseId ? nursesList.find(n => Number(n.id) === Number(nurseId)) : null;
    const isNurseActive = existingNurse ? isNurseOnDuty(existingNurse) : true;

    const autoRes = patient.bed_number ? getAutoNurseForBed(patient.bed_number, nursesList, hospId) : { nurseId: '', nurseName: '' };

    if (patient.bed_number && autoRes.nurseName) {
      setAutoNurseText(`Auto-Mapped: ${autoRes.nurseName} (Floor ${getFloorNumber(patient.bed_number)})`);
    } else {
      setAutoNurseText('');
    }

    setEditFormData({
      patient_Name: patient.patient_Name || patient.patient_name || patient.name || '',
      hospital: hospId ? String(hospId) : (hospitalInfo?.id ? String(hospitalInfo.id) : (hospitalsList[0]?.id ? String(hospitalsList[0].id) : '')),
      doctor: docId ? String(docId) : (isDocActive && existingDoc ? String(existingDoc.id) : ''),
      visit_date: vDate,
      visit_time: vTime,
      age: patient.age || patient.Age || '',
      gender: patient.Gender || patient.gender || 'Male',
      Gender: patient.Gender || patient.gender || 'Male',
      symptoms_diagnosis: patient.symptoms_diagnosis || patient.reason_for_visit || '',
      blood_group: patient.blood_group || patient.Blood_Group || '',
      attached_document: patient.attached_document || null,
      contact: patient.contact || patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      hospitals_charges: String(patient.hospitals_charges || patient.Hospitals_Chargies || '0.00'),
      amount_paid: String(patient.amount_paid || '0.00'),
      payment_status: patient.payment_status || patient.Payment_Status || 'Pending',
      payment_method: patient.payment_method || patient.Payment_Method || '',
      status: STATUS_CHOICES.includes(patient.status || patient.Status)
        ? (patient.status || patient.Status)
        : ((docId || patient.doctor) ? 'Assigned' : 'Pending'),
      condition: patient.condition || patient.Condation || patient.Condition || patient.symptoms_severity || 'Normal',
      bed_number: patient.bed_number ? String(patient.bed_number) : '',
      nurse: nurseId ? String(nurseId) : (isNurseActive && existingNurse ? String(existingNurse.id) : (autoRes.nurseId ? String(autoRes.nurseId) : ''))
    });
    setIsEditModalOpen(true);
  };

  const handleEditBedChange = (bedVal) => {
    const hospId = editFormData.hospital || (hospitalInfo?.id ? String(hospitalInfo.id) : null);
    const autoRes = bedVal ? getAutoNurseForBed(bedVal, nursesList, hospId) : { nurseId: '', nurseName: '' };

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
    if (docVal) {
      const chosenDoc = doctorsList.find(d => Number(d.id) === Number(docVal));
      if (chosenDoc && !isDoctorOnDuty(chosenDoc)) {
        alert(`Doctor ${chosenDoc.name || 'This doctor'} is currently Off Duty / On Leave and cannot be assigned.`);
        return;
      }
    }
    setEditFormData(prev => ({
      ...prev,
      doctor: docVal,
      status: docVal ? (prev.status === 'Pending' ? 'Assigned' : prev.status) : prev.status
    }));
  };

  const handleEditNurseChange = (nurseVal) => {
    if (nurseVal) {
      const chosenNurse = nursesList.find(n => Number(n.id) === Number(nurseVal));
      if (chosenNurse && !isNurseOnDuty(chosenNurse)) {
        alert(`Nurse ${chosenNurse.name || 'This nurse'} is currently Off Duty and cannot be assigned.`);
        return;
      }
    }
    setEditFormData(prev => ({
      ...prev,
      nurse: nurseVal
    }));
  };

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
    const editEmail = (editFormData.email || editingAppt.email || '').trim();
    if (editEmail && !editEmail.toLowerCase().endsWith('@gmail.com')) {
      alert("Email must be a valid @gmail.com address.");
      return;
    }

    if (editFormData.doctor && (!editFormData.visit_date || !editFormData.visit_time)) {
      alert('Please select Appointment Date & Time when assigning a doctor.');
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
      const apptId = editingAppt.Appoment_id || editingAppt.appoment_id || editingAppt.appointment_id || editingAppt.id;
      const numericId = editingAppt.id;

      const chosenDoc = editFormData.doctor
        ? doctorsList.find(d => Number(d.id) === Number(editFormData.doctor))
        : null;

      if (chosenDoc && !isDoctorOnDuty(chosenDoc)) {
        alert(`Doctor ${chosenDoc.name || ''} is currently Off Duty / On Leave and cannot be assigned.`);
        setSavingEdit(false);
        return;
      }

      const parsedBed = editFormData.bed_number ? Number(editFormData.bed_number) : null;
      const hospId = Number(typeof editingAppt.hospital === 'object' ? editingAppt.hospital?.id : (editingAppt.hospital || hospitalInfo?.id)) || null;

      const autoRes = parsedBed ? getAutoNurseForBed(parsedBed, nursesList, hospId) : { nurseId: null, nurseName: '' };
      const chosenNurse = editFormData.nurse
        ? nursesList.find(n => Number(n.id) === Number(editFormData.nurse))
        : (autoRes.nurseId ? nursesList.find(n => Number(n.id) === autoRes.nurseId) : null);

      if (chosenNurse && !isNurseOnDuty(chosenNurse)) {
        alert(`Nurse ${chosenNurse.name || ''} is currently Off Duty and cannot be assigned.`);
        setSavingEdit(false);
        return;
      }

      let visitIso = null;
      if (editFormData.visit_date) {
        try {
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
          const [y, m, day] = editFormData.visit_date.split('-').map(Number);
          const d = new Date(y, m - 1, day, hours, minutes, 0);
          if (!isNaN(d.getTime())) {
            visitIso = d.toISOString();
          }
        } catch (dErr) {
          console.warn('Invalid visit date:', dErr);
        }
      } else if (editingAppt.visit_date_time) {
        visitIso = editingAppt.visit_date_time;
      }

      const nameVal = (editFormData.patient_Name || editingAppt.patient_Name || editingAppt.name || editingAppt.patient_name || '').trim();
      const phoneVal = cleanPhone || (editFormData.contact || editingAppt.contact || '').trim();
      const condVal = ['Critical', 'Emergency', 'Urgent', 'Normal'].includes(editFormData.condition) ? editFormData.condition : (editingAppt.condition || 'Normal');
      const chargesVal = Number(editFormData.hospitals_charges || 0);
      const paidVal = Number(editFormData.amount_paid || 0);
      const ageVal = editFormData.age ? String(editFormData.age).trim().slice(0, 3) : (editingAppt.age ? String(editingAppt.age).trim().slice(0, 3) : '');
      const genderVal = editFormData.gender || editFormData.Gender || editingAppt.Gender || editingAppt.gender || 'Male';

      const cleanPayload = {
        name: nameVal,
        patient_name: nameVal,
        patient_Name: nameVal,
        contact: phoneVal,
        phone: phoneVal,
        email: editEmail,
        age: ageVal,
        gender: genderVal,
        Gender: genderVal,
        blood_group: editFormData.blood_group || null,
        doctor: chosenDoc ? Number(chosenDoc.id) : (editFormData.doctor ? Number(editFormData.doctor) : null),
        doctor_id: chosenDoc?.doctor_id || (chosenDoc?.id ? String(chosenDoc.id) : (editFormData.doctor ? String(editFormData.doctor) : '')),
        doctor_name: chosenDoc ? chosenDoc.name.replace(/^Dr\.\s*/i, '') : (editFormData.doctor ? `Doctor #${editFormData.doctor}` : 'Awaiting Doctor Assignment'),
        nurse: chosenNurse ? Number(chosenNurse.id) : null,
        nurse_name: chosenNurse ? (chosenNurse.name || '') : '',
        bed_number: parsedBed,
        status: STATUS_CHOICES.includes(editFormData.status) ? editFormData.status : (editingAppt.status || 'Pending'),
        condition: condVal,
        appointment_date: editFormData.visit_date,
        visit_date: editFormData.visit_date,
        appointment_time: editFormData.visit_time,
        visit_time: editFormData.visit_time,
        visit_date_time: visitIso || null,
        symptoms_diagnosis: (editFormData.symptoms_diagnosis || editingAppt.symptoms_diagnosis || editingAppt.reason_for_visit || 'General Consultation').trim(),
        reason_for_visit: (editFormData.symptoms_diagnosis || editingAppt.symptoms_diagnosis || editingAppt.reason_for_visit || 'General Consultation').trim(),
        hospitals_charges: Number(chargesVal).toFixed(2),
        amount_paid: Number(paidVal).toFixed(2),
        payment_status: ['Paid', 'Partial', 'Pending', 'Failed'].includes(editFormData.payment_status) ? editFormData.payment_status : 'Pending',
        payment_method: editFormData.payment_method || null,
        address: (editFormData.address || '').trim()
      };

      if (hospId) cleanPayload.hospital = Number(hospId);

      const result = await updateBackendAppointment(apptId, cleanPayload, editAttachedFile, numericId, editingAppt);

      if (result && result.ok) {
        const candidateIds = [
          editingAppt.id,
          editingAppt.appointment_id,
          editingAppt.Appoment_id,
          editingAppt.appoment_id
        ].filter(Boolean).map(String);

        setAppointments(prev => prev.map(p => {
          const pId = String(p.id || p.appointment_id || p.Appoment_id || '');
          if (candidateIds.includes(pId)) {
            return {
              ...p,
              ...cleanPayload,
              ...(result.data || {}),
              bed_number: parsedBed,
              nurse: chosenNurse ? Number(chosenNurse.id) : null,
              nurse_name: chosenNurse ? (chosenNurse.name || '') : '',
              doctor: chosenDoc ? Number(chosenDoc.id) : cleanPayload.doctor,
              doctor_id: chosenDoc?.doctor_id || (chosenDoc?.id ? String(chosenDoc.id) : cleanPayload.doctor_id),
              doctor_name: chosenDoc ? chosenDoc.name.replace(/^Dr\.\s*/i, '') : cleanPayload.doctor_name
            };
          }
          return p;
        }));

        // Immediately trigger refresh from backend to ensure 100% database persistence and sync
        setRefreshTrigger(prev => prev + 1);

        setActionSuccessMsg(`✓ Appointment ${getAppointmentDisplayId(editingAppt)} for ${cleanPayload.patient_Name} updated successfully in database.`);
        setTimeout(() => setActionSuccessMsg(''), 4500);
        setIsEditModalOpen(false);
        setEditingAppt(null);
        setEditAttachedFile(null);
      } else {
        alert(`Error updating appointment: ${result?.error || 'Unknown error'}`);
      }
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
        {/* TOP HEADER: TITLE & SEARCH (MATCHING IMAGE 2 DESIGN) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Appointments Directory
            </h2>
            <p className="text-xs text-slate-500">
              Registered patients who booked an appointment in this hospital
            </p>
          </div>

          {/* Search & Assignment Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, ID, phone, doctor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white w-full sm:w-72"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={assignFilter}
              onChange={(e) => {
                const val = e.target.value;
                setAssignFilter(val);
                if (val === 'ASSIGNED') setSelectedKpi('ASSIGNED');
                else if (val === 'UNASSIGNED') setSelectedKpi('UNASSIGNED');
                else setSelectedKpi(dateTab === 'TODAY' ? 'TODAY' : dateTab === 'YESTERDAY' ? 'YESTERDAY' : null);
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">All Assignment Status</option>
              <option value="ASSIGNED">✓ Assigned Only ({assignedCount})</option>
              <option value="UNASSIGNED">⚠️ Unassigned Only ({unassignedCount})</option>
            </select>
          </div>
        </div>

        {/* QUICK FILTER TABS (CLEAN FULL-WIDTH ROW MATCHING IMAGE 2 WITHOUT SCROLLING) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDateTab('TODAY');
              setSelectedKpi('TODAY');
              setAssignFilter('ALL');
            }}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              dateTab === 'TODAY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${dateTab === 'TODAY' ? 'bg-white' : 'bg-emerald-500'} animate-pulse`}></span>
            <span>📅 Today's Appointments ({todayCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDateTab('YESTERDAY');
              setSelectedKpi('YESTERDAY');
              setAssignFilter('ALL');
            }}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              dateTab === 'YESTERDAY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>Yesterday's Appointments ({yesterdayCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDateTab('HISTORY');
              setSelectedKpi(null);
              setAssignFilter('ALL');
            }}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              dateTab === 'HISTORY'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>Appointments History ({historyCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDateTab('ALL');
              setSelectedKpi(null);
              setAssignFilter('ALL');
            }}
            className={`py-2 px-3.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              dateTab === 'ALL'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>All Appointments ({appointments.length})</span>
          </button>
        </div>

        {/* ACTIVE FILTER TAGS */}
        <ActiveFilterTags
          filters={[
            {
              key: 'searchTerm',
              name: 'Search',
              value: searchTerm,
              onRemove: () => setSearchTerm('')
            },
            {
              key: 'assignFilter',
              name: 'Assignment',
              value: assignFilter,
              displayValue: assignFilter === 'ASSIGNED' ? 'Assigned' : assignFilter === 'UNASSIGNED' ? 'Unassigned' : assignFilter,
              onRemove: () => setAssignFilter('ALL')
            },
            {
              key: 'dateTab',
              name: 'Schedule',
              value: dateTab,
              displayValue: dateTab === 'TODAY' ? "Today's Appointments" : dateTab === 'YESTERDAY' ? "Yesterday's Appointments" : dateTab === 'HISTORY' ? "Appointments History" : dateTab,
              onRemove: () => setDateTab('TODAY')
            }
          ]}
          onClearAll={() => {
            setDateTab('TODAY');
            setSelectedKpi('TODAY');
            setAssignFilter('ALL');
            setSearchTerm('');
          }}
        />

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
                          <span>{appt.age ? `${appt.age} Y` : '-'}</span>
                          <span>•</span>
                          <span>{appt.gender || '-'}</span>
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
                          <span className="text-slate-400 text-xs font-mono">-</span>
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
                        {appt.appointment_date || appt.visit_date || appt.visit_date_time ? (
                          <>
                            <div className="font-semibold text-xs text-slate-800">
                              {appt.appointment_date || appt.visit_date || (appt.visit_date_time ? new Date(appt.visit_date_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '')}
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                              ⏰ {appt.appointment_time || appt.visit_time || (appt.visit_date_time ? new Date(appt.visit_date_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-')}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* 5. ASSIGNMENT STATUS (ONLY DOCTOR NAME & ID) */}
                      <td className="py-3 px-3.5">
                        {assigned ? (
                          <div>
                            <div className="font-bold text-slate-800 text-xs">
                              {appt.doctor_name ? String(appt.doctor_name).replace(/^Dr\.\s*/i, '') : '-'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              ID: {appt.doctor_id || (appt.doctor ? String(appt.doctor) : '-')}
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

      {/* 5. COMPREHENSIVE EDIT APPOINTMENT MODAL (Exact match with Unassigned Patients) */}
      {isEditModalOpen && editingAppt && (
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
                  {getPatientDisplayName(editingAppt)} • Appointment ID: {getAppointmentDisplayId(editingAppt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setIsEditModalOpen(false); setEditingAppt(null); setEditAttachedFile(null); }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="p-6 space-y-5 overflow-y-auto">
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
                          {hospitalsList.find(h => Number(h.id) === Number(editFormData.hospital))?.Name ||
                            hospitalsList.find(h => Number(h.id) === Number(editFormData.hospital))?.name ||
                            editingAppt?.hospital_name ||
                            hospitalInfo?.Name || hospitalInfo?.name || hospitalName || 'Patient Selected Hospital'}
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
                      {doctorsList.map(d => {
                        const onDuty = isDoctorOnDuty(d);
                        const docName = (d.name || `Doctor #${d.id}`).replace(/^Dr\.\s*/i, '');
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
                      onChange={(e) => handleEditNurseChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
                      <option value="">-- Auto-assigned from Bed Duty --</option>
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
                  onClick={() => { setIsEditModalOpen(false); setEditingAppt(null); setEditAttachedFile(null); }}
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

export { ReceptionistAppoiment as ReceptionistAppointments };
export default ReceptionistAppoiment;
