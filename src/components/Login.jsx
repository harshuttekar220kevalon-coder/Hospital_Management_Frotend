import React, { useState } from 'react';

const Login = ({ setCurrentPage, setIsLoggedIn }) => {
  const [formData, setFormData] = useState({
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
      const response = await fetch('http://127.0.0.1:8000/api/user-login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Login successful!');
        
        const userObj = data.user || data.data || data || {};
        const rawRole = (userObj.role || data.role || 'Admin').toString();
        const combinedName = userObj.name || (userObj.first_name ? `${userObj.first_name} ${userObj.last_name || ''}`.trim() : '');
        const fallbackName = formData.email ? formData.email.split('@')[0] : 'Admin User';

        let hospitalId = userObj.hospital || userObj.hospital_id || data.hospital || null;

        if (!hospitalId && rawRole.toUpperCase().includes('ADMIN') && !rawRole.toUpperCase().includes('SUPER')) {
          try {
            const adminRes = await fetch('http://127.0.0.1:8000/api/super-admin/Admins/');
            if (adminRes.ok) {
              const adminsList = await adminRes.json();
              const matched = adminsList.find(a => (a.email || '').toLowerCase() === (formData.email || '').toLowerCase());
              if (matched && matched.hospital) {
                hospitalId = matched.hospital;
              }
            }
          } catch (err) {
            console.error('Error finding admin hospital:', err);
          }
        }

        const extractedUser = {
          ...userObj,
          id: userObj.id || data.id,
          name: userObj.name || combinedName || fallbackName,
          role: rawRole,
          email: userObj.email || formData.email,
          hospital: hospitalId,
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