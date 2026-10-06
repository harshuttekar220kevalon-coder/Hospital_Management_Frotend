import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const NurseDashboard = ({ currentUser, setCurrentPage }) => {
  const [visibleCount, setVisibleCount] = useState(8);
  const [loading, setLoading] = useState(true);
  const [nurseInfo, setNurseInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [nursesList, setNursesList] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [updatingPatientId, setUpdatingPatientId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadNurseData = async () => {
      try {
        setLoading(true);
        const email = (currentUser?.email || '').toLowerCase().trim();
        const nurseId = currentUser?.id;

        const nurseRes = await fetch(`${API_BASE_URL}/super-admin/Nurses/`).catch(() => null);
        let currentNurse = null;
        let allNurses = [];
        if (nurseRes && nurseRes.ok) {
          allNurses = await nurseRes.json();
          if (Array.isArray(allNurses)) {
            setNursesList(allNurses);
            currentNurse = allNurses.find(n => 
              (n.email && n.email.toLowerCase().trim() === email) ||
              (nurseId && Number(n.id) === Number(nurseId)) ||
              (n.name && n.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        }

        if (isMounted) {
          setNurseInfo(currentNurse || currentUser);
        }

        const targetHospId = typeof currentNurse?.hospital === 'object' ? currentNurse?.hospital?.id : (currentNurse?.hospital || currentUser?.hospital);
        
        // Fetch all hospitals to match by ID
        const hospListRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
        let matchedHospital = null;
        if (hospListRes && hospListRes.ok) {
          const hospitals = await hospListRes.json();
          if (Array.isArray(hospitals)) {
            matchedHospital = hospitals.find(h => 
              (targetHospId && Number(h.id) === Number(targetHospId)) ||
              (currentNurse?.hospital_name && h.Name && h.Name.toLowerCase() === currentNurse.hospital_name.toLowerCase()) ||
              (typeof currentNurse?.hospital === 'string' && h.Name && h.Name.toLowerCase() === currentNurse.hospital.toLowerCase())
            );
          }
        }

        if (!matchedHospital && targetHospId) {
          const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/${targetHospId}/`).catch(() => null);
          if (hospRes && hospRes.ok) {
            matchedHospital = await hospRes.json();
          }
        }

        if (isMounted && matchedHospital) {
          setHospitalInfo(matchedHospital);
        }

        const patRes = await fetch(`${API_BASE_URL}/super-admin/Patients/`).catch(() => null);
        if (patRes && patRes.ok) {
          const allPats = await patRes.json();
          const hospPats = targetHospId 
            ? allPats.filter(p => Number(typeof p.hospital === 'object' ? p.hospital?.id : p.hospital) === Number(targetHospId)) 
            : allPats;
          if (isMounted) {
            setAllPatients(hospPats);
          }
        }
      } catch (err) {
        console.error('Error in NurseDashboard load:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadNurseData();
    return () => { isMounted = false; };
  }, [currentUser]);

  const activeNurse = nurseInfo || currentUser;
  const nurseName = activeNurse?.name || currentUser?.name || 'Nurse';
  const roleName = activeNurse?.nurse_role || activeNurse?.role || currentUser?.nurse_role || currentUser?.role || 'Staff Nurse';
  const wardName = activeNurse?.ward || currentUser?.ward || 'General Care Ward';
  const shiftName = activeNurse?.shift || currentUser?.shift || 'Morning Shift';
  const hospitalName = hospitalInfo?.Name || hospitalInfo?.name || activeNurse?.hospital_name || currentUser?.hospital_name || (typeof activeNurse?.hospital === 'object' ? activeNurse.hospital?.Name : null) || 'Not Provided';
  const nurseFloor = activeNurse?.floor || 'Floor 1';

  const nurseNameLower = (nurseName || '').toLowerCase().trim();
  const nurseIdNum = activeNurse?.id ? Number(activeNurse.id) : null;

  const myAssignedPatients = allPatients.filter(p => {
    const pNurseId = typeof p.nurse === 'object' ? p.nurse?.id : p.nurse;
    if (nurseIdNum && Number(pNurseId) === nurseIdNum) return true;
    if (p.nurse_name && p.nurse_name.toLowerCase().trim() === nurseNameLower) return true;
    return false;
  });

  const displayedPatients = myAssignedPatients.length > 0 ? myAssignedPatients : allPatients;

  const isPatientCheckupDone = (patient) => {
    if (!patient) return false;
    const s = (patient.status || '').toLowerCase().trim();
    if (s === 'completed' || s === 'discharged' || s === 'checkup done' || s.includes('checkup done') || s.includes('done')) return true;
    try {
      const stored = localStorage.getItem(`nurse_checkup_${patient.id}`);
      if (stored === 'Done') return true;
      if (stored === 'Not Done') return false;
    } catch {}
    return false;
  };

  const statusOptions = ['Admitted', 'Under Observation', 'Pending', 'Assigned', 'Completed', 'Discharged', 'Cancelled'];

  const handleUpdatePatientStatus = async (patient, newStatus) => {
    if (!patient || !patient.id) return;
    setUpdatingPatientId(patient.id);
    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/Patients/${patient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response && response.ok) {
        const updated = await response.json();
        setAllPatients(prev => prev.map(p => p.id === patient.id ? { ...p, ...updated, status: newStatus } : p));
      } else {
        setAllPatients(prev => prev.map(p => p.id === patient.id ? { ...p, status: newStatus } : p));
      }

      setActionSuccessMsg(`Status updated to "${newStatus}" for ${patient.name || 'Patient'}!`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating patient status:', err);
      alert('Failed to update patient status in backend.');
    } finally {
      setUpdatingPatientId(null);
    }
  };

  const handleUpdateCheckupStatus = async (patient, newCheckupValue) => {
    if (!patient || !patient.id) return;
    setUpdatingPatientId(patient.id);
    const isDone = newCheckupValue === 'Checkup Done';
    const backendStatus = isDone ? 'Completed' : 'Admitted';

    try {
      localStorage.setItem(`nurse_checkup_${patient.id}`, isDone ? 'Done' : 'Not Done');

      await fetch(`${API_BASE_URL}/super-admin/Patients/${patient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: backendStatus })
      }).catch(() => null);

      setAllPatients(prev => prev.map(p => p.id === patient.id ? { ...p, status: backendStatus } : p));
      setActionSuccessMsg(
        isDone
          ? `Checkup Done marked for Patient #${patient.id} (${patient.name || 'Patient'})!`
          : `Checkup Not Done marked for Patient #${patient.id} (${patient.name || 'Patient'}).`
      );
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating checkup status:', err);
    } finally {
      setUpdatingPatientId(null);
    }
  };

  const nurseStats = [
    {
      title: 'Assigned Floor',
      value: nurseFloor,
      sub: `Active Duty Floor`,
      color: 'bg-teal-50 text-teal-800 border-teal-200'
    },
    {
      title: 'Assigned Patients',
      value: `${displayedPatients.length} Patients`,
      sub: `${nurseFloor} Ward Care`,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    },
    {
      title: 'Checkup Status',
      value: `${displayedPatients.filter(p => isPatientCheckupDone(p)).length} Done`,
      sub: `${displayedPatients.filter(p => !isPatientCheckupDone(p)).length} Checkup Pending`,
      color: 'bg-blue-50 text-blue-800 border-blue-200'
    },
    {
      title: 'Hospital Ward & Duty',
      value: wardName,
      sub: `${roleName} • ${shiftName}`,
      color: 'bg-indigo-50 text-indigo-800 border-indigo-200'
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 w-full overflow-x-hidden">
      {/* WELCOME BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Nursing Station • {nurseFloor}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/25 text-teal-200 text-xs font-bold border border-teal-400/30 shadow-xs">
                <span>{displayedPatients.length} Assigned Patients</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/25 text-blue-200 text-xs font-bold border border-blue-400/30 shadow-xs">
                <span>{hospitalName}</span>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2.5 tracking-tight text-slate-100">
              Welcome, Nurse {nurseName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Floor Allocation: <span className="font-semibold text-teal-300">{nurseFloor}</span> • Ward: <span className="font-semibold text-slate-200">{wardName}</span> • Shift: <span className="font-semibold text-slate-200">{shiftName}</span>
            </p>
          </div>

          {/* NURSE NAVIGATION BUTTONS */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('nurse_dashboard')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md border border-emerald-400/40 transition duration-150 cursor-pointer"
            >
              My Dashboard
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('nurse_patients')}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 hover:border-slate-500 shadow-xs transition duration-150 cursor-pointer"
            >
              Inpatients
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('nurse_settings')}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 hover:border-slate-500 shadow-xs transition duration-150 cursor-pointer"
            >
              Setting
            </button>
          </div>
        </div>
      </div>

      {/* ACTION SUCCESS BANNER */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{actionSuccessMsg}</span>
          </div>
          <button type="button" onClick={() => setActionSuccessMsg('')} className="text-emerald-700 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {nurseStats.map((item, idx) => (
          <div
            key={idx}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-emerald-300 transition"
          >
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${item.color}`}>
                {nurseFloor}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">{item.title}</p>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-0.5 break-words line-clamp-2">{item.value}</h3>
            <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* INPATIENT VITALS & MEDICATION CHART */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">
                Inpatient Vitals & Checkup Chart
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                {displayedPatients.length} Assigned Patients
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Assigned Patients for Nurse {nurseName} • <span className="font-semibold text-emerald-700">{hospitalName}</span> ({nurseFloor})
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
              {nurseFloor} Patients ({displayedPatients.length})
            </span>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[600px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Bed & Floor</th>
                <th className="py-3 px-3">Patient Name & ID</th>
                <th className="py-3 px-3">Age / Gender</th>
                <th className="py-3 px-3">Condition / Diagnosis</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading patient chart...</td>
                </tr>
              ) : displayedPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">No patients assigned to you on {nurseFloor}.</p>
                    <p className="text-xs text-slate-400 mt-1">Assigned patients on {nurseFloor} will appear here.</p>
                  </td>
                </tr>
              ) : (
                displayedPatients.slice(0, visibleCount).map((p, i) => {
                  const patientBed = p.bed_number;
                  const floorText = p.floor || (patientBed ? `Floor ${Math.floor((patientBed - 1) / 100) + 1}` : 'Unassigned');

                  return (
                    <tr key={p.id || i} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-1 rounded-md font-mono font-bold text-xs ${
                            patientBed 
                              ? 'bg-teal-100 text-teal-900 border border-teal-300' 
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {patientBed ? `Bed #${patientBed}` : 'Unassigned'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">{floorText}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        <div>{p.name}</div>
                        <span className="font-mono text-[10px] text-sky-700 font-bold">{p.patient_id || p.uhid || `PAT-${p.id}`}</span>
                      </td>
                      <td className="py-3 px-3">{p.age ? `${p.age} Y` : 'Adult'} / {p.gender || 'Male'}</td>
                      <td className="py-3 px-3 font-medium text-slate-700">{p.symptoms_diagnosis || p.reason || 'General Inpatient'}</td>
                      {/* STATUS (LOADED FROM BACKEND & EDITABLE BY NURSE) */}
                      <td className="py-3 px-3">
                        <select
                          value={p.status || 'Admitted'}
                          onChange={(e) => handleUpdatePatientStatus(p, e.target.value)}
                          disabled={updatingPatientId === p.id}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer shadow-2xs focus:outline-none focus:ring-2 disabled:opacity-50 ${
                            p.status === 'Completed' || p.status === 'Discharged'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-400'
                              : p.status === 'Under Observation'
                              ? 'bg-purple-50 text-purple-800 border-purple-300 focus:ring-purple-400'
                              : p.status === 'Admitted'
                              ? 'bg-blue-50 text-blue-800 border-blue-300 focus:ring-blue-400'
                              : p.status === 'Pending' || p.status === 'Assigned'
                              ? 'bg-amber-50 text-amber-800 border-amber-300 focus:ring-amber-400'
                              : p.status === 'Cancelled'
                              ? 'bg-rose-50 text-rose-800 border-rose-300 focus:ring-rose-400'
                              : 'bg-slate-50 text-slate-800 border-slate-300 focus:ring-slate-400'
                          }`}
                        >
                          {!statusOptions.includes(p.status) && p.status && (
                            <option value={p.status} className="bg-white text-slate-800">
                              {p.status}
                            </option>
                          )}
                          {statusOptions.map((st) => (
                            <option key={st} value={st} className="bg-white text-slate-800">
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      {/* ACTIONS: ONLY CHECKUP DONE OR NOT DONE */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <select
                            value={isPatientCheckupDone(p) ? 'Checkup Done' : 'Checkup Not Done'}
                            onChange={(e) => handleUpdateCheckupStatus(p, e.target.value)}
                            disabled={updatingPatientId === p.id}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-2xs focus:outline-none focus:ring-2 disabled:opacity-50 ${
                              isPatientCheckupDone(p)
                                ? 'bg-emerald-600 text-white border-emerald-600 focus:ring-emerald-400'
                                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 focus:ring-amber-400'
                            }`}
                          >
                            <option value="Checkup Not Done" className="bg-white text-slate-800">Checkup Not Done</option>
                            <option value="Checkup Done" className="bg-white text-slate-800">Checkup Done</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {visibleCount < displayedPatients.length && (
          <div className="p-3 text-center border-t border-slate-100 bg-slate-50/50 mt-4">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 8)}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More ({displayedPatients.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NurseDashboard;

