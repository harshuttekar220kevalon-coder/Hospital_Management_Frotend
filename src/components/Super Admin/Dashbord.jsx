import React, { useState, useEffect } from 'react';
import Hospital from './Hospital';
import Hospital_Admins from './Hospital_Admins';
import Doctors_Management from './Doctors_Management';
import Nurses from './Nurses';
import Receptionist_Management from './Receptionist';
import Patients_Management from './Patients';

const SuperAdminDashboard = ({
  currentUser,
  setCurrentPage,
  setSelectedHospital,
  setSelectedDoctor,
  setSelectedNurse,
  setSelectedReceptionist,
  setSelectedPatient,
  setSelectedAdmin
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [visibleBranchesCount, setVisibleBranchesCount] = useState(10);
  const [loading, setLoading] = useState(false);

  // Real Backend Data States
  const [hospitals, setHospitals] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [receptionists, setReceptionists] = useState([]);
  const [patients, setPatients] = useState([]);

  // Fetch all live backend data in parallel
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [hospRes, adminRes, docRes, nurRes, recRes, patRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/super-admin/Hospital/').catch(() => null),
        fetch('http://127.0.0.1:8000/api/super-admin/Admins/').catch(() => null),
        fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null),
        fetch('http://127.0.0.1:8000/api/super-admin/Nurses/').catch(() => null),
        fetch('http://127.0.0.1:8000/api/super-admin/Receptionists/').catch(() => null),
        fetch('http://127.0.0.1:8000/api/super-admin/Patients/').catch(() => null)
      ]);

      if (hospRes && hospRes.ok) {
        const hospData = await hospRes.json();
        setHospitals(Array.isArray(hospData) ? hospData : []);
      } else {
        setHospitals([]);
      }

      if (adminRes && adminRes.ok) {
        const adminData = await adminRes.json();
        setAdmins(Array.isArray(adminData) ? adminData : []);
      } else {
        setAdmins([]);
      }

      if (docRes && docRes.ok) {
        const docData = await docRes.json();
        setDoctors(Array.isArray(docData) ? docData : []);
      } else {
        setDoctors([]);
      }

      if (nurRes && nurRes.ok) {
        const nurData = await nurRes.json();
        setNurses(Array.isArray(nurData) ? nurData : []);
      } else {
        setNurses([]);
      }

      if (recRes && recRes.ok) {
        const recData = await recRes.json();
        setReceptionists(Array.isArray(recData) ? recData : []);
      } else {
        setReceptionists([]);
      }

      if (patRes && patRes.ok) {
        const patData = await patRes.json();
        setPatients(Array.isArray(patData) ? patData : []);
      } else {
        setPatients([]);
      }
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

  const pendingPatients = patients.filter((p) => p.status === 'Pending' || p.status === 'Pending Review');
  const admittedPatients = patients.filter((p) => p.status === 'Admitted' || p.status === 'In Consultation');
  const dischargedPatients = patients.filter((p) => p.status === 'Discharged' || p.status === 'Completed');

  const uniqueSpecialties = Array.from(new Set(doctors.map((d) => d.specialization || d.specialty).filter(Boolean)));
  const uniqueCities = Array.from(new Set(hospitals.map((h) => h.city).filter(Boolean)));

  const totalRevenue = patients.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);
  const totalBeds = hospitals.reduce((sum, h) => sum + (Number(h.total_beds) || 0), 0);

  // Dynamic 4 Core Statistics Cards
  const systemStats = [
    {
      id: 'branches',
      title: 'Total Hospital Branches',
      value: `${hospitals.length} Location${hospitals.length === 1 ? '' : 's'}`,
      sub: uniqueCities.length > 0 ? uniqueCities.slice(0, 4).join(', ') + (uniqueCities.length > 4 ? '...' : '') : `${activeHospitals.length} Active Branches`,
      color: 'bg-sky-50 text-sky-800 border-sky-200',
      tab: 'hospitals'
    },
    {
      id: 'doctors',
      title: 'Registered Doctors',
      value: `${doctors.length} Doctor${doctors.length === 1 ? '' : 's'}`,
      sub: `${activeDoctors.length} Active • Across ${uniqueSpecialties.length} Specialization${uniqueSpecialties.length === 1 ? '' : 's'}`,
      color: 'bg-sky-50 text-sky-800 border-sky-200',
      tab: 'doctors'
    },
    {
      id: 'patients',
      title: "Patients & Inflow",
      value: `${patients.length} Patient${patients.length === 1 ? '' : 's'}`,
      sub: `${todayPatients.length} Today • ${admittedPatients.length} Admitted • ${pendingPatients.length} Pending`,
      color: 'bg-sky-50 text-sky-800 border-sky-200',
      tab: 'patients'
    },
    {
      id: 'nurses',
      title: 'Nursing Staff & Wards',
      value: `${nurses.length} Nurse${nurses.length === 1 ? '' : 's'}`,
      sub: `${activeNurses.length} Active on duty across branches`,
      color: 'bg-sky-50 text-sky-800 border-sky-200',
      tab: 'nurses'
    }
  ];

  // Secondary Quick Overview Metrics
  const secondaryStats = [
    {
      title: 'Hospital Admins',
      value: admins.length,
      sub: `${activeAdmins.length} Active Administrators`,
      badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
      tab: 'admins'
    },
    {
      title: 'Front Desk Receptionists',
      value: receptionists.length,
      sub: `${activeReceptionists.length} Active Staff`,
      badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
      tab: 'receptionists'
    },
    {
      title: 'Total Bed Capacity',
      value: totalBeds > 0 ? totalBeds : `${hospitals.length * 50}+ Beds`,
      sub: `${admittedPatients.length} Current Admitted`,
      badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
      tab: 'hospitals'
    },
    {
      title: 'Total Revenue Collected',
      value: `₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${patients.filter((p) => p.payment_status === 'Paid').length} Fully Paid Invoices`,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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

    const branchPatients = patients.filter((p) => {
      const patHospId = Number(typeof p.hospital === 'object' ? p.hospital?.id : p.hospital);
      return patHospId === targetHospId;
    });
    const branchBeds = Number(hosp.total_beds) || 0;

    let occupancyStr = `${branchPatients.length} Patients`;
    if (branchBeds > 0) {
      const occPercent = Math.min(100, Math.round((branchPatients.length / branchBeds) * 100));
      occupancyStr = `${occPercent}% (${branchPatients.length}/${branchBeds} Beds)`;
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

  // Construct Real Live Security & Audit Logs from Backend Records
  const generateLiveAudits = () => {
    const logs = [];

    // Latest Patients
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
        time: 'Super Admin',
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

  const handleBranchClick = (hosp) => {
    if (setSelectedHospital) {
      setSelectedHospital(hosp);
    }
    localStorage.setItem('selectedHospital', JSON.stringify(hosp));
    if (setCurrentPage) {
      setCurrentPage('hospital_details');
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
      {activeTab === 'patients' ? (
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
        /* OVERVIEW DASHBOARD VIEW (ALL REAL BACKEND DATA) */
        <div className="space-y-6">
          {/* TOP 4 CORE METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {systemStats.map((item, idx) => (
              <div
                key={idx}
                onClick={() => item.tab && setActiveTab(item.tab)}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-sky-300 hover:shadow-md transition cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.title}</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${item.color}`}>
                    Super Admin
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-2 group-hover:text-sky-700 transition">
                  {loading ? '...' : item.value}
                </h3>
                <p className="text-xs text-slate-500 mt-1 truncate">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* SECONDARY LIVE METRICS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {secondaryStats.map((item, idx) => (
              <div
                key={idx}
                onClick={() => item.tab && setActiveTab(item.tab)}
                className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-2xs hover:bg-white hover:border-slate-300 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{item.title}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeColor}`}>
                    Live
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-800 mt-1">{loading ? '...' : item.value}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* REAL HOSPITAL BRANCHES TABLE & LIVE SECURITY LOGS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* LEFT 2-COLS: REAL BRANCHES NETWORK TABLE */}
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
                        <th className="py-3 px-3 text-left">Branch Name</th>
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
                            {loading ? 'Loading live hospital data...' : 'No hospital branches registered yet in backend.'}
                          </td>
                        </tr>
                      ) : (
                        dynamicBranches.slice(0, visibleBranchesCount).map((b, i) => (
                          <tr
                            key={i}
                            onClick={() => handleBranchClick(b.raw)}
                            className="hover:bg-slate-50/80 transition cursor-pointer group"
                          >
                            <td className="py-3 px-3 font-semibold text-slate-800 text-left group-hover:text-sky-700">
                              {b.name}
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
                          <span className="font-mono text-[10px] text-slate-600 truncate">{audit.user}</span>
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
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
