import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { CurriculumVersion, CurriculumModule } from '../../../core/models/curriculum.model';
import { ModuleDetailPanelComponent } from './module-detail-panel';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

const DRAFT_VERSION: CurriculumVersion = {
  id: 10, curriculumId: 1, versionNumber: 1, status: 'DRAFT', title: 't', level: null, objectives: null,
  clonedFromVersionId: null, rowVersion: 0, activatedAt: null, activatedBy: null, archivedAt: null, archivedBy: null
};

function moduleFixture(contentStatus: CurriculumModule['contentStatus']): CurriculumModule {
  return {
    id: 101, curriculumVersionId: 10, title: 'Adavus', objectives: 'Basic footwork', moduleOrder: 1, contentStatus,
    rowVersion: contentStatus === 'ARCHIVED' ? 2 : 0,
    publishedAt: contentStatus === 'DRAFT' ? null : 'x', publishedBy: contentStatus === 'DRAFT' ? null : 1,
    archivedAt: contentStatus === 'ARCHIVED' ? 'x' : null, archivedBy: contentStatus === 'ARCHIVED' ? 1 : null
  };
}

/**
 * CURR-FUNC-06: an ARCHIVED module's own structural fields (title,
 * objectives) must be read-only, independently of the parent curriculum
 * version's own DRAFT-ness -- ARCHIVED MODULE = FROZEN NODE.
 */
describe('ModuleDetailPanelComponent -- CURR-FUNC-06 archived module is read-only', () => {
  let httpMock: HttpTestingController;

  function setup(module: CurriculumModule) {
    TestBed.configureTestingModule({
      imports: [ModuleDetailPanelComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '1', versionId: '10', moduleId: '101' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ModuleDetailPanelComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/1/versions/10`).flush(DRAFT_VERSION);
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/10/modules`).flush([module]);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  /**
   * Title/objectives' own [disabled] binding on the native <input>/<textarea>
   * is not reliably reflected onto the DOM element's .disabled property by
   * Angular Material's MDC components within this Vitest+jsdom harness (the
   * same caveat LessonEditorComponent's own CURR-FUNC-05 spec documents) --
   * so editable()/isArchived() (the single shared source both bindings
   * read) is what's asserted here, plus the button/copy that don't have
   * that MDC indirection.
   */
  it('an ARCHIVED module: editable() is false, Save is absent, a read-only note is shown', () => {
    const fixture = setup(moduleFixture('ARCHIVED'));
    const c = fixture.componentInstance;

    expect(c.parentDraft()).toBe(true); // the parent version is still DRAFT -- module archival is the only reason this is read-only
    expect(c.isArchived()).toBe(true);
    expect(c.editable()).toBe(false);

    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(buttons.some(t => t === 'Save')).toBe(false);
    expect(el.textContent).toContain('This module is archived — its structural fields are read-only.');
  });

  it('a DRAFT module: editable() is true, Save is present (unaffected by CURR-FUNC-06)', () => {
    const fixture = setup(moduleFixture('DRAFT'));
    const c = fixture.componentInstance;

    expect(c.editable()).toBe(true);

    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(buttons.some(t => t === 'Save')).toBe(true);
  });

  it('a PUBLISHED module: still editable (only ARCHIVED freezes structural fields)', () => {
    const fixture = setup(moduleFixture('PUBLISHED'));
    expect(fixture.componentInstance.editable()).toBe(true);
  });

  it('save() is a defensive no-op for an archived module even if invoked directly', () => {
    const fixture = setup(moduleFixture('ARCHIVED'));
    const c = fixture.componentInstance;
    c.form.title = 'Attempted change';

    c.save();

    httpMock.expectNone(`${environment.apiUrl}/school/curricula/versions/modules/101`);
  });
});
