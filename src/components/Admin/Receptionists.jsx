import React, { useState, useEffect } from 'react';

const AdminReceptionists = ({ currentUser, setCurrentPage, setSelectedReceptionist, setSelectedHospital }) => {
  const [receptionists, setReceptionists] = useState([]);
  const [hospitalData, setHospitalData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);

  const shiftsList = [
    'Morning Shift (07:00 AM - 03:00 PM)',
    'Evening Shift (03:00 PM - 11:00 PM)',
    'Night Shift (11:00 PM - 07:00 AM)',
    'General Day Shift (09:00 AM - 05:00 PM)',
    'Rotational Shift'
  ];

  const rolesList = [
    'Front Desk Receptionist',
    'Patient Registration Receptionist',
    'Appointment Receptionist',
    'Admission Receptionist',
    'Billing Receptionist',
    'Emergency Receptionist'
  ];

  const initialFormState = {
    hospital: '',
    name: '',
    receptionist_id: '',
    role: 'Front Desk Receptionist',
    shift: 'Morning Shift (07:00 AM - 03:00 PM)',
    languages: 'English, Hindi',
    contact: '',
    email: '',
    password: '',
    status: 'Active',
    is_active: true
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchAdminAndReceptionists = async () => {
    try {
      setLoading(true);

      let assignedHospitalId = currentUser?.hospital || null;

      try {
        const adminsRes = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/').catch(() => null);
        if (adminsRes && adminsRes.ok) {
          const adminsList = await adminsRes.json();
          const currentEmail = (currentUser?.email || '').toLowerCase().trim();
          const matchedAdmin = adminsList.find(a => (a.email || '').toLowerCase().trim() === currentEmail);
          if (matchedAdmin && matchedAdmin.hospital) {
            assignedHospitalId = Number(matchedAdmin.hospital);
          }
        }
      } catch (e) {
        console.error('Error fetching admin record:', e);
      }

      if (!assignedHospitalId) {
        try {
          const saved = localStorage.getItem('selectedHospital');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.id) assignedHospitalId = parsed.id;
          }
        } catch {}
      }

      let hosp = null;
      if (assignedHospitalId) {
        const hospRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Hospital/${assignedHospitalId}/`).catch(() => null);
        if (hospRes && hospRes.ok) {
          hosp = await hospRes.json();
        }
      }

      if (!hosp) {
        const allHospRes = await fetch('http://127.0.0.1:8000/api/super-admin/Hospital/').catch(() => null);
        if (allHospRes && allHospRes.ok) {
          const allHosp = await allHospRes.json();
          hosp = (assignedHospitalId ? allHosp.find(h => Number(h.id) === Number(assignedHospitalId)) : null) || allHosp[0] || null;
          if (hosp) assignedHospitalId = hosp.id;
        }
      }

      if (hosp) {
        setHospitalData(hosp);
        if (setSelectedHospital) setSelectedHospital(hosp);
      }

      const recRes = await fetch('http://127.0.0.1:8000/api/super-admin/Receptionists/').catch(() => null);
      if (recRes && recRes.ok) {
        const allRecs = await recRes.json();
        if (assignedHospitalId) {
          const branchRecs = allRecs.filter(r => Number(r.hospital) === Number(assignedHospitalId));
          setReceptionists(branchRecs.length > 0 ? branchRecs : allRecs);
        } else {
          setReceptionists(allRecs);
        }
      }
    } catch (err) {
      console.error('Error loading receptionists data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminAndReceptionists();
  }, [currentUser]);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, shiftFilter, statusFilter]);

  const handleOpenAddModal = () => {
    setFormData({
      ...initialFormState,
      receptionist_id: '',
      password: ''
    });
    setShowAddPassword(false);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Receptionist Name is required.');
      return;
    }

    try {
      const generatedRecId = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
      const hospId = Number(hospitalData?.id || currentUser?.hospital || 1);
      const payload = {
        hospital: hospId,
        name: formData.name.trim(),
        receptionist_id: generatedRecId,
        role: formData.role || formData.designation || 'Front Desk Receptionist',
        designation: formData.role || formData.designation || 'Front Desk Receptionist',
        shift: formData.shift,
        languages: (formData.languages || 'English, Hindi').trim(),
        contact: (formData.contact || '').replace(/\D/g, '').slice(0, 10),
        email: formData.email.trim(),
        password: formData.password || '',
        desk: 'Main Lobby Desk 1',
        extension: 'Ext. 101',
        status: formData.is_active ? 'Active' : 'Off Duty',
        is_active: formData.is_active
      };

      const response = await fetch('http://127.0.0.1:8000/api/super-admin/Receptionists/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        const createdId = data.receptionist_id || generatedRecId;
        alert(`Receptionist registered successfully!\nReceptionist ID: ${createdId}`);
        setIsAddModalOpen(false);
        fetchAdminAndReceptionists();
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error creating receptionist:', error);
      alert('Network error while registering receptionist.');
    }
  };

  const handleToggleStatus = async (rec) => {
    const newStatus = !rec.is_active;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${rec.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus, status: newStatus ? 'Active' : 'On Leave' })
      });

      if (response.ok) {
        setReceptionists(prev => prev.map(r => r.id === rec.id ? { ...r, is_active: newStatus, status: newStatus ? 'Active' : 'On Leave' } : r));
      } else {
        const putRes = await fetch(`http://127.0.0.1:8000/api/super-admin/Receptionists/${rec.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...rec, is_active: newStatus, status: newStatus ? 'Active' : 'On Leave' })
        });
        if (putRes.ok) {
          setReceptionists(prev => prev.map(r => r.id === rec.id ? { ...r, is_active: newStatus, status: newStatus ? 'Active' : 'On Leave' } : r));
        }
      }
    } catch (err) {
      console.error('Error toggling receptionist status:', err);
    }
  };

  const handleViewReceptionistDetails = (rec) => {
    if (setSelectedReceptionist) {
      setSelectedReceptionist(rec);
    }
    localStorage.setItem('selectedReceptionist', JSON.stringify(rec));
    if (setCurrentPage) {
      setCurrentPage('admin_receptionist_details');
    }
  };

  const filteredReceptionists = receptionists.filter(rec => {
    const term = searchTerm.toLowerCase();
    const fullName = (rec.name || '').toLowerCase();
    const contact = (rec.contact || rec.phone || '').toLowerCase();
    const email = (rec.email || '').toLowerCase();

    const matchesSearch =
      fullName.includes(term) ||
      (rec.receptionist_id || '').toLowerCase().includes(term) ||
      (rec.role || '').toLowerCase().includes(term) ||
      (rec.shift || '').toLowerCase().includes(term) ||
      contact.includes(term) ||
      email.includes(term);

    const matchesShift = shiftFilter === 'ALL' || (rec.shift || '').toLowerCase().includes(shiftFilter.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Active' && rec.is_active !== false) ||
      (statusFilter === 'Inactive' && rec.is_active === false);

    return matchesSearch && matchesShift && matchesStatus;
  });

  const activeCount = receptionists.filter(r => r.is_active !== false && r.status !== 'On Leave').length;
  const leaveCount = receptionists.filter(r => r.is_active === false || r.status === 'On Leave').length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 text-xs font-semibold border border-teal-400/30">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              {hospitalData?.Name || 'Branch Hospital'} • Front Desk & Registration
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 tracking-tight text-slate-100">
              Front Desk & Receptionists
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Manage reception desks, patient registration counters, and shift rosters.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition duration-150 cursor-pointer flex items-center justify-center gap-2"
            >
              + Register New Receptionist
            </button>
            <button
              type="button"
              onClick={fetchAdminAndReceptionists}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-teal-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Desk</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-teal-50 text-teal-700 border-teal-200">
              Total Roster
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">Branch Receptionists</p>
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-0.5">{receptionists.length} Staff</h3>
          <p className="text-xs text-slate-500 mt-1">Assigned to this facility</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
              On Duty
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">Active on Counters</p>
          <h3 className="text-lg sm:text-xl font-bold text-emerald-700 mt-0.5">{activeCount} Available</h3>
          <p className="text-xs text-emerald-600 mt-1">Managing Inflow & Queries</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 shadow-sm hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leave</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-rose-50 text-rose-700 border-rose-200">
              On Leave
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-3">Inactive / Leave</p>
          <h3 className="text-lg sm:text-xl font-bold text-rose-700 mt-0.5">{leaveCount} Off Duty</h3>
          <p className="text-xs text-rose-600 mt-1">Login disabled while inactive</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, desk role..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 focus:outline-none focus:border-teal-600 cursor-pointer"
          >
            <option value="ALL">All Shifts</option>
            {shiftsList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-700 focus:outline-none focus:border-teal-600 cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-semibold text-slate-500">Loading branch receptionists from backend...</p>
            </div>
          ) : filteredReceptionists.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs font-semibold text-slate-500">No receptionists found matching criteria.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-3 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
              >
                + Register Receptionist Now
              </button>
            </div>
          ) : (
            <table className="w-full text-center text-xs text-slate-600 min-w-[760px]">
              <thead className="bg-slate-50/90 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 text-center">Receptionist Name & ID</th>
                  <th className="py-3.5 px-4 text-center">Desk Role</th>
                  <th className="py-3.5 px-4 text-center">Shift Timings</th>
                  <th className="py-3.5 px-4 text-center">CONTACT & EMAIL</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceptionists.slice(0, visibleCount).map((rec) => {
                  const emailLower = (rec.email || '').toLowerCase();
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-800 break-words">{rec.name || 'Receptionist'}</div>
                        <span className="font-mono text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block mt-0.5">
                          {rec.receptionist_id || `REC-${rec.id}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 inline-block">
                          {rec.role || 'Front Desk Receptionist'}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{rec.languages || 'English, Hindi'}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                        {rec.shift || 'Morning Shift (07:00 AM - 03:00 PM)'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="font-bold text-slate-800 text-xs">
                            {rec.contact || rec.phone || '-'}
                          </span>
                          {emailLower ? (
                            <a
                              href={`mailto:${emailLower}`}
                              title={`Send email to ${emailLower}`}
                              className="text-[11px] text-sky-700 hover:text-sky-900 hover:underline block lowercase transition truncate max-w-[180px]"
                            >
                              {emailLower}
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(rec)}
                          title="Click to toggle active/inactive status"
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            rec.is_active !== false && rec.status !== 'On Leave'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {rec.is_active !== false && rec.status !== 'On Leave' ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewReceptionistDetails(rec)}
                          className="px-3.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white font-bold text-xs transition cursor-pointer border border-teal-200 inline-flex items-center justify-center gap-1"
                        >
                          Details &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {visibleCount < filteredReceptionists.length && (
          <div className="p-4 text-center border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition duration-150 cursor-pointer"
            >
              Show More ({filteredReceptionists.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Register New Receptionist</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Receptionist Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Pooja Sharma"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="receptionist@hospital.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Contact Phone (Numbers only) *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Signin Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter signin password"
                      className="w-full pl-3 pr-16 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-1 top-1 bottom-1 px-2.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-300 shadow-2xs flex items-center transition cursor-pointer"
                    >
                      {showAddPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Role *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                >
                  {rolesList.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Shift *</label>
                  <select
                    required
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 font-medium cursor-pointer"
                  >
                    {shiftsList.map((s, i) => (
                      <option key={i} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Languages *</label>
                  <input
                    type="text"
                    required
                    value={formData.languages}
                    onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                    placeholder="e.g. English, Hindi, Marathi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-sky-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Assigned Hospital Branch</label>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={hospitalData?.Name ? `${hospitalData.Name} (${hospitalData.city || ''})` : 'Assigned Hospital Branch'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 font-semibold cursor-not-allowed select-none focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="receptionistActiveAddModal"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    is_active: e.target.checked,
                    status: e.target.checked ? 'Active' : 'Off Duty'
                  })}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                />
                <label htmlFor="receptionistActiveAddModal" className="font-semibold text-slate-700 cursor-pointer">
                  Receptionist Active & Available for Duty
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md transition cursor-pointer"
                >
                  Register Receptionist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReceptionists;
