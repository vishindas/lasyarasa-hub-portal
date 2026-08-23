import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AssignmentCapabilityStateService } from '../../core/services/assignment-capability-state.service';
import { FullOutageBlockComponent } from '../../shared/curriculum/full-outage-block';

/**
 * Parent route for every features/assignments/** screen (Plan correction
 * pass item 2). Implements the three non-"enabled" branches of the
 * four-state capability contract in place, without a redirect:
 * - Loading: renders nothing extra, waits (no flash).
 * - FULL_OUTAGE: the established full-screen outage block (reused from
 *   Lesson Admin -- its copy is already generic, no assignment-specific
 *   wording needed).
 * - Unknown/network failure: a distinct retryable error state with a
 *   Retry action that calls AssignmentCapabilityStateService.refresh()
 *   directly -- no independent/duplicate capability request is issued.
 * The "disabled" case never reaches this component -- assignment-route.guard.ts
 * redirects to /dashboard before activation.
 */
@Component({
  selector: 'app-assignments-shell',
  standalone: true,
  imports: [RouterOutlet, MatButtonModule, FullOutageBlockComponent],
  styles: [`
    .retry-block {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; padding: 64px 24px; text-align: center; color: #6c757d; min-height: 320px;
    }
    .retry-block p { max-width: 420px; font-size: 0.9rem; margin: 0; }
    button[mat-stroked-button] { min-height: 44px; }
  `],
  template: `
    @if (capabilityState.isOutage()) {
      <app-full-outage-block />
    } @else if (capabilityState.unavailable()) {
      <div class="retry-block" role="status" aria-live="polite">
        <p>Could not confirm assignment access right now. This may be temporary.</p>
        <button mat-stroked-button type="button" (click)="capabilityState.refresh()">Retry</button>
      </div>
    } @else {
      <router-outlet />
    }
  `
})
export class AssignmentsShellComponent {
  capabilityState = inject(AssignmentCapabilityStateService);
}
