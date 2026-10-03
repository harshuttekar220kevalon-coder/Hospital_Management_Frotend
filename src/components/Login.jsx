import React, { useState } from 'react';
import { API_BASE_URL } from './Api/Api';

const Login = ({ setCurrentPage, setIsLoggedIn }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setInactivityMessage('');
    setErrorMessage('');

    const emailInput = (formData.email || '').trim();
    const passwordInput = (formData.password || '');

    if (!emailInput || !passwordInput) {
      alert('Please enter both ID / Email and password.');
      setLoading(false);
      return;
    }

    try {
      const inputClean = emailInput.trim();
      const inputLower = inputClean.toLowerCase();

      // 1. Direct Backend Authentication Request
      let response = await fetch(`${API_BASE_URL}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inputClean,
          username: inputClean,
          nurse_id: inputClean,
          doctor_id: inputClean,
          receptionist_id: inputClean,
          patient_id: inputClean,
          id: inputClean,
          identifier: inputClean,
          password: passwordInput
        }),
      }).catch(() => null);

      let data = response ? await response.json().catch(() => ({})) : null;

      // 2. Handle HTTP 200 from backend /login/
      if (response && response.ok && response.status === 200 && data) {
        const userObj = data.user || data;
        const backendRole = (
          data.role ||
          userObj.role ||
          userObj.Select_User ||
          data.Select_User ||
          ''
        ).toString().trim().toUpperCase();

        const isSuperUserFlag = Boolean(userObj.is_superuser || data.is_superuser);

        let mappedRole = '';
        if (
          backendRole.includes('SUPER') ||
          backendRole === 'SUPER_ADMIN' ||
          backendRole === 'SUPERADMIN' ||
          isSuperUserFlag ||
          inputLower.includes('superadmin') ||
          inputLower === 'admin@gmail.com' ||
          inputLower === 'admin@hospital.com' ||
          inputLower === 'admin@apexcare.com'
        ) {
          mappedRole = 'Super Admin';
        } else if (backendRole.includes('ADMIN') || backendRole === 'ADMIN') {
          mappedRole = 'Hospital Admin';
        } else if (backendRole.includes('DOCTOR') || backendRole === 'DOCTOR') {
          mappedRole = 'Doctor';
        } else if (backendRole.includes('NURSE') || backendRole === 'NURSES') {
          mappedRole = 'Nurse';
        } else if (backendRole.includes('RECEPTION') || backendRole === 'RECEPTIONISTS') {
          mappedRole = 'Receptionist';
        } else if (backendRole.includes('PATIENT') || backendRole === 'PATIENTS') {
          mappedRole = 'Patient';
        } else {
          if (inputLower.includes('admin') || inputLower.includes('super')) {
            mappedRole = 'Super Admin';
          } else if (inputLower.includes('doc')) {
            mappedRole = 'Doctor';
          } else if (inputLower.includes('nur')) {
            mappedRole = 'Nurse';
          } else if (inputLower.includes('rec')) {
            mappedRole = 'Receptionist';
          } else {
            mappedRole = 'Patient';
          }
        }

        const finalUser = {
          id: userObj.id || data.id,
          name: userObj.name || (userObj.first_name ? `${userObj.first_name} ${userObj.last_name || ''}`.trim() : '') || inputClean.split('@')[0],
          email: userObj.email || (inputClean.includes('@') ? inputClean : `${inputClean}@hospital.com`),
          nurse_id: userObj.nurse_id || (mappedRole === 'Nurse' ? inputClean : undefined),
          doctor_id: userObj.doctor_id || (mappedRole === 'Doctor' ? inputClean : undefined),
          receptionist_id: userObj.receptionist_id || (mappedRole === 'Receptionist' ? inputClean : undefined),
          role: mappedRole,
          rawRole: backendRole || mappedRole,
          hospital: userObj.hospital || null,
          is_active: true
        };

        const welcomeMsg = data.message || `Welcome, ${finalUser.name}!`;
        alert(welcomeMsg);

        if (setIsLoggedIn) {
          setIsLoggedIn(finalUser);
        }
        return;
      }

      // 3. Fallback verification against Staff database tables (Nurses, Doctors, Receptionists, Admins, Patients)
      const [nursesRes, doctorsRes, recsRes, adminsRes, patientsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/super-admin/Nurses/`),
        fetch(`${API_BASE_URL}/super-admin/Doctors/`),
        fetch(`${API_BASE_URL}/super-admin/Receptionists/`),
        fetch(`${API_BASE_URL}/super-admin/Admins/`),
        fetch(`${API_BASE_URL}/super-admin/Patients/`)
      ]);

      const nurseList = nursesRes.status === 'fulfilled' && nursesRes.value?.ok ? await nursesRes.value.json().catch(() => []) : [];
      const docList = doctorsRes.status === 'fulfilled' && doctorsRes.value?.ok ? await doctorsRes.value.json().catch(() => []) : [];
      const recList = recsRes.status === 'fulfilled' && recsRes.value?.ok ? await recsRes.value.json().catch(() => []) : [];
      const adminList = adminsRes.status === 'fulfilled' && adminsRes.value?.ok ? await adminsRes.value.json().catch(() => []) : [];
      const patList = patientsRes.status === 'fulfilled' && patientsRes.value?.ok ? await patientsRes.value.json().catch(() => []) : [];

      const cleanDigits = inputClean.replace(/\D/g, '');

      // Check Nurse match
      const matchNurse = Array.isArray(nurseList) ? nurseList.find(n => {
        const nIdStr = String(n.nurse_id || '').toLowerCase().trim();
        const idStr = String(n.id || '').trim();
        const nEmail = String(n.email || '').toLowerCase().trim();
        const nContact = String(n.contact || '').replace(/\D/g, '');
        const nName = String(n.name || '').toLowerCase().trim();
        return (
          (nIdStr && nIdStr === inputLower) ||
          (nIdStr && nIdStr.replace(/[^a-z0-9]/gi, '') === inputLower.replace(/[^a-z0-9]/gi, '')) ||
          idStr === inputClean ||
          (nEmail && nEmail === inputLower) ||
          (cleanDigits.length >= 7 && nContact === cleanDigits) ||
          (nName && nName === inputLower)
        );
      }) : null;

      if (matchNurse) {
        if (matchNurse.is_active === false || matchNurse.status === 'Deactivated' || matchNurse.status === 'Inactive') {
          const msg = 'Your nurse account is currently deactivated. Please contact hospital administrator.';
          setInactivityMessage(msg);
          alert(msg);
          return;
        }

        const nursePass = matchNurse.password;
        if (nursePass && String(nursePass).trim() !== String(passwordInput).trim()) {
          const msg = 'Invalid password for Nurse account. Please check your password.';
          setErrorMessage(msg);
          alert(msg);
          return;
        }

        const finalUser = {
          id: matchNurse.id,
          nurse_id: matchNurse.nurse_id || `NUR-${matchNurse.id}`,
          name: matchNurse.name || 'Staff Nurse',
          email: matchNurse.email || `${matchNurse.nurse_id || 'nurse'}@hospital.com`,
          role: 'Nurse',
          rawRole: matchNurse.role || matchNurse.nurse_role || 'Staff Nurse',
          hospital: typeof matchNurse.hospital === 'object' ? matchNurse.hospital?.id : matchNurse.hospital,
          hospital_name: matchNurse.hospital_name || (typeof matchNurse.hospital === 'object' ? matchNurse.hospital?.Name : null),
          ward: matchNurse.ward || 'General Ward',
          shift: matchNurse.shift || 'Morning',
          status: matchNurse.status || 'On_Duty',
          is_active: true
        };

        alert(`Welcome, ${finalUser.name}!`);
        if (setIsLoggedIn) {
          setIsLoggedIn(finalUser);
        }
        return;
      }

      // Check Doctor match
      const matchDoc = Array.isArray(docList) ? docList.find(d => {
        const dIdStr = String(d.doctor_id || '').toLowerCase().trim();
        const idStr = String(d.id || '').trim();
        const dEmail = String(d.email || '').toLowerCase().trim();
        const dContact = String(d.contact || d.phone || '').replace(/\D/g, '');
        const dName = String(d.name || '').toLowerCase().trim();
        return (
          (dIdStr && dIdStr === inputLower) ||
          (dIdStr && dIdStr.replace(/[^a-z0-9]/gi, '') === inputLower.replace(/[^a-z0-9]/gi, '')) ||
          idStr === inputClean ||
          (dEmail && dEmail === inputLower) ||
          (cleanDigits.length >= 7 && dContact === cleanDigits) ||
          (dName && dName === inputLower)
        );
      }) : null;

      if (matchDoc) {
        if (matchDoc.is_active === false || matchDoc.status === 'Deactivated' || matchDoc.status === 'Inactive') {
          const msg = 'Your doctor account is currently deactivated. Please contact hospital administrator.';
          setInactivityMessage(msg);
          alert(msg);
          return;
        }
        if (matchDoc.password && String(matchDoc.password).trim() !== String(passwordInput).trim()) {
          const msg = 'Invalid password for Doctor account. Please check your password.';
          setErrorMessage(msg);
          alert(msg);
          return;
        }

        const finalUser = {
          id: matchDoc.id,
          doctor_id: matchDoc.doctor_id || `DOC-${matchDoc.id}`,
          name: matchDoc.name ? (matchDoc.name.startsWith('Dr.') ? matchDoc.name : `Dr. ${matchDoc.name}`) : 'Doctor',
          email: matchDoc.email || `${matchDoc.doctor_id || 'doctor'}@hospital.com`,
          role: 'Doctor',
          rawRole: 'Doctor',
          specialization: matchDoc.specialization || matchDoc.specialty || 'General Physician',
          hospital: typeof matchDoc.hospital === 'object' ? matchDoc.hospital?.id : matchDoc.hospital,
          is_active: true
        };

        alert(`Welcome, ${finalUser.name}!`);
        if (setIsLoggedIn) {
          setIsLoggedIn(finalUser);
        }
        return;
      }

      // Check Receptionist match
      const matchRec = Array.isArray(recList) ? recList.find(r => {
        const rIdStr = String(r.receptionist_id || '').toLowerCase().trim();
        const idStr = String(r.id || '').trim();
        const rEmail = String(r.email || '').toLowerCase().trim();
        const rContact = String(r.contact || '').replace(/\D/g, '');
        const rName = String(r.name || '').toLowerCase().trim();
        return (
          (rIdStr && rIdStr === inputLower) ||
          (rIdStr && rIdStr.replace(/[^a-z0-9]/gi, '') === inputLower.replace(/[^a-z0-9]/gi, '')) ||
          idStr === inputClean ||
          (rEmail && rEmail === inputLower) ||
          (cleanDigits.length >= 7 && rContact === cleanDigits) ||
          (rName && rName === inputLower)
        );
      }) : null;

      if (matchRec) {
        if (matchRec.is_active === false || matchRec.status === 'Deactivated' || matchRec.status === 'Inactive') {
          const msg = 'Your receptionist account is currently deactivated. Please contact hospital administrator.';
          setInactivityMessage(msg);
          alert(msg);
          return;
        }
        if (matchRec.password && String(matchRec.password).trim() !== String(passwordInput).trim()) {
          const msg = 'Invalid password for Receptionist account. Please check your password.';
          setErrorMessage(msg);
          alert(msg);
          return;
        }

        const finalUser = {
          id: matchRec.id,
          receptionist_id: matchRec.receptionist_id || `REC-${matchRec.id}`,
          name: matchRec.name || 'Hospital Receptionist',
          email: matchRec.email || `${matchRec.receptionist_id || 'receptionist'}@hospital.com`,
          role: 'Receptionist',
          rawRole: 'Receptionist',
          hospital: typeof matchRec.hospital === 'object' ? matchRec.hospital?.id : matchRec.hospital,
          is_active: true
        };

        alert(`Welcome, ${finalUser.name}!`);
        if (setIsLoggedIn) {
          setIsLoggedIn(finalUser);
        }
        return;
      }

      // Check Admin match
      const matchAdmin = Array.isArray(adminList) ? adminList.find(a => {
        const idStr = String(a.id || '').trim();
        const aEmail = String(a.email || '').toLowerCase().trim();
        const aContact = String(a.contact || '').replace(/\D/g, '');
        const aName = String(a.name || '').toLowerCase().trim();
        return (
          idStr === inputClean ||
          (aEmail && aEmail === inputLower) ||
          (cleanDigits.length >= 7 && aContact === cleanDigits) ||
          (aName && aName === inputLower)
        );
      }) : null;

      if (matchAdmin) {
        if (matchAdmin.is_active === false || matchAdmin.status === 'Deactivated') {
          const msg = 'Your administrator account is deactivated.';
          setInactivityMessage(msg);
          alert(msg);
          return;
        }
        if (matchAdmin.password && String(matchAdmin.password).trim() !== String(passwordInput).trim()) {
          const msg = 'Invalid password for Administrator account.';
          setErrorMessage(msg);
          alert(msg);
          return;
        }

        const finalUser = {
          id: matchAdmin.id,
          name: matchAdmin.name || 'Hospital Administrator',
          email: matchAdmin.email,
          role: 'Hospital Admin',
          rawRole: 'Admin',
          hospital: typeof matchAdmin.hospital === 'object' ? matchAdmin.hospital?.id : matchAdmin.hospital,
          is_active: true
        };

        alert(`Welcome, ${finalUser.name}!`);
        if (setIsLoggedIn) {
          setIsLoggedIn(finalUser);
        }
        return;
      }

      // Check Patient match
      const matchPat = Array.isArray(patList) ? patList.find(p => {
        const pIdStr = String(p.patient_id || p.uhid || '').toLowerCase().trim();
        const idStr = String(p.id || '').trim();
        const pEmail = String(p.email || '').toLowerCase().trim();
        const pContact = String(p.contact || p.phone || '').replace(/\D/g, '');
        const pName = String(p.name || '').toLowerCase().trim();
        return (
          (pIdStr && pIdStr === inputLower) ||
          (pIdStr && pIdStr.replace(/[^a-z0-9]/gi, '') === inputLower.replace(/[^a-z0-9]/gi, '')) ||
          idStr === inputClean ||
          (pEmail && pEmail === inputLower) ||
          (cleanDigits.length >= 7 && pContact === cleanDigits) ||
          (pName && pName === inputLower)
        );
      }) : null;

      if (matchPat) {
        if (matchPat.is_active === false) {
          const msg = 'Patient file is currently inactive.';
          setInactivityMessage(msg);
          alert(msg);
          return;
        }
        if (matchPat.password && String(matchPat.password).trim() !== String(passwordInput).trim()) {
          const msg = 'Invalid password for Patient account.';
          setErrorMessage(msg);
          alert(msg);
          return;
        }

        const finalUser = {
          id: matchPat.id,
          patient_id: matchPat.patient_id || matchPat.uhid || `PAT-${matchPat.id}`,
          name: matchPat.name || 'Patient',
          email: matchPat.email || `${matchPat.patient_id || 'patient'}@hospital.com`,
          role: 'Patient',
          rawRole: 'Patient',
          hospital: typeof matchPat.hospital === 'object' ? matchPat.hospital?.id : matchPat.hospital,
          is_active: true
        };

        alert(`Welcome, ${finalUser.name}!`);
        if (setIsLoggedIn) {
          setIsLoggedIn(finalUser);
        }
        return;
      }

      // If no match found anywhere
      if (response && response.status === 403) {
        const msg = data?.message || data?.detail || 'Your account is deactivated. Please contact your administrator.';
        setInactivityMessage(msg);
        alert(msg);
      } else if (response && response.status === 401) {
        const msg = data?.message || data?.detail || 'Invalid ID / Email or password. Please verify your credentials.';
        setErrorMessage(msg);
        alert(msg);
      } else {
        const err = data?.message || data?.detail || data?.error || `No registered account found for "${emailInput}". Please check your ID or Email.`;
        setErrorMessage(err);
        alert(err);
      }
    } catch (error) {
      console.error('Login connection error:', error);
      const err = error.message || 'Unable to connect to authentication server. Please ensure backend is running.';
      setErrorMessage(err);
      alert(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-slate-100 w-full overflow-x-hidden">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-300/40 border border-slate-200/90 p-5 sm:p-8">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('home')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer transition"
          >
            <span>&larr;</span>
            <span>Back to Hospital Home</span>
          </button>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Portal Access</span>
        </div>

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
            <span className="whitespace-pre-line">{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage('')} className="font-bold cursor-pointer text-amber-900 ml-2">✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter Your Email"
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
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