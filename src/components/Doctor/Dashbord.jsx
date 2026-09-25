import React, { useState, useEffect } from 'react';

const DoctorDashboard = ({ currentUser }) => {
  const [visibleCount, setVisibleCount] = useState(6);
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadDoctorData = async () => {
      try {
        setLoading(true);
        const email = (currentUser?.email || '').toLowerCase().trim();
        const docId = currentUser?.id;

        // 1. Fetch Doctor details if needed
        const docRes = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null);
        let currentDoc = null;
        if (docRes && docRes.ok) {
          const docs = await docRes.json();
          currentDoc = docs.find(d => 
            (d.email && d.email.toLowerCase().trim() === email) ||
            (docId && Number(d.id) === Number(docId)) ||
            (d.name && d.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
          );
        }

        if (isMounted) {
          setDoctorInfo(currentDoc || currentUser);
        }

        // 2. Fetch Hospital
        const targetHospId = currentDoc?.hospital || (Array.isArray(currentDoc?.hospitals) ? currentDoc?.hospitals[0] : null) || currentUser?.hospital;
        if (targetHospId) {
          const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${targetHospId}/`).catch(() => null);
          if (hospRes && hospRes.ok) {
            const hospData = await hospRes.json();
            if (isMounted) setHospitalInfo(hospData);
          }
        }

        // 3. Fetch Patients
        const patRes = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/').catch(() => null);
        if (patRes && patRes.ok) {
          const allPats = await patRes.json();
          // Filter patients assigned to this doctor or this hospital
          const myPatients = allPats.filter(p => {
            const matchDoc = p.doctor === currentDoc?.id || p.doctor_name === currentDoc?.name || p.doctor_name === currentUser?.name;
            const matchHosp = targetHospId && (Number(p.hospital) === Number(targetHospId) || Number(p.hospital?.id) === Number(targetHospId));
            return matchDoc || matchHosp;
          });
          if (isMounted) {
            setPatients(myPatients.length > 0 ? myPatients : allPats.slice(0, 10));
          }
        }
      } catch (err) {
        console.error('Error in DoctorDashboard load:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDoctorData();
    return () => { isMounted = false; };
  }, [currentUser]);

  const docDisplayName = doctorInfo?.name || currentUser?.name || 'Doctor';
  const cleanDocName = docDisplayName.replace(/^Dr\.?\s*/i, '');
  const specialization = doctorInfo?.specialization || doctorInfo?.specialty || currentUser?.specialization || 'Clinical Specialist';
  const opdTiming = doctorInfo?.opd_timings || currentUser?.opd_timings || '09:00 AM - 02:00 PM';
  const hospitalName = hospitalInfo?.Name || 'Apex Care Hospital';

  const completedCount = patients.filter(p => p.status === 'Completed' || p.status === 'Discharged').length;
  const pendingCount = patients.length - completedCount;

  const doctorStats = [
    { title: "Today's Patient Queue", value: `${patients.length} Patients`, change: `${completedCount} Completed • ${pendingCount} Waiting`, icon: '🩺', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { title: 'OPD Schedule', value: opdTiming, change: hospitalName, icon: '⏰', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { title: 'Department', value: specialization, change: 'Active OPD Cabin', icon: '🏥', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { title: 'Doctor ID', value: doctorInfo?.doctor_id || currentUser?.doctor_id || `DOC-${currentUser?.id || '01'}`, change: 'Verified Practitioner', icon: '🪪', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-teal-950 to-slate-800 text-white p-4 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 text-xs font-semibold border border-teal-400/30">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              Doctor Clinical Workspace • {hospitalName}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Welcome, Dr. {cleanDocName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              OPD Patient Consultation Desk • {specialization} • Timings: {opdTiming}
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <button className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer text-center">
              + Start Consultation
            </button>
            <span className="px-3 py-2 rounded-xl bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-slate-600">
              ID: {doctorInfo?.doctor_id || currentUser?.doctor_id || 'DOC-ONLINE'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {doctorStats.map((item, idx) => (
          <div
            key={idx}
            className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-teal-300 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{item.icon}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.color}`}>
                Dr. {cleanDocName}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">{item.title}</p>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-0.5">{item.value}</h3>
            <p className="text-xs text-slate-500 mt-1">{item.change}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">OPD Patient Consultation Queue ({patients.length})</h2>
            <p className="text-xs text-slate-500">Live list of scheduled patients waiting for Dr. {cleanDocName}</p>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[550px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Token</th>
                <th className="py-3 px-3">Patient Name & ID</th>
                <th className="py-3 px-3">Age / Gender</th>
                <th className="py-3 px-3">Symptoms / Diagnosis</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading patients queue...</td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No patients waiting in queue today.</td>
                </tr>
              ) : (
                patients.slice(0, visibleCount).map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3 font-mono font-bold text-teal-700">#{String(i + 1).padStart(2, '0')}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{p.name}</div>
                      <span className="font-mono text-[10px] text-sky-700 font-bold">{p.patient_id || p.uhid || `PAT-${p.id}`}</span>
                    </td>
                    <td className="py-3 px-3">{p.age ? `${p.age} Y` : 'Adult'} / {p.gender || 'Male'}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{p.symptoms_diagnosis || p.reason || 'General Consultation'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        p.status === 'Completed' || p.status === 'Discharged' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        p.status === 'Admitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {p.status || 'Waiting'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button className="px-3 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white border border-teal-200 text-[11px] font-semibold transition cursor-pointer">
                        Call Patient
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
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
