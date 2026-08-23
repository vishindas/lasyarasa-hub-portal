import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SubmissionQueueEntryDTO } from '../../../core/models/assignment.model';

@Component({
  selector: 'app-submission-queue-row',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule],
  styles: [`
    .row { display: flex; align-items: center; justify-content: space-between; padding: 12px 4px; border-bottom: 1px solid #eee; gap: 12px; }
    .titles { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .sub { color: #6c757d; font-size: 0.82rem; }
  `],
  template: `
    <div class="row">
      <div class="titles">
        <span>{{ entry().firstName }} {{ entry().lastName }} <span class="sub">— attempt {{ entry().attemptNumber }}</span></span>
        <span class="sub">{{ entry().templateTitle }} · {{ entry().className }} · submitted {{ entry().submittedAt | date: 'medium' }}</span>
      </div>
      <button mat-stroked-button type="button" (click)="open.emit(entry().studentAssignmentId)">
        Review <mat-icon aria-hidden="true">arrow_forward</mat-icon>
      </button>
    </div>
  `
})
export class SubmissionQueueRowComponent {
  entry = input.required<SubmissionQueueEntryDTO>();
  open = output<number>();
}
