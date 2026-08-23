import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AssignmentUiError } from '../../core/services/assignment-api-error.util';

/**
 * Assignment-domain equivalent of shared/curriculum/curriculum-message.ts.
 * write-frozen/full-outage are never rendered here -- AssignmentModeBannerComponent
 * is the single persistent banner for those two (Plan correction pass §1/§6).
 * stale-version gets a blocking Reload action; unknown gets Retry;
 * validation/not-found/idempotency-conflict render inline with no action
 * (validation is field-level, surfaced by the caller; not-found/
 * idempotency-conflict are terminal for that attempt).
 */
@Component({
  selector: 'app-assignment-message',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  styles: [`
    .msg {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 10px 14px; border-radius: 8px; margin: 8px 0;
      font-size: 0.85rem;
    }
    .msg-text { display: flex; align-items: center; gap: 8px; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    .stale-version, .illegal-transition { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .validation { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .not-found, .idempotency-conflict { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .unknown { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  `],
  template: `
    @if (error(); as e) {
      @if (e.kind !== 'write-frozen' && e.kind !== 'full-outage') {
        <div class="msg {{ e.kind }}" aria-live="assertive" role="status">
          <span class="msg-text">
            <mat-icon aria-hidden="true">{{ iconFor(e.kind) }}</mat-icon>
            {{ e.message }}
          </span>
          @if (e.kind === 'stale-version' || e.kind === 'illegal-transition') {
            <button mat-stroked-button type="button" (click)="reload.emit()">Reload</button>
          } @else if (e.kind === 'unknown') {
            <button mat-stroked-button type="button" (click)="retry.emit()">Retry</button>
          }
        </div>
      }
    }
  `
})
export class AssignmentMessageComponent {
  error = input<AssignmentUiError | null>(null);
  reload = output<void>();
  retry = output<void>();

  iconFor(kind: AssignmentUiError['kind']): string {
    switch (kind) {
      case 'stale-version': return 'sync_problem';
      case 'illegal-transition': return 'block';
      case 'validation': return 'error_outline';
      case 'not-found': return 'search_off';
      case 'idempotency-conflict': return 'report_problem';
      default: return 'error_outline';
    }
  }
}
