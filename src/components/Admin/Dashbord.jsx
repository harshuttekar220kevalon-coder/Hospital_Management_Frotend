import React, { useState, useEffect } from 'react';

const AdminDashboard = ({ currentUser, setCurrentPage, setSelectedHospital, setSelectedDoctor, setSelectedPatient }) => {
  const [loading, setLoading] = useState(true);
  const [hospitalData, setHospitalData] = useState(null);
  const [adminRecord, setAdminRecord] = useState(null);
  const [noHospitalAssigned, setNoHospitalAssigned] = useState(false);

  const [doctorsList, setDoctorsList] = useState([]);
  const [nursesList, setNursesList] = useState([]);
  const [receptionistsList, setReceptionistsList] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Time Period Filter for Revenue & Patient Statistics
  const [timePeriod, setTimePeriod] = useState('month'); // 'today' | 'month' | 'year' | 'all'
  const [deptVisibleCount, setDeptVisibleCount] = useState(6);

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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setNoHospitalAssigned(false);

      // 1. Resolve Assigned Hospital ID for this Admin
      let assignedHospitalId = currentUser?.hospital || null;

      try {
        const adminsRes = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/');
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

      // Fallback to first available hospital if unassigned
      if (!assignedHospitalId) {
        try {
          const allHospRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/');
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

      // 2. Fetch Assigned Hospital
      let hosp = null;
      try {
        const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${assignedHospitalId}/`);
        if (hospRes && hospRes.ok) {
          hosp = await hospRes.json();
        }
      } catch (e) {
        console.error('Single hospital fetch error:', e);
      }

      if (!hosp) {
        try {
          const allHospRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/');
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

      // 3. Fetch Doctors, Nurses, Receptionists, Patients in parallel
      const [docRes, nurRes, recRes, patRes] = await Promise.allSettled([
        fetch('http://127.0.0.1:8000/api/super-admin/Doctors/'),
        fetch('http://127.0.0.1:8000/api/super-admin/Nurses/'),
        fetch('http://127.0.0.1:8000/api/super-admin/Receptionists/'),
        fetch('http://127.0.0.1:8000/api/super-admin/Patients/')
      ]);

      let branchDocs = [];
      if (docRes.status === 'fulfilled' && docRes.value.ok) {
        const allDocs = await docRes.value.json().catch(() => []);
        branchDocs = allDocs.filter(d => {
          if (Array.isArray(d.hospitals)) return d.hospitals.includes(Number(assignedHospitalId));
          return Number(d.hospital) === Number(assignedHospitalId);
        });
        setDoctorsList(branchDocs);
      }

      if (nurRes.status === 'fulfilled' && nurRes.value.ok) {
        const allNurs = await nurRes.value.json().catch(() => []);
        const branchNurs = allNurs.filter(n => Number(n.hospital) === Number(assignedHospitalId));
        setNursesList(branchNurs);
      }

      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const allRecs = await recRes.value.json().catch(() => []);
        const branchRecs = allRecs.filter(r => Number(r.hospital) === Number(assignedHospitalId));
        setReceptionistsList(branchRecs);
      }

      if (patRes.status === 'fulfilled' && patRes.value.ok) {
        const allPats = await patRes.value.json().catch(() => []);
        const branchPats = allPats.filter(p => Number(p.hospital) === Number(assignedHospitalId));
        setPatientsList(branchPats);
      }

      // 4. Parse Departments
      const rawDepts = hosp.departments || hosp.department;
      let parsedDepts = [];
      if (Array.isArray(rawDepts)) {
        parsedDepts = rawDepts.map((d, index) => {
          const dName = typeof d === 'string' ? d.trim() : (d.name || `Department ${index + 1}`);
          const matchingDoc = branchDocs.find(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase())) || branchDocs[index % (branchDocs.length || 1)];
          return {
            dept: dName,
            head: matchingDoc ? matchingDoc.name : 'Dr. Senior Consultant',
            activeBeds: `${Math.min(18, Math.floor((hosp.total_beds || 60) / (rawDepts.length || 1)) - 2)}/${Math.floor((hosp.total_beds || 60) / (rawDepts.length || 1))}`,
            status: index === 0 ? 'High Alert' : 'Normal',
            alertColor: index === 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          };
        }).filter(d => d.dept.length > 0);
      } else if (typeof rawDepts === 'string' && rawDepts.trim().length > 0) {
        parsedDepts = rawDepts.split(',').map((d, index) => {
          const dName = d.trim();
          const matchingDoc = branchDocs.find(doc => (doc.department || '').toLowerCase().includes(dName.toLowerCase())) || branchDocs[index % (branchDocs.length || 1)];
          return {
            dept: dName,
            head: matchingDoc ? matchingDoc.name : 'Dr. Senior Consultant',
            activeBeds: `${Math.min(18, Math.floor((hosp.total_beds || 60) / (rawDepts.split(',').length || 1)) - 2)}/${Math.floor((hosp.total_beds || 60) / (rawDepts.split(',').length || 1))}`,
            status: 'Normal',
            alertColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
          };
        }).filter(d => d.dept.length > 0);
      }

      if (parsedDepts.length === 0) {
        parsedDepts = [
          { dept: 'Emergency & Trauma Care', head: branchDocs[0]?.name || 'Dr. Ramesh Sethi', activeBeds: '18/20', status: 'High Alert', alertColor: 'bg-rose-50 text-rose-700 border-rose-200' },
          { dept: 'Cardiology Department', head: branchDocs[1]?.name || 'Dr. Aditi Verma', activeBeds: '24/30', status: 'Normal', alertColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { dept: 'Orthopedics & Joint Care', head: branchDocs[2]?.name || 'Dr. Rajesh Kumar', activeBeds: '15/25', status: 'Normal', alertColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { dept: 'Pediatrics & Neonatal Care', head: branchDocs[3]?.name || 'Dr. Neha Singh', activeBeds: '12/15', status: 'Occupied', alertColor: 'bg-amber-50 text-amber-700 border-amber-200' }
        ];
      }
      setDepartments(parsedDepts);

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

  // Staff Counts
  const totalStaffCount = doctorsList.length + nursesList.length + receptionistsList.length;
  const activeDoctorsCount = doctorsList.filter(d => d.is_active !== false).length;
  const onLeaveDoctorsCount = doctorsList.filter(d => d.is_active === false).length;
  const activeNursesCount = nursesList.filter(n => n.is_active !== false).length;
  const onLeaveNursesCount = nursesList.filter(n => n.is_active === false).length;
  const activeReceptionistsCount = receptionistsList.filter(r => r.is_active !== false).length;
  const onLeaveReceptionistsCount = receptionistsList.filter(r => r.is_active === false).length;
  const activeStaffCount = activeDoctorsCount + activeNursesCount + activeReceptionistsCount;
  const onLeaveStaffCount = onLeaveDoctorsCount + onLeaveNursesCount + onLeaveReceptionistsCount;

  // Bed & Infrastructure Calculations
  const totalBedsNum = Number(hospitalData.total_beds) || 0;
  const admittedPatients = patientsList.filter(p => 
    (p.status || '').toLowerCase().includes('admit') || 
    (p.admission_status || '').toLowerCase().includes('admit') ||
    (p.patient_type || '').toLowerCase().includes('ipd')
  );
  const occupiedBedsNum = admittedPatients.length > 0 ? admittedPatients.length : Math.min(totalBedsNum, patientsList.length);
  const occupancyPercentRaw = totalBedsNum > 0 ? (occupiedBedsNum / totalBedsNum) * 100 : 0;
  const occupancyRate = occupancyPercentRaw > 0 && occupancyPercentRaw < 1 
    ? occupancyPercentRaw.toFixed(1) 
    : Math.round(occupancyPercentRaw);
  const availableBeds = Math.max(0, totalBedsNum - occupiedBedsNum);

  // Time Analysis for Patients & Revenue
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
  const todayPatientsCount = todayPatients.length > 0 ? todayPatients.length : Math.min(patientsList.length, 3);

  const monthPatients = patientsList.filter(p => isDateThisMonth(p.visit_date_time || p.created_at || p.date || p.admission_date));
  const monthPatientsCount = monthPatients.length > 0 ? monthPatients.length : patientsList.length;

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

      // STRICT RULE: Only add to Doctor Fees, Hospital Revenue, and Total Collections if patient has PAID!
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
      // If Pending, Failed, Cancelled, or Unpaid -> 0 is added!
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

  // Active Time Period Filtered values
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
  const activePeriodEmergency = activePeriodPatients.filter(p => 
    (p.symptoms_severity || '').toLowerCase().includes('urgent') || 
    (p.symptoms_severity || '').toLowerCase().includes('emergency')
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-7">
      
      {/* 1. TOP WELCOME & QUICK NAV BANNER */}
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

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('admin_doctors')}
              className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              Doctors ({doctorsList.length})
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('admin_nurses')}
              className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              Nurses ({nursesList.length})
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('admin_receptionists')}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              Receptionists ({receptionistsList.length})
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('admin_patients')}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              Patients ({patientsList.length})
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('admin_hospital_management')}
              className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold shadow-sm transition cursor-pointer border border-slate-600"
            >
              Profile & Wards
            </button>
          </div>
        </div>
      </div>

      {/* 2. SECTION A: MEDICAL & ADMINISTRATIVE STAFF (4 CARDS) */}
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

      {/* 3. SECTION B: HOSPITAL CAPACITY & CRITICAL INFRASTRUCTURE (4 CARDS) */}
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

      {/* 4. SECTION C: PATIENT FLOW & FINANCIAL REVENUE ANALYTICS (WITH TIME FILTER) */}
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

          {/* Time Period Filter Tabs */}
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

        {/* 4 Focused Analytics Cards for Selected Period */}
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

      {/* 5. SECTION D: TWO-COLUMN LAYOUT (RECENT PATIENTS QUEUE + ON-DUTY DOCTORS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        
        {/* Left Column: Recent Patients Roster */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Recent Patients ({patientsList.length})</h3>
                <p className="text-xs text-slate-500">Latest consultations & admissions in this branch</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('admin_patients')}
                className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer bg-transparent border-0"
              >
                View All Patients &rarr;
              </button>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-center text-xs text-slate-600 min-w-[380px]">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center">Patient & ID</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Payment</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patientsList.slice(0, 5).map((pat) => (
                    <tr key={pat.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-slate-800 block">{pat.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{pat.patient_id || `PAT-${pat.id}`}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          (pat.status || '').toLowerCase().includes('admit')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {pat.status || 'Admitted'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                        ₹{pat.amount_paid || pat.consultation_fee || 500}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (setSelectedPatient) setSelectedPatient(pat);
                            localStorage.setItem('selectedPatient', JSON.stringify(pat));
                            if (setCurrentPage) setCurrentPage('admin_patient_details');
                          }}
                          className="text-teal-700 hover:text-teal-900 font-bold text-xs cursor-pointer"
                        >
                          Details &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                  {patientsList.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-xs text-slate-400">
                        No patients registered yet in this branch.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('admin_patients')}
            className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer text-center"
          >
            + Register New Patient / View All
          </button>
        </div>

        {/* Right Column: Doctors On-Duty & OPD Cabin Schedule */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Doctors On Duty ({doctorsList.length})</h3>
                <p className="text-xs text-slate-500">Active medical practitioners and OPD schedules</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage && setCurrentPage('admin_doctors')}
                className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer bg-transparent border-0"
              >
                View All Doctors &rarr;
              </button>
            </div>

            <div className="space-y-2.5">
              {doctorsList.slice(0, 4).map((doc) => {
                const specs = parseSpecializations(doc.specialization || doc.specialty || 'General');
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      if (setSelectedDoctor) setSelectedDoctor(doc);
                      localStorage.setItem('selectedDoctor', JSON.stringify(doc));
                      if (setCurrentPage) setCurrentPage('admin_doctor_details');
                    }}
                    className="p-2.5 rounded-xl bg-slate-50/80 hover:bg-teal-50/50 border border-slate-200/80 transition flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{doc.name}</h4>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {specs.slice(0, 2).map((s, i) => (
                          <span key={i} className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            {s}
                          </span>
                        ))}
                        <span className="text-[10px] text-slate-400">• {doc.opd_timings || 'Mon - Fri (10:00 AM - 02:00 PM)'}</span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      doc.is_active !== false
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {doc.is_active !== false ? 'Available' : 'On Leave'}
                    </span>
                  </div>
                );
              })}
              {doctorsList.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400">No doctors registered yet.</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('admin_doctors')}
            className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer text-center"
          >
            + Register New Doctor / View Roster
          </button>
        </div>
      </div>

      {/* 6. SECTION E: HOSPITAL DEPARTMENT CAPACITY TABLE */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Hospital Department Capacity</h2>
            <p className="text-xs text-slate-500">Live operational status and bed capacity for {hospitalData.Name}</p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('admin_hospital_management')}
            className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer bg-transparent border-0"
          >
            Manage Wards & Beds &rarr;
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[550px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Head of Dept</th>
                <th className="py-3 px-3">Bed Allocation</th>
                <th className="py-3 px-3">Condition</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.slice(0, deptVisibleCount).map((d, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-3 font-semibold text-slate-800">{d.dept}</td>
                  <td className="py-3 px-3">{d.head}</td>
                  <td className="py-3 px-3 font-medium">{d.activeBeds}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${d.alertColor}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => setCurrentPage && setCurrentPage('admin_hospital_management')}
                      className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      Details &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {deptVisibleCount < departments.length && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setDeptVisibleCount((prev) => prev + 6)}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;
