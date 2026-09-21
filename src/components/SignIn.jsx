import React, { useState } from 'react';

const SignIn = ({ setCurrentPage, setIsLoggedIn }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    role: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/Login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Account created successfully!');
        
        const userObj = data.user || data.data || data;
        const extractedUser = {
          name: `${formData.firstName} ${formData.lastName}`.trim() || userObj.name || formData.email.split('@')[0],
          role: (formData.role || userObj.role || 'DOCTOR').toString().toUpperCase(),
          email: formData.email,
        };

        if (setIsLoggedIn) {
          setIsLoggedIn(extractedUser);
        }
      } else {
        alert('Error: ' + JSON.stringify(data));
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
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-teal-50 text-teal-700 mb-3 border border-teal-200 shadow-xs">
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Create User Account</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Join Apex Care Hospital Management Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First name"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last name"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition duration-150"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              User Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20 transition duration-150 cursor-pointer"
            >
              <option value="" disabled>Select User Role</option>
              <option value="DOCTOR">Doctor</option>
              <option value="NURSES">Nurse</option>
              <option value="RECEPTIONISTS">Receptionist</option>
              <option value="PATIENTS">Patient</option>
            </select>
          </div>

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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
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
            className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs sm:text-sm shadow-md transition duration-150 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Register Account'}
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

export default SignIn;