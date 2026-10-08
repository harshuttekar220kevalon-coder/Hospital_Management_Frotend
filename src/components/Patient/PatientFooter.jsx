import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const PatientFooter = ({ setCurrentPage }) => {
  const [hospitals, setHospitals] = useState([]);

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

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          
          {/* COLUMN 1: HOSPITAL BRAND & ABOUT */}
          <div className="lg:col-span-2 space-y-4">
            <div
              onClick={() => handleNavClick('home')}
              className="flex items-center gap-3 cursor-pointer select-none group"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 via-teal-400 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <span className="text-xl font-extrabold bg-gradient-to-r from-white via-teal-200 to-blue-300 bg-clip-text text-transparent">
                  Hospital Healthcare Network
                </span>
                <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                  Multi-Branch Tertiary Healthcare Chain
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Integrated hospital network connecting multiple hospital campuses, accredited specialist doctors, emergency trauma centers, and centralized OPD patient services.
            </p>

            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-amber-300 border border-slate-700">
                EHR Integrated
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-teal-300 border border-slate-700">
                OPD Token Portal
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-blue-300 border border-slate-700">
                24x7 Emergency Desk
              </span>
            </div>
          </div>

          {/* COLUMN 2: QUICK NAVIGATION */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => handleNavClick('home')}
                  className="hover:text-teal-300 transition cursor-pointer text-left"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavClick('about')}
                  className="hover:text-teal-300 transition cursor-pointer text-left"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavClick('appointment')}
                  className="hover:text-teal-300 transition cursor-pointer text-left"
                >
                  Book Appointment
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNavClick('contact')}
                  className="hover:text-teal-300 transition cursor-pointer text-left"
                >
                  Contact & Emergency
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMN 4: 24/7 HELPLINE & LIVE HOSPITAL BRANCHES */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hospital Campuses</h4>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] uppercase font-bold text-rose-300 block">Emergency Helpline</span>
                <span className="text-sm font-extrabold text-white block mt-0.5">
                  1800-273-9000 / 108
                </span>
                <span className="text-[10px] text-rose-200/80">Connecting to nearest hospital branch</span>
              </div>

              <div className="text-slate-400 space-y-1">
                <p className="font-semibold text-slate-200">Registered Campuses ({hospitals.length}):</p>
                {hospitals.length > 0 ? (
                  <div className="space-y-0.5 text-[11px] text-slate-300">
                    {hospitals.slice(0, 5).map((h) => (
                      <p key={h.id} className="truncate">
                        • {h.Name || h.name}
                      </p>
                    ))}
                    {hospitals.length > 5 && (
                      <p className="text-teal-400 text-[10px] font-semibold">
                        +{hospitals.length - 5} more campuses
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">Live network campuses from database</p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM COPYRIGHT & COMPLIANCE */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Hospital Management System. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hover:text-slate-400 transition cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-400 transition cursor-pointer">Patient Rights Charter</span>
            <span>•</span>
            <span className="hover:text-slate-400 transition cursor-pointer">Clinical Governance</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PatientFooter;
