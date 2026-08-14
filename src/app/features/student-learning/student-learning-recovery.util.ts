import { Router } from '@angular/router';
import { CurriculumUiErrorKind } from '../../core/services/curriculum-api-error.util';

/**
 * The three distinct recovery destinations required by architect correction
 * 1 -- deliberately not one shared "go back" action. Centralized here once
 * so every Lesson/Module/Path/Info screen wires the same, correct behavior
 * instead of five slightly different reimplementations.
 *
 *   STUDENT_CONTEXT_UNAVAILABLE -> /my-students (the account lost access to
 *     this student entirely; there is no valid page left under this
 *     studentId to fall back to).
 *   CLASS_CONTEXT_UNAVAILABLE -> this student's Home/class selector (the
 *     student is still valid; only the class reference was bad/stale).
 *   LEARNING_CONTENT_NOT_FOUND -> the nearest valid parent screen already
 *     on the stack (module -> its class's Learning Path, lesson -> its
 *     module's detail, etc.) -- passed in by the caller since it is the one
 *     piece of context genuinely local to each screen.
 */
export function backLabelFor(kind: CurriculumUiErrorKind, parentLabel?: string): string | null {
  switch (kind) {
    case 'student-context-unavailable': return 'Back to My Students';
    case 'class-context-unavailable': return 'Back to Home';
    case 'learning-content-not-found': return parentLabel ? `Back to ${parentLabel}` : 'Back';
    default: return null;
  }
}

export function navigateForRecovery(router: Router, kind: CurriculumUiErrorKind, studentId: number, parentRoute?: unknown[]): void {
  switch (kind) {
    case 'student-context-unavailable':
      router.navigate(['/my-students']);
      return;
    case 'class-context-unavailable':
      router.navigate(['/my-students', studentId, 'home']);
      return;
    case 'learning-content-not-found':
      router.navigate(parentRoute ?? ['/my-students', studentId, 'home']);
      return;
  }
}
