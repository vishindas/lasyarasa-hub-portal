import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { StudentAssignmentApiService } from '../data-access/student-assignment-api.service';
import { StudentAssignmentSummaryDTO } from '../data-access/student-assignment.model';
import { StudentAssignmentUiError, toStudentAssignmentUiError } from '../data-access/student-assignment-ui-error.util';
import { StudentAssignmentMessageComponent } from '../shared/student-assignment-message';
import { studentAssignmentChip, isOverdue, spToneClass } from '../shared/student-assignment-status.util';

/**
 * UX-7D (revised): this is the student/guardian's generic "To Do" action
 * inbox, not an "Assignments page with renamed navigation." Today,
 * assignments are the only real action source, so this renders exactly
 * one conditional section -- "Assignments" -- but the page itself makes no
 * assumption that it will only ever have one. A future source (fees
 * requiring action, consent/forms, teacher-requested tasks, etc.) would
 * add its own independent, similarly-conditional section here; nothing
 * about this component's structure needs to change to accommodate that,
 * and nothing speculative is built for it now -- no generic task
 * interface, no multi-source sorting engine, no fake data.
 *
 * Only DRAFT and REVISION_REQUESTED are shown here -- the same actionable-
 * state definition Dashboard's own Attention card already uses
 * (student-dashboard-overview.ts's assignmentsAttentionCount()), not a
 * second, page-specific definition of "actionable." SUBMITTED is
 * deliberately excluded: it requires no student action (the student
 * already acted; a teacher hasn't yet), so it doesn't belong in an inbox
 * framed around "things requiring your attention." VALIDATED/CLOSED are
 * terminal/historical. All three live on the secondary "Assignment
 * Activity" destination instead (./activity/student-assignment-activity.ts),
 * reached via the "View assignment history" link below -- same
 * fees/fees-history sibling-route pattern already shipped in UX-6, not a
 * new navigation primitive.
 *
 * No tabs here (unlike the prior UX-7D draft, revised after review): tabs
 * imply mutually-exclusive single-source views, which actively fights a
 * true multi-source inbox where sections should stack, not switch. Each
 * source is its own always-or-conditionally-rendered section instead.
 */
