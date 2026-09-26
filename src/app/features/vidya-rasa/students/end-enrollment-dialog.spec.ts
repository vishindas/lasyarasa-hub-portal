import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { EndEnrollmentDialog, EndEnrollmentDialogData } from './end-enrollment-dialog';

/** Issue #66 Phase 2A. */
describe('EndEnrollmentDialog', () => {
  let httpMock: HttpTestingController;
  let closeSpy: ReturnType<typeof vi.fn>;
  const base = `${environment.apiUrl}/school/v2/students`;

  const data: EndEnrollmentDialogData = { studentId: 42, enrollmentId: 900, className: 'Beginner', rowVersion: 3 };

  function createFixture() {
    closeSpy = vi.fn();
    TestBed.configureTestingModule({
      imports: [EndEnrollmentDialog],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(EndEnrollmentDialog);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('with no reason selected, canSubmit() is false and submit() sends nothing', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.canSubmit()).toBe(false);
    fixture.componentInstance.submit();
    httpMock.expectNone(`${base}/42/enrollments/900/end`);
  });

  it('WITHDRAWN requires no details and submits with endReasonDetails: null', () => {
    const fixture = createFixture();
    fixture.componentInstance.reason = 'WITHDRAWN';
    expect(fixture.componentInstance.detailsRequired()).toBe(false);
    expect(fixture.componentInstance.canSubmit()).toBe(true);
    fixture.componentInstance.submit();

    const req = httpMock.expectOne(`${base}/42/enrollments/900/end`);
    expect(req.request.body).toEqual(expect.objectContaining({
      expectedRowVersion: 3, endReason: 'WITHDRAWN', endReasonDetails: null
    }));
    req.flush({ id: 900, studentId: 42, classId: 5, status: 'ENDED', startDate: '2026-01-01', endDate: '2026-03-01', endReason: 'WITHDRAWN', endReasonDetails: null, rowVersion: 4 });
    expect(closeSpy).toHaveBeenCalledWith(true);
  });

  it('ADMIN_CORRECTION with blank details keeps canSubmit() false, never sends the request', () => {
    const fixture = createFixture();
    fixture.componentInstance.reason = 'ADMIN_CORRECTION';
    fixture.componentInstance.details = '   ';
    expect(fixture.componentInstance.detailsRequired()).toBe(true);
    expect(fixture.componentInstance.canSubmit()).toBe(false);
    fixture.componentInstance.submit();
    httpMock.expectNone(`${base}/42/enrollments/900/end`);
  });

  it('ADMIN_CORRECTION with a real explanation submits it trimmed', () => {
    const fixture = createFixture();
    fixture.componentInstance.reason = 'ADMIN_CORRECTION';
    fixture.componentInstance.details = '  wrong class selected originally  ';
    fixture.componentInstance.submit();

    const req = httpMock.expectOne(`${base}/42/enrollments/900/end`);
    expect(req.request.body.endReasonDetails).toBe('wrong class selected originally');
    req.flush({ id: 900, studentId: 42, classId: 5, status: 'ENDED', startDate: '2026-01-01', endDate: '2026-03-01', endReason: 'ADMIN_CORRECTION', endReasonDetails: 'wrong class selected originally', rowVersion: 4 });
    expect(closeSpy).toHaveBeenCalledWith(true);
  });

  it('never offers TRANSFERRED as a selectable reason', () => {
    const fixture = createFixture();
    const values = fixture.componentInstance.reasons.map(r => r.value);
    expect(values).not.toContain('TRANSFERRED');
  });

  it('server 409 STALE_CONFLICT shows the exact typed message', () => {
    const fixture = createFixture();
    fixture.componentInstance.reason = 'COMPLETED';
    fixture.componentInstance.submit();

    httpMock.expectOne(`${base}/42/enrollments/900/end`).flush(
      { code: 'STALE_CONFLICT', message: 'This enrollment has been modified since you last loaded it.', resource: 'Enrollment' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(fixture.componentInstance.error()).toBe('This enrollment has been modified since you last loaded it.');
    expect(closeSpy).not.toHaveBeenCalled();
  });
});
