import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useData } from '../context/DataContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';


export const ManagementSignupsContent: React.FC = () => {
  const { pendingManagementSignups, retryPendingSignup, cancelPendingSignup } = useData();
  const [auditRows, setAuditRows] = useState<any[] | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [serverQueue, setServerQueue] = useState<any[] | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchAudit = async () => {
    setLoadingAudit(true);
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
      const r = await fetch(`${apiUrl}/api/sync-audit`);
      const json = await r.json();
      if (json && json.rows) setAuditRows(json.rows);
    } catch (e) {
      setAuditRows([{ error: String(e) }]);
    } finally { setLoadingAudit(false); }
  };

  const fetchServerQueue = async (status?: string) => {
    setLoadingQueue(true);
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      const r = await fetch(`${apiUrl}/api/queue-signups${q}`);
      const json = await r.json();
      if (json && json.rows) setServerQueue(json.rows);
    } catch (e) {
      setServerQueue([{ error: String(e) }]);
    } finally { setLoadingQueue(false); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const bulkRetry = async () => {
    if (!selectedIds.length) return;
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    const r = await fetch(`${apiUrl}/api/queue-signups/bulk-retry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
    const json = await r.json();
    // refresh both queue and audit
    await fetchServerQueue();
    await fetchAudit();
    setSelectedIds([]);
    return json;
  };

  const bulkDelete = async () => {
    if (!selectedIds.length) return;
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    for (const id of selectedIds) {
      await fetch(`${apiUrl}/api/queue-signups/${id}`, { method: 'DELETE' });
    }
    await fetchServerQueue();
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Pending Management Signups</h2>

      <Card className="p-4">
        <div className="space-y-2">
          {pendingManagementSignups.length === 0 && <p className="text-gray-500">No queued signups.</p>}
          {pendingManagementSignups.map(p => (
            <div key={p.id} className="flex justify-between items-center p-2 bg-[rgb(var(--subtle-background-color))] rounded">
              <div>
                <div className="font-semibold">{p.email}</div>
                <div className="text-xs text-gray-400">Created: {new Date(p.createdAt).toLocaleString()} • Attempts: {p.attempts || 0} {p.error ? `• ${p.error}` : ''}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => retryPendingSignup(p.id)}>Retry</Button>
                <Button size="sm" variant="outline" onClick={() => cancelPendingSignup(p.id)}>Cancel</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-6">
        <h3 className="text-lg font-semibold">Server Sync Audit</h3>
        <div className="flex gap-2">
          <Button onClick={fetchAudit} disabled={loadingAudit}>{loadingAudit ? 'Loading...' : 'Refresh Audit'}</Button>
        </div>
      </div>

      <Card className="p-4">
        {auditRows == null && <p className="text-gray-500">Click "Refresh Audit" to load recent signup sync events from the server.</p>}
        {auditRows && auditRows.length === 0 && <p className="text-gray-500">No audit rows available.</p>}
        {auditRows && auditRows.length > 0 && (
          <div className="space-y-2">
            {auditRows.map((r: any) => (
              <div key={r.id || r.email} className="p-2 rounded bg-[rgb(var(--subtle-background-color))]">
                <div className="font-mono text-sm">{r.email} — {r.status} — attempts: {r.attempts || 0}</div>
                <div className="text-xs text-gray-400">{r.note || ''} • {r.created_at ? new Date(r.created_at).toLocaleString() : ''}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Server Queue</h3>
        <div className="flex gap-2">
          <Button onClick={() => fetchServerQueue()} disabled={loadingQueue}>{loadingQueue ? 'Loading...' : 'Refresh Queue'}</Button>
          <Button onClick={bulkRetry} disabled={!selectedIds.length}>Retry Selected</Button>
          <Button variant="danger" onClick={bulkDelete} disabled={!selectedIds.length}>Delete Selected</Button>
        </div>
      </div>

      <Card className="p-4 mt-2">
        {serverQueue == null && <p className="text-gray-500">Click "Refresh Queue" to load queued signups from the server.</p>}
        {serverQueue && serverQueue.length === 0 && <p className="text-gray-500">No server queued signups.</p>}
        {serverQueue && serverQueue.length > 0 && (
          <div className="space-y-2">
            {serverQueue.map((row: any) => (
              <div key={row.id || row.email} className="p-2 rounded bg-[rgb(var(--subtle-background-color))] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelect(row.id)} />
                  <div>
                    <div className="font-semibold">{row.email}</div>
                    <div className="text-xs text-gray-400">{row.status} • attempts: {row.attempts || 0}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={async () => { await fetch(`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:4000'}/api/queue-signups/${row.id}/retry`, { method: 'POST' }); await fetchServerQueue(); await fetchAudit(); }}>Retry</Button>
                  <Button size="sm" variant="outline" onClick={async () => { await fetch(`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:4000'}/api/queue-signups/${row.id}`, { method: 'DELETE' }); await fetchServerQueue(); }}>Cancel</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const ManagementSignups: React.FC = () => {
  return (
    <Layout navItems={[]} activeItem="Pending Signups" setActiveItem={() => { }} profileNavItemName="Profile">
      <ManagementSignupsContent />
    </Layout>
  );
};

export default ManagementSignups;

