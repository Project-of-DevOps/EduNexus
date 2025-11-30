import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { DataProvider, useData } from '../context/DataContext';

const Runner: React.FC<{ run: (ctx: ReturnType<typeof useData>) => Promise<void> }> = ({ run }) => {
  const ctx = useData();
  React.useEffect(() => {
    run(ctx).catch(e => {
      // eslint-disable-next-line no-console
      console.error(e);
    });
  }, []);
  return <div>runner</div>;
};

describe('Org request end-to-end', () => {
  it('manager creates request -> applicant submits -> approve -> activates', async () => {
    const run = async (ctx: any) => {
      // start clean
      // create request by manager
      const req = ctx.addOrgRequest({ name: 'Test User', email: 'alice@example.test', role: 'student', orgType: 'institute', instituteId: 'inst-1' });
      expect(req.id).toBeTruthy();
      expect(req.code).toHaveLength(6);

      // applicant joins using code
      const resultSubmit = ctx.submitOrgJoinRequest({ code: req.code, name: 'Alice', email: 'alice@example.test', role: 'student', orgType: 'institute', instituteId: 'inst-1' });
      expect(resultSubmit.status).toBe('pending');

      // manager approves with activation flow (default)
      const res = ctx.approveOrgRequest(req.id, { requireActivation: true });
      expect(res.success).toBe(true);
      expect(res.activationToken).toBeTruthy();

      // check pending request status updated
      const updated = ctx.pendingOrgRequests.find((p: any) => p.id === req.id);
      expect(updated.status).toBe('approved');

      // user was created and contains activationToken
      const user = ctx.users.find((u: any) => u.email === 'alice@example.test');
      expect(user).toBeTruthy();
      expect(user.activationToken).toBeTruthy();

      // notification present
      const notes = ctx.getNotificationsForEmail('alice@example.test');
      expect(notes.length).toBeGreaterThan(0);
      expect(notes[0].meta?.activationToken || notes.some((n: any) => n.meta?.activationToken)).toBeTruthy();

      // activate using token
      const token = res.activationToken;
      const activated = ctx.activateUser(token, 'StrongPassword!');
      expect(activated).toBe(true);

      const userAfter = ctx.users.find((u: any) => u.email === 'alice@example.test');
      expect(userAfter.activated).toBe(true);
      expect(userAfter.password).toBe('StrongPassword!');

      // check activation notification
      const notesAfter = ctx.getNotificationsForEmail('alice@example.test');
      expect(notesAfter.some((n: any) => n.message.includes('activated'))).toBe(true);
    };

    render(
      <DataProvider>
        <Runner run={run} />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('runner')).toBeInTheDocument();
    });
  }, 10000);
});
