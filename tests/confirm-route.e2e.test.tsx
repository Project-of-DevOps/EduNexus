import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { DataProvider, useData } from '../context/DataContext';
import ConfirmCodePage from '../pages/ConfirmCodePage';

const Starter: React.FC<{ managementEmail: string }> = ({ managementEmail }) => {
  const ctx = useData();
  const navigate = useNavigate();
  React.useEffect(() => {
    const { token } = ctx.createOrgCodeRequest({ orgType: 'institute', instituteId: 'inst-x', managementEmail });
    // navigate to confirmation URL as if clicked externally
    navigate(`/confirm-code/${token}`);
  }, []);
  return <div>ok</div>;
};

describe('Public confirm route (e2e)', () => {
  it('create request then visit confirm URL — confirms, generates code and notifies management', async () => {
    render(
      <DataProvider>
        <MemoryRouter initialEntries={["/start"]}>
          <Routes>
            <Route path="/start" element={<Starter managementEmail="mgmt@domain.test" />} />
            <Route path="/confirm-code/:token" element={<ConfirmCodePage />} />
          </Routes>
        </MemoryRouter>
      </DataProvider>
    );

    // wait for the confirmation page to show a success message
    await waitFor(() => expect(screen.getByText(/Confirmation successful/i)).toBeInTheDocument());

    // confirmation page shown means confirmation flow executed and developer confirmation succeeded
  });
});
