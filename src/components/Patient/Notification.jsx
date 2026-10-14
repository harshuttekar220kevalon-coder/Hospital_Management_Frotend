import PatientNavbar from './PatientNavbar';
import NotificationCenter from '../Common/NotificationCenter';

const PatientNotifications = ({ currentUser, currentPage, setCurrentPage, isLoggedIn, onLogout }) => (
  <>
    <PatientNavbar
      currentUser={currentUser}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      isLoggedIn={isLoggedIn}
      onLogout={onLogout}
    />
    <NotificationCenter currentUser={currentUser} />
  </>
);

export default PatientNotifications;
