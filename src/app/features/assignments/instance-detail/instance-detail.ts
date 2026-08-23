import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AssignmentInstanceApiService } from '../../../core/services/assignment-instance-api.service';
import { AssignmentInstanceDetailDTO, AssignmentInstanceStudentRollupDTO } from '../../../core/models/assignment.model';
import { AssignmentUiError, toAssignmentUiError } from '../../../core/services/assignment-api-error.util';
import { StatusChipAssignmentComponent } from '../../../shared/assignment/status-chip-assignment';
import { StudentRollupTableComponent } from './student-rollup-table';
import { LateEnrolleeBannerComponent } from './late-enrollee-banner';

/** T10 detail + T11 late-enrollee handling. */
@Component({
  selector: 'app-instance-detail',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, StatusChipAssignmentComponent, StudentRollupTableComponent, LateEnrolleeBannerComponent],
  styles: [`
    .page-header { display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
    .meta { color: #6c757d; margin-bottom: 16px; }
    .empty { color: #adb5bd; padding: 32px 0; }
  `],
  template: `
    <div class="page-header">
      <button mat-icon-button (click)="close()" aria-label="Back to instances"><mat-icon>arrow_back</mat-icon></button>
      <h2 style="margin:0">Instance</h2>
      @if (instance(); as i) { <app-status-chip-assignment [state]="i.status" /> }
    </div>

    @if (loading()) {
      <p class="empty">Loading…</p>
    } @else if (error()) {
      <p style="color:#b91c1c">{{ error()!.message }}</p>
    } @else if (instance(); as i) {
      <p class="meta">{{ i.templateTitle }} · {{ i.className }} · due {{ i.dueAt | date: 'mediumDate' }}</p>

      @if (i.status === 'ACTIVE') {
        <app-late-enrollee-banner [instanceId]="i.id" (refreshed)="loadStudents()" />
      }

      <app-student-rollup-table [students]="students()" />
    }
  `
})
export class InstanceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(AssignmentInstanceApiService);

  instanceId = signal<number | null>(null);
  instance = signal<AssignmentInstanceDetailDTO | null>(null);
  students = signal<AssignmentInstanceStudentRollupDTO[]>([]);
  loading = signal(true);
  error = signal<AssignmentUiError | null>(null);

  ngOnInit() {
    this.instanceId.set(Number(this.route.snapshot.paramMap.get('instanceId')));
    this.load();
  }

  load() {
    const id = this.instanceId();
    if (id == null) return;
    this.loading.set(true);
    this.api.get(id).subscribe({
      next: detail => { this.instance.set(detail); this.loading.set(false); this.loadStudents(); },
      error: (err: HttpErrorResponse) => { this.error.set(toAssignmentUiError(err)); this.loading.set(false); }
    });
  }

  loadStudents() {
    const id = this.instanceId();
    if (id == null) return;
    this.api.students(id).subscribe({
      next: students => this.students.set(students),
      error: (err: HttpErrorResponse) => this.error.set(toAssignmentUiError(err))
    });
  }

  close() {
    this.router.navigate(['/vidya-rasa/assignments/instances']);
  }
}
