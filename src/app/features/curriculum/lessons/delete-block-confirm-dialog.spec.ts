import { TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DeleteBlockConfirmDialog, DeleteBlockConfirmData } from './delete-block-confirm-dialog';

describe('DeleteBlockConfirmDialog', () => {
  let closeSpy: ReturnType<typeof vi.fn>;

  function setup(data: DeleteBlockConfirmData) {
    closeSpy = vi.fn();
    TestBed.configureTestingModule({
      imports: [DeleteBlockConfirmDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    const fixture = TestBed.createComponent(DeleteBlockConfirmDialog);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the content-type label in the title', () => {
    const fixture = setup({ contentTypeLabel: 'video' });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Remove this video block?');
  });

  it('Cancel closes with false', () => {
    const fixture = setup({ contentTypeLabel: 'video' });
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const cancel = buttons.find(b => b.textContent?.trim() === 'Cancel') as HTMLButtonElement;
    cancel.click();
    expect(closeSpy).toHaveBeenCalledWith(false);
  });

  it('Remove closes with true', () => {
    const fixture = setup({ contentTypeLabel: 'video' });
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const remove = buttons.find(b => b.textContent?.trim() === 'Remove') as HTMLButtonElement;
    remove.click();
    expect(closeSpy).toHaveBeenCalledWith(true);
  });
});
