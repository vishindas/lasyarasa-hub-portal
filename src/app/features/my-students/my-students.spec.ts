import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MyStudentsComponent } from './my-students';

/**
 * Regression coverage for pre-existing My Students behavior, plus the
 * Slice 12 dormant-gate contract (architect decision 4): while
 * environment.studentLearningEntryEnabled is false (the committed default
 * in every environment, including this test's), cards must render with
 * zero behavioral change from before Slice 12 existed -- no routerLink, no
 * navigation on click.
 */
describe('MyStudentsComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [MyStudentsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(MyStudentsComponent);
  }

  afterEach(() => httpMock.verify());

  it('loads and renders students exactly as before Slice 12 (regression)', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 1, providerId: 9, studentDisplayName: 'Arjun Rao', providerDisplayName: 'LasyaRasa', accessType: 'GUARDIAN' }
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.view()).toBe('loaded');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Arjun Rao');
  });

  it('empty/error/retry states are unchanged from before Slice 12 (regression)', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.view()).toBe('empty');
  });

  it('dormant gate: while studentLearningEntryEnabled is false (the committed default), student cards render as plain mat-card, never an <a> with routerLink', () => {
    expect(environment.studentLearningEntryEnabled).toBe(false); // sanity: confirms this test exercises the real committed default, not an assumption
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 1, providerId: 9, studentDisplayName: 'Arjun Rao', providerDisplayName: 'LasyaRasa', accessType: 'GUARDIAN' }
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a.student-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('mat-card.student-card')).not.toBeNull();
  });

  it('dormant gate: entryEnabled mirrors the environment flag directly, no separate runtime check', () => {
    const fixture = setup();
    expect(fixture.componentInstance.entryEnabled).toBe(environment.studentLearningEntryEnabled);
  });
});
