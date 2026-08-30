import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { StudentSwitcherComponent } from './student-switcher';

/**
 * UX-01 refinement: locks in the retargeted switch destination
 * (`dashboard`, not the legacy `home`) -- no prior test asserted this
 * component's navigation target at all, so this is new coverage, not a
 * changed assertion. See select()'s own comment in student-switcher.ts for
 * the full rationale (Dashboard is a strict superset of Home's content and
 * is the shell's actual "Dashboard" nav-item target).
 */
describe('StudentSwitcherComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(currentStudentId: number) {
    TestBed.configureTestingModule({
      imports: [StudentSwitcherComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(StudentSwitcherComponent);
    fixture.componentRef.setInput('currentStudentId', currentStudentId);
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('selecting a different student navigates to that student\'s Dashboard, not the legacy Home route', () => {
    const fixture = setup(117);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' },
      { studentId: 118, providerId: 1, studentDisplayName: 'Second Child', providerDisplayName: 'Dev Dance School', accessType: 'GUARDIAN' }
    ]);
    fixture.detectChanges();

    fixture.componentInstance.select({ studentId: 118, providerId: 1, studentDisplayName: 'Second Child', providerDisplayName: 'Dev Dance School', accessType: 'GUARDIAN' });

    expect(router.navigate).toHaveBeenCalledWith(['/my-students', 118, 'dashboard']);
  });

  it('selecting the already-current student is a no-op -- no navigation at all', () => {
    const fixture = setup(117);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    fixture.detectChanges();

    fixture.componentInstance.select({ studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' });

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
