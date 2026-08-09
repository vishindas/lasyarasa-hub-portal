import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { curriculumModeInterceptor } from './curriculum-mode.interceptor';
import { ClassroomLiteModeService } from './classroom-lite-mode.service';

describe('curriculumModeInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let mode: ClassroomLiteModeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([curriculumModeInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    mode = TestBed.inject(ClassroomLiteModeService);
  });

  afterEach(() => httpMock.verify());

  it('sets WRITE_FROZEN on a 423 from a curriculum route, and still propagates the error', () => {
    let errored = false;
    http.post('/api/school/curricula', {}).subscribe({ error: () => errored = true });
    httpMock.expectOne('/api/school/curricula').flush({ code: 'WRITE_FROZEN', message: 'frozen', resource: null }, { status: 423, statusText: 'Locked' });
    expect(mode.mode()).toBe('WRITE_FROZEN');
    expect(errored).toBe(true);
  });

  it('sets FULL_OUTAGE on a 503 from a class curriculum-assignment route', () => {
    http.get('/api/school/classes/7/curriculum-assignment').subscribe({ error: () => {} });
    httpMock.expectOne('/api/school/classes/7/curriculum-assignment').flush({ code: 'FULL_OUTAGE', message: 'down', resource: null }, { status: 503, statusText: 'Service Unavailable' });
    expect(mode.mode()).toBe('FULL_OUTAGE');
  });

  it('sets FULL_OUTAGE on a 503 from a class modules route', () => {
    http.post('/api/school/classes/7/modules/9/release', {}).subscribe({ error: () => {} });
    httpMock.expectOne('/api/school/classes/7/modules/9/release').flush({ code: 'FULL_OUTAGE', message: 'down', resource: null }, { status: 503, statusText: 'Service Unavailable' });
    expect(mode.mode()).toBe('FULL_OUTAGE');
  });

  it('does not touch the mode for a non-curriculum route, even on a matching status code', () => {
    http.get('/api/school/settings/currency').subscribe({ error: () => {} });
    httpMock.expectOne('/api/school/settings/currency').flush({}, { status: 423, statusText: 'Locked' });
    expect(mode.mode()).toBe('NORMAL');
  });
});
