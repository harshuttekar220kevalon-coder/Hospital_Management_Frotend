import NotificationCenter from '../Common/NotificationCenter';

const SuperAdminNotifications = ({ currentUser }) => <NotificationCenter currentUser={{ ...currentUser, role: 'SUPER_ADMIN' }} />;

export default SuperAdminNotifications;
