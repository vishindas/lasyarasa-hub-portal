import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AssignmentQuestionType } from '../../../core/models/assignment.model';

export interface QuestionFormDialogData {
  mode: 'create' | 'edit';
  questionType: AssignmentQuestionType;
  prompt: string;
  maxSelections: number | null;
}

export interface QuestionFormDialogResult {
  questionType: AssignmentQuestionType;
  prompt: string;
  maxSelections: number | null;
}

/** T4 -- question builder, all 4 question types. */
@Component({
  selector: 'app-question-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Add question' : 'Edit question' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Question type</mat-label>
        <mat-select [(ngModel)]="questionType" [disabled]="data.mode === 'edit'">
          <mat-option value="SINGLE_CHOICE">Single choice</mat-option>
          <mat-option value="MULTIPLE_CHOICE">Multiple choice</mat-option>
          <mat-option value="SHORT_TEXT">Short text</mat-option>
          <mat-option value="LONG_TEXT">Long text</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Prompt</mat-label>
        <textarea matInput rows="3" [(ngModel)]="prompt" cdkFocusInitial></textarea>
      </mat-form-field>
      @if (questionType === 'MULTIPLE_CHOICE') {
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Max selections</mat-label>
          <input matInput type="number" min="1" [(ngModel)]="maxSelections" />
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close(null)">Cancel</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!prompt.trim()" (click)="save()">Save</button>
    </mat-dialog-actions>
  `
})
export class QuestionFormDialog {
  ref = inject(MatDialogRef<QuestionFormDialog, QuestionFormDialogResult | null>);
  data = inject<QuestionFormDialogData>(MAT_DIALOG_DATA);

  questionType: AssignmentQuestionType = this.data.questionType;
  prompt = this.data.prompt;
  maxSelections: number | null = this.data.maxSelections;

  save() {
    this.ref.close({
      questionType: this.questionType,
      prompt: this.prompt.trim(),
      maxSelections: this.questionType === 'MULTIPLE_CHOICE' ? this.maxSelections : null
    });
  }
}
