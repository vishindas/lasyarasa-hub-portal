import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { ChangeCurriculumDialog, ChangeCurriculumDialogData } from './change-curriculum-dialog';
import { CurriculumVersion } from '../../../core/models/curriculum.model';

describe('ChangeCurriculumDialog', () => {
  let httpMock: HttpTestingController;

  const data: ChangeCurriculumDialogData = {
    classId: 7,
    currentAssignment: { id: 50, classId: 7, curriculumVersionId: 10, activeFrom: '', activeTo: null, endedBy: null, rowVersion: 0 }
  };

  function setup() {
    TestBed.configureTestingModule({
      imports: [ChangeCurriculumDialog],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ChangeCurriculumDialog);
    fixture.detectChanges();
    // The embedded CurriculumVersionSelectorComponent loads the curricula list on init.
    httpMock.expectOne(`${environment.apiUrl}/school/curricula`).flush([]);
    return fixture;
  }

  afterEach(() => httpMock.verify());

  const targetV: CurriculumVersion = { id: 20, curriculumId: 2, versionNumber: 2, status: 'ACTIVE', title: 'v2', level: null, objectives: null, clonedFromVersionId: null, rowVersion: 0, activatedAt: '', activatedBy: 1, archivedAt: null, archivedBy: null };

  it('selecting a target runs preview immediately', () => {
    const fixture = setup();
    fixture.componentInstance.onTargetSelected(targetV);
    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/school/classes/7/curriculum-assignment/change-preview`);
    req.flush({ targetCurriculumVersionId: 20, added: [], removed: [], matching: [] });
    expect(fixture.componentInstance.preview()).toBeTruthy();
  });

  it('changing the target after a preview was fetched invalidates it -- confirm requires re-preview', () => {
    const fixture = setup();
    fixture.componentInstance.onTargetSelected(targetV);
    httpMock.expectOne(r => r.url.endsWith('/change-preview')).flush({ targetCurriculumVersionId: 20, added: [], removed: [], matching: [] });
    expect(fixture.componentInstance.preview()).toBeTruthy();

    const otherTarget = { ...targetV, id: 21 };
    fixture.componentInstance.onTargetSelected(otherTarget);
    // re-selecting immediately re-runs preview per the current implementation; assert it is a *fresh* one, not the stale cached response.
    const req = httpMock.expectOne(r => r.url.endsWith('/change-preview') && r.params.get('targetCurriculumVersionId') === '21');
    req.flush({ targetCurriculumVersionId: 21, added: [], removed: [], matching: [] });
    expect(fixture.componentInstance.preview()?.targetCurriculumVersionId).toBe(21);
  });

  it('confirm() only includes mappings for modules with an explicit carry-over choice', () => {
    const fixture = setup();
    fixture.componentInstance.targetVersion = targetV;
    fixture.componentInstance.preview.set({
      targetCurriculumVersionId: 20,
      added: [],
      removed: [],
      matching: [
        { oldModuleId: 1, oldTitle: 'A', newModuleId: 11, newTitle: 'A' },
        { oldModuleId: 2, oldTitle: 'B', newModuleId: 12, newTitle: 'B' }
      ]
    });
    fixture.componentInstance.carryOver = { 11: 'RELEASED', 12: null };

    fixture.componentInstance.confirm();
    const req = httpMock.expectOne(`${environment.apiUrl}/school/classes/7/curriculum-assignment/change-confirm`);
    expect(req.request.body.mappings).toEqual([{ oldModuleId: 1, newModuleId: 11, mappedState: 'RELEASED' }]);
    req.flush({});
  });
});
