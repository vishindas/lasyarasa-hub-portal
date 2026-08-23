import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
import { AssignmentCapabilityStateService } from '../../core/services/assignment-capability-state.service';

/**
 * Fallback protection for direct URL entry -- link visibility is controlled
 * by AssignmentCapabilityStateService directly (sidebar.ts,
 * module-detail-panel.ts); this guard exists for someone typing an
 * assignments URL directly.
 *
 * Corrected four-state contract (architect correction pass, item 2):
 * - Disabled (loaded, not enabled, no outage): redirect to /dashboard.
 * - FULL_OUTAGE / unknown failure: let the route activate (return true) so
 *   AssignmentsShellComponent can render the established full-outage block
 *   or the distinct retryable error state IN PLACE, rather than navigating
 *   away -- redirecting would be indistinguishable from the disabled case,
 *   which the accepted contract explicitly treats differently.
 * - Loading: waits for resolution before deciding anything (no flash, no
 *   premature redirect).
 *
 * Triggers refresh() only if nothing has fetched yet this session
 * (loadState 'idle') -- normally ShellComponent's field-initializer has
 * already done this well before any route activates, so this rarely fires
 * and never issues a duplicate request when it doesn't (refresh() itself
 * de-duplicates an already-in-flight call).
 */
export const assignmentRouteGuard: CanActivateFn = () => {
  const capabilityState = inject(AssignmentCapabilityStateService);
  const router = inject(Router);

  if (capabilityState.loadState() === 'idle') {
    capabilityState.refresh();
  }

  return toObservable(capabilityState.loadState).pipe(
    filter(state => state === 'loaded' || state === 'error'),
    take(1),
    map(() => {
      if (capabilityState.enabled()) return true;
      if (capabilityState.unavailable()) return true; // outage or unknown failure -- shell renders in place
      router.navigate(['/dashboard']);
      return false;
    })
  );
};
