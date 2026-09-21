import React from 'react';

const AdminDashboard = ({ currentUser }) => {
  const adminStats = [
    { title: 'Total Staff on Duty', value: '74 Members', change: '8 on planned leave', icon: '👥', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { title: 'OPD Registrations Today', value: '234 Patients', change: '+18% vs yesterday', icon: '📋', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { title: 'Bed Occupancy Rate', value: '82%', change: '24 beds available', icon: '🛏️', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { title: 'Daily Pharmacy Revenue', value: '₹1,48,200', change: 'Bills cleared: 112', icon: '💳', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

  const departmentStatus = [
    { dept: 'Emergency & Trauma Care', head: 'Dr. Ramesh Sethi', activeBeds: '18/20', status: 'High Alert', alertColor: 'bg-rose-50 text-rose-700 border-rose-200' },
    { dept: 'Cardiology Department', head: 'Dr. Aditi Verma', activeBeds: '28/30', status: 'Normal', alertColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { dept: 'Orthopedics & Joint Care', head: 'Dr. Rajesh Kumar', activeBeds: '15/25', status: 'Normal', alertColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { dept: 'Pediatrics & Neonatal Care', head: 'Dr. Neha Singh', activeBeds: '12/15', status: 'Occupied', alertColor: 'bg-amber-50 text-amber-700 border-amber-200' },
    { dept: 'Neurology & Stroke Unit', head: 'Dr. Arvind Sharma', activeBeds: '14/18', status: 'Normal', alertColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-blue-900 to-slate-800 text-white p-4 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/30">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              Hospital Admin Portal
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Welcome, {currentUser?.name || 'Hospital Admin'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Oversee departmental operations, staff rosters, patient flow, and financial reconciliations.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <button className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer text-center">
              + Generate Daily Report
            </button>
            <button className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition cursor-pointer text-center">
              Duty Roster
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {adminStats.map((item, idx) => (
          <div
            key={idx}
            className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-blue-300 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{item.icon}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.color}`}>
                Admin
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
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Hospital Department Capacity</h2>
            <p className="text-xs text-slate-500">Live operational status and bed capacity by department</p>
          </div>
          <span className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer">Manage Wards</span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[550px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Head of Dept</th>
                <th className="py-3 px-3">Bed Allocation</th>
                <th className="py-3 px-3">Condition</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departmentStatus.map((d, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-3 font-semibold text-slate-800">{d.dept}</td>
                  <td className="py-3 px-3">{d.head}</td>
                  <td className="py-3 px-3 font-medium">{d.activeBeds}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${d.alertColor}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer">
                      Details &rarr;
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

export default AdminDashboard;
