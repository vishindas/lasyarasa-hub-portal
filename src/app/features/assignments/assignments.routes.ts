import { Routes } from '@angular/router';
import { assignmentRouteGuard } from './assignment-route.guard';

export const ASSIGNMENTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [assignmentRouteGuard],
    children: [
      { path: '', loadComponent: () => import('./template-list/template-list').then(m => m.TemplateListComponent) },
      { path: 'templates/:templateId', loadComponent: () => import('./template-editor/template-editor').then(m => m.TemplateEditorComponent) },
      { path: 'instances', loadComponent: () => import('./instance-list/instance-list').then(m => m.InstanceListComponent) },
      { path: 'instances/:instanceId', loadComponent: () => import('./instance-detail/instance-detail').then(m => m.InstanceDetailComponent) },
      { path: 'submissions', loadComponent: () => import('./submission-queue/submission-queue').then(m => m.SubmissionQueueComponent) },
      { path: 'submissions/:studentAssignmentId', loadComponent: () => import('./submission-detail/submission-detail').then(m => m.SubmissionDetailComponent) }
    ]
  }
];
