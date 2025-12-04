import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const DEV_EMAIL = 'storageeapp@gmail.com';

const DevNotificationPopup: React.FC = () => {
  const { user } = useAuth();
  const { getNotificationsForEmail, confirmOrgCodeRequest, markNotificationRead, notifications } = useData();
  const [visible, setVisible] = React.useState(false);
  const [current, setCurrent] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (!user) return; // Don't check notifications if not logged in
    if (user.email !== DEV_EMAIL) return; // Only show to developer
    const notes = getNotificationsForEmail(DEV_EMAIL).filter(n => !n.read && (n.type === 'org' || n.type === 'code:request' || n.type === 'code:confirmed'));
    if (notes.length === 0) return;
    // find the latest code:request (or the first pending)
    const pending = notes.find((n: any) => n.meta?.token && n.relatedRequestId);
    if (pending) {
      // show it
      setCurrent(pending);
      setVisible(true);
    }
  }, [getNotificationsForEmail, notifications, user]);

  if (!current || !user || user.email !== DEV_EMAIL) return null;

  return (
    <Modal isOpen={visible} onClose={() => { setVisible(false); if (current) markNotificationRead(current.id); }} className="w-[700px] h-[500px] flex flex-col">
      <div className="space-y-4 flex-1 flex flex-col">
        <h3 className="text-lg font-bold">Developer - Confirmation</h3>
        <div className="flex-1 overflow-y-auto">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{current.message}</p>
        </div>
        <div className="flex justify-end gap-2 mt-auto">
          <Button variant="secondary" onClick={() => { setVisible(false); markNotificationRead(current.id); }}>Dismiss</Button>
          {current.meta?.token && (
            <Button onClick={async () => {
              const res = await confirmOrgCodeRequest(current.meta.token);
              // close popup after attempting confirmation
              setVisible(false);
              if (res && (res as any).success) {
                markNotificationRead(current.id);
              }
            }}>Confirm</Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DevNotificationPopup;
