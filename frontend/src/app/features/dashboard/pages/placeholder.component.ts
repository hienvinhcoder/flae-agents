import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  template: `
    <div class="p-8 max-w-4xl mx-auto">
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <h2 class="text-2xl font-bold text-slate-800 mb-2">Trang {{ title }}</h2>
        <p class="text-slate-500 mb-6">Tính năng Company Memory AI đang được phát triển.</p>
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Đang xây dựng định hướng mới
        </div>
      </div>
    </div>
  `
})
export class PlaceholderComponent {
  private route = inject(ActivatedRoute);
  title = '';

  constructor() {
    const path = this.route.snapshot.routeConfig?.path || '';
    this.title = this.getFriendlyTitle(path);
  }

  private getFriendlyTitle(path: string): string {
    switch (path) {
      case 'briefing': return 'Báo cáo hàng ngày (Briefing)';
      case 'ask': return 'Hỏi đáp Company Memory (Ask AI)';
      case 'sources': return 'Kết nối nguồn dữ liệu (Sources)';
      case 'stale-docs': return 'Tài liệu lỗi thời (Stale Docs)';
      case 'agents': return 'Trình quản lý AI Agents';
      case 'settings': return 'Cài đặt hệ thống';
      default: return 'Tổng quan';
    }
  }
}
