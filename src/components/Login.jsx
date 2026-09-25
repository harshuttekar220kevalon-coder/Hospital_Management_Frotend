import React, { useState } from 'react';

const Login = ({ setCurrentPage, setIsLoggedIn }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [inactivityMessage, setInactivityMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (inactivityMessage) {
      setInactivityMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setInactivityMessage('');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/user-login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        const userObj = data.user || data.data || data || {};
        const normalizedEmail = (formData.email || userObj.email || '').toLowerCase().trim();
        const serverRole = (userObj.role || data.role || '').toString().trim();
        
        let resolvedRole = serverRole;
        let resolvedName = userObj.name || (userObj.first_name ? `${userObj.first_name} ${userObj.last_name || ''}`.trim() : '');
        let resolvedHospital = userObj.hospital || userObj.hospital_id || data.hospital || null;
        let extraProfile = {};
        let isUserActive = true;
        let customInactiveMsg = '';

        // Parallel check in backend registries to ensure exact Name, Role and is_active status match
        try {
          const [adminsRes, docsRes, nursesRes, recsRes, patsRes] = await Promise.allSettled([
            fetch('http://127.0.0.1:8000/api/super-admin/Admins/'),
            fetch('http://127.0.0.1:8000/api/super-admin/Doctors/'),
            fetch('http://127.0.0.1:8000/api/super-admin/Nurses/'),
            fetch('http://127.0.0.1:8000/api/super-admin/Receptionists/'),
            fetch('http://127.0.0.1:8000/api/super-admin/Patients/')
          ]);

          // 1. Check Doctors
          if (docsRes.status === 'fulfilled' && docsRes.value.ok) {
            const docList = await docsRes.value.json().catch(() => []);
            const matchDoc = docList.find(d => (d.email || '').toLowerCase().trim() === normalizedEmail);
            if (matchDoc) {
              resolvedRole = 'Doctor';
              resolvedName = matchDoc.name || resolvedName;
              resolvedHospital = matchDoc.hospital || (Array.isArray(matchDoc.hospitals) ? matchDoc.hospitals[0] : null) || resolvedHospital;
              if (matchDoc.is_active === false) {
                isUserActive = false;
                customInactiveMsg = 'Your Doctor account is Inactive. Please contact your Hospital Administrator to activate your account.';
              }
              extraProfile = {
                doctor_id: matchDoc.doctor_id || `DOC-${matchDoc.id}`,
                specialization: matchDoc.specialization || matchDoc.specialty,
                opd_timings: matchDoc.opd_timings,
                phone: matchDoc.phone || matchDoc.contact,
                is_active: matchDoc.is_active !== false
              };
            }
          }

          // 2. Check Nurses
          if (!extraProfile.doctor_id && nursesRes.status === 'fulfilled' && nursesRes.value.ok) {
            const nurseList = await nursesRes.value.json().catch(() => []);
            const matchNurse = nurseList.find(n => (n.email || '').toLowerCase().trim() === normalizedEmail);
            if (matchNurse) {
              resolvedRole = 'Nurse';
              resolvedName = matchNurse.name || `${matchNurse.first_name || ''} ${matchNurse.last_name || ''}`.trim() || resolvedName;
              resolvedHospital = matchNurse.hospital || resolvedHospital;
              if (matchNurse.is_active === false) {
                isUserActive = false;
                customInactiveMsg = 'Your Nurse account is Inactive. Please contact your Hospital Administrator to activate your account.';
              }
              extraProfile = {
                nurse_id: matchNurse.nurse_id || `NUR-${matchNurse.id}`,
                nurse_role: matchNurse.nurse_role || matchNurse.role || 'Staff Nurse',
                ward: matchNurse.ward || 'General Ward',
                shift: matchNurse.shift || 'Morning',
                phone: matchNurse.contact || matchNurse.phone,
                is_active: matchNurse.is_active !== false
              };
            }
          }

          // 3. Check Receptionists
          if (!extraProfile.doctor_id && !extraProfile.nurse_id && recsRes.status === 'fulfilled' && recsRes.value.ok) {
            const recList = await recsRes.value.json().catch(() => []);
            const matchRec = recList.find(r => (r.email || '').toLowerCase().trim() === normalizedEmail);
            if (matchRec) {
              resolvedRole = 'Receptionist';
              resolvedName = matchRec.name || resolvedName;
              resolvedHospital = matchRec.hospital || resolvedHospital;
              if (matchRec.is_active === false) {
                isUserActive = false;
                customInactiveMsg = 'Your Receptionist account is Inactive. Please contact your Hospital Administrator to activate your account.';
              }
              extraProfile = {
                receptionist_id: matchRec.receptionist_id || `REC-${matchRec.id}`,
                role: matchRec.role || 'Front Desk',
                shift: matchRec.shift || 'Morning Shift',
                languages: matchRec.languages,
                phone: matchRec.contact || matchRec.phone,
                is_active: matchRec.is_active !== false
              };
            }
          }

          // 4. Check Admins
          if (!extraProfile.doctor_id && !extraProfile.nurse_id && !extraProfile.receptionist_id && adminsRes.status === 'fulfilled' && adminsRes.value.ok) {
            const adminList = await adminsRes.value.json().catch(() => []);
            const matchAdmin = adminList.find(a => (a.email || '').toLowerCase().trim() === normalizedEmail);
            if (matchAdmin) {
              resolvedRole = 'Hospital Admin';
              resolvedName = matchAdmin.name || resolvedName;
              resolvedHospital = matchAdmin.hospital || resolvedHospital;
              if (matchAdmin.is_active === false) {
                isUserActive = false;
                customInactiveMsg = 'Your Administrator account is Inactive. Please contact Super Admin for your access.';
              }
              extraProfile = {
                employee_id: matchAdmin.employee_id || `ADM-${matchAdmin.id}`,
                designation: matchAdmin.designation,
                phone: matchAdmin.contact || matchAdmin.phone,
                is_active: matchAdmin.is_active !== false
              };
            }
          }

          // 5. Check Patients
          if (!extraProfile.doctor_id && !extraProfile.nurse_id && !extraProfile.receptionist_id && !extraProfile.employee_id && patsRes.status === 'fulfilled' && patsRes.value.ok) {
            const patList = await patsRes.value.json().catch(() => []);
            const matchPat = patList.find(p => (p.email || '').toLowerCase().trim() === normalizedEmail);
            if (matchPat) {
              resolvedRole = 'Patient';
              resolvedName = matchPat.name || resolvedName;
              resolvedHospital = matchPat.hospital || resolvedHospital;
              if (matchPat.is_active === false) {
                isUserActive = false;
                customInactiveMsg = 'Your Patient account is Inactive. Please contact Hospital Administration to activate your account.';
              }
              extraProfile = {
                patient_id: matchPat.patient_id || matchPat.uhid || `PAT-${matchPat.id}`,
                doctor: matchPat.doctor,
                phone: matchPat.contact || matchPat.phone,
                is_active: matchPat.is_active !== false
              };
            }
          }
        } catch (registryErr) {
          console.error('Error in profile registry matching:', registryErr);
        }

        // Check Super Admin
        if (normalizedEmail.includes('super') || serverRole.toUpperCase().includes('SUPER')) {
          resolvedRole = 'Super Admin';
          resolvedName = resolvedName || 'Super Admin';
          isUserActive = true; // Super Admin is always active
        }

        // Check general userObj is_active flag if returned by backend
        if (userObj.is_active === false || data.is_active === false) {
          isUserActive = false;
          if (!customInactiveMsg) {
            if (resolvedRole.toUpperCase().includes('ADMIN')) {
              customInactiveMsg = 'Your Administrator account is Inactive. Please contact Super Admin for your access.';
            } else {
              customInactiveMsg = 'Your account is Inactive. Please contact your Hospital Administrator to activate your account.';
            }
          }
        }

        // BLOCK INACTIVE USERS
        if (!isUserActive) {
          const finalMsg = customInactiveMsg || 'Your account is currently Inactive. Please contact your Administrator to activate your access.';
          setInactivityMessage(finalMsg);
          alert(finalMsg);
          setLoading(false);
          return;
        }

        // Final fallback for role & name
        if (!resolvedRole) {
          resolvedRole = 'Admin';
        }
        if (!resolvedName) {
          resolvedName = formData.email ? formData.email.split('@')[0] : 'User';
        }

        alert('Login successful!');

        const extractedUser = {
          ...userObj,
          ...extraProfile,
          id: userObj.id || data.id,
          name: resolvedName,
          role: resolvedRole,
          email: formData.email || userObj.email,
          hospital: resolvedHospital,
          is_active: true
        };

        if (setIsLoggedIn) {
          setIsLoggedIn(extractedUser);
        }
      } else {
        alert('Error: ' + (data?.message || 'Invalid email or password'));
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Backend server se connect nahi ho paya. Django server chal raha hai ya check karein.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg shadow-slate-300/40 border border-slate-200/90 p-5 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 text-blue-700 mb-3 border border-blue-200 shadow-xs">
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Hospital Portal Login</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Enter your credentials to access your dashboard</p>
        </div>

        {inactivityMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 shadow-xs">
            <span className="text-base shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-rose-900">Account Inactive</p>
              <p className="mt-0.5 text-rose-700 leading-relaxed">{inactivityMessage}</p>
            </div>
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition duration-150"
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
                  className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition duration-150"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs sm:text-sm shadow-md transition duration-150 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
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