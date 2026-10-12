import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const PatientFooter = ({ setCurrentPage, isLoggedIn, currentUser }) => {
  const [hospitals, setHospitals] = useState([]);
  const [activeModal, setActiveModal] = useState(null); // 'privacy' | 'charter' | 'governance' | 'terms' | null

  // Helper to determine if a patient is logged in
  const checkPatientLoggedIn = () => {
    // 1. If explicit props provided
    if (typeof isLoggedIn === 'boolean') {
      if (!isLoggedIn) return false;
      const role = (currentUser?.role || '').toString().toUpperCase();
      // If user is logged in as staff (SUPER ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST), do not treat as patient
      if (
        role.includes('SUPER') ||
        role.includes('ADMIN') ||
        role.includes('DOCTOR') ||
        role.includes('NURSE') ||
        role.includes('RECEPTION')
      ) {
        return false;
      }
      return true;
    }
    // 2. Fallback to localStorage
    try {
      const storedLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (!storedLoggedIn) return false;
      const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const role = (storedUser?.role || '').toString().toUpperCase();
      if (
        role.includes('SUPER') ||
        role.includes('ADMIN') ||
        role.includes('DOCTOR') ||
        role.includes('NURSE') ||
        role.includes('RECEPTION')
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const [patientLoggedIn, setPatientLoggedIn] = useState(checkPatientLoggedIn);

  useEffect(() => {
    setPatientLoggedIn(checkPatientLoggedIn());
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    const handleStorageChange = () => {
      setPatientLoggedIn(checkPatientLoggedIn());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/super-admin/Hospital/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setHospitals(data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleNavClick = (page) => {
    if (setCurrentPage) {
      setCurrentPage(page);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const handleBranchBookingClick = (hospitalId) => {
    if (hospitalId) {
      try {
        sessionStorage.setItem('temp_selected_booking_hospital', String(hospitalId));
      } catch {}
    }
    handleNavClick('appointment');
  };

  const modalContent = {
    privacy: {
      title: 'Privacy Policy & Electronic Health Records Protection',
      subtitle: 'NABH & Healthcare Data Confidentiality Standards',
      content: (
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Our Hospital Healthcare Network strictly protects patient health information (PHI) and clinical diagnostic records in accordance with global EHR standards and government healthcare confidentiality laws.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <h5 className="font-bold text-slate-800">1. Data Collection & Security</h5>
            <p>All blood group profiles, prescriptions, vital metrics, billing transactions, and doctor notes are encrypted end-to-end.</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <h5 className="font-bold text-slate-800">2. Medical Record Access</h5>
            <p>Only authorized clinical staff (assigned doctors, attending nurses, and billing officers) have role-based permissions to view or update your medical journey.</p>
          </div>
        </div>
      )
    },
    charter: {
      title: 'Patient Rights & Responsibilities Charter',
      subtitle: 'Ethical Care & Transparent Medical Treatment',
      content: (
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Every patient admitted or visiting our outpatient departments (OPD) is entitled to respectful, dignified, and expert clinical care.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
              <h5 className="font-bold text-emerald-900">Right to Informed Consent</h5>
              <p className="text-slate-600 mt-0.5">Complete transparency regarding diagnosis, surgery risks, medication, and doctor fees.</p>
            </div>
            <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-200">
              <h5 className="font-bold text-sky-900">Right to Emergency Care</h5>
              <p className="text-slate-600 mt-0.5">Immediate triage and stabilization regardless of billing status during emergency admissions.</p>
            </div>
          </div>
        </div>
      )
    },
    governance: {
      title: 'Clinical Governance & Accreditation Framework',
      subtitle: 'Continuous Quality Assurance and Patient Safety Standards',
      content: (
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Our network upholds stringent clinical governance across all participating hospitals, ICU beds, emergency trauma units, and computerized pharmacies.
          </p>
          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-1">
            <h5 className="font-bold text-amber-900">Multi-Specialty Oversight Committee</h5>
            <p className="text-slate-600">Continuous audit of clinical outcomes, infection control protocols, and duty doctor rotas.</p>
          </div>
        </div>
      )
    },
    terms: {
      title: 'Terms of Healthcare Service & OPD Admissions',
      subtitle: 'Rules & Guidelines for Token Booking and Consultations',
      content: (
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Online appointment tokens must be confirmed at the reception counter 15 minutes prior to doctor consultation slots.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <h5 className="font-bold text-slate-800">Hospital Charges & Billing Settlements</h5>
            <p>Discharge summary slips and formal clinical invoices are issued instantly upon payment settlement at the front desk.</p>
          </div>
        </div>
      )
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${
            patientLoggedIn ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
          } gap-8 lg:gap-8 xl:gap-10 pb-10 border-b border-slate-800`}
        >
          {/* COLUMN 1: HOSPITAL BRAND & ABOUT */}
          <div className="space-y-4">
            <div
              onClick={() => handleNavClick('home')}
              className="flex items-center gap-3 cursor-pointer select-none group"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 via-teal-400 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition duration-200 shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <span className="text-xl font-extrabold bg-gradient-to-r from-white via-teal-200 to-blue-300 bg-clip-text text-transparent block leading-tight">
                  Hospital Network
                </span>
                <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                  Multi-Branch Healthcare Chain
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Integrated healthcare infrastructure connecting hospitals, specialist doctors, emergency trauma centers, and centralized OPD patient services.
            </p>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-amber-300 border border-slate-700/80 shadow-xs">
                EHR Integrated
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-teal-300 border border-slate-700/80 shadow-xs">
                OPD Token Portal
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-blue-300 border border-slate-700/80 shadow-xs">
                24x7 Emergency
              </span>
            </div>
          </div>

          {/* COLUMN 2: QUICK PAGES */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
              Main Pages
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => handleNavClick('home')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-teal-300 transition duration-150 cursor-pointer text-left group border border-slate-800/60 hover:border-slate-700"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition duration-150">&rarr;</span>
                    <span className="font-medium">Home Page</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavClick('about')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-teal-300 transition duration-150 cursor-pointer text-left group border border-slate-800/60 hover:border-slate-700"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition duration-150">&rarr;</span>
                    <span className="font-medium">About Hospital Network</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavClick('appointment')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-teal-300 transition duration-150 cursor-pointer text-left group border border-slate-800/60 hover:border-slate-700"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition duration-150">&rarr;</span>
                    <span className="font-medium">Book OPD Appointment</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavClick('contact')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-teal-300 transition duration-150 cursor-pointer text-left group border border-slate-800/60 hover:border-slate-700"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition duration-150">&rarr;</span>
                    <span className="font-medium">Emergency & Contact Us</span>
                  </span>
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMN 3: PATIENT & STAFF SERVICES (VISIBLE ONLY WHEN PATIENT LOGGED IN) */}
          {patientLoggedIn && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Patient & Staff Services
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavClick('patient_dashboard')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-blue-300 transition duration-150 cursor-pointer text-left group border border-slate-800/60 hover:border-slate-700"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition duration-150">&rarr;</span>
                      <span className="font-medium">Patient Portal Dashboard</span>
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavClick('my_hestory')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-blue-300 transition duration-150 cursor-pointer text-left group border border-slate-800/60 hover:border-slate-700"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition duration-150">&rarr;</span>
                      <span className="font-medium">Medical Journey & History</span>
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavClick('patient_setting')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-blue-300 transition duration-150 cursor-pointer text-left group border border-slate-800/60 hover:border-slate-700"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition duration-150">&rarr;</span>
                      <span className="font-medium">Patient Profile</span>
                    </span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* COLUMN 4: 24/7 HELPLINE & LIVE HOSPITAL BRANCHES */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              Emergency & Branches
            </h4>
            <div className="space-y-2.5 text-xs">
              <div
                onClick={() => handleNavClick('contact')}
                className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-rose-300 block">24x7 Trauma Helpline</span>
                  <span className="text-rose-400 group-hover:translate-x-1 transition duration-200">&rarr;</span>
                </div>
                <a
                  href="tel:108"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-extrabold text-white block mt-0.5 hover:text-rose-200 transition"
                >
                  1800-273-9000 / 108
                </a>
                <span className="text-[10px] text-rose-200/80">Immediate clinical response</span>
              </div>

              <div className="text-slate-400 space-y-1.5">
                <p className="font-semibold text-slate-200 flex items-center justify-between">
                  <span>Hospital Campuses ({hospitals.length}):</span>
                  <button
                    type="button"
                    onClick={() => handleNavClick('home')}
                    className="text-[10px] text-teal-400 hover:underline cursor-pointer font-bold"
                  >
                    View All &rarr;
                  </button>
                </p>
                {hospitals.length > 0 ? (
                  <div className="space-y-1 text-[11px] text-slate-300">
                    {hospitals.slice(0, 4).map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => handleBranchBookingClick(h.id)}
                        className="w-full text-left truncate hover:text-teal-300 transition cursor-pointer flex items-center gap-1.5 py-0.5"
                      >
                        <span className="text-teal-500 text-[10px]">•</span>
                        <span className="truncate">{h.Name || h.name}</span>
                      </button>
                    ))}
                    {hospitals.length > 4 && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('home')}
                        className="text-teal-400 hover:text-teal-300 text-[10px] font-semibold block transition cursor-pointer mt-1"
                      >
                        +{hospitals.length - 4} more campuses available &rarr;
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">Live network campuses from database</p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM COPYRIGHT & COMPLIANCE MODAL TRIGGERS */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Hospital Management System. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px] flex-wrap justify-center sm:justify-end">
            <button
              type="button"
              onClick={() => setActiveModal('privacy')}
              className="hover:text-teal-300 transition cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setActiveModal('charter')}
              className="hover:text-teal-300 transition cursor-pointer"
            >
              Patient Rights Charter
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setActiveModal('governance')}
              className="hover:text-teal-300 transition cursor-pointer"
            >
              Clinical Governance
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setActiveModal('terms')}
              className="hover:text-teal-300 transition cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>

      {/* COMPLIANCE INFORMATION MODAL */}
      {activeModal && modalContent[activeModal] && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 space-y-4 my-auto relative animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {modalContent[activeModal].title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {modalContent[activeModal].subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-1">
              {modalContent[activeModal].content}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Got It, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default PatientFooter;
