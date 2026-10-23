import React, { useState, useEffect } from 'react';
import PatientNavbar from '../Patient/PatientNavbar';
import PatientFooter from '../Patient/PatientFooter';
import { API_BASE_URL, formatValue } from '../Api/Api';

const extractArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

const Hospital = ({
  selectedHospital: propSelectedHospital,
  setSelectedHospital,
  setCurrentPage,
  isLoggedIn,
  currentUser,
  onLogout,
}) => {
  const [hospital, setHospital] = useState(propSelectedHospital || null);
  const [admin, setAdmin] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [nursesCount, setNursesCount] = useState(0);
  const [receptionistsCount, setReceptionistsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize or reload hospital data
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Resolve target hospital object / id
        let currentHosp = propSelectedHospital;
        if (!currentHosp) {
          try {
            const saved = localStorage.getItem('selectedHospital');
            if (saved) currentHosp = JSON.parse(saved);
          } catch (e) {}
        }
        const tempId = sessionStorage.getItem('temp_selected_hospital_id');
        const targetId = currentHosp?.id || tempId;

        if (!targetId) {
          if (isMounted) {
            setError('No hospital selected. Please select a hospital branch from the home page.');
            setLoading(false);
          }
          return;
        }

        // 2. Fetch fresh Hospital Details from Backend
        const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/${targetId}/`).catch(() => null);
        let freshHosp = currentHosp;
        if (hospRes && hospRes.ok) {
          freshHosp = await hospRes.json();
          if (isMounted) setHospital(freshHosp);
          try {
            localStorage.setItem('selectedHospital', JSON.stringify(freshHosp));
          } catch (e) {}
        } else if (currentHosp) {
          if (isMounted) setHospital(currentHosp);
        } else {
          if (isMounted) {
            setError('Failed to load hospital details. Please try again.');
            setLoading(false);
          }
          return;
        }

        const hospId = Number(freshHosp?.id || targetId);

        // 3. Fetch Admin assigned to this hospital
        try {
          const adminRes = await fetch(`${API_BASE_URL}/super-admin/Admins/`).catch(() => null);
          if (adminRes && adminRes.ok) {
            const adminData = await adminRes.json();
            const adminsList = extractArray(adminData);
            const matchedAdmin = adminsList.find((a) => {
              const aHospId = typeof a.hospital === 'object' && a.hospital !== null ? a.hospital.id : a.hospital;
              return Number(aHospId) === hospId;
            });
            if (isMounted) setAdmin(matchedAdmin || null);
          }
        } catch (e) {
          console.warn('Error fetching admin:', e);
        }

        // 4. Fetch Doctors assigned strictly to this hospital (Name, Department and Specialization)
        try {
          const docRes = await fetch(`${API_BASE_URL}/super-admin/Doctors/`).catch(() => null);
          if (docRes && docRes.ok) {
            const docData = await docRes.json();
            const allDocs = extractArray(docData);
            const branchDocs = allDocs.filter((d) => {
              if (!d) return false;

              // Check ManyToMany hospitals array (IDs or objects)
              if (Array.isArray(d.hospitals) && d.hospitals.length > 0) {
                const match = d.hospitals.some((h) => {
                  const id = typeof h === 'object' && h !== null ? (h.id || h.hospital_id) : h;
                  return Number(id) === hospId;
                });
                if (match) return true;
              }

              // Check SerializerMethodField hospital_names array ([{ id, name, branch_code }])
              if (Array.isArray(d.hospital_names) && d.hospital_names.length > 0) {
                const match = d.hospital_names.some((h) => Number(h?.id) === hospId);
                if (match) return true;
              }

              // Check single hospital relation (id or object)
              if (d.hospital !== undefined && d.hospital !== null && d.hospital !== '') {
                const dHospId = typeof d.hospital === 'object' && d.hospital !== null ? (d.hospital.id || d.hospital.hospital_id) : d.hospital;
                if (Number(dHospId) === hospId) return true;
              }

              // Check hospital_id field
              if (d.hospital_id !== undefined && d.hospital_id !== null && d.hospital_id !== '') {
                if (Number(d.hospital_id) === hospId) return true;
              }

              return false;
            });
            if (isMounted) setDoctors(branchDocs);
          }
        } catch (e) {
          console.warn('Error fetching doctors:', e);
        }

        // 5. Fetch Nurses (Total count only)
        try {
          const nurseRes = await fetch(`${API_BASE_URL}/super-admin/Nurses/`).catch(() => null);
          if (nurseRes && nurseRes.ok) {
            const nurseData = await nurseRes.json();
            const allNurses = extractArray(nurseData);
            const branchNurses = allNurses.filter((n) => {
              const nHospId = typeof n.hospital === 'object' && n.hospital !== null ? n.hospital.id : n.hospital;
              return Number(nHospId) === hospId;
            });
            if (isMounted) setNursesCount(branchNurses.length);
          }
        } catch (e) {
          console.warn('Error fetching nurses count:', e);
        }

        // 6. Fetch Receptionists (Total count only)
        try {
          const recRes = await fetch(`${API_BASE_URL}/super-admin/Receptionists/`).catch(() => null);
          if (recRes && recRes.ok) {
            const recData = await recRes.json();
            const allRecs = extractArray(recData);
            const branchRecs = allRecs.filter((r) => {
              const rHospId = typeof r.hospital === 'object' && r.hospital !== null ? r.hospital.id : r.hospital;
              return Number(rHospId) === hospId;
            });
            if (isMounted) setReceptionistsCount(branchRecs.length);
          }
        } catch (e) {
          console.warn('Error fetching receptionists count:', e);
        }
      } catch (err) {
        console.error('Hospital detail load error:', err);
        if (isMounted) setError('An unexpected error occurred while loading hospital branch data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [propSelectedHospital]);

  // Navigate to booking with this hospital preselected
  const handleBookAppointment = (doctorId = null) => {
    if (hospital?.id) {
      try {
        sessionStorage.setItem('temp_selected_booking_hospital', String(hospital.id));
        if (doctorId) {
          sessionStorage.setItem('temp_selected_booking_doctor', String(doctorId));
        }
      } catch (e) {}
    }
    if (setCurrentPage) {
      setCurrentPage('appointment');
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const handleBackToHospitals = () => {
    if (setCurrentPage) {
      setCurrentPage('home');
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  // Parse Departments list (strictly backend, no static fallbacks)
  const getDepartmentsList = () => {
    const raw = hospital?.Department || hospital?.department || hospital?.departments || '';
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string' && raw.trim()) {
      return raw
        .split(/[,;\n]+/)
        .map((d) => d.trim())
        .filter(Boolean);
    }
    return [];
  };

  // Field values with strict backend binding and '-' fallback for empty data
  const hospitalName = formatValue(hospital?.Name || hospital?.name);
  const hospitalAddress = formatValue(hospital?.Address || hospital?.address);
  const hospitalCity = formatValue(hospital?.City || hospital?.city);
  const hospitalPhone = formatValue(hospital?.Phone || hospital?.phone || hospital?.contact);
  const hospitalEmail = formatValue(hospital?.email || hospital?.Email);
  const totalBeds = formatValue(hospital?.Beds ?? hospital?.beds ?? hospital?.total_beds);
  const adminName = formatValue(admin?.name || admin?.username);
  const adminEmail = formatValue(admin?.email);
  const adminPhone = formatValue(admin?.phone);
  const departmentsList = getDepartmentsList();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased w-full overflow-x-hidden">
      {/* NAVBAR */}
      <PatientNavbar
        currentPage="hospital"
        setCurrentPage={setCurrentPage}
        isLoggedIn={isLoggedIn}
        onLogout={onLogout}
        currentUser={currentUser}
      />

      <main className="flex-1 pb-16 w-full">
        {/* HERO / BREADCRUMB HEADER */}
        <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white py-10 sm:py-14 px-4 sm:px-8 lg:px-12 xl:px-16 border-b border-teal-900/40 w-full">
          <div className="w-full space-y-5">
            {/* Breadcrumb Navigation & Back Button */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-300">
                <button
                  type="button"
                  onClick={handleBackToHospitals}
                  className="hover:text-teal-300 transition flex items-center gap-1 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Home</span>
                </button>
                <span>/</span>
                <button
                  type="button"
                  onClick={handleBackToHospitals}
                  className="hover:text-teal-300 transition cursor-pointer"
                >
                  Hospital Branches
                </button>
                <span>/</span>
                <span className="text-teal-300 font-bold truncate max-w-[200px] sm:max-w-none">
                  {hospitalName}
                </span>
              </nav>

              <button
                type="button"
                onClick={handleBackToHospitals}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Hospitals</span>
              </button>
            </div>

            {/* Hospital Title and Badges */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-400/30 uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                    {hospitalCity} Campus Branch
                  </span>
                  {hospital?.Branch_Code && (
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-bold border border-blue-400/30">
                      Code: {hospital.Branch_Code}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                    Active & Operational
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {hospitalName}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 flex items-start gap-2 max-w-3xl leading-relaxed">
                  <svg className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{hospitalAddress}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleBookAppointment()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-teal-500/25 transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Book Appointment Here</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* LOADING & ERROR STATES */}
        {loading ? (
          <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-20 text-center">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-base font-bold text-slate-800">Loading Hospital Branch Details...</h2>
            <p className="text-xs text-slate-500 mt-1">Retrieving staff counts, doctors directory, and campus facility records</p>
          </div>
        ) : error ? (
          <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{error}</h2>
            <button
              type="button"
              onClick={handleBackToHospitals}
              className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition"
            >
              Return to Hospitals Directory
            </button>
          </div>
        ) : (
          <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-8 space-y-8">
            {/* 1. KEY METRICS & STAFF SUMMARY CARDS (Top Section: Beds, Admin, Total Registered Staff, Nurse Total, Receptionist Total) */}
            <section aria-label="Key Hospital Metrics" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Total Beds */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4 hover:border-teal-300 transition">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Beds</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">{totalBeds}</div>
                  <div className="text-[11px] text-teal-700 font-semibold mt-0.5">Inpatient Capacity</div>
                </div>
              </div>

              {/* Admin Name with Clickable Email */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4 hover:border-indigo-300 transition">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin Name</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5 truncate" title={adminName}>
                    {adminName}
                  </div>
                  {adminEmail !== '-' ? (
                    <a
                      href={`mailto:${adminEmail}`}
                      className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold mt-0.5 truncate inline-flex items-center gap-1 hover:underline cursor-pointer"
                      title={`Send email to ${adminEmail}`}
                    >
                      <svg className="w-3 h-3 shrink-0 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{adminEmail}</span>
                    </a>
                  ) : (
                    <div className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
                      -
                    </div>
                  )}
                </div>
              </div>

              {/* Total Registered Staff (Repositioned to Top Section) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4 hover:border-teal-400 transition">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Registered Staff</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    {doctors.length + nursesCount + receptionistsCount}
                  </div>
                  <div className="text-[11px] text-teal-700 font-semibold mt-0.5 truncate">
                    {doctors.length} Doctors · {nursesCount} Nurses · {receptionistsCount} Recs
                  </div>
                </div>
              </div>

              {/* Nurse Total */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4 hover:border-emerald-300 transition">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nurse Total</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">{nursesCount}</div>
                  <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">Nursing Staff on Duty</div>
                </div>
              </div>

              {/* Receptionist Total */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4 hover:border-amber-300 transition">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receptionist Total</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">{receptionistsCount}</div>
                  <div className="text-[11px] text-amber-700 font-semibold mt-0.5">Front Desk Staff</div>
                </div>
              </div>
            </section>

            {/* 2. CAMPUS DETAILS, PHONE NUMBERS & LOCATION CARD */}
            <section aria-labelledby="branch-info-heading" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 id="branch-info-heading" className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Hospital Campus & Contact Details</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete address, helpline phone numbers, and administrative oversight
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Address & Location */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Hospital Address</span>
                    </div>
                    <div className="text-sm font-bold text-slate-800 leading-relaxed">
                      {hospitalAddress}
                    </div>
                    <div className="text-xs text-slate-500">
                      City: <strong className="text-slate-700">{hospitalCity}</strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Admin Oversight</span>
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      {adminName}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <span>Email:</span>
                      {adminEmail !== '-' ? (
                        <a
                          href={`mailto:${adminEmail}`}
                          className="font-bold text-teal-700 hover:text-teal-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          title={`Send email to ${adminEmail}`}
                        >
                          <svg className="w-3.5 h-3.5 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{adminEmail}</span>
                        </a>
                      ) : (
                        <strong className="text-slate-700">-</strong>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      Direct Phone: <strong className="text-slate-700">{adminPhone}</strong>
                    </div>
                  </div>
                </div>

                {/* Right Column: Phone numbers & Operating Status */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>Phone Numbers & Helpdesks</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-xs">
                      <span className="text-slate-600 font-medium">Main Helpline:</span>
                      <span className="font-mono font-bold text-slate-900">{hospitalPhone}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-xs">
                      <span className="text-slate-600 font-medium">Hospital Email:</span>
                      {hospitalEmail !== '-' ? (
                        <a
                          href={`mailto:${hospitalEmail}`}
                          className="font-mono font-bold text-teal-700 hover:text-teal-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          title={`Send email to ${hospitalEmail}`}
                        >
                          <svg className="w-3.5 h-3.5 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{hospitalEmail}</span>
                        </a>
                      ) : (
                        <span className="font-mono font-bold text-slate-700">-</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-xs">
                      <span className="text-slate-600 font-medium">Emergency Desk:</span>
                      <span className="font-mono font-bold text-rose-600">24x7 Emergency Line</span>
                    </div>

                    <div className="flex items-center justify-between py-1 text-xs">
                      <span className="text-slate-600 font-medium">Reception & Appointments:</span>
                      <span className="font-mono font-bold text-teal-700">{hospitalPhone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. DEPARTMENTS SECTION */}
            <section aria-labelledby="departments-heading" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 id="departments-heading" className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Departments & Specialty Units</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Clinical departments and inpatient units operational at this campus
                  </p>
                </div>
                {departmentsList.length > 0 ? (
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 self-start sm:self-auto">
                    {departmentsList.length} Departments
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-500 self-start sm:self-auto">-</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5 pt-2">
                {departmentsList.length > 0 ? (
                  departmentsList.map((dept, idx) => (
                    <div
                      key={`${dept}-${idx}`}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-xs font-bold transition shadow-2xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                      <span>{dept}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm font-bold text-slate-500 py-1">-</div>
                )}
              </div>
            </section>

            {/* 4. DOCTORS DIRECTORY (Strict Field: Doctor Name & Specialization) */}
            <section aria-labelledby="doctors-heading" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 id="doctors-heading" className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Doctor Name & Specialization</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Medical specialists and consultants practicing at {hospitalName}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200 self-start sm:self-auto">
                  {doctors.length} Doctors Available
                </span>
              </div>

              {doctors.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xs font-bold text-slate-700">No Doctors Currently Listed for this Branch</h3>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Doctors are being scheduled for this hospital campus.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {doctors.map((doc) => {
                    const rawName = formatValue(doc.name);
                    const docName = rawName !== '-' && !rawName.toLowerCase().startsWith('dr.') ? `Dr. ${rawName}` : rawName;
                    const docDept = formatValue(doc.department);
                    const docSpec = formatValue(doc.specialization);

                    return (
                      <div
                        key={doc.id || doc.doctor_id || Math.random()}
                        className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-teal-400 hover:shadow-md transition duration-200 space-y-3.5 flex flex-col justify-between"
                      >
                        {/* Doctor Avatar & Name */}
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {docName && docName !== '-'
                              ? (docName.startsWith('Dr.') ? docName.slice(3).trim() : docName)
                                  .split(' ')
                                  .map((n) => n[0])
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase() || 'DR'
                              : 'DR'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Doctor Name
                            </div>
                            <h3 className="text-sm font-extrabold text-slate-900 leading-snug truncate" title={docName}>
                              {docName}
                            </h3>
                          </div>
                        </div>

                        {/* Strict Fields: Department & Specialization Only */}
                        <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 font-medium">Department:</span>
                            <span className="font-bold text-slate-800 text-right truncate">
                              {docDept}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 font-medium">Specialization:</span>
                            {docSpec && docSpec !== '-' ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-800 font-bold border border-teal-200 text-right truncate">
                                {docSpec}
                              </span>
                            ) : (
                              <span className="font-bold text-slate-800 text-right">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 5. FOOTER CALL TO ACTION */}
            <section className="rounded-3xl bg-gradient-to-r from-teal-700 to-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
              <div className="space-y-1.5 text-center md:text-left">
                <h3 className="text-xl font-extrabold text-white">
                  Schedule your consultation at {hospitalName}
                </h3>
                <p className="text-xs sm:text-sm text-teal-100 max-w-xl">
                  Choose from our verified specialists or speak directly with our hospital reception helpdesk at {hospitalPhone}.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleBookAppointment()}
                  className="px-6 py-3 rounded-xl bg-white hover:bg-teal-50 text-teal-900 font-extrabold text-xs sm:text-sm shadow-md transition cursor-pointer"
                >
                  Book Appointment Now
                </button>
                <button
                  type="button"
                  onClick={handleBackToHospitals}
                  className="px-4 py-3 rounded-xl bg-teal-800/80 hover:bg-teal-800 text-white font-bold text-xs border border-teal-600/40 transition cursor-pointer"
                >
                  All Hospitals
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <PatientFooter setCurrentPage={setCurrentPage} isLoggedIn={isLoggedIn} currentUser={currentUser} />
    </div>
  );
};

export default Hospital;
