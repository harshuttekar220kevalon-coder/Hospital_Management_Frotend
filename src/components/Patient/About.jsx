import React, { useState, useEffect } from 'react';
import PatientNavbar from './PatientNavbar';
import PatientFooter from './PatientFooter';
import { API_BASE_URL } from '../Api/Api';

const PatientAbout = ({ setCurrentPage, isLoggedIn, currentUser }) => {
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadAboutData = async () => {
      setLoading(true);
      try {
        const [hospRes, docRes, admRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/super-admin/Hospital/`),
          fetch(`${API_BASE_URL}/super-admin/Doctors/`),
          fetch(`${API_BASE_URL}/super-admin/Admins/`)
        ]);

        let hospData = [];
        let docData = [];
        let admData = [];

        if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
          hospData = await hospRes.value.json().catch(() => []);
        }
        if (docRes.status === 'fulfilled' && docRes.value.ok) {
          docData = await docRes.value.json().catch(() => []);
        }
        if (admRes.status === 'fulfilled' && admRes.value.ok) {
          admData = await admRes.value.json().catch(() => []);
        }

        if (isMounted) {
          setHospitals(Array.isArray(hospData) ? hospData : []);
          setDoctors(Array.isArray(docData) ? docData : []);
          setAdmins(Array.isArray(admData) ? admData : []);
        }
      } catch (err) {
        console.error('Error loading about page data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAboutData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalBedsCount = hospitals.reduce((acc, h) => {
    const b = Number(h.Beds || h.total_beds || h.beds || 0);
    return acc + (isNaN(b) ? 0 : b);
  }, 0);

  const stats = [
    { label: 'Hospital Campuses', value: loading ? '...' : `${hospitals.length}`, sub: 'Registered in Database' },
    { label: 'Specialist Doctors', value: loading ? '...' : `${doctors.length}`, sub: 'Active Medical Faculty' },
    { label: 'Total Inpatient Beds', value: loading ? '...' : `${totalBedsCount}`, sub: 'All Network Campuses' },
    { label: 'Hospital Administrators', value: loading ? '...' : `${admins.length}`, sub: 'Campus Management' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* PATIENT NAVBAR */}
      <PatientNavbar
        currentPage="about"
        setCurrentPage={setCurrentPage}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
      />

      <main className="flex-1 space-y-12 sm:space-y-16 pb-16">
        {/* HERO SECTION */}
        <section className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <span className="px-3.5 py-1.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-400/30 uppercase tracking-wider">
              Network Healthcare System
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              About Our Multi-Hospital Network
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Our platform unifies all registered hospital branches, clinical specialists, and emergency care services into a centralized healthcare network.
            </p>
          </div>
        </section>

        {/* METRICS ROW (100% REAL FROM DATABASE) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, idx) => (
              <div
                key={idx}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center space-y-1"
              >
                <span className="text-2xl sm:text-3xl font-extrabold text-teal-700 block font-mono">
                  {s.value}
                </span>
                <span className="text-xs font-bold text-slate-900 block">{s.label}</span>
                <span className="text-[11px] text-slate-400 block">{s.sub}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ACTIVE NETWORK CAMPUSES (LIVE DATA FROM BACKEND) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                Backend Network Campuses
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Registered Hospital Campuses
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Real hospital campuses fetched from the database API.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              Total: {hospitals.length} Campuses
            </span>
          </div>

          {loading ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-slate-600">Loading hospital branches from database...</p>
            </div>
          ) : hospitals.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200">
              <p className="text-xs font-bold text-slate-600">
                No hospital branches registered in the backend yet. Add hospitals from Super Admin panel.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hospitals.map((hosp) => {
                const hospDocs = doctors.filter((d) => Number(d.hospital) === Number(hosp.id));
                const hospName = hosp.Name || hosp.name || `Hospital #${hosp.id}`;
                const hospCity = hosp.City || hosp.city || 'Main Branch';
                const hospAddress = hosp.Address || hosp.address || 'Address registered in system';
                const hospBeds = hosp.Beds || hosp.total_beds || hosp.beds || 0;

                return (
                  <div
                    key={hosp.id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200 uppercase">
                          {hospCity}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                          {hospBeds} Beds
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">{hospName}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{hospAddress}</p>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-700">Helpline:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {hosp.Phone || hosp.phone || 'Available at Reception'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-700">Assigned Doctors:</span>
                          <span className="font-bold text-teal-700">{hospDocs.length} Specialists</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.setItem('booking_target_hospital', String(hosp.id));
                        } catch {}
                        setCurrentPage('appoint');
                      }}
                      className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition text-center cursor-pointer"
                    >
                      Book OPD at this Branch
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* CLINICAL HEADS & SPECIALISTS (LIVE DATA FROM BACKEND) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                Medical Faculty
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Registered Doctors & Specialists
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Active specialist doctors fetched from the hospital database.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              Total: {doctors.length} Doctors
            </span>
          </div>

          {loading ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-slate-600">Loading doctors from database...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
              <p className="text-xs font-bold text-slate-600">
                No doctors currently registered in the database. Add doctors from Admin panel.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doc) => {
                const hospObj = hospitals.find((h) => Number(h.id) === Number(doc.hospital));
                const hospName = hospObj ? hospObj.Name || hospObj.name : doc.hospital_name || 'Hospital Branch';

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600 to-blue-700 text-white font-extrabold flex items-center justify-center text-base shadow-sm shrink-0">
                        {doc.name ? doc.name.replace(/^Dr\.\s*/i, '').slice(0, 2).toUpperCase() : 'DR'}
                      </div>
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200 uppercase">
                          {doc.specialization || doc.department || 'General Medicine'}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 leading-snug">
                          {doc.name?.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                        </h4>
                        <p className="text-xs text-teal-700 font-semibold">{hospName}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">Experience:</span>
                        <span className="font-bold text-slate-800">
                          {doc.experience ? `${doc.experience} Years` : 'Consultant'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">OPD Days:</span>
                        <span className="font-bold text-emerald-700">{doc.available_days || 'Mon - Sat'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">Consultation Fee:</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{doc.consultation_fee || doc.fee || 500}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        try {
                          if (doc.hospital) localStorage.setItem('booking_target_hospital', String(doc.hospital));
                          localStorage.setItem('booking_target_doctor', String(doc.id));
                        } catch {}
                        setCurrentPage('appoint');
                      }}
                      className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer text-center"
                    >
                      Book OPD Consultation
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SYSTEM PROTOCOLS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
            <div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                Clinical Standards
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                Centralized Electronic Health Record & OPD Booking
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 text-sm block">Multi-Campus Database</span>
                <p className="leading-relaxed">
                  All registered hospital campuses and attending doctors are synchronized with the central database in real time.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 text-sm block">Live OPD Registration</span>
                <p className="leading-relaxed">
                  Appointments booked through the patient portal are directly added to the hospital receptionist and doctor queues.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 text-sm block">Digital Token Slips</span>
                <p className="leading-relaxed">
                  Patients receive a generated OPD checkup token with exact hospital location details for in-person consultation.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* PATIENT FOOTER */}
      <PatientFooter setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default PatientAbout;
