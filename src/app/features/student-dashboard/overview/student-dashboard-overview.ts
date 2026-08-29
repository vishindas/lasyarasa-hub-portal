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
 * the existing StudentLearningShellComponent (route `dashboard` alongside
 * the existing `home`/`classes`/`assignments`/lesson routes) so it inherits
 * the shell's student switcher, class-context bar, and FULL_OUTAGE/offline/
 * lost-access handling for free -- no second authorization layer is added
 * here. Data comes entirely from the already-deployed
 * StudentLearningApiService.home() (Slice 11) and StudentAccessApiService
 * (for the header's student/school name) -- no new endpoint.
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
 * D5: Continue Learning and Learning Path now render as independent cards
 * (see the template) rather than an if/else-if chain, matching
 * StudentLearningHomeComponent's own established behavior for this same
 * StudentLearningHomeDTO -- no new call, no new field, no reimplementation
 * of "current module" (still exactly `home().currentModule`, derived
 * server-side from class-level release state, never per-student progress).
 * Product note carried forward for D6: "Continue learning" is itself a
 * label that slightly overstates what's actually tracked (a class-wide
 * current module, not personal progress) -- out of scope to rename here.
 */
@Component({
  selector: 'app-student-dashboard-overview',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, CurriculumMessageComponent],
  styles: [`
    :host { display: block; max-width: 880px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.6rem; color: #1C1A16; margin: 0 0 4px; }
    .school-name { margin: 0 0 20px; color: #6B6255; font-size: 0.9rem; }
    .grid { display: grid; gap: 14px; grid-template-columns: 1fr; }
    @media (min-width: 640px) { .grid { grid-template-columns: 1fr 1fr; } }
    .card { border-radius: 0 !important; border: 1px solid #E3DCC8 !important; }
    .card a, .card button { min-height: 44px; }
    .card-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #A3762C; font-weight: 700; margin: 0 0 6px; }
    .schedule-line { margin: 2px 0; font-size: 0.9rem; color: #1C1A16; }
    .schedule-unavailable { color: #6B6255; font-style: italic; }
    .empty-note { color: #6B6255; font-size: 0.85rem; }
    .no-classes { border: 1px solid #E3DCC8; padding: 20px; max-width: 480px; }
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
      <div class="grid">
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

        @if (h.classSelectionRequired) {
          <mat-card class="card">
            <mat-card-content>
              <p class="card-title">Continue learning</p>
              <p class="empty-note">This student has more than one active class.</p>
              <a mat-stroked-button [routerLink]="['/my-students', studentId(), 'classes']">Choose a class</a>
            </mat-card-content>
          </mat-card>
        } @else if (h.selectedClassId != null) {
          <!-- D5: Continue Learning and Learning Path are independent @if blocks, not an
               @if/@else-if chain -- both render together whenever both are present, matching
               StudentLearningHomeComponent's own established behavior for this identical DTO.
               The previous mutually-exclusive chain silently hid the Learning Path link (the
               Dashboard's only path into the full module list) whenever a current module
               existed, which is the common case -- inconsistent with Home for the same
               backend state. No new data, no new endpoint: both blocks read fields the
               existing StudentLearningHomeDTO already carries. -->
          @if (h.currentModule) {
            <mat-card class="card">
              <mat-card-content>
                <p class="card-title">Continue learning</p>
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
            @for (c of classes(); track c.classId) {
              @if (c.schedule) {
                <p class="schedule-line">{{ c.className }}: {{ c.schedule }}</p>
              } @else {
                <p class="schedule-line schedule-unavailable">{{ c.className }}: schedule unavailable</p>
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
