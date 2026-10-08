import React, { useState, useEffect } from 'react';
import { API_BASE_URL, extractArray } from '../Api/Api';

const DoctorDashboard = ({ currentUser, setCurrentPage }) => {
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [assignedHospitals, setAssignedHospitals] = useState([]);
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [patients, setPatients] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Today_Pending');
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);
  const [updatingPatientId, setUpdatingPatientId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Status Helpers
  const isDischargedStatus = (status) => {
    const s = (status || '').toLowerCase().trim();
    return s === 'discharged' || s === 'completed' || s.includes('discharg');
  };

  const isCompletedStatus = (status) => {
    return isDischargedStatus(status);
  };

  const isAdmitStatus = (status) => {
    const s = (status || '').toLowerCase().trim();
    return s.includes('admit');
  };

  const isCheckupDone = (checkupStatus) => {
    return checkupStatus === 'Checkup Done';
  };

  // Condition
  const getPatientCondition = (patient) => {
    return patient?.Condation || patient?.condation || patient?.condition || patient?.Condition || patient?.symptoms_severity || 'Normal';
  };

  // Blood Group helper
  const getPatientBloodGroup = (patient) => {
    return patient?.Blood_Group || patient?.blood_group || patient?.BloodGroup || patient?.bloodGroup || patient?.blood || patient?.Blood || '-';
  };

  // Gender helper
  const getPatientGender = (patient) => {
    if (!patient) return '-';
    return (
      patient.gender ||
      patient.Gender ||
      patient.patient_gender ||
      patient.Patient_Gender ||
      patient.sex ||
      patient.Sex ||
      patient.patient?.gender ||
      patient.patient_data?.gender ||
      patient.user?.gender ||
      '-'
    );
  };

  // Completed today
  const getTodayKey = () => `doc_completed_today_${new Date().toISOString().split('T')[0]}`;

  const getCompletedTodayIds = () => {
    try {
      const raw = localStorage.getItem(getTodayKey());
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const saveCompletedTodayId = (id) => {
    try {
      const list = getCompletedTodayIds();
      if (!list.includes(Number(id))) {
        list.push(Number(id));
        localStorage.setItem(getTodayKey(), JSON.stringify(list));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeCompletedTodayId = (id) => {
    try {
      const list = getCompletedTodayIds().filter(i => Number(i) !== Number(id));
      localStorage.setItem(getTodayKey(), JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  // Date helper
  const getAppointmentDateInfo = (patient) => {
    if (!patient) {
      return {
        dateObj: null,
        isToday: false,
        isYesterday: false,
        isTomorrow: false,
        isPast: false,
        isUpcoming: false,
        diffDays: 0,
        dayLabel: 'Today',
        timeFormatted: '--',
        dateFormatted: '--',
        fullScheduleDisplay: 'Today',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
      };
    }

    const rawDateStr = patient.visit_date_time || patient.appointment_time || patient.appointment_date || patient.visit_date || patient.created_at;

    if (!rawDateStr) {
      return {
        dateObj: new Date(),
        isToday: true,
        isYesterday: false,
        isTomorrow: false,
        isPast: false,
        isUpcoming: false,
        diffDays: 0,
        dayLabel: 'Today',
        timeFormatted: patient.appointment_time || '10:00 AM',
        dateFormatted: new Date().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
        fullScheduleDisplay: 'Today',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
      };
    }

    const d = new Date(rawDateStr);
    if (isNaN(d.getTime())) {
      return {
        dateObj: new Date(),
        isToday: true,
        isYesterday: false,
        isTomorrow: false,
        isPast: false,
        isUpcoming: false,
        diffDays: 0,
        dayLabel: 'Today',
        timeFormatted: patient.appointment_time || '--',
        dateFormatted: patient.appointment_date || String(rawDateStr),
        fullScheduleDisplay: String(rawDateStr),
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
      };
    }

    const now = new Date();
    const isToday = d.getFullYear() === now.getFullYear() &&
                    d.getMonth() === now.getMonth() &&
                    d.getDate() === now.getDate();

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const targetMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

    const isYesterday = diffDays === -1;
    const isTomorrow = diffDays === 1;
    const isPast = diffDays < 0;
    const isUpcoming = diffDays > 0;

    const timeFormatted = patient.appointment_time || d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateFormatted = d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

    let dayLabel = '';
    let fullScheduleDisplay = '';
    let badgeClass = '';

    if (isToday) {
      dayLabel = 'Today';
      fullScheduleDisplay = `Today, ${timeFormatted}`;
      badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
    } else if (isYesterday) {
      dayLabel = 'Yesterday';
      fullScheduleDisplay = `Yesterday, ${timeFormatted}`;
      badgeClass = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
    } else if (isTomorrow) {
      dayLabel = 'Tomorrow';
      fullScheduleDisplay = `Tomorrow, ${timeFormatted}`;
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-300 font-semibold';
    } else if (diffDays < -1) {
      dayLabel = `${Math.abs(diffDays)}d Ago`;
      fullScheduleDisplay = `${dateFormatted}, ${timeFormatted}`;
      badgeClass = 'bg-slate-100 text-slate-700 border-slate-300 font-medium';
    } else {
      dayLabel = `In ${diffDays}d`;
      fullScheduleDisplay = `${dateFormatted}, ${timeFormatted}`;
      badgeClass = 'bg-purple-50 text-purple-700 border-purple-300 font-medium';
    }

    return {
      dateObj: d,
      isToday,
      isYesterday,
      isTomorrow,
      isPast,
      isUpcoming,
      diffDays,
      dayLabel,
      timeFormatted,
      dateFormatted,
      fullScheduleDisplay,
      badgeClass
    };
  };

  // Completed helper
  const isCompletedToday = (patient) => {
    if (!patient || !isCompletedStatus(patient.status, patient.checkup_status)) return false;

    const completedIds = getCompletedTodayIds();
    if (completedIds.includes(Number(patient.id))) return true;

    const now = new Date();
    const dateToCheck = patient.completed_at || patient.discharge_date || patient.updated_at;
    if (dateToCheck) {
      const d = new Date(dateToCheck);
      if (!isNaN(d.getTime())) {
        if (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        ) {
          return true;
        }
      }
    }

    const visitInfo = getAppointmentDateInfo(patient);
    if (visitInfo.isToday) return true;

    return false;
  };

  const loadDoctorData = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const docId = currentUser?.id;
      const currentDocIdTag = currentUser?.doctor_id;

      // 1. Fetch hospitals list
      let allHospitals = [];
      try {
        const hospListRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
        if (hospListRes && hospListRes.ok) {
          allHospitals = await hospListRes.json();
        }
      } catch (e) {
        console.error('Error fetching hospitals:', e);
      }

      // 2. Fetch doctor profile
      let currentDoc = null;
      try {
        const docRes = await fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null);
        if (docRes && docRes.ok) {
          const docs = await docRes.json();
          if (Array.isArray(docs)) {
            currentDoc = docs.find(d => 
              (d.email && d.email.toLowerCase().trim() === email) ||
              (docId && Number(d.id) === Number(docId)) ||
              (currentDocIdTag && d.doctor_id === currentDocIdTag) ||
              (d.name && d.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        }
      } catch (err) {
        console.error('Error fetching doctor profile:', err);
      }

      const resolvedDoctor = currentDoc || currentUser || null;
      setDoctorInfo(resolvedDoctor);

      // Extract all assigned hospital IDs
      const rawHospIds = Array.isArray(resolvedDoctor?.hospitals)
        ? resolvedDoctor.hospitals.map(h => Number(typeof h === 'object' ? h.id : h)).filter(Boolean)
        : (resolvedDoctor?.hospital ? [Number(typeof resolvedDoctor.hospital === 'object' ? resolvedDoctor.hospital.id : resolvedDoctor.hospital)].filter(Boolean) : []);

      if (currentUser?.hospital && !rawHospIds.includes(Number(currentUser.hospital))) {
        rawHospIds.push(Number(currentUser.hospital));
      }

      let docAssignedHospitals = allHospitals.filter(h => rawHospIds.includes(Number(h.id)));
      if (docAssignedHospitals.length === 0 && currentUser?.hospital_name) {
        const byName = allHospitals.find(h => (h.Name || h.name || '').toLowerCase() === currentUser.hospital_name.toLowerCase());
        if (byName) docAssignedHospitals = [byName];
      }
      setAssignedHospitals(docAssignedHospitals);

      const primaryHosp = docAssignedHospitals[0] || allHospitals.find(h => Number(h.id) === Number(rawHospIds[0])) || null;
      setHospitalInfo(primaryHosp);

      // 3. Fetch patients and appointments queue - STRICTLY ASSIGNED TO THIS DOCTOR ONLY!
      try {
        let allPats = [];
        try {
          const patRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
          if (patRes && patRes.ok) {
            const resData = await patRes.json().catch(() => []);
            allPats = extractArray(resData);
          }
        } catch (e) {}

        if (Array.isArray(allPats)) {
          const targetDocId = resolvedDoctor?.id || currentUser?.id;
          const targetDocTag = resolvedDoctor?.doctor_id || currentUser?.doctor_id;
          const targetDocEmail = (resolvedDoctor?.email || currentUser?.email || '').toLowerCase().trim();
          const targetDocName = (resolvedDoctor?.name || currentUser?.name || '').replace(/^dr\.?\s*/i, '').toLowerCase().trim();

          const myPatients = allPats
            .filter(p => {
              if (!p) return false;
              const pDocId = typeof p.doctor === 'object' && p.doctor !== null ? p.doctor.id : p.doctor;
              const pDocTag = p.doctor_id || p.doctor_tag;
              const pDocEmail = (typeof p.doctor === 'object' && p.doctor?.email ? p.doctor.email : (p.doctor_email || '')).toLowerCase().trim();
              const pDocName = (p.doctor_name || (typeof p.doctor === 'object' ? p.doctor?.name : '') || '').replace(/^dr\.?\s*/i, '').toLowerCase().trim();

              // 1. Direct ID match
              if (targetDocId && pDocId && !isNaN(Number(pDocId)) && !isNaN(Number(targetDocId))) {
                if (Number(pDocId) === Number(targetDocId)) return true;
              }

              // 2. Doctor ID tag match (e.g. DOC-001)
              if (targetDocTag && pDocTag && String(pDocTag).toLowerCase().trim() === String(targetDocTag).toLowerCase().trim()) {
                return true;
              }

              // 3. Email match
              if (targetDocEmail && pDocEmail && pDocEmail === targetDocEmail) {
                return true;
              }

              // 4. Clean Name match
              if (targetDocName && pDocName && (pDocName === targetDocName || pDocName.includes(targetDocName) || targetDocName.includes(pDocName))) {
                if (pDocId && targetDocId && !isNaN(Number(pDocId)) && !isNaN(Number(targetDocId)) && Number(pDocId) !== Number(targetDocId)) {
                  return false;
                }
                return true;
              }

              return false;
            })
            .map(p => {
              const id = p.id || p.appointment_id;
              const apptId = p.Appoment_id || p.appoment_id || p.appointment_id || id;
              const name = p.patient_Name || p.patient_name || p.name || `Patient #${id}`;
              const condition = p.condition || p.Condation || p.Condition || p.symptoms_severity || 'Normal';
              const blood = p.blood_group || p.Blood_Group || 'Not Specified';
              const hospId = typeof p.hospital === 'object' && p.hospital !== null ? p.hospital.id : p.hospital;
              const hospObj = hospId && Array.isArray(allHospitals) ? allHospitals.find(h => Number(h.id) === Number(hospId)) : null;
              const hospName = p.hospital_name || hospObj?.Name || hospObj?.name || (typeof p.hospital === 'string' && isNaN(Number(p.hospital)) ? p.hospital : '');
              const patGender = p.gender || p.Gender || p.patient_gender || p.Patient_Gender || p.sex || p.Sex || '';
              const ageVal = p.age || p.Age || '';

              return {
                ...p,
                id,
                Appoment_id: apptId,
                appoment_id: apptId,
                appointment_id: apptId,
                patient_id: `APT-${apptId}`,
                name,
                patient_Name: name,
                patient_name: name,
                gender: patGender,
                Gender: patGender,
                age: ageVal,
                Age: ageVal,
                condition,
                Condation: condition,
                blood_group: blood,
                Blood_Group: blood,
                status,
                checkup_status: p.checkup_status || p.Checkup_status || 'Pending',
                hospital: hospId,
                hospital_name: hospName
              };
            });

          setPatients(myPatients);
        }
      } catch (err) {
        console.error('Error fetching patients queue:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, [currentUser]);

  const handleUpdatePatientField = async (patient, fieldName, fieldValue) => {
    if (!patient || !fieldName) return;
    try {
      const patientId = patient.id || patient.appointment_id || patient.Appoment_id;
      setUpdatingPatientId(patientId);

      const targetStatus = fieldName === 'status' ? fieldValue : (patient.status || 'Pending');
      const targetCheckupStatus = fieldName === 'checkup_status' ? fieldValue : (patient.checkup_status || 'Pending');

      const nowIso = new Date().toISOString();

      if (targetCheckupStatus === 'Checkup Done' || targetStatus === 'Discharged' || targetStatus === 'Admitted') {
        saveCompletedTodayId(patientId);
      } else {
        removeCompletedTodayId(patientId);
      }

      const numericId = patient.id;
      const apptId = patient.Appoment_id || patient.appoment_id || patient.appointment_id || patient.id;
      const candidateIds = [
        patient.appointment_pk,
        patient.appointment_id,
        patient.Appoment_id,
        patient.appoment_id,
        numericId,
        patient.id,
        apptId,
        typeof apptId === 'string' && apptId.startsWith('APT-') ? apptId.replace('APT-', '') : null,
        typeof apptId === 'string' ? apptId.replace(/\D/g, '') : null,
        typeof patient.id === 'string' ? patient.id.replace(/\D/g, '') : null
      ].filter(Boolean);

      const idsToTry = Array.from(new Set(candidateIds.map(v => typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v)));

      const patchPayload = {
        status: targetStatus,
        checkup_status: targetCheckupStatus,
        Checkup_status: targetCheckupStatus
      };

      if (targetStatus === 'Discharged') {
        patchPayload.discharge_status = 'Discharged';
        patchPayload.completed_at = nowIso;
      }
      if (targetCheckupStatus === 'Checkup Done') {
        patchPayload.completed_at = nowIso;
      }

      let isSuccess = false;
      let backendUpdatedData = null;

      for (const targetId of idsToTry) {
        try {
          const res = await fetch(`${API_BASE_URL}/super-admin/appointments/${targetId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patchPayload)
          });
          if (res && res.ok) {
            isSuccess = true;
            backendUpdatedData = await res.json().catch(() => null);
            break;
          }
        } catch (e) {}
      }

      if (!isSuccess) {
        try {
          const allApptsRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
          if (allApptsRes && allApptsRes.ok) {
            const allAppts = extractArray(await allApptsRes.json().catch(() => []));
            const patName = (patient.name || patient.patient_name || patient.patient_Name || '').toLowerCase().trim();
            const patPhone = String(patient.contact || patient.phone || '').replace(/\D/g, '');
            const patEmail = (patient.email || '').toLowerCase().trim();

            const matched = allAppts.find(a => {
              const aId = Number(a.id);
              const aApptId = String(a.Appoment_id || a.appoment_id || a.appointment_id || '');
              const aName = (a.patient_name || a.patient_Name || a.name || '').toLowerCase().trim();
              const aEmail = (a.email || '').toLowerCase().trim();
              const aPhone = String(a.contact || a.phone || '').replace(/\D/g, '');

              if (idsToTry.includes(aId) || idsToTry.includes(String(a.id))) return true;
              if (aApptId && idsToTry.includes(aApptId)) return true;
              if (patName && aName && patName === aName && patPhone && aPhone && patPhone === aPhone) return true;
              if (patName && aName && patName === aName && patEmail && aEmail && patEmail === aEmail) return true;
              if (patEmail && aEmail && patEmail === aEmail && patEmail.length > 4) return true;
              if (patPhone && aPhone && patPhone === aPhone && patPhone.length > 5) return true;
              if (patName && aName && patName === aName && patName.length > 2) return true;
              return false;
            });

            if (matched && matched.id) {
              const res = await fetch(`${API_BASE_URL}/super-admin/appointments/${matched.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patchPayload)
              }).catch(() => null);
              if (res && res.ok) {
                isSuccess = true;
                backendUpdatedData = await res.json().catch(() => null);
              }
            }
          }
        } catch (e) {}
      }

      const updatedPat = {
        ...patient,
        ...(backendUpdatedData || {}),
        status: targetStatus,
        checkup_status: targetCheckupStatus,
        Checkup_status: targetCheckupStatus,
        completed_at: (targetCheckupStatus === 'Checkup Done' || targetStatus === 'Discharged' || targetStatus === 'Admitted') ? nowIso : patient.completed_at
      };

      setPatients(prev => prev.map(p => (p.id === patient.id || p.Appoment_id === patient.Appoment_id) ? updatedPat : p));
      if (selectedPatientModal && (selectedPatientModal.id === patient.id || selectedPatientModal.Appoment_id === patient.Appoment_id)) {
        setSelectedPatientModal(updatedPat);
      }

      setActionSuccessMsg(`✓ Updated: Status="${targetStatus}", Checkup="${targetCheckupStatus}" saved to backend!`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating patient field:', err);
    } finally {
      setUpdatingPatientId(null);
    }
  };

  const handleUpdatePatientStatus = (patient, selectedOption) => {
    handleUpdatePatientField(patient, 'status', selectedOption);
  };

  const parseSpecializations = (spec) => {
    if (!spec) return [];
    if (Array.isArray(spec)) {
      return spec
        .flatMap(item => {
          if (typeof item === 'string') return item.split(',');
          if (item?.name && typeof item.name === 'string') return item.name.split(',');
          return [];
        })
        .map(s => s.trim().replace(/^['"\[\]]+|['"\[\]]+$/g, '').trim())
        .filter(Boolean);
    }
    if (typeof spec === 'string') {
      return spec
        .split(',')
        .map(s => s.trim().replace(/^['"\[\]]+|['"\[\]]+$/g, '').trim())
        .filter(Boolean);
    }
    return [];
  };

  const docName = doctorInfo?.name || currentUser?.name || 'Doctor';
  const cleanDocName = docName.replace(/^Dr\.?\s*/i, '');
  const doctorIdTag = doctorInfo?.doctor_id || (doctorInfo?.id ? `DOC-${doctorInfo.id}` : (currentUser?.doctor_id || `DOC-${currentUser?.id || '-'}`));
  const docEmail = (doctorInfo?.email || currentUser?.email || '').toLowerCase();
  const docPhone = doctorInfo?.phone || doctorInfo?.contact || currentUser?.phone || currentUser?.contact || '-';
  const docSpecs = parseSpecializations(doctorInfo?.specialization || doctorInfo?.specialty || currentUser?.specialization);
  const docOpdTimings = doctorInfo?.opd_timings || currentUser?.opd_timings || '-';
  const docDepartment = doctorInfo?.department || doctorInfo?.department_name || (docSpecs[0] ? `${docSpecs[0]} Department` : '-');

  // Filter patients by hospital filter first
  const hospitalScopedPatients = patients.filter(p => {
    if (hospitalFilter === 'ALL') return true;
    const patHospId = Number(typeof p.hospital === 'object' ? p.hospital?.id : p.hospital);
    const patHospName = (p.hospital_name || (typeof p.hospital === 'object' ? p.hospital?.Name : '') || '').toLowerCase().trim();
    const filterHosp = assignedHospitals.find(h => String(h.id) === String(hospitalFilter));
    const filterName = filterHosp?.Name?.toLowerCase().trim() || '';

    return patHospId === Number(hospitalFilter) ||
           (filterName && patHospName === filterName) ||
           patHospName === String(hospitalFilter).toLowerCase().trim();
  });

  const isDischargedToday = (p) => {
    if (!isDischargedStatus(p.status)) return false;
    if (p.discharge_date) {
      const d = new Date(p.discharge_date);
      if (!isNaN(d.getTime())) {
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      }
    }
    return getAppointmentDateInfo(p).isToday;
  };

  // Day & status filtering
  const todayPatients = hospitalScopedPatients.filter(p => getAppointmentDateInfo(p).isToday);
  const todayPendingPatients = todayPatients.filter(p => !isCheckupDone(p.checkup_status) && !isAdmitStatus(p.status) && !isDischargedStatus(p.status));
  const todayCheckupDonePatients = todayPatients.filter(p => isCheckupDone(p.checkup_status) && !isAdmitStatus(p.status) && !isDischargedStatus(p.status));
  const admittedPatients = hospitalScopedPatients.filter(p => isAdmitStatus(p.status));
  const todayDischargedPatients = hospitalScopedPatients.filter(p => isDischargedStatus(p.status) && isDischargedToday(p));
  const dischargedPatients = todayDischargedPatients;
  const yesterdayPatients = hospitalScopedPatients.filter(p => getAppointmentDateInfo(p).isYesterday);
  const upcomingPatients = hospitalScopedPatients.filter(p => getAppointmentDateInfo(p).isUpcoming);
  const pastOverduePatients = hospitalScopedPatients.filter(p => getAppointmentDateInfo(p).isPast && !getAppointmentDateInfo(p).isYesterday);

  const filteredPatients = hospitalScopedPatients.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    const nameMatch = (p.name || '').toLowerCase().includes(term);
    const idMatch = (p.patient_id || p.uhid || `PAT-${p.id}` || '').toLowerCase().includes(term);
    const symptomsMatch = (p.symptoms_diagnosis || p.reason || '').toLowerCase().includes(term);
    const contactMatch = (p.contact || p.phone || '').toLowerCase().includes(term);
    const matchesSearch = !term || nameMatch || idMatch || symptomsMatch || contactMatch;

    if (!matchesSearch) return false;

    const dateInfo = getAppointmentDateInfo(p);
    const doneCheckup = isCheckupDone(p.checkup_status);
    const admitted = isAdmitStatus(p.status);
    const discharged = isDischargedStatus(p.status);

    if (statusFilter === 'Today_Pending') {
      return dateInfo.isToday && !doneCheckup && !admitted && !discharged;
    } else if (statusFilter === 'Checkup_Done') {
      return dateInfo.isToday && doneCheckup && !admitted && !discharged;
    } else if (statusFilter === 'Admitted') {
      return admitted;
    } else if (statusFilter === 'Discharged' || statusFilter === 'Today_Completed' || statusFilter === 'Completed') {
      return discharged && isDischargedToday(p);
    } else if (statusFilter === 'Today_All') {
      return dateInfo.isToday;
    } else if (statusFilter === 'Yesterday') {
      return dateInfo.isYesterday;
    } else if (statusFilter === 'Upcoming') {
      return dateInfo.isUpcoming;
    } else if (statusFilter === 'Past_Overdue') {
      return dateInfo.isPast && !dateInfo.isYesterday;
    }
    return true;
  }).sort((a, b) => {
    const infoA = getAppointmentDateInfo(a);
    const infoB = getAppointmentDateInfo(b);
    if (infoA.dateObj && infoB.dateObj) {
      if (statusFilter === 'Yesterday' || statusFilter === 'Past_Overdue') {
        return infoB.dateObj - infoA.dateObj;
      }
      return infoA.dateObj - infoB.dateObj;
    }
    return (a.id || 0) - (b.id || 0);
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* HEADER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-cyan-500 text-white font-black flex items-center justify-center text-2xl shadow-lg ring-2 ring-teal-400/30 shrink-0">
              {cleanDocName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-teal-300 bg-teal-500/20 px-2.5 py-0.5 rounded-full border border-teal-400/30">
                  {doctorIdTag}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  {docDepartment}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${
                  doctorInfo?.is_active !== false ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${doctorInfo?.is_active !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                  {doctorInfo?.is_active !== false ? 'Active Practitioner' : 'On Leave'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1.5 tracking-tight text-slate-100">
                Dr. {cleanDocName}
              </h1>
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300 mt-1">
                {docEmail ? (
                  <a href={`mailto:${docEmail}`} className="text-teal-300 hover:underline">
                    {docEmail}
                  </a>
                ) : (
                  <span>{docPhone}</span>
                )}
                <span>•</span>
                <span className="font-semibold text-emerald-300">OPD: {docOpdTimings}</span>
              </div>

              {/* ASSIGNED HOSPITALS BADGES */}
              {assignedHospitals.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {assignedHospitals.length > 1 ? `Affiliated Hospitals (${assignedHospitals.length} Branches):` : 'Hospital Branch:'}
                  </span>
                  {assignedHospitals.map(h => (
                    <span
                      key={h.id}
                      onClick={() => setHospitalFilter(String(h.id))}
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                        hospitalFilter === String(h.id)
                          ? 'bg-teal-500 text-slate-900 border-teal-300 font-black shadow-xs'
                          : 'bg-teal-500/20 text-teal-300 border-teal-400/30 hover:bg-teal-500/30'
                      }`}
                    >
                      <span>{h.Name}</span>
                      <span className="text-[10px] opacity-80">({h.Branch_Code || `HOSP-${h.id}`})</span>
                    </span>
                  ))}
                  {assignedHospitals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setHospitalFilter('ALL')}
                      className={`px-2 py-0.5 rounded-md text-xs font-bold border transition cursor-pointer ${
                        hospitalFilter === 'ALL'
                          ? 'bg-slate-100 text-slate-900 border-white'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                      }`}
                    >
                      All Branches
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('doctor_settings')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-teal-300 hover:text-white text-xs font-bold border border-teal-500/30 hover:border-teal-400/60 transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-sm hover:shadow-teal-500/10 group"
              title="Open Doctor Settings & Profile"
            >
              <svg className="w-4 h-4 text-teal-400 group-hover:rotate-45 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Doctor Settings</span>
            </button>
          </div>
        </div>

        {docSpecs.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold">Specializations:</span>
            {docSpecs.map((spec, idx) => (
              <span key={idx} className="px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-semibold">
                {spec}
              </span>
            ))}
          </div>
        )}
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{actionSuccessMsg}</span>
          </div>
          <button type="button" onClick={() => setActionSuccessMsg('')} className="text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setStatusFilter('Today_All')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs ${statusFilter === 'Today_All' ? 'ring-2 ring-teal-500 border-teal-400' : 'border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today's Appointments</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Today</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{todayPatients.length}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {hospitalFilter === 'ALL' ? 'Across all assigned branches' : 'Selected branch'}
          </p>
        </div>

        <div 
          onClick={() => setStatusFilter('Today_Pending')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs bg-amber-50/30 ${statusFilter === 'Today_Pending' ? 'ring-2 ring-amber-500 border-amber-400' : 'border-amber-300 hover:border-amber-400'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Checkups</p>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{todayPendingPatients.length}</h3>
          <p className="text-xs text-amber-700/80 mt-0.5 font-medium">Awaiting live consultation</p>
        </div>

        <div 
          onClick={() => setStatusFilter('Admitted')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs bg-purple-50/30 ${statusFilter === 'Admitted' ? 'ring-2 ring-purple-500 border-purple-400' : 'border-purple-300 hover:border-purple-400'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Admitted (IPD)</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Inpatients</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-purple-800 mt-1">{admittedPatients.length}</h3>
          <p className="text-xs text-purple-700/80 mt-0.5 font-medium">Admitted under your care</p>
        </div>

        <div 
          onClick={() => setStatusFilter('Discharged')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition cursor-pointer shadow-xs bg-teal-50/30 ${statusFilter === 'Discharged' ? 'ring-2 ring-teal-500 border-teal-400' : 'border-teal-300 hover:border-teal-400'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">Discharged</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">Discharged</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-teal-700 mt-1">{dischargedPatients.length}</h3>
          <p className="text-xs text-teal-700/80 mt-0.5 font-medium">Discharged patient list</p>
        </div>
      </div>

      {/* PATIENT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-800">Patient Queue & Appointment Schedule</h2>
              {statusFilter === 'Today_Pending' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Today's Pending Queue
                </span>
              )}
              {statusFilter === 'Checkup_Done' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Checkup Done Patients
                </span>
              )}
              {statusFilter === 'Admitted' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  Admitted Inpatients
                </span>
              )}
              {statusFilter === 'Discharged' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  Discharged Patients
                </span>
              )}
              {statusFilter === 'Yesterday' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Yesterday's Roster
                </span>
              )}
              {hospitalFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Branch: {assignedHospitals.find(h => String(h.id) === String(hospitalFilter))?.Name || 'Selected'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Day-synchronized clinical consultation list for Dr. {cleanDocName}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* MULTI-HOSPITAL SELECTOR */}
            {assignedHospitals.length > 1 && (
              <select
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-teal-300 bg-teal-50/50 text-xs font-bold text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">All Branches</option>
                {assignedHospitals.map(h => {
                  const countForHosp = patients.filter(p => Number(p.hospital) === Number(h.id) || p.hospital_name === h.Name).length;
                  return (
                    <option key={h.id} value={h.id}>
                      {h.Name} ({countForHosp})
                    </option>
                  );
                })}
              </select>
            )}

            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search name, ID, symptoms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            {/* STATUS FILTER */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Today_Pending">Today's Pending Queue ({todayPendingPatients.length})</option>
              <option value="Checkup_Done">Checkup Done Today ({todayCheckupDonePatients.length})</option>
              <option value="Admitted">Admitted Inpatients ({admittedPatients.length})</option>
              <option value="Discharged">Discharged Patients ({dischargedPatients.length})</option>
              <option value="Today_All">All Today's Appointments ({todayPatients.length})</option>
              <option value="Yesterday">Yesterday's Patients ({yesterdayPatients.length})</option>
              <option value="Upcoming">Upcoming Appointments ({upcomingPatients.length})</option>
              <option value="Past_Overdue">Past / Overdue Appointments ({pastOverduePatients.length})</option>
              <option value="ALL">All Patient Records ({hospitalScopedPatients.length})</option>
            </select>
          </div>
        </div>

        {/* FILTER PILLS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setStatusFilter('Today_Pending')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Today_Pending' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Today Pending ({todayPendingPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Checkup_Done')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Checkup_Done' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Checkup Done ({todayCheckupDonePatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Admitted')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Admitted' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Admitted ({admittedPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Discharged')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Discharged' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Discharged ({dischargedPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Today_All')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Today_All' ? 'bg-slate-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Today ({todayPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Yesterday')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Yesterday' ? 'bg-amber-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Yesterday ({yesterdayPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Upcoming')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'Upcoming' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Upcoming ({upcomingPatients.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All History ({hospitalScopedPatients.length})
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-center text-xs text-slate-600 min-w-[750px]">
            <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">Patient & ID</th>
                <th className="py-3 px-3 text-center">Hospital Branch</th>
                <th className="py-3 px-3 text-center">Age / Gender</th>
                <th className="py-3 px-3 text-center">Visit Schedule</th>
                <th className="py-3 px-3 text-center">Symptoms / Condition</th>
                <th className="py-3 px-3 text-center">Checkup Status</th>
                <th className="py-3 px-3 text-center">Appointment Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading assigned patient queue...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <div className="font-semibold text-slate-600">No patients found for this selection.</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {statusFilter === 'Today_Pending' ? 'No pending patients remaining for Today! All clear.' : 'Try selecting another day or filter tab.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.slice(0, visibleCount).map((pat, idx) => {
                  const patientIdDisplay = pat.patient_id || pat.uhid || (pat.id ? `PAT-${pat.id}` : '-');
                  const isDone = isCompletedStatus(pat.status, pat.checkup_status);
                  const isAdmit = isAdmitStatus(pat.status);
                  const isUpdating = updatingPatientId === pat.id;
                  const dateInfo = getAppointmentDateInfo(pat);
                  const condition = getPatientCondition(pat);
                  const hospObj = assignedHospitals.find(h => Number(h.id) === Number(pat.hospital)) || { Name: pat.hospital_name || hospitalInfo?.Name || 'Branch' };

                  return (
                    <tr key={pat.id || idx} className={`transition ${isDone || isAdmit ? 'bg-slate-50/40 opacity-80' : 'hover:bg-slate-50/70'}`}>
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-slate-800">{pat.patient_Name || pat.patient_name || pat.name || 'Patient'}</div>
                        <div className="flex items-center justify-center gap-1 flex-wrap mt-0.5">
                          <span className="font-mono text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block">
                            {patientIdDisplay}
                          </span>
                          {pat.bed_number ? (
                            <span className="text-[9px] font-mono font-bold bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded border border-purple-300 inline-block">
                              Bed #{pat.bed_number}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold inline-block truncate max-w-[140px]">
                          {hospObj.Name}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {pat.age || pat.Age ? `${pat.age || pat.Age} Y` : '-'} • {getPatientGender(pat)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border inline-block ${dateInfo.badgeClass}`}>
                            {dateInfo.dayLabel}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700">
                            {dateInfo.timeFormatted !== '--' ? dateInfo.timeFormatted : (dateInfo.dateFormatted || 'Scheduled')}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-medium text-slate-800 block max-w-[180px] mx-auto truncate" title={pat.symptoms_diagnosis || pat.reason}>
                          {pat.symptoms_diagnosis || pat.reason || '-'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border inline-block mt-0.5 ${
                          condition === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          condition === 'Emergency' ? 'bg-red-100 text-red-800 border-red-300' :
                          condition === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {condition}
                        </span>
                      </td>

                      {/* 1. CHECKUP STATUS DROPDOWN */}
                      <td className="py-3 px-3 text-center">
                        <select
                          value={pat.checkup_status === 'Checkup Done' ? 'Checkup Done' : 'Pending'}
                          onChange={(e) => handleUpdatePatientField(pat, 'checkup_status', e.target.value)}
                          disabled={isUpdating}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer disabled:opacity-50 transition ${
                            pat.checkup_status === 'Checkup Done'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Checkup Done">Checkup Done</option>
                        </select>
                      </td>

                      {/* 2. ADMISSION / DISCHARGE STATUS DROPDOWN */}
                      <td className="py-3 px-3 text-center">
                        <select
                          value={isAdmitStatus(pat.status) ? 'Admitted' : isDischargedStatus(pat.status) ? 'Discharged' : ''}
                          onChange={(e) => handleUpdatePatientField(pat, 'status', e.target.value)}
                          disabled={isUpdating}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer disabled:opacity-50 transition ${
                            isAdmitStatus(pat.status) ? 'bg-purple-50 text-purple-800 border-purple-300' :
                            isDischargedStatus(pat.status) ? 'bg-teal-50 text-teal-800 border-teal-300' :
                            'bg-slate-50 text-slate-700 border-slate-300'
                          }`}
                        >
                          {!isAdmitStatus(pat.status) && !isDischargedStatus(pat.status) && (
                            <option value="" disabled>-- Select (Admit / Discharge) --</option>
                          )}
                          <option value="Admitted">Admitted (IPD)</option>
                          <option value="Discharged">Discharged</option>
                          {(isAdmitStatus(pat.status) || isDischargedStatus(pat.status)) && (
                            <option value="Pending">Reset to Pending</option>
                          )}
                        </select>
                      </td>

                      {/* ACTION DETAILS */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedPatientModal(pat)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer border border-slate-200"
                        >
                          Details
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
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 rounded-xl">
            <button
              type="button"
              onClick={() => setVisibleCount(prev => prev + 10)}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More ({filteredPatients.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* DETAILS MODAL */}
      {selectedPatientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">Patient Consultation Details</span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {selectedPatientModal.patient_Name || selectedPatientModal.patient_name || selectedPatientModal.name || selectedPatientModal.Patient_Name || 'Patient'}
                </h3>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-0.5">
                  UHID: {selectedPatientModal.patient_id || selectedPatientModal.uhid || `PAT-${selectedPatientModal.id}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatientModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* PATIENT NAME & CONTACT */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Patient Name</span>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 truncate">
                    {selectedPatientModal.patient_Name || selectedPatientModal.patient_name || selectedPatientModal.name || selectedPatientModal.Patient_Name || 'Patient'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Contact Phone</span>
                  <p className="font-bold text-slate-800 text-xs sm:text-sm mt-0.5 font-mono">
                    {selectedPatientModal.contact || selectedPatientModal.phone || selectedPatientModal.Phone || '-'}
                  </p>
                </div>
              </div>

              {(() => {
                const modalDateInfo = getAppointmentDateInfo(selectedPatientModal);
                return (
                  <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 flex items-center justify-between">
                    <div>
                      <span className="text-teal-800 uppercase font-bold text-[10px] block">Visit Date & Time Schedule</span>
                      <span className="font-bold text-slate-800 text-sm mt-0.5 block">{modalDateInfo.fullScheduleDisplay}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${modalDateInfo.badgeClass}`}>
                      {modalDateInfo.dayLabel}
                    </span>
                  </div>
                );
              })()}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-bold text-[10px] block">Hospital Branch</span>
                <p className="font-bold text-slate-800 text-xs mt-0.5">
                  {assignedHospitals.find(h => Number(h.id) === Number(selectedPatientModal.hospital))?.Name || selectedPatientModal.hospital_name || hospitalInfo?.Name || 'General Campus'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Chief Complaints / Diagnosis</span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {selectedPatientModal.symptoms_diagnosis || selectedPatientModal.reason || 'Routine consultation and observation.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Age & Gender</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedPatientModal.age || selectedPatientModal.Age ? `${selectedPatientModal.age || selectedPatientModal.Age} Years` : '-'} • {getPatientGender(selectedPatientModal)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Blood Group</span>
                  <p className="font-bold text-rose-700 mt-0.5">{getPatientBloodGroup(selectedPatientModal)}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Condition Severity</span>
                <p className="font-bold text-slate-800 mt-0.5">{getPatientCondition(selectedPatientModal)}</p>
              </div>

              {/* TWO SEPARATE DROPDOWNS: CHECKUP STATUS & STATUS */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <span className="text-slate-800 font-bold text-xs uppercase tracking-wider block">
                  Doctor Actions & Status Updates
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. CHECKUP STATUS */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-slate-500 uppercase font-bold text-[10px] block mb-1">
                      Checkup Status
                    </label>
                    <select
                      value={selectedPatientModal.checkup_status === 'Checkup Done' ? 'Checkup Done' : 'Pending'}
                      onChange={(e) => handleUpdatePatientField(selectedPatientModal, 'checkup_status', e.target.value)}
                      disabled={updatingPatientId === selectedPatientModal.id}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer disabled:opacity-50 transition ${
                        selectedPatientModal.checkup_status === 'Checkup Done'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Checkup Done">Checkup Done</option>
                    </select>
                  </div>

                  {/* 2. ADMISSION / DISCHARGE STATUS DROPDOWN */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-slate-500 uppercase font-bold text-[10px] block mb-1">
                      Admission / Discharge Status
                    </label>
                    <select
                      value={isAdmitStatus(selectedPatientModal.status) ? 'Admitted' : isDischargedStatus(selectedPatientModal.status) ? 'Discharged' : ''}
                      onChange={(e) => handleUpdatePatientField(selectedPatientModal, 'status', e.target.value)}
                      disabled={updatingPatientId === selectedPatientModal.id}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer disabled:opacity-50 transition ${
                        isAdmitStatus(selectedPatientModal.status) ? 'bg-purple-50 text-purple-800 border-purple-300' :
                        isDischargedStatus(selectedPatientModal.status) ? 'bg-teal-50 text-teal-800 border-teal-300' :
                        'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      {!isAdmitStatus(selectedPatientModal.status) && !isDischargedStatus(selectedPatientModal.status) && (
                        <option value="" disabled>-- Select (Admit / Discharge) --</option>
                      )}
                      <option value="Admitted">Admitted (IPD)</option>
                      <option value="Discharged">Discharged</option>
                      {(isAdmitStatus(selectedPatientModal.status) || isDischargedStatus(selectedPatientModal.status)) && (
                        <option value="Pending">Reset to Pending</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
