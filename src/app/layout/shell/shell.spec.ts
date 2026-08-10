import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ShellComponent } from './shell';

/**
 * Structural test for the mobile chat-FAB clearance fix (styles.scss
 * `.page-content` mobile media query). That CSS relies on two invariants
 * this test locks in: every routed page renders inside the single
 * `.page-content` scroll container, and `<app-chat-widget>` (the fixed FAB)
 * is a SIBLING of that container, not nested inside it -- if either ever
 * changed, the shared bottom-padding reservation would stop protecting the
 * screens it was written for without any visual-only check catching it.
 */
describe('ShellComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false, breakpoints: {} }) } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/settings/currency`).flush({ currency: 'INR' });
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('renders router-outlet inside .page-content, the shared scroll container the FAB-clearance fix targets', () => {
    const fixture = setup();
    const pageContent = (fixture.nativeElement as HTMLElement).querySelector('.page-content');
    expect(pageContent).toBeTruthy();
    expect(pageContent!.querySelector('router-outlet')).toBeTruthy();
  });

  it('renders app-chat-widget as a sibling of .page-content, not nested inside it', () => {
    const fixture = setup();
    const root = fixture.nativeElement as HTMLElement;
    const pageContent = root.querySelector('.page-content')!;
    const chatWidget = root.querySelector('app-chat-widget');
    expect(chatWidget).toBeTruthy();
    expect(pageContent.contains(chatWidget)).toBe(false);
  });
});
