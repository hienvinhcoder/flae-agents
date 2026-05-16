import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { SummaryCardComponent, SummaryCardData } from '../../../shared/ui/summary-card/summary-card.component';
import { BriefingItemComponent, BriefingItemData } from '../../../shared/ui/briefing-item/briefing-item.component';
import { ActionItemComponent, ActionItemData } from '../../../shared/ui/action-item/action-item.component';
// import { WebsocketService } from '../../../core/services/realtime/websocket.service';

@Component({
  selector: 'app-briefing',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule,
    SummaryCardComponent,
    BriefingItemComponent,
    ActionItemComponent
  ],
  template: `
    <div class="space-y-6 pb-12">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 class="text-2xl font-heading font-semibold text-dark-green tracking-tight">Chào buổi sáng, Minh 👋</h2>
          <p class="text-dark-green/70 mt-1">FLAE đã tổng hợp những điều quan trọng nhất cho cửa hàng hôm nay.</p>
          <div class="flex items-center gap-2 mt-3 text-xs text-dark-green/50">
            <lucide-icon name="clock" class="w-3.5 h-3.5"></lucide-icon>
            <span>Cập nhật lần cuối: {{ lastUpdated() }} · Website Chat · Facebook · Zalo</span>
          </div>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <button class="bg-white hover:bg-mint-white border border-soft-green text-dark-green px-4 py-2 rounded-xl font-medium transition-colors shadow-soft cursor-pointer text-sm hidden md:block">
            Kết nối dữ liệu
          </button>
          <button class="bg-white hover:bg-mint-white border border-soft-green text-dark-green px-4 py-2 rounded-xl font-medium transition-colors shadow-soft cursor-pointer text-sm hidden md:block">
            Tạo việc mới
          </button>
          <button class="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-soft flex items-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(0,194,122,0.3)]">
            <span class="w-2 h-2 rounded-full bg-accent animate-pulse" style="box-shadow: 0 0 8px rgba(185,255,59,0.8)"></span>
            Hỏi FLAE
          </button>
        </div>
      </div>

      <!-- Today Summary (4 cards) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        @for (card of summaryCards(); track card.title) {
          <app-summary-card [card]="card"></app-summary-card>
        }
      </div>

      <!-- Main Layout: 2 Columns -->
      <div class="flex flex-col lg:flex-row gap-6">
        
        <!-- Left Column: Morning Briefing Feed (65-70%) -->
        <div class="w-full lg:w-2/3 space-y-4">
          <h3 class="font-heading font-semibold text-lg text-dark-green mb-4">Morning Briefing</h3>

          @for (item of briefingItems(); track item.id) {
            <app-briefing-item 
              [item]="item"
              (onPrimaryAction)="handlePrimaryAction($event)"
              (onSecondaryAction)="handleSecondaryAction($event)">
            </app-briefing-item>
          }
        </div>

        <!-- Right Column: Action Queue (30-35%) -->
        <div class="w-full lg:w-1/3">
          <div class="bg-white/90 backdrop-blur-md rounded-2xl border border-soft-green/50 shadow-soft sticky top-20 flex flex-col max-h-[calc(100vh-6rem)]">
            
            <div class="p-5 border-b border-soft-green/50 shrink-0">
              <h3 class="font-heading font-semibold text-lg text-dark-green">Action Queue</h3>
              <p class="text-sm text-dark-green/60 mt-1">{{ actionItems().length }} việc cần xử lý hôm nay</p>
              
              <!-- Tabs -->
              <div class="flex gap-2 mt-4 overflow-x-auto pb-2" style="scrollbar-width: none;">
                @for (tab of actionTabs(); track tab) {
                  <button class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
                          [ngClass]="tab === activeTab() ? 'bg-primary text-white' : 'bg-mint-white text-dark-green/70 hover:bg-soft-green/50'"
                          (click)="setActiveTab(tab)">
                    {{ tab }}
                  </button>
                }
              </div>
            </div>

            <!-- Action Items List -->
            <div class="flex-1 overflow-y-auto p-3 space-y-2">
              @for (action of actionItems(); track action.id; let last = $last) {
                <app-action-item 
                  [item]="action"
                  (onAction)="handleQueueAction($event)"
                  (onSecondaryAction)="handleQueueSecondaryAction($event)">
                </app-action-item>

                @if (!last) {
                  <div class="h-px bg-soft-green/30 mx-4"></div>
                }
              }
            </div>
            
            <div class="p-3 border-t border-soft-green/50 shrink-0 text-center">
              <button class="text-xs font-medium text-dark-green/60 hover:text-primary transition-colors cursor-pointer">
                Xem tất cả {{ actionItems().length }} việc
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  `
})
export class BriefingComponent implements OnInit {
  // private wsService = inject(WebsocketService);
  
