import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentAssignmentApiService } from '../data-access/student-assignment-api.service';
import { StudentAssignmentSummaryDTO } from '../data-access/student-assignment.model';
import { StudentAssignmentUiError, toStudentAssignmentUiError } from '../data-access/student-assignment-ui-error.util';
import { StudentAssignmentMessageComponent } from '../shared/student-assignment-message';
import { studentAssignmentChip, spToneClass } from '../shared/student-assignment-status.util';

type ActivityTab = 'awaiting' | 'history';
const TAB_ORDER: ActivityTab[] = ['awaiting', 'history'];

/**
 * UX-7D (revised): the secondary destination for assignment states that
 * don't belong in the generic "To Do" action inbox -- SUBMITTED (waiting
 * on a teacher, not the student) and VALIDATED/CLOSED (terminal). Named
 * "Assignment Activity" rather than plain "History": SUBMITTED isn't
 * historical, it's in flight, so a page that only ever said "History"
 * would misdescribe half its own content. Reached from the primary To Do
 * page's "View assignment history" link, and from Detail's own status-
 * aware back-link (student-assignment-detail.ts) -- same sibling-route
 * shape as student-fees.ts/student-fee-history.ts (fees/fees-history),
 * not a new navigation pattern.
 *
 * Two tabs, not three: the "To do" tab from the prior UX-7D draft moved
 * entirely to the primary page (student-assignment-summary.ts) after
 * review -- this screen keeps only the two non-actionable buckets. Row
 * markup/chip/CTA logic is otherwise unchanged from that draft (same
 * shared studentAssignmentChip/spToneClass, same "View" CTA, same
 * WRITE_FROZEN-aware disabling for the read-only rows here -- ctaDisabled
 * always returns false for SUBMITTED/VALIDATED/CLOSED since none of them
 * are write actions, preserved from the original Summary behavior).
 */
