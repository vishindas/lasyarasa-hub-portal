import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { StudentAssignmentApiService } from '../data-access/student-assignment-api.service';
import {
  AttemptDTO, DraftResponseDTO, ResponseSummaryDTO, StudentAssignmentDetailDTO, StudentAssignmentQuestionDTO
} from '../data-access/student-assignment.model';
import { StudentAssignmentUiError, toStudentAssignmentUiError } from '../data-access/student-assignment-ui-error.util';
import { StudentAssignmentMessageComponent } from '../shared/student-assignment-message';
import { StudentAssignmentModeBannerComponent } from '../shared/student-assignment-mode-banner';
import { outcomeChip } from '../shared/student-assignment-status.util';
import { StudentAttemptHistoryComponent } from './student-attempt-history';

/**
 * S2 (Start/Continue) + read-only branches S10 (SUBMITTED)/S11
 * (VALIDATED)/S12 (REVISION_REQUESTED)/S14 (CLOSED)/S15 (Unavailable) --
 * one function/route, mirroring the approved design's own decision to
 * treat these as render-branches of one screen rather than separate
 * routes (Slice 13 prototype's renderAssignmentReadOnly()).
 *
 * Two disclosed discrepancies from the design's exact per-screen field
 * assumptions, resolved against the real StudentAssignmentDetailDTO
 * (rasa-ai main@536740d):
 * - No `instructions` field exists on the real detail DTO -- the design's
 *   S2 instructions text is not rendered because there is nothing to
 *   source it from.
 * - "Started" (Start vs Continue) is derived here, not from a
 *   `started` flag (none exists) -- by calling GET .../draft once and
 *   checking for any existing rows.
 *
 * S15 (Unavailable) fires exclusively on instanceStatus === 'WITHDRAWN'
 * (confirmed: only an actual module withdrawal cascades to this; a
 * merely-locked module leaves the instance ACTIVE) -- checked before any
 * status branch, per the approved design's own priority order.
 */
