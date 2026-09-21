import React from 'react';

const Home = () => {
  const stats = [
    {
      title: 'Total Patients',
      value: '1,284',
      change: '+12% from last month',
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      title: 'Doctors On Duty',
      value: '42',
      change: '5 on emergency call',
      icon: (
        <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      bg: 'bg-teal-50',
      border: 'border-teal-100',
    },
    {
      title: "Today's Appointments",
      value: '89',
      change: '18 completed',
      icon: (
        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
    },
    {
      title: 'Available Beds',
      value: '26 / 150',
      change: 'ICU: 4 available',
      icon: (
        <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
  ];

  const quickActions = [
    { title: 'New Patient Registration', desc: 'Register a new patient into the hospital registry', icon: '👤' },
    { title: 'Book Appointment', desc: 'Schedule a doctor consultation or lab test', icon: '📅' },
    { title: 'Emergency Admission', desc: 'Direct emergency ward admission form', icon: '🚨' },
    { title: 'Pharmacy & Prescriptions', desc: 'Check medicines inventory and digital prescriptions', icon: '💊' },
  ];

  const recentAppointments = [
    { name: 'Rahul Sharma', doctor: 'Dr. Aditi Verma (Cardiology)', time: '10:30 AM', status: 'In Consultation', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name: 'Pooja Patel', doctor: 'Dr. Rajesh Kumar (Orthopedics)', time: '11:15 AM', status: 'Waiting', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    { name: 'Amit Verma', doctor: 'Dr. Neha Singh (Pediatrics)', time: '12:00 PM', status: 'Confirmed', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    { name: 'Sunita Devi', doctor: 'Dr. Arvind Sharma (Neurology)', time: '01:30 PM', status: 'Scheduled', badge: 'bg-slate-50 text-slate-700 border-slate-200' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-blue-950 to-slate-800 text-white p-4 sm:p-7 shadow-md border border-slate-700">
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm">
            Hospital Administration Portal
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mt-3 tracking-tight">
            Welcome to Hospital Management
          </h1>
          <p className="mt-2 text-blue-100 text-xs sm:text-sm md:text-base">
            Manage hospital operations, patient registrations, appointments, and staff duty schedules with seamless real-time monitoring.
          </p>
        </div>
        <div className="absolute right-0 -bottom-10 opacity-10 pointer-events-none hidden md:block">
          <svg className="w-80 h-80 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 10.5V6a2 2 0 00-2-2H7a2 2 0 00-2 2v4.5A4.5 4.5 0 009.5 15h5a4.5 4.5 0 004.5-4.5zM11 6h2v3h3v2h-3v3h-2v-3H8V9h3V6z" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`p-4 sm:p-6 rounded-2xl bg-white border ${stat.border} shadow-sm shadow-slate-200/50 hover:shadow-md transition duration-200 flex items-start justify-between`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">{stat.value}</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">{stat.change}</p>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-xl ${stat.bg} border ${stat.border}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {quickActions.map((action, i) => (
            <div
              key={i}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/70 shadow-sm hover:shadow-md hover:border-blue-300 transition duration-200 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{action.icon}</div>
                <h3 className="font-semibold text-sm sm:text-base text-slate-800 group-hover:text-blue-600 transition-colors">
                  {action.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{action.desc}</p>
              </div>
              <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                Proceed &rarr;
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Today's Appointment Schedule</h2>
            <span className="text-xs font-medium text-blue-600 cursor-pointer hover:underline">View All</span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentAppointments.map((app, idx) => (
              <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs shrink-0">
                    {app.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{app.name}</h4>
                    <p className="text-xs text-slate-500">{app.doctor}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right pl-12 sm:pl-0">
                  <span className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-full border ${app.badge}`}>
                    {app.status}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5 sm:mt-1">{app.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 sm:p-6 text-white flex flex-col justify-between shadow-lg">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 mb-4">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              24x7 Emergency Desk
            </div>
            <h3 className="text-lg sm:text-xl font-bold">Need Immediate Assistance?</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Connect directly with the trauma unit, blood bank, or ambulance dispatch.
            </p>
            <div className="mt-4 sm:mt-6 space-y-3">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-300">Ambulance Hotline</span>
                <span className="text-xs sm:text-sm font-bold text-teal-300">+91 108 / 102</span>
              </div>
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-300">Emergency Desk</span>
                <span className="text-xs sm:text-sm font-bold text-blue-300">Ext: #4010</span>
              </div>
            </div>
          </div>
          <button className="w-full mt-5 sm:mt-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs tracking-wider uppercase transition shadow-md shadow-rose-600/30 cursor-pointer">
            Trigger Code Blue Alert
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;