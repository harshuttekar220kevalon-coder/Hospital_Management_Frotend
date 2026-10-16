import NotificationCenter from '../Common/NotificationCenter';

const DoctorNotifications = ({ currentUser }) => (
  <NotificationCenter
    currentUser={{ ...currentUser, role: 'DOCTOR' }}
    allowSend={false}
  />
);

export default DoctorNotifications;
