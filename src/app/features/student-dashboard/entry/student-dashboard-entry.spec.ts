import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StudentDashboardEntryComponent } from './student-dashboard-entry';

function setEntryEnabled(fixture: ReturnType<typeof TestBed.createComponent<StudentDashboardEntryComponent>>, value: boolean) {
  // entryEnabled is `readonly` only at compile time -- overridden directly here,
  // the same technique the retired MyStudentsComponent's own spec used. Since
  // the D6 go-live, the real committed environment.ts value is true, so this
  // helper is what the "inert/dormant-mode" tests below use to explicitly
  // force false and prove that contract still holds -- it is no longer the
  // real committed default, but the behavior itself (e.g. for a future
  // rollback, or a future per-provider gate) is still worth guarding.
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

  describe('D6 go-live: studentLearningEntryEnabled is true (the real committed default, post-activation)', () => {
    it('sanity: this suite exercises the real committed post-activation default, not an assumption', () => {
      expect(environment.studentLearningEntryEnabled).toBe(true);
    });
  });

  describe('inert-mode contract (explicit override -- no longer the real default since the D6 go-live, but still guarded here in case of a future rollback or per-provider gate)', () => {
    it('lists students but never auto-redirects, even with exactly one accessible student', () => {
      const fixture = setup();
      setEntryEnabled(fixture, false);
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
        { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
      ]);
      fixture.detectChanges();

      expect(router.navigate).not.toHaveBeenCalled();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Vidya Rasa');
      // Exactly one card is not a "choice" -- title stays neutral, unlike the 2+ case.
      expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe('My Students');
    });

    it('renders student cards as plain, non-interactive mat-card -- no role, no tabindex, clicking does nothing', () => {
      const fixture = setup();
      setEntryEnabled(fixture, false);
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
      setEntryEnabled(fixture, false);
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('app-account-menu')).toBeTruthy();
    });

    it('zero/error states are unaffected by the inert-mode override', () => {
      const fixture = setup();
      setEntryEnabled(fixture, false);
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('No students are linked to this account yet.');
      expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe('My Students');
    });

    it('title correction applies even while inert: two or more listed students still read "Choose a student"', () => {
      const fixture = setup();
      setEntryEnabled(fixture, false);
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
        { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' },
        { studentId: 118, providerId: 1, studentDisplayName: 'Second Child', providerDisplayName: 'Dev Dance School', accessType: 'GUARDIAN' }
      ]);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe('Choose a student');
      // Still inert: still no navigation, matching the existing non-interactive-card test above.
      expect(router.navigate).not.toHaveBeenCalled();
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
      const el = fixture.nativeElement as HTMLElement;
      const cards = el.querySelectorAll('.student-card');
      expect(cards.length).toBe(2);
      // The one real selection screen -- titled distinctly from the neutral default.
      const h1 = el.querySelector('h1');
      expect(h1?.textContent).toBe('Choose a student');
      // Focus-management convention (route-change H1 auto-focus) is unaffected by the retitle.
      expect(h1?.getAttribute('tabindex')).toBe('-1');
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
      const el = fixture.nativeElement as HTMLElement;
      const text = el.textContent ?? '';
      expect(text).toContain('No students are linked to this account yet.');
      expect(el.querySelector('h1')?.textContent).toBe('My Students');
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

    it('clicking the rendered Retry control reloads the student list and recovers to a normal, usable state -- regression coverage for the retry button that previously did nothing', () => {
      const fixture = setup();
      setEntryEnabled(fixture, true);
      fixture.detectChanges();

      // Initial load fails.
      httpMock.expectOne(`${environment.apiUrl}/account/students`).flush(
        { code: 'UNKNOWN', message: 'x', resource: null }, { status: 500, statusText: 'Server Error' }
      );
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Something went wrong');

      // The real rendered control, found and activated the same way a user would --
      // not a direct method call, so this actually proves the template wiring works.
      const retryBtn = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Retry');
      expect(retryBtn).toBeTruthy();
      retryBtn!.click();
      fixture.detectChanges();

      // Retry genuinely re-requests the list -- exactly one new request, not zero, not two.
      const retryReq = httpMock.expectOne(`${environment.apiUrl}/account/students`);
      retryReq.flush([
        { studentId: 118, providerId: 1, studentDisplayName: 'Second Child', providerDisplayName: 'Dev Dance School', accessType: 'GUARDIAN' },
        { studentId: 119, providerId: 1, studentDisplayName: 'Third Child', providerDisplayName: 'Dev Dance School', accessType: 'GUARDIAN' }
      ]);
      fixture.detectChanges();

      // The failure state is gone and the student list renders normally -- the user can continue.
      expect(fixture.componentInstance.loadError()).toBeNull();
      expect(el.textContent).not.toContain('Something went wrong');
      expect(el.textContent).toContain('Second Child');
      expect(el.textContent).toContain('Third Child');
      const cards = el.querySelectorAll('.student-card');
      expect(cards.length).toBe(2);

      // httpMock.verify() in afterEach additionally proves no duplicate/leaked
      // request was left outstanding beyond this one intentional retry.
    });
  });
});
