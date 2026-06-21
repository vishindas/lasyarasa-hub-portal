import { Component, inject, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormArray, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { AgeGroup, DanceStyle, FeeTier } from '../../../core/models/settings.model';

interface StudentDetail {
  student: {
    id: number; firstName: string; lastName: string; email: string; phone: string;
    dateOfBirth: string; enrollmentStatus: string; ageGroupId: number | null;
  };
  guardians: { id: number; firstName: string; lastName: string; email: string;
               phone: string; relationship: string; primary: boolean; linkNotes: string; }[];
  enrollments: { id: number; danceStyleId: number; feeTierId: number; }[];
  notes: { id: number; note: string; createdAt: string; }[];
}

interface DialogData {
  studentDetail: StudentDetail | null;
  ageGroups: AgeGroup[];
  danceStyles: DanceStyle[];
  feeTiers: FeeTier[];
}

@Component({
  selector: 'app-student-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, MatButtonModule,
            MatIconModule, MatDividerModule, CurrencyPipe, DatePipe],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Student' : 'Add Student' }}</h2>

    <mat-dialog-content>

      <!-- ── Student Information ─────────────────────────── -->
      <form [formGroup]="studentForm" class="dialog-form">
        <p class="form-section-label">Student Information</p>

        <div class="form-row-2">
          <mat-form-field appearance="outline">
            <mat-label>First Name</mat-label>
            <input matInput formControlName="firstName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Last Name</mat-label>
            <input matInput formControlName="lastName" />
          </mat-form-field>
        </div>

        <div class="form-row-2">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Phone</mat-label>
            <input matInput formControlName="phone" />
          </mat-form-field>
        </div>

        <div class="form-row-2">
          <mat-form-field appearance="outline">
            <mat-label>Date of Birth</mat-label>
            <input matInput formControlName="dateOfBirth" type="date" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Age Group</mat-label>
            <mat-select formControlName="ageGroupId">
              <mat-option [value]="null">— None —</mat-option>
              @for (ag of data.ageGroups; track ag.id) {
                <mat-option [value]="ag.id">{{ ag.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Enrollment Status</mat-label>
          <mat-select formControlName="enrollmentStatus">
            <mat-option value="ACTIVE">Active</mat-option>
            <mat-option value="ON_BREAK">On Break</mat-option>
            <mat-option value="COMPLETED">Completed</mat-option>
            <mat-option value="DROPPED">Dropped</mat-option>
          </mat-select>
        </mat-form-field>
      </form>

      <!-- ── Dance Style Enrollments ────────────────────────── -->
      <mat-divider style="margin: 8px 0 16px"></mat-divider>

      <div class="dialog-form">
        <div class="form-section-row">
          <p class="form-section-label" style="margin:0">Dance Style Enrollments</p>
          <button mat-button color="primary" type="button" (click)="addEnrollment()">
            <mat-icon>add</mat-icon> Add Style
          </button>
        </div>

        @for (row of enrollmentRows.controls; track $index) {
          <div class="form-row-2-with-action" [formGroup]="asGroup(row)">
            <mat-form-field appearance="outline">
              <mat-label>Dance Style</mat-label>
              <mat-select formControlName="danceStyleId">
                @for (ds of data.danceStyles; track ds.id) {
                  <mat-option [value]="ds.id">{{ ds.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Fee Tier</mat-label>
              <mat-select formControlName="feeTierId">
                @for (ft of data.feeTiers; track ft.id) {
                  <mat-option [value]="ft.id">{{ ft.label }} — {{ ft.amount | currency }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            @if (enrollmentRows.length > 1) {
              <button mat-icon-button color="warn" type="button" (click)="removeEnrollment($index)">
                <mat-icon>remove_circle_outline</mat-icon>
              </button>
            }
          </div>
        }
      </div>

      <!-- ── Guardians / Payers ─────────────────────────────── -->
      <mat-divider style="margin: 16px 0"></mat-divider>

      <div class="dialog-form">
        <div class="form-section-row">
          <p class="form-section-label" style="margin:0">
            Guardians / Payers
            <span class="form-section-hint">(optional — phone used for Zelle matching)</span>
          </p>
          <button mat-button color="primary" type="button" (click)="addGuardian()">
            <mat-icon>person_add</mat-icon> Add
          </button>
        </div>

        @for (row of guardianRows.controls; track $index) {
          <div class="guardian-card" [formGroup]="asGroup(row)">
            <div class="guardian-card-header">
              <span class="guardian-primary-label">
                @if ($index === primaryIndex()) {
                  <mat-icon class="star-icon">star</mat-icon> Primary Payer
                } @else {
                  Guardian {{ $index + 1 }}
                }
              </span>
              <div class="guardian-card-actions">
                @if ($index !== primaryIndex()) {
                  <button mat-button type="button" style="font-size:0.78rem"
                          (click)="setPrimary($index)">
                    Set Primary
                  </button>
                }
                <button mat-icon-button color="warn" type="button"
                        (click)="removeGuardian($index)">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>
            </div>

            <div class="form-row-2">
              <mat-form-field appearance="outline">
                <mat-label>First Name</mat-label>
                <input matInput formControlName="firstName" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Last Name</mat-label>
                <input matInput formControlName="lastName" />
              </mat-form-field>
            </div>

            <div class="form-row-2">
              <mat-form-field appearance="outline">
                <mat-label>Phone</mat-label>
                <input matInput formControlName="phone" placeholder="Zelle sender ID" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Relationship</mat-label>
                <mat-select formControlName="relationship">
                  <mat-option value="MOTHER">Mother</mat-option>
                  <mat-option value="FATHER">Father</mat-option>
                  <mat-option value="GUARDIAN">Guardian</mat-option>
                  <mat-option value="SELF">Self (adult student)</mat-option>
                  <mat-option value="OTHER">Other</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" />
            </mat-form-field>
          </div>
        }

        @if (guardianRows.length === 0) {
          <p class="empty-hint">No guardians added. Use "+ Add" to capture parent or payer details for Zelle matching.</p>
        }
      </div>

      <!-- ── Notes ─────────────────────────────── -->
      <mat-divider style="margin: 16px 0"></mat-divider>

      <div class="dialog-form">
        @if (isEdit && existingNotes().length) {
          <p class="form-section-label">Previous Notes</p>
          @for (n of existingNotes(); track n.id) {
            <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f1f5">
              <div>
                <div style="font-size:0.88rem;color:#495057">{{ n.note }}</div>
                <div style="font-size:0.74rem;color:#adb5bd;margin-top:2px">{{ n.createdAt | date:'medium' }}</div>
              </div>
              <button mat-icon-button color="warn" type="button" style="margin-top:-6px"
                      (click)="deleteNote(n.id)">
                <mat-icon style="font-size:18px">delete_outline</mat-icon>
              </button>
            </div>
          }
          <div style="margin-top:12px"></div>
        }

        <p class="form-section-label" style="margin:0 0 8px">
          {{ isEdit ? 'Add a Note' : 'Notes' }}
          <span class="form-section-hint">(optional)</span>
        </p>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Note</mat-label>
          <textarea matInput [formControl]="newNote" rows="3"
                    placeholder="Internal notes about this student…"></textarea>
        </mat-form-field>
      </div>

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()"
              [disabled]="studentForm.invalid || enrollmentsInvalid() || saving()">
        {{ saving() ? 'Saving…' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `
})
export class StudentFormDialog {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<StudentFormDialog>);
  data: DialogData = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  isEdit = !!this.data.studentDetail;
  saving = signal(false);

  private existingStudent = this.data.studentDetail?.student ?? null;
  private existingGuardians = this.data.studentDetail?.guardians ?? [];
  private existingEnrollments = this.data.studentDetail?.enrollments ?? [];
  existingNotes: WritableSignal<{ id: number; note: string; createdAt: string; }[]> =
    signal([...(this.data.studentDetail?.notes ?? [])]);

  newNote = new FormControl('');

  deleteNote(noteId: number) {
    const id = this.existingStudent!.id;
    this.http.delete(`${environment.apiUrl}/school/v2/students/${id}/notes/${noteId}`)
      .subscribe(() => this.existingNotes.update(ns => ns.filter(n => n.id !== noteId)));
  }

  primaryIndex = signal(
    Math.max(0, this.existingGuardians.findIndex(g => g.primary))
  );

  studentForm = this.fb.group({
    firstName:        [this.existingStudent?.firstName ?? '',        Validators.required],
    lastName:         [this.existingStudent?.lastName  ?? '',        Validators.required],
    email:            [this.existingStudent?.email     ?? ''],
    phone:            [this.existingStudent?.phone     ?? ''],
    dateOfBirth:      [this.existingStudent?.dateOfBirth ?? ''],
    ageGroupId:       [this.existingStudent?.ageGroupId ?? null],
    enrollmentStatus: [this.existingStudent?.enrollmentStatus ?? 'ACTIVE', Validators.required]
  });

  enrollmentRows: FormArray = this.fb.array(
    this.existingEnrollments.length
      ? this.existingEnrollments.map(e => this.makeEnrollmentRow(e.danceStyleId, e.feeTierId))
      : this.isEdit ? [] : [this.makeEnrollmentRow()]
  );

  guardianRows: FormArray = this.fb.array(
    this.existingGuardians.map(g => this.makeGuardianRow(g))
  );

  makeEnrollmentRow(danceStyleId: number | null = null, feeTierId: number | null = null): FormGroup {
    return this.fb.group({
      danceStyleId: [danceStyleId, Validators.required],
      feeTierId:    [feeTierId,    Validators.required]
    });
  }

  makeGuardianRow(g?: any): FormGroup {
    return this.fb.group({
      id:           [g?.id ?? null],
      firstName:    [g?.firstName    ?? ''],
      lastName:     [g?.lastName     ?? ''],
      phone:        [g?.phone        ?? ''],
      email:        [g?.email        ?? ''],
      relationship: [g?.relationship ?? 'MOTHER']
    });
  }

  addEnrollment() { this.enrollmentRows.push(this.makeEnrollmentRow()); }
  removeEnrollment(i: number) { this.enrollmentRows.removeAt(i); }

  addGuardian() { this.guardianRows.push(this.makeGuardianRow()); }

  removeGuardian(i: number) {
    this.guardianRows.removeAt(i);
    if (this.primaryIndex() >= this.guardianRows.length && this.guardianRows.length > 0) {
      this.primaryIndex.set(0);
    }
  }

  setPrimary(i: number) { this.primaryIndex.set(i); }

  asGroup(c: any): FormGroup { return c as FormGroup; }

  enrollmentsInvalid(): boolean {
    return this.enrollmentRows.controls.some(c => c.invalid);
  }

  save() {
    if (this.studentForm.invalid) return;
    this.saving.set(true);

    const raw = this.studentForm.value;
    const student = { ...raw, dateOfBirth: raw.dateOfBirth || null };
    const enrollments = this.enrollmentRows.value;
    const guardians = this.guardianRows.value
      .map((g: any, i: number) => ({ ...g, primary: i === this.primaryIndex() }))
      .filter((g: any) => g.firstName?.trim() || g.phone?.trim());
    const payload = { student, guardians, enrollments };
    const note = this.newNote.value?.trim();

    const postNote = (id: number) => {
      if (!note) { this.ref.close(true); return; }
      this.http.post(`${environment.apiUrl}/school/v2/students/${id}/notes`, { note })
        .subscribe({ next: () => this.ref.close(true), error: () => this.saving.set(false) });
    };

    if (this.isEdit) {
      const id = this.existingStudent!.id;
      this.http.put<any>(`${environment.apiUrl}/school/v2/students/${id}`, payload)
        .subscribe({ next: () => postNote(id), error: () => this.saving.set(false) });
    } else {
      this.http.post<any>(`${environment.apiUrl}/school/v2/students`, payload)
        .subscribe({ next: (res) => postNote(res.student.id), error: () => this.saving.set(false) });
    }
  }
}
