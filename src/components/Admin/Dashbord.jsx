import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const AdminDashboard = ({ currentUser, setCurrentPage, setSelectedHospital, setSelectedDoctor, setSelectedPatient, setSelectedNurse, setSelectedReceptionist }) => {
  const [loading, setLoading] = useState(true);
  const [hospitalData, setHospitalData] = useState(null);
  const [adminRecord, setAdminRecord] = useState(null);
  const [noHospitalAssigned, setNoHospitalAssigned] = useState(false);

  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [receptionistsList, setReceptionistsList] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [timePeriod, setTimePeriod] = useState('month');
  const [patientVisibleCount, setPatientVisibleCount] = useState(10);
  const [docVisibleCount, setDocVisibleCount] = useState(10);
  const [nurseVisibleCount, setNurseVisibleCount] = useState(10);
  const [recVisibleCount, setRecVisibleCount] = useState(10);

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

  const handleViewDoctor = (doc) => {
    if (setSelectedDoctor) setSelectedDoctor(doc);
    localStorage.setItem('selectedDoctor', JSON.stringify(doc));
    if (setCurrentPage) setCurrentPage('admin_doctor_details');
  };

  const handleViewPatient = (pat) => {
    if (setSelectedPatient) setSelectedPatient(pat);
    localStorage.setItem('selectedPatient', JSON.stringify(pat));
    if (setCurrentPage) setCurrentPage('admin_patient_details');
  };

  const handleViewNurse = (nurse) => {
    if (setSelectedNurse) setSelectedNurse(nurse);
    localStorage.setItem('selectedNurse', JSON.stringify(nurse));
    if (setCurrentPage) setCurrentPage('admin_nurse_details');
  };

  const handleViewReceptionist = (rec) => {
    if (setSelectedReceptionist) setSelectedReceptionist(rec);
    localStorage.setItem('selectedReceptionist', JSON.stringify(rec));
    if (setCurrentPage) setCurrentPage('admin_receptionist_details');
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setNoHospitalAssigned(false);

      let assignedHospitalId = currentUser?.hospital || null;

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
            setAdminRecord(matchedAdmin);
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
          const saved = localStorage.getItem('selectedHospital');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.id) assignedHospitalId = parsed.id;
          }
        } catch {}
      }

      if (!assignedHospitalId) {
        try {
          const allHospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`);
          if (allHospRes.ok) {
            const allHosp = await allHospRes.json();
            if (Array.isArray(allHosp) && allHosp.length > 0) {
              assignedHospitalId = allHosp[0].id;
            }
          }
        } catch (e) {
          console.error('Hospital list fallback error:', e);
        }
      }

      if (!assignedHospitalId) {
        setNoHospitalAssigned(true);
        setLoading(false);
        return;
      }

      let hosp = null;
      try {
        const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/${assignedHospitalId}/`);
        if (hospRes && hospRes.ok) {
          hosp = await hospRes.json();
        }
      } catch (e) {
        console.error('Single hospital fetch error:', e);
      }

      if (!hosp) {
        try {
          const allHospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`);
          if (allHospRes && allHospRes.ok) {
            const allHosp = await allHospRes.json();
            hosp = allHosp.find(h => Number(h.id) === Number(assignedHospitalId)) || allHosp[0] || null;
          }
        } catch (e) {}
      }

      if (hosp) {
        setHospitalData(hosp);
        if (setSelectedHospital) setSelectedHospital(hosp);
        localStorage.setItem('selectedHospital', JSON.stringify(hosp));
      } else {
        setNoHospitalAssigned(true);
        setLoading(false);
        return;
      }

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
          if (Array.isArray(d.hospitals) && d.hospitals.length > 0) {
            return d.hospitals.some(h => Number(typeof h === 'object' ? h.id : h) === Number(assignedHospitalId));
          }
          return Number(typeof d.hospital === 'object' ? d.hospital?.id : d.hospital) === Number(assignedHospitalId);
        });
        setDoctorsList(branchDocs);
      }

      if (nurRes.status === 'fulfilled' && nurRes.value.ok) {
        const allNurs = await nurRes.value.json().catch(() => []);
        const branchNurs = allNurs.filter(n => Number(typeof n.hospital === 'object' ? n.hospital?.id : n.hospital) === Number(assignedHospitalId));
        setNursesList(branchNurs);
      }

      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const allRecs = await recRes.value.json().catch(() => []);
        const branchRecs = allRecs.filter(r => Number(typeof r.hospital === 'object' ? r.hospital?.id : r.hospital) === Number(assignedHospitalId));
        setReceptionistsList(branchRecs);
      }

      let rawPats = [];
      if (patRes.status === 'fulfilled' && patRes.value.ok) {
        rawPats = await patRes.value.json().catch(() => []);
      }
      let rawAppts = [];
      if (apptRes.status === 'fulfilled' && apptRes.value.ok) {
        rawAppts = await apptRes.value.json().catch(() => []);
      }

      const allCombinedPats = [...(Array.isArray(rawAppts) ? rawAppts : []), ...(Array.isArray(rawPats) ? rawPats : [])];
      const seenPIds = new Set();
      const branchPats = [];

      for (const item of allCombinedPats) {
        if (!item) continue;
        const idKey = String(item.Appoment_id || item.appoment_id || item.appointment_id || item.id);
        if (seenPIds.has(idKey)) continue;
        seenPIds.add(idKey);

        const patHospId = typeof item.hospital === 'object' && item.hospital !== null ? item.hospital?.id : item.hospital;
        const patHospName = item.hospital_name || (typeof item.hospital === 'object' ? (item.hospital?.Name || item.hospital?.name) : (typeof item.hospital === 'string' && isNaN(Number(item.hospital)) ? item.hospital : ''));
        const currentHospName = hosp?.Name || hosp?.name || '';

        let isMatch = false;
        if (patHospId && !isNaN(Number(patHospId)) && Number(patHospId) === Number(assignedHospitalId)) {
          isMatch = true;
        } else if (patHospName && currentHospName && patHospName.toLowerCase().trim() === currentHospName.toLowerCase().trim()) {
          isMatch = true;
        }

        if (isMatch) {
          branchPats.push(item);
        }
      }

      setPatientsList(branchPats);

    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-semibold text-slate-500">Loading your hospital administrator overview...</p>
      </div>
    );
  }

  if (noHospitalAssigned || !hospitalData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md">
          <h2 className="text-xl font-bold text-slate-800">No Hospital Facility Assigned</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-md mx-auto">
            Your Administrator account (<strong>{currentUser?.email}</strong>) has not been linked to an active hospital by Super Admin yet.
          </p>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="mt-5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition cursor-pointer"
          >
            Check Assignment
          </button>
        </div>
      </div>
    );
  }

  const totalStaffCount = doctorsList.length + nursesList.length + receptionistsList.length;
  const activeDoctorsCount = doctorsList.filter(d => d.is_active !== false).length;
  const onLeaveDoctorsCount = doctorsList.filter(d => d.is_active === false).length;
  const activeNursesCount = nursesList.filter(n => n.is_active !== false).length;
  const onLeaveNursesCount = nursesList.filter(n => n.is_active === false).length;
  const activeReceptionistsCount = receptionistsList.filter(r => r.is_active !== false).length;
  const onLeaveReceptionistsCount = receptionistsList.filter(r => r.is_active === false).length;
  const activeStaffCount = activeDoctorsCount + activeNursesCount + activeReceptionistsCount;
  const onLeaveStaffCount = onLeaveDoctorsCount + onLeaveNursesCount + onLeaveReceptionistsCount;

  const totalBedsNum = Number(hospitalData.total_beds) || 0;
  const admittedPatients = patientsList.filter(p => {
    const st = (p.status || '').toLowerCase();
    const admSt = (p.admission_status || '').toLowerCase();
    const isDischarged = st.includes('discharge') || admSt.includes('discharge') || st.includes('cancel');
    const isAdmitted = (st.includes('admit') || admSt.includes('admit') || (p.patient_type || '').toLowerCase().includes('ipd')) && !isDischarged;
    return isAdmitted && p.bed_number != null;
  });
  const occupiedBedsNum = admittedPatients.length;
  const occupancyPercentRaw = totalBedsNum > 0 ? (occupiedBedsNum / totalBedsNum) * 100 : 0;
  const occupancyRate = occupancyPercentRaw > 0 && occupancyPercentRaw < 1 
    ? occupancyPercentRaw.toFixed(1) 
    : Math.round(occupancyPercentRaw);
  const availableBeds = Math.max(0, totalBedsNum - occupiedBedsNum);

  const now = new Date();
  const isDateToday = (dStr) => {
    if (!dStr) return false;
    const d = new Date(dStr);
    return !isNaN(d.getTime()) &&
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
  };

  const isDateThisMonth = (dStr) => {
    if (!dStr) return false;
    const d = new Date(dStr);
    return !isNaN(d.getTime()) &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
  };

  const isDateThisYear = (dStr) => {
    if (!dStr) return false;
    const d = new Date(dStr);
    return !isNaN(d.getTime()) &&
      d.getFullYear() === now.getFullYear();
  };

  const todayPatients = patientsList.filter(p => isDateToday(p.visit_date_time || p.created_at || p.date || p.admission_date));
  const todayPatientsCount = todayPatients.length;

  const monthPatients = patientsList.filter(p => isDateThisMonth(p.visit_date_time || p.created_at || p.date || p.admission_date));
  const monthPatientsCount = monthPatients.length;

  const yearPatients = patientsList.filter(p => isDateThisYear(p.visit_date_time || p.created_at || p.date || p.admission_date));

  const getFinancials = (pList) => {
    let docFees = 0;
    let hospRevenue = 0;
    let totalCollected = 0;

    (pList || []).forEach(p => {
      const docFee = parseFloat(p.consultation_fee) || 0;
      const hospCharge = parseFloat(p.Hospitals_Chargies) || parseFloat(p.hospital_charges) || 0;
      const paid = parseFloat(p.amount_paid) || 0;
      const statusLower = (p.payment_status || '').toLowerCase();
      const isPaid = statusLower === 'paid';
      const isPartial = statusLower === 'partial';

      if (isPaid) {
        docFees += docFee;
        hospRevenue += hospCharge;
        totalCollected += paid > 0 ? paid : (docFee + hospCharge);
      } else if (isPartial && paid > 0) {
        const gross = docFee + hospCharge;
        if (gross > 0) {
          docFees += (docFee / gross) * paid;
          hospRevenue += (hospCharge / gross) * paid;
        }
        totalCollected += paid;
      }
    });

    return {
      docFees,
      hospRevenue,
      totalGross: docFees + hospRevenue,
      totalCollected
    };
  };

  const todayFin = getFinancials(todayPatients);
  const monthFin = getFinancials(monthPatients);
  const yearFin = getFinancials(yearPatients);
  const allFin = getFinancials(patientsList);

  let activePeriodPatients = patientsList;
  let activePeriodFin = allFin;
  let activePeriodLabel = 'All-Time Record';

  if (timePeriod === 'today') {
    activePeriodPatients = todayPatients;
    activePeriodFin = todayFin;
    activePeriodLabel = "Today's Activity";
  } else if (timePeriod === 'month') {
    activePeriodPatients = monthPatients;
    activePeriodFin = monthFin;
    activePeriodLabel = "This Month's Activity";
  } else if (timePeriod === 'year') {
    activePeriodPatients = yearPatients;
    activePeriodFin = yearFin;
    activePeriodLabel = "This Year's Activity";
  }

  const activePeriodAdmitted = activePeriodPatients.filter(p => 
    (p.status || '').toLowerCase().includes('admit') || 
    (p.admission_status || '').toLowerCase().includes('admit') ||
    (p.patient_type || '').toLowerCase().includes('ipd')
  ).length;

  const activePeriodOPD = Math.max(0, activePeriodPatients.length - activePeriodAdmitted);
  const activePeriodEmergency = activePeriodPatients.filter(p => {
    const isDischarged = (p.status || '').toLowerCase().includes('discharg') || (p.status || '').toLowerCase().includes('complet');
    const cond = (p.Condation || p.condation || p.condition || p.symptoms_severity || '').toLowerCase();
    return !isDischarged && (cond.includes('critical') || cond.includes('emergency') || cond.includes('urgent'));
  }).length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-7">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-700/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              {hospitalData.Name} • {hospitalData.city}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
              Welcome, {adminRecord?.name || currentUser?.name || 'Hospital Administrator'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Hospital Operations Overview: Monitor real-time medical staff duty rosters, emergency infrastructure, patient flow, bed occupancy, and billing revenue.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('admin_doctors')}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              Doctors
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('admin_nurses')}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              Nurses
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('admin_receptionists')}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              Receptionists
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('admin_patients')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              Patients
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('admin_hospital_management')}
              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold shadow-xs transition cursor-pointer border border-slate-600 whitespace-nowrap"
            >
              Hospital Management
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Hospital Staffing Roster</h2>
            <p className="text-xs text-slate-500">Live operational personnel currently registered in this facility</p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('admin_doctors')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer bg-transparent border-0"
          >
            Manage Staff &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Hospital Staff</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {activeStaffCount} On Duty
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mt-2">{totalStaffCount} Members</h3>
            <p className="text-xs text-slate-500 mt-1">
              {onLeaveStaffCount} On Leave
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Doctors Roster</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                {activeDoctorsCount} On Duty
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-teal-700 mt-2">{doctorsList.length} Doctors</h3>
            <p className="text-xs text-slate-500 mt-1">
              {onLeaveDoctorsCount} On Leave
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nursing Staff</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                {activeNursesCount} On Duty
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-cyan-800 mt-2">{nursesList.length} Nurses</h3>
            <p className="text-xs text-slate-500 mt-1">
              {onLeaveNursesCount} On Leave
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Front Desk & Billing</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeReceptionistsCount} On Duty
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-indigo-700 mt-2">{receptionistsList.length} Receptionists</h3>
            <p className="text-xs text-slate-500 mt-1">
              {onLeaveReceptionistsCount} On Leave
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Beds Capacity & Emergency Infrastructure</h2>
            <p className="text-xs text-slate-500">Live operational facilities, intensive care units, and emergency assets</p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('admin_hospital_management')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer bg-transparent border-0"
          >
            Manage Beds & Wards &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Hospital Beds</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {occupancyRate}% Occupancy
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mt-2">{totalBedsNum} Total Beds</h3>
            <p className="text-xs text-slate-500 mt-1">
              <strong className="text-emerald-700 font-semibold">{availableBeds} beds available</strong> • {occupiedBedsNum} occupied
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ICU Critical Care Beds</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                24x7 Critical
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-rose-700 mt-2">{hospitalData.icu_beds || 0} ICU Beds</h3>
            <p className="text-xs text-slate-500 mt-1">
              Equipped with high-flow ventilators & monitors
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">NICU Neonatal Care</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Neonatal
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-amber-700 mt-2">{hospitalData.nicu_beds || 0} NICU Beds</h3>
            <p className="text-xs text-slate-500 mt-1">
              Incubators & phototherapy units ready
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">OTs & Ambulance Fleet</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Emergency Ready
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-700 mt-2">
              {hospitalData.operation_theatres || 0} OTs • {hospitalData.ambulances_count || 0} Ambulances
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Modular operation suites & mobile ALS fleet
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">Patient Inflow & Hospital Revenue</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                {activePeriodLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a time period to analyze clinical consultations, admissions, and financial collections
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setTimePeriod('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timePeriod === 'today'
                  ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimePeriod('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timePeriod === 'month'
                  ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setTimePeriod('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timePeriod === 'year'
                  ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Year
            </button>
            <button
              type="button"
              onClick={() => setTimePeriod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                timePeriod === 'all'
                  ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200/80">
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">Hospital Revenue ({activePeriodLabel})</span>
            <h3 className="text-2xl font-bold text-sky-700 mt-1">₹{activePeriodFin.hospRevenue.toLocaleString()}</h3>
            <p className="text-xs text-sky-600 mt-0.5">Facility & hospital service charges</p>
          </div>

          <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200/80">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">Total Doctor Fees ({activePeriodLabel})</span>
            <h3 className="text-2xl font-bold text-teal-700 mt-1">₹{activePeriodFin.docFees.toLocaleString()}</h3>
            <p className="text-xs text-teal-600 mt-0.5">Doctor consultation collections</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Collected ({activePeriodLabel})</span>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">₹{activePeriodFin.totalCollected.toLocaleString()}</h3>
            <p className="text-xs text-emerald-600 mt-0.5">Gross receipts across doctor & hospital</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/90">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Inflow ({activePeriodLabel})</span>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{activePeriodPatients.length} Patients</h3>
            <p className="text-xs text-slate-500 mt-0.5">{activePeriodAdmitted} Admitted IPD • {activePeriodOPD} OPD Queue</p>
          </div>
        </div>

      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Doctors On-Duty & Consultants ({doctorsList.length})</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                {activeDoctorsCount} Available
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Active medical practitioners, clinical specialties, and OPD timings for {hospitalData.Name}</p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('admin_doctors')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer bg-transparent border-0 self-start sm:self-auto"
          >
            Manage All Doctors &rarr;
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-center text-xs text-slate-600 min-w-[700px]">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">Doctor Name & ID</th>
                <th className="py-3 px-3 text-center">Specialization</th>
                <th className="py-3 px-3 text-center">OPD Timings</th>
                <th className="py-3 px-3 text-center">Contact</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doctorsList.slice(0, docVisibleCount).map((doc) => {
                const specs = parseSpecializations(doc.specialization || doc.specialty || 'General');
                return (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-slate-800 block">{doc.name || 'Doctor'}</span>
                      <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-0.5">
                        {doc.doctor_id || `DOC-${doc.id}`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1 max-w-[220px] mx-auto">
                        {specs.slice(0, 2).map((s, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 inline-block">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-slate-700">
                      {doc.opd_timings || 'Mon - Fri (10:00 AM - 02:00 PM)'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-slate-800 block">{doc.phone || doc.contact || '-'}</span>
                      {doc.email && (
                        <a
                          href={`mailto:${doc.email.toLowerCase()}`}
                          title={`Send email to ${doc.email}`}
                          className="text-[10px] text-teal-600 hover:text-teal-800 hover:underline block lowercase truncate max-w-[150px] mx-auto"
                        >
                          {doc.email}
                        </a>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        doc.is_active !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {doc.is_active !== false ? 'Available' : 'On Leave'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleViewDoctor(doc)}
                        className="px-3 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white font-bold text-xs transition cursor-pointer border border-teal-200"
                      >
                        Details &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
              {doctorsList.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                    No doctors registered in this branch yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {docVisibleCount < doctorsList.length && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setDocVisibleCount((prev) => prev + 10)}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More ({doctorsList.length - docVisibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Nursing Staff On-Duty ({nursesList.length})</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                {activeNursesCount} Available
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Assigned ward duty allocations and active shift schedules for {hospitalData.Name}</p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('admin_nurses')}
            className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 cursor-pointer bg-transparent border-0 self-start sm:self-auto"
          >
            Manage All Nurses &rarr;
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-center text-xs text-slate-600 min-w-[700px]">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">Nurse Name & ID</th>
                <th className="py-3 px-3 text-center">Role & Ward</th>
                <th className="py-3 px-3 text-center">Shift Timings</th>
                <th className="py-3 px-3 text-center">Contact</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {nursesList.slice(0, nurseVisibleCount).map((nurse) => (
                <tr key={nurse.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-3 text-center">
                    <span className="font-bold text-slate-800 block">{nurse.name || 'Nurse'}</span>
                    <span className="font-mono text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 inline-block mt-0.5">
                      {nurse.nurse_id || `NUR-${nurse.id}`}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-semibold text-slate-800 block">{nurse.role || nurse.nurse_role || 'Staff Nurse'}</span>
                    <span className="text-[11px] text-slate-500">{nurse.ward || 'General Ward'}</span>
                  </td>
                  <td className="py-3 px-3 text-center font-medium text-slate-700">
                    {nurse.shift || 'Morning Shift'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-bold text-slate-800 block">{nurse.contact || nurse.phone || '-'}</span>
                    {nurse.email && (
                      <a
                        href={`mailto:${nurse.email.toLowerCase()}`}
                        title={`Send email to ${nurse.email}`}
                        className="text-[10px] text-cyan-600 hover:text-cyan-800 hover:underline block lowercase truncate max-w-[150px] mx-auto"
                      >
                        {nurse.email}
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      nurse.is_active !== false
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {nurse.is_active !== false ? 'Active' : 'On Leave'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleViewNurse(nurse)}
                      className="px-3 py-1 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-600 hover:text-white font-bold text-xs transition cursor-pointer border border-cyan-200"
                    >
                      Details &rarr;
                    </button>
                  </td>
                </tr>
              ))}
              {nursesList.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                    No nurses registered in this branch yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {nurseVisibleCount < nursesList.length && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setNurseVisibleCount((prev) => prev + 10)}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More ({nursesList.length - nurseVisibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Front Desk & Receptionists ({receptionistsList.length})</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeReceptionistsCount} Available
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Patient registration desks, appointment counters, and front-desk personnel</p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('admin_receptionists')}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer bg-transparent border-0 self-start sm:self-auto"
          >
            Manage All Receptionists &rarr;
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-center text-xs text-slate-600 min-w-[700px]">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">Receptionist Name & ID</th>
                <th className="py-3 px-3 text-center">Desk Role</th>
                <th className="py-3 px-3 text-center">Shift Timings</th>
                <th className="py-3 px-3 text-center">Contact</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receptionistsList.slice(0, recVisibleCount).map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-3 text-center">
                    <span className="font-bold text-slate-800 block">{rec.name || 'Receptionist'}</span>
                    <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block mt-0.5">
                      {rec.receptionist_id || `REC-${rec.id}`}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-semibold text-slate-800 block">{rec.role || 'Front Desk'}</span>
                    <span className="text-[10px] text-slate-400">{rec.languages || 'English, Hindi'}</span>
                  </td>
                  <td className="py-3 px-3 text-center font-medium text-slate-700">
                    {rec.shift || 'General Shift'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-bold text-slate-800 block">{rec.contact || rec.phone || '-'}</span>
                    {rec.email && (
                      <a
                        href={`mailto:${rec.email.toLowerCase()}`}
                        title={`Send email to ${rec.email}`}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline block lowercase truncate max-w-[150px] mx-auto"
                      >
                        {rec.email}
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      rec.is_active !== false && rec.status !== 'On Leave'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {rec.is_active !== false && rec.status !== 'On Leave' ? 'Active' : 'On Leave'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleViewReceptionist(rec)}
                      className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold text-xs transition cursor-pointer border border-indigo-200"
                    >
                      Details &rarr;
                    </button>
                  </td>
                </tr>
              ))}
              {receptionistsList.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                    No receptionists registered in this branch yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {recVisibleCount < receptionistsList.length && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setRecVisibleCount((prev) => prev + 10)}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More ({receptionistsList.length - recVisibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Patients & Inflow Queue ({patientsList.length})</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {admittedPatients.length} Admitted IPD
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Live in-patient admissions, OPD triage, and billing records for {hospitalData.Name}</p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('admin_patients')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer bg-transparent border-0 self-start sm:self-auto"
          >
            Manage All Patients &rarr;
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-center text-xs text-slate-600 min-w-[700px]">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">Patient Name & ID</th>
                <th className="py-3 px-3 text-center">Assigned Doctor</th>
                <th className="py-3 px-3 text-center">Symptoms / Diagnosis</th>
                <th className="py-3 px-3 text-center">Payment</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patientsList.slice(0, patientVisibleCount).map((pat) => {
                const assignedDoc = doctorsList.find(d => Number(d.id) === Number(pat.doctor));
                return (
                  <tr key={pat.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-slate-800 block">{pat.name || 'Patient'}</span>
                      <div className="flex items-center justify-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block">
                          {pat.patient_id || pat.uhid || `PAT-${pat.id}`}
                        </span>
                        {pat.age && (
                          <span className="text-[10px] text-slate-400 font-semibold">{pat.age}Y • {pat.gender || 'M'}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-semibold text-slate-800 block">{assignedDoc?.name || pat.doctor_name || 'Dr. Consultant'}</span>
                      <span className="text-[10px] text-teal-700">{assignedDoc?.specialization || 'General'}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-slate-700 font-medium block max-w-[180px] mx-auto truncate">
                        {pat.symptoms_diagnosis || pat.reason || 'General Consultation'}
                      </span>
                      {(() => {
                        const cond = pat.Condation || pat.condation || pat.condition || pat.symptoms_severity;
                        if (!cond) return null;
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border inline-block mt-0.5 ${
                            cond === 'Critical' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                            cond === 'Emergency' ? 'bg-red-100 text-red-800 border-red-300' :
                            cond === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {cond}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        pat.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        pat.payment_status === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {pat.payment_status || 'Paid'} • ₹{pat.amount_paid || pat.consultation_fee || 500}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        (pat.status || '').toLowerCase().includes('admit')
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : (pat.status || '').toLowerCase().includes('discharg')
                          ? 'bg-slate-100 text-slate-700 border-slate-300'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {pat.status || 'Admitted'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleViewPatient(pat)}
                        className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-xs transition cursor-pointer border border-emerald-200"
                      >
                        Details &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
              {patientsList.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                    No patients registered in this branch yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {patientVisibleCount < patientsList.length && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setPatientVisibleCount((prev) => prev + 10)}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More ({patientsList.length - patientVisibleCount} remaining)
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;
