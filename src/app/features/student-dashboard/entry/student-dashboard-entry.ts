import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentAccessApiService } from '../../../core/services/student-access-api.service';
import { StudentAccessDTO } from '../../../core/models/student-learning.model';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { AccountMenuComponent } from '../../../shared/account-menu/account-menu';
import { environment } from '../../../../environments/environment';

/**
 * D1 foundation, D6 promotion: this is now the canonical CLIENT landing
 * screen at /my-students (see app.routes.ts), replacing the retired
 * MyStudentsComponent -- same route, same guards (authGuard, clientGuard),
 * same StudentAccessApiService.list() call, no new endpoint. Restyled to
 * the shell's own ivory/Fraunces/gold language (previously a generic
 * Material light theme) and given the shell's account menu (email/change
 * password/sign out), since a student/parent landing here before choosing
 * a student had no way to sign out either.
 *
 * Behavior: exactly one accessible student -> redirect straight to that
 * student's dashboard overview (SELF-single direct entry). More than one ->
 * render clickable student-selection cards. Zero -> honest empty state,
 * never a fake/sample student.
 *
 * D6 dormant gate: this real, working behavior is deliberately still
 * gated by `entryEnabled` (the existing, unrenamed
 * studentLearningEntryEnabled build-time constant) -- exactly the contract
 * MyStudentsComponent previously enforced (inert, non-navigable cards,
 * committed false in every environment), now carried by this component
 * instead. This is intentional: promoting this component's logic to the
 * real /my-students route must not, by itself, make real per-student
 * navigation reachable for every CLIENT user of every provider the moment
 * it deploys -- the architect authorizes that separately (final global
 * activation), as its own last step, per its all-providers-at-once blast
 * radius. Deploying this component with the flag still false must leave
 * production behavior for real users unchanged from today: a listed,
 * non-clickable set of students, no auto-redirect.
 */
@Component({
  selector: 'app-student-dashboard-entry',
  standalone: true,
  imports: [MatCardModule, MatProgressSpinnerModule, CurriculumMessageComponent, AccountMenuComponent],
  styles: [`
    :host { display: block; min-height: 100vh; background: #FBF7EC; }
    .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; background: #1C1A16; color: #FAF6EC;
    }
    .brand { font-family: Fraunces, Georgia, serif; font-weight: 700; }
    .content { max-width: 720px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.5rem; color: #1C1A16; margin: 0 0 20px; }
    .cards { display: grid; gap: 12px; }
    .student-card { border-radius: 0 !important; border: 1px solid #E3DCC8 !important; min-height: 44px; }
    .student-card.navigable { cursor: pointer; }
    .student-card.navigable:focus-visible, .student-card.navigable:hover { outline: 2px solid #7A5419; outline-offset: 2px; }
    .student-name { margin: 0 0 4px; font-weight: 700; color: #1C1A16; }
    .school-name { margin: 0 0 4px; font-size: 0.85rem; color: #6B6255; }
    .relationship { font-size: 0.78rem; color: #6B6255; text-transform: capitalize; }
    .empty-note { color: #6B6255; }
  `],
  template: `
    <header class="header">
      <span class="brand">LasyaRasa</span>
      <app-account-menu />
    </header>
    <div class="content">
      <h1 tabindex="-1">My Students</h1>
      @if (loadError(); as e) {
        <app-curriculum-message [error]="e" [backLabel]="null" (retry)="load()" />
      } @else if (loading()) {
        <mat-spinner diameter="36" />
      } @else if (students().length === 0) {
        <p class="empty-note">No students are linked to this account yet.</p>
      } @else {
        <div class="cards">
          @for (s of students(); track s.studentId) {
            @if (entryEnabled) {
              <mat-card class="student-card navigable" tabindex="0" role="button"
                        [attr.aria-label]="'Open dashboard for ' + s.studentDisplayName"
                        (click)="choose(s)" (keydown.enter)="choose(s)" (keydown.space)="choose(s)">
                <mat-card-content>
                  <p class="student-name">{{ s.studentDisplayName }}</p>
                  <p class="school-name">{{ s.providerDisplayName }}</p>
                  <p class="relationship">{{ s.accessType === 'SELF' ? 'Self' : 'Guardian' }}</p>
                </mat-card-content>
              </mat-card>
            } @else {
              <!-- Dormant: no tabindex/role/click binding at all -- structurally
                   identical to a plain read-only card, matching the retired
                   MyStudentsComponent's exact non-interactive contract. -->
              <mat-card class="student-card">
                <mat-card-content>
                  <p class="student-name">{{ s.studentDisplayName }}</p>
                  <p class="school-name">{{ s.providerDisplayName }}</p>
                  <p class="relationship">{{ s.accessType === 'SELF' ? 'Self' : 'Guardian' }}</p>
                </mat-card-content>
              </mat-card>
            }
          }
        </div>
      }
    </div>
  `
})
export class StudentDashboardEntryComponent implements OnInit {
  private api = inject(StudentAccessApiService);
  private router = inject(Router);

  /** Dormant gate carried forward from the retired MyStudentsComponent -- committed false everywhere; a build-time value only, never read at runtime from config. */
  readonly entryEnabled = environment.studentLearningEntryEnabled;

  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);
  students = signal<StudentAccessDTO[]>([]);

  ngOnInit() {
    this.load();
  }

  /** Named so the load-failure state's Retry action (bound in the template) can re-run the exact same list fetch, not a duplicate of it. */
  load() {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.list().subscribe({
      next: list => {
        this.loading.set(false);
        const students = list ?? [];
        this.students.set(students);
        if (this.entryEnabled && students.length === 1) {
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
    if (!this.entryEnabled) return;
    this.router.navigate(['/my-students', s.studentId, 'dashboard']);
  }
}
