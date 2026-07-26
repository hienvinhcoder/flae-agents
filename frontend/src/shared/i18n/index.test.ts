import { describe, expect, it } from 'vitest';

import { createI18n } from './index';

const resources = {
  en: { translation: { COMMON: { SAVE: 'Save' } } },
  vi: { translation: { COMMON: { SAVE: 'Lưu' } } },
};

describe('i18n', () => {
  it('falls back to Vietnamese and never renders an unknown key as empty', async () => {
    const instance = await createI18n(resources, null);

    expect(instance.language).toBe('vi');
    expect(instance.t('COMMON.SAVE')).toBe('Lưu');
    expect(instance.t('UNKNOWN.KEY')).toBe('UNKNOWN.KEY');
  });

  it('uses and persists a supported selected language', async () => {
    const instance = await createI18n(resources, 'en');
    expect(instance.t('COMMON.SAVE')).toBe('Save');

    await instance.changeLanguage('vi');
    expect(localStorage.getItem('flae_language')).toBe('vi');
  });
});
