import { useQuery, useQueryClient, type QueryFunction } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { useEffect } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authBootstrapMock = vi.hoisted(() => vi.fn());
const probeBackendConnectionMock = vi.hoisted(() => vi.fn());
const logoutMock = vi.hoisted(() => vi.fn());

vi.mock('../../core/auth/AuthBootstrap', () => ({
  AuthBootstrap: ({ children }: { children: React.ReactNode }) => {
    authBootstrapMock();
    return <div data-testid="auth-bootstrap">{children}</div>;
  },
}));

vi.mock('../../core/auth/firebase', () => ({ logout: logoutMock }));

vi.mock('../../core/api/connection-probe', () => ({
  probeBackendConnection: probeBackendConnectionMock,
}));

import { AppError } from '../../core/api/errors';
import { createApiClient } from '../../core/api/client';
import { apiFailureLifecycle } from '../../core/api/failure-lifecycle';
import { ProtectedRoute } from '../../core/auth/ProtectedRoute';
import { useAuthStore } from '../../core/stores/auth-store';
import { useWorkspaceStore } from '../../core/stores/workspace-store';
import type { ApiClient } from '../../core/api/client';
import { listWorkspaces } from '../../features/settings/api/workspace-api';
import { createI18n } from '../../shared/i18n';
import { AppProviders } from './AppProviders';

function QueryClientConsumer({ onClient }: { onClient: (client: ReturnType<typeof useQueryClient>) => void }) {
  const client = useQueryClient();

  useEffect(() => {
    onClient(client);
  }, [client, onClient]);

  return <span>Provider child</span>;
}

function WorkspaceAdapterConsumer({ queryFn }: { queryFn: QueryFunction<Awaited<ReturnType<typeof listWorkspaces>>> }) {
  const query = useQuery({ queryFn, queryKey: ['workspaces-while-down'] });
  if (query.isError) return <div role="alert">Local request error</div>;
  if (query.isSuccess) return <div>{query.data[0]?.name}</div>;
  return <div>Workspace query waiting</div>;
}

function dataResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ code: String(status), message: 'Result', data }), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

