import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, Router, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../environments/environment';
import { StudentAccessLossService } from '../../core/services/student-access-loss.service';
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
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
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
