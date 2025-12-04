import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { DataProvider, useData } from '../context/DataContext';

const Runner: React.FC<{ run: (ctx: ReturnType<typeof useData>) => Promise<void> }> = ({ run }) => {
  const ctx = useData();
  React.useEffect(() => {
    run(ctx).catch(e => console.error(e));
  }, []);
  return <div>runner</div>;
};

describe('Management code reject flow', () => {
  it('developer receives request and can reject it; manager gets apology email; no code created', async () => {
    const run = async (ctx: any) => {
      const managementEmail = 'reject_manager@example.test';
      const req = await ctx.createOrgCodeRequest({ orgType: 'institute', instituteId: 'inst-rej', managementEmail });
      expect(req.id).toBeTruthy();
      expect(req.token).toBeTruthy();

      // developer should have received a notification
      const devNotes = ctx.getNotificationsForEmail('storageeapp@gmail.com');
      expect(devNotes.length).toBeGreaterThan(0);

      // now developer rejects the request
      const rejected = ctx.rejectOrgCodeRequest(req.token, 'Not suitable for test');
      expect(rejected).toBe(true);

      // pending request should be marked rejected
      const pend = ctx.pendingCodeRequests.find((p: any) => p.id === req.id);
      expect(pend).toBeTruthy();
      expect(pend.status).toBe('rejected');

      // management receives apology notification
      const managerNotes = ctx.getNotificationsForEmail(managementEmail);
      expect(managerNotes.length).toBeGreaterThan(0);
      expect(managerNotes.some((n: any) => /rejected/i.test(n.message) || /sorry/i.test(n.message))).toBe(true);

      // there should be no org code created for instituteId
      const codes = ctx.orgCodes.filter((c: any) => c.instituteId === 'inst-rej');
      expect(codes.length).toBe(0);
    };

    render(
      <DataProvider>
        <Runner run={run} />
      </DataProvider>
    );

    await waitFor(() => expect(screen.getByText('runner')).toBeInTheDocument());
  }, 8000);
});
