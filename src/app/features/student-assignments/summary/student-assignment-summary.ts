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
import { studentAssignmentChip, isOverdue } from '../shared/student-assignment-status.util';

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
  imports: [RouterLink, MatTabsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, StudentAssignmentMessageComponent],
  styles: [`
    :host { display: block; max-width: 720px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.5rem; color: #1C1A16; margin: 0 0 16px; }
    .tab-body { padding: 20px 4px; }
    .empty-note { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; color: #6B6255; padding: 40px 16px; }
    .empty-note mat-icon { font-size: 32px; width: 32px; height: 32px; color: #A3762C; }
    .card {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 14px 16px; margin-bottom: 10px; border: 1px solid #E3DCC8; border-radius: 8px; background: #fff;
    }
    .card-main { min-width: 0; }
    .card-title { font-weight: 600; color: #1C1A16; margin: 0 0 2px; }
    .card-meta { font-size: 0.82rem; color: #6B6255; margin: 0 0 4px; }
    .card-due { font-size: 0.8rem; color: #6B6255; }
    .card-due.overdue { color: #991b1b; font-weight: 600; }
    .chip {
      display: inline-block; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.02em;
      padding: 3px 10px; border-radius: 20px; white-space: normal; max-width: 100%; margin-top: 4px;
    }
    .tone-warning { background: #fff3cd; color: #7A5419; }
    .tone-error { background: #fdf1f1; color: #7a1f1f; }
    .tone-neutral { background: #F3EEDE; color: #6B6255; }
    .tone-success { background: #e6f4ea; color: #1e4620; }
    .card-action button { min-height: 44px; }
    .frozen-note { font-size: 0.75rem; color: #6B6255; margin-top: 4px; }
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
                  <div class="card">
                    <div class="card-main">
                      <p class="card-title">{{ a.title }}</p>
                      <p class="card-due" [class.overdue]="overdue(a)">{{ dueLabel(a) }}</p>
                      <span class="chip tone-{{ chipFor(a).tone }}">{{ chipFor(a).label }}</span>
                    </div>
                    <div class="card-action">
                      <a mat-stroked-button [routerLink]="['/my-students', studentId(), 'assignments', a.id]"
                         [attr.aria-disabled]="ctaDisabled(a) || null" [tabIndex]="ctaDisabled(a) ? -1 : 0"
                         (click)="onCardClick($event, a)">
                        {{ ctaLabel(a) }}
                      </a>
                      @if (ctaDisabled(a)) {
                        <p class="frozen-note">Read-only for now</p>
                      }
                    </div>
                  </div>
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

  dueLabel(a: StudentAssignmentSummaryDTO): string {
    if (a.status !== 'DRAFT') return '';
    return this.overdue(a) ? 'Overdue' : `Due ${new Date(a.dueAt).toLocaleDateString()}`;
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
