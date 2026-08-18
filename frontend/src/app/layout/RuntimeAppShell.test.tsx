import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createI18n } from '../../shared/i18n';

const mocks = vi.hoisted(() => ({
  fetchWorkspaces: vi.fn().mockResolvedValue([]),
  logout: vi.fn(),
  state: { error: 'Unable to sign out. Please try again.', isLoading: false },
  useLogout: vi.fn(),
}));

vi.mock('../../core/auth/useLogout', () => ({
  useLogout: () => {
    mocks.useLogout();
    return { ...mocks.state, logout: mocks.logout };
  },
}));

vi.mock('../../features/settings/api/workspace-runtime-api', () => ({
  fetchWorkspaces: mocks.fetchWorkspaces,
  syncWorkspaceSelection: vi.fn(),
}));

import { RuntimeAppShell } from './RuntimeAppShell';

describe('RuntimeAppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.error = 'Unable to sign out. Please try again.';
    mocks.state.isLoading = false;
  });

  it('uses the Task 5 logout hook and translates its safe error state', async () => {
    const i18n = await createI18n({
      vi: { translation: {
        COMMON: { LANGUAGE: 'Ngôn ngữ', LOGOUT: 'Đăng xuất' },
        NAV: {},
        SHELL: { SKIP_CONTENT: 'Bỏ qua', OPEN_NAV: 'Mở điều hướng', CLOSE_NAV: 'Đóng điều hướng', CLOSE_NAV_OVERLAY: 'Đóng lớp', PRIMARY_NAV: 'Điều hướng', WORKSPACE: 'Không gian làm việc', LOADING_WORKSPACES: 'Đang tải', NO_WORKSPACE: 'Không có', LOAD_ERROR: 'Lỗi tải', BRAND_SUBTITLE: 'Vận hành AI', LOGGING_OUT: 'Đang đăng xuất', LOGOUT_ERROR: 'Không thể đăng xuất. Vui lòng thử lại.' },
      } },
      en: { translation: {} },
    }, 'vi');
    render(<QueryClientProvider client={new QueryClient()}><I18nextProvider i18n={i18n}><MemoryRouter><RuntimeAppShell /></MemoryRouter></I18nextProvider></QueryClientProvider>);

    expect(mocks.useLogout).toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể đăng xuất. Vui lòng thử lại.');
    await userEvent.click(screen.getByRole('button', { name: 'U' }));
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument();
  });

  it('disables logout and exposes the translated loading label while Task 5 logout is pending', async () => {
    mocks.state.error = '';
    mocks.state.isLoading = true;
    const i18n = await createI18n({ vi: { translation: {
      COMMON: { LANGUAGE: 'Ngôn ngữ', LOGOUT: 'Đăng xuất' }, NAV: {},
      SHELL: { SKIP_CONTENT: 'Bỏ qua', OPEN_NAV: 'Mở', CLOSE_NAV: 'Đóng', PRIMARY_NAV: 'Điều hướng', WORKSPACE: 'Không gian làm việc', LOADING_WORKSPACES: 'Đang tải', NO_WORKSPACE: 'Không có', BRAND_SUBTITLE: 'Vận hành AI', LOGGING_OUT: 'Đang đăng xuất' },
    } }, en: { translation: {} } }, 'vi');
    render(<QueryClientProvider client={new QueryClient()}><I18nextProvider i18n={i18n}><MemoryRouter><RuntimeAppShell /></MemoryRouter></I18nextProvider></QueryClientProvider>);

    await userEvent.click(screen.getByRole('button', { name: 'U' }));
    const button = screen.getByRole('button', { name: 'Đăng xuất' });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Đang đăng xuất');
  });
});
