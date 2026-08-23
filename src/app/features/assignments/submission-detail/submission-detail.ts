import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssignmentSubmissionReviewApiService } from '../data-access/assignment-submission-review-api.service';
import { StaffSubmissionDetailDTO } from '../data-access/assignment-staff.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { AssignmentModeBannerComponent } from '../../../shared/assignment/assignment-mode-banner';
import { AssignmentMessageComponent } from '../../../shared/assignment/assignment-message';
import { FullOutageBlockComponent } from '../../../shared/curriculum/full-outage-block';
import { AttemptHistoryPanelComponent } from './attempt-history-panel';
import { RequestRevisionDialog, RequestRevisionDialogResult } from './request-revision-dialog';

/**
 * T13/T14/T15/T16. currentAttemptId/rowVersion from THIS freshly-loaded
 * detail response are the only source ever used for
 * expectedAttemptId/expectedRowVersion on Validate/Request-Revision --
 * never a value cached from the queue row. Any STALE_VERSION/
 * ASSIGNMENT_STALE failure on either action surfaces the blocking
 * stale-conflict banner with a Reload action that re-fetches this
 * authoritative detail (discarding any local unsaved state) rather than
 * silently retrying the mutation.
 */
@Component({
  selector: 'app-submission-detail',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, AssignmentModeBannerComponent, AssignmentMessageComponent, FullOutageBlockComponent, AttemptHistoryPanelComponent],
  styles: [`
    .page-header { display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
    .meta { color: #6c757d; margin-bottom: 16px; }
    .actions { display: flex; gap: 8px; margin: 16px 0; }
    .empty { color: #adb5bd; padding: 32px 0; }
    button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }
  `],
  template: `
    <div class="page-header">
      <button mat-icon-button (click)="close()" aria-label="Back to queue"><mat-icon>arrow_back</mat-icon></button>
      <h2 style="margin:0">Submission</h2>
    </div>

    @if (mode.mode() === 'FULL_OUTAGE') {
      <app-full-outage-block />
    } @else {
      <app-assignment-mode-banner />

      @if (loading()) {
        <p class="empty">Loading…</p>
      } @else if (loadError()) {
        <app-assignment-message [error]="loadError()" (reload)="load()" (retry)="load()" />
      } @else if (detail(); as d) {
        <p class="meta">{{ d.firstName }} {{ d.lastName }} · {{ d.templateTitle }} · {{ d.className }} · status {{ d.status }}</p>

        <app-assignment-message [error]="actionError()" (reload)="load()" (retry)="load()" />

        @if (d.status === 'SUBMITTED') {
          <div class="actions">
            <button mat-flat-button color="primary" type="button" [disabled]="mode.mutationsDisabled()" (click)="validate(d)">Validate</button>
            <button mat-stroked-button color="warn" type="button" [disabled]="mode.mutationsDisabled()" (click)="requestRevision(d)">Request Revision</button>
          </div>
        }

        <app-attempt-history-panel [questions]="d.questions" [attemptHistory]="d.attemptHistory" />
      }
    }
  `
})
export class SubmissionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(AssignmentSubmissionReviewApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  mode = inject(ClassroomLiteModeService);

  studentAssignmentId = signal<number | null>(null);
  detail = signal<StaffSubmissionDetailDTO | null>(null);
  loading = signal(true);
  loadError = signal<AssignmentUiError | null>(null);
  actionError = signal<AssignmentUiError | null>(null);

  ngOnInit() {
    this.studentAssignmentId.set(Number(this.route.snapshot.paramMap.get('studentAssignmentId')));
    this.load();
  }

  load() {
    const id = this.studentAssignmentId();
    if (id == null) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.actionError.set(null);
    this.api.getDetail(id).subscribe({
      next: d => { this.detail.set(d); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.loadError.set(toAssignmentUiError(err)); this.loading.set(false); }
    });
  }

  validate(d: StaffSubmissionDetailDTO) {
    this.api.validate(d.studentAssignmentId, { expectedRowVersion: d.rowVersion, expectedAttemptId: d.currentAttemptId }).subscribe({
      next: () => { this.snack.open('Validated', 'OK', { duration: 2500 }); this.load(); },
      error: (err: HttpErrorResponse) => this.actionError.set(toAssignmentUiError(err))
    });
  }

  requestRevision(d: StaffSubmissionDetailDTO) {
    const ref = this.dialog.open<RequestRevisionDialog, unknown, RequestRevisionDialogResult | null>(RequestRevisionDialog, {
      data: { questions: d.questions }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.api.requestRevision(d.studentAssignmentId, {
        expectedRowVersion: d.rowVersion, expectedAttemptId: d.currentAttemptId,
        flaggedQuestionIds: result.flaggedQuestionIds, feedback: result.feedback
      }).subscribe({
        next: () => { this.snack.open('Revision requested', 'OK', { duration: 2500 }); this.load(); },
        error: (err: HttpErrorResponse) => this.actionError.set(toAssignmentUiError(err))
      });
    });
  }

  close() {
    this.router.navigate(['/vidya-rasa/assignments/submissions']);
  }
}
