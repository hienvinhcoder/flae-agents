import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { signInWithEmail, signInWithGoogle } from '../../../core/auth/firebase';
import { authPathWithReturnUrl, safeReturnUrl } from '../../../core/auth/return-url';
import { useAuthStore } from '../../../core/stores/auth-store';
import { loginSchema, type LoginFormValues } from '../schemas/auth-schema';
import { GoogleMark } from '../ui/GoogleMark';
import { KnowledgeMemoryPanel } from '../ui/KnowledgeMemoryPanel';

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

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = useAuthStore((state) => state.status);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  const clearError = useAuthStore((state) => state.clearError);
  const retryBootstrap = useAuthStore((state) => state.retryBootstrap);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    return () => clearError();
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
    <main
      aria-labelledby="login-title"
      className="glass-field min-h-screen overflow-x-hidden p-3 sm:p-4 lg:p-5"
    >
      <div
        className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1440px] grid-cols-1 gap-4 sm:min-h-[calc(100vh-2rem)] md:grid-cols-2 lg:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[5fr_7fr] lg:gap-5"
        data-testid="login-shell"
      >
        <section className="auth-enter flex items-center px-3 py-8 sm:px-6 md:px-5 lg:px-10 xl:px-14">
          <div className="mx-auto w-full max-w-md">
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

            <div className="glass-chip mt-8 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-glass-ink-secondary">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-orb-amber" strokeWidth={1.8} />
              Secure workspace access
            </div>

            <h1
              className="mt-5 text-[clamp(2.5rem,6vw,4rem)] font-medium leading-[1.04] tracking-tight text-glass-ink"
              id="login-title"
            >
              Welcome back
            </h1>
            <p className="mt-3 max-w-sm text-body-md text-glass-ink-secondary">
              Sign in to access your team's connected knowledge.
            </p>

            <form className="mt-8 space-y-5" onSubmit={(event) => void submitEmail(event)} noValidate>
              <div>
                <label className="mb-2 block font-medium text-glass-ink" htmlFor="login-email">
                  Email
                </label>
                <input
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  aria-invalid={Boolean(errors.email)}
                  autoComplete="email"
                  autoFocus
                  className="glass-input min-h-12 w-full rounded-ui-control px-4"
                  id="login-email"
                  placeholder="you@company.com"
                  type="email"
                  {...register('email')}
                />
                {errors.email ? (
                  <p
                    className="mt-2 flex items-start gap-2 text-sm text-glass-danger"
                    id="login-email-error"
                  >
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errors.email.message}</span>
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block font-medium text-glass-ink" htmlFor="login-password">
                  Password
                </label>
                <input
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  aria-invalid={Boolean(errors.password)}
                  autoComplete="current-password"
                  className="glass-input min-h-12 w-full rounded-ui-control px-4"
                  id="login-password"
                  placeholder="Enter your password"
                  type="password"
                  {...register('password')}
                />
                {errors.password ? (
                  <p
                    className="mt-2 flex items-start gap-2 text-sm text-glass-danger"
                    id="login-password-error"
                  >
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errors.password.message}</span>
                  </p>
                ) : null}
              </div>

              {error ? (
                <div
                  className="glass-error flex items-start gap-3 rounded-ui-control p-3 text-sm"
                  role="alert"
                >
                  <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p>{error}</p>
                    {status === 'sync_failed' ? (
                      <button
                        className="glass-link mt-3 font-semibold underline underline-offset-2"
                        onClick={retryBootstrap}
                        type="button"
                      >
                        Retry session
                      </button>
                    ) : null}
                  </div>
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
                    Signing in...
                  </>
                ) : (
                  'Sign in'
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
              New to FLAE?{' '}
              <Link
                className="glass-link font-semibold"
                to={authPathWithReturnUrl('/auth/register', searchParams.get('returnUrl'))}
              >
                Create an account
              </Link>
            </p>
          </div>
        </section>

        <div className="auth-enter auth-enter-delay min-h-[22rem]">
          <KnowledgeMemoryPanel />
        </div>
      </div>
    </main>
  );
}
