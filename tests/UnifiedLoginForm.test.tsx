import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import UnifiedLoginForm from '../components/Login/UnifiedLoginForm';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { }, // Deprecated
        removeListener: () => { }, // Deprecated
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    }),
});

const renderWithProviders = (ui: React.ReactElement) => {
    return render(
        <BrowserRouter>
            <DataProvider>
                <AuthProvider>
                    {ui}
                </AuthProvider>
            </DataProvider>
        </BrowserRouter>
    );
};

describe('UnifiedLoginForm', () => {
    test('renders email entry step by default', () => {
        renderWithProviders(<UnifiedLoginForm />);
        expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
        // Password should NOT be visible yet
        expect(screen.queryByLabelText(/Password/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    });

    test('proceeds to password step after entering email', async () => {
        const user = userEvent.setup();
        renderWithProviders(<UnifiedLoginForm />);

        const emailInput = screen.getByLabelText(/Email Address/i);
        await user.type(emailInput, 'test@example.com');

        const continueBtn = screen.getByRole('button', { name: 'Continue' });
        await user.click(continueBtn);

        await waitFor(() => expect(screen.getByLabelText(/Password/i)).toBeInTheDocument());
        expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    test('switches to signup form', async () => {
        const user = userEvent.setup();
        renderWithProviders(<UnifiedLoginForm />);

        // First enter email to get to the main form
        const emailInput = screen.getByLabelText(/Email Address/i);
        await user.type(emailInput, 'newuser@example.com');

        const continueBtn = screen.getByRole('button', { name: 'Continue' });
        await user.click(continueBtn);

        // Wait for Step 2
        await waitFor(() => expect(screen.getByLabelText(/Password/i)).toBeInTheDocument());

        // Now switch to signup
        const signupBtn = screen.getByRole('button', { name: /Sign up/i });
        await user.click(signupBtn);

        expect(screen.getByRole('heading', { name: /Create Account/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });

    test('shows password strength meter on signup', async () => {
        const user = userEvent.setup();
        renderWithProviders(<UnifiedLoginForm />);

        // Enter email
        const emailInput = screen.getByLabelText(/Email Address/i);
        await user.type(emailInput, 'newuser@example.com');

        const continueBtn = screen.getByRole('button', { name: 'Continue' });
        await user.click(continueBtn);

        // Wait for Step 2
        await waitFor(() => expect(screen.getByLabelText(/Password/i)).toBeInTheDocument());

        // Switch to signup
        const signupBtn = screen.getByRole('button', { name: /Sign up/i });
        await user.click(signupBtn);

        const passwordInput = screen.getByLabelText(/Password/i);
        await user.type(passwordInput, 'weak');
        expect(screen.getByText(/Weak/i)).toBeInTheDocument();

        await user.clear(passwordInput);
        await user.type(passwordInput, 'mediumpas');
        expect(screen.getByText(/Medium/i)).toBeInTheDocument();

        await user.clear(passwordInput);
        await user.type(passwordInput, 'strongpassword123');
        expect(screen.getByText(/Strong/i)).toBeInTheDocument();
    });

    test('handles forgot password flow', async () => {
        const user = userEvent.setup();
        renderWithProviders(<UnifiedLoginForm />);

        // Enter email
        const emailInput = screen.getByLabelText(/Email Address/i);
        await user.type(emailInput, 'forgot@example.com');

        const continueBtn = screen.getByRole('button', { name: 'Continue' });
        await user.click(continueBtn);

        // Wait for Step 2
        await waitFor(() => expect(screen.getByLabelText(/Password/i)).toBeInTheDocument());

        // Click Forgot Password
        const forgotBtn = screen.getByText(/Forgot password\?/i);
        await user.click(forgotBtn);

        expect(screen.getByRole('heading', { name: /Reset Password/i })).toBeInTheDocument();

        // Email should be pre-filled
        const resetEmailInput = screen.getByLabelText(/Email Address/i);
        expect(resetEmailInput).toHaveValue('forgot@example.com');

        // Submit reset
        const sendBtn = screen.getByRole('button', { name: /Send Reset Link/i });
        await user.click(sendBtn);

        // Expect success message (mocked delay)
        await waitFor(() => expect(screen.getByText(/Password reset link sent/i)).toBeInTheDocument(), { timeout: 3000 });
    });
});
