import { lazy, Suspense, useState, useEffect } from 'react';
import { API_BASE_URL } from '../Api/Api';

// Navbars
const Navbar = lazy(() => import('../Navbar'));
const SuperAdminNavbar = lazy(() => import('../Super Admin/Navbar'));
const AdminNavbar = lazy(() => import('../Admin/Navbar'));
const DoctorNavbar = lazy(() => import('../Doctor/Navbar'));
const NurseNavbar = lazy(() => import('../Nurse/Navbar'));
const ReceptionistNavbar = lazy(() => import('../Receptionist/Navbar'));

// Auth Pages
const Login = lazy(() => import('../Login'));
const SignIn = lazy(() => import('../SignIn'));
const Staf_Signin = lazy(() => import('../Staf_Signin'));
const ResetPassword = lazy(() => import('../ResetPassword'));

// Super Admin Pages
const SuperAdminDashboard = lazy(() => import('../Super Admin/Dashbord'));
const Hospital = lazy(() => import('../Super Admin/Hospital'));
const Hospital_Details = lazy(() => import('../Super Admin/Hospital_Details'));
const Hospital_Admins = lazy(() => import('../Super Admin/Hospital_Admins'));
const Admin_Details = lazy(() => import('../Super Admin/Admin_Details'));
const Doctors_Management = lazy(() => import('../Super Admin/Doctors_Management'));
const Doctor_Details = lazy(() => import('../Super Admin/Doctor_Details'));
const Nurses = lazy(() => import('../Super Admin/Nurses'));
const Nurse_Details = lazy(() => import('../Super Admin/Nurse_Details'));
const Receptionist_Management = lazy(() => import('../Super Admin/Receptionist'));
const Receptionist_Details = lazy(() => import('../Super Admin/Receptionist_Details'));
const Patients_Management = lazy(() => import('../Super Admin/Patients'));
const Patient_Details = lazy(() => import('../Super Admin/Patient_Details'));
const ManageNewUsers = lazy(() => import('../Super Admin/Manage_New_Users'));
const SuperAdminAppointments = lazy(() => import('../Super Admin/Appoiment'));
const SuperAdminAppointmentDetails = lazy(() => import('../Super Admin/Appoiment_Details'));

// Admin Pages
const AdminDashboard = lazy(() => import('../Admin/Dashbord'));
const HospitalManagement = lazy(() => import('../Admin/Hospital_Management'));
const AdminDoctors = lazy(() => import('../Admin/Doctor'));
const AdminDoctorDetails = lazy(() => import('../Admin/Doctor_Details'));
const AdminNurses = lazy(() => import('../Admin/Nurses'));
const AdminNurseDetails = lazy(() => import('../Admin/Nurses_Details'));
const AdminReceptionists = lazy(() => import('../Admin/Receptionists'));
const AdminReceptionistDetails = lazy(() => import('../Admin/Receptionists_Details'));
const AdminPatients = lazy(() => import('../Admin/Patients'));
const AdminPatientDetails = lazy(() => import('../Admin/Patients_Details'));
const AdminStaffApprove = lazy(() => import('../Admin/Staff_Approve'));
const AdminSettings = lazy(() => import('../Admin/setting'));

// Doctor Pages
const DoctorDashboard = lazy(() => import('../Doctor/Dashbord'));
const DoctorAppointments = lazy(() => import('../Doctor/Appointments'));
const DoctorPatients = lazy(() => import('../Doctor/Patients'));
const DoctorRegularSchedule = lazy(() => import('../Doctor/Regular Schedule'));
const DoctorSettings = lazy(() => import('../Doctor/setting'));

