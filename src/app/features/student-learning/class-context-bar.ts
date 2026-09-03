import { Component, ElementRef, QueryList, ViewChildren, computed, input, output } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StudentClassDTO } from '../../core/models/student-learning.model';

/**
 * Part IV.2's "class-context bar (new component)" -- persistent, in-flow
 * (never floating/fixed; a normal document-flow element beneath the
 * header, per Part IV.2/Part VI's "fixed/floating elements never cover
 * final content" rule), present on every screen for a student with >=1
 * active class. Purely presentational + a switcher menu; the parent screen
 * owns fetching the class list and deciding what "selecting a class" does
 * (Class Picker vs. an already-scoped screen), since Part II.6 says a
 * class switch keeps the current route "where sensible" -- that judgment
 * differs per screen, so it isn't made here.
 *
 * Selected-option-on-open focus targeting hooks mat-menu's own (opened)
 * output directly, rather than watching the ViewChildren QueryList for
 * changes: (opened) fires only once the panel's overlay is actually
 * attached and MatMenu's own default first-item focus has already run,
 * which is the point re-targeting is both safe (elements are guaranteed
 * attached) and meaningful (nothing to override before then).
 */
@Component({
  selector: 'app-class-context-bar',
  standalone: true,
  imports: [MatMenuModule, MatButtonModule, MatIconModule],
  styles: [`
    :host { display: block; } /* in-flow, never absolute/fixed */
    .bar {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px; background: #f8f9ff; border-bottom: 1px solid var(--sp-border, #e8eaf0);
      font-size: 0.85rem; color: var(--sp-text, #1a1f36);
    }
    .trigger { min-height: 44px; }
    .panel-item { min-height: 44px; }
    ::ng-deep .class-switcher-panel {
      width: 300px;
      max-width: calc(100vw - 2 * 24px); /* v1.1.1 verified fix */
    }
  `],
  template: `
    <div class="bar" role="status">
      @if (classes().length === 0) {
        <span>No active class</span>
      } @else if (classes().length === 1) {
        <mat-icon aria-hidden="true">school</mat-icon>
        <span>{{ classes()[0].className }}</span>
      } @else {
        <mat-icon aria-hidden="true">school</mat-icon>
        <button mat-button class="trigger" [matMenuTriggerFor]="panel" aria-haspopup="menu">
          {{ currentClassName() || 'Choose a class' }}
          <mat-icon aria-hidden="true">arrow_drop_down</mat-icon>
        </button>
        <mat-menu #panel="matMenu" class="class-switcher-panel" xPosition="before" (opened)="onOpened()">
          @for (c of classes(); track c.classId) {
            <button mat-menu-item #optionButton class="panel-item" (click)="classSelected.emit(c.classId)">
              {{ c.className }}
            </button>
          }
        </mat-menu>
      }
    </div>
  `
})
export class ClassContextBarComponent {
  @ViewChildren('optionButton') optionButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  classes = input<StudentClassDTO[]>([]);
  selectedClassId = input<number | null>(null);
  classSelected = output<number>();

  currentClassName = computed(() => this.classes().find(c => c.classId === this.selectedClassId())?.className ?? null);

  onOpened() {
    const buttons = this.optionButtons?.toArray();
    if (!buttons || buttons.length === 0) return;
    const idx = this.classes().findIndex(c => c.classId === this.selectedClassId());
    const target = buttons[idx >= 0 ? idx : 0];
    if (target?.nativeElement) target.nativeElement.focus();
  }
}
