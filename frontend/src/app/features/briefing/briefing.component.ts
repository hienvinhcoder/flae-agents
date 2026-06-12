import { Component } from '@angular/core';

@Component({
  selector: 'app-briefing',
  standalone: true,
  template: `
    <div class="p-8 max-w-4xl mx-auto">
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <h2 class="text-2xl font-bold text-slate-800 mb-2">Báo cáo hàng ngày (Briefing)</h2>
        <p class="text-slate-500 mb-6">Tính năng Morning Briefing đang được phát triển.</p>
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Đang xây dựng
        </div>
      </div>
    </div>
  `
})
export class BriefingComponent {}
