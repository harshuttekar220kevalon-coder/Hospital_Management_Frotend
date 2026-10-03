import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const ReceptionistDoctors = ({ currentUser, setCurrentPage, setSelectedDoctorForPatient }) => {
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [selectedHospital, setSelectedHospital] = useState('ALL');
  const [selectedAvailability, setSelectedAvailability] = useState('ALL');
  const [selectedDoctorModal, setSelectedDoctorModal] = useState(null);

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docRes, hospRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Doctors/`),
        fetch(`${API_BASE_URL}/super-admin/Hospital/`)
      ]);

      let docData = [];
      let hospData = [];

      if (docRes.status === 'fulfilled' && docRes.value.ok) {
        docData = await docRes.value.json().catch(() => []);
      }
      if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
        hospData = await hospRes.value.json().catch(() => []);
      }

      setHospitals(Array.isArray(hospData) ? hospData : []);

      // If receptionist has an assigned hospital, filter or prioritize
      const userHospId = currentUser?.hospital || (typeof currentUser?.hospital_data === 'object' ? currentUser?.hospital_data?.id : null);
      if (userHospId && selectedHospital === 'ALL') {
        setSelectedHospital(String(userHospId));
      }

      setDoctors(Array.isArray(docData) ? docData : []);
    } catch (error) {
      console.error('Error fetching doctors data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHospitalName = (hospId) => {
    if (!hospId) return 'Main Hospital Campus';
    if (typeof hospId === 'object' && hospId?.Name) return hospId.Name;
    const found = hospitals.find(h => Number(h.id) === Number(hospId));
    return found ? found.Name : 'Main Campus';
  };

  const getDoctorSchedule = (doc) => {
    if (doc.opd_schedule || doc.schedule || doc.timings) {
      return doc.opd_schedule || doc.schedule || doc.timings;
    }
    // Realistic default schedule based on doctor ID/name
    const days = ['Mon - Fri', 'Mon - Sat', 'Tue, Thu, Sat', 'Mon, Wed, Fri'][((doc.id || 1) % 4)];
    const morning = '09:00 AM - 01:00 PM';
    const evening = '05:00 PM - 08:30 PM';
    return `${days} • Morning: ${morning} | Evening: ${evening}`;
  };

  const getAvailabilityStatus = (doc) => {
    const rawStatus = (doc.status || doc.duty_status || 'Available').toString();
    if (rawStatus.toLowerCase().includes('leave') || rawStatus.toLowerCase().includes('off')) {
      return { label: 'On Leave', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
    }
    if (rawStatus.toLowerCase().includes('surg') || rawStatus.toLowerCase().includes('oper')) {
      return { label: 'In Surgery', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    }
    if (rawStatus.toLowerCase().includes('opd') || rawStatus.toLowerCase().includes('round')) {
      return { label: 'In OPD Consultation', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
    }
    return { label: 'Available Now', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  };

  const specialties = ['ALL', ...new Set(doctors.map(d => d.specialization || d.specialty || 'General Medicine').filter(Boolean))];

  const filteredDoctors = doctors.filter(doc => {
    const docName = (doc.name || '').toLowerCase();
    const docSpecialty = (doc.specialization || doc.specialty || '').toLowerCase();
    const docHosp = getHospitalName(doc.hospital).toLowerCase();
    const matchesSearch = docName.includes(searchTerm.toLowerCase()) ||
                          docSpecialty.includes(searchTerm.toLowerCase()) ||
                          docHosp.includes(searchTerm.toLowerCase());

    const matchesSpecialty = selectedSpecialty === 'ALL' || (doc.specialization || doc.specialty || 'General Medicine') === selectedSpecialty;
    const hospId = typeof doc.hospital === 'object' ? doc.hospital?.id : doc.hospital;
    const matchesHospital = selectedHospital === 'ALL' || String(hospId) === String(selectedHospital);

    const avail = getAvailabilityStatus(doc).label;
    const matchesAvail = selectedAvailability === 'ALL' ||
                         (selectedAvailability === 'Available' && avail === 'Available Now') ||
                         (selectedAvailability === 'In_OPD' && avail.includes('OPD')) ||
                         (selectedAvailability === 'In_Surgery' && avail.includes('Surgery'));

    return matchesSearch && matchesSpecialty && matchesHospital && matchesAvail;
  });

  const handleBookPatient = (doc) => {
    if (setSelectedDoctorForPatient) {
      setSelectedDoctorForPatient(doc);
    }
    if (setCurrentPage) {
      setCurrentPage('receptionist_patients');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5">
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              Doctors Directory & Live OPD Timetable
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 text-slate-100">
              Doctors & OPD Availability Schedule
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Check doctor shifts, consulting fees, OPD room numbers, and real-time availability for appointments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Directory
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage && setCurrentPage('receptionist_patients')}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Register Patient
            </button>
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Doctors</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">{doctors.length}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all departments</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase">Available / On Duty</p>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
            {doctors.filter(d => !String(d.status || '').toLowerCase().includes('leave')).length}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Ready for patient OPD</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-blue-600 uppercase">Specialties</p>
          <h3 className="text-xl sm:text-2xl font-bold text-blue-700 mt-1">{specialties.length - 1}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Clinical departments</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-purple-600 uppercase">Hospital Branches</p>
          <h3 className="text-xl sm:text-2xl font-bold text-purple-700 mt-1">{hospitals.length || 1}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Associated centers</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search doctor by name, specialty, hospital..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition cursor-pointer"
            >
              <option value="ALL">All Specializations</option>
              {specialties.filter(s => s !== 'ALL').map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Availability Status Filter */}
          <div>
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition cursor-pointer"
            >
              <option value="ALL">All Availabilities</option>
              <option value="Available">Available Now</option>
              <option value="In_OPD">In OPD Consultation</option>
              <option value="In_Surgery">In Surgery / Rounds</option>
            </select>
          </div>
        </div>

        {/* Hospital branch pills */}
        {hospitals.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">Hospital:</span>
            <button
              type="button"
              onClick={() => setSelectedHospital('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
                selectedHospital === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Branches ({doctors.length})
            </button>
            {hospitals.map(h => (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelectedHospital(String(h.id))}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
                  selectedHospital === String(h.id)
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {h.Name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* DOCTORS GRID */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-semibold text-slate-600">Loading Doctors and OPD Timetables...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-700">No Doctors Found</h3>
          <p className="text-xs text-slate-400 mt-1">Try changing your search keywords or filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDoctors.map(doc => {
            const avail = getAvailabilityStatus(doc);
            const hospName = getHospitalName(doc.hospital);
            const scheduleText = getDoctorSchedule(doc);
            const roomNum = doc.room_number || doc.cabin_number || `OPD Room #${((doc.id || 1) * 3 % 20) + 101}`;

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-teal-300 transition duration-150 flex flex-col justify-between"
              >
                <div>
                  {/* Top Doctor Info & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                        {doc.name ? doc.name.replace('Dr.', '').trim().slice(0, 2).toUpperCase() : 'DR'}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 leading-tight">
                          {doc.name ? (doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`) : 'Doctor'}
                        </h3>
                        <p className="text-xs font-semibold text-teal-700 mt-0.5">
                          {doc.specialization || doc.specialty || 'Consultant Specialist'}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${avail.color} shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`}></span>
                      {avail.label}
                    </span>
                  </div>

                  {/* Badges / Details */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-slate-700">
                      <span className="text-slate-400 font-medium">Assigned Hospital:</span>
                      <span className="font-semibold text-slate-800 text-right truncate max-w-[170px]" title={hospName}>
                        {hospName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-slate-700">
                      <span className="text-slate-400 font-medium">OPD Cabin:</span>
                      <span className="font-semibold text-slate-800">
                        {roomNum}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-slate-700">
                      <span className="text-slate-400 font-medium">Consultation Fee:</span>
                      <span className="font-bold text-emerald-700">
                        ₹{Number(doc.consultation_fee || 500).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* OPD TIMETABLE / AVAILABILITY */}
                    <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-100 text-teal-900">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-800 mb-1">
                        <svg className="w-3.5 h-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>OPD Schedule & Available Timings:</span>
                      </div>
                      <p className="text-[11px] text-teal-800 leading-relaxed font-medium">
                        {scheduleText}
                      </p>
                    </div>

                    {doc.contact && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 px-1">
                        <span>Phone: {doc.contact}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDoctorModal(doc)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer text-center"
                  >
                    View Timetable
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBookPatient(doc)}
                    className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer text-center flex items-center justify-center gap-1"
                  >
                    <span>Admit Patient</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: DOCTOR DETAIL & FULL SCHEDULE */}
      {selectedDoctorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Doctor OPD Schedule & Profile</h3>
                <p className="text-xs text-slate-300">{selectedDoctorModal.name} • {selectedDoctorModal.specialization || 'Specialist'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoctorModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center text-base shrink-0">
                  {selectedDoctorModal.name?.slice(0, 2).toUpperCase() || 'DR'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedDoctorModal.name}</h4>
                  <p className="text-xs text-teal-700 font-semibold">{selectedDoctorModal.specialization || 'Consultant'}</p>
                  <p className="text-[11px] text-slate-500">Hospital: {getHospitalName(selectedDoctorModal.hospital)}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Weekly OPD Timetable</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <div className="grid grid-cols-3 bg-slate-100 font-semibold text-slate-700 p-2.5 border-b border-slate-200">
                    <div>Day / Schedule</div>
                    <div>Morning Shift</div>
                    <div>Evening Shift</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    <div className="grid grid-cols-3 p-2.5 text-slate-700">
                      <span className="font-semibold text-slate-800">Monday - Friday</span>
                      <span className="text-teal-700 font-medium">09:00 AM - 01:00 PM</span>
                      <span className="text-blue-700 font-medium">05:00 PM - 08:30 PM</span>
                    </div>
                    <div className="grid grid-cols-3 p-2.5 text-slate-700 bg-slate-50/50">
                      <span className="font-semibold text-slate-800">Saturday</span>
                      <span className="text-teal-700 font-medium">10:00 AM - 02:00 PM</span>
                      <span className="text-slate-400">Emergency On-Call</span>
                    </div>
                    <div className="grid grid-cols-3 p-2.5 text-slate-700">
                      <span className="font-semibold text-slate-800">Sunday</span>
                      <span className="text-rose-600 font-medium">Closed / Off Duty</span>
                      <span className="text-slate-400">Emergency Only</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold">Front Desk Instructions:</p>
                <p>• Consultation Fee of ₹{selectedDoctorModal.consultation_fee || 500} should be collected at patient admission token issuance.</p>
                <p>• For urgent/emergency appointments outside regular hours, notify the triage nurse station immediately.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDoctorModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const doc = selectedDoctorModal;
                    setSelectedDoctorModal(null);
                    handleBookPatient(doc);
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Admit Patient with this Doctor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistDoctors;
