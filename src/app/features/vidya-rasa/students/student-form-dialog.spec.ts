import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { StudentFormDialog } from './student-form-dialog';

/**
 * Issue #66 Phase 1: the legacy PUT /students/{id} endpoint no longer
 * accepts a changed class selection (it used to silently destroy
 * enrollment history on every edit -- see backend PR #69). This dialog no
 * longer exposes Add/Remove/Transfer controls for an EXISTING student, and
 * never sends a changed `enrollments` payload for one. New-student
 * creation (create(), untouched on the backend) keeps its full editable
 * class-selection flow.
 */
describe('StudentFormDialog -- Issue #66 Phase 1 enrollment hotfix', () => {
  let httpMock: HttpTestingController;
  let closeSpy: ReturnType<typeof vi.fn>;
  let snackSpy: { open: ReturnType<typeof vi.fn> };
  const base = `${environment.apiUrl}/school/v2/students`;

  const CLASSES = [
    { id: 5, batchName: 'Beginner', schedule: 'Sat 10am', description: '', danceStyleId: 1, ageGroupId: null,
      feeTierId: null, danceStyleName: 'Kuchipudi', ageGroupLabel: 'Kids', feeTierLabel: null },
    { id: 6, batchName: 'Intermediate', schedule: 'Sun 11am', description: '', danceStyleId: 1, ageGroupId: null,
      feeTierId: null, danceStyleName: 'Kuchipudi', ageGroupLabel: 'Kids', feeTierLabel: null }
  ];

  // Same DI-override-unreliability as registration-detail.spec.ts/
  // portal-access-card.spec.ts: a standalone component importing
  // MatSnackBarModule directly resolves MatSnackBar through its own
  // imported-module injector, not a TestBed provider override -- assigning
  // the spy directly onto the created instance is the proven workaround.
  function createFixture(data: unknown) {
    closeSpy = vi.fn();
    snackSpy = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [StudentFormDialog],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StudentFormDialog);
    (fixture.componentInstance as unknown as { snack: typeof snackSpy }).snack = snackSpy;
    fixture.detectChanges();
    return fixture;
  }

  function setupExistingStudent() {
    return createFixture({
      studentDetail: {
        student: { id: 42, firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '555-0100',
                   dateOfBirth: '2010-01-01', enrollmentStatus: 'ACTIVE', ageGroupId: null, feeGenerationPaused: false },
        guardians: [],
        enrollments: [{ id: 900, classId: 5 }],
        notes: []
      },
      ageGroups: [],
      classes: CLASSES
    });
  }

  function setupNewStudent() {
    return createFixture({ studentDetail: null, ageGroups: [], classes: CLASSES });
  }

  afterEach(() => httpMock.verify());

  // ---- Requirements 1-2: existing-student edit exposes no mutation controls, read-only display ----

  it('existing-student edit: no Add Class button and no editable class select rendered', () => {
    const fixture = setupExistingStudent();
    const el = fixture.nativeElement as HTMLElement;

    const addButtons = Array.from(el.querySelectorAll('button')).filter(b => b.textContent?.includes('Add Class'));
    expect(addButtons.length).toBe(0);
    expect(el.querySelector('mat-select[formcontrolname="classId"]')).toBeNull();
    const removeButtons = Array.from(el.querySelectorAll('mat-icon')).filter(i => i.textContent?.trim() === 'remove_circle_outline');
    expect(removeButtons.length).toBe(0);
  });

  it('existing-student edit: current enrollment is shown read-only, with the temporary-unavailable notice', () => {
    const fixture = setupExistingStudent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Class changes are temporarily unavailable');
    expect(text).toContain('Kuchipudi');
    expect(text).toContain('Beginner');
  });

  // ---- Requirement 4: new-student creation keeps the supported initial-class selection flow ----

  it('new-student creation: Add Class button is present, and using it adds an editable class row', () => {
    const fixture = setupNewStudent();
    const el = fixture.nativeElement as HTMLElement;

    const addButtons = Array.from(el.querySelectorAll('button')).filter(b => b.textContent?.includes('Add Class'));
    expect(addButtons.length).toBe(1);
    expect(fixture.componentInstance.enrollmentRows.length).toBe(0);
    expect(el.querySelector('mat-select[formcontrolname="classId"]')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent ?? '').not.toContain('Class changes are temporarily unavailable');

    addButtons[0].click();

    expect(fixture.componentInstance.enrollmentRows.length).toBe(1);
  });

  // ---- Requirements 3 & 5: profile editing still succeeds, no changed enrollment payload is sent ----

  it('existing-student profile edit: PUT body carries enrollments: null, and save succeeds', () => {
    const fixture = setupExistingStudent();
    fixture.componentInstance.studentForm.patchValue({ phone: '555-9999' });
    fixture.componentInstance.save();

    const req = httpMock.expectOne(`${base}/42`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.enrollments).toBeNull();
    expect(req.request.body.student.phone).toBe('555-9999');
    req.flush({ student: { id: 42 } });

    expect(closeSpy).toHaveBeenCalledWith(true);
  });

  it('new-student creation: PUT/POST body still carries the selected initial enrollment', () => {
    const fixture = setupNewStudent();
    fixture.componentInstance.studentForm.patchValue({ firstName: 'New', lastName: 'Student' });
    fixture.componentInstance.addEnrollment();
    fixture.componentInstance.enrollmentRows.at(0).patchValue({ classId: 6 });
    fixture.componentInstance.save();

    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.enrollments).toEqual([{ classId: 6 }]);
    req.flush({ student: { id: 99 } });
  });

  // ---- Requirement 6: the domain error is handled safely if an outdated client attempts an enrollment change ----

  it('a 409 ENROLLMENT_CHANGE_REQUIRES_DEDICATED_FLOW response is handled safely -- clear message, no crash, no misleading close', () => {
    const fixture = setupExistingStudent();
    fixture.componentInstance.save();

    const req = httpMock.expectOne(`${base}/42`);
    req.flush(
      { code: 'ENROLLMENT_CHANGE_REQUIRES_DEDICATED_FLOW', message: 'Class changes are not supported through this endpoint.', resource: 'Student' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(snackSpy.open).toHaveBeenCalled();
    const [message] = snackSpy.open.mock.calls[0];
    expect(message).toContain('Class changes');
    expect(closeSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.saving()).toBe(false);
  });

  // ---- Requirement 7: accessibility -- the notice is announced, and hidden controls are structurally absent, not just visually hidden ----

  it('the temporarily-unavailable notice is exposed to assistive tech via role="status"', () => {
    const fixture = setupExistingStudent();
    const notice = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="status"]'))
      .find(n => n.textContent?.includes('temporarily unavailable'));
    expect(notice).toBeDefined();
  });
});
