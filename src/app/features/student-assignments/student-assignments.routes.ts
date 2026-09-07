import { Routes } from '@angular/router';

// UX-7A: hideClassContext mirrors the exact mechanism student-fees' own
// routes already use (see student-learning.routes.ts's 'fees'/'fees/history'
// entries and student-learning-shell.ts's computeHideClassContext()) --
// Assignments is student-wide, not filtered by the selected class, so the
// persistent class-context bar is just as misleading here as it was on
// Fees before UX-6. Set individually on every leaf route below, not once
// on the parent 'assignments' mount in student-learning.routes.ts: the
// app's paramsInheritanceStrategy is 'emptyOnly', so a non-empty-path
// child (':studentAssignmentId', '.../answer', etc.) would not inherit
// route `data` from an ancestor.
// Presentation-only: does not touch StudentLearningContextService, so a
// previously selected class is untouched and reappears on any class-scoped
// screen visited afterward.
//
// UX-7D: the bare '' (Summary/To Do) leaf that used to live here moved out
// to its own top-level 'todo' route in student-learning.routes.ts, with a
// pathMatch: 'full' redirect from bare 'assignments' to 'todo' for
// backward compatibility -- that redirect intercepts a bare /assignments
// request before it ever reaches this loadChildren mount, so there is no
// '' route here to remove a duplicate of. Everything below (Assignment
// Detail/Answer/Review/Confirm, and Assignment Activity at 'history')
// stays under this 'assignments' mount unchanged -- all still genuinely
// assignment-specific, not generic To Do concepts.
export const STUDENT_ASSIGNMENTS_ROUTES: Routes = [
  {
    // UX-7D: the secondary "Assignment Activity" destination (Awaiting
    // validation + History) for the now-generic To Do inbox. Placed
    // BEFORE the ':studentAssignmentId' route below deliberately --
    // Angular matches sibling routes in array order, and 'history' is a
    // literal segment that would otherwise be swallowed by that route's
    // wildcard param (a request for /assignments/history would try to
    // load assignment id "history", not this screen, if the order were
    // reversed).
    path: 'history',
    loadComponent: () => import('./activity/student-assignment-activity').then(m => m.StudentAssignmentActivityComponent),
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
