import React, { useState, useEffect } from 'react';

const PatientDashboard = ({ currentUser }) => {
  const [patientInfo, setPatientInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadPatientData = async () => {
      try {
        setLoading(true);
        const email = (currentUser?.email || '').toLowerCase().trim();
        const patId = currentUser?.id;

        // 1. Fetch Patient details
        const patRes = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/').catch(() => null);
        let currentPat = null;
        if (patRes && patRes.ok) {
          const pats = await patRes.json();
          currentPat = pats.find(p => 
            (p.email && p.email.toLowerCase().trim() === email) ||
            (patId && Number(p.id) === Number(patId)) ||
            (p.name && p.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
          );
        }

        if (isMounted) {
          setPatientInfo(currentPat || currentUser);
        }

        // 2. Fetch Hospital
        const targetHospId = currentPat?.hospital || currentUser?.hospital;
        if (targetHospId) {
          const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${targetHospId}/`).catch(() => null);
          if (hospRes && hospRes.ok) {
            const hospData = await hospRes.json();
            if (isMounted) setHospitalInfo(hospData);
          }
        }

        // 3. Fetch Doctor
        const targetDocId = currentPat?.doctor;
        if (targetDocId) {
          const docRes = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null);
          if (docRes && docRes.ok) {
            const docs = await docRes.json();
            const doc = docs.find(d => Number(d.id) === Number(targetDocId));
            if (isMounted && doc) setDoctorInfo(doc);
          }
        }
      } catch (err) {
        console.error('Error in PatientDashboard load:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPatientData();
    return () => { isMounted = false; };
  }, [currentUser]);

  const patName = patientInfo?.name || currentUser?.name || 'Patient';
  const uhid = patientInfo?.patient_id || patientInfo?.uhid || currentUser?.patient_id || `PAT-${currentUser?.id || '01'}`;
  const hospitalName = hospitalInfo?.Name || 'Apex Care Hospital';
  const docName = doctorInfo?.name || patientInfo?.doctor_name || 'Dr. Assigned Specialist';

  const patientStats = [
    { title: 'UHID / Patient ID', value: uhid, sub: 'Registered Patient', icon: '🪪', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { title: 'Assigned Doctor', value: docName, sub: doctorInfo?.specialization || 'Clinical Specialist', icon: '🩺', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { title: 'Payment Status', value: patientInfo?.payment_status || 'Paid', sub: `Fee: ₹${patientInfo?.consultation_fee || '500'}`, icon: '🧾', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { title: 'Visit / Appointment', value: patientInfo?.visit_date_time ? new Date(patientInfo.visit_date_time).toLocaleDateString() : 'Scheduled', sub: hospitalName, icon: '📅', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-800 text-white p-4 sm:p-6 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/30">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              Patient Health Portal • {hospitalName}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Hello, {patName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              UHID: {uhid} • Attending Doctor: {docName} • {hospitalName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-2 rounded-xl bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-slate-600">
              UHID: {uhid}
            </span>
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
                Patient
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
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Your Appointment & Medical Details</h2>
              <p className="text-xs text-slate-500">Live consultation details at {hospitalName}</p>
            </div>
            <span className="text-xs font-semibold text-blue-700">{patientInfo?.status || 'Confirmed'}</span>
          </div>
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-700">Symptoms / Chief Complaint:</p>
              <p className="text-slate-800 mt-1">{patientInfo?.symptoms_diagnosis || 'Regular health check-up & OPD consultation.'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-500 text-[10px] uppercase">Gender & Age</p>
                <p className="font-bold text-slate-800 mt-0.5">{patientInfo?.gender || 'Male'} • {patientInfo?.age ? `${patientInfo.age} Y` : 'Adult'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-500 text-[10px] uppercase">Blood Group</p>
                <p className="font-bold text-slate-800 mt-0.5">{patientInfo?.blood_group || 'Not Known'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Billing & Receipts</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                patientInfo?.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {patientInfo?.payment_status || 'Paid'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">Invoice breakdown for {patName}</p>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-700">Doctor Consultation</p>
                  <p className="text-[10px] text-slate-400">{docName}</p>
                </div>
                <span className="font-mono font-bold text-teal-800">₹{Number(patientInfo?.consultation_fee || 0).toFixed(2)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-700">Hospital Charges</p>
                  <p className="text-[10px] text-slate-400">{hospitalName}</p>
                </div>
                <span className="font-mono font-bold text-sky-800">₹{Number(patientInfo?.Hospitals_Chargies ?? patientInfo?.hospital_charges ?? 0).toFixed(2)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-emerald-950">Total Bill Amount</p>
                  <p className="text-[10px] text-emerald-700">Status: {patientInfo?.payment_status || 'Paid'}</p>
                </div>
                <span className="font-mono font-extrabold text-sm text-emerald-800">
                  ₹{(Number(patientInfo?.consultation_fee || 0) + Number(patientInfo?.Hospitals_Chargies ?? patientInfo?.hospital_charges ?? 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
