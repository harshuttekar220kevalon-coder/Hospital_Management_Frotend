import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

const Doctor_Details = ({ currentUser, selectedDoctor, setSelectedDoctor, setCurrentPage }) => {
  const [doctor, setDoctor] = useState(() => {
    if (selectedDoctor) return selectedDoctor;
    try {
      const saved = localStorage.getItem('selectedDoctor');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleOpenResetPassword = () => {
    setResetEmail((doctor?.email || '').toLowerCase());
    setNewPassword('');
    setShowNewPassword(false);
    setIsResetPasswordModalOpen(true);
  };

  const handleSaveResetPassword = async (e) => {
    e.preventDefault();
    const emailToReset = (resetEmail || '').trim().toLowerCase();
    const passwordToSet = newPassword.trim();

    if (!emailToReset) {
      alert('Please enter a valid email address.');
      return;
    }
    if (!passwordToSet || passwordToSet.length < 6) {
      alert('Please enter a secure password of at least 6 characters.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/super-admin/Doctors/${doctor.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToReset,
          password: passwordToSet
        })
      });

      if (response.ok) {
        const updatedDoc = await response.json().catch(() => null);
        const freshDoctor = {
          ...doctor,
          email: emailToReset,
          password: passwordToSet,
          ...(updatedDoc || {})
        };
        setDoctor(freshDoctor);
        if (setSelectedDoctor) setSelectedDoctor(freshDoctor);
        localStorage.setItem('selectedDoctor', JSON.stringify(freshDoctor));

        setIsResetPasswordModalOpen(false);
        alert(`Password reset successfully for doctor with email: ${emailToReset}`);
      } else {
        alert('Failed to reset password. Please verify the email ID or network connection.');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Network error while resetting password.');
    }
  };

  useEffect(() => {
    if (selectedDoctor) {
      setDoctor(selectedDoctor);
    }
  }, [selectedDoctor]);

  useEffect(() => {
    if (!doctor) return;
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/super-admin/appointments/`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json().catch(() => []);
          const list = Array.isArray(data) ? data : (data?.results || data?.data || data?.appointments || []);
          const matched = list.filter(a => {
            const docId = typeof a.doctor === 'object' && a.doctor !== null ? a.doctor.id : a.doctor;
            return Number(docId) === Number(doctor.id);
          });
          setAppointments(matched);
        }
      } catch (e) {
        console.error('Error fetching doctor appointments:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [doctor?.id]);

  const handleBack = () => {
    if (setCurrentPage) {
      setCurrentPage('super_admin_doctors');
    }
  };

  if (!doctor) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-400 text-sm">No doctor selected</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
        >
          ← Back to Doctors List
        </button>
      </div>
    );
  }

  const isOff = String(doctor.status || doctor.duty_status || '').toLowerCase().includes('off') || String(doctor.status || '').toLowerCase().includes('leave');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
        >
          ← Back to Doctors
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenResetPassword}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
          >
            Reset Password
          </button>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isOff ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOff ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
            {isOff ? 'Off Duty / On Leave' : 'On Duty'}
          </span>
        </div>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold text-2xl">
            {(doctor.name || 'D').replace('Dr. ', '').charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{doctor.name}</h1>
            <p className="text-xs text-teal-400 font-medium">{doctor.specialization || 'Specialist'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
            <span className="text-slate-400 block mb-1">Contact Phone</span>
            <span className="font-semibold text-slate-200 font-mono text-sm">{doctor.contact || doctor.phone || '-'}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
            <span className="text-slate-400 block mb-1">Email Address</span>
            <span className="font-semibold text-slate-200 text-sm truncate block">{doctor.email || '-'}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
            <span className="text-slate-400 block mb-1">Duty Shift</span>
            <span className="font-semibold text-amber-300 text-sm">{doctor.Shifts || doctor.shift || 'Morning First Shift'}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
            <span className="text-slate-400 block mb-1">Consultation Fee</span>
            <span className="font-semibold text-emerald-400 font-mono text-sm">₹{doctor.consultation_fee || '500'}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 sm:col-span-2">
            <span className="text-slate-400 block mb-1">Assigned Hospital</span>
            <span className="font-semibold text-slate-200 text-sm">{doctor.hospital_name || 'Hospital Branch'}</span>
          </div>
        </div>
      </div>

      {/* Assigned Appointments */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
        <h2 className="text-base font-bold text-white">Assigned Appointments ({appointments.length})</h2>
        {loading ? (
          <p className="text-xs text-slate-400">Loading appointments...</p>
        ) : appointments.length === 0 ? (
          <p className="text-xs text-slate-400">No appointments assigned to this doctor yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Date/Time</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {appointments.map((a, idx) => (
                  <tr key={a.id || idx} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{a.patient_name || a.name}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{a.contact || a.phone}</td>
                    <td className="py-2.5 px-3 text-slate-300">{a.visit_date_time || 'Scheduled'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {a.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Reset Doctor Password</h2>
              <button
                type="button"
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Doctor Email *</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 lowercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">New Secure Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-3 pr-16 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-semibold text-[11px] cursor-pointer"
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctor_Details;
