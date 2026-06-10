import { ApplicationConfig, provideZoneChangeDetection, provideBrowserGlobalErrorListeners, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { importProvidersFrom } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
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
  Inbox,
  Languages,
  Sliders,
  Users,
  Plus,
  UserPlus,
  RefreshCw,
  PencilLine,
  Upload,
  Search,
  FileText,
  Trash2,
  CheckCircle2,
  FileCode,
  FolderOpen,
  Blocks,
  Tag,
  GitBranch,
  Timer,
  CircleAlert,
  UploadCloud,
  CloudUpload,
  File,
  Loader2,
  CircleHelp
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
  Inbox,
  Languages,
  Sliders,
  Users,
  Plus,
  UserPlus,
  RefreshCw,
  PencilLine,
  Upload,
  Search,
  FileText,
  Trash2,
  CheckCircle2,
  FileCode,
  FolderOpen,
  Blocks,
  Tag,
  GitBranch,
  Timer,
  CircleAlert,
  UploadCloud,
  CloudUpload,
  File,
  Loader2,
  CircleHelp
};

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { AuthInitializerService } from './core/services/auth-initializer.service';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { httpErrorInterceptor } from './core/services/api/http-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideAppInitializer(async () => {
      console.log('[AppConfig] App Initializer starting...');
      await inject(AuthInitializerService).initialize();
      console.log('[AppConfig] App Initializer finished.');
    }),
    importProvidersFrom(
      LucideAngularModule.pick(lucideIcons),
      TranslateModule.forRoot()
    ),
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json'
    })
  ]
};

