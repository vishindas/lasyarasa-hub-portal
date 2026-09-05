import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { StudentAssignmentApiService } from '../data-access/student-assignment-api.service';
import { StudentAssignmentSummaryDTO, StudentAssignmentStatus } from '../data-access/student-assignment.model';
import { StudentAssignmentUiError, toStudentAssignmentUiError } from '../data-access/student-assignment-ui-error.util';
import { StudentAssignmentMessageComponent } from '../shared/student-assignment-message';
import { studentAssignmentChip, isOverdue, spToneClass } from '../shared/student-assignment-status.util';

type AssignmentTab = 'todo' | 'awaiting' | 'revision' | 'validated' | 'closed';

const TAB_ORDER: AssignmentTab[] = ['todo', 'awaiting', 'revision', 'validated', 'closed'];
const STATUS_FOR_TAB: Record<AssignmentTab, StudentAssignmentStatus> = {
  todo: 'DRAFT', awaiting: 'SUBMITTED', revision: 'REVISION_REQUESTED', validated: 'VALIDATED', closed: 'CLOSED'
};
const EMPTY_COPY: Record<AssignmentTab, { icon: string; text: string }> = {
  todo: { icon: 'assignment_late', text: 'No open assignments right now.' },
  awaiting: { icon: 'hourglass_top', text: 'Nothing is waiting on a teacher right now.' },
  revision: { icon: 'edit_note', text: 'Nothing needs revision right now.' },
  validated: { icon: 'check_circle', text: 'Nothing has been validated yet.' },
  closed: { icon: 'lock', text: 'No closed assignments.' }
};

/**
 * S1 -- replaces the Slice 12 placeholder with real data against
 * StudentAssignmentApiService.list(). Five tabs (the real backend has a
 * CLOSED status the design's own prototype also has a tab for, alongside
 * To do/Awaiting/Revision/Validated).
 *
 * Deviation from the design's exact per-row assumption, disclosed: the
 * real StudentAssignmentSummaryDTO carries only
 * {id, instanceId, title, dueAt, status, attemptNumber} -- no `started`
 * flag and no `instanceStatus`. The design's prototype had both (from its
 * own flat fixture). Consequences: (1) this screen cannot distinguish
 * "Not started" from "In progress" for a DRAFT row -- both show a single
 * "To do" chip/CTA "Start"; the Detail screen (S2), which can call GET
 * .../draft, makes the real Start-vs-Continue distinction. (2) this screen
 * cannot show "Unavailable" for a withdrawn-instance assignment -- that
 * can only be discovered once Detail loads instanceStatus. Neither
 * omission blocks a coherent implementation; both are documented in the
 * implementation report.
 */
