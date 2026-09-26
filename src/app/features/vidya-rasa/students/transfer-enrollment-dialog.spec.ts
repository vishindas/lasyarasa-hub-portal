import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { TransferEnrollmentDialog, TransferEnrollmentDialogData } from './transfer-enrollment-dialog';

/** Issue #66 Phase 2B. */
describe('TransferEnrollmentDialog', () => {
  let httpMock: HttpTestingController;
  let closeSpy: ReturnType<typeof vi.fn>;
  const base = `${environment.apiUrl}/school/v2/students`;

  const sourceClass = { id: 5, batchName: 'Beginner', schedule: '', description: '', danceStyleId: 1, ageGroupId: null,
    feeTierId: null, danceStyleName: null, ageGroupLabel: null, feeTierLabel: null, archivedAt: null, rowVersion: 0 };
  const targetClass = { ...sourceClass, id: 6, batchName: 'Intermediate' };

  const data: TransferEnrollmentDialogData = {
    studentId: 42, enrollmentId: 900, sourceClassId: 5, sourceClassName: 'Beginner', rowVersion: 2,
    classes: [sourceClass, targetClass]
  };

  function createFixture() {
    closeSpy = vi.fn();
    TestBed.configureTestingModule({
      imports: [TransferEnrollmentDialog],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(TransferEnrollmentDialog);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('excludes the source class from the destination picker', () => {
    const fixture = createFixture();
    const ids = fixture.componentInstance.targetClasses().map(c => c.id);
    expect(ids).toEqual([6]);
  });

  it('submit() with no destination selected sends nothing', () => {
    const fixture = createFixture();
    fixture.componentInstance.submit();
    httpMock.expectNone(`${base}/42/enrollments/900/transfer`);
  });

  it('submit() posts targetClassId + expectedRowVersion + a generated idempotencyKey, closes(true) on success', () => {
    const fixture = createFixture();
    fixture.componentInstance.targetClassId = 6;
    fixture.componentInstance.submit();

    const req = httpMock.expectOne(`${base}/42/enrollments/900/transfer`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.targetClassId).toBe(6);
    expect(req.request.body.expectedRowVersion).toBe(2);
    expect(typeof req.request.body.idempotencyKey).toBe('string');

    req.flush({
      sourceEnrollment: { id: 900, studentId: 42, classId: 5, status: 'ENDED', startDate: '2026-01-01', endDate: '2026-03-01', endReason: 'TRANSFERRED', endReasonDetails: null, rowVersion: 3 },
      targetEnrollment: { id: 901, studentId: 42, classId: 6, status: 'ACTIVE', startDate: '2026-03-01', endDate: null, endReason: null, endReasonDetails: null, rowVersion: 0 }
    });

    expect(closeSpy).toHaveBeenCalledWith(true);
  });

  it('server 409 CLASS_ARCHIVED shows the exact typed message', () => {
    const fixture = createFixture();
    fixture.componentInstance.targetClassId = 6;
    fixture.componentInstance.submit();

    httpMock.expectOne(`${base}/42/enrollments/900/transfer`).flush(
      { code: 'CLASS_ARCHIVED', message: 'This class is archived and cannot accept new enrollments.', resource: 'SchoolClass' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(fixture.componentInstance.error()).toBe('This class is archived and cannot accept new enrollments.');
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('server 409 ENROLLMENT_DUPLICATE_ACTIVE shows the exact typed message', () => {
    const fixture = createFixture();
    fixture.componentInstance.targetClassId = 6;
    fixture.componentInstance.submit();

    httpMock.expectOne(`${base}/42/enrollments/900/transfer`).flush(
      { code: 'ENROLLMENT_DUPLICATE_ACTIVE', message: 'This student already has a current enrollment in this class.', resource: 'Enrollment' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(fixture.componentInstance.error()).toBe('This student already has a current enrollment in this class.');
  });
});
