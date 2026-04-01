import { useNavigate } from 'react-router-dom';
import MediaLibraryModal from '../../MediaLibraryModal';
import { MEDIA_LIBRARY_TYPES } from '../../mediaLibraryHelpers';

export default function MediaLibraryPage() {
  const navigate = useNavigate();

  return (
    <MediaLibraryModal
      open
      onClose={() => navigate('/portal/dashboard')}
      title="Workspace Gallery"
      subtitle="Manage the files stored on your server and reuse them across chats, campaigns, and message flows."
      allowedTypes={MEDIA_LIBRARY_TYPES}
      allowMultiple
      hideConfirm
      helperText="Upload, search, filter, and clean up server-hosted media for your team."
    />
  );
}