// Nurse, Receptionist, Patient Pages
const NurseDashboard = lazy(() => import('../Nurse/Dashbord'));
const NursePatients = lazy(() => import('../Nurse/Patient'));
const NurseSettings = lazy(() => import('../Nurse/Setting'));
const ReceptionistDashboard = lazy(() => import('../Receptionist/Dashbord'));
const ReceptionistDoctors = lazy(() => import('../Receptionist/Doctors'));
const ReceptionistPatient = lazy(() => import('../Receptionist/Patient'));
const ReceptionistPatientDetails = lazy(() => import('../Receptionist/Patient_Details'));
const ReceptionistSetting = lazy(() => import('../Receptionist/Setting'));
const ReceptionistAnassine = lazy(() => import('../Receptionist/Anassine'));
const ReceptionistBilling = lazy(() => import('../Receptionist/Billing'));
const ReceptionistAppoiment = lazy(() => import('../Receptionist/Appoiment'));
const ReceptionistNurse = lazy(() => import('../Receptionist/Nurse'));
const PatientDashboard = lazy(() => import('../Patient/Dashbord'));
const PatientSetting = lazy(() => import('../Patient/Setting'));
const MyHestory = lazy(() => import('../Patient/MyHestory'));

// Patient Main Frontend Pages (Static)
const PatientHome = lazy(() => import('../Patient/Home'));
const PatientAbout = lazy(() => import('../Patient/About'));
const PatientContact = lazy(() => import('../Patient/Contact'));
const PatientAppointment = lazy(() => import('../Patient/Appoiement'));
const PatientNotifications = lazy(() => import('../Patient/Notification'));
const DoctorNotifications = lazy(() => import('../Doctor/Notification'));
const NurseNotifications = lazy(() => import('../Nurse/Notification'));
const ReceptionistNotifications = lazy(() => import('../Receptionist/Notification'));
const AdminNotifications = lazy(() => import('../Admin/Notification'));
const SuperAdminNotifications = lazy(() => import('../Super Admin/Notification'));

// Staff Chat Pages
const AdminChat = lazy(() => import('../Admin/Chat'));
const DoctorChat = lazy(() => import('../Doctor/Chat'));
const NurseChat = lazy(() => import('../Nurse/Chat'));
const ReceptionistChat = lazy(() => import('../Receptionist/Chat'));

// Common Components
import ScrollToTop from '../Common/ScrollToTop';
const CommonHospital = lazy(() => import('../Common/New Hospital'));


const getDashboardByRole = (role) => {
  const r = (role || '').toString().toUpperCase();
  if (r.includes('SUPER')) return 'super_admin_dashboard';
  if (r.includes('ADMIN')) return 'admin_dashboard';
  if (r.includes('DOCTOR')) return 'doctor_dashboard';
  if (r.includes('NURSE')) return 'nurse_dashboard';
  if (r.includes('RECEPTION')) return 'receptionist_dashboard';
  if (r.includes('PATIENT')) return 'home';
  return 'login';
};

const PUBLIC_WEBSITE_PAGES = ['home', 'patient_home', 'about', 'patient_about', 'contact', 'patient_contact', 'appointment', 'appoint', 'patient_appointment', 'new_hospital', 'hospital', 'hospital_detail'];

