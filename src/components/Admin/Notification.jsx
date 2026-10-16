import NotificationCenter from '../Common/NotificationCenter';

const AdminNotifications = ({ currentUser }) => <NotificationCenter currentUser={{ ...currentUser, role: 'ADMIN' }} />;

export default AdminNotifications;
