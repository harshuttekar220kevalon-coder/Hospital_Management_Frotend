import React, { useState, useEffect } from 'react';

// Navbars
import Navbar from '../Navbar';
import SuperAdminNavbar from '../Super Admin/Navbar';
import AdminNavbar from '../Admin/Navbar';

// Auth Pages
import Login from '../Login';
import SignIn from '../SignIn';
import ResetPassword from '../ResetPassword';

// Super Admin Pages
import SuperAdminDashboard from '../Super Admin/Dashbord';
import Hospital from '../Super Admin/Hospital';
import Hospital_Details from '../Super Admin/Hospital_Details';
import Hospital_Admins from '../Super Admin/Hospital_Admins';
import Admin_Details from '../Super Admin/Admin_Details';
import Doctors_Management from '../Super Admin/Doctors_Management';
import Doctor_Details from '../Super Admin/Doctor_Details';
import Nurses from '../Super Admin/Nurses';
import Nurse_Details from '../Super Admin/Nurse_Details';
import Receptionist_Management from '../Super Admin/Receptionist';
import Receptionist_Details from '../Super Admin/Receptionist_Details';
import Patients_Management from '../Super Admin/Patients';
import Patient_Details from '../Super Admin/Patient_Details';

// Admin Pages
import AdminDashboard from '../Admin/Dashbord';
import HospitalManagement from '../Admin/Hospital_Management';
import AdminDoctors from '../Admin/Doctor';
import AdminDoctorDetails from '../Admin/Doctor_Details';
import AdminNurses from '../Admin/Nurses';
import AdminNurseDetails from '../Admin/Nurses_Details';
import AdminReceptionists from '../Admin/Receptionists';
import AdminReceptionistDetails from '../Admin/Receptionists_Details';
import AdminPatients from '../Admin/Patients';
import AdminPatientDetails from '../Admin/Patients_Details';
import AdminSettings from '../Admin/setting';

// Doctor Pages
import DoctorDashboard from '../Doctor/Dashbord';
import DoctorAppointments from '../Doctor/Appointments';
import DoctorPatients from '../Doctor/Patients';
import DoctorRegularSchedule from '../Doctor/Regular Schedule';
import DoctorSettings from '../Doctor/setting';

// Nurse, Receptionist, Patient Pages
import NurseDashboard from '../Nurse/Dashbord';
import NursePatients from '../Nurse/Patient';
import NurseSettings from '../Nurse/Setting';
import ReceptionistDashboard from '../Receptionist/Dashbord';
import ReceptionistDoctors from '../Receptionist/Doctors';
import ReceptionistPatient from '../Receptionist/Patient';
import ReceptionistPatientDetails from '../Receptionist/Patient_Details';
import ReceptionistSetting from '../Receptionist/Setting';
import ReceptionistAnassine from '../Receptionist/Anassine';
import PatientDashboard from '../Patient/Dashbord';

// Patient Main Frontend Pages (Static)
import PatientHome from '../Patient/Home';
import PatientAbout from '../Patient/About';
import PatientContact from '../Patient/Contact';
import PatientAppointment from '../Patient/Appoiement';


