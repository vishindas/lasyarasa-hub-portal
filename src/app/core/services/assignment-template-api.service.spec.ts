import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AssignmentTemplateApiService } from './assignment-template-api.service';

describe('AssignmentTemplateApiService (7 core, answer-key-free endpoints)', () => {
  let service: AssignmentTemplateApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/school/assignments/templates`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AssignmentTemplateApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('create() -> POST /templates', () => {
    const body = { moduleId: 1, curriculumVersionId: 2 };
    service.create(body).subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('list() -> GET /templates with moduleId + paging', () => {
    service.list(5, 0, 20).subscribe();
    const req = httpMock.expectOne(`${base}?page=0&size=20&moduleId=5`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });

  it('list() -> GET /templates without moduleId when null', () => {
    service.list(null, 0, 20).subscribe();
    const req = httpMock.expectOne(`${base}?page=0&size=20`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });

  it('get() -> GET /templates/:id', () => {
    service.get(1).subscribe();
    const req = httpMock.expectOne(`${base}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('discardDraft() -> DELETE /templates/:id/draft', () => {
    service.discardDraft(1).subscribe();
    const req = httpMock.expectOne(`${base}/1/draft`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('publish() -> POST /templates/:id/publish with expectedRowVersion', () => {
    service.publish(1, { expectedRowVersion: 3 }).subscribe();
    const req = httpMock.expectOne(`${base}/1/publish`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ expectedRowVersion: 3 });
    req.flush({});
  });

  it('archive() -> POST /templates/:id/archive with expectedRowVersion', () => {
    service.archive(1, { expectedRowVersion: 3 }).subscribe();
    const req = httpMock.expectOne(`${base}/1/archive`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('eligibleClasses() -> GET /templates/:id/eligible-classes', () => {
    service.eligibleClasses(1).subscribe();
    const req = httpMock.expectOne(`${base}/1/eligible-classes`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
