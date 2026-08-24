import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentAssignmentApiService } from '../data-access/student-assignment-api.service';
import { DraftResponseDTO, StudentAssignmentDetailDTO, StudentAssignmentQuestionDTO } from '../data-access/student-assignment.model';
import { StudentAssignmentUiError, toStudentAssignmentUiError } from '../data-access/student-assignment-ui-error.util';
import { StudentAssignmentMessageComponent } from '../shared/student-assignment-message';
import { StudentAssignmentModeBannerComponent } from '../shared/student-assignment-mode-banner';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';

interface ReviewRow {
  question: StudentAssignmentQuestionDTO;
  answerText: string | null;
}

/** S8 -- lists every editable question with its current draft answer or an unanswered flag; Submit is blocked until every editable question is answered. */
@Component({
  selector: 'app-student-assignment-review',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, StudentAssignmentMessageComponent, StudentAssignmentModeBannerComponent],
  styles: [`
    :host { display: block; max-width: 720px; margin: 0 auto; padding: 24px 20px 88px; }
    .back-link { display: inline-flex; align-items: center; gap: 4px; color: #6B6255; text-decoration: none; font-size: 0.85rem; margin-bottom: 8px; min-height: 44px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.4rem; color: #1C1A16; margin: 0 0 4px; }
    .meta { color: #6B6255; font-size: 0.85rem; margin: 0 0 16px; }
    .warn-banner { background: #fdf1f1; border: 1px solid #f5c6c6; color: #7a1f1f; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; }
    .row { border: 1px solid #E3DCC8; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; background: #fff; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .row.unanswered { border-color: #f5c6c6; background: #fffaf9; }
    .row-main { min-width: 0; }
    .row-prompt { font-weight: 600; margin: 0 0 4px; color: #1C1A16; }
    .row-answer { margin: 0; color: #1C1A16; }
    .row-answer.missing { color: #7a1f1f; }
    button, a[mat-flat-button], a[mat-stroked-button] { min-height: 44px; }
    .bottom-bar { position: sticky; bottom: 0; background: #FBF7EC; border-top: 1px solid #E3DCC8; padding: 12px 0; margin-top: 8px; }
    .frozen-note { font-size: 0.8rem; color: #6B6255; }
  `],
  template: `
    <a class="back-link" [routerLink]="['/my-students', studentId(), 'assignments', studentAssignmentId(), 'answer']">
      <mat-icon aria-hidden="true">arrow_back</mat-icon> Back to answers
    </a>

    <app-student-assignment-message [error]="loadError()" (retry)="load()" />

    @if (loading()) {
      <mat-spinner diameter="36" />
    } @else if (detail(); as d) {
      <h1 tabindex="-1">Review before submitting</h1>
      <p class="meta">{{ d.title }}</p>

      @if (unansweredCount() > 0) {
        <div class="warn-banner" role="alert">{{ unansweredCount() }} question(s) need an answer before you can submit.</div>
      }

      @for (row of rows(); track row.question.id) {
        <div class="row" [class.unanswered]="row.answerText === null">
          <div class="row-main">
            <p class="row-prompt">Question {{ row.question.questionOrder }}: {{ row.question.prompt }}</p>
            <p class="row-answer" [class.missing]="row.answerText === null">
              {{ row.answerText ?? '⚠ Not answered yet' }}
            </p>
          </div>
          <a mat-stroked-button [routerLink]="['/my-students', studentId(), 'assignments', studentAssignmentId(), 'answer']">Edit</a>
        </div>
      }

      <div class="bottom-bar">
        <app-student-assignment-mode-banner />
        @if (mode.mutationsDisabled()) {
          <p class="frozen-note">Reading remains available; writing is paused while learning is read-only.</p>
        } @else {
          <button mat-flat-button color="primary" type="button" [disabled]="unansweredCount() > 0" (click)="submit()">Submit</button>
        }
      </div>
    }
  `
})
export class StudentAssignmentReviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentAssignmentApiService);
  private destroyRef = inject(DestroyRef);
  mode = inject(ClassroomLiteModeService);

  studentId = signal<number>(0);
  studentAssignmentId = signal<number>(0);
  detail = signal<StudentAssignmentDetailDTO | null>(null);
  drafts = signal<DraftResponseDTO[]>([]);
  loading = signal(true);
  loadError = signal<StudentAssignmentUiError | null>(null);

  rows = computed<ReviewRow[]>(() => {
    const d = this.detail();
    if (!d) return [];
    const byQuestion = new Map(this.drafts().map(dr => [dr.questionId, dr]));
    return [...d.questions]
      .filter(q => q.editable)
      .sort((a, b) => a.questionOrder - b.questionOrder)
      .map(q => ({ question: q, answerText: this.answerText(q, byQuestion.get(q.id)) }));
  });

  unansweredCount = computed(() => this.rows().filter(r => r.answerText === null).length);

  ngOnInit() {
    this.studentId.set(Number(this.route.snapshot.paramMap.get('studentId')));
    this.studentAssignmentId.set(Number(this.route.snapshot.paramMap.get('studentAssignmentId')));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.getDetail(this.studentId(), this.studentAssignmentId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: d => {
        this.detail.set(d);
        this.api.listDrafts(this.studentId(), this.studentAssignmentId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: drafts => { this.drafts.set(drafts); this.loading.set(false); },
          error: (err: HttpErrorResponse) => { this.loadError.set(toStudentAssignmentUiError(err)); this.loading.set(false); }
        });
      },
      error: (err: HttpErrorResponse) => { this.loadError.set(toStudentAssignmentUiError(err)); this.loading.set(false); }
    });
  }

  private answerText(q: StudentAssignmentQuestionDTO, draft: DraftResponseDTO | undefined): string | null {
    if (!draft) return null;
    if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') {
      const labels = draft.selectedOptionIds.map(id => q.options.find(o => o.id === id)?.optionLabel).filter((l): l is string => !!l);
      return labels.length ? labels.join(', ') : null;
    }
    return draft.textResponse && draft.textResponse.trim().length > 0 ? draft.textResponse : null;
  }

  submit() {
    const d = this.detail();
    if (!d) return;
    const isResubmit = d.status === 'REVISION_REQUESTED';
    const call = isResubmit
      ? this.api.resubmit(this.studentId(), this.studentAssignmentId(), { expectedRowVersion: d.rowVersion })
      : this.api.submit(this.studentId(), this.studentAssignmentId(), { expectedRowVersion: d.rowVersion });
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.router.navigate(['/my-students', this.studentId(), 'assignments', this.studentAssignmentId(), 'confirmed'], { queryParams: { resubmitted: isResubmit ? '1' : '0' } }),
      error: (err: HttpErrorResponse) => this.loadError.set(toStudentAssignmentUiError(err))
    });
  }
}
