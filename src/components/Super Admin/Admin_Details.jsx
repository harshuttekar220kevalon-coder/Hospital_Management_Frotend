import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const Admin_Details = ({ currentUser, selectedAdmin, setSelectedAdmin, setSelectedPatient, setSelectedAppointment, setCurrentPage }) => {
  const [activeTab, setActiveTab] = useState('all');

  const [adminData, setAdminData] = useState(() => {
    if (selectedAdmin && selectedAdmin.id) return selectedAdmin;
    try {
      const saved = localStorage.getItem('selectedAdmin');
      if (saved) return JSON.parse(saved);
    } catch {
    }
  });

  const [hospitalData, setHospitalData] = useState(null);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isDataFetching, setIsDataFetching] = useState(false);

  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [receptionistsList, setReceptionistsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [apptSubTab, setApptSubTab] = useState('today_completed');
  const [selectedVisitAppt, setSelectedVisitAppt] = useState(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);

  const [doctorSearch, setDoctorSearch] = useState('');
  const [nurseSearch, setNurseSearch] = useState('');
  const [receptionistSearch, setReceptionistSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');

  const [visibleDoctorsCount, setVisibleDoctorsCount] = useState(10);
  const [visibleNursesCount, setVisibleNursesCount] = useState(10);
  const [visibleReceptionistsCount, setVisibleReceptionistsCount] = useState(10);
  const [visiblePatientsCount, setVisiblePatientsCount] = useState(10);
  const [visibleAppointmentsCount, setVisibleAppointmentsCount] = useState(10);
  const [visibleDeptsCount, setVisibleDeptsCount] = useState(10);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editFormData, setEditFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    contact: '',
    password: '',
    designation: '',
    role: 'Hospital Admin',
    hospital: '',
    status: 'Active',
    is_active: true
  });

  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const isDateToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isDateBeforeToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(d);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate.getTime() < today.getTime();
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;

    const loadAdminAndBranchData = async () => {
      setIsDataFetching(true);
      try {
        let currentAdmin = selectedAdmin || adminData;
        if (!currentAdmin || !currentAdmin.id) {
          const saved = localStorage.getItem('selectedAdmin');
          if (saved) {
            currentAdmin = JSON.parse(saved);
            if (isMounted) setAdminData(currentAdmin);
          }
        }
        const hospListRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
        let allHospitals = [];
        if (hospListRes && hospListRes.ok) {
          allHospitals = await hospListRes.json();
          if (isMounted) setHospitalsList(allHospitals);
        }

        if (currentAdmin && currentAdmin.id && !String(currentAdmin.id).startsWith('hosp-')) {
          const adminRes = await fetch(`${API_BASE_URL}/super-admin/Admins/${currentAdmin.id}/`).catch(() => null);
          if (adminRes && adminRes.ok) {
            const freshAdmin = await adminRes.json();
            currentAdmin = freshAdmin;
            if (isMounted) {
              setAdminData(freshAdmin);
              localStorage.setItem('selectedAdmin', JSON.stringify(freshAdmin));
            }
          }
        }

        const rawHospitalId = currentAdmin?.hospital;
        const targetHospitalId = typeof rawHospitalId === 'object' && rawHospitalId !== null
          ? rawHospitalId.id
          : rawHospitalId;

        if (targetHospitalId) {
          let targetHosp = allHospitals.find(h => Number(h.id) === Number(targetHospitalId));
          if (!targetHosp) {
            const hRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/${targetHospitalId}/`).catch(() => null);
            if (hRes && hRes.ok) {
              targetHosp = await hRes.json();
            }
          }
          if (isMounted && targetHosp) setHospitalData(targetHosp);

          // Fetch Branch Doctors
          let branchDocs = [];
          const docRes = await fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null);
          if (docRes && docRes.ok) {
            const allDocs = await docRes.json();
            branchDocs = allDocs.filter(d => {
              if (Array.isArray(d.hospitals)) return d.hospitals.map(Number).includes(Number(targetHospitalId));
              return Number(d.hospital) === Number(targetHospitalId);
            });
            if (isMounted) setDoctorsList(branchDocs);
          }

          // Fetch Branch Nurses
          const nurRes = await fetch(`${API_BASE_URL}/super-admin/Nurses/`).catch(() => null);
          if (nurRes && nurRes.ok) {
            const allNurs = await nurRes.json();
            const branchNurs = allNurs.filter(n => Number(n.hospital) === Number(targetHospitalId));
            if (isMounted) setNursesList(branchNurs);
          }

          // Fetch Branch Receptionists
          const recRes = await fetch(`${API_BASE_URL}/super-admin/Receptionists/`).catch(() => null);
          if (recRes && recRes.ok) {
            const allRecs = await recRes.json();
            const branchRecs = allRecs.filter(r => Number(r.hospital) === Number(targetHospitalId));
            if (isMounted) setReceptionistsList(branchRecs);
          }

          // Fetch Branch Patients & Appointments from Backend
          const [patRes, apptRes] = await Promise.all([
            fetch(`${API_BASE_URL}/super-admin/Patients/`).catch(() => null),
            fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null)
          ]);

          let rawPats = [];
          if (patRes && patRes.ok) {
            const allPats = await patRes.json().catch(() => []);
            rawPats = Array.isArray(allPats) ? allPats : (allPats?.results || allPats?.data || []);
          }

          let rawAppts = [];
          if (apptRes && apptRes.ok) {
            const aJson = await apptRes.json().catch(() => []);
            rawAppts = Array.isArray(aJson) ? aJson : (aJson?.results || aJson?.data || aJson?.appointments || []);
          }

          // Branch Appointments
          const branchAppts = rawAppts.filter(a => Number(typeof a.hospital === 'object' ? a.hospital?.id : a.hospital) === Number(targetHospitalId));

          const normalizedAppts = branchAppts.map(a => {
            const docId = typeof a.doctor === 'object' ? a.doctor?.id : a.doctor;
            const docObj = docId && branchDocs ? branchDocs.find(d => Number(d.id) === Number(docId)) : null;

            const apptId = a.appointment_id || a.Appoment_id || a.appoiment_id || (a.id ? `APT-${a.id}` : 'APT-0');
            const patientId = a.patient_id || a.patient_Id || a.uhid || (a.patient ? (typeof a.patient === 'object' ? (a.patient.patient_id || a.patient.uhid || `PAT-${a.patient.id}`) : `PAT-${a.patient}`) : (a.id ? `PAT-${a.id}` : 'PAT-0'));
            const patientName = a.patient_name || a.patient_Name || a.name || 'Patient';
            const docName = a.doctor_name || (docObj ? docObj.name : (docId ? `Dr. #${docId}` : 'Not Assigned'));
            const docSpec = a.doctor_specialization || (docObj ? (docObj.specialization || docObj.specialty) : 'Consultant');
            const visitDate = a.visit_date_time || a.appointment_date || a.created_at || new Date().toISOString();
            const status = a.status || 'Pending';
            const totalBill = Number(a.total_bill || (Number(a.consultation_fee || 0) + Number(a.Hospitals_Chargies || a.hospitals_charges || 0))) || 0;
            const amountPaid = Number(a.amount_paid || (a.payment_status === 'Paid' ? totalBill : 0)) || 0;

            return {
              ...a,
              id: a.id,
              appointment_id: apptId,
              patient_id: patientId,
              patient_name: patientName,
              doctor_name: docName,
              doctor_specialization: docSpec,
              visit_date_time: visitDate,
              status: status,
              bed_number: a.bed_number || null,
              symptoms_diagnosis: a.symptoms_diagnosis || a.reason_for_visit || 'General Consultation',
              total_bill: totalBill,
              amount_paid: amountPaid,
              payment_status: a.payment_status || (amountPaid >= totalBill && totalBill > 0 ? 'Paid' : 'Pending'),
              payment_method: a.payment_method || 'Cash',
              condition: a.condition || a.Condation || a.condation || a.symptoms_severity || 'Normal',
              attached_document: a.attached_document || a.document || ''
            };
          });

          normalizedAppts.sort((a, b) => new Date(b.visit_date_time || 0) - new Date(a.visit_date_time || 0));
          if (isMounted) setAppointmentsList(normalizedAppts);

          // Build Unified Patients List: All registered users and patients who visited this branch
          const seenPatientKeys = new Set();
          const combinedPatients = [];

          // 1. Process all patient users from /super-admin/Patients/
          for (const p of rawPats) {
            const pHosp = Number(typeof p.hospital === 'object' ? p.hospital?.id : p.hospital);
            const pEmail = (p.email || '').toLowerCase().trim();
            const pContact = (p.contact || p.phone || '').trim();
            const pUhid = (p.uhid || p.patient_id || '').trim();
            const pName = (p.name || p.patient_Name || p.patient_name || '').trim();

            // Match if assigned to this hospital OR has booked in this branch
            const matchingAppts = branchAppts.filter(a => {
              const aEmail = (a.email || '').toLowerCase().trim();
              const aContact = (a.contact || a.phone || '').trim();
              const aUhid = (a.uhid || a.patient_id || '').trim();
              const aName = (a.patient_name || a.patient_Name || a.name || '').trim().toLowerCase();
              const aPatFk = a.patient || a.patient_id;

              return (
                (pEmail && aEmail && pEmail === aEmail) ||
                (pContact && aContact && pContact === aContact) ||
                (pUhid && aUhid && pUhid === aUhid) ||
                (p.id && aPatFk && Number(p.id) === Number(aPatFk)) ||
                (pName && aName && pName.toLowerCase() === aName)
              );
            });

            const isAssignedToThisBranch = pHosp === Number(targetHospitalId);
            const hasBranchVisits = matchingAppts.length > 0;
            const isUnassignedGeneralUser = !pHosp;

            if (isAssignedToThisBranch || hasBranchVisits || isUnassignedGeneralUser) {
              const key = pEmail || pContact || pUhid || (p.id ? `pat_${p.id}` : `pat_${Math.random()}`);
              if (!seenPatientKeys.has(key)) {
                seenPatientKeys.add(key);
                combinedPatients.push({
                  ...p,
                  id: p.id,
                  patient_id: p.patient_id || p.uhid || (p.id ? `PAT-${p.id}` : 'PAT-0'),
                  uhid: p.uhid || p.patient_id || (p.id ? `UHID-${p.id}` : 'UHID-0'),
                  name: pName || 'Patient User',
                  contact: pContact,
                  phone: pContact,
                  email: pEmail,
                  gender: p.gender || p.Gender || '',
                  blood_group: p.blood_group || p.Blood_Group || '',
                  age: p.age ?? p.Age ?? '',
                  address: p.address || p.Address || '',
                  total_appointments: matchingAppts.length,
                  condition: p.condition || p.Condation || p.condation || p.symptoms_severity || 'Normal',
                  status: p.status || 'Active'
                });
              }
            }
          }

          // 2. Add any additional patients from branch appointments not in /super-admin/Patients/
          for (const a of branchAppts) {
            const aEmail = (a.email || '').toLowerCase().trim();
            const aContact = (a.contact || a.phone || '').trim();
            const aUhid = (a.uhid || a.patient_id || '').trim();
            const aName = (a.patient_name || a.patient_Name || a.name || '').trim();
            const key = aEmail || aContact || aUhid || (a.id ? `appt_${a.id}` : `pat_${Math.random()}`);

            if (!seenPatientKeys.has(key)) {
              seenPatientKeys.add(key);

              const matchingAppts = branchAppts.filter(ba => {
                const baEmail = (ba.email || '').toLowerCase().trim();
                const baContact = (ba.contact || ba.phone || '').trim();
                const baUhid = (ba.uhid || ba.patient_id || '').trim();
                const baName = (ba.patient_name || ba.patient_Name || ba.name || '').trim().toLowerCase();
                return (
                  (aEmail && baEmail && aEmail === baEmail) ||
                  (aContact && baContact && aContact === baContact) ||
                  (aUhid && baUhid && aUhid === baUhid) ||
                  (aName && baName && aName.toLowerCase() === baName)
                );
              });

              combinedPatients.push({
                id: a.patient || a.patient_id || a.id,
                patient_id: a.patient_id || a.uhid || (a.id ? `PAT-${a.id}` : 'PAT-0'),
                uhid: a.uhid || a.patient_id || (a.id ? `UHID-${a.id}` : 'UHID-0'),
                name: aName || 'Patient User',
                contact: aContact,
                phone: aContact,
                email: aEmail,
                gender: a.gender || a.Gender || '',
                blood_group: a.blood_group || a.Blood_Group || '',
                age: a.age ?? a.Age ?? '',
                address: a.address || a.Address || '',
                total_appointments: matchingAppts.length,
                condition: a.condition || a.Condation || 'Normal',
                status: a.status || 'Active'
              });
            }
          }

          if (isMounted) setPatientsList(combinedPatients);

          // Parse Departments
          if (targetHosp && (targetHosp.departments || targetHosp.department)) {
            const rawDepts = targetHosp.departments || targetHosp.department;
            let deptsArray = [];
            if (Array.isArray(rawDepts)) {
              deptsArray = rawDepts.map((d, index) => ({
                id: index + 1,
                name: typeof d === 'string' ? d : (d.name || 'Department')
              }));
            } else if (typeof rawDepts === 'string') {
              deptsArray = rawDepts.split(',').map((d, index) => ({
                id: index + 1,
                name: d.trim()
              })).filter(d => d.name.length > 0);
            }
            if (isMounted) setDepartmentsList(deptsArray);
          }
        }
      } catch (error) {
        console.error('Error loading admin details:', error);
      } finally {
        if (isMounted) setIsDataFetching(false);
      }
    };

    loadAdminAndBranchData();

    return () => {
      isMounted = false;
    };
  }, [selectedAdmin?.id]);

  const handleBackClick = () => {
    if (setCurrentPage) {
      setCurrentPage('super_admin_admins');
    }
  };

  const admin = adminData || selectedAdmin || {};
  const activeHospital = hospitalData;

  const filteredDoctors = doctorsList.filter(d =>
    (d.name || '').toLowerCase().includes(doctorSearch.toLowerCase()) ||
    (d.specialization || '').toLowerCase().includes(doctorSearch.toLowerCase()) ||
    (d.doctor_id || '').toLowerCase().includes(doctorSearch.toLowerCase())
  );

  const filteredNurses = nursesList.filter(n =>
    (n.name || '').toLowerCase().includes(nurseSearch.toLowerCase()) ||
    (n.role || '').toLowerCase().includes(nurseSearch.toLowerCase()) ||
    (n.nurse_id || '').toLowerCase().includes(nurseSearch.toLowerCase())
  );

  const filteredReceptionists = receptionistsList.filter(r =>
    (r.name || '').toLowerCase().includes(receptionistSearch.toLowerCase()) ||
    (r.role || '').toLowerCase().includes(receptionistSearch.toLowerCase()) ||
    (r.receptionist_id || '').toLowerCase().includes(receptionistSearch.toLowerCase())
  );

  // CATEGORIZATION FOR APPOINTMENTS:
  // 1. Today's Completed Appointments: Visit date is today AND status is Completed/Discharged/Confirmed/Admitted
  const todayCompletedAppts = appointmentsList.filter(a => {
    const isToday = isDateToday(a.visit_date_time);
    const isCompleted = a.status === 'Completed' || a.status === 'Discharged' || a.status === 'Finished' || a.status === 'Confirmed' || a.status === 'Admitted';
    const notCancelled = a.status !== 'Cancelled' && a.status !== 'Rejected';
    return isToday && isCompleted && notCancelled;
  });

  // 2. History: Appointments prior to today (past visit records) AND not Cancelled
  const historyAppts = appointmentsList.filter(a => {
    const isPast = isDateBeforeToday(a.visit_date_time);
    const notCancelled = a.status !== 'Cancelled' && a.status !== 'Rejected';
    return isPast && notCancelled;
  });

  // 3. Cancelled: Status is Cancelled or Rejected
  const cancelledAppts = appointmentsList.filter(a => {
    return a.status === 'Cancelled' || a.status === 'Rejected';
  });

  // 4. All Appointments Registry
  const allAppointmentsRegistry = appointmentsList;

  // Selected sub-tab appointments list
  const currentSubTabAppts =
    apptSubTab === 'today_completed'
      ? todayCompletedAppts
      : apptSubTab === 'history'
      ? historyAppts
      : apptSubTab === 'cancelled'
      ? cancelledAppts
      : allAppointmentsRegistry;

  const filteredAppointments = currentSubTabAppts.filter(a => {
    const term = appointmentSearch.toLowerCase().trim();
    if (!term) return true;
    const name = (a.patient_name || '').toLowerCase();
    const apptId = (a.appointment_id || '').toLowerCase();
    const patId = (a.patient_id || '').toLowerCase();
    const doc = (a.doctor_name || '').toLowerCase();
    const diag = (a.symptoms_diagnosis || '').toLowerCase();
    return name.includes(term) || apptId.includes(term) || patId.includes(term) || doc.includes(term) || diag.includes(term);
  });

  const filteredPatients = patientsList.filter(p => {
    const term = patientSearch.toLowerCase().trim();
    if (!term) return true;
    const name = (p.name || '').toLowerCase();
    const id = (p.patient_id || p.uhid || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    const contact = (p.contact || '').toLowerCase();
    return name.includes(term) || id.includes(term) || email.includes(term) || contact.includes(term);
  });

  const handleViewPatientDetails = (pat) => {
    if (setSelectedPatient) {
      setSelectedPatient(pat);
    }
    localStorage.setItem('selectedPatient', JSON.stringify(pat));
    if (setCurrentPage) {
      setCurrentPage('patient_details');
    }
  };

  const handleViewAppointmentDetails = (appt) => {
    setSelectedVisitAppt(appt);
    setIsVisitModalOpen(true);
  };

  const filteredDepts = departmentsList.filter(d =>
    (d.name || '').toLowerCase().includes(deptSearch.toLowerCase())
  );

  const handleToggleStatus = async () => {
    if (!admin || !admin.id || String(admin.id).startsWith('hosp-')) return;
    try {
      const nextStatus = !admin.is_active;
      const response = await fetch(`${API_BASE_URL}/super-admin/Admins/${admin.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus })
      });

      if (response.ok) {
        const updated = { ...admin, is_active: nextStatus };
        setAdminData(updated);
        if (setSelectedAdmin) setSelectedAdmin(updated);
        localStorage.setItem('selectedAdmin', JSON.stringify(updated));
      } else {
        alert('Failed to update status.');
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
      alert('Error updating status.');
    }
  };

  const handleOpenEdit = () => {
    let hospId = '';
    if (admin.hospital) {
      hospId = typeof admin.hospital === 'object' ? admin.hospital.id : admin.hospital;
    } else if (activeHospital) {
      hospId = activeHospital.id;
    }

    const currentEmail = (admin.email || '').toLowerCase().trim();
    const storedPwd = localStorage.getItem(`pwd_${currentEmail}`) || '';

    setEditFormData({
      employee_id: admin.employee_id || admin.admin_id || (admin.id ? `ADM-${admin.id}` : 'ADM-NEW'),
      name: admin.name || '',
      email: currentEmail,
      contact: (admin.contact || admin.phone || '').replace(/\D/g, '').slice(0, 15),
      password: admin.password || storedPwd || 'Admin@123',
      designation: admin.designation || '',
      role: admin.role || 'Hospital Admin',
      hospital: hospId,
      status: admin.is_active !== false ? 'Active' : 'Inactive',
      is_active: admin.is_active !== false
    });
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!admin || !admin.id) return;
    if (!editFormData.hospital) {
      alert('Please select an assigned hospital branch.');
      return;
    }

    try {
      const trimmedName = (editFormData.name || '').trim();
      const trimmedEmail = (editFormData.email || '').trim().toLowerCase();
      const trimmedContact = (editFormData.contact || '').trim();
      const passwordToSend = (editFormData.password || '').trim() || admin.password || 'Admin@123';
      const employeeIdToSend = editFormData.employee_id || admin.employee_id || (admin.id ? `ADM-${admin.id}` : 'ADM-NEW');

      const nameParts = trimmedName.split(' ');
      const fName = nameParts[0] || '';
      const lName = nameParts.slice(1).join(' ') || fName;

      const payload = {
        ...admin,
        ...editFormData,
        employee_id: employeeIdToSend,
        name: trimmedName,
        first_name: fName,
        last_name: lName,
        firstName: fName,
        lastName: lName,
        email: trimmedEmail,
        contact: trimmedContact,
        phone: trimmedContact,
        password: passwordToSend,
        designation: editFormData.designation || '',
        role: editFormData.role || admin.role || 'Hospital Admin',
        Select_User: 'Admin',
        hospital: Number(editFormData.hospital),
        status: editFormData.is_active ? 'Active' : 'Inactive',
        is_active: Boolean(editFormData.is_active)
      };

      if (passwordToSend) {
        localStorage.setItem(`pwd_${trimmedEmail}`, passwordToSend);
      }

      let response = await fetch(`${API_BASE_URL}/super-admin/Admins/${admin.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (!response || !response.ok) {
        const patchRes = await fetch(`${API_BASE_URL}/super-admin/Admins/${admin.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => null);
        if (patchRes && patchRes.ok) response = patchRes;
      }

      if (response && response.ok) {
        const data = await response.json().catch(() => payload);
        alert('Hospital Administrator updated successfully.');
        const mergedAdmin = { ...admin, ...payload, ...data };
        setAdminData(mergedAdmin);
        if (setSelectedAdmin) setSelectedAdmin(mergedAdmin);
        localStorage.setItem('selectedAdmin', JSON.stringify(mergedAdmin));
        setIsEditModalOpen(false);
      } else {
        const data = response ? await response.json().catch(() => null) : null;
        let errMsg = 'Failed to update administrator.';
        if (data) {
          if (typeof data === 'string') errMsg = data;
          else if (data.message || data.detail || data.error) errMsg = data.message || data.detail || data.error;
          else {
            errMsg = Object.entries(data)
              .map(([k, v]) => `${k.toUpperCase()}: ${Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : v)}`)
              .join('\n');
          }
        }
        alert(errMsg);
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      alert('Network error while updating administrator: ' + (error.message || ''));
    }
  };

  const handleOpenResetPassword = () => {
    setResetEmail((admin.email || '').toLowerCase());
    setNewPassword('');
    setShowNewPassword(false);
    setIsResetPasswordModalOpen(true);
  };

  const handleSaveResetPassword = async (e) => {
    e.preventDefault();
    const emailToReset = (resetEmail || '').trim().toLowerCase();
    const passwordToSet = newPassword.trim();

    if (!emailToReset) {
      alert('Please enter a valid email address.');
      return;
    }
    if (!passwordToSet || passwordToSet.length < 6) {
      alert('Please enter a secure password of at least 6 characters.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/Admins/${admin.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToReset,
          password: passwordToSet
        })
      });

      if (response.ok) {
        const updatedAdmin = await response.json().catch(() => null);
        const freshAdmin = {
          ...admin,
          email: emailToReset,
          password: passwordToSet,
          ...(updatedAdmin || {})
        };
        setAdminData(freshAdmin);
        if (setSelectedAdmin) setSelectedAdmin(freshAdmin);
        localStorage.setItem('selectedAdmin', JSON.stringify(freshAdmin));

        setIsResetPasswordModalOpen(false);
        alert(`Password reset successfully for admin with email: ${emailToReset}`);
      } else {
        alert('Failed to reset password. Please verify the email ID or network connection.');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Network error while resetting password.');
    }
  };

  const handleDeleteAdmin = async () => {
    if (!admin || !admin.id || String(admin.id).startsWith('hosp-')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/Admins/${admin.id}/`, {
        method: 'DELETE'
      });

      if (response.ok || response.status === 204) {
        alert('Administrator deleted successfully.');
        if (setSelectedAdmin) setSelectedAdmin(null);
        localStorage.removeItem('selectedAdmin');
        setIsDeleteModalOpen(false);
        handleBackClick();
      } else {
        alert('Failed to delete administrator.');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Network error while deleting administrator.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* TOP NAVIGATION & BACK BUTTON */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
        >
          &larr; Back to Admins
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Super Admin</span>
          <span>/</span>
          <span>Hospital Admins</span>
          <span>/</span>
          <span className="font-semibold text-slate-700 font-mono">
            {admin.employee_id || `ADM-${admin.id}`}
          </span>
        </div>
      </div>

      {/* HEADER HERO CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-400 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md shrink-0">
            {(admin.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                {admin.employee_id || `ADM-${admin.id}`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {admin.designation || 'Not Provided'}
              </span>
              <button
                type="button"
                onClick={handleToggleStatus}
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                  admin.is_active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {admin.is_active !== false ? 'Active' : 'Inactive'}
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight mt-1">
              {admin.name || 'Not Provided'}
            </h1>
            {admin.email && (
              <p className="mt-1">
                <a
                  href={`mailto:${admin.email.toLowerCase()}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                  title="Send email"
                >
                  {admin.email.toLowerCase()}
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenResetPassword}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
          >
            Reset Password
          </button>

          <button
            type="button"
            onClick={handleOpenEdit}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            Edit Admin
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      {/* ADMIN CREDENTIALS & ASSIGNED HOSPITAL PROFILE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Admin Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-slate-800">Admin Credentials & Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Email Address</span>
              {admin.email ? (
                <p className="font-semibold text-slate-800 mt-0.5 break-all">
                  <a href={`mailto:${admin.email.toLowerCase()}`} className="text-sky-700 hover:underline">
                    {admin.email.toLowerCase()}
                  </a>
                </p>
              ) : (
                <p className="font-semibold text-slate-400 mt-0.5">Not Provided</p>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Contact Phone</span>
              <p className="font-semibold text-slate-800 mt-0.5">{admin.contact || 'Not Provided'}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Signin Password</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-sky-600 font-semibold hover:underline cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="font-mono font-semibold text-slate-800 mt-0.5 tracking-wider">
                {showPassword ? (admin.password || localStorage.getItem(`pwd_${(admin.email || '').toLowerCase()}`) || 'Admin@123') : '••••••••'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Assigned Hospital Branch */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Assigned Hospital Branch</h2>
            {activeHospital && activeHospital.Branch_Code && (
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                {activeHospital.Branch_Code}
              </span>
            )}
          </div>
          {activeHospital ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 text-sm">{activeHospital.Name}</p>
                <p className="text-slate-500 mt-0.5">{activeHospital.address || `${activeHospital.city || ''} ${activeHospital.area || ''}`}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Beds</span>
                  <p className="font-bold text-indigo-700 mt-0.5">{activeHospital.total_beds || 0} Beds</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">ICU Beds</span>
                  <p className="font-bold text-emerald-700 mt-0.5">{activeHospital.icu_beds || 0} Beds</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">No hospital branch assigned to this administrator.</p>
          )}
        </div>
      </div>

      {/* TOP SUMMARY METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch Doctors</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-teal-700 mt-1">{doctorsList.length}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Assigned specialists</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nursing Staff</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">{nursesList.length}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Clinical care staff</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receptionists</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-1">{receptionistsList.length}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Front desk team</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Patients</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-700 mt-1">{patientsList.length}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Branch patients</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Appointments</p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-sky-700 mt-1">{appointmentsList.length}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Total visit records</p>
        </div>
      </div>

      {/* TABS BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex flex-wrap items-center gap-1.5">
        {[
          { id: 'all', label: 'All Overview' },
          { id: 'doctors', label: `Doctors (${doctorsList.length})` },
          { id: 'nurses', label: `Nurses (${nursesList.length})` },
          { id: 'receptionists', label: `Receptionists (${receptionistsList.length})` },
          { id: 'patients', label: `Patients (${patientsList.length})` },
          { id: 'appointments', label: `Appointments (${appointmentsList.length})` },
          { id: 'departments', label: `Departments (${departmentsList.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === tab.id ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'all' && activeHospital && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-800">Branch Infrastructure & Beds Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px]">Total Beds</span>
              <p className="text-lg font-bold text-slate-800">{activeHospital.total_beds || 0}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px]">ICU Beds</span>
              <p className="text-lg font-bold text-slate-800">{activeHospital.icu_beds || 0}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px]">NICU Beds</span>
              <p className="text-lg font-bold text-slate-800">{activeHospital.nicu_beds || 0}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px]">Operation Theatres</span>
              <p className="text-lg font-bold text-slate-800">{activeHospital.operation_theatres || 0}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 uppercase text-[10px]">Ambulances</span>
              <p className="text-lg font-bold text-slate-800">{activeHospital.ambulances_count || 0}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'doctors' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-slate-800">Branch Doctors List ({filteredDoctors.length})</h2>
            <input
              type="text"
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
              placeholder="Filter doctors..."
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>
          {filteredDoctors.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No doctors found.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDoctors.slice(0, visibleDoctorsCount).map((doc) => (
                  <div key={doc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <h3 className="font-bold text-slate-800 text-sm">{doc.name}</h3>
                    <p className="text-teal-700 font-semibold">{doc.specialization || doc.specialty || 'General'}</p>
                    <p className="text-slate-500">ID: {doc.doctor_id || `DOC-${doc.id}`}</p>
                    <p className="text-slate-500">Contact: {doc.phone || '-'}</p>
                    {doc.email && (
                      <p className="text-[11px]">
                        <a href={`mailto:${doc.email.toLowerCase()}`} className="text-sky-700 hover:underline">
                          {doc.email.toLowerCase()}
                        </a>
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {visibleDoctorsCount < filteredDoctors.length && (
                <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-3 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setVisibleDoctorsCount((prev) => prev + 10)}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
                  >
                    Show More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'nurses' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-slate-800">Branch Nursing Staff ({filteredNurses.length})</h2>
            <input
              type="text"
              value={nurseSearch}
              onChange={(e) => setNurseSearch(e.target.value)}
              placeholder="Filter nurses..."
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>
          {filteredNurses.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No nurses found.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredNurses.slice(0, visibleNursesCount).map((nurse) => (
                  <div key={nurse.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <h3 className="font-bold text-slate-800 text-sm">{nurse.name}</h3>
                    <p className="text-emerald-700 font-semibold">{nurse.role === 'Head Nurse' ? 'Head Nurse' : 'Staff Nurse'} - Ward: {nurse.ward || 'General'}</p>
                    <p className="text-slate-500">ID: {nurse.nurse_id || `NUR-${nurse.id}`}</p>
                    <p className="text-slate-500">Shift: {nurse.shift || 'Morning'}</p>
                  </div>
                ))}
              </div>
              {visibleNursesCount < filteredNurses.length && (
                <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-3 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setVisibleNursesCount((prev) => prev + 10)}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
                  >
                    Show More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'receptionists' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-slate-800">Branch Receptionists ({filteredReceptionists.length})</h2>
            <input
              type="text"
              value={receptionistSearch}
              onChange={(e) => setReceptionistSearch(e.target.value)}
              placeholder="Filter receptionists..."
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>
          {filteredReceptionists.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No receptionists found.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredReceptionists.slice(0, visibleReceptionistsCount).map((rec) => (
                  <div key={rec.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <h3 className="font-bold text-slate-800 text-sm">{rec.name}</h3>
                    <p className="text-amber-700 font-semibold">{rec.role || 'Front Desk'}</p>
                    <p className="text-slate-500">ID: {rec.receptionist_id || `REC-${rec.id}`}</p>
                    <p className="text-slate-500">Shift: {rec.shift || 'Morning Shift'}</p>
                  </div>
                ))}
              </div>
              {visibleReceptionistsCount < filteredReceptionists.length && (
                <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-3 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setVisibleReceptionistsCount((prev) => prev + 10)}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
                  >
                    Show More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* PATIENTS TAB (PURE PATIENT DETAILS IN TABLE FORMAT) */}
      {activeTab === 'patients' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          {/* HEADER & SEARCH */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Branch Registered Patients ({filteredPatients.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Directory of all registered patients in this hospital branch.
              </p>
            </div>
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search patient by name, ID, contact, email..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:border-sky-600 focus:bg-white transition"
              />
            </div>
          </div>

          {filteredPatients.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-xl text-slate-400">
                👥
              </div>
              <p className="text-sm font-bold text-slate-700">No registered patients found.</p>
              <p className="text-xs text-slate-400">
                {patientSearch ? 'Try adjusting your search keywords.' : 'Registered branch patients will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-left">Patient Name</th>
                    <th className="py-3 px-4 text-center">Patient ID</th>
                    <th className="py-3 px-4 text-center">Contact</th>
                    <th className="py-3 px-4 text-left">Email</th>
                    <th className="py-3 px-4 text-center">Visits</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.slice(0, visiblePatientsCount).map((pat) => {
                    const displayId = pat.patient_id || pat.uhid || (pat.id ? `PAT-${pat.id}` : 'PAT-0');
                    const emailLower = (pat.email || '').toLowerCase().trim();
                    const contactNum = (pat.contact || pat.phone || '').trim();

                    return (
                      <tr key={pat.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 text-left font-bold text-slate-900 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {(pat.name || 'P').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="block font-bold text-slate-900">{pat.name || 'Patient'}</span>
                              {pat.age ? (
                                <span className="text-[10px] text-slate-400 block">{pat.age} yrs</span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="font-mono text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 inline-block">
                            {displayId}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700 whitespace-nowrap">
                          {contactNum || '-'}
                        </td>

                        <td className="py-3 px-4 text-left">
                          {emailLower ? (
                            <a
                              href={`mailto:${emailLower}`}
                              className="text-sky-700 hover:text-sky-900 hover:underline font-medium block lowercase truncate max-w-[200px]"
                            >
                              {emailLower}
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            {pat.total_appointments || 0} {pat.total_appointments === 1 ? 'Visit' : 'Visits'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleViewPatientDetails(pat)}
                            className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white font-bold text-xs transition cursor-pointer border border-sky-200 inline-flex items-center gap-1 shadow-2xs"
                          >
                            Details &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {visiblePatientsCount < filteredPatients.length && (
            <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 rounded-xl">
              <button
                type="button"
                onClick={() => setVisiblePatientsCount((prev) => prev + 10)}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
              >
                Show More ({filteredPatients.length - visiblePatientsCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* APPOINTMENTS TAB (WITH SUB-TABS: TODAY'S COMPLETED, HISTORY, CANCELLED, ALL REGISTRY) */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          {/* HEADER & SEARCH */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Branch Appointments & Clinical Visits</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage today's completed visits, past appointment history, and cancelled bookings.
              </p>
            </div>
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={appointmentSearch}
                onChange={(e) => setAppointmentSearch(e.target.value)}
                placeholder="Search by Appt ID, Patient, Doctor, Diagnosis..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:border-sky-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* SUB-TABS NAVIGATION BAR */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              {
                id: 'today_completed',
                label: "Today's Completed Visits",
                count: todayCompletedAppts.length,
                badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                activeClass: 'bg-emerald-600 text-white shadow-xs'
              },
              {
                id: 'history',
                label: 'History (Past Appointments)',
                count: historyAppts.length,
                badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
                activeClass: 'bg-sky-600 text-white shadow-xs'
              },
              {
                id: 'cancelled',
                label: 'Cancelled Appointments',
                count: cancelledAppts.length,
                badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
                activeClass: 'bg-rose-600 text-white shadow-xs'
              },
              {
                id: 'all',
                label: 'All Appointments Registry',
                count: allAppointmentsRegistry.length,
                badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
                activeClass: 'bg-slate-800 text-white shadow-xs'
              }
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setApptSubTab(st.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                  apptSubTab === st.id
                    ? st.activeClass
                    : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{st.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    apptSubTab === st.id ? 'bg-white/20 text-white border-transparent' : st.badgeClass
                  }`}
                >
                  {st.count}
                </span>
              </button>
            ))}
          </div>

          {/* APPOINTMENTS TABLE */}
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-xl text-slate-400">
                {apptSubTab === 'today_completed' ? '🩺' : apptSubTab === 'cancelled' ? '🚫' : '📋'}
              </div>
              <p className="text-sm font-bold text-slate-700">
                {apptSubTab === 'today_completed'
                  ? "No completed appointments found for today."
                  : apptSubTab === 'history'
                  ? 'No past appointment history found prior to today.'
                  : apptSubTab === 'cancelled'
                  ? 'No cancelled or rejected appointments found.'
                  : 'No appointments found matching search.'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {appointmentSearch ? 'Try adjusting your search keywords.' : 'Appointments will appear here when booked.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Appt ID & Date</th>
                    <th className="py-3 px-4">Patient Name & ID</th>
                    <th className="py-3 px-4">Doctor & Dept</th>
                    <th className="py-3 px-4 text-center">Ward / Bed</th>
                    <th className="py-3 px-4">Diagnosis / Reason</th>
                    <th className="py-3 px-4 text-center">Billing & Paid</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.slice(0, visibleAppointmentsCount).map((appt, idx) => {
                    const isToday = isDateToday(appt.visit_date_time);
                    const isCancelled = appt.status === 'Cancelled' || appt.status === 'Rejected';
                    const isCompleted = appt.status === 'Completed' || appt.status === 'Discharged' || appt.status === 'Finished';

                    return (
                      <tr key={appt.id || idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px] block w-max">
                            {appt.appointment_id || `APT-${appt.id}`}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                            {isToday && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                Today
                              </span>
                            )}
                            {appt.visit_date_time ? new Date(appt.visit_date_time).toLocaleDateString() : 'N/A'}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block">{appt.patient_name || 'Patient'}</span>
                          <span className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 inline-block mt-0.5">
                            {appt.patient_id || `PAT-${appt.id}`}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold text-teal-800 block">{appt.doctor_name || 'Not Assigned'}</span>
                          <span className="text-[10px] text-slate-400 block">{appt.doctor_specialization || 'Consultant'}</span>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {appt.bed_number ? (
                            <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[11px]">
                              Bed #{appt.bed_number}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">OPD / No Bed</span>
                          )}
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <p className="truncate text-slate-700 font-medium" title={appt.symptoms_diagnosis || appt.reason_for_visit}>
                            {appt.symptoms_diagnosis || appt.reason_for_visit || 'General Consultation'}
                          </p>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap font-mono">
                          <span className="font-bold text-slate-800 block">
                            ₹{Number(appt.amount_paid || appt.total_bill || 0).toFixed(2)}
                          </span>
                          <span className={`text-[10px] block font-semibold ${
                            appt.payment_status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {appt.payment_status || 'Pending'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                              isCancelled
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {appt.status || 'Pending'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleViewAppointmentDetails(appt)}
                            className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white font-bold text-xs border border-sky-200 transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          >
                            View Details &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {visibleAppointmentsCount < filteredAppointments.length && (
            <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 rounded-xl">
              <button
                type="button"
                onClick={() => setVisibleAppointmentsCount((prev) => prev + 10)}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
              >
                Show More ({filteredAppointments.length - visibleAppointmentsCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* APPOINTMENT VISIT DETAILS MODAL */}
      {isVisitModalOpen && selectedVisitAppt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {selectedVisitAppt.appointment_id || `APT-${selectedVisitAppt.id}`}
                </span>
                <h2 className="text-base font-bold text-slate-800 mt-1">Patient Visit Record</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsVisitModalOpen(false);
                  setSelectedVisitAppt(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Patient Full Name</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedVisitAppt.patient_name || selectedVisitAppt.name}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Patient UHID / ID</span>
                  <p className="font-mono font-bold text-indigo-700 mt-0.5">{selectedVisitAppt.patient_id || selectedVisitAppt.uhid || `PAT-${selectedVisitAppt.id}`}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Consulting Doctor</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedVisitAppt.doctor_name || 'Not Assigned'}</p>
                  <p className="text-[10px] text-slate-400">{selectedVisitAppt.doctor_specialization || 'Consultant'}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Ward / Bed Allocation</span>
                  <p className="font-semibold text-teal-800 mt-0.5">
                    {selectedVisitAppt.bed_number ? `Bed #${selectedVisitAppt.bed_number}` : 'OPD Visit'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Visit Date & Time</span>
                <p className="font-semibold text-slate-800">
                  {selectedVisitAppt.visit_date_time ? new Date(selectedVisitAppt.visit_date_time).toLocaleString() : 'Not Specified'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Symptoms & Diagnosis</span>
                <p className="text-slate-700 font-medium">
                  {selectedVisitAppt.symptoms_diagnosis || selectedVisitAppt.reason_for_visit || 'General Checkup'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Visit Status</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedVisitAppt.status || 'Pending'}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Amount Paid</span>
                  <p className="font-bold text-emerald-700 mt-0.5">₹{Number(selectedVisitAppt.amount_paid || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsVisitModalOpen(false);
                  setSelectedVisitAppt(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-slate-800">Branch Clinical Departments ({filteredDepts.length})</h2>
            <input
              type="text"
              value={deptSearch}
              onChange={(e) => setDeptSearch(e.target.value)}
              placeholder="Filter departments..."
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>
          {filteredDepts.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No departments configured.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {filteredDepts.slice(0, visibleDeptsCount).map((dept) => (
                  <div key={dept.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <h3 className="font-bold text-slate-800 text-sm">{dept.name}</h3>
                    <p className="text-xs text-indigo-700 font-semibold">Active Department</p>
                  </div>
                ))}
              </div>
              {visibleDeptsCount < filteredDepts.length && (
                <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-3 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setVisibleDeptsCount((prev) => prev + 10)}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
                  >
                    Show More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Edit Admin Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Edit Administrator Details</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Update administrator credentials, assigned branch, and account status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              {/* TOP GRID: ADMIN ID & PASSWORD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 uppercase">Administrator ID</label>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      Permanent ID
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={admin.employee_id || admin.admin_id || (admin.id ? `ADM-${admin.id}` : 'ADM-NEW')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 text-sky-700 font-mono font-bold cursor-not-allowed select-none focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 uppercase">
                      Admin Password
                    </label>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Credentials
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      placeholder="Enter login password"
                      className="w-full pl-3 pr-16 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono text-xs focus:outline-none focus:border-sky-600 focus:bg-white tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-300 shadow-2xs flex items-center gap-1 transition cursor-pointer"
                    >
                      {showEditPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g. Vikram Malhotra"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value.toLowerCase() })}
                    placeholder="admin@hospital.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white lowercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone / Landline *</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.contact}
                    onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Designation</label>
                  <input
                    type="text"
                    value={editFormData.designation}
                    onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                    placeholder="e.g. Hospital Superintendent"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Account Status (Is Active) *</label>
                  <select
                    value={editFormData.is_active ? 'Active' : 'Inactive'}
                    onChange={(e) => {
                      const isActive = e.target.value === 'Active';
                      setEditFormData({ 
                        ...editFormData, 
                        is_active: isActive,
                        status: e.target.value 
                      });
                    }}
                    className={`w-full px-3 py-2 rounded-xl border font-semibold cursor-pointer focus:outline-none ${
                      editFormData.is_active
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:border-emerald-500'
                        : 'border-rose-300 bg-rose-50 text-rose-800 focus:border-rose-500'
                    }`}
                  >
                    <option value="Active">Active (Account Enabled)</option>
                    <option value="Inactive">Inactive (Account Disabled)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assigned Hospital Branch *</label>
                <select
                  required
                  value={editFormData.hospital}
                  onChange={(e) => setEditFormData({ ...editFormData, hospital: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                >
                  <option value="">-- Select Hospital --</option>
                  {hospitalsList.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.Name || h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Reset Administrator Password</h2>
              <button
                type="button"
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Admin Email *</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 lowercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">New Secure Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-3 pr-16 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-semibold text-[11px] cursor-pointer"
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <h2 className="text-base font-bold text-slate-800">Delete Administrator?</h2>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete administrator <span className="font-bold text-slate-800">{admin.name}</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAdmin}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin_Details;