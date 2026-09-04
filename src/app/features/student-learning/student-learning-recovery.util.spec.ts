import { vi } from 'vitest';
import { backLabelFor, navigateForRecovery } from './student-learning-recovery.util';

describe('backLabelFor (architect correction 1: three distinct recovery labels)', () => {
  it('student-context-unavailable -> "Back to My Students"', () => {
    expect(backLabelFor('student-context-unavailable')).toBe('Back to My Students');
  });

  it('class-context-unavailable -> "Back to Dashboard"', () => {
    expect(backLabelFor('class-context-unavailable')).toBe('Back to Dashboard');
  });

  it('learning-content-not-found -> a parent-scoped label when a parent is named', () => {
    expect(backLabelFor('learning-content-not-found', 'Curriculum Overview')).toBe('Back to Curriculum Overview');
  });

  it('learning-content-not-found -> a generic "Back" when no parent is named', () => {
    expect(backLabelFor('learning-content-not-found')).toBe('Back');
  });

  it('the three labels are pairwise distinct', () => {
    const labels = [
      backLabelFor('student-context-unavailable'),
      backLabelFor('class-context-unavailable'),
      backLabelFor('learning-content-not-found')
    ];
    expect(new Set(labels).size).toBe(3);
  });

  it('returns null for kinds outside the three typed Slice 11 errors', () => {
    expect(backLabelFor('unknown')).toBeNull();
    expect(backLabelFor('conflict')).toBeNull();
  });
});

describe('navigateForRecovery', () => {
  it('routes student-context-unavailable to /my-students', () => {
    const router = { navigate: vi.fn() } as unknown as import('@angular/router').Router;
    navigateForRecovery(router, 'student-context-unavailable', 42);
    expect(router.navigate).toHaveBeenCalledWith(['/my-students']);
  });

  it('routes class-context-unavailable to the student dashboard, not a nested route', () => {
    const router = { navigate: vi.fn() } as unknown as import('@angular/router').Router;
    navigateForRecovery(router, 'class-context-unavailable', 42);
    expect(router.navigate).toHaveBeenCalledWith(['/my-students', 42, 'dashboard']);
  });

  it('routes learning-content-not-found to the supplied parent route when given', () => {
    const router = { navigate: vi.fn() } as unknown as import('@angular/router').Router;
    navigateForRecovery(router, 'learning-content-not-found', 42, ['/my-students', 42, 'classes', 7, 'path']);
    expect(router.navigate).toHaveBeenCalledWith(['/my-students', 42, 'classes', 7, 'path']);
  });

  it('routes learning-content-not-found to student dashboard when no parent route is supplied', () => {
    const router = { navigate: vi.fn() } as unknown as import('@angular/router').Router;
    navigateForRecovery(router, 'learning-content-not-found', 42);
    expect(router.navigate).toHaveBeenCalledWith(['/my-students', 42, 'dashboard']);
  });
});
