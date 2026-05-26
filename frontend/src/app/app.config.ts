import { ApplicationConfig, provideZoneChangeDetection, provideBrowserGlobalErrorListeners, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { importProvidersFrom } from '@angular/core';
import { 
  LucideAngularModule,
  Sun,
  MessageSquare,
  Bot,
  BookOpen,
  BarChart2,
  PhoneCall,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
  Menu,
  Sparkles,
  ChevronDown,
  Check,
  Clock,
  TrendingUp,
  MessageCircle,
  CircleCheck,
  AlertTriangle,
  Phone,
  Bell,
  ExternalLink,
  ArrowRight,
  PlusCircle,
  Cpu,
  TrendingDown,
  Database,
  ChevronUp,
  Send,
  Eye,
  Wrench,
  CheckCircle,
  ListChecks,
  Inbox
} from 'lucide-angular';

const lucideIcons = {
  Sun,
  MessageSquare,
  Bot,
  BookOpen,
  BarChart2,
  PhoneCall,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
  Menu,
  Sparkles,
  ChevronDown,
  Check,
  Clock,
  TrendingUp,
  MessageCircle,
  CircleCheck,
  AlertTriangle,
  Phone,
  Bell,
  ExternalLink,
  ArrowRight,
  PlusCircle,
  Cpu,
  TrendingDown,
  Database,
  ChevronUp,
  Send,
  Eye,
  Wrench,
  CheckCircle,
  ListChecks,
  Inbox
};

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { AuthInitializerService } from './core/services/auth-initializer.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideAppInitializer(() => inject(AuthInitializerService).initialize()),
    importProvidersFrom(LucideAngularModule.pick(lucideIcons))
  ]
};

