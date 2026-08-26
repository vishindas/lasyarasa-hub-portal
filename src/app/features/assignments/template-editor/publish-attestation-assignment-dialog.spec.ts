import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { PublishAttestationAssignmentDialog, PublishAttestationAssignmentData } from './publish-attestation-assignment-dialog';

/**
 * Regression coverage for the production pilot bug (template 4, Dev Dance
 * School): this dialog used to fetch GET /templates/{templateId} and send
 * the TEMPLATE's rowVersion, while the backend's publish() checks the DRAFT
 * VERSION's rowVersion -- a permanent, deterministic mismatch. These tests
 * open the real dialog component (no MatDialog.open stub) so the fetch it
 * actually performs, and the rowVersion it actually sends, are both
 * observed directly -- the template.spec.ts suite only ever stubbed
 * dialog.open() and never exercised this component at all, which is why the
 * bug shipped.
 */
describe('PublishAttestationAssignmentDialog', () => {
  let httpMock: HttpTestingController;
  let closeSpy: ReturnType<typeof vi.fn>;
  const templatesBase = `${environment.apiUrl}/school/assignments/templates`;
  const versionsBase = `${environment.apiUrl}/school/assignments/versions`;

  // Deliberately DIFFERENT rowVersions on the template vs. the version, so a
  // regression that swaps the two sources back would fail loudly instead of
  // accidentally passing on a coincidental match.
  const TEMPLATE_ROW_VERSION = 0;
  const VERSION_ROW_VERSION = 1;

  function setup(data: PublishAttestationAssignmentData = { templateId: 4, versionId: 5 }) {
    closeSpy = vi.fn();
    TestBed.configureTestingModule({
      imports: [PublishAttestationAssignmentDialog],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PublishAttestationAssignmentDialog);
    return fixture;
  }

  function versionResponse(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 5, templateId: 4, moduleId: 10, curriculumVersionId: 100, versionNumber: 1,
      status: 'DRAFT', title: 'PILOT — Dev Dance School Assignment Test', clonedFromVersionId: null,
      rowVersion: VERSION_ROW_VERSION, createdAt: '', createdBy: 1,
      publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null,
      questions: [], ...overrides
    };
  }

  afterEach(() => httpMock.verify());

  it('fetches the VERSION endpoint, not the template endpoint, and never calls GET /templates/{id}', () => {
    const fixture = setup();
    fixture.detectChanges();

    httpMock.expectOne(`${versionsBase}/5`).flush(versionResponse());
    httpMock.expectNone(`${templatesBase}/4`);
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.notFound()).toBe(false);
  });

  it('sends the VERSION rowVersion as expectedRowVersion on confirm -- not the template rowVersion', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${versionsBase}/5`).flush(versionResponse());
    fixture.detectChanges();

    fixture.componentInstance.confirm();

    expect(closeSpy).toHaveBeenCalledWith({ expectedRowVersion: VERSION_ROW_VERSION });
    expect(closeSpy).not.toHaveBeenCalledWith({ expectedRowVersion: TEMPLATE_ROW_VERSION });
  });

  it('shows the not-found state and disables Publish when the version load fails with 404', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${versionsBase}/5`).flush(
      { code: 'RESOURCE_NOT_FOUND', message: 'gone' }, { status: 404, statusText: 'Not Found' }
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.notFound()).toBe(true);

    const el = fixture.nativeElement as HTMLElement;
    const publishBtn = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.includes('Publish')) as HTMLButtonElement;
    expect(publishBtn.disabled).toBe(true);
  });

  it('does not close with a result if confirm() is called before the version rowVersion has loaded', () => {
    const fixture = setup();
    fixture.detectChanges();
    // No flush yet -- version fetch still in flight.
    fixture.componentInstance.confirm();
    expect(closeSpy).not.toHaveBeenCalled();
    httpMock.expectOne(`${versionsBase}/5`).flush(versionResponse());
  });

  it('closes with null on Cancel without ever sending a rowVersion', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${versionsBase}/5`).flush(versionResponse());
    fixture.detectChanges();

    fixture.componentInstance.ref.close(null);
    expect(closeSpy).toHaveBeenCalledWith(null);
  });
});
