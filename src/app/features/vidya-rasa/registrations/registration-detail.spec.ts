import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RegistrationDetailComponent } from './registration-detail';

describe('RegistrationDetailComponent', () => {
  let httpMock: HttpTestingController;
  let dialogOpenSpy: ReturnType<typeof vi.fn>;
  let snackSpy: { open: ReturnType<typeof vi.fn> };
  const base = `${environment.apiUrl}/school/registrations`;

  const pendingRegistration = {
    id: 42, registrantType: 'SELF', firstName: 'Jane', lastName: 'Doe',
    dateOfBirth: '2010-01-01', phone: '555-1234', email: 'jane@example.test',
    guardianFirstName: '', guardianLastName: '', guardianPhone: '', guardianEmail: '', guardianRelationship: '',
    styleInterest: '', notes: '', previousExperience: '',
    address: '', city: '', state: '', zipCode: '',
    emergencyContactName: '', emergencyContactRelationship: '', emergencyContactPhone: '',
    photoConsent: null, termsAccepted: null,
    accountConsentRequested: true, accountConsentRequestedAt: '2026-01-01T00:00:00',
    status: 'PENDING', rejectionReason: '', createdAt: '2026-01-01T00:00:00'
  };

  function setup() {
    snackSpy = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [RegistrationDetailComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '42' } } } },
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RegistrationDetailComponent);
    dialogOpenSpy = vi.fn();
    // Same DI-override-unreliability rationale as portal-access-card.spec.ts:
    // a standalone component importing MatDialogModule/MatSnackBarModule
    // directly is unreliable to spy on via TestBed provider replacement.
    (fixture.componentInstance as unknown as { dialog: { open: typeof dialogOpenSpy } }).dialog = { open: dialogOpenSpy };
    (fixture.componentInstance as unknown as { snack: typeof snackSpy }).snack = snackSpy;
    fixture.detectChanges();
    httpMock.expectOne(`${base}/42`).flush(pendingRegistration);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  function approveAndFlush(fixture: ReturnType<typeof setup>, responseBody: object) {
    dialogOpenSpy.mockReturnValue({ afterClosed: () => of({ classId: null }) } as any);
    fixture.componentInstance.approve();
    const req = httpMock.expectOne(`${base}/42/approve`);
    req.flush(responseBody);
    fixture.detectChanges();
  }

  it('APPROVED outcome shows a normal approval-success message', () => {
    const fixture = setup();

    approveAndFlush(fixture, { outcome: 'APPROVED' });

    expect(snackSpy.open).toHaveBeenCalledWith(
      'Registration approved — student created.', 'OK', expect.anything());
  });

  it('APPROVED_AND_INVITED outcome mentions the portal invitation was sent', () => {
    const fixture = setup();

    approveAndFlush(fixture, { outcome: 'APPROVED_AND_INVITED' });

    const [message] = snackSpy.open.mock.calls[0];
    expect(message).toContain('approved');
    expect(message).toContain('invitation was sent');
  });

  it('APPROVED_INVITATION_FAILED outcome never implies the registration failed, and points to Portal Access', () => {
    const fixture = setup();

    approveAndFlush(fixture, { outcome: 'APPROVED_INVITATION_FAILED' });

    const [message] = snackSpy.open.mock.calls[0];
    expect(message).toContain('approved');
    expect(message.toLowerCase()).not.toContain('failed to approve');
    expect(message.toLowerCase()).not.toContain('registration failed');
    expect(message).toContain('Portal Access');
  });

  it('a response with no outcome field (e.g. a legacy/empty body) still shows the normal success message', () => {
    const fixture = setup();

    approveAndFlush(fixture, {});

    expect(snackSpy.open).toHaveBeenCalledWith(
      'Registration approved — student created.', 'OK', expect.anything());
  });

  it('existing approval refresh/state update still works regardless of outcome', () => {
    const fixture = setup();

    approveAndFlush(fixture, { outcome: 'APPROVED_AND_INVITED' });

    expect(fixture.componentInstance.reg()?.status).toBe('APPROVED');
  });

  it('a genuine approve failure still shows the error path, unaffected by outcome handling', () => {
    const fixture = setup();
    dialogOpenSpy.mockReturnValue({ afterClosed: () => of({ classId: null }) } as any);

    fixture.componentInstance.approve();
    const req = httpMock.expectOne(`${base}/42/approve`);
    req.flush({ message: 'Registration is not pending' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(snackSpy.open).toHaveBeenCalledWith('Registration is not pending', 'OK', expect.anything());
    expect(fixture.componentInstance.reg()?.status).toBe('PENDING'); // never optimistically flipped on error
  });
});
