import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './components/View/Home';
import Login from './components/Login';
import SignIn from './components/SignIn';
import ResetPassword from './components/ResetPassword';

import SuperAdminDashboard from './components/Super Admin/Dashbord';
import Hospital from './components/Super Admin/Hospital';
import AdminDashboard from './components/Admin/Dashbord';
import DoctorDashboard from './components/Doctor/Dashbord';
import NurseDashboard from './components/Nurse/Dashbord';
import ReceptionistDashboard from './components/Receptionist/Dashbord';
import PatientDashboard from './components/Patient/Dashbord';

const getDashboardByRole = (role) => {
  const r = (role || '').toString().toUpperCase();
  if (r.includes('SUPER')) return 'super_admin_dashboard';
  if (r.includes('ADMIN')) return 'admin_dashboard';
  if (r.includes('DOCTOR')) return 'doctor_dashboard';
  if (r.includes('NURSE')) return 'nurse_dashboard';
  if (r.includes('RECEPTION')) return 'receptionist_dashboard';
  if (r.includes('PATIENT')) return 'patient_dashboard';
  return 'home';
};

const App = () => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  const [currentPage, setCurrentPage] = useState(() => {
    const isLogged = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLogged) return 'login';
    try {
      const savedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      return getDashboardByRole(savedUser?.role);
    } catch {
      return 'home';
    }
  });

  const handleLoginSuccess = (userData) => {
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');

    if (userData) {
      setCurrentUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
    }

    const targetDashboard = getDashboardByRole(userData?.role);
    setCurrentPage(targetDashboard);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    setCurrentPage('login');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans antialiased">
      {isLoggedIn && (
        <Navbar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
          currentUser={currentUser}
        />
      )}

      <main className="flex-1">
        {!isLoggedIn ? (
          currentPage === 'signin' ? (
            <SignIn
              setCurrentPage={setCurrentPage}
              setIsLoggedIn={handleLoginSuccess}
            />
          ) : currentPage === 'reset_password' ? (
            <ResetPassword
              setCurrentPage={setCurrentPage}
            />
          ) : (
            <Login
              setCurrentPage={setCurrentPage}
              setIsLoggedIn={handleLoginSuccess}
            />
          )
        ) : (
          <>
            {currentPage === 'super_admin_dashboard' && (
              <SuperAdminDashboard currentUser={currentUser} />
            )}
            {currentPage === 'super_admin_hospitals' && (
              <Hospital currentUser={currentUser} />
            )}
            {currentPage === 'admin_dashboard' && (
              <AdminDashboard currentUser={currentUser} />
            )}
            {currentPage === 'doctor_dashboard' && (
              <DoctorDashboard currentUser={currentUser} />
            )}
            {currentPage === 'nurse_dashboard' && (
              <NurseDashboard currentUser={currentUser} />
            )}
            {currentPage === 'receptionist_dashboard' && (
              <ReceptionistDashboard currentUser={currentUser} />
            )}
            {currentPage === 'patient_dashboard' && (
              <PatientDashboard currentUser={currentUser} />
            )}
            {currentPage === 'home' && (
              <Home currentUser={currentUser} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;