const getDashboardByRole = (role) => {
  const r = (role || '').toString().toUpperCase();
  if (r.includes('SUPER')) return 'super_admin_dashboard';
  if (r.includes('ADMIN')) return 'admin_dashboard';
  if (r.includes('DOCTOR')) return 'doctor_dashboard';
  if (r.includes('NURSE')) return 'nurse_dashboard';
  if (r.includes('RECEPTION')) return 'receptionist_dashboard';
  if (r.includes('PATIENT')) return 'patient_dashboard';
  return 'login';
};

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
        savedPage === 'patient_appointment'
      ) {
        return savedPage;
      }
      return 'home';
    }

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
    setSelectedDoctor(null);
    setSelectedNurse(null);
    setSelectedReceptionist(null);
    setSelectedPatient(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentPage');
    localStorage.removeItem('selectedHospital');
    localStorage.removeItem('selectedAdmin');
    localStorage.removeItem('selectedDoctor');
    localStorage.removeItem('selectedNurse');
    localStorage.removeItem('selectedReceptionist');
    localStorage.removeItem('selectedPatient');
    setCurrentPage('login');
  };

  const isSuperAdmin = (currentUser?.role || '').toString().toUpperCase().includes('SUPER');
  const isAdmin = (currentUser?.role || '').toString().toUpperCase().includes('ADMIN') && !isSuperAdmin;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans antialiased w-full overflow-x-hidden">
      {isLoggedIn && (
        isSuperAdmin ? (
          <SuperAdminNavbar
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isLoggedIn={isLoggedIn}
            onLogout={handleLogout}
            currentUser={currentUser}
          />
        ) : isAdmin ? (
          <AdminNavbar
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

      <main className="flex-1 w-full overflow-x-hidden">
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
          ) : currentPage === 'login' ? (
            <Login
              setCurrentPage={setCurrentPage}
              setIsLoggedIn={handleLoginSuccess}
            />
          ) : currentPage === 'about' || currentPage === 'patient_about' ? (
            <PatientAbout
              setCurrentPage={setCurrentPage}
              isLoggedIn={isLoggedIn}
              currentUser={currentUser}
            />
          ) : currentPage === 'contact' || currentPage === 'patient_contact' ? (
            <PatientContact
              setCurrentPage={setCurrentPage}
              isLoggedIn={isLoggedIn}
              currentUser={currentUser}
            />
          ) : currentPage === 'appointment' || currentPage === 'appoint' || currentPage === 'patient_appointment' ? (
            <PatientAppointment
              setCurrentPage={setCurrentPage}
              isLoggedIn={isLoggedIn}
              currentUser={currentUser}
            />
          ) : (
            <PatientHome
              setCurrentPage={setCurrentPage}
              isLoggedIn={isLoggedIn}
              currentUser={currentUser}
            />
          )
        ) : (
          <>
            {(currentPage === 'home' || currentPage === 'patient_home') && (
              <PatientHome
                setCurrentPage={setCurrentPage}
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
              />
            )}
            {(currentPage === 'about' || currentPage === 'patient_about') && (
              <PatientAbout
                setCurrentPage={setCurrentPage}
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
              />
            )}
            {(currentPage === 'contact' || currentPage === 'patient_contact') && (
              <PatientContact
                setCurrentPage={setCurrentPage}
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
              />
            )}
            {(currentPage === 'appointment' || currentPage === 'appoint' || currentPage === 'patient_appointment') && (
              <PatientAppointment
                setCurrentPage={setCurrentPage}
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
              />
            )}
            {currentPage === 'super_admin_dashboard' && (
              <SuperAdminDashboard
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedHospital={setSelectedHospital}
                setSelectedDoctor={setSelectedDoctor}
                setSelectedNurse={setSelectedNurse}
                setSelectedReceptionist={setSelectedReceptionist}
                setSelectedPatient={setSelectedPatient}
                setSelectedAdmin={setSelectedAdmin}
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
                setSelectedDoctor={setSelectedDoctor}
              />
            )}
            {currentPage === 'doctor_details' && (
              <Doctor_Details
                currentUser={currentUser}
                selectedDoctor={selectedDoctor}
                setSelectedDoctor={setSelectedDoctor}
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'super_admin_nurses' && (
              <Nurses
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedNurse={setSelectedNurse}
              />
            )}
            {currentPage === 'nurse_details' && (
              <Nurse_Details
                currentUser={currentUser}
                selectedNurse={selectedNurse}
                setSelectedNurse={setSelectedNurse}
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'super_admin_receptionists' && (
              <Receptionist_Management
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedReceptionist={setSelectedReceptionist}
              />
            )}
            {currentPage === 'receptionist_details' && (
              <Receptionist_Details
                currentUser={currentUser}
                selectedReceptionist={selectedReceptionist}
                setSelectedReceptionist={setSelectedReceptionist}
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'super_admin_patients' && (
              <Patients_Management
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedPatient={setSelectedPatient}
              />
            )}
            {currentPage === 'patient_details' && (
              <Patient_Details
                currentUser={currentUser}
                selectedPatient={selectedPatient}
                setSelectedPatient={setSelectedPatient}
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
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'admin_doctors' && (
              <AdminDoctors
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedDoctor={setSelectedDoctor}
                setSelectedHospital={setSelectedHospital}
              />
            )}
            {currentPage === 'admin_doctor_details' && (
              <AdminDoctorDetails
                currentUser={currentUser}
                selectedDoctor={selectedDoctor}
                setSelectedDoctor={setSelectedDoctor}
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'admin_nurses' && (
              <AdminNurses
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedNurse={setSelectedNurse}
                setSelectedHospital={setSelectedHospital}
              />
            )}
            {currentPage === 'admin_nurse_details' && (
              <AdminNurseDetails
                currentUser={currentUser}
                selectedNurse={selectedNurse}
                setSelectedNurse={setSelectedNurse}
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'admin_receptionists' && (
              <AdminReceptionists
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedReceptionist={setSelectedReceptionist}
                setSelectedHospital={setSelectedHospital}
              />
            )}
            {currentPage === 'admin_receptionist_details' && (
              <AdminReceptionistDetails
                currentUser={currentUser}
                selectedReceptionist={selectedReceptionist}
                setSelectedReceptionist={setSelectedReceptionist}
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'admin_patients' && (
              <AdminPatients
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedPatient={setSelectedPatient}
                setSelectedHospital={setSelectedHospital}
              />
            )}
            {currentPage === 'admin_patient_details' && (
              <AdminPatientDetails
                currentUser={currentUser}
                selectedPatient={selectedPatient}
                setSelectedPatient={setSelectedPatient}
                setCurrentPage={setCurrentPage}
              />
            )}
            {(currentPage === 'admin_settings' || (currentPage === 'setting' && (currentUser?.role || '').toString().toUpperCase().includes('ADMIN') && !(currentUser?.role || '').toString().toUpperCase().includes('SUPER'))) && (
              <AdminSettings
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                setCurrentPage={setCurrentPage}
                selectedHospital={selectedHospital}
                setSelectedHospital={setSelectedHospital}
              />
            )}
            {currentPage === 'doctor_dashboard' && (
              <DoctorDashboard currentUser={currentUser} setCurrentPage={setCurrentPage} />
            )}
            {currentPage === 'doctor_appointments' && (
              <DoctorAppointments currentUser={currentUser} setCurrentPage={setCurrentPage} />
            )}
            {currentPage === 'doctor_patients' && (
              <DoctorPatients currentUser={currentUser} setCurrentPage={setCurrentPage} />
            )}
            {currentPage === 'doctor_schedule' && (
              <DoctorRegularSchedule currentUser={currentUser} setCurrentPage={setCurrentPage} />
            )}
            {(currentPage === 'doctor_settings' || (currentPage === 'setting' && (currentUser?.role || '').toString().toUpperCase().includes('DOCTOR'))) && (
              <DoctorSettings
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                setCurrentPage={setCurrentPage}
                selectedHospital={selectedHospital}
                setSelectedHospital={setSelectedHospital}
              />
            )}
            {currentPage === 'nurse_dashboard' && (
              <NurseDashboard currentUser={currentUser} setCurrentPage={setCurrentPage} />
            )}
            {currentPage === 'nurse_patients' && (
              <NursePatients currentUser={currentUser} setCurrentPage={setCurrentPage} />
            )}
            {(currentPage === 'nurse_settings' || (currentPage === 'setting' && (currentUser?.role || '').toString().toUpperCase().includes('NURSE'))) && (
              <NurseSettings
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                setCurrentPage={setCurrentPage}
                selectedHospital={selectedHospital}
                setSelectedHospital={setSelectedHospital}
              />
            )}
            {currentPage === 'receptionist_dashboard' && (
              <ReceptionistDashboard
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedPatient={setSelectedPatient}
                setSelectedDoctorForPatient={setSelectedDoctorForPatient}
              />
            )}
            {currentPage === 'receptionist_doctors' && (
              <ReceptionistDoctors
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedDoctorForPatient={setSelectedDoctorForPatient}
              />
            )}
            {currentPage === 'receptionist_patients' && (
              <ReceptionistPatient
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedPatient={setSelectedPatient}
                selectedDoctorForPatient={selectedDoctorForPatient}
              />
            )}
            {currentPage === 'receptionist_patient_details' && (
              <ReceptionistPatientDetails
                currentUser={currentUser}
                selectedPatient={selectedPatient}
                setSelectedPatient={setSelectedPatient}
                setCurrentPage={setCurrentPage}
              />
            )}
            {(currentPage === 'receptionist_anassine' || currentPage === 'receptionist_unassigned' || currentPage === 'anassine') && (
              <ReceptionistAnassine
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                setSelectedPatient={setSelectedPatient}
                setSelectedDoctorForPatient={setSelectedDoctorForPatient}
              />
            )}
            {(currentPage === 'receptionist_settings' || (currentPage === 'setting' && (currentUser?.role || '').toString().toUpperCase().includes('RECEPTION'))) && (
              <ReceptionistSetting
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                setCurrentPage={setCurrentPage}
              />
            )}
            {currentPage === 'patient_dashboard' && (
              <PatientDashboard currentUser={currentUser} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AppRoutes;
export { AppRoutes, AppRoutes as Route };
