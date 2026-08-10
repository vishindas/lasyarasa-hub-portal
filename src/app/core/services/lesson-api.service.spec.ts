import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LessonApiService } from './lesson-api.service';

describe('LessonApiService', () => {
  let service: LessonApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/school/curricula/versions/modules`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(LessonApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() -> GET /modules/:moduleId/lessons', () => {
    service.list(10).subscribe();
    const req = httpMock.expectOne(`${base}/10/lessons`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('create() -> POST /modules/:moduleId/lessons with body', () => {
    const body = { title: 't', contentType: 'TEXT' as const, youtubeUrl: null, textContent: 'x', externalUrl: null, externalLinkLabel: null, practiceNotes: null, lessonOrder: 1 };
    service.create(10, body).subscribe();
    const req = httpMock.expectOne(`${base}/10/lessons`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('update() -> PUT /modules/lessons/:lessonId', () => {
    const body = { title: 't', youtubeUrl: null, textContent: 'x', externalUrl: null, externalLinkLabel: null, practiceNotes: null, expectedRowVersion: 0 };
    service.update(1, body).subscribe();
    const req = httpMock.expectOne(`${base}/lessons/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('reorder() -> POST /modules/:moduleId/lessons/reorder', () => {
    const body = { entries: [{ lessonId: 1, expectedRowVersion: 0, newOrder: 2 }] };
    service.reorder(10, body).subscribe();
    const req = httpMock.expectOne(`${base}/10/lessons/reorder`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush([]);
  });

  it('publish() -> POST /modules/lessons/:lessonId/publish', () => {
    service.publish(1, { expectedRowVersion: 0, attested: true }).subscribe();
    const req = httpMock.expectOne(`${base}/lessons/1/publish`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ expectedRowVersion: 0, attested: true });
    req.flush({});
  });

  it('unpublish() -> POST /modules/lessons/:lessonId/unpublish', () => {
    service.unpublish(1, { expectedRowVersion: 0 }).subscribe();
    const req = httpMock.expectOne(`${base}/lessons/1/unpublish`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('archive() -> POST /modules/lessons/:lessonId/archive', () => {
    service.archive(1, { expectedRowVersion: 0 }).subscribe();
    const req = httpMock.expectOne(`${base}/lessons/1/archive`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('repairVideo() -> POST /modules/lessons/:lessonId/repair-video', () => {
    const body = { url: 'https://youtu.be/dQw4w9WgXcQ', expectedRowVersion: 1, attested: true };
    service.repairVideo(1, body).subscribe();
    const req = httpMock.expectOne(`${base}/lessons/1/repair-video`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('checkVideo() -> POST /modules/lessons/:lessonId/check-video', () => {
    service.checkVideo(1, { expectedRowVersion: 1 }).subscribe();
    const req = httpMock.expectOne(`${base}/lessons/1/check-video`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
