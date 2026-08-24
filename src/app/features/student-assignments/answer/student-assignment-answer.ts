import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentAssignmentApiService } from '../data-access/student-assignment-api.service';
import { DraftResponseDTO, StudentAssignmentDetailDTO, StudentAssignmentQuestionDTO } from '../data-access/student-assignment.model';
import { StudentAssignmentUiError, toStudentAssignmentUiError } from '../data-access/student-assignment-ui-error.util';
import { StudentAssignmentMessageComponent } from '../shared/student-assignment-message';
import { StudentAssignmentModeBannerComponent } from '../shared/student-assignment-mode-banner';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

interface QuestionAnswerState {
  question: StudentAssignmentQuestionDTO;
  textValue: string;
  selectedOptionIds: number[];
  rowVersion: number | null;
  saveState: SaveState;
}

const DEBOUNCE_MS = 800;

/**
 * S3-S7 (answering flow, one continuous scroll -- matches the approved
 * design's own "single-scroll, not a multi-step wizard" decision) and S13
 * (revise-and-resubmit), same route/component: a question is editable iff
 * StudentAssignmentQuestionDTO.editable === true, trusted directly from
 * the API, never re-derived from status/outcome locally.
 *
 * Draft-save UX (architect-approved): text inputs (SHORT_TEXT/LONG_TEXT)
 * debounce ~800ms after the last keystroke; single/multiple-choice save
 * immediately on change. Every question shows Saving…/Saved/Couldn't
 * save — Retry, never silent. A stale conflict (409) blocks further
 * writes to that question until the student explicitly reloads via the
 * message component's Reload action -- never silently overwritten or
 * discarded.
 *
 * Slice 14.2: for a REVISION_REQUESTED assignment, GET .../draft already
 * returns a genuine, backend-seeded draft for every flagged question,
 * pre-filled from the student's own just-graded answer -- this component
 * simply loads and displays whatever GET .../draft returns; it does not
 * need to special-case "is this the first edit since a revision request."
 */
