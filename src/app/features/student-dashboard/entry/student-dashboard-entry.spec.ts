import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StudentDashboardEntryComponent } from './student-dashboard-entry';

function setEntryEnabled(fixture: ReturnType<typeof TestBed.createComponent<StudentDashboardEntryComponent>>, value: boolean) {
  // entryEnabled is `readonly` only at compile time -- overridden directly here,
  // the same technique the retired MyStudentsComponent's own spec used, since
  // the test environment's real committed environment.ts value is false.
  (fixture.componentInstance as unknown as { entryEnabled: boolean }).entryEnabled = value;
}

describe('StudentDashboardEntryComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup() {
    TestBed.configureTestingModule({
      imports: [StudentDashboardEntryComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    return TestBed.createComponent(StudentDashboardEntryComponent);
  }

  afterEach(() => httpMock?.verify());

  describe('D6 dormant gate: studentLearningEntryEnabled is false (the real committed default in every environment)', () => {
    it('sanity: this suite exercises the real committed default, not an assumption', () => {
      expect(environment.studentLearningEntryEnabled).toBe(false);
    });

    it('lists students but never auto-redirects, even with exactly one accessible student', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
        { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
      ]);
      fixture.detectChanges();

      expect(router.navigate).not.toHaveBeenCalled();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Vidya Rasa');
    });

    it('renders student cards as plain, non-interactive mat-card -- no role, no tabindex, clicking does nothing', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
        { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' },
        { studentId: 118, providerId: 1, studentDisplayName: 'Second Child', providerDisplayName: 'Dev Dance School', accessType: 'GUARDIAN' }
      ]);
      fixture.detectChanges();

      const card = (fixture.nativeElement as HTMLElement).querySelector('mat-card.student-card') as HTMLElement;
      expect(card).toBeTruthy();
      expect(card.getAttribute('role')).toBeNull();
      expect(card.getAttribute('tabindex')).toBeNull();
      card.click();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('the account menu is present even before any student is chosen', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('app-account-menu')).toBeTruthy();
    });

    it('zero/error states are unaffected by the dormant gate', () => {
      const fixture = setup();
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('No students are linked to this account yet.');
    });
  });

  describe('D1 behavior, exercised once entryEnabled is true (post-activation)', () => {
    it('SELF-single direct entry: exactly one accessible student redirects straight to that dashboard', () => {
      const fixture = setup();
      setEntryEnabled(fixture, true);
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
        { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
      ]);

      expect(router.navigate).toHaveBeenCalledWith(['/my-students', 117, 'dashboard'], { replaceUrl: true });
    });

    it('multi-student selection: more than one accessible student renders clickable cards, no auto-redirect', () => {
      const fixture = setup();
      setEntryEnabled(fixture, true);
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
        { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' },
        { studentId: 118, providerId: 1, studentDisplayName: 'Second Child', providerDisplayName: 'Dev Dance School', accessType: 'GUARDIAN' }
      ]);
      fixture.detectChanges();

      expect(router.navigate).not.toHaveBeenCalled();
      const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.student-card');
      expect(cards.length).toBe(2);
    });

    it('clicking a student card navigates to that student\'s dashboard, as a real role="button" with tabindex', () => {
      const fixture = setup();
      setEntryEnabled(fixture, true);
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
        { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' },
        { studentId: 118, providerId: 1, studentDisplayName: 'Second Child', providerDisplayName: 'Dev Dance School', accessType: 'GUARDIAN' }
      ]);
      fixture.detectChanges();

      const card = (fixture.nativeElement as HTMLElement).querySelector('.student-card') as HTMLElement;
      expect(card.getAttribute('role')).toBe('button');
      expect(card.getAttribute('tabindex')).toBe('0');
      card.click();
      expect(router.navigate).toHaveBeenCalledWith(['/my-students', 117, 'dashboard']);
    });

    it('zero accessible students shows an honest empty state, never a fake/sample student', () => {
      const fixture = setup();
      setEntryEnabled(fixture, true);
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      fixture.detectChanges();

      expect(router.navigate).not.toHaveBeenCalled();
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('No students are linked to this account yet.');
    });

    it('a list-load failure shows the error state, never silently proceeds', () => {
      const fixture = setup();
      setEntryEnabled(fixture, true);
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush(
        { code: 'UNKNOWN', message: 'x', resource: null }, { status: 500, statusText: 'Server Error' }
      );
      fixture.detectChanges();

      expect(fixture.componentInstance.loadError()).toBeTruthy();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
