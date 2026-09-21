import React from 'react';

const NurseDashboard = ({ currentUser }) => {
  const nurseStats = [
    { title: 'Assigned Ward', value: 'Ward 4B (Cardiology)', sub: '16 Patients in charge', icon: '🩺', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { title: 'Medication Doses Due', value: '8 Patients', sub: 'Scheduled for 12:00 PM', icon: '💊', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { title: 'Critical Vitals Alert', value: '1 Patient', sub: 'Bed 402 - BP Spike', icon: '⚠️', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { title: 'Shift Status', value: 'Morning Shift', sub: '08:00 AM - 04:00 PM', icon: '🕒', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ];

  const wardPatients = [
    { bed: 'Bed 401', name: 'Manish Gupta', age: 52, bp: '120/80', spo2: '98%', pulse: '76 bpm', temp: '98.4 °F', medStatus: 'Administered' },
    { bed: 'Bed 402', name: 'Sarita Sharma', age: 67, bp: '155/95', spo2: '94%', pulse: '88 bpm', temp: '99.1 °F', medStatus: 'Due Now' },
    { bed: 'Bed 403', name: 'Vikram Joshi', age: 41, bp: '118/78', spo2: '99%', pulse: '72 bpm', temp: '98.6 °F', medStatus: 'Administered' },
    { bed: 'Bed 404', name: 'Geeta Rani', age: 58, bp: '130/85', spo2: '97%', pulse: '80 bpm', temp: '98.8 °F', medStatus: 'Scheduled 02:00 PM' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-emerald-950 to-slate-800 text-white p-4 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Nursing & Ward Care Station
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Welcome, Nurse {currentUser?.name || 'Nurse'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Patient Vitals Monitoring, Medication Schedules, and Inpatient Ward Care.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <button className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer text-center">
              + Record Patient Vitals
            </button>
            <button className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition cursor-pointer text-center">
              Shift Handover Log
            </button>
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
                Ward 4B
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
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Inpatient Vitals & Medication Chart</h2>
            <p className="text-xs text-slate-500">Live monitoring of vitals and dosage timeline</p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">All Wards</span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[620px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Bed No.</th>
                <th className="py-3 px-3">Patient Name</th>
                <th className="py-3 px-3">Blood Pressure</th>
                <th className="py-3 px-3">SpO2</th>
                <th className="py-3 px-3">Pulse Rate</th>
                <th className="py-3 px-3">Temperature</th>
                <th className="py-3 px-3">Medication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wardPatients.map((w, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-3 font-semibold text-slate-800">{w.bed}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{w.name} ({w.age}y)</td>
                  <td className="py-3 px-3 font-mono">{w.bp}</td>
                  <td className="py-3 px-3 font-mono">{w.spo2}</td>
                  <td className="py-3 px-3 font-mono">{w.pulse}</td>
                  <td className="py-3 px-3 font-mono">{w.temp}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      w.medStatus === 'Due Now' ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse' :
                      w.medStatus === 'Administered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-slate-50 text-slate-700 border border-slate-200'
                    }`}>
                      {w.medStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default NurseDashboard;
