import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentLearningApiService } from '../../../core/services/student-learning-api.service';
import { StudentLearningContextService } from '../../../core/services/student-learning-context.service';
import { StudentAccessApiService } from '../../../core/services/student-access-api.service';
import { StudentLearningHomeDTO } from '../../../core/models/student-learning.model';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { backLabelFor, navigateForRecovery } from '../../student-learning/student-learning-recovery.util';
import { StudentAssignmentApiService } from '../../student-assignments/data-access/student-assignment-api.service';

/**
 * D1 foundation: the Student Dashboard's Overview section. Nested inside
 * the existing StudentLearningShellComponent (route `dashboard`, the single
 * canonical landing screen as of UX-2 -- the legacy `home` route now just
 * redirects here) so it inherits the shell's student switcher, class-
 * context bar, and FULL_OUTAGE/offline/lost-access handling for free -- no
 * second authorization layer is added here. Data comes entirely from the
 * already-deployed StudentLearningApiService.home() (Slice 11) and
 * StudentAccessApiService (for the header's student/school name) -- no new
 * endpoint.
 *
 * D4: the Attention card now calls the existing
 * StudentAssignmentApiService.list() (the same endpoint the Assignments
 * page itself uses) to surface a count of DRAFT ("to do") +
 * REVISION_REQUESTED assignments. This call is deliberately independent of
 * loadHeader()/load() -- its own loading/error signals, fired once in
 * ngOnInit() and never re-fired on a class-context query-param change,
 * since assignments are student/provider-scoped, not class-scoped (same
 * scoping as the Fees card). A failure here (including the shared
 * LEARNING_CONTENT_NOT_FOUND code produced by any of the three assignment
 * feature-gate layers -- global student-learning flag, global assignments
 * flag, or provider-level assignments flag; deliberately never
 * distinguished, see StudentAssignmentReadService) never blocks or clears
 * the rest of the dashboard -- it only affects this one card.
 *
 * D5: Current Learning and Learning Path render as independent cards (see
 * the template) rather than an if/else-if chain -- no new call, no new
 * field, no reimplementation of "current module" (still exactly
 * `home().currentModule`, derived server-side from class-level release
 * state, never per-student progress).
 *
 * UX-2 (architect-approved product decisions):
 *  - "Continue learning" renamed to "Current Learning" -- the prior label
 *    overstated what's actually tracked (a class-wide current module, not
 *    personal per-student progress), which the backend genuinely has no
 *    way to provide; this project does not add per-student progress
 *    tracking, only corrects the label to match reality.
 *  - The ambiguous-class "Choose a class" card (a second, competing
 *    picker duplicating the persistent class-context bar the shell already
 *    renders above this page) is retired -- replaced by a lightweight
 *    inline hint pointing at that same bar, per the approved Class-Context-
 *    Selector-vs-My-Classes model: one quick-switch mechanism (the bar),
 *    one intentional directory (My Classes), never two competing pickers.
 *  - Cards are re-weighted, not just listed: Current Learning is the
 *    priority card (spans two grid columns where the grid has them),
 *    ordered first: Current Learning/Learning Path, then Attention/Fees,
 *    then Class details/Class schedule -- matching the approved dashboard
 *    priority order. No card's own visual/typography/color styling
 *    changed -- that restyling is explicitly later, separate work.
 */
