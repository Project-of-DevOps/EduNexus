import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataProvider, useData } from '../context/DataContext';
import { AuthProvider, useAuth } from '../context/AuthContext';

const Runner: React.FC<{ run: (ctx: ReturnType<typeof useData>, auth: ReturnType<typeof useAuth>) => Promise<void> }> = ({ run }) => {
  const ctx = useData();
  const auth = useAuth();
  React.useEffect(() => {
    run(ctx, auth).catch(e => console.error(e));
  }, []);
  return <div>ready</div>;
};

describe('Queued management signup sync', () => {
  it('queues signup when server unreachable and retries to sync successfully', async () => {
    // initial fetch fails: simulate server offline
    const originalFetch = globalThis.fetch;
    const failingFetch = vi.fn().mockImplementation(() => Promise.reject(new Error('network')));
    globalThis.fetch = failingFetch as any;

    const flow = async (ctx: any, auth: any) => {
      // sign up a management user — API is unreachable so should be queued
      const ok = await auth.signUp('Queued Admin', 'queued-admin@example.test', 's3cret', 2 /* UserRole.Management */ as any, { type: 'institute' });
      expect(ok).toBe(true);

      // ensure pending queue contains the entry (wait for state to update)
      await waitFor(() => expect(ctx.pendingManagementSignups.some((p: any) => p.email === 'queued-admin@example.test')).toBeTruthy());
      const pending = ctx.pendingManagementSignups.filter((p: any) => p.email === 'queued-admin@example.test');

      // the local users list should include a pending local user
      const local = ctx.users.find((u: any) => u.email === 'queued-admin@example.test');
      expect(local).toBeTruthy();
      expect(local.pendingSync).toBeTruthy();

      // Now patch fetch to succeed for signup API
      const successResp = { success: true, user: { id: 'server_1', name: 'Queued Admin', email: 'queued-admin@example.test', role: 'Management' } };
      const successfulFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/api/signup')) {
          return Promise.resolve({ ok: true, json: async () => successResp });
        }
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
      });

      globalThis.fetch = successfulFetch as any;

      // Try explicit retry (UI action would call this)
      const pendingEntry = pending[0];
      const synced = await ctx.retryPendingSignup(pendingEntry.id);
      expect(synced).toBe(true);

      // the pending queue should no longer contain the email
      const stillPending = ctx.pendingManagementSignups.find((p: any) => p.email === 'queued-admin@example.test');
      expect(stillPending).toBeUndefined();

      // local users should now include server user and not keep pendingSync flag
      const serverUser = ctx.users.find((u: any) => u.email === 'queued-admin@example.test' && u.id === 'server_1');
      expect(serverUser).toBeTruthy();
      expect((serverUser as any).pendingSync).toBeFalsy();

      // restore original fetch if present
      globalThis.fetch = originalFetch;
    };

    render(
      <DataProvider>
        <AuthProvider>
          <Runner run={flow} />
        </AuthProvider>
      </DataProvider>
    );

    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument());
  });
});
