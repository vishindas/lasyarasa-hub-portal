import { Routes } from '@angular/router';

// UX-7A: hideClassContext mirrors the exact mechanism student-fees' own
// routes already use (see student-learning.routes.ts's 'fees'/'fees/history'
// entries and student-learning-shell.ts's computeHideClassContext()) --
// Assignments is student-wide, not filtered by the selected class, so the
// persistent class-context bar is just as misleading here as it was on
// Fees before UX-6. Set individually on all five leaf routes below, not
// once on the parent 'assignments' mount in student-learning.routes.ts:
// the app's paramsInheritanceStrategy is 'emptyOnly', so a non-empty-path
// child (':studentAssignmentId', '.../answer', etc.) would not inherit
// route `data` from an ancestor -- only the '' (Summary) leaf would.
// Presentation-only: does not touch StudentLearningContextService, so a
// previously selected class is untouched and reappears on any class-scoped
// screen visited afterward.
export const STUDENT_ASSIGNMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./summary/student-assignment-summary').then(m => m.StudentAssignmentSummaryComponent),
    data: { hideClassContext: true }
  },
  {
    path: ':studentAssignmentId',
    loadComponent: () => import('./detail/student-assignment-detail').then(m => m.StudentAssignmentDetailComponent),
    data: { hideClassContext: true }
  },
  {
    path: ':studentAssignmentId/answer',
    loadComponent: () => import('./answer/student-assignment-answer').then(m => m.StudentAssignmentAnswerComponent),
    data: { hideClassContext: true }
  },
  {
    path: ':studentAssignmentId/review',
    loadComponent: () => import('./review/student-assignment-review').then(m => m.StudentAssignmentReviewComponent),
    data: { hideClassContext: true }
  },
  {
    path: ':studentAssignmentId/confirmed',
    loadComponent: () => import('./confirm/student-assignment-confirm').then(m => m.StudentAssignmentConfirmComponent),
    data: { hideClassContext: true }
  }
];
