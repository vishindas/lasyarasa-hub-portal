import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { AddEnrollmentDialog, AddEnrollmentDialogData } from './add-enrollment-dialog';

/** Issue #66 Phase 2A. */
describe('AddEnrollmentDialog', () => {
  let httpMock: HttpTestingController;
  let closeSpy: ReturnType<typeof vi.fn>;
  const base = `${environment.apiUrl}/school/v2/students`;

  const data: AddEnrollmentDialogData = {
    studentId: 42,
    classes: [
      { id: 5, batchName: 'Beginner', schedule: '', description: '', danceStyleId: 1, ageGroupId: null,
        feeTierId: null, danceStyleName: null, ageGroupLabel: null, feeTierLabel: null, archivedAt: null, rowVersion: 0 }
    ]
  };

  function createFixture() {
    closeSpy = vi.fn();
    TestBed.configureTestingModule({
      imports: [AddEnrollmentDialog],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AddEnrollmentDialog);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('submit() with no class selected sends nothing', () => {
    const fixture = createFixture();
    fixture.componentInstance.submit();
    httpMock.expectNone(`${base}/42/enrollments`);
  });

  it('submit() posts classId + a generated idempotencyKey, closes(true) on success', () => {
    const fixture = createFixture();
    fixture.componentInstance.classId = 5;
    fixture.componentInstance.submit();

    const req = httpMock.expectOne(`${base}/42/enrollments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.classId).toBe(5);
    expect(typeof req.request.body.idempotencyKey).toBe('string');
    expect(req.request.body.idempotencyKey.length).toBeGreaterThan(0);

    req.flush({ id: 900, studentId: 42, classId: 5, status: 'ACTIVE', startDate: '2026-03-01', endDate: null, endReason: null, endReasonDetails: null, rowVersion: 0 });

    expect(closeSpy).toHaveBeenCalledWith(true);
  });

  it('a repeated submit() reuses the same idempotencyKey across attempts', () => {
    const fixture = createFixture();
    fixture.componentInstance.classId = 5;
    fixture.componentInstance.submit();
    const first = httpMock.expectOne(`${base}/42/enrollments`).request.body.idempotencyKey;
    first as string;
    fixture.componentInstance.submit();
    const second = httpMock.expectOne(`${base}/42/enrollments`).request.body.idempotencyKey;
    expect(second).toBe(first);
  });

  it('server 409 CLASS_ARCHIVED shows the exact typed message, not a generic failure', () => {
    const fixture = createFixture();
    fixture.componentInstance.classId = 5;
    fixture.componentInstance.submit();

    httpMock.expectOne(`${base}/42/enrollments`).flush(
      { code: 'CLASS_ARCHIVED', message: 'This class is archived and cannot accept new enrollments.', resource: 'SchoolClass' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(fixture.componentInstance.error()).toBe('This class is archived and cannot accept new enrollments.');
    expect(closeSpy).not.toHaveBeenCalled();
  });
});