@Component({
  selector: 'app-student-assignment-detail',
  standalone: true,
  imports: [
    RouterLink, DatePipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    StudentAssignmentMessageComponent, StudentAssignmentModeBannerComponent, StudentAttemptHistoryComponent
  ],
  styles: [`
    :host { display: block; max-width: 720px; margin: 0 auto; padding: 24px 20px 48px; }
    .back-link { display: inline-flex; align-items: center; gap: 4px; color: #6B6255; text-decoration: none; font-size: 0.85rem; margin-bottom: 8px; min-height: 44px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.4rem; color: #1C1A16; margin: 0 0 4px; }
    .meta { color: #6B6255; font-size: 0.85rem; margin: 0 0 16px; }
    .banner {
      padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 0.9rem;
      border: 1px solid #E3DCC8; background: #F3EEDE; color: #1C1A16;
    }
    .banner.success { background: #e6f4ea; border-color: #b7dcc0; color: #1e4620; }
    .banner.warning { background: #fff8e1; border-color: #f0dfa8; color: #7A5419; }
    .q-card { border: 1px solid #E3DCC8; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; background: #fff; }
    .q-card.flagged { border-color: #A3762C; border-width: 2px; background: #fffaf0; }
    .q-meta { font-size: 0.75rem; color: #6B6255; margin: 0 0 4px; }
    .q-prompt { font-weight: 600; margin: 0 0 8px; color: #1C1A16; }
    .q-answer { margin: 0; color: #1C1A16; }
    .q-flag-note { font-size: 0.78rem; color: #A3762C; font-weight: 600; margin-top: 6px; }
    .outcome-chip { display: inline-block; font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 12px; margin-left: 8px; }
    .tone-success { background: #e6f4ea; color: #1e4620; }
    .tone-error { background: #fdf1f1; color: #7a1f1f; }
    .tone-warning { background: #fff3cd; color: #7A5419; }
    .actions { margin-top: 16px; }
    button, a[mat-flat-button], a[mat-stroked-button] { min-height: 44px; }
    .empty-note { color: #6B6255; padding: 24px 0; }
  `],
  template: `
    <a class="back-link" [routerLink]="['/my-students', studentId(), 'assignments']">
      <mat-icon aria-hidden="true">arrow_back</mat-icon> Back to Assignments
    </a>

    <app-student-assignment-message [error]="loadError()" (retry)="load()" (back)="backToSummary()" backLabel="Back to Assignments" />

    @if (loading()) {
      <mat-spinner diameter="36" />
    } @else if (!loadError() && detail(); as d) {
      <h1 tabindex="-1">{{ d.title }}</h1>

      @if (unavailable()) {
        <div class="banner" role="status">
          <p style="margin:0 0 4px;font-weight:600">This assignment isn't available right now</p>
          <p style="margin:0">Its module is no longer released. If you already answered part of it before that happened, your teacher can still see your history — nothing is lost.</p>
        </div>
      } @else {
        @switch (d.status) {
          @case ('DRAFT') {
            <p class="meta">Due {{ d.dueAt | date }}{{ started() ? ' · draft saved — you can pick up where you left off' : '' }}</p>
            <app-student-assignment-mode-banner />
            <div class="actions">
              <a mat-flat-button color="primary" [routerLink]="['/my-students', studentId(), 'assignments', d.id, 'answer']"
                 [attr.aria-disabled]="mode.mutationsDisabled() || null" (click)="onWriteNavClick($event)">
                {{ started() ? 'Continue' : 'Start' }}
              </a>
            </div>
          }
          @case ('SUBMITTED') {
            <div class="banner" role="status">
              {{ d.attemptNumber > 1 ? 'Resubmitted' : 'Submitted' }} — awaiting your teacher's review. Your answers are shown below as you submitted them.
            </div>
            @if (pastAttemptCount() > 0) {
              <app-student-attempt-history [history]="attempts() ?? []" [questions]="d.questions" [currentAttemptNumber]="d.attemptNumber" />
            }
            @for (q of d.questions; track q.id) {
              <div class="q-card">
                <p class="q-meta">Question {{ q.questionOrder }} · {{ typeLabel(q) }}</p>
                <p class="q-prompt">{{ q.prompt }}
                  @if (outcomeForCurrent(q); as o) { <span class="outcome-chip tone-{{ o.tone }}">{{ o.label }}</span> }
                </p>
                <p class="q-answer">{{ currentAnswerText(q) }}</p>
              </div>
            }
          }
          @case ('VALIDATED') {
            <div class="banner success" role="status">Completed and validated. Nice work!</div>
            @for (q of d.questions; track q.id) {
              <div class="q-card">
                <p class="q-meta">Question {{ q.questionOrder }} · {{ typeLabel(q) }}</p>
                <p class="q-prompt">{{ q.prompt }}
                  @if (outcomeForCurrent(q); as o) { <span class="outcome-chip tone-{{ o.tone }}">{{ o.label }}</span> }
                </p>
                <p class="q-answer">{{ currentAnswerText(q) }}</p>
              </div>
            }
          }
          @case ('REVISION_REQUESTED') {
            <div class="banner warning" role="alert">{{ revisionFeedback() || 'Your teacher requested changes.' }}</div>
            @for (q of d.questions; track q.id) {
              <div class="q-card" [class.flagged]="q.editable">
                <p class="q-meta">Question {{ q.questionOrder }} · {{ typeLabel(q) }}</p>
                <p class="q-prompt">{{ q.prompt }}
                  @if (outcomeForCurrent(q); as o) { <span class="outcome-chip tone-{{ o.tone }}">{{ o.label }}</span> }
                </p>
                <p class="q-answer">{{ currentAnswerText(q) }}</p>
                @if (q.editable) {
                  <p class="q-flag-note">Flagged for revision — see feedback above</p>
                } @else {
                  <p class="q-flag-note" style="color:#6B6255">Already validated — no changes needed</p>
                }
              </div>
            }
            <div class="actions">
              <app-student-assignment-mode-banner />
              <a mat-flat-button color="primary" [routerLink]="['/my-students', studentId(), 'assignments', d.id, 'answer']"
                 [attr.aria-disabled]="mode.mutationsDisabled() || null" (click)="onWriteNavClick($event)">
                Revise and resubmit
              </a>
            </div>
          }
          @case ('CLOSED') {
            @if (d.attemptNumber > 0) {
              <div class="banner" role="status">Closed — the due date passed. Your answers are shown below as you submitted them.</div>
              @for (q of d.questions; track q.id) {
                <div class="q-card">
                  <p class="q-meta">Question {{ q.questionOrder }} · {{ typeLabel(q) }}</p>
                  <p class="q-prompt">{{ q.prompt }}
                    @if (outcomeForCurrent(q); as o) { <span class="outcome-chip tone-{{ o.tone }}">{{ o.label }}</span> }
                  </p>
                  <p class="q-answer">{{ currentAnswerText(q) }}</p>
                </div>
              }
            } @else if (hadDraftAnswers()) {
              <div class="banner" role="status">Closed — the due date passed. Your answers are shown below as you left them; they were not reviewed.</div>
              @for (q of d.questions; track q.id) {
                <div class="q-card">
                  <p class="q-meta">Question {{ q.questionOrder }} · {{ typeLabel(q) }}</p>
                  <p class="q-prompt">{{ q.prompt }}</p>
                  <p class="q-answer">{{ draftAnswerText(q) }}</p>
                </div>
              }
            } @else {
              <div class="banner" role="status">
                <p style="margin:0 0 4px;font-weight:600">Closed</p>
                <p style="margin:0">The due date passed before you started this assignment. It's no longer open for new answers.</p>
              </div>
            }
          }
        }
      }
    }
  `
})
export class StudentAssignmentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentAssignmentApiService);
  private destroyRef = inject(DestroyRef);
  mode = inject(ClassroomLiteModeService);

  studentId = signal<number>(0);
  studentAssignmentId = signal<number>(0);
  detail = signal<StudentAssignmentDetailDTO | null>(null);
  attempts = signal<AttemptDTO[] | null>(null);
  drafts = signal<DraftResponseDTO[] | null>(null);
  loading = signal(true);
  loadError = signal<StudentAssignmentUiError | null>(null);

  unavailable = computed(() => this.detail()?.instanceStatus === 'WITHDRAWN');
  started = computed(() => (this.drafts()?.length ?? 0) > 0);
  hadDraftAnswers = computed(() => (this.drafts()?.length ?? 0) > 0);
  pastAttemptCount = computed(() => {
    const d = this.detail();
    if (!d) return 0;
    return (this.attempts() ?? []).filter(a => a.attemptNumber < d.attemptNumber).length;
  });

  private currentAttempt = computed(() => {
    const d = this.detail();
    if (!d) return null;
    return (this.attempts() ?? []).find(a => a.attemptNumber === d.attemptNumber) ?? null;
  });

  revisionFeedback = computed(() => this.currentAttempt()?.feedback ?? null);

  ngOnInit() {
    this.studentId.set(Number(this.route.snapshot.paramMap.get('studentId')));
    this.studentAssignmentId.set(Number(this.route.snapshot.paramMap.get('studentAssignmentId')));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set(null);
    this.attempts.set(null);
    this.drafts.set(null);
    this.api.getDetail(this.studentId(), this.studentAssignmentId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: d => {
        this.detail.set(d);
        if (d.instanceStatus === 'WITHDRAWN') {
          this.loading.set(false);
          return;
        }
        if (d.status === 'DRAFT' || (d.status === 'CLOSED' && d.attemptNumber === 0)) {
          this.loadDrafts();
        } else {
          this.loadAttempts();
        }
      },
      error: (err: HttpErrorResponse) => { this.loadError.set(toStudentAssignmentUiError(err)); this.loading.set(false); }
    });
  }

  private loadDrafts() {
    this.api.listDrafts(this.studentId(), this.studentAssignmentId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => { this.drafts.set(rows); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.loadError.set(toStudentAssignmentUiError(err)); this.loading.set(false); }
    });
  }

  private loadAttempts() {
    this.api.getAttemptHistory(this.studentId(), this.studentAssignmentId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => { this.attempts.set(rows); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.loadError.set(toStudentAssignmentUiError(err)); this.loading.set(false); }
    });
  }

  typeLabel(q: StudentAssignmentQuestionDTO): string {
    switch (q.questionType) {
      case 'SINGLE_CHOICE': return 'Single choice';
      case 'MULTIPLE_CHOICE': return 'Multiple choice';
      case 'SHORT_TEXT': return 'Short text';
      case 'LONG_TEXT': return 'Long text';
    }
  }

  outcomeForCurrent(q: StudentAssignmentQuestionDTO) {
    const r = this.responseFor(q);
    return r ? outcomeChip(r.outcome) : null;
  }

  currentAnswerText(q: StudentAssignmentQuestionDTO): string {
    const r = this.responseFor(q);
    if (!r) return 'Not answered.';
    return this.formatAnswer(q, r.textResponse, r.selectedOptionIds);
  }

  draftAnswerText(q: StudentAssignmentQuestionDTO): string {
    const d = (this.drafts() ?? []).find(x => x.questionId === q.id);
    if (!d) return 'Not answered.';
    return this.formatAnswer(q, d.textResponse, d.selectedOptionIds);
  }

  private responseFor(q: StudentAssignmentQuestionDTO): ResponseSummaryDTO | undefined {
    return this.currentAttempt()?.responses.find(r => r.questionId === q.id);
  }

  private formatAnswer(q: StudentAssignmentQuestionDTO, textResponse: string | null, selectedOptionIds: number[]): string {
    if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') {
      const labels = selectedOptionIds.map(id => q.options.find(o => o.id === id)?.optionLabel).filter((l): l is string => !!l);
      return labels.length ? labels.join(', ') : 'Not answered.';
    }
    return textResponse && textResponse.trim().length > 0 ? textResponse : 'Not answered.';
  }

  onWriteNavClick(event: Event) {
    if (this.mode.mutationsDisabled()) event.preventDefault();
  }

  backToSummary() {
    this.router.navigate(['/my-students', this.studentId(), 'assignments']);
  }
}
