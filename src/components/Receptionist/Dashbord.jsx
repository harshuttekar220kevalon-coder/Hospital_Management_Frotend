import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const ReceptionistDashboard = ({ currentUser, setCurrentPage, setSelectedPatient, setSelectedDoctorForPatient }) => {
  const [visibleCount, setVisibleCount] = useState(8);
  const [loading, setLoading] = useState(true);
  const [receptionistInfo, setReceptionistInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [patients, setPatients] = useState([]);
  const [doctorsCount, setDoctorsCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadReceptionistData = async () => {
      try {
        setLoading(true);
        const email = (currentUser?.email || '').toLowerCase().trim();
        const recId = currentUser?.id;

        const [recRes, docRes, patRes, hospListRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/super-admin/Receptionists/`),
          fetch(`${API_BASE_URL}/super-admin/Doctors/`),
          fetch(`${API_BASE_URL}/super-admin/Patients/`),
          fetch(`${API_BASE_URL}/super-admin/Hospital/`)
        ]);

        let currentRec = null;
        if (recRes.status === 'fulfilled' && recRes.value.ok) {
          const recs = await recRes.value.json().catch(() => []);
          if (Array.isArray(recs)) {
            currentRec = recs.find(r => 
              (r.email && r.email.toLowerCase().trim() === email) ||
              (recId && Number(r.id) === Number(recId)) ||
              (r.name && r.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        }

        if (isMounted) {
          setReceptionistInfo(currentRec || currentUser);
        }

        const targetHospId = currentRec?.hospital || currentUser?.hospital;
        if (targetHospId && hospListRes.status === 'fulfilled' && hospListRes.value.ok) {
          const hospList = await hospListRes.value.json().catch(() => []);
          if (Array.isArray(hospList)) {
            const foundHosp = hospList.find(h => Number(h.id) === Number(typeof targetHospId === 'object' ? targetHospId.id : targetHospId));
            if (isMounted) setHospitalInfo(foundHosp);
          }
        }

        if (docRes.status === 'fulfilled' && docRes.value.ok) {
          const docs = await docRes.value.json().catch(() => []);
          if (Array.isArray(docs)) {
            const hospDocs = targetHospId ? docs.filter(d => Number(typeof d.hospital === 'object' ? d.hospital?.id : d.hospital) === Number(targetHospId)) : docs;
            if (isMounted) setDoctorsCount(hospDocs.length);
          }
        }

        if (patRes.status === 'fulfilled' && patRes.value.ok) {
          const allPats = await patRes.json().catch(() => []);
          const hospPats = targetHospId && Array.isArray(allPats)
            ? allPats.filter(p => Number(typeof p.hospital === 'object' ? p.hospital?.id : p.hospital) === Number(targetHospId))
            : (Array.isArray(allPats) ? allPats : []);
          if (isMounted) {
            setPatients(hospPats);
          }
        }
      } catch (err) {
        console.error('Error in ReceptionistDashboard load:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadReceptionistData();
    return () => { isMounted = false; };
  }, [currentUser]);

  const recName = receptionistInfo?.name || currentUser?.name || 'Front Desk Staff';
  const roleTitle = receptionistInfo?.role || currentUser?.role || 'Front Desk Receptionist';
  const shiftName = receptionistInfo?.shift || currentUser?.shift || 'Morning Shift';
  const hospitalName = hospitalInfo?.Name || hospitalInfo?.name || receptionistInfo?.hospital_name || currentUser?.hospital_name || 'Not Provided';

  const unassignedCount = patients.filter(p => !p.doctor || p.doctor === null || p.doctor === '' || !p.doctor_name || !p.bed_number || (p.status || '').toLowerCase().includes('pending')).length;

  const receptionistStats = [
    {
      title: 'Unassigned Patients',
      value: `${unassignedCount} Pending`,
      sub: 'Awaiting Doctor / Bed Triage',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      action: () => setCurrentPage && setCurrentPage('receptionist_anassine')
    },
    {
      title: 'Total Patients',
      value: `${patients.length} Admissions`,
      sub: `In ${hospitalName}`,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      action: () => setCurrentPage && setCurrentPage('receptionist_patients')
    },
    {
      title: 'Doctors On OPD Duty',
      value: `${doctorsCount} Doctors`,
      sub: 'View Availability Schedule',
      color: 'bg-teal-50 text-teal-700 border-teal-200',
      action: () => setCurrentPage && setCurrentPage('receptionist_doctors')
    },
    {
      title: 'Duty Shift',
      value: shiftName,
      sub: receptionistInfo?.desk || 'Main Lobby Desk 1',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      action: () => setCurrentPage && setCurrentPage('receptionist_settings')
    },
  ];

  const handlePatientClick = (patient) => {
    if (setSelectedPatient) {
      setSelectedPatient(patient);
      localStorage.setItem('selectedPatient', JSON.stringify(patient));
    }
    if (setCurrentPage) {
      setCurrentPage('receptionist_patient_details');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* WELCOME BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold border border-amber-400/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Reception & Front Desk • {hospitalName}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Welcome, {recName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Role: {roleTitle} • Shift: {shiftName} • {hospitalName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('receptionist_doctors')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              Doctors & OPD
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('receptionist_patients')}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              + Admit Patient
            </button>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {receptionistStats.map((item, idx) => (
          <div
            key={idx}
            onClick={item.action}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-amber-300 transition duration-150 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.color}`}>
                Front Desk
              </span>
              <span className="text-slate-400 text-xs">➔</span>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3">{item.title}</p>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-0.5">{item.value}</h3>
            <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('receptionist_anassine')}
          className="p-4 rounded-2xl bg-gradient-to-tr from-rose-50 to-red-50 border border-rose-200 text-left hover:border-rose-400 transition cursor-pointer shadow-xs flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <h4 className="text-sm font-bold text-rose-950">Unassigned Queue</h4>
            </div>
            <p className="text-xs text-rose-700 mt-0.5">{unassignedCount} patients awaiting doctor or bed</p>
          </div>
          <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-lg">Queue</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('receptionist_patients')}
          className="p-4 rounded-2xl bg-gradient-to-tr from-amber-50 to-orange-50 border border-amber-200 text-left hover:border-amber-400 transition cursor-pointer shadow-xs flex items-center justify-between"
        >
          <div>
            <h4 className="text-sm font-bold text-amber-900">Patient Admissions</h4>
            <p className="text-xs text-amber-700 mt-0.5">Admit new patient, UHID, book consultation</p>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">Admit</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('receptionist_doctors')}
          className="p-4 rounded-2xl bg-gradient-to-tr from-teal-50 to-emerald-50 border border-teal-200 text-left hover:border-teal-400 transition cursor-pointer shadow-xs flex items-center justify-between"
        >
          <div>
            <h4 className="text-sm font-bold text-teal-900">Doctors & OPD</h4>
            <p className="text-xs text-teal-700 mt-0.5">Check doctors OPD timings & availability</p>
          </div>
          <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2 py-1 rounded-lg">Doctors</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentPage && setCurrentPage('receptionist_settings')}
          className="p-4 rounded-2xl bg-gradient-to-tr from-slate-50 to-blue-50 border border-slate-200 text-left hover:border-blue-400 transition cursor-pointer shadow-xs flex items-center justify-between"
        >
          <div>
            <h4 className="text-sm font-bold text-slate-800">Front Desk Settings</h4>
            <p className="text-xs text-slate-600 mt-0.5">Update duty status, shift & station</p>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">Setup</span>
        </button>
      </div>

      {/* RECENT PATIENTS TABLE */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Recent Patient Registrations ({patients.length})</h2>
            <p className="text-xs text-slate-500">Live reception desk entries for {hospitalName}</p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('receptionist_patients')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
          >
            View All Patient Records ➔
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Token</th>
                <th className="py-3 px-3">Patient Name & UHID</th>
                <th className="py-3 px-3">Bed & Floor</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Doctor Assigned</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading registrations...</td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No patient registrations yet today.</td>
                </tr>
              ) : (
                patients.slice(0, visibleCount).map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-mono font-bold text-amber-700">#{String(i + 1).padStart(2, '0')}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <div>{p.name}</div>
                      <span className="font-mono text-[10px] text-sky-700 font-bold">{p.patient_id || p.uhid || `PAT-${p.id}`}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                        p.bed_number 
                          ? 'bg-teal-50 text-teal-800 border border-teal-200' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {p.bed_number ? `Bed #${p.bed_number}` : 'OPD Consultation'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">{p.contact || p.phone || '-'}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{p.doctor_name || 'Assigned Specialist'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        p.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {p.payment_status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                        {p.status || 'Confirmed'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handlePatientClick(p)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition cursor-pointer"
                      >
                        View File
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {visibleCount < patients.length && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-4">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 6)}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
