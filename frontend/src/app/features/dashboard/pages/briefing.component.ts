import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Clock, TrendingUp, MessageCircle, CheckCircle2, AlertTriangle, BarChart2, MessageSquare, Phone, Bell, ArrowRight, ExternalLink } from 'lucide-angular';

interface SummaryCard {
  title: string;
  value: string;
  meta: string;
  icon: string;
  type: 'revenue' | 'chat' | 'approval' | 'alert';
}

interface BriefingItem {
  id: string;
  agentName: string;
  agentType: 'analyst' | 'chat' | 'voice' | 'system';
  time: string;
  title: string;
  content: string;
  metaData?: string;
  primaryAction: string;
  secondaryAction?: string;
}

interface ActionItem {
  id: string;
  priority: 'high' | 'medium' | 'low';
  type: string;
  title: string;
  description: string;
  actionText: string;
}

@Component({
  selector: 'app-briefing',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule
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
            <span>Cập nhật lần cuối: 08:15 · Website Chat · Facebook · Zalo</span>
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
          <div class="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-soft-green/50 shadow-soft hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
            <div class="text-sm font-medium text-dark-green/60 mb-2 group-hover:text-dark-green transition-colors">{{ card.title }}</div>
            <div class="text-2xl font-heading font-semibold text-dark-green">{{ card.value }}</div>
            <div class="mt-2 text-sm font-medium flex items-center gap-1"
                 [ngClass]="{
                   'text-primary': card.type === 'revenue',
                   'text-orange-500': card.type === 'chat',
                   'text-blue-500': card.type === 'approval',
                   'text-red-500': card.type === 'alert'
                 }">
              <lucide-icon [name]="card.icon" class="w-4 h-4"></lucide-icon>
              {{ card.meta }}
            </div>
          </div>
        }
      </div>

      <!-- Main Layout: 2 Columns -->
      <div class="flex flex-col lg:flex-row gap-6">
        
        <!-- Left Column: Morning Briefing Feed (65-70%) -->
        <div class="w-full lg:w-2/3 space-y-4">
          <h3 class="font-heading font-semibold text-lg text-dark-green mb-4">Morning Briefing</h3>

          @for (item of briefingItems(); track item.id) {
            <div class="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-soft relative overflow-hidden"
                 [ngClass]="{
                   'border border-soft-green/50': item.agentType !== 'system',
                   'border border-red-100 bg-gradient-to-br from-white to-red-50/30': item.agentType === 'system'
                 }">
              
              <!-- Color Indicator for Chat Agent -->
              @if (item.agentType === 'chat') {
                <div class="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
              }

              <!-- Header -->
              <div class="flex items-center gap-3 mb-4 border-b pb-3"
                   [ngClass]="item.agentType === 'system' ? 'border-red-100' : 'border-soft-green/30'">
                
                <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                     [ngClass]="{
                       'bg-blue-50 text-blue-600': item.agentType === 'analyst',
                       'bg-orange-50 text-orange-500': item.agentType === 'chat',
                       'bg-indigo-50 text-indigo-600': item.agentType === 'voice',
                       'bg-red-100 text-red-600': item.agentType === 'system'
                     }">
                  <lucide-icon [name]="getAgentIcon(item.agentType)" class="w-4 h-4"></lucide-icon>
                </div>
                
                <div>
                  <div class="font-medium text-sm" [ngClass]="item.agentType === 'system' ? 'text-red-800' : 'text-dark-green'">
                    {{ item.agentName }}
                  </div>
                  <div class="text-xs" [ngClass]="item.agentType === 'system' ? 'text-red-600/70' : 'text-dark-green/50'">
                    {{ item.time }}
                  </div>
                </div>
              </div>
              
              <!-- Content -->
              <h4 class="text-lg font-heading font-semibold mb-2"
                  [ngClass]="item.agentType === 'system' ? 'text-red-900' : 'text-dark-green'">
                {{ item.title }}
              </h4>
              <p class="text-sm leading-relaxed mb-4"
                 [ngClass]="item.agentType === 'system' ? 'text-red-800/80' : 'text-dark-green/80'">
                {{ item.content }}
              </p>
              
              <!-- Meta Data (if any) -->
              @if (item.metaData) {
                <div class="flex items-center gap-2 mb-5">
                  <span class="px-2.5 py-1 bg-mint-white border border-soft-green rounded text-xs font-medium text-dark-green/70">
                    {{ item.metaData }}
                  </span>
                </div>
              }

              <!-- Actions -->
              <div class="flex gap-3" [class.mt-5]="!item.metaData">
                <button [ngClass]="{
                          'bg-dark-green text-white hover:bg-dark-green/90': item.agentType === 'chat',
                          'bg-red-600 text-white hover:bg-red-700': item.agentType === 'system',
                          'bg-white border border-soft-green hover:bg-mint-white text-dark-green': item.agentType !== 'chat' && item.agentType !== 'system'
                        }"
                        class="px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer">
                  {{ item.primaryAction }}
                </button>
                
                @if (item.secondaryAction) {
                  <button class="bg-white border border-soft-green hover:bg-mint-white text-dark-green px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer">
                    {{ item.secondaryAction }}
                  </button>
                }
              </div>
            </div>
          }

        </div>

        <!-- Right Column: Action Queue (30-35%) -->
        <div class="w-full lg:w-1/3">
          <div class="bg-white/90 backdrop-blur-md rounded-2xl border border-soft-green/50 shadow-soft sticky top-20 flex flex-col max-h-[calc(100vh-6rem)]">
            
            <div class="p-5 border-b border-soft-green/50 shrink-0">
              <h3 class="font-heading font-semibold text-lg text-dark-green">Action Queue</h3>
              <p class="text-sm text-dark-green/60 mt-1">12 việc cần xử lý hôm nay</p>
              
              <!-- Tabs -->
              <div class="flex gap-2 mt-4 overflow-x-auto pb-2" style="scrollbar-width: none;">
                @for (tab of actionTabs(); track tab) {
                  <button class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
                          [ngClass]="tab === 'Ưu tiên' ? 'bg-primary text-white' : 'bg-mint-white text-dark-green/70 hover:bg-soft-green/50'">
                    {{ tab }}
                  </button>
                }
              </div>
            </div>

            <!-- Action Items List -->
            <div class="flex-1 overflow-y-auto p-3 space-y-2">
              
              @for (action of actionItems(); track action.id; let last = $last) {
                <div class="p-4 rounded-xl hover:bg-mint-white border border-transparent hover:border-soft-green/50 transition-all cursor-pointer group">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="w-2 h-2 rounded-full"
                          [ngClass]="{
                            'bg-red-500': action.priority === 'high' && action.type !== 'Cần duyệt',
                            'bg-orange-500': action.type === 'Cần duyệt',
                            'bg-blue-500': action.priority === 'medium'
                          }"></span>
                    <span class="text-xs font-medium"
                          [ngClass]="{
                            'text-red-600': action.priority === 'high' && action.type !== 'Cần duyệt',
                            'text-orange-600': action.type === 'Cần duyệt',
                            'text-blue-600': action.priority === 'medium'
                          }">
                      {{ action.priority === 'high' ? 'Cao' : (action.priority === 'medium' ? 'Trung bình' : 'Thấp') }} · {{ action.type }}
                    </span>
                  </div>
                  
                  <div class="font-medium text-sm text-dark-green mb-1 group-hover:text-primary transition-colors">{{ action.title }}</div>
                  <p class="text-xs text-dark-green/60 mb-3">{{ action.description }}</p>
                  
                  @if (action.type === 'Cần duyệt') {
                    <div class="flex gap-2">
                      <button class="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary hover:text-white transition-colors cursor-pointer">
                        {{ action.actionText }}
                      </button>
                      <button class="px-3 py-1.5 bg-white border border-soft-green text-dark-green rounded-lg text-xs font-medium hover:bg-mint-white transition-colors cursor-pointer">
                        Sửa
                      </button>
                    </div>
                  } @else {
                    <button class="text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                            [ngClass]="action.priority === 'medium' ? 'text-blue-600 hover:text-blue-700' : 'text-primary hover:text-primary/80'">
                      {{ action.actionText }}
                      <lucide-icon [name]="action.priority === 'medium' ? 'external-link' : 'arrow-right'" class="w-3 h-3"></lucide-icon>
                    </button>
                  }
                </div>

                @if (!last) {
                  <div class="h-px bg-soft-green/30 mx-4"></div>
                }
              }

            </div>
            
            <div class="p-3 border-t border-soft-green/50 shrink-0 text-center">
              <button class="text-xs font-medium text-dark-green/60 hover:text-primary transition-colors cursor-pointer">
                Xem tất cả 12 việc
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  `
})
export class BriefingComponent {
  
  summaryCards = signal<SummaryCard[]>([
    { title: 'Doanh thu', value: '12.4M ₫', meta: '+8% so với hôm qua', icon: 'trending-up', type: 'revenue' },
    { title: 'Hội thoại mới', value: '38', meta: '12 chưa phản hồi', icon: 'message-circle', type: 'chat' },
    { title: 'Cần duyệt', value: '6', meta: 'AI đang chờ bạn', icon: 'check-circle-2', type: 'approval' },
    { title: 'Cảnh báo', value: '2', meta: 'Cần xem hôm nay', icon: 'alert-triangle', type: 'alert' }
  ]);

  briefingItems = signal<BriefingItem[]>([
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

  actionItems = signal<ActionItem[]>([
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

  getAgentIcon(type: string): string {
    switch (type) {
      case 'analyst': return 'bar-chart-2';
      case 'chat': return 'message-square';
      case 'voice': return 'phone';
      case 'system': return 'alert-triangle';
      default: return 'bell';
    }
  }
}
