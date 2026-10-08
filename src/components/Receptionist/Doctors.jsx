import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const extractArray = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.doctors)) return resData.doctors;
  if (Array.isArray(resData.rows)) return resData.rows;
  return [];
};

const isDoctorInHospital = (doc, targetHospId, targetHospName = '') => {
  if (!targetHospId && !targetHospName) return false;
  if (!doc) return false;

  const docHosp = typeof doc.hospital === 'object' && doc.hospital !== null ? doc.hospital.id : doc.hospital;

  if (targetHospId && !isNaN(Number(targetHospId))) {
    if (docHosp && !isNaN(Number(docHosp))) {
      return Number(docHosp) === Number(targetHospId);
    }
    if (Array.isArray(doc.hospitals) && doc.hospitals.length > 0) {
      return doc.hospitals.some(h => {
        const hId = typeof h === 'object' && h !== null ? h.id : h;
        return Number(hId) === Number(targetHospId);
      });
    }
    if (targetHospName) {
      const dHospName = (doc.hospital_name || (typeof doc.hospital === 'object' ? (doc.hospital?.Name || doc.hospital?.name) : '') || '').toLowerCase().trim();
      return dHospName === targetHospName.toLowerCase().trim() && dHospName !== '';
    }
    return false;
  }

  if (targetHospName && targetHospName.trim() !== '') {
    const dHospName = (doc.hospital_name || (typeof doc.hospital === 'object' ? (doc.hospital?.Name || doc.hospital?.name) : '') || '').toLowerCase().trim();
    return dHospName === targetHospName.toLowerCase().trim() && dHospName !== '';
  }

  return false;
};

