import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SuperAdminNavbar from './components/Super Admin/Navbar';
import Home from './components/View/Home';
import Login from './components/Login';
import SignIn from './components/SignIn';
import ResetPassword from './components/ResetPassword';

import SuperAdminDashboard from './components/Super Admin/Dashbord';
import Hospital from './components/Super Admin/Hospital';
import Hospital_Details from './components/Super Admin/Hospital_Details';
import Hospital_Admins from './components/Super Admin/Hospital_Admins';
import Admin_Details from './components/Super Admin/Admin_Details';
import Doctors_Management from './components/Super Admin/Doctors_Management';
import Nurses from './components/Super Admin/Nurses';
import Receptionist_Management from './components/Super Admin/Receptionist';
import Patients_Management from './components/Super Admin/Patients';
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

  const [selectedHospital, setSelectedHospital] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedHospital');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedAdmin, setSelectedAdmin] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedAdmin');
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
    if (!isLogged) {
      const savedPage = localStorage.getItem('currentPage');
      if (savedPage === 'signin' || savedPage === 'reset_password') {
        return savedPage;
      }
      return 'login';
    }
    const savedPage = localStorage.getItem('currentPage');
    if (savedPage && savedPage !== 'login' && savedPage !== 'signin' && savedPage !== 'reset_password') {
      return savedPage;
    }
    try {
      const savedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      return getDashboardByRole(savedUser?.role);
    } catch {
      return 'home';
    }
  });

  // Scroll to top and persist current page whenever currentPage changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (currentPage) {
      localStorage.setItem('currentPage', currentPage);
    }
  }, [currentPage]);

  // Persist selectedHospital in localStorage for reload persistence
  useEffect(() => {
    if (selectedHospital) {
      localStorage.setItem('selectedHospital', JSON.stringify(selectedHospital));
    } else {
      localStorage.removeItem('selectedHospital');
    }
  }, [selectedHospital]);

  // Persist selectedAdmin in localStorage for reload persistence
  useEffect(() => {
    if (selectedAdmin) {
      localStorage.setItem('selectedAdmin', JSON.stringify(selectedAdmin));
    } else {
      localStorage.removeItem('selectedAdmin');
    }
  }, [selectedAdmin]);

  const handleLoginSuccess = (userData) => {
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');

    if (userData) {
      setCurrentUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
    }

    const targetDashboard = getDashboardByRole(userData?.role);
    setCurrentPage(targetDashboard);
    localStorage.setItem('currentPage', targetDashboard);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSelectedHospital(null);
    setSelectedAdmin(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentPage');
    localStorage.removeItem('selectedHospital');
    localStorage.removeItem('selectedAdmin');
    setCurrentPage('login');
  };

  const isSuperAdmin = (currentUser?.role || '').toString().toUpperCase().includes('SUPER');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans antialiased">
      {isLoggedIn && (
        isSuperAdmin ? (
          <SuperAdminNavbar
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isLoggedIn={isLoggedIn}
            onLogout={handleLogout}
            currentUser={currentUser}
          />
        ) : (
          <Navbar
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isLoggedIn={isLoggedIn}
            onLogout={handleLogout}
            currentUser={currentUser}
          />
        )
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
              <SuperAdminDashboard
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedHospital={setSelectedHospital}
              />
            )}
            {currentPage === 'super_admin_hospitals' && (
              <Hospital
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedHospital={setSelectedHospital}
              />
            )}
            {currentPage === 'super_admin_admins' && (
              <Hospital_Admins
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedAdmin={setSelectedAdmin}
              />
            )}
            {currentPage === 'admin_details' && (
              <Admin_Details
                currentUser={currentUser}
                selectedAdmin={selectedAdmin}
                setSelectedAdmin={setSelectedAdmin}
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'super_admin_doctors' && (
              <Doctors_Management
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'super_admin_nurses' && (
              <Nurses
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'super_admin_receptionists' && (
              <Receptionist_Management
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'super_admin_patients' && (
              <Patients_Management
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'hospital_details' && (
              <Hospital_Details
                currentUser={currentUser}
                selectedHospital={selectedHospital}
                setSelectedHospital={setSelectedHospital}
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'admin_dashboard' && (
              <AdminDashboard
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedHospital={setSelectedHospital}
              />
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