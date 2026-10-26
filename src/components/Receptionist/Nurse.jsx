import { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../Api/Api';
import ActiveFilterTags from '../Common/ActiveFilterTags';

// Helper: Safely extract array from diverse backend response shapes
const extractArray = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.nurses)) return resData.nurses;
  return [];
};

const isNurseOnDuty = (nurse) => {
  if (!nurse) return false;
  if (nurse.is_active === false || nurse.is_active === 'false') return false;
  const st = (nurse.status || '').toString().toLowerCase().trim();
  if (st.includes('off') || st.includes('leave') || st === 'inactive' || st === 'false') return false;
  return true;
};

// Strict hospital isolation helper: ensures nurse strictly belongs to target hospital
const isNurseInHospital = (nurse, targetHospId, targetHospName = '', hospList = []) => {
  if (!nurse) return false;

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

  // Resolve Nurse's raw hospital value
  const rawHosp = typeof nurse.hospital === 'object' && nurse.hospital !== null
    ? (nurse.hospital.id || nurse.hospital.hospital_id || nurse.hospital.Name || nurse.hospital.name)
    : nurse.hospital;
  const rawHospName = nurse.hospital_name || (typeof nurse.hospital === 'object' && nurse.hospital !== null ? (nurse.hospital.Name || nurse.hospital.name) : '') || '';

  let nurseHospId = null;
  let nurseHospName = '';

  if (rawHosp && !isNaN(Number(rawHosp)) && Number(rawHosp) > 0) {
    nurseHospId = Number(rawHosp);
    if (Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => Number(h.id) === nurseHospId);
      if (matched) nurseHospName = (matched.Name || matched.name || '').toLowerCase().trim();
    }
  } else if (rawHosp && typeof rawHosp === 'string' && rawHosp.trim() !== '') {
    const cleanRaw = rawHosp.trim().toLowerCase();
    if (Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === cleanRaw);
      if (matched) {
        nurseHospId = Number(matched.id);
        nurseHospName = (matched.Name || matched.name || '').toLowerCase().trim();
      } else {
        nurseHospName = cleanRaw;
      }
    } else {
      nurseHospName = cleanRaw;
    }
  }

  if (!nurseHospName && rawHospName && rawHospName.trim() !== '') {
    const cleanRawName = rawHospName.trim().toLowerCase();
    if (Array.isArray(hospList) && hospList.length > 0) {
      const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === cleanRawName);
      if (matched) {
        if (!nurseHospId) nurseHospId = Number(matched.id);
        nurseHospName = (matched.Name || matched.name || '').toLowerCase().trim();
      } else {
        nurseHospName = cleanRawName;
      }
    } else {
      nurseHospName = cleanRawName;
    }
  }

  if (!nurseHospId && !nurseHospName) return false;

  // Direct ID match
  if (targetId && nurseHospId && targetId === nurseHospId) return true;

  // Direct Name match
  if (targetName && nurseHospName && targetName === nurseHospName) return true;

  // Cross match via hospital list
  if (targetId && nurseHospName && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => (h.Name || h.name || '').toLowerCase().trim() === nurseHospName);
    if (matched && Number(matched.id) === targetId) return true;
  }
  if (targetName && nurseHospId && Array.isArray(hospList) && hospList.length > 0) {
    const matched = hospList.find(h => Number(h.id) === nurseHospId);
    if (matched && (matched.Name || matched.name || '').toLowerCase().trim() === targetName) return true;
  }

  // Distinctive keyword match (e.g., "Apollo Hospital" vs "Apollo")
  if (targetName && nurseHospName) {
    const cleanTarget = targetName.replace(/hospital|hospitals|care|clinic|super|speciality|specialty/gi, '').trim();
    const cleanNurseHosp = nurseHospName.replace(/hospital|hospitals|care|clinic|super|speciality|specialty/gi, '').trim();
    if (cleanTarget.length >= 3 && cleanNurseHosp.length >= 3) {
      if (cleanTarget.includes(cleanNurseHosp) || cleanNurseHosp.includes(cleanTarget)) {
        return true;
      }
    }
  }

  return false;
};

