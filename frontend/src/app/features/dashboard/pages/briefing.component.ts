import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { SummaryCardComponent, SummaryCardData } from '../../../shared/ui/summary-card/summary-card.component';
import { BriefingItemComponent, BriefingItemData } from '../../../shared/ui/briefing-item/briefing-item.component';
import { ActionItemComponent, ActionItemData } from '../../../shared/ui/action-item/action-item.component';

interface AgentStatus {
  name: string;
  type: string;
  status: 'active' | 'idle' | 'warning';
  message: string;
}

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
    <div class="space-y-8 pb-16">
      
      <!-- Welcome Header Section with Glassmorphism -->
      <div class="glass-morphism rounded-3xl p-6 md:p-8 border border-soft-green/60 shadow-glass relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div class="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-2xl -ml-20 -mb-20"></div>

        <div class="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <h2 class="text-2xl md:text-3xl font-heading font-extrabold text-dark-green tracking-tight">Chào buổi sáng, Minh 👋</h2>
              <span class="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                LIVE
              </span>
            </div>
            <p class="text-dark-green/70 text-sm md:text-base max-w-2xl leading-relaxed">
              Cửa hàng của bạn đang vận hành ổn định. Các trợ lý AI đã tự động xử lý <span class="font-bold text-primary">24 hội thoại</span> và chuẩn bị xong các phân tích quan trọng bên dưới.
            </p>
            
            <div class="flex flex-wrap items-center gap-4 pt-2 text-xs text-dark-green/60 font-medium">
              <div class="flex items-center gap-1.5">
                <lucide-icon name="clock" class="w-3.5 h-3.5 text-primary"></lucide-icon>
                <span>Cập nhật lúc: 08:30 hôm nay</span>
              </div>
              <span class="hidden md:inline text-soft-green">•</span>
              <div class="flex items-center gap-2">
                <span class="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-soft-green/50">
                  <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Website Chat
                </span>
                <span class="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-soft-green/50">
                  <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Facebook
                </span>
                <span class="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-soft-green/50">
                  <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Zalo OA
                </span>
              </div>
            </div>
          </div>

          <!-- Quick Actions Panel -->
          <div class="flex items-center gap-3 shrink-0 self-start lg:self-center">
            <button class="bg-white hover:bg-mint-white border border-soft-green/80 text-dark-green px-4.5 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-soft cursor-pointer text-xs flex items-center gap-1.5 hover:-translate-y-0.5 active:scale-95">
              <lucide-icon name="plus-circle" class="w-4 h-4 text-primary"></lucide-icon>
              Tạo việc mới
            </button>
            <button class="bg-primary hover:bg-primary/95 text-white px-5 py-3 rounded-xl font-bold transition-all duration-300 shadow-soft flex items-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(0,108,73,0.25)] hover:shadow-[0_6px_24px_rgba(0,108,73,0.35)] hover:-translate-y-0.5 active:scale-95">
              <span class="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" style="box-shadow: 0 0 8px rgba(16,185,129,0.8)"></span>
              Hỏi FLAE Assistant
            </button>
          </div>
        </div>

        <!-- AI Agents Live Monitor -->
        <div class="mt-6 pt-5 border-t border-soft-green/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <span class="text-xs font-bold uppercase tracking-wider text-dark-green/50 flex items-center gap-1">
            <lucide-icon name="cpu" class="w-4 h-4 text-primary"></lucide-icon>
            GIÁM SÁT TRỢ LÝ AI:
          </span>
          <div class="flex flex-wrap items-center gap-3.5">
            @for (agent of aiAgentsStatus(); track agent.name) {
              <div class="flex items-center gap-2 bg-white/60 hover:bg-white border border-soft-green/40 px-3.5 py-2 rounded-xl text-xs font-semibold text-dark-green transition-all duration-300 hover:shadow-sm">
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        [ngClass]="{
                          'bg-primary': agent.status === 'active',
                          'bg-orange-500': agent.status === 'idle',
                          'bg-red-500': agent.status === 'warning'
                        }"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2"
                        [ngClass]="{
                          'bg-primary': agent.status === 'active',
                          'bg-orange-500': agent.status === 'idle',
                          'bg-red-500': agent.status === 'warning'
                        }"></span>
                </span>
                <span class="text-dark-green/75">{{ agent.name }}:</span>
                <span class="text-dark-green/90">{{ agent.message }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Toast Notification for Quick Review actions -->
      @if (toastMessage()) {
        <div class="fixed bottom-5 right-5 bg-dark-green text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-primary/20 z-50 animate-fade-in-up">
          <lucide-icon name="check-circle" class="w-5 h-5 text-primary"></lucide-icon>
          <span class="text-sm font-semibold">{{ toastMessage() }}</span>
        </div>
      }

      <!-- Today Summary (4 cards) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-5">
        @for (card of summaryCards(); track card.title) {
          <app-summary-card [card]="card"></app-summary-card>
        }
      </div>

      <!-- Main Layout: 2 Columns Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left Column: Morning Briefing Feed & Filtering (65-70%) -->
        <div class="lg:col-span-2 space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-soft-green/30">
            <div>
              <h3 class="font-heading font-extrabold text-xl text-dark-green">AI Morning Insights</h3>
              <p class="text-xs text-dark-green/60 mt-0.5">Các thông tin đúc rút được trợ lý AI tổng hợp lúc đầu ngày</p>
            </div>
            
            <!-- Filter Tabs for Insights -->
            <div class="flex bg-mint-white border border-soft-green/50 p-1 rounded-xl">
              @for (tab of briefingTabs(); track tab.id) {
                <button class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer"
                        [ngClass]="tab.id === activeBriefingTab() ? 'bg-primary text-white shadow-sm' : 'text-dark-green/70 hover:text-dark-green'"
                        (click)="setActiveBriefingTab(tab.id)">
                  {{ tab.name }}
                </button>
              }
            </div>
          </div>

          <!-- Briefing Items list -->
          <div class="space-y-4">
            @for (item of filteredBriefingItems(); track item.id) {
              <app-briefing-item 
                [item]="item"
                (onPrimaryAction)="handlePrimaryAction($event)"
                (onSecondaryAction)="handleSecondaryAction($event)">
              </app-briefing-item>
            } @empty {
              <div class="bg-white/50 rounded-2xl p-12 text-center border border-dashed border-soft-green text-dark-green/60">
                <lucide-icon name="check-circle" class="w-8 h-8 mx-auto text-primary mb-3"></lucide-icon>
                <p class="font-medium text-sm">Chưa có phân tích nào trong mục này</p>
              </div>
            }
          </div>
        </div>

        <!-- Right Column: Interactive Action Hub (30-35%) -->
        <div class="space-y-6">
          <div class="bg-white rounded-3xl border border-soft-green/50 shadow-glass p-5 space-y-5 sticky top-24">
            
            <div>
              <h3 class="font-heading font-extrabold text-lg text-dark-green flex items-center gap-2">
                <lucide-icon name="list-checks" class="w-5 h-5 text-primary"></lucide-icon>
                Action Queue
              </h3>
              <p class="text-xs text-dark-green/60 mt-0.5">Việc cần chủ shop xử lý và duyệt hôm nay</p>
            </div>

            <!-- Tasks Progress Tracker -->
            <div class="bg-mint-white/60 border border-soft-green/30 p-3.5 rounded-2xl space-y-2">
              <div class="flex justify-between text-xs font-bold text-dark-green/80">
                <span>Tiến độ công việc</span>
                <span>{{ completedTasksCount() }}/{{ actionItems().length }} đã xong</span>
              </div>
              <div class="w-full h-2 bg-soft-green/30 rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full transition-all duration-500" 
                     [style.width.%]="(completedTasksCount() / actionItems().length) * 100"></div>
              </div>
            </div>
            
            <!-- Tabs filters for Actions -->
            <div class="flex gap-1.5 overflow-x-auto pb-1 border-b border-soft-green/20" style="scrollbar-width: none;">
              @for (tab of actionTabs(); track tab) {
                <button class="px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition-all duration-300"
                        [ngClass]="tab === activeActionTab() ? 'bg-primary/10 text-primary border border-primary/20' : 'text-dark-green/60 hover:text-dark-green hover:bg-mint-white'"
                        (click)="setActiveActionTab(tab)">
                  {{ tab }}
                </button>
              }
            </div>

            <!-- Action Items List -->
            <div class="space-y-3 max-h-[480px] overflow-y-auto pr-1" style="scrollbar-width: thin; scrollbar-color: #D1EAE0 transparent;">
              @for (action of filteredActionItems(); track action.id) {
                <app-action-item 
                  [item]="action"
                  (onAction)="handleQueueAction($event)"
                  (onSecondaryAction)="handleQueueSecondaryAction($event)">
                </app-action-item>
              } @empty {
                <div class="py-8 text-center text-dark-green/50 text-xs">
                  <lucide-icon name="inbox" class="w-6 h-6 mx-auto mb-2 opacity-50"></lucide-icon>
                  Không có công việc nào cần duyệt trong tab này.
                </div>
              }
            </div>
            
            <div class="pt-2 text-center">
              <button class="text-xs font-bold text-primary hover:text-primary-container transition-all cursor-pointer inline-flex items-center gap-1">
                Xem toàn bộ lịch sử công việc
                <lucide-icon name="chevron-right" class="w-3.5 h-3.5"></lucide-icon>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  `
})
export class BriefingComponent implements OnInit {
  
  toastMessage = signal<string | null>(null);

  aiAgentsStatus = signal<AgentStatus[]>([
    { name: 'Analyst Agent', type: 'analyst', status: 'active', message: 'Báo cáo sẵn sàng' },
    { name: 'Chat Agent', type: 'chat', status: 'active', message: 'Online · Đã phản hồi 24 hội thoại' },
    { name: 'Voice Agent', type: 'voice', status: 'idle', message: 'Chờ cuộc gọi mới' }
  ]);
  
  summaryCards = signal<SummaryCardData[]>([
    { title: 'Doanh thu hôm nay', value: '12.4M ₫', meta: '+8% so với hôm qua', icon: 'trending-up', type: 'revenue', progress: 62 },
    { title: 'Hội thoại đang chờ', value: '12 khách', meta: 'Tổng cộng: 38 hội thoại', icon: 'message-square', type: 'chat', subValue: 'Chờ >30 phút' },
    { title: 'Cần bạn duyệt', value: '6 công việc', meta: 'AI đã đề xuất phương án', icon: 'sparkles', type: 'approval' },
    { title: 'Cảnh báo hệ thống', value: '2 lỗi', meta: 'Cần cấu hình kết nối lại', icon: 'alert-triangle', type: 'alert' }
  ]);

  briefingTabs = signal([
    { id: 'all', name: 'Tất cả' },
    { id: 'insights', name: '💡 Báo cáo Insights' },
    { id: 'alerts', name: '🚨 Cảnh báo & Vận hành' }
  ]);
  activeBriefingTab = signal('all');

  briefingItems = signal<BriefingItemData[]>([
    {
      id: '1',
      agentName: 'Analyst Agent',
      agentType: 'analyst',
      time: '08:10',
      title: 'Doanh thu hôm qua giảm 18% ở nhóm sản phẩm Chăm sóc da',
      content: 'Lượt quan tâm và hội thoại hỏi giá vẫn ở mức cao. Tuy nhiên tỉ lệ chốt đơn (conversion rate) sụt giảm mạnh. Có thể do đối thủ cạnh tranh đang chạy chương trình khuyến mãi cùng phân khúc.',
      metaData: 'Nguồn: 124 đơn hàng · Phân tích đối sánh 7 ngày',
      impact: 'Ảnh hưởng: -3.5M ₫ tiềm năng',
      priority: 'high',
      primaryAction: 'Xem chi tiết phân tích',
      secondaryAction: 'So sánh đối thủ'
    },
    {
      id: '2',
      agentName: 'System Monitor',
      agentType: 'system',
      time: '08:00',
      title: 'Kênh kết nối Zalo OA bị ngắt kết nối',
      content: 'API không phản hồi từ lúc 06:00 sáng nay. Có thể khiến tin nhắn của khách hàng từ Zalo không hiển thị trên Dashboard chính, gây trôi tin nhắn.',
      impact: 'Khách hàng có thể bị trôi tin nhắn',
      priority: 'high',
      primaryAction: 'Kết nối lại Zalo OA',
      secondaryAction: 'Kiểm tra API Key'
    },
    {
      id: '3',
      agentName: 'Chat Agent',
      agentType: 'chat',
      time: '07:55',
      title: 'Có 12 hội thoại chưa phản hồi, 2 khách phàn nàn',
      content: 'Trong đó có 4 khách đã đợi phản hồi trên 30 phút. Khách hàng Linh (ID: 9482) đang không hài lòng về chính sách đổi trả sản phẩm lỗi.',
      metaData: 'Mạng xã hội & Chat web',
      impact: 'Nguy cơ hủy đơn từ khách Linh',
      priority: 'high',
      primaryAction: 'Nhảy vào trả lời ngay',
      secondaryAction: 'Xem chi tiết inbox'
    },
    {
      id: '4',
      agentName: 'Voice Agent',
      agentType: 'voice',
      time: '07:50',
      title: 'Có 3 cuộc gọi chăm sóc cần được follow-up',
      content: 'Hệ thống ghi nhận cuộc gọi từ khách hàng Thuần (098xxxx321) muốn đặt lịch hẹn chăm sóc chuyên sâu nhưng chưa chốt thời gian cụ thể.',
      metaData: 'Từ kênh tổng đài ảo',
      primaryAction: 'Nghe lại ghi âm',
      secondaryAction: 'Lên lịch gọi lại'
    }
  ]);

  actionTabs = signal(['Tất cả', 'Cần duyệt', 'Cần phản hồi', 'Lỗi']);
  activeActionTab = signal('Tất cả');

  actionItems = signal<ActionItemData[]>([
    {
      id: '1',
      priority: 'high',
      type: 'Cần duyệt',
      title: 'Duyệt phản hồi đổi trả cho khách Linh',
      description: 'Khách Linh hỏi về chính sách đổi trả. AI đề xuất đổi mới sản phẩm do lỗi vận chuyển.',
      actionText: 'Duyệt câu trả lời',
      recipient: 'Linh (Facebook Messenger)',
      draftContent: 'Chào chị Linh, shop rất tiếc vì sự cố móp méo hộp phấn trong quá trình vận chuyển. Shop xin gửi lại chị một hộp mới hoàn toàn miễn phí và tặng kèm voucher giảm giá 10% cho lần mua tiếp theo nhé. Chị vui lòng xác nhận địa chỉ để shop gửi hàng đi ạ!'
    },
    {
      id: '2',
      priority: 'high',
      type: 'Cần phản hồi',
      title: 'Khách hàng Nam hỏi giá liệu trình mụn',
      description: 'Khách hàng Nam đã chờ hơn 45 phút chưa được tư vấn giá combo liệu trình chuyên sâu.',
      actionText: 'Nhắn tin ngay'
    },
    {
      id: '3',
      priority: 'high',
      type: 'Lỗi',
      title: 'Đồng bộ Zalo OA bị chậm 2 giờ',
      description: 'Lỗi xác thực webhook Zalo. Cần làm mới (Refresh) Token truy cập.',
      actionText: 'Làm mới token'
    },
    {
      id: '4',
      priority: 'medium',
      type: 'Cần duyệt',
      title: 'Duyệt tin nhắn chúc mừng sinh nhật',
      description: 'AI nháp tin nhắn chúc mừng sinh nhật gửi hàng loạt cho 15 khách hàng có sinh nhật hôm nay.',
      actionText: 'Duyệt gửi tin',
      recipient: 'Khách hàng sinh nhật hôm nay',
      draftContent: 'Chúc mừng sinh nhật chị! Chúc chị luôn rạng rỡ và hạnh phúc. Nhân ngày đặc biệt này, shop xin gửi tặng chị món quà nhỏ là mã giảm giá HAPPYBDAY giảm ngay 15% cho mọi sản phẩm tại shop. Chúc chị có một ngày thật ý nghĩa!'
    }
  ]);

  completedTasksCount = signal(0);

  ngOnInit() {
    // Tự động đếm công việc ban đầu nếu cần thiết
  }

  setActiveBriefingTab(tabId: string) {
    this.activeBriefingTab.set(tabId);
  }

  setActiveActionTab(tab: string) {
    this.activeActionTab.set(tab);
  }

  filteredBriefingItems() {
    const tab = this.activeBriefingTab();
    const items = this.briefingItems();
    if (tab === 'all') {
      return items;
    } else if (tab === 'insights') {
      return items.filter(i => i.agentType === 'analyst');
    } else {
      return items.filter(i => i.agentType === 'system' || i.agentType === 'chat' || i.agentType === 'voice');
    }
  }

  filteredActionItems() {
    const tab = this.activeActionTab();
    const items = this.actionItems();
    if (tab === 'Tất cả') {
      return items;
    }
    return items.filter(item => item.type === tab);
  }

  showToast(message: string) {
    this.toastMessage.set(message);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  handlePrimaryAction(item: BriefingItemData) {
    console.log('Primary action triggered:', item);
    this.showToast(`Đã mở giao diện xử lý: "${item.title}"`);
  }

  handleSecondaryAction(item: BriefingItemData) {
    console.log('Secondary action triggered:', item);
    this.showToast(`Đã thực hiện: "${item.secondaryAction}"`);
  }

  handleQueueAction(event: { item: ActionItemData, draft?: string }) {
    console.log('Action Queue trigger:', event);
    if (event.item.type === 'Cần duyệt' && event.draft) {
      // Logic duyệt tin nhắn AI draft
      this.showToast(`Đã gửi phản hồi đã duyệt tới ${event.item.recipient || 'khách hàng'}`);
      
      // Chuyển việc này thành đã duyệt (xóa khỏi hàng đợi để biểu thị đã hoàn thành)
      this.actionItems.set(this.actionItems().filter(i => i.id !== event.item.id));
      this.completedTasksCount.set(this.completedTasksCount() + 1);

      // Cập nhật card cần duyệt trên summary
      this.summaryCards.update(cards => cards.map(c => {
        if (c.type === 'approval') {
          const val = parseInt(c.value) - 1;
          return { ...c, value: `${val} công việc` };
        }
        return c;
      }));

    } else {
      this.showToast(`Đang thực hiện tác vụ: ${event.item.title}`);
      // Với các task thông thường, bấm vào cũng hoàn thành và xoá khỏi hàng đợi
      this.actionItems.set(this.actionItems().filter(i => i.id !== event.item.id));
      this.completedTasksCount.set(this.completedTasksCount() + 1);
      
      if (event.item.type === 'Lỗi') {
        this.summaryCards.update(cards => cards.map(c => {
          if (c.type === 'alert') {
            const val = parseInt(c.value) - 1;
            return { ...c, value: `${val} lỗi` };
          }
          return c;
        }));
      }
    }
  }

  handleQueueSecondaryAction(item: ActionItemData) {
    console.log('Queue secondary action:', item);
    this.showToast(`Đang chỉnh sửa: ${item.title}`);
  }
}
