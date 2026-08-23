import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';

export interface OptionFormDialogData {
  mode: 'create' | 'edit';
  optionLabel: string;
  isCorrect: boolean;
}

export interface OptionFormDialogResult {
  optionLabel: string;
  isCorrect: boolean;
}

/** T5 -- MCQ option config. isCorrect is the answer key -- this dialog only ever renders under features/assignments/**. */
@Component({
  selector: 'app-option-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; }`],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Add option' : 'Edit option' }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Option text</mat-label>
        <input matInput [(ngModel)]="optionLabel" cdkFocusInitial />
      </mat-form-field>
      <mat-checkbox [(ngModel)]="isCorrect">Correct answer</mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close(null)">Cancel</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!optionLabel.trim()" (click)="ref.close({ optionLabel: optionLabel.trim(), isCorrect })">Save</button>
    </mat-dialog-actions>
  `
})
export class OptionFormDialog {
  ref = inject(MatDialogRef<OptionFormDialog, OptionFormDialogResult | null>);
  data = inject<OptionFormDialogData>(MAT_DIALOG_DATA);

  optionLabel = this.data.optionLabel;
  isCorrect = this.data.isCorrect;
}
