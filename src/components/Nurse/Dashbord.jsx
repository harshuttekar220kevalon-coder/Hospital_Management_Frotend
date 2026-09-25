import React, { useState, useEffect } from 'react';

const NurseDashboard = ({ currentUser }) => {
  const [visibleCount, setVisibleCount] = useState(6);
  const [loading, setLoading] = useState(true);
  const [nurseInfo, setNurseInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadNurseData = async () => {
      try {
        setLoading(true);
        const email = (currentUser?.email || '').toLowerCase().trim();
        const nurseId = currentUser?.id;

        // 1. Fetch Nurse details
        const nurseRes = await fetch('http://127.0.0.1:8000/api/super-admin/Nurses/').catch(() => null);
        let currentNurse = null;
        if (nurseRes && nurseRes.ok) {
          const nurses = await nurseRes.json();
          currentNurse = nurses.find(n => 
            (n.email && n.email.toLowerCase().trim() === email) ||
            (nurseId && Number(n.id) === Number(nurseId)) ||
            (n.name && n.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
          );
        }

        if (isMounted) {
          setNurseInfo(currentNurse || currentUser);
        }

        // 2. Fetch Hospital
        const targetHospId = currentNurse?.hospital || currentUser?.hospital;
        if (targetHospId) {
          const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${targetHospId}/`).catch(() => null);
          if (hospRes && hospRes.ok) {
            const hospData = await hospRes.json();
            if (isMounted) setHospitalInfo(hospData);
          }
        }

        // 3. Fetch Inpatient / Hospital Patients
        const patRes = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/').catch(() => null);
        if (patRes && patRes.ok) {
          const allPats = await patRes.json();
          const hospPats = targetHospId ? allPats.filter(p => Number(p.hospital) === Number(targetHospId) || Number(p.hospital?.id) === Number(targetHospId)) : allPats;
          if (isMounted) {
            setPatients(hospPats.length > 0 ? hospPats : allPats.slice(0, 10));
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

  const nurseName = nurseInfo?.name || currentUser?.name || 'Nurse';
  const roleName = nurseInfo?.nurse_role || nurseInfo?.role || currentUser?.nurse_role || currentUser?.role || 'Staff Nurse';
  const wardName = nurseInfo?.ward || currentUser?.ward || 'General Care Ward';
  const shiftName = nurseInfo?.shift || currentUser?.shift || 'Morning Shift';
  const hospitalName = hospitalInfo?.Name || 'Apex Care Hospital';

  const nurseStats = [
    { title: 'Assigned Ward', value: wardName, sub: `Active in ${hospitalName}`, icon: '🩺', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { title: 'Duty Shift', value: shiftName, sub: `${roleName} Active`, icon: '🕒', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { title: 'Inpatient Count', value: `${patients.length} Patients`, sub: 'Under Ward Care', icon: '👥', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { title: 'Nurse ID', value: nurseInfo?.nurse_id || currentUser?.nurse_id || `NUR-${currentUser?.id || '01'}`, sub: 'Verified Nursing Staff', icon: '🪪', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-emerald-950 to-slate-800 text-white p-4 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Nursing & Ward Station • {hospitalName}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Welcome, Nurse {nurseName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Role: {roleName} • Ward: {wardName} • Shift: {shiftName}
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <button className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer text-center">
              + Record Patient Vitals
            </button>
            <span className="px-3 py-2 rounded-xl bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-slate-600">
              ID: {nurseInfo?.nurse_id || currentUser?.nurse_id || 'NUR-ONLINE'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {nurseStats.map((item, idx) => (
          <div
            key={idx}
            className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-emerald-300 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{item.icon}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.color}`}>
                Nurse {nurseName}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">{item.title}</p>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-0.5">{item.value}</h3>
            <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Inpatient Vitals & Medication Chart ({patients.length})</h2>
            <p className="text-xs text-slate-500">Live monitoring for Nurse {nurseName} ({wardName})</p>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[620px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Bed / Token</th>
                <th className="py-3 px-3">Patient Name & ID</th>
                <th className="py-3 px-3">Age / Gender</th>
                <th className="py-3 px-3">Condition / Diagnosis</th>
                <th className="py-3 px-3">Doctor Assigned</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading patient chart...</td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No inpatients currently recorded.</td>
                </tr>
              ) : (
                patients.slice(0, visibleCount).map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3 font-semibold text-slate-800">Bed {String(i + 101)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <div>{p.name}</div>
                      <span className="font-mono text-[10px] text-sky-700 font-bold">{p.patient_id || p.uhid || `PAT-${p.id}`}</span>
                    </td>
                    <td className="py-3 px-3">{p.age ? `${p.age} Y` : 'Adult'} / {p.gender || 'Male'}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{p.symptoms_diagnosis || p.reason || 'General Inpatient'}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{p.doctor_name || 'Attending Doctor'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        p.status === 'Completed' || p.status === 'Discharged' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        p.status === 'Admitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {p.status || 'Active Care'}
                      </span>
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NurseDashboard;
