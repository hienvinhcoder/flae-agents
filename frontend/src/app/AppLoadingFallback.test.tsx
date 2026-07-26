import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import { createI18n } from '../shared/i18n';
import { AppLoadingFallback } from './AppLoadingFallback';

describe('AppLoadingFallback', () => {
  it.each([
    ['vi', 'Ứng dụng FLAE', 'Đang tải ứng dụng'],
    ['en', 'FLAE application', 'Loading application'],
  ] as const)('renders translated %s application loading copy', async (language, appLabel, loadingLabel) => {
    const i18n = await createI18n({
      vi: { translation: { APP: { ARIA: 'Ứng dụng FLAE', LOADING: 'Đang tải ứng dụng' } } },
      en: { translation: { APP: { ARIA: 'FLAE application', LOADING: 'Loading application' } } },
    }, language);
    render(<I18nextProvider i18n={i18n}><AppLoadingFallback /></I18nextProvider>);

    expect(screen.getByRole('main', { name: appLabel })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: loadingLabel })).toBeInTheDocument();
  });
});
