import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../Api/Api';

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || payload?.data || []);
const relatedId = (value) => (value && typeof value === 'object' ? value.id : value);

// Super Admin exclusively manages and approves Hospital Admin accounts
const USER_SOURCES = [
  { role: 'Hospital Admin', endpoint: 'Admins', idField: 'employee_id', roleField: 'designation' }
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

const ManageNewUsers = () => {
  const [users, setUsers] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [approvingUser, setApprovingUser] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const approvalRevision = useRef(0);

  const loadUsers = useCallback(async (showLoading = true) => {
    const revisionAtStart = approvalRevision.current;
    if (showLoading) setLoading(true);
    try {
      const [hospitalResult, adminResult] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Admins/`)
      ]);

      const hospitalResponse = hospitalResult.status === 'fulfilled' ? hospitalResult.value : null;
      const hospitalList = hospitalResponse?.ok ? asList(await hospitalResponse.json().catch(() => [])) : [];
      setHospitals(hospitalList);

      const normalizedUsers = [];
      if (adminResult.status === 'fulfilled' && adminResult.value.ok) {
        const records = asList(await adminResult.value.json().catch(() => []));
        records.forEach((record) => {
          const hospitalId = relatedId(record.hospital);
          const linkedHospital = hospitalList.find((hospital) => String(hospital.id) === String(hospitalId));
          const hospitalIds = (Array.isArray(record.hospitals) ? record.hospitals : record.hospital ? [record.hospital] : [])
            .map((hospital) => relatedId(hospital))
            .filter((id) => id !== null && id !== undefined)
            .map(String);

          const resolvedHospital = (typeof record.hospital === 'object' && record.hospital !== null
            ? record.hospital.Name || record.hospital.name
            : '') || linkedHospital?.Name || linkedHospital?.name || record.hospital_name || (hospitalId ? `Hospital #${hospitalId}` : 'Unassigned Branch');

          normalizedUsers.push({
            id: record.id,
            endpoint: 'Admins',
            userId: record.employee_id || `ADM-${record.id}`,
            name: record.name || 'Hospital Admin',
            role: 'Hospital Admin',
            roleDetail: record.designation || 'Hospital Administrator',
            email: record.email || '',
            contact: record.contact || record.phone || '',
            hospitalIds,
            hospital: resolvedHospital,
            createdAt: record.created_at || record.created_on || record.registered_at || '',
            isActive: record.is_active ?? record.status ?? true,
            isApproved: record.is_approved === true
          });
        });
      }

      normalizedUsers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      if (revisionAtStart !== approvalRevision.current) return;
      setUsers(normalizedUsers);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Could not load Hospital Admin accounts.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const toggleApproval = async (user) => {
    const nextApprovalState = !user.isApproved;
    approvalRevision.current += 1;
    setApprovingUser(`${user.role}-${user.id}`);
    setApprovalError('');
    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/${user.endpoint}/${user.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: nextApprovalState })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || payload.message || `Could not ${nextApprovalState ? 'approve' : 'unapprove'} this administrator account.`);
      }
      const savedUser = await response.json().catch(() => ({}));
      if (typeof savedUser.is_approved === 'boolean' && savedUser.is_approved !== nextApprovalState) {
        throw new Error('The server did not save the requested approval status. Please try again.');
      }
      approvalRevision.current += 1;
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, isApproved: nextApprovalState } : item));
    } catch (approvalFailure) {
      setApprovalError(approvalFailure.message || 'Could not approve this administrator account.');
    } finally {
      setApprovingUser('');
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => loadUsers(), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadUsers(false);
    }, 30000);
    const refreshOnFocus = () => loadUsers(false);
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const statusMatches = statusFilter === 'ALL'
        ? true
        : statusFilter === 'PENDING'
          ? !user.isApproved
          : user.isApproved;
      const hospitalMatches = hospitalFilter === 'ALL'
        ? true
        : hospitalFilter === 'UNASSIGNED'
          ? user.hospitalIds.length === 0
          : user.hospitalIds.includes(hospitalFilter);
      const searchMatches = !term || [user.name, user.userId, user.roleDetail, user.email, user.contact, user.hospital]
        .some((value) => String(value || '').toLowerCase().includes(term));
      return statusMatches && hospitalMatches && searchMatches;
    });
  }, [users, search, statusFilter, hospitalFilter]);

  const totalAdmins = users.length;
  const pendingAdmins = users.filter((u) => !u.isApproved).length;
  const approvedAdmins = users.filter((u) => u.isApproved).length;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-slate-50 p-4 font-sans sm:p-6 lg:p-8">
      <div className="w-full space-y-6 max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-extrabold uppercase tracking-wider">
                Super Admin HQ
              </span>
              <span className="text-xs text-slate-400 font-semibold">·</span>
              <span className="text-xs text-slate-500 font-medium">Branch Security &amp; Access Controls</span>
            </div>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Hospital Admin Approvals</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Review and approve newly created Hospital Administrator accounts before they can access their branch dashboards.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadUsers()}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            Refresh Admins
          </button>
        </header>

        {/* METRIC CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-2xl border p-4 text-left shadow-xs transition hover:-translate-y-0.5 cursor-pointer ${
              statusFilter === 'ALL' ? 'border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900/20' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-900'
            }`}
          >
            <p className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Hospital Admins
            </p>
            <p className="mt-1 text-2xl font-black">{totalAdmins}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`rounded-2xl border p-4 text-left shadow-xs transition hover:-translate-y-0.5 cursor-pointer relative overflow-hidden ${
              statusFilter === 'PENDING' ? 'border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-400/30' : 'border-amber-200 bg-white text-amber-900 hover:bg-amber-50/50'
            }`}
          >
            {pendingAdmins > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Pending Admin Approvals
            </p>
            <p className="mt-1 text-2xl font-black text-amber-600">{pendingAdmins}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
            className={`rounded-2xl border p-4 text-left shadow-xs transition hover:-translate-y-0.5 cursor-pointer ${
              statusFilter === 'APPROVED' ? 'border-emerald-400 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400/30' : 'border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50/50'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Approved Active Admins
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-600">{approvedAdmins}</p>
          </button>
        </section>

        {/* SEARCH & FILTERS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search admins by name, ID, email, branch..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by approval status"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 cursor-pointer"
              >
                <option value="ALL">All Status ({totalAdmins})</option>
                <option value="PENDING">Pending Approval ({pendingAdmins})</option>
                <option value="APPROVED">Approved ({approvedAdmins})</option>
              </select>
            </div>

            <div>
              <select
                value={hospitalFilter}
                onChange={(event) => setHospitalFilter(event.target.value)}
                aria-label="Filter by hospital branch"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 cursor-pointer"
              >
                <option value="ALL">All Hospital Branches</option>
                {hospitals.map((hospital) => (
                  <option key={hospital.id} value={String(hospital.id)}>
                    {hospital.Name || hospital.name || `Hospital #${hospital.id}`}
                  </option>
                ))}
                <option value="UNASSIGNED">Unassigned Branches</option>
              </select>
            </div>
          </div>

          {(error || approvalError) && (
            <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs sm:text-sm font-medium text-amber-800">
              {approvalError || error}
            </p>
          )}

          {loading ? (
            <div className="p-16 text-center text-xs sm:text-sm font-medium text-slate-500">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Loading Hospital Admin accounts...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-16 text-center text-xs sm:text-sm font-medium text-slate-500">
              No registered Hospital Admin accounts found matching your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-5 py-3.5">Admin Name &amp; ID</th>
                    <th className="px-5 py-3.5">Designation</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Contact</th>
                    <th className="px-5 py-3.5">Assigned Hospital</th>
                    <th className="px-5 py-3.5">Registered</th>
                    <th className="px-5 py-3.5 text-center">Super Admin Approval</th>
                    <th className="px-5 py-3.5">Account Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUsers.map((user) => (
                    <tr key={`${user.role}-${user.id}`} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <span className="block font-bold text-slate-900">{user.name}</span>
                        <span className="mt-1 inline-block rounded-md border border-purple-200 bg-purple-50 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-purple-700">
                          {user.userId}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-800">{user.roleDetail}</span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-600">{user.email || '-'}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-600">{user.contact || '-'}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg text-xs">
                          🏥 {user.hospital}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{formatDate(user.createdAt)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleApproval(user)}
                          disabled={approvingUser === `${user.role}-${user.id}`}
                          aria-pressed={user.isApproved}
                          title={user.isApproved ? 'Click to revoke approval' : 'Click to approve administrator account'}
                          className={`inline-flex min-w-28 items-center justify-center rounded-xl border px-3.5 py-2 text-xs font-extrabold shadow-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-wait disabled:opacity-60 cursor-pointer ${
                            user.isApproved
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100'
                              : 'border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400 hover:bg-amber-100'
                          }`}
                        >
                          {approvingUser === `${user.role}-${user.id}` ? 'Updating...' : (
                            user.isApproved ? 'Approved ✓' : 'Approve Admin'
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        {typeof user.isActive === 'boolean' ? (
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                            user.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        ) : (
                          String(user.isActive || '-').replaceAll('_', ' ')
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ManageNewUsers;
