import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const formatApptId = (raw) => {
  if (!raw) return '';
  const s = String(raw).trim();
  if (s.toUpperCase().startsWith('APT-')) return s.toUpperCase();
  if (/^\d+$/.test(s)) return `APT-${s}`;
  return s;
};

const HospitalManagement = ({ currentUser, selectedHospital: propSelectedHospital, setSelectedHospital: propSetSelectedHospital, setCurrentPage }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const [hospitalData, setHospitalData] = useState(null);
  const [assignedAdminInfo, setAssignedAdminInfo] = useState(null);
  const [noHospitalAssigned, setNoHospitalAssigned] = useState(false);

  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [receptionistsList, setReceptionistsList] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  const [wards, setWards] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bedsList, setBedsList] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [bedPage, setBedPage] = useState(1);

  const [deptSearch, setDeptSearch] = useState('');
  const [deptCategoryFilter, setDeptCategoryFilter] = useState('ALL');
  const [wardSearch, setWardSearch] = useState('');
  const [wardTypeFilter, setWardTypeFilter] = useState('ALL');
  const [roomSearch, setRoomSearch] = useState('');
  const [bedStatusFilter, setBedStatusFilter] = useState('ALL');

  const [isEditDetailsModalOpen, setIsEditDetailsModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [isWardModalOpen, setIsWardModalOpen] = useState(false);
  const [editingWard, setEditingWard] = useState(null);
  const [isBedStatusModalOpen, setIsBedStatusModalOpen] = useState(false);
  const [selectedBedToUpdate, setSelectedBedToUpdate] = useState(null);

  const [detailsFormData, setDetailsFormData] = useState({
    id: '',
    Name: '',
    Branch_Code: '',
    city: '',
    area: '',
    address: '',
    contact: '',
    emergency_contact: '',
    email: '',
    established_year: '',
    total_beds: 0,
    icu_beds: 0,
    nicu_beds: 0,
    operation_theatres: 0,
    ambulances_count: 0,
    restroom_for_relatives: 0,
    departments: '',
    is_active: true,
    created_at: ''
  });

  const [deptFormData, setDeptFormData] = useState({
    name: '',
    code: '',
    category: 'Clinical',
    hod: '',
    hod_phone: '',
    location: '',
    doctors_count: 0,
    nurses_count: 0,
    beds_allocated: 0,
    equipment_count: '',
    status: 'Normal'
  });

  const [wardFormData, setWardFormData] = useState({
    name: '',
    code: '',
    category: 'General',
    floor: '',
    total_beds: 10,
    occupied_beds: 0,
    supervisor: '',
    contact_ext: '',
    sanitization_status: 'Sanitized & Clean',
    status: 'Active'
  });

  const [bedStatusFormData, setBedStatusFormData] = useState({
    status: 'Available',
    patient_name: '',
    appointment_id: '',
    selected_appointment_pk: '',
    patient_id: '',
    doctor: '',
    admission_date: '',
    notes: ''
  });

  const fetchAssignedHospitalData = async () => {
    try {
      setLoading(true);
      setNoHospitalAssigned(false);

      let assignedHospitalId = currentUser?.hospital || propSelectedHospital?.id || null;

      if (!assignedHospitalId) {
        try {
          const saved = localStorage.getItem('selectedHospital');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.id) assignedHospitalId = parsed.id;
          }
        } catch (e) {}
      }

      try {
        const adminsRes = await fetch(`${API_BASE_URL}/super-admin/Admins/`);
        if (adminsRes && adminsRes.ok) {
          const adminsList = await adminsRes.json();
          const currentEmail = (currentUser?.email || '').toLowerCase().trim();
          const currentName = (currentUser?.name || '').toLowerCase().trim();

          const matchedAdmin = adminsList.find(a => 
            (a.email && a.email.toLowerCase().trim() === currentEmail) ||
            (a.name && a.name.toLowerCase().trim() === currentName) ||
            (currentUser?.id && Number(a.id) === Number(currentUser.id))
          );

          if (matchedAdmin) {
            setAssignedAdminInfo(matchedAdmin);
            if (matchedAdmin.hospital) {
              assignedHospitalId = Number(matchedAdmin.hospital);
            }
          }
        }
      } catch (e) {
        console.error('Admins fetch error:', e);
      }

      if (!assignedHospitalId) {
        try {
          const rawUser = localStorage.getItem('currentUser');
          if (rawUser) {
            const u = JSON.parse(rawUser);
            if (u.hospital) assignedHospitalId = Number(typeof u.hospital === 'object' ? u.hospital.id : u.hospital);
          }
        } catch {}
      }

      if (!assignedHospitalId) {
        setNoHospitalAssigned(true);
        setHospitalData(null);
        setLoading(false);
        return;
      }

      let targetHosp = null;
      try {
        const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/${assignedHospitalId}/`);
        if (hospRes && hospRes.ok) {
          targetHosp = await hospRes.json();
        }
      } catch (e) {
        console.error('Direct hospital fetch error:', e);
      }

      if (!targetHosp) {
        try {
          const allHospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`);
          if (allHospRes && allHospRes.ok) {
            const allHosp = await allHospRes.json();
            targetHosp = allHosp.find(h => Number(h.id) === Number(assignedHospitalId)) || null;
          }
        } catch (e) {
          console.error('Hospital list fallback error:', e);
        }
      }

      if (!targetHosp) {
        setNoHospitalAssigned(true);
        setHospitalData(null);
        setLoading(false);
        return;
      }

      setHospitalData(targetHosp);
      if (propSetSelectedHospital && (!propSelectedHospital || propSelectedHospital.id !== targetHosp.id)) {
        propSetSelectedHospital(targetHosp);
      }
      localStorage.setItem('selectedHospital', JSON.stringify(targetHosp));

      await setupHospitalAndRelatedData(targetHosp, targetHosp.id || assignedHospitalId);

    } catch (err) {
      console.error('Hospital data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupHospitalAndRelatedData = async (hosp, hospitalId) => {
    try {
      const [docRes, nurRes, recRes, patRes, apptRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Doctors/`),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`),
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`),
        fetch(`${API_BASE_URL}/super-admin/Patients/`),
        fetch(`${API_BASE_URL}/super-admin/appointments/`)
      ]);

      let branchDocs = [];
      if (docRes.status === 'fulfilled' && docRes.value.ok) {
        const allDocs = await docRes.value.json().catch(() => []);
        branchDocs = allDocs.filter(d => {
          if (Array.isArray(d.hospitals)) return d.hospitals.includes(Number(hospitalId));
          return Number(d.hospital) === Number(hospitalId);
        });
        setDoctorsList(branchDocs);
      }

      let branchNurs = [];
      if (nurRes.status === 'fulfilled' && nurRes.value.ok) {
        const allNurs = await nurRes.value.json().catch(() => []);
        branchNurs = allNurs.filter(n => Number(n.hospital) === Number(hospitalId));
        setNursesList(branchNurs);
      }

      let branchRecs = [];
      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const allRecs = await recRes.value.json().catch(() => []);
        branchRecs = allRecs.filter(r => Number(r.hospital) === Number(hospitalId));
        setReceptionistsList(branchRecs);
      }

      let branchPats = [];
      if (patRes.status === 'fulfilled' && patRes.value.ok) {
        const allPats = await patRes.value.json().catch(() => []);
        branchPats = allPats.filter(p => Number(p.hospital) === Number(hospitalId));
        setPatientsList(branchPats);
      }

      let branchAppts = [];
      if (apptRes.status === 'fulfilled' && apptRes.value.ok) {
        const rawAppts = await apptRes.value.json().catch(() => []);
        const allAppts = Array.isArray(rawAppts) ? rawAppts : (rawAppts?.results || rawAppts?.data || []);
        const branchDocIds = new Set(branchDocs.map(d => Number(d.id)));

        branchAppts = allAppts.filter(item => {
          if (!item) return false;
          const apptHospId = typeof item.hospital === 'object' && item.hospital !== null ? item.hospital?.id : item.hospital;
          const apptHospName = item.hospital_name || (typeof item.hospital === 'object' ? (item.hospital?.Name || item.hospital?.name) : (typeof item.hospital === 'string' && isNaN(Number(item.hospital)) ? item.hospital : ''));
          const currentHospName = hosp?.Name || hosp?.name || '';

          if (apptHospId !== null && apptHospId !== undefined && apptHospId !== '' && !isNaN(Number(apptHospId))) {
            return Number(apptHospId) === Number(hospitalId);
          }
          if (apptHospName && currentHospName && apptHospName.toLowerCase().trim() === currentHospName.toLowerCase().trim()) {
            return true;
          }
          if (item.doctor && branchDocIds.has(Number(typeof item.doctor === 'object' ? item.doctor?.id : item.doctor))) {
            return true;
          }
          return false;
        });
        setAppointmentsList(branchAppts);
      }

      const rawDepts = hosp.departments || hosp.department || '';
      let parsedDepts = [];

      if (Array.isArray(rawDepts)) {
        parsedDepts = rawDepts.map((d, index) => {
          const dName = typeof d === 'string' ? d.trim() : (d.name || `Department ${index + 1}`);
          const matchingDoc = branchDocs.find(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase()));
          return {
            id: index + 1,
            name: dName,
            code: `DEPT-${dName.slice(0, 4).toUpperCase()}-${index + 1}`,
            category: 'Clinical',
            hod: matchingDoc ? matchingDoc.name : '-',
            hod_phone: matchingDoc ? (matchingDoc.contact || matchingDoc.phone || '-') : '-',
            location: `Floor ${Math.min(4, Math.floor(index / 2) + 1)} - Wing ${index % 2 === 0 ? 'A' : 'B'}`,
            doctors_count: branchDocs.filter(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase())).length,
            nurses_count: branchNurs.length > 0 ? Math.max(1, Math.floor(branchNurs.length / (rawDepts.length || 1))) : 0,
            beds_allocated: (Number(hosp.total_beds) || 0) > 0 ? Math.floor((Number(hosp.total_beds) || 0) / (rawDepts.length || 1)) : 0,
            equipment_count: '-',
            status: 'Active',
            status_color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
          };
        }).filter(d => d.name && d.name.length > 0);
      } else if (typeof rawDepts === 'string' && rawDepts.trim().length > 0) {
        const deptArray = rawDepts.split(',').map(s => s.trim()).filter(Boolean);
        parsedDepts = deptArray.map((dName, index) => {
          const matchingDoc = branchDocs.find(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase()));
          return {
            id: index + 1,
            name: dName,
            code: `DEPT-${dName.slice(0, 4).toUpperCase()}-${index + 1}`,
            category: 'Clinical',
            hod: matchingDoc ? matchingDoc.name : '-',
            hod_phone: matchingDoc ? (matchingDoc.contact || matchingDoc.phone || '-') : '-',
            location: `Floor ${Math.min(4, Math.floor(index / 2) + 1)} - Wing ${index % 2 === 0 ? 'A' : 'B'}`,
            doctors_count: branchDocs.filter(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase())).length,
            nurses_count: branchNurs.length > 0 ? Math.max(1, Math.floor(branchNurs.length / (deptArray.length || 1))) : 0,
            beds_allocated: (Number(hosp.total_beds) || 0) > 0 ? Math.floor((Number(hosp.total_beds) || 0) / (deptArray.length || 1)) : 0,
            equipment_count: '-',
            status: 'Active',
            status_color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
          };
        }).filter(d => d.name && d.name.length > 0);
      }

      setDepartmentsList(parsedDepts);

      const totalBedsNum = Number(hosp.total_beds) || 0;
      const icuBedsNum = Number(hosp.icu_beds) || 0;
      const nicuBedsNum = Number(hosp.nicu_beds) || 0;
      const genBedsNum = Math.max(0, totalBedsNum - icuBedsNum - nicuBedsNum);

      const generatedWards = [];

      if (genBedsNum > 0) {
        const genOccupied = Math.min(genBedsNum, branchPats.length);
        generatedWards.push({
          id: 1,
          name: 'General Medical Ward',
          code: 'WRD-GEN-01',
          category: 'General',
          floor: 'Floor 1 - Wing A',
          total_beds: genBedsNum,
          occupied_beds: genOccupied,
          available_beds: Math.max(0, genBedsNum - genOccupied),
          supervisor: branchNurs[0]?.name || '-',
          contact_ext: hosp.contact ? `Tel: ${hosp.contact}` : '-',
          sanitization_status: 'Sanitized & Clean',
          sanitization_color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          status: 'Active'
        });
      }

      if (icuBedsNum > 0) {
        const icuOccupied = Math.min(icuBedsNum, Math.max(0, branchPats.length - genBedsNum));
        generatedWards.push({
          id: 2,
          name: 'Intensive Care Unit (ICU)',
          code: 'WRD-ICU-02',
          category: 'Intensive Care',
          floor: 'Floor 2 - Wing A',
          total_beds: icuBedsNum,
          occupied_beds: icuOccupied,
          available_beds: Math.max(0, icuBedsNum - icuOccupied),
          supervisor: branchNurs[1]?.name || branchNurs[0]?.name || '-',
          contact_ext: hosp.contact ? `Tel: ${hosp.contact}` : '-',
          sanitization_status: 'Sterilized',
          sanitization_color: 'text-blue-700 bg-blue-50 border-blue-200',
          status: 'Active'
        });
      }

      if (nicuBedsNum > 0) {
        generatedWards.push({
          id: 3,
          name: 'Neonatal ICU (NICU / PICU)',
          code: 'WRD-NICU-03',
          category: 'Pediatric',
          floor: 'Floor 3 - Wing C',
          total_beds: nicuBedsNum,
          occupied_beds: 0,
          available_beds: nicuBedsNum,
          supervisor: branchNurs[2]?.name || branchNurs[0]?.name || '-',
          contact_ext: hosp.contact ? `Tel: ${hosp.contact}` : '-',
          sanitization_status: 'Sterilized',
          sanitization_color: 'text-purple-700 bg-purple-50 border-purple-200',
          status: 'Active'
        });
      }

      const generatedBeds = [];

      // Collect all active appointments for this hospital branch
      const activeAppts = branchAppts.filter(a => {
        if (!a) return false;
        const st = (a.status || '').toLowerCase();
        return !st.includes('discharge') && !st.includes('cancel');
      });

      // Map beds explicitly assigned via bed_number on appointments
      const bedToApptMap = new Map();
      const unassignedAdmittedAppts = [];

      activeAppts.forEach(a => {
        const rawBed = a.bed_number !== null && a.bed_number !== undefined && a.bed_number !== '' ? Number(a.bed_number) : null;
        if (rawBed && !isNaN(rawBed) && rawBed > 0) {
          bedToApptMap.set(rawBed, a);
        } else if ((a.status || '').toLowerCase().includes('admit')) {
          unassignedAdmittedAppts.push(a);
        }
      });

      // Also check branch patients assigned to beds
      const activePats = branchPats.filter(p => {
        if (!p) return false;
        const st = (p.status || '').toLowerCase();
        return !st.includes('discharge') && !st.includes('cancel');
      });

      const bedToPatMap = new Map();
      const unassignedAdmittedPats = [];

      activePats.forEach(p => {
        const rawBed = p.bed_number !== null && p.bed_number !== undefined && p.bed_number !== '' ? Number(p.bed_number) : null;
        if (rawBed && !isNaN(rawBed) && rawBed > 0) {
          bedToPatMap.set(rawBed, p);
        } else if ((p.status || '').toLowerCase().includes('admit') || (p.patient_type || '').toLowerCase().includes('ipd')) {
          unassignedAdmittedPats.push(p);
        }
      });

      let unassignedApptIdx = 0;
      let unassignedPatIdx = 0;

      for (let i = 1; i <= totalBedsNum; i++) {
        const floorNumber = Math.floor((i - 1) / 100) + 1;

        // 1. Check if an appointment is explicitly assigned to bed i
        let currentAppt = bedToApptMap.get(i) || null;
        // 2. Check if a patient is explicitly assigned to bed i
        let currentPat = !currentAppt ? (bedToPatMap.get(i) || null) : null;

        // 3. Unassigned admitted appointment fallback
        if (!currentAppt && !currentPat && unassignedApptIdx < unassignedAdmittedAppts.length) {
          currentAppt = unassignedAdmittedAppts[unassignedApptIdx++];
        }

        // 4. Unassigned admitted patient fallback
        if (!currentAppt && !currentPat && unassignedPatIdx < unassignedAdmittedPats.length) {
          currentPat = unassignedAdmittedPats[unassignedPatIdx++];
        }

        if (currentAppt) {
          const apptRawId = currentAppt.Appoment_id || currentAppt.appoment_id || currentAppt.appointment_id || currentAppt.id;
          const patName = currentAppt.patient_name || currentAppt.patient_Name || currentAppt.name || 'Admitted Patient';
          const formattedApptId = formatApptId(apptRawId);

          generatedBeds.push({
            id: `bed-${i}`,
            bed_number: i,
            bed_label: `Bed ${i}`,
            floor: `Floor ${floorNumber}`,
            floor_number: floorNumber,
            status: 'Occupied',
            patient_name: patName,
            appointment_id: formattedApptId,
            appointment_pk: currentAppt.id || null,
            patient_id: currentAppt.patient_id ? `PID-${currentAppt.patient_id}` : `PID-${i}`,
            patient_phone: currentAppt.contact || currentAppt.phone || '',
            doctor: currentAppt.doctor_name || (branchDocs[0]?.name || '-'),
            admission_date: currentAppt.appointment_date || currentAppt.visit_date || new Date().toISOString().split('T')[0]
          });
        } else if (currentPat) {
          const patName = currentPat.name || currentPat.patient_name || 'Admitted Patient';
          const matchingAppt = branchAppts.find(a => {
            const aName = (a.patient_name || a.patient_Name || a.name || '').toLowerCase().trim();
            const pName = patName.toLowerCase().trim();
            return aName && pName && aName === pName;
          });
          const apptRawId = currentPat.appointment_id || currentPat.Appoment_id || currentPat.appoment_id || matchingAppt?.Appoment_id || matchingAppt?.appoment_id || matchingAppt?.appointment_id || matchingAppt?.id || currentPat.id;
          const formattedApptId = formatApptId(apptRawId);

          generatedBeds.push({
            id: `bed-${i}`,
            bed_number: i,
            bed_label: `Bed ${i}`,
            floor: `Floor ${floorNumber}`,
            floor_number: floorNumber,
            status: 'Occupied',
            patient_name: patName,
            appointment_id: formattedApptId,
            appointment_pk: matchingAppt?.id || null,
            patient_id: currentPat.patient_id ? `PID-${currentPat.patient_id}` : (currentPat.id ? `PID-${currentPat.id}` : `PID-${i}`),
            patient_phone: currentPat.phone || currentPat.contact || '',
            doctor: currentPat.doctor_name || currentPat.doctor || (branchDocs[0]?.name || '-'),
            admission_date: currentPat.admission_date || currentPat.admit_date || new Date().toISOString().split('T')[0]
          });
        } else {
          generatedBeds.push({
            id: `bed-${i}`,
            bed_number: i,
            bed_label: `Bed ${i}`,
            floor: `Floor ${floorNumber}`,
            floor_number: floorNumber,
            status: 'Available',
            patient_name: '',
            appointment_id: '',
            appointment_pk: null,
            patient_id: '',
            patient_phone: '',
            doctor: '',
            admission_date: ''
          });
        }
      }

      setBedsList(generatedBeds);
    } catch (err) {
      console.error('Setup error:', err);
    }
  };

  useEffect(() => {
    fetchAssignedHospitalData();
  }, [currentUser?.id, currentUser?.email, currentUser?.hospital]);

  const handleOpenEditDetails = () => {
    if (!hospitalData) return;
    const rawDepts = hospitalData.departments !== undefined && hospitalData.departments !== null
      ? (typeof hospitalData.departments === 'string' ? hospitalData.departments : (Array.isArray(hospitalData.departments) ? hospitalData.departments.map(d => typeof d === 'object' ? d.name : d).join(', ') : ''))
      : (departmentsList.length > 0 ? departmentsList.map(d => d.name).join(', ') : '');

    setDetailsFormData({
      id: hospitalData.id || '',
      Name: hospitalData.Name || hospitalData.name || '',
      Branch_Code: hospitalData.Branch_Code || hospitalData.branch_code || '',
      city: hospitalData.city || '',
      area: hospitalData.area || '',
      address: hospitalData.address || '',
      contact: hospitalData.contact || '',
      emergency_contact: hospitalData.emergency_contact || '',
      email: hospitalData.email || '',
      established_year: hospitalData.established_year || '',
      total_beds: hospitalData.total_beds !== undefined ? Number(hospitalData.total_beds) : 0,
      icu_beds: hospitalData.icu_beds !== undefined ? Number(hospitalData.icu_beds) : 0,
      nicu_beds: hospitalData.nicu_beds !== undefined ? Number(hospitalData.nicu_beds) : 0,
      operation_theatres: hospitalData.operation_theatres !== undefined ? Number(hospitalData.operation_theatres) : 0,
      ambulances_count: hospitalData.ambulances_count !== undefined ? Number(hospitalData.ambulances_count) : 0,
      restroom_for_relatives: hospitalData.restroom_for_relatives !== undefined ? Number(hospitalData.restroom_for_relatives) : 0,
      departments: rawDepts || '',
      is_active: hospitalData.is_active !== false,
      created_at: hospitalData.created_at || ''
    });
    setIsEditDetailsModalOpen(true);
  };

  const handleNumberChange = (field, rawVal) => {
    if (rawVal === '') {
      setDetailsFormData(prev => {
        const updated = { ...prev, [field]: '' };
        if (field === 'total_beds') {
          updated.nicu_beds = 0;
        } else if (field === 'icu_beds') {
          const total = Number(prev.total_beds) || 0;
          updated.nicu_beds = Math.max(0, total);
        }
        return updated;
      });
      return;
    }

    // Strip leading zeroes if user types over 0 (e.g. '05' -> '5')
    const cleaned = String(rawVal).replace(/^0+(?=\d)/, '');
    const num = Number(cleaned);
    if (isNaN(num) || num < 0) return;

    setDetailsFormData(prev => {
      const updated = { ...prev, [field]: cleaned };
      if (field === 'total_beds') {
        const icu = Number(prev.icu_beds) || 0;
        updated.nicu_beds = Math.max(0, Number(cleaned) - icu);
      } else if (field === 'icu_beds') {
        const total = Number(prev.total_beds) || 0;
        updated.nicu_beds = Math.max(0, total - Number(cleaned));
      }
      return updated;
    });
  };

  const handleNumberFocus = (e) => {
    if (e.target.value === '0' || Number(e.target.value) === 0) {
      e.target.select();
    }
  };

  const handleNumberBlur = (field) => {
    setDetailsFormData(prev => {
      if (prev[field] === '' || prev[field] === undefined || prev[field] === null) {
        return { ...prev, [field]: 0 };
      }
      return prev;
    });
  };

  const handleSaveDetails = async (e) => {
    if (e) e.preventDefault();
    if (!hospitalData || !hospitalData.id) return;
    setSaveLoading(true);

    try {
      const payload = {
        Name: (detailsFormData.Name || '').trim(),
        Branch_Code: (detailsFormData.Branch_Code || '').trim(),
        city: (detailsFormData.city || '').trim(),
        area: (detailsFormData.area || '').trim(),
        address: (detailsFormData.address || '').trim(),
        contact: (detailsFormData.contact || '').trim(),
        emergency_contact: (detailsFormData.emergency_contact || '').trim(),
        email: (detailsFormData.email || '').trim(),
        established_year: (detailsFormData.established_year || '').trim(),
        total_beds: Number(detailsFormData.total_beds) || 0,
        icu_beds: Number(detailsFormData.icu_beds) || 0,
        nicu_beds: Number(detailsFormData.nicu_beds) || 0,
        operation_theatres: Number(detailsFormData.operation_theatres) || 0,
        ambulances_count: Number(detailsFormData.ambulances_count) || 0,
        restroom_for_relatives: Number(detailsFormData.restroom_for_relatives) || 0,
        departments: (detailsFormData.departments || '').trim(),
        is_active: Boolean(detailsFormData.is_active)
      };

      let response = await fetch(`${API_BASE_URL}/super-admin/Hospital/${hospitalData.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        response = await fetch(`${API_BASE_URL}/super-admin/Hospital/${hospitalData.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const updatedData = await response.json().catch(() => null);

      if (response.ok && updatedData) {
        alert('Hospital details updated successfully!');
        setHospitalData(updatedData);
        if (propSetSelectedHospital) propSetSelectedHospital(updatedData);
        localStorage.setItem('selectedHospital', JSON.stringify(updatedData));
        await setupHospitalAndRelatedData(updatedData, updatedData.id);
        setIsEditDetailsModalOpen(false);
      } else {
        const errorMsg = updatedData ? (typeof updatedData === 'object' ? JSON.stringify(updatedData) : String(updatedData)) : 'Update failed';
        alert('Error: ' + errorMsg);
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('Network error while updating hospital.');
    } finally {
      setSaveLoading(false);
    }
  };

  const syncDepartments = async (newDeptList) => {
    if (!hospitalData || !hospitalData.id) return;
    try {
      const deptNamesString = newDeptList.map(d => d.name).join(', ');
      let res = await fetch(`${API_BASE_URL}/super-admin/Hospital/${hospitalData.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departments: deptNamesString })
      });
      if (!res.ok) {
        const fullPayload = {
          Name: hospitalData.Name || hospitalData.name || '',
          Branch_Code: hospitalData.Branch_Code || hospitalData.branch_code || '',
          city: hospitalData.city || '',
          area: hospitalData.area || '',
          address: hospitalData.address || '',
          contact: hospitalData.contact || '',
          emergency_contact: hospitalData.emergency_contact || '',
          email: hospitalData.email || '',
          established_year: hospitalData.established_year || '',
          total_beds: Number(hospitalData.total_beds) || 0,
          icu_beds: Number(hospitalData.icu_beds) || 0,
          nicu_beds: Number(hospitalData.nicu_beds) || 0,
          operation_theatres: Number(hospitalData.operation_theatres) || 0,
          ambulances_count: Number(hospitalData.ambulances_count) || 0,
          restroom_for_relatives: Number(hospitalData.restroom_for_relatives) || 0,
          departments: deptNamesString,
          is_active: hospitalData.is_active !== false
        };
        res = await fetch(`${API_BASE_URL}/super-admin/Hospital/${hospitalData.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullPayload)
        });
      }
      setHospitalData(prev => ({ ...prev, departments: deptNamesString }));
      const updatedSaved = { ...(hospitalData || {}), departments: deptNamesString };
      localStorage.setItem('selectedHospital', JSON.stringify(updatedSaved));
      if (propSetSelectedHospital) propSetSelectedHospital(updatedSaved);
    } catch (err) {
      console.error('Department sync error:', err);
    }
  };

  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptFormData({
      name: '',
      code: `DEPT-${Math.floor(100 + Math.random() * 900)}`,
      category: 'Clinical',
      hod: '',
      hod_phone: '',
      location: '',
      doctors_count: 0,
      nurses_count: 0,
      beds_allocated: 0,
      equipment_count: '',
      status: 'Active'
    });
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept) => {
    setEditingDept(dept);
    setDeptFormData({
      name: dept.name || '',
      code: dept.code || '',
      category: dept.category || 'Clinical',
      hod: dept.hod || '',
      hod_phone: dept.hod_phone || '',
      location: dept.location || '',
      doctors_count: dept.doctors_count || 0,
      nurses_count: dept.nurses_count || 0,
      beds_allocated: dept.beds_allocated || 0,
      equipment_count: dept.equipment_count || '',
      status: dept.status || 'Active'
    });
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptFormData.name || !deptFormData.name.trim()) return;

    const newDeptName = deptFormData.name.trim();
    if (!editingDept && departmentsList.some(d => d.name.toLowerCase() === newDeptName.toLowerCase())) {
      alert('Department already exists!');
      return;
    }

    let updatedList = [];
    if (editingDept) {
      updatedList = departmentsList.map(d => d.id === editingDept.id ? {
        ...d,
        name: newDeptName
      } : d);
    } else {
      const newDept = {
        id: Date.now(),
        name: newDeptName,
        code: `DEPT-${newDeptName.slice(0, 4).toUpperCase()}-${Date.now() % 1000}`,
        doctors_count: doctorsList.filter(doc => (doc.department || '').toLowerCase().includes(newDeptName.toLowerCase())).length
      };
      updatedList = [...departmentsList, newDept];
    }
    setDepartmentsList(updatedList);
    await syncDepartments(updatedList);
    setIsDeptModalOpen(false);
  };

  const handleDeleteDept = async (id) => {
    const deptToDelete = departmentsList.find(d => d.id === id);
    if (!deptToDelete) return;
    if (window.confirm(`Are you sure you want to remove "${deptToDelete.name}" department?`)) {
      const updatedList = departmentsList.filter(d => d.id !== id);
      setDepartmentsList(updatedList);
      await syncDepartments(updatedList);
    }
  };

  const handleOpenAddWard = () => {
    setEditingWard(null);
    setWardFormData({
      name: '',
      code: `WRD-${Math.floor(100 + Math.random() * 900)}`,
      category: 'General',
      floor: 'Floor 1 - Wing A',
      total_beds: 10,
      occupied_beds: 0,
      supervisor: nursesList[0]?.name || '',
      contact_ext: hospitalData?.contact ? `Tel: ${hospitalData.contact}` : '',
      sanitization_status: 'Sanitized & Clean',
      status: 'Active'
    });
    setIsWardModalOpen(true);
  };

  const handleOpenEditWard = (ward) => {
    setEditingWard(ward);
    setWardFormData({
      name: ward.name || '',
      code: ward.code || '',
      category: ward.category || 'General',
      floor: ward.floor || '',
      total_beds: ward.total_beds || 10,
      occupied_beds: ward.occupied_beds || 0,
      supervisor: ward.supervisor || '',
      contact_ext: ward.contact_ext || '',
      sanitization_status: ward.sanitization_status || 'Sanitized & Clean',
      status: ward.status || 'Active'
    });
    setIsWardModalOpen(true);
  };

  const handleSaveWard = (e) => {
    e.preventDefault();
    const total = Number(wardFormData.total_beds) || 1;
    const occupied = Number(wardFormData.occupied_beds) || 0;
    const available = Math.max(0, total - occupied);

    if (editingWard) {
      setWards(prev => prev.map(w => w.id === editingWard.id ? {
        ...w,
        ...wardFormData,
        total_beds: total,
        occupied_beds: occupied,
        available_beds: available
      } : w));
    } else {
      const newWard = {
        id: Date.now(),
        ...wardFormData,
        total_beds: total,
        occupied_beds: occupied,
        available_beds: available,
        sanitization_color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
      };
      setWards(prev => [...prev, newWard]);
    }
    setIsWardModalOpen(false);
  };

  const handleDeleteWard = (id) => {
    if (window.confirm('Are you sure you want to remove this ward?')) {
      setWards(prev => prev.filter(w => w.id !== id));
    }
  };

  const handleOpenBedStatusModal = (roomOrBed, maybeBed) => {
    const targetBed = maybeBed || roomOrBed;
    setSelectedBedToUpdate(targetBed);
    setBedStatusFormData({
      status: targetBed.status || 'Available',
      patient_name: targetBed.patient_name || '',
      appointment_id: targetBed.appointment_id || '',
      selected_appointment_pk: targetBed.appointment_pk || '',
      patient_id: targetBed.patient_id || '',
      doctor: targetBed.doctor || (doctorsList[0]?.name || ''),
      admission_date: targetBed.admission_date || new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsBedStatusModalOpen(true);
  };

  const handleSaveBedStatus = async (e) => {
    e.preventDefault();
    if (!selectedBedToUpdate) return;

    const isOccupied = bedStatusFormData.status === 'Occupied';
    const apptId = isOccupied ? formatApptId(bedStatusFormData.appointment_id) : '';
    const patName = isOccupied ? (bedStatusFormData.patient_name || '').trim() : '';

    setBedsList(prev => prev.map(b => {
      if (b.id === selectedBedToUpdate.id || b.bed_number === selectedBedToUpdate.bed_number) {
        return {
          ...b,
          status: isOccupied ? 'Occupied' : 'Available',
          patient_name: isOccupied ? patName : '',
          appointment_id: isOccupied ? apptId : '',
          appointment_pk: isOccupied ? (bedStatusFormData.selected_appointment_pk || null) : null
        };
      }
      return b;
    }));

    // If an appointment was selected, sync bed_number and status to backend
    if (bedStatusFormData.selected_appointment_pk) {
      try {
        await fetch(`${API_BASE_URL}/super-admin/appointments/${bedStatusFormData.selected_appointment_pk}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bed_number: isOccupied ? selectedBedToUpdate.bed_number : null,
            status: isOccupied ? 'Admitted' : 'Completed'
          })
        }).catch(() => null);
      } catch (err) {
        console.error('Failed to sync appointment bed to backend:', err);
      }
    }

    setIsBedStatusModalOpen(false);
  };

  const allBeds = bedsList;
  const totalBedsCount = Number(hospitalData?.total_beds) || bedsList.length || 0;
  const occupiedBedsCount = bedsList.filter(b => b.status === 'Occupied').length;
  const availableBedsCount = Math.max(0, totalBedsCount - occupiedBedsCount);
  const bedOccupancyRate = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;

  const filteredBeds = bedsList.filter(b => {
    const query = roomSearch.toLowerCase().trim();
    const matchesSearch = !query ||
      String(b.bed_number).includes(query) ||
      b.bed_label.toLowerCase().includes(query) ||
      (b.patient_name || '').toLowerCase().includes(query) ||
      (b.appointment_id || '').toLowerCase().includes(query) ||
      b.floor.toLowerCase().includes(query);

    const matchesStatus = bedStatusFilter === 'ALL' || b.status === bedStatusFilter;
    const matchesFloor = selectedFloor === 'ALL' || Number(b.floor_number) === Number(selectedFloor);

    return matchesSearch && matchesStatus && matchesFloor;
  });

  const bedsPerPage = 50;
  const totalBedPages = Math.ceil(filteredBeds.length / bedsPerPage) || 1;
  const currentBedPage = Math.min(bedPage, totalBedPages);
  const displayedBeds = filteredBeds.slice((currentBedPage - 1) * bedsPerPage, currentBedPage * bedsPerPage);

  const filteredDepartments = departmentsList.filter(d => {
    return (d.name || '').toLowerCase().includes(deptSearch.toLowerCase());
  });

  const filteredWards = wards.filter(w => {
    const matchesSearch = (w.name || '').toLowerCase().includes(wardSearch.toLowerCase()) ||
      (w.code || '').toLowerCase().includes(wardSearch.toLowerCase()) ||
      (w.supervisor || '').toLowerCase().includes(wardSearch.toLowerCase());
    const matchesType = wardTypeFilter === 'ALL' || w.category === wardTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredRooms = rooms.filter(r => {
    const matchesSearch = (r.room_number || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
      (r.ward || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
      r.beds.some(b => 
        (b.patient_name || '').toLowerCase().includes(roomSearch.toLowerCase()) || 
        (b.bed_number || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
        (b.patient_id || '').toLowerCase().includes(roomSearch.toLowerCase())
      );
    const matchesBedStatus = bedStatusFilter === 'ALL' || r.beds.some(b => b.status === bedStatusFilter);
    return matchesSearch && matchesBedStatus;
  });

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-8 lg:px-12 py-16 text-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-base font-bold text-slate-800">Loading...</h3>
        <p className="text-xs text-slate-500 mt-1">Loading hospital records and staff data.</p>
      </div>
    );
  }

  if (noHospitalAssigned || !hospitalData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            No Hospital Branch Assigned Yet
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
            Super Admin has not yet assigned a hospital facility to your administrator account (<strong>{currentUser?.email || currentUser?.name || 'Admin'}</strong>).
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('admin_dashboard')}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const curHosp = hospitalData;

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-8 space-y-5 sm:space-y-6">
      
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {curHosp.Branch_Code && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold border border-blue-400/30">
                  Branch Id : {curHosp.Branch_Code}
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${curHosp.is_active !== false ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                {curHosp.is_active !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold mt-2 tracking-tight text-slate-100 flex items-center gap-2">
              {curHosp.Name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              {curHosp.address ? curHosp.address : `${curHosp.area ? curHosp.area + ', ' : ''}${curHosp.city || ''}`}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
            <span className="text-xs sm:text-sm font-bold text-slate-200 tracking-wide">
              {assignedAdminInfo?.name || currentUser?.name || 'Admin'}
            </span>
            <button
              type="button"
              onClick={handleOpenEditDetails}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              Edit & Update Details
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">Total Registered Beds</p>
            <p className="text-base sm:text-lg font-bold text-white mt-0.5">{curHosp.total_beds || 0} Beds</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">ICU Beds</p>
            <p className="text-base sm:text-lg font-bold text-rose-300 mt-0.5">{curHosp.icu_beds || 0} ICU</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">Total Doctors</p>
            <p className="text-base sm:text-lg font-bold text-teal-300 mt-0.5">{doctorsList.length} Doctors</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">Nurse & Receptionist</p>
            <p className="text-base sm:text-lg font-bold text-indigo-300 mt-0.5">{nursesList.length + receptionistsList.length} Total</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">Appointments</p>
            <p className="text-base sm:text-lg font-bold text-purple-300 mt-0.5">{appointmentsList.length} Appointments</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
            <p className="text-[11px] font-medium text-slate-400">Receptionist Helpline Number</p>
            <p className="text-xs sm:text-sm font-bold text-emerald-300 mt-0.5 truncate">
              {receptionistsList.find(r => r.contact || r.phone)?.contact || receptionistsList.find(r => r.contact || r.phone)?.phone || curHosp.contact || curHosp.email || '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'details'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Hospital Details
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'departments'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Departments ({departmentsList.length})
        </button>


        <button
          type="button"
          onClick={() => setActiveTab('rooms_beds')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'rooms_beds'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Rooms & Beds
        </button>
      </div>

      {activeTab === 'details' && (
        <div className="space-y-5 sm:space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">Hospital & Administration Details</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${curHosp.is_active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {curHosp.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hospital branch details and assigned administrator information
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-5">
              {/* Column 1: Hospital Identity & Location */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hospital Identity</h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Hospital Name</span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block">{curHosp.Name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Branch Code</span>
                      <span className="font-semibold text-slate-800 font-mono mt-0.5 block">{curHosp.Branch_Code || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">City / Area</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {curHosp.area ? `${curHosp.area}, ` : ''}{curHosp.city || '-'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Physical Address</span>
                    <span className="font-medium text-slate-700 leading-relaxed mt-0.5 block">{curHosp.address || '-'}</span>
                  </div>

                  {curHosp.established_year && (
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Established Year</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{curHosp.established_year}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Communication Desk */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Communication Desk</h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Reception Contact</span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block">{curHosp.contact || '-'}</span>
                  </div>

                  <div>
                    <span className="text-rose-500 font-bold block text-[10px] uppercase">Emergency Helpline</span>
                    <span className="text-sm font-bold text-rose-700 mt-0.5 block">
                      {curHosp.emergency_contact || curHosp.contact || '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Official Email</span>
                    {curHosp.email ? (
                      <a
                        href={`mailto:${curHosp.email.toLowerCase()}`}
                        title={`Send email to ${curHosp.email}`}
                        className="text-sm font-medium text-blue-700 hover:underline mt-0.5 block truncate"
                      >
                        {curHosp.email}
                      </a>
                    ) : (
                      <span className="font-medium text-slate-400 mt-0.5 block">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 3: Administration Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Administrator In-Charge</h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Assigned Administrator</span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                      {assignedAdminInfo?.name || currentUser?.name || 'Administrator'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Admin Email</span>
                    {(assignedAdminInfo?.email || currentUser?.email) ? (
                      <a
                        href={`mailto:${(assignedAdminInfo?.email || currentUser?.email).toLowerCase()}`}
                        title={`Send email to ${assignedAdminInfo?.email || currentUser?.email}`}
                        className="text-sm font-medium text-blue-700 hover:underline mt-0.5 block truncate"
                      >
                        {assignedAdminInfo?.email || currentUser?.email}
                      </a>
                    ) : (
                      <span className="font-medium text-slate-400 mt-0.5 block">-</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Admin ID</span>
                      <span className="font-semibold text-purple-700 font-mono mt-0.5 block">
                        {assignedAdminInfo?.employee_id || (assignedAdminInfo?.id ? `ADM-${assignedAdminInfo.id}` : (currentUser?.employee_id || (currentUser?.id ? `ADM-${currentUser.id}` : `ADM-${curHosp.id}`)))}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Operational Status</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {curHosp.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search department name..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleOpenAddDept}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              + Add Department
            </button>
          </div>

          {filteredDepartments.length > 0 ? (
            <div className="space-y-2.5">
              {filteredDepartments.map((dept) => {
                const assignedDocs = doctorsList.filter(doc => {
                  const docDept = (doc.department || doc.specialization || '').toLowerCase();
                  const curDept = (dept.name || '').toLowerCase();
                  return docDept.includes(curDept) || (docDept && curDept.includes(docDept));
                });
                const doctorNames = assignedDocs.length > 0
                  ? assignedDocs.map(d => d.name).join(', ')
                  : (dept.hod && dept.hod !== '-' ? dept.hod : '-');

                return (
                  <div
                    key={dept.id}
                    className="bg-white rounded-xl px-5 py-4 border border-slate-200 shadow-xs hover:border-slate-300 transition flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base shrink-0">
                        {dept.name?.charAt(0)?.toUpperCase() || 'D'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-800 truncate">
                          {dept.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200 truncate">
                            {doctorNames}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteDept(dept.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              <p className="text-sm font-semibold">No departments found.</p>
              <p className="text-xs text-slate-400 mt-1">Click "+ Add Department" to add departments to this hospital branch.</p>
            </div>
          )}
        </div>
      )}



      {activeTab === 'rooms_beds' && (
        <div className="space-y-4 sm:space-y-5">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Card 1: Total Beds */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Beds</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{totalBedsCount}</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 mt-2 block">
                Across {Math.ceil(totalBedsCount / 100) || 1} Floors (100 Beds / Floor)
              </span>
            </div>

            {/* Card 2: Available & Occupied in ONE box */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Beds Status</span>
                <div className="flex items-center gap-6 mt-1">
                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 block">{availableBedsCount}</span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 inline-block mt-0.5">
                      Available
                    </span>
                  </div>
                  <div className="h-10 w-px bg-slate-200"></div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 block">{occupiedBedsCount}</span>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200 inline-block mt-0.5">
                      Occupied ({occupiedBedsCount} Admitted)
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-medium text-slate-400 mt-2 block">
                Live bed availability tracker
              </span>
            </div>

            {/* Card 3: Occupancy Rate */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Occupancy</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-blue-700 mt-1">{bedOccupancyRate}%</p>
              </div>
              <div className="mt-2">
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-1">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, bedOccupancyRate)}%` }}></div>
                </div>
                <span className="text-[11px] font-semibold text-blue-600 block">Live Hospital Rate</span>
              </div>
            </div>
          </div>

          {/* Filter Bar with 3 Status Buttons and Floor Buttons */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* 3 Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setBedStatusFilter('ALL'); setBedPage(1); }}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                    bedStatusFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  All Beds ({totalBedsCount})
                </button>

                <button
                  type="button"
                  onClick={() => { setBedStatusFilter('Available'); setBedPage(1); }}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 ${
                    bedStatusFilter === 'Available'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${bedStatusFilter === 'Available' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                  Available Beds ({availableBedsCount})
                </button>

                <button
                  type="button"
                  onClick={() => { setBedStatusFilter('Occupied'); setBedPage(1); }}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 ${
                    bedStatusFilter === 'Occupied'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${bedStatusFilter === 'Occupied' ? 'bg-white' : 'bg-rose-500'}`}></span>
                  Occupied Beds ({occupiedBedsCount})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full lg:w-72">
                <input
                  type="text"
                  placeholder="Search by Bed No, Floor, or Patient..."
                  value={roomSearch}
                  onChange={(e) => { setRoomSearch(e.target.value); setBedPage(1); }}
                  className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Floor Selection Buttons (Every 100 beds floor changes) */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider text-[10px]">Filter Floor:</span>
              <button
                type="button"
                onClick={() => { setSelectedFloor('ALL'); setBedPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedFloor === 'ALL'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All Floors
              </button>
              {Array.from({ length: Math.ceil(totalBedsCount / 100) || 1 }, (_, idx) => {
                const flNum = idx + 1;
                const startBed = (flNum - 1) * 100 + 1;
                const endBed = Math.min(totalBedsCount, flNum * 100);
                return (
                  <button
                    key={flNum}
                    type="button"
                    onClick={() => { setSelectedFloor(flNum); setBedPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      selectedFloor === flNum
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    Floor {flNum} ({startBed}-{endBed})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Beds Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredBeds.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Bed Number</th>
                      <th className="py-3 px-4">Floor</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Admitted Patient</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {displayedBeds.map((bed) => {
                      const isOccupied = bed.status === 'Occupied';
                      return (
                        <tr key={bed.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-bold text-slate-800 font-mono text-xs sm:text-sm">
                            Bed {bed.bed_number}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                              {bed.floor}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                              isOccupied
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                              {isOccupied ? 'Occupied' : 'Available'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {isOccupied && bed.patient_name ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-xs sm:text-sm">
                                  {bed.patient_name}
                                </span>
                                {bed.appointment_id && (
                                  <span className="text-[11px] font-semibold text-blue-600 font-mono mt-0.5">
                                    {bed.appointment_id}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenBedStatusModal(bed)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                            >
                              Update Status
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <p className="text-sm font-semibold">No beds found matching your filters.</p>
                <p className="text-xs text-slate-400 mt-1">Try resetting the search or status filters.</p>
              </div>
            )}

            {/* Pagination footer */}
            {filteredBeds.length > bedsPerPage && (
              <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50">
                <span className="text-slate-500">
                  Showing <strong>{(currentBedPage - 1) * bedsPerPage + 1}</strong> to <strong>{Math.min(filteredBeds.length, currentBedPage * bedsPerPage)}</strong> of <strong>{filteredBeds.length}</strong> Beds
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentBedPage === 1}
                    onClick={() => setBedPage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer"
                  >
                    &larr; Previous
                  </button>
                  <span className="px-3 py-1.5 font-bold text-slate-700">
                    Page {currentBedPage} of {totalBedPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentBedPage >= totalBedPages}
                    onClick={() => setBedPage(prev => Math.min(totalBedPages, prev + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {isEditDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/30">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Edit Hospital Details</h3>
                <p className="text-[11px] text-slate-500">Update complete profile and infrastructure configuration for {detailsFormData.Name || 'Hospital'}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditDetailsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDetails} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* SECTION 1: Branch Code & System Identification */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                    <span>Branch Code</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      🔒 Non-Editable
                    </span>
                  </label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={detailsFormData.Branch_Code || ''}
                    placeholder="e.g. MUM-AND-5421"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-100/90 text-slate-600 font-mono font-bold cursor-not-allowed select-none shadow-inner"
                    title="Branch Code cannot be changed"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Permanent unique identifier code. Cannot be modified.</p>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                    <span>Onboarding Date</span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                      System Field
                    </span>
                  </label>
                  <input
                    type="text"
                    value={detailsFormData.created_at ? new Date(detailsFormData.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'System Auto-Assigned'}
                    disabled
                    readOnly
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-100/90 text-slate-600 font-medium cursor-not-allowed select-none shadow-inner"
                    title="Auto-generated registration date"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Hospital branch creation timestamp.</p>
                </div>
              </div>

              {/* SECTION 2: General Information */}
              <div>
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block mb-2 text-teal-800">
                  1. Hospital Identity Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="font-semibold text-slate-700 block mb-1">Hospital Name *</label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={detailsFormData.Name}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, Name: e.target.value })}
                      placeholder="e.g. City General Hospital"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Established Year</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={detailsFormData.established_year}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, established_year: e.target.value })}
                      placeholder="e.g. 1998"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Operational Status *</label>
                    <select
                      value={detailsFormData.is_active ? 'true' : 'false'}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, is_active: e.target.value === 'true' })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="true">Active</option>
                      <option value="false">Unactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Location & Address */}
              <div className="border-t border-slate-200/80 pt-3">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block mb-2 text-teal-800">
                  2. Location & Physical Address
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">City *</label>
                    <input
                      type="text"
                      required
                      maxLength={50}
                      value={detailsFormData.city}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, city: e.target.value })}
                      placeholder="e.g. Mumbai"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Area / Locality *</label>
                    <input
                      type="text"
                      required
                      maxLength={50}
                      value={detailsFormData.area}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, area: e.target.value })}
                      placeholder="e.g. Andheri West"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Full Physical Address *</label>
                  <textarea
                    rows="2"
                    required
                    value={detailsFormData.address}
                    onChange={(e) => setDetailsFormData({ ...detailsFormData, address: e.target.value })}
                    placeholder="Enter complete building name, street, road, landmark and pin code"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  ></textarea>
                </div>
              </div>

              {/* SECTION 4: Contact & Communication */}
              <div className="border-t border-slate-200/80 pt-3">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block mb-2 text-teal-800">
                  3. Contact & Communication Lines
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Reception Contact *</label>
                    <input
                      type="text"
                      required
                      maxLength={20}
                      value={detailsFormData.contact}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, contact: e.target.value })}
                      placeholder="e.g. +91 22 2345 6789"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      maxLength={20}
                      value={detailsFormData.emergency_contact}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, emergency_contact: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Official Email *</label>
                    <input
                      type="email"
                      required
                      value={detailsFormData.email}
                      onChange={(e) => setDetailsFormData({ ...detailsFormData, email: e.target.value })}
                      placeholder="e.g. contact@hospital.org"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: Capacity Configuration */}
              <div className="border-t border-slate-200/80 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block text-teal-800">
                    4. Capacity & Infrastructure Matrix
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    NICU Beds = Total Beds - ICU Beds (Auto-managed by backend)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Total Beds *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={detailsFormData.total_beds ?? ''}
                      onFocus={handleNumberFocus}
                      onBlur={() => handleNumberBlur('total_beds')}
                      onChange={(e) => handleNumberChange('total_beds', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">ICU Beds *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={detailsFormData.icu_beds ?? ''}
                      onFocus={handleNumberFocus}
                      onBlur={() => handleNumberBlur('icu_beds')}
                      onChange={(e) => handleNumberChange('icu_beds', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">NICU Beds</label>
                    <input
                      type="number"
                      min="0"
                      value={detailsFormData.nicu_beds ?? ''}
                      onFocus={handleNumberFocus}
                      onBlur={() => handleNumberBlur('nicu_beds')}
                      onChange={(e) => handleNumberChange('nicu_beds', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Operation Theatres *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={detailsFormData.operation_theatres ?? ''}
                      onFocus={handleNumberFocus}
                      onBlur={() => handleNumberBlur('operation_theatres')}
                      onChange={(e) => handleNumberChange('operation_theatres', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Ambulances *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={detailsFormData.ambulances_count ?? ''}
                      onFocus={handleNumberFocus}
                      onBlur={() => handleNumberBlur('ambulances_count')}
                      onChange={(e) => handleNumberChange('ambulances_count', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Relative Restrooms</label>
                    <input
                      type="number"
                      min="0"
                      value={detailsFormData.restroom_for_relatives ?? ''}
                      onFocus={handleNumberFocus}
                      onBlur={() => handleNumberBlur('restroom_for_relatives')}
                      onChange={(e) => handleNumberChange('restroom_for_relatives', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 6: Departments */}
              <div className="border-t border-slate-200/80 pt-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800 text-xs uppercase tracking-wider block text-teal-800">
                    5. Clinical Departments
                  </label>
                  <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-semibold">
                    Multi Departments Supported
                  </span>
                </div>
                <textarea
                  rows="2"
                  value={detailsFormData.departments}
                  onChange={(e) => setDetailsFormData({ ...detailsFormData, departments: e.target.value })}
                  placeholder="e.g. Cardiology, Neurology, Emergency Medicine, Pediatrics, Orthopedics, Oncology"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                ></textarea>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Enter multiple department names separated by commas. These will automatically configure clinical specialties across this hospital.
                </p>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditDetailsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer disabled:opacity-50 transition shadow-sm flex items-center gap-1.5"
                >
                  {saveLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Updating Backend...</span>
                    </>
                  ) : (
                    <span>Save & Update Details</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                {editingDept ? 'Edit Department' : 'Add New Department'}
              </h3>
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology, Neurology, Pediatrics, Orthopedics"
                  value={deptFormData.name}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  {editingDept ? 'Update Department' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {isBedStatusModalOpen && selectedBedToUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Update Bed: Bed {selectedBedToUpdate.bed_number || selectedBedToUpdate.bed?.bed_number || selectedBedToUpdate.id}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Bed status & patient admission
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBedStatusModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBedStatus} className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Bed Allocation Status *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBedStatusFormData({ ...bedStatusFormData, status: 'Available' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      bedStatusFormData.status === 'Available'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${bedStatusFormData.status === 'Available' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                    Available
                  </button>

                  <button
                    type="button"
                    onClick={() => setBedStatusFormData({ ...bedStatusFormData, status: 'Occupied' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      bedStatusFormData.status === 'Occupied'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${bedStatusFormData.status === 'Occupied' ? 'bg-white' : 'bg-rose-500'}`}></span>
                    Occupied
                  </button>
                </div>
              </div>

              {bedStatusFormData.status === 'Occupied' && (
                <>
                  {appointmentsList.length > 0 && (
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Select Hospital Appointment (Optional)</label>
                      <select
                        value={bedStatusFormData.selected_appointment_pk || ''}
                        onChange={(e) => {
                          const pk = e.target.value;
                          const matched = appointmentsList.find(a => String(a.id) === String(pk));
                          if (matched) {
                            const apptRawId = matched.Appoment_id || matched.appoment_id || matched.appointment_id || matched.id;
                            const pName = matched.patient_name || matched.patient_Name || matched.name || '';
                            setBedStatusFormData({
                              ...bedStatusFormData,
                              selected_appointment_pk: pk,
                              patient_name: pName,
                              appointment_id: formatApptId(apptRawId),
                              doctor: matched.doctor_name || bedStatusFormData.doctor
                            });
                          } else {
                            setBedStatusFormData({
                              ...bedStatusFormData,
                              selected_appointment_pk: ''
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white"
                      >
                        <option value="">-- Choose from existing appointments --</option>
                        {appointmentsList.map((a) => {
                          const rawId = a.Appoment_id || a.appoment_id || a.appointment_id || a.id;
                          const pName = a.patient_name || a.patient_Name || a.name || 'Patient';
                          return (
                            <option key={a.id} value={a.id}>
                              {formatApptId(rawId)} - {pName}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Patient Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Patient Name"
                      value={bedStatusFormData.patient_name}
                      onChange={(e) => setBedStatusFormData({ ...bedStatusFormData, patient_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Appointment ID</label>
                    <input
                      type="text"
                      placeholder="e.g. APT-101"
                      value={bedStatusFormData.appointment_id}
                      onChange={(e) => setBedStatusFormData({ ...bedStatusFormData, appointment_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBedStatusModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HospitalManagement;
