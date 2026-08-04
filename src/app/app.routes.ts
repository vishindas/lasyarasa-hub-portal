import { Routes } from '@angular/router';
import { authGuard, clientGuard, nonClientGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register/:token',
    loadComponent: () => import('./features/register/register-page').then(m => m.RegisterPageComponent)
  },
  {
    path: 'accept-invitation',
    loadComponent: () => import('./features/accept-invitation/accept-invitation').then(m => m.AcceptInvitationComponent)
  },
  {
    path: 'my-students',
    loadComponent: () => import('./features/my-students/my-students').then(m => m.MyStudentsComponent),
    canActivate: [authGuard, clientGuard]
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then(m => m.ShellComponent),
    canActivate: [authGuard, nonClientGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'vidya-rasa',
        loadChildren: () => import('./features/vidya-rasa/vidya-rasa.routes').then(m => m.VIDYA_RASA_ROUTES)
      },
      {
        path: 'settings',
        loadChildren: () => import('./features/settings/settings.routes').then(m => m.SETTINGS_ROUTES)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];
