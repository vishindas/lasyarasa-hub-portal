import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StudentAssignmentUiError } from '../data-access/student-assignment-ui-error.util';

/**
 * Ivory/black/gold-styled inline message, mirroring
 * shared/curriculum/curriculum-message.ts's structure/behavior for the
 * student-assignment domain's own error kinds. write-frozen/full-outage
 * are deliberately never rendered here: FULL_OUTAGE is handled by the
 * shell (app-full-outage-block, above everything); WRITE_FROZEN gets its
 * own small inline banner (see StudentAssignmentModeBannerComponent)
 * rather than being duplicated per action here.
 */
@Component({
  selector: 'app-student-assignment-message',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  styles: [`
    .msg {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 10px 14px; border-radius: 8px; margin: 8px 0; font-size: 0.85rem;
      border: 1px solid #E3DCC8; background: #F3EEDE; color: #1C1A16;
    }
    .msg-text { display: flex; align-items: center; gap: 8px; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; color: #A3762C; }
    .msg.error mat-icon { color: #991b1b; }
    .msg.error { border-color: #f5c6c6; background: #fdf1f1; color: #7a1f1f; }
    button { min-height: 44px; }
  `],
  template: `
    @if (error(); as e) {
      @if (e.kind !== 'write-frozen' && e.kind !== 'full-outage') {
        <div class="msg" [class.error]="e.kind === 'validation' || e.kind === 'unknown'" role="alert" aria-live="assertive">
          <span class="msg-text">
            <mat-icon aria-hidden="true">{{ iconFor(e.kind) }}</mat-icon>
            {{ e.message }}
          </span>
          @if (e.kind === 'stale-version' || e.kind === 'draft-conflict' || e.kind === 'illegal-transition') {
            <button mat-stroked-button type="button" (click)="reload.emit()">Reload</button>
          } @else if (e.kind === 'not-found' || e.kind === 'feature-unavailable') {
            @if (backLabel()) {
              <button mat-stroked-button type="button" (click)="back.emit()">{{ backLabel() }}</button>
            }
          } @else {
            <button mat-stroked-button type="button" (click)="retry.emit()">Retry</button>
          }
        </div>
      }
    }
  `
})
export class StudentAssignmentMessageComponent {
  error = input<StudentAssignmentUiError | null>(null);
  backLabel = input<string | null>(null);
  reload = output<void>();
  retry = output<void>();
  back = output<void>();

  iconFor(kind: StudentAssignmentUiError['kind']): string {
    switch (kind) {
      case 'stale-version': return 'sync_problem';
      case 'draft-conflict': return 'sync_problem';
      case 'illegal-transition': return 'block';
      case 'validation': return 'error_outline';
      case 'not-found': return 'search_off';
      case 'feature-unavailable': return 'search_off';
      default: return 'error_outline';
    }
  }
}
