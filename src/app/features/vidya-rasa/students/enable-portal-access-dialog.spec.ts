import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { EnablePortalAccessDialog, EnablePortalAccessDialogData, EnablePortalAccessDialogResult } from './enable-portal-access-dialog';

describe('EnablePortalAccessDialog', () => {
  let httpMock: HttpTestingController;
  let closeSpy: ReturnType<typeof vi.fn>;
  const base = `${environment.apiUrl}/school/v2/students`;

  function setup(data: EnablePortalAccessDialogData) {
    closeSpy = vi.fn();
    TestBed.configureTestingModule({
      imports: [EnablePortalAccessDialog],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(EnablePortalAccessDialog);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('storedEmail present -- Send calls /invite-access with the exact expected body', () => {
    const fixture = setup({ studentId: 42, target: { kind: 'SELF' }, storedEmail: 'stored@example.com' });
    fixture.componentInstance.confirmed = true;
    fixture.componentInstance.send();

    const req = httpMock.expectOne(`${base}/42/invite-access`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ accessType: 'SELF', guardianId: null, confirmed: true });
    req.flush({ invitationId: 1, expiresAt: '2026-01-01T00:00:00', delivered: true });

    fixture.componentInstance.close();
    const result: EnablePortalAccessDialogResult = { kind: 'success', via: 'invite' };
    expect(closeSpy).toHaveBeenCalledWith(result);
  });

  it('storedEmail absent -- Send calls /enable-portal-access with the typed email', () => {
    const fixture = setup({ studentId: 42, target: { kind: 'GUARDIAN', guardianId: 7, label: 'Raj Sharma' }, storedEmail: null });
    fixture.componentInstance.typedEmail = 'typed@example.com';
    fixture.componentInstance.send();

    const req = httpMock.expectOne(`${base}/42/enable-portal-access`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ loginEmail: 'typed@example.com', accessType: 'GUARDIAN', guardianId: 7 });
    req.flush({ outcome: 'GRANTED_AND_INVITED', userId: 5, accessId: 9 });
  });

  it('enable-portal-access 500 with ACCESS_GRANTED_INVITATION_FAILED -- shows the distinguishing message', () => {
    const fixture = setup({ studentId: 42, target: { kind: 'SELF' }, storedEmail: null });
    fixture.componentInstance.typedEmail = 'typed@example.com';
    fixture.componentInstance.send();

    const req = httpMock.expectOne(`${base}/42/enable-portal-access`);
    req.flush({ error: 'x', code: 'ACCESS_GRANTED_INVITATION_FAILED' }, { status: 500, statusText: 'Internal Server Error' });

    expect(fixture.componentInstance.errorMessage()).toContain('Access was granted');
    fixture.componentInstance.cancel();
    expect(closeSpy).toHaveBeenCalledWith({ kind: 'partial-failure', code: 'ACCESS_GRANTED_INVITATION_FAILED' });
  });

  it('enable-portal-access 500 with INVITATION_DISPATCH_FAILED -- shows a different message, never string-matched', () => {
    const fixture = setup({ studentId: 42, target: { kind: 'SELF' }, storedEmail: null });
    fixture.componentInstance.typedEmail = 'typed@example.com';
    fixture.componentInstance.send();

    const req = httpMock.expectOne(`${base}/42/enable-portal-access`);
    req.flush({ error: 'x', code: 'INVITATION_DISPATCH_FAILED' }, { status: 500, statusText: 'Internal Server Error' });

    expect(fixture.componentInstance.errorMessage()).not.toContain('Access was granted');
    expect(fixture.componentInstance.errorMessage()).toContain('could not be sent');
  });

  it('cancel before any attempt closes with { kind: "cancelled" }, no HTTP call made', () => {
    const fixture = setup({ studentId: 42, target: { kind: 'SELF' }, storedEmail: 'stored@example.com' });
    fixture.componentInstance.cancel();
    expect(closeSpy).toHaveBeenCalledWith({ kind: 'cancelled' });
  });
});
