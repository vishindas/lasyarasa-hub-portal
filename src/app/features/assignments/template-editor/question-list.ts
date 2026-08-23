import { Component, OnChanges, input, output, signal, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AssignmentAuthoringApiService } from '../data-access/assignment-authoring-api.service';
import { AssignmentQuestionDTO } from '../data-access/assignment-staff.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';
import { QuestionListRowComponent } from './question-list-row';
import { QuestionFormDialog, QuestionFormDialogResult } from './question-form-dialog';
import { DeleteQuestionConfirmDialog } from './delete-question-confirm-dialog';
import { OptionList } from './option-list';

/** T4/T6 -- question builder + reorder. CDK drag + explicit up/down buttons, never drag-only (Plan §17/§18). */
@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [DragDropModule, MatButtonModule, MatIconModule, QuestionListRowComponent, OptionList],
  styles: [`
    .list { display: flex; flex-direction: column; gap: 4px; }
    .error { color: #b91c1c; padding: 8px 0; }
    .expanded { padding: 8px 0 16px 24px; }
  `],
  template: `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h3 style="margin:0">Questions</h3>
      @if (draft()) {
        <button mat-stroked-button type="button" (click)="addQuestion()">
          <mat-icon>add</mat-icon> Add Question
        </button>
      }
    </div>

    @if (error()) { <p class="error">{{ error()!.message }}</p> }

    @if (questions().length === 0) {
      <p style="color:#adb5bd">No questions yet.</p>
    } @else {
      <div class="list" cdkDropList (cdkDropListDropped)="onDrop($event)">
        @for (q of questions(); track q.id; let i = $index) {
          <div cdkDrag [cdkDragDisabled]="!draft()" [cdkDragData]="q">
            <app-question-list-row
              [question]="q" [position]="i" [total]="questions().length" [disabled]="!draft()"
              (open)="editQuestion(q)" (remove)="deleteQuestion(q)"
              (moveUp)="moveUp(i)" (moveDown)="moveDown(i)" />
            @if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') {
              <div class="expanded">
                <app-option-list [question]="q" [draft]="draft()" (questionUpdated)="onQuestionUpdated($event)" />
              </div>
            }
          </div>
        }
      </div>
    }
  `
})
export class QuestionList implements OnChanges {
  versionId = input.required<number>();
  initialQuestions = input.required<AssignmentQuestionDTO[]>();
  draft = input.required<boolean>();

  private api = inject(AssignmentAuthoringApiService);
  private dialog = inject(MatDialog);
  private announcer = inject(LiveAnnouncer);

  questions = signal<AssignmentQuestionDTO[]>([]);
  error = signal<AssignmentUiError | null>(null);

  ngOnChanges() {
    this.questions.set(this.initialQuestions());
  }

  onQuestionUpdated(updated: AssignmentQuestionDTO) {
    this.questions.update(list => list.map(q => (q.id === updated.id ? updated : q)));
  }

  addQuestion() {
    const ref = this.dialog.open<QuestionFormDialog, unknown, QuestionFormDialogResult | null>(QuestionFormDialog, {
      data: { mode: 'create', questionType: 'SHORT_TEXT', prompt: '', maxSelections: null }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.api.createQuestion(this.versionId(), {
        questionType: result.questionType, prompt: result.prompt,
        questionOrder: this.questions().length + 1, maxSelections: result.maxSelections
      }).subscribe({
        next: created => this.questions.update(list => [...list, created]),
        error: (err: HttpErrorResponse) => this.error.set(toAssignmentUiError(err))
      });
    });
  }

  editQuestion(q: AssignmentQuestionDTO) {
    const ref = this.dialog.open<QuestionFormDialog, unknown, QuestionFormDialogResult | null>(QuestionFormDialog, {
      data: { mode: 'edit', questionType: q.questionType, prompt: q.prompt, maxSelections: q.maxSelections }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.api.updateQuestion(q.id, {
        expectedRowVersion: q.rowVersion, prompt: result.prompt,
        questionOrder: q.questionOrder, maxSelections: result.maxSelections
      }).subscribe({
        next: updated => this.onQuestionUpdated(updated),
        error: (err: HttpErrorResponse) => this.error.set(toAssignmentUiError(err))
      });
    });
  }

  deleteQuestion(q: AssignmentQuestionDTO) {
    const ref = this.dialog.open(DeleteQuestionConfirmDialog, { data: { versionId: this.versionId(), questionId: q.id } });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.api.deleteQuestion(q.id, { expectedRowVersion: result.expectedRowVersion }).subscribe({
        next: () => this.questions.update(list => list.filter(x => x.id !== q.id)),
        error: (err: HttpErrorResponse) => this.error.set(toAssignmentUiError(err))
      });
    });
  }

  onDrop(event: CdkDragDrop<AssignmentQuestionDTO[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const reordered = [...this.questions()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.applyReorder(reordered);
  }

  moveUp(i: number) {
    if (i === 0) return;
    const reordered = [...this.questions()];
    [reordered[i - 1], reordered[i]] = [reordered[i], reordered[i - 1]];
    this.applyReorder(reordered);
  }

  moveDown(i: number) {
    if (i === this.questions().length - 1) return;
    const reordered = [...this.questions()];
    [reordered[i], reordered[i + 1]] = [reordered[i + 1], reordered[i]];
    this.applyReorder(reordered);
  }

  private applyReorder(reordered: AssignmentQuestionDTO[]) {
    // Array position encodes the desired final order -- the whole sibling
    // set must be sent (a complete permutation), not just the moved entries.
    const isIdentity = reordered.every((q, i) => q.id === this.questions()[i].id);
    if (isIdentity) return;
    const entries = reordered.map(q => ({ id: q.id, expectedRowVersion: q.rowVersion }));
    this.api.reorderQuestions(this.versionId(), { entries }).subscribe({
      next: updated => {
        this.questions.set(updated);
        this.announcer.announce('Question order updated');
      },
      error: (err: HttpErrorResponse) => {
        const e = toAssignmentUiError(err);
        this.error.set(e);
        // Server's atomicity guarantee means there is never a partially-applied
        // state to reconcile -- discard the local reorder attempt entirely.
        this.questions.set(this.questions());
      }
    });
  }
}
