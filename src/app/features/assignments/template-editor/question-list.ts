import { Component, OnChanges, input, output, signal, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, switchMap, filter, map } from 'rxjs';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AssignmentAuthoringApiService } from '../data-access/assignment-authoring-api.service';
import { AssignmentQuestionDTO } from '../data-access/assignment-staff.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';
import { AssignmentMessageComponent } from '../../../shared/assignment/assignment-message';
import { QuestionListRowComponent } from './question-list-row';
import { QuestionFormDialog, QuestionFormDialogResult } from './question-form-dialog';
import { DeleteQuestionConfirmDialog } from './delete-question-confirm-dialog';
import { OptionList } from './option-list';
import { EnsureDraftOutcome } from './ensure-draft-outcome.model';

/**
 * T4/T6 -- question builder + reorder. CDK drag + explicit up/down buttons,
 * never drag-only. Every mutation routes through ensureDraft() (T3
 * auto-draft-on-edit).
 *
 * T3 defect fix (follow-up review of 7143f85): a captured question object
 * (`q`, from whatever this.questions() held at click-time) may describe the
 * PUBLISHED version's row -- if ensureDraft() has to clone a draft this
 * call, that row gets a brand-new id/rowVersion in the clone, and q.id no
 * longer identifies anything real. Every mutation below resolves its actual
 * target from the EnsureDraftOutcome AFTER ensureDraft() resolves, by
 * matching questionOrder (the one identifier cloning preserves) against the
 * correct source for that outcome (outcome.version.questions when
 * freshlyCreated, this.questions() otherwise -- see EnsureDraftOutcome's
 * doc comment in template-editor.ts) -- never against the originally
 * captured object's id/rowVersion directly.
 */
