import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AssignmentCapabilityApiService } from './assignment-capability-api.service';
import { AuthService } from '../auth/auth.service';
import { AssignmentCapabilityDTO } from '../models/assignment.model';

export type CapabilityLoadState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Single shared source of truth for "can this staff member currently use
 * the assignment feature" -- consumed identically by sidebar.ts,
 * module-detail-panel.ts, and assignment-route.guard.ts, none of which
 * issue their own HTTP call (Slice 15 Plan v2.1.2 §9).
 *
 * Initial load: this service's own constructor registers an effect that
 * watches AuthService.currentUser()?.providerId and calls refresh() as soon
 * as it transitions from absent to present (covers initial login/session
 * restore) or changes to a different value (covers a provider switch).
 * ShellComponent triggers this service's construction via a class field
 * initializer (private readonly capabilityState = inject(...)), mirroring
 * its existing currencyService field-injection pattern -- see shell.ts and
 * Plan §9.4. No ngOnInit() call is used or needed for this purpose.
 *
 * GET /capability is unaffected by WRITE_FROZEN (a safe method, per the
 * backend's ClassroomLiteOperatingModeInterceptor) and is blocked (503) only
 * by FULL_OUTAGE -- see Plan §3.5. isOutage() is set only for that specific
 * case; any other failure (network, unexpected 5xx) is classified as the
 * distinct "unknown" case via loadState === 'error' with isOutage() false.
 */
@Injectable({ providedIn: 'root' })
export class AssignmentCapabilityStateService {
  private api = inject(AssignmentCapabilityApiService);
  private auth = inject(AuthService);

  private readonly _loadState = signal<CapabilityLoadState>('idle');
  private readonly _capability = signal<AssignmentCapabilityDTO | null>(null);
  private readonly _outage = signal(false);

  private lastProviderId: number | null = null;

  readonly loadState = this._loadState.asReadonly();
  readonly enabled = computed(() => this._capability()?.effectiveEnabled === true);
  readonly isOutage = this._outage.asReadonly();
  /** Fail-closed UI signal: true for a confirmed outage OR an unresolved/unknown failure -- never treat "we don't know" as "assume enabled". */
  readonly unavailable = computed(() => this._outage() || this._loadState() === 'error');

  constructor() {
    effect(() => {
      const providerId = this.auth.currentUser()?.providerId ?? null;
      if (providerId !== this.lastProviderId) {
        this.lastProviderId = providerId;
        if (providerId != null) {
          this.refresh();
        }
      }
    });
  }

  /** Fetches current capability. De-duplicated: a call made while one is already in flight is a no-op -- callers read the shared signals, not a return value. */
  refresh(): void {
    if (this._loadState() === 'loading') return;
    this._loadState.set('loading');
    this.api.get().subscribe({
      next: dto => {
        this._capability.set(dto);
        this._outage.set(false);
        this._loadState.set('loaded');
      },
      error: (err: HttpErrorResponse) => {
        this._capability.set(null);
        this._outage.set(err.status === 503);
        this._loadState.set('error');
      }
    });
  }
}
