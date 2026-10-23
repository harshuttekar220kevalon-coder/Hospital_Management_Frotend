import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../Api/Api';
import ActiveFilterTags from '../Common/ActiveFilterTags';

const asArray = (payload) => (Array.isArray(payload) ? payload : payload?.results || payload?.data || []);
const relatedId = (value) => (value && typeof value === 'object' ? value.id : value);

const STAFF_SOURCES = [
  { role: 'Doctor', endpoint: 'Doctors', idField: 'doctor_id', roleField: 'specialization', color: 'cyan' },
  { role: 'Nurse', endpoint: 'Nurses', idField: 'nurse_id', roleField: 'role', color: 'emerald' },
  { role: 'Receptionist', endpoint: 'Receptionists', idField: 'receptionist_id', roleField: 'role', color: 'purple' }
];

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const Staff_Approve = ({ currentUser }) => {
  const [staffList, setStaffList] = useState([]);
  const [hospitalInfo, setHospitalInfo] = useState(null);
  const [hospitalId, setHospitalId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [approvingId, setApprovingId] = useState('');
  const approvalRevision = useRef(0);

  // Resolve current Admin's assigned hospital ID & details
  const resolveHospital = useCallback(async () => {
    let resolvedHospId = currentUser?.hospital?.id || currentUser?.hospital;
    if (!resolvedHospId) {
      try {
        const savedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        resolvedHospId = savedUser.hospital?.id || savedUser.hospital;
      } catch {}
    }
    if (!resolvedHospId) {
      try {
        resolvedHospId = JSON.parse(localStorage.getItem('selectedHospital') || '{}')?.id;
      } catch {}
    }
    if (!resolvedHospId && currentUser?.email) {
      try {
        const adminsRes = await fetch(`${API_BASE_URL}/super-admin/Admins/`).catch(() => null);
        if (adminsRes?.ok) {
          const admins = asArray(await adminsRes.json().catch(() => []));
          const match = admins.find((a) =>
            (currentUser?.id && Number(a.id) === Number(currentUser.id)) ||
            (a.email || '').toLowerCase().trim() === (currentUser?.email || '').toLowerCase().trim()
          );
          resolvedHospId = match?.hospital?.id || match?.hospital;
        }
      } catch {}
    }

    const numericHospId = Number(resolvedHospId) || null;
    setHospitalId(numericHospId);

    if (numericHospId) {
      try {
        const hospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/${numericHospId}/`).catch(() => null);
        if (hospRes?.ok) {
          const hospData = await hospRes.json().catch(() => null);
          setHospitalInfo(hospData);
        } else {
          // Fallback to all hospitals list
          const allHospRes = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
          if (allHospRes?.ok) {
            const allHosps = asArray(await allHospRes.json().catch(() => []));
            const found = allHosps.find((h) => Number(h.id) === numericHospId);
            if (found) setHospitalInfo(found);
          }
        }
      } catch {}
    }

    return numericHospId;
  }, [currentUser]);

  // Load staff records (Doctors, Nurses, Receptionists) belonging to this hospital
  const loadStaff = useCallback(async (showLoading = true) => {
    const revisionAtStart = approvalRevision.current;
    if (showLoading) setLoading(true);
    setError('');

    try {
      const currentHospId = hospitalId || await resolveHospital();
      if (!currentHospId) {
        setStaffList([]);
        setError('No hospital branch assigned to your administrator account.');
        setLoading(false);
        return;
      }

      const [docsRes, nursesRes, recsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Doctors/`),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`),
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`)
      ]);

      const docList = docsRes.status === 'fulfilled' && docsRes.value?.ok ? asArray(await docsRes.value.json().catch(() => [])) : [];
      const nurseList = nursesRes.status === 'fulfilled' && nursesRes.value?.ok ? asArray(await nursesRes.value.json().catch(() => [])) : [];
      const recList = recsRes.status === 'fulfilled' && recsRes.value?.ok ? asArray(await recsRes.value.json().catch(() => [])) : [];

      const normalizedStaff = [];

      // Filter Doctors for this hospital branch
      docList.forEach((doc) => {
        const docHospIds = [
          ...(Array.isArray(doc.hospitals) ? doc.hospitals : []),
          doc.hospital
        ].filter(Boolean).map((item) => Number(relatedId(item)));

        if (docHospIds.includes(Number(currentHospId))) {
          normalizedStaff.push({
            id: doc.id,
            uniqueKey: `Doctor-${doc.id}`,
            role: 'Doctor',
            endpoint: 'Doctors',
            staffId: doc.doctor_id || `DOC-${doc.id}`,
            name: doc.name || 'Doctor',
            roleDetail: doc.specialization || 'General Medicine',
            shift: doc.Shifts || doc.shift || 'Regular OPD',
            email: doc.email || '-',
            contact: doc.phone || doc.contact || '-',
            createdAt: doc.created_at || doc.created_on || doc.registered_at || '',
            isActive: doc.is_active ?? true,
            isApproved: doc.is_approved === true
          });
        }
      });

      // Filter Nurses for this hospital branch
      nurseList.forEach((nurse) => {
        const nurseHospId = Number(relatedId(nurse.hospital));
        if (nurseHospId === Number(currentHospId)) {
          normalizedStaff.push({
            id: nurse.id,
            uniqueKey: `Nurse-${nurse.id}`,
            role: 'Nurse',
            endpoint: 'Nurses',
            staffId: nurse.nurse_id || `NUR-${nurse.id}`,
            name: nurse.name || 'Nurse',
            roleDetail: nurse.ward || nurse.role || 'Staff Nurse',
            shift: nurse.shift || 'Day Shift',
            email: nurse.email || '-',
            contact: nurse.contact || nurse.phone || '-',
            createdAt: nurse.created_at || nurse.created_on || nurse.registered_at || '',
            isActive: nurse.is_active ?? true,
            isApproved: nurse.is_approved === true
          });
        }
      });

      // Filter Receptionists for this hospital branch
      recList.forEach((rec) => {
        const recHospId = Number(relatedId(rec.hospital));
        if (recHospId === Number(currentHospId)) {
          normalizedStaff.push({
            id: rec.id,
            uniqueKey: `Receptionist-${rec.id}`,
            role: 'Receptionist',
            endpoint: 'Receptionists',
            staffId: rec.receptionist_id || `REC-${rec.id}`,
            name: rec.name || 'Receptionist',
            roleDetail: rec.role || 'Front Desk',
            shift: rec.shift || 'Regular Shift',
            email: rec.email || '-',
            contact: rec.contact || rec.phone || '-',
            createdAt: rec.created_at || rec.created_on || rec.registered_at || '',
            isActive: rec.is_active ?? true,
            isApproved: rec.is_approved === true
          });
        }
      });

      // Sort newest registrations first
      normalizedStaff.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      if (revisionAtStart !== approvalRevision.current) return;
      setStaffList(normalizedStaff);
    } catch (err) {
      console.error('Error loading branch staff approvals:', err);
      setError('Could not load branch staff records. Please check server connectivity.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [hospitalId, resolveHospital]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Toggle or approve staff
  const toggleApproval = async (staffMember) => {
    const nextState = !staffMember.isApproved;
    approvalRevision.current += 1;
    setApprovingId(staffMember.uniqueKey);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/${staffMember.endpoint}/${staffMember.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: nextState })
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.detail || errPayload.message || `Failed to update approval status for ${staffMember.name}`);
      }

      const updatedRecord = await response.json().catch(() => ({}));
      if (typeof updatedRecord.is_approved === 'boolean' && updatedRecord.is_approved !== nextState) {
        throw new Error('Server did not save approval state. Please try again.');
      }

      approvalRevision.current += 1;
      setStaffList((prev) =>
        prev.map((item) =>
          item.uniqueKey === staffMember.uniqueKey ? { ...item, isApproved: nextState } : item
        )
      );

      const actionText = nextState ? 'approved successfully' : 'approval revoked';
      setSuccessMessage(`${staffMember.role} "${staffMember.name}" has been ${actionText}.`);
      window.setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Approval update failed:', err);
      setError(err.message || 'Could not update approval status.');
    } finally {
      setApprovingId('');
    }
  };

  // Filtered staff list based on search and filters
  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffList.filter((item) => {
      const matchesRole = roleFilter === 'ALL' || item.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL'
        ? true
        : statusFilter === 'PENDING'
          ? !item.isApproved
          : item.isApproved;

      const matchesSearch = !q || [
        item.name,
        item.staffId,
        item.role,
        item.roleDetail,
        item.shift,
        item.email,
        item.contact
      ].some((val) => String(val || '').toLowerCase().includes(q));

      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [staffList, search, roleFilter, statusFilter]);

  // Counts
  const totalCount = staffList.length;
  const pendingCount = staffList.filter((s) => !s.isApproved).length;
  const approvedCount = staffList.filter((s) => s.isApproved).length;
  const doctorCount = staffList.filter((s) => s.role === 'Doctor').length;
  const nurseCount = staffList.filter((s) => s.role === 'Nurse').length;
  const recCount = staffList.filter((s) => s.role === 'Receptionist').length;

  const branchName = hospitalInfo?.Name || hospitalInfo?.name || (hospitalId ? `Branch Hospital #${hospitalId}` : 'Assigned Branch');

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-7xl mx-auto space-y-6">

        {/* HEADER SECTION */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider">
                Branch Administrator
              </span>
              <span className="text-xs font-semibold text-slate-400">·</span>
              <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
                🏥 {branchName}
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Staff Account Approvals
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Review and approve newly registered Doctors, Nurses, and Receptionists assigned to your hospital branch.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadStaff()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Staff</span>
            </button>
          </div>
        </header>

        {/* STATS METRIC CARDS */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Total Staff */}
          <button
            type="button"
            onClick={() => { setRoleFilter('ALL'); setStatusFilter('ALL'); }}
            className={`p-4 rounded-2xl border text-left shadow-xs transition hover:-translate-y-0.5 cursor-pointer ${
              roleFilter === 'ALL' && statusFilter === 'ALL'
                ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-slate-900/20'
                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
            }`}
          >
            <p className={`text-[10px] font-bold uppercase tracking-wider ${roleFilter === 'ALL' && statusFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Staff
            </p>
            <p className="mt-1 text-2xl font-black">{totalCount}</p>
          </button>

          {/* Pending Approval (Highlighted) */}
          <button
            type="button"
            onClick={() => { setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING'); }}
            className={`p-4 rounded-2xl border text-left shadow-xs transition hover:-translate-y-0.5 cursor-pointer relative overflow-hidden ${
              statusFilter === 'PENDING'
                ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-400/30'
                : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-50/50'
            }`}
          >
            {pendingCount > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Pending Approval
            </p>
            <p className="mt-1 text-2xl font-black text-amber-600">{pendingCount}</p>
          </button>

          {/* Approved Staff */}
          <button
            type="button"
            onClick={() => { setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED'); }}
            className={`p-4 rounded-2xl border text-left shadow-xs transition hover:-translate-y-0.5 cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-400/30'
                : 'bg-white border-emerald-200 text-emerald-900 hover:bg-emerald-50/50'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Approved Active
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-600">{approvedCount}</p>
          </button>

          {/* Doctors */}
          <button
            type="button"
            onClick={() => setRoleFilter(roleFilter === 'Doctor' ? 'ALL' : 'Doctor')}
            className={`p-4 rounded-2xl border text-left shadow-xs transition hover:-translate-y-0.5 cursor-pointer ${
              roleFilter === 'Doctor'
                ? 'bg-cyan-50 border-cyan-400 text-cyan-900 ring-2 ring-cyan-400/30'
                : 'bg-white border-slate-200 text-slate-800 hover:border-cyan-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">Doctors</p>
            <p className="mt-1 text-2xl font-black text-cyan-800">{doctorCount}</p>
          </button>

          {/* Nurses */}
          <button
            type="button"
            onClick={() => setRoleFilter(roleFilter === 'Nurse' ? 'ALL' : 'Nurse')}
            className={`p-4 rounded-2xl border text-left shadow-xs transition hover:-translate-y-0.5 cursor-pointer ${
              roleFilter === 'Nurse'
                ? 'bg-teal-50 border-teal-400 text-teal-900 ring-2 ring-teal-400/30'
                : 'bg-white border-slate-200 text-slate-800 hover:border-teal-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Nurses</p>
            <p className="mt-1 text-2xl font-black text-teal-800">{nurseCount}</p>
          </button>

          {/* Receptionists */}
          <button
            type="button"
            onClick={() => setRoleFilter(roleFilter === 'Receptionist' ? 'ALL' : 'Receptionist')}
            className={`p-4 rounded-2xl border text-left shadow-xs transition hover:-translate-y-0.5 cursor-pointer ${
              roleFilter === 'Receptionist'
                ? 'bg-purple-50 border-purple-400 text-purple-900 ring-2 ring-purple-400/30'
                : 'bg-white border-slate-200 text-slate-800 hover:border-purple-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Receptionists</p>
            <p className="mt-1 text-2xl font-black text-purple-800">{recCount}</p>
          </button>
        </section>

        {/* ALERTS */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="font-bold cursor-pointer text-rose-900">✕</button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>{successMessage}</span>
            </div>
            <button type="button" onClick={() => setSuccessMessage('')} className="font-bold cursor-pointer text-emerald-900">✕</button>
          </div>
        )}

        {/* SEARCH & FILTERS BAR */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Filter Staff</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search Input */}
              <div className="sm:col-span-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, ID, email, contact..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 transition"
                />
              </div>

              {/* Role Filter */}
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  aria-label="Filter staff by role"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 transition cursor-pointer"
                >
                  <option value="ALL">All Roles ({totalCount})</option>
                  <option value="Doctor">Doctors ({doctorCount})</option>
                  <option value="Nurse">Nurses ({nurseCount})</option>
                  <option value="Receptionist">Receptionists ({recCount})</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter staff by approval status"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 transition cursor-pointer"
                >
                  <option value="ALL">All Approval Status</option>
                  <option value="PENDING">Pending Approval Only ({pendingCount})</option>
                  <option value="APPROVED">Approved Active Staff ({approvedCount})</option>
                </select>
              </div>
            </div>
          </div>

          {/* ACTIVE FILTER TAGS */}
          <div className="px-4 pt-2">
            <ActiveFilterTags
              filters={[
                {
                  key: 'search',
                  name: 'Search',
                  value: search,
                  onRemove: () => setSearch('')
                },
                {
                  key: 'roleFilter',
                  name: 'Role',
                  value: roleFilter,
                  onRemove: () => setRoleFilter('ALL')
                },
                {
                  key: 'statusFilter',
                  name: 'Approval Status',
                  value: statusFilter,
                  displayValue: statusFilter === 'PENDING' ? 'Pending Approval' : statusFilter === 'APPROVED' ? 'Approved Active' : statusFilter,
                  onRemove: () => setStatusFilter('ALL')
                }
              ]}
              onClearAll={() => {
                setSearch('');
                setRoleFilter('ALL');
                setStatusFilter('ALL');
              }}
            />
          </div>

          {/* TABLE */}
          {loading ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs sm:text-sm font-semibold">Loading branch staff registrations...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                👥
              </div>
              <p className="text-sm font-bold text-slate-800">No staff members found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {search || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No branch staff matched your current filter criteria. Try resetting the filters.'
                  : `No Doctors, Nurses, or Receptionists have registered under ${branchName} yet.`}
              </p>
              {(search || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setRoleFilter('ALL'); setStatusFilter('ALL'); }}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-xs sm:text-sm">
                <thead className="bg-slate-100/80 text-[11px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Staff Member &amp; ID</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Department / Shift</th>
                    <th className="px-5 py-3.5">Contact Details</th>
                    <th className="px-5 py-3.5">Registered</th>
                    <th className="px-5 py-3.5 text-center">Approval Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStaff.map((staff) => {
                    const isProcessing = approvingId === staff.uniqueKey;

                    return (
                      <tr key={staff.uniqueKey} className="hover:bg-slate-50/80 transition duration-150">
                        {/* Name & ID */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              staff.role === 'Doctor'
                                ? 'bg-cyan-100 text-cyan-800'
                                : staff.role === 'Nurse'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                            }`}>
                              {staff.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{staff.name}</p>
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {staff.staffId}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            staff.role === 'Doctor'
                              ? 'bg-cyan-50 border-cyan-200 text-cyan-800'
                              : staff.role === 'Nurse'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-purple-50 border-purple-200 text-purple-800'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {staff.role}
                          </span>
                        </td>

                        {/* Department / Shift */}
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">{staff.roleDetail}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{staff.shift}</p>
                        </td>

                        {/* Contact Details */}
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800 truncate max-w-[180px]">{staff.email}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{staff.contact}</p>
                        </td>

                        {/* Registered Date */}
                        <td className="px-5 py-4 text-slate-500 text-xs">
                          {formatDate(staff.createdAt)}
                        </td>

                        {/* Approval Toggle Button */}
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleApproval(staff)}
                            disabled={isProcessing}
                            title={staff.isApproved ? 'Click to revoke approval' : 'Click to approve account'}
                            className={`inline-flex items-center justify-center gap-1.5 min-w-[120px] px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-xs transition cursor-pointer disabled:opacity-50 ${
                              staff.isApproved
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25 ring-2 ring-amber-500/20'
                            }`}
                          >
                            {isProcessing ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                <span>Saving...</span>
                              </>
                            ) : staff.isApproved ? (
                              <>
                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Approved</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Approve Staff</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default Staff_Approve;
