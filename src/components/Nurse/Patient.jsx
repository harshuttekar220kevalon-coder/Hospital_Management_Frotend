import { useState, useEffect } from 'react';
import { API_BASE_URL, extractArray } from '../Api/Api';
import ActiveFilterTags from '../Common/ActiveFilterTags';

const getFloorDisplay = (floorOrBed) => {
  if (!floorOrBed) return 'Not Assigned';
  if (typeof floorOrBed === 'string' && floorOrBed.toLowerCase().startsWith('floor')) return floorOrBed;
  const num = Number(floorOrBed);
  if (isNaN(num) || num <= 0) return 'Not Assigned';
  const floorNum = Math.floor((num - 1) / 100) + 1;
  return `Floor ${floorNum}`;
};

const getNurseFloorNumber = (nurse, user) => {
  const n = nurse || user;
  if (!n) return 1;

  // 1. Check assigned_floor (e.g. from Nurse profile/settings)
  const rawAssigned = n.assigned_floor ?? user?.assigned_floor;
  if (rawAssigned !== undefined && rawAssigned !== null && String(rawAssigned).trim() !== '') {
    const parsed = parseInt(String(rawAssigned).replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // 2. Check floor property
  const rawFloor = n.floor ?? user?.floor;
  if (rawFloor !== undefined && rawFloor !== null && String(rawFloor).trim() !== '') {
    const parsed = parseInt(String(rawFloor).replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // 3. Check ward property (e.g. "Floor 1 Ward" or "Floor 2")
  const rawWard = n.ward ?? user?.ward;
  if (rawWard) {
    const match = String(rawWard).match(/floor\s*(\d+)/i) || String(rawWard).match(/(\d+)/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  return 1;
};

const getPatientBedFloorNumber = (p) => {
  if (!p) return null;
  // Patient must have a bed number assigned
  const rawBed = p.bed_number;
  if (rawBed === undefined || rawBed === null || String(rawBed).trim() === '' || String(rawBed).trim() === '0') {
    return null;
  }
  const bedNum = parseInt(String(rawBed).replace(/\D/g, ''), 10);
  if (!isNaN(bedNum) && bedNum > 0) {
    return Math.floor((bedNum - 1) / 100) + 1;
  }
  return null;
};

const isPatientAssignedToNurse = (p, nurseObj, userObj) => {
  if (!p) return false;
  const nurse = nurseObj || userObj;
  if (!nurse) return false;

  const targetNurseId = nurse?.id ? Number(nurse.id) : (userObj?.id ? Number(userObj.id) : null);
  const targetNurseName = (nurse?.name || userObj?.name || '').toLowerCase().trim();
  const targetNurseEmail = (nurse?.email || userObj?.email || '').toLowerCase().trim();

  const pNurse = p.nurse;
  const rawPNurseId = typeof pNurse === 'object' && pNurse !== null ? pNurse.id : pNurse;
  const pNurseId = rawPNurseId && !isNaN(Number(rawPNurseId)) ? Number(rawPNurseId) : null;
  const pNurseName = (p.nurse_name || (typeof pNurse === 'object' && pNurse !== null ? (pNurse.name || pNurse.Name) : '') || '').toLowerCase().trim();
  const pNurseEmail = (p.nurse_email || (typeof pNurse === 'object' && pNurse !== null ? pNurse.email : '') || '').toLowerCase().trim();

  // If no nurse is assigned on the appointment record, it is NOT assigned
  if (!pNurseId && !pNurseName && !pNurseEmail) return false;

  // Strict matching
  if (targetNurseId && pNurseId && targetNurseId === pNurseId) return true;
  if (targetNurseName && pNurseName && targetNurseName === pNurseName) return true;
  if (targetNurseEmail && pNurseEmail && targetNurseEmail === pNurseEmail) return true;

  return false;
};

const formatAppointmentId = (item) => {
  if (!item) return 'APT-0';
  const rawId = item.appointment_id || item.Appoment_id || item.appoment_id || item.tracking_id ||
    (typeof item.patient_id === 'string' && item.patient_id.trim().toUpperCase().startsWith('APT-') ? item.patient_id : null) ||
    item.id;
  if (!rawId) return 'APT-0';
  const strId = String(rawId).trim();
  if (strId.toUpperCase().startsWith('APT-')) return strId.toUpperCase();
  return `APT-${strId}`;
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

const NursePatients = ({ currentUser, setCurrentPage }) => {
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(() => {
    if (currentUser?.is_approved !== undefined && currentUser?.is_approved !== null) {
      return Boolean(currentUser.is_approved);
    }
    return false;
  });
  const [nurseInfo, setNurseInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [nursesList, setNursesList] = useState([]);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isBedAssignModalOpen, setIsBedAssignModalOpen] = useState(false);
  const [newBedNumber, setNewBedNumber] = useState('');

  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [updatingPatientId, setUpdatingPatientId] = useState(null);

  // Vitals form state
  const [vitalsForm, setVitalsForm] = useState({
    bp: '120/80',
    pulse: '76',
    temp: '98.6',
    spo2: '99',
    sugar: '110',
    respiration: '16',
    notes: '',
    ivDrip: 'Normal Saline (500ml) @ 75ml/hr',
    medStatus: 'Administered'
  });

  // Local storage key for persistent nurse vitals records
  const getVitalsStorageKey = (patientId) => `nurse_vitals_${patientId}`;

  useEffect(() => {
    let isMounted = true;

    const loadData = async (silent = false) => {
      try {
        if (!silent && isMounted) setLoading(true);
        const email = (currentUser?.email || '').toLowerCase().trim();
        const nurseId = currentUser?.id;

        // 1. Fetch Nurse profile
        const nurseRes = await fetch(`${API_BASE_URL}/super-admin/Nurses/`).catch(() => null);
        let currentNurse = null;
        let allNurses = [];
        if (nurseRes && nurseRes.ok) {
          allNurses = await nurseRes.json();
          if (Array.isArray(allNurses)) {
            setNursesList(allNurses);
            currentNurse = allNurses.find(n => 
              (n.email && n.email.toLowerCase().trim() === email) ||
              (nurseId && Number(n.id) === Number(nurseId)) ||
              (n.name && n.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        }

        if (currentNurse) {
          const approvedStatus = currentNurse.is_approved !== undefined ? Boolean(currentNurse.is_approved) : false;
          if (isMounted) setIsApproved(approvedStatus);
        }

        if (isMounted) {
          setNurseInfo(currentNurse || currentUser);
        }

        // 2. Fetch Hospital info
        let targetHospId = typeof currentNurse?.hospital === 'object' ? currentNurse?.hospital?.id : (currentNurse?.hospital || currentUser?.hospital);
        
        let hospitals = [];
        const hospListRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
        let matchedHospital = null;
        if (hospListRes && hospListRes.ok) {
          hospitals = await hospListRes.json();
          if (Array.isArray(hospitals)) {
            matchedHospital = hospitals.find(h => 
              (targetHospId && Number(h.id) === Number(targetHospId)) ||
              (currentNurse?.hospital_name && h.Name && h.Name.toLowerCase() === currentNurse.hospital_name.toLowerCase()) ||
              (typeof currentNurse?.hospital === 'string' && h.Name && h.Name.toLowerCase() === currentNurse.hospital.toLowerCase())
            );
            if (!matchedHospital && email) {
              const savedHospId = localStorage.getItem(`user_hospital_${email}`);
              if (savedHospId) {
                matchedHospital = hospitals.find(h => Number(h.id) === Number(savedHospId));
                if (matchedHospital) targetHospId = matchedHospital.id;
              }
            }
            if (!matchedHospital) {
              const checkStr = `${email} ${currentUser?.name || ''} ${currentNurse?.name || ''}`.toLowerCase();
              matchedHospital = hospitals.find(h => {
                const hn = (h.Name || h.name || '').toLowerCase().trim();
                return hn && checkStr.includes(hn);
              });
              if (matchedHospital) targetHospId = matchedHospital.id;
            }
          }
        }

        if (!matchedHospital && targetHospId) {
          const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/${targetHospId}/`).catch(() => null);
          if (hospRes && hospRes.ok) {
            matchedHospital = await hospRes.json();
          }
        }

        if (isMounted && matchedHospital) {
          setHospitalInfo(matchedHospital);
        }

        const targetHospName = matchedHospital?.Name || matchedHospital?.name || currentNurse?.hospital_name || currentUser?.hospital_name || '';

        // 3. Fetch Inpatients / Appointments
        let allPats = [];
        try {
          const patRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
          if (patRes && patRes.ok) {
            const resData = await patRes.json().catch(() => []);
            allPats = extractArray(resData);
          }
        } catch (e) {}

        const filtered = targetHospId || targetHospName
          ? allPats.filter(p => isAppointmentInHospital(p, targetHospId, targetHospName, hospitals))
          : [];

        const enriched = filtered.map(p => {
          const apptId = p.id;
          const stored = localStorage.getItem(`nurse_checkup_${apptId}`) ||
            (p.Appoment_id ? localStorage.getItem(`nurse_checkup_${p.Appoment_id}`) : null) ||
            (p.appointment_id ? localStorage.getItem(`nurse_checkup_${p.appointment_id}`) : null);
          if (stored === 'Done') {
            return { ...p, status: 'Completed', checkup_status: 'Done' };
          } else if (stored === 'Not Done' && (p.status === 'Completed' || p.checkup_status === 'Done')) {
            return { ...p, status: 'Admitted', checkup_status: 'Pending' };
          }
          return p;
        });

        if (isMounted) {
          setPatients(enriched);
        }
      } catch (err) {
        console.error('Error loading nurse patients data:', err);
      } finally {
        if (!silent && isMounted) setLoading(false);
      }
    };

    loadData(false);

    // Auto-polling every 3.5s for real-time backend updates
    const pollInterval = setInterval(() => {
      if (isMounted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData(true);
      }
    }, 3500);

    const handleFocus = () => {
      if (isMounted) loadData(true);
    };
    const handleVisibility = () => {
      if (isMounted && document.visibilityState === 'visible') loadData(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser]);

  const activeNurse = nurseInfo || currentUser;
  const nurseName = activeNurse?.name || currentUser?.name || 'Nurse';
  const roleName = activeNurse?.nurse_role || activeNurse?.role || currentUser?.nurse_role || currentUser?.role || 'Staff Nurse';
  const wardName = activeNurse?.ward || currentUser?.ward || 'General Care Ward';
  const hospitalName = hospitalInfo?.Name || hospitalInfo?.name || activeNurse?.hospital_name || currentUser?.hospital_name || (typeof activeNurse?.hospital === 'object' ? activeNurse.hospital?.Name : null) || 'Not Provided';
  const nurseIdTag = activeNurse?.nurse_id || currentUser?.nurse_id || `NUR-${currentUser?.id || '01'}`;

  // Nurse's designated floor number & label
  const nurseFloorNum = getNurseFloorNumber(activeNurse, currentUser);
  const nurseFloor = `Floor ${nurseFloorNum}`;
  const targetHospId = typeof activeNurse?.hospital === 'object' ? activeNurse?.hospital?.id : (activeNurse?.hospital || currentUser?.hospital);

  // STRICT REQUIREMENT:
  // Patient is ONLY displayed if:
  // 1. Patient is assigned to this nurse
  // AND
  // 2. Patient's bed count / bed number matches this nurse's assigned floor
  const displayedPatients = patients.filter(p => {
    // Check 1: Must be assigned to this nurse
    if (!isPatientAssignedToNurse(p, activeNurse, currentUser)) return false;

    // Check 2: Bed number must be allocated and must match the nurse's floor
    const patBedFloor = getPatientBedFloorNumber(p);
    if (!patBedFloor || patBedFloor !== nurseFloorNum) return false;

    return true;
  });

  // Vitals helper
  const getPatientSavedVitals = (patientId) => {
    try {
      const raw = localStorage.getItem(getVitalsStorageKey(patientId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const handleOpenVitalsModal = (patient) => {
    setSelectedPatientModal(patient);
    const existing = getPatientSavedVitals(patient.id);
    if (existing) {
      setVitalsForm(existing);
    } else {
      setVitalsForm({
        bp: '120/80',
        pulse: '76',
        temp: '98.6',
        spo2: '99',
        sugar: '110',
        respiration: '16',
        notes: `Patient in Bed ${patient.bed_number || 'Unassigned'} (${getFloorDisplay(patient.bed_number)}) resting comfortably.`,
        ivDrip: 'Normal Saline (500ml) @ 75ml/hr',
        medStatus: 'Scheduled'
      });
    }
    setIsVitalsModalOpen(true);
  };

  const handleOpenMedModal = (patient) => {
    setSelectedPatientModal(patient);
    const existing = getPatientSavedVitals(patient.id);
    if (existing) {
      setVitalsForm(existing);
    }
    setIsMedModalOpen(true);
  };

  const handleOpenBedAssignModal = (patient) => {
    setSelectedPatientModal(patient);
    setNewBedNumber(patient.bed_number ? String(patient.bed_number) : '');
    setIsBedAssignModalOpen(true);
  };

  const handleSaveBedAssignment = async (e) => {
    e.preventDefault();
    if (!selectedPatientModal) return;

    try {
      const parsedBed = newBedNumber ? parseInt(newBedNumber, 10) : null;
      const floorCalculated = getFloorDisplay(parsedBed);

      const bedPayload = {
        bed_number: parsedBed,
        floor: floorCalculated,
        nurse: activeNurse?.id || null,
        nurse_name: activeNurse?.name || ''
      };

      const exactDbId = (selectedPatientModal?.id && !isNaN(Number(selectedPatientModal.id))) ? Number(selectedPatientModal.id) : null;
      const candidateIds = [
        exactDbId,
        selectedPatientModal.appointment_pk,
        selectedPatientModal.id && !isNaN(Number(selectedPatientModal.id)) ? Number(selectedPatientModal.id) : null,
        selectedPatientModal.appointment_id,
        selectedPatientModal.Appoment_id,
        selectedPatientModal.appoment_id,
        typeof selectedPatientModal.id === 'string' && selectedPatientModal.id.startsWith('APT-') ? selectedPatientModal.id.replace('APT-', '') : null,
        typeof selectedPatientModal.id === 'string' ? selectedPatientModal.id.replace(/\D/g, '') : null
      ].filter(Boolean);

      let response = null;
      for (const targetId of Array.from(new Set(candidateIds))) {
        try {
          response = await fetch(`${API_BASE_URL}/super-admin/appointments/${targetId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bedPayload)
          });
          if (response && response.ok) break;

          response = await fetch(`${API_BASE_URL}/super-admin/appointments/${targetId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...selectedPatientModal,
              ...bedPayload
            })
          });
          if (response && response.ok) break;
        } catch (e) {}
      }

      if (!response || !response.ok) {
        try {
          const allApptsRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
          if (allApptsRes && allApptsRes.ok) {
            const allAppts = extractArray(await allApptsRes.json().catch(() => []));
            const patName = (selectedPatientModal.name || selectedPatientModal.patient_name || '').toLowerCase().trim();
            const patPhone = String(selectedPatientModal.contact || selectedPatientModal.phone || '').replace(/\D/g, '');
            const patEmail = (selectedPatientModal.email || '').toLowerCase().trim();

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
              response = await fetch(`${API_BASE_URL}/super-admin/appointments/${matched.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bedPayload)
              }).catch(() => null);
            }
          }
        } catch (e) {}
      }

      if (response && response.ok) {
        const updated = await response.json();
        setPatients(prev => prev.map(p => p.id === selectedPatientModal.id ? { ...p, ...updated, bed_number: parsedBed, floor: floorCalculated } : p));
        setActionSuccessMsg(`Bed updated for ${selectedPatientModal.name}: ${parsedBed ? `Bed #${parsedBed} (${floorCalculated})` : 'Bed Unassigned'}`);
        setTimeout(() => setActionSuccessMsg(''), 4000);
        setIsBedAssignModalOpen(false);
      } else {
        alert('Failed to update bed number in backend.');
      }
    } catch (err) {
      console.error('Error assigning bed:', err);
      alert('Error updating patient bed assignment.');
    }
  };

  const handleSaveVitals = (e) => {
    e.preventDefault();
    if (!selectedPatientModal) return;

    try {
      const record = {
        ...vitalsForm,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        recordedBy: `Nurse ${nurseName}`
      };
      localStorage.setItem(getVitalsStorageKey(selectedPatientModal.id), JSON.stringify(record));
      
      setActionSuccessMsg(`Vitals & Care Chart updated successfully for ${selectedPatientModal.name}!`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
      setIsVitalsModalOpen(false);
      setIsMedModalOpen(false);
    } catch (err) {
      console.error('Error saving vitals:', err);
    }
  };

  const healthCareOptions = [
    'Done',
    'Not Done',
    'Fully Recovered',
    'Recovering',
    'No Significant Change'
  ];

  const handleUpdateHealthCare = async (patient, newHealthCare) => {
    if (!patient || !patient.id) return;
    setUpdatingPatientId(patient.id);
    try {
      const exactDbId = (patient?.id && !isNaN(Number(patient.id))) ? Number(patient.id) : null;
      const candidateIds = [
        exactDbId,
        patient.appointment_pk,
        patient.id && !isNaN(Number(patient.id)) ? Number(patient.id) : null,
        patient.appointment_id,
        patient.Appoment_id,
        patient.appoment_id,
        typeof patient.id === 'string' && patient.id.startsWith('APT-') ? patient.id.replace('APT-', '') : null,
        typeof patient.id === 'string' ? patient.id.replace(/\D/g, '') : null
      ].filter(Boolean);

      let isSuccess = false;
      let updatedData = null;

      for (const targetId of Array.from(new Set(candidateIds))) {
        try {
          const res = await fetch(`${API_BASE_URL}/super-admin/appointments/${targetId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Health_Care: newHealthCare, health_care: newHealthCare })
          });
          if (res && res.ok) {
            isSuccess = true;
            updatedData = await res.json().catch(() => null);
            break;
          }
        } catch (e) {}
      }

      setPatients(prev => prev.map(p => {
        if (p.id === patient.id || (patient.Appoment_id && p.Appoment_id === patient.Appoment_id)) {
          return { ...p, ...(updatedData || {}), Health_Care: newHealthCare, health_care: newHealthCare };
        }
        return p;
      }));

      setActionSuccessMsg(`Health Care updated to "${newHealthCare}" for ${patient.name || 'Patient'}!`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating Health Care:', err);
      alert('Failed to update Health Care in backend.');
    } finally {
      setUpdatingPatientId(null);
    }
  };

  // Condition helper
  const getPatientCondition = (p) => {
    return p.Condation || p.condation || p.condition || p.Condition || p.symptoms_severity || 'Normal';
  };

  const isPatientCheckupDone = (patient) => {
    if (!patient) return false;
    return (
      patient.checkup_status === 'Checkup Done' ||
      patient.status === 'Completed' ||
      patient.status === 'Discharged' ||
      patient.status === 'Checked'
    );
  };

  // Filtering by Search + Status on assigned patients
  const filteredPatients = displayedPatients.filter(p => {
    const q = searchTerm.toLowerCase().trim();
    const cond = getPatientCondition(p).toLowerCase();
    const status = (p.status || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const patFormName = (p.patient_name || p.patient_Name || '').toLowerCase();
    const pid = (p.patient_id || p.uhid || `pat-${p.id}`).toLowerCase();
    const apptId = formatAppointmentId(p).toLowerCase();
    const doc = (p.doctor_name || '').toLowerCase();
    const disease = (p.symptoms_diagnosis || p.symptoms || p.reason || '').toLowerCase();
    const bed = p.bed_number ? String(p.bed_number) : '';
    const floor = (p.floor || getFloorDisplay(p.bed_number)).toLowerCase();

    const matchesSearch = !q || name.includes(q) || patFormName.includes(q) || pid.includes(q) || apptId.includes(q) || doc.includes(q) || disease.includes(q) || bed.includes(q) || floor.includes(q);

    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'Critical') {
      matchesStatus = cond.includes('crit') || cond.includes('urg') || cond.includes('emerg');
    } else if (statusFilter === 'Admitted') {
      matchesStatus = !isPatientCheckupDone(p);
    } else if (statusFilter === 'Completed') {
      matchesStatus = isPatientCheckupDone(p);
    }

    return matchesSearch && matchesStatus;
  });

  const criticalCount = displayedPatients.filter(p => {
    const c = getPatientCondition(p).toLowerCase();
    return c.includes('crit') || c.includes('urg') || c.includes('emerg');
  }).length;

  const admittedCount = displayedPatients.filter(p => {
    return !isPatientCheckupDone(p);
  }).length;

  const dischargedCount = displayedPatients.filter(p => {
    return isPatientCheckupDone(p);
  }).length;

  if (!loading && !isApproved) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-amber-200 shadow-xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full mb-2 uppercase tracking-wide">
              Approval Pending
            </span>
            <h2 className="text-xl font-bold text-slate-800">Nurse Access Restricted</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your nurse registration is currently in a <strong>pending state</strong>. Inpatient charts and patient care access must be approved manually by your Hospital Administrator.
            </p>
          </div>
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 text-left space-y-1">
            <p className="font-semibold">Nurse: <span className="font-normal text-slate-700">{nurseName}</span></p>
            <p className="font-semibold">Nurse ID: <span className="font-normal text-slate-700">{nurseIdTag}</span></p>
            <p className="font-semibold">Status: <span className="font-bold text-amber-700">Awaiting Hospital Admin Approval</span></p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                window.location.reload();
              }}
              className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Refresh Approval Status
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('currentPage');
                if (setCurrentPage) setCurrentPage('login');
                else window.location.reload();
              }}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-8 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white font-black flex items-center justify-center text-2xl shadow-lg ring-2 ring-emerald-400/30 shrink-0">
              {nurseName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  {nurseIdTag}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/25 text-teal-200 border border-teal-400/30">
                  {nurseFloor}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  {wardName}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/25 text-blue-200 border border-blue-400/30 inline-flex items-center gap-1 shadow-xs">
                  <span>{hospitalName}</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
                Inpatient Chart & Bed Management
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Patient care and checkup administration for Nurse <span className="font-semibold text-emerald-300">{nurseName}</span> • {nurseFloor}.
              </p>
            </div>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{actionSuccessMsg}</span>
          </div>
          <button type="button" onClick={() => setActionSuccessMsg('')} className="text-emerald-700 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* METRIC STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs ${statusFilter === 'ALL' ? 'ring-2 ring-teal-500 border-teal-400' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">Assigned Patients</p>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-900">{nurseFloor}</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{displayedPatients.length}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Assigned on {nurseFloor}</p>
        </div>

        <div 
          onClick={() => setStatusFilter('Critical')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs bg-rose-50/30 ${statusFilter === 'Critical' ? 'ring-2 ring-rose-500 border-rose-400' : 'border-rose-200 hover:border-rose-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Critical Attention</p>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">{criticalCount}</h3>
          <p className="text-xs text-rose-700/80 mt-0.5 font-medium">Require continuous monitoring</p>
        </div>

        <div 
          onClick={() => setStatusFilter('Admitted')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs bg-emerald-50/30 ${statusFilter === 'Admitted' ? 'ring-2 ring-emerald-500 border-emerald-400' : 'border-emerald-200 hover:border-emerald-300'}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Active Inpatients</p>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{admittedCount}</h3>
          <p className="text-xs text-emerald-700/80 mt-0.5 font-medium">Currently in ward care</p>
        </div>

        <div 
          onClick={() => setStatusFilter('Completed')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs bg-slate-50/50 ${statusFilter === 'Completed' ? 'ring-2 ring-indigo-500 border-indigo-400' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Checkup Done / Stable</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-700 mt-1">{dischargedCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Completed medical care</p>
        </div>
      </div>

      {/* PATIENT TABLE CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-800">Inpatients Bed Chart & Vitals Roster</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {filteredPatients.length} Patients
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Assigned patients and checkup tracking for Nurse {nurseName} • {nurseFloor}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search name, appointment ID, bed, doctor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Status ({displayedPatients.length})</option>
              <option value="Critical">Critical & Urgent ({criticalCount})</option>
              <option value="Admitted">Active Inpatients ({admittedCount})</option>
              <option value="Completed">Checkup Done ({dischargedCount})</option>
            </select>
          </div>
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
              key: 'statusFilter',
              name: 'Status',
              value: statusFilter,
              displayValue: statusFilter === 'Critical' ? 'Critical & Urgent' :
                            statusFilter === 'Admitted' ? 'Active Inpatients' :
                            statusFilter === 'Completed' ? 'Checkup Done' : statusFilter,
              onRemove: () => setStatusFilter('ALL')
            }
          ]}
          onClearAll={() => {
            setSearchTerm('');
            setStatusFilter('ALL');
          }}
        />

        {/* TABLE */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-center text-xs text-slate-600 min-w-[640px]">
            <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">Patient & Appointment ID</th>
                <th className="py-3 px-3 text-center">Bed & Floor</th>
                <th className="py-3 px-3 text-center">Age / Gender</th>
                <th className="py-3 px-3 text-center">Condition & Triage</th>
                <th className="py-3 px-3 text-center">Health Care</th>
                <th className="py-3 px-3 text-center">Doctor Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">Loading ward patients chart...</td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-sm text-slate-700">No assigned patients found for your floor.</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Patients will appear in this table only when assigned to you with a bed allocated on {nurseFloor}.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient, idx) => {
                  const cond = getPatientCondition(patient);
                  const isCrit = cond.toLowerCase().includes('crit') || cond.toLowerCase().includes('emerg');
                  const patientBed = patient.bed_number;
                  const floorText = patient.floor || getFloorDisplay(patientBed);

                  return (
                    <tr key={patient.id || idx} className="hover:bg-slate-50/80 transition">
                      {/* 1. PATIENT NAME & APPOINTMENT ID */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800 text-sm">
                          {patient.patient_name || patient.patient_Name || patient.name || '-'}
                        </div>
                        <div className="font-mono text-[10px] text-teal-700 font-bold">
                          {formatAppointmentId(patient)}
                        </div>
                      </td>

                      {/* 2. BED & FLOOR */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                            patientBed 
                              ? 'bg-teal-100 text-teal-900 border border-teal-300' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {patientBed ? `Bed #${patientBed}` : '-'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-sans font-medium">{floorText}</span>
                        </div>
                      </td>

                      {/* 3. AGE / GENDER */}
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {patient.age ? `${patient.age} Yrs` : '-'} • {patient.Gender || patient.gender || '-'}
                      </td>

                      {/* 4. CONDITION & TRIAGE */}
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                          isCrit ? 'bg-rose-50 text-rose-700 border-rose-300 font-black' :
                          cond.toLowerCase().includes('urg') ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isCrit ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                          {cond}
                        </span>
                      </td>

                      {/* 5. HEALTH CARE (NURSE UPDATE ONLY) */}
                      <td className="py-3 px-3">
                        <select
                          value={patient.Health_Care || patient.health_care || 'Not Done'}
                          onChange={(e) => handleUpdateHealthCare(patient, e.target.value)}
                          disabled={updatingPatientId === patient.id}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer shadow-2xs focus:outline-none focus:ring-2 disabled:opacity-50 ${
                            (patient.Health_Care || patient.health_care) === 'Fully Recovered'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-400'
                              : (patient.Health_Care || patient.health_care) === 'Recovering'
                              ? 'bg-sky-50 text-sky-800 border-sky-300 focus:ring-sky-400'
                              : (patient.Health_Care || patient.health_care) === 'Done'
                              ? 'bg-teal-50 text-teal-800 border-teal-300 focus:ring-teal-400'
                              : (patient.Health_Care || patient.health_care) === 'No Significant Change'
                              ? 'bg-amber-50 text-amber-800 border-amber-300 focus:ring-amber-400'
                              : 'bg-slate-50 text-slate-700 border-slate-300 focus:ring-slate-400'
                          }`}
                        >
                          {healthCareOptions.map((opt) => (
                            <option key={opt} value={opt} className="bg-white text-slate-800">
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 6. DOCTOR STATUS (READ-ONLY FOR NURSE) */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-block ${
                          patient.status === 'Discharged'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : patient.checkup_status === 'Checkup Done'
                            ? 'bg-teal-50 text-teal-800 border-teal-300'
                            : patient.status === 'Admitted'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {patient.status === 'Discharged' ? 'Discharged' : patient.checkup_status === 'Checkup Done' ? 'Consulted' : 'Pending Doctor'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK BED ASSIGN / REALLOCATE MODAL */}
      {isBedAssignModalOpen && selectedPatientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 my-auto p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-800">Assign / Change Inpatient Bed</h3>
                <p className="text-xs text-slate-500">{selectedPatientModal.patient_name || selectedPatientModal.patient_Name || selectedPatientModal.name || 'Patient'} • {formatAppointmentId(selectedPatientModal)}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBedAssignModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBedAssignment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Bed Number (1 - 1000+)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter bed number"
                  value={newBedNumber}
                  onChange={(e) => setNewBedNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* LIVE FLOOR & NURSE PREVIEW */}
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-sky-800">Calculated Floor:</span>
                  <span className="text-xs font-extrabold text-sky-900">{getFloorDisplay(newBedNumber)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-sky-800">Nurse In-Charge:</span>
                  <span className="text-xs font-bold text-emerald-800">
                    {activeNurse?.name || 'Assigned Nurse'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 pt-1">
                  Floor is calculated automatically based on the assigned bed.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBedAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Save Bed Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD VITALS MODAL */}
      {isVitalsModalOpen && selectedPatientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-t-2xl">
              <div>
                <h3 className="font-bold text-base">Record Patient Vitals</h3>
                <p className="text-xs text-emerald-300">
                  {selectedPatientModal.patient_name || selectedPatientModal.patient_Name || selectedPatientModal.name || 'Patient'} • {formatAppointmentId(selectedPatientModal)} • Bed {selectedPatientModal.bed_number ? `#${selectedPatientModal.bed_number}` : 'Unassigned'} ({getFloorDisplay(selectedPatientModal.bed_number)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVitalsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Blood Pressure (mmHg) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 120/80"
                    value={vitalsForm.bp}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Pulse Rate (BPM) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 76"
                    value={vitalsForm.pulse}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Body Temperature (°F) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 98.6"
                    value={vitalsForm.temp}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, temp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Oxygen SpO2 (%) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 99"
                    value={vitalsForm.spo2}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Blood Sugar (mg/dL)</label>
                  <input
                    type="number"
                    placeholder="e.g. 110"
                    value={vitalsForm.sugar}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, sugar: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Respiration Rate (/min)</label>
                  <input
                    type="number"
                    placeholder="e.g. 16"
                    value={vitalsForm.respiration}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, respiration: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">IV Drip / Infusion Details</label>
                <input
                  type="text"
                  placeholder="Enter IV infusion details"
                  value={vitalsForm.ivDrip}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, ivDrip: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Nurse Clinical Observations & Notes</label>
                <textarea
                  rows={3}
                  placeholder="Enter patient condition notes, pain level, consciousness..."
                  value={vitalsForm.notes}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-4 sm:p-5 border-t border-slate-200 shrink-0 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVitalsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Vitals & Update Chart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAR / MEDICATION MODAL */}
      {isMedModalOpen && selectedPatientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-t-2xl">
              <div>
                <h3 className="font-bold text-base">Medication Administration Record (MAR)</h3>
                <p className="text-xs text-emerald-300">
                  {selectedPatientModal.patient_name || selectedPatientModal.patient_Name || selectedPatientModal.name || 'Patient'} • {formatAppointmentId(selectedPatientModal)} • Bed {selectedPatientModal.bed_number ? `#${selectedPatientModal.bed_number}` : 'Unassigned'} ({getFloorDisplay(selectedPatientModal.bed_number)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMedModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Attending Physician Diagnosis</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedPatientModal.symptoms_diagnosis || selectedPatientModal.reason || 'General Clinical Care'}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Active IV Fluid / Saline Infusion</label>
                <input
                  type="text"
                  value={vitalsForm.ivDrip}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, ivDrip: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Dose Administration Status</label>
                <select
                  value={vitalsForm.medStatus}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, medStatus: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Administered">Administered (Dose Given)</option>
                  <option value="Scheduled">Scheduled for Next Shift</option>
                  <option value="Held / Doctor Review">Held Pending Doctor Review</option>
                  <option value="Completed Course">Completed Course</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Nursing Administration Notes</label>
                <textarea
                  rows={3}
                  value={vitalsForm.notes}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                  placeholder="Record dose administration notes, allergies, adverse reactions..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-4 sm:p-5 border-t border-slate-200 shrink-0 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMedModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save MAR Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NursePatients;
