import { Component, OnChanges, input, output, signal, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, switchMap, filter, map } from 'rxjs';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AssignmentAuthoringApiService } from '../data-access/assignment-authoring-api.service';
import { AssignmentQuestionDTO, AssignmentQuestionOptionDTO } from '../data-access/assignment-staff.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';
import { AssignmentMessageComponent } from '../../../shared/assignment/assignment-message';
import { OptionFormDialog, OptionFormDialogResult } from './option-form-dialog';
import { DeleteOptionConfirmDialog } from './delete-option-confirm-dialog';
import { EnsureDraftOutcome } from './ensure-draft-outcome.model';

/**
 * T5/T6 -- MCQ option config + reorder, nested under a question in
 * question-list.ts. isCorrect (the answer key) renders only here, under
 * features/assignments/**. Every mutation routes through the SAME
 * ensureDraft() passed down from question-list (T3 auto-draft-on-edit). All
 * interactive controls are >=44x44px.
 *
 * T3 defect fix (follow-up review of 7143f85): resolving a mutation target
 * here requires TWO lookups after ensureDraft() resolves -- first the
 * CURRENT (possibly just-cloned) parent question, by questionOrder, then
 * the current option within it, by optionOrder. A captured question/option
 * object's id/rowVersion is never trustworthy across an ensureDraft() call
 * that had to clone a draft -- see EnsureDraftOutcome's doc comment.
 */
@Component({
  selector: 'app-option-list',
  standalone: true,
  imports: [DragDropModule, MatButtonModule, MatIconModule, AssignmentMessageComponent],
  styles: [`
    .row { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
    .label { flex: 1; }
    .correct { color: #065f46; font-weight: 600; font-size: 0.78rem; }
    button[mat-icon-button] { min-height: 44px; min-width: 44px; }
  `],
  template: `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:0.85rem;color:#6c757d">Options</span>
      @if (editable()) {
        <button mat-stroked-button type="button" [disabled]="mutationsDisabled()" (click)="addOption()">
          <mat-icon>add</mat-icon> Add Option
        </button>
      }
    </div>
    <app-assignment-message [error]="error()" (reload)="reload.emit()" />
    <div cdkDropList (cdkDropListDropped)="onDrop($event)">
      @for (o of options(); track o.id; let i = $index) {
        <div cdkDrag [cdkDragDisabled]="!editable() || mutationsDisabled()" [cdkDragData]="o">
          <div class="row">
            <span class="label">{{ o.optionLabel }}</span>
            @if (o.isCorrect) { <span class="correct">Correct</span> }
            <button mat-icon-button [disabled]="!editable() || mutationsDisabled() || i === 0" (click)="moveUp(i)" aria-label="Move option up"><mat-icon>arrow_upward</mat-icon></button>
            <button mat-icon-button [disabled]="!editable() || mutationsDisabled() || i === options().length - 1" (click)="moveDown(i)" aria-label="Move option down"><mat-icon>arrow_downward</mat-icon></button>
            <button mat-icon-button [disabled]="!editable() || mutationsDisabled()" (click)="editOption(o)" aria-label="Edit option"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button [disabled]="!editable() || mutationsDisabled()" (click)="deleteOption(o)" aria-label="Delete option"><mat-icon>delete</mat-icon></button>
          </div>
        </div>
      }
    </div>
  `
})
export class OptionList implements OnChanges {
  question = input.required<AssignmentQuestionDTO>();
  editable = input.required<boolean>();
  mutationsDisabled = input(false);
  ensureDraft = input.required<() => Observable<EnsureDraftOutcome>>();
  questionUpdated = output<AssignmentQuestionDTO>();
  reload = output<void>();

  private api = inject(AssignmentAuthoringApiService);
  private dialog = inject(MatDialog);
  private announcer = inject(LiveAnnouncer);

  options = signal<AssignmentQuestionOptionDTO[]>([]);
  error = signal<AssignmentUiError | null>(null);

  ngOnChanges() {
    this.options.set(this.question().options);
  }

  private handleError(err: HttpErrorResponse) {
    this.error.set(toAssignmentUiError(err));
  }

  private notFoundQuestionError(): AssignmentUiError {
    return { kind: 'not-found', message: 'This question no longer exists. Reload to see the current state.', resource: 'AssignmentTemplateQuestion' };
  }

  private notFoundOptionError(): AssignmentUiError {
    return { kind: 'not-found', message: 'This option no longer exists. Reload to see the current state.', resource: 'AssignmentQuestionOption' };
  }

  /**
   * Resolves the CURRENT (possibly just-cloned) parent question matching
   * this component's questionOrder.
   *
   * - freshlyCreated: this.question() (an @Input) still describes the
   *   PUBLISHED row -- the clone minted a new id, so only
   *   outcome.version.questions (the clone's own content) is trustworthy.
   * - not freshlyCreated: no clone happened this call, so this.question()
   *   is already correct -- question-list.ts keeps that @Input in sync via
   *   its own onQuestionUpdated() (matched by questionOrder) on every
   *   successful mutation, including ones this component itself emits.
   */
  private resolveCurrentQuestion(outcome: EnsureDraftOutcome): AssignmentQuestionDTO | null {
    if (!outcome.freshlyCreated) return this.question();
    const questionOrder = this.question().questionOrder;
    return outcome.version.questions.find(x => x.questionOrder === questionOrder) ?? null;
  }

  private emitUpdated(question: AssignmentQuestionDTO, options: AssignmentQuestionOptionDTO[]) {
    this.options.set(options);
    this.questionUpdated.emit({ ...question, options });
  }

