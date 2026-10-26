import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';
import ActiveFilterTags from '../Common/ActiveFilterTags';

const extractArray = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  if (Array.isArray(resData.data)) return resData.data;
  return [];
};

// Strict isolation helper for receptionist's hospital doctors
const isDoctorInHospital = (doc, targetHospId, targetHospName = '', hospList = []) => {
  if (!doc) return false;

  let targetId = targetHospId && !isNaN(Number(targetHospId)) ? Number(targetHospId) : null;
  let targetName = (targetHospName || '').toString().toLowerCase().trim();

  // If targetId is provided but targetName isn't, resolve from hospList
  if (targetId && !targetName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => Number(h.id) === targetId);
    if (matched) targetName = (matched.Name || matched.name || '').toLowerCase().trim();
  } else if (!targetId && targetName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === targetName);
    if (matched) targetId = Number(matched.id);
  }

  // If receptionist's hospital cannot be resolved, strictly return false (NO LEAKS)
  if (!targetId && !targetName) return false;

  // 1. Check array of hospitals if doctor has multiple branches
  if (Array.isArray(doc.hospitals) && doc.hospitals.length > 0) {
    const matchedInArray = doc.hospitals.some(h => {
      const hId = typeof h === 'object' && h !== null ? (h.id || h.hospital_id) : h;
      const hN = typeof h === 'object' && h !== null ? (h.Name || h.name || '') : (typeof h === 'string' ? h : '');
      if (targetId && hId && Number(hId) === targetId) return true;
      if (targetName && hN && hN.toString().toLowerCase().trim() === targetName) return true;
      return false;
    });
    if (matchedInArray) return true;
  }

  // 2. Resolve Doctor's raw hospital value
  const rawHosp = typeof doc.hospital === 'object' && doc.hospital !== null 
    ? (doc.hospital.id || doc.hospital.hospital_id || doc.hospital.Name || doc.hospital.name) 
    : doc.hospital;
  const rawHospName = doc.hospital_name || (typeof doc.hospital === 'object' && doc.hospital !== null ? (doc.hospital.Name || doc.hospital.name) : '') || '';

  let docHospId = null;
  let docHospName = '';

  if (rawHosp && !isNaN(Number(rawHosp)) && Number(rawHosp) > 0) {
    docHospId = Number(rawHosp);
    if (Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => Number(h.id) === docHospId);
      if (matched) docHospName = (matched.Name || matched.name || '').toLowerCase().trim();
    }
  } else if (rawHosp && typeof rawHosp === 'string' && rawHosp.trim() !== '') {
    const cleanRaw = rawHosp.trim().toLowerCase();
    if (Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === cleanRaw);
      if (matched) {
        docHospId = Number(matched.id);
        docHospName = (matched.Name || matched.name || '').toLowerCase().trim();
      } else {
        docHospName = cleanRaw;
      }
    } else {
      docHospName = cleanRaw;
    }
  }

  if (!docHospName && rawHospName && rawHospName.trim() !== '') {
    const cleanRawName = rawHospName.trim().toLowerCase();
    if (Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === cleanRawName);
      if (matched) {
        if (!docHospId) docHospId = Number(matched.id);
        docHospName = (matched.Name || matched.name || '').toLowerCase().trim();
      } else {
        docHospName = cleanRawName;
      }
    } else {
      docHospName = cleanRawName;
    }
  }

  if (!docHospId && !docHospName) return false;

  // Direct ID match
  if (targetId && docHospId && targetId === docHospId) return true;

  // Direct Name match
  if (targetName && docHospName && targetName === docHospName) return true;

  // Cross match via hospital list
  if (targetId && docHospName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === docHospName);
    if (matched && Number(matched.id) === targetId) return true;
  }
  if (targetName && docHospId && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => Number(h.id) === docHospId);
    if (matched && (matched.Name || matched.name || '').toLowerCase().trim() === targetName) return true;
  }

  // Distinctive keyword match (e.g., "Apollo Hospital" vs "Apollo")
  if (targetName && docHospName) {
    const cleanTarget = targetName.replace(/hospital|hospitals|care|clinic|super|speciality|specialty/gi, '').trim();
    const cleanDocHosp = docHospName.replace(/hospital|hospitals|care|clinic|super|speciality|specialty/gi, '').trim();
    if (cleanTarget.length >= 3 && cleanDocHosp.length >= 3) {
      if (cleanTarget.includes(cleanDocHosp) || cleanDocHosp.includes(cleanTarget)) {
        return true;
      }
    }
  }

  return false;
};

