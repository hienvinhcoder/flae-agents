import { Component, ElementRef, HostListener, input, output, signal, inject, ChangeDetectorRef, effect } from '@angular/core';
import { Workspace } from '../../../core/models/workspace.model';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
@Component({
  selector: 'app-workspace-selector',
  standalone: true,
  imports: [LucideAngularModule, TranslateModule],
  template: `
    <div class="relative inline-block text-left w-full" id="workspace-selector-container">
      @if (variant() === 'standalone') {
        <!-- Standalone Mode (Dùng ở nơi khác) -->
        <button
          type="button"
          (click)="toggleDropdown(); $event.stopPropagation()"
          class="group inline-flex items-center gap-3 rounded-lg border border-border bg-elevated transition hover:border-border-strong hover:bg-subtle cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-95 text-left w-full px-3 py-2.5"
          [title]="currentWorkspace()?.name || ('WORKSPACE.SELECT' | translate)"
        >
          <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 transition-transform duration-300 group-hover:scale-105">
            {{ (currentWorkspace()?.name || 'W').charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0 pr-1.5 flex items-center">
            <p class="text-[13px] font-semibold text-text-primary truncate group-hover:text-primary transition-colors duration-200">
              {{ currentWorkspace()?.name || ('WORKSPACE.SELECT' | translate) }}
            </p>
          </div>
          <lucide-icon name="chevron-down" class="w-4 h-4 text-text-muted transition-transform duration-200 shrink-0 group-hover:text-text-primary" [class.rotate-180]="isOpen()"></lucide-icon>
        </button>
      } @else {
        <!-- Embedded Mode (Dùng ở Sidebar trượt) -->
        @if (!collapsed()) {
          <!-- Expanded Card Container (cũng là nút bấm để mở dropdown) -->
          <button
            type="button"
            (click)="toggleDropdown(); $event.stopPropagation()"
            class="group rounded-lg border border-border bg-elevated/40 p-2.5 flex flex-col gap-2.5 w-full text-left transition-all duration-300 hover:border-border-strong hover:bg-elevated/60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <!-- Row 1: Logo & Close Button -->
            <div class="flex items-center justify-between h-10 px-1 w-full">
              <div class="flex items-center gap-3 overflow-hidden">
                <img src="/assets/images/logo.png" alt="FLAE" class="w-10 h-10 object-contain rounded-xl transition-all duration-300 hover:scale-105 hover:rotate-3 shadow-md">
                <span class="font-heading font-black text-xl whitespace-nowrap tracking-wider bg-linear-to-r from-text-primary via-primary to-ai bg-clip-text text-transparent transition-all duration-300 hover:brightness-110">FLΛE</span>
              </div>
              @if (isMobile()) {
                <button type="button" (click)="closeSidebar($event)" class="text-text-muted hover:text-primary transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/4">
                  <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
                </button>
              }
            </div>
 
            <!-- Divider -->
            <div class="h-px bg-border/40 mx-1 w-full"></div>
 
            <!-- Row 2: Workspace Select Area (Flat layout) -->
            <div class="flex items-center gap-2.5 px-1 w-full">
              <div class="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 group-hover:bg-primary/15 group-hover:border-primary/30 transition-all duration-300">
                {{ (currentWorkspace()?.name || 'W').charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[13px] font-semibold text-text-primary truncate group-hover:text-primary transition-colors duration-200">
                  {{ currentWorkspace()?.name || ('WORKSPACE.SELECT' | translate) }}
                </p>
              </div>
              <lucide-icon name="chevron-down" class="w-4 h-4 text-text-muted transition-transform duration-200 shrink-0 group-hover:text-text-primary" [class.rotate-180]="isOpen()"></lucide-icon>
            </div>
          </button>
        } @else {
          <!-- Collapsed Card Container (cũng là nút bấm dọc) -->
          <button
            type="button"
            (click)="toggleDropdown(); $event.stopPropagation()"
            class="w-12 mx-auto py-2.5 px-1.5 rounded-lg border border-border bg-elevated/40 flex flex-col items-center gap-2.5 transition-all duration-300 hover:border-border-strong hover:bg-elevated/60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
            [title]="currentWorkspace()?.name || ('WORKSPACE.SELECT' | translate)"
          >
            <!-- Logo Icon -->
            <img src="/assets/images/logo.png" alt="FLAE" class="w-8 h-8 object-contain rounded-lg transition-all duration-300 hover:scale-110">
 
            <!-- Divider -->
            <div class="w-8 h-px bg-border/40"></div>
 
            <!-- Workspace Icon (Initial letter) -->
            <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-extrabold text-sm shrink-0 transition-all duration-300 hover:bg-primary/20">
              {{ (currentWorkspace()?.name || 'W').charAt(0).toUpperCase() }}
            </div>
          </button>
        }
      }
 
      @if (isOpen()) {
        <div
          class="absolute mt-2 w-72 left-0 origin-top-left rounded-lg border border-border-strong bg-elevated p-2 shadow-elevated z-50 animate-fade-in"
        >
          @if (showCreateForm()) {
            <!-- Form Tạo Workspace Mới -->
            <div class="px-3 py-2.5 space-y-3">
              <div class="text-[10px] font-semibold text-text-muted uppercase tracking-[0.08em]">
                {{ 'WORKSPACE.CREATE_NEW' | translate }}
              </div>
              <div class="space-y-2">
                <input
                  #wsNameInput
                  type="text"
                  [placeholder]="'WORKSPACE.NAME_PLACEHOLDER' | translate"
                  class="w-full px-3 py-2 text-[13px] bg-subtle border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-text-primary placeholder:text-text-muted"
                  (keydown.enter)="onCreateSubmit(wsNameInput.value)"
                  (keydown.escape)="cancelCreate()"
                />
                @if (createError()) {
                  <p class="text-[11px] text-rose-500 font-medium px-1">{{ createError() }}</p>
                }
                <div class="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    (click)="cancelCreate()"
                    class="px-2.5 py-1.5 text-xs text-text-secondary hover:bg-white/4 rounded-md transition-colors cursor-pointer"
                    [disabled]="isCreatingWorkspace()"
                  >
                    {{ 'COMMON.CANCEL' | translate }}
                  </button>
                  <button
                    type="button"
                    (click)="onCreateSubmit(wsNameInput.value)"
                    class="px-2.5 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-hover text-app rounded-md transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    [disabled]="isCreatingWorkspace() || !wsNameInput.value.trim()"
                  >
                    @if (isCreatingWorkspace()) {
                      <span class="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></span>
                    }
                    {{ 'COMMON.CREATE' | translate }}
                  </button>
                </div>
              </div>
            </div>
          } @else {
            <!-- Danh sách Workspace hiện tại -->
            <div class="px-3 py-2 border-b border-border mb-1">
              <span class="text-[10px] font-semibold text-text-muted uppercase tracking-[0.08em]">{{ 'WORKSPACE.LABEL' | translate }}</span>
            </div>
 
            <div class="max-h-60 overflow-y-auto space-y-1">
              @for (ws of workspaces(); track ws.id) {
                <button
                  type="button"
                  (click)="selectWorkspace(ws.id)"
                  class="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-text-secondary hover:bg-white/4 hover:text-text-primary rounded-md transition-colors cursor-pointer text-left group"
                  [class.bg-white/4]="ws.id === currentWorkspace()?.id"
                  [class.text-text-primary]="ws.id === currentWorkspace()?.id"
                >
                  <div
                    class="w-6 h-6 rounded bg-border border border-border-strong text-text-muted flex items-center justify-center font-bold text-xs shrink-0 group-hover:border-primary/20 group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                    [class.border-primary/20]="ws.id === currentWorkspace()?.id"
                    [class.bg-primary/10]="ws.id === currentWorkspace()?.id"
                    [class.text-primary]="ws.id === currentWorkspace()?.id"
                  >
                    {{ (ws.name || '').charAt(0).toUpperCase() }}
                  </div>
                  <span class="flex-1 truncate font-medium">{{ ws.name || '' }}</span>
                  @if (ws.id === currentWorkspace()?.id) {
                    <lucide-icon name="check" class="w-4 h-4 text-primary shrink-0"></lucide-icon>
                  }
                </button>
              } @empty {
                <div class="px-3 py-4 text-center text-xs text-text-muted">
                  {{ 'WORKSPACE.NO_WORKSPACES' | translate }}
                </div>
              }
            </div>
 
            <div class="border-t border-border mt-1 pt-1">
              <button
                type="button"
                (click)="requestCreateWorkspace()"
                class="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer text-left"
              >
                <div class="w-6 h-6 rounded border border-primary/20 bg-primary/10 flex items-center justify-center shrink-0">
                  <lucide-icon name="plus" class="w-4 h-4 text-primary"></lucide-icon>
                </div>
                <span>{{ 'WORKSPACE.CREATE_NEW' | translate }}</span>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      width: 100%;
    }
    .animate-fade-in {
      animation: fadeIn 0.15s ease-out;
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `]
})
export class WorkspaceSelectorComponent {
  workspaces = input.required<Workspace[]>();
  currentWorkspace = input<Workspace | null>(null);
  isLoading = input<boolean>(false);
  collapsed = input<boolean>(false);
  variant = input<'standalone' | 'embedded'>('standalone');
  isMobile = input<boolean>(false);
  
