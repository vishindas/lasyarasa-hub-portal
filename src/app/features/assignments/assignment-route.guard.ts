import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
import { AssignmentCapabilityStateService } from '../../core/services/assignment-capability-state.service';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Fallback protection for direct URL entry -- link visibility is controlled
 * by AssignmentCapabilityStateService directly (sidebar.ts,
 * module-detail-panel.ts); this guard exists for someone typing an
 * assignments URL directly. Per Plan v2.1.1 §8.2: "The route guard protects
 * direct URLs; the shared state controls link visibility."
 *
 * Triggers refresh() only if nothing has fetched yet this session
 * (loadState 'idle') -- normally ShellComponent's field-initializer (§9.4)
 * has already done this well before any route activates. Fails closed:
 * disabled, full-outage, and unknown/network-failure all redirect away
 * rather than letting the route through on an unresolved answer.
 */
export const assignmentRouteGuard: CanActivateFn = () => {
  const capabilityState = inject(AssignmentCapabilityStateService);
  const router = inject(Router);
  const snack = inject(MatSnackBar);

  if (capabilityState.loadState() === 'idle') {
    capabilityState.refresh();
  }

  return toObservable(capabilityState.loadState).pipe(
    filter(state => state === 'loaded' || state === 'error'),
    take(1),
    map(() => {
      if (capabilityState.enabled()) return true;
      if (capabilityState.isOutage()) {
        snack.open('Assignments are temporarily unavailable.', 'OK', { duration: 4000 });
      } else if (capabilityState.unavailable()) {
        snack.open('Could not confirm assignment access right now. Please try again.', 'OK', { duration: 4000 });
      }
      router.navigate(['/dashboard']);
      return false;
    })
  );
};
