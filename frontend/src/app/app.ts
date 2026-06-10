import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './core/services/language.service';
import { ConnectionModalService } from './core/services/connection-modal.service';
import { ToastContainerComponent } from './shared/ui/toast-container/toast-container.component';
import { ConnectionModalComponent } from './shared/ui/connection-modal/connection-modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, ConnectionModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
  protected readonly connectionModalService = inject(ConnectionModalService);
  private readonly langService = inject(LanguageService); // Khởi tạo LanguageService
}

