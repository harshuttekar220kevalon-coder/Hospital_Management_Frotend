import NotificationCenter from '../Common/NotificationCenter';

const ReceptionistNotifications = ({ currentUser }) => (
  <NotificationCenter
    currentUser={{ ...currentUser, role: 'RECEPTIONISTS' }}
    allowSend={false}
  />
);

export default ReceptionistNotifications;
