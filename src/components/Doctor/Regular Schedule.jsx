import React, { useState, useEffect } from 'react';

const DoctorRegularSchedule = ({ currentUser, setCurrentPage }) => {
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [isEditTimingsModalOpen, setIsEditTimingsModalOpen] = useState(false);
  const [editTimingsValue, setEditTimingsValue] = useState('');
  const [updatingDutyStatus, setUpdatingDutyStatus] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadDoctorSchedule = async () => {
    try {
      setLoading(true);
      const email = (currentUser?.email || '').toLowerCase().trim();
      const docId = currentUser?.id;
      const currentDocIdTag = currentUser?.doctor_id;

      let currentDoc = null;
      try {
        const docRes = await fetch('http://127.0.0.1:8000/api/super-admin/Doctors/').catch(() => null);
        if (docRes && docRes.ok) {
          const docs = await docRes.json();
          if (Array.isArray(docs)) {
            currentDoc = docs.find(d => 
              (d.email && d.email.toLowerCase().trim() === email) ||
              (docId && Number(d.id) === Number(docId)) ||
              (currentDocIdTag && d.doctor_id === currentDocIdTag) ||
              (d.name && d.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
            );
          }
        }
      } catch (err) {
        console.error('Error fetching doctor schedule data:', err);
      }

      const resolvedDoctor = currentDoc || currentUser || null;
      setDoctorInfo(resolvedDoctor);
      setEditTimingsValue(resolvedDoctor?.opd_timings || 'Mon - Fri (10:00 AM - 02:00 PM)');

      const targetHospId = resolvedDoctor?.hospital || (Array.isArray(resolvedDoctor?.hospitals) ? resolvedDoctor?.hospitals[0] : null) || currentUser?.hospital;
      if (targetHospId) {
        try {
          const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${targetHospId}/`).catch(() => null);
          if (hospRes && hospRes.ok) {
            const hospData = await hospRes.json();
            setHospitalInfo(hospData);
          }
        } catch (err) {
          console.error('Error fetching hospital record:', err);
        }
      }

      try {
        const patRes = await fetch('http://127.0.0.1:8000/api/super-admin/Patients/').catch(() => null);
        if (patRes && patRes.ok) {
          const allPats = await patRes.json();
          if (Array.isArray(allPats)) {
            const myPatients = allPats.filter(p => {
              const matchDocId = (resolvedDoctor?.id && Number(p.doctor) === Number(resolvedDoctor.id)) ||
                (currentUser?.id && Number(p.doctor) === Number(currentUser.id));
              
              const matchDocName = resolvedDoctor?.name && p.doctor_name && 
                p.doctor_name.toLowerCase().trim() === resolvedDoctor.name.toLowerCase().trim();

              const matchDocTag = resolvedDoctor?.doctor_id && p.doctor_id &&
                p.doctor_id === resolvedDoctor.doctor_id;

              return matchDocId || matchDocName || matchDocTag;
            });
            setPatients(myPatients);
          }
        }
      } catch (err) {
        console.error('Error fetching schedule queue:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorSchedule();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = days[new Date().getDay()];
    setSelectedDay(currentDayName === 'Sunday' ? 'Monday' : currentDayName);
  }, [currentUser]);

  const handleToggleDutyStatus = async () => {
    if (!doctorInfo?.id) return;
    try {
      setUpdatingDutyStatus(true);
      const newActive = doctorInfo.is_active === false ? true : false;
      const newStatus = newActive ? 'Available' : 'On Leave';

      let res = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${doctorInfo.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActive, status: newStatus })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${doctorInfo.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...doctorInfo, is_active: newActive, status: newStatus })
        }).catch(() => null);
      }

      setDoctorInfo(prev => ({ ...prev, is_active: newActive, status: newStatus }));
      setSuccessMsg(`Duty status changed to: ${newStatus}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error toggling duty status:', err);
    } finally {
      setUpdatingDutyStatus(false);
    }
  };

  const handleSaveOpdTimings = async (e) => {
    e.preventDefault();
    if (!doctorInfo?.id || !editTimingsValue) return;
    try {
      let res = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${doctorInfo.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opd_timings: editTimingsValue })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`http://127.0.0.1:8000/api/super-admin/Doctors/${doctorInfo.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...doctorInfo, opd_timings: editTimingsValue })
        }).catch(() => null);
      }

      setDoctorInfo(prev => ({ ...prev, opd_timings: editTimingsValue }));
      setIsEditTimingsModalOpen(false);
      setSuccessMsg(`Regular OPD Schedule updated to: "${editTimingsValue}"`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error updating schedule timings:', err);
    }
  };

  const docName = doctorInfo?.name || currentUser?.name || 'Doctor';
  const cleanDocName = docName.replace(/^Dr\.?\s*/i, '');
  const hospitalName = hospitalInfo?.Name || doctorInfo?.hospital_name || 'Main Hospital';
  const opdTimings = doctorInfo?.opd_timings || currentUser?.opd_timings || 'Mon - Fri (10:00 AM - 02:00 PM)';
  const docDepartment = doctorInfo?.department || doctorInfo?.specialization || 'Clinical Department';

  const weeklyScheduleMatrix = [
    { day: 'Monday', isWorking: true, hours: opdTimings, room: 'OPD Cabin 204', slotCapacity: '25 Patients', type: 'Morning OPD & IPD Rounds' },
    { day: 'Tuesday', isWorking: true, hours: opdTimings, room: 'OPD Cabin 204', slotCapacity: '25 Patients', type: 'Morning OPD & Follow-ups' },
    { day: 'Wednesday', isWorking: true, hours: opdTimings, room: 'OPD Cabin 204', slotCapacity: '20 Patients', type: 'Clinical Consultation & Special' },
    { day: 'Thursday', isWorking: true, hours: opdTimings, room: 'OPD Cabin 204', slotCapacity: '25 Patients', type: 'General OPD & Minor Procedures' },
    { day: 'Friday', isWorking: true, hours: opdTimings, room: 'OPD Cabin 204', slotCapacity: '25 Patients', type: 'OPD & Clinical Case Reviews' },
    { day: 'Saturday', isWorking: true, hours: '10:00 AM - 01:00 PM', room: 'OPD Cabin 204', slotCapacity: '15 Patients', type: 'Half-Day OPD & Emergency Cover' },
    { day: 'Sunday', isWorking: false, hours: 'Emergency On-Call', room: 'Emergency Care / On-Call', slotCapacity: 'On-Demand', type: 'On-Call / Weekly Off' },
  ];

  const todaySlots = [
    {
      time: '10:00 AM - 11:30 AM',
      name: 'Morning OPD - Slot A (General Consultations)',
      room: 'Cabin 204',
      status: 'Active Now',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      patientList: patients.slice(0, 4)
    },
    {
      time: '11:30 AM - 01:00 PM',
      name: 'Midday OPD - Slot B (Special & Follow-ups)',
      room: 'Cabin 204',
      status: 'Upcoming',
      statusColor: 'bg-blue-100 text-blue-800 border-blue-300',
      patientList: patients.slice(4, 8)
    },
    {
      time: '01:00 PM - 02:00 PM',
      name: 'IPD In-Patient Ward Rounds & Observations',
      room: 'In-Patient Wards / ICU',
      status: 'Scheduled',
      statusColor: 'bg-purple-100 text-purple-800 border-purple-300',
      patientList: patients.filter(p => (p.status || '').toLowerCase().includes('admit')).slice(0, 4)
    },
    {
      time: '04:00 PM - 06:00 PM',
      name: 'Evening Special Consultations & Tele-OPD',
      room: 'Cabin 204 / Video Consultation',
      status: 'Evening Session',
      statusColor: 'bg-amber-100 text-amber-800 border-amber-300',
      patientList: patients.slice(8, 12)
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* DOCTOR NAVIGATION BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-2.5 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('doctor_dashboard')}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100 whitespace-nowrap"
          >
            Dashboard Overview
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('doctor_appointments')}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100 whitespace-nowrap"
          >
            Special & Emergency Cases
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('doctor_patients')}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100 whitespace-nowrap"
          >
            Patient Checkup Queue ({patients.length})
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('doctor_schedule')}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer bg-teal-600 text-white shadow-xs whitespace-nowrap"
          >
            Regular OPD Schedule
          </button>
        </div>

        <button
          type="button"
          onClick={loadDoctorSchedule}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer shrink-0"
        >
          Refresh
        </button>
      </div>

      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                Regular Duty & OPD Schedule
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                Dr. {cleanDocName}
              </span>
              <span className="text-xs text-slate-400">
                {hospitalName} • Room 204
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 text-slate-100 tracking-tight">
              Daily Clinical Schedule & Weekly OPD Roster
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Official regular schedule, duty hours, session capacities, and time slots for Dr. {cleanDocName}.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              disabled={updatingDutyStatus}
              onClick={handleToggleDutyStatus}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 ${
                doctorInfo?.is_active !== false
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${doctorInfo?.is_active !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              {doctorInfo?.is_active !== false ? 'Status: On Duty / Available' : 'Status: On Leave / Off Duty'}
            </button>

            <button
              type="button"
              onClick={() => setIsEditTimingsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Edit Regular Hours
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-4 flex-wrap text-xs text-slate-300">
          <div className="flex items-center gap-4 flex-wrap">
            <span><strong>Department:</strong> {docDepartment}</span>
            <span>•</span>
            <span><strong>Official Hours:</strong> <span className="text-teal-300 font-bold">{opdTimings}</span></span>
            <span>•</span>
            <span><strong>Cabin / Room:</strong> OPD Room 204</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* TODAY'S TIME SLOTS SCHEDULE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-800">Today's Daily Schedule & Time Slot Allocation</h2>
            <p className="text-xs text-slate-500">Live clinical consultations and sessions for Dr. {cleanDocName}</p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
            Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {todaySlots.map((slot, index) => (
            <div key={index} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {slot.time}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm mt-1.5">{slot.name}</h3>
                  <p className="text-[11px] text-slate-500">{slot.room} • {hospitalName}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${slot.statusColor}`}>
                  {slot.status}
                </span>
              </div>

              {slot.patientList && slot.patientList.length > 0 ? (
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Queued Patients for this Slot:</span>
                  <div className="space-y-1">
                    {slot.patientList.map((p, pIdx) => (
                      <div key={p.id || pIdx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-slate-200">
                        <span className="font-medium text-slate-800">
                          #{pIdx + 1} {p.name}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-bold border ${
                          (p.status || '').toLowerCase().includes('complet') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {p.status || 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-400">
                  No scheduled patients assigned for this slot yet.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* WEEKLY WORKING SCHEDULE MATRIX */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-800">Weekly OPD & Clinical Schedule Matrix</h2>
            <p className="text-xs text-slate-500">Regular weekly duty days and consultation hours</p>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {weeklyScheduleMatrix.map((item) => (
              <button
                key={item.day}
                type="button"
                onClick={() => setSelectedDay(item.day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedDay === item.day
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {weeklyScheduleMatrix.map((sched) => {
            const isSelected = selectedDay === sched.day;
            return (
              <div
                key={sched.day}
                onClick={() => setSelectedDay(sched.day)}
                className={`p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-800 text-sm">{sched.day}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    sched.isWorking ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>
                    {sched.isWorking ? 'Working Day' : 'On-Call / Off'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <p><strong className="text-slate-700">Timings:</strong> <span className="font-semibold text-teal-700">{sched.hours}</span></p>
                  <p><strong className="text-slate-700">Room:</strong> {sched.room}</p>
                  <p><strong className="text-slate-700">Capacity:</strong> {sched.slotCapacity}</p>
                  <p className="text-[11px] text-slate-500 italic mt-1">{sched.type}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EDIT TIMINGS MODAL */}
      {isEditTimingsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">Edit Regular OPD Timings</h3>
                <p className="text-xs text-slate-500">Update official duty hours for Dr. {cleanDocName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditTimingsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOpdTimings} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                  Regular OPD Timings String *
                </label>
                <input
                  type="text"
                  required
                  value={editTimingsValue}
                  onChange={(e) => setEditTimingsValue(e.target.value)}
                  placeholder="e.g. Mon - Fri (10:00 AM - 02:00 PM)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-xs font-semibold"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Preset Examples:</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Mon - Fri (10:00 AM - 02:00 PM)',
                    'Mon - Sat (09:00 AM - 01:00 PM)',
                    'Mon - Fri (02:00 PM - 06:00 PM)',
                    'Daily (10:00 AM - 01:00 PM & 05:00 PM - 08:00 PM)'
                  ].map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditTimingsValue(preset)}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-teal-50 hover:text-teal-700 text-slate-700 border border-slate-200 text-[10px] font-semibold cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditTimingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorRegularSchedule;
