import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CurriculumUiError } from '../../core/services/curriculum-api-error.util';

/**
 * Inline message for the four non-mode error kinds (approved amendment,
 * point 2): conflict (STALE_VERSION, with Reload), illegal-transition
 * (action-specific message + refresh, not "updated elsewhere"), validation
 * (field-level message shown separately by the caller when a field is
 * identifiable -- this renders the form-level summary case), not-found, and
 * the generic unknown/retryable fallback. aria-live so screen-reader users
 * hear the outcome of the action they just took, not just sighted users.
 * write-frozen/full-outage are deliberately never rendered here even if
 * passed in -- ClassroomLiteBannerComponent is the single persistent
 * banner Slice 3 requires for those two; duplicating the message locally
 * on every failed action would contradict "a single persistent banner."
 */
@Component({
  selector: 'app-curriculum-message',
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
    .conflict, .illegal-transition { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .validation { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .not-found  { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .unknown    { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  `],
  template: `
    <!-- write-frozen/full-outage are exclusively owned by the persistent global banner (ClassroomLiteBannerComponent) -- never duplicated here. -->
    @if (error(); as e) {
      @if (e.kind !== 'write-frozen' && e.kind !== 'full-outage') {
        <div class="msg {{ e.kind }}" aria-live="polite" role="status">
          <span class="msg-text">
            <mat-icon aria-hidden="true">{{ iconFor(e.kind) }}</mat-icon>
            {{ e.message }}
          </span>
          @if (e.kind === 'conflict' || e.kind === 'illegal-transition') {
            <button mat-stroked-button type="button" (click)="reload.emit()">Reload</button>
          } @else if (e.kind === 'unknown') {
            <button mat-stroked-button type="button" (click)="retry.emit()">Retry</button>
          }
        </div>
      }
    }
  `
})
export class CurriculumMessageComponent {
  error = input<CurriculumUiError | null>(null);
  reload = output<void>();
  retry = output<void>();

  iconFor(kind: CurriculumUiError['kind']): string {
    switch (kind) {
      case 'conflict': return 'sync_problem';
      case 'illegal-transition': return 'block';
      case 'validation': return 'error_outline';
      case 'not-found': return 'search_off';
      default: return 'error_outline';
    }
  }
}