@Component({
  selector: 'app-student-assignment-activity',
  standalone: true,
  host: { class: 'sp-page' },
  imports: [RouterLink, NgTemplateOutlet, MatTabsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, StudentAssignmentMessageComponent],
  styles: [`
    .back-link { display: inline-flex; align-items: center; gap: 4px; color: var(--sp-text-muted, #52596b); text-decoration: none; font-size: 0.85rem; margin: 65px 0 8px; min-height: 44px; }
    .back-link:hover, .back-link:focus-visible { color: var(--sp-primary, #3d4ed8); outline: 2px solid var(--sp-primary, #3d4ed8); outline-offset: -2px; }
    h1 { font-size: 1.5rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0 0 16px; }
    /* UX-8 P1-B: was outline: none with no replacement -- the route-change
       focus mechanism (student-learning-shell.ts's focusPageHeading()) moved
       focus here on every navigation with no visible indicator at all. */
    h1:focus-visible { outline: 2px solid var(--sp-primary, #3d4ed8); outline-offset: 2px; }
    .tab-body { padding: 12px 4px 20px; }
    .empty-note { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; color: var(--sp-text-muted, #52596b); padding: 40px 16px; }
    .empty-note mat-icon { font-size: 32px; width: 32px; height: 32px; color: var(--sp-text-faint, #9ba3b8); }
    .row {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px;
      min-height: 44px; padding: 12px 14px; margin-bottom: 8px;
      border: 1px solid var(--sp-border-subtle, #edf0f7); border-radius: var(--sp-radius, 12px); background: var(--sp-surface, #fff);
    }
    .row.row-awaiting { background: var(--sp-primary-bg, #eef0fb); }
    /* UX-7D polish: was a full --sp-tone-positive-bg (green) fill -- made
       a completed row visually compete with actionable To Do cards
       instead of reading as settled history. Completion state now lives
       only in the "Completed" chip/text; the row itself shares the same
       neutral surface as every other historical (Closed) row below,
       since both are equally "no longer actionable," just for different
       reasons -- lifecycle semantics, labels, routing, and actions are
       all unchanged. */
    .row.row-validated { background: var(--sp-tone-neutral-bg, #f1f5f9); }
    .row.row-closed { background: var(--sp-tone-neutral-bg, #f1f5f9); }
    .row-main { min-width: 100px; flex: 1 1 100px; }
    .row-title { font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0; }
    .row-module { font-size: 0.8rem; color: var(--sp-text-muted, #52596b); margin: 2px 0 0; }
    .row-meta { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .row-action { min-height: 44px; }
    @media (max-width: 599px) {
      .row { flex-direction: column; align-items: stretch; }
      .row-main { flex: 1 1 auto; min-width: 0; }
    }
  `],
  template: `
    <!-- UX-7D route cleanup: canonical To Do route is now 'todo' (was 'assignments', now only a backward-compat redirect). -->
    <a class="back-link" [routerLink]="['/my-students', studentId(), 'todo']">
      <mat-icon aria-hidden="true">arrow_back</mat-icon> Back to To Do
    </a>

    <h1 tabindex="-1">Assignment Activity</h1>

    <app-student-assignment-message [error]="loadError()" (retry)="load()" />

    @if (loading()) {
      <mat-spinner diameter="36" />
    } @else {
      <mat-tab-group [(selectedIndex)]="tabIndex" [mat-stretch-tabs]="false">
        <mat-tab label="Awaiting validation">
          <div class="tab-body">
            @if (awaitingRows().length === 0) {
              <div class="empty-note">
                <mat-icon aria-hidden="true">hourglass_top</mat-icon>
                <p>Nothing is waiting on a teacher right now.</p>
              </div>
            } @else {
              @for (a of awaitingRows(); track a.id) {
                <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: a }" />
              }
            }
          </div>
        </mat-tab>

        <mat-tab label="History">
          <div class="tab-body">
            @if (historyRows().length === 0) {
              <div class="empty-note">
                <mat-icon aria-hidden="true">history</mat-icon>
                <p>No completed or closed assignments yet.</p>
              </div>
            } @else {
              @for (a of historyRows(); track a.id) {
                <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: a }" />
              }
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    }

    <ng-template #row let-a>
      <div class="row {{ rowSurfaceClass(a) }}">
        <div class="row-main">
          <p class="row-title">{{ a.title }}</p>
          @if (a.moduleTitle) { <p class="row-module">Module: {{ a.moduleTitle }}</p> }
        </div>
        <div class="row-meta">
          <span class="sp-chip {{ spToneClass(chipFor(a).tone) }}">{{ chipFor(a).label }}</span>
          <a mat-stroked-button class="row-action" [routerLink]="['/my-students', studentId(), 'assignments', a.id]">View</a>
        </div>
      </div>
    </ng-template>
  `
})
export class StudentAssignmentActivityComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(StudentAssignmentApiService);
  private destroyRef = inject(DestroyRef);

  protected readonly spToneClass = spToneClass;

  studentId = signal<number>(0);
  assignments = signal<StudentAssignmentSummaryDTO[]>([]);
  loading = signal(true);
  loadError = signal<StudentAssignmentUiError | null>(null);
  tabIndex = signal(this.tabIndexFromQuery());

  private grouped = computed(() => {
    const awaiting: StudentAssignmentSummaryDTO[] = [];
    const validated: StudentAssignmentSummaryDTO[] = [];
    const closed: StudentAssignmentSummaryDTO[] = [];
    for (const a of this.assignments()) {
      if (a.status === 'SUBMITTED') awaiting.push(a);
      else if (a.status === 'VALIDATED') validated.push(a);
      else if (a.status === 'CLOSED') closed.push(a);
    }
    return { awaiting, validated, closed };
  });

  awaitingRows = computed(() => this.grouped().awaiting);
  /** UX-7D: VALIDATED + CLOSED co-located for navigation only -- each row keeps its own real status chip (chipFor()), so the two statuses are never merged semantically. */
  historyRows = computed(() => [...this.grouped().validated, ...this.grouped().closed]);

  private tabIndexFromQuery(): number {
    const tab = this.route.snapshot.queryParamMap.get('tab') as ActivityTab | null;
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

  chipFor(a: StudentAssignmentSummaryDTO) {
    return studentAssignmentChip({ status: a.status, attemptNumber: a.attemptNumber, overdue: false });
  }

  rowSurfaceClass(a: StudentAssignmentSummaryDTO): string {
    switch (a.status) {
      case 'SUBMITTED': return 'row-awaiting';
      case 'VALIDATED': return 'row-validated';
      case 'CLOSED': return 'row-closed';
      default: return '';
    }
  }
}