@Component({
  selector: 'app-student-assignment-summary',
  standalone: true,
  // UX-5 geometry correction: was `:host { max-width: 1200px; margin: 0
  // auto; padding: 24px 20px 48px; }` -- the same independently-centered
  // container class of bug UX-1/UX-3/UX-4 already fixed on every other
  // student-portal content screen (Dashboard, Learning Path, Module
  // Detail, Class Details, Lesson Detail). `.sp-page` (styles-student.scss)
  // gives the same flush gutter/no local width cap, so this screen shares
  // Learning Path's exact left content edge and available width.
  host: { class: 'sp-page' },
  imports: [RouterLink, MatTabsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, StudentAssignmentMessageComponent],
  styles: [`
    /* UX-5: Fraunces retired (Deliverable 3), matching Provider's page-header h2 pattern. */
    h1 { font-size: 1.5rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0 0 16px; }
    /* UX-5 correction: this h1 is never reached via Tab (tabindex="-1") --
       it exists solely as the route-change screen-reader announcement
       target the shell's focusPageHeading() focuses on every navigation
       (student-learning-shell.ts). That's the exact same "programmatic,
       non-interactive focus target" case the shell already handles for
       itself (main:focus-visible { outline: none; }); this heading
       just never got the same treatment. Scoped to this one non-
       interactive heading only -- every real interactive element on this
       screen (tabs, links, buttons) keeps its own default focus-visible
       ring untouched. */
    h1:focus-visible { outline: none; }
    .tab-body { padding: 20px 4px; }
    .empty-note { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; color: var(--sp-text-muted, #52596b); padding: 40px 16px; }
    .empty-note mat-icon { font-size: 32px; width: 32px; height: 32px; color: var(--sp-text-faint, #9ba3b8); }
    /* UX-5 visual-density correction: brought to the same compact row
       language Learning Path's module-summary-row.ts already established
       (min-height 44px, 12px/14px padding, single-line title-left/
       status-right rhythm) instead of this screen's own taller, more
       heavily-padded card. Learning Path's row is copied in spirit, not
       verbatim -- Assignments still needs an explicit, labeled action
       (Start/Continue/View/Revise, with its own disabled/read-only state)
       that Learning Path's plain click-anywhere row has no equivalent of. */
    .row {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px;
      min-height: 44px; padding: 12px 14px; margin-bottom: 8px;
      border: 1px solid var(--sp-border-subtle, #edf0f7); border-radius: var(--sp-radius-sm, 8px); background: var(--sp-surface, #fff);
    }
    .row-main { min-width: 0; flex: 1 1 200px; }
    .row-title { font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0; }
    /* Secondary due-date line only ever appears when it adds information
       the status chip doesn't already carry -- an overdue row's chip
       already reads "Overdue", so no separate red duplicate text here
       (Finding 7's redundant-status-presentation correction). */
    .row-due { font-size: 0.8rem; color: var(--sp-text-muted, #52596b); margin: 2px 0 0; }
    .row-meta { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .row-action { min-height: 44px; }
    .frozen-note { font-size: 0.75rem; color: var(--sp-text-muted, #52596b); margin: 2px 0 8px 14px; }
  `],
  template: `
    <h1 tabindex="-1">Assignments</h1>

    <app-student-assignment-message [error]="loadError()" (retry)="load()" />

    @if (loading()) {
      <mat-spinner diameter="36" />
    } @else {
      <mat-tab-group [(selectedIndex)]="tabIndex">
        @for (tab of tabOrder; track tab) {
          <mat-tab [label]="tabLabel(tab)">
            <div class="tab-body">
              @if (rowsForTab(tab).length === 0) {
                <div class="empty-note">
                  <mat-icon aria-hidden="true">{{ emptyCopy(tab).icon }}</mat-icon>
                  <p>{{ emptyCopy(tab).text }}</p>
                </div>
              } @else {
                @for (a of rowsForTab(tab); track a.id) {
                  <div class="row">
                    <div class="row-main">
                      <p class="row-title">{{ a.title }}</p>
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
                }
              }
            </div>
          </mat-tab>
        }
      </mat-tab-group>
    }
  `
})
export class StudentAssignmentSummaryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentAssignmentApiService);
  private destroyRef = inject(DestroyRef);
  mode = inject(ClassroomLiteModeService);

  readonly tabOrder = TAB_ORDER;
  protected readonly spToneClass = spToneClass;

  studentId = signal<number>(0);
  assignments = signal<StudentAssignmentSummaryDTO[]>([]);
  loading = signal(true);
  loadError = signal<StudentAssignmentUiError | null>(null);
  tabIndex = signal(this.tabIndexFromQuery());

  private byTab = computed(() => {
    const grouped: Record<AssignmentTab, StudentAssignmentSummaryDTO[]> = { todo: [], awaiting: [], revision: [], validated: [], closed: [] };
    for (const a of this.assignments()) {
      const tab = TAB_ORDER.find(t => STATUS_FOR_TAB[t] === a.status);
      if (tab) grouped[tab].push(a);
    }
    grouped.todo.sort((a, b) => {
      const aOver = isOverdue(a.dueAt), bOver = isOverdue(b.dueAt);
      if (aOver !== bOver) return aOver ? -1 : 1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
    return grouped;
  });

  private tabIndexFromQuery(): number {
    const tab = this.route.snapshot.queryParamMap.get('tab') as AssignmentTab | null;
    const idx = tab ? TAB_ORDER.indexOf(tab) : -1;
    return idx >= 0 ? idx : 0;
  }

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

  rowsForTab(tab: AssignmentTab): StudentAssignmentSummaryDTO[] {
    return this.byTab()[tab];
  }

  tabLabel(tab: AssignmentTab): string {
    switch (tab) {
      case 'todo': return 'To do';
      case 'awaiting': return 'Awaiting validation';
      case 'revision': return 'Revision requested';
      case 'validated': return 'Validated';
      case 'closed': return 'Closed';
    }
  }

  emptyCopy(tab: AssignmentTab) {
    return EMPTY_COPY[tab];
  }

  overdue(a: StudentAssignmentSummaryDTO): boolean {
    return a.status === 'DRAFT' && isOverdue(a.dueAt);
  }

  /**
   * UX-5 correction: an overdue row's status chip already reads "Overdue"
   * -- this no longer duplicates that as separate red text, returning
   * null (renders nothing) instead. Only ever returns a value when it
   * adds information the chip doesn't already carry (the actual due
   * date on a not-yet-overdue To-do row).
   */
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
