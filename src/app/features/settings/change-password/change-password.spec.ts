import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialogRef } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { ChangePasswordComponent } from './change-password';

/**
 * D6: this component is unchanged in substance (still a plain form over
 * AuthService.changePassword()) but now optionally injects MatDialogRef so
 * the new CLIENT account menu can open it as a dialog instead of routing to
 * it. These tests prove: (1) the pre-existing routed/staff usage with no
 * MatDialogRef provided is completely unaffected, and (2) the dialog is
 * closed on a successful update when a MatDialogRef is present.
 */
describe('ChangePasswordComponent', () => {
  function setup(withDialogRef: boolean) {
    TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(),
        ...(withDialogRef ? [{ provide: MatDialogRef, useValue: { close: vi.fn() } }] : [])
      ]
    });
    return TestBed.createComponent(ChangePasswordComponent);
  }

  it('routed (staff) usage without a MatDialogRef: no close button rendered, submit still works unchanged', () => {
    const fixture = setup(false);
    fixture.detectChanges();
    expect(fixture.componentInstance.dialogRef).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Close"]')).toBeNull();

    const httpMock = TestBed.inject(HttpTestingController);
    fixture.componentInstance.form.setValue({ currentPassword: 'old-password-123', newPassword: 'new-password-456', confirmPassword: 'new-password-456' });
    fixture.componentInstance.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/change-password`).flush({ message: 'ok' });

    expect(fixture.componentInstance.saving()).toBe(false);
    httpMock.verify();
  });

  it('dialog usage: renders a Close button and closes itself automatically after a successful update', () => {
    const fixture = setup(true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Close"]')).toBeTruthy();

    const httpMock = TestBed.inject(HttpTestingController);
    fixture.componentInstance.form.setValue({ currentPassword: 'old-password-123', newPassword: 'new-password-456', confirmPassword: 'new-password-456' });
    fixture.componentInstance.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/change-password`).flush({ message: 'ok' });

    expect(fixture.componentInstance.dialogRef?.close).toHaveBeenCalled();
    httpMock.verify();
  });
});
