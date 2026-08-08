import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { SchoolClass, ClassStudent } from '../../../core/models/class.model';
import { ClassFormDialog } from './class-form-dialog';

@Component({
  selector: 'app-class-detail',
  standalone: true,
  imports: [TitleCasePipe, MatButtonModule, MatIconModule, MatCardModule,
            MatTableModule, MatDialogModule, MatSnackBarModule],
  styles: [`
    .detail-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 16px; }
    .section-label {
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.07em;
      text-transform: uppercase; color: #6c757d; margin: 0 0 14px;
    }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 0.72rem; color: #adb5bd; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-value { font-size: 0.88rem; color: #1a1f36; margin-top: 3px; font-weight: 500; }
    .notes-text { font-size: 0.875rem; color: #374151; line-height: 1.6; margin: 0; white-space: pre-wrap; }
    .student-name-link { cursor: pointer; color: #3d4ed8; font-weight: 500; }
    .student-name-link:hover { text-decoration: underline; }
    @media (max-width: 768px) { .detail-grid { grid-template-columns: 1fr; } }
  `],
  template: `
    @if (cls(); as c) {
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:6px">
          <button mat-icon-button (click)="goBack()" title="Back to Classes">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h2 style="margin:0">{{ c.batchName }}</h2>
            <p class="page-subtitle" style="margin:4px 0 0">
              {{ students().length }} student{{ students().length !== 1 ? 's' : '' }}
              @if (c.danceStyleName) { &nbsp;·&nbsp;{{ c.danceStyleName }} }
            </p>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button mat-stroked-button (click)="openEdit(c)">
            <mat-icon>edit</mat-icon> Edit
          </button>
        </div>
      </div>

      <div class="detail-grid">

        <mat-card>
          <mat-card-content style="padding-top:16px">
            <p class="section-label">Class Details</p>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Batch</span>
                <span class="info-value">{{ c.batchName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Schedule</span>
                <span class="info-value">{{ c.schedule || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Dance Style</span>
                <span class="info-value">{{ c.danceStyleName || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Age Group</span>
                <span class="info-value">{{ c.ageGroupLabel || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Fee Tier</span>
                <span class="info-value">{{ c.feeTierLabel || '—' }}</span>
              </div>
            </div>

            @if (c.description) {
              <p class="section-label" style="margin-top:16px">Description</p>
              <p class="notes-text">{{ c.description }}</p>
            }
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-content style="padding-top:16px">
            <p class="section-label">Students</p>
            <table mat-table [dataSource]="students()" class="full-width">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let s">
                  <span class="student-name-link" (click)="openStudent(s)">{{ s.firstName }} {{ s.lastName }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let s">
                  <span class="status-chip status-{{ s.enrollmentStatus?.toLowerCase() }}">{{ s.enrollmentStatus | titlecase }}</span>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="studentColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: studentColumns;"></tr>
              @if (students().length === 0) {
                <tr class="mat-row">
                  <td [colSpan]="studentColumns.length" class="empty-table">No students enrolled in this class yet.</td>
                </tr>
              }
            </table>
          </mat-card-content>
        </mat-card>

      </div>

    } @else {
      <p style="color:#adb5bd;padding:32px 0">Loading…</p>
    }
  `
})
export class ClassDetailComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  cls = signal<SchoolClass | null>(null);
  students = signal<ClassStudent[]>([]);
  studentColumns = ['name', 'status'];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
  }

  load(id: string) {
    this.http.get<SchoolClass>(`${environment.apiUrl}/school/classes/${id}`)
      .subscribe(d => this.cls.set(d));
    this.http.get<ClassStudent[]>(`${environment.apiUrl}/school/classes/${id}/students`)
      .subscribe(d => this.students.set(d));
  }

  goBack() {
    this.router.navigate(['/vidya-rasa/classes']);
  }

  openStudent(s: ClassStudent) {
    this.router.navigate(['/vidya-rasa/students', s.id]);
  }

  openEdit(cls: SchoolClass) {
    this.dialog.open(ClassFormDialog, { width: '480px', data: cls })
      .afterClosed().subscribe(saved => {
        if (saved) {
          this.load(String(cls.id));
          this.snack.open('Class saved', 'OK', { duration: 2500 });
        }
      });
  }
}
