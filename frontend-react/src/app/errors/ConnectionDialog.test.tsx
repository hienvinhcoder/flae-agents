import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import { createI18n } from '../../shared/i18n';
import { ConnectionDialog } from './ConnectionDialog';

describe('ConnectionDialog', () => {
  it('renders all connection copy in the selected language', async () => {
    const i18n = await createI18n({ vi: { translation: { CONNECTION_MODAL: { TITLE: 'Mất kết nối máy chủ', MESSAGE: 'Kiểm tra kết nối mạng rồi thử lại.', RETRY_BTN: 'Thử lại kết nối' }, SHELL: { CLOSE_DIALOG: 'Đóng hộp thoại' } } }, en: { translation: {} } }, 'vi');
    render(<I18nextProvider i18n={i18n}><ConnectionDialog onRetry={vi.fn()} open /></I18nextProvider>);

    expect(screen.getByRole('dialog', { name: 'Mất kết nối máy chủ' })).toBeInTheDocument();
    expect(screen.getByText('Kiểm tra kết nối mạng rồi thử lại.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại kết nối' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đóng hộp thoại' })).toBeInTheDocument();
  });
});
