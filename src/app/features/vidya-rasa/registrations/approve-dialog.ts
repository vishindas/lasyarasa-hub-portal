import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../../environments/environment';
import { SchoolClass } from '../../../core/models/class.model';

export interface ApproveDialogData {
  registration: any;
}

@Component({
  selector: 'app-approve-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatSelectModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Approve Registration</h2>
    <mat-dialog-content style="overflow-x:hidden;min-width:400px">
      <p style="color:#6b7280;font-size:0.88rem;margin:0 0 16px">
        Approving <strong>{{ data.registration.firstName }} {{ data.registration.lastName }}</strong>.
        Optionally assign a class now — you can always do it later from the student profile.
      </p>

      @if (data.registration.styleInterest || data.registration.dateOfBirth) {
        <div style="background:#eef2ff;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:0.85rem;color:#3730a3;display:flex;gap:24px">
          @if (data.registration.styleInterest) {
            <span><strong>Style interest:</strong> {{ data.registration.styleInterest }}</span>
          }
          @if (data.registration.dateOfBirth) {
            <span><strong>Age:</strong> {{ age(data.registration.dateOfBirth) }}</span>
          }
        </div>
      }

      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Assign to Class (optional)</mat-label>
        <mat-select [formControl]="classControl">
          <mat-option [value]="null">— Assign later —</mat-option>
          @for (c of filteredClasses(); track c.id) {
            <mat-option [value]="c.id">
              {{ c.danceStyleName ?? '?' }} — {{ c.ageGroupLabel ?? '?' }} — {{ c.batchName }}
            </mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (isFiltered()) {
        <p style="font-size:0.78rem;color:#6b7280;margin:-8px 0 8px;text-align:right">
          Showing {{ filteredClasses().length }} of {{ classes().length }} classes for {{ data.registration.styleInterest }}.
          <a href="#" style="color:#4f46e5" (click)="$event.preventDefault(); showAll.set(true)">Show all</a>
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="confirm()">Approve</button>
    </mat-dialog-actions>
  `
})
export class ApproveDialog implements OnInit {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<ApproveDialog>);
  data = inject<ApproveDialogData>(MAT_DIALOG_DATA);
  classControl = inject(FormBuilder).control(null);
  classes = signal<SchoolClass[]>([]);
  showAll = signal(false);

  filteredClasses = computed(() => {
    const style = this.data.registration.styleInterest?.trim().toLowerCase();
    if (!style || this.showAll()) return this.classes();
    const matched = this.classes().filter(c =>
      c.danceStyleName?.toLowerCase().includes(style) || style.includes(c.danceStyleName?.toLowerCase() ?? '')
    );
    return matched.length ? matched : this.classes();
  });

  isFiltered = computed(() => {
    const style = this.data.registration.styleInterest?.trim().toLowerCase();
    if (!style || this.showAll()) return false;
    return this.filteredClasses().length < this.classes().length;
  });

  ngOnInit() {
    this.http.get<SchoolClass[]>(`${environment.apiUrl}/school/classes`)
      .subscribe(d => this.classes.set(d));
  }

  age(dob: string): string {
    const today = new Date();
    const birth = new Date(dob);
    let years = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
    return years >= 0 ? `${years} yrs` : '—';
  }

  confirm() {
    this.ref.close({ confirmed: true, classId: this.classControl.value ?? null });
  }
}
