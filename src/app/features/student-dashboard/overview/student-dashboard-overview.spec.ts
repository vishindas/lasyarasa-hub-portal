import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { StudentLearningContextService } from '../../../core/services/student-learning-context.service';
import { StudentDashboardOverviewComponent } from './student-dashboard-overview';

function activatedRouteStub(params: Record<string, string>, queryParams: Record<string, string> = {}) {
  return {
    snapshot: { paramMap: convertToParamMap(params) },
    queryParamMap: of(convertToParamMap(queryParams))
  };
}

describe('StudentDashboardOverviewComponent', () => {
  let httpMock: HttpTestingController;

  function setup(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [StudentDashboardOverviewComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '117' }, queryParams) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(StudentDashboardOverviewComponent);
  }

  afterEach(() => httpMock.verify());

  it('renders the student and school name from the shared account-access list', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Vidya Rasa');
    expect(text).toContain('Dev Dance School');
  });

  it('shows the multi-class prompt when classSelectionRequired is true', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: true });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('more than one active class');
  });

  it('links to the current module when one class is selected and a current module exists', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({
      classSelectionRequired: false, selectedClassId: 11,
      currentModule: { moduleId: 5, title: 'PILOT Lesson Module', moduleOrder: 1, status: 'RELEASED' }
    });
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href*="modules"]');
    expect(link?.textContent).toContain('PILOT Lesson Module');
  });

  it('renders the schedule for every active class from the shared context service (multi-class support)', () => {
    const fixture = setup();
    const context = TestBed.inject(StudentLearningContextService);
    context.clearForNewStudent(117);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([
      { classId: 11, className: 'PILOT Assignment Class', schedule: 'Pilot schedule' },
      { classId: 12, className: 'PILOT Lesson Class', schedule: 'Pilot lesson schedule' }
    ]);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 11 });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PILOT Assignment Class: Pilot schedule');
    expect(text).toContain('PILOT Lesson Class: Pilot lesson schedule');
  });

  it('zero-class empty state: no active classes renders one intentional empty state, never the class-dependent cards', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Zero Classes Student', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    // Student/school identity is preserved.
    expect(text).toContain('Zero Classes Student');
    expect(text).toContain('Dev Dance School');
    // The intentional empty state renders...
    expect(text).toContain('No active classes');
    expect(text).toContain('There are no active classes connected to this student yet.');
    // ...and none of the class-dependent cards that would imply normal class context.
    expect(el.querySelector('.grid')).toBeNull();
    expect(text).not.toContain('No open assignments right now');
    expect(text).not.toContain('Class schedule');
  });

  it('multi-class support: a classId query param (from switching class while staying on Dashboard) fetches Home scoped to that class', () => {
    // Reproduces the real integration bug found during manual verification:
    // switching class must re-fetch Home, not leave stale content, since
    // the shell now stays on this same route rather than navigating away.
    const fixture = setup({ classId: '12' });
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home?classId=12`).flush({
      classSelectionRequired: false, selectedClassId: 12,
      currentModule: { moduleId: 9, title: 'Second Class Module', moduleOrder: 1, status: 'RELEASED' }
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Second Class Module');
  });

  it('authorization boundary: a rejected/unrelated student id shows the error state and never renders a data grid', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush(
      { code: 'STUDENT_CONTEXT_UNAVAILABLE', message: 'x', resource: null }, { status: 403, statusText: 'Forbidden' }
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBeTruthy();
    expect(fixture.componentInstance.home()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.grid')).toBeNull();
  });

  it('security: identity already shown is cleared the moment the main content call fails -- never left displayed alongside the error', () => {
    const fixture = setup();
    fixture.detectChanges();
    // loadHeader() succeeds first, genuinely showing identity (this is the
    // exact "already loaded, then loses access" shape of the bug found).
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Vidya Rasa');

    // The main content call then fails.
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush(
      { code: 'STUDENT_CONTEXT_UNAVAILABLE', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' }
    );
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Vidya Rasa');
    expect(text).not.toContain('Dev Dance School');
    expect(fixture.componentInstance.studentName()).toBeNull();
    expect(fixture.componentInstance.schoolName()).toBeNull();
  });

  it('security: a late-arriving loadHeader() success cannot resurrect identity after the content call already failed', () => {
    const fixture = setup();
    fixture.detectChanges();
    // Content call fails FIRST this time (loadHeader()'s response is still in flight).
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush(
      { code: 'STUDENT_CONTEXT_UNAVAILABLE', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' }
    );
    fixture.detectChanges();

    // loadHeader()'s call resolves late, after the error already landed.
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.studentName()).toBeNull();
    expect(fixture.componentInstance.schoolName()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Vidya Rasa');
  });
});
