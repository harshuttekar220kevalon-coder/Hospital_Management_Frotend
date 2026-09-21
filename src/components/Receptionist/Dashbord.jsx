import React from 'react';

const ReceptionistDashboard = ({ currentUser }) => {
  const receptionistStats = [
    { title: 'Tokens Issued Today', value: '142 Patients', sub: 'Last issued: #142 (OPD)', icon: '🎫', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { title: 'Appointments Booked', value: '38 Slots', sub: 'Across 12 Departments', icon: '📅', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { title: 'New Patient Registrations', value: '19 Patients', sub: 'Digital card generated', icon: '👤', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { title: 'Visitor Passes Active', value: '27 Passes', sub: 'ICU & General Wards', icon: '🪪', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ];

  const recentRegistrations = [
    { token: '#142', patientName: 'Nitin Kapoor', phone: '+91 98765 43210', dept: 'Cardiology', doctor: 'Dr. Aditi Verma', type: 'Walk-In OPD', time: '11:50 AM' },
    { token: '#141', patientName: 'Bhavna Dave', phone: '+91 98111 22334', dept: 'Orthopedics', doctor: 'Dr. Rajesh Kumar', type: 'Online Booking', time: '11:42 AM' },
    { token: '#140', patientName: 'Mohd. Imran', phone: '+91 99223 34455', dept: 'Emergency', doctor: 'Dr. Ramesh Sethi', type: 'Emergency', time: '11:35 AM' },
    { token: '#139', patientName: 'Priyanka Sen', phone: '+91 97888 99001', dept: 'Pediatrics', doctor: 'Dr. Neha Singh', type: 'Walk-In OPD', time: '11:20 AM' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-amber-950 to-slate-800 text-white p-4 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold border border-amber-400/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Reception & Patient Helpdesk
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Welcome, {currentUser?.name || 'Reception Desk'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Issue OPD tokens, register new patients, schedule consultations, and issue visitor passes.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <button className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer text-center">
              + Generate OPD Token
            </button>
            <button className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition cursor-pointer text-center">
              + New Patient Entry
            </button>
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
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Recent Patient Check-ins & OPD Tokens</h2>
            <p className="text-xs text-slate-500">Real-time token generation and doctor assignment</p>
          </div>
          <span className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer">Print Token Slip</span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[580px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Token No.</th>
                <th className="py-3 px-3">Patient Name</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Assigned Doctor</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentRegistrations.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-3 font-mono font-bold text-amber-700">{r.token}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{r.patientName}</td>
                  <td className="py-3 px-3 font-mono text-slate-500">{r.phone}</td>
                  <td className="py-3 px-3">{r.dept}</td>
                  <td className="py-3 px-3 font-medium text-slate-700">{r.doctor}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      r.type === 'Emergency' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      r.type === 'Online Booking' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400">{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
