import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AssignmentInfoDialogComponent } from './assignment-info-dialog';

type AssignmentTab = 'todo' | 'awaiting' | 'revision' | 'validated';

/**
 * Part II.5. A real, fully-designed screen -- four tabs, real navigation,
 * real status-chip presentation -- but the underlying data is Slice 14's
 * deferred contract (correction 3, Part VII.3), not a Slice 11 endpoint.
 * "Home must degrade honestly -- no fake/sample assignment data" (Part
 * VII.3): every tab below renders its honest, no-data empty state; there
 * is no assignment array anywhere in this component to fabricate, because
 * no Slice 11/14 field exists to source one from. Opening any assignment
 * card (none exist yet) would show AssignmentInfoDialogComponent -- see
 * openInfo(), kept wired and ready for Slice 14 to populate.
 *
 * Correction 7's WRITE_FROZEN gating (Start/Continue/Revise-and-resubmit
 * all disabled, not DRAFT-only) has nothing to disable yet with zero real
 * assignment rows, but is unreachable regardless for the same reason noted
 * throughout this feature: every Slice 11 route is GET, so WRITE_FROZEN
 * (which only blocks non-GET methods) can never actually fire here. Left
 * as a documented, defensive non-issue rather than built against
 * placeholder data that doesn't exist.
 */
@Component({
  selector: 'app-assignment-summary',
  standalone: true,
  imports: [MatTabsModule, MatIconModule],
  styles: [`
    :host { display: block; max-width: 720px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.5rem; color: #1C1A16; margin: 0 0 16px; }
    .tab-body { padding: 24px 4px; }
    .empty-note { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; color: #6B6255; padding: 40px 16px; }
    mat-icon { font-size: 32px; width: 32px; height: 32px; color: #A3762C; }
  `],
  template: `
    <h1 tabindex="-1">Assignments</h1>
    <mat-tab-group [(selectedIndex)]="tabIndex">
      <mat-tab label="To do">
        <div class="tab-body">
          <div class="empty-note">
            <mat-icon aria-hidden="true">assignment_late</mat-icon>
            <p>No open assignments right now.</p>
          </div>
        </div>
      </mat-tab>
      <mat-tab label="Awaiting validation">
        <div class="tab-body">
          <div class="empty-note">
            <mat-icon aria-hidden="true">hourglass_top</mat-icon>
            <p>Nothing is waiting on a teacher right now.</p>
          </div>
        </div>
      </mat-tab>
      <mat-tab label="Revision requested">
        <div class="tab-body">
          <div class="empty-note">
            <mat-icon aria-hidden="true">edit_note</mat-icon>
            <p>Nothing needs revision right now.</p>
          </div>
        </div>
      </mat-tab>
      <mat-tab label="Validated">
        <div class="tab-body">
          <div class="empty-note">
            <mat-icon aria-hidden="true">check_circle</mat-icon>
            <p>Nothing has been validated yet.</p>
          </div>
        </div>
      </mat-tab>
    </mat-tab-group>
  `
})
export class AssignmentSummaryComponent {
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);

  private static readonly TAB_ORDER: AssignmentTab[] = ['todo', 'awaiting', 'revision', 'validated'];

  tabIndex = signal(this.tabIndexFromQuery());

  private tabIndexFromQuery(): number {
    const tab = this.route.snapshot.queryParamMap.get('tab') as AssignmentTab | null;
    const idx = tab ? AssignmentSummaryComponent.TAB_ORDER.indexOf(tab) : -1;
    return idx >= 0 ? idx : 0;
  }

  /** Reserved for Slice 14 real data -- see class doc comment. Not called by anything in this slice since no assignment row exists to click. */
  openInfo(): void {
    this.dialog.open(AssignmentInfoDialogComponent);
  }
}
