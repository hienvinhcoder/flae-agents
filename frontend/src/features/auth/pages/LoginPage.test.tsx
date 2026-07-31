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

function deferredPromise() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().resetForBootstrap();
    useAuthStore.getState().setAnonymous();
  });

  it('presents the product story and focuses email for immediate sign-in', () => {
    renderPage();

    expect.soft(screen.queryByText('AI COMPANY MEMORY')).toBeInTheDocument();
    expect.soft(
      screen.queryByText("Sign in to access your team's connected knowledge."),
    ).toBeInTheDocument();
    expect.soft(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus();
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

  it('communicates and prevents duplicate actions while email login is pending', async () => {
    const user = userEvent.setup();
    const pendingLogin = deferredPromise();
    firebaseMocks.signInWithEmail.mockReturnValue(pendingLogin.promise);
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'member@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret-value');

    try {
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      const signInButton = screen.getByRole('button', { name: /^Signing in/ });
      expect.soft(signInButton).toHaveAccessibleName('Signing in...');
      expect.soft(signInButton).toBeDisabled();
      expect.soft(signInButton).toHaveAttribute('aria-busy', 'true');
      expect
        .soft(screen.getByRole('button', { name: 'Continue with Google' }))
        .toBeDisabled();
    } finally {
      pendingLogin.resolve();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled(),
      );
    }
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

  it('associates each validation message with its input', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Email'), 'invalid');
    await user.type(screen.getByLabelText('Password'), '123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Password must contain at least 6 characters.',
    );
  });

  it('preserves the safe return URL when linking to registration', () => {
    renderPage();

    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/auth/register?returnUrl=%2Fdashboard%2Fagents',
    );
  });

  it('does not clear a bootstrap sync error when the page mounts', () => {
    useAuthStore.getState().setAnonymous('Unable to finish signing in. Please try again.');

    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unable to finish signing in. Please try again.',
    );
  });

  it('offers an explicit session retry after bootstrap cleanup fails', async () => {
    const user = userEvent.setup();
    useAuthStore.getState().setSyncFailed('Unable to finish signing in. Please try again.');
    const previousRevision = useAuthStore.getState().retryRevision;

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Retry session' }));

    expect(useAuthStore.getState().retryRevision).toBe(previousRevision + 1);
    expect(useAuthStore.getState().status).toBe('initializing');
  });
});