@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [DragDropModule, MatButtonModule, MatIconModule, AssignmentMessageComponent, QuestionListRowComponent, OptionList],
  styles: [`
    .list { display: flex; flex-direction: column; gap: 4px; }
    .expanded { padding: 8px 0 16px 24px; }
  `],
  template: `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h3 style="margin:0">Questions</h3>
      @if (editable()) {
        <button mat-stroked-button type="button" [disabled]="mutationsDisabled()" (click)="addQuestion()">
          <mat-icon>add</mat-icon> Add Question
        </button>
      }
    </div>

    <app-assignment-message [error]="error()" (reload)="reload.emit()" />

    @if (questions().length === 0) {
      <p style="color:#adb5bd">No questions yet.</p>
    } @else {
      <div class="list" cdkDropList (cdkDropListDropped)="onDrop($event)">
        @for (q of questions(); track q.id; let i = $index) {
          <div cdkDrag [cdkDragDisabled]="!editable() || mutationsDisabled()" [cdkDragData]="q">
            <app-question-list-row
              [question]="q" [position]="i" [total]="questions().length" [disabled]="!editable() || mutationsDisabled()"
              (open)="editQuestion(q)" (remove)="deleteQuestion(q)"
              (moveUp)="moveUp(i)" (moveDown)="moveDown(i)" />
            @if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') {
              <div class="expanded">
                <app-option-list
                  [question]="q" [editable]="editable()" [mutationsDisabled]="mutationsDisabled()" [ensureDraft]="ensureDraft()"
                  (questionUpdated)="onQuestionUpdated($event)" (reload)="reload.emit()" />
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
  /** Whether editing is currently permitted at all (template not archived) -- independent of whether THIS version is literally DRAFT, since ensureDraft() creates one on demand. */
  editable = input.required<boolean>();
  mutationsDisabled = input(false);
  ensureDraft = input.required<() => Observable<EnsureDraftOutcome>>();
  /** Emitted when a stale-conflict Reload is requested -- the parent owns the authoritative full-version reload. */
  reload = output<void>();

  private api = inject(AssignmentAuthoringApiService);
  private dialog = inject(MatDialog);
  private announcer = inject(LiveAnnouncer);

  questions = signal<AssignmentQuestionDTO[]>([]);
  error = signal<AssignmentUiError | null>(null);

  ngOnChanges() {
    this.questions.set(this.initialQuestions());
  }

  onQuestionUpdated(updated: AssignmentQuestionDTO) {
    this.questions.update(list => list.map(q => (q.questionOrder === updated.questionOrder ? updated : q)));
  }

  private handleError(err: HttpErrorResponse) {
    this.error.set(toAssignmentUiError(err));
  }

  /** Resolves the CURRENT (possibly just-cloned) question matching a captured questionOrder -- never trust a captured id/rowVersion across an ensureDraft() call. */
  private resolveCurrent(outcome: EnsureDraftOutcome, questionOrder: number): AssignmentQuestionDTO | null {
    const source = outcome.freshlyCreated ? outcome.version.questions : this.questions();
    return source.find(x => x.questionOrder === questionOrder) ?? null;
  }

  private notFoundError(): AssignmentUiError {
    return { kind: 'not-found', message: 'This question no longer exists. Reload to see the current state.', resource: 'AssignmentTemplateQuestion' };
  }

  addQuestion() {
    const ref = this.dialog.open<QuestionFormDialog, unknown, QuestionFormDialogResult | null>(QuestionFormDialog, {
      data: { mode: 'create', questionType: 'SHORT_TEXT', prompt: '', maxSelections: null }
    });
    ref.afterClosed().pipe(
      filter((r): r is QuestionFormDialogResult => !!r),
      switchMap(result => this.ensureDraft()().pipe(map(outcome => ({ outcome, result }))))
    ).subscribe({
      next: ({ outcome, result }) => {
        const baseline = outcome.freshlyCreated ? outcome.version.questions : this.questions();
        this.api.createQuestion(outcome.version.id, {
          questionType: result.questionType, prompt: result.prompt,
          questionOrder: baseline.length + 1, maxSelections: result.maxSelections
        }).subscribe({
          next: created => this.questions.set([...baseline, created]),
          error: (err: HttpErrorResponse) => this.handleError(err)
        });
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  editQuestion(q: AssignmentQuestionDTO) {
    const questionOrder = q.questionOrder;
    const ref = this.dialog.open<QuestionFormDialog, unknown, QuestionFormDialogResult | null>(QuestionFormDialog, {
      data: { mode: 'edit', questionType: q.questionType, prompt: q.prompt, maxSelections: q.maxSelections }
    });
    ref.afterClosed().pipe(
      filter((r): r is QuestionFormDialogResult => !!r),
      switchMap(result => this.ensureDraft()().pipe(map(outcome => ({ outcome, result }))))
    ).subscribe({
      next: ({ outcome, result }) => {
        const current = this.resolveCurrent(outcome, questionOrder);
        if (!current) { this.error.set(this.notFoundError()); return; }
        this.api.updateQuestion(current.id, {
          expectedRowVersion: current.rowVersion, prompt: result.prompt, questionOrder: current.questionOrder, maxSelections: result.maxSelections
        }).subscribe({
          next: updated => {
            if (outcome.freshlyCreated) this.questions.set(outcome.version.questions.map(x => (x.questionOrder === updated.questionOrder ? updated : x)));
            else this.onQuestionUpdated(updated);
          },
          error: (err: HttpErrorResponse) => this.handleError(err)
        });
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  deleteQuestion(q: AssignmentQuestionDTO) {
    const questionOrder = q.questionOrder;
    // ensureDraft() runs BEFORE opening the confirm dialog (per review guidance):
    // the dialog's own fresh GET /versions/{id} must target the DRAFT's version
    // id, and the rowVersion it surfaces must be the cloned draft row's, not
    // the published row's.
    this.ensureDraft()().subscribe({
      next: outcome => {
        const current = this.resolveCurrent(outcome, questionOrder);
        if (!current) { this.error.set(this.notFoundError()); return; }
        const ref = this.dialog.open(DeleteQuestionConfirmDialog, { data: { versionId: outcome.version.id, questionId: current.id } });
        ref.afterClosed().pipe(filter((r): r is { expectedRowVersion: number } => !!r)).subscribe(result => {
          this.api.deleteQuestion(current.id, { expectedRowVersion: result.expectedRowVersion }).subscribe({
            next: () => {
              const baseline = outcome.freshlyCreated ? outcome.version.questions : this.questions();
              this.questions.set(baseline.filter(x => x.id !== current.id));
            },
            error: (err: HttpErrorResponse) => this.handleError(err)
          });
        });
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
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
    const current = this.questions();
    const isIdentity = reordered.every((q, i) => q.id === current[i].id);
    if (isIdentity) return;
    // The user's intended final order, captured as the SEQUENCE of
    // questionOrder values (stable across a published->draft clone) --
    // never as ids, which the clone may have replaced.
    const orderSequence = reordered.map(q => q.questionOrder);
    this.ensureDraft()().subscribe({
      next: outcome => {
        const source = outcome.freshlyCreated ? outcome.version.questions : this.questions();
        const targets = orderSequence.map(ord => source.find(x => x.questionOrder === ord));
        if (targets.some(t => !t)) { this.error.set(this.notFoundError()); return; }
        const entries = (targets as AssignmentQuestionDTO[]).map(q => ({ id: q.id, expectedRowVersion: q.rowVersion }));
        this.api.reorderQuestions(outcome.version.id, { entries }).subscribe({
          next: updated => {
            this.questions.set(updated);
            this.announcer.announce('Question order updated');
          },
          error: (err: HttpErrorResponse) => this.handleError(err)
          // Server's atomicity guarantee means there is never a partially-applied
          // state to reconcile -- on any rejection the parent's Reload (via the
          // stale-conflict banner) re-fetches the authoritative version rather
          // than this component attempting a partial local patch.
        });
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }
}
