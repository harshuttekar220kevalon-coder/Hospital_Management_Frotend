import React from 'react';

const PatientDashboard = ({ currentUser }) => {
  const patientStats = [
    { title: 'Upcoming Appointment', value: 'Today, 03:30 PM', sub: 'Dr. Aditi Verma (Cardiology)', icon: '🩺', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { title: 'Active Prescriptions', value: '3 Medications', sub: 'Refill in 12 days', icon: '💊', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { title: 'Lab Reports Ready', value: '2 Reports', sub: 'Lipid Profile & CBC', icon: '🧪', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { title: 'Billing Invoices', value: 'All Clear', sub: 'Zero Pending Dues', icon: '🧾', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

  const prescriptions = [
    { med: 'Atorvastatin 20mg', dosage: '1 tablet after dinner', duration: '30 Days', doctor: 'Dr. Aditi Verma' },
    { med: 'Metformin 500mg', dosage: '1 tablet twice daily with meals', duration: '60 Days', doctor: 'Dr. Neha Singh' },
    { med: 'Pantoprazole 40mg', dosage: '1 tablet before breakfast', duration: '15 Days', doctor: 'Dr. Ramesh Sethi' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-800 text-white p-4 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/30">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              Patient Health & Records Portal
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Hello, {currentUser?.name || 'Patient'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              View your doctor appointments, digital prescriptions, lab test reports, and billing history.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer text-center">
              + Book New Doctor Appointment
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {patientStats.map((item, idx) => (
          <div
            key={idx}
            className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-blue-300 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{item.icon}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.color}`}>
                Patient Portal
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">{item.title}</p>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-0.5">{item.value}</h3>
            <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Your Active Digital Prescriptions</h2>
              <p className="text-xs text-slate-500">Verified doctor prescriptions and dosage instructions</p>
            </div>
            <span className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer">Pharmacy Refill</span>
          </div>
          <div className="divide-y divide-slate-100">
            {prescriptions.map((p, i) => (
              <div key={i} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <span>💊</span> {p.med}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">{p.dosage}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Prescribed by {p.doctor}</p>
                </div>
                <div>
                  <span className="inline-block px-2.5 py-1 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    Duration: {p.duration}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 mb-1">Recent Lab Reports</h2>
            <p className="text-xs text-slate-500 mb-4">Diagnostic pathology reports ready for download</p>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Complete Blood Count (CBC)</p>
                  <p className="text-[10px] text-slate-400">Tested: Yesterday • Normal Range</p>
                </div>
                <button className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 text-[11px] font-semibold transition cursor-pointer">
                  PDF ⬇
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Lipid Profile & Cholesterol</p>
                  <p className="text-[10px] text-slate-400">Tested: 3 days ago • Verified</p>
                </div>
                <button className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 text-[11px] font-semibold transition cursor-pointer">
                  PDF ⬇
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition cursor-pointer">
              View All Medical Records
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