@Component({
  selector: 'app-student-dashboard-overview',
  standalone: true,
  // UX-1 visual review round 2: was `:host { max-width: 1200px; margin: 0
  // auto; }` -- a second, narrower cap on top of the shell's own outer
  // bound (student-learning-shell.ts's `main { max-width: 1600px }`),
  // producing a centered "island" of cards with excessive unused space on
  // both sides. `.sp-page` (styles-student.scss) reproduces Provider
  // Portal's own Dashboard pattern instead: gutter padding only, no width
  // cap of its own, so this page fills the shell's existing outer bound
  // exactly the way Provider's Dashboard fills its shell's uncapped
  // `main.page-content`. Geometry only -- card content/typography/grid
  // internals below are unchanged.
  host: { class: 'sp-page' },
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, CurriculumMessageComponent],
  styles: [`
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.6rem; color: #1C1A16; margin: 0 0 4px; }
    .school-name { margin: 0 0 20px; color: #6B6255; font-size: 0.9rem; }
    /* Second UX-01 refinement: a rigid "always exactly 2 columns" grid left
       each card wide but sparse at this container's new width, reading as
       "small cluster, mostly empty" rather than "using the space" -- a
       card-count-aware, auto-fit responsive grid replaces the fixed
       1-then-2-column breakpoint so column count scales with the actual
       available width instead of a hardcoded number. */
    /* UX-1 visual review round 2: minmax()'s 320px floor is a genuine lower
       bound, not a safe one -- CSS Grid permits a track to exceed its
       container's own width when the minimum can't fit, which the wider
       32px gutter above (matching Provider's own page padding) made
       reachable at real narrow-phone widths (a true 320px-wide device has
       only 320-64=256px available, below the 320px floor). min(320px, 100%)
       clamps the floor to whatever's actually available, so a column never
       exceeds its container -- the standard safe-grid pattern, same 4/2/1
       column behavior at every width this was already verified at (1920/
       1440/1024/768px), zero change to card content/count/gap/typography. */
    .grid { container-type: inline-size; display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); }
    .card { border-radius: 8px !important; border: 1px solid #E3DCC8 !important; }
    /* UX-2: priority re-weighting -- Current Learning spans two grid tracks
       when the grid actually has two to give. An earlier version of this
       rule applied grid-column: span 2 unconditionally on the assumption
       that auto-fit's single-column collapse at narrow widths made the span
       a harmless no-op -- that assumption was wrong and was caught during
       this slice's own 375px verification pass: when the explicit auto-fit
       grid resolves to only 1 track, an item that still declares span:2
       forces the browser to fabricate an IMPLICIT second column (sized to
       its content via grid-auto-columns: auto, with no minmax safety at
       all), which measurably overflowed the grid's own container box. The
       container query below gates the span to exactly the same condition
       the safe-grid minmax(min(320px,100%),1fr) rule already uses to decide
       whether 2 real tracks exist: 2 tracks of the 320px floor plus one
       14px gap = 654px of available grid width. Below that, the card stays
       at the implicit default (span 1); no overflow is possible either way
       because the span the browser actually honors always matches the
       column count the grid actually has. */
    @container (min-width: 654px) {
      .card.priority { grid-column: span 2; }
    }
    .card a, .card button { min-height: 44px; }
    .card-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #A3762C; font-weight: 700; margin: 0 0 6px; }
    .schedule-line { margin: 2px 0; font-size: 0.9rem; color: #1C1A16; }
    .schedule-unavailable { color: #6B6255; font-style: italic; }
    .empty-note { color: #6B6255; font-size: 0.85rem; }
    /* UX-2: replaces the retired "Choose a class" friction card -- points at
       the persistent class-context bar (rendered by the shell, above this
       page) instead of duplicating it with a second picker. */
    .context-hint { color: #6B6255; font-size: 0.85rem; margin: 0 0 14px; }
    .no-classes { border: 1px solid #E3DCC8; border-radius: 8px; padding: 20px; max-width: 480px; }
    .no-classes h2 { font-family: Fraunces, Georgia, serif; font-size: 1.1rem; color: #1C1A16; margin: 0 0 8px; }
    .no-classes p { margin: 0; color: #6B6255; font-size: 0.9rem; }
  `],
  template: `
    <h1 tabindex="-1">{{ studentName() || 'Dashboard' }}</h1>
    @if (schoolName()) { <p class="school-name">{{ schoolName() }}</p> }

    @if (loadError(); as e) {
      <app-curriculum-message [error]="e" [backLabel]="recoveryLabel(e.kind)" (back)="onBack(e.kind)" />
    } @else if (loading()) {
      <mat-spinner diameter="36" />
    } @else if (home(); as h) {
      @if (!h.classSelectionRequired && h.selectedClassId == null) {
        <!-- No class-dependent content (Attention/Continue-learning/Class-schedule cards)
             is ever rendered here -- all of it implies a normal class context this
             student doesn't have. -->
        <div class="no-classes" role="status">
          <h2>No active classes</h2>
          <p>There are no active classes connected to this student yet. Please contact the school if you believe a class should appear here.</p>
        </div>
      } @else {
      @if (h.classSelectionRequired) {
        <!-- UX-2: the "Choose a class" friction card is retired -- this
             points at the persistent class-context bar (shell-rendered,
             directly above this page) instead of duplicating it with a
             second, competing picker. -->
        <p class="context-hint">Select a class above to see your current learning and class details.</p>
      }
      <div class="grid">
        <!-- UX-2 priority order: Current Learning/Learning Path first (the
             reason a student is here), then Attention/Fees, then Class
             details/Class schedule -- matches the approved dashboard
             priority grid. Current Learning and Learning Path stay
             independent @if blocks, not an @if/@else-if chain -- both
             render together whenever both are present, so a current
             module never silently hides the Dashboard's only link into the
             full module list. -->
        @if (!h.classSelectionRequired && h.selectedClassId != null) {
          @if (h.currentModule) {
            <mat-card class="card priority">
              <mat-card-content>
                <p class="card-title">Current Learning</p>
                <a mat-stroked-button [routerLink]="['/my-students', studentId(), 'classes', h.selectedClassId, 'modules', h.currentModule.moduleId]">{{ h.currentModule.title }}</a>
              </mat-card-content>
            </mat-card>
          }
          @if (h.learningPath) {
            <mat-card class="card">
              <mat-card-content>
                <p class="card-title">Learning path</p>
                <a mat-stroked-button [routerLink]="['/my-students', studentId(), 'classes', h.selectedClassId, 'path']">{{ h.learningPath.curriculumTitle }}@if (h.learningPath.level) { &nbsp;·&nbsp;{{ h.learningPath.level }} }</a>
              </mat-card-content>
            </mat-card>
          }
          @if (!h.currentModule && !h.learningPath) {
            <mat-card class="card">
              <mat-card-content>
                <p class="card-title">Learning path</p>
                <p class="empty-note">No curriculum assigned yet for this class.</p>
              </mat-card-content>
            </mat-card>
          }
        }

        <mat-card class="card">
          <mat-card-content>
            <p class="card-title">Attention</p>
            @if (assignmentsLoading()) {
              <mat-spinner diameter="24" />
            } @else if (assignmentsError()) {
              <p class="empty-note">Assignments aren't available right now.</p>
              <button mat-stroked-button type="button" (click)="loadAssignments()">Retry</button>
            } @else if (assignmentsAttentionCount() === 0) {
              <p class="empty-note">No open assignments right now.</p>
            } @else {
              <p class="empty-note">{{ assignmentsAttentionLabel() }}</p>
              <a mat-stroked-button [routerLink]="['/my-students', studentId(), 'assignments']">View assignments</a>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="card">
          <mat-card-content>
            <p class="card-title">Fees</p>
            <a mat-stroked-button [routerLink]="['/my-students', studentId(), 'fees']">View fees</a>
          </mat-card-content>
        </mat-card>

        @if (!h.classSelectionRequired && h.selectedClassId != null) {
          <mat-card class="card">
            <mat-card-content>
              <p class="card-title">Class details</p>
              <a mat-stroked-button [routerLink]="['/my-students', studentId(), 'classes', h.selectedClassId, 'class-info']">View class details</a>
            </mat-card-content>
          </mat-card>
        }

        <mat-card class="card">
          <mat-card-content>
            <p class="card-title">Class schedule</p>
            @if (!h.classSelectionRequired && h.selectedClassId != null) {
              <!-- UX-2 correction: a selected class is a specific class context
                   -- its own Dashboard schedule card must describe only that
                   class, never the student's other classes. The aggregate
                   multi-class list below is reserved for when there genuinely
                   is no single class context (classSelectionRequired, or no
                   classes at all), where it's the only useful schedule view. -->
              @if (selectedClassSchedule(); as s) {
                <p class="schedule-line">{{ s }}</p>
              } @else {
                <p class="schedule-line schedule-unavailable">Schedule unavailable</p>
              }
            } @else {
              @for (c of classes(); track c.classId) {
                @if (c.schedule) {
                  <p class="schedule-line">{{ c.className }}: {{ c.schedule }}</p>
                } @else {
                  <p class="schedule-line schedule-unavailable">{{ c.className }}: schedule unavailable</p>
                }
              }
            }
          </mat-card-content>
        </mat-card>
      </div>
      }
    }
  `
})
export class StudentDashboardOverviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentLearningApiService);
  private accessApi = inject(StudentAccessApiService);
  private assignmentApi = inject(StudentAssignmentApiService);
  private destroyRef = inject(DestroyRef);
  context = inject(StudentLearningContextService);

  studentId = signal<number>(0);
  home = signal<StudentLearningHomeDTO | null>(null);
  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);
  studentName = signal<string | null>(null);
  schoolName = signal<string | null>(null);

  assignmentsLoading = signal(true);
  assignmentsError = signal(false);
  assignmentsAttentionCount = signal(0);
  assignmentsAttentionLabel = computed(() => {
    const n = this.assignmentsAttentionCount();
    return n === 1 ? '1 assignment needs your attention.' : `${n} assignments need your attention.`;
  });

  classes = computed(() => this.context.classes());

  /**
   * UX-2 correction: derived entirely from data already fetched for the
   * class-context bar (StudentLearningContextService.classes()) -- no new
   * endpoint or backend change. `null` covers both "no class selected" and
   * "the selected class has no schedule on file", which the template
   * renders identically ("Schedule unavailable").
   */
  selectedClassSchedule = computed(() => {
    const id = this.home()?.selectedClassId;
    if (id == null) return null;
    return this.classes().find(c => c.classId === id)?.schedule ?? null;
  });

  ngOnInit() {
    const studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    this.studentId.set(studentId);
    this.loadHeader(studentId);
    this.loadAssignments();

    // Subscribes to queryParamMap (not snapshot) so a class-switch that
    // navigates back to this same route (the shell stays on Dashboard
    // rather than jumping to Learning Path) re-fetches instead of leaving
    // stale content on screen -- Angular reuses this component instance
    // for a same-route, query-param-only navigation and only emits a new
    // queryParamMap value, it does not rerun ngOnInit.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const classIdParam = params.get('classId');
      const classId = classIdParam != null ? Number(classIdParam) : (this.context.selectedClassId() ?? undefined);
      this.load(studentId, classId);
    });
  }

  private loadHeader(studentId: number) {
    this.accessApi.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => {
        // Security: never let a late-arriving success response repopulate
        // identity after the main content call already failed for this
        // student (e.g. STUDENT_CONTEXT_UNAVAILABLE) -- these two calls are
        // independent/unordered, and the account-level list can legitimately
        // still succeed even when the specific per-student check just failed.
        if (this.loadError()) return;
        const mine = list.find(s => s.studentId === studentId);
        this.studentName.set(mine?.studentDisplayName ?? null);
        this.schoolName.set(mine?.providerDisplayName ?? null);
      },
      error: () => { /* header enrichment only -- never blocks the overview itself */ }
    });
  }

  /**
   * Independent of loadHeader()/load(): assignments are student/provider-
   * scoped (same as Fees), not class-scoped, so this never re-fires on a
   * class-context change and never blocks or is blocked by the other cards.
   * Any failure (including the shared LEARNING_CONTENT_NOT_FOUND produced
   * by any of the three assignment feature-gate layers) is deliberately
   * treated as one undifferentiated "unavailable" state here -- the caller
   * cannot and should not try to tell those layers apart.
   */
  loadAssignments() {
    this.assignmentsLoading.set(true);
    this.assignmentsError.set(false);
    this.assignmentApi.list(this.studentId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => {
        this.assignmentsAttentionCount.set(rows.filter(a => a.status === 'DRAFT' || a.status === 'REVISION_REQUESTED').length);
        this.assignmentsLoading.set(false);
      },
      error: () => {
        this.assignmentsError.set(true);
        this.assignmentsLoading.set(false);
      }
    });
  }

  private load(studentId: number, classId: number | undefined) {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.home(studentId, classId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: h => {
        this.loading.set(false);
        this.home.set(h);
        if (h.selectedClassId != null && h.selectedClassId !== this.context.selectedClassId()) {
          this.context.selectClass(h.selectedClassId);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.home.set(null);
        // Security: clear any identity already shown (e.g. from a faster-
        // resolving loadHeader() call, or a previously-authorized render of
        // this same component instance) the moment the main content call
        // fails -- never leave student/school name displayed alongside an
        // error/lost-access state.
        this.studentName.set(null);
        this.schoolName.set(null);
        this.loadError.set(toCurriculumUiError(err));
      }
    });
  }

  recoveryLabel(kind: CurriculumUiError['kind']): string | null {
    return backLabelFor(kind);
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId());
  }
}
