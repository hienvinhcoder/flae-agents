import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { signInWithEmail, signInWithGoogle } from '../../../core/auth/firebase';
import { useAuthStore } from '../../../core/stores/auth-store';
import { loginSchema, type LoginFormValues } from '../schemas/auth-schema';

function authenticationErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';

  if (['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential'].includes(code)) {
    return 'Email or password is incorrect.';
  }
  if (code === 'auth/popup-closed-by-user') return 'Google sign-in was cancelled.';
  return 'Unable to sign in. Please try again.';
}

function safeReturnUrl(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = useAuthStore((state) => state.status);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  const clearError = useAuthStore((state) => state.clearError);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    clearError();
    return clearError;
  }, [clearError]);

  useEffect(() => {
    if (status === 'authenticated') {
      void navigate(safeReturnUrl(searchParams.get('returnUrl')), { replace: true });
    }
  }, [navigate, searchParams, status]);

  const submitEmail = handleSubmit(async ({ email, password }) => {
    clearError();
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (cause) {
      setError(authenticationErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  });

  const submitGoogle = async () => {
    clearError();
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (cause) {
      setError(authenticationErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ui-canvas px-4 py-12" aria-labelledby="login-title">
      <section className="surface-panel w-full max-w-md p-6 sm:p-8">
        <p className="text-metadata mb-3">FLAE workspace</p>
        <h1 id="login-title" className="text-2xl font-semibold text-ui-ink">Welcome back</h1>
        <p className="mt-2 text-ui-ink-secondary">Sign in to continue to your workspace.</p>

        <form className="mt-8 space-y-5" onSubmit={(event) => void submitEmail(event)} noValidate>
          <div>
            <label className="mb-2 block font-medium text-ui-ink" htmlFor="login-email">Email</label>
            <input
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              className="w-full rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2.5 text-ui-ink"
              id="login-email"
              type="email"
              {...register('email')}
            />
            {errors.email ? <p className="mt-2 text-state-danger" id="login-email-error">{errors.email.message}</p> : null}
          </div>

          <div>
            <label className="mb-2 block font-medium text-ui-ink" htmlFor="login-password">Password</label>
            <input
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              aria-invalid={Boolean(errors.password)}
              autoComplete="current-password"
              className="w-full rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2.5 text-ui-ink"
              id="login-password"
              type="password"
              {...register('password')}
            />
            {errors.password ? <p className="mt-2 text-state-danger" id="login-password-error">{errors.password.message}</p> : null}
          </div>

          {error ? <p className="rounded-ui-control bg-state-danger-soft p-3 text-state-danger" role="alert">{error}</p> : null}

          <button className="button-primary w-full" disabled={isLoading} type="submit">
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-ui-ink-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-ui-divider" />
          <span>or</span>
          <span className="h-px flex-1 bg-ui-divider" />
        </div>

        <button
          className="w-full rounded-ui-control border border-ui-line bg-ui-raised px-4 py-2.5 font-medium text-ui-ink transition-colors hover:bg-ui-interactive"
          disabled={isLoading}
          onClick={() => void submitGoogle()}
          type="button"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-ui-ink-secondary">
          New to FLAE? <Link to="/auth/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
