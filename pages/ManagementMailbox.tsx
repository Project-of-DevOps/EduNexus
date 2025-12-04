import React from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';

const ManagementMailbox: React.FC = () => {
  const { notifications, getNotificationsForEmail } = useData();
  const navigate = useNavigate();

  // For demo purposes allow browsing a well-known developer mailbox as well
  const devInbox = getNotificationsForEmail('storageeapp@gmail.com');

  // A simple mailbox view showing recipient, subject/body and timestamp
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mailbox — Mock Email History</h1>
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard/management')}>← Back</Button>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-bold">Developer Mailbox (storageeapp@gmail.com)</h3>
        <p className="text-sm text-gray-500 mb-3">Mock emails that would normally be sent by the server are stored here as notifications for developer testing & audit.</p>
        <div className="space-y-2 max-h-72 overflow-y-auto mt-2">
          {devInbox.length === 0 && <div className="text-gray-500">No messages yet.</div>}
          {devInbox.map(m => (
            <div key={m.id} className="p-3 bg-[rgb(var(--subtle-background-color))] rounded">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="font-semibold">To: {m.recipientEmail}</div>
                  {m.subject && <div className="text-sm font-semibold mt-1">{m.subject}</div>}
                  {m.body && <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{m.body}</div>}
                  {!m.subject && !m.body && <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{m.message}</div>}
                </div>
                <div className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold">All Mock Email Notifications</h3>
        <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
          {notifications.length === 0 && <p className="text-gray-500">No messages yet.</p>}
          {notifications.map(n => (
            <div key={n.id} className="p-3 bg-[rgb(var(--subtle-background-color))] rounded">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold">{n.recipientEmail || '—'}</div>
                  {n.subject && <div className="text-sm font-semibold mt-1">{n.subject}</div>}
                  {n.body && <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{n.body}</div>}
                  {!n.subject && !n.body && <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{n.message}</div>}
                </div>
                <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ManagementMailbox;
