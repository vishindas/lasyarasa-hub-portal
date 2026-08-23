import { Component, OnChanges, input, output, signal, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, switchMap, filter } from 'rxjs';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AssignmentAuthoringApiService } from '../data-access/assignment-authoring-api.service';
import { AssignmentQuestionDTO, AssignmentQuestionOptionDTO, AssignmentTemplateVersionDTO } from '../data-access/assignment-staff.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';
import { AssignmentMessageComponent } from '../../../shared/assignment/assignment-message';
import { OptionFormDialog, OptionFormDialogResult } from './option-form-dialog';
import { DeleteOptionConfirmDialog } from './delete-option-confirm-dialog';

/**
 * T5/T6 -- MCQ option config + reorder, nested under a question in
 * question-list.ts. isCorrect (the answer key) renders only here, under
 * features/assignments/**. Every mutation routes through the SAME
 * ensureDraft() passed down from question-list (T3 auto-draft-on-edit).
 * All interactive controls are >=44x44px (accessibility correction, item 8
 * -- previously 40x40).
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
  ensureDraft = input.required<() => Observable<AssignmentTemplateVersionDTO>>();
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

  private emitUpdated() {
    this.questionUpdated.emit({ ...this.question(), options: this.options() });
  }

  private handleError(err: HttpErrorResponse) {
    this.error.set(toAssignmentUiError(err));
  }

  addOption() {
    const ref = this.dialog.open<OptionFormDialog, unknown, OptionFormDialogResult | null>(OptionFormDialog, {
      data: { mode: 'create', optionLabel: '', isCorrect: false }
    });
    ref.afterClosed().pipe(
      filter((r): r is OptionFormDialogResult => !!r),
      switchMap(result => this.ensureDraft()().pipe(switchMap(() => this.api.createOption(this.question().id, {
        optionLabel: result.optionLabel, optionOrder: this.options().length + 1, isCorrect: result.isCorrect
      }))))
    ).subscribe({
      next: created => { this.options.update(list => [...list, created]); this.emitUpdated(); },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  editOption(o: AssignmentQuestionOptionDTO) {
    const ref = this.dialog.open<OptionFormDialog, unknown, OptionFormDialogResult | null>(OptionFormDialog, {
      data: { mode: 'edit', optionLabel: o.optionLabel, isCorrect: o.isCorrect }
    });
    ref.afterClosed().pipe(
      filter((r): r is OptionFormDialogResult => !!r),
      switchMap(result => this.ensureDraft()().pipe(switchMap(() => this.api.updateOption(o.id, {
        expectedRowVersion: o.rowVersion, optionLabel: result.optionLabel, optionOrder: o.optionOrder, isCorrect: result.isCorrect
      }))))
    ).subscribe({
      next: updated => {
        this.options.update(list => list.map(x => (x.id === updated.id ? updated : x)));
        this.emitUpdated();
      },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }

  deleteOption(o: AssignmentQuestionOptionDTO) {
    const ref = this.dialog.open(DeleteOptionConfirmDialog, {
      data: { versionId: this.question().templateVersionId, questionId: this.question().id, optionId: o.id }
    });
    ref.afterClosed().pipe(
      filter((r): r is { expectedRowVersion: number } => !!r),
      switchMap(result => this.ensureDraft()().pipe(switchMap(() => this.api.deleteOption(o.id, { expectedRowVersion: result.expectedRowVersion }))))
    ).subscribe({
      next: () => { this.options.update(list => list.filter(x => x.id !== o.id)); this.emitUpdated(); },
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
    const isIdentity = reordered.every((o, i) => o.id === this.options()[i].id);
    if (isIdentity) return;
    const entries = reordered.map(o => ({ id: o.id, expectedRowVersion: o.rowVersion }));
    this.ensureDraft()().pipe(
      switchMap(() => this.api.reorderOptions(this.question().id, { entries }))
    ).subscribe({
      next: updated => { this.options.set(updated); this.emitUpdated(); this.announcer.announce('Option order updated'); },
      error: (err: HttpErrorResponse) => this.handleError(err)
    });
  }
}
