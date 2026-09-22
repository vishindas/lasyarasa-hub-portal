import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, Router, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { CurriculumModule } from '../../../core/models/curriculum.model';
import { CurriculumPreviewComponent } from './curriculum-preview';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

/** Trivial stand-in for LessonListComponent's previewMode route -- only its identity matters here, not its content. */
@Component({ selector: 'app-dummy-lessons-preview', standalone: true, template: '' })
class DummyLessonsPreviewComponent {}

const PUBLISHED_MODULE: CurriculumModule = {
  id: 14, curriculumVersionId: 11, title: 'Introduction to Indian Classical Dance', objectives: null, moduleOrder: 1,
  contentStatus: 'PUBLISHED', rowVersion: 1, publishedAt: 'x', publishedBy: 1, archivedAt: null, archivedBy: null
};
const DRAFT_MODULE: CurriculumModule = {
  id: 15, curriculumVersionId: 11, title: 'Draft Module', objectives: null, moduleOrder: 2,
  contentStatus: 'DRAFT', rowVersion: 0, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null
};
const ARCHIVED_MODULE: CurriculumModule = {
  id: 16, curriculumVersionId: 11, title: 'Archived Module', objectives: null, moduleOrder: 3,
  contentStatus: 'ARCHIVED', rowVersion: 2, publishedAt: 'x', publishedBy: 1, archivedAt: 'x', archivedBy: 1
};

/**
 * Issue #54: a PUBLISHED module in Curriculum Preview must be a real,
 * clickable link into the module's published lessons; DRAFT/ARCHIVED
 * modules must remain listed (so the teacher can see the curriculum's full
 * structure) but non-interactive, since neither is what a student would
 * ever see.
 */
describe('CurriculumPreviewComponent -- Issue #54, published-module interactivity', () => {
  let httpMock: HttpTestingController;

  function setup(modules: CurriculumModule[] | 'error') {
    TestBed.configureTestingModule({
      imports: [CurriculumPreviewComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(),
        provideRouter([
          { path: 'vidya-rasa/curricula/:curriculumId/versions/:versionId/modules/:moduleId/lessons/preview', component: DummyLessonsPreviewComponent }
        ]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '8', versionId: '11' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CurriculumPreviewComponent);
    fixture.detectChanges();
    if (modules === 'error') {
      httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/11/modules`)
        .flush({ code: 'SERVER_ERROR' }, { status: 500, statusText: 'Server Error' });
    } else {
      httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/11/modules`).flush(modules);
    }
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  function rowContaining(el: HTMLElement, text: string): HTMLElement {
    const row = Array.from(el.querySelectorAll('.module-row')).find(r => (r.textContent ?? '').includes(text));
    if (!row) throw new Error(`No module row found containing "${text}"`);
    return row as HTMLElement;
  }

  // ---- Requirement 1 & link/button semantics ----

  it('a PUBLISHED module renders as a real anchor with a resolvable href and an understandable accessible name', () => {
    const fixture = setup([PUBLISHED_MODULE]);
    const row = rowContaining(fixture.nativeElement as HTMLElement, 'Introduction to Indian Classical Dance');
    const link = row.querySelector('a.module-title') as HTMLAnchorElement | null;

    expect(link).not.toBeNull();
    expect(link!.tagName).toBe('A'); // real anchor semantics -- guarantees native Enter-key activation in every browser, distinct from Space (not applicable to links, matching the issue's own "where applicable" wording)
    expect(link!.getAttribute('href')).toBe('/vidya-rasa/curricula/8/versions/11/modules/14/lessons/preview');
    expect(link!.getAttribute('aria-label')).toBe('Preview module: Introduction to Indian Classical Dance');
  });

  // ---- Requirement 5/6: DRAFT and ARCHIVED modules stay listed but excluded from the interactive flow ----

  it('a DRAFT module renders as plain, non-interactive text -- no link, no button', () => {
    const fixture = setup([DRAFT_MODULE]);
    const row = rowContaining(fixture.nativeElement as HTMLElement, 'Draft Module');

    expect(row.querySelector('a')).toBeNull();
    expect(row.querySelector('button')).toBeNull();
    expect(row.querySelector('span.module-title')?.textContent?.trim()).toBe('Draft Module');
  });

  it('an ARCHIVED module renders as plain, non-interactive text -- no link, no button', () => {
    const fixture = setup([ARCHIVED_MODULE]);
    const row = rowContaining(fixture.nativeElement as HTMLElement, 'Archived Module');

    expect(row.querySelector('a')).toBeNull();
    expect(row.querySelector('button')).toBeNull();
  });

  // ---- Requirement 2: mouse activation navigates correctly ----

  it('clicking the published module link navigates to its lessons-preview route (mouse activation)', async () => {
    const fixture = setup([PUBLISHED_MODULE]);
    const row = rowContaining(fixture.nativeElement as HTMLElement, 'Introduction to Indian Classical Dance');
    const link = row.querySelector('a.module-title') as HTMLAnchorElement;

    link.click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/vidya-rasa/curricula/8/versions/11/modules/14/lessons/preview');
  });

  // ---- Mixed list: only the published row is interactive ----

  it('in a mixed list, only the PUBLISHED module is clickable', () => {
    const fixture = setup([DRAFT_MODULE, PUBLISHED_MODULE, ARCHIVED_MODULE]);
    const el = fixture.nativeElement as HTMLElement;

    expect(rowContaining(el, 'Draft Module').querySelector('a')).toBeNull();
    expect(rowContaining(el, 'Introduction to Indian Classical Dance').querySelector('a')).not.toBeNull();
    expect(rowContaining(el, 'Archived Module').querySelector('a')).toBeNull();
  });

  // ---- Requirement 8: existing empty/loading/error states remain intact ----

  it('shows the loading state before the modules response arrives', () => {
    TestBed.configureTestingModule({
      imports: [CurriculumPreviewComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '8', versionId: '11' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CurriculumPreviewComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading');
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/11/modules`).flush([]);
  });

  it('shows the existing empty state when the version has no modules', () => {
    const fixture = setup([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Add modules to preview the learning path.');
  });

  it('shows the existing error state on a failed load, with no module rows rendered', () => {
    const fixture = setup('error');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.module-row')).toBeNull();
    expect(el.querySelector('app-curriculum-message')).not.toBeNull();
  });

  // ---- Requirement 9: provider/tenant scoping is not weakened by this change ----

  it('the modules request is scoped only by the route-derived versionId -- no client-supplied provider/tenant parameter', () => {
    TestBed.configureTestingModule({
      imports: [CurriculumPreviewComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '8', versionId: '11' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CurriculumPreviewComponent);
    fixture.detectChanges();

    // Exactly one GET, exactly this URL -- no query string, no provider/tenant id anywhere in
    // it (the backend derives provider scoping from the JWT, never from a client-supplied
    // param -- see CurriculumModuleApiService.list). This is the same request this screen
    // already made before Issue #54; the fix adds no new network call and no new client input.
    const req = httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/11/modules`);
    expect(req.request.method).toBe('GET');
    expect(req.request.urlWithParams).toBe(`${environment.apiUrl}/school/curricula/versions/11/modules`);
    req.flush([PUBLISHED_MODULE]);
    fixture.detectChanges();
    // afterEach's httpMock.verify() below additionally proves no other request was ever made.
  });
});
