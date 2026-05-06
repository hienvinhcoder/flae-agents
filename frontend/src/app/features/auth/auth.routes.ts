import { Routes } from '@angular/router';
import { AuthContainerComponent } from './pages/auth-container.component';
import { LoginFormComponent } from './components/login-form.component';
import { RegisterFormComponent } from './components/register-form.component';

export const authRoutes: Routes = [
  { path: 'login', component: AuthContainerComponent, data: { mode: 'login' } },
  { path: 'register', component: AuthContainerComponent, data: { mode: 'register' } },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
