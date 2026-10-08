import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

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

const ReceptionistPatientDetails = ({ currentUser, selectedPatient, setSelectedPatient, setCurrentPage }) => {
  const [patientData, setPatientData] = useState(() => {
    if (selectedPatient && selectedPatient.id) return selectedPatient;
    try {
      const saved = localStorage.getItem('selectedPatient');
      if (saved) return JSON.parse(saved);
    } catch { }
    return null;
  });

  const [doctorsList, setDoctorsList] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [selectedHistoryAppt, setSelectedHistoryAppt] = useState(null);
  const [isHistoryDetailsModalOpen, setIsHistoryDetailsModalOpen] = useState(false);
  const [editSelectedFile, setEditSelectedFile] = useState(null);
  const [editAttachedFile, setEditAttachedFile] = useState(null);
  const [autoNurseText, setAutoNurseText] = useState('');

  // Payment Form State
  const [paymentFormData, setPaymentFormData] = useState({
    amount_paid: '',
    payment_method: 'Cash',
    payment_status: 'Paid',
    hospital_charges: '',
    consultation_fee: ''
  });

  const [editFormData, setEditFormData] = useState({
    patient_id: '',
    name: '',
    patient_Name: '',
    age: '',
    gender: 'Male',
    Gender: 'Male',
    blood_group: 'A+',
    contact: '',
    email: '',
    address: '',
    hospital: '',
    doctor: '',
    doctor_name: '',
    visit_date: '',
    visit_time: '10:00 AM',
    bed_number: '',
    nurse: '',
    consultation_fee: '0.00',
    Hospitals_Chargies: '0.00',
    hospitals_charges: '0.00',
    amount_paid: '0.00',
    payment_status: 'Pending',
    payment_method: 'Cash',
    symptoms_diagnosis: '',
    condition: 'Normal',
    Condation: 'Normal',
    status: 'Pending',
    attached_document: null
  });

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (patientData) {
      const docFee = Number(patientData.consultation_fee || 0);
      const hospCharges = Number(patientData.hospitals_charges || patientData.Hospitals_Chargies || patientData.hospital_charges || 0);
      const total = docFee + hospCharges;
      const amtPaid = Number(patientData.amount_paid || (patientData.payment_status === 'Paid' ? total : 0));
      const hospId = typeof patientData.hospital === 'object' ? patientData.hospital?.id : patientData.hospital;
      const docId = typeof patientData.doctor === 'object' ? patientData.doctor?.id : patientData.doctor;
      const nurseId = typeof patientData.nurse === 'object' ? patientData.nurse?.id : patientData.nurse;
      const bedNum = patientData.bed_number ? String(patientData.bed_number) : '';
      const autoRes = bedNum ? getAutoNurseForBed(bedNum, nursesList, hospId) : { nurseId: '', nurseName: '' };

      const visitDate = patientData.appointment_date || (patientData.visit_date_time ? patientData.visit_date_time.split('T')[0] : '');
      const visitTime = patientData.appointment_time || '10:00 AM';

      setEditFormData({
        patient_id: patientData.patient_id || patientData.uhid || (patientData.Appoment_id ? `APT-${patientData.Appoment_id}` : `PAT-${patientData.id}`),
        name: patientData.name || patientData.patient_name || patientData.patient_Name || '',
        patient_Name: patientData.name || patientData.patient_name || patientData.patient_Name || '',
        age: patientData.age || patientData.Age || '',
        gender: patientData.Gender || patientData.gender || 'Male',
        Gender: patientData.Gender || patientData.gender || 'Male',
        blood_group: patientData.blood_group || patientData.Blood_Group || 'A+',
        contact: patientData.contact || patientData.phone || '',
        email: patientData.email || '',
        address: patientData.address || '',
        hospital: hospId ? String(hospId) : '',
        doctor: docId ? String(docId) : '',
        doctor_name: patientData.doctor_name || '',
        visit_date: visitDate,
        visit_time: visitTime,
        bed_number: bedNum,
        nurse: nurseId ? String(nurseId) : (autoRes.nurseId ? String(autoRes.nurseId) : ''),
        consultation_fee: docFee > 0 ? String(docFee) : '0.00',
        Hospitals_Chargies: hospCharges > 0 ? String(hospCharges) : '0.00',
        hospitals_charges: hospCharges > 0 ? String(hospCharges) : '0.00',
        amount_paid: amtPaid > 0 ? String(amtPaid) : '0.00',
        payment_status: patientData.payment_status || 'Pending',
        payment_method: patientData.payment_method || 'Cash',
        symptoms_diagnosis: patientData.symptoms_diagnosis || patientData.reason_for_visit || '',
        condition: patientData.condition || patientData.Condation || patientData.symptoms_severity || 'Normal',
        Condation: patientData.condition || patientData.Condation || patientData.symptoms_severity || 'Normal',
        status: patientData.status || 'Pending',
        attached_document: patientData.attached_document || null
      });

      if (autoRes.nurseName) {
        setAutoNurseText(`Auto-Mapped: ${autoRes.nurseName} (Floor ${getFloorNumber(bedNum)})`);
      } else {
        setAutoNurseText('');
      }

      setPaymentFormData({
        amount_paid: amtPaid > 0 ? String(amtPaid) : '',
        payment_method: patientData.payment_method || 'Cash',
        payment_status: patientData.payment_status || 'Pending',
        hospital_charges: hospCharges > 0 ? String(hospCharges) : '',
        consultation_fee: docFee > 0 ? String(docFee) : ''
      });
    }
  }, [patientData, nursesList.length]);

  const extractArray = (resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData.results)) return resData.results;
    if (Array.isArray(resData.data)) return resData.data;
    if (Array.isArray(resData.doctors)) return resData.doctors;
    if (Array.isArray(resData.nurses)) return resData.nurses;
    if (Array.isArray(resData.rows)) return resData.rows;
    return [];
  };

  const isDoctorInHospital = (doc, targetHospId, targetHospName = '') => {
    if (!targetHospId && !targetHospName) return false;
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
    if (!targetHospId && !targetHospName) return false;
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

  const fetchMetadata = async () => {
    try {
      const email = (currentUser?.email || '').toLowerCase().trim();
      const recId = currentUser?.id;

      const [docsRes, hospRes, nurRes, recRes, patsRes, apptsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Doctors/`),
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`),
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`),
        fetch(`${API_BASE_URL}/super-admin/Patients/`),
        fetch(`${API_BASE_URL}/super-admin/appointments/`)
      ]);

      let docData = [];
      let hospData = [];
      let nurData = [];
      let recData = [];
      let patsData = [];
      let allApptsData = [];

      if (docsRes.status === 'fulfilled' && docsRes.value.ok) docData = extractArray(await docsRes.value.json().catch(() => []));
      if (hospRes.status === 'fulfilled' && hospRes.value.ok) hospData = extractArray(await hospRes.value.json().catch(() => []));
      if (nurRes.status === 'fulfilled' && nurRes.value.ok) nurData = extractArray(await nurRes.value.json().catch(() => []));
      if (recRes.status === 'fulfilled' && recRes.value.ok) recData = extractArray(await recRes.value.json().catch(() => []));
      if (patsRes.status === 'fulfilled' && patsRes.value.ok) patsData = extractArray(await patsRes.value.json().catch(() => []));
      if (apptsRes.status === 'fulfilled' && apptsRes.value.ok) allApptsData = extractArray(await apptsRes.value.json().catch(() => []));

      setHospitalsList(hospData);

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

      const userHospName = matchedHosp?.Name || matchedHosp?.name || currentUser?.hospital_name || matchedRec?.hospital_name || '';

      const hospDocs = userHospIdVal || userHospName
        ? docData.filter(d => isDoctorInHospital(d, userHospIdVal, userHospName))
        : [];

      const hospNurses = userHospIdVal || userHospName
        ? nurData.filter(n => isNurseInHospital(n, userHospIdVal, userHospName))
        : [];

      setDoctorsList(hospDocs);
      setNursesList(hospNurses);

      const rawAppt = patientData || selectedPatient;
      if (rawAppt) {
        const candidateIds = [
          rawAppt.appointment_pk,
          rawAppt.appointment_id,
          rawAppt.Appoment_id,
          rawAppt.appoment_id,
          rawAppt.id,
          typeof rawAppt.id === 'string' && rawAppt.id.startsWith('APT-') ? rawAppt.id.replace('APT-', '') : null,
          typeof rawAppt.patient_id === 'string' && rawAppt.patient_id.startsWith('APT-') ? rawAppt.patient_id.replace('APT-', '') : null,
          typeof rawAppt.Appoment_id === 'string' ? rawAppt.Appoment_id.replace(/\D/g, '') : null
        ].filter(Boolean);

        let foundInBackend = false;
        let apptData = null;

        // 1. Direct appointment fetch by candidate IDs
        for (const cid of candidateIds) {
          try {
            const aRes = await fetch(`${API_BASE_URL}/super-admin/appointments/${cid}/`).catch(() => null);
            if (aRes && aRes.ok) {
              const resJson = await aRes.json().catch(() => null);
              if (resJson && (resJson.id || resJson.patient_name || resJson.patient_Name || resJson.name)) {
                foundInBackend = true;
                apptData = resJson;
                break;
              }
            }
          } catch (e) { }
        }

        // 2. Find in all appointments list
        if (!foundInBackend && Array.isArray(allApptsData) && allApptsData.length > 0) {
          const rName = (rawAppt.name || rawAppt.patient_name || rawAppt.patient_Name || '').toLowerCase().trim();
          const rEmail = (rawAppt.email || '').toLowerCase().trim();
          const rPhone = String(rawAppt.contact || rawAppt.phone || '').replace(/\D/g, '');

          const match = allApptsData.find(a => {
            const aId = Number(a.id);
            const aApptId = String(a.Appoment_id || a.appoment_id || a.appointment_id || '');
            const aName = (a.patient_name || a.patient_Name || a.name || '').toLowerCase().trim();
            const aEmail = (a.email || '').toLowerCase().trim();
            const aPhone = String(a.contact || a.phone || '').replace(/\D/g, '');

            if (candidateIds.includes(aId) || candidateIds.includes(String(a.id))) return true;
            if (aApptId && candidateIds.includes(aApptId)) return true;
            if (rName && aName && rName === aName && rPhone && aPhone && rPhone === aPhone) return true;
            if (rName && aName && rName === aName && rEmail && aEmail && rEmail === aEmail) return true;
            if (rEmail && aEmail && rEmail === aEmail && rEmail.length > 4) return true;
            if (rPhone && aPhone && rPhone === aPhone && rPhone.length > 5) return true;
            if (rName && aName && rName === aName && rName.length > 2) return true;
            return false;
          });

          if (match) {
            foundInBackend = true;
            apptData = match;
          }
        }

        // 3. Find in Patients list for cross-referencing demographic data
        let matchedPatientRecord = null;
        if (Array.isArray(patsData) && patsData.length > 0) {
          const rName = (rawAppt.name || rawAppt.patient_name || rawAppt.patient_Name || apptData?.patient_name || apptData?.name || '').toLowerCase().trim();
          const rEmail = (rawAppt.email || apptData?.email || '').toLowerCase().trim();
          const rPhone = String(rawAppt.contact || rawAppt.phone || apptData?.contact || apptData?.phone || '').replace(/\D/g, '');

          matchedPatientRecord = patsData.find(p => {
            const pId = Number(p.id);
            const pName = (p.name || p.patient_Name || p.patient_name || '').toLowerCase().trim();
            const pEmail = (p.email || '').toLowerCase().trim();
            const pPhone = String(p.contact || p.phone || '').replace(/\D/g, '');

            if (candidateIds.includes(pId) || candidateIds.includes(String(p.id))) return true;
            if (p.patient_id && candidateIds.includes(String(p.patient_id))) return true;
            if (p.uhid && candidateIds.includes(String(p.uhid))) return true;
            if (rEmail && pEmail && rEmail === pEmail && rEmail.length > 4) return true;
            if (rPhone && pPhone && rPhone === pPhone && rPhone.length > 5) return true;
            if (rName && pName && rName === pName && rName.length > 2) return true;
            return false;
          });
        }

        const sourceAppt = apptData || rawAppt;
        const apptId = sourceAppt.Appoment_id || sourceAppt.appoment_id || sourceAppt.appointment_id || sourceAppt.id || rawAppt.id;

        // Resolve Doctor details
        const docIdVal = typeof sourceAppt.doctor === 'object' ? sourceAppt.doctor?.id : sourceAppt.doctor;
        const matchedDoc = docIdVal ? docData.find(d => Number(d.id) === Number(docIdVal)) : null;
        const resolvedDocName = sourceAppt.doctor_name || matchedDoc?.name || (docIdVal ? `Dr. #${docIdVal}` : 'Not Assigned');
        const resolvedDocSpec = sourceAppt.doctor_specialization || matchedDoc?.specialization || matchedDoc?.specialty || '';
        const resolvedDocFee = Number(sourceAppt.consultation_fee || matchedDoc?.consultation_fee || 0);

        // Resolve Nurse details
        const nurseIdVal = typeof sourceAppt.nurse === 'object' ? sourceAppt.nurse?.id : sourceAppt.nurse;
        const matchedNurse = nurseIdVal ? nurData.find(n => Number(n.id) === Number(nurseIdVal)) : null;
        const resolvedNurseName = sourceAppt.nurse_name || matchedNurse?.name || '';

        // Resolve Hospital details
        const hospIdVal = typeof sourceAppt.hospital === 'object' ? sourceAppt.hospital?.id : (sourceAppt.hospital || rawAppt.hospital || 1);
        const matchedHospObj = hospData.find(h => Number(h.id) === Number(hospIdVal));
        const resolvedHospName = sourceAppt.hospital_name || matchedHospObj?.Name || matchedHospObj?.name || rawAppt.hospital_name || 'Central Hospital';

        const patName = sourceAppt.patient_name || sourceAppt.patient_Name || sourceAppt.name || matchedPatientRecord?.name || rawAppt.name || 'Patient';
        const patGender = sourceAppt.Gender || sourceAppt.gender || matchedPatientRecord?.Gender || matchedPatientRecord?.gender || rawAppt.Gender || rawAppt.gender || 'Not Specified';
        const patBlood = sourceAppt.blood_group || sourceAppt.Blood_Group || matchedPatientRecord?.blood_group || matchedPatientRecord?.Blood_Group || rawAppt.blood_group || 'Not Specified';
        const patAge = sourceAppt.age || sourceAppt.Age || matchedPatientRecord?.age || matchedPatientRecord?.Age || rawAppt.age || '';
        const patPhone = sourceAppt.contact || sourceAppt.phone || matchedPatientRecord?.contact || matchedPatientRecord?.phone || rawAppt.contact || rawAppt.phone || '';
        const patEmail = sourceAppt.email || matchedPatientRecord?.email || rawAppt.email || '';
        const patAddress = sourceAppt.address || matchedPatientRecord?.address || rawAppt.address || '';
        const patUhid = matchedPatientRecord?.uhid || matchedPatientRecord?.patient_id || sourceAppt.patient_id || sourceAppt.uhid || `UHID-${apptId}`;

        const hospChargesVal = Number(sourceAppt.hospitals_charges || sourceAppt.Hospitals_Chargies || sourceAppt.hospital_charges || rawAppt.hospitals_charges || 0);
        const amtPaidVal = Number(sourceAppt.amount_paid || rawAppt.amount_paid || 0);
        const payStatusVal = sourceAppt.payment_status || rawAppt.payment_status || (amtPaidVal >= (resolvedDocFee + hospChargesVal) && (resolvedDocFee + hospChargesVal) > 0 ? 'Paid' : 'Pending');
        const payMethodVal = sourceAppt.payment_method || rawAppt.payment_method || 'Cash';
        const conditionVal = sourceAppt.condition || sourceAppt.Condation || sourceAppt.symptoms_severity || rawAppt.condition || 'Normal';
        const symptomsVal = sourceAppt.symptoms_diagnosis || sourceAppt.reason_for_visit || rawAppt.symptoms_diagnosis || 'General Clinical Consultation';
        const statusVal = sourceAppt.status || rawAppt.status || (sourceAppt.bed_number ? 'Admitted' : (docIdVal ? 'Assigned' : 'Pending'));
        const checkupVal = sourceAppt.checkup_status || rawAppt.checkup_status || 'Pending';

        const visitIso = sourceAppt.visit_date_time || sourceAppt.created_at || rawAppt.visit_date_time || new Date().toISOString();
        const visitDateVal = sourceAppt.appointment_date || (visitIso ? visitIso.split('T')[0] : '');
        const visitTimeVal = sourceAppt.appointment_time || '10:00 AM';

        const norm = {
          ...matchedPatientRecord,
          ...rawAppt,
          ...sourceAppt,
          id: sourceAppt.id || rawAppt.id,
          Appoment_id: apptId,
          appoment_id: apptId,
          appointment_id: apptId,
          patient_id: `APT-${apptId}`,
          uhid: patUhid,
          name: patName,
          patient_name: patName,
          patient_Name: patName,
          gender: patGender,
          Gender: patGender,
          blood_group: patBlood,
          Blood_Group: patBlood,
          age: patAge,
          contact: patPhone,
          phone: patPhone,
          email: patEmail,
          address: patAddress,
          hospital: hospIdVal,
          hospital_name: resolvedHospName,
          doctor: docIdVal ? Number(docIdVal) : null,
          doctor_name: resolvedDocName,
          doctor_specialization: resolvedDocSpec,
          consultation_fee: resolvedDocFee,
          nurse: nurseIdVal ? Number(nurseIdVal) : null,
          nurse_name: resolvedNurseName,
          bed_number: sourceAppt.bed_number ? Number(sourceAppt.bed_number) : null,
          hospitals_charges: hospChargesVal,
          Hospitals_Chargies: hospChargesVal,
          amount_paid: amtPaidVal,
          payment_status: payStatusVal,
          payment_method: payMethodVal,
          condition: conditionVal,
          Condation: conditionVal,
          symptoms_diagnosis: symptomsVal,
          reason_for_visit: symptomsVal,
          status: statusVal,
          checkup_status: checkupVal,
          visit_date_time: visitIso,
          appointment_date: visitDateVal,
          appointment_time: visitTimeVal,
          attached_document: sourceAppt.attached_document || rawAppt.attached_document || null,
          discharge_date: sourceAppt.discharge_date || rawAppt.discharge_date || null,
          created_at: sourceAppt.created_at || rawAppt.created_at || visitIso
        };

        const patientEmail = (patEmail || '').toLowerCase().trim();
        const patientPhone = String(patPhone || '').replace(/\D/g, '');
        const patientName = (patName || '').toLowerCase().trim();
        const patientUhid = String(patUhid || '').trim();

        const matchedHistory = (allApptsData || []).filter(a => {
          const aEmail = (a.email || '').toLowerCase().trim();
          const aPhone = String(a.contact || a.phone || '').replace(/\D/g, '');
          const aName = (a.patient_name || a.patient_Name || a.name || '').toLowerCase().trim();
          const aUhid = String(a.uhid || a.patient_id || '').trim();

          const idMatch = candidateIds.includes(Number(a.id)) || candidateIds.includes(String(a.id)) || (a.Appoment_id && candidateIds.includes(String(a.Appoment_id)));
          const emailMatch = patientEmail && aEmail && patientEmail === aEmail;
          const phoneMatch = patientPhone && aPhone && patientPhone === aPhone;
          const nameMatch = patientName && aName && patientName === aName;
          const uhidMatch = patientUhid && aUhid && patientUhid === aUhid;

          return idMatch || emailMatch || phoneMatch || (uhidMatch && patientUhid.length > 3) || (nameMatch && (patientEmail === aEmail || patientPhone === aPhone));
        });

        const normalizedHistory = (matchedHistory.length > 0 ? matchedHistory : [norm]).map(a => {
          const aDocId = typeof a.doctor === 'object' ? a.doctor?.id : a.doctor;
          const aHospId = typeof a.hospital === 'object' ? a.hospital?.id : a.hospital;
          const docObj = aDocId ? docData.find(d => Number(d.id) === Number(aDocId)) : null;
          const hospObj = aHospId ? hospData.find(h => Number(h.id) === Number(aHospId)) : null;

          const docFee = Number(a.consultation_fee || docObj?.consultation_fee || 0);
          const hospCharges = Number(a.hospitals_charges || a.Hospitals_Chargies || 0);
          const total = docFee + hospCharges;
          const amtPaid = Number(a.amount_paid || (a.payment_status === 'Paid' ? total : 0));

          return {
            ...a,
            id: a.id,
            appointment_id: a.appointment_id || a.Appoment_id || `APT-${a.id}`,
            hospital_name: a.hospital_name || hospObj?.Name || hospObj?.name || 'Hospital Branch',
            doctor_name: a.doctor_name || (docObj ? (docObj.name?.startsWith('Dr.') ? docObj.name : `Dr. ${docObj.name}`) : 'Assigned Doctor'),
            doctor_specialization: a.doctor_specialization || docObj?.specialization || 'General Physician',
            consultation_fee: docFee,
            hospitals_charges: hospCharges,
            Hospitals_Chargies: hospCharges,
            total_bill: total,
            amount_paid: amtPaid,
            condition: a.condition || a.Condation || a.symptoms_severity || 'Normal',
            status: a.status || 'Pending',
            payment_status: a.payment_status || (amtPaid >= total && total > 0 ? 'Paid' : 'Pending'),
            payment_method: a.payment_method || 'Cash',
            visit_date_time: a.visit_date_time || a.appointment_time || a.created_at || new Date().toISOString(),
            attached_document: a.attached_document || a.document || ''
          };
        });

        normalizedHistory.sort((x, y) => new Date(y.visit_date_time || 0) - new Date(x.visit_date_time || 0));
        setPatientAppointments(normalizedHistory);

        setPatientData(norm);
        if (setSelectedPatient) setSelectedPatient(norm);
        localStorage.setItem('selectedPatient', JSON.stringify(norm));
      }
    } catch (e) {
      console.error('Error loading metadata:', e);
    }
  };

  const activePatient = patientData;

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name === 'doctor') {
      const selectedDoc = doctorsList.find(d => Number(d.id) === Number(value));
      setEditFormData(prev => ({
        ...prev,
        doctor: value,
        doctor_name: selectedDoc ? selectedDoc.name : prev.doctor_name,
        consultation_fee: selectedDoc?.consultation_fee ? String(selectedDoc.consultation_fee) : prev.consultation_fee,
        status: value && prev.status === 'Pending' ? 'Assigned' : prev.status
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleEditBedChange = (bedVal) => {
    const hospId = editFormData.hospital || (typeof activePatient?.hospital === 'object' ? activePatient.hospital?.id : activePatient?.hospital);
    const autoRes = bedVal ? getAutoNurseForBed(bedVal, nursesList, hospId) : { nurseId: '', nurseName: '' };

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
    const selectedDoc = doctorsList.find(d => Number(d.id) === Number(docVal));
    setEditFormData(prev => ({
      ...prev,
      doctor: docVal,
      doctor_name: selectedDoc ? selectedDoc.name : '',
      consultation_fee: selectedDoc?.consultation_fee ? String(selectedDoc.consultation_fee) : prev.consultation_fee,
      status: docVal && prev.status === 'Pending' ? 'Assigned' : prev.status
    }));
  };

  const updatePatientBackend = async (id, payload, file = null, numericId = null) => {
    // Collect all candidate Appointment IDs (prioritizing integer primary keys of Appointment model)
    const rawIds = [
      activePatient?.appointment_pk,
      activePatient?.appointment_id,
      activePatient?.Appoment_id,
      activePatient?.appoment_id,
      numericId,
      activePatient?.id,
      id,
      typeof id === 'string' && id.startsWith('APT-') ? id.replace('APT-', '') : null,
      typeof id === 'string' ? id.replace(/\D/g, '') : null
    ].filter(Boolean);

    const candidateIds = Array.from(new Set(rawIds.map(v => typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v)));
    if (candidateIds.length === 0) return { ok: false, error: 'Appointment ID missing' };

    const apptId = activePatient?.Appoment_id || activePatient?.appoment_id || activePatient?.appointment_id || activePatient?.id || id;
    const nameVal = (payload.patient_Name || payload.patient_name || payload.name || activePatient?.name || activePatient?.patient_Name || '').trim();
    const phoneVal = (payload.contact || payload.phone || activePatient?.contact || activePatient?.phone || '').trim();
    const condVal = ['Critical', 'Emergency', 'Urgent', 'Normal'].includes(payload.condition || payload.Condation) ? (payload.condition || payload.Condation) : (activePatient?.condition || 'Normal');
    const chargesVal = Number(payload.hospitals_charges ?? payload.Hospitals_Chargies ?? activePatient?.hospitals_charges ?? 0);
    const paidVal = Number(payload.amount_paid ?? activePatient?.amount_paid ?? 0);
    const patGender = ['Male', 'Female', 'Other'].includes(payload.Gender || payload.gender)
      ? (payload.Gender || payload.gender)
      : (activePatient?.Gender || activePatient?.gender || 'Male');
    const ageNum = payload.age && !isNaN(Number(payload.age)) ? Number(payload.age) : (activePatient?.age && !isNaN(Number(activePatient.age)) ? Number(activePatient.age) : 25);

    // Clean Appointment Model Payload strictly conforming to Django serializer fields
    const cleanApptPayload = {
      ...payload,
      Appoment_id: apptId,
      appoment_id: apptId,
      appointment_id: apptId,
      name: nameVal,
      patient_Name: nameVal,
      patient_name: nameVal,
      contact: phoneVal,
      phone: phoneVal,
      email: (payload.email || activePatient?.email || '').trim(),
      age: ageNum,
      gender: patGender,
      Gender: patGender,
      patient_gender: patGender,
      blood_group: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(payload.blood_group) ? payload.blood_group : (activePatient?.blood_group || 'A+'),
      Blood_Group: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(payload.blood_group) ? payload.blood_group : (activePatient?.blood_group || 'A+'),
      address: (payload.address || activePatient?.address || 'Hospital Inpatient').trim(),
      hospitals_charges: Number(chargesVal).toFixed(2),
      Hospitals_Chargies: Number(chargesVal).toFixed(2),
      hospital_charges: Number(chargesVal).toFixed(2),
      amount_paid: Number(paidVal).toFixed(2),
      payment_status: ['Paid', 'Partial', 'Pending', 'Failed'].includes(payload.payment_status) ? payload.payment_status : (activePatient?.payment_status || 'Pending'),
      payment_method: ['UPI', 'Credit Card', 'Net Banking', 'Cash'].includes(payload.payment_method) ? payload.payment_method : (activePatient?.payment_method || 'Cash'),
      status: ['Pending', 'Assigned', 'Admitted', 'Discharged', 'Cancelled'].includes(payload.status) ? payload.status : (activePatient?.status || 'Pending'),
      checkup_status: payload.checkup_status || activePatient?.checkup_status || 'Pending',
      condition: condVal,
      Condation: condVal,
      Condition: condVal,
      symptoms_diagnosis: (payload.symptoms_diagnosis || payload.reason_for_visit || activePatient?.symptoms_diagnosis || 'General Consultation').trim(),
      reason_for_visit: (payload.symptoms_diagnosis || payload.reason_for_visit || activePatient?.symptoms_diagnosis || 'General Consultation').trim(),
      visit_date_time: payload.visit_date_time || activePatient?.visit_date_time || new Date().toISOString(),
      is_active: true
    };

    if (payload.hospital) cleanApptPayload.hospital = Number(payload.hospital);
    else if (currentUser?.hospital) cleanApptPayload.hospital = Number(currentUser.hospital);

    if (payload.doctor) {
      cleanApptPayload.doctor = Number(payload.doctor);
    }
    if (payload.bed_number !== undefined && payload.bed_number !== null && !isNaN(payload.bed_number)) {
      cleanApptPayload.bed_number = Number(payload.bed_number);
    }

    let lastError = '';

    // Step 1: Try updating by candidate Appointment primary key IDs
    for (const targetId of candidateIds) {
      try {
        let res;
        if (file instanceof File) {
          const formData = new FormData();
          Object.entries(cleanApptPayload).forEach(([key, val]) => {
            if (val !== null && val !== undefined && val !== '') {
              formData.append(key, val);
            }
          });
          formData.append('attached_document', file);

          res = await fetch(`${API_BASE_URL}/super-admin/appointments/${targetId}/`, {
            method: 'PATCH',
            body: formData
          });
        } else {
          res = await fetch(`${API_BASE_URL}/super-admin/appointments/${targetId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanApptPayload)
          });
        }

        if (res && res.ok) {
          const resJson = await res.json().catch(() => ({}));
          return { ok: true, data: resJson };
        } else if (res) {
          const errText = await res.text().catch(() => '');
          lastError = errText;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    // Step 2: If direct ID returned 404, query appointments list to find exact backend Appointment ID
    try {
      const allApptsRes = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
      if (allApptsRes && allApptsRes.ok) {
        const allAppts = extractArray(await allApptsRes.json().catch(() => []));
        const patName = cleanApptPayload.name.toLowerCase().trim();
        const patEmail = (cleanApptPayload.email || '').toLowerCase().trim();
        const patPhone = String(cleanApptPayload.contact || '').replace(/\D/g, '');

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
            const formData = new FormData();
            Object.entries(cleanApptPayload).forEach(([key, val]) => {
              if (val !== null && val !== undefined && val !== '') {
                formData.append(key, val);
              }
            });
            formData.append('attached_document', file);

            res = await fetch(`${API_BASE_URL}/super-admin/appointments/${matched.id}/`, {
              method: 'PATCH',
              body: formData
            });
          } else {
            res = await fetch(`${API_BASE_URL}/super-admin/appointments/${matched.id}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cleanApptPayload)
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

    return { ok: false, error: lastError || 'Appointment not found in database' };
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activePatient || !activePatient.id) return;

    if (!editFormData.name?.trim() && !editFormData.patient_Name?.trim()) {
      alert('Please enter patient name.');
      return;
    }

    try {
      setLoading(true);
      const apptId = activePatient.Appoment_id || activePatient.appoment_id || activePatient.appointment_id || activePatient.id;
      const numericId = activePatient.id;
      const selectedDocObj = doctorsList.find(d => Number(d.id) === Number(editFormData.doctor));
      // Strictly preserve patient's selected hospital - Receptionist cannot alter hospital
      const hospId = Number(typeof activePatient.hospital === 'object' ? activePatient.hospital?.id : (activePatient.hospital || currentUser?.hospital || 1));
      const isDischarged = editFormData.status === 'Discharged' || editFormData.status === 'Cancelled';
      const parsedBedNum = isDischarged ? null : (editFormData.bed_number ? Number(editFormData.bed_number) : null);
      const autoRes = parsedBedNum ? getAutoNurseForBed(parsedBedNum, nursesList, hospId) : { nurseId: null, nurseName: '' };
      const selectedNurseObj = nursesList.find(n => Number(n.id) === Number(editFormData.nurse)) || (autoRes.nurseId ? nursesList.find(n => Number(n.id) === autoRes.nurseId) : null);

      const chosenCondition = ['Critical', 'Emergency', 'Urgent', 'Normal'].includes(editFormData.condition || editFormData.Condation) ? (editFormData.condition || editFormData.Condation) : (activePatient?.condition || 'Normal');
      
      let visitIso = activePatient.visit_date_time || new Date().toISOString();
      if (editFormData.visit_date) {
        visitIso = `${editFormData.visit_date}T10:00:00`;
      }

      const chosenGender = ['Male', 'Female', 'Other'].includes(editFormData.gender || editFormData.Gender)
        ? (editFormData.gender || editFormData.Gender)
        : (activePatient?.Gender || activePatient?.gender || 'Male');

      const patNameVal = (editFormData.patient_Name || editFormData.name || activePatient.name || activePatient.patient_Name || '').trim();
      const phoneVal = (editFormData.contact || activePatient.contact || activePatient.phone || '').trim();
      const chargesVal = Number(editFormData.hospitals_charges ?? editFormData.Hospitals_Chargies ?? 0);
      const paidVal = Number(editFormData.amount_paid ?? 0);
      const ageNum = editFormData.age && !isNaN(Number(editFormData.age)) ? Number(editFormData.age) : (activePatient?.age && !isNaN(Number(activePatient.age)) ? Number(activePatient.age) : 25);

      const payloadData = {
        Appoment_id: apptId,
        appoment_id: apptId,
        appointment_id: apptId,
        patient_name: patNameVal,
        patient_Name: patNameVal,
        name: patNameVal,
        patient_id: editFormData.patient_id || activePatient.patient_id || `APT-${apptId}`,
        contact: phoneVal,
        phone: phoneVal,
        email: (editFormData.email || activePatient.email || '').trim(),
        age: ageNum,
        gender: chosenGender,
        Gender: chosenGender,
        patient_gender: chosenGender,
        blood_group: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(editFormData.blood_group) ? editFormData.blood_group : (activePatient?.blood_group || 'A+'),
        Blood_Group: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(editFormData.blood_group) ? editFormData.blood_group : (activePatient?.blood_group || 'A+'),
        address: (editFormData.address || activePatient.address || 'Hospital Inpatient').trim(),
        hospital: hospId,
        doctor: editFormData.doctor ? Number(editFormData.doctor) : null,
        doctor_name: selectedDocObj ? selectedDocObj.name : (editFormData.doctor_name || ''),
        doctor_specialization: selectedDocObj ? (selectedDocObj.specialization || selectedDocObj.specialty || '') : '',
        bed_number: parsedBedNum,
        nurse: selectedNurseObj ? Number(selectedNurseObj.id) : (editFormData.nurse ? Number(editFormData.nurse) : null),
        nurse_name: selectedNurseObj ? selectedNurseObj.name : '',
        consultation_fee: Number(editFormData.consultation_fee) || 0.00,
        Hospitals_Chargies: Number(chargesVal).toFixed(2),
        hospitals_charges: Number(chargesVal).toFixed(2),
        hospital_charges: Number(chargesVal).toFixed(2),
        amount_paid: Number(paidVal).toFixed(2),
        payment_status: ['Paid', 'Partial', 'Pending', 'Failed'].includes(editFormData.payment_status) ? editFormData.payment_status : (activePatient?.payment_status || 'Pending'),
        payment_method: ['UPI', 'Credit Card', 'Net Banking', 'Cash'].includes(editFormData.payment_method) ? editFormData.payment_method : (activePatient?.payment_method || 'Cash'),
        symptoms_diagnosis: (editFormData.symptoms_diagnosis || activePatient.symptoms_diagnosis || 'General Consultation').trim(),
        reason_for_visit: (editFormData.symptoms_diagnosis || activePatient.symptoms_diagnosis || 'General Consultation').trim(),
        condition: chosenCondition,
        Condation: chosenCondition,
        Condition: chosenCondition,
        status: ['Pending', 'Assigned', 'Admitted', 'Discharged', 'Cancelled'].includes(editFormData.status) ? editFormData.status : (parsedBedNum ? 'Admitted' : (editFormData.doctor ? 'Assigned' : 'Pending')),
        checkup_status: activePatient?.checkup_status || 'Pending',
        visit_date_time: visitIso,
        appointment_date: editFormData.visit_date || (visitIso ? visitIso.split('T')[0] : ''),
        appointment_time: editFormData.visit_time || '10:00 AM',
        is_active: true
      };

      const result = await updatePatientBackend(apptId, payloadData, editAttachedFile || editSelectedFile, numericId);

      if (result && result.ok) {
        const merged = { ...activePatient, ...payloadData, ...(result.data || {}) };
        alert(`Success! Patient record for "${merged.name || merged.patient_Name}" updated successfully in backend database.`);
        setPatientData(merged);
        if (setSelectedPatient) setSelectedPatient(merged);
        localStorage.setItem('selectedPatient', JSON.stringify(merged));
        setEditSelectedFile(null);
        setEditAttachedFile(null);
        setIsEditModalOpen(false);
      } else {
        console.error('Update failed:', result?.error);
        alert(`Failed to update patient record in backend database.\n${result?.error || 'Please check backend server status.'}`);
      }
    } catch (err) {
      console.error('Error updating patient:', err);
      alert(err.message || 'Error updating patient file.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Payment Collection / Billing Submission
  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!activePatient || !activePatient.id) return;

    try {
      setLoading(true);
      const docFee = Number(paymentFormData.consultation_fee) || 0;
      const hospCharge = Number(paymentFormData.hospital_charges) || 0;
      const totalAmount = docFee + hospCharge;
      const amountPaid = Number(paymentFormData.amount_paid) || 0;
      const payStatus = paymentFormData.payment_status || (amountPaid >= totalAmount && totalAmount > 0 ? 'Paid' : 'Pending');
      const payMethod = paymentFormData.payment_method || 'Cash';

      const payload = {
        consultation_fee: docFee,
        hospital_charges: hospCharge,
        Hospitals_Chargies: hospCharge,
        hospitals_charges: hospCharge,
        amount_paid: amountPaid,
        payment_method: payMethod,
        payment_status: payStatus
      };

      const apptId = activePatient.Appoment_id || activePatient.appoment_id || activePatient.appointment_id || activePatient.id;
      const numericId = activePatient.id;
      const result = await updatePatientBackend(apptId, payload, null, numericId);

      if (result && result.ok) {
        const merged = { ...activePatient, ...payload, ...(result.data || {}) };
        alert(`Payment of ₹${amountPaid.toFixed(2)} recorded successfully in database! Status: ${payStatus}.`);
        setPatientData(merged);
        if (setSelectedPatient) setSelectedPatient(merged);
        localStorage.setItem('selectedPatient', JSON.stringify(merged));
        setIsPaymentModalOpen(false);
      } else {
        alert(`Failed to update payment in database.\n${result?.error || 'Please verify backend connection.'}`);
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Error updating payment.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Patient Discharge Process
  const handleProcessDischarge = async () => {
    if (!activePatient || !activePatient.id) return;

    // VALIDATION: Must be paid before discharge
    if (activePatient.payment_status !== 'Paid') {
      alert('⚠️ Payment Required:\nThe total hospital bill must be paid and marked as "Paid" before this patient can be discharged.\nPlease click "Collect & Pay Bill" first.');
      setIsPaymentModalOpen(true);
      return;
    }

    try {
      setLoading(true);
      const nowIso = new Date().toISOString();

      const dischargePayload = {
        status: 'Discharged',
        discharge_status: 'Discharged',
        discharge_date: nowIso,
        completed_at: nowIso,
        bed_number: null // free the bed upon discharge
      };

      const apptId = activePatient.Appoment_id || activePatient.appoment_id || activePatient.appointment_id || activePatient.id;
      const numericId = activePatient.id;
      const result = await updatePatientBackend(apptId, dischargePayload, null, numericId);

      if (result && result.ok) {
        const merged = { ...activePatient, ...dischargePayload, ...(result.data || {}) };
        alert(`🎉 Success!\nPatient ${activePatient.name} (UHID: ${activePatient.patient_id || `PAT-${activePatient.id}`}) has been successfully discharged.\nBed #${activePatient.bed_number || 'N/A'} is now free.\nThis record is now archived in Discharge & Medical History.`);
        setPatientData(merged);
        if (setSelectedPatient) setSelectedPatient(merged);
        localStorage.setItem('selectedPatient', JSON.stringify(merged));
        setIsDischargeModalOpen(false);
      } else {
        alert(`Failed to complete discharge process in backend.\n${result?.error || 'Please check backend connection.'}`);
      }
    } catch (err) {
      console.error('Error processing discharge:', err);
      alert('Error completing discharge.');
    } finally {
      setLoading(false);
    }
  };

  if (!activePatient) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xs font-bold uppercase tracking-wider">
            Patient
          </div>
          <h2 className="text-xl font-bold text-slate-800">No Patient Record Found in Database</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            This appointment or patient record does not exist in the backend database.
          </p>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('receptionist_patients')}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm cursor-pointer"
          >
            ← Return to Patient Admissions
          </button>
        </div>
      </div>
    );
  }

  const isDischarged = (activePatient.status || '').toLowerCase().includes('discharg');
  const isPaid = (activePatient.payment_status === 'Paid');
  const isCheckupDone = (activePatient.checkup_status === 'Checkup Done');

  const cond = activePatient.Condation || activePatient.condition || activePatient.symptoms_severity || 'Normal';
  const condColor = cond === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-200' :
    cond === 'Emergency' ? 'bg-red-100 text-red-800 border-red-200' :
      cond === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-200' :
        'bg-emerald-100 text-emerald-800 border-emerald-200';

  const hospitalObj = hospitalsList.find(h => Number(h.id) === Number(typeof activePatient.hospital === 'object' ? activePatient.hospital?.id : activePatient.hospital));
  const hospDisplayName = hospitalObj ? hospitalObj.Name : (activePatient.hospital_name || 'Apex Care Central Hospital');

  const docFeeVal = Number(activePatient.consultation_fee || 0);
  const hospFeeVal = Number(activePatient.hospitals_charges || activePatient.Hospitals_Chargies || activePatient.hospital_charges || 0);
  const totalBill = docFeeVal + hospFeeVal;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5">
      {/* TOP NAVIGATION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('receptionist_patients')}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Admissions Directory
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* GENERATE BILL INVOICE BUTTON */}
          <button
            type="button"
            onClick={() => setIsInvoiceModalOpen(true)}
            className={`px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 ${isCheckupDone
                ? 'bg-teal-700 hover:bg-teal-800 text-white ring-2 ring-teal-500/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
          >
            <span>🧾</span>
            <span>Generate Bill Receipt</span>
          </button>

          {/* COLLECT / PAY BILL BUTTON */}
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className={`px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 ${isPaid
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
          >
            <span>💳</span>
            <span>{isPaid ? 'Payment Received (₹' + Number(activePatient.amount_paid || totalBill).toFixed(0) + ')' : 'Collect & Pay Bill'}</span>
          </button>

          {/* DISCHARGE PATIENT BUTTON */}
          {!isDischarged ? (
            <button
              type="button"
              onClick={() => setIsDischargeModalOpen(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 ${isPaid
                  ? 'bg-teal-600 hover:bg-teal-700 text-white animate-pulse'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
            >
              <span>🏥</span>
              <span>Process Discharge</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold flex items-center gap-1">
              <span>✓</span> Discharged ({new Date(activePatient.discharge_date || activePatient.updated_at || Date.now()).toLocaleDateString('en-IN')})
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition cursor-pointer flex items-center gap-1"
          >
            Edit Record
          </button>
          <button
            type="button"
            onClick={() => setIsInvoiceModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1"
          >
            Print Slip
          </button>
        </div>
      </div>

      {/* DISCHARGED ARCHIVED BANNER */}
      {isDischarged && (
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📜</span>
            <div>
              <p className="font-bold">Archived Medical History Record</p>
              <p className="text-[11px] text-purple-700">This patient has been fully discharged. The bed is freed, bill has been cleared, and records are preserved for medical history.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-purple-200 text-purple-900 font-bold text-[10px] uppercase">
            Discharged
          </span>
        </div>
      )}

      {/* PATIENT PROFILE HEADER CARD */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
              {activePatient.name?.slice(0, 2).toUpperCase() || 'PT'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100">{activePatient.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${condColor}`}>
                  {cond} Priority
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                <span className="font-mono bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700 font-bold">
                  APT-ID: {activePatient.Appoment_id || activePatient.appoment_id || activePatient.appointment_id || activePatient.id}
                </span>
                <span>{activePatient.age ? `Age: ${activePatient.age} Yrs` : 'Age: Not specified'}</span>
                <span>Gender: {activePatient.Gender || activePatient.gender || 'Not Specified'}</span>
                {activePatient.blood_group && <span className="text-rose-400 font-bold">Blood: {activePatient.blood_group}</span>}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Doctor Checkup</span>
              <span className={`text-xs font-bold ${isCheckupDone ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isCheckupDone ? '✓ Checkup Done' : '⏳ Pending'}
              </span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Status</span>
              <span className={`text-xs font-bold ${isDischarged ? 'text-purple-400' : 'text-emerald-400'}`}>
                {activePatient.status || 'Active Inpatient'}
              </span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Bed Allocation</span>
              <span className="text-xs font-bold text-teal-300">
                {activePatient.bed_number ? `Bed #${activePatient.bed_number} (Fl ${getFloorNumber(activePatient.bed_number)})` : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-COLUMN GRID DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT 2 COLUMNS: CLINICAL & DOCTOR INFO */}
        <div className="lg:col-span-2 space-y-5">
          {/* CONSULTING DOCTOR & WARD STATION */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <span>Consulting Medical Staff & Duty Station</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Attending Doctor</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {activePatient.doctor_name || (activePatient.doctor ? `Dr. #${activePatient.doctor}` : '-')}
                </span>
                <span className="text-xs text-teal-700 font-semibold">
                  {activePatient.doctor_specialization || '-'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Designated Station Nurse</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {activePatient.nurse_name || (activePatient.nurse ? `Nurse #${activePatient.nurse}` : '-')}
                </span>
                <span className="text-xs text-slate-500">
                  {activePatient.nurse_name ? 'Auto-Assigned based on Bed Floor' : '-'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
                  <span>Hospital Campus</span>
                  <span className="text-[9px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold border border-amber-300">
                    🔒 Patient Choice (Locked)
                  </span>
                </span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">{hospDisplayName}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Ward & Bed Number</span>
                <span className="text-xs font-bold text-teal-800 block mt-0.5">
                  {activePatient.bed_number ? `Bed #${activePatient.bed_number} (Floor ${getFloorNumber(activePatient.bed_number)})` : (isDischarged && activePatient.bed_number ? 'Discharged' : '-')}
                </span>
              </div>
            </div>
          </div>

          {/* CLINICAL COMPLAINT & SYMPTOMS & SCHEDULE */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <span>Reason For Visit, Clinical Diagnosis & Schedule</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Appointment Date</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {activePatient.appointment_date || (activePatient.visit_date_time ? activePatient.visit_date_time.split('T')[0] : 'Today')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Time Slot</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {activePatient.appointment_time || '10:00 AM'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Triage Priority</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border mt-1 ${condColor}`}>
                  {cond} Priority
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">Symptoms / Chief Complaint & Notes:</span>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                {activePatient.symptoms_diagnosis || activePatient.reason_for_visit || 'General Consultation'}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400 border-t border-slate-100">
              <span>Registered / Booked: {new Date(activePatient.created_at || activePatient.visit_date_time || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              {activePatient.discharge_date && (
                <span className="text-purple-700 font-semibold">Discharged: {new Date(activePatient.discharge_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              )}
            </div>
          </div>

          {/* CONTACT & RESIDENTIAL */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              <span>Patient Contact & Identity Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Permanent UHID:</span>
                <span className="font-mono font-bold text-teal-800 text-sm mt-0.5 block">{activePatient.uhid || activePatient.patient_id || `PAT-${activePatient.id}`}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Contact Phone:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{activePatient.contact || activePatient.phone || 'Not provided'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Email Address:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block truncate" title={activePatient.email}>{activePatient.email || 'Not provided'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-400 block font-medium">Residential Address:</span>
              <span className="font-semibold text-slate-800 block mt-0.5">{activePatient.address || 'Address not provided'}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: BILLING & PAYMENT & DISCHARGE */}
        <div className="space-y-5">
          {/* ITEMISED BILLING & INVOICE CARD */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Billing & Discharge Invoicing
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                {activePatient.payment_status || 'Pending'}
              </span>
            </div>

            {/* DOCTOR CHECKUP STATUS BANNER */}
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${isCheckupDone ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
              <div className="flex items-center gap-2">
                <span className="text-base">{isCheckupDone ? '🩺' : '⏳'}</span>
                <div>
                  <p className="font-bold">{isCheckupDone ? 'Doctor Checkup Completed' : 'Doctor Checkup Pending'}</p>
                  <p className="text-[10px] text-slate-600">
                    {isCheckupDone ? 'Checkup done! Receptionist can generate bill & collect payment.' : 'Doctor consultation in progress. Bill finalized after checkup.'}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${isCheckupDone ? 'bg-emerald-200 text-emerald-900 border-emerald-300' : 'bg-amber-200 text-amber-900 border-amber-300'
                }`}>
                {isCheckupDone ? 'Ready to Bill' : 'Checkup Pending'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {docFeeVal > 0 && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>Doctor Consultation Fee:</span>
                  <span className="font-bold text-slate-800">
                    ₹{docFeeVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-600">
                <span>Hospital Facility / Bed Care:</span>
                <span className="font-bold text-slate-800">
                  ₹{hospFeeVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-slate-900">
                <span>Total Calculated Bill:</span>
                <span className="text-teal-700 font-extrabold text-base">
                  ₹{totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span>Amount Paid:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  ₹{Number(activePatient.amount_paid || (isPaid ? totalBill : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {Math.max(0, totalBill - Number(activePatient.amount_paid || 0)) > 0 && !isPaid && (
                <div className="flex items-center justify-between text-xs text-rose-600 font-bold">
                  <span>Balance Due:</span>
                  <span className="font-mono">
                    ₹{Math.max(0, totalBill - Number(activePatient.amount_paid || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Payment Mode:</span>
                <span className="font-bold text-slate-800">{activePatient.payment_method || 'Cash'}</span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(true)}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${isCheckupDone
                    ? 'bg-teal-700 hover:bg-teal-800 text-white'
                    : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
              >
                <span>🧾</span>
                <span>{isCheckupDone ? 'Generate & Print Official Bill' : 'View Interim Bill Estimate'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>💳</span>
                <span>{isPaid ? 'Edit Payment Details' : 'Collect & Record Payment'}</span>
              </button>

              {!isDischarged && (
                <button
                  type="button"
                  onClick={handleProcessDischarge}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${isPaid
                      ? 'bg-teal-600 hover:bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                >
                  <span>🏥</span>
                  <span>{isPaid ? 'Discharge Patient Now' : 'Pay Bill First to Discharge'}</span>
                </button>
              )}
            </div>
          </div>

          {/* ATTACHED DOCUMENTS */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              <span>Attached Medical Documents</span>
            </h3>

            {activePatient.attached_document ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 truncate max-w-[170px]">
                  {String(activePatient.attached_document).split('/').pop()}
                </span>
                <a
                  href={String(activePatient.attached_document).startsWith('http') ? activePatient.attached_document : `${API_BASE_URL.replace('/api', '')}${activePatient.attached_document}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold"
                >
                  View File
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2">No documents attached to this patient file.</p>
            )}
          </div>
        </div>
      </div>

      {/* ALL PATIENT APPOINTMENTS & CLINICAL VISIT HISTORY */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                Patient Appointment & Clinical Visit History
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                {patientAppointments.length} Visit{patientAppointments.length === 1 ? '' : 's'} Logged
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Appointments matched for: <strong className="text-slate-700">{activePatient.email || activePatient.contact || activePatient.name}</strong>
            </p>
          </div>
        </div>

        {patientAppointments.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/80">
            <p className="text-xs font-semibold text-slate-500">
              No previous appointments found for this patient under email/contact records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Appt ID & Date</th>
                  <th className="p-3">Hospital Branch</th>
                  <th className="p-3">Doctor & Dept</th>
                  <th className="p-3">Ward / Bed</th>
                  <th className="p-3">Diagnosis / Reason</th>
                  <th className="p-3">Condition</th>
                  <th className="p-3">Billing (Doc + Hosp)</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Document</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {patientAppointments.map((appt, idx) => (
                  <tr key={appt.id || idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 block w-max">
                        {appt.appointment_id || `APT-${appt.id}`}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {appt.visit_date_time ? new Date(appt.visit_date_time).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-bold text-slate-800 block">{appt.hospital_name}</span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-bold text-teal-800 block">{appt.doctor_name}</span>
                      <span className="text-[10px] text-slate-400 block">{appt.doctor_specialization || 'Consultant'}</span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {appt.bed_number ? (
                        <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          Bed #{appt.bed_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">OPD / No Bed</span>
                      )}
                    </td>
                    <td className="p-3 max-w-xs">
                      <p className="truncate text-slate-800 font-medium" title={appt.symptoms_diagnosis || appt.reason_for_visit}>
                        {appt.symptoms_diagnosis || appt.reason_for_visit || 'General Consultation'}
                      </p>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        appt.condition === 'Critical'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : appt.condition === 'Emergency'
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : appt.condition === 'Urgent'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {appt.condition || 'Normal'}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono">
                      <span className="font-bold text-slate-800 block">₹{Number(appt.total_bill || (Number(appt.consultation_fee || 0) + Number(appt.Hospitals_Chargies || appt.hospitals_charges || 0))).toFixed(2)}</span>
                      <span className="text-[10px] text-emerald-600 block">Paid: ₹{Number(appt.amount_paid || 0).toFixed(2)}</span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        appt.payment_status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {appt.payment_status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        appt.status === 'Confirmed' || appt.status === 'Admitted' || appt.status === 'Discharged' || appt.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : appt.status === 'Cancelled' || appt.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {appt.status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {appt.attached_document ? (
                        <a
                          href={appt.attached_document}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-sky-600 hover:underline inline-flex items-center gap-1"
                        >
                          View File
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHistoryAppt(appt);
                          setIsHistoryDetailsModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 font-bold border border-teal-200 transition cursor-pointer"
                      >
                        View Visit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: COLLECT PAYMENT */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Collect Hospital Bill & Payment</h3>
                <p className="text-xs text-slate-300">{activePatient.name} • UHID: {activePatient.patient_id || activePatient.uhid}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Doctor Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paymentFormData.consultation_fee}
                    onChange={(e) => {
                      const val = e.target.value;
                      const hVal = paymentFormData.hospital_charges;
                      const tot = (Number(val) || 0) + (Number(hVal) || 0);
                      setPaymentFormData(prev => ({
                        ...prev,
                        consultation_fee: val,
                        amount_paid: prev.amount_paid ? prev.amount_paid : (tot > 0 ? String(tot) : '')
                      }));
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Hospital / Bed Care (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paymentFormData.hospital_charges}
                    onChange={(e) => {
                      const val = e.target.value;
                      const dVal = paymentFormData.consultation_fee;
                      const tot = (Number(val) || 0) + (Number(dVal) || 0);
                      setPaymentFormData(prev => ({
                        ...prev,
                        hospital_charges: val,
                        amount_paid: prev.amount_paid ? prev.amount_paid : (tot > 0 ? String(tot) : '')
                      }));
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs text-emerald-950 font-bold">
                <span>Calculated Total:</span>
                <span className="text-base font-extrabold text-emerald-800">
                  ₹{(Number(paymentFormData.consultation_fee || 0) + Number(paymentFormData.hospital_charges || 0)).toFixed(2)}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Amount Paid (₹) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const tot = (Number(paymentFormData.consultation_fee || 0) + Number(paymentFormData.hospital_charges || 0));
                      setPaymentFormData(prev => ({ ...prev, amount_paid: String(tot), payment_status: tot > 0 ? 'Paid' : 'Pending' }));
                    }}
                    className="text-[10px] text-teal-700 hover:text-teal-900 font-bold underline cursor-pointer"
                  >
                    Set Full Paid
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={paymentFormData.amount_paid}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount_paid: e.target.value })}
                  placeholder="Enter amount collected"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentFormData.payment_method}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  >
                    <option value="">-- Select Payment Method --</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Insurance">Insurance / TPA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Status</label>
                  <select
                    value={paymentFormData.payment_status}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-emerald-700"
                  >
                    <option value="">-- Select Payment Status --</option>
                    <option value="Paid">Paid (Bill Cleared)</option>
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save & Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISCHARGE CONFIRMATION */}
      {isDischargeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 bg-teal-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Confirm Patient Discharge</h3>
              <button
                type="button"
                onClick={() => setIsDischargeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-teal-800 hover:bg-teal-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900 text-sm">{activePatient.name}</p>
                <p className="text-slate-500">UHID: {activePatient.patient_id || activePatient.uhid} • Bed #{activePatient.bed_number || 'N/A'}</p>
                <p className="text-emerald-700 font-bold pt-1">✓ Payment Verified: ₹{Number(activePatient.amount_paid || totalBill).toFixed(2)} (Paid)</p>
              </div>

              <p className="leading-relaxed">
                By discharging this patient:
                <br />• The allocated bed (#{activePatient.bed_number || 'N/A'}) will be freed up for new admissions.
                <br />• The discharge date & timestamp will be officially recorded.
                <br />• This file will be moved to the <strong>Medical Discharge & History Archive</strong> visible to Receptionists, Admins, and Super Admins.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDischargeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessDischarge}
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Discharging...' : 'Confirm Final Discharge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CLINICAL FILE & APPOINTMENT DETAILS (Complete 4-Section Form matching Unassigned) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Patient Clinical File & Appointment Details</span>
                </h3>
                <p className="text-xs text-slate-300">
                  {activePatient.name} • Appointment ID: APT-{activePatient.Appoment_id || activePatient.appoment_id || activePatient.appointment_id || activePatient.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setIsEditModalOpen(false); setEditAttachedFile(null); }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5 overflow-y-auto">
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
                      name="patient_Name"
                      value={editFormData.patient_Name || editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, patient_Name: e.target.value, name: e.target.value })}
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
                      name="age"
                      value={editFormData.age}
                      onChange={handleEditChange}
                      placeholder="e.g. 28"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                    <select
                      name="gender"
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
                      name="contact"
                      value={editFormData.contact}
                      onChange={handleEditChange}
                      placeholder="Phone number"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email ID</label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditChange}
                      placeholder="patient@example.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                    <select
                      name="blood_group"
                      value={editFormData.blood_group}
                      onChange={handleEditChange}
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
                    name="address"
                    value={editFormData.address}
                    onChange={handleEditChange}
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
                           activePatient?.hospital_name || 'Patient Selected Hospital'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">Read-only</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Consulting Doctor</label>
                    <select
                      name="doctor"
                      value={editFormData.doctor}
                      onChange={(e) => handleEditDoctorChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
                      <option value="">-- Unassigned Doctor --</option>
                      {doctorsList.map(d => (
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
                      name="visit_date"
                      value={editFormData.visit_date}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                    <select
                      name="visit_time"
                      value={editFormData.visit_time}
                      onChange={handleEditChange}
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
                      name="condition"
                      value={editFormData.condition || editFormData.Condation || 'Normal'}
                      onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value, Condation: e.target.value })}
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
                    name="symptoms_diagnosis"
                    value={editFormData.symptoms_diagnosis}
                    onChange={handleEditChange}
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
                      name="nurse"
                      value={editFormData.nurse}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white cursor-pointer"
                    >
                      <option value="">-- Auto-assigned from Bed Duty --</option>
                      {nursesList.map(n => (
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
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditChange}
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
                      name="payment_status"
                      value={editFormData.payment_status}
                      onChange={handleEditChange}
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
                      name="payment_method"
                      value={editFormData.payment_method}
                      onChange={handleEditChange}
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
                      name="hospitals_charges"
                      value={editFormData.hospitals_charges}
                      onChange={(e) => setEditFormData({ ...editFormData, hospitals_charges: e.target.value, Hospitals_Chargies: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="amount_paid"
                      value={editFormData.amount_paid}
                      onChange={handleEditChange}
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
                        rel="noreferrer"
                        className="underline hover:text-teal-900 font-bold"
                      >
                        View Attachment
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditAttachedFile(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save & Update Patient Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: OFFICIAL HOSPITAL BILL INVOICE RECEIPT */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:p-0">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn print:border-none print:shadow-none">
            {/* INVOICE HEADER (Non-print controls) */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧾</span>
                <div>
                  <h3 className="text-base font-bold">Hospital Bill Invoice Receipt</h3>
                  <p className="text-xs text-slate-300">Official billing receipt for patient checkout</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>🖨️</span> Print Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* PRINTABLE BILL BODY */}
            <div className="p-6 sm:p-8 space-y-6 text-slate-800">
              {/* HOSPITAL LETTERHEAD */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{hospDisplayName}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Apex Healthcare Multi-Speciality Medical Center</p>
                  <p className="text-xs text-slate-500">24x7 Emergency & Inpatient Hospital Services</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-mono font-bold text-xs border border-slate-300">
                    INVOICE #{activePatient.Appoment_id || activePatient.appoment_id || activePatient.appointment_id || activePatient.id}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  <p className="text-xs text-slate-500">Time: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {/* PATIENT & DOCTOR INFO BOX */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1 text-teal-800">Patient Information</h4>
                  <p className="font-bold text-slate-800 text-sm">{activePatient.name}</p>
                  <p className="text-slate-600">UHID / APT: <span className="font-mono font-bold">{activePatient.patient_id || activePatient.uhid || `APT-${activePatient.id}`}</span></p>
                  <p className="text-slate-600">Age / Gender: {activePatient.age ? `${activePatient.age} Yrs` : '-'} • {activePatient.Gender || activePatient.gender || 'Not Specified'}</p>
                  <p className="text-slate-600">Contact: {activePatient.contact || activePatient.phone || '-'}</p>
                  {activePatient.bed_number && (
                    <p className="text-purple-700 font-bold mt-0.5">Inpatient Bed: #{activePatient.bed_number} (Floor {getFloorNumber(activePatient.bed_number)})</p>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1 text-teal-800">Doctor & Consultation</h4>
                  <p className="font-bold text-slate-800 text-sm">{activePatient.doctor_name || (activePatient.doctor ? `Dr. #${activePatient.doctor}` : 'General OPD')}</p>
                  <p className="text-slate-600">Specialization: {activePatient.doctor_specialization || 'Consultant Physician'}</p>

                  {/* DOCTOR CHECKUP STATUS ON BILL */}
                  <div className="mt-2 pt-1 border-t border-slate-200">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Clinical Checkup Status:</span>
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[11px] mt-0.5 ${isCheckupDone ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                      {isCheckupDone ? '✓ Checkup Done by Doctor' : '⏳ Checkup Pending with Doctor'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ITEMIZED CHARGES TABLE */}
              <div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 text-left">Description</th>
                      <th className="py-2.5 px-3 text-center">Service Type</th>
                      <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        Doctor Specialist Consultation Fee
                        <span className="block text-[11px] text-slate-400">{activePatient.doctor_name || 'Consulting Doctor'}</span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">Clinical OPD</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">
                        ₹{docFeeVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        Hospital Facility, Ward & Nursing Care
                        <span className="block text-[11px] text-slate-400">{activePatient.bed_number ? `Bed #${activePatient.bed_number} Facility Maintenance` : 'General Facility Charges'}</span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">Hospital IPD / Facility</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">
                        ₹{hospFeeVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-bold text-sm">
                      <td colSpan={2} className="py-3 px-3 text-right">Total Bill Amount:</td>
                      <td className="py-3 px-3 text-right text-teal-800 text-base">
                        ₹{totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="text-xs text-slate-600">
                      <td colSpan={2} className="py-1 px-3 text-right">Amount Paid:</td>
                      <td className="py-1 px-3 text-right font-bold text-emerald-700">
                        ₹{Number(activePatient.amount_paid || (isPaid ? totalBill : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="text-xs text-slate-600">
                      <td colSpan={2} className="py-1 px-3 text-right">Payment Status & Mode:</td>
                      <td className="py-1 px-3 text-right font-bold text-slate-800">
                        {activePatient.payment_status || 'Pending'} ({activePatient.payment_method || 'Cash'})
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* FOOTER AUTHORIZATION */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div>
                  <p className="font-semibold text-slate-700">Issued by: Reception Desk</p>
                  <p className="text-[10px]">Computer generated invoice valid without physical signature.</p>
                </div>
                <div className="text-right">
                  <div className="h-10 border-b border-slate-300 w-36 mb-1"></div>
                  <p className="text-[11px] font-semibold text-slate-700">Authorized Receptionist Sign</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISIT DETAILS MODAL */}
      {isHistoryDetailsModalOpen && selectedHistoryAppt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {selectedHistoryAppt.appointment_id || `APT-${selectedHistoryAppt.id}`}
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1">Visit Consultation Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Hospital Branch</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedHistoryAppt.hospital_name}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Doctor</span>
                  <p className="font-bold text-teal-800 mt-0.5">{selectedHistoryAppt.doctor_name}</p>
                  <span className="text-[10px] text-slate-400">{selectedHistoryAppt.doctor_specialization}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Ward & Bed Allocation</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedHistoryAppt.bed_number ? `Bed #${selectedHistoryAppt.bed_number}` : 'OPD Consultation'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Visit Date & Time</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedHistoryAppt.visit_date_time ? new Date(selectedHistoryAppt.visit_date_time).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Reason / Diagnosis</span>
                <p className="text-slate-800 font-semibold mt-1 leading-relaxed">
                  {selectedHistoryAppt.symptoms_diagnosis || selectedHistoryAppt.reason_for_visit || 'General Consultation'}
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">Dual Billing Breakdown</span>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-200">
                  <div>
                    <span className="text-[10px] text-teal-700 block">Doc Fee</span>
                    <span className="font-mono font-bold text-teal-900">₹{Number(selectedHistoryAppt.consultation_fee || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-sky-700 block">Hosp Charges</span>
                    <span className="font-mono font-bold text-sky-900">₹{Number(selectedHistoryAppt.Hospitals_Chargies || selectedHistoryAppt.hospitals_charges || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 block">Total Bill</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{Number(selectedHistoryAppt.total_bill || (Number(selectedHistoryAppt.consultation_fee || 0) + Number(selectedHistoryAppt.Hospitals_Chargies || selectedHistoryAppt.hospitals_charges || 0))).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-200 text-[11px]">
                  <span className="font-semibold text-emerald-800">Paid: ₹{Number(selectedHistoryAppt.amount_paid || 0).toFixed(2)}</span>
                  <span className="font-semibold text-slate-600">Mode: {selectedHistoryAppt.payment_method || 'Cash'}</span>
                </div>
              </div>

              {selectedHistoryAppt.attached_document && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Medical Document Attached</span>
                  <a
                    href={selectedHistoryAppt.attached_document}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition"
                  >
                    Download / View
                  </a>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHistoryDetailsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistPatientDetails;
