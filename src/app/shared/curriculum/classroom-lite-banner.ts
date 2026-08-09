import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ClassroomLiteModeService } from '../../core/services/classroom-lite-mode.service';

/**
 * Persistent, app-session-wide banner for WRITE_FROZEN/FULL_OUTAGE (Slice 3
 * §7.1: "every screen in this slice keeps all reads... viewable; every
 * mutation control is disabled and a single persistent banner explains
 * why"). Placed at the top of each of the six curriculum screens. aria-live
 * region so the transition into either mode is announced even though it can
 * only ever be discovered reactively (see ClassroomLiteModeService).
 */
@Component({
  selector: 'app-classroom-lite-banner',
  standalone: true,
  imports: [MatIconModule],
  styles: [`
    .banner {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; border-radius: 8px; margin-bottom: 16px;
      font-size: 0.85rem; font-weight: 500;
    }
    .banner.frozen  { background: #fff8e1; color: #92400e; border: 1px solid #fde68a; }
    .banner.outage  { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    @media (prefers-reduced-motion: reduce) { .banner { transition: none; } }
  `],
  template: `
    <div aria-live="assertive" role="status">
      @if (mode.mode() === 'WRITE_FROZEN') {
        <div class="banner frozen">
          <mat-icon aria-hidden="true">pause_circle</mat-icon>
          <span>Curriculum is temporarily read-only. Changes are disabled; you can still view everything.</span>
        </div>
      } @else if (mode.mode() === 'FULL_OUTAGE') {
        <div class="banner outage">
          <mat-icon aria-hidden="true">error</mat-icon>
          <span>Curriculum is temporarily unavailable. Please try again shortly.</span>
        </div>
      }
    </div>
  `
})
export class ClassroomLiteBannerComponent {
  mode = inject(ClassroomLiteModeService);
}
