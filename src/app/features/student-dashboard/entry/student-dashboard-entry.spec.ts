import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StudentDashboardEntryComponent } from './student-dashboard-entry';

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

  afterEach(() => httpMock.verify());

  it('SELF-single direct entry: exactly one accessible student redirects straight to that dashboard', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);

    expect(router.navigate).toHaveBeenCalledWith(['/my-students', 117, 'dashboard'], { replaceUrl: true });
  });

  it('multi-student selection: more than one accessible student renders clickable cards, no auto-redirect', () => {
    const fixture = setup();
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

  it('clicking a student card navigates to that student\'s dashboard', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' },
      { studentId: 118, providerId: 1, studentDisplayName: 'Second Child', providerDisplayName: 'Dev Dance School', accessType: 'GUARDIAN' }
    ]);
    fixture.detectChanges();

    const card = (fixture.nativeElement as HTMLElement).querySelector('.student-card') as HTMLElement;
    card.click();
    expect(router.navigate).toHaveBeenCalledWith(['/my-students', 117, 'dashboard']);
  });

  it('zero accessible students shows an honest empty state, never a fake/sample student', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    fixture.detectChanges();

    expect(router.navigate).not.toHaveBeenCalled();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No students are linked to this account yet.');
  });

  it('a list-load failure shows the error state, never silently proceeds', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush(
      { code: 'UNKNOWN', message: 'x', resource: null }, { status: 500, statusText: 'Server Error' }
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBeTruthy();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
