import { Injectable, computed, signal } from '@angular/core';

export type ClassroomLiteMode = 'NORMAL' | 'WRITE_FROZEN' | 'FULL_OUTAGE';

/**
 * App-session-wide curriculum operating-mode signal. There is no backend
 * mode-probe endpoint by design (accepted amendment, point 5) -- this can
 * only ever be set reactively, from a rejected request the
 * curriculumModeInterceptor observed. Known, accepted limitation: on a
 * fresh session the app cannot know WRITE_FROZEN is active until the first
 * mutation is rejected with 423; reads are unaffected throughout, and once
 * set, the mode persists for the rest of the session.
 */
@Injectable({ providedIn: 'root' })
export class ClassroomLiteModeService {
  private readonly _mode = signal<ClassroomLiteMode>('NORMAL');

  readonly mode = this._mode.asReadonly();
  readonly mutationsDisabled = computed(() => this._mode() !== 'NORMAL');

  setWriteFrozen(): void {
    if (this._mode() === 'NORMAL') this._mode.set('WRITE_FROZEN');
  }

  setFullOutage(): void {
    this._mode.set('FULL_OUTAGE');
  }
}
