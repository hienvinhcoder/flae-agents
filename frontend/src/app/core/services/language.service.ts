import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type SupportedLang = 'en' | 'vi';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly storageKey = 'flae_selected_language';

  // Định nghĩa các ngôn ngữ được hỗ trợ
  readonly supportedLanguages: SupportedLang[] = ['en', 'vi'];

  // Signal lưu trữ ngôn ngữ hiện tại để tối ưu reactivity
  readonly currentLang: WritableSignal<SupportedLang> = signal<SupportedLang>('en');

  constructor() {
    this.initLanguage();
  }

  /**
   * Khởi tạo cấu hình ngôn ngữ khi ứng dụng khởi chạy
   */
  private initLanguage(): void {
    // Thiết lập danh sách các ngôn ngữ được hỗ trợ
    this.translate.addLangs([...this.supportedLanguages]);
    this.translate.setDefaultLang('en');

    // Xác định ngôn ngữ ban đầu
    const savedLang = localStorage.getItem(this.storageKey) as SupportedLang | null;
    let initialLang: SupportedLang = 'en';

    if (savedLang && this.supportedLanguages.includes(savedLang)) {
      initialLang = savedLang;
    } else {
      // Nhận diện ngôn ngữ trình duyệt
      const browserLang = this.translate.getBrowserLang() || '';
      initialLang = browserLang.includes('vi') ? 'vi' : 'en';
    }

    this.setLanguage(initialLang);
  }

  /**
   * Chuyển đổi sang ngôn ngữ mới
   * @param lang Ngôn ngữ đích cần chuyển ('en' | 'vi')
   */
  setLanguage(lang: SupportedLang): void {
    this.translate.use(lang);
    localStorage.setItem(this.storageKey, lang);
    this.currentLang.set(lang);
  }

  /**
   * Chuyển đổi qua lại giữa các ngôn ngữ hiện có
   */
  toggleLanguage(): void {
    const nextLang: SupportedLang = this.currentLang() === 'en' ? 'vi' : 'en';
    this.setLanguage(nextLang);
  }
}
