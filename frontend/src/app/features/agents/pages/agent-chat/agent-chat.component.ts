import { Component, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';

import { AgentService } from '../../services/agent.service';
import { ChatService } from '../../services/chat.service';
import { Agent, ChatSession, ChatMessage } from '../../models/agent.model';
import { ChatMessageComponent } from '../../ui/chat-message/chat-message.component';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-agent-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ChatMessageComponent],
  template: `
    <div class="flex h-[calc(100vh-64px)] bg-app overflow-hidden">
      <!-- 1. Sidebar: Lịch sử phiên hội thoại -->
      <div class="w-80 border-r border-border bg-surface flex flex-col justify-between shrink-0 h-full">
        <div class="flex flex-col h-full overflow-hidden">
          <div class="p-4 border-b border-border flex flex-col gap-3">
            <button 
              (click)="goBack()" 
              class="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              <lucide-icon name="arrow-left" class="w-3.5 h-3.5"></lucide-icon>
              Danh sách AI Agents
            </button>
            <button 
              (click)="createNewSession()"
              [disabled]="loadingAgent() || creatingSession()"
              class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-primary/40 bg-primary text-app hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-sm transition-colors shadow-primary"
            >
              <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
              Hội thoại mới
            </button>
          </div>

          <!-- Danh sách Sessions -->
          <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            @if (loadingSessions()) {
              <div class="flex flex-col items-center justify-center py-12 gap-2">
                <lucide-icon name="refresh-cw" class="w-5 h-5 text-text-muted animate-spin"></lucide-icon>
                <span class="text-xs text-text-muted">Đang tải lịch sử...</span>
              </div>
            } @else {
              @if (sessions().length === 0) {
                <div class="text-center py-12 px-4">
                  <p class="text-xs text-text-muted">Chưa có cuộc hội thoại nào.</p>
                </div>
              } @else {
                @for (session of sessions(); track session.id) {
                  <div 
                    (click)="selectSession(session)"
                    [class]="'group relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ' + 
                      (activeSession()?.id === session.id 
                        ? 'border border-primary/30 bg-primary-soft text-primary font-semibold' 
                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary')"
                  >
                    <div class="flex items-center gap-2.5 truncate pr-8">
                      <lucide-icon name="message-square" class="w-4 h-4 text-text-muted group-hover:text-primary"></lucide-icon>
                      <span class="text-sm truncate">{{ session.title }}</span>
                    </div>

                    <!-- Nút xóa Session -->
                    <button 
                      (click)="$event.stopPropagation(); deleteSession(session)"
                      class="absolute right-3 opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-opacity p-1 rounded-md hover:bg-white/5"
                      title="Xóa phiên hội thoại"
                    >
                      <lucide-icon name="trash-2" class="w-3.5 h-3.5"></lucide-icon>
                    </button>
                  </div>
                }
              }
            }
          </div>
        </div>
      </div>

      <!-- 2. Khung chat chính -->
      <div class="flex-1 flex flex-col h-full bg-app overflow-hidden relative">
        @if (loadingAgent()) {
          <div class="flex-1 flex items-center justify-center">
            <lucide-icon name="refresh-cw" class="w-8 h-8 text-primary animate-spin"></lucide-icon>
          </div>
        } @else if (!agent()) {
          <div class="flex-1 flex items-center justify-center p-8 text-center text-text-muted">
            Không tìm thấy thông tin AI Agent.
          </div>
        } @else {
          <!-- Header -->
          <div class="h-16 border-b border-border bg-surface px-6 flex items-center justify-between shrink-0 shadow-soft z-10">
            <div class="flex items-center gap-3">
              <div [class]="'w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm border border-white/10 ' + agent()!.avatar_color">
                <lucide-icon [name]="agent()!.avatar_icon" class="w-5 h-5"></lucide-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-text-primary">{{ agent()!.name }}</h3>
                <p class="text-[10px] text-text-muted flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                  Sẵn sàng • {{ agent()!.model_name || 'gemini-2.5-flash' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Danh sách Tin nhắn -->
          <div #scrollContainer class="flex-1 overflow-y-auto px-6 py-6" (scroll)="onScroll()">
            @if (activeSession()) {
              @if (loadingMessages()) {
                <div class="flex items-center justify-center h-full">
                  <lucide-icon name="refresh-cw" class="w-6 h-6 text-primary animate-spin"></lucide-icon>
                </div>
              } @else {
                @if (messages().length === 0) {
                  <div class="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto py-12">
                    <div [class]="'w-14 h-14 rounded-2xl text-white flex items-center justify-center mb-4 ' + agent()!.avatar_color">
                      <lucide-icon [name]="agent()!.avatar_icon" class="w-7 h-7"></lucide-icon>
                    </div>
                    <h4 class="text-base font-bold text-text-primary mb-1">Hỏi đáp cùng {{ agent()!.name }}</h4>
                    <p class="text-xs text-text-muted leading-relaxed">
                      Đặt câu hỏi cho Agent. Hệ thống sẽ tự động đối chiếu thông tin từ Knowledge Base và trả lời bằng tài liệu của bạn.
                    </p>
                  </div>
                } @else {
                  @for (msg of messages(); track msg.id) {
                    <app-chat-message 
                      [message]="msg"
                      [agentColor]="agent()!.avatar_color"
                      [agentIcon]="agent()!.avatar_icon"
                    ></app-chat-message>
                  }
                }
              }
            } @else {
              <div class="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
                <lucide-icon name="message-square" class="w-12 h-12 text-text-disabled mb-4"></lucide-icon>
                <h4 class="text-base font-bold text-text-primary mb-1">Chọn một phiên hội thoại</h4>
                <p class="text-xs text-text-muted leading-relaxed mb-4">
                  Chọn phiên hội thoại trong thanh bên trái hoặc tạo mới để bắt đầu chat với Agent.
                </p>
              </div>
            }
          </div>

          <!-- Khung nhập Input -->
          @if (activeSession()) {
            <div class="p-4 bg-surface border-t border-border shrink-0 shadow-soft z-10">
              <form (ngSubmit)="sendMessage()" class="flex items-end gap-3 max-w-4xl mx-auto relative">
                <textarea
                  [(ngModel)]="inputText"
                  name="chatInput"
                  rows="1"
                  (keydown.enter)="onEnterPress($event)"
                  [disabled]="streaming()"
                  placeholder="Nhập câu hỏi của bạn..."
                  class="flex-1 px-4 py-3 rounded-xl border border-border bg-app text-text-primary placeholder:text-text-disabled outline-none transition focus:border-ai focus:ring-2 focus:ring-ai/30 text-sm resize-none pr-12 min-h-[44px] max-h-[120px]"
                ></textarea>
                
                <button
                  type="submit"
                  [disabled]="!inputText.trim() || streaming()"
                  class="absolute right-2.5 bottom-2 w-8 h-8 flex items-center justify-center bg-primary hover:bg-primary-hover disabled:bg-white/5 text-app disabled:text-text-disabled rounded-lg transition-colors shadow-primary"
                >
                  <lucide-icon name="send" class="w-4 h-4"></lucide-icon>
                </button>
              </form>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class AgentChatComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private agentService = inject(AgentService);
  private chatService = inject(ChatService);
  private toastService = inject(ToastService);

  agentId: string = '';
  agent = signal<Agent | null>(null);
  sessions = signal<ChatSession[]>([]);
  messages = signal<ChatMessage[]>([]);
  activeSession = signal<ChatSession | null>(null);

  inputText: string = '';
  
  loadingAgent = signal<boolean>(true);
  loadingSessions = signal<boolean>(true);
  loadingMessages = signal<boolean>(false);
  creatingSession = signal<boolean>(false);
  streaming = signal<boolean>(false);
  userScrolledUp = false;

  private streamSubscription?: Subscription;

  ngOnInit() {
    this.agentId = this.route.snapshot.paramMap.get('agentId') || '';
    if (!this.agentId) {
      this.toastService.error('Không tìm thấy thông tin Agent ID');
      this.router.navigate(['/dashboard/agents']);
      return;
    }
    
    this.fetchAgent();
    this.fetchSessions();
  }

  ngOnDestroy() {
    this.streamSubscription?.unsubscribe();
  }

  fetchAgent() {
    this.loadingAgent.set(true);
    this.agentService.getAgent(this.agentId).subscribe({
      next: (data) => {
        this.agent.set(data);
        this.loadingAgent.set(false);
      },
      error: () => {
        this.toastService.error('Không thể tải thông tin Agent');
        this.router.navigate(['/dashboard/agents']);
      }
    });
  }

  fetchSessions() {
    this.loadingSessions.set(true);
    this.agentService.getSessions(this.agentId).subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.loadingSessions.set(false);
        
        // Tự động mở session đầu tiên nếu có
        if (data.length > 0) {
          this.selectSession(data[0]);
        }
      },
      error: () => {
        this.toastService.error('Không thể tải lịch sử các phiên chat');
        this.loadingSessions.set(false);
      }
    });
  }

  selectSession(session: ChatSession) {
    this.activeSession.set(session);
    this.messages.set([]);
    this.userScrolledUp = false;
    this.loadMessages(session.id);
  }

  loadMessages(sessionId: string) {
    this.loadingMessages.set(true);
    this.agentService.getMessages(this.agentId, sessionId).subscribe({
      next: (data) => {
        this.messages.set(data);
        this.loadingMessages.set(false);
        setTimeout(() => this.scrollToBottom(true), 50);
      },
      error: () => {
        this.toastService.error('Không thể tải lịch sử tin nhắn');
        this.loadingMessages.set(false);
      }
    });
  }

  createNewSession() {
    this.creatingSession.set(true);
    this.agentService.createSession(this.agentId).subscribe({
      next: (session) => {
        this.sessions.update(prev => [session, ...prev]);
        this.selectSession(session);
        this.creatingSession.set(false);
      },
      error: () => {
        this.toastService.error('Không thể tạo phiên hội thoại mới');
        this.creatingSession.set(false);
      }
    });
  }

  deleteSession(session: ChatSession) {
    if (confirm(`Bạn có chắc chắn muốn xóa cuộc hội thoại này?`)) {
      this.agentService.deleteSession(this.agentId, session.id).subscribe({
        next: () => {
          this.toastService.success('Đã xóa cuộc hội thoại');
          this.sessions.update(prev => prev.filter(s => s.id !== session.id));
          
          if (this.activeSession()?.id === session.id) {
            this.activeSession.set(null);
            this.messages.set([]);
            if (this.sessions().length > 0) {
              this.selectSession(this.sessions()[0]);
            }
          }
        },
        error: () => {
          this.toastService.error('Lỗi khi xóa phiên hội thoại');
        }
      });
    }
  }

  sendMessage() {
    const text = this.inputText.trim();
    if (!text || this.streaming() || !this.activeSession()) return;

    this.inputText = '';
    this.streaming.set(true);
    this.userScrolledUp = false;

    // 1. Tạo tin nhắn tạm của User trên UI
    const tempUserMessage: ChatMessage = {
      id: 'temp-user-' + Date.now(),
      session_id: this.activeSession()!.id,
      role: 'user',
      content: text,
      created_by: 'user',
      created_at: new Date().toISOString()
    };
    this.messages.update(prev => [...prev, tempUserMessage]);
    setTimeout(() => this.scrollToBottom(), 50);

    // 2. Tạo tin nhắn tạm của Assistant đang chờ trả lời
    const tempAssistantMessage: ChatMessage = {
      id: 'temp-assistant-' + Date.now(),
      session_id: this.activeSession()!.id,
      role: 'assistant',
      content: '',
      created_by: 'assistant',
      created_at: new Date().toISOString(),
      citations: []
    };
    this.messages.update(prev => [...prev, tempAssistantMessage]);

    // 3. Kết nối Stream qua ChatService
    this.streamSubscription = this.chatService.connectStream(
      this.agentId,
      this.activeSession()!.id,
      text
    ).subscribe({
      next: (event) => {
        // Cập nhật tài liệu trích dẫn
        if (event.type === 'citations') {
          this.messages.update(prev => {
            return prev.map(m => m.id === tempAssistantMessage.id ? { ...m, citations: event.citations } : m);
          });
        }
        // Cập nhật token stream
        else if (event.type === 'token') {
          this.messages.update(prev => {
            return prev.map(m => m.id === tempAssistantMessage.id ? { ...m, content: m.content + event.text } : m);
          });
          setTimeout(() => this.scrollToBottom(), 20);
        }
      },
      error: (err) => {
        this.toastService.error('Đã xảy ra lỗi khi nhận câu trả lời từ AI');
        this.messages.update(prev => {
          return prev.map(m => m.id === tempAssistantMessage.id ? { ...m, content: 'Đã xảy ra lỗi kết nối. Hãy thử lại.' } : m);
        });
        this.streaming.set(false);
      },
      complete: () => {
        this.streaming.set(false);
        // Tải lại lịch sử tin nhắn thực từ DB để thay thế các ID tạm
        this.loadMessages(this.activeSession()!.id);
      }
    });
  }

  onEnterPress(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onScroll() {
    const element = this.scrollContainer.nativeElement;
    const threshold = 80;
    // Kiểm tra xem user có cuộn ngược lên trên không
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
    if (!atBottom) {
      this.userScrolledUp = true;
    } else {
      this.userScrolledUp = false;
    }
  }

  scrollToBottom(force = false) {
    if (!this.scrollContainer) return;
    const element = this.scrollContainer.nativeElement;
    if (!this.userScrolledUp || force) {
      element.scrollTop = element.scrollHeight;
    }
  }

  goBack() {
    this.router.navigate(['/dashboard/agents']);
  }
}
