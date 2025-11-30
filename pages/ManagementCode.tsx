import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useData } from '../context/DataContext';

const ManagementCode: React.FC = () => {
  const navigate = useNavigate();
  const { orgCodes, createOrgCodeRequest, pendingCodeRequests, getNotificationsForEmail, confirmOrgCodeRequest } = useData();
  const [managementEmail, setManagementEmail] = React.useState('');
  const [lastToken, setLastToken] = React.useState<string | null>(null);

  // scope selection defaults could be added later; for now allow both types
  const requestCode = (orgType: 'school' | 'institute') => {
    if (!managementEmail.trim()) return;
    const req = createOrgCodeRequest({ orgType, managementEmail });
    setLastToken(req.token);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Management — Codes</h1>
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard/management')}>← Back</Button>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-bold">Create Management Code</h3>
        <p className="text-sm text-gray-500 mb-3">Create an institute or school code and send a confirmation link to the developer (storageeapp@gmail.com).</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Management email</label>
            <Input id="mgmt-code-email" label="" value={managementEmail} onChange={e => setManagementEmail(e.target.value)} />
          </div>
          <div className="flex gap-2 col-span-2">
            <Button onClick={() => requestCode('institute')}>Create Institute Code</Button>
            <Button variant="outline" onClick={() => requestCode('school')}>Create School Code</Button>
            {lastToken && <div className="px-3 py-2 bg-green-50 border border-green-200 rounded text-sm">Token: <span className="font-mono">{lastToken}</span></div>}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold">Published Codes</h3>
        <div className="mt-4 space-y-2">
          {orgCodes.length === 0 && <p className="text-gray-500">No codes published.</p>}
          {orgCodes.map(c => (
            <div key={c.id} className="p-3 bg-[rgb(var(--subtle-background-color))] rounded flex justify-between items-center">
              <div>
                <div className="font-mono text-lg font-bold">{c.code}</div>
                <div className="text-xs text-gray-400">{c.orgType} • {c.instituteId || '—'} • {new Date(c.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(c.code); alert('Copied!'); }}>Copy</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold">Pending Developer Requests</h3>
        <p className="text-sm text-gray-500 mb-3">These are the requests waiting for a developer to confirm (the developer receives a link to confirm).</p>
        <div className="space-y-2">
          {pendingCodeRequests.length === 0 && <p className="text-gray-500">None</p>}
          {pendingCodeRequests.map(p => (
            <div key={p.id} className="p-3 bg-[rgb(var(--subtle-background-color))] rounded flex justify-between items-center">
              <div>
                <div className="font-semibold">{p.orgType} — {p.managementEmail}</div>
                <div className="text-xs text-gray-400">Requested: {new Date(p.requestAt).toLocaleString()} • Status: {p.status}</div>
              </div>
              <div className="flex gap-2">
                {p.token && <a className="text-xs font-mono text-blue-600" href={`#/confirm-code/${p.token}`}>Confirm link</a>}
                {p.token && <Button size="sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/confirm-code/${p.token}`); alert('Confirm link copied'); }}>Copy Link</Button>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold">Developer Inbox (storageeapp@gmail.com)</h3>
        <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
          {getNotificationsForEmail('storageeapp@gmail.com').length === 0 && <p className="text-gray-500">No dev emails received yet.</p>}
          {getNotificationsForEmail('storageeapp@gmail.com').map(n => (
            <div key={n.id} className="p-2 bg-[rgb(var(--subtle-background-color))] rounded flex justify-between items-center">
              <div className="text-sm">{n.message}</div>
              {n.meta?.token ? (
                <div className="flex gap-2 items-center">
                  <a className="text-xs font-mono text-blue-600" href={`#/confirm-code/${n.meta.token}`}>Open</a>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ManagementCode;
