import React, { useState, useEffect } from 'react';
import PatientNavbar from './PatientNavbar';
import PatientFooter from './PatientFooter';
import { API_BASE_URL } from '../Api/Api';

const PatientHome = ({ setCurrentPage, isLoggedIn, currentUser }) => {
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [hospRes, docRes, patRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/super-admin/Hospital/`),
          fetch(`${API_BASE_URL}/super-admin/Doctors/`),
          fetch(`${API_BASE_URL}/super-admin/Patients/`)
        ]);

        let hospData = [];
        let docData = [];
        let patData = [];

        if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
          hospData = await hospRes.value.json().catch(() => []);
        }
        if (docRes.status === 'fulfilled' && docRes.value.ok) {
          docData = await docRes.value.json().catch(() => []);
        }
        if (patRes.status === 'fulfilled' && patRes.value.ok) {
          patData = await patRes.value.json().catch(() => []);
        }

        if (isMounted) {
          setHospitals(Array.isArray(hospData) ? hospData : []);
          setDoctors(Array.isArray(docData) ? docData : []);
          setPatients(Array.isArray(patData) ? patData : []);
        }
      } catch (err) {
        console.error('Error loading patient home data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Derive unique specialties dynamically from backend doctors
  const dynamicSpecialties = Array.from(
    new Set(
      doctors
        .map((d) => d.specialization || d.department)
        .filter((s) => s && typeof s === 'string' && s.trim().length > 0)
    )
  );

  // Helper to get hospital name by id
  const getHospitalName = (hospId) => {
    if (!hospId) return 'Hospital Campus';
    const h = hospitals.find((item) => Number(item.id) === Number(hospId));
    return h ? h.Name || h.name : 'Hospital Branch';
  };

  // Filter hospitals based on search or branch
  const filteredHospitals = hospitals.filter((h) => {
    const name = (h.Name || h.name || '').toLowerCase();
    const city = (h.City || h.city || h.Address || h.address || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesQuery = name.includes(query) || city.includes(query);
    const matchesBranch = selectedBranchFilter === 'ALL' || Number(h.id) === Number(selectedBranchFilter);
    return matchesQuery && matchesBranch;
  });

  // Filter doctors based on branch and specialty
  const filteredDoctors = doctors.filter((doc) => {
    const matchesBranch = selectedBranchFilter === 'ALL' || Number(doc.hospital) === Number(selectedBranchFilter);
    const docSpec = (doc.specialization || doc.department || '').toLowerCase();
    const matchesSpecialty =
      selectedSpecialtyFilter === 'ALL' || docSpec.includes(selectedSpecialtyFilter.toLowerCase());
    const docName = (doc.name || '').toLowerCase();
    const matchesQuery =
      !searchQuery ||
      docName.includes(searchQuery.toLowerCase()) ||
      docSpec.includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSpecialty && matchesQuery;
  });

  const handleBookAtBranch = (hospitalId) => {
    try {
      localStorage.setItem('booking_target_hospital', String(hospitalId));
    } catch {}
    setCurrentPage('appoint');
  };

  const handleBookDoctor = (hospitalId, docId) => {
    try {
      if (hospitalId) localStorage.setItem('booking_target_hospital', String(hospitalId));
      if (docId) localStorage.setItem('booking_target_doctor', String(docId));
    } catch {}
    setCurrentPage('appoint');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* PATIENT NAVBAR */}
      <PatientNavbar
        currentPage="home"
        setCurrentPage={setCurrentPage}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
      />

      <main className="flex-1 space-y-12 sm:space-y-16 pb-16">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-400/30 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                Multi-Hospital Network & OPD Consultation Portal
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                Select Your Hospital Branch & Schedule OPD Checkup
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                Choose from registered hospital campuses in the system database. Consult specialist doctors, receive OPD tokens, and visit the hospital branch for in-person medical care.
              </p>

              {/* LIVE BRANCH SELECTOR / SEARCH BAR */}
              <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <select
                      value={selectedBranchFilter}
                      onChange={(e) => setSelectedBranchFilter(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 text-white text-xs font-semibold border border-slate-700 focus:outline-none focus:border-teal-400 cursor-pointer"
                    >
                      <option value="ALL">All Hospital Campuses ({hospitals.length})</option>
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.Name || h.name} {h.City || h.city ? `(${h.City || h.city})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      placeholder="Search doctor, hospital, or department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 text-white text-xs border border-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage('appoint')}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs text-center transition cursor-pointer shadow-md"
                  >
                    Book In-Person OPD Checkup Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('contact')}
                    className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
                  >
                    Hospital Helplines
                  </button>
                </div>
              </div>

              {/* LIVE NETWORK STATS */}
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-2xl font-extrabold text-teal-300 block font-mono">
                    {loading ? '...' : hospitals.length}
                  </span>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    Active Campuses
                  </span>
                </div>
                <div>
                  <span className="text-2xl font-extrabold text-blue-300 block font-mono">
                    {loading ? '...' : doctors.length}
                  </span>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    Specialist Doctors
                  </span>
                </div>
                <div>
                  <span className="text-2xl font-extrabold text-indigo-300 block font-mono">
                    {loading ? '...' : patients.length}
                  </span>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    Registered Patients
                  </span>
                </div>
              </div>
            </div>

            {/* HERO SIDE PANEL */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700 shadow-xl space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span className="font-bold text-teal-400 uppercase tracking-wider text-[11px]">
                    How OPD Booking Works
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px]">
                    4 Simple Steps
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <p className="font-bold text-white">Select Hospital Branch</p>
                      <p className="text-slate-400 text-[11px]">Choose the campus closest to you.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <p className="font-bold text-white">Choose Department & Doctor</p>
                      <p className="text-slate-400 text-[11px]">View doctor qualifications and consultation fees.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <p className="font-bold text-white">Pick OPD Slot & Enter Patient Details</p>
                      <p className="text-slate-400 text-[11px]">Select date, time, and describe health symptoms.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      4
                    </span>
                    <div>
                      <p className="font-bold text-white">Generate Real Hospital OPD Token</p>
                      <p className="text-slate-400 text-[11px]">Print token slip and visit the hospital directly.</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage('appoint')}
                  className="w-full py-2.5 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition cursor-pointer text-center block mt-2"
                >
                  Start OPD Registration
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* HOSPITAL BRANCHES DIRECTORY (FROM BACKEND) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                Hospital Network Campuses
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Choose a Hospital Branch
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Explore hospital locations, beds, emergency helplines, and book checkup consultations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">
                Total Campuses: {filteredHospitals.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-slate-600">Loading hospital branches from database...</p>
            </div>
          ) : filteredHospitals.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <p className="text-sm font-bold text-slate-700">No hospital branches found in the database.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedBranchFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHospitals.map((hosp) => {
                const hospDocs = doctors.filter((d) => Number(d.hospital) === Number(hosp.id));
                const hospName = hosp.Name || hosp.name || `Hospital #${hosp.id}`;
                const hospCity = hosp.City || hosp.city || 'Main Branch';
                const hospAddress = hosp.Address || hosp.address || 'Address registered in system';
                const hospPhone = hosp.Phone || hosp.phone || 'Available at Reception';
                const hospBeds = hosp.Beds || hosp.total_beds || hosp.beds || 0;

                return (
                  <div
                    key={hosp.id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md hover:border-teal-300 transition duration-200 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200 uppercase">
                          {hospCity} Campus
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                          {hospBeds} Beds
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-snug">{hospName}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{hospAddress}</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5 text-slate-600">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-700">OPD Helpline:</span>
                          <span className="font-mono font-bold text-slate-900">{hospPhone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-700">Doctors on Duty:</span>
                          <span className="font-bold text-teal-700">{hospDocs.length} Specialists</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-700">Emergency Desk:</span>
                          <span className="font-bold text-rose-600">24x7 Available</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleBookAtBranch(hosp.id)}
                        className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition text-center cursor-pointer"
                      >
                        Book OPD Here
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBranchFilter(String(hosp.id));
                          window.scrollTo({ top: 800, behavior: 'smooth' });
                        }}
                        className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                        title="View Doctors at this branch"
                      >
                        Doctors ({hospDocs.length})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SPECIALIST DOCTORS DIRECTORY (FROM BACKEND) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                Medical Faculty
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Network Doctors & Specialists
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Consult certified doctors across departments and book appointments at your chosen hospital branch.
              </p>
            </div>

            {/* SPECIALTY FILTER PILLS */}
            {dynamicSpecialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSpecialtyFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    selectedSpecialtyFilter === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All Specialties
                </button>
                {dynamicSpecialties.slice(0, 5).map((spec, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSpecialtyFilter(spec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      selectedSpecialtyFilter.toLowerCase() === spec.toLowerCase()
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-slate-600">Loading specialist doctors from database...</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <p className="text-sm font-bold text-slate-700">No doctors found matching the selected criteria.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedBranchFilter('ALL');
                  setSelectedSpecialtyFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold"
              >
                Show All Doctors
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredDoctors.map((doc) => {
                const docHospName = doc.hospital_name || getHospitalName(doc.hospital);
                const docFee = doc.consultation_fee || doc.fee || 500;
                const docCabin = doc.cabin_number || doc.cabin || 'OPD Room';
                const docExp = doc.experience ? `${doc.experience} Years Exp` : 'Consultant';

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-teal-300 transition duration-200 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200 uppercase">
                          {doc.specialization || doc.department || 'Specialist'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">{docExp}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-blue-700 text-white font-extrabold flex items-center justify-center text-sm shadow-sm shrink-0">
                          {doc.name ? doc.name.replace(/^Dr\.\s*/i, '').slice(0, 2).toUpperCase() : 'DR'}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {doc.name?.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                          </h4>
                          <p className="text-[11px] text-teal-700 font-semibold mt-0.5">{docHospName}</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-500">Consultation Fee:</span>
                          <span className="font-bold text-slate-900 font-mono">₹{docFee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-500">Location:</span>
                          <span className="font-semibold text-slate-700">{docCabin}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-500">OPD Days:</span>
                          <span className="font-bold text-emerald-700">{doc.available_days || 'Mon - Sat'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBookDoctor(doc.hospital, doc.id)}
                      className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer text-center"
                    >
                      Book OPD Slot
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* CALL TO ACTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-12 shadow-lg border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-400/30 uppercase tracking-wider">
                Instant OPD Booking
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Schedule Your In-Person Hospital Consultation
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Choose any registered hospital branch, select your specialist doctor, and confirm your OPD token.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentPage('appoint')}
                className="px-6 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs shadow-md transition cursor-pointer"
              >
                Schedule Appointment Now
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage('contact')}
                className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
              >
                View Hospital Helplines
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* PATIENT FOOTER */}
      <PatientFooter setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default PatientHome;
