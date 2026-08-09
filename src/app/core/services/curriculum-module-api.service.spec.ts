import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CurriculumModuleApiService } from './curriculum-module-api.service';

describe('CurriculumModuleApiService', () => {
  let service: CurriculumModuleApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/school/curricula/versions`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CurriculumModuleApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() -> GET /versions/:vId/modules', () => {
    service.list(2).subscribe();
    const req = httpMock.expectOne(`${base}/2/modules`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('create() -> POST /versions/:vId/modules with body', () => {
    const body = { title: 't', objectives: null, moduleOrder: 1 };
    service.create(2, body).subscribe();
    const req = httpMock.expectOne(`${base}/2/modules`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('update() -> PUT /versions/modules/:mId', () => {
    const body = { title: 't', objectives: null, expectedRowVersion: 0 };
    service.update(5, body).subscribe();
    const req = httpMock.expectOne(`${base}/modules/5`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('reorder() -> POST /versions/:vId/modules/reorder', () => {
    const body = { entries: [{ moduleId: 5, expectedRowVersion: 0, newOrder: 2 }] };
    service.reorder(2, body).subscribe();
    const req = httpMock.expectOne(`${base}/2/modules/reorder`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush([]);
  });

  it('publish() -> POST /versions/modules/:mId/publish', () => {
    service.publish(5, { expectedRowVersion: 0 }).subscribe();
    const req = httpMock.expectOne(`${base}/modules/5/publish`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('archive() -> POST /versions/modules/:mId/archive', () => {
    service.archive(5, { expectedRowVersion: 0 }).subscribe();
    const req = httpMock.expectOne(`${base}/modules/5/archive`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
