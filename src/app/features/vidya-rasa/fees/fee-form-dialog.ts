import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { environment } from '../../../../environments/environment';
import { Fee } from '../../../core/models/fee.model';
import { FeeTier } from '../../../core/models/settings.model';
import { Student } from '../../../core/models/student.model';

export interface FeeDialogData {
  fee?: Fee;
  studentId?: number;
  feeTierId?: number;
  feeTiers?: FeeTier[];
}

@Component({
  selector: 'app-fee-form-dialog',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, MatButtonModule, MatAutocompleteModule],
  template: `
    <h2 mat-dialog-title>{{ data?.fee ? 'Edit Fee' : 'Add Fee' }}</h2>
    <mat-dialog-content style="overflow-x:hidden">
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:8px;padding-top:4px">

        @if (data?.fee || data?.studentId) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Student</mat-label>
            <input matInput [value]="data?.fee?.studentName || preselectedStudentName()" readonly />
          </mat-form-field>
        } @else {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Student</mat-label>
            <input matInput [formControl]="studentSearch"
                   [matAutocomplete]="studentAuto"
                   placeholder="Type name to search…" />
            <mat-autocomplete #studentAuto="matAutocomplete"
                              [displayWith]="displayStudent"
                              (optionSelected)="onStudentSelected($event.option.value)">
              @for (s of filteredStudents(); track s.id) {
                <mat-option [value]="s">{{ s.firstName }} {{ s.lastName }}</mat-option>
              }
              @if (filteredStudents().length === 0 && studentSearch.value) {
                <mat-option disabled>No students found</mat-option>
              }
            </mat-autocomplete>
          </mat-form-field>
        }

        @if (data?.feeTiers?.length) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Fee Tier</mat-label>
            <mat-select formControlName="feeTierId" (selectionChange)="onTierChange($event.value)">
              <mat-option [value]="null">— None —</mat-option>
              @for (t of data!.feeTiers!; track t.id) {
                <mat-option [value]="t.id">{{ t.label }} ({{ t.amount | number:'1.0-0' }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Amount</mat-label>
          <input matInput type="number" formControlName="amount" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Due Date</mat-label>
          <input matInput type="date" formControlName="dueDate" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            <mat-option value="PENDING">Pending</mat-option>
            <mat-option value="PAID">Paid</mat-option>
            <mat-option value="OVERDUE">Overdue</mat-option>
            <mat-option value="WAIVED">Waived</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Paid On</mat-label>
          <input matInput type="date" formControlName="paidAt" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Paid By</mat-label>
          <input matInput formControlName="paidBy" placeholder="Name of person who paid" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>

      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || saving()">
        {{ saving() ? 'Saving…' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `
})
export class FeeFormDialog implements OnInit {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<FeeFormDialog>);
  data = inject<FeeDialogData | null>(MAT_DIALOG_DATA);
  saving = signal(false);
  preselectedStudentName = signal<string>('');

  private fee = this.data?.fee;
  private allStudents: Student[] = [];
  filteredStudents = signal<Student[]>([]);
  studentSearch = new FormControl<Student | string>('');

  form = inject(FormBuilder).group({
    studentId: [this.fee?.studentId ?? this.data?.studentId ?? null, Validators.required],
    feeTierId: [this.fee?.feeTierId ?? this.data?.feeTierId ?? null],
    amount:    [this.fee?.amount ?? null, Validators.required],
    dueDate:   [this.fee?.dueDate ?? '', Validators.required],
    status:    [this.fee?.status ?? 'PENDING', Validators.required],
    paidAt:    [this.fee?.paidAt ?? ''],
    paidBy:    [this.fee?.paidBy ?? ''],
    notes:     [this.fee?.notes ?? '']
  });

  ngOnInit() {
    this.http.get<Student[]>(`${environment.apiUrl}/school/v2/students`).subscribe(students => {
      this.allStudents = students;
      this.filteredStudents.set(students.slice(0, 20));

      const preselectedId = this.fee?.studentId ?? this.data?.studentId;
      if (preselectedId) {
        const match = students.find(s => s.id === preselectedId);
        if (match) {
          this.studentSearch.setValue(match);
          this.form.get('studentId')!.setValue(match.id as any);
          this.preselectedStudentName.set(match.firstName + ' ' + match.lastName);
        }
      }
    });

    this.studentSearch.valueChanges.subscribe(v => {
      if (typeof v === 'string') {
        const q = v.toLowerCase();
        this.filteredStudents.set(
          q ? this.allStudents
                .filter(s => (s.firstName + ' ' + s.lastName).toLowerCase().includes(q))
                .slice(0, 20)
            : this.allStudents.slice(0, 20)
        );
        this.form.get('studentId')!.setValue(null as any);
      }
    });
  }

  displayStudent = (s: Student | string | null): string => {
    if (!s) return '';
    if (typeof s === 'string') return s;
    return s.firstName + ' ' + s.lastName;
  };

  onStudentSelected(s: Student) {
    this.form.get('studentId')!.setValue(s.id as any);
  }

  onTierChange(tierId: number | null) {
    if (!tierId) return;
    const tier = this.data?.feeTiers?.find(t => t.id === tierId);
    if (tier) this.form.get('amount')!.setValue(tier.amount as any);
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.value;
    const payload = { ...v, paidAt: v.paidAt || null, paidBy: v.paidBy || null };
    const req = this.fee
      ? this.http.put(`${environment.apiUrl}/school/fees/${this.fee.id}`, payload)
      : this.http.post(`${environment.apiUrl}/school/fees`, payload);
    req.subscribe({
      next: () => this.ref.close(true),
      error: () => this.saving.set(false)
    });
  }
}
