import { useState, useEffect } from 'react';
import { API_BASE_URL } from './Api/Api';

const Staf_Signin = ({ setCurrentPage }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    Select_User: '',
    email: '',
    contact: '',
    hospital: '',
    password: '',
    confirm_password: ''
  });
  const [hospitalsList, setHospitalsList] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch hospitals list from backend for Doctor, Nurse, Receptionist role assignment
  useEffect(() => {
    let isMounted = true;
    const loadHospitals = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/super-admin/Hospital/`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json().catch(() => []);
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setHospitalsList(data);
            return;
          }
        }
        // Fallback hospital endpoint if super-admin prefix differs
        const altRes = await fetch(`${API_BASE_URL}/Hospital/`).catch(() => null);
        if (altRes && altRes.ok) {
          const altData = await altRes.json().catch(() => []);
          if (isMounted && Array.isArray(altData)) {
            setHospitalsList(altData);
          }
        }
      } catch (err) {
        console.error('Error loading hospitals from backend:', err);
      }
    };
    loadHospitals();
    return () => { isMounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'contact') {
      const cleanDigits = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        [name]: cleanDigits
      }));
      if (errorMessage) setErrorMessage('');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (errorMessage) setErrorMessage('');
  };

  // Check if hospital selection is strictly required based on role (Optional for Receptionists)
  const isHospitalRequiredRole = 
    formData.Select_User === 'ADMIN' ||
    formData.Select_User === 'DOCTOR' || 
    formData.Select_User === 'NURSES';

  const showHospitalSelection = 
    isHospitalRequiredRole || 
    formData.Select_User === 'RECEPTIONISTS';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const first = (formData.first_name || '').trim();
    const last = (formData.last_name || '').trim();
    const mail = (formData.email || '').trim();
    const contact = (formData.contact || '').trim();
    const roleVal = formData.Select_User || '';
    const hospitalVal = formData.hospital || '';
    const pass = formData.password || '';
    const confirmPass = formData.confirm_password || '';

    if (!['ADMIN', 'DOCTOR', 'NURSES', 'RECEPTIONISTS'].includes(roleVal)) {
      const msg = 'Staff accounts can only be created for Admin, Doctor, Nurse, or Receptionist roles.';
      setErrorMessage(msg);
      alert(msg);
      setLoading(false);
      return;
    }

    if (!first || !last) {
      const msg = 'Please enter both first and last name.';
      setErrorMessage(msg);
      alert(msg);
      setLoading(false);
      return;
    }

    if (!roleVal) {
      const msg = 'Please select a user role.';
      setErrorMessage(msg);
      alert(msg);
      setLoading(false);
      return;
    }

    if (!mail) {
      const msg = 'Please enter a valid email address.';
      setErrorMessage(msg);
      alert(msg);
      setLoading(false);
      return;
    }

    if (!contact) {
      const msg = 'Please enter a valid contact phone number.';
      setErrorMessage(msg);
      alert(msg);
      setLoading(false);
      return;
    }

    if (isHospitalRequiredRole && !hospitalVal) {
      const msg = 'Please select a hospital for this staff account.';
      setErrorMessage(msg);
      alert(msg);
      setLoading(false);
      return;
    }

    if (pass !== confirmPass) {
      const msg = 'Password mismatch: Password and Confirm Password must be same.';
      setErrorMessage(msg);
      alert(msg);
      setLoading(false);
      return;
    }

    try {
      const selectedHospId = hospitalVal ? Number(hospitalVal) : null;
      const fullName = `${first} ${last}`.trim();

      // Complete Payload supporting all backend serializer field formats for Contact & Hospital
      const staffRegistration = roleVal === 'ADMIN'
        ? {
          endpoint: 'Admins',
          payload: {
            name: fullName,
            hospital: selectedHospId,
            designation: 'Hospital Administrator',
            contact,
            email: mail,
            password: pass,
            is_active: true,
            is_approved: false
          }
        }
        : roleVal === 'DOCTOR'
        ? {
          endpoint: 'Doctors',
          payload: {
            name: fullName.startsWith('Dr.') ? fullName : `Dr. ${fullName}`,
            doctor_id: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
            hospitals: selectedHospId ? [selectedHospId] : [],
            specialization: 'General Medicine',
            Shifts: 'Morning First Shift',
            phone: contact,
            email: mail,
            password: pass,
            status: 'Available',
            is_active: true,
            is_approved: false
          }
        }
        : roleVal === 'NURSES'
          ? {
            endpoint: 'Nurses',
            payload: {
              name: fullName,
              nurse_id: `NUR-${Math.floor(1000 + Math.random() * 9000)}`,
              hospital: selectedHospId,
              role: 'Staff Nurse',
              ward: 'General Ward',
              shift: 'Morning First Shift',
              contact,
              email: mail,
              password: pass,
              status: 'On_Duty',
              is_active: true,
              is_approved: false
            }
          }
          : {
            endpoint: 'Receptionists',
            payload: {
              name: fullName,
              receptionist_id: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
              hospital: selectedHospId,
              role: 'Front Desk Receptionist',
              shift: 'Morning First Shift',
              languages: 'English',
              contact,
              email: mail,
              password: pass,
              status: 'On_Duty',
              is_active: true,
              is_approved: false
            }
          };

      const staffResponse = await fetch(`${API_BASE_URL}/super-admin/${staffRegistration.endpoint}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffRegistration.payload)
      }).catch(() => null);
      if (!staffResponse?.ok) {
        const staffError = await staffResponse?.json().catch(() => ({})) || {};
        const message = Object.entries(staffError).map(([field, issue]) => `${field}: ${Array.isArray(issue) ? issue.join(' ') : String(issue)}`).join('\n') || 'Could not register this account. Please check the details and try again.';
        setErrorMessage(message);
        alert(message);
        setLoading(false);
        return;
      }

      if (mail && contact) localStorage.setItem(`user_contact_${mail.toLowerCase()}`, contact);
      if (mail && pass) localStorage.setItem(`pwd_${mail.toLowerCase()}`, pass);
      if (mail && selectedHospId) localStorage.setItem(`user_hospital_${mail.toLowerCase()}`, String(selectedHospId));
      const registeredRole = roleVal === 'ADMIN' ? 'Hospital Admin' : roleVal === 'DOCTOR' ? 'Doctor' : roleVal === 'NURSES' ? 'Nurse' : 'Receptionist';
      localStorage.setItem(`user_role_${mail.toLowerCase()}`, registeredRole);
      alert('Registration received. You can log in now, but your dashboard and profile will stay locked until Super Admin approval.');
      if (setCurrentPage) setCurrentPage('login');
      return;
    } catch (error) {
      console.error('Signup exception:', error);
      const err = error.message || 'Unable to connect to hospital server. Please verify backend is running.';
      setErrorMessage(err);
      alert(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-slate-100 w-full overflow-x-hidden">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg shadow-slate-300/40 border border-slate-200/90 p-5 sm:p-8">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setCurrentPage && setCurrentPage('home')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer transition"
          >
            <span>&larr;</span>
            <span>Back to Hospital Home</span>
          </button>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Registration</span>
        </div>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-teal-50 text-teal-700 mb-3 border border-teal-200 shadow-xs">
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Create Account</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Join Apex Care Hospital Management Portal</p>
        </div>

        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between shadow-xs">
            <span className="whitespace-pre-line">{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage('')} className="font-bold cursor-pointer text-amber-900 ml-2">✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          {/* FIRST NAME & LAST NAME */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                autoComplete="off"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Enter first name"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                autoComplete="off"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Enter last name"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition duration-150"
              />
            </div>
          </div>

          {/* SELECT USER ROLE */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select User <span className="text-rose-500">*</span>
            </label>
            <select
              name="Select_User"
              value={formData.Select_User}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition duration-150 cursor-pointer font-medium"
            >
              <option value="">-- Select User --</option>
              <option value="ADMIN">Admin</option>
              <option value="DOCTOR">Doctor</option>
              <option value="NURSES">Nurse</option>
              <option value="RECEPTIONISTS">Receptionist</option>
            </select>
          </div>

          {/* SELECT HOSPITAL FOR STAFF ACCOUNTS */}
          {showHospitalSelection && (
            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 animate-in fade-in duration-200">
              <label className="block text-xs font-semibold text-teal-900 uppercase tracking-wider mb-1.5">
                Select Hospital / Branch {isHospitalRequiredRole ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal text-[10px] lowercase">(optional)</span>}
              </label>
              <select
                name="hospital"
                value={formData.hospital}
                onChange={handleChange}
                required={isHospitalRequiredRole}
                className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition duration-150 cursor-pointer font-medium"
              >
                <option value="">{isHospitalRequiredRole ? '-- Select Hospital * --' : '-- Select Hospital / Desk (Optional) --'}</option>
                {hospitalsList.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.Name || h.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-teal-700 mt-1 font-medium">
                {formData.Select_User === 'ADMIN' ? 'Select the hospital this administrator account will manage.' :
                 formData.Select_User === 'DOCTOR' ? 'Select the primary hospital for your clinical OPD & patient consultations.' :
                 formData.Select_User === 'NURSES' ? 'Select the hospital where you will be assigned ward & floor duty.' :
                 'Select the hospital desk where you work (optional - you can still access reception dashboard if unassigned).'}
              </p>
            </div>
          )}

          {/* EMAIL & CONTACT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                autoComplete="off"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Contact Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                name="contact"
                autoComplete="off"
                maxLength={10}
                pattern="[0-9]{10}"
                inputMode="numeric"
                value={formData.contact}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition duration-150"
              />
            </div>
          </div>

          {/* PASSWORD & CONFIRM PASSWORD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  required
                  minLength={6}
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
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirm_password"
                  autoComplete="new-password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  required
                  minLength={6}
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border ${formData.confirm_password && formData.password !== formData.confirm_password
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                      : formData.confirm_password && formData.password === formData.confirm_password
                        ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20'
                        : 'border-slate-300 focus:border-teal-600 focus:ring-teal-600/20'
                    } bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition duration-150`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          {formData.confirm_password && formData.password !== formData.confirm_password && (
            <p className="text-[11px] text-rose-600 font-medium -mt-2">
              Password and Confirm Password do not match
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs sm:text-sm shadow-md transition duration-150 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating Account...</span>
              </>
            ) : (
              'Register Account'
            )}
          </button>
        </form>

        {setCurrentPage && (
          <p className="text-center text-xs text-slate-500 mt-6">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setCurrentPage('login')}
              className="text-teal-700 font-semibold hover:underline cursor-pointer"
            >
              Sign In here
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Staf_Signin;