  lastUpdated = signal<string>('08:15');
  
  summaryCards = signal<SummaryCardData[]>([
    { title: 'Doanh thu', value: '12.4M ₫', meta: '+8% so với hôm qua', icon: 'trending-up', type: 'revenue' },
    { title: 'Hội thoại mới', value: '38', meta: '12 chưa phản hồi', icon: 'message-circle', type: 'chat' },
    { title: 'Cần duyệt', value: '6', meta: 'AI đang chờ bạn', icon: 'check-circle-2', type: 'approval' },
    { title: 'Cảnh báo', value: '2', meta: 'Cần xem hôm nay', icon: 'alert-triangle', type: 'alert' }
  ]);

  briefingItems = signal<BriefingItemData[]>([
    {
      id: '1',
      agentName: 'Analyst Agent',
      agentType: 'analyst',
      time: '08:10',
      title: 'Doanh thu hôm qua giảm 18%',
      content: 'Nguyên nhân có thể đến từ tỉ lệ chốt đơn thấp ở nhóm sản phẩm chăm sóc da. Số hội thoại hỏi giá vẫn tăng, nhưng khách chưa ra quyết định mua.',
      metaData: 'Nguồn: 124 đơn hàng · Dữ liệu 7 ngày',
      primaryAction: 'Xem phân tích',
      secondaryAction: 'Xem hội thoại'
    },
    {
      id: '2',
      agentName: 'Chat Agent',
      agentType: 'chat',
      time: '08:05',
      title: 'Có 12 hội thoại cần phản hồi gấp',
      content: 'Trong đó có 4 khách đã chờ hơn 30 phút. 2 hội thoại có dấu hiệu khách đang phàn nàn về dịch vụ.',
      primaryAction: 'Xử lý ngay',
      secondaryAction: 'Xem inbox'
    },
    {
      id: '3',
      agentName: 'Voice Agent',
      agentType: 'voice',
      time: '07:55',
      title: 'Có 3 cuộc gọi cần follow-up hôm nay',
      content: 'Một khách đã hỏi về lịch hẹn chăm sóc da nhưng chưa được xác nhận lại. Một khách phàn nàn về giao hàng chậm.',
      primaryAction: 'Xem tóm tắt',
      secondaryAction: 'Tạo follow-up'
    },
    {
      id: '4',
      agentName: 'System',
      agentType: 'system',
      time: '07:50',
      title: 'Zalo OA chưa đồng bộ trong 2 giờ qua',
      content: 'Một số tin nhắn từ Zalo có thể chưa được cập nhật vào inbox. Bạn nên kiểm tra lại kết nối để tránh bỏ sót khách hàng.',
      primaryAction: 'Kiểm tra tích hợp'
    }
  ]);

  actionTabs = signal(['Ưu tiên', 'Cần duyệt', 'Phản hồi', 'Lỗi']);
  activeTab = signal('Ưu tiên');

  actionItems = signal<ActionItemData[]>([
    {
      id: '1',
      priority: 'high',
      type: 'Cần phản hồi',
      title: 'Khách Linh chờ 42p',
      description: 'Khách hỏi về bảng giá liệu trình spa. AI đã có draft trả lời.',
      actionText: 'Trả lời ngay'
    },
    {
      id: '2',
      priority: 'high',
      type: 'Cần duyệt',
      title: 'AI draft về đổi trả',
      description: 'Chính sách có điều kiện cần xác nhận.',
      actionText: 'Duyệt'
    },
    {
      id: '3',
      priority: 'medium',
      type: 'Lỗi',
      title: 'Zalo đồng bộ chậm',
      description: 'API không phản hồi trong 2 giờ qua.',
      actionText: 'Kiểm tra'
    }
  ]);

  ngOnInit() {
    // TODO: Fetch initial data from API
    // this.wsService.connect();
  }

  setActiveTab(tab: string) {
    this.activeTab.set(tab);
    // TODO: Lọc actionItems theo tab
  }

  handlePrimaryAction(item: BriefingItemData) {
    console.log('Primary action:', item);
  }

  handleSecondaryAction(item: BriefingItemData) {
    console.log('Secondary action:', item);
  }

  handleQueueAction(item: ActionItemData) {
    console.log('Queue action:', item);
  }

  handleQueueSecondaryAction(item: ActionItemData) {
    console.log('Queue secondary action:', item);
  }
}

