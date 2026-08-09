import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { CurriculumBuilderComponent } from './curriculum-builder';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

describe('CurriculumBuilderComponent', () => {
  let httpMock: HttpTestingController;

  function setup(params: Record<string, string>) {
    TestBed.configureTestingModule({
      imports: [CurriculumBuilderComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub(params) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CurriculumBuilderComponent);
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('create mode (no curriculumId param): shows the creation form, not a lifecycle rail', () => {
    const fixture = setup({});
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/settings/dance-styles`).flush([]);

    expect(fixture.componentInstance.isCreate()).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('New Curriculum');
  });

  it('create mode blocks submission with a field-level message when required fields are missing', () => {
    const fixture = setup({});
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/settings/dance-styles`).flush([]);

    fixture.componentInstance.createCurriculum();
    expect(fixture.componentInstance.fieldValidation()).toContain('required');
  });

  it('edit mode: loads curriculum, version and modules, and computes isDraft() from the version status', () => {
    const fixture = setup({ curriculumId: '1', versionId: '2' });
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/school/settings/dance-styles`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1`).flush({ id: 1, providerId: 1, danceStyleId: 1, internalName: 'x', rowVersion: 0, createdAt: '', createdBy: 1 });
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions/2`)
      .flush({ id: 2, curriculumId: 1, versionNumber: 1, status: 'DRAFT', title: 't', level: null, objectives: null, clonedFromVersionId: null, rowVersion: 0, activatedAt: null, activatedBy: null, archivedAt: null, archivedBy: null });
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/2/modules`).flush([]);

    expect(fixture.componentInstance.isDraft()).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('edit mode: a 404 on load surfaces as a not-found message, not a generic error', () => {
    const fixture = setup({ curriculumId: '1', versionId: '2' });
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/school/settings/dance-styles`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1`)
      .flush({ code: 'RESOURCE_NOT_FOUND', message: 'gone', resource: 'Curriculum' }, { status: 404, statusText: 'Not Found' });
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions/2`)
      .flush({ id: 2, curriculumId: 1, versionNumber: 1, status: 'DRAFT', title: 't', level: null, objectives: null, clonedFromVersionId: null, rowVersion: 0, activatedAt: null, activatedBy: null, archivedAt: null, archivedBy: null });
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/2/modules`).flush([]);

    expect(fixture.componentInstance.loadError()?.kind).toBe('not-found');
  });
});
