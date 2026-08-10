import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Route-independent, full-screen FULL_OUTAGE state (Slice 7 §7.3): "Every
 * Lesson Admin route... is replaced by a single full-screen outage state:
 * no lesson title, content, status or metadata is rendered anywhere on
 * screen" -- materially stronger than WRITE_FROZEN, which keeps every read
 * viewable behind ClassroomLiteBannerComponent's persistent banner. Slice 7
 * is the first Classroom Lite slice to require modeling this explicitly, so
 * this is new shared infrastructure (not a Slice 6 reuse) -- scoped to
 * Lesson Admin's three screens only; Slice 6's own screens are unmodified
 * and unaddressed by this component.
 *
 * Names no cause beyond a generic, non-alarming message and offers no
 * retry action that could mask an unsafe read -- it clears automatically
 * once the mode is lifted upstream (ClassroomLiteModeService has no manual
 * reset; the next successful read implicitly un-freezes the UI once the
 * backend mode itself changes).
 */
@Component({
  selector: 'app-full-outage-block',
  standalone: true,
  imports: [MatIconModule],
  styles: [`
    .outage {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; padding: 64px 24px; text-align: center; color: #6c757d;
      min-height: 320px;
    }
    mat-icon { font-size: 40px; width: 40px; height: 40px; color: #adb5bd; }
    .outage p { max-width: 420px; font-size: 0.9rem; margin: 0; }
    @media (prefers-reduced-motion: reduce) { .outage { transition: none; } }
  `],
  template: `
    <div class="outage" role="status" aria-live="polite">
      <mat-icon aria-hidden="true">cloud_off</mat-icon>
      <p>This is temporarily unavailable. Please check back shortly.</p>
    </div>
  `
})
export class FullOutageBlockComponent {}
