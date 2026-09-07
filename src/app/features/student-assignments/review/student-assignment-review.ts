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
  // UX-5 geometry correction: was `:host { max-width: 720px; margin: 0
  // auto; padding: 24px 20px 88px; }` -- same independently-centered
  // container class of bug fixed elsewhere. `.sp-page` (styles-student.scss)
  // gives the same flush gutter, no local width cap. The extra bottom
  // padding is preserved below via an !important override -- load-bearing
  // clearance for this screen's own sticky `.bottom-bar`.
  host: { class: 'sp-page' },
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, StudentAssignmentMessageComponent, StudentAssignmentModeBannerComponent],
  styles: [`
    :host { padding-bottom: 88px !important; }
    /* Correction: a shared left-aligned content boundary -- same technique
       as answer/student-assignment-answer.ts's own .answer-content --
       covering the back-link, heading/context, question rows, and the
       bottom action bar, so none of them spread across the full .sp-page
       workspace on wide desktop screens. No margin:auto (left-aligned, not
       centered). Below 1050px this has no effect -- max-width only ever
       constrains a wider container, so smaller screens already render at
       100% available width with no separate code path needed for it. */
    .review-content { max-width: 1050px; }
    /* UX-7A: margin-top compensates for this screen's own class-context bar
       being hidden (student-wide, not class-scoped) -- see the identical
       fix on student-fees.ts's own h1 and student-fee-history.ts's own
       .back-link. Applied here to .back-link since it's this screen's
       first element (inside .review-content). */
    .back-link { display: inline-flex; align-items: center; gap: 4px; color: var(--sp-text-muted, #52596b); text-decoration: none; font-size: 0.85rem; margin: 65px 0 8px; min-height: 44px; }
    .back-link:hover, .back-link:focus-visible { color: var(--sp-primary, #3d4ed8); outline: 2px solid var(--sp-primary, #3d4ed8); outline-offset: -2px; }
    /* UX-5: Fraunces retired (Deliverable 3), matching Provider's page-header h2 pattern. */
    h1 { font-size: 1.4rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0 0 4px; }
    .meta { color: var(--sp-text-muted, #52596b); font-size: 0.85rem; margin: 0 0 16px; }
    /* UX-5/Finding 7: recolored onto the shared negative tone -- same
       bg/text/border combo CurriculumMessageComponent's own .validation
       state already uses. */
    .warn-banner { background: var(--sp-tone-negative-bg, #fee2e2); border: 1px solid #fecaca; color: var(--sp-tone-negative-text, #991b1b); padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; }
    /* Correction: an unanswered row previously filled the entire card red
       (border-color #fecaca, background --sp-tone-negative-bg) on top of
       the already-red top banner and the row's own red "Not answered yet"
       text -- three overlapping red signals for one condition. Restrained
       to Learning Path's own row language: every row (answered or not)
       shares the same plain neutral/white surface; the localized red
       .row-answer.missing text below is the only per-row indicator. */
    .row { border: 1px solid var(--sp-border-subtle, #edf0f7); border-radius: var(--sp-radius-sm, 8px); padding: 12px 16px; margin-bottom: 10px; background: var(--sp-surface, #fff); display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .row-main { min-width: 0; }
    .row-prompt { font-weight: 600; margin: 0 0 4px; color: var(--sp-text, #1a1f36); }
    .row-answer { margin: 0; color: var(--sp-text, #1a1f36); }
    .row-answer.missing { color: var(--sp-tone-negative-text, #991b1b); }
    button, a[mat-flat-button], a[mat-stroked-button] { min-height: 44px; }
    .bottom-bar { position: sticky; bottom: 0; background: var(--sp-bg, #f8f9fb); border-top: 1px solid var(--sp-border-subtle, #edf0f7); padding: 12px 0; margin-top: 8px; }
  `],
  template: `
    <div class="review-content">
    <a class="back-link" [routerLink]="['/my-students', studentId(), 'assignments', studentAssignmentId(), 'answer']">
      <mat-icon aria-hidden="true">arrow_back</mat-icon> Back to answers
    </a>

    <app-student-assignment-message [error]="loadError()" (retry)="load()" />

    @if (loading()) {
      <mat-spinner diameter="36" />
    } @else if (detail(); as d) {
      <h1 tabindex="-1">Review before submitting</h1>
      <!-- UX-7B: module context folded into the existing meta line, same
           principle as Answer -- preserve the working layout, no new card/banner. -->
      <p class="meta">{{ d.title }}{{ d.moduleTitle ? ' · Module: ' + d.moduleTitle : '' }}</p>

      @if (unansweredCount() > 0) {
        <div class="warn-banner" role="alert">{{ unansweredCount() }} question{{ unansweredCount() === 1 ? '' : 's' }} need{{ unansweredCount() === 1 ? 's' : '' }} an answer before you can submit.</div>
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
        @if (!mode.mutationsDisabled()) {
          <button mat-flat-button color="primary" type="button" [disabled]="unansweredCount() > 0" (click)="submit()">Submit</button>
        }
      </div>
    }
    </div>
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
