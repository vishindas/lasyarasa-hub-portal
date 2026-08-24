import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';

/**
 * WRITE_FROZEN only -- FULL_OUTAGE is already handled by
 * StudentLearningShellComponent (app-full-outage-block, suppresses
 * everything below it), so this banner never needs to render it. Same
 * shared, session-wide ClassroomLiteModeService the staff assignment
 * screens and the student-learning shell both already key off.
 */
@Component({
  selector: 'app-student-assignment-mode-banner',
  standalone: true,
  imports: [MatIconModule],
  styles: [`
    .banner {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; border-radius: 8px; margin-bottom: 16px;
      font-size: 0.85rem; font-weight: 500;
      background: #fff8e1; color: #7A5419; border: 1px solid #E3DCC8;
    }
    mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    @media (prefers-reduced-motion: reduce) { .banner { transition: none; } }
  `],
  template: `
    @if (mode.mode() === 'WRITE_FROZEN') {
      <div class="banner" role="status" aria-live="assertive">
        <mat-icon aria-hidden="true">pause_circle</mat-icon>
        <span>Reading remains available; writing is paused while learning is read-only.</span>
      </div>
    }
  `
})
export class StudentAssignmentModeBannerComponent {
  mode = inject(ClassroomLiteModeService);
}
