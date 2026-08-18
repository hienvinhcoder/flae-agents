import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { signInWithEmail, signInWithGoogle } from '../../../core/auth/firebase';
import { authPathWithReturnUrl, safeReturnUrl } from '../../../core/auth/return-url';
import { useAuthStore } from '../../../core/stores/auth-store';
import { loginSchema, type LoginFormValues } from '../schemas/auth-schema';
import { KnowledgeMemoryPanel } from '../ui/KnowledgeMemoryPanel';

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 18 18">
      <path
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.258c-.806.54-1.835.86-3.047.86-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.963 10.708A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.281-1.708V4.96H.956A9 9 0 0 0 0 9c0 1.45.347 2.824.956 4.04l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.578c1.322 0 2.508.454 3.441 1.346l2.582-2.582C13.464.892 11.43 0 9 0A9 9 0 0 0 .956 4.96l3.007 2.332C4.672 5.163 6.656 3.578 9 3.578Z"
        fill="#EA4335"
      />
    </svg>
  );
}

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
      className="min-h-screen overflow-x-hidden bg-ui-canvas p-3 text-ui-ink sm:p-4 lg:p-5"
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
                className="grid h-10 w-10 shrink-0 place-items-center rounded-ui-control bg-primary-control text-lg font-bold text-primary-control-foreground"
              >
                F
              </span>
              <div>
                <p className="font-semibold tracking-[0.16em] text-ui-ink">FLAE</p>
                <p className="font-code text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-ink-secondary">
                  AI COMPANY MEMORY
                </p>
              </div>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 rounded-ui-status border border-ui-divider bg-ui-panel px-3 py-1.5 text-sm font-medium text-ui-ink-secondary">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-brand-text" strokeWidth={1.8} />
              Secure workspace access
            </div>

            <h1
              className="mt-5 text-[clamp(2.5rem,6vw,4rem)] font-medium leading-[1.04] tracking-tight text-ui-ink"
              id="login-title"
            >
              Welcome back
            </h1>
            <p className="mt-3 max-w-sm text-body-md text-ui-ink-secondary">
              Sign in to access your team's connected knowledge.
            </p>

            <form className="mt-8 space-y-5" onSubmit={(event) => void submitEmail(event)} noValidate>
              <div>
                <label className="mb-2 block font-medium text-ui-ink" htmlFor="login-email">
                  Email
                </label>
                <input
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  aria-invalid={Boolean(errors.email)}
                  autoComplete="email"
                  autoFocus
                  className={`min-h-12 w-full rounded-ui-control border bg-ui-panel px-4 text-ui-ink transition-colors duration-200 placeholder:text-ui-ink-muted hover:bg-ui-canvas focus-visible:border-ui-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus disabled:text-ui-ink-disabled ${errors.email ? 'border-state-danger' : 'border-ui-line'}`}
                  id="login-email"
                  placeholder="you@company.com"
                  type="email"
                  {...register('email')}
                />
                {errors.email ? (
                  <p
                    className="mt-2 flex items-start gap-2 text-sm text-state-danger"
                    id="login-email-error"
                  >
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errors.email.message}</span>
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block font-medium text-ui-ink" htmlFor="login-password">
                  Password
                </label>
                <input
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  aria-invalid={Boolean(errors.password)}
                  autoComplete="current-password"
                  className={`min-h-12 w-full rounded-ui-control border bg-ui-panel px-4 text-ui-ink transition-colors duration-200 placeholder:text-ui-ink-muted hover:bg-ui-canvas focus-visible:border-ui-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus disabled:text-ui-ink-disabled ${errors.password ? 'border-state-danger' : 'border-ui-line'}`}
                  id="login-password"
                  placeholder="Enter your password"
                  type="password"
                  {...register('password')}
                />
                {errors.password ? (
                  <p
                    className="mt-2 flex items-start gap-2 text-sm text-state-danger"
                    id="login-password-error"
                  >
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errors.password.message}</span>
                  </p>
                ) : null}
              </div>

              {error ? (
                <div
                  className="flex items-start gap-3 rounded-ui-control border border-state-danger bg-state-danger-soft p-3 text-sm text-state-danger"
                  role="alert"
                >
                  <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p>{error}</p>
                    {status === 'sync_failed' ? (
                      <button
                        className="mt-3 rounded-sm font-semibold underline underline-offset-2 transition-opacity duration-200 hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
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
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-ui-control border border-transparent bg-primary-control px-4 font-semibold text-primary-control-foreground transition-colors duration-200 hover:bg-primary-control-hover active:bg-primary-control-active disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
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

            <div className="my-6 flex items-center gap-3 text-sm text-ui-ink-muted" aria-hidden="true">
              <span className="h-px flex-1 bg-ui-divider" />
              <span>or</span>
              <span className="h-px flex-1 bg-ui-divider" />
            </div>

            <button
              className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-ui-control border border-ui-line bg-ui-panel px-4 font-medium text-ui-ink transition-colors duration-200 hover:bg-ui-canvas active:bg-ui-interactive disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
              disabled={isLoading}
              onClick={() => void submitGoogle()}
              type="button"
            >
              <GoogleMark />
              Continue with Google
            </button>

            <p className="mt-6 text-center text-ui-ink-secondary">
              New to FLAE?{' '}
              <Link
                className="rounded-sm font-semibold text-ui-link underline-offset-4 transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
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
