import NotificationCenter from '../Common/NotificationCenter';

const NurseNotifications = ({ currentUser }) => (
  <NotificationCenter
    currentUser={{ ...currentUser, role: 'NURSE' }}
    allowSend={false}
  />
);

export default NurseNotifications;
