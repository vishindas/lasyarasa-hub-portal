import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StudentShellNavComponent } from './student-shell-nav';

@Component({ standalone: true, template: '' })
class StubPage {}

describe('StudentShellNavComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [StudentShellNavComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(),
        provideRouter([
          { path: 'my-students/:studentId/dashboard', component: StubPage },
          { path: 'my-students/:studentId/classes', component: StubPage },
          { path: 'my-students/:studentId/assignments', component: StubPage },
          { path: 'my-students/:studentId/fees', component: StubPage }
        ])
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StudentShellNavComponent);
    fixture.componentRef.setInput('studentId', 117);
    return fixture;
  }

  function flushSwitcher(accessType: 'SELF' | 'GUARDIAN' = 'SELF') {
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType }
    ]);
  }

  afterEach(() => httpMock.verify());

  it('renders the LasyaRasa brand', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushSwitcher();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('LasyaRasa');
  });

  it('shows the relationship caption ("Guardian") for the currently selected student -- reads the switcher\'s own already-fetched data, no second call', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushSwitcher('GUARDIAN');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.relationship-caption')?.textContent).toBe('Guardian');
    httpMock.verify(); // exactly one /account/students call, not a duplicate for the caption
  });

  it('shows "Self" for a SELF-access student', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushSwitcher('SELF');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.relationship-caption')?.textContent).toBe('Self');
  });

  it('renders exactly the four approved destinations, no invented Learning or Account route', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushSwitcher();
    fixture.detectChanges();

    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a.nav-item')).map(a => a.textContent?.trim());
    expect(labels.some(l => l?.includes('Dashboard'))).toBe(true);
    expect(labels.some(l => l?.includes('My Classes'))).toBe(true);
    expect(labels.some(l => l?.includes('Assignments'))).toBe(true);
    expect(labels.some(l => l?.includes('Fees'))).toBe(true);
    expect(labels.length).toBe(4);
  });

  it('marks "My Classes" active while routed to a nested classes/** screen -- Learning Path/Module/Lesson have no top-level link of their own', async () => {
    const fixture = setup();
    fixture.detectChanges();
    flushSwitcher();
    fixture.detectChanges();

    await TestBed.inject(Router).navigateByUrl('/my-students/117/classes');
    fixture.detectChanges();

    const active = (fixture.nativeElement as HTMLElement).querySelector('a.nav-item.active');
    expect(active?.textContent).toContain('My Classes');
  });

  it('lostAccess hides the switcher and all four nav links, but keeps the account menu reachable', () => {
    const fixture = setup();
    fixture.componentRef.setInput('lostAccess', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-student-switcher')).toBeFalsy();
    expect(el.querySelectorAll('a.nav-item').length).toBe(0);
    expect(el.querySelector('app-account-menu')).toBeTruthy();
  });

  it('renders the account menu in its expanded, labeled rail form (not the compact icon-only trigger)', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushSwitcher();
    fixture.detectChanges();

    const trigger = (fixture.nativeElement as HTMLElement).querySelector('app-account-menu .trigger.expanded');
    expect(trigger).toBeTruthy();
    expect(trigger?.textContent).toContain('Account');
  });
});
