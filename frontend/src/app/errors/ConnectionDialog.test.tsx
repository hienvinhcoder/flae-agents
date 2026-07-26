import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import { createI18n } from '../../shared/i18n';
import { ConnectionDialog } from './ConnectionDialog';

describe('ConnectionDialog', () => {
  it('renders all connection copy in the selected language', async () => {
    const i18n = await createI18n({ vi: { translation: { CONNECTION_MODAL: { TITLE: 'Mất kết nối máy chủ', MESSAGE: 'Kiểm tra kết nối mạng rồi thử lại.', RETRY_BTN: 'Thử lại kết nối', CHECKING: 'Đang kiểm tra kết nối...' } } }, en: { translation: {} } }, 'vi');
    render(<I18nextProvider i18n={i18n}><ConnectionDialog onRetry={vi.fn()} open /></I18nextProvider>);

    expect(screen.getByRole('dialog', { name: 'Mất kết nối máy chủ' })).toBeInTheDocument();
    expect(screen.getByText('Kiểm tra kết nối mạng rồi thử lại.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại kết nối' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /đóng/i })).not.toBeInTheDocument();
  });

  it('keeps the blocking dialog open and disables retry while checking', async () => {
    const i18n = await createI18n({ vi: { translation: { CONNECTION_MODAL: { TITLE: 'Mất kết nối', MESSAGE: 'Thử lại.', RETRY_BTN: 'Kết nối lại', CHECKING: 'Đang kiểm tra...' } } }, en: { translation: {} } }, 'vi');
    const onRetry = vi.fn();
    render(<I18nextProvider i18n={i18n}><ConnectionDialog checking onRetry={onRetry} open /></I18nextProvider>);

    const retry = screen.getByRole('button', { name: 'Đang kiểm tra...' });
    expect(retry).toBeDisabled();
    expect(screen.getByRole('dialog')).toHaveFocus();
    await userEvent.click(retry);
    expect(onRetry).not.toHaveBeenCalled();
  });
});
