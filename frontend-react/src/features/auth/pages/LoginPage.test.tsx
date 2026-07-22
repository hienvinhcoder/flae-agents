import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMocks = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

vi.mock('../../../core/auth/firebase', () => firebaseMocks);

import { useAuthStore } from '../../../core/stores/auth-store';
import { LoginPage } from './LoginPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/auth/login?returnUrl=%2Fdashboard%2Fagents']}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().resetForBootstrap();
    useAuthStore.getState().setAnonymous();
  });

  it('maps an email login failure to a safe inline message without leaking PII', async () => {
    const user = userEvent.setup();
    firebaseMocks.signInWithEmail.mockRejectedValue({
      code: 'auth/invalid-credential',
      message: 'member@example.com used password secret-value',
    });
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'member@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret-value');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(firebaseMocks.signInWithEmail).toHaveBeenCalledWith(
      'member@example.com',
      'secret-value',
    );
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Email or password is incorrect.');
    expect(alert).not.toHaveTextContent('member@example.com');
    expect(alert).not.toHaveTextContent('secret-value');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('starts Google popup authentication and clears its local pending state on success', async () => {
    const user = userEvent.setup();
    firebaseMocks.signInWithGoogle.mockResolvedValue(undefined);
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(firebaseMocks.signInWithGoogle).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled(),
    );
  });

  it('shows accessible validation messages before calling Firebase', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'invalid');
    await user.type(screen.getByLabelText('Password'), '123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Password must contain at least 6 characters.')).toBeInTheDocument();
    expect(firebaseMocks.signInWithEmail).not.toHaveBeenCalled();
  });
});