@Component({
  selector: 'app-student-assignment-summary',
  standalone: true,
  host: { class: 'sp-page' },
  imports: [RouterLink, NgTemplateOutlet, MatIconModule, MatButtonModule, MatProgressSpinnerModule, StudentAssignmentMessageComponent],
  styles: [`
    /* UX-7A: margin-top compensates for this screen's own class-context bar
       being hidden (student-wide, not class-scoped -- see hideClassContext
       on this feature's routes). Same fix/value as student-fees.ts's own
       h1 -- the bar occupies exactly 65px (measured live in UX-6). */
    h1 { font-size: 1.5rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 65px 0 16px; }
    h1:focus-visible { outline: none; }
    /* UX-7D: the source-level grouping container -- deliberately one
       visual step lighter than the white bordered cards inside it
       (--sp-hover-bg, the same very-light neutral wash already used
       elsewhere in this token system, not a new color), so "these cards
       belong to one source" reads clearly without the container itself
       looking like a large dashboard card competing with its own
       contents. No shadow, no tone/status color -- purely a grouping
       boundary. Future sources (Fees, Performance Availability, etc.)
       would each get their own sibling .source-section, not a shared
       wrapper -- nothing here assumes there will only ever be one. */
    .source-section {
      border: 1px solid var(--sp-border-subtle, #edf0f7);
      border-radius: var(--sp-radius, 12px);
      background: var(--sp-hover-bg, #f4f5f9);
      padding: 16px;
      margin-bottom: 16px;
    }
    /* UX-7D: plain, restrained section heading -- no uppercase/letter-
       spacing/gold, matching the same dark-muted direction the Dashboard
       visual alignment correction established. Only ever rendered when
       its section actually has content (see template) -- an empty
       "Assignments" heading over nothing would be exactly the kind of
       placeholder clutter the generic-inbox model is meant to avoid. */
    .source-heading { font-size: 1.05rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0 0 10px; }
    .sub-heading { font-size: 0.8rem; font-weight: 700; color: var(--sp-text-muted, #52596b); margin: 20px 0 8px; }
    .empty-note { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; color: var(--sp-text-muted, #52596b); padding: 40px 16px; }
    .empty-note mat-icon { font-size: 32px; width: 32px; height: 32px; color: var(--sp-text-faint, #9ba3b8); }
    /* UX-7D: same always-visible secondary-access pattern student-fees.ts's
       own "View payment history" link uses -- present regardless of
       whether the Assignments section itself has anything actionable
       right now. */
    .history-link { display: inline-flex; align-items: center; min-height: 44px; margin-top: 12px; color: var(--sp-primary, #3d4ed8); font-weight: 600; text-decoration: none; font-size: 0.9rem; }
    .history-link:hover, .history-link:focus-visible { text-decoration: underline; outline: 2px solid var(--sp-primary, #3d4ed8); outline-offset: 2px; }
    /* UX-7D correction: was --sp-radius-sm (8px, the token this design
       system reserves for compact ROWS -- module-summary-row.ts,
       lesson-summary-row.ts). These are cards, the category --sp-radius
       (12px, "Provider's mat-card radius") already exists for -- same
       correction already applied to Dashboard's own cards. No background
       tint for REVISION_REQUESTED (removed a prior --sp-tone-attention-bg
       wash) -- status color lives in the chip only, never washes the
       whole surface, per explicit direction: "no large colored fills...
       localized status chip only." */
    .row {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px;
      min-height: 44px; padding: 12px 14px; margin-bottom: 8px;
      border: 1px solid var(--sp-border-subtle, #edf0f7); border-radius: var(--sp-radius, 12px); background: var(--sp-surface, #fff);
    }
    .row-main { min-width: 100px; flex: 1 1 100px; }
    .row-title { font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0; }
    .row-due { font-size: 0.8rem; color: var(--sp-text-muted, #52596b); margin: 2px 0 0; }
    .row-module { font-size: 0.8rem; color: var(--sp-text-muted, #52596b); margin: 2px 0 0; }
    .row-meta { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .row-action { min-height: 44px; }
    @media (max-width: 599px) {
      .row { flex-direction: column; align-items: stretch; }
      .row-main { flex: 1 1 auto; min-width: 0; }
    }
    .frozen-note { font-size: 0.75rem; color: var(--sp-text-muted, #52596b); margin: 2px 0 8px 14px; }
  `],
  template: `
    <h1 tabindex="-1">To Do</h1>

    <app-student-assignment-message [error]="loadError()" (retry)="load()" />

    @if (loading()) {
      <mat-spinner diameter="36" />
    } @else if (loadError()) {
      <!-- UX-7D: message already shown above; the history link still
           offered here -- there's no technical reason a failure to fetch
           the actionable list should also block navigating to Assignment
           Activity, which is its own independent request. -->
      <a class="history-link" [routerLink]="['/my-students', studentId(), 'assignments', 'history']">View assignment history</a>
    } @else {
      <!-- UX-7D correction: true-empty and source-unavailable (the
           @else if above) are mutually exclusive branches, not two things
           that can both be true on screen. -->
      @if (draftRows().length > 0 || revisionRows().length > 0) {
        <!-- UX-7D: source-level section container -- the visual
             boundary that will let a second source (Fees, Performance
             Availability, etc.) sit as its own equally-weighted sibling
             later without restructuring this page. Deliberately
             restrained (subtle border, very light neutral fill, 12px
             radius, no shadow) so it reads as "these cards belong to one
             group" without competing with the white bordered cards
             inside it for visual weight. "View assignment history" lives
             inside it now that it visibly belongs to the Assignments
             source specifically, not the page as a whole -- the same
             link stays outside this container in the error/empty
             branches above/below, where the container itself doesn't
             render, so it's never unreachable. -->
      <div class="source-section">
        <h2 class="source-heading">Assignments</h2>
        @for (a of draftRows(); track a.id) {
          <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: a }" />
        }
        @if (revisionRows().length > 0) {
          <h3 class="sub-heading">Revision requested</h3>
          @for (a of revisionRows(); track a.id) {
            <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: a }" />
          }
        }
        <a class="history-link" [routerLink]="['/my-students', studentId(), 'assignments', 'history']">View assignment history</a>
      </div>
      } @else {
        <div class="empty-note">
          <mat-icon aria-hidden="true">task_alt</mat-icon>
          <p>Nothing needs your attention right now.</p>
        </div>
        <a class="history-link" [routerLink]="['/my-students', studentId(), 'assignments', 'history']">View assignment history</a>
      }
    }

    <ng-template #row let-a>
      <div class="row">
        <div class="row-main">
          <p class="row-title">{{ a.title }}</p>
          @if (a.moduleTitle) { <p class="row-module">Module: {{ a.moduleTitle }}</p> }
          @if (secondaryLabel(a); as s) { <p class="row-due">{{ s }}</p> }
        </div>
        <div class="row-meta">
          <span class="sp-chip {{ spToneClass(chipFor(a).tone) }}">{{ chipFor(a).label }}</span>
          <a mat-stroked-button class="row-action" [routerLink]="['/my-students', studentId(), 'assignments', a.id]"
             [attr.aria-disabled]="ctaDisabled(a) || null" [tabIndex]="ctaDisabled(a) ? -1 : 0"
             (click)="onCardClick($event, a)">
            {{ ctaLabel(a) }}
          </a>
        </div>
      </div>
      @if (ctaDisabled(a)) {
        <p class="frozen-note">Read-only for now</p>
      }
    </ng-template>
  `
})
export class StudentAssignmentSummaryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentAssignmentApiService);
  private destroyRef = inject(DestroyRef);
  mode = inject(ClassroomLiteModeService);

  protected readonly spToneClass = spToneClass;

  studentId = signal<number>(0);
  assignments = signal<StudentAssignmentSummaryDTO[]>([]);
  loading = signal(true);
  loadError = signal<StudentAssignmentUiError | null>(null);

  /**
   * UX-7D: only the two actionable statuses are grouped here -- SUBMITTED/
   * VALIDATED/CLOSED are still present in the fetched `assignments()` list
   * (same single unfiltered GET this screen always used) but this page
   * never renders them; they belong to the secondary Assignment Activity
   * destination instead.
   */
  private grouped = computed(() => {
    const draft: StudentAssignmentSummaryDTO[] = [];
    const revision: StudentAssignmentSummaryDTO[] = [];
    for (const a of this.assignments()) {
      if (a.status === 'DRAFT') draft.push(a);
      else if (a.status === 'REVISION_REQUESTED') revision.push(a);
    }
    draft.sort((a, b) => {
      const aOver = isOverdue(a.dueAt), bOver = isOverdue(b.dueAt);
      if (aOver !== bOver) return aOver ? -1 : 1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
    return { draft, revision };
  });

  draftRows = computed(() => this.grouped().draft);
  revisionRows = computed(() => this.grouped().revision);

  ngOnInit() {
    this.studentId.set(Number(this.route.snapshot.paramMap.get('studentId')));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.list(this.studentId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => { this.assignments.set(rows); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.loadError.set(toStudentAssignmentUiError(err)); this.loading.set(false); }
    });
  }

  overdue(a: StudentAssignmentSummaryDTO): boolean {
    return a.status === 'DRAFT' && isOverdue(a.dueAt);
  }

  secondaryLabel(a: StudentAssignmentSummaryDTO): string | null {
    if (a.status !== 'DRAFT' || this.overdue(a)) return null;
    return `Due ${new Date(a.dueAt).toLocaleDateString()}`;
  }

  chipFor(a: StudentAssignmentSummaryDTO) {
    return studentAssignmentChip({ status: a.status, attemptNumber: a.attemptNumber, overdue: this.overdue(a) });
  }

  ctaLabel(a: StudentAssignmentSummaryDTO): string {
    switch (a.status) {
      case 'DRAFT': return 'Start';
      case 'REVISION_REQUESTED': return 'Revise and resubmit';
      default: return 'View';
    }
  }

  ctaDisabled(a: StudentAssignmentSummaryDTO): boolean {
    return this.mode.mutationsDisabled() && (a.status === 'DRAFT' || a.status === 'REVISION_REQUESTED');
  }

  onCardClick(event: Event, a: StudentAssignmentSummaryDTO) {
    if (this.ctaDisabled(a)) event.preventDefault();
  }
}
