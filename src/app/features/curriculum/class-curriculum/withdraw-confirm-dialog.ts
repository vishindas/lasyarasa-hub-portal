import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface WithdrawConfirmData { moduleTitle: string; }

/**
 * Slice 3 §1.5: withdraw is "an explicit action with a required audit
 * reason and a warning about consequences, never a silent removal."
 * Confirm stays disabled until a non-blank reason is entered.
 */
@Component({
  selector: 'app-withdraw-confirm-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, A11yModule],
  template: `
    <h2 mat-dialog-title>Withdraw "{{ data.moduleTitle }}"?</h2>
    <mat-dialog-content>
      <p>This removes the module from the class's active list. It will no longer appear in the student's Learning Path, and lessons/submissions already made stay linked to their original version in history.</p>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Reason (required, recorded in the audit history)</mat-label>
        <textarea matInput rows="2" [(ngModel)]="reason" (ngModelChange)="reasonChanged($event)"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" cdkFocusInitial (click)="ref.close(null)">Cancel</button>
      <button mat-flat-button color="warn" type="button" [disabled]="!canConfirm()" (click)="ref.close(reason.trim())">Withdraw</button>
    </mat-dialog-actions>
  `
})
export class WithdrawConfirmDialog {
  ref = inject(MatDialogRef<WithdrawConfirmDialog, string | null>);
  data = inject<WithdrawConfirmData>(MAT_DIALOG_DATA);

  reason = '';
  private canConfirmSig = signal(false);
  canConfirm = this.canConfirmSig.asReadonly();

  reasonChanged(value: string) {
    this.canConfirmSig.set(value.trim().length > 0);
  }
}
