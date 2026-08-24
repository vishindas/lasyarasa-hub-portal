import { Routes } from '@angular/router';

export const STUDENT_ASSIGNMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./summary/student-assignment-summary').then(m => m.StudentAssignmentSummaryComponent)
  },
  {
    path: ':studentAssignmentId',
    loadComponent: () => import('./detail/student-assignment-detail').then(m => m.StudentAssignmentDetailComponent)
  },
  {
    path: ':studentAssignmentId/answer',
    loadComponent: () => import('./answer/student-assignment-answer').then(m => m.StudentAssignmentAnswerComponent)
  },
  {
    path: ':studentAssignmentId/review',
    loadComponent: () => import('./review/student-assignment-review').then(m => m.StudentAssignmentReviewComponent)
  },
  {
    path: ':studentAssignmentId/confirmed',
    loadComponent: () => import('./confirm/student-assignment-confirm').then(m => m.StudentAssignmentConfirmComponent)
  }
];
