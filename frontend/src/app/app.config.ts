import { ApplicationConfig, provideZoneChangeDetection, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { importProvidersFrom } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { 
  LucideAngularModule,
  // Root-level icons: Toast, ConnectionModal, general UI
  X,
  AlertTriangle,
  CircleCheck,
  Bell,
  RefreshCw,
  LoaderCircle,
} from 'lucide-angular';

/**
 * Icons dùng ở root level (Toast, ConnectionModal).
 * Các icons khác được import tại component/feature tương ứng.
 */
const rootIcons = {
  X,
  AlertTriangle,
  CircleCheck,
  Bell,
  RefreshCw,
  LoaderCircle,
};

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { httpErrorInterceptor } from './core/services/api/http-error.interceptor';
import { authInterceptor } from './core/services/api/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor, httpErrorInterceptor])),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    // AuthInitializerService giờ được gọi non-blocking từ AppComponent
    // thay vì blocking qua provideAppInitializer
    importProvidersFrom(
      LucideAngularModule.pick(rootIcons),
      TranslateModule.forRoot()
    ),
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json'
    })
  ]
};
