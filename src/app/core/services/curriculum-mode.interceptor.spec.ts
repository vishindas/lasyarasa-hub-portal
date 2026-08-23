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

  // Slice 12
  it('sets FULL_OUTAGE on a 503 from a student-learning route', () => {
    http.get('/api/account/students/5/learning/home').subscribe({ error: () => {} });
    httpMock.expectOne('/api/account/students/5/learning/home').flush({ code: 'FULL_OUTAGE', message: 'down', resource: null }, { status: 503, statusText: 'Service Unavailable' });
    expect(mode.mode()).toBe('FULL_OUTAGE');
  });

  it('does not gate the pre-existing My Students list endpoint, matching the real backend scoping', () => {
    http.get('/api/account/students').subscribe({ error: () => {} });
    httpMock.expectOne('/api/account/students').flush({}, { status: 503, statusText: 'Service Unavailable' });
    expect(mode.mode()).toBe('NORMAL');
  });

  // Slice 15 -- regression guard for the CURRICULUM_PATH_RE extension (Plan v2.1.1 §4/§8.5)
  it('sets WRITE_FROZEN on a 423 from an assignment mutation route', () => {
    http.post('/api/school/assignments/templates', {}).subscribe({ error: () => {} });
    httpMock.expectOne('/api/school/assignments/templates').flush({ code: 'WRITE_FROZEN', message: 'frozen', resource: null }, { status: 423, statusText: 'Locked' });
    expect(mode.mode()).toBe('WRITE_FROZEN');
  });

  it('sets FULL_OUTAGE on a 503 from an assignment route', () => {
    http.get('/api/school/assignments/instances').subscribe({ error: () => {} });
    httpMock.expectOne('/api/school/assignments/instances').flush({ code: 'FULL_OUTAGE', message: 'down', resource: null }, { status: 503, statusText: 'Service Unavailable' });
    expect(mode.mode()).toBe('FULL_OUTAGE');
  });

  it('does NOT set WRITE_FROZEN for a normal 200 GET /assignments/capability response (safe method, not blocked under WRITE_FROZEN per the backend contract)', () => {
    http.get('/api/school/assignments/capability').subscribe();
    httpMock.expectOne('/api/school/assignments/capability').flush({ globalEnabled: false, providerEnabled: false, effectiveEnabled: false });
    expect(mode.mode()).toBe('NORMAL');
  });

  it('sets FULL_OUTAGE on a 503 from GET /assignments/capability itself', () => {
    http.get('/api/school/assignments/capability').subscribe({ error: () => {} });
    httpMock.expectOne('/api/school/assignments/capability').flush({ code: 'FULL_OUTAGE', message: 'down', resource: null }, { status: 503, statusText: 'Service Unavailable' });
    expect(mode.mode()).toBe('FULL_OUTAGE');
  });
});