const AppRoutes = () => {
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

  const [selectedDoctor, setSelectedDoctor] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedDoctor');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedNurse, setSelectedNurse] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedNurse');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedReceptionist, setSelectedReceptionist] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedReceptionist');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedPatient, setSelectedPatient] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedPatient');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedAppointment, setSelectedAppointment] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedAppointment');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedDoctorForPatient, setSelectedDoctorForPatient] = useState(null);

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  const [currentPage, setCurrentPage] = useState(() => {
    const isLogged = localStorage.getItem('isLoggedIn') === 'true';
    const savedPage = localStorage.getItem('currentPage');

    if (!isLogged) {
      if (
        savedPage === 'signin' ||
        savedPage === 'reset_password' ||
        savedPage === 'login' ||
        savedPage === 'home' ||
        savedPage === 'about' ||
        savedPage === 'contact' ||
        savedPage === 'appointment' ||
        savedPage === 'appoint' ||
        savedPage === 'patient_home' ||
        savedPage === 'patient_about' ||
        savedPage === 'patient_contact' ||
        savedPage === 'patient_appointment' ||
        savedPage === 'new_hospital' ||
        savedPage === 'hospital' ||
        savedPage === 'hospital_detail'
      ) {
        return savedPage;
      }
      return 'home';
    }

    if (savedPage && savedPage !== 'login' && savedPage !== 'signin' && savedPage !== 'reset_password' && savedPage !== 'approval_pending') {
      return savedPage;
    }
    try {
      const savedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      return getDashboardByRole(savedUser?.role);
    } catch {
      return 'home';
    }
  });

  const [isWebsiteMode, setIsWebsiteMode] = useState(() => PUBLIC_WEBSITE_PAGES.includes(localStorage.getItem('currentPage')));

  const navigateToPage = (page) => {
    setCurrentPage(page);
    setIsWebsiteMode(PUBLIC_WEBSITE_PAGES.includes(page));
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (currentPage) {
      localStorage.setItem('currentPage', currentPage);
    }
  }, [currentPage]);

  useEffect(() => {
    if (selectedHospital) {
      localStorage.setItem('selectedHospital', JSON.stringify(selectedHospital));
    } else {
      localStorage.removeItem('selectedHospital');
    }
  }, [selectedHospital]);

  useEffect(() => {
    if (selectedAdmin) {
      localStorage.setItem('selectedAdmin', JSON.stringify(selectedAdmin));
    } else {
      localStorage.removeItem('selectedAdmin');
    }
  }, [selectedAdmin]);

  useEffect(() => {
    if (selectedDoctor) {
      localStorage.setItem('selectedDoctor', JSON.stringify(selectedDoctor));
    } else {
      localStorage.removeItem('selectedDoctor');
    }
  }, [selectedDoctor]);

  useEffect(() => {
    if (selectedNurse) {
      localStorage.setItem('selectedNurse', JSON.stringify(selectedNurse));
    } else {
      localStorage.removeItem('selectedNurse');
    }
  }, [selectedNurse]);

  useEffect(() => {
    if (selectedReceptionist) {
      localStorage.setItem('selectedReceptionist', JSON.stringify(selectedReceptionist));
    } else {
      localStorage.removeItem('selectedReceptionist');
    }
  }, [selectedReceptionist]);

  useEffect(() => {
    if (selectedPatient) {
      localStorage.setItem('selectedPatient', JSON.stringify(selectedPatient));
    } else {
      localStorage.removeItem('selectedPatient');
    }
  }, [selectedPatient]);

  const handleLoginSuccess = (userData) => {
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');

    // Clear all stale session caches from previously logged-in staff/doctors/users
    localStorage.removeItem('selectedDoctor');
    localStorage.removeItem('selectedHospital');
    localStorage.removeItem('selectedAdmin');
    localStorage.removeItem('selectedNurse');
    localStorage.removeItem('selectedReceptionist');
    localStorage.removeItem('selectedPatient');
    localStorage.removeItem('selectedAppointment');
    localStorage.removeItem('selectedDoctorForPatient');
    setSelectedHospital(null);
    setSelectedAdmin(null);
    setSelectedDoctor(null);
    setSelectedNurse(null);
    setSelectedReceptionist(null);
    setSelectedPatient(null);

    if (userData) {
      setCurrentUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      if (userData.token) {
        localStorage.setItem('authToken', userData.token);
        localStorage.setItem('token', userData.token);
      }
    }

    const isPatientRole = (userData?.role || '').toString().toUpperCase().includes('PATIENT');
    setIsWebsiteMode(isPatientRole);
    localStorage.removeItem('login_return_page');

    if (isPatientRole) {
      setCurrentPage('home');
      localStorage.setItem('currentPage', 'home');
      return;
    }

    const targetDashboard = getDashboardByRole(userData?.role);
    setCurrentPage(targetDashboard);
    localStorage.setItem('currentPage', targetDashboard);
  };

  const handleLogout = () => {
    setIsWebsiteMode(false);
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSelectedHospital(null);
    setSelectedAdmin(null);
    setSelectedDoctor(null);
    setSelectedNurse(null);
    setSelectedReceptionist(null);
    setSelectedPatient(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentPage');
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('notification_token');
    localStorage.removeItem('selectedHospital');
    localStorage.removeItem('selectedAdmin');
    localStorage.removeItem('selectedDoctor');
    localStorage.removeItem('selectedNurse');
    localStorage.removeItem('selectedReceptionist');
    localStorage.removeItem('selectedPatient');
    localStorage.removeItem('selectedAppointment');
    localStorage.removeItem('selectedDoctorForPatient');
    localStorage.removeItem('login_return_page');
    setCurrentPage('login');
  };

  const isSuperAdmin = (currentUser?.role || '').toString().toUpperCase().includes('SUPER');
  const isAdmin = (currentUser?.role || '').toString().toUpperCase().includes('ADMIN') && !isSuperAdmin;
  const isDoctor = (currentUser?.role || '').toString().toUpperCase().includes('DOCTOR');
  const isNurse = (currentUser?.role || '').toString().toUpperCase().includes('NURSE');
  const isReceptionist = (currentUser?.role || '').toString().toUpperCase().includes('RECEPTION');
  const isPatient = (currentUser?.role || '').toString().toUpperCase().includes('PATIENT');
  const currentRole = (currentUser?.role || '').toString().toUpperCase();
  const approvalEndpoint = currentRole.includes('SUPER') || currentRole.includes('PATIENT') ? ''
    : currentRole.includes('ADMIN') ? 'Admins'
      : currentRole.includes('DOCTOR') ? 'Doctors'
        : currentRole.includes('NURSE') ? 'Nurses'
          : currentRole.includes('RECEPTION') ? 'Receptionists' : '';
  const isApprovalPending = Boolean(isLoggedIn && approvalEndpoint && currentUser?.is_approved !== true);
  const isPublicWebsitePage = PUBLIC_WEBSITE_PAGES.includes(currentPage);
  const isApprovalRestrictedPage = Boolean(isApprovalPending && !isPublicWebsitePage);

  useEffect(() => {
    if (!isLoggedIn || !approvalEndpoint || !currentUser?.email || currentUser?.is_approved === true) return undefined;
    let active = true;
    const refreshApproval = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/super-admin/${approvalEndpoint}/`);
        if (!response.ok) return;
        const payload = await response.json();
        const records = Array.isArray(payload) ? payload : payload?.results || payload?.data || [];
        const account = records.find((record) => String(record.email || '').toLowerCase().trim() === String(currentUser.email).toLowerCase().trim());
        if (active && typeof account?.is_approved === 'boolean' && account.is_approved !== currentUser.is_approved) {
          const updatedUser = { ...currentUser, is_approved: account.is_approved };
          setCurrentUser(updatedUser);
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.warn('Account approval refresh notice:', error);
      }
    };
    refreshApproval();
    const interval = window.setInterval(refreshApproval, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isLoggedIn, approvalEndpoint, currentUser]);

  const handleBackToWebsite = () => {
    setIsWebsiteMode(true);
    navigateToPage('home');
    localStorage.setItem('currentPage', 'home');
  };

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" role="status" aria-label="Loading page" /></div>}>
      <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans antialiased w-full overflow-x-hidden">
        {isLoggedIn && !isApprovalPending && !isPatient && !isWebsiteMode && !isPublicWebsitePage && (
          isSuperAdmin ? (
            <SuperAdminNavbar
              currentPage={currentPage}
              setCurrentPage={navigateToPage}
              isLoggedIn={isLoggedIn}
              onLogout={handleLogout}
              currentUser={currentUser}
              onBackToWebsite={handleBackToWebsite}
            />
          ) : isAdmin ? (
            <AdminNavbar
              currentPage={currentPage}
              setCurrentPage={navigateToPage}
              isLoggedIn={isLoggedIn}
              onLogout={handleLogout}
              currentUser={currentUser}
              onBackToWebsite={handleBackToWebsite}
            />
          ) : isDoctor ? (
            <DoctorNavbar
              currentPage={currentPage}
              setCurrentPage={navigateToPage}
              isLoggedIn={isLoggedIn}
              onLogout={handleLogout}
              currentUser={currentUser}
              onBackToWebsite={handleBackToWebsite}
            />
          ) : isNurse ? (
            <NurseNavbar
              currentPage={currentPage}
              setCurrentPage={navigateToPage}
              isLoggedIn={isLoggedIn}
              onLogout={handleLogout}
              currentUser={currentUser}
              onBackToWebsite={handleBackToWebsite}
            />
          ) : isReceptionist ? (
            <ReceptionistNavbar
              currentPage={currentPage}
              setCurrentPage={navigateToPage}
              isLoggedIn={isLoggedIn}
              onLogout={handleLogout}
              currentUser={currentUser}
              onBackToWebsite={handleBackToWebsite}
            />
          ) : (
            <Navbar
              currentPage={currentPage}
              setCurrentPage={navigateToPage}
              isLoggedIn={isLoggedIn}
              onLogout={handleLogout}
              currentUser={currentUser}
              onBackToWebsite={handleBackToWebsite}
            />
          )
        )}

        <main className="flex-1 w-full overflow-x-hidden">
          {isApprovalRestrictedPage ? (
            <section className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center px-4 py-12">
              <div className="w-full rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-lg sm:p-10">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </div>
                <h1 className="mt-5 text-2xl font-extrabold text-slate-900">Account approval pending</h1>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
                  {isAdmin
                    ? 'You are signed in, but the Super Admin has not approved this administrator account yet. Your dashboard and profile are locked until approval is complete.'
                    : 'You are signed in, but your Branch Hospital Admin has not approved this staff account yet. Your dashboard and profile are locked until approval is complete.'}
                </p>
                <p className="mt-4 text-xs font-semibold text-slate-500">This page will update automatically after approval.</p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleBackToWebsite}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition hover:bg-teal-700 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Back To Website</span>
                  </button>
                </div>
              </div>
            </section>
          ) : !isLoggedIn ? (
            currentPage === 'signin' ? (
              <SignIn
                setCurrentPage={navigateToPage}
                setIsLoggedIn={handleLoginSuccess}
              />
            ) : currentPage === 'staff_signup' ? (
              <Staf_Signin
                setCurrentPage={navigateToPage}
                setIsLoggedIn={handleLoginSuccess}
              />
            ) : currentPage === 'reset_password' ? (
              <ResetPassword
                setCurrentPage={navigateToPage}
              />
            ) : currentPage === 'login' ? (
              <Login
                setCurrentPage={navigateToPage}
                setIsLoggedIn={handleLoginSuccess}
              />
            ) : currentPage === 'about' || currentPage === 'patient_about' ? (
              <PatientAbout
                setCurrentPage={navigateToPage}
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            ) : currentPage === 'contact' || currentPage === 'patient_contact' ? (
              <PatientContact
                setCurrentPage={navigateToPage}
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            ) : currentPage === 'appointment' || currentPage === 'appoint' || currentPage === 'patient_appointment' ? (
              <PatientAppointment
                setCurrentPage={navigateToPage}
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            ) : currentPage === 'new_hospital' || currentPage === 'hospital' || currentPage === 'hospital_detail' ? (
              <CommonHospital
                selectedHospital={selectedHospital}
                setSelectedHospital={setSelectedHospital}
                setCurrentPage={navigateToPage}
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            ) : (
              <PatientHome
                setCurrentPage={navigateToPage}
                setSelectedHospital={setSelectedHospital}
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )
          ) : (
            <>
              {(currentPage === 'home' || currentPage === 'patient_home') && (
                <PatientHome
                  setCurrentPage={navigateToPage}
                  setSelectedHospital={setSelectedHospital}
                  isLoggedIn={isLoggedIn}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              )}
              {(currentPage === 'new_hospital' || currentPage === 'hospital' || currentPage === 'hospital_detail') && (
                <CommonHospital
                  selectedHospital={selectedHospital}
                  setSelectedHospital={setSelectedHospital}
                  setCurrentPage={navigateToPage}
                  isLoggedIn={isLoggedIn}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              )}
              {(currentPage === 'about' || currentPage === 'patient_about') && (
                <PatientAbout
                  setCurrentPage={navigateToPage}
                  isLoggedIn={isLoggedIn}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              )}
              {(currentPage === 'contact' || currentPage === 'patient_contact') && (
                <PatientContact
                  setCurrentPage={navigateToPage}
                  isLoggedIn={isLoggedIn}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              )}
              {(currentPage === 'appointment' || currentPage === 'appoint' || currentPage === 'patient_appointment') && (
                <PatientAppointment
                  setCurrentPage={navigateToPage}
                  isLoggedIn={isLoggedIn}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              )}
              {currentPage === 'super_admin_dashboard' && (
                <SuperAdminDashboard
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedHospital={setSelectedHospital}
                  setSelectedDoctor={setSelectedDoctor}
                  setSelectedNurse={setSelectedNurse}
                  setSelectedReceptionist={setSelectedReceptionist}
                  setSelectedPatient={setSelectedPatient}
                  setSelectedAdmin={setSelectedAdmin}
                  setSelectedAppointment={setSelectedAppointment}
                />
              )}
              {currentPage === 'super_admin_hospitals' && (
                <Hospital
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedHospital={setSelectedHospital}
                />
              )}
              {currentPage === 'super_admin_admins' && (
                <Hospital_Admins
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedAdmin={setSelectedAdmin}
                />
              )}
              {currentPage === 'admin_details' && (
                <Admin_Details
                  currentUser={currentUser}
                  selectedAdmin={selectedAdmin}
                  setSelectedAdmin={setSelectedAdmin}
                  setSelectedPatient={setSelectedPatient}
                  setSelectedAppointment={setSelectedAppointment}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'super_admin_doctors' && (
                <Doctors_Management
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedDoctor={setSelectedDoctor}
                />
              )}
              {currentPage === 'doctor_details' && (
                <Doctor_Details
                  currentUser={currentUser}
                  selectedDoctor={selectedDoctor}
                  setSelectedDoctor={setSelectedDoctor}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'super_admin_nurses' && (
                <Nurses
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedNurse={setSelectedNurse}
                />
              )}
              {currentPage === 'nurse_details' && (
                <Nurse_Details
                  currentUser={currentUser}
                  selectedNurse={selectedNurse}
                  setSelectedNurse={setSelectedNurse}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'super_admin_receptionists' && (
                <Receptionist_Management
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedReceptionist={setSelectedReceptionist}
                />
              )}
              {currentPage === 'receptionist_details' && (
                <Receptionist_Details
                  currentUser={currentUser}
                  selectedReceptionist={selectedReceptionist}
                  setSelectedReceptionist={setSelectedReceptionist}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'super_admin_patients' && (
                <Patients_Management
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedPatient={setSelectedPatient}
                />
              )}
              {currentPage === 'super_admin_new_users' && <ManageNewUsers currentUser={currentUser} />}
              {currentPage === 'super_admin_appointments' && (
                <SuperAdminAppointments
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedPatient={setSelectedPatient}
                  setSelectedAppointment={setSelectedAppointment}
                />
              )}
              {(currentPage === 'appointment_details' || currentPage === 'super_admin_appointment_details') && (
                <SuperAdminAppointmentDetails
                  currentUser={currentUser}
                  selectedAppointment={selectedAppointment}
                  setSelectedAppointment={setSelectedAppointment}
                  setSelectedPatient={setSelectedPatient}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'patient_details' && (
                <Patient_Details
                  currentUser={currentUser}
                  selectedPatient={selectedPatient}
                  setSelectedPatient={setSelectedPatient}
                  setSelectedAppointment={setSelectedAppointment}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'hospital_details' && (
                <Hospital_Details
                  currentUser={currentUser}
                  selectedHospital={selectedHospital}
                  setSelectedHospital={setSelectedHospital}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'admin_dashboard' && (
                <AdminDashboard
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedHospital={setSelectedHospital}
                  setSelectedDoctor={setSelectedDoctor}
                  setSelectedPatient={setSelectedPatient}
                  setSelectedNurse={setSelectedNurse}
                  setSelectedReceptionist={setSelectedReceptionist}
                />
              )}
              {currentPage === 'admin_hospital_management' && (
                <HospitalManagement
                  currentUser={currentUser}
                  selectedHospital={selectedHospital}
                  setSelectedHospital={setSelectedHospital}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'admin_doctors' && (
                <AdminDoctors
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedDoctor={setSelectedDoctor}
                  setSelectedHospital={setSelectedHospital}
                />
              )}
              {currentPage === 'admin_doctor_details' && (
                <AdminDoctorDetails
                  currentUser={currentUser}
                  selectedDoctor={selectedDoctor}
                  setSelectedDoctor={setSelectedDoctor}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'admin_nurses' && (
                <AdminNurses
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedNurse={setSelectedNurse}
                  setSelectedHospital={setSelectedHospital}
                />
              )}
              {currentPage === 'admin_nurse_details' && (
                <AdminNurseDetails
                  currentUser={currentUser}
                  selectedNurse={selectedNurse}
                  setSelectedNurse={setSelectedNurse}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'admin_receptionists' && (
                <AdminReceptionists
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedReceptionist={setSelectedReceptionist}
                  setSelectedHospital={setSelectedHospital}
                />
              )}
              {currentPage === 'admin_receptionist_details' && (
                <AdminReceptionistDetails
                  currentUser={currentUser}
                  selectedReceptionist={selectedReceptionist}
                  setSelectedReceptionist={setSelectedReceptionist}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'admin_patients' && (
                <AdminPatients
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedPatient={setSelectedPatient}
                  setSelectedHospital={setSelectedHospital}
                />
              )}
              {currentPage === 'admin_patient_details' && (
                <AdminPatientDetails
                  currentUser={currentUser}
                  selectedPatient={selectedPatient}
                  setSelectedPatient={setSelectedPatient}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'admin_staff_approve' && (
                <AdminStaffApprove
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                />
              )}
              {(currentPage === 'admin_settings' || (currentPage === 'setting' && (currentUser?.role || '').toString().toUpperCase().includes('ADMIN') && !(currentUser?.role || '').toString().toUpperCase().includes('SUPER'))) && (
                <AdminSettings
                  currentUser={currentUser}
                  setCurrentUser={setCurrentUser}
                  setCurrentPage={navigateToPage}
                  selectedHospital={selectedHospital}
                  setSelectedHospital={setSelectedHospital}
                />
              )}
              {currentPage === 'doctor_dashboard' && (
                <DoctorDashboard currentUser={currentUser} setCurrentPage={navigateToPage} />
              )}
              {currentPage === 'doctor_appointments' && (
                <DoctorAppointments currentUser={currentUser} setCurrentPage={navigateToPage} />
              )}
              {currentPage === 'doctor_patients' && (
                <DoctorPatients currentUser={currentUser} setCurrentPage={navigateToPage} />
              )}
              {currentPage === 'doctor_schedule' && (
                <DoctorRegularSchedule currentUser={currentUser} setCurrentPage={navigateToPage} />
              )}
              {(currentPage === 'doctor_settings' || (currentPage === 'setting' && (currentUser?.role || '').toString().toUpperCase().includes('DOCTOR'))) && (
                <DoctorSettings
                  currentUser={currentUser}
                  setCurrentUser={setCurrentUser}
                  setCurrentPage={navigateToPage}
                  selectedHospital={selectedHospital}
                  setSelectedHospital={setSelectedHospital}
                />
              )}
              {currentPage === 'nurse_dashboard' && (
                <NurseDashboard currentUser={currentUser} setCurrentPage={navigateToPage} />
              )}
              {currentPage === 'nurse_patients' && (
                <NursePatients currentUser={currentUser} setCurrentPage={navigateToPage} />
              )}
              {(currentPage === 'nurse_settings' || (currentPage === 'setting' && (currentUser?.role || '').toString().toUpperCase().includes('NURSE'))) && (
                <NurseSettings
                  currentUser={currentUser}
                  setCurrentUser={setCurrentUser}
                  setCurrentPage={navigateToPage}
                  selectedHospital={selectedHospital}
                  setSelectedHospital={setSelectedHospital}
                />
              )}
              {currentPage === 'receptionist_dashboard' && (
                <ReceptionistDashboard
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedPatient={setSelectedPatient}
                  setSelectedDoctorForPatient={setSelectedDoctorForPatient}
                />
              )}
              {(currentPage === 'receptionist_appointments' || currentPage === 'receptionist_appoiment' || currentPage === 'receptionist_appointment') && (
                <ReceptionistAppoiment
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedPatient={setSelectedPatient}
                />
              )}
              {currentPage === 'receptionist_doctors' && (
                <ReceptionistDoctors
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedDoctorForPatient={setSelectedDoctorForPatient}
                />
              )}
              {(currentPage === 'receptionist_nurses' || currentPage === 'receptionist_nurse') && (
                <ReceptionistNurse
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'receptionist_patients' && (
                <ReceptionistPatient
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedPatient={setSelectedPatient}
                  selectedDoctorForPatient={selectedDoctorForPatient}
                />
              )}
              {currentPage === 'receptionist_patient_details' && (
                <ReceptionistPatientDetails
                  currentUser={currentUser}
                  selectedPatient={selectedPatient}
                  setSelectedPatient={setSelectedPatient}
                  setCurrentPage={navigateToPage}
                />
              )}
              {(currentPage === 'receptionist_anassine' || currentPage === 'receptionist_unassigned' || currentPage === 'anassine') && (
                <ReceptionistAnassine
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedPatient={setSelectedPatient}
                  setSelectedDoctorForPatient={setSelectedDoctorForPatient}
                />
              )}
              {(currentPage === 'receptionist_billing' || currentPage === 'billing') && (
                <ReceptionistBilling
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  setSelectedPatient={setSelectedPatient}
                />
              )}
              {(currentPage === 'receptionist_settings' || (currentPage === 'setting' && (currentUser?.role || '').toString().toUpperCase().includes('RECEPTION'))) && (
                <ReceptionistSetting
                  currentUser={currentUser}
                  setCurrentUser={setCurrentUser}
                  setCurrentPage={navigateToPage}
                />
              )}
              {currentPage === 'patient_dashboard' && (
                <PatientDashboard
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  isLoggedIn={isLoggedIn}
                  onLogout={handleLogout}
                />
              )}
              {(currentPage === 'my_hestory' || currentPage === 'patient_my_hestory' || currentPage === 'my_history' || currentPage === 'patient_my_history' || currentPage === 'patient_discharge_history' || currentPage === 'discharge_history') && (
                <MyHestory
                  currentUser={currentUser}
                  setCurrentPage={navigateToPage}
                  isLoggedIn={isLoggedIn}
                  onLogout={handleLogout}
                />
              )}
              {(currentPage === 'patient_setting' || currentPage === 'patient_settings' || (currentPage === 'setting' && (currentUser?.role || '').toString().toUpperCase().includes('PATIENT'))) && (
                <PatientSetting
                  currentUser={currentUser}
                  setCurrentUser={setCurrentUser}
                  setCurrentPage={navigateToPage}
                  isLoggedIn={isLoggedIn}
                  onLogout={handleLogout}
                />
              )}
              {currentPage === 'notifications' && (
                isSuperAdmin ? (
                  <SuperAdminNotifications currentUser={currentUser} />
                ) : isAdmin ? (
                  <AdminNotifications currentUser={currentUser} />
                ) : isPatient ? (
                  <PatientNotifications
                    currentUser={currentUser}
                    currentPage={currentPage}
                    setCurrentPage={navigateToPage}
                    isLoggedIn={isLoggedIn}
                    onLogout={handleLogout}
                  />
                ) : (currentUser?.role || '').toString().toUpperCase().includes('DOCTOR') ? (
                  <DoctorNotifications currentUser={currentUser} />
                ) : (currentUser?.role || '').toString().toUpperCase().includes('NURSE') ? (
                  <NurseNotifications currentUser={currentUser} />
                ) : (currentUser?.role || '').toString().toUpperCase().includes('RECEPTION') ? (
                  <ReceptionistNotifications currentUser={currentUser} />
                ) : null
              )}
              {(currentPage === 'chat' || currentPage === 'admin_chat' || currentPage === 'doctor_chat' || currentPage === 'nurse_chat' || currentPage === 'receptionist_chat') && (
                isAdmin ? (
                  <AdminChat currentUser={currentUser} />
                ) : (currentUser?.role || '').toString().toUpperCase().includes('DOCTOR') ? (
                  <DoctorChat currentUser={currentUser} />
                ) : (currentUser?.role || '').toString().toUpperCase().includes('NURSE') ? (
                  <NurseChat currentUser={currentUser} />
                ) : (currentUser?.role || '').toString().toUpperCase().includes('RECEPTION') ? (
                  <ReceptionistChat currentUser={currentUser} />
                ) : null
              )}
            </>
          )}
        </main>

        {/* GLOBAL SCROLL TO TOP BUTTON & AUTO-SCROLL LISTENER */}
        <ScrollToTop currentPage={currentPage} />
      </div>
    </Suspense>
  );
};

export default AppRoutes;
export { AppRoutes, AppRoutes as Route };