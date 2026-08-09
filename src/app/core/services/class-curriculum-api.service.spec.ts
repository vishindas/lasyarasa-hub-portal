import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ClassCurriculumApiService } from './class-curriculum-api.service';

describe('ClassCurriculumApiService', () => {
  let service: ClassCurriculumApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/school/classes/7`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ClassCurriculumApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('current() -> GET /classes/:id/curriculum-assignment', () => {
    service.current(7).subscribe();
    const req = httpMock.expectOne(`${base}/curriculum-assignment`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('currentModuleStates() -> GET /classes/:id/curriculum-assignment/module-states', () => {
    service.currentModuleStates(7).subscribe();
    const req = httpMock.expectOne(`${base}/curriculum-assignment/module-states`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('assign() -> POST /classes/:id/curriculum-assignment with body', () => {
    const body = { curriculumVersionId: 2, expectedRowVersion: 0 };
    service.assign(7, body).subscribe();
    const req = httpMock.expectOne(`${base}/curriculum-assignment`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('release() -> POST /classes/:id/modules/:stateId/release', () => {
    service.release(7, 9, { expectedRowVersion: 0 }).subscribe();
    const req = httpMock.expectOne(`${base}/modules/9/release`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('relock() -> POST /classes/:id/modules/:stateId/relock', () => {
    service.relock(7, 9, { expectedRowVersion: 0 }).subscribe();
    const req = httpMock.expectOne(`${base}/modules/9/relock`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('complete() -> POST /classes/:id/modules/:stateId/complete', () => {
    service.complete(7, 9, { expectedRowVersion: 0 }).subscribe();
    const req = httpMock.expectOne(`${base}/modules/9/complete`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('withdraw() -> POST /classes/:id/modules/:stateId/withdraw with reason', () => {
    const body = { reason: 'wrong module', expectedRowVersion: 0 };
    service.withdraw(7, 9, body).subscribe();
    const req = httpMock.expectOne(`${base}/modules/9/withdraw`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('changePreview() -> GET /classes/:id/curriculum-assignment/change-preview?targetCurriculumVersionId=', () => {
    service.changePreview(7, 20).subscribe();
    const req = httpMock.expectOne(r => r.url === `${base}/curriculum-assignment/change-preview` && r.params.get('targetCurriculumVersionId') === '20');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('changeConfirm() -> POST /classes/:id/curriculum-assignment/change-confirm with body', () => {
    const body = { targetCurriculumVersionId: 20, targetVersionExpectedRowVersion: 0, currentAssignmentId: 50, currentAssignmentExpectedRowVersion: 0, mappings: [] };
    service.changeConfirm(7, body).subscribe();
    const req = httpMock.expectOne(`${base}/curriculum-assignment/change-confirm`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });
});
