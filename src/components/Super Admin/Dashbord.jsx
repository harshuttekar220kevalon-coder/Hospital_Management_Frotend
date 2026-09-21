import React, { useState } from 'react';
import Hospital from './Hospital';

const SuperAdminDashboard = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const systemStats = [
    { title: 'Total Hospital Branches', value: '6 Locations', sub: 'Delhi, Mumbai, Bengaluru, Pune...', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { title: 'Registered Doctors', value: '148 Active', sub: 'Across 16 Specializations', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { title: 'Hospital Admins', value: '12 Managers', sub: 'All branches configured', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { title: 'System Health & Security', value: '99.9% Uptime', sub: 'Database SSL Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  ];

  const branches = [
    { name: 'Apex Central Hospital - Main Campus', city: 'New Delhi', head: 'Dr. S. K. Verma', doctors: 45, occupancy: '88%', status: 'Operational' },
    { name: 'Apex Care City Clinic', city: 'Mumbai', head: 'Dr. Meera Nambiar', doctors: 32, occupancy: '92%', status: 'Operational' },
    { name: 'Apex Multi-Specialty Centre', city: 'Bengaluru', head: 'Dr. Anand Joshi', doctors: 40, occupancy: '76%', status: 'Operational' },
    { name: 'Apex Child & Maternity Hospital', city: 'Pune', head: 'Dr. Shalini Rao', doctors: 31, occupancy: '84%', status: 'Maintenance' },
  ];

  const recentAudits = [
    { action: 'Admin Role Permissions Updated', user: 'superadmin@hospital.com', time: '10 mins ago', ip: '192.168.1.104', type: 'Security' },
    { action: 'New Doctor Profile Approved (Dr. Roy)', user: 'admin_delhi@hospital.com', time: '45 mins ago', ip: '192.168.1.55', type: 'Approval' },
    { action: 'Database Automated Backup Successful', user: 'System Bot', time: '2 hours ago', ip: '127.0.0.1', type: 'Backup' },
    { action: 'Pharmacy Inventory API Sync Completed', user: 'System Bot', time: '4 hours ago', ip: '127.0.0.1', type: 'API' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-indigo-900 to-slate-800 text-white p-4 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-semibold border border-purple-400/30">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
              Super Admin Control Center
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Welcome back, {currentUser?.name || 'Super Administrator'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Master control panel for hospital infrastructure, role access, and multi-branch surveillance.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('hospitals')}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer text-center"
            >
              Manage Hospitals Hub
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition cursor-pointer text-center"
            >
              System Overview
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-700/80">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            📊 System Overview & Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hospitals')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'hospitals'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            🏥 Hospital Management ({branches.length} Branches)
          </button>
        </div>
      </div>

      {activeTab === 'hospitals' ? (
        <Hospital />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {systemStats.map((item, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-purple-300 transition"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{item.title}</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.color}`}>
                    Super Admin
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-2">{item.value}</h3>
                <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800">Hospital Branches Network</h2>
                  <p className="text-xs text-slate-500">Live occupancy and status of all affiliated hospitals</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('hospitals')}
                  className="text-xs font-semibold text-purple-700 hover:underline cursor-pointer"
                >
                  Manage All &rarr;
                </button>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-center text-xs text-slate-600 min-w-[580px]">
                  <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
                    <tr>
                      <th className="py-3 px-3 text-center">Branch Name</th>
                      <th className="py-3 px-3 text-center">City</th>
                      <th className="py-3 px-3 text-center">Branch Head</th>
                      <th className="py-3 px-3 text-center">Doctors</th>
                      <th className="py-3 px-3 text-center">Bed Occupancy</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {branches.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-3 font-semibold text-slate-800 text-center">{b.name}</td>
                        <td className="py-3 px-3 text-center">{b.city}</td>
                        <td className="py-3 px-3 text-center">{b.head}</td>
                        <td className="py-3 px-3 font-medium text-center">{b.doctors}</td>
                        <td className="py-3 px-3 text-center">{b.occupancy}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            b.status === 'Operational' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm sm:text-base font-bold text-slate-800">Security & Audit Logs</h2>
                  <span className="text-[11px] font-semibold text-purple-700 cursor-pointer hover:underline">Full Log</span>
                </div>
                <div className="space-y-3">
                  {recentAudits.map((audit, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{audit.action}</span>
                        <span className="text-[10px] text-slate-400">{audit.time}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 mt-1 text-[11px]">
                        <span>{audit.user}</span>
                        <span className="font-mono text-[10px]">{audit.ip}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition cursor-pointer">
                  Download Audit Report (PDF)
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
