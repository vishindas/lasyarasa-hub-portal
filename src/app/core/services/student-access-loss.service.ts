import { Injectable, signal } from '@angular/core';

/**
 * Part III/VII.4's "lost student access" -- deliberately scoped per-student,
 * not a session-global flag (correction 10: "a distinct full-page state...
 * evaluated per the requested student (not a session-global flag)"). Set
 * reactively by student-learning-access.interceptor.ts when a
 * STUDENT_CONTEXT_UNAVAILABLE response names the student currently being
 * viewed -- there is deliberately no polled/pushed probe, matching the same
 * accepted pattern ClassroomLiteModeService already uses for FULL_OUTAGE.
 */
@Injectable({ providedIn: 'root' })
export class StudentAccessLossService {
  private readonly _lostAccessFor = signal<number | null>(null);
  readonly lostAccessFor = this._lostAccessFor.asReadonly();

  markLost(studentId: number): void {
    this._lostAccessFor.set(studentId);
  }

  /** Called on navigating to a different studentId -- a fresh route gets a fresh chance. */
  clear(): void {
    this._lostAccessFor.set(null);
  }
}