  addOption() {
    const ref = this.dialog.open<OptionFormDialog, unknown, OptionFormDialogResult | null>(OptionFormDialog, {
      data: { mode: 'create', optionLabel: '', isCorrect: false }
    });
    ref.afterClosed().pipe(
      filter((r): r is OptionFormDialogResult => !!r),
      switchMap(result => this.ensureDraft()().pipe(map(outcome => ({ outcome, result }))))
    ).subscribe({
      next: ({ outcome, result }) => {
        const currentQuestion = this.resolveCurrentQuestion(outcome);
        if (!currentQuestion) { this.error.set(this.notFoundQuestionError()); return; }
        this.api.createOption(currentQuestion.id, {
          optionLabel: result.optionLabel, optionOrder: currentQuestion.options.length + 1, isCorrect: result.isCorrect
        }).subscribe({
          next: created => this.emitUpdated(currentQuestion, [...currentQuestion.options, created]),
          error: (err: HttpErrorResponse) => this.handleError(err)
        });
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  editOption(o: AssignmentQuestionOptionDTO) {
    const optionOrder = o.optionOrder;
    const ref = this.dialog.open<OptionFormDialog, unknown, OptionFormDialogResult | null>(OptionFormDialog, {
      data: { mode: 'edit', optionLabel: o.optionLabel, isCorrect: o.isCorrect }
    });
    ref.afterClosed().pipe(
      filter((r): r is OptionFormDialogResult => !!r),
      switchMap(result => this.ensureDraft()().pipe(map(outcome => ({ outcome, result }))))
    ).subscribe({
      next: ({ outcome, result }) => {
        const currentQuestion = this.resolveCurrentQuestion(outcome);
        if (!currentQuestion) { this.error.set(this.notFoundQuestionError()); return; }
        const currentOption = currentQuestion.options.find(x => x.optionOrder === optionOrder);
        if (!currentOption) { this.error.set(this.notFoundOptionError()); return; }
        this.api.updateOption(currentOption.id, {
          expectedRowVersion: currentOption.rowVersion, optionLabel: result.optionLabel, optionOrder: currentOption.optionOrder, isCorrect: result.isCorrect
        }).subscribe({
          next: updated => this.emitUpdated(currentQuestion, currentQuestion.options.map(x => (x.optionOrder === updated.optionOrder ? updated : x))),
          error: (err: HttpErrorResponse) => this.handleError(err)
        });
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  deleteOption(o: AssignmentQuestionOptionDTO) {
    const optionOrder = o.optionOrder;
    // ensureDraft() runs BEFORE opening the confirm dialog: its own fresh
    // GET /versions/{id} must target the draft's version id and surface the
    // cloned option row's rowVersion, not the published row's.
    this.ensureDraft()().subscribe({
      next: outcome => {
        const currentQuestion = this.resolveCurrentQuestion(outcome);
        if (!currentQuestion) { this.error.set(this.notFoundQuestionError()); return; }
        const currentOption = currentQuestion.options.find(x => x.optionOrder === optionOrder);
        if (!currentOption) { this.error.set(this.notFoundOptionError()); return; }
        const ref = this.dialog.open(DeleteOptionConfirmDialog, {
          data: { versionId: outcome.version.id, questionId: currentQuestion.id, optionId: currentOption.id }
        });
        ref.afterClosed().pipe(filter((r): r is { expectedRowVersion: number } => !!r)).subscribe(result => {
          this.api.deleteOption(currentOption.id, { expectedRowVersion: result.expectedRowVersion }).subscribe({
            next: () => this.emitUpdated(currentQuestion, currentQuestion.options.filter(x => x.id !== currentOption.id)),
            error: (err: HttpErrorResponse) => this.handleError(err)
          });
        });
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  onDrop(event: CdkDragDrop<AssignmentQuestionOptionDTO[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const reordered = [...this.options()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.applyReorder(reordered);
  }

  moveUp(i: number) {
    if (i === 0) return;
    const reordered = [...this.options()];
    [reordered[i - 1], reordered[i]] = [reordered[i], reordered[i - 1]];
    this.applyReorder(reordered);
  }

  moveDown(i: number) {
    if (i === this.options().length - 1) return;
    const reordered = [...this.options()];
    [reordered[i], reordered[i + 1]] = [reordered[i + 1], reordered[i]];
    this.applyReorder(reordered);
  }

  private applyReorder(reordered: AssignmentQuestionOptionDTO[]) {
    const current = this.options();
    const isIdentity = reordered.every((o, i) => o.id === current[i].id);
    if (isIdentity) return;
    // The user's intended final order, captured as the SEQUENCE of
    // optionOrder values (stable across a published->draft clone).
    const orderSequence = reordered.map(o => o.optionOrder);
    this.ensureDraft()().subscribe({
      next: outcome => {
        const currentQuestion = this.resolveCurrentQuestion(outcome);
        if (!currentQuestion) { this.error.set(this.notFoundQuestionError()); return; }
        const targets = orderSequence.map(ord => currentQuestion.options.find(x => x.optionOrder === ord));
        if (targets.some(t => !t)) { this.error.set(this.notFoundOptionError()); return; }
        const entries = (targets as AssignmentQuestionOptionDTO[]).map(o => ({ id: o.id, expectedRowVersion: o.rowVersion }));
        this.api.reorderOptions(currentQuestion.id, { entries }).subscribe({
          next: updated => { this.emitUpdated(currentQuestion, updated); this.announcer.announce('Option order updated'); },
          error: (err: HttpErrorResponse) => this.handleError(err)
        });
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }
}
