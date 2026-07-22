import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMocks = vi.hoisted(() => ({
  registerWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

vi.mock('../../../core/auth/firebase', () => firebaseMocks);

import { useAuthStore } from '../../../core/stores/auth-store';
import { RegisterPage } from './RegisterPage';

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().resetForBootstrap();
    useAuthStore.getState().setAnonymous();
  });

  it('submits the validated full name and Firebase credentials', async () => {
    const user = userEvent.setup();
    firebaseMocks.registerWithEmail.mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Full name'), 'Member One');
    await user.type(screen.getByLabelText('Email'), 'member@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret-value');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(firebaseMocks.registerWithEmail).toHaveBeenCalledWith(
      'member@example.com',
      'secret-value',
      'Member One',
    );
  });

  it('maps duplicate email failures to a safe inline message', async () => {
    const user = userEvent.setup();
    firebaseMocks.registerWithEmail.mockRejectedValue({
      code: 'auth/email-already-in-use',
      message: 'member@example.com already exists',
    });
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Full name'), 'Member One');
    await user.type(screen.getByLabelText('Email'), 'member@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret-value');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This email is already in use.');
    expect(alert).not.toHaveTextContent('member@example.com');
  });

  it('preserves the safe return URL when linking back to login', () => {
    render(
      <MemoryRouter initialEntries={['/auth/register?returnUrl=%2Fdashboard%2Fsettings']}>
        <RegisterPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/auth/login?returnUrl=%2Fdashboard%2Fsettings',
    );
  });

  it('does not clear a bootstrap sync error when the page mounts', () => {
    useAuthStore.getState().setAnonymous('Unable to finish signing in. Please try again.');

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unable to finish signing in. Please try again.',
    );
  });
});
