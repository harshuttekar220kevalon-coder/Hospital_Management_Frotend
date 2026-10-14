import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../Api/Api';

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || payload?.data || []);
const relatedId = (value) => (value && typeof value === 'object' ? value.id : value);

const USER_SOURCES = [
  { role: 'Admin', endpoint: 'Admins', idField: 'employee_id', roleField: 'designation' },
  { role: 'Doctor', endpoint: 'Doctors', idField: 'doctor_id', roleField: 'specialization' },
  { role: 'Nurse', endpoint: 'Nurses', idField: 'nurse_id', roleField: 'role' },
  { role: 'Receptionist', endpoint: 'Receptionists', idField: 'receptionist_id', roleField: 'role' }
];

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

const ManageNewUsers = () => {
  const [users, setUsers] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [approvingUser, setApprovingUser] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const approvalRevision = useRef(0);

  const loadUsers = useCallback(async (showLoading = true) => {
    const revisionAtStart = approvalRevision.current;
    if (showLoading) setLoading(true);
    try {
      const [hospitalResult, ...userResults] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        ...USER_SOURCES.map(({ endpoint }) => fetch(`${API_BASE_URL}/super-admin/${endpoint}/`))
      ]);

      const hospitalResponse = hospitalResult.status === 'fulfilled' ? hospitalResult.value : null;
      const hospitalList = hospitalResponse?.ok ? asList(await hospitalResponse.json().catch(() => [])) : [];
      setHospitals(hospitalList);

      const failedRoles = [];
      const normalizedUsers = [];
      for (let index = 0; index < USER_SOURCES.length; index += 1) {
        const source = USER_SOURCES[index];
        const result = userResults[index];
        if (result.status !== 'fulfilled' || !result.value.ok) {
          failedRoles.push(source.role);
          continue;
        }

        const records = asList(await result.value.json().catch(() => []));
        records.forEach((record) => {
          const hospitalId = relatedId(record.hospital);
          const linkedHospital = hospitalList.find((hospital) => String(hospital.id) === String(hospitalId));
          const hospitalIds = (Array.isArray(record.hospitals) ? record.hospitals : record.hospital ? [record.hospital] : [])
            .map((hospital) => relatedId(hospital))
            .filter((id) => id !== null && id !== undefined)
            .map(String);

          let resolvedHospitalNames = [];
          if (Array.isArray(record.hospital_names) && record.hospital_names.length > 0) {
            resolvedHospitalNames = record.hospital_names
              .map((h) => (typeof h === 'object' && h !== null ? h.name || h.Name : String(h)))
              .filter(Boolean);
          } else if (hospitalIds.length > 0) {
            resolvedHospitalNames = hospitalList
              .filter((h) => hospitalIds.includes(String(h.id)))
              .map((h) => h.Name || h.name)
              .filter(Boolean);
          }

          const resolvedHospital = resolvedHospitalNames.join(', ') ||
            (typeof record.hospital === 'object' && record.hospital !== null
              ? record.hospital.Name || record.hospital.name
              : '') || linkedHospital?.Name || linkedHospital?.name || record.hospital_name || '';

          normalizedUsers.push({
            id: record.id,
            endpoint: source.endpoint,
            userId: record[source.idField] || `#${record.id}`,
            name: record.name || record.patient_name || '-',
            role: source.role,
            roleDetail: record[source.roleField] || '',
            email: record.email || '',
            contact: record.contact || record.phone || '',
            hospitalIds,
            hospital: resolvedHospital,
            createdAt: record.created_at || record.created_on || record.registered_at || '',
            isActive: record.is_active ?? record.status ?? null,
            isApproved: record.is_approved === true
          });
        });
      }

      normalizedUsers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      if (revisionAtStart !== approvalRevision.current) return;
      setUsers(normalizedUsers);
      setError(failedRoles.length ? `Could not load ${failedRoles.join(', ')} records. Other user records are shown.` : '');
    } catch (loadError) {
      setError(loadError.message || 'Could not load registered users.');
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
        throw new Error(payload.detail || payload.message || `Could not ${nextApprovalState ? 'approve' : 'unapprove'} this account.`);
      }
      const savedUser = await response.json().catch(() => ({}));
      if (typeof savedUser.is_approved === 'boolean' && savedUser.is_approved !== nextApprovalState) {
        throw new Error('The server did not save the requested approval status. Please try again.');
      }
      approvalRevision.current += 1;
      setUsers((current) => current.map((item) => item.role === user.role && item.id === user.id ? { ...item, isApproved: nextApprovalState } : item));
    } catch (approvalFailure) {
      setApprovalError(approvalFailure.message || 'Could not approve this account.');
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
      const roleMatches = roleFilter === 'ALL' || user.role === roleFilter;
      const hospitalMatches = hospitalFilter === 'ALL'
        ? true
        : hospitalFilter === 'UNASSIGNED'
          ? user.hospitalIds.length === 0
          : user.hospitalIds.includes(hospitalFilter);
      const searchMatches = !term || [user.name, user.userId, user.role, user.roleDetail, user.email, user.contact, user.hospital]
        .some((value) => String(value || '').toLowerCase().includes(term));
      return roleMatches && hospitalMatches && searchMatches;
    });
  }, [users, search, roleFilter, hospitalFilter]);

  const roleCounts = USER_SOURCES.map(({ role }) => ({ role, count: users.filter((user) => user.role === role).length }));

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-slate-50 p-4 font-sans sm:p-6 lg:p-8">
      <div className="w-full space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Super Admin</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Manage New Users</h1>
            <p className="mt-1 text-sm text-slate-500">New and existing staff accounts registered across hospitals.</p>
          </div>
          <button type="button" onClick={() => loadUsers()} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50">
            Refresh users
          </button>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <button type="button" aria-pressed={roleFilter === 'ALL'} onClick={() => setRoleFilter('ALL')} className={`rounded-2xl border p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 ${roleFilter === 'ALL' ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200' : 'border-slate-200 bg-white hover:border-teal-200'}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">All Staff</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{users.length}</p>
          </button>
          {roleCounts.map(({ role, count }) => (
            <button type="button" key={role} aria-pressed={roleFilter === role} onClick={() => setRoleFilter(role)} className={`rounded-2xl border p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 ${roleFilter === role ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200' : 'border-slate-200 bg-white hover:border-teal-200'}`}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{role}s</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{count}</p>
            </button>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-2">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, ID, email, role, hospital..." className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
            <select value={hospitalFilter} onChange={(event) => setHospitalFilter(event.target.value)} aria-label="Filter staff by hospital" className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
              <option value="ALL">All hospitals</option>
              {hospitals.map((hospital) => <option key={hospital.id} value={String(hospital.id)}>{hospital.Name || hospital.name || `Hospital #${hospital.id}`}</option>)}
              <option value="UNASSIGNED">No hospital assigned</option>
            </select>
          </div>

          {(error || approvalError) && <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{approvalError || error}</p>}
          {loading ? (
            <div className="p-12 text-center text-sm font-medium text-slate-500">Loading registered users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-sm font-medium text-slate-500">No registered staff users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-center">User name &amp; ID</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Hospital</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3">Approval</th>
                    <th className="px-4 py-3">Account status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUsers.map((user) => (
                    <tr key={`${user.role}-${user.id}`} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 text-center">
                        <span className="block font-bold text-slate-900">{user.name}</span>
                        <span className="mt-1 inline-block rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-sky-700">{user.userId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{user.role}</span>
                        {user.roleDetail && <span className="mt-0.5 block text-xs text-slate-500">{user.roleDetail}</span>}
                      </td>
                      <td className="px-4 py-3">{user.email || '-'}</td>
                      <td className="px-4 py-3">{user.contact || '-'}</td>
                      <td className="px-4 py-3">{user.hospital || '-'}</td>
                      <td className="px-4 py-3">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleApproval(user)}
                          disabled={approvingUser === `${user.role}-${user.id}`}
                          aria-pressed={user.isApproved}
                          title={user.isApproved ? 'Click to remove this approval' : 'Click to approve this account'}
                          className={`inline-flex min-w-28 items-center justify-center rounded-xl border px-3.5 py-2 text-xs font-extrabold shadow-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-wait disabled:opacity-60 ${user.isApproved ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 focus-visible:ring-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100 focus-visible:ring-amber-100'}`}
                        >
                          {approvingUser === `${user.role}-${user.id}` ? 'Updating...' : (
                            user.isApproved ? 'Approved' : 'Unapproved'
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {typeof user.isActive === 'boolean' ? (
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${user.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{user.isActive ? 'Active' : 'Inactive'}</span>
                        ) : String(user.isActive || '-').replaceAll('_', ' ')}
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
