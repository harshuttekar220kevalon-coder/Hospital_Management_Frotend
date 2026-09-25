import React, { useState, useEffect } from 'react';

const ReceptionistDashboard = ({ currentUser }) => {
  const [visibleCount, setVisibleCount] = useState(6);
  const [loading, setLoading] = useState(true);
  const [receptionistInfo, setReceptionistInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadReceptionistData = async () => {
      try {
        setLoading(true);
        const email = (currentUser?.email || '').toLowerCase().trim();
        const recId = currentUser?.id;

        // 1. Fetch Receptionist details
        const recRes = await fetch('http://127.0.0.1:8000/api/super-admin/Receptionists/').catch(() => null);
        let currentRec = null;
        if (recRes && recRes.ok) {
          const recs = await recRes.json();
          currentRec = recs.find(r => 
            (r.email && r.email.toLowerCase().trim() === email) ||
            (recId && Number(r.id) === Number(recId)) ||
            (r.name && r.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
          );
        }

        if (isMounted) {
          setReceptionistInfo(currentRec || currentUser);
        }

        // 2. Fetch Hospital
        const targetHospId = currentRec?.hospital || currentUser?.hospital;
        if (targetHospId) {
          const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${targetHospId}/`).catch(() => null);
          if (hospRes && hospRes.ok) {
            const hospData = await hospRes.json();
            if (isMounted) setHospitalInfo(hospData);
          }
        }

        // 3. Fetch Patient registrations
        const patRes = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/').catch(() => null);
        if (patRes && patRes.ok) {
          const allPats = await patRes.json();
          const hospPats = targetHospId ? allPats.filter(p => Number(p.hospital) === Number(targetHospId) || Number(p.hospital?.id) === Number(targetHospId)) : allPats;
          if (isMounted) {
            setPatients(hospPats.length > 0 ? hospPats : allPats);
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
  const hospitalName = hospitalInfo?.Name || 'Apex Care Hospital';

  const receptionistStats = [
    { title: 'Registered Patients', value: `${patients.length} Entries`, sub: `In ${hospitalName}`, icon: '🎫', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { title: 'Duty Shift', value: shiftName, sub: roleTitle, icon: '🕒', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { title: 'Branch Location', value: hospitalInfo?.city || 'Main Branch', sub: hospitalName, icon: '🏥', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { title: 'Receptionist ID', value: receptionistInfo?.receptionist_id || currentUser?.receptionist_id || `REC-${currentUser?.id || '01'}`, sub: 'Active Front Desk', icon: '🪪', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-amber-950 to-slate-800 text-white p-4 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <button className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer text-center">
              + Generate OPD Token
            </button>
            <span className="px-3 py-2 rounded-xl bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-slate-600">
              ID: {receptionistInfo?.receptionist_id || currentUser?.receptionist_id || 'REC-ONLINE'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {receptionistStats.map((item, idx) => (
          <div
            key={idx}
            className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-amber-300 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{item.icon}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.color}`}>
                Front Desk
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
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Recent Patient Entries & Tokens ({patients.length})</h2>
            <p className="text-xs text-slate-500">Live reception registration desk for {hospitalName}</p>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[620px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Token</th>
                <th className="py-3 px-3">Patient Name & ID</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Doctor Assigned</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading registrations...</td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No patient registrations yet today.</td>
                </tr>
              ) : (
                patients.slice(0, visibleCount).map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3 font-mono font-bold text-amber-700">#{String(i + 1).padStart(2, '0')}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <div>{p.name}</div>
                      <span className="font-mono text-[10px] text-sky-700 font-bold">{p.patient_id || p.uhid || `PAT-${p.id}`}</span>
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
