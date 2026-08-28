import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, Router, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../environments/environment';
import { StudentAccessLossService } from '../../core/services/student-access-loss.service';
import { StudentLearningContextService } from '../../core/services/student-learning-context.service';
import { studentLearningAccessInterceptor } from '../../core/services/student-learning-access.interceptor';
import { StudentLearningShellComponent } from './student-learning-shell';

/**
 * Security regression coverage: the architect found via manual review that
 * lost-access navigation still showed the routed student's name (in the
 * always-rendered switcher), school name, and "No active class" alongside
 * the generic lost-access block -- a genuine identity leak, not just an
 * extra message. These tests assert the structural absence of the
 * switcher/class-context-bar/router-outlet whenever
 * accessLoss.lostAccessFor() matches the routed student, not just that the
 * lost-access block happens to also be present.
 */
describe('StudentLearningShellComponent -- lost-access isolation', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [StudentLearningShellComponent],
      providers: [
        // The real studentLearningAccessInterceptor is wired here (not
        // just provideHttpClient()) so these tests exercise the actual
        // production interceptor -> StudentAccessLossService pipeline --
        // this is exactly the piece that was missing from the manual
        // verify-build bootstrap and made the previous fix look untested.
        provideHttpClient(withInterceptors([studentLearningAccessInterceptor])), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: { pipe: () => ({ subscribe: (fn: (p: unknown) => void) => fn(convertToParamMap({ studentId: '117' })) }) }, snapshot: { paramMap: convertToParamMap({ studentId: '117' }) } } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(StudentLearningShellComponent);
  }

  afterEach(() => httpMock.verify());

  it('normal (authorized) state: switcher and class-context bar render', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([
      { classId: 11, className: 'PILOT Assignment Class', schedule: 'Pilot schedule' }
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-student-switcher')).toBeTruthy();
    expect(el.querySelector('app-class-context-bar')).toBeTruthy();
    expect(el.querySelector('app-lost-access-block')).toBeFalsy();
  });

  it('lost-access state: switcher, class-context bar, and routed content are ALL structurally absent -- only the generic block renders, no leaked identity', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([
      { classId: 11, className: 'PILOT Assignment Class', schedule: 'Pilot schedule' }
    ]);
    fixture.detectChanges();

    TestBed.inject(StudentAccessLossService).markLost(117);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-student-switcher')).toBeFalsy();
    expect(el.querySelector('app-class-context-bar')).toBeFalsy();
    expect(el.querySelector('router-outlet')).toBeFalsy();
    expect(el.querySelector('app-lost-access-block')).toBeTruthy();
    expect((el.textContent ?? '')).not.toContain('Vidya Rasa');
  });

  it('navigating from an already-authorized, already-rendered dashboard to a lost-access state clears the switcher/class-bar immediately -- no flash of stale data', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([
      { classId: 11, className: 'PILOT Assignment Class', schedule: 'Pilot schedule' }
    ]);
    fixture.detectChanges();

    // Confirm the authorized state is genuinely rendered first (this is the
    // specific bug scenario: access loss arriving AFTER a real, already-
    // mounted, already-successful render -- not just a fresh failing load).
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-student-switcher')).toBeTruthy();
    expect((el.textContent ?? '')).toContain('Vidya Rasa');

    TestBed.inject(StudentAccessLossService).markLost(117);
    fixture.detectChanges();

    expect(el.querySelector('app-student-switcher')).toBeFalsy();
    expect(el.querySelector('app-class-context-bar')).toBeFalsy();
    expect((el.textContent ?? '')).not.toContain('Vidya Rasa');
    expect(el.querySelector('app-lost-access-block')).toBeTruthy();
  });

  it('parent-shell/context integration: a REAL lost-access HTTP failure (through the real interceptor, not a direct markLost() call) clears the shared context and hides all identity/class UI shell-wide', () => {
    // This is the test that was missing before: the previous round only
    // ever called accessLoss.markLost(117) directly, which proved the
    // template's @if was correct but never proved the real interceptor
    // pipeline actually reaches it -- which turned out to be broken in the
    // manual verify-build bootstrap (studentLearningAccessInterceptor was
    // never wired into main.verify.ts).
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([
      { classId: 11, className: 'Saturday Beginners', schedule: 'Sat 10am' }
    ]);
    fixture.detectChanges();

    // Confirm the authorized state is genuinely rendered first.
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-student-switcher')).toBeTruthy();
    expect(el.querySelector('app-class-context-bar')).toBeTruthy();
    expect(el.textContent).toContain('Vidya Rasa');
    expect(el.textContent).toContain('Saturday Beginners');
    const context = TestBed.inject(StudentLearningContextService);
    expect(context.classes().length).toBe(1);

    // "The next context request" -- a real HTTP call to the same
    // learning-scoped path a child screen would make, failing with the
    // exact shape the real backend returns for a genuinely lost student.
    TestBed.inject(HttpClient).get(`${environment.apiUrl}/account/students/117/learning/home`).subscribe({ error: () => {} });
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush(
      { code: 'STUDENT_CONTEXT_UNAVAILABLE', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' }
    );
    fixture.detectChanges();

    // The underlying shared state is actually cleared, not just hidden.
    expect(context.classes()).toEqual([]);
    expect(context.selectedClassId()).toBeNull();
    // And the complete rendered shell shows none of it.
    expect(el.querySelector('app-student-switcher')).toBeFalsy();
    expect(el.querySelector('app-class-context-bar')).toBeFalsy();
    expect(el.querySelector('router-outlet')).toBeFalsy();
    expect(el.querySelector('app-lost-access-block')).toBeTruthy();
    expect(el.textContent).not.toContain('Vidya Rasa');
    expect(el.textContent).not.toContain('Saturday Beginners');
    expect(el.textContent).not.toContain('Dev Dance School');
  });

  it('recovery: "Back to My Students" on the lost-access block navigates to /my-students', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([]);
    fixture.detectChanges();

    TestBed.inject(StudentAccessLossService).markLost(117);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const btn = (fixture.nativeElement as HTMLElement).querySelector('app-lost-access-block button') as HTMLButtonElement;
    btn.click();

    expect(router.navigate).toHaveBeenCalledWith(['/my-students']);
  });
});
