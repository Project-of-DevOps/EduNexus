import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useData } from '../context/DataContext';
import RejectModal from '../components/RejectModal';

const ManagementCode: React.FC = () => {
  const navigate = useNavigate();
  const { orgCodes, createOrgCodeRequest, pendingCodeRequests, getNotificationsForEmail, rejectOrgCodeRequest, getOrgCodeAnalytics } = useData();
  const [managementEmail, setManagementEmail] = React.useState('');
  const [lastToken, setLastToken] = React.useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [rejectToken, setRejectToken] = React.useState<string | undefined>(undefined);

  // scope selection defaults could be added later; for now allow both types
  const requestCode = async (orgType: 'school' | 'institute') => {
    if (!managementEmail.trim()) return;
    const req = await createOrgCodeRequest({ orgType, managementEmail });
    setLastToken(req?.token || null);
  };

  return (
    <>
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
          <h3 className="text-lg font-bold">Rejected Requests</h3>
          <p className="text-sm text-gray-500 mb-3">Requests rejected by the developer — reasons are captured and notified to management.</p>
          <div className="space-y-2">
            {pendingCodeRequests.filter(p => p.status === 'rejected').length === 0 && <p className="text-gray-500">None</p>}
            {pendingCodeRequests.filter(p => p.status === 'rejected').map(p => (
              <div key={p.id} className="p-3 bg-[rgb(var(--subtle-background-color))] rounded flex justify-between items-center">
                <div>
                  <div className="font-semibold">{p.orgType} — {p.managementEmail}</div>
                  <div className="text-xs text-gray-400">Requested: {new Date(p.requestAt).toLocaleString()} • Status: {p.status}{p.rejectionReason ? ` • Reason: ${p.rejectionReason}` : ''}</div>
                </div>
                <div className="flex gap-2">
                  {p.token && <a className="text-xs font-mono text-blue-600" href={`#/confirm-code/${p.token}`}>Confirm link</a>}
                </div>
              </div>
            ))}
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
                  {p.token && <Button size="sm" variant="danger" onClick={() => { setRejectToken(p.token); setRejectModalOpen(true); }}>Reject</Button>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold">Request Analytics</h3>
          <p className="text-sm text-gray-500 mb-3">Basic counts for org-code request lifecycle (from server).</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {(() => {
              try {
                const a = getOrgCodeAnalytics();
                if (!a) return <div className="col-span-2 text-gray-500">No analytics available</div>;
                const totals = (a.totals || []).reduce((acc: any, r: any) => { acc[r.status] = Number(r.cnt); return acc; }, {});
                return (
                  <>
                    <div className="p-3 bg-[rgb(var(--subtle-background-color))] rounded">
                      <div className="text-xs text-gray-400">Total Pending</div>
                      <div className="text-2xl font-bold">{totals.pending || 0}</div>
                    </div>
                    <div className="p-3 bg-[rgb(var(--subtle-background-color))] rounded">
                      <div className="text-xs text-gray-400">Total Confirmed</div>
                      <div className="text-2xl font-bold">{totals.confirmed || 0}</div>
                    </div>
                    <div className="p-3 bg-[rgb(var(--subtle-background-color))] rounded">
                      <div className="text-xs text-gray-400">Total Rejected</div>
                      <div className="text-2xl font-bold">{totals.rejected || 0}</div>
                    </div>
                    <div className="p-3 bg-[rgb(var(--subtle-background-color))] rounded">
                      <div className="text-xs text-gray-400">By OrgType</div>
                      <div className="text-sm">{JSON.stringify(a.byOrgTypeAndStatus || [])}</div>
                    </div>
                  </>
                );
              } catch (e) {
                return <div className="col-span-2 text-gray-500">Analytics unavailable</div>;
              }
            })()}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold">Developer Inbox (storageeapp@gmail.com)</h3>
          <div className="flex justify-end mt-2">
            <a className="text-sm text-blue-600 hover:underline" href="#/dashboard/management/mail">Open Mailbox →</a>
          </div>
          <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
            {getNotificationsForEmail('storageeapp@gmail.com').length === 0 && <p className="text-gray-500">No dev emails received yet.</p>}
            {getNotificationsForEmail('storageeapp@gmail.com').map(n => (
              <div key={n.id} className="p-2 bg-[rgb(var(--subtle-background-color))] rounded flex justify-between items-center">
                <div className="text-sm whitespace-pre-wrap">{n.message}</div>
                {n.meta?.token ? (
                  <div className="flex gap-2 items-center">
                    <a className="text-xs font-mono text-blue-600" href={`#/confirm-code/${n.meta.token}`}>Open</a>
                    <button className="text-xs text-red-600 hover:underline" onClick={() => { setRejectToken(n.meta.token); setRejectModalOpen(true); }}>Reject</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <RejectModal open={rejectModalOpen} token={rejectToken} onClose={() => setRejectModalOpen(false)} onConfirm={(token, reason) => { if (token) { rejectOrgCodeRequest(token, reason); alert('Rejected — management will be notified.'); } }} />
    </>
  );
};

export default ManagementCode;
