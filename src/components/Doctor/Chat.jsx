import InternalChat from '../Common/InternalChat';

const DoctorChat = ({ currentUser }) => {
  return <InternalChat currentUser={{ ...currentUser, role: 'DOCTOR' }} />;
};

export default DoctorChat;
