import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TemplateEditorComponent } from './template-editor';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';

describe('TemplateEditorComponent (T2/T3/T7/T8 + WRITE_FROZEN + real publish gate)', () => {
  let httpMock: HttpTestingController;
  let dialogOpenSpy: ReturnType<typeof vi.fn>;
  const templatesBase = `${environment.apiUrl}/school/assignments/templates`;
  const versionsBase = `${environment.apiUrl}/school/assignments/versions`;

  const templateWithDraft = {
    id: 1, moduleId: 10, curriculumVersionId: 100, displayStatus: 'DRAFT',
    publishedVersionId: null, draftVersionId: 1000, rowVersion: 0,
    createdAt: '', createdBy: 1, archivedAt: null, archivedBy: null
  };

  const templatePublishedOnly = {
    ...templateWithDraft, draftVersionId: null, displayStatus: 'PUBLISHED', publishedVersionId: 2000
  };

  function emptyVersion(id: number, status = 'DRAFT') {
    return { id, templateId: 1, moduleId: 10, curriculumVersionId: 100, versionNumber: 1, status, title: 't', clonedFromVersionId: null, rowVersion: 0, createdAt: '', createdBy: 1, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null, questions: [] as unknown[] };
  }

  function setup(dialogResult: unknown = null) {
    dialogOpenSpy = vi.fn().mockReturnValue({ afterClosed: () => of(dialogResult) });
    TestBed.configureTestingModule({
      imports: [TemplateEditorComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: MatDialog, useValue: { open: dialogOpenSpy } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['templateId', '1']]) } } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(TemplateEditorComponent);
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('real publish gate: rejects an empty draft (no questions) WITHOUT opening the attestation dialog', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${templatesBase}/1`).flush(templateWithDraft);
    httpMock.expectOne(`${versionsBase}/1000`).flush(emptyVersion(1000));
    fixture.detectChanges();

    fixture.componentInstance.publish();
    expect(dialogOpenSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.actionError()?.message).toContain('at least one question');
  });

  it('real publish gate: opens the attestation dialog once the draft passes technical validation', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${templatesBase}/1`).flush(templateWithDraft);
    const validVersion = emptyVersion(1000);
    validVersion.questions = [{ id: 1, templateVersionId: 1000, questionType: 'SHORT_TEXT', prompt: 'p', questionOrder: 1, maxSelections: null, rowVersion: 0, options: [] }];
    httpMock.expectOne(`${versionsBase}/1000`).flush(validVersion);
    fixture.detectChanges();

    fixture.componentInstance.publish();
    expect(dialogOpenSpy).toHaveBeenCalled();
  });

  it('disables every mutation action while ClassroomLiteModeService.mutationsDisabled() is true (WRITE_FROZEN)', () => {
    const fixture = setup();
    const modeService = TestBed.inject(ClassroomLiteModeService);
    modeService.setWriteFrozen();
    fixture.detectChanges();
    httpMock.expectOne(`${templatesBase}/1`).flush(templatePublishedOnly);
    httpMock.expectOne(`${versionsBase}/2000`).flush(emptyVersion(2000, 'PUBLISHED'));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button[mat-stroked-button], button[mat-flat-button]')) as HTMLButtonElement[];
    const actionButtons = buttons.filter(b => b.textContent?.match(/Start Draft|Archive|Assign to Class/));
    expect(actionButtons.length).toBeGreaterThan(0);
    for (const b of actionButtons) expect(b.disabled).toBe(true);
  });

  it('reads remain visible during WRITE_FROZEN (template metadata still renders)', () => {
    const fixture = setup();
    const modeService = TestBed.inject(ClassroomLiteModeService);
    modeService.setWriteFrozen();
    fixture.detectChanges();
    httpMock.expectOne(`${templatesBase}/1`).flush(templateWithDraft);
    httpMock.expectOne(`${versionsBase}/1000`).flush(emptyVersion(1000));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Template');
    expect((fixture.nativeElement as HTMLElement).querySelector('app-question-list')).toBeTruthy();
  });

  it('T7: toggling to Preview renders app-template-preview instead of app-question-list', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${templatesBase}/1`).flush(templateWithDraft);
    httpMock.expectOne(`${versionsBase}/1000`).flush(emptyVersion(1000));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-question-list')).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-template-preview')).toBeFalsy();

    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-template-preview')).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-question-list')).toBeFalsy();
  });

  it('T3: concurrent ensureDraftVersion() calls on a published-only template issue exactly one startDraft() request', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${templatesBase}/1`).flush(templatePublishedOnly);
    httpMock.expectOne(`${versionsBase}/2000`).flush(emptyVersion(2000, 'PUBLISHED'));
    fixture.detectChanges();

    // Two "concurrent" edit intents before the first startDraft() call resolves.
    (fixture.componentInstance as unknown as { ensureDraftVersionRef: () => { subscribe: (o: unknown) => void } }).ensureDraftVersionRef().subscribe(() => {});
    (fixture.componentInstance as unknown as { ensureDraftVersionRef: () => { subscribe: (o: unknown) => void } }).ensureDraftVersionRef().subscribe(() => {});

    const req = httpMock.expectOne(`${templatesBase}/1/draft`);
    req.flush(emptyVersion(3000));
    httpMock.expectNone(`${templatesBase}/1/draft`);
  });
});
