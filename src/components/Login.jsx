import React, { useState } from 'react';
import { API_BASE_URL } from './Api/Api';

const Login = ({ setCurrentPage, setIsLoggedIn }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [inactivityMessage, setInactivityMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (inactivityMessage) setInactivityMessage('');
    if (errorMessage) setErrorMessage('');
  };

  // Helper to determine if an account is inactive
  const isUserInactive = (user) => {
    if (!user) return false;
    if (
      user.is_active === false ||
      user.is_active === 'false' ||
      user.is_active === 0 ||
      user.is_active === '0'
    ) {
      return true;
    }
    const statusStr = (user.status || '').toString().toLowerCase().trim();
    if (
      statusStr === 'inactive' ||
      statusStr === 'deactivated' ||
      statusStr === 'blocked' ||
      statusStr === 'disabled'
    ) {
      return true;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setInactivityMessage('');
    setErrorMessage('');

    const normalizedEmail = (formData.email || '').toLowerCase().trim();
    const inputPassword = (formData.password || '').trim();

    if (!normalizedEmail || !inputPassword) {
      alert('Please enter both email and password.');
      setLoading(false);
      return;
    }

    try {
      let loginSuccess = false;
      let authenticatedUser = null;
      let customInactiveMsg = '';

      // 1. Try server direct login endpoint
      let serverLoginRes = await fetch(`${API_BASE_URL}/user-login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      }).catch(() => null);

      if (!serverLoginRes || !serverLoginRes.ok) {
        serverLoginRes = await fetch(`${API_BASE_URL}/Login/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }).catch(() => null);
      }

      let serverUserData = null;
      if (serverLoginRes && serverLoginRes.ok) {
        const data = await serverLoginRes.json().catch(() => ({}));
        const userObj = data.user || data.data || data || {};
        const serverRole = (userObj.role || data.role || '').toString().trim();

        serverUserData = {
          ...userObj,
          id: userObj.id || data.id,
          name: userObj.name || (userObj.first_name ? `${userObj.first_name} ${userObj.last_name || ''}`.trim() : ''),
          role: serverRole,
          email: formData.email || userObj.email,
          hospital: userObj.hospital || userObj.hospital_id || data.hospital || null,
          is_active: userObj.is_active !== false && data.is_active !== false
        };
      }

      // 2. Fetch all role collections from database to verify role, credentials, and active status
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

      const matchDoc = docList.find(d => (d.email || '').toLowerCase().trim() === normalizedEmail);
      const matchNurse = nurseList.find(n => (n.email || '').toLowerCase().trim() === normalizedEmail);
      const matchRec = recList.find(r => (r.email || '').toLowerCase().trim() === normalizedEmail);
      const matchAdmin = adminList.find(a => (a.email || '').toLowerCase().trim() === normalizedEmail);
      const matchPat = patList.find(p => (p.email || '').toLowerCase().trim() === normalizedEmail);

      // Check if user is Super Admin
      const isSuperAdminEmail = normalizedEmail.includes('super') || 
                                (serverUserData?.role || '').toString().toUpperCase().includes('SUPER') ||
                                normalizedEmail === 'superadmin@hospital.com' ||
                                normalizedEmail === 'admin@apexcare.com';

      // ==========================================
      // ROLE CHECK 1: DOCTOR
      // ==========================================
      if (matchDoc) {
        if (isUserInactive(matchDoc)) {
          customInactiveMsg = 'Your Doctor account is Inactive. Please contact your Hospital Administrator to activate your account.';
          setInactivityMessage(customInactiveMsg);
          alert(customInactiveMsg);
          setLoading(false);
          return;
        }

        if (matchDoc.password && matchDoc.password.trim() && matchDoc.password.trim() !== inputPassword) {
          setErrorMessage('Invalid email or password.');
          alert('Invalid email or password.');
          setLoading(false);
          return;
        }

        authenticatedUser = {
          ...matchDoc,
          id: matchDoc.id,
          doctor_id: matchDoc.doctor_id || `DOC-${matchDoc.id}`,
          name: matchDoc.name || 'Doctor',
          role: 'Doctor',
          email: matchDoc.email || formData.email,
          specialization: matchDoc.specialization || matchDoc.specialty || 'General Medicine',
          opd_timings: matchDoc.opd_timings,
          phone: matchDoc.phone || matchDoc.contact,
          hospital: matchDoc.hospital || (Array.isArray(matchDoc.hospitals) ? matchDoc.hospitals[0] : null),
          is_active: true
        };
        loginSuccess = true;
      }

      // ==========================================
      // ROLE CHECK 2: NURSE
      // ==========================================
      else if (matchNurse) {
        if (isUserInactive(matchNurse)) {
          customInactiveMsg = 'Your Nurse account is Inactive. Please contact your Hospital Administrator to activate your account.';
          setInactivityMessage(customInactiveMsg);
          alert(customInactiveMsg);
          setLoading(false);
          return;
        }

        if (matchNurse.password && matchNurse.password.trim() && matchNurse.password.trim() !== inputPassword) {
          setErrorMessage('Invalid email or password.');
          alert('Invalid email or password.');
          setLoading(false);
          return;
        }

        authenticatedUser = {
          ...matchNurse,
          id: matchNurse.id,
          nurse_id: matchNurse.nurse_id || `NUR-${matchNurse.id}`,
          name: matchNurse.name || `${matchNurse.first_name || ''} ${matchNurse.last_name || ''}`.trim() || 'Nurse',
          role: 'Nurse',
          email: matchNurse.email || formData.email,
          nurse_role: matchNurse.nurse_role || matchNurse.role || 'Staff Nurse',
          ward: matchNurse.ward || 'General Ward',
          shift: matchNurse.shift || 'Morning Shift',
          phone: matchNurse.contact || matchNurse.phone,
          hospital: matchNurse.hospital || null,
          is_active: true
        };
        loginSuccess = true;
      }

      // ==========================================
      // ROLE CHECK 3: RECEPTIONIST
      // ==========================================
      else if (matchRec) {
        if (isUserInactive(matchRec)) {
          customInactiveMsg = 'Your Receptionist account is Inactive. Please contact your Hospital Administrator to activate your account.';
          setInactivityMessage(customInactiveMsg);
          alert(customInactiveMsg);
          setLoading(false);
          return;
        }

        if (matchRec.password && matchRec.password.trim() && matchRec.password.trim() !== inputPassword) {
          setErrorMessage('Invalid email or password.');
          alert('Invalid email or password.');
          setLoading(false);
          return;
        }

        authenticatedUser = {
          ...matchRec,
          id: matchRec.id,
          receptionist_id: matchRec.receptionist_id || `REC-${matchRec.id}`,
          name: matchRec.name || 'Receptionist',
          role: 'Receptionist',
          email: matchRec.email || formData.email,
          role_title: matchRec.role || 'Front Desk',
          shift: matchRec.shift || 'Morning Shift',
          languages: matchRec.languages,
          phone: matchRec.contact || matchRec.phone,
          hospital: matchRec.hospital || null,
          is_active: true
        };
        loginSuccess = true;
      }

      // ==========================================
      // ROLE CHECK 4: HOSPITAL ADMIN
      // ==========================================
      else if (matchAdmin) {
        if (isUserInactive(matchAdmin)) {
          customInactiveMsg = 'Your Administrator account is Inactive. Please contact Super Admin to activate your account.';
          setInactivityMessage(customInactiveMsg);
          alert(customInactiveMsg);
          setLoading(false);
          return;
        }

        if (matchAdmin.password && matchAdmin.password.trim() && matchAdmin.password.trim() !== inputPassword) {
          setErrorMessage('Invalid email or password.');
          alert('Invalid email or password.');
          setLoading(false);
          return;
        }

        authenticatedUser = {
          ...matchAdmin,
          id: matchAdmin.id,
          employee_id: matchAdmin.employee_id || `ADM-${matchAdmin.id}`,
          name: matchAdmin.name || 'Administrator',
          role: 'Hospital Admin',
          email: matchAdmin.email || formData.email,
          designation: matchAdmin.designation || 'Hospital Administrator',
          phone: matchAdmin.contact || matchAdmin.phone,
          hospital: matchAdmin.hospital || null,
          is_active: true
        };
        loginSuccess = true;
      }

      // ==========================================
      // ROLE CHECK 5: PATIENT
      // ==========================================
      else if (matchPat) {
        if (isUserInactive(matchPat)) {
          customInactiveMsg = 'Your Patient account is Inactive. Please contact Hospital Administration to activate your account.';
          setInactivityMessage(customInactiveMsg);
          alert(customInactiveMsg);
          setLoading(false);
          return;
        }

        if (matchPat.password && matchPat.password.trim() && matchPat.password.trim() !== inputPassword) {
          setErrorMessage('Invalid email or password.');
          alert('Invalid email or password.');
          setLoading(false);
          return;
        }

        authenticatedUser = {
          ...matchPat,
          id: matchPat.id,
          patient_id: matchPat.patient_id || matchPat.uhid || `PAT-${matchPat.id}`,
          name: matchPat.name || 'Patient',
          role: 'Patient',
          email: matchPat.email || formData.email,
          doctor: matchPat.doctor,
          phone: matchPat.contact || matchPat.phone,
          hospital: matchPat.hospital || null,
          is_active: true
        };
        loginSuccess = true;
      }

      // ==========================================
      // ROLE CHECK 6: SUPER ADMIN
      // ==========================================
      else if (isSuperAdminEmail) {
        if (serverUserData && isUserInactive(serverUserData)) {
          customInactiveMsg = 'Your Super Admin account is Inactive. Please contact System Management.';
          setInactivityMessage(customInactiveMsg);
          alert(customInactiveMsg);
          setLoading(false);
          return;
        }

        authenticatedUser = {
          name: serverUserData?.name || 'Super Admin',
          role: 'Super Admin',
          email: formData.email,
          is_active: true
        };
        loginSuccess = true;
      }

      // ==========================================
      // FALLBACK: SERVER AUTHENTICATED USER
      // ==========================================
      else if (serverUserData) {
        if (isUserInactive(serverUserData)) {
          customInactiveMsg = 'Your account is Inactive. Please contact your Hospital Administrator to activate your account.';
          setInactivityMessage(customInactiveMsg);
          alert(customInactiveMsg);
          setLoading(false);
          return;
        }
        authenticatedUser = serverUserData;
        loginSuccess = true;
      }

      // ==========================================
      // FINALIZE AUTHENTICATION & LOGIN
      // ==========================================
      if (loginSuccess && authenticatedUser) {
        let finalRole = authenticatedUser.role || 'Admin';
        const roleUpper = finalRole.toUpperCase();

        if (roleUpper.includes('DOCTOR')) finalRole = 'Doctor';
        else if (roleUpper.includes('NURSE')) finalRole = 'Nurse';
        else if (roleUpper.includes('RECEPTION')) finalRole = 'Receptionist';
        else if (roleUpper.includes('PATIENT')) finalRole = 'Patient';
        else if (roleUpper.includes('SUPER')) finalRole = 'Super Admin';
        else if (roleUpper.includes('ADMIN')) finalRole = 'Hospital Admin';

        const finalUser = {
          ...authenticatedUser,
          role: finalRole,
          name: authenticatedUser.name || formData.email.split('@')[0],
          email: formData.email || authenticatedUser.email,
          is_active: true
        };

        alert(`Login successful! Welcome, ${finalUser.name} (${finalRole})`);
        if (setIsLoggedIn) {
          setIsLoggedIn(finalUser);
        }
      } else {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
        alert('Error: Invalid email or password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('Unable to connect to authentication server. Please verify backend is running.');
      alert('Unable to connect to authentication server. Please verify backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-slate-100 w-full overflow-x-hidden">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-300/40 border border-slate-200/90 p-5 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-blue-600 text-white mb-3 shadow-md">
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Hospital Portal Login</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Enter your credentials to access your dashboard
          </p>
        </div>

        {/* INACTIVE ACCOUNT ALERT BANNER */}
        {inactivityMessage && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
            <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              ✕
            </div>
            <div className="flex-1">
              <p className="font-bold text-rose-900 text-sm">Account Inactive / Disabled</p>
              <p className="mt-1 text-rose-700 leading-relaxed font-medium">{inactivityMessage}</p>
            </div>
          </div>
        )}

        {/* ERROR MESSAGE ALERT */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between shadow-xs">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage('')} className="font-bold cursor-pointer text-amber-900">✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@hospital.com"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition duration-150"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              {setCurrentPage && (
                <button
                  type="button"
                  onClick={() => setCurrentPage('reset_password')}
                  className="text-xs font-medium text-teal-700 hover:underline cursor-pointer"
                >
                  Reset Password?
                </button>
              )}
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition duration-150"
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
                <span>Authenticating...</span>
              </>
            ) : (
              'Sign In to Portal'
            )}
          </button>
        </form>

        {setCurrentPage && (
          <p className="text-center text-xs text-slate-500 mt-6">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setCurrentPage('signin')}
              className="text-teal-700 font-semibold hover:underline cursor-pointer"
            >
              Register here
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;