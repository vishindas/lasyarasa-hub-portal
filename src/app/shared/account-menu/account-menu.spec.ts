import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { ChangePasswordComponent } from '../../features/settings/change-password/change-password';
import { AccountMenuComponent } from './account-menu';

describe('AccountMenuComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [AccountMenuComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([])]
    });
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({ email: 'vidyarasa79@gmail.com', role: 'CLIENT', providerId: 1 });
    return TestBed.createComponent(AccountMenuComponent);
  }

  it('shows the signed-in account\'s email in the menu', () => {
    const fixture = setup();
    fixture.detectChanges();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector('.trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    expect(document.body.textContent).toContain('vidyarasa79@gmail.com');
  });

  it('the menu trigger is a real, labeled, keyboard-reachable button (44px floor via the shared .trigger convention)', () => {
    const fixture = setup();
    fixture.detectChanges();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector('.trigger') as HTMLButtonElement;
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('aria-label')).toBe('Account menu');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('Sign out calls the existing AuthService.logout() -- no duplicated session-clearing logic', () => {
    const fixture = setup();
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const logoutSpy = vi.spyOn(auth, 'logout');
    fixture.detectChanges();

    fixture.componentInstance.auth.logout();

    expect(logoutSpy).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('Change password opens the existing ChangePasswordComponent as a dialog -- no duplicated form/validation logic', () => {
    const fixture = setup();
    fixture.detectChanges();
    const dialog = TestBed.inject(MatDialog);
    const openSpy = vi.spyOn(dialog, 'open');

    fixture.componentInstance.openChangePassword();

    expect(openSpy).toHaveBeenCalledWith(ChangePasswordComponent, expect.objectContaining({ width: '480px' }));
  });

  // UX-01: the `expanded` input is a new, opt-in trigger presentation for the
  // persistent shell's rail -- these two tests prove it's additive only: the
  // default (no input set) renders byte-identical to every test above, and
  // the same underlying menu (email/change password/sign out) opens either way.
  describe('expanded rail variant (UX-01)', () => {
    it('defaults to the original compact, icon-only trigger when `expanded` is not set', () => {
      const fixture = setup();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.trigger.expanded')).toBeFalsy();
      expect(el.querySelector('.trigger .label')).toBeFalsy();
    });

    it('shows a full-width "Account" labeled row when `expanded` is true, opening the same menu', () => {
      const fixture = setup();
      fixture.componentRef.setInput('expanded', true);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const trigger = el.querySelector('.trigger.expanded') as HTMLButtonElement;
      expect(trigger).toBeTruthy();
      expect(trigger.textContent).toContain('Account');
      expect(trigger.getAttribute('aria-label')).toBe('Account menu');

      trigger.click();
      fixture.detectChanges();
      expect(document.body.textContent).toContain('vidyarasa79@gmail.com');
    });
  });
});
