import { Injectable, inject, signal } from '@angular/core';
import { StudentLearningApiService } from './student-learning-api.service';
import { StudentClassDTO } from '../models/student-learning.model';

/**
 * Holds the session-scoped "which class is selected for this student"
 * state (Part I.5/II.6 of the Slice 10 design), plus the one shared fetch
 * of the student's active classes -- fetched once per studentId by
 * StudentLearningShellComponent so Home/Class Picker/the class-context bar
 * don't each independently re-request the same list. studentId itself is
 * not held here -- it always comes from the route (:studentId), the single
 * source of truth, and naturally resets every signal below when Angular
 * tears down and recreates the parameterized route tree on navigation to a
 * different student.
 *
 * Selecting a class clears module/lesson/assignment-tab context by
 * construction: those live in child routes keyed off :classId, so
 * navigating to a different class already discards them. This service only
 * needs to remember the selected classId itself, per Part II.6's "selecting
 * one clears module, lesson, and class-specific assignment-tab context but
 * keeps the current student and, where sensible, the current route."
 */
@Injectable({ providedIn: 'root' })
export class StudentLearningContextService {
  private api = inject(StudentLearningApiService);

  private readonly _selectedClassId = signal<number | null>(null);
  readonly selectedClassId = this._selectedClassId.asReadonly();

  private readonly _classes = signal<StudentClassDTO[]>([]);
  readonly classes = this._classes.asReadonly();

  selectClass(classId: number): void {
    this._selectedClassId.set(classId);
  }

  /**
   * Security: called by the shell the moment access is lost for the
   * currently routed student (StudentAccessLossService.lostAccessFor()
   * matches). Unlike clearForNewStudent(), this never re-fetches -- there
   * is no student to fetch classes for anymore. Actually clears the
   * underlying state (not just a rendering suppression in some child), so
   * no later re-render, re-navigation, or query-param change can surface
   * the previous student's class name/selection without a fresh,
   * successful authorization response first.
   */
  clearSelection(): void {
    this._selectedClassId.set(null);
    this._classes.set([]);
  }

  /** Called whenever the routed studentId changes -- clears the selected class per correction 1's security property, and refetches the new student's classes. No caching across the switch (architect decision 3). */
  clearForNewStudent(studentId: number): void {
    this._selectedClassId.set(null);
    this._classes.set([]);
    this.api.classes(studentId).subscribe({
      next: list => this._classes.set(list ?? []),
      error: () => this._classes.set([])
    });
  }
}
