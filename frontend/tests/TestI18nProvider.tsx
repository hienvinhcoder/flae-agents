import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';

import en from '../public/assets/i18n/en.json';
import vi from '../public/assets/i18n/vi.json';
import { createI18n } from '../src/shared/i18n';

const testI18n = await createI18n({ en: { translation: en }, vi: { translation: vi } }, 'en');

export function TestI18nProvider({ children }: PropsWithChildren) {
  return <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>;
}
