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
 * same StudentAccessApiService.list() call, no new endpoint. Given the
 * shell's account menu (email/change password/sign out), since a
 * student/parent landing here before choosing a student had no way to
 * sign out either.
 *
 * UX-8 P1-A: visual content migrated onto the shared --sp-* token system
 * (was the last .sp-scope root still on the pre-redesign ivory/Fraunces/
 * gold palette) -- Fraunces retained only on the wordmark, per the
 * portal-wide exception.
 *
 * Behavior: exactly one accessible student -> redirect straight to that
 * student's dashboard overview (SELF-single direct entry), never lingering
 * on this screen. Two or more -> a genuine selection screen, titled "Choose
 * a student" (D6 correction -- distinct from the neutral "My Students"
 * title used for the loading/zero/error states, since only 2+ is an actual
 * choice the student/parent has to make), with no automatic selection --
 * the student must explicitly pick one, which then goes straight to that
 * student's dashboard. Zero -> honest empty state, never a fake/sample
 * student.
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
  // UX-1: hooks this screen into the shared student token system (.sp-scope,
  // src/styles-student.scss) so AccountMenuComponent's var(--sp-*) rules
  // resolve here too, since this screen sits outside StudentLearningShellComponent's
  // own subtree.
  // UX-8 P1-A: this screen's own visual content (header, cards) is now
  // migrated onto that same token system -- previously it was the one
  // .sp-scope root left on the pre-redesign ivory/black/gold/Fraunces
  // palette. Token/color/font/radius/elevation only: no change to
  // student-selection logic, auto-redirect behavior, or geometry (the
  // .content max-width/centering is unchanged).
  host: { class: 'sp-scope' },
  imports: [MatCardModule, MatProgressSpinnerModule, CurriculumMessageComponent, AccountMenuComponent],
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--sp-bg, #f8f9fb); }
    .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; background: var(--sp-surface, #fff); color: var(--sp-text, #1a1f36);
      border-bottom: 1px solid var(--sp-border, #e8eaf0);
    }
    /* Fraunces stays here -- this is the LasyaRasa wordmark, the one
       approved exception to the portal-wide sans-serif heading rule. */
    .brand { font-family: Fraunces, Georgia, serif; font-weight: 700; }
    .content { max-width: 720px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-size: 1.4rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0 0 20px; }
    .cards { display: grid; gap: 12px; }
    .student-card {
      border-radius: var(--sp-radius, 12px) !important;
      border: 1px solid var(--sp-border-subtle, #edf0f7) !important;
      background: var(--sp-surface, #fff);
      box-shadow: none !important;
      min-height: 44px;
    }
    .student-card.navigable { cursor: pointer; }
    .student-card.navigable:focus-visible, .student-card.navigable:hover { outline: 2px solid var(--sp-primary, #3d4ed8); outline-offset: 2px; }
    .student-name { margin: 0 0 4px; font-weight: 700; color: var(--sp-text, #1a1f36); }
    .school-name { margin: 0 0 4px; font-size: 0.85rem; color: var(--sp-text-muted, #52596b); }
    .relationship { font-size: 0.78rem; color: var(--sp-text-muted, #52596b); text-transform: capitalize; }
    .empty-note { color: var(--sp-text-muted, #52596b); }
  `],
  template: `
    <header class="header">
      <span class="brand">LasyaRasa</span>
      <app-account-menu />
    </header>
    <div class="content">
      <!-- D6 correction: exactly one student never lingers here long enough for the
           title to matter (auto-redirects); zero/loading/error keep the neutral
           "My Students" title; two or more (the only real selection screen) reads
           "Choose a student", per the approved UX decision. -->
      <h1 tabindex="-1">{{ students().length >= 2 ? 'Choose a student' : 'My Students' }}</h1>
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
