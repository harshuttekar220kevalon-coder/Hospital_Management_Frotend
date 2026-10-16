import InternalChat from '../Common/InternalChat';

const ReceptionistChat = ({ currentUser }) => {
  return <InternalChat currentUser={{ ...currentUser, role: 'RECEPTIONISTS' }} />;
};

export default ReceptionistChat;
