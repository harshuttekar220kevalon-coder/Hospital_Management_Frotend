import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';
import Hospital from './Hospital';
import Hospital_Admins from './Hospital_Admins';
import Doctors_Management from './Doctors_Management';
import Nurses from './Nurses';
import Receptionist_Management from './Receptionist';
import Patients_Management from './Patients';
import SuperAdminAppointments from './Appoiment';

const SuperAdminDashboard = ({
  currentUser,
  setCurrentPage,
  setSelectedHospital,
  setSelectedDoctor,
  setSelectedNurse,
  setSelectedReceptionist,
  setSelectedPatient,
  setSelectedAdmin,
  setSelectedAppointment
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [visibleBranchesCount, setVisibleBranchesCount] = useState(10);
  const [loading, setLoading] = useState(false);

  const [hospitals, setHospitals] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [receptionists, setReceptionists] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [hospRes, adminRes, docRes, nurRes, recRes, patRes, apptRes] = await Promise.all([
        fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Admins/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/Patients/`).catch(() => null),
        fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null)
      ]);

      let hospData = [];
      let docData = [];

      if (hospRes && hospRes.ok) {
        hospData = await hospRes.json().catch(() => []);
        setHospitals(Array.isArray(hospData) ? hospData : (hospData?.results || []));
      } else {
        setHospitals([]);
      }

      if (adminRes && adminRes.ok) {
        const adminData = await adminRes.json().catch(() => []);
        setAdmins(Array.isArray(adminData) ? adminData : (adminData?.results || []));
      } else {
        setAdmins([]);
      }

      if (docRes && docRes.ok) {
        docData = await docRes.json().catch(() => []);
        setDoctors(Array.isArray(docData) ? docData : (docData?.results || []));
      } else {
        setDoctors([]);
      }

      if (nurRes && nurRes.ok) {
        const nurData = await nurRes.json().catch(() => []);
        setNurses(Array.isArray(nurData) ? nurData : (nurData?.results || []));
      } else {
        setNurses([]);
      }

      if (recRes && recRes.ok) {
        const recData = await recRes.json().catch(() => []);
        setReceptionists(Array.isArray(recData) ? recData : (recData?.results || []));
      } else {
        setReceptionists([]);
      }

      let rawPatients = [];
      let rawAppointments = [];

      if (patRes && patRes.ok) {
        const pData = await patRes.json().catch(() => []);
        rawPatients = Array.isArray(pData) ? pData : (pData?.results || pData?.data || []);
      }

      if (apptRes && apptRes.ok) {
        const aData = await apptRes.json().catch(() => []);
        rawAppointments = Array.isArray(aData) ? aData : (aData?.results || aData?.data || aData?.appointments || []);
      }

      // Normalize Appointments strictly from backend /super-admin/appointments/
      const normalizeAppointment = (item) => {
        if (!item) return null;
        const id = item.id || item.appointment_id || item.Appoment_id;
        const name = item.patient_name || item.patient_Name || item.name || `Patient #${id}`;
        const hospId = typeof item.hospital === 'object' ? item.hospital?.id : item.hospital;
        const docId = typeof item.doctor === 'object' ? item.doctor?.id : item.doctor;
        const nurseId = typeof item.nurse === 'object' ? item.nurse?.id : item.nurse;

        const hospObj = hospId ? hospData.find(h => Number(h.id) === Number(hospId)) : null;
        const docObj = docId ? docData.find(d => Number(d.id) === Number(docId)) : null;

        const docFee = Number(item.consultation_fee || docObj?.consultation_fee || 0);
        const hospCharges = Number(item.hospitals_charges || item.Hospitals_Chargies || 0);
        const amtPaid = Number(item.amount_paid || 0);

        const rawApptId = item.appointment_id || item.Appoment_id || item.appoment_id || id;
        const formattedApptId = rawApptId ? (String(rawApptId).startsWith('APT-') ? String(rawApptId) : `APT-${rawApptId}`) : `APT-${id}`;

        const rawPatId = item.patient_id || item.uhid || item.patient;
        const formattedPatId = rawPatId ? (String(rawPatId).startsWith('PAT-') ? String(rawPatId) : `PAT-${rawPatId}`) : (id ? `PAT-${id}` : 'PAT-0');

        return {
          ...item,
          id,
          appointment_id: formattedApptId,
          Appoment_id: formattedApptId,
          patient_id: formattedPatId,
          uhid: item.uhid || formattedPatId,
          name,
          patient_name: name,
          patient_Name: name,
          hospital: hospId,
          hospital_name: item.hospital_name || hospObj?.Name || hospObj?.name || 'Central Hospital',
          doctor: docId ? Number(docId) : null,
          doctor_name: item.doctor_name || (docObj ? (docObj.name?.startsWith('Dr.') ? docObj.name : `Dr. ${docObj.name}`) : (docId ? `Dr. #${docId}` : 'Not Assigned')),
          doctor_specialization: item.doctor_specialization || docObj?.specialization || docObj?.specialty || '',
          bed_number: item.bed_number ? Number(item.bed_number) : null,
          nurse: nurseId ? Number(nurseId) : null,
          consultation_fee: docFee,
          Hospitals_Chargies: hospCharges,
          hospitals_charges: hospCharges,
          amount_paid: amtPaid,
          total_bill: docFee + hospCharges,
          condition: item.condition || item.Condation || item.symptoms_severity || 'Normal',
          Condation: item.condition || item.Condation || item.symptoms_severity || 'Normal',
          status: item.status || 'Pending',
          payment_status: item.payment_status || (amtPaid >= (docFee + hospCharges) && (docFee + hospCharges) > 0 ? 'Paid' : 'Pending'),
          payment_method: item.payment_method || 'Cash',
          contact: item.contact || item.phone || '',
          email: item.email || '',
          address: item.address || '',
          symptoms_diagnosis: item.symptoms_diagnosis || item.reason_for_visit || 'General Consultation',
          visit_date_time: item.visit_date_time || item.created_at || new Date().toISOString(),
          created_at: item.created_at || item.visit_date_time || new Date().toISOString()
        };
      };

      const normalizedAppointments = rawAppointments.map(normalizeAppointment).filter(Boolean);

      // Normalize Patients strictly from backend /super-admin/Patients/ and link visits
      const seenPatientKeys = new Set();
      const combinedPatients = [];

      for (const p of rawPatients) {
        if (!p) continue;
        const id = p.id || p.patient_id || p.uhid;
        const pName = (p.name || p.patient_name || p.patient_Name || p.user_name || (p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : '') || `Patient #${id}`).trim();
        const pEmail = (p.email || '').toLowerCase().trim();
        const pContact = (p.contact || p.phone || p.mobile || '').trim();
        const displayId = p.patient_id || p.uhid || (p.id ? `PAT-${p.id}` : 'PAT-0');

        const matchingAppts = normalizedAppointments.filter((a) => {
          const aEmail = (a.email || '').toLowerCase().trim();
          const aContact = (a.contact || a.phone || a.mobile || '').trim();
          const aPatFk = typeof a.patient === 'object' ? a.patient?.id : a.patient;
          const aName = (a.patient_name || a.patient_Name || a.name || '').trim().toLowerCase();
          return (
            (pEmail && aEmail && pEmail === aEmail) ||
            (pContact && aContact && pContact === aContact) ||
            (p.id && aPatFk && Number(p.id) === Number(aPatFk)) ||
            (pName && aName && pName.toLowerCase() === aName)
          );
        });

        const key = pEmail || pContact || (p.id ? `pat_${p.id}` : `pat_${Math.random()}`);
        if (!seenPatientKeys.has(key)) {
          seenPatientKeys.add(key);
          combinedPatients.push({
            ...p,
            id: p.id || id,
            patient_id: displayId,
            uhid: p.uhid || displayId,
            name: pName,
            contact: pContact,
            phone: pContact,
            email: pEmail,
            age: p.age ?? p.Age ?? '',
            gender: p.gender || p.Gender || '',
            blood_group: p.blood_group || p.Blood_Group || '',
            address: p.address || p.Address || '',
            total_appointments: matchingAppts.length,
            status: p.status || 'Active',
            created_at: p.created_at || p.date_joined || new Date().toISOString()
          });
        }
      }

      // Add any additional patient users from appointments that are not in /super-admin/Patients/
      for (const a of normalizedAppointments) {
        const aEmail = (a.email || '').toLowerCase().trim();
        const aContact = (a.contact || a.phone || '').trim();
        const aName = (a.patient_name || a.patient_Name || a.name || '').trim();
        const key = aEmail || aContact || (a.id ? `appt_pat_${a.id}` : `pat_${Math.random()}`);

        if (!seenPatientKeys.has(key)) {
          seenPatientKeys.add(key);
          const matchingAppts = normalizedAppointments.filter((ba) => {
            const baEmail = (ba.email || '').toLowerCase().trim();
            const baContact = (ba.contact || ba.phone || '').trim();
            const baName = (ba.patient_name || ba.patient_Name || ba.name || '').trim().toLowerCase();
            return (
              (aEmail && baEmail && aEmail === baEmail) ||
              (aContact && baContact && aContact === baContact) ||
              (aName && baName && aName.toLowerCase() === baName)
            );
          });

          combinedPatients.push({
            id: a.patient || a.patient_id || a.id,
            patient_id: a.patient_id || (a.id ? `PAT-${a.id}` : 'PAT-0'),
            uhid: a.uhid || (a.id ? `UHID-${a.id}` : 'UHID-0'),
            name: aName || 'Patient User',
            contact: aContact,
            phone: aContact,
            email: aEmail,
            age: a.age ?? a.Age ?? '',
            gender: a.gender || a.Gender || '',
            blood_group: a.blood_group || a.Blood_Group || '',
            address: a.address || a.Address || '',
            total_appointments: matchingAppts.length,
            status: 'Active',
            created_at: a.created_at || a.visit_date_time || new Date().toISOString()
          });
        }
      }

      setPatients(combinedPatients);
      setAppointments(normalizedAppointments);
    } catch (err) {
      console.error('Error fetching Super Admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setVisibleBranchesCount(10);
  }, [activeTab]);

  // Calculate Real Dynamic Metrics
  const todayStr = new Date().toISOString().split('T')[0];

  const todayPatients = patients.filter((p) => {
    const d = p.created_at || p.applied_at || p.visit_date_time;
    return d && d.includes(todayStr);
  });

  const activeDoctors = doctors.filter((d) => d.is_active !== false);
  const activeNurses = nurses.filter((n) => n.is_active !== false);
  const activeAdmins = admins.filter((a) => a.is_active !== false);
  const activeReceptionists = receptionists.filter((r) => r.is_active !== false);
  const activeHospitals = hospitals.filter((h) => h.is_active !== false);

  const allClinicalRecords = [...patients, ...appointments];

  const pendingPatients = allClinicalRecords.filter((p) => p.status === 'Pending' || p.status === 'Pending Review');
  // Strict rule: ONLY patients with status 'Admitted' (and NOT 'Discharged'/'Cancelled') with an assigned bed occupy a bed
  const admittedPatients = allClinicalRecords.filter((p) => 
    (p.status === 'Admitted' || p.status === 'In Consultation') && 
    p.status !== 'Discharged' && 
    p.status !== 'Cancelled' && 
    p.bed_number != null
  );
  const dischargedPatients = allClinicalRecords.filter((p) => p.status === 'Discharged' || p.status === 'Completed');

  const uniqueSpecialties = Array.from(new Set(doctors.map((d) => d.specialization || d.specialty).filter(Boolean)));
  const uniqueCities = Array.from(
    new Set(
      hospitals
        .map((h) => (h.city || '').trim())
        .filter(Boolean)
        .map((c) => c.toLowerCase())
    )
  );

  // STRICT RULE: Only calculate Doctor Fees, Hospital Revenue, and Collections when patient/appointment has PAID
  const paidRecords = allClinicalRecords.filter((p) => (p.payment_status || '').toLowerCase() === 'paid' || (Number(p.amount_paid) > 0));

  const totalDocFees = paidRecords.reduce((sum, p) => {
    const isPaid = (p.payment_status || '').toLowerCase() === 'paid';
    const paid = Number(p.amount_paid) || 0;
    const docFee = Number(p.consultation_fee) || 0;
    const hospCharge = Number(p.Hospitals_Chargies ?? p.hospital_charges) || 0;
    const gross = docFee + hospCharge;
    if (isPaid) return sum + docFee;
    if (gross > 0 && paid > 0) return sum + ((docFee / gross) * paid);
    return sum;
  }, 0);

  const totalHospRevenue = paidRecords.reduce((sum, p) => {
    const isPaid = (p.payment_status || '').toLowerCase() === 'paid';
    const paid = Number(p.amount_paid) || 0;
    const docFee = Number(p.consultation_fee) || 0;
    const hospCharge = Number(p.Hospitals_Chargies ?? p.hospital_charges) || 0;
    const gross = docFee + hospCharge;
    if (isPaid) return sum + hospCharge;
    if (gross > 0 && paid > 0) return sum + ((hospCharge / gross) * paid);
    return sum;
  }, 0);

  const totalRevenue = paidRecords.reduce((sum, p) => {
    const isPaid = (p.payment_status || '').toLowerCase() === 'paid';
    const paid = Number(p.amount_paid) || 0;
    const docFee = Number(p.consultation_fee) || 0;
    const hospCharge = Number(p.Hospitals_Chargies ?? p.hospital_charges) || 0;
    if (paid > 0) return sum + paid;
    if (isPaid) return sum + (docFee + hospCharge);
    return sum;
  }, 0);

  const totalBeds = hospitals.reduce((sum, h) => sum + (Number(h.total_beds) || 0), 0);
  const totalIcuBeds = hospitals.reduce((sum, h) => sum + (Number(h.icu_beds) || 0), 0);
  const totalNicuBeds = hospitals.reduce((sum, h) => sum + (Number(h.nicu_beds) || 0), 0);
  const totalOTs = hospitals.reduce((sum, h) => sum + (Number(h.operation_theatres) || 0), 0);
  // Live dynamic bed occupancy: Occupied only when actively admitted; frees up automatically on discharge
  const totalOccupiedBeds = admittedPatients.length;
  const totalAvailableBeds = Math.max(0, totalBeds - totalOccupiedBeds);

  // All 9 Core Dashboard Metric Cards in Exact Requested Sequence
  const systemStats = [
    {
      id: 'branches',
      title: 'Total Hospital Branches',
      value: `${hospitals.length} Branch${hospitals.length === 1 ? '' : 'es'}`,
      sub: `${activeHospitals.length} Active • Across ${uniqueCities.length} Location${uniqueCities.length === 1 ? '' : 's'}`,
      badge: `${activeHospitals.length} Active`,
      color: 'bg-sky-50 text-sky-800 border-sky-200',
      tab: 'hospitals'
    },
    {
      id: 'admins',
      title: 'Hospital Admins',
      value: `${admins.length} Admin${admins.length === 1 ? '' : 's'}`,
      sub: `${activeAdmins.length} Active Administrators`,
      badge: `${activeAdmins.length} Active`,
      color: 'bg-purple-50 text-purple-800 border-purple-200',
      tab: 'admins'
    },
    {
      id: 'doctors',
      title: 'Registered Doctors',
      value: `${doctors.length} Doctor${doctors.length === 1 ? '' : 's'}`,
      sub: `${activeDoctors.length} Active • Across ${uniqueSpecialties.length} Specialization${uniqueSpecialties.length === 1 ? '' : 's'}`,
      badge: `${activeDoctors.length} Active`,
      color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      tab: 'doctors'
    },
    {
      id: 'nurses',
      title: 'Nursing Staff & Wards',
      value: `${nurses.length} Nurse${nurses.length === 1 ? '' : 's'}`,
      sub: `${activeNurses.length} Active on duty across branches`,
      badge: `${activeNurses.length} On Duty`,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      tab: 'nurses'
    },
    {
      id: 'receptionists',
      title: 'Front Desk Receptionists',
      value: `${receptionists.length} Receptionist${receptionists.length === 1 ? '' : 's'}`,
      sub: `${activeReceptionists.length} Active Staff on duty`,
      badge: `${activeReceptionists.length} Active`,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      tab: 'receptionists'
    },
    {
      id: 'beds',
      title: 'Total Bed Capacity',
      value: totalBeds > 0 ? `${totalBeds.toLocaleString()} Beds` : `${hospitals.length * 50}+ Beds`,
      sub: `Available: ${totalAvailableBeds} • OT: ${totalOTs} • ICU: ${totalIcuBeds} • Occupied: ${totalOccupiedBeds}`,
      badge: `${totalAvailableBeds} Available`,
      color: 'bg-slate-100 text-slate-800 border-slate-200',
      tab: 'hospitals'
    },
    {
      id: 'hospital_revenue',
      title: 'Hospital Revenue',
      value: `₹${totalHospRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: 'Facility & hospital charges collected',
      badge: 'Hospital Share',
      color: 'bg-sky-50 text-sky-700 border-sky-200',
      tab: 'patients'
    },
    {
      id: 'doctor_fees',
      title: 'Total Doctor Fees',
      value: `₹${totalDocFees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: 'Doctor consultation share collected',
      badge: 'Doctor Share',
      color: 'bg-teal-50 text-teal-700 border-teal-200',
      tab: 'patients'
    },
    {
      id: 'total_revenue',
      title: 'Total Revenue Collected',
      value: `₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${patients.filter((p) => p.payment_status === 'Paid').length} Fully Paid Invoices`,
      badge: 'Gross Total',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      tab: 'patients'
    }
  ];

  // Real Hospital Branches Table Rows
  const dynamicBranches = hospitals.map((hosp) => {
    const targetHospId = Number(hosp.id);
    const assignedAdmin = admins.find((a) => {
      const adminHospId = Number(typeof a.hospital === 'object' ? a.hospital?.id : a.hospital);
      return adminHospId === targetHospId;
    });

    const branchDoctors = doctors.filter((d) => {
      const hospIds = Array.isArray(d.hospitals)
        ? d.hospitals.map((h) => Number(typeof h === 'object' ? h.id : h))
        : (d.hospital ? [Number(typeof d.hospital === 'object' ? d.hospital.id : d.hospital)] : []);
      return hospIds.includes(targetHospId);
    });

    const branchAdmitted = patients.filter((p) => {
      const patHospId = Number(typeof p.hospital === 'object' ? p.hospital?.id : p.hospital);
      const isAdmitted = (p.status === 'Admitted' || p.status === 'In Consultation') && 
                         p.status !== 'Discharged' && 
                         p.status !== 'Cancelled' && 
                         p.bed_number != null;
      return patHospId === targetHospId && isAdmitted;
    });
    const branchBeds = Number(hosp.total_beds) || 0;
    const branchOccupied = branchAdmitted.length;
    const branchAvailable = Math.max(0, branchBeds - branchOccupied);

    let occupancyStr = `${branchOccupied} Occupied / ${branchAvailable} Avail`;
    if (branchBeds > 0) {
      const occPercent = Math.min(100, Math.round((branchOccupied / branchBeds) * 100));
      occupancyStr = `${occPercent}% (${branchOccupied}/${branchBeds} Beds)`;
    }

    return {
      raw: hosp,
      name: hosp.Name || 'Unnamed Branch',
      city: hosp.city || hosp.area || 'Main City',
      head: assignedAdmin ? `${assignedAdmin.name} (Admin)` : 'Unassigned Admin',
      doctorsCount: branchDoctors.length,
      occupancy: occupancyStr,
      status: hosp.is_active !== false ? 'Operational' : 'Inactive'
    };
  });

  const generateLiveAudits = () => {
    const logs = [];

    patients.slice(-3).reverse().forEach((p) => {
      logs.push({
        action: `Patient Entry: ${p.name || 'New Patient'}`,
        user: `UHID: ${p.patient_id || ('PAT-' + p.id)}`,
        time: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
        ip: p.status || 'Registered',
        type: 'Patient'
      });
    });

    // Latest Doctors
    doctors.slice(-2).reverse().forEach((d) => {
      logs.push({
        action: `Doctor Active: Dr. ${d.name || 'Doctor'}`,
        user: d.email || 'Doctor Staff',
        time: d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Active',
        ip: d.specialization || d.specialty || 'General Physician',
        type: 'Doctor'
      });
    });

    // Latest Admins
    admins.slice(-2).reverse().forEach((a) => {
      logs.push({
        action: `Admin Assigned: ${a.name || 'Administrator'}`,
        user: a.email || 'Hospital Admin',
        time: a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active',
        ip: a.hospital_name || 'Branch Admin',
        type: 'Admin'
      });
    });

    // Latest Nurses
    nurses.slice(-1).forEach((n) => {
      logs.push({
        action: `Nursing Staff: ${n.name || 'Nurse'}`,
        user: n.email || 'Nurse Staff',
        time: 'Active',
        ip: n.department || 'General Ward',
        type: 'Nurse'
      });
    });

    return logs.slice(0, 5);
  };

  const dynamicAudits = generateLiveAudits();

  const isDateToday = (dateStr) => {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr).toISOString().split('T')[0];
      return d === todayStr;
    } catch {
      return false;
    }
  };

  const handleBranchClick = (hosp) => {
    if (setSelectedHospital) {
      setSelectedHospital(hosp);
    }
    localStorage.setItem('selectedHospital', JSON.stringify(hosp));
    if (setCurrentPage) {
      setCurrentPage('hospital_details');
    }
  };

  const handlePatientClick = (patient) => {
    if (setSelectedPatient) {
      setSelectedPatient(patient);
    }
    localStorage.setItem('selectedPatient', JSON.stringify(patient));
    if (setCurrentPage) {
      setCurrentPage('patient_details');
    }
  };

  const handleAppointmentClick = (appointment) => {
    if (setSelectedAppointment) {
      setSelectedAppointment(appointment);
    }
    localStorage.setItem('selectedAppointment', JSON.stringify(appointment));
    if (setCurrentPage) {
      setCurrentPage('appointment_details');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white p-4 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-200 text-xs font-semibold border border-sky-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Super Admin Control Center
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Welcome back, {currentUser?.name || 'Super Administrator'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Master control panel for hospital infrastructure, role access, and multi-branch surveillance.
            </p>
          </div>
        </div>

        {/* NAVIGATION TABS WITH LIVE COUNTERS */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-700/80 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Overview & Metrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hospitals')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeTab === 'hospitals'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Hospital Branches ({hospitals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admins')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeTab === 'admins'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Admins ({admins.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeTab === 'appointments'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Appointments ({appointments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('patients')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeTab === 'patients'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Patients ({patients.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('doctors')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeTab === 'doctors'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Doctors ({doctors.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nurses')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeTab === 'nurses'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Nurses ({nurses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receptionists')}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeTab === 'receptionists'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Receptionists ({receptionists.length})
          </button>
        </div>
      </div>

      {/* SUB-MODULE ROUTING */}
      {activeTab === 'appointments' ? (
        <SuperAdminAppointments
          currentUser={currentUser}
          setCurrentPage={setCurrentPage}
          setSelectedPatient={setSelectedPatient}
          setSelectedAppointment={setSelectedAppointment}
        />
      ) : activeTab === 'patients' ? (
        <Patients_Management
          currentUser={currentUser}
          setCurrentPage={setCurrentPage}
          setSelectedPatient={setSelectedPatient}
        />
      ) : activeTab === 'receptionists' ? (
        <Receptionist_Management
          currentUser={currentUser}
          setCurrentPage={setCurrentPage}
          setSelectedReceptionist={setSelectedReceptionist}
        />
      ) : activeTab === 'nurses' ? (
        <Nurses
          currentUser={currentUser}
          setCurrentPage={setCurrentPage}
          setSelectedNurse={setSelectedNurse}
        />
      ) : activeTab === 'doctors' ? (
        <Doctors_Management
          currentUser={currentUser}
          setCurrentPage={setCurrentPage}
          setSelectedDoctor={setSelectedDoctor}
        />
      ) : activeTab === 'admins' ? (
        <Hospital_Admins
          currentUser={currentUser}
          setCurrentPage={setCurrentPage}
          setSelectedAdmin={setSelectedAdmin}
        />
      ) : activeTab === 'hospitals' ? (
        <Hospital
          currentUser={currentUser}
          setCurrentPage={setCurrentPage}
          setSelectedHospital={setSelectedHospital}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {systemStats.map((item, idx) => (
              <div
                key={idx}
                onClick={() => item.tab && setActiveTab(item.tab)}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition duration-150 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{item.title}</p>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 whitespace-nowrap ${item.color}`}>
                      {item.badge || 'Live'}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-2">
                    {loading ? '...' : item.value}
                  </h3>
                </div>
                {item.id === 'beds' ? (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-slate-50 py-1 px-1 rounded-lg border border-slate-200/70">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight">OT</span>
                      <span className="font-extrabold text-xs text-slate-800">{totalOTs}</span>
                    </div>
                    <div className="bg-rose-50/70 py-1 px-1 rounded-lg border border-rose-100">
                      <span className="block text-[10px] font-bold text-rose-600 uppercase tracking-tight">ICU</span>
                      <span className="font-extrabold text-xs text-rose-800">{totalIcuBeds}</span>
                    </div>
                    <div className="bg-sky-50/70 py-1 px-1 rounded-lg border border-sky-100">
                      <span className="block text-[10px] font-bold text-sky-600 uppercase tracking-tight">NICU</span>
                      <span className="font-extrabold text-xs text-sky-800">{totalNicuBeds}</span>
                    </div>
                    <div className="bg-amber-50/70 py-1 px-1 rounded-lg border border-amber-100">
                      <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-tight">Occupied</span>
                      <span className="font-extrabold text-xs text-amber-800">{totalOccupiedBeds}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-2 truncate">{item.sub}</p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-800">Hospital Branches Network</h2>
                    <p className="text-xs text-slate-500">Live operational status and doctors of all affiliated hospitals ({hospitals.length} total)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('hospitals')}
                    className="text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                  >
                    Manage All &rarr;
                  </button>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-center text-xs text-slate-600 min-w-[580px]">
                    <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 text-left">Branch Name & Code</th>
                        <th className="py-3 px-3 text-center">City</th>
                        <th className="py-3 px-3 text-center">Branch Administrator</th>
                        <th className="py-3 px-3 text-center">Doctors</th>
                        <th className="py-3 px-3 text-center">Patients / Occupancy</th>
                        <th className="py-3 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dynamicBranches.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            {loading ? 'Loading live hospital data...' : 'No hospital branches registered yet.'}
                          </td>
                        </tr>
                      ) : (
                        dynamicBranches.slice(0, visibleBranchesCount).map((b, i) => (
                          <tr
                            key={i}
                            onClick={() => handleBranchClick(b.raw)}
                            className="hover:bg-slate-50/80 transition cursor-pointer group"
                          >
                            <td className="py-3 px-3 text-left">
                              <p className="font-bold text-slate-800 group-hover:text-sky-700">{b.name}</p>
                              {b.raw?.Branch_Code && (
                                <span className="font-mono text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 inline-block mt-0.5">
                                  {b.raw.Branch_Code}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">{b.city}</td>
                            <td className="py-3 px-3 text-center font-medium text-slate-700">{b.head}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200 inline-block">
                                {b.doctorsCount}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center text-slate-600 font-medium">{b.occupancy}</td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  b.status === 'Operational'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {visibleBranchesCount < dynamicBranches.length && (
                <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-4 rounded-b-xl">
                  <button
                    type="button"
                    onClick={() => setVisibleBranchesCount((prev) => prev + 10)}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
                  >
                    Show More ({dynamicBranches.length - visibleBranchesCount} remaining)
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT 1-COL: LIVE AUDIT & ACTIVITY LOGS */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-800">Live Activity Feed</h2>
                    <p className="text-xs text-slate-500">Real-time registrations & staff events</p>
                  </div>
                  <span
                    onClick={() => setActiveTab('patients')}
                    className="text-[11px] font-bold text-sky-700 cursor-pointer hover:underline"
                  >
                    View All
                  </span>
                </div>

                <div className="space-y-3">
                  {dynamicAudits.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                      No recent activity logs recorded yet.
                    </div>
                  ) : (
                    dynamicAudits.map((audit, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 text-xs hover:bg-sky-50/30 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-800 truncate">{audit.action}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{audit.time}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 mt-1 text-[11px]">
                          {audit.user && audit.user.includes('@') ? (
                            <a
                              href={`mailto:${audit.user.toLowerCase()}`}
                              title={`Send email to ${audit.user}`}
                              className="font-mono text-[10px] text-sky-700 hover:underline truncate max-w-[160px]"
                            >
                              {audit.user}
                            </a>
                          ) : (
                            <span className="font-mono text-[10px] text-slate-600 truncate">{audit.user}</span>
                          )}
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                              audit.type === 'Patient'
                                ? 'bg-sky-100 text-sky-800'
                                : audit.type === 'Doctor'
                                ? 'bg-teal-100 text-teal-800'
                                : audit.type === 'Admin'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {audit.ip}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RECENT PATIENT REGISTRY TABLE */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  Recent Registered Patients ({patients.length})
                </h2>
                <p className="text-xs text-slate-500">
                  All verified patient accounts and profiles registered across hospital branches
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('patients')}
                className="text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer flex items-center gap-1"
              >
                View Full Patient Directory &rarr;
              </button>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
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
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        {loading ? 'Loading registered patients...' : 'No registered patients found.'}
                      </td>
                    </tr>
                  ) : (
                    patients.slice(0, 8).map((pat, i) => {
                      const displayId = pat.patient_id || pat.uhid || (pat.id ? `PAT-${pat.id}` : 'PAT-0');
                      const emailLower = (pat.email || '').toLowerCase().trim();
                      const contactNum = (pat.contact || pat.phone || '').trim();

                      return (
                        <tr
                          key={pat.id || i}
                          onClick={() => handlePatientClick(pat)}
                          className="hover:bg-sky-50/40 transition cursor-pointer group"
                        >
                          <td className="py-3 px-4 text-left font-bold text-slate-900 text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {(pat.name || 'P').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="block font-bold text-slate-900 group-hover:text-sky-700">{pat.name || 'Patient'}</span>
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
                                onClick={(e) => e.stopPropagation()}
                                className="text-sky-700 hover:text-sky-900 hover:underline font-medium block lowercase truncate max-w-[200px]"
                              >
                                {emailLower}
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              {pat.total_appointments || 0} {pat.total_appointments === 1 ? 'Visit' : 'Visits'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePatientClick(pat);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white font-bold text-xs transition cursor-pointer border border-sky-200 inline-flex items-center gap-1 shadow-2xs"
                            >
                              Details &rarr;
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

          {/* RECENT APPOINTMENTS & CLINICAL VISITS TABLE */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  Recent Appointments & Clinical Visits ({appointments.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Live consultations, OPD visits, and doctor appointments across all branches
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('appointments')}
                className="text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer flex items-center gap-1"
              >
                View All Appointments &rarr;
              </button>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-600 min-w-[850px]">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Appt ID & Date</th>
                    <th className="py-3 px-4">Patient Name & ID</th>
                    <th className="py-3 px-4">Branch Facility</th>
                    <th className="py-3 px-4">Assigned Doctor</th>
                    <th className="py-3 px-4 text-center">Ward / Bed</th>
                    <th className="py-3 px-4 text-center">Billing & Paid</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        {loading ? 'Loading live appointments...' : 'No appointments registered yet.'}
                      </td>
                    </tr>
                  ) : (
                    appointments.slice(0, 8).map((appt, i) => {
                      const isToday = isDateToday(appt.visit_date_time);
                      const isCancelled = (appt.status || '').toLowerCase() === 'cancelled' || (appt.status || '').toLowerCase() === 'rejected';
                      const isCompleted = (appt.status || '').toLowerCase() === 'completed' || (appt.status || '').toLowerCase() === 'discharged';

                      return (
                        <tr
                          key={appt.id || i}
                          onClick={() => handleAppointmentClick(appt)}
                          className="hover:bg-sky-50/40 transition cursor-pointer group"
                        >
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
                            <span className="font-bold text-slate-900 group-hover:text-sky-700 block">{appt.patient_name || appt.name || 'Patient'}</span>
                            <span className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 inline-block mt-0.5">
                              {appt.patient_id || (appt.id ? `PAT-${appt.id}` : 'PAT-0')}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                            {appt.hospital_name || 'Central Hospital'}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-teal-800 block">{appt.doctor_name || 'Unassigned'}</span>
                            {appt.doctor_specialization && (
                              <span className="text-[10px] text-slate-400 block">{appt.doctor_specialization}</span>
                            )}
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

                          <td className="py-3 px-4 text-center whitespace-nowrap font-mono">
                            <span className="font-bold text-slate-800 block">
                              ₹{Number(appt.amount_paid || 0).toFixed(2)}
                            </span>
                            <span className={`text-[10px] block font-semibold ${
                              (appt.payment_status || '').toLowerCase() === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {appt.payment_status || 'Pending'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                                isCancelled
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : isCompleted || appt.status === 'Confirmed' || appt.status === 'Admitted'
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAppointmentClick(appt);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white font-bold text-xs border border-sky-200 transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            >
                              View Details &rarr;
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
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
