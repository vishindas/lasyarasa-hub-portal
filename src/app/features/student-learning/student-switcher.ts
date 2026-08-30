import { Component, ElementRef, OnInit, QueryList, ViewChildren, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StudentAccessApiService } from '../../core/services/student-access-api.service';
import { StudentAccessDTO } from '../../core/models/student-learning.model';

/**
 * Foundation component 3, "Student switcher control" (Slice 10 Part IV.1) --
 * reused unchanged in position (header, every screen), implemented here for
 * the first time against real data since it previously only existed as a
 * single-user menu on My Students. Reuses Angular Material's mat-menu
 * rather than hand-rolled focus/keyboard logic: MatMenu already implements
 * most of the exact verified contract (v1.1.2) -- Tab reaches the trigger,
 * Enter/Space opens, Arrow keys navigate with wrapping, Escape closes and
 * returns focus to the trigger. The one behavior MatMenu doesn't default to
 * -- focusing the *selected* option (not just the first) on open -- is
 * applied in onOpened() below, hooked to mat-menu's own (opened) output:
 * that event fires only once the panel's overlay is actually attached and
 * MatMenu's own default first-item focus has already run, which is the
 * point re-targeting is both safe (elements are guaranteed attached, unlike
 * watching the ViewChildren QueryList directly, which can observe a
 * transient state before the overlay finishes attaching) and meaningful.
 *
 * Selecting a student always returns to that student's Dashboard (see
 * select() below for the UX-01 rationale for this target) and clears the
 * class-context service (StudentLearningContextService), per Part II.6's
 * security property: no cached screen state from one student may render
 * while the header names another. The resulting page's H1 receiving focus
 * is handled centrally by StudentLearningShellComponent's route-change
 * focus management, not duplicated here.
 */
@Component({
  selector: 'app-student-switcher',
  standalone: true,
  imports: [MatMenuModule, MatButtonModule, MatIconModule],
  styles: [`
    .trigger { min-height: 44px; color: inherit; }
    .relationship { font-size: 0.75rem; color: #6B6255; text-transform: capitalize; }
    .panel-item { display: flex; flex-direction: column; align-items: flex-start; min-height: 44px; }
    /* v1.1.1 verified fix (296px right edge at 320px, 24px clearance),
       applied here defensively too -- the reverification report's own
       student-switcher regression check confirms the identical containment
       requirement applies to this panel. */
    ::ng-deep .student-switcher-panel {
      width: 300px;
      max-width: calc(100vw - 2 * 24px);
    }
  `],
  template: `
    <button mat-button class="trigger" [matMenuTriggerFor]="panel" aria-haspopup="menu">
      <mat-icon aria-hidden="true">account_circle</mat-icon>
      {{ selectedName() || 'Select student' }}
      <mat-icon aria-hidden="true">arrow_drop_down</mat-icon>
    </button>
    <mat-menu #panel="matMenu" class="student-switcher-panel" xPosition="before" (opened)="onOpened()">
      @for (s of students(); track s.studentId) {
        <button mat-menu-item #optionButton class="panel-item" (click)="select(s)">
          <span>{{ s.studentDisplayName }}</span>
          <span class="relationship">{{ s.accessType === 'SELF' ? 'Self' : 'Guardian' }}</span>
        </button>
      }
    </mat-menu>
  `
})
export class StudentSwitcherComponent implements OnInit {
  private api = inject(StudentAccessApiService);
  private router = inject(Router);

  @ViewChildren('optionButton') optionButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  currentStudentId = input<number | null>(null);

  students = signal<StudentAccessDTO[]>([]);

  ngOnInit() {
    this.api.list().subscribe({
      next: list => this.students.set(list ?? []),
      error: () => this.students.set([])
    });
  }

  onOpened() {
    const buttons = this.optionButtons?.toArray();
    if (!buttons || buttons.length === 0) return;
    const idx = this.students().findIndex(s => s.studentId === this.currentStudentId());
    const target = buttons[idx >= 0 ? idx : 0];
    if (target?.nativeElement) target.nativeElement.focus();
  }

  selectedName(): string | null {
    return this.students().find(s => s.studentId === this.currentStudentId())?.studentDisplayName ?? null;
  }

  // UX-01: exposes the already-derived selected entry (name + accessType) so
  // the new persistent shell can render an unambiguous "Viewing: {name}
  // ({relationship})" line without a second fetch or any new selection
  // logic -- purely a read of state this component already computes.
  selectedEntry = computed(() => this.students().find(s => s.studentId === this.currentStudentId()) ?? null);

  select(s: StudentAccessDTO): void {
    if (s.studentId === this.currentStudentId()) return;
    // Correction 1's security property: switching students always returns
    // to a fresh, unambiguous screen and clears every downstream context.
    // Navigating to a different :studentId root naturally tears down and
    // recreates the whole parameterized route subtree, which is what
    // actually clears module/lesson/assignment-tab state -- there is
    // nothing else to reset here beyond the class-context service (cleared
    // by the shell on studentId change, not here, so this component stays
    // a dumb list).
    //
    // UX-01: retargeted from the legacy `home` route to `dashboard` --
    // now that a persistent rail exists, `home` has no corresponding nav
    // item, so switching left the user on a screen the shell's own
    // navigation couldn't show as active. `home`'s Home/Continue-learning/
    // Learning-path/Class-schedule content is a strict subset of
    // Dashboard's (StudentDashboardOverviewComponent calls the exact same
    // StudentLearningApiService.home(studentId, classId) with no classId,
    // handling zero/one/many-active-class students identically) plus
    // Dashboard adds a real Attention card where Home only ever showed a
    // permanently-empty placeholder -- there is no loss of function, and
    // `dashboard` is the real target the shell's own "Dashboard" link
    // points to. The bare `/my-students/:studentId` redirect and the
    // separate CLASS_CONTEXT_UNAVAILABLE/LEARNING_CONTENT_NOT_FOUND
    // recovery fallback (student-learning-recovery.util.ts, its own
    // architect-reviewed behavior with its own tests) still target `home`
    // unchanged -- this is a narrower, deliberately-scoped fix to this one
    // call site only.
    this.router.navigate(['/my-students', s.studentId, 'dashboard']);
  }
}
