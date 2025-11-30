import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataProvider, useData } from '../context/DataContext';
import DevNotificationPopup from '../components/DevNotificationPopup';

const Runner: React.FC<{ run: (ctx: ReturnType<typeof useData>) => Promise<void> }> = ({ run }) => {
  const ctx = useData();
  React.useEffect(() => { run(ctx).catch(e => console.error(e)); }, []);
  return <div>runner</div>;
};

describe('Dev popup (e2e)', () => {
  it('shows popup when developer receives code request', async () => {
    const flow = async (ctx: any) => {
      // create a management code request - should notify storageeapp@gmail.com
      ctx.createOrgCodeRequest({ orgType: 'institute', instituteId: 'test-inst', managementEmail: 'mgmt@x.test' });
    };

    render(
      <DataProvider>
        <Runner run={flow} />
        <DevNotificationPopup />
      </DataProvider>
    );

    await waitFor(() => expect(screen.getByText(/Developer - Confirmation/i)).toBeInTheDocument());
    expect(screen.getByText(/Please confirm creation/i)).toBeDefined();
  });
});