const ReceptionistDoctors = ({ currentUser, setCurrentPage, setSelectedDoctorForPatient }) => {
  const [doctors, setDoctors] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDoctorModal, setSelectedDoctorModal] = useState(null);

  const shiftsList = [
    'Morning First Shift',
    'Afternoon Second Shift',
    'Evening Third Shift'
  ];

  const fetchHospitalDoctors = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      // Check stored user in localStorage as backup
      let storedUser = null;
      try {
        const rawStored = localStorage.getItem('currentUser');
        if (rawStored) storedUser = JSON.parse(rawStored);
      } catch (e) {}

      const activeUser = currentUser || storedUser || {};
      const email = (activeUser.email || '').toLowerCase().trim();
      const recId = activeUser.id;

      const [hospRes, recRes, docRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`)
      ]);

      let loadedHospitals = [];
      if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
        const hData = await hospRes.value.json().catch(() => []);
        loadedHospitals = extractArray(hData);
        setHospitalsList(loadedHospitals);
      }

      let currentRec = null;
      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const rData = await recRes.value.json().catch(() => []);
        const recs = extractArray(rData);
        currentRec = recs.find(r =>
          (r.email && r.email.toLowerCase().trim() === email) ||
          (recId && Number(r.id) === Number(recId)) ||
          (r.name && r.name.toLowerCase().trim() === (activeUser.name || '').toLowerCase().trim())
        );
      }

      // Resolve receptionist's hospital target ID & Name
      let targetHospId = currentRec?.hospital
        ? (typeof currentRec.hospital === 'object' ? currentRec.hospital.id : currentRec.hospital)
        : (typeof activeUser.hospital === 'object' ? activeUser.hospital.id : activeUser.hospital);

      if (!targetHospId && activeUser.hospital_id) {
        targetHospId = activeUser.hospital_id;
      }
      if (!targetHospId && activeUser.hospital_data) {
        targetHospId = activeUser.hospital_data.id || activeUser.hospital_data.hospital_id;
      }

      let targetHospName = currentRec?.hospital_name || activeUser.hospital_name || '';

      let foundHosp = null;
      if (targetHospId && loadedHospitals.length > 0) {
        foundHosp = loadedHospitals.find(h => Number(h.id) === Number(targetHospId));
      }
      if (!foundHosp && (targetHospName || activeUser.hospital_name)) {
        const hName = (targetHospName || activeUser.hospital_name).toLowerCase().trim();
        foundHosp = loadedHospitals.find(h => (h.Name || h.name || '').toLowerCase().trim() === hName);
        if (foundHosp) targetHospId = foundHosp.id;
      }
      if (!foundHosp && email) {
        const savedHospId = localStorage.getItem(`user_hospital_${email}`);
        if (savedHospId) {
          foundHosp = loadedHospitals.find(h => Number(h.id) === Number(savedHospId));
          if (foundHosp) targetHospId = foundHosp.id;
        }
      }
      if (!foundHosp) {
        const savedAnyHospId = localStorage.getItem('user_hospital');
        if (savedAnyHospId) {
          foundHosp = loadedHospitals.find(h => Number(h.id) === Number(savedAnyHospId));
          if (foundHosp) targetHospId = foundHosp.id;
        }
      }
      if (!foundHosp) {
        const checkStr = `${email} ${activeUser.name || ''} ${currentRec?.name || ''}`.toLowerCase();
        foundHosp = loadedHospitals.find(h => {
          const hn = (h.Name || h.name || '').toLowerCase().trim();
          const cleanHn = hn.replace(/hospital|hospitals|care|clinic|super|speciality|specialty/gi, '').trim();
          return cleanHn.length >= 3 && checkStr.includes(cleanHn);
        });
        if (foundHosp) targetHospId = foundHosp.id;
      }

      if (foundHosp) {
        setHospitalInfo(foundHosp);
        targetHospId = foundHosp.id;
        targetHospName = foundHosp.Name || foundHosp.name || '';
        try {
          if (email) localStorage.setItem(`user_hospital_${email}`, String(foundHosp.id));
          localStorage.setItem('user_hospital', String(foundHosp.id));
          localStorage.setItem('user_hospital_name', targetHospName);
        } catch (e) {}
      }

      let allDoctors = [];
      if (docRes.status === 'fulfilled' && docRes.value.ok) {
        const dData = await docRes.value.json().catch(() => []);
        allDoctors = extractArray(dData);
      }

      // STRICT HOSPITAL ISOLATION: Only include doctors belonging to this receptionist's hospital
      // If target hospital is identified, filter strictly. If unknown, DO NOT LEAK other hospital doctors!
      const hospitalDoctors = (targetHospId || targetHospName)
        ? allDoctors.filter(d => isDoctorInHospital(d, targetHospId, targetHospName, loadedHospitals))
        : [];

      setDoctors(hospitalDoctors);
    } catch (err) {
      console.error('Error fetching receptionist doctors:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchHospitalDoctors(false);

    // Auto-sync polling every 4 seconds for real-time doctor roster updates
    const pollInterval = setInterval(() => {
      if (isMounted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchHospitalDoctors(true);
      }
    }, 4000);

    const handleFocus = () => {
      if (isMounted) fetchHospitalDoctors(true);
    };
    const handleVisibility = () => {
      if (isMounted && document.visibilityState === 'visible') fetchHospitalDoctors(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser]);

  const cleanHospitalName = (name) => {
    if (!name || typeof name !== 'string') return '-';
    let cleaned = name
      .replace(/[\s,.-]+(international|intl\.?|branch|campus|super speciality|super specialty)[\s,.-]*$/i, '')
      .replace(/\b(international|intl\.?)\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/[\s,.-]+$/, '')
      .trim();
    return cleaned || '-';
  };

  const getHospitalName = (hospVal, doc) => {
    let raw = '';
    if (doc?.hospital_name) {
      raw = doc.hospital_name;
    } else if (doc?.hospital_names && Array.isArray(doc.hospital_names) && doc.hospital_names.length > 0) {
      const first = doc.hospital_names[0];
      raw = typeof first === 'object' && first !== null ? (first.name || first.Name || '') : String(first);
    } else if (hospVal) {
      const hospId = typeof hospVal === 'object' && hospVal !== null ? hospVal.id : hospVal;
      const match = hospitalsList.find(h => Number(h.id) === Number(hospId));
      raw = match?.Name || match?.name || (typeof hospVal === 'object' ? (hospVal.Name || hospVal.name) : '') || '';
    }
    if (!raw) {
      raw = hospitalInfo?.Name || hospitalInfo?.name || currentUser?.hospital_name || '';
    }
    return cleanHospitalName(raw);
  };

  const filteredDoctors = doctors.filter((doc) => {
    const term = searchTerm.toLowerCase().trim();
    const docName = (doc.name || '').toLowerCase();
    const docSpec = (doc.specialization || doc.specialty || '').toLowerCase();
    const docDept = (doc.department || doc.dept || '').toLowerCase();
    const docId = String(doc.id || doc.doctor_id || '').toLowerCase();
    const matchesSearch = !term || docName.includes(term) || docSpec.includes(term) || docDept.includes(term) || docId.includes(term);

    const dShift = doc.Shifts || doc.shift || '';
    const matchesShift = shiftFilter === 'ALL' || dShift === shiftFilter;

    const dStatus = String(doc.status || doc.duty_status || '').toLowerCase();
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'On_Duty' && (!dStatus.includes('off') && !dStatus.includes('leave') && doc.is_active !== false)) ||
      (statusFilter === 'Off_Duty' && (dStatus.includes('off') || dStatus.includes('leave') || doc.is_active === false));

    return matchesSearch && matchesShift && matchesStatus;
  });

  const onDutyCount = doctors.filter(d => !String(d.status || d.duty_status || '').toLowerCase().includes('off') && !String(d.status || '').toLowerCase().includes('leave') && d.is_active !== false).length;
  const offDutyCount = doctors.length - onDutyCount;
  const hospitalDisplayName = hospitalInfo?.Name || hospitalInfo?.name || currentUser?.hospital_name || 'Hospital Branch';

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-8 space-y-4 sm:space-y-6">
      {/* HEADER BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Medical Staff & Duty Schedule • {hospitalDisplayName}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Hospital Doctors Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Showing medical staff and consulting doctors assigned exclusively to <strong>{hospitalDisplayName}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchHospitalDoctors(false)}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
              title="Refresh database records"
            >
              <span className={refreshing ? 'animate-spin' : ''}>↻</span>
              <span>{refreshing ? 'Syncing...' : 'Refresh Roster'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Hospital Doctors</p>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{doctors.length}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{hospitalDisplayName} roster</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-2xs bg-gradient-to-br from-emerald-50/40 to-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Doctors On Duty</p>
          <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{onDutyCount}</h3>
          <p className="text-xs text-emerald-700/80 mt-0.5 font-medium">Available for appointments</p>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-2xs bg-gradient-to-br from-rose-50/40 to-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Off Duty / On Leave</p>
          <h3 className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">{offDutyCount}</h3>
          <p className="text-xs text-rose-700/80 mt-0.5 font-medium">Currently off shift</p>
        </div>

        <div className="bg-white rounded-2xl border border-sky-200 p-4 shadow-2xs bg-gradient-to-br from-sky-50/40 to-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800">Specializations</p>
          <h3 className="text-2xl sm:text-3xl font-black text-sky-700 mt-1">
            {new Set(doctors.map(d => d.specialization || d.specialty).filter(Boolean)).size || (doctors.length > 0 ? 1 : 0)}
          </h3>
          <p className="text-xs text-sky-700/80 mt-0.5 font-medium">Clinical departments</p>
        </div>
      </div>

      {/* FILTER & TABLE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Assigned Doctors List</h2>
            <p className="text-xs text-slate-500">
              Doctors assigned strictly to <strong>{hospitalDisplayName}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              placeholder="Search doctor name, specialty, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white sm:w-64"
            />

            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Shifts</option>
              {shiftsList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="On_Duty">On Duty</option>
              <option value="Off_Duty">Off Duty</option>
            </select>
          </div>
        </div>

        {/* ACTIVE FILTER TAGS */}
        <ActiveFilterTags
          filters={[
            {
              key: 'searchTerm',
              name: 'Search',
              value: searchTerm,
              onRemove: () => setSearchTerm('')
            },
            {
              key: 'shiftFilter',
              name: 'Shift',
              value: shiftFilter,
              onRemove: () => setShiftFilter('ALL')
            },
            {
              key: 'statusFilter',
              name: 'Status',
              value: statusFilter,
              displayValue: statusFilter === 'On_Duty' ? 'On Duty' : statusFilter === 'Off_Duty' ? 'Off Duty' : statusFilter,
              onRemove: () => setStatusFilter('ALL')
            }
          ]}
          onClearAll={() => {
            setSearchTerm('');
            setShiftFilter('ALL');
            setStatusFilter('ALL');
          }}
        />

        {/* TABLE */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-slate-600 min-w-[850px]">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] tracking-wider rounded-lg">
              <tr>
                <th className="py-3 px-3">Doctor ID</th>
                <th className="py-3 px-3">Doctor Name</th>
                <th className="py-3 px-3">Assigned Hospital</th>
                <th className="py-3 px-3">Consultation Fee</th>
                <th className="py-3 px-3">Shift</th>
                <th className="py-3 px-3">Duty Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p>Loading doctors for {hospitalDisplayName}...</p>
                  </td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    {searchTerm
                      ? 'No doctors found matching search criteria.'
                      : `No doctors found assigned to ${hospitalDisplayName}. Only doctors of this hospital are displayed here.`}
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc, idx) => {
                  const hospName = getHospitalName(doc.hospital, doc);
                  const shift = doc.Shifts || doc.shift || doc.shift_time || doc.duty_shift || doc.opd_timings || '-';
                  const fee = doc.consultation_fee !== null && doc.consultation_fee !== undefined && doc.consultation_fee !== '' ? `₹${Number(doc.consultation_fee).toFixed(0)}` : '-';
                  const isOnDuty = !String(doc.status || doc.duty_status || '').toLowerCase().includes('off') && !String(doc.status || '').toLowerCase().includes('leave') && doc.is_active !== false;

                  return (
                    <tr key={doc.id || idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-mono font-bold text-amber-800">
                        {doc.doctor_id || (doc.id ? `DOC-${doc.id}` : '-')}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {doc.name || '-'}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {hospName}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-700">
                        {fee}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {shift}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                          isOnDuty
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {isOnDuty ? 'On Duty' : 'Off Duty'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedDoctorModal(doc)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          Show Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER NOTE */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredDoctors.length} doctor(s) assigned to {hospitalDisplayName}</span>
          <span className="text-[11px] font-semibold text-emerald-700">Strict hospital branch isolation active</span>
        </div>
      </div>

      {/* DOCTOR DETAILS MODAL */}
      {selectedDoctorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setSelectedDoctorModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 my-auto relative animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-black text-sm">
                  {selectedDoctorModal.name ? selectedDoctorModal.name.replace('Dr. ', '').charAt(0) : 'D'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {selectedDoctorModal.name || '-'}
                  </h3>
                  <p className="text-xs text-teal-600 font-semibold font-mono">
                    {selectedDoctorModal.doctor_id || (selectedDoctorModal.id ? `DOC-${selectedDoctorModal.id}` : '-')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoctorModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Department:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5">
                  {selectedDoctorModal.department || selectedDoctorModal.Department || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Specialization:</span>
                <span className="font-bold text-sky-700 text-sm mt-0.5">
                  {selectedDoctorModal.specialization || selectedDoctorModal.specialty || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Assigned Hospital:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5">
                  {getHospitalName(selectedDoctorModal.hospital, selectedDoctorModal)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Consultation Fee:</span>
                <span className="font-bold text-emerald-700 text-sm mt-0.5">
                  {selectedDoctorModal.consultation_fee !== null && selectedDoctorModal.consultation_fee !== undefined && selectedDoctorModal.consultation_fee !== '' ? `₹${Number(selectedDoctorModal.consultation_fee).toFixed(0)}` : '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Duty Shift / Timings:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5">
                  {selectedDoctorModal.Shifts || selectedDoctorModal.shift || selectedDoctorModal.shift_time || selectedDoctorModal.duty_shift || selectedDoctorModal.opd_timings || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Duty Status:</span>
                <span className="font-bold text-sm mt-0.5 inline-flex items-center gap-1">
                  {(!String(selectedDoctorModal.status || selectedDoctorModal.duty_status || '').toLowerCase().includes('off') && !String(selectedDoctorModal.status || '').toLowerCase().includes('leave') && selectedDoctorModal.is_active !== false) ? (
                    <span className="text-emerald-700 font-bold">● On Duty</span>
                  ) : (
                    <span className="text-rose-700 font-bold">○ Off Duty</span>
                  )}
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
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Qualification:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5">
                  {selectedDoctorModal.qualification || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-medium">Experience:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5">
                  {selectedDoctorModal.experience ? `${selectedDoctorModal.experience} Years` : '-'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDoctorModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistDoctors;
