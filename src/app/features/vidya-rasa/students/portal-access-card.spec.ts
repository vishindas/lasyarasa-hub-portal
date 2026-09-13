import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PortalAccessCard } from './portal-access-card';
import { PortalAccessStatusResponse } from '../../../core/models/portal-access.model';

describe('PortalAccessCard', () => {
  let httpMock: HttpTestingController;
  let dialogOpenSpy: ReturnType<typeof vi.fn>;
  let snackSpy: { open: ReturnType<typeof vi.fn> };
  const base = `${environment.apiUrl}/school/v2/students`;

  const emptyResponse: PortalAccessStatusResponse = {
    self: { accessStatus: null, userId: null, credentialsEstablished: null, hasLiveInvitation: false, pendingInvitationEmail: null },
    guardians: []
  };

  function setup(guardians: unknown[] = []) {
    snackSpy = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [PortalAccessCard],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: snackSpy }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PortalAccessCard);
    fixture.componentRef.setInput('studentId', 42);
    fixture.componentRef.setInput('studentEmail', null);
    fixture.componentRef.setInput('guardians', guardians);
    dialogOpenSpy = vi.fn();
    // DI-based MatDialog/MatSnackBar injection is unreliable to spy on for a
    // standalone component that itself imports MatDialogModule/MatSnackBarModule
    // -- override the instance's own fields directly instead.
    (fixture.componentInstance as unknown as { dialog: { open: typeof dialogOpenSpy } }).dialog = { open: dialogOpenSpy };
    (fixture.componentInstance as unknown as { snack: typeof snackSpy }).snack = snackSpy;
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('fetches status on init and renders Needs Setup by default', () => {
    const fixture = setup();
    httpMock.expectOne(`${base}/42/portal-access-status`).flush(emptyResponse);
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.selfRow().chipLabel).toBe('Needs Setup');
  });

  it('sets loadFailed on HTTP error, never leaves loading stuck true', () => {
    const fixture = setup();
    httpMock.expectOne(`${base}/42/portal-access-status`).flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.loadFailed()).toBe(true);
  });

  it('guardian stored email is matched by guardianId, not by list position', () => {
    const fixture = setup([
      { id: 100, firstName: 'Priya', lastName: 'Sharma', email: 'priya@example.com', relationship: 'MOTHER' },
      { id: 200, firstName: 'Raj', lastName: 'Sharma', email: '', relationship: 'FATHER' }
    ]);
    httpMock.expectOne(`${base}/42/portal-access-status`).flush({
      self: emptyResponse.self,
      guardians: [
        { guardianId: 200, firstName: 'Raj', lastName: 'Sharma', relationship: 'FATHER',
          status: { accessStatus: null, userId: null, credentialsEstablished: null, hasLiveInvitation: false, pendingInvitationEmail: null } },
        { guardianId: 100, firstName: 'Priya', lastName: 'Sharma', relationship: 'MOTHER',
          status: { accessStatus: null, userId: null, credentialsEstablished: null, hasLiveInvitation: false, pendingInvitationEmail: null } }
      ]
    });
    fixture.detectChanges();

    const rows = fixture.componentInstance.guardianRows();
    const priyaRow = rows.find(r => r.label.startsWith('Priya'))!;
    const rajRow = rows.find(r => r.label.startsWith('Raj'))!;
    expect(priyaRow.storedEmail).toBe('priya@example.com');
    expect(rajRow.storedEmail).toBeNull(); // blank email never treated as usable
  });

  it('after a successful dialog close, refetches status and shows a snackbar', () => {
    const fixture = setup();
    httpMock.expectOne(`${base}/42/portal-access-status`).flush(emptyResponse);
    fixture.detectChanges();

    dialogOpenSpy.mockReturnValue({ afterClosed: () => of({ kind: 'success', via: 'invite' }) } as any);
    fixture.componentInstance.openDialog(fixture.componentInstance.selfRow());
    fixture.detectChanges();

    expect(dialogOpenSpy).toHaveBeenCalled();
    httpMock.expectOne(`${base}/42/portal-access-status`).flush(emptyResponse);
    expect(snackSpy.open).toHaveBeenCalled();
  });

  it('cancelling the dialog never refetches or shows a snackbar', () => {
    const fixture = setup();
    httpMock.expectOne(`${base}/42/portal-access-status`).flush(emptyResponse);
    fixture.detectChanges();

    dialogOpenSpy.mockReturnValue({ afterClosed: () => of({ kind: 'cancelled' }) } as any);
    fixture.componentInstance.openDialog(fixture.componentInstance.selfRow());

    httpMock.expectNone(`${base}/42/portal-access-status`);
    expect(snackSpy.open).not.toHaveBeenCalled();
  });
});
