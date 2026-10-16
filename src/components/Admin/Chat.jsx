import InternalChat from '../Common/InternalChat';

const AdminChat = ({ currentUser }) => {
  return <InternalChat currentUser={{ ...currentUser, role: 'ADMIN' }} />;
};

export default AdminChat;
