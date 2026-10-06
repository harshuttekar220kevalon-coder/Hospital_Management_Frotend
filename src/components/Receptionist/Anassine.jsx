import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

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

  // 2. Fallback: distribute evenly or pick on-duty hospital nurse
  const chosen = activeNurses[(Number(bedNumber) % activeNurses.length)] || activeNurses[0];
  return { nurseId: chosen.id, nurseName: chosen.name, reason: `Station Floor ${floor} Ward Staff` };
};

const ReceptionistAnassine = ({ currentUser, setCurrentPage, setSelectedPatient, setSelectedDoctorForPatient }) => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('ALL_UNASSIGNED'); // 'ALL_UNASSIGNED' | 'NO_DOCTOR' | 'NO_BED' | 'PENDING'
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  // Modal State for Doctor & Timing Assignment
  const [doctorModalPatient, setDoctorModalPatient] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedAppDate, setSelectedAppDate] = useState('');
  const [selectedAppSlot, setSelectedAppSlot] = useState('10:00 AM');
  const [updatingDoctor, setUpdatingDoctor] = useState(false);

  // Modal State for Bed & Auto-Nurse Allocation
  const [bedModalPatient, setBedModalPatient] = useState(null);
  const [selectedBedNumber, setSelectedBedNumber] = useState('');
  const [selectedNurseId, setSelectedNurseId] = useState('');
  const [autoNurseNotice, setAutoNurseNotice] = useState('');
  const [updatingBed, setUpdatingBed] = useState(false);

  // Modal State for Fast Triage / Full Multi-Assignment
  const [triageModalPatient, setTriageModalPatient] = useState(null);
  const [triageFormData, setTriageFormData] = useState({
    doctor: '',
    appointment_date: '',
    appointment_time: '10:00 AM',
    bed_number: '',
    nurse: '',
    status: 'Assigned',
    Condation: 'Normal',
    consultation_fee: '500'
  });
  const [updatingTriage, setUpdatingTriage] = useState(false);

  const userHospId = currentUser?.hospital || (typeof currentUser?.hospital_data === 'object' ? currentUser?.hospital_data?.id : null);

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM',
    '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM'
  ];

  useEffect(() => {
    fetchAllData();
  }, [currentUser]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [patRes, docRes, hospRes, nurRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Patients/`),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`),
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`)
      ]);

      let patData = [];
      let docData = [];
      let hospData = [];
      let nurData = [];

      if (patRes.status === 'fulfilled' && patRes.value.ok) patData = await patRes.value.json().catch(() => []);
      if (docRes.status === 'fulfilled' && docRes.value.ok) docData = await docRes.value.json().catch(() => []);
      if (hospRes.status === 'fulfilled' && hospRes.value.ok) hospData = await hospRes.value.json().catch(() => []);
      if (nurRes.status === 'fulfilled' && nurRes.value.ok) nurData = await nurRes.value.json().catch(() => []);

      setHospitals(Array.isArray(hospData) ? hospData : []);
      setDoctors(Array.isArray(docData) ? docData : []);
      setNurses(Array.isArray(nurData) ? nurData : []);

      // Filter patients by hospital if receptionist is assigned to a specific hospital
      const filteredPats = userHospId && Array.isArray(patData)
        ? patData.filter(p => Number(typeof p.hospital === 'object' ? p.hospital?.id : p.hospital) === Number(userHospId))
        : (Array.isArray(patData) ? patData : []);

      setPatients(filteredPats);
    } catch (err) {
      console.error('Error fetching unassigned patients data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine if doctor is unassigned
  const isDoctorUnassigned = (p) => {
    return !p.doctor || p.doctor === null || p.doctor === '' || p.doctor_name === '' || !p.doctor_name;
  };

  // Helper to determine if bed is unassigned (especially if marked for admit or missing bed)
  const isBedUnassigned = (p) => {
    const isAdmit = (p.status || '').toLowerCase().includes('admit');
    return (!p.bed_number || p.bed_number === null || p.bed_number === '') && (isAdmit || !p.bed_number);
  };

  const isStatusPending = (p) => {
    const s = (p.status || '').toLowerCase();
    return s.includes('unassign') || s.includes('pending') || s.includes('wait') || s.includes('admit_req') || s === '';
  };

  // Patients who are unassigned (missing doctor, missing bed, or pending triage)
  // And EXCLUDE already discharged patients from this active triage queue
  const unassignedPatientsList = patients.filter(p => {
    const s = (p.status || '').toLowerCase();
    if (s.includes('discharg') || s.includes('complet')) return false;

    const noDoc = isDoctorUnassigned(p);
    const noBed = isBedUnassigned(p);
    const pending = isStatusPending(p);
    return noDoc || noBed || pending;
  });

  // Filter based on active tab
  const tabFilteredPatients = unassignedPatientsList.filter(p => {
    if (activeTab === 'NO_DOCTOR') return isDoctorUnassigned(p);
    if (activeTab === 'NO_BED') return isBedUnassigned(p);
    if (activeTab === 'PENDING') return isStatusPending(p);
    return true; // ALL_UNASSIGNED
  });

  // Apply Search & Severity Filters
  const displayedPatients = tabFilteredPatients.filter(p => {
    const term = searchTerm.toLowerCase();
    const pName = (p.name || '').toLowerCase();
    const pId = (p.patient_id || p.uhid || `pat-${p.id}`).toLowerCase();
    const pContact = (p.contact || p.phone || '').toLowerCase();
    const pDiag = (p.symptoms_diagnosis || '').toLowerCase();

    const matchesSearch = pName.includes(term) || pId.includes(term) || pContact.includes(term) || pDiag.includes(term);
    const pCond = p.Condation || p.condition || p.symptoms_severity || 'Normal';
    const matchesSeverity = severityFilter === 'ALL' || pCond.toLowerCase() === severityFilter.toLowerCase();

    return matchesSearch && matchesSeverity;
  });

  // Stats calculation
  const totalUnassignedCount = unassignedPatientsList.length;
  const noDoctorCount = unassignedPatientsList.filter(isDoctorUnassigned).length;
  const noBedCount = unassignedPatientsList.filter(isBedUnassigned).length;
  const emergencyUnassignedCount = unassignedPatientsList.filter(p => {
    const c = (p.Condation || p.condition || p.symptoms_severity || '').toLowerCase();
    return c.includes('emergency') || c.includes('critical') || c.includes('urgent');
  }).length;

  // 1. Handle Doctor & Timing Assignment Modal
  const handleOpenDoctorModal = (patient) => {
    setDoctorModalPatient(patient);
    setSelectedDocId(patient.doctor ? String(patient.doctor) : '');
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedAppDate(patient.appointment_date || todayStr);
    setSelectedAppSlot(patient.appointment_time || '10:00 AM');
  };

  const handleSaveDoctorAssignment = async (e) => {
    e.preventDefault();
    if (!selectedDocId) {
      alert('Please select a doctor to assign.');
      return;
    }

    const chosenDoc = doctors.find(d => Number(d.id) === Number(selectedDocId));
    if (!chosenDoc) {
      alert('Selected doctor details not found.');
      return;
    }

    try {
      setUpdatingDoctor(true);
      const hospId = Number(typeof doctorModalPatient.hospital === 'object' ? doctorModalPatient.hospital?.id : doctorModalPatient.hospital) || doctorModalPatient.hospital;
      const updatePayload = {
        ...doctorModalPatient,
        hospital: hospId,
        doctor: Number(chosenDoc.id),
        doctor_name: chosenDoc.name,
        doctor_id: chosenDoc.doctor_id || (chosenDoc.id ? `DOC-${chosenDoc.id}` : null),
        doctor_specialization: chosenDoc.specialization || chosenDoc.specialty || '',
        appointment_date: selectedAppDate,
        appointment_time: selectedAppSlot,
        visit_date_time: scheduledVisitIso,
        consultation_fee: chosenDoc.consultation_fee || doctorModalPatient.consultation_fee || 500,
        status: 'Assigned'
      };

      let response = await fetch(`${API_BASE_URL}/super-admin/Patients/${patId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch(`${API_BASE_URL}/super-admin/Patients/${patId}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        }).catch(() => null);
      }

      if (response && response.ok) {
        alert(`Success! Dr. ${chosenDoc.name} assigned to patient ${doctorModalPatient.name} on ${selectedAppDate} at ${selectedAppSlot}. Patient will now appear in Dr. ${chosenDoc.name}'s active queue.`);
        setDoctorModalPatient(null);
        setSelectedDocId('');
        fetchAllData();
      } else {
        alert('Failed to assign doctor. Please verify backend connection.');
      }
    } catch (err) {
      console.error('Error assigning doctor:', err);
      alert('Error connecting to backend.');
    } finally {
      setUpdatingDoctor(false);
    }
  };

  // 2. Handle Bed & Auto-Nurse Allocation Modal
  const handleOpenBedModal = (patient) => {
    setBedModalPatient(patient);
    const existingBed = patient.bed_number ? String(patient.bed_number) : '';
    setSelectedBedNumber(existingBed);

    const hospId = typeof patient.hospital === 'object' ? patient.hospital?.id : patient.hospital;
    if (existingBed) {
      const autoRes = getAutoNurseForBed(existingBed, nurses, hospId);
      setSelectedNurseId(patient.nurse ? String(patient.nurse) : (autoRes.nurseId ? String(autoRes.nurseId) : ''));
      setAutoNurseNotice(autoRes.reason);
    } else {
      setSelectedNurseId(patient.nurse ? String(patient.nurse) : '');
      setAutoNurseNotice('');
    }
  };

  const handleBedNumberChange = (val) => {
    setSelectedBedNumber(val);
    if (val && bedModalPatient) {
      const hospId = typeof bedModalPatient.hospital === 'object' ? bedModalPatient.hospital?.id : bedModalPatient.hospital;
      const autoRes = getAutoNurseForBed(val, nurses, hospId);
      if (autoRes.nurseId) {
        setSelectedNurseId(String(autoRes.nurseId));
        setAutoNurseNotice(`Auto-Assigned based on Bed #${val} (Floor ${getFloorNumber(val)}): Nurse ${autoRes.nurseName}`);
      }
    } else {
      setAutoNurseNotice('');
    }
  };

  const handleSaveBedAllocation = async (e) => {
    e.preventDefault();
    if (!selectedBedNumber) {
      alert('Please enter a valid bed number.');
      return;
    }

    const parsedBed = Number(selectedBedNumber);
    const hospId = typeof bedModalPatient.hospital === 'object' ? bedModalPatient.hospital?.id : bedModalPatient.hospital;
    const autoRes = getAutoNurseForBed(parsedBed, nurses, hospId);

    const chosenNurseId = selectedNurseId ? Number(selectedNurseId) : autoRes.nurseId;
    const chosenNurse = nurses.find(n => Number(n.id) === chosenNurseId);

    try {
      setUpdatingBed(true);
      const patId = bedModalPatient.id;
      const updatePayload = {
        ...bedModalPatient,
        bed_number: parsedBed,
        nurse: chosenNurse ? Number(chosenNurse.id) : null,
        nurse_name: chosenNurse ? chosenNurse.name : (autoRes.nurseName || ''),
        status: 'Admitted',
        Hospitals_Chargies: bedModalPatient.Hospitals_Chargies || 1500,
        hospital_charges: bedModalPatient.hospital_charges || 1500
      };

      let response = await fetch(`${API_BASE_URL}/super-admin/Patients/${patId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch(`${API_BASE_URL}/super-admin/Patients/${patId}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        }).catch(() => null);
      }

      if (response && response.ok) {
        alert(`Success! Bed #${parsedBed} (Floor ${getFloorNumber(parsedBed)}) allocated to ${bedModalPatient.name}. Nurse ${chosenNurse?.name || autoRes.nurseName || 'Station Staff'} has been assigned.`);
        setBedModalPatient(null);
        setSelectedBedNumber('');
        setSelectedNurseId('');
        fetchAllData();
      } else {
        alert('Failed to allocate bed. Please verify backend connection.');
      }
    } catch (err) {
      console.error('Error allocating bed:', err);
      alert('Error connecting to backend.');
    } finally {
      setUpdatingBed(false);
    }
  };

  // 3. Handle Full Triage Modal
  const handleOpenTriageModal = (patient) => {
    setTriageModalPatient(patient);
    const todayStr = new Date().toISOString().split('T')[0];
    const hospId = typeof patient.hospital === 'object' ? patient.hospital?.id : patient.hospital;
    const autoRes = patient.bed_number ? getAutoNurseForBed(patient.bed_number, nurses, hospId) : { nurseId: '' };

    setTriageFormData({
      doctor: patient.doctor ? String(patient.doctor) : '',
      appointment_date: patient.appointment_date || todayStr,
      appointment_time: patient.appointment_time || '10:00 AM',
      bed_number: patient.bed_number ? String(patient.bed_number) : '',
      nurse: patient.nurse ? String(patient.nurse) : (autoRes.nurseId ? String(autoRes.nurseId) : ''),
      status: patient.status || 'Assigned',
      Condation: patient.Condation || patient.condition || '',
      consultation_fee: patient.consultation_fee || '500'
    });
  };

  const handleTriageBedChange = (val) => {
    const hospId = typeof triageModalPatient.hospital === 'object' ? triageModalPatient.hospital?.id : triageModalPatient.hospital;
    const autoRes = val ? getAutoNurseForBed(val, nurses, hospId) : { nurseId: '' };

    setTriageFormData(prev => ({
      ...prev,
      bed_number: val,
      nurse: autoRes.nurseId ? String(autoRes.nurseId) : prev.nurse
    }));
  };

  const handleSaveTriage = async (e) => {
    e.preventDefault();
    try {
      setUpdatingTriage(true);
      const patId = triageModalPatient.id;
      const chosenDoc = doctors.find(d => Number(d.id) === Number(triageFormData.doctor));
      const parsedBed = triageFormData.bed_number ? Number(triageFormData.bed_number) : null;
      const hospId = Number(typeof triageModalPatient.hospital === 'object' ? triageModalPatient.hospital?.id : triageModalPatient.hospital) || triageModalPatient.hospital;
      const autoRes = parsedBed ? getAutoNurseForBed(parsedBed, nurses, hospId) : { nurseId: null, nurseName: '' };
      const chosenNurse = nurses.find(n => Number(n.id) === Number(triageFormData.nurse)) || (autoRes.nurseId ? nurses.find(n => Number(n.id) === autoRes.nurseId) : null);

      const scheduledVisitIso = triageFormData.appointment_date ? `${triageFormData.appointment_date}T10:00:00` : null;

      const updatePayload = {
        ...triageModalPatient,
        hospital: hospId,
        doctor: chosenDoc ? Number(chosenDoc.id) : null,
        doctor_name: chosenDoc ? chosenDoc.name : '',
        doctor_id: chosenDoc ? (chosenDoc.doctor_id || `DOC-${chosenDoc.id}`) : null,
        doctor_specialization: chosenDoc ? (chosenDoc.specialization || chosenDoc.specialty || '') : '',
        appointment_date: triageFormData.appointment_date,
        appointment_time: triageFormData.appointment_time,
        visit_date_time: scheduledVisitIso,
        bed_number: parsedBed,
        nurse: chosenNurse ? Number(chosenNurse.id) : null,
        nurse_name: chosenNurse ? chosenNurse.name : '',
        status: parsedBed ? 'Admitted' : (triageFormData.status || 'Assigned'),
        Condation: triageFormData.Condation,
        condation: triageFormData.Condation,
        condition: triageFormData.Condation,
        symptoms_severity: triageFormData.Condation,
        consultation_fee: chosenDoc?.consultation_fee || Number(triageFormData.consultation_fee) || 500
      };

      let response = await fetch(`${API_BASE_URL}/super-admin/Patients/${patId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch(`${API_BASE_URL}/super-admin/Patients/${patId}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        }).catch(() => null);
      }

      if (response && response.ok) {
        alert(`Success! Triage & assignment completed for patient ${triageModalPatient.name}.`);
        setTriageModalPatient(null);
        fetchAllData();
      } else {
        alert('Failed to update patient triage. Please check backend connection.');
      }
    } catch (err) {
      console.error('Error in triage assignment:', err);
      alert('Error updating patient details.');
    } finally {
      setUpdatingTriage(false);
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAllData}
              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Queue
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('receptionist_patients')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              All Admissions Directory
            </button>
          </div>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setActiveTab('ALL_UNASSIGNED')}
          className={`p-4 rounded-2xl bg-white border shadow-xs cursor-pointer transition ${activeTab === 'ALL_UNASSIGNED' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-amber-300'}`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Awaiting Action</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">{totalUnassignedCount}</h3>
          <p className="text-[11px] text-amber-600 font-medium mt-0.5">Self-bookings & Admit queue</p>
        </div>

        <div 
          onClick={() => setActiveTab('NO_DOCTOR')}
          className={`p-4 rounded-2xl bg-white border shadow-xs cursor-pointer transition ${activeTab === 'NO_DOCTOR' ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-200 hover:border-teal-300'}`}
        >
          <p className="text-[11px] font-semibold text-teal-600 uppercase">Awaiting Doctor & Slot</p>
          <h3 className="text-xl sm:text-2xl font-bold text-teal-700 mt-1">{noDoctorCount}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Needs Doctor assignment</p>
        </div>

        <div 
          onClick={() => setActiveTab('NO_BED')}
          className={`p-4 rounded-2xl bg-white border shadow-xs cursor-pointer transition ${activeTab === 'NO_BED' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300'}`}
        >
          <p className="text-[11px] font-semibold text-blue-600 uppercase">Awaiting Bed & Nurse</p>
          <h3 className="text-xl sm:text-2xl font-bold text-blue-700 mt-1">{noBedCount}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Needs Bed allocation</p>
        </div>

        <div 
          onClick={() => { setActiveTab('ALL_UNASSIGNED'); setSeverityFilter('Emergency'); }}
          className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs cursor-pointer hover:border-rose-400 transition"
        >
          <p className="text-[11px] font-semibold text-rose-600 uppercase">Emergency / Critical</p>
          <h3 className="text-xl sm:text-2xl font-bold text-rose-700 mt-1">{emergencyUnassignedCount}</h3>
          <p className="text-[11px] text-rose-500 font-semibold mt-0.5">Requires fast triage</p>
        </div>
      </div>

      {/* TABS, SEARCH AND FILTERS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
          {[
            { id: 'ALL_UNASSIGNED', label: 'All Unassigned', count: totalUnassignedCount },
            { id: 'NO_DOCTOR', label: 'Doctor Not Assigned (Self-Booked)', count: noDoctorCount },
            { id: 'NO_BED', label: 'Bed / Ward Required', count: noBedCount },
            { id: 'PENDING', label: 'Pending Triage Status', count: unassignedPatientsList.filter(isStatusPending).length }
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
              <option value="Serious">Serious</option>
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
                <th className="py-3 px-3">Patient UHID & Name</th>
                <th className="py-3 px-3">Age / Gender / Blood</th>
                <th className="py-3 px-3">Condition</th>
                <th className="py-3 px-3">Assigned Doctor & Slot</th>
                <th className="py-3 px-3">Bed & Nurse</th>
                <th className="py-3 px-3">Symptoms / Chief Complaint</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Quick Allocation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">Loading unassigned patients queue...</td>
                </tr>
              ) : displayedPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
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
                          {p.patient_id || p.uhid || `PAT-${p.id}`}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{p.contact || p.phone || 'No phone'}</div>
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        {p.age ? `${p.age} Yrs` : '-'} • {p.gender || 'Male'}
                        {p.blood_group && <span className="block font-bold text-rose-600">{p.blood_group}</span>}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border ${condColor}`}>
                          {cond}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {noDoc ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              No Doctor Assigned
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenDoctorModal(p)}
                              className="block text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
                            >
                              + Assign Doctor & Slot
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-800">{p.doctor_name || `Dr. #${p.doctor}`}</div>
                            {p.doctor_specialization && <span className="text-[10px] text-teal-600 block">{p.doctor_specialization}</span>}
                            {p.appointment_time && (
                              <span className="text-[10px] font-semibold text-slate-500 block">
                                🕒 {p.appointment_date ? `${p.appointment_date}, ` : ''}{p.appointment_time}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {noBed ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Unassigned Bed
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenBedModal(p)}
                              className="block text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                            >
                              + Allocate Bed & Nurse
                            </button>
                          </div>
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          (p.status || '').toLowerCase().includes('admit') ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          (p.status || '').toLowerCase().includes('assign') ? 'bg-teal-50 text-teal-700 border-teal-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {p.status || 'Unassigned'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenTriageModal(p)}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] shadow-xs transition cursor-pointer"
                            title="Complete Triage & Dispatch"
                          >
                            Triage / Assign
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewPatientDetails(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition cursor-pointer"
                          >
                            Details
                          </button>
                        </div>
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

      {/* MODAL 1: ASSIGN DOCTOR & TIMING */}
      {doctorModalPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Assign Consulting Doctor & Timing</h3>
                <p className="text-xs text-slate-300">Patient: {doctorModalPatient.name} ({doctorModalPatient.patient_id || `PAT-${doctorModalPatient.id}`})</p>
              </div>
              <button
                type="button"
                onClick={() => setDoctorModalPatient(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDoctorAssignment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Specialist Doctor *</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                >
                  <option value="">-- Select Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization || d.specialty || 'General'}) - Fee: ₹{d.consultation_fee || 500}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Appointment Date *</label>
                  <input
                    type="date"
                    value={selectedAppDate}
                    onChange={(e) => setSelectedAppDate(e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Consultation Slot *</label>
                  <select
                    value={selectedAppSlot}
                    onChange={(e) => setSelectedAppSlot(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  >
                    <option value="">-- Select Time Slot --</option>
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <p className="font-semibold text-slate-700">Patient Complaints / Symptoms:</p>
                <p className="text-slate-600">{doctorModalPatient.symptoms_diagnosis || 'General Consultation / Regular OPD'}</p>
                <p className="text-slate-500 pt-1">Priority: <span className="font-bold text-slate-700">{doctorModalPatient.Condation || doctorModalPatient.condition || 'Normal'}</span></p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDoctorModalPatient(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingDoctor}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {updatingDoctor ? 'Assigning...' : 'Confirm Doctor & Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ALLOCATE BED & AUTO-ASSIGN NURSE */}
      {bedModalPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Allocate Inpatient Bed & Nurse</h3>
                <p className="text-xs text-slate-300">Patient: {bedModalPatient.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setBedModalPatient(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBedAllocation} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Bed Number *</label>
                <input
                  type="number"
                  placeholder="e.g. 102 (Floor 1), 205 (Floor 2)"
                  value={selectedBedNumber}
                  onChange={(e) => handleBedNumberChange(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white font-medium"
                />
                {selectedBedNumber && (
                  <p className="text-[11px] text-teal-700 font-semibold mt-1">
                    Floor: Floor {getFloorNumber(selectedBedNumber)}
                  </p>
                )}
              </div>

              {autoNurseNotice && (
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center gap-1.5">
                  <span className="text-teal-600 font-bold">✨</span>
                  <span className="font-semibold">{autoNurseNotice}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Assigned Station Nurse</label>
                <select
                  value={selectedNurseId}
                  onChange={(e) => setSelectedNurseId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                >
                  <option value="">-- Auto-assigned from Bed Duty --</option>
                  {nurses.map(n => (
                    <option key={n.id} value={n.id}>{n.name} ({n.ward || 'Ward Staff'})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBedModalPatient(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingBed}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {updatingBed ? 'Allocating...' : 'Confirm Bed & Nurse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FULL TRIAGE & MULTI ALLOCATION */}
      {triageModalPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Fast Triage & Complete Allocation</h3>
                <p className="text-xs text-slate-300">Assign Doctor, Slot, Bed, Auto-Nurse & Priority</p>
              </div>
              <button
                type="button"
                onClick={() => setTriageModalPatient(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTriage} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-bold text-amber-900">{triageModalPatient.name} • {triageModalPatient.patient_id || `PAT-${triageModalPatient.id}`}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">{triageModalPatient.age ? `${triageModalPatient.age} Yrs` : ''} • {triageModalPatient.gender || 'Male'} • Phone: {triageModalPatient.contact || 'N/A'}</p>
                <p className="text-[11px] text-slate-600 mt-1">Chief complaint: {triageModalPatient.symptoms_diagnosis || 'OPD Checkup'}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Consulting Doctor *</label>
                <select
                  value={triageFormData.doctor}
                  onChange={(e) => setTriageFormData({ ...triageFormData, doctor: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.specialization || d.specialty || 'General'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Appointment Date</label>
                  <input
                    type="date"
                    value={triageFormData.appointment_date}
                    onChange={(e) => setTriageFormData({ ...triageFormData, appointment_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Time Slot</label>
                  <select
                    value={triageFormData.appointment_time}
                    onChange={(e) => setTriageFormData({ ...triageFormData, appointment_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  >
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Bed Number (Leave blank for OPD)</label>
                  <input
                    type="number"
                    placeholder="e.g. 102"
                    value={triageFormData.bed_number}
                    onChange={(e) => handleTriageBedChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Station Nurse (Auto-Assigned)</label>
                  <select
                    value={triageFormData.nurse}
                    onChange={(e) => setTriageFormData({ ...triageFormData, nurse: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  >
                    <option value="">Auto / None</option>
                    {nurses.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Clinical Severity</label>
                  <select
                    value={triageFormData.Condation}
                    onChange={(e) => setTriageFormData({ ...triageFormData, Condation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  >
                    <option value="">-- Select Condition --</option>
                    <option value="Normal">Normal Condition</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status</label>
                  <select
                    value={triageFormData.status}
                    onChange={(e) => setTriageFormData({ ...triageFormData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                  >
                    <option value="Assigned">Assigned</option>
                    <option value="Admitted">Admitted</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTriageModalPatient(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingTriage}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {updatingTriage ? 'Saving...' : 'Save & Update Triage'}
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
