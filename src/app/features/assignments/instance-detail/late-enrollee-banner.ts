import { Component, OnChanges, input, output, signal, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AssignmentInstanceApiService } from '../../../core/services/assignment-instance-api.service';
import { AssignmentLateEnrolleeCandidateDTO } from '../../../core/models/assignment.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';
import { AssignmentMessageComponent } from '../../../shared/assignment/assignment-message';

/** T11 -- late-enrollee Issue/Skip. Discovery via GET .../late-enrollees; issue/skip are real actions, disabled during WRITE_FROZEN/FULL_OUTAGE. Issuing is never automatic. */
@Component({
  selector: 'app-late-enrollee-banner',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, AssignmentMessageComponent],
  styles: [`
    .banner { border: 1px solid #fde68a; background: #fffbeb; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
    .row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
    button[mat-stroked-button] { min-height: 44px; }
  `],
  template: `
    @if (candidates().length > 0) {
      <div class="banner">
        <p><mat-icon aria-hidden="true" style="vertical-align:middle;font-size:18px">person_add</mat-icon>
          {{ candidates().length }} student(s) have joined this class since this assignment was issued.</p>
        @for (c of candidates(); track c.studentId) {
          <div class="row">
            <span>{{ c.firstName }} {{ c.lastName }} (enrolled {{ c.enrollmentStartDate }})</span>
            <span>
              <button mat-stroked-button type="button" [disabled]="mutationsDisabled()" (click)="issue(c.studentId)">Issue</button>
              <button mat-stroked-button type="button" [disabled]="mutationsDisabled()" (click)="skip(c.studentId)">Skip</button>
            </span>
          </div>
        }
      </div>
    }
    <app-assignment-message [error]="error()" (reload)="load()" (retry)="load()" />
  `
})
export class LateEnrolleeBannerComponent implements OnChanges {
  instanceId = input.required<number>();
  mutationsDisabled = input(false);
  refreshed = output<void>();

  private api = inject(AssignmentInstanceApiService);
  candidates = signal<AssignmentLateEnrolleeCandidateDTO[]>([]);
  error = signal<AssignmentUiError | null>(null);

  ngOnChanges() { this.load(); }

  load() {
    this.error.set(null);
    this.api.lateEnrollees(this.instanceId()).subscribe({
      next: candidates => this.candidates.set(candidates),
      error: (err: HttpErrorResponse) => this.error.set(toAssignmentUiError(err))
    });
  }

  issue(studentId: number) {
    this.api.issue(this.instanceId(), studentId).subscribe({
      next: () => { this.load(); this.refreshed.emit(); },
      error: (err: HttpErrorResponse) => this.error.set(toAssignmentUiError(err))
    });
  }

  skip(studentId: number) {
    this.api.skip(this.instanceId(), studentId).subscribe({
      next: () => { this.load(); this.refreshed.emit(); },
      error: (err: HttpErrorResponse) => this.error.set(toAssignmentUiError(err))
    });
  }
}
