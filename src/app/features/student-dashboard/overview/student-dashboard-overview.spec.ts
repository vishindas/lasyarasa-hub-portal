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

const ASSIGNMENTS_URL = `${environment.apiUrl}/account/students/117/learning/assignments`;

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
    httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Vidya Rasa');
    expect(text).toContain('Dev Dance School');
  });

  it('UX-2: shows an inline hint pointing at the class-context bar when classSelectionRequired is true, not a competing picker', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: true });
    httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Select a class above');
  });

  it('links to the current module when one class is selected and a current module exists', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({
      classSelectionRequired: false, selectedClassId: 11,
      currentModule: { moduleId: 5, title: 'PILOT Lesson Module', moduleOrder: 1, status: 'RELEASED' }
    });
    httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href*="modules"]');
    expect(link?.textContent).toContain('PILOT Lesson Module');
  });

  it('D2: shows a Class details link to the selected class once a class is genuinely selected', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({
      classSelectionRequired: false, selectedClassId: 11
    });
    httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href*="class-info"]') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toContain('/my-students/117/classes/11/class-info');
  });

  it('D2: does NOT show a Class details link while the class is still ambiguous (classSelectionRequired)', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: true });
    httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('a[href*="class-info"]')).toBeNull();
  });

  it('D3: shows a Fees link regardless of class-selection state -- fees span all of the student\'s classes', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: true });
    httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href*="/fees"]') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/my-students/117/fees');
  });

  it('UX-2: no class selected (ambiguous) -- Class Schedule falls back to the aggregate list of every active class', () => {
    const fixture = setup();
    const context = TestBed.inject(StudentLearningContextService);
    context.clearForNewStudent(117);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([
      { classId: 11, className: 'PILOT Assignment Class', schedule: 'Pilot schedule' },
      { classId: 12, className: 'PILOT Lesson Class', schedule: 'Pilot lesson schedule' }
    ]);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: true });
    httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PILOT Assignment Class: Pilot schedule');
    expect(text).toContain('PILOT Lesson Class: Pilot lesson schedule');
  });

  it('UX-2 correction: a selected class shows only that class\'s own schedule on the Dashboard, never the student\'s other classes', () => {
    const fixture = setup();
    const context = TestBed.inject(StudentLearningContextService);
    context.clearForNewStudent(117);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([
      { classId: 11, className: 'Saturday Beginners', schedule: 'Sat 10:00 AM' },
      { classId: 12, className: 'Weekday Technique Intensive', schedule: 'Tue/Thu 5:00 PM' }
    ]);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 12 });
    httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Tue/Thu 5:00 PM');
    expect(text).not.toContain('Sat 10:00 AM');
    expect(text).not.toContain('Saturday Beginners');
    expect(text).not.toContain('Weekday Technique Intensive');
  });

  it('UX-2 correction: a selected class with no schedule on file shows an honest "Schedule unavailable", not a blank card', () => {
    const fixture = setup();
    const context = TestBed.inject(StudentLearningContextService);
    context.clearForNewStudent(117);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([
      { classId: 11, className: 'Saturday Beginners', schedule: null }
    ]);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 11 });
    httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Schedule unavailable');
  });

  it('zero-class empty state: no active classes renders one intentional empty state, never the class-dependent cards', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Zero Classes Student', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false });
    // D4: the assignments call still fires unconditionally (it is
    // student/provider-scoped, not class-scoped) even though the Attention
    // card that would consume it never renders in this state -- must still
    // be flushed or httpMock.verify() fails on an outstanding request.
    httpMock.expectOne(ASSIGNMENTS_URL).flush([
      { id: 1, instanceId: 1, title: 'Should never appear', dueAt: '2026-12-01T00:00:00', status: 'DRAFT', attemptNumber: 0 }
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    // Student/school identity is preserved.
    expect(text).toContain('Zero Classes Student');
    expect(text).toContain('Dev Dance School');
    // The intentional empty state renders...
    expect(text).toContain('No active classes');
    expect(text).toContain('There are no active classes connected to this student yet.');
    // ...and none of the class-dependent cards that would imply normal class context,
    // even though the assignments data itself loaded successfully (and non-emptily).
    expect(el.querySelector('.grid')).toBeNull();
    expect(text).not.toContain('No open assignments right now');
    expect(text).not.toContain('needs your attention');
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
    httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
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
    httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
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
    httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
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
    httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
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

  describe('D4: Attention card (assignments)', () => {
    it('shows a loading indicator while the assignments call is in flight, independent of the other cards', () => {
      const fixture = setup();
      fixture.detectChanges();
      // Neither of the other two calls has resolved yet, and the assignments
      // call hasn't either -- proves the loading signal starts true and
      // isn't derived from anything else.
      expect(fixture.componentInstance.assignmentsLoading()).toBe(true);

      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 11 });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
      fixture.detectChanges();

      expect(fixture.componentInstance.assignmentsLoading()).toBe(false);
    });

    it('is independent/non-blocking: resolves and renders before the other cards\' data has arrived', () => {
      const fixture = setup();
      fixture.detectChanges();
      // Assignments resolves FIRST, while home()/loadHeader() are both still pending.
      httpMock.expectOne(ASSIGNMENTS_URL).flush([
        { id: 1, instanceId: 1, title: 'Early', dueAt: '2026-12-01T00:00:00', status: 'DRAFT', attemptNumber: 0 }
      ]);
      fixture.detectChanges();

      expect(fixture.componentInstance.assignmentsLoading()).toBe(false);
      expect(fixture.componentInstance.assignmentsAttentionCount()).toBe(1);
      // The overall page is still on its own loading spinner -- the Attention
      // card's own state isn't gated behind (or gating) home()'s.
      expect(fixture.componentInstance.loading()).toBe(true);

      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 11 });
      fixture.detectChanges();
    });

    it('empty state: renders the honest "No open assignments right now." copy when nothing is open', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 11 });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([
        { id: 1, instanceId: 1, title: 'Already validated', dueAt: '2026-12-01T00:00:00', status: 'VALIDATED', attemptNumber: 1 }
      ]);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('No open assignments right now.');
    });

    it('populated state: counts only DRAFT + REVISION_REQUESTED, ignoring SUBMITTED/VALIDATED/CLOSED', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 11 });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([
        { id: 1, instanceId: 1, title: 'A', dueAt: '2026-12-01T00:00:00', status: 'DRAFT', attemptNumber: 0 },
        { id: 2, instanceId: 2, title: 'B', dueAt: '2026-12-01T00:00:00', status: 'REVISION_REQUESTED', attemptNumber: 1 },
        { id: 3, instanceId: 3, title: 'C', dueAt: '2026-12-01T00:00:00', status: 'SUBMITTED', attemptNumber: 1 },
        { id: 4, instanceId: 4, title: 'D', dueAt: '2026-12-01T00:00:00', status: 'VALIDATED', attemptNumber: 1 },
        { id: 5, instanceId: 5, title: 'E', dueAt: '2026-12-01T00:00:00', status: 'CLOSED', attemptNumber: 1 }
      ]);
      fixture.detectChanges();

      expect(fixture.componentInstance.assignmentsAttentionCount()).toBe(2);
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('2 assignments need your attention.');
    });

    it('singular count reads naturally ("1 assignment needs...", not "1 assignments need...")', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 11 });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([
        { id: 1, instanceId: 1, title: 'A', dueAt: '2026-12-01T00:00:00', status: 'DRAFT', attemptNumber: 0 }
      ]);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('1 assignment needs your attention.');
    });

    it('links to the existing Assignments route only when there is something to show, as a real anchor', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 11 });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([
        { id: 1, instanceId: 1, title: 'A', dueAt: '2026-12-01T00:00:00', status: 'DRAFT', attemptNumber: 0 }
      ]);
      fixture.detectChanges();

      const link = (fixture.nativeElement as HTMLElement).querySelector('a[href*="/assignments"]') as HTMLAnchorElement;
      expect(link).toBeTruthy();
      expect(link.tagName).toBe('A'); // a real, keyboard-focusable anchor, not a click handler on a div
      expect(link.getAttribute('href')).toBe('/my-students/117/assignments');
    });

    it('does not render an Assignments link in the empty state', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 11 });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('a[href*="/assignments"]')).toBeNull();
    });

    it('feature-unavailable/load-failure: shows an undifferentiated unavailable message with a working Retry -- never a dead end', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 11 });
      // Any of the three assignment feature-gate layers produces this same
      // code -- deliberately not distinguished here, matching the audit.
      httpMock.expectOne(ASSIGNMENTS_URL).flush({ code: 'LEARNING_CONTENT_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain("Assignments aren't available right now.");
      expect(el.textContent).not.toContain('No open assignments right now.');

      // Unlike StudentAssignmentMessageComponent's back button (only shown
      // given a backLabel), Retry here is always present -- no dead end.
      const retryBtn = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Retry');
      expect(retryBtn).toBeTruthy();

      retryBtn!.click();
      expect(fixture.componentInstance.assignmentsLoading()).toBe(true);
      httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
      fixture.detectChanges();
      expect(fixture.componentInstance.assignmentsError()).toBe(false);
      expect(el.textContent).toContain('No open assignments right now.');
    });

    it('an assignments-call failure never blocks or clears the rest of the dashboard', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
        { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
      ]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 11 });
      httpMock.expectOne(ASSIGNMENTS_URL).flush({ code: 'LEARNING_CONTENT_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Vidya Rasa');
      expect(text).toContain('Dev Dance School');
      expect(fixture.componentInstance.loadError()).toBeNull();
      expect((fixture.nativeElement as HTMLElement).querySelector('.grid')).not.toBeNull();
    });
  });

  describe('D5/UX-2: Current Learning + Learning Path (independent, not mutually exclusive)', () => {
    it('renders both Current Learning and Learning Path cards together when both are present', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({
        classSelectionRequired: false, selectedClassId: 11,
        currentModule: { moduleId: 5, title: 'PILOT Lesson Module', moduleOrder: 1, status: 'RELEASED' },
        learningPath: { curriculumTitle: 'Bharatanatyam Foundations', level: 'Beginner' }
      });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('PILOT Lesson Module');
      expect(text).toContain('Bharatanatyam Foundations');
      // Two distinct cards, not one absorbing the other's content.
      const titles = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.card-title')).map(e => e.textContent);
      expect(titles).toContain('Current Learning');
      expect(titles).toContain('Learning path');
    });

    it('current module absent but learning path present: shows only the Learning Path card, not the "no curriculum" empty state', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({
        classSelectionRequired: false, selectedClassId: 11,
        learningPath: { curriculumTitle: 'Bharatanatyam Foundations', level: 'Beginner' }
      });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Bharatanatyam Foundations');
      expect(el.textContent).not.toContain('No curriculum assigned yet for this class.');
      const titles = Array.from(el.querySelectorAll('.card-title')).map(e => e.textContent);
      expect(titles).not.toContain('Current Learning');
    });

    it('no curriculum assigned (neither current module nor learning path): shows the honest empty state, not a blank card', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({
        classSelectionRequired: false, selectedClassId: 11
      });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('No curriculum assigned yet for this class.');
    });

    it('UX-2: neither Current Learning nor Learning Path renders while a class is still ambiguous, and no competing class-picker link is duplicated here', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: true });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Select a class above');
      const titles = Array.from(el.querySelectorAll('.card-title')).map(e => e.textContent);
      expect(titles).not.toContain('Learning path');
      expect(titles).not.toContain('Current Learning');
      // UX-2: the retired friction card's "Choose a class" link is gone --
      // My Classes (the directory) and the class-context bar (the switcher)
      // are the only two selection mechanisms now, neither duplicated here.
      expect(el.querySelector('a[href*="/classes"]')).toBeNull();
    });

    it('Learning Path card links to the full learning path for the selected class, as a real anchor', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({
        classSelectionRequired: false, selectedClassId: 11,
        currentModule: { moduleId: 5, title: 'PILOT Lesson Module', moduleOrder: 1, status: 'RELEASED' },
        learningPath: { curriculumTitle: 'Bharatanatyam Foundations', level: 'Beginner' }
      });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
      fixture.detectChanges();

      const link = (fixture.nativeElement as HTMLElement).querySelector('a[href*="/path"]') as HTMLAnchorElement;
      expect(link).toBeTruthy();
      expect(link.tagName).toBe('A');
      expect(link.getAttribute('href')).toBe('/my-students/117/classes/11/path');
    });

    it('never implies personal progress: no percentage, "completed", or "last viewed" language appears anywhere on the dashboard', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({
        classSelectionRequired: false, selectedClassId: 11,
        currentModule: { moduleId: 5, title: 'PILOT Lesson Module', moduleOrder: 1, status: 'RELEASED' },
        learningPath: { curriculumTitle: 'Bharatanatyam Foundations', level: 'Beginner' }
      });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).not.toMatch(/%|percent|completed|last viewed|progress/i);
    });

    it('UX-2: Current Learning is the priority card (spans two grid columns), Learning Path is not', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({
        classSelectionRequired: false, selectedClassId: 11,
        currentModule: { moduleId: 5, title: 'PILOT Lesson Module', moduleOrder: 1, status: 'RELEASED' },
        learningPath: { curriculumTitle: 'Bharatanatyam Foundations', level: 'Beginner' }
      });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const cards = Array.from(el.querySelectorAll('.card'));
      const currentLearningCard = cards.find(c => c.querySelector('.card-title')?.textContent === 'Current Learning');
      const learningPathCard = cards.find(c => c.querySelector('.card-title')?.textContent === 'Learning path');
      expect(currentLearningCard?.classList.contains('priority')).toBe(true);
      expect(learningPathCard?.classList.contains('priority')).toBe(false);
    });

    it('UX-2 priority order: Current Learning/Learning Path render before Attention/Fees/Class details/Class schedule', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({
        classSelectionRequired: false, selectedClassId: 11,
        currentModule: { moduleId: 5, title: 'PILOT Lesson Module', moduleOrder: 1, status: 'RELEASED' },
        learningPath: { curriculumTitle: 'Bharatanatyam Foundations', level: 'Beginner' }
      });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
      fixture.detectChanges();

      const titles = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.card-title')).map(e => e.textContent);
      expect(titles).toEqual(['Current Learning', 'Learning path', 'Attention', 'Fees', 'Class details', 'Class schedule']);
    });
  });

  describe('UX-01 second refinement: responsive card grid + card radius (UX-7: 8px -> 12px --sp-radius)', () => {
    it('the grid is an auto-fit/minmax responsive layout, not a hardcoded 1-then-2-column breakpoint -- column count scales with available width instead of a fixed number', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 11 });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
      fixture.detectChanges();

      const grid = (fixture.nativeElement as HTMLElement).querySelector('.grid') as HTMLElement;
      expect(grid).toBeTruthy();
      const columns = getComputedStyle(grid).gridTemplateColumns;
      expect(columns).toContain('auto-fit');
      expect(columns).toContain('minmax');
    });

    /**
     * UX-7 visual alignment correction: was asserting the 8px --sp-radius-sm
     * value (the token reserved for compact rows, e.g. module-summary-row.ts)
     * -- these are full mat-card surfaces, so they use --sp-radius (12px,
     * "Provider's mat-card radius"), the same token .sp-card
     * (styles-student.scss) already uses for exactly this category of
     * surface. Not a regression -- 8px read as "sharper card corners" than
     * Learning Path's own approved surfaces, which this corrects.
     *
     * Asserts the raw var() expression rather than a resolved pixel value:
     * jsdom's CSS engine (this test environment) does not resolve
     * CSS custom properties/var() fallbacks the way a real browser does --
     * getComputedStyle here returns the literal declaration text. That's
     * actually the more precise proof of intent anyway: it confirms this
     * rule is wired to the --sp-radius token itself, not merely a value
     * that happens to coincide with it.
     */
    it('renders cards with the standard --sp-radius (12px) student-portal mat-card radius, not the row-scale --sp-radius-sm (8px) or the old square (0px) corners', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush({ classSelectionRequired: false, selectedClassId: 11 });
      httpMock.expectOne(ASSIGNMENTS_URL).flush([]);
      fixture.detectChanges();

      const card = (fixture.nativeElement as HTMLElement).querySelector('.card') as HTMLElement;
      expect(card).toBeTruthy();
      expect(getComputedStyle(card).borderRadius).toBe('var(--sp-radius, 12px)');
    });
  });
});
