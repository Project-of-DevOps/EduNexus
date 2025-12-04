import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataProvider, useData } from '../context/DataContext';

const Runner: React.FC<{ run: (ctx: ReturnType<typeof useData>) => Promise<void> }> = ({ run }) => {
  const ctx = useData();
  React.useEffect(() => {
    run(ctx).catch(e => console.error(e));
  }, []);
  return <div>ready</div>;
};

describe('Management code confirmation flow', () => {
  it('management requests code → developer receives email → developer confirms → management receives final code', async () => {
    const flow = async (ctx: any) => {
      const managementEmail = 'management@example.test';

      // management creates a code request
      const req = await ctx.createOrgCodeRequest({ orgType: 'institute', instituteId: 'inst-42', managementEmail });
      expect(req.id).toBeTruthy();
      expect(req.token).toHaveLength(10);

      // developer (storageeapp) should receive a confirmation request
      const devNotes = ctx.getNotificationsForEmail('storageeapp@gmail.com');
      expect(devNotes.length).toBeGreaterThan(0);
      expect(devNotes[0].message).toContain(req.token);

      // developer confirms the token
      const confirmed = await ctx.confirmOrgCodeRequest(req.token);
      expect(confirmed).not.toBe(false);
      expect(confirmed?.success).toBe(true);
      expect(confirmed?.code).toHaveLength(6);

      // management receives final code email and message includes thanks text
      const managerNotes = ctx.getNotificationsForEmail(managementEmail);
      expect(managerNotes.length).toBeGreaterThan(0);
      expect(managerNotes[0].message).toContain('Thanks For using EduNexus AI');
      expect(managerNotes[0].message).toContain(confirmed?.code || '');

      // ensure orgCodes contains the new code visible to the management dashboard
      const codes = ctx.orgCodes.filter((c: any) => c.instituteId === 'inst-42');
      expect(codes.length).toBeGreaterThan(0);
      expect(codes[0].code).toBe(confirmed?.code);
    };

    render(
      <DataProvider>
        <Runner run={flow} />
      </DataProvider>
    );

    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument());
  });
});
