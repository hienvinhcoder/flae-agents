import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { registerWithEmail, signInWithGoogle } from '../../../core/auth/firebase';
import { authPathWithReturnUrl, safeReturnUrl } from '../../../core/auth/return-url';
import { useAuthStore } from '../../../core/stores/auth-store';
import { registerSchema, type RegisterFormValues } from '../schemas/auth-schema';

function registrationErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';

  if (code === 'auth/email-already-in-use') return 'This email is already in use.';
  if (code === 'auth/weak-password') return 'Choose a stronger password.';
  if (code === 'auth/popup-closed-by-user') return 'Google sign-in was cancelled.';
  return 'Unable to create your account. Please try again.';
}

export function RegisterPage() {
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
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  useEffect(() => {
    if (status === 'authenticated') {
      void navigate(safeReturnUrl(searchParams.get('returnUrl')), { replace: true });
    }
  }, [navigate, searchParams, status]);

  const submitEmail = handleSubmit(async ({ email, password, fullName }) => {
    clearError();
    setLoading(true);
    try {
      await registerWithEmail(email, password, fullName);
    } catch (cause) {
      setError(registrationErrorMessage(cause));
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
      setError(registrationErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ui-canvas px-4 py-12" aria-labelledby="register-title">
      <section className="surface-panel w-full max-w-md p-6 sm:p-8">
        <p className="text-metadata mb-3">FLAE workspace</p>
        <h1 id="register-title" className="text-2xl font-semibold text-ui-ink">Create your account</h1>
        <p className="mt-2 text-ui-ink-secondary">Set up your profile and start building with FLAE.</p>

        <form className="mt-8 space-y-5" onSubmit={(event) => void submitEmail(event)} noValidate>
          <div>
            <label className="mb-2 block font-medium text-ui-ink" htmlFor="register-name">Full name</label>
            <input
              aria-describedby={errors.fullName ? 'register-name-error' : undefined}
              aria-invalid={Boolean(errors.fullName)}
              autoComplete="name"
              className="w-full rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2.5 text-ui-ink"
              id="register-name"
              {...register('fullName')}
            />
            {errors.fullName ? <p className="mt-2 text-state-danger" id="register-name-error">{errors.fullName.message}</p> : null}
          </div>

          <div>
            <label className="mb-2 block font-medium text-ui-ink" htmlFor="register-email">Email</label>
            <input
              aria-describedby={errors.email ? 'register-email-error' : undefined}
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              className="w-full rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2.5 text-ui-ink"
              id="register-email"
              type="email"
              {...register('email')}
            />
            {errors.email ? <p className="mt-2 text-state-danger" id="register-email-error">{errors.email.message}</p> : null}
          </div>

          <div>
            <label className="mb-2 block font-medium text-ui-ink" htmlFor="register-password">Password</label>
            <input
              aria-describedby={errors.password ? 'register-password-error' : undefined}
              aria-invalid={Boolean(errors.password)}
              autoComplete="new-password"
              className="w-full rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2.5 text-ui-ink"
              id="register-password"
              type="password"
              {...register('password')}
            />
            {errors.password ? <p className="mt-2 text-state-danger" id="register-password-error">{errors.password.message}</p> : null}
          </div>

          {error ? <p className="rounded-ui-control bg-state-danger-soft p-3 text-state-danger" role="alert">{error}</p> : null}

          <button className="button-primary w-full" disabled={isLoading} type="submit">
            {isLoading ? 'Creating account…' : 'Create account'}
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
          Already have an account?{' '}
          <Link to={authPathWithReturnUrl('/auth/login', searchParams.get('returnUrl'))}>
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
