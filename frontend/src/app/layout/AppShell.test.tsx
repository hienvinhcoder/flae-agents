import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../core/stores/auth-store';
import type { User } from '../../core/auth/user-schema';
import { useWorkspaceStore } from '../../core/stores/workspace-store';
import type { Workspace } from '../../features/settings/types/workspace';
import { createI18n } from '../../shared/i18n';
import { AppShell } from './AppShell';

const resources = {
  vi: { translation: {
    NAV: { BRIEFING: 'Báo cáo sáng', CHAT: 'AI Chat', INBOX: 'Hộp thư', AGENTS: 'Trợ lý', KNOWLEDGE: 'Tri thức', KNOWLEDGE_GRAPH: 'Đồ thị tri thức', TOPICS: 'Chủ đề', REPORTS: 'Báo cáo', SETTINGS: 'Cài đặt' },
    COMMON: { LANGUAGE: 'Ngôn ngữ', LOGOUT: 'Đăng xuất' },
    SHELL: { SKIP_CONTENT: 'Bỏ qua đến nội dung', OPEN_NAV: 'Mở điều hướng', CLOSE_NAV: 'Đóng điều hướng', CLOSE_NAV_OVERLAY: 'Đóng lớp điều hướng', COLLAPSE_NAV: 'Thu gọn điều hướng', EXPAND_NAV: 'Mở rộng điều hướng', PRIMARY_NAV: 'Điều hướng chính', NAV_GROUP_FOCUS: 'Tập trung', NAV_GROUP_INTELLIGENCE: 'Trí tuệ', NAV_GROUP_WORKSPACE: 'Không gian làm việc', KNOWLEDGE_GRAPH: 'Đồ thị tri thức', WORKSPACE: 'Không gian làm việc', LOADING_WORKSPACES: 'Đang tải không gian làm việc', INITIALIZING: 'Đang tải và đồng bộ không gian làm việc', NO_WORKSPACE: 'Không có không gian làm việc', LOAD_ERROR: 'Không thể tải không gian làm việc.', BRAND_SUBTITLE: 'Vận hành AI', SYNCING: 'Đang đồng bộ không gian làm việc', SYNC_SUCCESS: 'Đã đồng bộ không gian làm việc', SYNC_ERROR: 'Không thể đồng bộ; lựa chọn cục bộ vẫn được giữ', LOGGING_OUT: 'Đang đăng xuất', LOGOUT_ERROR: 'Không thể đăng xuất. Vui lòng thử lại.' },
    ERROR_PAGE: { TITLE: 'Đã xảy ra lỗi', RETRY: 'Thử lại' },
  } },
  en: { translation: { SHELL: {} } },
};

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkspaceStore.getState().reset();
    useAuthStore.getState().setAuthenticated({
      id: 'user-1', firebase_uid: 'firebase-1', email: 'owner@example.com', full_name: 'Owner', is_active: true,
      login_providers: ['google'], avatar_url: null, current_workspace_id: null,
    });
  });

  it('offers responsive navigation and switches workspace without losing page context', async () => {
    useWorkspaceStore.getState().setCurrentWorkspaceId('ws-1');
    useAuthStore.getState().setAuthenticated({
      id: 'user-1', firebase_uid: 'firebase-1', email: 'owner@example.com', full_name: 'Owner', is_active: true,
      login_providers: ['google'], avatar_url: null, current_workspace_id: 'ws-1',
    });
    const i18n = await createI18n(resources, 'vi');
    const syncSelection = vi.fn().mockResolvedValue({ ...useAuthStore.getState().user, current_workspace_id: 'ws-2' });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}><I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/dashboard/briefing']}>{children}</MemoryRouter></I18nextProvider></QueryClientProvider>;
    render(
      <Routes>
        <Route element={<AppShell fetchWorkspaces={() => Promise.resolve([
          { id: 'ws-1', name: 'Platform', owner_uid: 'owner', created_at: null },
          { id: 'ws-2', name: 'Research', owner_uid: 'owner', created_at: null },
        ])} syncSelection={syncSelection} />} path="/dashboard">
          <Route element={<h1>Current page</h1>} path="briefing" />
        </Route>
      </Routes>,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('link', { name: 'Bỏ qua đến nội dung' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở điều hướng' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
    const sidebar = screen.getByTestId('admin-sidebar');
    expect(sidebar).toHaveAttribute('data-desktop-layout', 'expanded');
    expect(within(sidebar).getByRole('link', { name: 'Báo cáo sáng' })).toHaveAttribute('aria-current', 'page');
    const header = screen.getByRole('banner');
    expect(within(header).getByText('Tập trung')).toBeInTheDocument();
    expect(within(header).getByText('Báo cáo sáng')).toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: 'Không gian làm việc' })).toHaveValue('ws-1');

    await userEvent.click(within(sidebar).getByRole('button', { name: 'Thu gọn điều hướng' }));

    expect(sidebar).toHaveAttribute('data-desktop-layout', 'collapsed');
    expect(localStorage.getItem('flae_admin_sidebar_layout')).toBe('collapsed');
    expect(within(sidebar).getByRole('link', { name: 'Báo cáo sáng' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: 'Current page' })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Không gian làm việc' }), 'ws-2');

    await waitFor(() => expect(syncSelection).toHaveBeenCalledWith('ws-2'));
    expect(screen.getByRole('heading', { name: 'Current page' })).toBeInTheDocument();
  });

  it('restores a collapsed desktop navigation preference', async () => {
    localStorage.setItem('flae_admin_sidebar_layout', 'collapsed');
    useWorkspaceStore.getState().setCurrentWorkspaceId('ws-1');
    const i18n = await createI18n(resources, 'vi');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}><I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/dashboard/briefing']}>{children}</MemoryRouter></I18nextProvider></QueryClientProvider>;
    render(<Routes><Route element={<AppShell fetchWorkspaces={() => Promise.resolve([
      { id: 'ws-1', name: 'Platform', owner_uid: 'owner', created_at: null },
    ])} syncSelection={() => Promise.resolve({ ...useAuthStore.getState().user!, current_workspace_id: 'ws-1' })} />} path="/dashboard"><Route element={<h1>Current page</h1>} path="briefing" /></Route></Routes>, { wrapper });

    const sidebar = screen.getByTestId('admin-sidebar');
    expect(sidebar).toHaveAttribute('data-desktop-layout', 'collapsed');
    expect(within(sidebar).getByRole('button', { name: 'Mở rộng điều hướng' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Current page' })).toBeInTheDocument();
  });

  it('announces manual workspace synchronization and retains the selection after failure', async () => {
    useWorkspaceStore.getState().setCurrentWorkspaceId('ws-1');
    useAuthStore.getState().setAuthenticated({
      id: 'user-1', firebase_uid: 'firebase-1', email: 'owner@example.com', full_name: 'Owner', is_active: true,
      login_providers: ['google'], avatar_url: null, current_workspace_id: 'ws-1',
    });
    const i18n = await createI18n(resources, 'vi');
    let rejectSync!: (reason: Error) => void;
    const syncSelection = vi.fn(() => new Promise<User>((_, reject) => { rejectSync = reject; }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}><I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/dashboard/briefing']}>{children}</MemoryRouter></I18nextProvider></QueryClientProvider>;
    render(<Routes><Route element={<AppShell fetchWorkspaces={() => Promise.resolve([
      { id: 'ws-1', name: 'Platform', owner_uid: 'owner', created_at: null },
      { id: 'ws-2', name: 'Research', owner_uid: 'owner', created_at: null },
    ])} syncSelection={syncSelection} />} path="/dashboard"><Route element={<h1>Current page</h1>} path="briefing" /></Route></Routes>, { wrapper });

    const selector = await screen.findByRole('combobox', { name: 'Không gian làm việc' });
    await userEvent.selectOptions(selector, 'ws-2');
    expect(selector).toHaveValue('ws-2');
    expect(screen.getByRole('status')).toHaveTextContent('Đang đồng bộ không gian làm việc');

    rejectSync(new Error('offline'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Không thể đồng bộ'));
    expect(selector).toHaveValue('ws-2');
  });

  it('keeps one live synchronization banner visible from initial workspace loading through profile sync', async () => {
    const i18n = await createI18n(resources, 'vi');
    let resolveWorkspaces!: (value: Workspace[]) => void;
    let resolveSync!: (value: User) => void;
    const fetchWorkspaces = vi.fn(() => new Promise<Workspace[]>((resolve) => { resolveWorkspaces = resolve; }));
    const syncSelection = vi.fn(() => new Promise<User>((resolve) => { resolveSync = resolve; }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}><I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/dashboard/briefing']}>{children}</MemoryRouter></I18nextProvider></QueryClientProvider>;
    render(<Routes><Route element={<AppShell fetchWorkspaces={fetchWorkspaces} syncSelection={syncSelection} />} path="/dashboard"><Route element={<h1>Current page</h1>} path="briefing" /></Route></Routes>, { wrapper });

    const initialBanner = screen.getByText('Đang tải và đồng bộ không gian làm việc');
    expect(initialBanner.closest('[role="status"]')).toHaveAttribute('aria-live', 'polite');

    await act(() => {
      resolveWorkspaces([{ id: 'ws-1', name: 'Platform', owner_uid: 'owner', created_at: null }]);
      return Promise.resolve();
    });
    await waitFor(() => expect(screen.getByText('Đang đồng bộ không gian làm việc')).toBeInTheDocument());

    await act(() => {
      resolveSync({
        id: 'user-1', firebase_uid: 'firebase-1', email: 'owner@example.com', full_name: 'Owner',
        is_active: true, login_providers: ['google'], avatar_url: null, current_workspace_id: 'ws-1',
      });
      return Promise.resolve();
    });
    await waitFor(() => expect(screen.getByText('Đã đồng bộ không gian làm việc')).toBeInTheDocument());
  });
});
