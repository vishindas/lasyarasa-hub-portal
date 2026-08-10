import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { YouTubeUrlValidationApiService } from './youtube-url-validation-api.service';

describe('YouTubeUrlValidationApiService', () => {
  let service: YouTubeUrlValidationApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/school/curricula/lessons`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(YouTubeUrlValidationApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('validate() -> POST /lessons/validate-youtube-url with { url }', () => {
    service.validate('https://youtu.be/dQw4w9WgXcQ').subscribe();
    const req = httpMock.expectOne(`${base}/validate-youtube-url`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ url: 'https://youtu.be/dQw4w9WgXcQ' });
    req.flush({ result: 'VALID', videoId: 'dQw4w9WgXcQ' });
  });
});
