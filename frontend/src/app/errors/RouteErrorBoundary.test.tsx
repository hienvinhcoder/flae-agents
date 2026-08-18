import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { createI18n } from '../../shared/i18n';
import { RouteErrorBoundary } from './RouteErrorBoundary';

const resources = {
  vi: { translation: { ERROR_PAGE: { APP_ARIA: 'Ứng dụng FLAE', TITLE: 'Đã xảy ra lỗi', NOT_FOUND: 'Không tìm thấy trang yêu cầu.', GENERAL: 'Không thể hiển thị trang này an toàn.', RETRY: 'Tải lại' } } },
  en: { translation: { ERROR_PAGE: { APP_ARIA: 'FLAE application', TITLE: 'Something went wrong', NOT_FOUND: 'The requested page could not be found.', GENERAL: 'This page could not be displayed safely.', RETRY: 'Reload page' } } },
};

async function renderBoundary(language: 'en' | 'vi', status: number) {
  const i18n = await createI18n(resources, language);
  const router = createMemoryRouter([{
    path: '/',
    loader: () => {
      const error = Object.assign(new Error('Route request failed'), {
        data: null,
        internal: false,
        status,
        statusText: '',
      });
      throw error;
    },
    element: <main />,
    errorElement: <RouteErrorBoundary />,
  }]);
  render(<I18nextProvider i18n={i18n}><RouterProvider router={router} /></I18nextProvider>);
}

describe('RouteErrorBoundary', () => {
  it('renders a translated Vietnamese not-found state', async () => {
    await renderBoundary('vi', 404);
    expect(await screen.findByRole('main', { name: 'Ứng dụng FLAE' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Đã xảy ra lỗi' })).toBeInTheDocument();
    expect(screen.getByText('Không tìm thấy trang yêu cầu.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải lại' })).toBeInTheDocument();
  });

  it('renders a translated English general failure state', async () => {
    await renderBoundary('en', 500);
    expect(await screen.findByRole('main', { name: 'FLAE application' })).toBeInTheDocument();
    expect(screen.getByText('This page could not be displayed safely.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(screen.queryByText(/Route request failed/)).not.toBeInTheDocument();
  });
});
