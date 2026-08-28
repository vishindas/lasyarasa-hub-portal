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
    // Student Dashboard D1: new entry point, reachable only by direct URL
    // while studentLearningEntryEnabled is false -- no nav link points here
    // yet, same dormant-deployment pattern as /my-students/:studentId
    // below. Same guards; the backend's own flags/access checks fail
    // safely if reached without authorization.
    path: 'student-dashboard',
    loadComponent: () => import('./features/student-dashboard/entry/student-dashboard-entry').then(m => m.StudentDashboardEntryComponent),
    canActivate: [authGuard, clientGuard]
  },
  {
    // Slice 12: exists in the compiled bundle regardless of
    // studentLearningEntryEnabled -- the dormant-deployment gate (architect
    // decision 4) controls whether My Students exposes a normal entry
    // point into this subtree, not whether the subtree is reachable by
    // direct URL. Same guards as /my-students; the backend's own global
    // flag fails safely if reached while disabled.
    path: 'my-students/:studentId',
    loadComponent: () => import('./features/student-learning/student-learning-shell').then(m => m.StudentLearningShellComponent),
    canActivate: [authGuard, clientGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./features/student-learning/student-learning.routes').then(m => m.STUDENT_LEARNING_ROUTES)
      }
    ]
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
