import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CurriculumApiService } from './curriculum-api.service';

describe('CurriculumApiService', () => {
  let service: CurriculumApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/school/curricula`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CurriculumApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() -> GET /curricula', () => {
    service.list().subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('get() -> GET /curricula/:id', () => {
    service.get(1).subscribe();
    const req = httpMock.expectOne(`${base}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('create() -> POST /curricula with body', () => {
    const body = { danceStyleId: 1, internalName: 'x', title: 'y', level: null, objectives: null };
    service.create(body).subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('listVersions() -> GET /curricula/:id/versions', () => {
    service.listVersions(1).subscribe();
    const req = httpMock.expectOne(`${base}/1/versions`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getVersion() -> GET /curricula/:id/versions/:vId', () => {
    service.getVersion(1, 2).subscribe();
    const req = httpMock.expectOne(`${base}/1/versions/2`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('updateDraftContent() -> PUT /curricula/:id/versions/:vId', () => {
    const body = { title: 't', level: null, objectives: null, expectedRowVersion: 0 };
    service.updateDraftContent(1, 2, body).subscribe();
    const req = httpMock.expectOne(`${base}/1/versions/2`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('activate() -> POST /curricula/:id/versions/:vId/activate', () => {
    service.activate(1, 2, { expectedRowVersion: 0 }).subscribe();
    const req = httpMock.expectOne(`${base}/1/versions/2/activate`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('archive() -> POST /curricula/:id/versions/:vId/archive', () => {
    service.archive(1, 2, { expectedRowVersion: 0 }).subscribe();
    const req = httpMock.expectOne(`${base}/1/versions/2/archive`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('clone() -> POST /curricula/:id/versions/:vId/clone', () => {
    service.clone(1, 2, { expectedRowVersion: 0 }).subscribe();
    const req = httpMock.expectOne(`${base}/1/versions/2/clone`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
