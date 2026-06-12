import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './core/services/language.service';
import { ConnectionModalService } from './core/services/connection-modal.service';
import { AuthInitializerService } from './core/services/auth-initializer.service';
import { AuthStore } from './core/stores/auth.store';
import { ToastContainerComponent } from './shared/ui/toast-container/toast-container.component';
import { ConnectionModalComponent } from './shared/ui/connection-modal/connection-modal.component';
import { AppLoadingSkeletonComponent } from './shared/ui/app-loading-skeleton/app-loading-skeleton.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, ConnectionModalComponent, AppLoadingSkeletonComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  protected readonly connectionModalService = inject(ConnectionModalService);
  protected readonly authStore = inject(AuthStore);
  private readonly langService = inject(LanguageService); // Khởi tạo LanguageService
  private readonly authInitializer = inject(AuthInitializerService);

  ngOnInit(): void {
    // Gọi non-blocking: không chờ Promise resolve mới render
    // Auth guard đã tự chờ isAuthReady trước khi resolve route
    this.authInitializer.initialize();
  }
}
