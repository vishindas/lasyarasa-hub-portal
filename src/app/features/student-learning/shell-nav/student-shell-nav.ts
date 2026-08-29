import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { StudentSwitcherComponent } from '../student-switcher';
import { AccountMenuComponent } from '../../../shared/account-menu/account-menu';

/**
 * UX-01: the persistent shell's rail content -- brand, student context,
 * primary navigation, account access. Deliberately a small, purely
 * presentational component (routerLink destinations + reused child
 * components) so StudentLearningShellComponent keeps owning all of the
 * hardened behavior (FULL_OUTAGE/offline/lost-access precedence, route-
 * change focus, mobile drawer state) without that logic spreading into two
 * places. Renders the exact same StudentSwitcherComponent and
 * AccountMenuComponent already used before this slice -- no business logic
 * duplicated or rewritten here, only repositioned/restyled.
 *
 * "Learning" is deliberately not one of the four links: the Blueprint (§A)
 * found no top-level route for it -- Learning Path/Module/Lesson are all
 * nested under a chosen class, so they're reached via My Classes, which
 * `routerLinkActive`'s default (non-exact) matching keeps highlighted for
 * every classes/** sub-route including the Learning Path/Module/Lesson
 * screens.
 */
@Component({
  selector: 'app-student-shell-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, StudentSwitcherComponent, AccountMenuComponent],
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }

    .brand-row { padding: 22px 20px 18px; }
    .brand {
      font-family: Fraunces, Georgia, serif; font-weight: 600; font-size: 1.2rem;
      color: #1C1A16; letter-spacing: 0.01em;
    }

    .context {
      padding: 4px 12px 14px; margin: 0 8px 10px; border-bottom: 1px solid #E3DCC8;
      display: flex; flex-direction: column; gap: 2px;
    }
    .relationship-caption {
      padding-left: 4px; font-size: 0.74rem; color: #6B6255; text-transform: uppercase; letter-spacing: 0.04em;
    }

    .links { display: flex; flex-direction: column; gap: 2px; padding: 0 8px; flex: 1; }
    .nav-item {
      display: flex; align-items: center; gap: 12px; min-height: 44px;
      padding: 0 12px; border-radius: 8px; text-decoration: none;
      color: #6B6255; font-size: 0.92rem; font-weight: 500;
      border-left: 3px solid transparent;
    }
    .nav-item mat-icon { font-size: 20px; width: 20px; height: 20px; color: inherit; }
    .nav-item:hover { background: #F3EEDE; color: #1C1A16; }
    .nav-item.active {
      background: rgba(163, 118, 44, 0.12); color: #7A5419; font-weight: 600;
      border-left-color: #A3762C;
    }
    .nav-item:focus-visible { outline: 2px solid #7A5419; outline-offset: -2px; }

    .rail-bottom { padding: 10px 8px 16px; border-top: 1px solid #E3DCC8; margin-top: 8px; }
  `],
  template: `
    <div class="brand-row">
      <span class="brand">LasyaRasa</span>
    </div>

    @if (!lostAccess()) {
      <div class="context">
        <app-student-switcher #switcher [currentStudentId]="studentId()" />
        @if (switcher.selectedEntry(); as entry) {
          <span class="relationship-caption">{{ entry.accessType === 'SELF' ? 'Self' : 'Guardian' }}</span>
        }
      </div>

      <div class="links">
        <a class="nav-item" [routerLink]="['/my-students', studentId(), 'dashboard']" routerLinkActive="active">
          <mat-icon aria-hidden="true">space_dashboard</mat-icon>
          Dashboard
        </a>
        <a class="nav-item" [routerLink]="['/my-students', studentId(), 'classes']" routerLinkActive="active">
          <mat-icon aria-hidden="true">groups</mat-icon>
          My Classes
        </a>
        <a class="nav-item" [routerLink]="['/my-students', studentId(), 'assignments']" routerLinkActive="active">
          <mat-icon aria-hidden="true">assignment</mat-icon>
          Assignments
        </a>
        <a class="nav-item" [routerLink]="['/my-students', studentId(), 'fees']" routerLinkActive="active">
          <mat-icon aria-hidden="true">receipt_long</mat-icon>
          Fees
        </a>
      </div>
    }

    <div class="rail-bottom">
      <app-account-menu [expanded]="true" />
    </div>
  `
})
export class StudentShellNavComponent {
  studentId = input.required<number>();
  lostAccess = input(false);
}
