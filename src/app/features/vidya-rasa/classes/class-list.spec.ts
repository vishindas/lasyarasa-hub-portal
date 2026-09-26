import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ClassListComponent } from './class-list';

/** Issue #67: Active/Archived toggle, Archive/Restore actions, and typed-error display. */
describe('ClassListComponent -- Issue #67 class archive', () => {
  let httpMock: HttpTestingController;
  let dialogOpenSpy: ReturnType<typeof vi.fn>;
  let snackSpy: { open: ReturnType<typeof vi.fn> };
  const base = `${environment.apiUrl}/school/classes`;

  const activeClass = {
    id: 1, batchName: 'Kuchipudi A', schedule: 'Sat 10am', description: '',
    danceStyleId: 1, ageGroupId: null, feeTierId: null,
    danceStyleName: 'Kuchipudi', ageGroupLabel: null, feeTierLabel: null,
    archivedAt: null, rowVersion: 0
  };

  const archivedClass = { ...activeClass, id: 2, archivedAt: '2026-02-01T00:00:00', rowVersion: 1 };

  function setup(dialogResult: unknown = true) {
    dialogOpenSpy = vi.fn().mockReturnValue({ afterClosed: () => of(dialogResult) });
    snackSpy = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ClassListComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: MatDialog, useValue: { open: dialogOpenSpy } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ClassListComponent);
    // Same DI-override-unreliability as student-form-dialog.spec.ts: a
    // standalone component importing MatDialogModule/MatSnackBarModule
    // directly resolves MatDialog/MatSnackBar through its own imported-
    // module injector, not a TestBed provider override -- assigning the
    // spies directly onto the created instance is the proven workaround.
    (fixture.componentInstance as unknown as { snack: typeof snackSpy }).snack = snackSpy;
    (fixture.componentInstance as unknown as { dialog: { open: typeof dialogOpenSpy } }).dialog = { open: dialogOpenSpy };
    fixture.detectChanges();
    httpMock.expectOne(base).flush([activeClass]);
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('defaults to the active view and loads GET /school/classes', () => {
    const fixture = setup();
    expect(fixture.componentInstance.view()).toBe('active');
    expect(fixture.componentInstance.classes()).toEqual([activeClass]);
  });

  it('switching to Archived calls GET /school/classes/archived, not the active endpoint', () => {
    const fixture = setup();
    fixture.componentInstance.setView('archived');
    httpMock.expectOne(`${base}/archived`).flush([archivedClass]);
    expect(fixture.componentInstance.classes()).toEqual([archivedClass]);
  });

  it('archive() confirms, then POSTs expectedRowVersion and reloads on success', () => {
    const fixture = setup(true);
    fixture.componentInstance.archive(activeClass);

    const req = httpMock.expectOne(`${base}/1/archive`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ expectedRowVersion: 0 });
    req.flush({ ...activeClass, archivedAt: '2026-02-01T00:00:00', rowVersion: 1 });

    httpMock.expectOne(base).flush([]);
    expect(snackSpy.open).toHaveBeenCalledWith('Class archived', 'OK', { duration: 2500 });
  });

  it('archive() declined at the confirm dialog never calls the API', () => {
    const fixture = setup(false);
    fixture.componentInstance.archive(activeClass);
    httpMock.expectNone(`${base}/1/archive`);
  });

  it('archive() blocked by the server (409) shows the exact typed message, not a generic failure', () => {
    const fixture = setup(true);
    fixture.componentInstance.archive(activeClass);

    httpMock.expectOne(`${base}/1/archive`).flush(
      { code: 'CLASS_ARCHIVE_BLOCKED', message: 'This class still has current enrollments. Transfer or end them before archiving.', resource: 'SchoolClass' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(snackSpy.open).toHaveBeenCalledWith(
      'This class still has current enrollments. Transfer or end them before archiving.', 'OK', { duration: 5000 });
  });

  it('restore() POSTs expectedRowVersion with no confirm dialog and reloads on success', () => {
    const fixture = setup();
    fixture.componentInstance.restore(archivedClass);

    const req = httpMock.expectOne(`${base}/2/restore`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ expectedRowVersion: 1 });
    req.flush({ ...archivedClass, archivedAt: null, rowVersion: 2 });

    httpMock.expectOne(base).flush([]);
    expect(dialogOpenSpy).not.toHaveBeenCalled();
    expect(snackSpy.open).toHaveBeenCalledWith('Class restored', 'OK', { duration: 2500 });
  });

  it('delete() blocked by dependent history (409) shows the exact typed message', () => {
    const fixture = setup(true);
    fixture.componentInstance.delete(1);

    httpMock.expectOne(`${base}/1`).flush(
      { code: 'CLASS_DELETE_BLOCKED', message: 'This class has enrollment history and cannot be deleted.', resource: 'SchoolClass' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(snackSpy.open).toHaveBeenCalledWith(
      'This class has enrollment history and cannot be deleted.', 'OK', { duration: 5000 });
  });
});
