import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { registerWithEmail, signInWithGoogle } from '../../../core/auth/firebase';
import { authPathWithReturnUrl, safeReturnUrl } from '../../../core/auth/return-url';
import { useAuthStore } from '../../../core/stores/auth-store';
import { registerSchema, type RegisterFormValues } from '../schemas/auth-schema';
import { GoogleMark } from '../ui/GoogleMark';

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
    <main
      aria-labelledby="register-title"
      className="glass-field flex min-h-screen items-center justify-center px-4 py-12"
    >
      <section className="glass-panel glass-panel-strong auth-enter w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-ui-control bg-primary text-lg font-bold text-primary-foreground shadow-[0_0_24px_rgb(249_115_22_/_0.35)]"
          >
            F
          </span>
          <div>
            <p className="font-semibold tracking-[0.16em] text-glass-ink">FLAE</p>
            <p className="font-code text-[10px] font-semibold uppercase tracking-[0.14em] text-glass-ink-secondary">
              AI COMPANY MEMORY
            </p>
          </div>
        </div>

        <h1
          className="mt-6 text-2xl font-semibold tracking-tight text-glass-ink"
          id="register-title"
        >
          Create your account
        </h1>
        <p className="mt-2 text-glass-ink-secondary">
          Set up your profile and start building with FLAE.
        </p>

        <form className="mt-8 space-y-5" onSubmit={(event) => void submitEmail(event)} noValidate>
          <div>
            <label className="mb-2 block font-medium text-glass-ink" htmlFor="register-name">
              Full name
            </label>
            <input
              aria-describedby={errors.fullName ? 'register-name-error' : undefined}
              aria-invalid={Boolean(errors.fullName)}
              autoComplete="name"
              className="glass-input min-h-11 w-full rounded-ui-control px-4"
              id="register-name"
              placeholder="Ada Lovelace"
              {...register('fullName')}
            />
            {errors.fullName ? (
              <p
                className="mt-2 flex items-start gap-2 text-sm text-glass-danger"
                id="register-name-error"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errors.fullName.message}</span>
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block font-medium text-glass-ink" htmlFor="register-email">
              Email
            </label>
            <input
              aria-describedby={errors.email ? 'register-email-error' : undefined}
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              className="glass-input min-h-11 w-full rounded-ui-control px-4"
              id="register-email"
              placeholder="you@company.com"
              type="email"
              {...register('email')}
            />
            {errors.email ? (
              <p
                className="mt-2 flex items-start gap-2 text-sm text-glass-danger"
                id="register-email-error"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errors.email.message}</span>
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block font-medium text-glass-ink" htmlFor="register-password">
              Password
            </label>
            <input
              aria-describedby={errors.password ? 'register-password-error' : undefined}
              aria-invalid={Boolean(errors.password)}
              autoComplete="new-password"
              className="glass-input min-h-11 w-full rounded-ui-control px-4"
              id="register-password"
              placeholder="At least 6 characters"
              type="password"
              {...register('password')}
            />
            {errors.password ? (
              <p
                className="mt-2 flex items-start gap-2 text-sm text-glass-danger"
                id="register-password-error"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errors.password.message}</span>
              </p>
            ) : null}
          </div>

          {error ? (
            <div className="glass-error flex items-start gap-3 rounded-ui-control p-3 text-sm" role="alert">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <button
            aria-busy={isLoading || undefined}
            className="glass-cta inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-ui-control px-4 font-semibold"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? (
              <>
                <LoaderCircle
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin motion-reduce:animate-none"
                />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-sm text-glass-ink-muted" aria-hidden="true">
          <span className="glass-divider flex-1" />
          <span>or</span>
          <span className="glass-divider flex-1" />
        </div>

        <button
          className="glass-button inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-ui-control px-4 font-medium"
          disabled={isLoading}
          onClick={() => void submitGoogle()}
          type="button"
        >
          <GoogleMark />
          Continue with Google
        </button>

        <p className="mt-6 text-center text-glass-ink-secondary">
          Already have an account?{' '}
          <Link
            className="glass-link font-semibold"
            to={authPathWithReturnUrl('/auth/login', searchParams.get('returnUrl'))}
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
