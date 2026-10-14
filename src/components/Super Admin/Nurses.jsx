import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const extractArray = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  if (Array.isArray(resData.data)) return resData.data;
  return [];
};

const Nurses = ({ currentUser, setCurrentPage, setSelectedNurse }) => {
  const [nurses, setNurses] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  const shiftsList = [
    'Morning First Shift',
    'Afternoon Second Shift',
    'Evening Third Shift'
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hospRes, nurRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Hospital/`),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`)
      ]);

      if (hospRes.status === 'fulfilled' && hospRes.value.ok) {
        const hData = await hospRes.value.json().catch(() => []);
        setHospitalsList(extractArray(hData));
      }

      if (nurRes.status === 'fulfilled' && nurRes.value.ok) {
        const nData = await nurRes.value.json().catch(() => []);
        setNurses(extractArray(nData));
      }
    } catch (err) {
      console.error('Error fetching nurses data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewDetails = (nurse) => {
    if (setSelectedNurse) setSelectedNurse(nurse);
    try {
      localStorage.setItem('selectedNurse', JSON.stringify(nurse));
    } catch (e) {}
    if (setCurrentPage) setCurrentPage('nurse_details');
  };

  const filteredNurses = nurses.filter((nurse) => {
    const term = searchTerm.toLowerCase().trim();
    const nName = (nurse.name || '').toLowerCase();
    const nEmail = (nurse.email || '').toLowerCase();
    const nContact = (nurse.contact || nurse.phone || '').toLowerCase();
    const nWard = (nurse.ward || '').toLowerCase();
    const nId = String(nurse.nurse_id || nurse.id || '').toLowerCase();

    const matchesSearch =
      !term ||
      nName.includes(term) ||
      nEmail.includes(term) ||
      nContact.includes(term) ||
      nWard.includes(term) ||
      nId.includes(term);

    const nHosp = typeof nurse.hospital === 'object' && nurse.hospital !== null ? nurse.hospital.id : nurse.hospital;
    const matchesHosp = hospitalFilter === 'ALL' || String(nHosp) === String(hospitalFilter);

    const nShift = nurse.shift || nurse.shifts || '';
    const matchesShift = shiftFilter === 'ALL' || nShift === shiftFilter;

    const nStatus = String(nurse.status || nurse.duty_status || '').toLowerCase();
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'On_Duty' && (nStatus.includes('on') || nStatus === 'active')) ||
      (statusFilter === 'Off_Duty' && (nStatus.includes('off') || nStatus.includes('leave')));

    return matchesSearch && matchesHosp && matchesShift && matchesStatus;
  });
  const onDutyCount = nurses.filter((nurse) => {
    const status = String(nurse.status || nurse.duty_status || '').toLowerCase();
    return status.includes('on') || status === 'active';
  }).length;
  const offDutyCount = nurses.length - onDutyCount;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-screen bg-slate-50 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Nurses Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage hospital nursing staff, ward allocations, and duty shifts
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Nurses</p>
          <h3 className="mt-1 text-2xl font-black text-slate-800 sm:text-3xl">{nurses.length}</h3>
          <p className="mt-0.5 text-xs text-slate-500">All registered nursing staff</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">On Duty</p>
          <h3 className="mt-1 text-2xl font-black text-emerald-700 sm:text-3xl">{onDutyCount}</h3>
          <p className="mt-0.5 text-xs font-medium text-emerald-700/80">Currently active</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/40 to-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Off Duty / On Leave</p>
          <h3 className="mt-1 text-2xl font-black text-rose-700 sm:text-3xl">{offDutyCount}</h3>
          <p className="mt-0.5 text-xs text-rose-700/80">Not currently on duty</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/40 to-white p-4 shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800">Hospitals</p>
          <h3 className="mt-1 text-2xl font-black text-sky-700 sm:text-3xl">{hospitalsList.length}</h3>
          <p className="mt-0.5 text-xs text-sky-700/80">Affiliated branches</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <input
          type="text"
          placeholder="Search nurse by name, email, ward..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 sm:text-sm"
        />

        <select
          value={hospitalFilter}
          onChange={(e) => setHospitalFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-700 focus:border-teal-500 focus:outline-none sm:text-sm"
        >
          <option value="ALL">All Hospitals</option>
          {hospitalsList.map((h) => (
            <option key={h.id} value={h.id}>{h.Name || h.name}</option>
          ))}
        </select>

        <select
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-700 focus:border-teal-500 focus:outline-none sm:text-sm"
        >
          <option value="ALL">All Shifts</option>
          {shiftsList.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-700 focus:border-teal-500 focus:outline-none sm:text-sm"
        >
          <option value="ALL">All Duty Statuses</option>
          <option value="On_Duty">On Duty</option>
          <option value="Off_Duty">Off Duty / On Leave</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center space-y-3 rounded-2xl border border-slate-200 bg-white p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-teal-500/20 border-t-teal-500"></div>
          <p className="text-xs text-slate-500">Loading nurses directory...</p>
        </div>
      ) : filteredNurses.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-16 text-center">
          <p className="text-sm font-semibold text-slate-600">No nurses found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-xs text-slate-600 sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-3.5 px-4 text-center">NURSE NAME &amp; ID</th>
                  <th className="py-3.5 px-4">Ward</th>
                  <th className="py-3.5 px-4">Hospital</th>
                  <th className="py-3.5 px-4">Shift</th>
                  <th className="py-3.5 px-4">Duty Status</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNurses.slice(0, visibleCount).map((nurse) => {
                  const nHosp = typeof nurse.hospital === 'object' && nurse.hospital !== null ? nurse.hospital.id : nurse.hospital;
                  const hospObj = hospitalsList.find((h) => Number(h.id) === Number(nHosp));
                  const hospName = (typeof nurse.hospital === 'object' && nurse.hospital !== null ? nurse.hospital.Name || nurse.hospital.name : '') || hospObj?.Name || hospObj?.name || nurse.hospital_name || '-';
                  const nurseStatus = String(nurse.status || nurse.duty_status || '').replaceAll('_', ' ') || '-';
                  const statusKey = nurseStatus.toLowerCase();
                  const isOff = statusKey.includes('off') || statusKey.includes('leave');

                  return (
                    <tr key={nurse.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold text-slate-800">{nurse.name || '-'}</span>
                          <span className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-sky-700">
                            {nurse.nurse_id || `#${nurse.id}`}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {nurse.ward || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {hospName}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {nurse.shift || nurse.shifts || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isOff
                            ? 'border border-rose-200 bg-rose-50 text-rose-700'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isOff ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                          {nurseStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {nurse.contact || nurse.phone || nurse.email || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleViewDetails(nurse)}
                          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700 cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nurses;
