import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LessonContentBlockApiService } from './lesson-content-block-api.service';

describe('LessonContentBlockApiService', () => {
  let service: LessonContentBlockApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/school/curricula/versions/modules/lessons`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(LessonContentBlockApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() -> GET /lessons/:lessonId/blocks', () => {
    service.list(301).subscribe();
    const req = httpMock.expectOne(`${base}/301/blocks`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('create() -> POST /lessons/:lessonId/blocks with body', () => {
    const body = { contentType: 'VIDEO' as const, expectedLessonRowVersion: 3, youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', textContent: null, externalUrl: null, externalLinkLabel: null };
    service.create(301, body).subscribe();
    const req = httpMock.expectOne(`${base}/301/blocks`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('update() -> PUT /lessons/:lessonId/blocks/:blockId with body', () => {
    const body = { expectedLessonRowVersion: 3, youtubeUrl: null, textContent: 'Updated text', externalUrl: null, externalLinkLabel: null };
    service.update(301, 55, body).subscribe();
    const req = httpMock.expectOne(`${base}/301/blocks/55`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('delete() -> DELETE /lessons/:lessonId/blocks/:blockId with a body', () => {
    const body = { expectedLessonRowVersion: 3 };
    service.delete(301, 55, body).subscribe();
    const req = httpMock.expectOne(`${base}/301/blocks/55`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('reorder() -> POST /lessons/:lessonId/blocks/reorder with body', () => {
    const body = { expectedLessonRowVersion: 3, entries: [{ blockId: 55, newOrder: 2 }, { blockId: 56, newOrder: 1 }] };
    service.reorder(301, body).subscribe();
    const req = httpMock.expectOne(`${base}/301/blocks/reorder`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('checkVideo() -> POST /lessons/:lessonId/blocks/:blockId/check-video with body', () => {
    const body = { expectedLessonRowVersion: 3 };
    service.checkVideo(301, 55, body).subscribe();
    const req = httpMock.expectOne(`${base}/301/blocks/55/check-video`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('repairVideo() -> POST /lessons/:lessonId/blocks/:blockId/repair-video with body', () => {
    const body = { url: 'https://youtu.be/newVideoId1', expectedLessonRowVersion: 3 };
    service.repairVideo(301, 55, body).subscribe();
    const req = httpMock.expectOne(`${base}/301/blocks/55/repair-video`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });
});
