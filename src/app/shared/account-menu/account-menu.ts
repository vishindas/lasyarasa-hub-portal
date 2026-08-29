import { Component, inject, input } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { ChangePasswordComponent } from '../../features/settings/change-password/change-password';

/**
 * D6: the CLIENT-side account affordance that was missing everywhere in the
 * student experience -- StudentLearningShellComponent's header previously
 * had no account menu at all (only StudentSwitcherComponent, which is a
 * student picker, not an account control), and the only Sign Out button
 * that existed lived on the now-retired /my-students list page, unreachable
 * from any actual dashboard/learning/assignment/fee screen.
 *
 * Deliberately mirrors StudentSwitcherComponent's own established
 * conventions (mat-menu trigger, 44px min-height, account_circle icon) so
 * this reads as the same design system, not a new pattern. Reuses
 * AuthService.logout()/changePassword() and the existing
 * ChangePasswordComponent (opened as a dialog here rather than duplicated)
 * unchanged -- no new authentication logic anywhere in this component.
 *
 * Change Password is opened as a MatDialog rather than a routed page: a
 * CLIENT-facing route for it would need its own guard/route-tree decision,
 * whereas ChangePasswordComponent itself has no role-specific behavior at
 * all (it is a plain form over AuthService.changePassword()) and needed
 * only an optional MatDialogRef added to close itself on success -- see
 * that component's own comment.
 *
 * UX-01: the `expanded` input adds a second, opt-in trigger presentation
 * (a full-width labeled row, for the new persistent shell's rail) alongside
 * the original compact icon-only trigger, which stays the default so every
 * existing usage/test is unaffected. The menu panel itself -- email,
 * change password, sign out -- is identical and untouched in both modes;
 * this is a presentational variant only, no new account/session logic.
 */
@Component({
  selector: 'app-account-menu',
  standalone: true,
  imports: [MatMenuModule, MatButtonModule, MatIconModule],
  styles: [`
    .trigger { min-height: 44px; color: inherit; }
    .trigger.expanded { width: 100%; justify-content: flex-start; gap: 12px; padding: 0 12px; }
    .trigger.expanded .label { flex: 1; text-align: left; font-size: 0.92rem; }
    .trigger.expanded .chevron { opacity: 0.6; }
    .menu-header { padding: 10px 16px; display: flex; flex-direction: column; gap: 2px; }
    .menu-email { font-weight: 600; color: #1C1A16; word-break: break-all; }
    .menu-item { min-height: 44px; }
  `],
  template: `
    @if (expanded()) {
      <button mat-button class="trigger expanded" [matMenuTriggerFor]="panel" aria-haspopup="menu" aria-label="Account menu">
        <mat-icon aria-hidden="true">account_circle</mat-icon>
        <span class="label">Account</span>
        <mat-icon aria-hidden="true" class="chevron">expand_more</mat-icon>
      </button>
    } @else {
      <button mat-button class="trigger" [matMenuTriggerFor]="panel" aria-haspopup="menu" aria-label="Account menu">
        <mat-icon aria-hidden="true">account_circle</mat-icon>
      </button>
    }
    <mat-menu #panel="matMenu" xPosition="before">
      <div class="menu-header">
        <span class="menu-email">{{ auth.currentUser()?.email }}</span>
      </div>
      <button mat-menu-item class="menu-item" (click)="openChangePassword()">
        <mat-icon aria-hidden="true">lock_reset</mat-icon>
        Change password
      </button>
      <button mat-menu-item class="menu-item" (click)="auth.logout()">
        <mat-icon aria-hidden="true">logout</mat-icon>
        Sign out
      </button>
    </mat-menu>
  `
})
export class AccountMenuComponent {
  auth = inject(AuthService);
  private dialog = inject(MatDialog);

  expanded = input(false);

  openChangePassword(): void {
    this.dialog.open(ChangePasswordComponent, { width: '480px', maxWidth: '95vw' });
  }
}