const ReceptionistDoctors = ({ currentUser, setCurrentPage, setSelectedDoctorForPatient }) => {
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [selectedDoctorModal, setSelectedDoctorModal] = useState(null);

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const email = (currentUser?.email || '').toLowerCase().trim();
      const recId = currentUser?.id;

      const [docRes, hospRes, recRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Doctors/`),
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`)
      ]);

      let docData = [];
      let hospData = [];
      let recData = [];

      if (docRes.status === 'fulfilled' && docRes.value.ok) {
        const dJson = await docRes.value.json().catch(() => []);
        docData = extractArray(dJson);
      }
      if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
        const hJson = await hospRes.value.json().catch(() => []);
        hospData = extractArray(hJson);
      }
      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const rJson = await recRes.value.json().catch(() => []);
        recData = extractArray(rJson);
      }

      setHospitals(Array.isArray(hospData) ? hospData : []);

      // Determine Receptionist's assigned hospital
      let matchedRec = null;
      if (Array.isArray(recData)) {
        matchedRec = recData.find(r => 
          (r.email && r.email.toLowerCase().trim() === email) ||
          (recId && Number(r.id) === Number(recId)) ||
          (r.name && r.name.toLowerCase().trim() === (currentUser?.name || '').toLowerCase().trim())
        );
      }

      let userHospId = matchedRec?.hospital || currentUser?.hospital || (typeof currentUser?.hospital_data === 'object' ? currentUser?.hospital_data?.id : null);
      if (typeof userHospId === 'object' && userHospId !== null) {
        userHospId = userHospId.id || userHospId.hospital_id;
      }

      let matchedHosp = null;
      if (userHospId && Array.isArray(hospData)) {
        matchedHosp = hospData.find(h => Number(h.id) === Number(userHospId));
      }
      if (!matchedHosp && (currentUser?.hospital_name || matchedRec?.hospital_name)) {
        const hName = (currentUser?.hospital_name || matchedRec?.hospital_name).toLowerCase().trim();
        matchedHosp = hospData.find(h => (h.Name || h.name || '').toLowerCase().trim() === hName);
        if (matchedHosp) userHospId = matchedHosp.id;
      }
      if (!matchedHosp && email) {
        const savedHospId = localStorage.getItem(`user_hospital_${email}`);
        if (savedHospId) {
          matchedHosp = hospData.find(h => Number(h.id) === Number(savedHospId));
          if (matchedHosp) userHospId = matchedHosp.id;
        }
      }
      if (!matchedHosp) {
        const checkStr = `${email} ${currentUser?.name || ''} ${matchedRec?.name || ''}`.toLowerCase();
        matchedHosp = hospData.find(h => {
          const hn = (h.Name || h.name || '').toLowerCase().trim();
          return hn && checkStr.includes(hn);
        });
        if (matchedHosp) userHospId = matchedHosp.id;
      }

      setHospitalInfo(matchedHosp);
      const userHospName = matchedHosp?.Name || matchedHosp?.name || currentUser?.hospital_name || matchedRec?.hospital_name || '';

      // STRICT HOSPITAL FILTERING: Only doctors belonging to this receptionist's hospital
      const hospDocs = userHospId || userHospName
        ? docData.filter(d => isDoctorInHospital(d, userHospId, userHospName))
        : [];

      setDoctors(hospDocs);
    } catch (error) {
      console.error('Error fetching doctors data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHospitalName = (hospId) => {
    if (!hospId) return hospitalInfo?.Name || hospitalInfo?.name || '-';
    if (typeof hospId === 'object' && (hospId?.Name || hospId?.name)) return hospId.Name || hospId.name;
    const found = hospitals.find(h => Number(h.id) === Number(hospId));
    return found ? (found.Name || found.name) : (hospitalInfo?.Name || hospitalInfo?.name || '-');
  };

  const currentHospitalTitle = hospitalInfo?.Name || hospitalInfo?.name || currentUser?.hospital_name || 'Assigned Hospital Branch';

  const specialties = ['ALL', ...new Set(doctors.map(d => d.specialization || d.specialty || d.department || d.Department).filter(Boolean))];

  const filteredDoctors = doctors.filter(doc => {
    const docName = (doc.name || '').toLowerCase();
    const docSpecialty = (doc.specialization || doc.specialty || '').toLowerCase();
    const docDept = (doc.department || doc.departments || doc.Department || doc.dept || '').toLowerCase();
    const docHosp = getHospitalName(doc.hospital).toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = docName.includes(term) ||
                          docSpecialty.includes(term) ||
                          docDept.includes(term) ||
                          docHosp.includes(term);

    const docSpecOrDept = doc.specialization || doc.specialty || doc.department || doc.Department || '';
    const matchesSpecialty = selectedSpecialty === 'ALL' || docSpecOrDept === selectedSpecialty;

    return matchesSearch && matchesSpecialty;
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
              {currentHospitalTitle} • Medical Directory
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 text-slate-100">
              Doctors
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Doctor directory, departments, specializations, consultation fees, and profile details for {currentHospitalTitle}.
            </p>
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Hospital Doctors</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">{doctors.length}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{currentHospitalTitle}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase">Working / On Duty</p>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
            {doctors.filter(d => !String(d.status || d.duty_status || '').toLowerCase().includes('off') && !String(d.status || '').toLowerCase().includes('leave')).length}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Available for consultations</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-blue-600 uppercase">Departments</p>
          <h3 className="text-xl sm:text-2xl font-bold text-blue-700 mt-1">
            {new Set(doctors.map(d => d.department || d.departments || d.Department || d.specialization || d.specialty).filter(Boolean)).size}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Active clinical specialties</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-teal-600 uppercase">Current Facility</p>
          <h3 className="text-sm font-bold text-slate-800 mt-1 truncate" title={currentHospitalTitle}>{currentHospitalTitle}</h3>
          <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">✓ Branch locked</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search doctor by name, department, specialization..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition"
            />
          </div>

          {/* Department / Specialization Filter */}
          <div>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition cursor-pointer"
            >
              <option value="ALL">All Specializations & Departments</option>
              {specialties.filter(s => s !== 'ALL').map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE FORMAT: DOCTORS DIRECTORY */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              Doctors Directory ({filteredDoctors.length})
            </h2>
            <p className="text-xs text-slate-500">Live roster of medical doctors registered at this hospital</p>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[800px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Doctor ID</th>
                <th className="py-3 px-3">Doctor Name</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Specialization</th>
                <th className="py-3 px-3">Assigned Hospital</th>
                <th className="py-3 px-3">Consultation Fee</th>
                <th className="py-3 px-3">Shift</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">Loading doctor directory...</td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-semibold">
                    No doctors found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc, idx) => {
                  const hospName = getHospitalName(doc.hospital);
                  const dept = doc.department || doc.departments || doc.Department || doc.dept || '-';
                  const specialty = doc.specialization || doc.specialty || '-';
                  const shift = doc.shift || doc.shift_time || doc.duty_shift || '-';
                  const fee = doc.consultation_fee ? `₹${Number(doc.consultation_fee).toFixed(0)}` : '-';

                  return (
                    <tr key={doc.id || idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-mono font-bold text-teal-800">
                        {doc.id ? `DOC-${doc.id}` : '-'}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        <div className="text-sm font-bold text-slate-800">
                          {doc.name ? (doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`) : '-'}
                        </div>
                        {doc.email && <div className="text-[10px] text-slate-400">{doc.email}</div>}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {dept}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">
                          {specialty}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {hospName}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-700">
                        {fee}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {shift}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDoctorModal(doc)}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                          >
                            Show Details
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBookPatient(doc)}
                            className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                            title="Assign to new patient admission"
                          >
                            + Admit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP MODAL: DOCTOR COMPLETE PROFILE & DETAILS */}
      {selectedDoctorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Doctor Profile & Information</h3>
                <p className="text-xs text-slate-300">
                  {selectedDoctorModal.id ? `DOC-${selectedDoctorModal.id}` : ''} • {selectedDoctorModal.name}
                </p>
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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-600 to-blue-600 text-white font-bold flex items-center justify-center text-base shrink-0">
                  {selectedDoctorModal.name ? selectedDoctorModal.name.replace('Dr.', '').trim().slice(0, 2).toUpperCase() : 'DR'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {selectedDoctorModal.name ? (selectedDoctorModal.name.startsWith('Dr.') ? selectedDoctorModal.name : `Dr. ${selectedDoctorModal.name}`) : '-'}
                  </h4>
                  <p className="text-xs text-teal-700 font-semibold">{selectedDoctorModal.specialization || selectedDoctorModal.specialty || '-'}</p>
                  <p className="text-[11px] text-slate-500">Hospital: {getHospitalName(selectedDoctorModal.hospital)}</p>
                </div>
              </div>

              {/* DETAILS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block font-medium">Doctor ID:</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedDoctorModal.id ? `DOC-${selectedDoctorModal.id}` : '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block font-medium">Doctor Name:</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedDoctorModal.name || '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block font-medium">Department:</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedDoctorModal.department || selectedDoctorModal.departments || selectedDoctorModal.Department || selectedDoctorModal.dept || '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block font-medium">Specialization:</span>
                  <span className="font-bold text-teal-800 text-sm mt-0.5">
                    {selectedDoctorModal.specialization || selectedDoctorModal.specialty || '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block font-medium">Consultation Fee:</span>
                  <span className="font-bold text-emerald-700 text-sm mt-0.5">
                    {selectedDoctorModal.consultation_fee ? `₹${Number(selectedDoctorModal.consultation_fee).toFixed(0)}` : '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block font-medium">Duty Shift / Timings:</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedDoctorModal.shift || selectedDoctorModal.shift_time || selectedDoctorModal.duty_shift || '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block font-medium">Contact Phone:</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedDoctorModal.phone || selectedDoctorModal.contact || '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block font-medium">Email Address:</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 truncate block" title={selectedDoctorModal.email}>
                    {selectedDoctorModal.email || '-'}
                  </span>
                </div>
              </div>

              {/* ADDITIONAL SKILLS & BIO */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-400 block font-medium">Additional Skills & Qualifications:</span>
                <p className="font-semibold text-slate-800 mt-1 leading-relaxed">
                  {selectedDoctorModal.additional_skills || selectedDoctorModal.skills || selectedDoctorModal.qualification || selectedDoctorModal.bio || selectedDoctorModal.experience || '-'}
                </p>
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
