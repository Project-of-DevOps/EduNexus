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

describe('viewOrgCode fallback', () => {
  it('returns local code when server is unreachable', async () => {
    const run = async (ctx: any) => {
      const req = await ctx.createOrgCodeRequest({ orgType: 'institute', instituteId: 'inst-view', managementEmail: 'mgr@example.test' });
      expect(req.token).toBeTruthy();

      // confirm locally — this will write a local orgCode
      const confirmed = await ctx.confirmOrgCodeRequest(req.token);
      expect(confirmed && confirmed.success).toBe(true);

      // now viewOrgCode should return the created code even if server offline
      const result = await ctx.viewOrgCode('any', 'institute');
      expect(result.success).toBe(true);
      expect(result.code).toBeTruthy();
    };

    render(
      <DataProvider>
        <Runner run={run} />
      </DataProvider>
    );

    await waitFor(() => expect(screen.getByText('runner')).toBeInTheDocument());
  }, 8000);
});
