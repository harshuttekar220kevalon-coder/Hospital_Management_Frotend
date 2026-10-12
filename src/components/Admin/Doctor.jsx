import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const extractArray = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  if (Array.isArray(resData.data)) return resData.data;
  return [];
};

const AdminDoctors = ({ currentUser, setCurrentPage, setSelectedDoctor, setSelectedHospital }) => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const shiftsList = [
    'Morning First Shift',
    'Afternoon Second Shift',
    'Evening Third Shift'
  ];

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/super-admin/Doctors/`);
      if (res.ok) {
        const data = await res.json().catch(() => []);
        const list = extractArray(data);
        const adminHospId = currentUser?.hospital || (typeof currentUser?.hospital_data === 'object' ? currentUser?.hospital_data?.id : null);
        const filtered = adminHospId
          ? list.filter(d => {
              const dHosp = typeof d.hospital === 'object' && d.hospital !== null ? d.hospital.id : d.hospital;
              return Number(dHosp) === Number(adminHospId);
            })
          : list;
        setDoctors(filtered);
      }
    } catch (err) {
      console.error('Error fetching admin doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [currentUser]);

  const handleViewDetails = (doc) => {
    if (setSelectedDoctor) setSelectedDoctor(doc);
    try {
      localStorage.setItem('selectedDoctor', JSON.stringify(doc));
    } catch (e) {}
    if (setCurrentPage) setCurrentPage('admin_doctor_details');
  };

  const filteredDoctors = doctors.filter((doc) => {
    const term = searchTerm.toLowerCase().trim();
    const docName = (doc.name || '').toLowerCase();
    const docSpec = (doc.specialization || '').toLowerCase();
    const matchesSearch = !term || docName.includes(term) || docSpec.includes(term);

    const dShift = doc.Shifts || doc.shift || '';
    const matchesShift = shiftFilter === 'ALL' || dShift === shiftFilter;

    const dStatus = String(doc.status || doc.duty_status || '').toLowerCase();
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'On_Duty' && (dStatus.includes('on') || dStatus === 'active')) ||
      (statusFilter === 'Off_Duty' && (dStatus.includes('off') || dStatus.includes('leave')));

    return matchesSearch && matchesShift && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Hospital Doctors
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Doctors assigned to your hospital branch
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Search by name, specialization..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
        />

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

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400">Loading hospital doctors...</div>
      ) : filteredDoctors.length === 0 ? (
        <div className="p-16 text-center text-xs text-slate-400">No doctors found for this hospital.</div>
      ) : (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-900/90 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <th className="py-3.5 px-4">Doctor</th>
                  <th className="py-3.5 px-4">Specialization</th>
                  <th className="py-3.5 px-4">Shift</th>
                  <th className="py-3.5 px-4">Duty Status</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredDoctors.map((doc) => {
                  const isOff = String(doc.status || doc.duty_status || '').toLowerCase().includes('off') || String(doc.status || '').toLowerCase().includes('leave');
                  return (
                    <tr key={doc.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-semibold text-white">{doc.name}</td>
                      <td className="py-3.5 px-4 text-sky-400">{doc.specialization || 'General'}</td>
                      <td className="py-3.5 px-4 text-slate-400">{doc.Shifts || doc.shift || 'Morning First Shift'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isOff ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {isOff ? 'Off Duty' : 'On Duty'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{doc.contact || doc.phone || '-'}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleViewDetails(doc)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
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

export default AdminDoctors;
