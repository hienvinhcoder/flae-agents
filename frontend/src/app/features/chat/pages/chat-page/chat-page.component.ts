import { Component, OnDestroy, inject, signal, computed, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';

import { AgentService } from '../../../agents/services/agent.service';
import { ChatService } from '../../../agents/services/chat.service';
import { ChatPageService } from '../../services/chat-page.service';
import { Agent, ChatSession, ChatMessage } from '../../../agents/models/agent.model';
import { ChatMessageComponent } from '../../../agents/ui/chat-message/chat-message.component';
import { ToastService } from '../../../../core/services/toast.service';
import { WorkspaceStore } from '../../../../core/stores/workspace.store';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ChatMessageComponent],
  templateUrl: './chat-page.component.html'
})
export class ChatPageComponent implements OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private chatPageService = inject(ChatPageService);
  private agentService = inject(AgentService);
  private chatService = inject(ChatService);
  private toastService = inject(ToastService);
  public workspaceStore = inject(WorkspaceStore);

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

  // New features for premium AI command center
  searchQuery = signal<string>('');
  contextPanelExpanded = signal<boolean>(true);

  activeCitations = computed(() => {
    const msgs = this.messages();
    if (msgs.length === 0) return null;
    // Find the latest assistant message with citations
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant' && msgs[i].citations && msgs[i].citations!.length > 0) {
        return msgs[i].citations!;
      }
    }
    return null;
  });

  groupedSessions = computed(() => {
    return this.getGroupedSessions();
  });

  getGroupedSessions() {
    const today: ChatSession[] = [];
    const thisWeek: ChatSession[] = [];
    const older: ChatSession[] = [];
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const query = this.searchQuery().toLowerCase().trim();
    const filtered = this.sessions().filter(s => s.title.toLowerCase().includes(query));

    for (const session of filtered) {
      if (!session.created_at) {
        older.push(session);
        continue;
      }
      try {
        const date = new Date(session.created_at);
        if (date >= startOfToday) {
          today.push(session);
        } else if (date >= oneWeekAgo) {
          thisWeek.push(session);
        } else {
          older.push(session);
        }
      } catch {
        older.push(session);
      }
    }
    
    return { today, thisWeek, older };
  }

  selectSuggestedPrompt(promptText: string) {
    this.inputText = promptText;
    this.sendMessage();
  }

  private streamSubscription?: Subscription;

  constructor() {
    // Tự động tải lại Agent mặc định và lịch sử chat khi người dùng chuyển đổi Workspace
    effect(() => {
      const workspaceId = this.workspaceStore.currentWorkspaceId();
      if (workspaceId) {
        this.fetchDefaultAgent();
      } else {
        this.agent.set(null);
        this.sessions.set([]);
        this.activeSession.set(null);
        this.messages.set([]);
      }
    }, { allowSignalWrites: true });
  }

  ngOnDestroy() {
    this.streamSubscription?.unsubscribe();
  }

  fetchDefaultAgent() {
    this.loadingAgent.set(true);
    this.chatPageService.getDefaultAgent().subscribe({
      next: (data) => {
        this.agent.set(data);
        this.loadingAgent.set(false);
        this.fetchSessions(data.id!);
      },
      error: () => {
        this.toastService.error('Không thể tải thông tin Agent mặc định');
        this.loadingAgent.set(false);
      }
    });
  }

  fetchSessions(agentId: string) {
    this.loadingSessions.set(true);
    this.agentService.getSessions(agentId).subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.loadingSessions.set(false);
        
        // Tự động mở session đầu tiên nếu có
        if (data.length > 0) {
          this.selectSession(data[0]);
        } else {
          this.activeSession.set(null);
          this.messages.set([]);
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
    const currentAgent = this.agent();
    if (!currentAgent) return;

    this.loadingMessages.set(true);
    this.agentService.getMessages(currentAgent.id!, sessionId).subscribe({
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
    const currentAgent = this.agent();
    if (!currentAgent) return;

    this.creatingSession.set(true);
    this.agentService.createSession(currentAgent.id!).subscribe({
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
    const currentAgent = this.agent();
    if (!currentAgent) return;

    if (confirm(`Bạn có chắc chắn muốn xóa cuộc hội thoại này?`)) {
      this.agentService.deleteSession(currentAgent.id!, session.id).subscribe({
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
    const currentAgent = this.agent();
    if (!text || this.streaming() || !this.activeSession() || !currentAgent) return;

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
      currentAgent.id!,
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
}
