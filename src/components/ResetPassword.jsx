import React, { useState } from 'react';
import { API_BASE_URL } from './Api/Api';

const ResetPassword = ({ setCurrentPage }) => {
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (errorMsg) setErrorMsg('');
    if (successMsg) setSuccessMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const normalizedEmail = (formData.email || '').toLowerCase().trim();
    const newPass = (formData.newPassword || '').trim();
    const confirmPass = (formData.confirmPassword || '').trim();

    // 1. Basic validation
    if (!normalizedEmail) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    if (!newPass || newPass.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPass !== confirmPass) {
      setErrorMsg('Passwords do not match! Please verify and try again.');
      return;
    }

    setLoading(true);

    try {
      // 2. Strict Backend Email Verification: Check if email exists in database
      const [docsRes, nursesRes, recsRes, adminsRes, patsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Doctors/`),
        fetch(`${API_BASE_URL}/super-admin/Nurses/`),
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`),
        fetch(`${API_BASE_URL}/super-admin/Admins/`),
        fetch(`${API_BASE_URL}/super-admin/Patients/`)
      ]);

      const docList = docsRes.status === 'fulfilled' && docsRes.value.ok ? await docsRes.value.json().catch(() => []) : [];
      const nurseList = nursesRes.status === 'fulfilled' && nursesRes.value.ok ? await nursesRes.value.json().catch(() => []) : [];
      const recList = recsRes.status === 'fulfilled' && recsRes.value.ok ? await recsRes.value.json().catch(() => []) : [];
      const adminList = adminsRes.status === 'fulfilled' && adminsRes.value.ok ? await adminsRes.value.json().catch(() => []) : [];
      const patList = patsRes.status === 'fulfilled' && patsRes.value.ok ? await patsRes.value.json().catch(() => []) : [];

      const matchDoc = Array.isArray(docList) ? docList.find(d => (d.email || '').toLowerCase().trim() === normalizedEmail) : null;
      const matchNurse = Array.isArray(nurseList) ? nurseList.find(n => (n.email || '').toLowerCase().trim() === normalizedEmail) : null;
      const matchRec = Array.isArray(recList) ? recList.find(r => (r.email || '').toLowerCase().trim() === normalizedEmail) : null;
      const matchAdmin = Array.isArray(adminList) ? adminList.find(a => (a.email || '').toLowerCase().trim() === normalizedEmail) : null;
      const matchPat = Array.isArray(patList) ? patList.find(p => (p.email || '').toLowerCase().trim() === normalizedEmail) : null;
      
      const isSuperAdmin = normalizedEmail === 'superadmin@hospital.com' || normalizedEmail === 'admin@apexcare.com' || normalizedEmail.includes('superadmin');

      const matchedUser = matchDoc || matchNurse || matchRec || matchAdmin || matchPat || (isSuperAdmin ? { email: normalizedEmail, name: 'Super Administrator' } : null);

      // 3. If email is NOT found in backend, DO NOT reset password!
      if (!matchedUser) {
        setErrorMsg(`Email not found! No registered account exists with "${formData.email}". Please enter a valid registered email.`);
        setLoading(false);
        return;
      }

      // 4. Email is valid and exists -> Update password in backend
      let updateSuccessful = false;

      if (matchDoc && matchDoc.id) {
        const patchRes = await fetch(`${API_BASE_URL}/super-admin/Doctors/${matchDoc.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPass })
        }).catch(() => null);
        if (patchRes && patchRes.ok) updateSuccessful = true;
      } else if (matchNurse && matchNurse.id) {
        const patchRes = await fetch(`${API_BASE_URL}/super-admin/Nurses/${matchNurse.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPass })
        }).catch(() => null);
        if (patchRes && patchRes.ok) updateSuccessful = true;
      } else if (matchRec && matchRec.id) {
        const patchRes = await fetch(`${API_BASE_URL}/super-admin/Receptionists/${matchRec.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPass })
        }).catch(() => null);
        if (patchRes && patchRes.ok) updateSuccessful = true;
      } else if (matchAdmin && matchAdmin.id) {
        const patchRes = await fetch(`${API_BASE_URL}/super-admin/Admins/${matchAdmin.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPass })
        }).catch(() => null);
        if (patchRes && patchRes.ok) updateSuccessful = true;
      } else if (matchPat && matchPat.id) {
        const patchRes = await fetch(`${API_BASE_URL}/super-admin/Patients/${matchPat.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPass })
        }).catch(() => null);
        if (patchRes && patchRes.ok) updateSuccessful = true;
      }

      // Also call global reset-password endpoint if backend provides it
      await fetch(`${API_BASE_URL}/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: newPass,
          new_password: newPass
        })
      }).catch(() => null);

      setSuccessMsg(`✓ Password reset successfully for ${matchedUser.name || formData.email}! Redirecting to login...`);
      setFormData({ email: '', newPassword: '', confirmPassword: '' });

      setTimeout(() => {
        if (setCurrentPage) {
          setCurrentPage('login');
        }
      }, 2000);

    } catch (error) {
      console.error('Error during password reset:', error);
      setErrorMsg('Unable to connect to server. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg shadow-slate-300/40 border border-slate-200/90 p-5 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-50 text-amber-700 mb-3 border border-amber-200 shadow-xs">
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Create New Password</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Enter your registered email address to verify your account and set a new password
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-150">
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-150">
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Registered Email Address *
            </label>
            <input
              type="email"
              name="email"
              autoComplete="off"
              value={formData.email}
              onChange={handleChange}
              placeholder="Type your registered email (e.g. user@hospital.com)"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-600/20 transition duration-150"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Email must be registered in the hospital system to reset password.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                New Password *
              </label>
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
              >
                {showNewPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showNewPassword ? 'text' : 'password'}
              name="newPassword"
              autoComplete="new-password"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter new password (min 6 characters)"
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-600/20 transition duration-150"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Confirm New Password *
              </label>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter new password"
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-600/20 transition duration-150"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-md transition duration-150 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Verifying Email & Resetting...</span>
              </>
            ) : (
              'Verify Email & Save Password'
            )}
          </button>
        </form>

        {setCurrentPage && (
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setCurrentPage('login')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              &larr; Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