@Component({
  selector: 'app-student-assignment-answer',
  standalone: true,
  imports: [
    FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    StudentAssignmentMessageComponent, StudentAssignmentModeBannerComponent
  ],
  styles: [`
    :host { display: block; max-width: 720px; margin: 0 auto; padding: 24px 20px 88px; }
    .back-link { display: inline-flex; align-items: center; gap: 4px; color: #6B6255; text-decoration: none; font-size: 0.85rem; margin-bottom: 8px; min-height: 44px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.4rem; color: #1C1A16; margin: 0 0 4px; }
    .meta { color: #6B6255; font-size: 0.85rem; margin: 0 0 16px; }
    .q-card { border: 1px solid #E3DCC8; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; background: #fff; }
    .q-card.locked { background: #F3EEDE; }
    .q-card.flagged { border-color: #A3762C; border-width: 2px; }
    .q-meta { font-size: 0.75rem; color: #6B6255; margin: 0 0 4px; }
    .q-prompt { font-weight: 600; margin: 0 0 10px; color: #1C1A16; }
    .option-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; min-height: 44px; }
    .option-row input[type="radio"], .option-row input[type="checkbox"] { width: 20px; height: 20px; }
    textarea, input[type="text"] {
      width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #E3DCC8; border-radius: 6px;
      font-family: inherit; font-size: 0.95rem; min-height: 44px;
    }
    textarea { min-height: 100px; resize: vertical; }
    .char-count { font-size: 0.75rem; color: #6B6255; margin: 4px 0 0; text-align: right; }
    .save-state { font-size: 0.78rem; margin-top: 6px; display: flex; align-items: center; gap: 4px; }
    .save-state.saved { color: #1e4620; }
    .save-state.saving { color: #6B6255; }
    .save-state.error, .save-state.conflict { color: #7a1f1f; }
    .locked-note { font-size: 0.78rem; color: #6B6255; font-style: italic; }
    .feedback-box { background: #fff8e1; border: 1px solid #E3DCC8; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; font-size: 0.88rem; color: #7A5419; }
    .bottom-bar {
      position: sticky; bottom: 0; background: #FBF7EC; border-top: 1px solid #E3DCC8;
      padding: 12px 0; margin-top: 8px;
    }
    button, a[mat-flat-button], a[mat-stroked-button] { min-height: 44px; }
    .frozen-note { font-size: 0.8rem; color: #6B6255; }
  `],
  template: `
    <a class="back-link" role="button" tabindex="0" [attr.aria-disabled]="navigating() || null"
       (click)="onExitClick($event)" (keydown.enter)="onExitClick($event)" (keydown.space)="onExitClick($event)">
      <mat-icon aria-hidden="true">arrow_back</mat-icon> {{ isRevising() ? 'Cancel revise' : 'Save and exit' }}
    </a>

    <app-student-assignment-message [error]="loadError()" (retry)="load()" (reload)="load()" />

    @if (loading()) {
      <mat-spinner diameter="36" />
    } @else if (!loadError() && detail(); as d) {
      <h1 tabindex="-1">{{ d.title }}</h1>
      <p class="meta">{{ questionStates().length }} question(s)</p>

      <app-student-assignment-mode-banner />

      @if (isRevising() && revisionFeedback()) {
        <div class="feedback-box" role="status">{{ revisionFeedback() }}</div>
      }

      @for (qs of questionStates(); track qs.question.id) {
        <div class="q-card" [class.locked]="!qs.question.editable" [class.flagged]="isRevising() && qs.question.editable">
          <p class="q-meta">Question {{ qs.question.questionOrder }} of {{ questionStates().length }} · {{ typeLabel(qs.question) }}</p>
          <p class="q-prompt">{{ qs.question.prompt }}</p>

          @if (!qs.question.editable) {
            <p class="locked-note">Already validated — no changes needed</p>
          } @else {
            @switch (qs.question.questionType) {
              @case ('SINGLE_CHOICE') {
                <div role="radiogroup" [attr.aria-label]="qs.question.prompt">
                  @for (o of qs.question.options; track o.id) {
                    <label class="option-row">
                      <input type="radio" [name]="'q-' + qs.question.id" [value]="o.id"
                             [checked]="qs.selectedOptionIds[0] === o.id"
                             [disabled]="mode.mutationsDisabled() || qs.saveState === 'conflict'"
                             (change)="onSingleChoiceChange(qs, o.id)" />
                      {{ o.optionLabel }}
                    </label>
                  }
                </div>
              }
              @case ('MULTIPLE_CHOICE') {
                <p class="q-meta">Select up to {{ qs.question.maxSelections }}.</p>
                <div role="group" [attr.aria-label]="qs.question.prompt">
                  @for (o of qs.question.options; track o.id) {
                    <label class="option-row">
                      <input type="checkbox" [value]="o.id"
                             [checked]="qs.selectedOptionIds.includes(o.id)"
                             [disabled]="mode.mutationsDisabled() || qs.saveState === 'conflict' || (!qs.selectedOptionIds.includes(o.id) && qs.selectedOptionIds.length >= (qs.question.maxSelections ?? 0))"
                             (change)="onMultiChoiceToggle(qs, o.id, $event)" />
                      {{ o.optionLabel }}
                    </label>
                  }
                </div>
              }
              @case ('SHORT_TEXT') {
                <input type="text" maxlength="240" [value]="qs.textValue" [disabled]="mode.mutationsDisabled() || qs.saveState === 'conflict'"
                       (input)="onTextInput(qs, $event)" [attr.aria-label]="qs.question.prompt" />
                <p class="char-count">{{ qs.textValue.length }} / 240</p>
              }
              @case ('LONG_TEXT') {
                <textarea rows="5" maxlength="800" [disabled]="mode.mutationsDisabled() || qs.saveState === 'conflict'"
                          (input)="onTextInput(qs, $event)" [attr.aria-label]="qs.question.prompt">{{ qs.textValue }}</textarea>
                <p class="char-count">{{ qs.textValue.length }} / 800</p>
              }
            }
            <p class="save-state {{ qs.saveState }}" aria-live="polite">
              @switch (qs.saveState) {
                @case ('saving') { <mat-icon aria-hidden="true">sync</mat-icon> Saving… }
                @case ('saved') { <mat-icon aria-hidden="true">check</mat-icon> Saved }
                @case ('error') { <mat-icon aria-hidden="true">error_outline</mat-icon> Couldn't save
                  <button mat-button type="button" (click)="retrySave(qs)">Retry</button>
                }
                @case ('conflict') { <mat-icon aria-hidden="true">sync_problem</mat-icon> This answer changed since you last loaded it.
                  <button mat-button type="button" (click)="load()">Reload</button>
                }
              }
            </p>
          }
        </div>
      }

      <div class="bottom-bar">
        @if (mode.mutationsDisabled()) {
          <p class="frozen-note">Reading remains available; writing is paused while learning is read-only. Your answers so far are saved as a draft.</p>
        } @else {
          <button mat-flat-button color="primary" type="button" [disabled]="navigating()" (click)="goReview()">Review answers</button>
        }
      </div>
    }
  `
})
export class StudentAssignmentAnswerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentAssignmentApiService);
  private destroyRef = inject(DestroyRef);
  mode = inject(ClassroomLiteModeService);

  studentId = signal<number>(0);
  studentAssignmentId = signal<number>(0);
  detail = signal<StudentAssignmentDetailDTO | null>(null);
  questionStates = signal<QuestionAnswerState[]>([]);
  loading = signal(true);
  loadError = signal<StudentAssignmentUiError | null>(null);
  revisionFeedback = signal<string | null>(null);

  isRevising = signal(false);
  navigating = signal(false);

  private debounceTimers = new Map<number, ReturnType<typeof setTimeout>>();

  /**
   * Bumped every time load() (initial load or Reload) begins. Each save
   * captures the generation it started under; a response that resolves
   * under a later generation (i.e. a Reload happened while it was still in
   * flight) is discarded outright -- it must never mutate question state,
   * trigger a trailing resave, or touch inFlight/dirty bookkeeping, since
   * the freshly reloaded state and rowVersions are authoritative.
   */
  private loadGeneration = 0;

  ngOnInit() {
    this.studentId.set(Number(this.route.snapshot.paramMap.get('studentId')));
    this.studentAssignmentId.set(Number(this.route.snapshot.paramMap.get('studentAssignmentId')));
    this.load();
  }

  ngOnDestroy() {
    for (const t of this.debounceTimers.values()) clearTimeout(t);
  }

  load() {
    this.loadGeneration++;
    this.loading.set(true);
    this.loadError.set(null);
    this.revisionFeedback.set(null);
    for (const t of this.debounceTimers.values()) clearTimeout(t);
    this.debounceTimers.clear();
    this.inFlight.clear();
    this.dirty.clear();
    this.notifySettleWaiters();
    this.api.getDetail(this.studentId(), this.studentAssignmentId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: d => {
        this.detail.set(d);
        this.isRevising.set(d.status === 'REVISION_REQUESTED');
        if (this.isRevising()) {
          // Feedback is required context for a revision-answering session --
          // a failed fetch must not silently look like "no feedback."
          this.api.getAttemptHistory(this.studentId(), this.studentAssignmentId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: attempts => {
              const current = attempts.find(a => a.attemptNumber === d.attemptNumber);
              this.revisionFeedback.set(current?.feedback ?? null);
              this.loadDraftsAndBuildState(d);
            },
            error: (err: HttpErrorResponse) => { this.loadError.set(toStudentAssignmentUiError(err)); this.loading.set(false); }
          });
        } else {
          this.loadDraftsAndBuildState(d);
        }
      },
      error: (err: HttpErrorResponse) => { this.loadError.set(toStudentAssignmentUiError(err)); this.loading.set(false); }
    });
  }

  private loadDraftsAndBuildState(d: StudentAssignmentDetailDTO) {
    this.api.listDrafts(this.studentId(), this.studentAssignmentId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: drafts => {
        const byQuestion = new Map<number, DraftResponseDTO>(drafts.map(dr => [dr.questionId, dr]));
        const states: QuestionAnswerState[] = [...d.questions]
          .sort((a, b) => a.questionOrder - b.questionOrder)
          .map(q => {
            const existing = byQuestion.get(q.id);
            return {
              question: q,
              textValue: existing?.textResponse ?? '',
              selectedOptionIds: existing?.selectedOptionIds ?? [],
              rowVersion: existing?.rowVersion ?? null,
              saveState: 'idle' as SaveState
            };
          });
        this.questionStates.set(states);
        this.loading.set(false);
      },
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

  cancelRoute(): unknown[] {
    return ['/my-students', this.studentId(), 'assignments', this.studentAssignmentId()];
  }

  onSingleChoiceChange(qs: QuestionAnswerState, optionId: number) {
    qs.selectedOptionIds = [optionId];
    this.replaceState(qs);
    this.saveNow(qs);
  }

  onMultiChoiceToggle(qs: QuestionAnswerState, optionId: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const max = qs.question.maxSelections ?? Number.MAX_SAFE_INTEGER;
    let next = [...qs.selectedOptionIds];
    if (checked) {
      if (!next.includes(optionId) && next.length < max) next.push(optionId);
    } else {
      next = next.filter(id => id !== optionId);
    }
    qs.selectedOptionIds = next;
    this.replaceState(qs);
    this.saveNow(qs);
  }

  onTextInput(qs: QuestionAnswerState, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    qs.textValue = value;
    this.replaceState(qs);
    const existing = this.debounceTimers.get(qs.question.id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      // Only remove this timer's own entry -- if a newer keystroke already
      // replaced it (and cleared this one), this stale callback must never
      // fire at all, but guard anyway so it can never delete a replacement.
      if (this.debounceTimers.get(qs.question.id) === timer) {
        this.debounceTimers.delete(qs.question.id);
      }
      this.saveNow(qs);
    }, DEBOUNCE_MS);
    this.debounceTimers.set(qs.question.id, timer);
  }

  retrySave(qs: QuestionAnswerState) {
    this.saveNow(qs);
  }

  private replaceState(qs: QuestionAnswerState) {
    this.questionStates.set(this.questionStates().map(s => (s.question.id === qs.question.id ? qs : s)));
  }

  /**
   * Rapid, sequential changes to the SAME question (e.g. two multiple-choice
   * toggles in quick succession, both "save immediately") must not fire two
   * overlapping PUTs against the same not-yet-updated rowVersion -- the
   * second would race the first's response and hit an optimistic-
   * concurrency conflict on a genuinely legitimate, non-conflicting edit.
   * inFlight/dirty coalesces this: while a save for a question is already
   * in flight, a further change just marks it dirty; the in-flight save's
   * own success handler re-saves once more, using qs's own latest live
   * state and the just-updated rowVersion, rather than firing a second
   * concurrent request.
   */
  private inFlight = new Set<number>();
  private dirty = new Set<number>();
  private settleWaiters: Array<() => void> = [];

  private saveNow(qs: QuestionAnswerState) {
    // Once a question is in conflict, no further write may be issued for it
    // until an explicit Reload rebuilds its state from the server.
    if (qs.saveState === 'conflict') return;
    if (this.inFlight.has(qs.question.id)) {
      this.dirty.add(qs.question.id);
      return;
    }
    const generation = this.loadGeneration;
    this.inFlight.add(qs.question.id);
    qs.saveState = 'saving';
    this.replaceState(qs);
    const isChoice = qs.question.questionType === 'SINGLE_CHOICE' || qs.question.questionType === 'MULTIPLE_CHOICE';
    this.api.saveDraft(this.studentId(), this.studentAssignmentId(), qs.question.id, {
      textResponse: isChoice ? null : qs.textValue,
      selectedOptionIds: isChoice ? qs.selectedOptionIds : null,
      expectedDraftRowVersion: qs.rowVersion
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: saved => {
        // A Reload started (and reset inFlight/dirty) after this save began --
        // the fresh reloaded state is authoritative; this response must not
        // mutate it, trigger a trailing resave, or touch bookkeeping that no
        // longer belongs to this generation.
        if (generation !== this.loadGeneration) return;
        qs.rowVersion = saved.rowVersion;
        qs.saveState = 'saved';
        this.replaceState(qs);
        this.inFlight.delete(qs.question.id);
        if (this.dirty.delete(qs.question.id)) this.saveNow(qs);
        this.notifySettleWaiters();
      },
      error: (err: HttpErrorResponse) => {
        if (generation !== this.loadGeneration) return;
        this.inFlight.delete(qs.question.id);
        this.dirty.delete(qs.question.id);
        const existingTimer = this.debounceTimers.get(qs.question.id);
        if (existingTimer) {
          clearTimeout(existingTimer);
          this.debounceTimers.delete(qs.question.id);
        }
        const mapped = toStudentAssignmentUiError(err);
        qs.saveState = mapped.kind === 'draft-conflict' || mapped.kind === 'stale-version' ? 'conflict' : 'error';
        this.replaceState(qs);
        this.notifySettleWaiters();
      }
    });
  }

  private notifySettleWaiters() {
    if (this.inFlight.size > 0 || this.dirty.size > 0) return;
    const waiters = this.settleWaiters;
    this.settleWaiters = [];
    for (const w of waiters) w();
  }

  private waitForSaveSettle(): Promise<void> {
    return new Promise<void>(resolve => {
      if (this.inFlight.size === 0 && this.dirty.size === 0) {
        resolve();
        return;
      }
      this.settleWaiters.push(resolve);
    });
  }

  /**
   * The save-and-navigate gate: flush every pending debounce into an
   * immediate save, then wait for all in-flight/coalesced trailing saves to
   * fully settle before allowing navigation. Only resolves true once every
   * question is clear of 'error'/'conflict' -- navigation must never race
   * ahead of, or rely on, async work surviving this component's destruction.
   */
  private flushPendingSavesAndWait(): Promise<boolean> {
    for (const [questionId, timer] of Array.from(this.debounceTimers.entries())) {
      clearTimeout(timer);
      this.debounceTimers.delete(questionId);
      const qs = this.questionStates().find(s => s.question.id === questionId);
      if (qs) this.saveNow(qs);
    }
    return this.waitForSaveSettle().then(
      () => !this.questionStates().some(q => q.saveState === 'conflict' || q.saveState === 'error')
    );
  }

  async goReview() {
    if (this.navigating()) return;
    this.navigating.set(true);
    const ok = await this.flushPendingSavesAndWait();
    if (ok) {
      this.router.navigate(['/my-students', this.studentId(), 'assignments', this.studentAssignmentId(), 'review']);
    } else {
      this.navigating.set(false);
    }
  }

  async onExitClick(event: Event) {
    event.preventDefault();
    if (this.navigating()) return;
    this.navigating.set(true);
    const ok = await this.flushPendingSavesAndWait();
    if (ok) {
      this.router.navigate(this.cancelRoute());
    } else {
      this.navigating.set(false);
    }
  }
}
