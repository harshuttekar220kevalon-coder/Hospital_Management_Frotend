import InternalChat from '../Common/InternalChat';

const NurseChat = ({ currentUser }) => {
  return <InternalChat currentUser={{ ...currentUser, role: 'NURSES' }} />;
};

export default NurseChat;