  isCreatingWorkspace = input<boolean>(false);
  createError = input<string | null>(null);

  workspaceSelected = output<string>();
  createWorkspace = output<string>();
  collapsedChange = output<boolean>();

  isOpen = signal<boolean>(false);
  showCreateForm = signal<boolean>(false);

  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  private wasCreating = false;

  constructor() {
    effect(() => {
      const isCreating = this.isCreatingWorkspace();
      const error = this.createError();
      
      if (isCreating) {
        this.wasCreating = true;
      }

      if (!isCreating && this.wasCreating && this.showCreateForm()) {
        this.wasCreating = false;
        if (!error) {
          this.showCreateForm.set(false);
          this.isOpen.set(false);
          this.cdr.markForCheck();
        }
      }
    });
  }

  toggleDropdown() {
    this.isOpen.update(open => !open);
    if (!this.isOpen()) {
      this.showCreateForm.set(false);
    }
    this.cdr.markForCheck();
  }

  selectWorkspace(id: string) {
    this.workspaceSelected.emit(id);
    this.isOpen.set(false);
    this.cdr.markForCheck();
  }

  requestCreateWorkspace() {
    this.showCreateForm.set(true);
    this.cdr.markForCheck();
  }

  cancelCreate() {
    if (this.isCreatingWorkspace()) return;
    this.showCreateForm.set(false);
    this.cdr.markForCheck();
  }

  onCreateSubmit(name: string) {
    if (this.isCreatingWorkspace() || !name.trim()) return;
    this.createWorkspace.emit(name.trim());
  }

  closeSidebar(event: MouseEvent) {
    event.stopPropagation();
    this.collapsedChange.emit(true);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
      this.showCreateForm.set(false);
      this.cdr.markForCheck();
    }
  }
}