const ReceptionistNurse = ({ currentUser, setCurrentPage }) => {
  const [nurses, setNurses] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [dutyFilter, setDutyFilter] = useState('ALL'); // 'ALL' | 'ON_DUTY' | 'OFF_DUTY'

  // Selected Nurse Modal
  const [selectedNurseModal, setSelectedNurseModal] = useState(null);

  const wardsList = [
    'General Ward',
    'ICU',
    'NICU',
    'Emergency Ward',
    'Operation Theatre',
    'OPD'
  ];

  const shiftsList = [
    'Morning First Shift',
    'Afternoon Second Shift',
    'Evening Third Shift'
  ];

  const rolesList = [
    'Head Nurse',
    'Staff Nurse'
  ];

  const fetchHospitalNurses = async (silent = false) => {
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

      const [hospRes, recRes, nurseRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`)
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

      let allNurses = [];
      if (nurseRes.status === 'fulfilled' && nurseRes.value.ok) {
        const nData = await nurseRes.value.json().catch(() => []);
        allNurses = extractArray(nData);
      }

      // STRICT HOSPITAL ISOLATION: Only include nurses belonging to this receptionist's hospital
      const hospitalNurses = (targetHospId || targetHospName)
        ? allNurses.filter(n => isNurseInHospital(n, targetHospId, targetHospName, loadedHospitals))
        : [];

      setNurses(hospitalNurses);
    } catch (err) {
      console.error('Error fetching receptionist nurses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchHospitalNurses(false);

    // Auto-sync polling every 4 seconds for real-time duty roster updates
    const pollInterval = setInterval(() => {
      if (isMounted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchHospitalNurses(true);
      }
    }, 4000);

    const handleFocus = () => {
      if (isMounted) fetchHospitalNurses(true);
    };
    const handleVisibility = () => {
      if (isMounted && document.visibilityState === 'visible') fetchHospitalNurses(true);
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

  const hospitalName = hospitalInfo?.Name || hospitalInfo?.name || currentUser?.hospital_name || 'Hospital Branch';

  // KPI Metrics Calculation
  const { totalCount, onDutyCount, offDutyCount, criticalWardCount, headNurseCount } = useMemo(() => {
    let onDuty = 0;
    let offDuty = 0;
    let critical = 0;
    let head = 0;

    nurses.forEach(n => {
      const activeDuty = isNurseOnDuty(n);
      if (activeDuty) onDuty++;
      else offDuty++;

      const ward = (n.ward || '').toUpperCase();
      if (ward.includes('ICU') || ward.includes('EMERGENCY') || ward.includes('NICU') || ward.includes('OPERATION')) {
        critical++;
      }

      const role = (n.role || n.nurse_role || '').toLowerCase();
      if (role.includes('head')) {
        head++;
      }
    });

    return {
      totalCount: nurses.length,
      onDutyCount: onDuty,
      offDutyCount: offDuty,
      criticalWardCount: critical,
      headNurseCount: head
    };
  }, [nurses]);

  // Filtered Nurses
  const filteredNurses = useMemo(() => {
    return nurses.filter(nurse => {
      // 1. Search Query
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase().trim();
        const name = (nurse.name || '').toLowerCase();
        const nurseId = (nurse.nurse_id || `NUR-${nurse.id || ''}`).toLowerCase();
        const ward = (nurse.ward || '').toLowerCase();
        const contact = (nurse.contact || nurse.phone || '').toLowerCase();
        const email = (nurse.email || '').toLowerCase();
        const role = (nurse.role || nurse.nurse_role || '').toLowerCase();

        const matches = name.includes(query) ||
          nurseId.includes(query) ||
          ward.includes(query) ||
          contact.includes(query) ||
          email.includes(query) ||
          role.includes(query);

        if (!matches) return false;
      }

      // 2. Ward Filter
      if (wardFilter !== 'ALL') {
        const ward = (nurse.ward || '').toLowerCase().trim();
        if (ward !== wardFilter.toLowerCase().trim()) return false;
      }

      // 3. Shift Filter
      if (shiftFilter !== 'ALL') {
        const shift = (nurse.shift || '').toLowerCase().trim();
        if (shift !== shiftFilter.toLowerCase().trim()) return false;
      }

      // 4. Role Filter
      if (roleFilter !== 'ALL') {
        const role = (nurse.role || nurse.nurse_role || '').toLowerCase().trim();
        if (role !== roleFilter.toLowerCase().trim()) return false;
      }

      // 5. Duty Status Filter
      const isOnDuty = isNurseOnDuty(nurse);
      if (dutyFilter === 'ON_DUTY' && !isOnDuty) return false;
      if (dutyFilter === 'OFF_DUTY' && isOnDuty) return false;

      return true;
    });
  }, [nurses, searchTerm, wardFilter, shiftFilter, roleFilter, dutyFilter]);

  const getInitials = (name) => {
    if (!name) return 'NU';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. HEADER SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold border border-amber-400/30">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                Hospital Nursing Roster
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700">
                {hospitalName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2.5 tracking-tight text-slate-100">
              Hospital Nurses Directory
            </h1>
          </div>
        </div>
      </div>

      {/* 2. STATS KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* TOTAL NURSES */}
        <div
          onClick={() => setDutyFilter('ALL')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition duration-150 cursor-pointer shadow-xs ${
            dutyFilter === 'ALL'
              ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-50/20'
              : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Branch Staff
            </span>
            <span className="text-amber-500 text-xs font-bold">Total</span>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3">Total Nurses</p>
          <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalCount}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Assigned to {hospitalName}</p>
        </div>

        {/* ON DUTY */}
        <div
          onClick={() => setDutyFilter(dutyFilter === 'ON_DUTY' ? 'ALL' : 'ON_DUTY')}
          className={`p-4 sm:p-5 rounded-2xl bg-white border transition duration-150 cursor-pointer shadow-xs ${
            dutyFilter === 'ON_DUTY'
              ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/40'
              : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Active / Ready
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mt-3">Duty Status</p>
          <h3 className="text-2xl font-black text-emerald-700 mt-0.5">{onDutyCount} <span className="text-xs text-slate-500 font-normal">/ {totalCount} On Duty</span></h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            <span className="text-emerald-700 font-bold">{onDutyCount} On Duty</span> • <span className="text-rose-600 font-bold">{offDutyCount} Off Duty</span>
          </p>
        </div>

        {/* CRITICAL WARDS (ICU/NICU/EMERGENCY) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
              Critical Care
            </span>
            <span className="text-rose-500 text-xs font-bold">ICU / ER</span>
          </div>
          <p className="text-xs font-bold text-rose-800 uppercase tracking-wider mt-3">ICU & Emergency Wards</p>
          <h3 className="text-2xl font-black text-rose-700 mt-0.5">{criticalWardCount}</h3>
          <p className="text-[11px] text-rose-600 font-medium mt-1">Specialized critical ward staff</p>
        </div>

        {/* HEAD NURSES */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
              Supervisors
            </span>
            <span className="text-blue-500 text-xs font-bold">Leadership</span>
          </div>
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mt-3">Head Nurses</p>
          <h3 className="text-2xl font-black text-blue-700 mt-0.5">{headNurseCount}</h3>
          <p className="text-[11px] text-blue-600 font-medium mt-1">Ward in-charge & supervisors</p>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* SEARCH INPUT */}
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search nurse name, ID, ward, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* WARD FILTER */}
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">All Wards</option>
              {wardsList.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>

            {/* SHIFT FILTER */}
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">All Shifts</option>
              {shiftsList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* ROLE FILTER */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              {rolesList.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* DUTY STATUS FILTER */}
            <select
              value={dutyFilter}
              onChange={(e) => setDutyFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">All Duty Status</option>
              <option value="ON_DUTY">🟢 On Duty ({onDutyCount})</option>
              <option value="OFF_DUTY">🔴 Off Duty ({offDutyCount})</option>
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
              key: 'wardFilter',
              name: 'Ward',
              value: wardFilter,
              onRemove: () => setWardFilter('ALL')
            },
            {
              key: 'shiftFilter',
              name: 'Shift',
              value: shiftFilter,
              onRemove: () => setShiftFilter('ALL')
            },
            {
              key: 'roleFilter',
              name: 'Role',
              value: roleFilter,
              onRemove: () => setRoleFilter('ALL')
            },
            {
              key: 'dutyFilter',
              name: 'Duty Status',
              value: dutyFilter,
              displayValue: dutyFilter === 'ON_DUTY' ? 'On Duty' : dutyFilter === 'OFF_DUTY' ? 'Off Duty' : dutyFilter,
              onRemove: () => setDutyFilter('ALL')
            }
          ]}
          onClearAll={() => {
            setSearchTerm('');
            setWardFilter('ALL');
            setShiftFilter('ALL');
            setRoleFilter('ALL');
            setDutyFilter('ALL');
          }}
        />

        {/* RESULTS INFO BAR */}
        <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
          <div>
            Showing <strong className="text-slate-800 font-bold">{filteredNurses.length}</strong> of {nurses.length} nurses in <span className="font-semibold text-amber-700">{hospitalName}</span>
          </div>
        </div>

        {/* 4. MASTER NURSES TABLE */}
        <div className="overflow-x-auto w-full rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-600 min-w-[850px]">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-3.5">Nurse ID</th>
                <th className="py-3.5 px-3.5">Nurse Name</th>
                <th className="py-3.5 px-3.5">Ward / Department</th>
                <th className="py-3.5 px-3.5">Designation</th>
                <th className="py-3.5 px-3.5">Shift Timing</th>
                <th className="py-3.5 px-3.5">Duty Status</th>
                <th className="py-3.5 px-3.5">Contact Details</th>
                <th className="py-3.5 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-semibold text-slate-500">Loading {hospitalName} nurses directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredNurses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-1.5">
                      <p className="font-bold text-slate-700 text-sm">No nurses found for {hospitalName}</p>
                      <p className="text-xs text-slate-500">
                        {nurses.length === 0
                          ? `Currently there are no nurses registered under ${hospitalName}. Only nurses belonging to this hospital will appear here.`
                          : 'No nurse records match your active search keyword or filter options.'}
                      </p>
                      {(searchTerm || wardFilter !== 'ALL' || shiftFilter !== 'ALL' || roleFilter !== 'ALL') && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm('');
                              setWardFilter('ALL');
                              setShiftFilter('ALL');
                              setRoleFilter('ALL');
                            }}
                            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer"
                          >
                            Clear Filters ({nurses.length} total)
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNurses.map((nurse, idx) => {
                  const nurseId = nurse.nurse_id || (nurse.id ? `NUR-${nurse.id}` : '-');
                  const name = nurse.name || '-';
                  const ward = nurse.ward || '-';
                  const role = nurse.role || nurse.nurse_role || '-';
                  const shift = nurse.shift || '-';
                  const qualification = nurse.qualification || '-';
                  const experience = nurse.experience ? `${nurse.experience} Y Exp` : '';

                  const isHead = role.toLowerCase().includes('head');

                  return (
                    <tr
                      key={nurse.id || idx}
                      className="hover:bg-amber-50/40 transition duration-100 border-b border-slate-100/80"
                    >
                      {/* 1. NURSE ID */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          {nurseId}
                        </span>
                      </td>

                      {/* 2. NURSE NAME (ONLY NAME) */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-800 text-xs sm:text-sm">
                          {name}
                        </div>
                      </td>

                      {/* 3. WARD */}
                      <td className="py-3 px-3.5">
                        {ward && ward !== '-' ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            ward.toUpperCase().includes('ICU') || ward.toUpperCase().includes('NICU')
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : ward.toUpperCase().includes('EMERGENCY')
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {ward}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium">-</span>
                        )}
                      </td>

                      {/* 4. DESIGNATION */}
                      <td className="py-3 px-3.5">
                        {role && role !== '-' ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            isHead
                              ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold'
                              : 'bg-slate-50 text-slate-700 border border-slate-200'
                          }`}>
                            {role}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium">-</span>
                        )}
                      </td>

                      {/* 5. SHIFT TIMING */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-xs text-slate-800 flex items-center gap-1">
                          <span>⏰</span>
                          <span>{shift}</span>
                        </div>
                      </td>

                      {/* 6. DUTY STATUS */}
                      <td className="py-3 px-3.5">
                        {(() => {
                          const isOnDuty = isNurseOnDuty(nurse);
                          return isOnDuty ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>On Duty</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              <span>Off Duty</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* 7. CONTACT DETAILS (CLICKABLE PHONE & EMAIL) */}
                      <td className="py-3 px-3.5">
                        {nurse.contact || nurse.phone ? (
                          <a
                            href={`tel:${nurse.contact || nurse.phone}`}
                            className="font-mono text-xs font-semibold text-slate-700 hover:text-amber-600 hover:underline flex items-center gap-1 transition"
                            title="Call nurse"
                          >
                            <span>📞</span>
                            <span>{nurse.contact || nurse.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">No phone</span>
                        )}
                        {nurse.email && (
                          <a
                            href={`mailto:${nurse.email}`}
                            className="text-[10px] text-sky-600 hover:text-sky-800 hover:underline truncate max-w-[170px] block mt-0.5 transition"
                            title={`Send email to ${nurse.email}`}
                          >
                            ✉️ {nurse.email}
                          </a>
                        )}
                      </td>

                      {/* 8. ACTIONS */}
                      <td className="py-3 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedNurseModal(nurse)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer inline-flex items-center gap-1"
                          title="View Nurse Profile"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. NURSE DETAILS MODAL */}
      {selectedNurseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-amber-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-inner shrink-0">
                  {getInitials(selectedNurseModal.name)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{selectedNurseModal.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-amber-200">{selectedNurseModal.nurse_id || `NUR-${selectedNurseModal.id}`}</span>
                    {(() => {
                      const st = (selectedNurseModal.status || '').toLowerCase();
                      const isOnDuty = selectedNurseModal.is_active !== false && !st.includes('off') && !st.includes('leave');
                      return isOnDuty ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>On Duty</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span>Off Duty</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNurseModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Hospital Branch</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{hospitalName}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Duty Status</span>
                  <div className="mt-1">
                    {(() => {
                      const isOnDuty = isNurseOnDuty(selectedNurseModal);
                      return isOnDuty ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>On Duty</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>Off Duty</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Ward / Unit</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{selectedNurseModal.ward || '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Role / Designation</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{selectedNurseModal.role || selectedNurseModal.nurse_role || '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Shift Timing</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{selectedNurseModal.shift || '-'}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Phone Contact:</span>
                  {selectedNurseModal.contact || selectedNurseModal.phone ? (
                    <a
                      href={`tel:${selectedNurseModal.contact || selectedNurseModal.phone}`}
                      className="font-mono font-bold text-slate-800 hover:text-amber-600 hover:underline"
                    >
                      📞 {selectedNurseModal.contact || selectedNurseModal.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email Address:</span>
                  {selectedNurseModal.email ? (
                    <a
                      href={`mailto:${selectedNurseModal.email}`}
                      className="font-mono font-bold text-sky-700 hover:underline"
                    >
                      ✉️ {selectedNurseModal.email}
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Qualification:</span>
                  <span className="font-bold text-slate-800">{selectedNurseModal.qualification || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Experience:</span>
                  <span className="font-bold text-slate-800">{selectedNurseModal.experience ? `${selectedNurseModal.experience} Years` : '-'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedNurseModal(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { ReceptionistNurse as ReceptionistNurses };
export default ReceptionistNurse;
