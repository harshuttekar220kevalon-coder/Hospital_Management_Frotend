import React from 'react';

const DoctorDashboard = ({ currentUser }) => {
  const doctorStats = [
    { title: "Today's Patient Queue", value: '28 Patients', change: '11 Completed • 17 Pending', icon: '🩺', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { title: 'Emergency Calls', value: '2 Active', change: 'ICU Ward 3 & Trauma Unit', icon: '🚨', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { title: 'Prescriptions Issued', value: '45 Today', change: 'Digital E-Sign enabled', icon: '📝', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { title: 'Next Consultation', value: '11:45 AM', change: 'Room 204 • Ramesh Shah', icon: '⏰', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  const patientsInQueue = [
    { token: '#01', name: 'Ramesh Shah', age: 48, gender: 'Male', reason: 'Hypertension & Chest Heaviness', status: 'Next In Line', statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { token: '#02', name: 'Sunita Mehra', age: 34, gender: 'Female', reason: 'Post-Surgery Follow-up', status: 'Waiting (10m)', statusBadge: 'bg-amber-50 text-amber-700 border-amber-200' },
    { token: '#03', name: 'Kabir Das', age: 62, gender: 'Male', reason: 'Diabetic Foot Review', status: 'Waiting (25m)', statusBadge: 'bg-amber-50 text-amber-700 border-amber-200' },
    { token: '#04', name: 'Ananya Roy', age: 29, gender: 'Female', reason: 'Routine ECG & Blood Profile', status: 'Scheduled', statusBadge: 'bg-slate-50 text-slate-700 border-slate-200' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-teal-950 to-slate-800 text-white p-4 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 text-xs font-semibold border border-teal-400/30">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              Doctor Clinical Workspace
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Welcome, Dr. {currentUser?.name?.replace(/^Dr\.?\s*/i, '') || 'Doctor'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              OPD Patient Consultation Desk, E-Prescriptions, and Lab Report Analysis.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <button className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer text-center">
              + Start Next Consultation
            </button>
            <button className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition cursor-pointer text-center">
              Patient History Search
            </button>
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
                Doctor Desk
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
            <h2 className="text-sm sm:text-base font-bold text-slate-800">OPD Patient Consultation Queue</h2>
            <p className="text-xs text-slate-500">Live list of scheduled patients waiting outside your cabin</p>
          </div>
          <span className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer">Refresh Queue</span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[550px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Token</th>
                <th className="py-3 px-3">Patient Name</th>
                <th className="py-3 px-3">Age / Gender</th>
                <th className="py-3 px-3">Symptoms / Chief Complaint</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Consult</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patientsInQueue.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-3 font-mono font-bold text-teal-700">{p.token}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{p.name}</td>
                  <td className="py-3 px-3">{p.age} Y / {p.gender}</td>
                  <td className="py-3 px-3 font-medium text-slate-700">{p.reason}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.statusBadge}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button className="px-3 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white border border-teal-200 text-[11px] font-semibold transition cursor-pointer">
                      Call Patient
                    </button>
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

export default DoctorDashboard;
