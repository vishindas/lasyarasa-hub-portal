import { Component, OnChanges, input, output, signal, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AssignmentInstanceApiService } from '../../../core/services/assignment-instance-api.service';
import { AssignmentLateEnrolleeCandidateDTO } from '../../../core/models/assignment.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';

/** T11 -- late-enrollee Issue/Skip. Discovery via GET .../late-enrollees; issue/skip are real actions. Issuing is never automatic. */
@Component({
  selector: 'app-late-enrollee-banner',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  styles: [`
    .banner { border: 1px solid #fde68a; background: #fffbeb; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
    .row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
    button[mat-stroked-button] { min-height: 40px; }
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
              <button mat-stroked-button type="button" (click)="issue(c.studentId)">Issue</button>
              <button mat-stroked-button type="button" (click)="skip(c.studentId)">Skip</button>
            </span>
          </div>
        }
      </div>
    }
    @if (error()) { <p style="color:#b91c1c">{{ error()!.message }}</p> }
  `
})
export class LateEnrolleeBannerComponent implements OnChanges {
  instanceId = input.required<number>();
  refreshed = output<void>();

  private api = inject(AssignmentInstanceApiService);
  candidates = signal<AssignmentLateEnrolleeCandidateDTO[]>([]);
  error = signal<AssignmentUiError | null>(null);

  ngOnChanges() { this.load(); }

  load() {
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
