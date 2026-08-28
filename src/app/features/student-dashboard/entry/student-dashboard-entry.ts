import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentAccessApiService } from '../../../core/services/student-access-api.service';
import { StudentAccessDTO } from '../../../core/models/student-learning.model';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';

/**
 * D1 foundation: the Student Dashboard's single entry point, reachable only
 * by direct URL (/student-dashboard) while studentLearningEntryEnabled is
 * false -- no nav link points here yet, matching the established dormant-
 * deployment pattern from the assignment/lesson pilots. Reuses the existing
 * GET /account/students endpoint (StudentAccessApiService, unchanged) --
 * no second authorization resolver.
 *
 * Behavior: exactly one accessible student -> redirect straight to that
 * student's dashboard overview (SELF-single direct entry). More than one ->
 * render clickable student-selection cards. Zero -> honest empty state,
 * never a fake/sample student.
 */
@Component({
  selector: 'app-student-dashboard-entry',
  standalone: true,
  imports: [MatCardModule, MatProgressSpinnerModule, CurriculumMessageComponent],
  styles: [`
    :host { display: block; max-width: 720px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.5rem; color: #1C1A16; margin: 0 0 20px; }
    .cards { display: grid; gap: 12px; }
    .student-card { border-radius: 0 !important; border: 1px solid #E3DCC8 !important; min-height: 44px; cursor: pointer; }
    .student-card:focus-visible, .student-card:hover { outline: 2px solid #7A5419; outline-offset: 2px; }
    .student-name { margin: 0 0 4px; font-weight: 700; color: #1C1A16; }
    .school-name { margin: 0 0 4px; font-size: 0.85rem; color: #6B6255; }
    .relationship { font-size: 0.78rem; color: #6B6255; text-transform: capitalize; }
    .empty-note { color: #6B6255; }
  `],
  template: `
    <h1 tabindex="-1">Choose a student</h1>
    @if (loadError(); as e) {
      <app-curriculum-message [error]="e" [backLabel]="null" />
    } @else if (loading()) {
      <mat-spinner diameter="36" />
    } @else if (students().length === 0) {
      <p class="empty-note">No students are linked to this account yet.</p>
    } @else {
      <div class="cards">
        @for (s of students(); track s.studentId) {
          <mat-card class="student-card" tabindex="0" role="button" [attr.aria-label]="'Open dashboard for ' + s.studentDisplayName" (click)="choose(s)" (keydown.enter)="choose(s)" (keydown.space)="choose(s)">
            <mat-card-content>
              <p class="student-name">{{ s.studentDisplayName }}</p>
              <p class="school-name">{{ s.providerDisplayName }}</p>
              <p class="relationship">{{ s.accessType === 'SELF' ? 'Self' : 'Guardian' }}</p>
            </mat-card-content>
          </mat-card>
        }
      </div>
    }
  `
})
export class StudentDashboardEntryComponent implements OnInit {
  private api = inject(StudentAccessApiService);
  private router = inject(Router);

  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);
  students = signal<StudentAccessDTO[]>([]);

  ngOnInit() {
    this.api.list().subscribe({
      next: list => {
        this.loading.set(false);
        const students = list ?? [];
        this.students.set(students);
        if (students.length === 1) {
          this.router.navigate(['/my-students', students[0].studentId, 'dashboard'], { replaceUrl: true });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.loadError.set(toCurriculumUiError(err));
      }
    });
  }

  choose(s: StudentAccessDTO) {
    this.router.navigate(['/my-students', s.studentId, 'dashboard']);
  }
}
