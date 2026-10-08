import React, { useState, useEffect } from 'react';
import { API_BASE_URL, extractArray } from '../Api/Api';

const getFloorDisplay = (floorOrBed) => {
  if (!floorOrBed) return 'Not Assigned';
  if (typeof floorOrBed === 'string' && floorOrBed.toLowerCase().startsWith('floor')) return floorOrBed;
  const num = Number(floorOrBed);
  if (isNaN(num) || num <= 0) return 'Not Assigned';
  const floorNum = Math.floor((num - 1) / 100) + 1;
  return `Floor ${floorNum}`;
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

    const loadData = async () => {
      try {
        setLoading(true);
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
        if (isMounted) {
          setPatients(filtered);
        }
      } catch (err) {
        console.error('Error loading nurse patients data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [currentUser]);

  const activeNurse = nurseInfo || currentUser;
  const nurseName = activeNurse?.name || currentUser?.name || 'Nurse';
  const roleName = activeNurse?.nurse_role || activeNurse?.role || currentUser?.nurse_role || currentUser?.role || 'Staff Nurse';
  const wardName = activeNurse?.ward || currentUser?.ward || 'General Care Ward';
  const hospitalName = hospitalInfo?.Name || hospitalInfo?.name || activeNurse?.hospital_name || currentUser?.hospital_name || (typeof activeNurse?.hospital === 'object' ? activeNurse.hospital?.Name : null) || 'Not Provided';
  const nurseIdTag = activeNurse?.nurse_id || currentUser?.nurse_id || `NUR-${currentUser?.id || '01'}`;
  const nurseFloor = activeNurse?.floor || 'Floor 1';
  const targetHospId = typeof activeNurse?.hospital === 'object' ? activeNurse?.hospital?.id : (activeNurse?.hospital || currentUser?.hospital);

  const nurseNameLower = (nurseName || '').toLowerCase().trim();
  const nurseIdNum = activeNurse?.id ? Number(activeNurse.id) : null;

  const myAssignedPatients = patients.filter(p => {
    const pNurseId = typeof p.nurse === 'object' ? p.nurse?.id : p.nurse;
    if (nurseIdNum && Number(pNurseId) === nurseIdNum) return true;
    if (p.nurse_name && p.nurse_name.toLowerCase().trim() === nurseNameLower) return true;
    return false;
  });

  const displayedPatients = myAssignedPatients.length > 0 ? myAssignedPatients : patients;

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

      const candidateIds = [
        selectedPatientModal.appointment_pk,
        selectedPatientModal.appointment_id,
        selectedPatientModal.Appoment_id,
        selectedPatientModal.appoment_id,
        selectedPatientModal.id,
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

  const statusOptions = ['Admitted', 'Under Observation', 'Pending', 'Assigned', 'Completed', 'Discharged', 'Cancelled'];

  const handleUpdatePatientStatus = async (patient, newStatus) => {
    if (!patient || !patient.id) return;
    setUpdatingPatientId(patient.id);
    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/Patients/${patient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response && response.ok) {
        const updated = await response.json();
        setPatients(prev => prev.map(p => p.id === patient.id ? { ...p, ...updated, status: newStatus } : p));
      } else {
        setPatients(prev => prev.map(p => p.id === patient.id ? { ...p, status: newStatus } : p));
      }

      setActionSuccessMsg(`Status updated to "${newStatus}" for ${patient.name || 'Patient'}!`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating patient status:', err);
      alert('Failed to update status in backend.');
    } finally {
      setUpdatingPatientId(null);
    }
  };

  const isPatientCheckupDone = (patient) => {
    if (!patient) return false;
    const s = (patient.status || '').toLowerCase().trim();
    if (s === 'completed' || s === 'discharged' || s === 'checkup done' || s.includes('checkup done') || s.includes('done')) return true;
    try {
      const stored = localStorage.getItem(`nurse_checkup_${patient.id}`);
      if (stored === 'Done') return true;
      if (stored === 'Not Done') return false;
    } catch {}
    return false;
  };

  const handleUpdateCheckupStatus = async (patient, newCheckupValue) => {
    if (!patient || !patient.id) return;
    setUpdatingPatientId(patient.id);
    const isDone = newCheckupValue === 'Checkup Done';
    const backendStatus = isDone ? 'Completed' : 'Admitted';

    try {
      localStorage.setItem(`nurse_checkup_${patient.id}`, isDone ? 'Done' : 'Not Done');

      await fetch(`${API_BASE_URL}/super-admin/Patients/${patient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: backendStatus })
      }).catch(() => null);

      setPatients(prev => prev.map(p => p.id === patient.id ? { ...p, status: backendStatus } : p));
      setActionSuccessMsg(
        isDone
          ? `Checkup Done marked for Patient #${patient.id} (${patient.name || 'Patient'})!`
          : `Checkup Not Done marked for Patient #${patient.id} (${patient.name || 'Patient'}).`
      );
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating checkup status:', err);
    } finally {
      setUpdatingPatientId(null);
    }
  };

  // Condition helper
  const getPatientCondition = (p) => {
    return p.Condation || p.condation || p.condition || p.Condition || p.symptoms_severity || 'Normal';
  };

  // Filtering by Search + Status on assigned patients
  const filteredPatients = displayedPatients.filter(p => {
    const q = searchTerm.toLowerCase().trim();
    const cond = getPatientCondition(p).toLowerCase();
    const status = (p.status || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const pid = (p.patient_id || p.uhid || `pat-${p.id}`).toLowerCase();
    const doc = (p.doctor_name || '').toLowerCase();
    const disease = (p.symptoms_diagnosis || p.symptoms || p.reason || '').toLowerCase();
    const bed = p.bed_number ? String(p.bed_number) : '';
    const floor = (p.floor || getFloorDisplay(p.bed_number)).toLowerCase();

    const matchesSearch = !q || name.includes(q) || pid.includes(q) || doc.includes(q) || disease.includes(q) || bed.includes(q) || floor.includes(q);

    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'Critical') {
      matchesStatus = cond.includes('crit') || cond.includes('urg') || cond.includes('emerg');
    } else if (statusFilter === 'Admitted') {
      matchesStatus = status.includes('admit') || status.includes('inpatient') || status.includes('care');
    } else if (statusFilter === 'Completed') {
      matchesStatus = status.includes('complet') || status.includes('discharg');
    }

    return matchesSearch && matchesStatus;
  });

  const criticalCount = displayedPatients.filter(p => {
    const c = getPatientCondition(p).toLowerCase();
    return c.includes('crit') || c.includes('urg') || c.includes('emerg');
  }).length;

  const admittedCount = displayedPatients.filter(p => {
    const s = (p.status || '').toLowerCase();
    return s.includes('admit') || s.includes('inpatient') || s.includes('care') || !s.includes('discharg');
  }).length;

  const dischargedCount = displayedPatients.filter(p => {
    const s = (p.status || '').toLowerCase();
    return s.includes('discharg') || s.includes('complet');
  }).length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 w-full overflow-x-hidden">
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
                placeholder="Search name, UHID, bed, doctor..."
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

        {/* TABLE */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-center text-xs text-slate-600 min-w-[640px]">
            <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">Bed & Floor</th>
                <th className="py-3 px-3 text-center">Patient & UHID</th>
                <th className="py-3 px-3 text-center">Age / Gender</th>
                <th className="py-3 px-3 text-center">Condition & Triage</th>
                <th className="py-3 px-3 text-center">Care Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">Loading ward patients chart...</td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">No patients matching current filter.</p>
                    <p className="text-xs text-slate-400 mt-1">Try switching filters or search keyword.</p>
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
                      {/* BED & FLOOR */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                            patientBed 
                              ? 'bg-teal-100 text-teal-900 border border-teal-300' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {patientBed ? `Bed #${patientBed}` : 'Unassigned'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-sans font-medium">{floorText}</span>
                        </div>
                      </td>

                      {/* PATIENT NAME & UHID */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800 text-sm">{patient.name}</div>
                        <div className="font-mono text-[10px] text-teal-700 font-bold">{patient.patient_id || patient.uhid || `PAT-${patient.id}`}</div>
                      </td>

                      {/* AGE / GENDER */}
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {patient.age ? `${patient.age} Yrs` : 'Adult'} • {patient.Gender || patient.gender || 'Not Specified'}
                      </td>

                      {/* CONDITION & TRIAGE */}
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

                      {/* CARE STATUS (LOADED FROM BACKEND & EDITABLE BY NURSE) */}
                      <td className="py-3 px-3">
                        <select
                          value={patient.status || 'Admitted'}
                          onChange={(e) => handleUpdatePatientStatus(patient, e.target.value)}
                          disabled={updatingPatientId === patient.id}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer shadow-2xs focus:outline-none focus:ring-2 disabled:opacity-50 ${
                            patient.status === 'Completed' || patient.status === 'Discharged'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-400'
                              : patient.status === 'Under Observation'
                              ? 'bg-purple-50 text-purple-800 border-purple-300 focus:ring-purple-400'
                              : patient.status === 'Admitted'
                              ? 'bg-blue-50 text-blue-800 border-blue-300 focus:ring-blue-400'
                              : patient.status === 'Pending' || patient.status === 'Assigned'
                              ? 'bg-amber-50 text-amber-800 border-amber-300 focus:ring-amber-400'
                              : patient.status === 'Cancelled'
                              ? 'bg-rose-50 text-rose-800 border-rose-300 focus:ring-rose-400'
                              : 'bg-slate-50 text-slate-800 border-slate-300 focus:ring-slate-400'
                          }`}
                        >
                          {!statusOptions.includes(patient.status) && patient.status && (
                            <option value={patient.status} className="bg-white text-slate-800">
                              {patient.status}
                            </option>
                          )}
                          {statusOptions.map((st) => (
                            <option key={st} value={st} className="bg-white text-slate-800">
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* ACTIONS: ONLY CHECKUP DONE OR NOT DONE */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <select
                            value={isPatientCheckupDone(patient) ? 'Checkup Done' : 'Checkup Not Done'}
                            onChange={(e) => handleUpdateCheckupStatus(patient, e.target.value)}
                            disabled={updatingPatientId === patient.id}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-2xs focus:outline-none focus:ring-2 disabled:opacity-50 ${
                              isPatientCheckupDone(patient)
                                ? 'bg-emerald-600 text-white border-emerald-600 focus:ring-emerald-400'
                                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 focus:ring-amber-400'
                            }`}
                          >
                            <option value="Checkup Not Done" className="bg-white text-slate-800">Checkup Not Done</option>
                            <option value="Checkup Done" className="bg-white text-slate-800">Checkup Done</option>
                          </select>
                        </div>
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
                <p className="text-xs text-slate-500">{selectedPatientModal.name} • {selectedPatientModal.patient_id || `PAT-${selectedPatientModal.id}`}</p>
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
                  placeholder="e.g. 45 (Floor 1) or 150 (Floor 2)"
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
                  {selectedPatientModal.name} • {selectedPatientModal.patient_id || `PAT-${selectedPatientModal.id}`} • Bed {selectedPatientModal.bed_number ? `#${selectedPatientModal.bed_number}` : 'Unassigned'} ({getFloorDisplay(selectedPatientModal.bed_number)})
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
                  placeholder="e.g. Normal Saline (500ml) @ 75ml/hr"
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
                  {selectedPatientModal.name} • Bed {selectedPatientModal.bed_number ? `#${selectedPatientModal.bed_number}` : 'Unassigned'} ({getFloorDisplay(selectedPatientModal.bed_number)})
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