describe('AppProviders', () => {
  beforeEach(() => {
    apiFailureLifecycle.reset();
    probeBackendConnectionMock.mockReset();
    logoutMock.mockReset().mockResolvedValue(undefined);
    localStorage.clear();
    useWorkspaceStore.getState().reset();
    useAuthStore.getState().setAnonymous();
  });

  it('provides one stable QueryClient when rerendered', () => {
    const clients: ReturnType<typeof useQueryClient>[] = [];
    const onClient = (client: ReturnType<typeof useQueryClient>) => clients.push(client);
    const { rerender } = render(
      <AppProviders>
        <QueryClientConsumer onClient={onClient} />
      </AppProviders>,
    );

    expect(screen.getByText('Provider child')).toBeInTheDocument();
    expect(screen.getByTestId('auth-bootstrap')).toBeInTheDocument();
    expect(authBootstrapMock).toHaveBeenCalledOnce();
    rerender(
      <AppProviders>
        <QueryClientConsumer onClient={onClient} />
      </AppProviders>,
    );

    expect(clients).toHaveLength(1);
    expect(clients[0]).toBeDefined();
  });

  it('retries only retryable network and server query errors with a bound', () => {
    let client: ReturnType<typeof useQueryClient> | undefined;
    render(
      <AppProviders>
        <QueryClientConsumer onClient={(value) => (client = value)} />
      </AppProviders>,
    );

    const retry = client?.getDefaultOptions().queries?.retry;
    expect(typeof retry).toBe('function');
    if (typeof retry !== 'function') {
      throw new Error('Expected query retry function');
    }

    expect(retry(0, new AppError({ kind: 'network', message: 'Offline', retryable: true }))).toBe(true);
    expect(retry(1, new AppError({ kind: 'server', message: 'Server error', retryable: true }))).toBe(true);
    expect(retry(2, new AppError({ kind: 'server', message: 'Server error', retryable: true }))).toBe(false);
    expect(retry(0, new AppError({ kind: 'auth', message: 'Sign in', retryable: false }))).toBe(false);
    expect(client?.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('shows the global blocking connection dialog and closes it after a successful probe', async () => {
    const i18n = await createI18n({
      vi: { translation: { CONNECTION_MODAL: { TITLE: 'Mất kết nối', MESSAGE: 'Kiểm tra máy chủ.', RETRY_BTN: 'Thử lại', CHECKING: 'Đang thử...' } } },
      en: { translation: {} },
    }, 'vi');
    probeBackendConnectionMock.mockResolvedValue(true);
    render(<I18nextProvider i18n={i18n}><AppProviders><span>Application</span></AppProviders></I18nextProvider>);

    act(() => apiFailureLifecycle.reportNetworkFailure());
    expect(screen.getByRole('dialog', { name: 'Mất kết nối' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(probeBackendConnectionMock).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('pauses a production feature adapter until connection recovery', async () => {
    const i18n = await createI18n({
      vi: { translation: { CONNECTION_MODAL: { TITLE: 'Mất kết nối', MESSAGE: 'Kiểm tra máy chủ.', RETRY_BTN: 'Thử lại', CHECKING: 'Đang thử...' } } },
      en: { translation: {} },
    }, 'vi');
    probeBackendConnectionMock.mockResolvedValue(true);
    const request = vi.fn().mockResolvedValue([
      { id: 'workspace-1', name: 'Platform', owner_uid: 'owner', created_at: null },
    ]);
    const client = { request } as unknown as ApiClient;
    const adapter = vi.fn(() => listWorkspaces(client));
    apiFailureLifecycle.reportNetworkFailure();

    render(<I18nextProvider i18n={i18n}><AppProviders><WorkspaceAdapterConsumer queryFn={adapter} /></AppProviders></I18nextProvider>);

    expect(screen.getByRole('dialog', { name: 'Mất kết nối' })).toBeInTheDocument();
    expect(screen.getByText('Workspace query waiting')).toBeInTheDocument();
    expect(screen.queryByText('Local request error')).not.toBeInTheDocument();
    expect(adapter).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(adapter).not.toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Platform')).toBeInTheDocument();
    expect(adapter).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledOnce();
    expect(screen.queryByText('Local request error')).not.toBeInTheDocument();
  });

  it('handles exhausted 401 end-to-end without erasing the session warning', async () => {
    const i18n = await createI18n({
      vi: { translation: { HTTP_ERROR: { UNAUTHORIZED_MESSAGE: 'Phiên đã hết hạn.' } } },
      en: { translation: {} },
    }, 'vi');
    useAuthStore.getState().setAuthenticated({
      id: 'user-1', firebase_uid: 'firebase-1', email: 'owner@example.test', full_name: 'Owner',
      is_active: true, login_providers: ['google'], avatar_url: null, current_workspace_id: 'workspace-1',
    });
    useWorkspaceStore.getState().setCurrentWorkspaceId('workspace-1');
    let queryClient: ReturnType<typeof useQueryClient> | undefined;
    const PrivatePage = () => (
      <>
        <QueryClientConsumer onClient={(client) => {
          queryClient = client;
          client.setQueryData(['private'], { secret: true });
        }} />
        <span>Private route</span>
      </>
    );
    const router = createMemoryRouter([
      { path: '/auth/login', element: <span>Login route</span> },
      { element: <ProtectedRoute />, children: [{ path: '/dashboard/topics', element: <PrivatePage /> }] },
    ], { initialEntries: ['/dashboard/topics?filter=active#details'] });
    render(<I18nextProvider i18n={i18n}><AppProviders><RouterProvider router={router} /></AppProviders></I18nextProvider>);
    expect(await screen.findByText('Private route')).toBeInTheDocument();

    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(dataResponse(null, 401))
      .mockResolvedValueOnce(dataResponse(null, 401));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      fetchImpl,
      tokenProvider: () => Promise.resolve('token'),
    });

    await expect(client.request({ path: '/items', method: 'GET' })).rejects.toMatchObject({ status: 401 });

    expect(await screen.findByText('Login route')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/auth/login');
    expect(new URLSearchParams(router.state.location.search).get('returnUrl')).toBe('/dashboard/topics?filter=active#details');
    expect(screen.getByRole('alert')).toHaveTextContent('Phiên đã hết hạn.');
    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBeNull();
    expect(queryClient?.getQueryData(['private'])).toBeUndefined();
    expect(logoutMock).toHaveBeenCalledOnce();

    act(() => useAuthStore.getState().setAuthenticated({
      id: 'user-1', firebase_uid: 'firebase-1', email: 'owner@example.test', full_name: 'Owner',
      is_active: true, login_providers: ['google'], avatar_url: null, current_workspace_id: null,
    }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());

    const secondFetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(dataResponse(null, 401))
      .mockResolvedValueOnce(dataResponse(null, 401));
    const secondClient = createApiClient({
      baseUrl: 'https://api.example.test',
      fetchImpl: secondFetch,
      tokenProvider: () => Promise.resolve('new-token'),
    });
    await expect(secondClient.request({ path: '/items', method: 'GET' })).rejects.toMatchObject({ status: 401 });

    expect(logoutMock).toHaveBeenCalledTimes(2);
    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(screen.getByRole('alert')).toHaveTextContent('Phiên đã hết hạn.');
  });
});
