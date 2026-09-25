import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { CurriculumLibraryComponent } from './curriculum-library';
import { Curriculum, CurriculumVersion } from '../../../core/models/curriculum.model';

function curriculum(overrides: Partial<Curriculum> = {}): Curriculum {
  return { id: 1, providerId: 1, danceStyleId: 1, internalName: 'x', rowVersion: 0, createdAt: '', createdBy: 1, ...overrides };
}

function version(overrides: Partial<CurriculumVersion> = {}): CurriculumVersion {
  return {
    id: 1, curriculumId: 1, versionNumber: 1, status: 'DRAFT', title: 't', level: null, objectives: null,
    clonedFromVersionId: null, rowVersion: 0, activatedAt: null, activatedBy: null, archivedAt: null, archivedBy: null,
    ...overrides
  };
}

describe('CurriculumLibraryComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [CurriculumLibraryComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CurriculumLibraryComponent);
    return fixture;
  }

  function flushDanceStyles() {
    httpMock.expectOne(`${environment.apiUrl}/school/settings/dance-styles`).flush([]);
  }

  afterEach(() => httpMock.verify());

  it('fetches every curriculum\'s versions in parallel on load, not lazily one at a time', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushDanceStyles();

    httpMock.expectOne(`${environment.apiUrl}/school/curricula`)
      .flush([curriculum({ id: 1 }), curriculum({ id: 2 })]);

    // Both curricula's versions are requested immediately, before either row is expanded.
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions`).flush([version({ id: 10, curriculumId: 1, status: 'DRAFT' })]);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/2/versions`).flush([version({ id: 20, curriculumId: 2, status: 'ACTIVE' })]);

    expect(fixture.componentInstance.rows().length).toBe(2);
  });

  it('a curriculum whose only version is ARCHIVED is hidden from the default view', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushDanceStyles();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula`).flush([curriculum({ id: 1, internalName: 'Retired Curriculum' })]);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions`).flush([version({ id: 10, curriculumId: 1, status: 'ARCHIVED' })]);
    fixture.detectChanges();

    expect(fixture.componentInstance.visibleRows().length).toBe(0);
    expect(fixture.componentInstance.hiddenCount()).toBe(1);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Retired Curriculum');
    expect(text).toContain('1 archived curriculum hidden');
  });

  it('turning "Show archived" on reveals an archived-only curriculum', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushDanceStyles();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula`).flush([curriculum({ id: 1, internalName: 'Retired Curriculum' })]);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions`).flush([version({ id: 10, curriculumId: 1, status: 'ARCHIVED' })]);
    fixture.detectChanges();

    fixture.componentInstance.showArchived.set(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.visibleRows().length).toBe(1);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Retired Curriculum');
  });

  it('a curriculum with both a DRAFT and an ARCHIVED version stays visible by default (the version-8-style mixed case)', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushDanceStyles();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula`).flush([curriculum({ id: 1, internalName: 'Mixed Curriculum' })]);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions`).flush([
      version({ id: 10, curriculumId: 1, versionNumber: 1, status: 'ARCHIVED' }),
      version({ id: 11, curriculumId: 1, versionNumber: 2, status: 'DRAFT' })
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.visibleRows().length).toBe(1);
    expect(fixture.componentInstance.hiddenCount()).toBe(0);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Mixed Curriculum');
  });

  it('a curriculum whose versions request itself fails is shown, not hidden (fail-open default)', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushDanceStyles();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula`).flush([curriculum({ id: 1, internalName: 'Unknown Status Curriculum' })]);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions`).flush({ code: 'SERVER_ERROR', message: 'x', resource: null }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.visibleRows().length).toBe(1);
    expect(fixture.componentInstance.hiddenCount()).toBe(0);
  });

  it('expanding a row after load never re-fetches its versions (they were already loaded eagerly)', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushDanceStyles();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula`).flush([curriculum({ id: 1 })]);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions`).flush([version({ id: 10, curriculumId: 1, status: 'DRAFT', title: 'V1' })]);
    fixture.detectChanges();

    fixture.componentInstance.toggleRow(fixture.componentInstance.rows()[0]);
    fixture.detectChanges();
    // httpMock.verify() in afterEach fails if a second /versions call was made -- this assertion is the negative case, proven by no outstanding request existing.
    httpMock.expectNone(`${environment.apiUrl}/school/curricula/1/versions`);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('V1');
  });

  it('no curricula at all still renders the empty-library state, not the all-archived-hidden state', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushDanceStyles();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula`).flush([]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No curricula yet');
  });
});
