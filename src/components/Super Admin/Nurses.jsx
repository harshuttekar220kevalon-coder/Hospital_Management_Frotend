import React, { useState, useEffect } from 'react';
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

    const matchesSearch =
      !term ||
      nName.includes(term) ||
      nEmail.includes(term) ||
      nContact.includes(term) ||
      nWard.includes(term);

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Nurses Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage hospital nursing staff, ward allocations, and duty shifts
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          type="text"
          placeholder="Search nurse by name, email, ward..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
        />

        <select
          value={hospitalFilter}
          onChange={(e) => setHospitalFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-teal-500"
        >
          <option value="ALL">All Hospitals</option>
          {hospitalsList.map((h) => (
            <option key={h.id} value={h.id}>{h.Name || h.name}</option>
          ))}
        </select>

        <select
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-teal-500"
        >
          <option value="ALL">All Shifts</option>
          {shiftsList.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-teal-500"
        >
          <option value="ALL">All Duty Statuses</option>
          <option value="On_Duty">On Duty</option>
          <option value="Off_Duty">Off Duty / On Leave</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="w-8 h-8 border-3 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">Loading nurses directory...</p>
        </div>
      ) : filteredNurses.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
          <p className="text-sm font-semibold text-slate-300">No nurses found</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-900/90 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <th className="py-3.5 px-4">Nurse</th>
                  <th className="py-3.5 px-4">Ward</th>
                  <th className="py-3.5 px-4">Hospital</th>
                  <th className="py-3.5 px-4">Shift</th>
                  <th className="py-3.5 px-4">Duty Status</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredNurses.slice(0, visibleCount).map((nurse) => {
                  const nHosp = typeof nurse.hospital === 'object' && nurse.hospital !== null ? nurse.hospital.id : nurse.hospital;
                  const hospObj = hospitalsList.find((h) => Number(h.id) === Number(nHosp));
                  const hospName = hospObj?.Name || hospObj?.name || nurse.hospital_name || 'Unassigned';
                  const isOff = String(nurse.status || nurse.duty_status || '').toLowerCase().includes('off') || String(nurse.status || '').toLowerCase().includes('leave');

                  return (
                    <tr key={nurse.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                            {(nurse.name || 'N').charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-100 block">{nurse.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">ID: #{nurse.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {nurse.ward || 'General Ward'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {hospName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        {nurse.shift || 'Morning First Shift'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isOff
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOff ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
                          {isOff ? 'Off Duty' : 'On Duty'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                        {nurse.contact || nurse.phone || nurse.email || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleViewDetails(nurse)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
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
