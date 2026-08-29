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
    // D6: /my-students now loads the promoted StudentDashboardEntryComponent
    // (previously only reachable via the separate, unlinked /student-dashboard
    // direct URL) -- same URL as before, so login.ts's CLIENT redirect and
    // nonClientGuard's CLIENT redirect both keep working unchanged. The
    // retired MyStudentsComponent's dormant-gate contract (inert cards while
    // studentLearningEntryEnabled is false) is preserved inside the promoted
    // component itself, not lost in this swap -- see its own doc comment.
    path: 'my-students',
    loadComponent: () => import('./features/student-dashboard/entry/student-dashboard-entry').then(m => m.StudentDashboardEntryComponent),
    canActivate: [authGuard, clientGuard]
  },
  {
    // D6: retired as its own URL now that its component is promoted to
    // /my-students directly -- kept as a redirect only in case anything
    // still has this direct URL bookmarked from the D1-D5 pilot period.
    path: 'student-dashboard',
    redirectTo: 'my-students'
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
