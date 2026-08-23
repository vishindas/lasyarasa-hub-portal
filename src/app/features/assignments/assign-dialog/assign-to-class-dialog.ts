import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { AssignmentTemplateApiService } from '../../../core/services/assignment-template-api.service';
import { AssignmentInstanceApiService } from '../../../core/services/assignment-instance-api.service';
import { AssignmentEligibleClassDTO, AssignmentInstanceDTO } from '../../../core/models/assignment.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';

export interface AssignToClassDialogData { templateId: number; }

/**
 * T9 -- assign to class. Eligible-class picker sourced from one real call
 * (GET /templates/{id}/eligible-classes) -- no N+1 composition (Plan §2).
 * Idempotency key: minted once via crypto.randomUUID() when this dialog is
 * instantiated, reused across every submit attempt from THIS instance
 * (retries), never regenerated except by opening a fresh dialog instance.
 */
@Component({
  selector: 'app-assign-to-class-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatDatepickerModule, MatInputModule, A11yModule],
  styles: [`button[mat-flat-button], button[mat-stroked-button] { min-height: 44px; } .error { color: #b91c1c; }`],
  template: `
    <h2 mat-dialog-title>Assign to class</h2>
    <mat-dialog-content>
      @if (loadingClasses()) {
        <p>Loading eligible classes…</p>
      } @else if (eligibleClasses().length === 0) {
        <p>No eligible classes were found for this template's module.</p>
      } @else {
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Class</mat-label>
          <mat-select [(ngModel)]="classId" cdkFocusInitial>
            @for (c of eligibleClasses(); track c.classId) {
              <mat-option [value]="c.classId">{{ c.className }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Due date</mat-label>
          <input matInput [matDatepicker]="picker" [(ngModel)]="dueDate" />
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>
      }
      @if (error()) { <p class="error">{{ error()!.message }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close(null)">Cancel</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!classId || !dueDate || submitting()" (click)="submit()">Assign</button>
    </mat-dialog-actions>
  `
})
export class AssignToClassDialog implements OnInit {
  ref = inject(MatDialogRef<AssignToClassDialog, AssignmentInstanceDTO | null>);
  data = inject<AssignToClassDialogData>(MAT_DIALOG_DATA);
  private templateApi = inject(AssignmentTemplateApiService);
  private instanceApi = inject(AssignmentInstanceApiService);

  eligibleClasses = signal<AssignmentEligibleClassDTO[]>([]);
  loadingClasses = signal(true);
  submitting = signal(false);
  error = signal<AssignmentUiError | null>(null);

  classId: number | null = null;
  dueDate: Date | null = null;
  private readonly idempotencyKey = crypto.randomUUID();

  ngOnInit() {
    this.templateApi.eligibleClasses(this.data.templateId).subscribe({
      next: classes => { this.eligibleClasses.set(classes); this.loadingClasses.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(toAssignmentUiError(err)); this.loadingClasses.set(false); }
    });
  }

  submit() {
    if (this.classId == null || this.dueDate == null) return;
    this.submitting.set(true);
    this.error.set(null);
    this.instanceApi.assign({
      templateId: this.data.templateId, classId: this.classId,
      dueAt: this.dueDate.toISOString(), idempotencyKey: this.idempotencyKey
    }).subscribe({
      next: instance => this.ref.close(instance),
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const e = toAssignmentUiError(err);
        if (e.kind === 'unknown' && err.error?.code === 'IDEMPOTENCY_KEY_CONFLICT') {
          this.error.set({ kind: 'idempotency-conflict', message: 'This action may have already been processed differently — reload and check the instance list.', resource: null });
        } else {
          this.error.set(e);
        }
      }
    });
  }
}
