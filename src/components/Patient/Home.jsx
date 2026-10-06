import React, { useState, useEffect } from 'react';
import PatientNavbar from './PatientNavbar';
import PatientFooter from './PatientFooter';
import { API_BASE_URL } from '../Api/Api';

const PatientHome = ({ setCurrentPage, isLoggedIn, currentUser, onLogout }) => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadHospitals = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
        let hospData = [];
        if (response && response.ok) {
          hospData = await response.json().catch(() => []);
        }
        if (isMounted) {
          setHospitals(Array.isArray(hospData) ? hospData : []);
        }
      } catch (err) {
        console.error('Error loading hospital branches:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHospitals();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter hospitals by search query (name, city, address)
  const filteredHospitals = hospitals.filter((h) => {
    const name = (h.Name || h.name || '').toLowerCase();
    const city = (h.City || h.city || '').toLowerCase();
    const address = (h.Address || h.address || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return name.includes(query) || city.includes(query) || address.includes(query);
  });

  const handleBookAtBranch = () => {
    if (setCurrentPage) {
      setCurrentPage('appoint');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* NAVBAR */}
      <PatientNavbar
        currentPage="home"
        setCurrentPage={setCurrentPage}
        isLoggedIn={isLoggedIn}
        onLogout={onLogout}
        currentUser={currentUser}
      />

      <main className="flex-1 space-y-10 sm:space-y-12 pb-16">
        {/* HERO / HEADER SECTION */}
        <section className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-400/30 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              Multi-Branch Hospital Network
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Hospital Branches & Medical Campuses
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Explore all registered hospital branches, locations, bed capacities, emergency contact numbers, and schedule your appointment.
            </p>

            {/* SEARCH BAR */}
            <div className="max-w-xl mx-auto pt-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search hospital branch by name, city, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md text-white text-xs sm:text-sm border border-white/20 placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:bg-slate-900/90 transition shadow-lg"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* HOSPITAL BRANCHES LIST & DETAILS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                All Hospital Branches
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete details and contact information for each hospital branch campus
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                Total Branches: {filteredHospitals.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
              <div className="w-9 h-9 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-slate-700">Loading hospital branches from database...</p>
              <p className="text-[11px] text-slate-400 mt-1">Fetching campus details</p>
            </div>
          ) : filteredHospitals.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Hospital Branches Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery
                  ? `No hospital branch matches the search term "${searchQuery}".`
                  : 'No hospital branches are currently registered in the database.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition cursor-pointer"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHospitals.map((hosp) => {
                const hospName = hosp.Name || hosp.name || `Hospital Branch #${hosp.id}`;
                const hospCity = hosp.City || hosp.city || 'Main Campus';
                const hospAddress = hosp.Address || hosp.address || 'Address registered in system';
                const hospPhone = hosp.Phone || hosp.phone || hosp.contact || 'Available at Reception';
                const hospBeds = hosp.Beds || hosp.total_beds || hosp.beds || 0;
                const hospEmail = hosp.Email || hosp.email || '';

                return (
                  <div
                    key={hosp.id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-lg hover:border-teal-400 transition-all duration-200 flex flex-col justify-between space-y-5 group"
                  >
                    <div className="space-y-4">
                      {/* TOP BADGES */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[11px] font-bold border border-teal-200 uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                          {hospCity} Campus
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                          {hospBeds} Inpatient Beds
                        </span>
                      </div>

                      {/* BRANCH NAME & ADDRESS */}
                      <div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 group-hover:text-teal-700 transition leading-snug">
                          {hospName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1.5 flex items-start gap-1.5 leading-relaxed">
                          <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{hospAddress}</span>
                        </p>
                      </div>

                      {/* BRANCH DETAILS CARD */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-2.5 text-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Helpline / Phone:
                          </span>
                          <span className="font-mono font-bold text-slate-900">{hospPhone}</span>
                        </div>

                        {hospEmail && (
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Email Contact:
                            </span>
                            <span className="font-semibold text-slate-800 truncate max-w-[170px]">{hospEmail}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Emergency Desk:
                          </span>
                          <span className="font-bold text-rose-600">24x7 Available</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            OPD Consultations:
                          </span>
                          <span className="font-bold text-emerald-700">Mon - Sat (Regular)</span>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTON */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleBookAtBranch(hosp.id)}
                        className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition duration-200 text-center cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Book Appointment at this Branch</span>
                        <span>&rarr;</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <PatientFooter setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default PatientHome;
