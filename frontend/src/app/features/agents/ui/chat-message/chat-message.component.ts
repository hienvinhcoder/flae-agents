import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ChatMessage } from '../../models/agent.model';
import { CitationListComponent } from '../citation-list/citation-list.component';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CitationListComponent],
  template: `
    <div [class]="'flex gap-4 mb-6 ' + (message().role === 'user' ? 'justify-end' : 'justify-start')">
      
      <!-- Assistant Avatar -->
      @if (message().role === 'assistant') {
        <div [class]="'w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm border border-white/10 ' + agentColor()">
          <lucide-icon [name]="agentIcon()" class="w-5 h-5"></lucide-icon>
        </div>
      }

      <div class="max-w-[75%] flex flex-col gap-1.5">
        <!-- Name & Time -->
        <div [class]="'flex items-center gap-2 text-xs text-text-disabled ' + (message().role === 'user' ? 'justify-end' : 'justify-start')">
          <span class="font-semibold text-text-muted">
            {{ message().role === 'user' ? 'Bạn' : 'AI Agent' }}
          </span>
          <span>{{ formatTime(message().created_at) }}</span>
        </div>

        <!-- Bubble -->
        <div [class]="'px-4 py-3 rounded-2xl shadow-soft border text-sm leading-relaxed ' + 
          (message().role === 'user' 
            ? 'bg-primary-soft border-primary/30 text-text-primary rounded-tr-none' 
            : 'bg-ai-soft border-ai/30 text-text-secondary rounded-tl-none shadow-ai')">
          
          <!-- Content (Render Markdown) -->
          @if (message().role === 'user') {
            <p class="whitespace-pre-wrap">{{ message().content }}</p>
          } @else {
            <div [innerHTML]="renderMarkdown(message().content)" class="markdown-body"></div>
          }
        </div>

        <!-- Citations List (Chỉ dành cho Assistant và có citations) -->
        @if (message().role === 'assistant' && message().citations && message().citations!.length > 0) {
          <div class="mt-1">
            <button 
              (click)="showCitations.set(!showCitations())"
              class="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors py-1 px-2 rounded-lg bg-primary-soft hover:bg-primary/20"
            >
              <lucide-icon name="database" class="w-3.5 h-3.5"></lucide-icon>
              {{ showCitations() ? 'Ẩn tài liệu trích dẫn' : 'Xem ' + message().citations!.length + ' tài liệu trích dẫn' }}
              <lucide-icon [name]="showCitations() ? 'chevron-up' : 'chevron-down'" class="w-3 h-3 ml-0.5"></lucide-icon>
            </button>

            @if (showCitations()) {
              <div class="mt-2 pl-2 border-l-2 border-border transition-all duration-300">
                <app-citation-list [citations]="message().citations!"></app-citation-list>
              </div>
            }
          </div>
        }
      </div>

      <!-- User Avatar -->
      @if (message().role === 'user') {
        <div class="w-9 h-9 rounded-xl bg-elevated border border-border flex items-center justify-center text-text-primary shrink-0 shadow-sm">
          <lucide-icon name="user" class="w-5 h-5"></lucide-icon>
        </div>
      }

    </div>
  `
})
export class ChatMessageComponent {
  message = input.required<ChatMessage>();
  agentColor = input<string>('bg-slate-500');
  agentIcon = input<string>('bot');

  showCitations = signal<boolean>(false);

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  renderMarkdown(text: string): string {
    if (!text) return '';
    
    // Parser đơn giản
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.*$)/gim, '<h5 class="text-sm font-bold text-text-primary mt-3 mb-1.5">$1</h5>')
      .replace(/^## (.*$)/gim, '<h4 class="text-base font-bold text-text-primary mt-4 mb-2 border-b border-border pb-1">$1</h4>')
      .replace(/^# (.*$)/gim, '<h3 class="text-lg font-bold text-text-primary mt-5 mb-2.5 border-b border-border pb-1.5">$1</h3>')
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-app border border-border p-3 rounded-lg font-mono text-xs text-text-secondary overflow-x-auto my-3">$1</pre>')
      // Inline code
      .replace(/`([^`\n]+)`/gim, '<code class="bg-app text-ai px-1 py-0.5 rounded font-mono text-xs">$1</code>')
      // Bold / Italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Bullet points
      .replace(/^\s*[-*+]\s+(.*$)/gim, '<li class="list-disc ml-5 text-sm text-text-secondary my-1">$1</li>')
      // Paragraphs
      .split('\n\n')
      .map(para => {
        if (para.trim().startsWith('<h') || para.trim().startsWith('<pre') || para.trim().startsWith('<li')) {
          return para;
        }
        return `<p class="mb-2 leading-relaxed">${para.replace(/\n/g, '<br>')}</p>`;
      })
      .join('\n');
  }
}
