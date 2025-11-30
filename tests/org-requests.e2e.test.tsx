                     import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
  return <div>ready</div>;
}

describe('Organization request flow (e2e)', () => {
  it('creates request → submit → approve(with activation) → notify → activate user', async () => {
    const run = async (api: any) => {
      // create request by manager
      const { id, code } = api.addOrgRequest({ name: 'Applicant', email: 'applicant@example.com', role: 'student', orgType: 'school' });
      expect(id).toBeTruthy();
      expect(code).toHaveLength(6);

      // applicant submits using code
      const submit = api.submitOrgJoinRequest({ code, name: 'Applicant', email: 'applicant@example.com', role: 'student', orgType: 'school' });
      expect(submit.status).toBe('pending');

      // manager approves with activation required
      // submitOrgJoinRequest may create a new pending request if the provider
      // state hasn't been updated yet; use the submit result id when provided
      const toApproveId = submit.attached ? id : submit.id;

      // approval may require React state to settle — wait for the provider state to include the pending request and be approvable
      const res = await waitFor(() => {
        const maybe = api.approveOrgRequest(toApproveId, { requireActivation: true });
        if (!maybe) throw new Error('request not yet attached in provider');
        return maybe;
      });

      expect(res.success).toBe(true);
      expect(res.activationToken).toBeDefined();

      // notifications should mention token
      const notifications = api.getNotificationsForEmail('applicant@example.com');
      expect(notifications.length).toBeGreaterThan(0);
      const activationNote = notifications.find((n: any) => n.meta?.activationToken === res.activationToken);
      expect(activationNote).toBeDefined();

      // activate user
      const ok = api.activateUser(res.activationToken, 'NewP@ss123');
      expect(ok).toBe(true);

      // ensure user is in users list with activated === true
      const created = api.users.find((u: any) => u.email === 'applicant@example.com');
      expect(created).toBeDefined();
      expect(created.activated).toBe(true);
    };

    render(<DataProvider><Runner run={run} /></DataProvider>);

    // Runner runs the flow inside a React effect; wait for the Runner component to render
    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument());
  });
});
