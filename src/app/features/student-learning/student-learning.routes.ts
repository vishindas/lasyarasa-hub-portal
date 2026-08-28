import { Routes } from '@angular/router';

/**
 * Part VIII.1's route table, adopted with one necessary change: nested
 * under the app's real CLIENT entry point (/my-students) instead of the
 * design doc's standalone /students root, since /my-students is where
 * clientGuard already lives (see the corrected plan §1 for the full
 * rationale). Every route below inherits authGuard+clientGuard from the
 * parent registration in app.routes.ts.
 *
 * No route guard inspects "is the class ambiguous" -- by construction,
 * nothing in this feature ever generates a link into
 * classes/:classId/path|modules/... with a guessed classId: Home only
 * links into a concrete class when exactly one is active or one was
 * already explicitly chosen, and Class Picker is the only place that
 * picks a classId when 2+ exist. A stale/hand-typed classId in the URL is
 * handled correctly regardless, by the backend's own CLASS_CONTEXT_UNAVAILABLE.
 */
export const STUDENT_LEARNING_ROUTES: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/student-learning-home').then(m => m.StudentLearningHomeComponent)
  },
  {
    // Student Dashboard D1 foundation: nested here (not a standalone route)
    // so it inherits this shell's student switcher, class-context bar, and
    // FULL_OUTAGE/offline/lost-access handling for free -- no second
    // shell/authorization layer.
    path: 'dashboard',
    loadComponent: () => import('../student-dashboard/overview/student-dashboard-overview').then(m => m.StudentDashboardOverviewComponent)
  },
  {
    path: 'classes',
    loadComponent: () => import('./class-picker/class-picker').then(m => m.ClassPickerComponent)
  },
  {
    path: 'classes/:classId/path',
    loadComponent: () => import('./learning-path/learning-path').then(m => m.LearningPathComponent)
  },
  {
    path: 'classes/:classId/modules/:moduleId',
    loadComponent: () => import('./module-detail/module-detail').then(m => m.ModuleDetailComponent)
  },
  {
    path: 'classes/:classId/modules/:moduleId/lessons/:lessonId',
    loadComponent: () => import('./lesson-detail/lesson-detail').then(m => m.LessonDetailComponent)
  },
  {
    // Slice 16: real assignment feature, under its own approved
    // features/student-assignments/** directory (answer-key isolation
    // boundary, scripts/check-assignment-import-boundary.mjs) -- replaces
    // the Slice 12 placeholder that lived at ./assignments/assignment-summary.
    path: 'assignments',
    loadChildren: () => import('../student-assignments/student-assignments.routes').then(m => m.STUDENT_ASSIGNMENTS_ROUTES)
  },
  {
    path: 'classes/:classId/updates',
    loadComponent: () => import('./updates/updates').then(m => m.UpdatesComponent)
  },
  {
    path: 'classes/:classId/class-info',
    loadComponent: () => import('./class-info/class-info').then(m => m.ClassInfoComponent)
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' }
];
